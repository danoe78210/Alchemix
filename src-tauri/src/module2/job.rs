//! Jobs de séparation en mémoire (T009, sous-ensemble) : un job garde les stems produits par la simulation
//! jusqu'à leur export. Gère les modes Performance / Studio, la progression et l'annulation atomique.
//!
//! Les méthodes de lecture (progress, mode, is_cancelled) sont destinées à l'UI Tauri.

#![allow(dead_code)]

use crate::module2::decode::DecodedAudio;
use crate::module2::encode::{encode_wav, export_stems, Stem};
use crate::module2::error::{ErrorCode, Module2Error};
use crate::module2::simulate::{simulate_separation, Separation};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

/// Mode de séparation : passe rapide (Performance) ou multi-passe haute résolution (Studio).
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum JobMode {
    Performance,
    Studio,
}

impl Default for JobMode {
    fn default() -> Self {
        JobMode::Performance
    }
}

impl std::fmt::Display for JobMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            JobMode::Performance => write!(f, "PERFORMANCE"),
            JobMode::Studio => write!(f, "STUDIO"),
        }
    }
}

impl std::str::FromStr for JobMode {
    type Err = Module2Error;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_uppercase().as_str() {
            "PERFORMANCE" => Ok(JobMode::Performance),
            "STUDIO" => Ok(JobMode::Studio),
            _ => Err(Module2Error::new(ErrorCode::InvalidArgument, format!("mode invalide : {s}"))),
        }
    }
}

struct Job {
    track: String,
    sample_rate: u32,
    mode: JobMode,
    separation: Separation,
    progress: f32,        // 0.0 à 100.0
    cancelled: AtomicBool,
}

#[derive(Default)]
pub struct Jobs {
    next_id: u64,
    jobs: HashMap<String, Job>,
}

impl Jobs {
    /// Lance une séparation de `decoded` pour la piste `track`. Retourne l'identifiant du job, le mode
    /// sélectionné et le drapeau `simulated` (vrai tant que les modèles ONNX ne sont pas branchés).
    pub fn start(&mut self, track: &str, decoded: &DecodedAudio, mode: JobMode) -> (String, JobMode, bool) {
        self.next_id += 1;
        let id = format!("job-{}", self.next_id);
        let separation = simulate_separation(&decoded.samples);
        let simulated = separation.simulated;
        self.jobs.insert(
            id.clone(),
            Job { track: track.to_string(), sample_rate: decoded.sample_rate, mode, separation, progress: 0.0, cancelled: AtomicBool::new(false) },
        );
        (id, mode, simulated)
    }

    /// Annule le job `id` de manière atomique. Un job inconnu est ignoré. Un job annulé n'écrit plus aucun stem.
    pub fn cancel(&mut self, id: &str) -> Result<(), Module2Error> {
        if let Some(job) = self.jobs.get_mut(id) {
            job.cancelled.store(true, Ordering::SeqCst);
        }
        Ok(())
    }

    /// Retourne true si le job a été annulé (vérification atomique entre segments).
    pub fn is_cancelled(&self, id: &str) -> bool {
        self.jobs.get(id).map_or(false, |j| j.cancelled.load(Ordering::SeqCst))
    }

    /// Met à jour la progression du job `id` (0.0 à 100.0).
    pub fn set_progress(&mut self, id: &str, progress: f32) -> Result<(), Module2Error> {
        if let Some(job) = self.jobs.get_mut(id) {
            job.progress = progress.clamp(0.0, 100.0);
            Ok(())
        } else {
            Err(Module2Error::new(ErrorCode::InvalidArgument, format!("job inconnu : {}", id)))
        }
    }

    /// Retourne la progression actuelle du job `id`.
    pub fn progress(&self, id: &str) -> Result<f32, Module2Error> {
        self.jobs.get(id).map(|j| j.progress).ok_or_else(|| Module2Error::new(ErrorCode::InvalidArgument, format!("job inconnu : {}", id)))
    }

    /// Retourne le mode du job `id`.
    pub fn mode(&self, id: &str) -> Result<JobMode, Module2Error> {
        self.jobs.get(id).map(|j| j.mode).ok_or_else(|| Module2Error::new(ErrorCode::InvalidArgument, format!("job inconnu : {}", id)))
    }

    /// Écrit les stems `selection` du job `id` dans `work_dir`.
    pub fn export(&self, id: &str, work_dir: &Path, selection: &[Stem]) -> Result<Vec<PathBuf>, Module2Error> {
        let job = self.live_job(id)?;
        export_stems(work_dir, &job.track, job.sample_rate, &job.separation.stems, selection)
    }

    /// Octets WAV du stem `stem` du job `id`, pour la lecture dans l'interface.
    pub fn stem_wav(&self, id: &str, stem: Stem) -> Result<Vec<u8>, Module2Error> {
        let job = self.live_job(id)?;
        let audio = job
            .separation
            .stems
            .iter()
            .find(|s| s.stem == stem)
            .ok_or_else(|| Module2Error::new(ErrorCode::InvalidArgument, format!("stem absent : {}", stem.as_str())))?;
        encode_wav(job.sample_rate, &audio.samples)
    }

    /// Job existant et non annulé.
    fn live_job(&self, id: &str) -> Result<&Job, Module2Error> {
        let job = self
            .jobs
            .get(id)
            .ok_or_else(|| Module2Error::new(ErrorCode::InvalidArgument, format!("job inconnu : {}", id)))?;
        if job.cancelled.load(Ordering::SeqCst) {
            return Err(Module2Error::new(ErrorCode::Cancelled, "séparation annulée"));
        }
        Ok(job)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    /// Dossier temporaire unique par test, jamais un dossier réel de l'utilisateur.
    fn scratch(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("alchemix-m2-job-{}-{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn decoded() -> DecodedAudio {
        DecodedAudio { sample_rate: 44_100, samples: vec![0.25, -0.5, 0.75, 0.0] }
    }

    #[test]
    fn start_returns_a_simulated_job() {
        let (id, _, simulated) = Jobs::default().start("track", &decoded(), JobMode::Performance);
        assert!(!id.is_empty());
        assert!(simulated);
    }

    #[test]
    fn each_job_gets_its_own_identifier() {
        let mut jobs = Jobs::default();
        let (first, _, _) = jobs.start("track", &decoded(), JobMode::Performance);
        let (second, _, _) = jobs.start("track", &decoded(), JobMode::Performance);
        assert_ne!(first, second);
    }

    #[test]
    fn export_writes_only_the_selected_stems_of_the_job() {
        let root = scratch("export");
        let mut jobs = Jobs::default();
        let (id, _, _) = jobs.start("ma piste", &decoded(), JobMode::Performance);

        let paths = jobs.export(&id, &root, &[Stem::Bass]).unwrap();

        assert_eq!(paths, vec![root.join("ma piste__bass.wav")]);
        assert!(root.join("ma piste__bass.wav").is_file());
        assert!(!root.join("ma piste__vocals.wav").exists());
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn unknown_job_is_refused() {
        let root = scratch("unknown");
        let err = Jobs::default().export("absent", &root, &[Stem::Vocals]).unwrap_err();
        assert_eq!(err.code, ErrorCode::InvalidArgument);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn cancelled_job_writes_nothing_and_is_refused_with_cancelled() {
        let root = scratch("cancelled");
        let mut jobs = Jobs::default();
        let (id, _, _) = jobs.start("track", &decoded(), JobMode::Performance);

        jobs.cancel(&id).unwrap();
        let err = jobs.export(&id, &root, &[Stem::Vocals]).unwrap_err();

        assert_eq!(err.code, ErrorCode::Cancelled);
        assert_eq!(fs::read_dir(&root).unwrap().count(), 0);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn cancelling_an_unknown_job_is_ignored() {
        assert!(Jobs::default().cancel("absent").is_ok());
    }

    #[test]
    fn stem_wav_is_the_requested_stem_encoded_as_wav() {
        let mut jobs = Jobs::default();
        let (id, _mode, _) = jobs.start("track", &decoded(), JobMode::Performance);

        let bytes = jobs.stem_wav(&id, Stem::Drums).unwrap();

        assert_eq!(&bytes[0..4], b"RIFF");
        assert_eq!(bytes.len(), 44 + 16);
        // Simulation : chaque stem vaut un quart de la source (0.25 * 0.25 = 0.0625).
        assert_eq!(&bytes[44..48], &0.0625f32.to_le_bytes());
    }

    #[test]
    fn stem_wav_of_a_cancelled_job_is_refused() {
        let mut jobs = Jobs::default();
        let (id, _mode, _) = jobs.start("track", &decoded(), JobMode::Performance);
        jobs.cancel(&id).unwrap();
        let err = jobs.stem_wav(&id, Stem::Drums).unwrap_err();
        assert_eq!(err.code, ErrorCode::Cancelled);
    }

    #[test]
    fn stem_wav_of_an_unknown_job_is_refused() {
        let err = Jobs::default().stem_wav("absent", Stem::Drums).unwrap_err();
        assert_eq!(err.code, ErrorCode::InvalidArgument);
    }
}
