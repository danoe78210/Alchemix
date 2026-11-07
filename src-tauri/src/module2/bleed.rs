//! Anti-fuite entre stems par soustraction spectrale (FR-004, T008, carte alchemix#25).
//! Objectif : fuite entre stems adjacents inférieure à -30 dB, mesurée sur un signal de
//! référence (SC-003).
//!
//! Aucune crate FFT n'est présente dans `Cargo.toml` et le dépôt interdit d'en ajouter une
//! sans nécessité démontrée : la FFT radix-2 est donc écrite ici, en pur Rust, avec une
//! précision f64 en interne (les stems restent en f32 en entrée/sortie).
//!
//! Construction par sous-tâches (chaque étape est testée avant la suivante) :
//! - S1 : FFT radix-2 + tests — fait (5 tests au vert) ;
//! - S2 : STFT / iSTFT (fenêtre de Hann, pas = N/4) + test de reconstruction — fait ;
//! - S3 : métrique de fuite en dB entre stems adjacents — à faire ;
//! - S4 : soustraction spectrale anti-fuite + test FR-004 sur signal de référence + bornes — à faire.

use std::f64::consts::PI;

/// Taille de la FFT de la soustraction spectrale (puissance de 2).
pub const FFT_SIZE: usize = 2048;
/// Pas de la STFT : recouvrement de 75 % (N/4), standard pour le recollage par fenêtre de Hann.
pub const HOP_SIZE: usize = FFT_SIZE / 4;
/// Cible de fuite de FR-004 / SC-003, en dB.
pub const BLEED_TARGET_DB: f64 = -30.0;

/// FFT radix-2 itérative (Cooley-Tukey), en place, précision f64.
/// Rejette une taille nulle, non puissance de deux, ou des tableaux de longueurs différentes.
fn fft_inplace(re: &mut [f64], im: &mut [f64]) -> Result<(), &'static str> {
    let n = re.len();
    if n == 0 || n != im.len() || !n.is_power_of_two() {
        return Err("fft_inplace : taille nulle, non puissance de deux ou tableaux de tailles différentes");
    }
    // Permutation bit-reverse.
    let mut j = 0usize;
    for i in 0..n {
        if i < j {
            re.swap(i, j);
            im.swap(i, j);
        }
        let mut m = n >> 1;
        while m >= 1 && j & m != 0 {
            j &= !m;
            m >>= 1;
        }
        j |= m;
    }
    // Papillons.
    let mut len = 2usize;
    while len <= n {
        let ang = -2.0 * PI / len as f64;
        let (wr, wi) = (ang.cos(), ang.sin());
        let half = len / 2;
        let mut start = 0usize;
        while start < n {
            let (mut cr, mut ci) = (1.0f64, 0.0f64);
            for k in 0..half {
                let a = start + k;
                let b = a + half;
                let tr = re[b] * cr - im[b] * ci;
                let ti = re[b] * ci + im[b] * cr;
                re[b] = re[a] - tr;
                im[b] = im[a] - ti;
                re[a] += tr;
                im[a] += ti;
                let ncr = cr * wr - ci * wi;
                ci = cr * wi + ci * wr;
                cr = ncr;
            }
            start += len;
        }
        len <<= 1;
    }
    Ok(())
}

/// Un bin spectral (parties réelle et imaginaire), précision f64.
#[derive(Clone, Copy, Debug)]
struct Bin {
    re: f64,
    im: f64,
}

impl Bin {
    fn mag2(self) -> f64 {
        self.re * self.re + self.im * self.im
    }
}

/// Fenêtre de Hann de longueur `n`, avec un plancher de 1e-4 pour que le recollage
/// ne divise jamais par zéro aux extrémités (même garde que `chunk::linear_window`).
fn hann(n: usize) -> Vec<f64> {
    if n < 2 {
        return vec![1.0; n];
    }
    (0..n)
        .map(|i| {
            let w = 0.5 * (1.0 - (2.0 * PI * i as f64 / (n - 1) as f64).cos());
            w.max(1e-4)
        })
        .collect()
}

/// FFT inverse en place : conjuguée de la FFT de la conjuguée, divisée par n.
fn ifft_inplace(re: &mut [f64], im: &mut [f64]) -> Result<(), &'static str> {
    for v in im.iter_mut() {
        *v = -*v;
    }
    fft_inplace(re, im)?;
    let n = re.len() as f64;
    for v in im.iter_mut() {
        *v = -*v / n;
    }
    for v in re.iter_mut() {
        *v /= n;
    }
    Ok(())
}

/// STFT d'un signal mono : trames de `n` échantillons fenêtrées (Hann), pas de `hop`,
/// dernière trame complétée par des zéros. Retourne une trame par position de départ.
/// `n` doit être une puissance de 2 >= 2 et `hop` >= 1.
fn stft(x: &[f32], n: usize, hop: usize) -> Vec<Vec<Bin>> {
    assert!(n >= 2 && n.is_power_of_two(), "stft : n doit être une puissance de 2 >= 2");
    assert!(hop >= 1, "stft : hop doit être >= 1");
    let window = hann(n);
    let mut frames = Vec::new();
    let mut start = 0;
    while start < x.len() {
        let mut re = vec![0.0f64; n];
        let mut im = vec![0.0f64; n];
        for (i, &s) in x[start..].iter().take(n).enumerate() {
            re[i] = s as f64 * window[i];
        }
        fft_inplace(&mut re, &mut im).expect("n est une puissance de 2");
        frames.push(re.into_iter().zip(im).map(|(re, im)| Bin { re, im }).collect());
        start += hop;
    }
    frames
}

/// iSTFT : fenêtre de synthèse Hann identique, recouvrement-addition, puis division par la
/// somme des carrés de fenêtre (COLA) pour rendre l'amplitude. Retourne `total` échantillons.
fn istft(frames: &[Vec<Bin>], n: usize, hop: usize, total: usize) -> Vec<f32> {
    let window = hann(n);
    let mut acc = vec![0.0f64; total];
    let mut wsum = vec![0.0f64; total];
    for (f, frame) in frames.iter().enumerate() {
        let start = f * hop;
        let mut re: Vec<f64> = frame.iter().map(|b| b.re).collect();
        let mut im: Vec<f64> = frame.iter().map(|b| b.im).collect();
        ifft_inplace(&mut re, &mut im).expect("taille de trame = n, puissance de 2");
        for (i, (&r, &w)) in re.iter().zip(&window).enumerate() {
            let pos = start + i;
            if pos >= total {
                break;
            }
            acc[pos] += w * r;
            wsum[pos] += w * w;
        }
    }
    acc.iter()
        .zip(&wsum)
        .map(|(&a, &w)| if w > 1e-12 { (a / w) as f32 } else { 0.0 })
        .collect()
}

// ---- S3 : métrique de fuite entre stems adjacents ----

/// Seuil de dominance en amplitude (2.0 ≈ 6 dB) : au-delà, un bin est attribué au stem le
/// plus fort et soustrait de l'autre (comparaison sur les énergies, carrés des modules).
pub const DOMINANCE_RATIO: f64 = 2.0;
/// Plancher du ratio de fuite (1e-12, soit -120 dB) pour éviter -inf.
pub const BLEED_FLOOR: f64 = 1e-12;

/// Énergie spectrale totale (somme des carrés des modules sur toutes les trames et bins).
fn spectral_energy(frames: &[Vec<Bin>]) -> f64 {
    frames.iter().flat_map(|f| f.iter()).map(|b| b.mag2()).sum()
}

/// Fuite d'une paire de stems (a, b), en dB :
/// `10·log10( Σ min(|A|,|B|)² / min(Σ|A|², Σ|B|²) )`, plancher à `BLEED_FLOOR` (-120 dB).
/// Numérateur : énergie spectrale partagée (le bleed). Dénominateur : énergie du stem
/// le plus faible de la paire, celui qui subit le plus la fuite.
fn pair_bleed_db(a: &[f32], b: &[f32]) -> f64 {
    let fa = stft(a, FFT_SIZE, HOP_SIZE);
    let fb = stft(b, FFT_SIZE, HOP_SIZE);
    let mut shared = 0.0f64;
    for (ta, tb) in fa.iter().zip(&fb) {
        for (ba, bb) in ta.iter().zip(tb) {
            shared += ba.mag2().min(bb.mag2());
        }
    }
    let denom = spectral_energy(&fa).min(spectral_energy(&fb));
    if denom <= 0.0 {
        return -120.0; // un des deux stems est silencieux : aucune fuite mesurable
    }
    10.0 * (shared / denom).max(BLEED_FLOOR).log10()
}

/// Fuite entre stems adjacents (paires (0,1), (1,2), ...), en dB : la pire des paires.
/// Sans paire (0 ou 1 stem) ou stems silencieux : -120 dB.
pub fn measure_bleed_db(stems: &[Vec<f32>]) -> f64 {
    let mut worst = -120.0f64;
    for pair in stems.windows(2) {
        worst = worst.max(pair_bleed_db(&pair[0], &pair[1]));
    }
    worst
}

// ---- S4 : soustraction spectrale anti-fuite ----

/// Rapport de la soustraction spectrale : fuite avant/après (pire paire adjacente, en dB)
/// et nombre de paires traitées.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct BleedReport {
    pub before_db: f64,
    pub after_db: f64,
    pub pairs: usize,
}

/// Soustraction spectrale anti-fuite entre stems adjacents (FR-004), en place.
/// Par paire (i, i+1), trame et bin : si un stem domine l'autre d'au moins `DOMINANCE_RATIO`
/// (≈ 6 dB), le bin du stem faible est soustrait (remis à zéro) ; le stem dominant conserve
/// son contenu et sa phase. En dessous du seuil, le bin est jugé commun et inchangé.
/// Conséquence documentée : la somme des stems ne vaut plus le mix après traitement.
pub fn reduce_bleed(stems: &mut [Vec<f32>]) -> BleedReport {
    let before_db = measure_bleed_db(stems);
    let pairs = stems.len().saturating_sub(1);
    for i in 0..pairs {
        let (left, right) = stems.split_at_mut(i + 1);
        subtract_pair(&mut left[i], &mut right[0]);
    }
    let after_db = measure_bleed_db(stems);
    BleedReport { before_db, after_db, pairs }
}

/// Soustraction spectrale d'une paire de stems adjacents, en place ; longueurs préservées.
fn subtract_pair(a: &mut Vec<f32>, b: &mut Vec<f32>) {
    let len_a = a.len();
    let len_b = b.len();
    let mut fa = stft(a, FFT_SIZE, HOP_SIZE);
    let mut fb = stft(b, FFT_SIZE, HOP_SIZE);
    let r2 = DOMINANCE_RATIO * DOMINANCE_RATIO;
    for (ta, tb) in fa.iter_mut().zip(fb.iter_mut()) {
        for (ba, bb) in ta.iter_mut().zip(tb.iter_mut()) {
            let ma = ba.mag2();
            let mb = bb.mag2();
            if ma >= r2 * mb {
                *bb = Bin { re: 0.0, im: 0.0 };
            } else if mb >= r2 * ma {
                *ba = Bin { re: 0.0, im: 0.0 };
            }
        }
    }
    *a = istft(&fa, FFT_SIZE, HOP_SIZE, len_a);
    *b = istft(&fb, FFT_SIZE, HOP_SIZE, len_b);
}

#[cfg(test)]
mod tests {
    use super::*;

    /// DFT naïve O(n²), référence indépendante pour valider la FFT rapide.
    fn dft_naive(x: &[f64]) -> (Vec<f64>, Vec<f64>) {
        let n = x.len();
        let mut re = vec![0.0; n];
        let mut im = vec![0.0; n];
        for k in 0..n {
            for t in 0..n {
                let ang = -2.0 * PI * (k * t) as f64 / n as f64;
                re[k] += x[t] * ang.cos();
                im[k] += x[t] * ang.sin();
            }
        }
        (re, im)
    }

    // ---- S1 : FFT radix-2 ----

    #[test]
    fn fft_rejects_bad_sizes_but_accepts_one() {
        // 1 = 2^0 est une taille valide (FFT identité).
        assert!(fft_inplace(&mut [1.0], &mut [0.0]).is_ok());
        assert!(fft_inplace(&mut vec![0.0; 3], &mut vec![0.0; 3]).is_err(), "3 n'est pas une puissance de 2");
        assert!(fft_inplace(&mut vec![0.0; 4], &mut vec![0.0; 2]).is_err(), "tailles différentes");
        assert!(fft_inplace(&mut [], &mut []).is_err(), "taille nulle");
    }

    #[test]
    fn fft_of_a_constant_is_a_peak_at_bin_zero() {
        let mut re = vec![1.0; 8];
        let mut im = vec![0.0; 8];
        fft_inplace(&mut re, &mut im).unwrap();
        assert!((re[0] - 8.0).abs() < 1e-9);
        for k in 1..8 {
            assert!(re[k].abs() < 1e-9 && im[k].abs() < 1e-9, "bin {k} non nul");
        }
    }

    #[test]
    fn fft_matches_the_naive_dft_on_a_small_signal() {
        let x: Vec<f64> = (0..16).map(|t| (t as f64 * 0.7).sin() + 0.3 * t as f64).collect();
        let mut re = x.clone();
        let mut im = vec![0.0; 16];
        fft_inplace(&mut re, &mut im).unwrap();
        let (nre, nim) = dft_naive(&x);
        for k in 0..16 {
            assert!((re[k] - nre[k]).abs() < 1e-9, "partie réelle bin {k}");
            assert!((im[k] - nim[k]).abs() < 1e-9, "partie imaginaire bin {k}");
        }
    }

    #[test]
    fn fft_of_a_cosine_peaks_at_its_bin_with_half_the_amplitude() {
        let n = 64;
        let k = 3;
        let x: Vec<f64> = (0..n)
            .map(|t| (2.0 * PI * k as f64 * t as f64 / n as f64).cos())
            .collect();
        let mut re = x.clone();
        let mut im = vec![0.0; n];
        fft_inplace(&mut re, &mut im).unwrap();
        let peak = (re[k] * re[k] + im[k] * im[k]).sqrt();
        assert!((peak - n as f64 / 2.0).abs() < 1e-6, "pic attendu {}, obtenu {}", n / 2, peak);
        // Un cosinus réel répartit son énergie entre le bin k et le bin miroir n-k.
        let total: f64 = (0..n).map(|b| re[b] * re[b] + im[b] * im[b]).sum();
        let peak_energy = re[k] * re[k] + im[k] * im[k] + re[n - k] * re[n - k] + im[n - k] * im[n - k];
        assert!(peak_energy > 0.999 * total, "les bins {k} et {} doivent porter toute l'énergie", n - k);
    }

    #[test]
    fn inverse_fft_reconstructs_the_signal_via_conjugation() {
        // ifft(x) = conj(fft(conj(x))) / n ; utilisée par l'iSTFT (S2).
        let x: Vec<f64> = (0..32).map(|t| (t as f64 * 1.3).cos() - 0.2 * t as f64).collect();
        let mut re = x.clone();
        let mut im = vec![0.0; 32];
        fft_inplace(&mut re, &mut im).unwrap();
        for v in im.iter_mut() {
            *v = -*v;
        }
        fft_inplace(&mut re, &mut im).unwrap();
        for (i, v) in im.iter_mut().enumerate() {
            *v = -*v;
            re[i] /= 32.0;
        }
        for t in 0..32 {
            assert!((re[t] - x[t]).abs() < 1e-9, "échantillon {t}");
        }
    }

    // ---- S2 : STFT / iSTFT ----

    #[test]
    fn stft_istft_reconstructs_the_signal() {
        let n = 256;
        let hop = n / 4;
        let len: usize = 5000;
        let x: Vec<f32> = (0..len)
            .map(|t| (t as f32 * 0.05).sin() * 0.8 + (t as f32 * 0.013).cos() * 0.2)
            .collect();
        let frames = stft(&x, n, hop);
        assert_eq!(frames.len(), len.div_ceil(hop));
        let y = istft(&frames, n, hop, len);
        assert_eq!(y.len(), len);
        let max_err = x.iter().zip(&y).map(|(a, b)| (a - b).abs()).fold(0.0f32, f32::max);
        assert!(max_err < 1e-4, "erreur max de reconstruction {max_err}");
    }

    #[test]
    fn stft_of_a_short_signal_gives_one_zero_padded_frame() {
        // 50 échantillons < hop (64) : une seule trame, complétée par des zéros.
        let x = vec![0.5f32; 50];
        let frames = stft(&x, 256, 64);
        assert_eq!(frames.len(), 1);
        assert_eq!(frames[0].len(), 256);
        let y = istft(&frames, 256, 64, 50);
        assert_eq!(y.len(), 50);
        // Signal constant : l'amplitude est conservée au centre de la trame.
        assert!((y[25] - 0.5).abs() < 1e-3, "centre reconstruit à {}", y[25]);
    }

    #[test]
    fn stft_places_a_pure_tone_in_its_bin() {
        let n = 256;
        let k = 10;
        let x: Vec<f32> = (0..n * 4)
            .map(|t| (2.0 * PI * k as f64 * t as f64 / n as f64).cos() as f32)
            .collect();
        let frames = stft(&x, n, n / 4);
        let mid = &frames[2];
        let (peak_bin, _) = mid
            .iter()
            .enumerate()
            .max_by(|a, b| a.1.mag2().partial_cmp(&b.1.mag2()).unwrap())
            .unwrap();
        // Cosinus réel : deux pics miroirs d'égale magnitude aux bins k et n-k.
        assert!(peak_bin == k || peak_bin == n - k, "pic attendu aux bins {k} ou {}, obtenu {peak_bin}", n - k);
    }

    #[test]
    fn stft_of_an_empty_signal_gives_no_frames_and_istft_returns_empty() {
        let frames = stft(&[], 256, 64);
        assert!(frames.is_empty());
        assert!(istft(&frames, 256, 64, 0).is_empty());
    }

    // ---- S3/S4 : métrique de fuite et soustraction spectrale ----

    /// Signal de référence (SC-003) : deux stems dont le second contient une copie
    /// affaiblie d'une composante du premier — c'est la fuite à mesurer.
    /// Fréquences sur des bins exacts à 8 kHz / FFT 2048 (largeur de bin 3,90625 Hz :
    /// 500 Hz = bin 128, 1000 Hz = bin 256, 2000 Hz = bin 512).
    fn reference_stems() -> (Vec<f32>, Vec<f32>) {
        let sr = 8000.0;
        let len: usize = 8192;
        let tone = |freq: f64, amp: f64| -> Vec<f32> {
            (0..len)
                .map(|i| (amp * (2.0 * PI * freq * i as f64 / sr).sin()) as f32)
                .collect()
        };
        let owner: Vec<f32> = tone(500.0, 0.5)
            .iter()
            .zip(&tone(1000.0, 0.4))
            .map(|(a, b)| *a + *b)
            .collect();
        let leak: Vec<f32> = tone(2000.0, 0.3)
            .iter()
            .zip(&tone(1000.0, 0.1))
            .map(|(a, b)| *a + *b)
            .collect();
        (owner, leak)
    }

    #[test]
    fn fr004_reference_signal_bleed_drops_below_minus_30_db() {
        let (owner, leak) = reference_stems();
        let mut stems = vec![owner.clone(), leak.clone()];
        let before = measure_bleed_db(&stems);
        assert!(before > BLEED_TARGET_DB, "avant traitement la fuite doit dépasser -30 dB, obtenu {before} dB");
        let report = reduce_bleed(&mut stems);
        assert_eq!(report.pairs, 1);
        assert_eq!(report.before_db, before);
        assert!(
            report.after_db < BLEED_TARGET_DB,
            "FR-004 : fuite après soustraction = {} dB, la cible est < -30 dB",
            report.after_db
        );
        assert!((measure_bleed_db(&stems) - report.after_db).abs() < 1e-9);
        // Le stem dominant conserve son énergie (seul le stem faible est soustrait).
        // Garde large en temporel : aux bords de trame, le plancher de fenêtre amplifie
        // la mise à zéro de bins de fuite minimes — effet attendu, sans impact d'énergie.
        let eo_before: f64 = owner.iter().map(|x| f64::from(*x) * f64::from(*x)).sum();
        let eo_after: f64 = stems[0].iter().map(|x| f64::from(*x) * f64::from(*x)).sum();
        assert!(eo_after > eo_before * 0.98, "énergie du stem dominant : {eo_after} avant {eo_before}");
        let max_err = owner.iter().zip(&stems[0]).map(|(a, b)| (a - b).abs()).fold(0.0f32, f32::max);
        assert!(max_err < 0.1, "stem dominant corrompu, erreur max {max_err}");
        // Le stem faible perd la composante partagée : son énergie baisse d'environ 10 %.
        let e_before: f64 = leak.iter().map(|x| f64::from(*x) * f64::from(*x)).sum();
        let e_after: f64 = stems[1].iter().map(|x| f64::from(*x) * f64::from(*x)).sum();
        assert!(e_after < e_before * 0.95, "énergie du stem faible : {e_after} avant {e_before}");
    }

    #[test]
    fn identical_stems_are_left_untouched() {
        // Pas de dominance (ratio 0 dB < 6 dB) : aucune soustraction, comme en mode simulation.
        let x: Vec<f32> = (0..4096).map(|i| (i as f32 * 0.01).sin()).collect();
        let mut stems = vec![x.clone(), x.clone()];
        let report = reduce_bleed(&mut stems);
        assert!((report.after_db - report.before_db).abs() < 1e-9, "pas de soustraction sans dominance");
        let err = stems[0].iter().zip(&x).map(|(a, b)| (a - b).abs()).fold(0.0f32, f32::max);
        assert!(err < 1e-4, "stem identique reconstruit avec erreur {err}");
    }

    #[test]
    fn empty_and_single_stem_have_no_bleed_and_are_untouched() {
        assert_eq!(measure_bleed_db(&[]), -120.0);
        let one = vec![vec![0.5f32; 100]];
        assert_eq!(measure_bleed_db(&one), -120.0);
        let mut stems = one.clone();
        let report = reduce_bleed(&mut stems);
        assert_eq!(report.pairs, 0);
        assert_eq!(stems, one, "aucune paire : les stems ne sont pas modifiés");
    }

    #[test]
    fn silent_stems_report_no_bleed() {
        let stems = vec![vec![0.0f32; 512], vec![0.0f32; 512]];
        assert_eq!(measure_bleed_db(&stems), -120.0);
    }

    #[test]
    fn stems_of_different_lengths_keep_their_lengths() {
        let a: Vec<f32> = (0..8192).map(|i| (i as f32 * 0.001).sin() * 0.5).collect();
        let b: Vec<f32> = (0..4000).map(|i| (i as f32 * 0.001).sin() * 0.1).collect();
        let mut stems = vec![a, b];
        let report = reduce_bleed(&mut stems);
        assert_eq!(report.pairs, 1);
        assert_eq!(stems[0].len(), 8192);
        assert_eq!(stems[1].len(), 4000);
        assert!(stems.iter().all(|s| s.iter().all(|x| x.is_finite())));
    }

    #[test]
    fn short_signal_below_one_frame_is_handled() {
        let mut stems = vec![vec![0.5f32; 100], vec![0.2f32; 100]];
        let report = reduce_bleed(&mut stems);
        assert_eq!(stems[0].len(), 100);
        assert_eq!(stems[1].len(), 100);
        assert!(report.after_db <= report.before_db + 1e-9);
        assert!(stems.iter().all(|s| s.iter().all(|x| x.is_finite())));
    }

    #[test]
    fn four_stems_give_three_adjacent_pairs() {
        let x: Vec<f32> = (0..4096).map(|i| (i as f32 * 0.02).sin()).collect();
        let mut stems: Vec<Vec<f32>> = (0..4)
            .map(|k| x.iter().map(|v| v * (0.1 + 0.1 * k as f32)).collect())
            .collect();
        let report = reduce_bleed(&mut stems);
        assert_eq!(report.pairs, 3);
        assert!(stems.iter().all(|s| s.len() == 4096 && s.iter().all(|v| v.is_finite())));
    }
}
