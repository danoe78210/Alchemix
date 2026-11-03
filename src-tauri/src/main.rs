#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

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
    let cache_dir = app.path().cache_dir().map_err(|e| e.to_string())?;

    let mut cleaned = 0u64;
    for entry in std::fs::read_dir(&cache_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            std::fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
        } else {
            std::fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
        cleaned += 1;
    }

    Ok(format!("{} élément(s) de cache supprimé(s)", cleaned))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(generate_handler![clean_cache])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
