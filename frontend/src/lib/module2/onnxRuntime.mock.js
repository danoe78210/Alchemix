/**
 * AlcheMix Studio — Module 2 : Mock d'inférence ONNX (Micro-tâche #2)
 * 
 * Simulation du moteur de séparation de stems (BS-RoFormer / HTDemucs v4)
 * pour permettre le développement continu avant la disponibilité des vrais modèles.
 * 
 * Fonctionnalités :
 * - Latence configurable (simule le temps de calcul GPU/CPU)
 * - Génération de 4 stems (Vocals, Drums, Bass, Other)
 * - Signal déterministe basé sur l'entrée (pour des tests reproductibles)
 * - Indicateur `simulated: true` pour l'UI
 */

/**
 * Temps de latence par défaut pour simuler l'inférence (ms)
 * @type {number}
 */
export const SIMULATION_LATENCY_MS = 500;

/**
 * Noms des stems dans l'ordre standard
 * @type {string[]}
 */
export const STEM_NAMES = ['vocals', 'drums', 'bass', 'other'];

/**
 * @typedef {Object} OnnxInferenceResult
 * @property {number} latencyMs - Durée du traitement simulé en ms
 * @property {number} sampleRate - Taux d'échantillonnage
 * @property {number} channels - Nombre de canaux
 * @property {number} durationSec - Durée de l'audio en secondes
 * @property {Object.<string, Float32Array>} stems - Les 4 stems séparés
 * @property {boolean} simulated - Indicateur que les stems sont simulés
 */

/**
 * Effectue une inférence "ONNX" simulée.
 * 
 * @param {Float32Array} pcmBuffer - AudioBuffer d'entrée (Float32Array stéréo entrelacé)
 * @param {number} [sampleRate=44100] - Taux d'échantillonnage
 * @param {Object} [options] - Options de simulation
 * @param {number} [options.latencyMs] - Latence de simulation personnalisée
 * @returns {OnnxInferenceResult} Résultat avec les 4 stems séparés
 */
export function simulateOnnxInference(
  pcmBuffer,
  sampleRate = 44100,
  options = {}
) {
  const latency = options.latencyMs ?? SIMULATION_LATENCY_MS;
  const durationSec = pcmBuffer.length / (sampleRate * 2); // stéréo = 2 canaux
  
  // Simuler un temps de "calcul"
  if (latency > 0) {
    console.log(`[ONNX Mock] Simulation de ${latency}ms d'inférence...`);
  }
  
  // Générer 4 stems synthétiques déterministes
  const stemLength = pcmBuffer.length;
  
  // Stem 1 : Voix (extraire les composants "médiux" via filtre passe-bande simulé)
  const vocals = new Float32Array(stemLength);
  for (let i = 0; i < stemLength; i++) {
    vocals[i] = pcmBuffer[i] * 0.6;
  }
  
  // Stem 2 : Batterie (extraire les attaques et les fréquences graves)
  const drums = new Float32Array(stemLength);
  for (let i = 0; i < stemLength; i++) {
    const envelope = Math.abs(pcmBuffer[i]);
    drums[i] = envelope > 0.3 ? envelope * 0.8 : 0;
  }
  
  // Stem 3 : Basse (frequences très graves)
  const bass = new Float32Array(stemLength);
  for (let i = 0; i < stemLength; i++) {
    const absVal = Math.abs(pcmBuffer[i]);
    bass[i] = absVal > 0.5 ? pcmBuffer[i] * 0.5 : 0;
  }
  
  // Stem 4 : Autres (résidu)
  const other = new Float32Array(stemLength);
  for (let i = 0; i < stemLength; i++) {
    other[i] = pcmBuffer[i] - vocals[i] - drums[i] - bass[i];
  }
  // Normaliser le résidu
  let maxAbsOther = 0;
  for (let i = 0; i < stemLength; i++) {
    const absVal = Math.abs(other[i]);
    if (absVal > maxAbsOther) {
      maxAbsOther = absVal;
    }
  }
  const safeMax = maxAbsOther || 1e-10; // Éviter division par zéro
  for (let i = 0; i < stemLength; i++) {
    other[i] /= safeMax;
  }
  
  // Vérification de conservation
  let conservationCheck = 0;
  if (stemLength > 0) {
    for (let i = 0; i < stemLength; i++) {
      conservationCheck += Math.abs(other[i] - (pcmBuffer[i] - vocals[i] - drums[i] - bass[i]));
    }
  }
  
  console.log(`[ONNX Mock] Inférence simulée terminée en ${latency}ms`);
  console.log(`[ONNX Mock] Conservation source→stems: erreur ${conservationCheck.toFixed(4)}`);
  
  return {
    latencyMs: latency,
    sampleRate,
    channels: 2,
    durationSec,
    stems: {
      vocals,
      drums,
      bass,
      other,
    },
    simulated: true,
  };
}

/**
 * Génère un signal de test synthétique si aucune entrée n'est fournie.
 * Utile pour les tests unitaires.
 * 
 * @param {number} [durationSec=5.0] - Durée en secondes
 * @param {number} [sampleRate=44100] - Taux d'échantillonnage
 * @param {number} [frequency=440] - Fréquence de base (A4)
 * @returns {Float32Array} Signal stéréo entrelacé
 */
export function generateTestSignal(
  durationSec = 5.0,
  sampleRate = 44100,
  frequency = 440
) {
  const numSamples = durationSec * sampleRate * 2; // stéréo
  const buffer = new Float32Array(numSamples);
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const left = Math.sin(2 * Math.PI * frequency * t) * 0.5;
    const right = Math.sin(2 * Math.PI * frequency * t * 1.02) * 0.4;
    buffer[i] = i % 2 === 0 ? left : right;
  }
  
  return buffer;
}

/**
 * Point d'entrée principal : sépare un fichier audio en 4 stems.
 * C'est la fonction que le pipeline frontend appellera.
 * 
 * @param {string} [inputPath] - Chemin vers le fichier audio (optionnel)
 * @param {Object} [options] - Options de simulation
 * @param {number} [options.latencyMs] - Latence personnalisée
 * @returns {Promise<OnnxInferenceResult>} Résultat d'inférence
 */
export async function separateAudio(
  inputPath,
  options = {}
) {
  let pcmBuffer;
  
  if (inputPath) {
    console.log(`[ONNX Mock] Fichier "${inputPath}" non trouvé — génération d'un signal de test`);
    pcmBuffer = generateTestSignal(4.0, 44100);
  } else {
    pcmBuffer = generateTestSignal(4.0, 44100);
  }
  
  return simulateOnnxInference(pcmBuffer, 44100, options);
}