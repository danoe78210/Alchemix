//! Export sélectif des stems (FR-017, contrat §3.5) : `<piste>__<stem>.wav` dans le dossier de travail.
//! Les stems sont écrits en WAV float32 stéréo entrelacé, sans normalisation (rapport §11).

use crate::module2::error::{ErrorCode, Module2Error};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Stem {
    Vocals,
    Drums,
    Bass,
    Other,
}

impl Stem {
    pub fn as_str(self) -> &'static str {
        match self {
            Stem::Vocals => "vocals",
            Stem::Drums => "drums",
            Stem::Bass => "bass",
            Stem::Other => "other",
        }
    }
}

/// Un stem prêt à écrire : échantillons stéréo entrelacés (gauche, droite, gauche...) en float32.
#[derive(Debug, Clone, PartialEq)]
pub struct StemAudio {
    pub stem: Stem,
    pub samples: Vec<f32>,
}

/// Nom de fichier d'un stem exporté : `<piste>__<stem>.wav`.
pub fn stem_file_name(track: &str, stem: Stem) -> String {
    format!("{}__{}.wav", track, stem.as_str())
}

/// Écrit les stems demandés dans `work_dir` et retourne leurs chemins.
/// Tout est vérifié avant la première écriture : une erreur ne laisse aucun fichier partiel.
pub fn export_stems(
    work_dir: &Path,
    track: &str,
    sample_rate: u32,
    stems: &[StemAudio],
    selection: &[Stem],
) -> Result<Vec<PathBuf>, Module2Error> {
    if selection.is_empty() {
        return Err(Module2Error::new(ErrorCode::InvalidArgument, "aucun stem sélectionné"));
    }
    if !work_dir.is_dir() {
        return Err(Module2Error::new(
            ErrorCode::WorkdirNotWritable,
            format!("dossier de travail introuvable : {}", work_dir.display()),
        ));
    }
    let mut to_write = Vec::with_capacity(selection.len());
    for wanted in selection {
        let audio = stems
            .iter()
            .find(|s| s.stem == *wanted)
            .ok_or_else(|| Module2Error::new(ErrorCode::InvalidArgument, format!("stem absent : {}", wanted.as_str())))?;
        if audio.samples.len() % 2 != 0 {
            return Err(Module2Error::new(ErrorCode::InvalidArgument, "échantillons stéréo incomplets"));
        }
        to_write.push((work_dir.join(stem_file_name(track, *wanted)), audio));
    }
    let mut paths = Vec::with_capacity(to_write.len());
    for (path, audio) in to_write {
        write_wav(&path, sample_rate, &audio.samples)?;
        paths.push(path);
    }
    Ok(paths)
}

/// Encode un WAV float32 stéréo (format 3, 32 bits) à partir d'échantillons entrelacés.
pub(crate) fn encode_wav(sample_rate: u32, samples: &[f32]) -> Result<Vec<u8>, Module2Error> {
    let data_len = u32::try_from(samples.len() * 4)
        .map_err(|_| Module2Error::new(ErrorCode::InvalidArgument, "fichier audio trop long pour un WAV"))?;
    let channels: u16 = 2;
    let bits: u16 = 32;
    let block_align = channels * bits / 8;
    let byte_rate = sample_rate * u32::from(block_align);

    let mut bytes = Vec::with_capacity(44 + data_len as usize);
    bytes.extend_from_slice(b"RIFF");
    bytes.extend_from_slice(&(36 + data_len).to_le_bytes());
    bytes.extend_from_slice(b"WAVE");
    bytes.extend_from_slice(b"fmt ");
    bytes.extend_from_slice(&16u32.to_le_bytes());
    bytes.extend_from_slice(&3u16.to_le_bytes());
    bytes.extend_from_slice(&channels.to_le_bytes());
    bytes.extend_from_slice(&sample_rate.to_le_bytes());
    bytes.extend_from_slice(&byte_rate.to_le_bytes());
    bytes.extend_from_slice(&block_align.to_le_bytes());
    bytes.extend_from_slice(&bits.to_le_bytes());
    bytes.extend_from_slice(b"data");
    bytes.extend_from_slice(&data_len.to_le_bytes());
    for sample in samples {
        bytes.extend_from_slice(&sample.to_le_bytes());
    }
    Ok(bytes)
}

/// Écrit un WAV float32 stéréo (format 3, 32 bits) à partir d'échantillons entrelacés.
pub(crate) fn write_wav(path: &Path, sample_rate: u32, samples: &[f32]) -> Result<(), Module2Error> {
    let bytes = encode_wav(sample_rate, samples)?;
    std::fs::write(path, bytes).map_err(io_error)
}

/// Convertit une erreur d'écriture : disque plein (`DISK_FULL`), sinon dossier non inscriptible.
fn io_error(err: std::io::Error) -> Module2Error {
    let code = if err.kind() == std::io::ErrorKind::StorageFull {
        ErrorCode::DiskFull
    } else {
        ErrorCode::WorkdirNotWritable
    };
    Module2Error::new(code, err.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    /// Dossier temporaire unique par test, jamais un dossier réel de l'utilisateur.
    fn scratch(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("alchemix-m2-encode-{}-{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn audio(stem: Stem) -> StemAudio {
        StemAudio { stem, samples: vec![0.25, -0.5, 0.75, 0.0] }
    }

    #[test]
    fn stem_file_name_follows_the_contract() {
        assert_eq!(stem_file_name("Track A", Stem::Vocals), "Track A__vocals.wav");
    }

    #[test]
    fn empty_selection_is_refused_and_writes_nothing() {
        let root = scratch("empty");
        let stems = [audio(Stem::Vocals)];
        let err = export_stems(&root, "track", 44_100, &stems, &[]).unwrap_err();
        assert_eq!(err.code, ErrorCode::InvalidArgument);
        assert_eq!(fs::read_dir(&root).unwrap().count(), 0);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn only_selected_stems_are_written() {
        let root = scratch("selective");
        let stems = [audio(Stem::Vocals), audio(Stem::Drums), audio(Stem::Bass), audio(Stem::Other)];
        let paths = export_stems(&root, "track", 44_100, &stems, &[Stem::Drums, Stem::Other]).unwrap();
        assert_eq!(paths, vec![root.join("track__drums.wav"), root.join("track__other.wav")]);
        assert!(root.join("track__drums.wav").is_file());
        assert!(root.join("track__other.wav").is_file());
        assert!(!root.join("track__vocals.wav").exists());
        assert!(!root.join("track__bass.wav").exists());
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn written_file_is_stereo_float32_wav_with_the_right_length() {
        let root = scratch("format");
        let stems = [audio(Stem::Vocals)];
        export_stems(&root, "track", 44_100, &stems, &[Stem::Vocals]).unwrap();
        let bytes = fs::read(root.join("track__vocals.wav")).unwrap();
        assert_eq!(&bytes[0..4], b"RIFF");
        assert_eq!(&bytes[8..12], b"WAVE");
        assert_eq!(u16::from_le_bytes([bytes[20], bytes[21]]), 3, "format float");
        assert_eq!(u16::from_le_bytes([bytes[22], bytes[23]]), 2, "stéréo");
        assert_eq!(u32::from_le_bytes([bytes[24], bytes[25], bytes[26], bytes[27]]), 44_100);
        assert_eq!(u16::from_le_bytes([bytes[34], bytes[35]]), 32, "32 bits");
        assert_eq!(&bytes[36..40], b"data");
        assert_eq!(u32::from_le_bytes([bytes[40], bytes[41], bytes[42], bytes[43]]), 16);
        assert_eq!(bytes.len(), 44 + 16);
        assert_eq!(&bytes[44..48], &0.25f32.to_le_bytes());
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn missing_work_dir_is_refused() {
        let root = scratch("missing");
        let stems = [audio(Stem::Vocals)];
        let err = export_stems(&root.join("absent"), "track", 44_100, &stems, &[Stem::Vocals]).unwrap_err();
        assert_eq!(err.code, ErrorCode::WorkdirNotWritable);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn encoded_wav_is_the_same_bytes_as_the_file_written() {
        let root = scratch("encoded");
        let samples = vec![0.25, -0.5, 0.75, 0.0];
        write_wav(&root.join("a.wav"), 44_100, &samples).unwrap();
        assert_eq!(encode_wav(44_100, &samples).unwrap(), fs::read(root.join("a.wav")).unwrap());
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn storage_full_is_reported_as_disk_full() {
        let err = io_error(std::io::Error::new(std::io::ErrorKind::StorageFull, "disque plein"));
        assert_eq!(err.code, ErrorCode::DiskFull);
    }

    #[test]
    fn other_write_errors_stay_workdir_not_writable() {
        let err = io_error(std::io::Error::new(std::io::ErrorKind::PermissionDenied, "accès refusé"));
        assert_eq!(err.code, ErrorCode::WorkdirNotWritable);
    }

    #[test]
    fn selected_stem_absent_from_the_audio_is_refused_before_writing() {
        let root = scratch("absent-stem");
        let stems = [audio(Stem::Vocals)];
        let err = export_stems(&root, "track", 44_100, &stems, &[Stem::Vocals, Stem::Bass]).unwrap_err();
        assert_eq!(err.code, ErrorCode::InvalidArgument);
        assert_eq!(fs::read_dir(&root).unwrap().count(), 0);
        fs::remove_dir_all(&root).unwrap();
    }
}
