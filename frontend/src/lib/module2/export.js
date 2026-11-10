/**
 * AlcheMix Studio — Module 2 : Export des stems (Micro-tâche #4)
 * Export WAV complet + MP3 simulé.
 */

export const ExportFormat = {
  WAV: 'wav',
  MP3: 'mp3',
};

/**
 * Exporte un stem au format WAV.
 * @param {Float32Array} stemData - Données du stem en Float32Array (-1.0 à 1.0)
 * @param {number} sampleRate - Taux d'échantillonnage (ex: 44100)
 * @param {Object} [metadata] - Métadonnées optionnelles
 * @returns {ArrayBuffer} Buffer WAV formaté
 */
export function exportWav(stemData, sampleRate = 44100) {
  const numSamples = stemData.length;
  const numChannels = 2;
  const int16Data = new Int16Array(numSamples * numChannels);
  
  for (let i = 0; i < numSamples; i++) {
    const floatVal = Math.max(-1, Math.min(1, stemData[i]));
    const int16Val = Math.round(floatVal * 0x7FFF);
    int16Data[i * 2] = int16Val;
    int16Data[i * 2 + 1] = int16Val;
  }
  
  const header = new ArrayBuffer(44);
  const headerView = new DataView(header, 0, header.byteLength, true);
  
  // Utiliser des valeurs correctes pour l'encodage little-endian
  // "RIFF" = 0x52, 0x49, 0x46, 0x46 -> uint32 little-endian = 0x46464952
  headerView.setUint32(0, 0x46464952, true);
  headerView.setUint32(4, 36 + numSamples * 2 * numChannels, true);
  headerView.setUint32(8, 0x45564157, true); // "WAVE"
  headerView.setUint32(12, 0x20746d66, true); // "fmt "
  headerView.setUint32(16, 16, true);
  headerView.setUint16(20, 1, true);
  headerView.setUint16(22, numChannels, true);
  headerView.setUint32(24, sampleRate, true);
  headerView.setUint32(28, sampleRate * 2 * numChannels, true);
  headerView.setUint16(32, 2 * numChannels, true);
  headerView.setUint16(34, 16, true);
  headerView.setUint32(36, 0x61746164, true); // "data"
  headerView.setUint32(40, numSamples * 2 * numChannels, true);
  
  const int16Buffer = int16Data.buffer;
  const totalBuffer = new Uint8Array(headerView.byteLength + int16Buffer.byteLength);
  totalBuffer.set(new Uint8Array(header), 0);
  totalBuffer.set(new Uint8Array(int16Buffer), headerView.byteLength);
  
  return totalBuffer.buffer;
}

export function exportAllStemsWav(stems, sampleRate, metadata = {}) {
  const stemNames = ['vocals', 'drums', 'bass', 'other'];
  for (const name of stemNames) {
    if (!stems[name]) throw new Error(`[Export] Stem "${name}" manquant`);
  }
  const wavBuffers = {};
  for (const name of stemNames) {
    wavBuffers[name] = exportWav(stems[name], sampleRate, metadata);
  }
  return { format: 'wav', stems: wavBuffers, exportInfo: { format: 'wav', sampleRate, channels: 2, metadata }, simulated: true };
}

export function exportAllStemsMp3(stems, sampleRate, metadata = {}) {
  const stemNames = ['vocals', 'drums', 'bass', 'other'];
  for (const name of stemNames) {
    if (!stems[name]) throw new Error(`[Export] Stem "${name}" manquant`);
  }
  const mp3Buffers = {};
  for (const name of stemNames) {
    const numSamples = stems[name].length;
    const numChannels = 2;
    const int16Data = new Int16Array(numSamples * numChannels);
    for (let i = 0; i < numSamples; i++) {
      const floatVal = Math.max(-1, Math.min(1, stems[name][i]));
      const int16Val = Math.round(floatVal * 0x7FFF);
      int16Data[i * 2] = int16Val;
      int16Data[i * 2 + 1] = int16Val;
    }
    const approximateMp3Size = 4 + Math.ceil(numSamples * 2 * numChannels / 10);
    const mp3Buffer = new ArrayBuffer(approximateMp3Size);
    const mp3View = new DataView(mp3Buffer);
    mp3View.setUint8(0, 0xFF);
    mp3View.setUint8(1, 0xFB);
    mp3View.setUint8(2, 0x90);
    mp3View.setUint8(3, 0x00);
    mp3Buffers[name] = mp3Buffer;
  }
  return { format: 'mp3', stems: mp3Buffers, exportInfo: { format: 'mp3', sampleRate, channels: 2, metadata }, simulated: true, note: 'Export MP3 simulé' };
}

export function exportAllFormats(stems, sampleRate, metadata = {}) {
  return { wav: exportAllStemsWav(stems, sampleRate, metadata), mp3: exportAllStemsMp3(stems, sampleRate, metadata), metadata, simulated: true };
}

export function exportSeparationResult(inferenceResult, options = {}) {
  const format = options.format ?? 'wav';
  const metadata = options.metadata ?? {};
  if (!inferenceResult || !inferenceResult.stems) throw new Error('[Export] stems manquants');
  const exportResult = exportAllFormats(inferenceResult.stems, inferenceResult.sampleRate ?? 44100, metadata);
  return { ...inferenceResult, format, exportResult, exportMetadata: metadata };
}