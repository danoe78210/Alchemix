import { PERFORMANCE_CONFIG, runPerformanceInference } from '$lib/module2/performance.js';

describe('performance — Mode Performance Micro-tâche #5', () => {

  test('exporte la configuration PERFORMANCE_CONFIG', () => {
    expect(PERFORMANCE_CONFIG.mode).toBe('performance');
    expect(PERFORMANCE_CONFIG.targetVramGb).toBe(6);
    expect(PERFORMANCE_CONFIG.chunkSize).toBe(132300);
    expect(PERFORMANCE_CONFIG.overlap).toBe(0.25);
    expect(PERFORMANCE_CONFIG.singlePass).toBe(true);
  });

  test('exécute runPerformanceInference avec un buffer valide', () => {
    const audioBuffer = [
      new Float32Array([0.5, -0.25, 0.1, 0.8]),
      new Float32Array([0.5, -0.25, 0.1, 0.8])
    ];
    const result = runPerformanceInference(audioBuffer, 44100);

    expect(result.mode).toBe('performance');
    expect(result.sampleRate).toBe(44100);
    expect(result.stems).toBeDefined();
    expect(result.stems.vocals).toBeInstanceOf(Float32Array);
    expect(result.stems.drums).toBeInstanceOf(Float32Array);
    expect(result.stems.bass).toBeInstanceOf(Float32Array);
    expect(result.stems.other).toBeInstanceOf(Float32Array);
    expect(result.metrics).toBeDefined();
    expect(result.metrics.singlePass).toBe(true);
    expect(result.metrics.vramUsageGb).toBeLessThanOrEqual(6);
  });

  test('lance une erreur si audioBuffer est vide', () => {
    expect(() => runPerformanceInference(new Float32Array(), 44100)).toThrow('[Performance] AudioBuffer invalide ou vide');
  });

  test('utilise le sampleRate par défaut 44100', () => {
    const audioBuffer = [
      new Float32Array([0.5, 0.3]),
      new Float32Array([0.5, 0.3])
    ];
    const result = runPerformanceInference(audioBuffer);

    expect(result.sampleRate).toBe(44100);
  });

  test('respecte la VRAM cible de 6 Go', () => {
    const audioBuffer = [
      new Float32Array([0.5, 0.3]),
      new Float32Array([0.5, 0.3])
    ];
    const result = runPerformanceInference(audioBuffer);

    expect(result.metrics.vramUsageGb).toBeLessThanOrEqual(6);
  });

  test('metrics incluent processingTimeMs', () => {
    const audioBuffer = [
      new Float32Array([0.5, 0.3]),
      new Float32Array([0.5, 0.3])
    ];
    const result = runPerformanceInference(audioBuffer);

    expect(result.metrics.processingTimeMs).toBeGreaterThan(0);
  });

  test('stems ont la même longueur que l\'audio', () => {
    const numSamples = 1024;
    const audioBuffer = [
      new Float32Array(numSamples),
      new Float32Array(numSamples)
    ];
    const result = runPerformanceInference(audioBuffer);

    expect(result.stems.vocals.length).toBe(numSamples);
    expect(result.stems.drums.length).toBe(numSamples);
    expect(result.stems.bass.length).toBe(numSamples);
    expect(result.stems.other.length).toBe(numSamples);
  });

  test('PERFORMANCE_CONFIG a la bonne structure', () => {
    expect(Object.keys(PERFORMANCE_CONFIG)).toContain('mode');
    expect(Object.keys(PERFORMANCE_CONFIG)).toContain('targetVramGb');
    expect(Object.keys(PERFORMANCE_CONFIG)).toContain('chunkSize');
    expect(Object.keys(PERFORMANCE_CONFIG)).toContain('overlap');
    expect(Object.keys(PERFORMANCE_CONFIG)).toContain('singlePass');
  });
});