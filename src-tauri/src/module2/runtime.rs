//! Runtime d'inférence ONNX (carte alchemix#23) : initialisation unique, choix du backend
//! et repli CPU. DirectML est préféré sous Windows quand il est disponible (research.md §1).
//! La gestion du slot de session unique (un seul modèle chargé, VRAM 6 Go) viendra avec
//! le chargement des modèles (carte alchemix#22).

use crate::module2::error::{ErrorCode, Module2Error};
#[cfg(windows)]
use ort::ep::DirectML;
use ort::ep::{ExecutionProvider, ExecutionProviderDispatch, CPU};
use ort::environment::Environment;
use ort::session::{builder::SessionBuilder, Session};
use serde::Serialize;
use std::sync::OnceLock;

/// État du moteur d'inférence, affiché dans la zone IA du Module 2 (contrat §3.6).
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EngineStatus {
    pub available: bool,
    pub backend: String,
}

/// ONNX Runtime n'autorise qu'un environnement par processus : il est créé une seule fois.
static ENV: OnceLock<Result<Environment, String>> = OnceLock::new();

fn environment() -> Result<Environment, Module2Error> {
    ENV.get_or_init(|| {
        ort::init()
            .with_name("alchemix")
            .with_telemetry(false)
            .with_execution_providers(default_providers())
            .build()
            .map_err(|e| e.to_string())
    })
    .clone()
    .map_err(|e| Module2Error::new(ErrorCode::InvalidArgument, format!("ONNX Runtime indisponible : {e}")))
}

/// Fournisseurs d'exécution par ordre de préférence : DirectML (Windows) puis repli CPU garanti.
fn default_providers() -> Vec<ExecutionProviderDispatch> {
    let mut providers = Vec::new();
    #[cfg(windows)]
    providers.push(DirectML::default().build());
    providers.push(CPU::default().build());
    providers
}

/// Backend réellement disponible : DirectML sous Windows, sinon CPU.
fn preferred_backend() -> String {
    #[cfg(windows)]
    if DirectML::is_available().unwrap_or(false) {
        return "DirectML".to_string();
    }
    "CPU".to_string()
}

/// Détecte l'état du moteur. Un runtime qui ne s'initialise pas est signalé, sans erreur de commande.
pub fn detect() -> EngineStatus {
    match environment() {
        Ok(_) => EngineStatus { available: true, backend: preferred_backend() },
        Err(_) => EngineStatus { available: false, backend: "indisponible".to_string() },
    }
}

/// Fabrique de session prête pour le chargement d'un modèle (#22) : DirectML d'abord, repli CPU garanti.
pub fn session_builder() -> Result<SessionBuilder, Module2Error> {
    let env = environment()?;
    let onnx = |e: String| Module2Error::new(ErrorCode::InvalidArgument, format!("session ONNX impossible : {e}"));
    Session::builder(&env)
        .map_err(|e| onnx(e.to_string()))?
        .with_execution_providers(default_providers())
        .map_err(|e| onnx(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn engine_is_available_with_a_known_backend() {
        let status = detect();
        eprintln!("backend détecté : {}", status.backend);
        assert!(status.available, "ONNX Runtime doit s'initialiser : {status:?}");
        assert!(
            status.backend == "DirectML" || status.backend == "CPU",
            "backend inattendu : {}",
            status.backend
        );
    }

    #[test]
    fn detect_is_idempotent() {
        assert_eq!(detect(), detect());
    }

    #[test]
    fn a_session_builder_is_created_with_cpu_fallback() {
        session_builder().expect("la fabrique de session doit se créer sans modèle chargé");
    }
}
