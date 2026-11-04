/**
 * AlcheMix Studio — Module 1 : Web Worker dédié au DSP lourd.
 *
 * Constitution v1.0.0, principe III (Audio non-bloquant) : FFT, détection de
 * tempo et de tonalité s'exécutent ICI, hors du thread principal, pour garantir
 * une interface fluide à 60 FPS.
 *
 * Protocole (voir specs/001-module1-audio-analysis/contracts/module1-contracts.md §3) :
 *   entrée  : { type: 'analyze', id: string, pcm: Float32Array, sampleRate: number }
 *             (pcm transféré en transferable)
 *   sortie  : { type: 'result', id, bpm, confidence, regularity, key } | { type: 'error', id, message }
 *   entrée  : { type: 'metadata', id, file: File, sampleRate, numberOfChannels, duration, channels: Float32Array[] }
 *             (canaux transférés en transferables)
 *   sortie  : { type: 'metadata-result', id, bitrate, loudness } | { type: 'error', id, message }
 *
 * Le décodage (AudioContext.decodeAudioData) reste sur le thread principal ;
 * le DSP (tempo, tonalité, bitrate, loudness) est délégué à ce worker.
 */
import { analyzeTempoKey, detectBitrate } from './audioEngine.js';
import { measureLoudness } from './loudness.js';

self.onmessage = async (event) => {
  const msg = event.data || {};
  if (msg.type === 'metadata') return analyzeMetadataMessage(msg);
  if (msg.type !== 'analyze') return;
  try {
    const pcm = msg.pcm;
    const sampleRate = msg.sampleRate;
    if (!pcm || !sampleRate) {
      self.postMessage({ type: 'error', id: msg.id, message: 'pcm/sampleRate manquants' });
      return;
    }
    // Faux AudioBuffer compatible avec l'interface utilisée par le DSP
    const audioBuffer = { sampleRate, length: pcm.length, getChannelData: () => pcm };
    self.postMessage({ type: 'result', id: msg.id, ...analyzeTempoKey(audioBuffer) });
  } catch (err) {
    self.postMessage({ type: 'error', id: msg.id, message: String(err && err.message ? err.message : err) });
  }
};

async function analyzeMetadataMessage(msg) {
  try {
    // Faux AudioBuffer compatible avec l'interface utilisée par detectBitrate et measureLoudness
    const audioBuffer = {
      sampleRate: msg.sampleRate,
      numberOfChannels: msg.numberOfChannels,
      duration: msg.duration,
      getChannelData: (c) => msg.channels[c]
    };
    const bitrate = await detectBitrate(msg.file, audioBuffer);
    const loudness = measureLoudness(audioBuffer);
    self.postMessage({ type: 'metadata-result', id: msg.id, bitrate, loudness });
  } catch (err) {
    self.postMessage({ type: 'error', id: msg.id, message: String(err && err.message ? err.message : err) });
  }
}
