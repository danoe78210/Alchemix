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
 *
 * Le décodage (AudioContext.decodeAudioData) reste sur le thread principal ;
 * seul le DSP est délégué à ce worker.
 */
import { analyzeTempoKey } from './audioEngine.js';

self.onmessage = (event) => {
  const msg = event.data || {};
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
