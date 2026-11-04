#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::{Path, PathBuf};
use tauri::{AppHandle, generate_handler, Manager};

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
        .invoke_handler(generate_handler![clean_cache])
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
