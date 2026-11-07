//! Mode simulation (FR-007, T006) : stems fictifs de même durée que la source, signalés `simulated: true`.
//! Utilisé tant que les modèles ONNX ne sont pas installés. Les stems sont des fractions égales de la
//! source : leur somme redonne le signal d'origine, ce qui permet de tester l'export et les mesures de résidu.

use crate::module2::encode::{Stem, StemAudio};

/// Résultat d'une séparation. `simulated` vaut `true` tant que les stems ne viennent pas d'un modèle.
#[derive(Debug, Clone, PartialEq)]
pub struct Separation {
    pub simulated: bool,
    pub stems: Vec<StemAudio>,
}

/// Quatre stems fictifs (voix, batterie, basse, autres), chacun de même longueur que `input`.
pub fn simulate_separation(input: &[f32]) -> Separation {
    const ORDER: [Stem; 4] = [Stem::Vocals, Stem::Drums, Stem::Bass, Stem::Other];
    let stems = ORDER
        .iter()
        .map(|&stem| StemAudio {
            stem,
            samples: input.iter().map(|x| x * 0.25).collect(),
        })
        .collect();
    Separation { simulated: true, stems }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn source() -> Vec<f32> {
        vec![0.8, -0.4, 0.2, 0.6, -0.2, 0.0]
    }

    #[test]
    fn result_is_flagged_as_simulated() {
        assert!(simulate_separation(&source()).simulated);
    }

    #[test]
    fn four_stems_in_contract_order_with_the_source_length() {
        let separation = simulate_separation(&source());
        let order: Vec<Stem> = separation.stems.iter().map(|s| s.stem).collect();
        assert_eq!(order, vec![Stem::Vocals, Stem::Drums, Stem::Bass, Stem::Other]);
        for stem in &separation.stems {
            assert_eq!(stem.samples.len(), source().len());
        }
    }

    #[test]
    fn the_four_stems_add_back_to_the_source() {
        let input = source();
        let separation = simulate_separation(&input);
        for (i, expected) in input.iter().enumerate() {
            let sum: f32 = separation.stems.iter().map(|s| s.samples[i]).sum();
            assert!((sum - expected).abs() < 1e-6, "échantillon {i} : {sum} au lieu de {expected}");
        }
    }
}
