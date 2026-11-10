import { exportWav, exportAllStemsWav, exportAllStemsMp3, exportAllFormats, exportSeparationResult } from '$lib/module2/export.js';

describe('export — export des stems (Micro-tâche #4)', () => {

  test('exportWav retourne un ArrayBuffer', () => {
    const stemData = new Float32Array([0.5, -0.25, 0.1, 0.8]);
    const wavBuffer = exportWav(stemData, 44100, {});
    
    expect(wavBuffer).toBeInstanceOf(ArrayBuffer);
    expect(wavBuffer.byteLength).toBeGreaterThan(44); // header + data
  });

  test('exportWav contient un en-tête RIFF/WAVE valide', () => {
    const stemData = new Float32Array([0.5, -0.25, 0.1, 0.8]);
    const wavBuffer = exportWav(stemData, 44100, {});
    const view = new DataView(wavBuffer);
    
    // Vérifier le magic number RIFF
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    expect(riff).toBe('RIFF');
    
    // Vérifier le magic number WAVE
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    expect(wave).toBe('WAVE');
    
    // Vérifier le format PCM
    expect(view.getUint16(20, true)).toBe(1);
  });

  test('exportWav a la bonne taille', () => {
    const stemData = new Float32Array(1000);
    const wavBuffer = exportWav(stemData, 44100, {});
    
    // 44 header + 1000 samples * 2 channels * 2 bytes = 4044
    expect(wavBuffer.byteLength).toBe(44 + 1000 * 2 * 2);
  });

  test('exportAllStemsWav retourne 4 buffers', () => {
    const stems = {
      vocals: new Float32Array([1.0, 0.5]),
      drums: new Float32Array([0.8, 0.3]),
      bass: new Float32Array([0.6, 0.2]),
      other: new Float32Array([0.4, 0.1]),
    };
    
    const result = exportAllStemsWav(stems, 44100, {});
    
    expect(result.format).toBe('wav');
    expect(result.stems.vocals).toBeInstanceOf(ArrayBuffer);
    expect(result.stems.drums).toBeInstanceOf(ArrayBuffer);
    expect(result.stems.bass).toBeInstanceOf(ArrayBuffer);
    expect(result.stems.other).toBeInstanceOf(ArrayBuffer);
    expect(result.simulated).toBe(true);
  });

  test('exportAllStemsWav lance une erreur si un stem est manquant', () => {
    const stems = {
      vocals: new Float32Array([1.0]),
      drums: new Float32Array([0.8]),
      // bass et other manquants
    };
    
    expect(() => exportAllStemsWav(stems, 44100, {})).toThrow(/manquant/);
  });

  test('exportAllStemsMp3 retourne 4 buffers simulés', () => {
    const stems = {
      vocals: new Float32Array([1.0, 0.5]),
      drums: new Float32Array([0.8, 0.3]),
      bass: new Float32Array([0.6, 0.2]),
      other: new Float32Array([0.4, 0.1]),
    };
    
    const result = exportAllStemsMp3(stems, 44100, {});
    
    expect(result.format).toBe('mp3');
    expect(result.stems.vocals).toBeInstanceOf(ArrayBuffer);
    expect(result.stems.drums).toBeInstanceOf(ArrayBuffer);
    expect(result.stems.bass).toBeInstanceOf(ArrayBuffer);
    expect(result.stems.other).toBeInstanceOf(ArrayBuffer);
    expect(result.simulated).toBe(true);
    expect(result.note).toContain('simulé');
  });

  test('exportAllFormats retourne WAV et MP3', () => {
    const stems = {
      vocals: new Float32Array([1.0, 0.5]),
      drums: new Float32Array([0.8, 0.3]),
      bass: new Float32Array([0.6, 0.2]),
      other: new Float32Array([0.4, 0.1]),
    };
    
    const result = exportAllFormats(stems, 44100, {});
    
    expect(result.wav).toBeDefined();
    expect(result.mp3).toBeDefined();
    expect(result.simulated).toBe(true);
    expect(result.wav.format).toBe('wav');
    expect(result.mp3.format).toBe('mp3');
  });

  test('exportSeparationResult lance une erreur si stems manquants', () => {
    expect(() => exportSeparationResult({})).toThrow(/stems manquants/);
    expect(() => exportSeparationResult(null)).toThrow(/stems manquants/);
  });

  test('exportSeparationResult retourne un résultat complet', () => {
    const inferenceResult = {
      latencyMs: 500,
      sampleRate: 44100,
      channels: 2,
      durationSec: 4.0,
      stems: {
        vocals: new Float32Array([1.0, 0.5]),
        drums: new Float32Array([0.8, 0.3]),
        bass: new Float32Array([0.6, 0.2]),
        other: new Float32Array([0.4, 0.1]),
      },
      simulated: true,
    };
    
    const result = exportSeparationResult(inferenceResult, {
      format: 'wav',
      metadata: { title: 'Test Track', artist: 'Alchemix' },
    });
    
    expect(result.latencyMs).toBe(500);
    expect(result.sampleRate).toBe(44100);
    expect(result.format).toBe('wav');
    expect(result.exportResult).toBeDefined();
    expect(result.exportResult.wav).toBeDefined();
    expect(result.exportResult.mp3).toBeDefined();
    expect(result.exportMetadata.title).toBe('Test Track');
    expect(result.exportMetadata.artist).toBe('Alchemix');
  });
});