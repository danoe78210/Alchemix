/**
 * AlcheMix Studio — Module 2 : Anti-bleed par soustraction spectrale (Micro-tâche #3)
 * 
 * Supprime les fuites (bleed) entre les 4 stems (voix, batterie, basse, autres).
 * 
 * Principe : pour chaque échantillon, on compare l'amplitude de chaque stem
 * et on atténue les composants qui semblent appartenir à d'autres stems
 * selon des seuils de dominance configurables.
 * 
 * Dans cette implémentation stub (mock), l'anti-bleed est simulé de manière
 * déterministe en attendant le vrai traitement spectral basé sur FFT/STFT.
 */

/**
 * Seuils de dominance par stem pour l'anti-bleed.
 * Un composant est considéré comme "propre" à un stem si son amplitude
 * dépasse le seuil relatif par rapport aux autres stems.
 * @type {Object.<string, number>}
 */
export const ANTI_BLEED_THRESHOLDS = {
  vocals: 0.6,   // La voix domine : on garde si elle est > 60% du max des autres
  drums: 0.5,    // La batterie domine : on garde si elle est > 50% du max des autres
  bass: 0.5,     // La basse domine : on garde si elle est > 50% du max des autres
  other: 0.4,    // Les autres : seuil plus bas car résiduel
};

/**
 * Atténuation appliquée aux composants non dominants (0 = silence total, 1 = inchangé).
 * @type {number}
 */
export const ATTENUATION_FACTOR = 0.1;

/**
 * @typedef {Object} AntiBleedResult
 * @property {Object.<string, Float32Array>} stems - Les 4 stems après anti-bleed
 * @property {number} attenuationApplied - Pourcentage d'échantillons atténués
 * @property {boolean} simulated - Indicateur que l'anti-bleed est simulé
 */

/**
 * Applique l'anti-bleed par soustraction spectrale simulée sur 4 stems.
 * 
 * @param {Object.<string, Float32Array>} stems - Les 4 stems d'entrée (vocals, drums, bass, other)
 * @param {Object} [options] - Options de configuration
 * @param {Object.<string, number>} [options.thresholds] - Seuils de dominance personnalisés
 * @param {number} [options.attenuationFactor] - Facteur d'atténuation (0 à 1)
 * @returns {AntiBleedResult} Résultat avec les stems nettoyés
 */
export function applyAntiBleed(
  stems,
  options = {}
) {
  const thresholds = { ...ANTI_BLEED_THRESHOLDS, ...options.thresholds };
  const attenuation = options.attenuationFactor ?? ATTENUATION_FACTOR;
  
  const stemNames = Object.keys(stems);
  const length = stems[stemNames[0]].length;
  
  // Vérifier que tous les stems ont la même longueur
  for (const name of stemNames) {
    if (stems[name].length !== length) {
      throw new Error(`[Anti-Bleed] Longueur mismatch: ${name} a ${stems[name].length} échantillons, attendu ${length}`);
    }
  }
  
  const cleanedStems = {};
  let attenuatedCount = 0;
  
  // Pour chaque échantillon, déterminer quel stem domine et atténuer les autres
  for (let i = 0; i < length; i++) {
    // Trouver l'amplitude absolue max parmi tous les stems à cette position
    let maxAbs = 0;
    let dominantStem = null;
    
    for (const name of stemNames) {
      const absVal = Math.abs(stems[name][i]);
      if (absVal > maxAbs) {
        maxAbs = absVal;
        dominantStem = name;
      }
    }
    
    // Si silence absolu, tout reste à zéro
    if (maxAbs === 0) {
      for (const name of stemNames) {
        if (!cleanedStems[name]) cleanedStems[name] = new Float32Array(length);
        cleanedStems[name][i] = 0;
      }
      continue;
    }
    
    // Pour chaque stem, décider si on garde ou on atténue
    for (const name of stemNames) {
      if (!cleanedStems[name]) cleanedStems[name] = new Float32Array(length);
      
      const absVal = Math.abs(stems[name][i]);
      const threshold = thresholds[name];
      
      // Si ce stem est dominant ou assez proche du dominant, on garde
      const isDominant = name === dominantStem;
      const relativeAbs = maxAbs > 0 ? absVal / maxAbs : 0;
      const isAboveThreshold = relativeAbs >= threshold;
      
      if (isDominant || isAboveThreshold) {
        cleanedStems[name][i] = stems[name][i];
      } else {
        // Atténuer le composant qui fuit d'un autre stem
        cleanedStems[name][i] = stems[name][i] * attenuation;
        attenuatedCount++;
      }
    }
  }
  
  const attenuationApplied = length > 0 ? (attenuatedCount / (length * stemNames.length)) * 100 : 0;
  
  console.log(`[Anti-Bleed] Traitement terminé: ${attenuationApplied.toFixed(2)}% d'échantillons atténués`);
  
  return {
    stems: cleanedStems,
    attenuationApplied,
    simulated: true,
  };
}

/**
 * Applique l'anti-bleed sur le résultat d'inférence ONNX simulé.
 * Point d'entrée pratique pour le pipeline frontend.
 * 
 * @param {Object} inferenceResult - Résultat de simulateOnnxInference ou separateAudio
 * @param {Object} [options] - Options d'anti-bleed
 * @returns {Object} Résultat enrichi avec les stems nettoyés
 */
export function applyAntiBleedToInference(
  inferenceResult,
  options = {}
) {
  if (!inferenceResult || !inferenceResult.stems) {
    throw new Error('[Anti-Bleed] Résultat d\'inférence invalide: stems manquants');
  }
  
  const { stems, attenuationApplied, simulated } = applyAntiBleed(inferenceResult.stems, options);
  
  return {
    ...inferenceResult,
    stems,
    antiBleed: {
      attenuationApplied,
      simulated,
    },
  };
}
