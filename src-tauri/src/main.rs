#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::{Path, PathBuf};
use std::sync::Mutex;
use serde::Serialize;
use tauri::{AppHandle, generate_handler, Manager, State};

mod module2;

use module2::decode;
use module2::encode::Stem;
use module2::disk;
use module2::error::{ErrorCode, Module2Error};
use module2::job::Jobs;
use module2::settings::{self, Settings, WorkspaceCheck};

/// Vide le dossier cache de l'application (buffers audio temporaires,
/// cache frontend, etc.). Aucun document utilisateur n'est touché.
/// Cette commande ne ferme PAS le processus : la fermeture de la fenêtre
/// Win32/WebView2 est déléguée exclusivement au front-end Tauri
/// (`appWindow.close()`), ce qui évite l'arrêt brutal du processus pendant
/// la fermeture de WebView2 (erreur Chromium "Failed to unregister class
/// Chrome_WidgetWin_0. Error = 1412").
#[tauri::command]
fn clean_cache(app: AppHandle) -> Result<String, String> {
    let cache_dir = app_cache_target(&app)?;
    let cleaned = clear_dir(&cache_dir)?;
    Ok(format!("{} élément(s) de cache supprimé(s)", cleaned))
}

/// Réglages du Module 2 (dossier de travail, FR-016), dans le dossier de configuration de l'application.
fn module2_settings_path(app: &AppHandle) -> Result<PathBuf, Module2Error> {
    let root = app
        .path()
        .app_config_dir()
        .map_err(|e| Module2Error::new(ErrorCode::InvalidArgument, e.to_string()))?;
    Ok(root.join("module2-settings.json"))
}

#[tauri::command]
fn get_settings(app: AppHandle) -> Result<Settings, Module2Error> {
    settings::load(&module2_settings_path(&app)?)
}

/// Définit le dossier de travail après contrôle d'écriture, puis le persiste.
#[tauri::command]
fn set_work_dir(app: AppHandle, path: String) -> Result<Settings, Module2Error> {
    let file = module2_settings_path(&app)?;
    let mut current = settings::load(&file)?;
    settings::set_work_dir(&mut current, Path::new(&path))?;
    settings::save(&file, &current)?;
    Ok(current)
}

/// Accès en écriture et espace libre du dossier de travail, avant un téléchargement ou une écriture (FR-018).
/// Un dossier devenu inaccessible est signalé par `writable: false`, sans erreur de commande.
#[tauri::command]
fn check_workspace(app: AppHandle, required_bytes: u64) -> Result<WorkspaceCheck, Module2Error> {
    let current = settings::load(&module2_settings_path(&app)?)?;
    let dir = current
        .work_dir
        .ok_or_else(|| Module2Error::new(ErrorCode::WorkdirNotSet, "dossier de travail non défini"))?;
    let free = disk::free_bytes(&dir).unwrap_or(0);
    Ok(settings::check_workspace(&dir, required_bytes, free))
}

/// Lancement d'une séparation (contrat §3.4). `bytes_per_stem` : taille d'un stem en WAV float32 stéréo.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StartedJob {
    job_id: String,
    simulated: bool,
    bytes_per_stem: u64,
}

/// Métadonnées du morceau importé (durée, fréquence, canaux), sans lancer la séparation.
#[tauri::command]
fn probe_track(path: String) -> Result<decode::TrackInfo, Module2Error> {
    decode::probe_file(Path::new(&path))
}

/// État du moteur d'inférence ONNX : backend retenu (DirectML ou repli CPU) — contrat §3.6.
#[tauri::command]
fn get_engine_status() -> module2::runtime::EngineStatus {
    module2::runtime::detect()
}

/// Mémorise le modèle de séparation choisi dans la zone IA, avec les autres réglages.
#[tauri::command]
fn set_selected_model(app: AppHandle, model: Option<String>) -> Result<Settings, Module2Error> {
    let file = module2_settings_path(&app)?;
    let mut current = settings::load(&file)?;
    current.selected_model = model;
    settings::save(&file, &current)?;
    Ok(current)
}

/// Décode le fichier puis lance une séparation. Simulée tant que les modèles ONNX ne sont pas branchés (FR-007).
#[tauri::command]
fn start_separation(jobs: State<Mutex<Jobs>>, path: String) -> Result<StartedJob, Module2Error> {
    let path = PathBuf::from(&path);
    let decoded = decode::decode_file(&path)?;
    let track = path
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "piste".to_string());
    let bytes_per_stem = (decoded.samples.len() * 4) as u64;
    let (job_id, simulated) = jobs.lock().expect("verrou des jobs").start(&track, &decoded);
    Ok(StartedJob { job_id, simulated, bytes_per_stem })
}

/// Résultat d'un export : chemins des fichiers écrits dans le dossier de travail.
#[derive(Serialize)]
struct ExportedStems {
    paths: Vec<String>,
}

/// Annule une séparation (contrat §3.4). Un export ultérieur du job renvoie `CANCELLED`.
#[tauri::command]
fn cancel_separation(jobs: State<Mutex<Jobs>>, job_id: String) -> Result<(), Module2Error> {
    jobs.lock().expect("verrou des jobs").cancel(&job_id)
}

/// Octets WAV d'un stem, renvoyés en binaire (sans base64) pour la lecture dans l'interface.
#[tauri::command]
fn get_stem_audio(jobs: State<Mutex<Jobs>>, job_id: String, stem: Stem) -> Result<tauri::ipc::Response, Module2Error> {
    let bytes = jobs.lock().expect("verrou des jobs").stem_wav(&job_id, stem)?;
    Ok(tauri::ipc::Response::new(bytes))
}

/// Écrit les stems sélectionnés du job dans le dossier de travail (FR-017).
#[tauri::command]
fn export_stems(
    app: AppHandle,
    jobs: State<Mutex<Jobs>>,
    job_id: String,
    stems: Vec<Stem>,
) -> Result<ExportedStems, Module2Error> {
    let work_dir = settings::load(&module2_settings_path(&app)?)?
        .work_dir
        .ok_or_else(|| Module2Error::new(ErrorCode::WorkdirNotSet, "dossier de travail non défini"))?;
    let paths = jobs.lock().expect("verrou des jobs").export(&job_id, &work_dir, &stems)?;
    Ok(ExportedStems {
        paths: paths.iter().map(|p| p.to_string_lossy().into_owned()).collect(),
    })
}

/// Dossier de cache propre à l'application : `app_cache_dir()/cache`.
/// `cache_dir()` seul désigne le dossier partagé par toutes les applications
/// (sous Windows : %LOCALAPPDATA%) : ne jamais le vider.
fn app_cache_target(app: &AppHandle) -> Result<PathBuf, String> {
    let root = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    Ok(root.join("cache"))
}

/// Supprime le contenu de `dir` ; le dossier lui-même est conservé.
/// Retourne le nombre d'entrées supprimées. Un dossier absent ne produit pas d'erreur.
fn clear_dir(dir: &Path) -> Result<u64, String> {
    if !dir.exists() {
        return Ok(0);
    }
    let mut cleaned = 0u64;
    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.is_dir() {
            std::fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
        } else {
            std::fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
        cleaned += 1;
    }
    Ok(cleaned)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(Jobs::default()))
        .invoke_handler(generate_handler![
            clean_cache,
            get_settings,
            set_work_dir,
            set_selected_model,
            check_workspace,
            get_engine_status,
            probe_track,
            start_separation,
            cancel_separation,
            get_stem_audio,
            export_stems
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::clear_dir;
    use std::fs;
    use std::path::PathBuf;

    /// Dossier temporaire unique par test : jamais un dossier réel de l'utilisateur
    fn scratch(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("alchemix-cache-test-{}-{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn clear_dir_removes_entries_and_keeps_the_folder() {
        let root = scratch("entries");
        let cache = root.join("cache");
        fs::create_dir_all(cache.join("sub")).unwrap();
        fs::write(cache.join("a.bin"), b"x").unwrap();
        fs::write(cache.join("sub").join("b.bin"), b"y").unwrap();

        let removed = clear_dir(&cache).unwrap();

        assert_eq!(removed, 2);
        assert!(cache.is_dir());
        assert_eq!(fs::read_dir(&cache).unwrap().count(), 0);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn clear_dir_never_touches_sibling_folders() {
        let root = scratch("siblings");
        let cache = root.join("cache");
        let webview = root.join("EBWebView");
        fs::create_dir_all(&cache).unwrap();
        fs::create_dir_all(&webview).unwrap();
        fs::write(webview.join("Local State"), b"profil").unwrap();
        fs::write(cache.join("a.bin"), b"x").unwrap();

        clear_dir(&cache).unwrap();

        assert!(webview.join("Local State").is_file());
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn clear_dir_is_ok_when_the_folder_is_missing() {
        let root = scratch("missing");
        assert_eq!(clear_dir(&root.join("absent")).unwrap(), 0);
        fs::remove_dir_all(&root).unwrap();
    }
}
