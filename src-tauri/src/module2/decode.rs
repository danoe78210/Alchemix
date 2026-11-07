//! Décodage d'un fichier audio d'entrée (FR-009, T004) : MP3, FLAC et WAV, via la crate `symphonia`.
//! Seul le stéréo est pris en charge : les échantillons sont renvoyés en float32 entrelacé.

use crate::module2::error::{ErrorCode, Module2Error};
use serde::Serialize;
use std::path::Path;

/// Piste décodée : échantillons stéréo entrelacés (gauche, droite, gauche...) en float32.
#[derive(Debug, Clone, PartialEq)]
pub struct DecodedAudio {
    pub sample_rate: u32,
    pub samples: Vec<f32>,
}

/// Métadonnées d'une piste pour l'en-tête du Module 2 : import sans lancer la séparation.
#[derive(Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TrackInfo {
    pub duration_seconds: f64,
    pub sample_rate: u32,
    pub channels: u16,
}

/// Lit durée, fréquence et canaux du fichier en le décodant (stéréo uniquement, comme `decode_file`).
pub fn probe_file(path: &Path) -> Result<TrackInfo, Module2Error> {
    let decoded = decode_file(path)?;
    let frames = (decoded.samples.len() / 2) as f64;
    Ok(TrackInfo {
        duration_seconds: frames / decoded.sample_rate as f64,
        sample_rate: decoded.sample_rate,
        channels: 2,
    })
}

/// Décode le fichier `path`. Erreurs : `FILE_NOT_FOUND`, `UNSUPPORTED_FORMAT`, `DECODE_FAILED`.
pub fn decode_file(path: &Path) -> Result<DecodedAudio, Module2Error> {
    use symphonia::core::audio::Channels;
    use symphonia::core::codecs::audio::AudioDecoderOptions;
    use symphonia::core::errors::Error;
    use symphonia::core::formats::probe::Hint;
    use symphonia::core::formats::{FormatOptions, TrackType};
    use symphonia::core::io::MediaSourceStream;
    use symphonia::core::meta::MetadataOptions;

    let file = std::fs::File::open(path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            Module2Error::new(ErrorCode::FileNotFound, format!("fichier introuvable : {}", path.display()))
        } else {
            Module2Error::new(ErrorCode::DecodeFailed, e.to_string())
        }
    })?;
    let stream = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }
    let unsupported = |e: &dyn std::fmt::Display| Module2Error::new(ErrorCode::UnsupportedFormat, e.to_string());

    let mut format = symphonia::default::get_probe()
        .probe(&hint, stream, FormatOptions::default(), MetadataOptions::default())
        .map_err(|e| unsupported(&e))?;
    let track = format
        .default_track(TrackType::Audio)
        .ok_or_else(|| Module2Error::new(ErrorCode::UnsupportedFormat, "aucune piste audio"))?;
    let track_id = track.id;
    let params = track
        .codec_params
        .as_ref()
        .and_then(|p| p.audio())
        .ok_or_else(|| Module2Error::new(ErrorCode::UnsupportedFormat, "piste sans codec audio"))?;
    let sample_rate = params
        .sample_rate
        .ok_or_else(|| Module2Error::new(ErrorCode::UnsupportedFormat, "fréquence d'échantillonnage inconnue"))?;
    if params.channels.as_ref().map(Channels::count) != Some(2) {
        return Err(Module2Error::new(ErrorCode::UnsupportedFormat, "seul le stéréo est pris en charge"));
    }
    let mut decoder = symphonia::default::get_codecs()
        .make_audio_decoder(params, &AudioDecoderOptions::default())
        .map_err(|e| unsupported(&e))?;

    let mut samples: Vec<f32> = Vec::new();
    loop {
        let packet = match format.next_packet() {
            Ok(Some(packet)) => packet,
            Ok(None) => break,
            Err(e) => return Err(Module2Error::new(ErrorCode::DecodeFailed, e.to_string())),
        };
        if packet.track_id != track_id {
            continue;
        }
        match decoder.decode(&packet) {
            Ok(buffer) => {
                let start = samples.len();
                samples.resize(start + buffer.samples_interleaved(), 0.0);
                buffer.copy_to_slice_interleaved(&mut samples[start..]);
            }
            // Un paquet corrompu est ignoré, comme dans l'exemple de la crate.
            Err(Error::DecodeError(_)) => continue,
            Err(e) => return Err(Module2Error::new(ErrorCode::DecodeFailed, e.to_string())),
        }
    }
    Ok(DecodedAudio { sample_rate, samples })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::module2::encode::write_wav;
    use std::fs;

    /// Dossier temporaire unique par test, jamais un dossier réel de l'utilisateur.
    fn scratch(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("alchemix-m2-decode-{}-{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    /// WAV float32 mono écrit à la main : le décodeur doit le refuser (stéréo seulement).
    fn mono_wav(samples: &[f32]) -> Vec<u8> {
        let data_len = (samples.len() * 4) as u32;
        let mut bytes = Vec::new();
        bytes.extend_from_slice(b"RIFF");
        bytes.extend_from_slice(&(36 + data_len).to_le_bytes());
        bytes.extend_from_slice(b"WAVEfmt ");
        bytes.extend_from_slice(&16u32.to_le_bytes());
        bytes.extend_from_slice(&3u16.to_le_bytes());
        bytes.extend_from_slice(&1u16.to_le_bytes());
        bytes.extend_from_slice(&44_100u32.to_le_bytes());
        bytes.extend_from_slice(&(44_100u32 * 4).to_le_bytes());
        bytes.extend_from_slice(&4u16.to_le_bytes());
        bytes.extend_from_slice(&32u16.to_le_bytes());
        bytes.extend_from_slice(b"data");
        bytes.extend_from_slice(&data_len.to_le_bytes());
        for s in samples {
            bytes.extend_from_slice(&s.to_le_bytes());
        }
        bytes
    }

    #[test]
    fn decodes_a_stereo_float_wav_back_to_the_same_samples() {
        let root = scratch("roundtrip");
        let file = root.join("source.wav");
        let samples = vec![0.25, -0.5, 0.75, 0.0];
        write_wav(&file, 44_100, &samples).unwrap();

        let decoded = decode_file(&file).unwrap();

        assert_eq!(decoded.sample_rate, 44_100);
        assert_eq!(decoded.samples.len(), samples.len());
        for (got, want) in decoded.samples.iter().zip(samples.iter()) {
            assert!((got - want).abs() < 1e-6);
        }
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn probe_reports_duration_sample_rate_and_channels() {
        let root = scratch("probe");
        let file = root.join("source.wav");
        // 1 seconde de stéréo : 44 100 trames, 88 200 échantillons entrelacés.
        let samples = vec![0.0f32; 44_100 * 2];
        write_wav(&file, 44_100, &samples).unwrap();

        let info = probe_file(&file).unwrap();

        assert_eq!(info.sample_rate, 44_100);
        assert_eq!(info.channels, 2);
        assert!((info.duration_seconds - 1.0).abs() < 1e-6);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn probe_of_a_missing_file_is_file_not_found() {
        let root = scratch("probe-missing");
        let err = probe_file(&root.join("absent.mp3")).unwrap_err();
        assert_eq!(err.code, ErrorCode::FileNotFound);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn missing_file_is_reported_as_file_not_found() {
        let root = scratch("missing");
        let err = decode_file(&root.join("absent.mp3")).unwrap_err();
        assert_eq!(err.code, ErrorCode::FileNotFound);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn a_file_that_is_not_audio_is_unsupported() {
        let root = scratch("not-audio");
        let file = root.join("faux.mp3");
        fs::write(&file, b"ceci n'est pas un fichier audio").unwrap();
        let err = decode_file(&file).unwrap_err();
        assert_eq!(err.code, ErrorCode::UnsupportedFormat);
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn mono_audio_is_refused_because_only_stereo_is_supported() {
        let root = scratch("mono");
        let file = root.join("mono.wav");
        fs::write(&file, mono_wav(&[0.1, 0.2, 0.3])).unwrap();
        let err = decode_file(&file).unwrap_err();
        assert_eq!(err.code, ErrorCode::UnsupportedFormat);
        fs::remove_dir_all(&root).unwrap();
    }
}
