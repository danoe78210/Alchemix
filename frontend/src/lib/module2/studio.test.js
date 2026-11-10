import { STUDIO_CONFIG, runStudioInference } from '$lib/module2/studio.js';

describe('studio — Mode Studio Micro-tâche #6', () => {

  test('exporte la configuration STUDIO_CONFIG', () => {
    expect(STUDIO_CONFIG.mode).toBe('studio');
    expect(STUDIO_CONFIG.targetVramGb).toBe(8);
    expect(STUDIO_CONFIG.numPasses).toBe(3);
    expect(STUDIO_CONFIG.overlap).toBe(0.33);
    expect(STUDIO_CONFIG.singlePass).toBe(false);
    expect(STUDIO_CONFIG.useHighFidelityModel).toBe(true);
  });

  test('exécute runStudioInference avec un buffer valide', () => {
    const audioBuffer = [
      new Float32Array([0.5, -0.25, 0.1, 0.8]),
      new Float32Array([0.5, -0.25, 0.1, 0.8])
    ];
    const result = runStudioInference(audioBuffer, 44100);

    expect(result.mode).toBe('studio');
    expect(result.sampleRate).toBe(44100);
    expect(result.stems).toBeDefined();
    expect(result.stems.vocals).toBeInstanceOf(Float32Array);
    expect(result.stems.drums).toBeInstanceOf(Float32Array);
    expect(result.stems.bass).toBeInstanceOf(Float32Array);
    expect(result.stems.other).toBeInstanceOf(Float32Array);
    expect(result.metrics).toBeDefined();
    expect(result.metrics.numPasses).toBe(3);
    expect(result.metrics.singlePass).toBe(false);
    expect(result.metrics.useHighFidelityModel).toBe(true);
  });

  test('lance une erreur si audioBuffer est vide', () => {
    expect(() => runStudioInference(new Float32Array(), 44100)).toThrow('[Studio] AudioBuffer invalide ou vide');
  });

  test('utilise le sampleRate par défaut 44100', () => {
    const audioBuffer = [
      new Float32Array([0.5, 0.3]),
      new Float32Array([0.5, 0.3])
    ];
    const result = runStudioInference(audioBuffer);

    expect(result.sampleRate).toBe(44100);
  });

  test('respecte la VRAM cible de 8 Go', () => {
    const audioBuffer = [
      new Float32Array([0.5, 0.3]),
      new Float32Array([0.5, 0.3])
    ];
    const result = runStudioInference(audioBuffer);

    expect(result.metrics.vramUsageGb).toBeLessThanOrEqual(8);
  });

  test('metrics incluent processingTimeMs', () => {
    const audioBuffer = [
      new Float32Array([0.5, 0.3]),
      new Float32Array([0.5, 0.3])
    ];
    const result = runStudioInference(audioBuffer);

    expect(result.metrics.processingTimeMs).toBeGreaterThan(0);
  });

  test('stems ont la même longueur que l\'audio', () => {
    const numSamples = 1024;
    const audioBuffer = [
      new Float32Array(numSamples),
      new Float32Array(numSamples)
    ];
    const result = runStudioInference(audioBuffer);

    expect(result.stems.vocals.length).toBe(numSamples);
    expect(result.stems.drums.length).toBe(numSamples);
    expect(result.stems.bass.length).toBe(numSamples);
    expect(result.stems.other.length).toBe(numSamples);
  });

  test('numPasses personnalisé via options', () => {
    const audioBuffer = [
      new Float32Array([0.5, 0.3]),
      new Float32Array([0.5, 0.3])
    ];
    const result = runStudioInference(audioBuffer, 44100, { numPasses: 5 });

    expect(result.metrics.numPasses).toBe(5);
  });

  test('useHighFidelityModel désactivé via options', () => {
    const audioBuffer = [
      new Float32Array([0.5, 0.3]),
      new Float32Array([0.5, 0.3])
    ];
    const result = runStudioInference(audioBuffer, 44100, { useHighFidelityModel: false });

    expect(result.metrics.useHighFidelityModel).toBe(false);
    expect(result.metrics.vramUsageGb).toBeLessThanOrEqual(6.5);
  });

  test('PERFORMANCE_CONFIG a la bonne structure', () => {
    expect(Object.keys(STUDIO_CONFIG)).toContain('mode');
    expect(Object.keys(STUDIO_CONFIG)).toContain('targetVramGb');
    expect(Object.keys(STUDIO_CONFIG)).toContain('numPasses');
    expect(Object.keys(STUDIO_CONFIG)).toContain('overlap');
    expect(Object.keys(STUDIO_CONFIG)).toContain('singlePass');
    expect(Object.keys(STUDIO_CONFIG)).toContain('useHighFidelityModel');
  });
});