//! Découpage en segments pour le démixage (FR-003) : segments de 8,0 s, recouvrement de 87,5 %,
//! fenêtre linéaire pour le recollage sans clic.

/// Durée d'un segment d'inférence, en secondes (FR-003).
pub const SEGMENT_SECONDS: f64 = 8.0;

/// Recouvrement entre segments successifs, en fraction de la longueur (FR-003).
pub const OVERLAP_RATIO: f64 = 0.875;

/// Longueur d'un segment et pas entre deux débuts, en échantillons.
pub fn segment_and_hop(sample_rate: u32) -> (usize, usize) {
    let segment = (SEGMENT_SECONDS * sample_rate as f64).round() as usize;
    let hop = ((1.0 - OVERLAP_RATIO) * segment as f64).round() as usize;
    (segment, hop)
}

/// Débuts des segments couvrant `total` échantillons. Le dernier segment se termine à `total`.
/// Si `total` ne dépasse pas un segment, un seul segment démarre à 0.
pub fn chunk_starts(total: usize, sample_rate: u32) -> Vec<usize> {
    let (segment, hop) = segment_and_hop(sample_rate);
    if total <= segment {
        return vec![0];
    }
    // Les débuts réguliers restent strictement avant `total - segment` : pas de doublon avec le dernier.
    let mut starts: Vec<usize> = (0..)
        .map(|i| i * hop)
        .take_while(|&s| s + segment < total)
        .collect();
    starts.push(total - segment);
    starts
}

/// Fenêtre linéaire (triangle) de longueur `n`, bornée à une valeur minimale non nulle
/// pour que le recollage ne divise jamais par zéro aux extrémités.
pub fn linear_window(n: usize) -> Vec<f32> {
    if n < 2 {
        return vec![1.0; n];
    }
    (0..n)
        .map(|i| {
            let x = 2.0 * i as f32 / (n - 1) as f32 - 1.0;
            (1.0 - x.abs()).max(1e-4)
        })
        .collect()
}

/// Recollage par addition pondérée. `segments[i]` commence à `chunk_starts(total, sample_rate)[i]`
/// et contient au moins `segment_and_hop(sample_rate).0` échantillons. Retourne `total` échantillons.
pub fn overlap_add(total: usize, sample_rate: u32, segments: &[Vec<f32>]) -> Vec<f32> {
    let (segment, _) = segment_and_hop(sample_rate);
    let window = linear_window(segment);
    let len = total.max(segment);
    let mut acc = vec![0.0f32; len];
    let mut weight = vec![0.0f32; len];
    for (start, seg) in chunk_starts(total, sample_rate).iter().zip(segments) {
        for (i, (&x, &w)) in seg.iter().zip(&window).take(segment).enumerate() {
            acc[start + i] += w * x;
            weight[start + i] += w;
        }
    }
    acc.iter()
        .zip(&weight)
        .take(total)
        .map(|(a, w)| a / w)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    const SR: u32 = 100; // sample rate réduit : segments courts, tests rapides

    #[test]
    fn segment_is_eight_seconds_with_one_second_hop() {
        assert_eq!(segment_and_hop(44100), (352_800, 44_100));
    }

    #[test]
    fn ten_seconds_are_covered_by_overlapping_segments_ending_at_the_end() {
        // 10 s à 100 Hz = 1000 échantillons ; segment 800, pas 100
        let starts = chunk_starts(1000, SR);
        assert_eq!(starts, vec![0, 100, 200]);
        assert_eq!(starts.last().unwrap() + 800, 1000);
    }

    #[test]
    fn audio_shorter_than_one_segment_gives_a_single_chunk() {
        assert_eq!(chunk_starts(500, SR), vec![0]);
    }

    #[test]
    fn consecutive_starts_overlap_by_87_5_percent() {
        let starts = chunk_starts(5000, SR);
        for pair in starts.windows(2) {
            let overlap = 800 - (pair[1] - pair[0]);
            assert!(overlap >= 700, "overlap {} trop faible", overlap);
        }
    }

    #[test]
    fn linear_window_peaks_in_the_middle_and_never_reaches_zero() {
        let w = linear_window(9);
        assert!(w[4] > w[0]);
        assert!(w.iter().all(|&x| x > 0.0));
    }

    #[test]
    fn overlap_add_of_constant_segments_reconstructs_the_constant() {
        let total = 1000;
        let segment = 800;
        let starts = chunk_starts(total, SR);
        let segments: Vec<Vec<f32>> = starts.iter().map(|_| vec![1.0f32; segment]).collect();
        let out = overlap_add(total, SR, &segments);
        assert_eq!(out.len(), total);
        assert!(out.iter().all(|&x| (x - 1.0).abs() < 1e-5));
    }

    #[test]
    fn overlap_add_keeps_the_length_when_audio_is_shorter_than_a_segment() {
        let segments = vec![vec![0.5f32; 800]];
        let out = overlap_add(500, SR, &segments);
        assert_eq!(out.len(), 500);
        assert!(out.iter().all(|&x| (x - 0.5).abs() < 1e-5));
    }
}
