//! Dossier de travail du DJ (FR-016) et contrôle d'espace et d'écriture (FR-018).
//! Le choix est persisté dans un fichier JSON ; l'espace libre est fourni par l'appelant.

use crate::module2::error::{ErrorCode, Module2Error};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq, Eq)]
pub struct Settings {
    pub work_dir: Option<PathBuf>,
    /// Modèle de séparation choisi dans la zone IA (FR du ticket #38). Absent des anciens fichiers.
    #[serde(default)]
    pub selected_model: Option<String>,
}

#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
pub struct WorkspaceCheck {
    pub writable: bool,
    pub free_bytes: u64,
    pub required_bytes: u64,
    pub ok: bool,
}

/// Charge les réglages. Un fichier absent donne les réglages par défaut.
pub fn load(path: &Path) -> Result<Settings, Module2Error> {
    if !path.exists() {
        return Ok(Settings::default());
    }
    let text = std::fs::read_to_string(path)
        .map_err(|e| Module2Error::new(ErrorCode::InvalidArgument, format!("réglages illisibles : {}", e)))?;
    serde_json::from_str(&text)
        .map_err(|e| Module2Error::new(ErrorCode::InvalidArgument, format!("réglages invalides : {}", e)))
}

/// Enregistre les réglages, en créant le dossier parent si besoin.
pub fn save(path: &Path, settings: &Settings) -> Result<(), Module2Error> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| Module2Error::new(ErrorCode::WorkdirNotWritable, e.to_string()))?;
    }
    let text = serde_json::to_string_pretty(settings)
        .map_err(|e| Module2Error::new(ErrorCode::InvalidArgument, e.to_string()))?;
    std::fs::write(path, text).map_err(|e| Module2Error::new(ErrorCode::WorkdirNotWritable, e.to_string()))
}

/// Vrai si un fichier peut être créé puis supprimé dans `dir`.
fn is_writable(dir: &Path) -> bool {
    let probe = dir.join(".alchemix-probe");
    match std::fs::write(&probe, b"") {
        Ok(()) => {
            let _ = std::fs::remove_file(&probe);
            true
        }
        Err(_) => false,
    }
}

/// Définit le dossier de travail. Refuse un dossier absent ou non inscriptible.
pub fn set_work_dir(settings: &mut Settings, dir: &Path) -> Result<(), Module2Error> {
    if !is_writable(dir) {
        return Err(Module2Error::new(
            ErrorCode::WorkdirNotWritable,
            format!("dossier de travail inaccessible en écriture : {}", dir.display()),
        ));
    }
    settings.work_dir = Some(dir.to_path_buf());
    Ok(())
}

/// Vérifie l'accès en écriture et l'espace disponible par rapport à `required_bytes`.
pub fn check_workspace(dir: &Path, required_bytes: u64, free_bytes: u64) -> WorkspaceCheck {
    let writable = is_writable(dir);
    WorkspaceCheck {
        writable,
        free_bytes,
        required_bytes,
        ok: writable && free_bytes >= required_bytes,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    /// Dossier temporaire unique par test, jamais un dossier réel de l'utilisateur.
    fn scratch(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("alchemix-m2-settings-{}-{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn default_settings_have_no_work_dir() {
        assert_eq!(Settings::default().work_dir, None);
    }

    #[test]
    fn missing_settings_file_loads_defaults() {
        let root = scratch("missing");
        let loaded = load(&root.join("settings.json")).unwrap();
        assert_eq!(loaded, Settings::default());
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn settings_round_trip_through_the_file() {
        let root = scratch("roundtrip");
        let file = root.join("sub").join("settings.json");
        let mut settings = Settings::default();
        set_work_dir(&mut settings, &root).unwrap();
        save(&file, &settings).unwrap();
        assert_eq!(load(&file).unwrap(), settings);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn settings_file_without_model_field_still_loads() {
        let root = scratch("old-format");
        let file = root.join("settings.json");
        fs::write(&file, r#"{ "work_dir": null }"#).unwrap();
        let loaded = load(&file).unwrap();
        assert_eq!(loaded.selected_model, None);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn selected_model_round_trips_through_the_file() {
        let root = scratch("model");
        let file = root.join("settings.json");
        let settings = Settings { work_dir: None, selected_model: Some("htdemucs-ft".into()) };
        save(&file, &settings).unwrap();
        assert_eq!(load(&file).unwrap(), settings);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn set_work_dir_accepts_an_existing_writable_folder() {
        let root = scratch("accept");
        let mut settings = Settings::default();
        set_work_dir(&mut settings, &root).unwrap();
        assert_eq!(settings.work_dir, Some(root.clone()));
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn set_work_dir_refuses_a_missing_folder() {
        let root = scratch("refuse");
        let mut settings = Settings::default();
        let err = set_work_dir(&mut settings, &root.join("absent")).unwrap_err();
        assert_eq!(err.code, ErrorCode::WorkdirNotWritable);
        assert_eq!(settings.work_dir, None);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn check_workspace_is_ok_with_enough_space() {
        let root = scratch("check-ok");
        let check = check_workspace(&root, 100, 200);
        assert!(check.writable);
        assert!(check.ok);
        assert_eq!(check.required_bytes, 100);
        assert_eq!(check.free_bytes, 200);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn check_workspace_is_not_ok_when_space_is_short() {
        let root = scratch("check-full");
        let check = check_workspace(&root, 300, 200);
        assert!(check.writable);
        assert!(!check.ok);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn check_workspace_reports_a_missing_folder_as_not_writable() {
        let root = scratch("check-missing");
        let check = check_workspace(&root.join("absent"), 1, 1_000);
        assert!(!check.writable);
        assert!(!check.ok);
        fs::remove_dir_all(&root).unwrap();
    }
}
