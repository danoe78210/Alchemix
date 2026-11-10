import { applyAntiBleed, applyAntiBleedToInference, ANTI_BLEED_THRESHOLDS, ATTENUATION_FACTOR } from '$lib/module2/antiBleed.js';

describe('antiBleed — soustraction spectrale simulée (Micro-tâche #3)', () => {

  test('exporte les constantes de configuration', () => {
    expect(ANTI_BLEED_THRESHOLDS.vocals).toBe(0.6);
    expect(ANTI_BLEED_THRESHOLDS.drums).toBe(0.5);
    expect(ANTI_BLEED_THRESHOLDS.bass).toBe(0.5);
    expect(ANTI_BLEED_THRESHOLDS.other).toBe(0.4);
    expect(ATTENUATION_FACTOR).toBe(0.1);
  });

  test('retourne des stems de même longueur que l\'entrée', () => {
    const length = 1000;
    const stems = {
      vocals: new Float32Array(length).fill(0.5),
      drums: new Float32Array(length).fill(0.3),
      bass: new Float32Array(length).fill(0.2),
      other: new Float32Array(length).fill(0.1),
    };

    const result = applyAntiBleed(stems);

    expect(result.stems.vocals.length).toBe(length);
    expect(result.stems.drums.length).toBe(length);
    expect(result.stems.bass.length).toBe(length);
    expect(result.stems.other.length).toBe(length);
  });

  test('garde les échantillons du stem dominant inchangés', () => {
    // vocals est largement dominant à chaque échantillon
    const stems = {
      vocals: new Float32Array([1.0, 1.0, 1.0]),
      drums: new Float32Array([0.1, 0.1, 0.1]),
      bass: new Float32Array([0.1, 0.1, 0.1]),
      other: new Float32Array([0.1, 0.1, 0.1]),
    };

    const result = applyAntiBleed(stems);

    // vocals doit rester inchangé (dominant)
    expect(result.stems.vocals[0]).toBe(1.0);
    expect(result.stems.vocals[1]).toBe(1.0);
    expect(result.stems.vocals[2]).toBe(1.0);
  });

  test('atténue les échantillons non dominants selon ATTENUATION_FACTOR', () => {
    const stems = {
      vocals: new Float32Array([1.0]),
      drums: new Float32Array([0.1]),
      bass: new Float32Array([0.1]),
      other: new Float32Array([0.1]),
    };

    const result = applyAntiBleed(stems, { attenuationFactor: 0.2 });

    // drums, bass, other sont non dominants -> atténués à 0.1 * 0.2 = 0.02
    expect(result.stems.drums[0]).toBeCloseTo(0.02);
    expect(result.stems.bass[0]).toBeCloseTo(0.02);
    expect(result.stems.other[0]).toBeCloseTo(0.02);
  });

  test('gère le silence complet (tous les stems à zéro)', () => {
    const stems = {
      vocals: new Float32Array([0, 0, 0]),
      drums: new Float32Array([0, 0, 0]),
      bass: new Float32Array([0, 0, 0]),
      other: new Float32Array([0, 0, 0]),
    };

    const result = applyAntiBleed(stems);

    expect(result.stems.vocals[0]).toBe(0);
    expect(result.stems.drums[0]).toBe(0);
    expect(result.stems.bass[0]).toBe(0);
    expect(result.stems.other[0]).toBe(0);
    expect(result.attenuationApplied).toBe(0);
  });

  test('lance une erreur si les stems ont des longueurs différentes', () => {
    const stems = {
      vocals: new Float32Array([1.0, 2.0]),
      drums: new Float32Array([0.1]),
      bass: new Float32Array([0.1]),
      other: new Float32Array([0.1]),
    };

    expect(() => applyAntiBleed(stems)).toThrow(/Longueur mismatch/);
  });

  test('applique le seuil de dominance correctement', () => {
    // Avec un seuil élevé (0.9), seuls les échantillons vraiment dominants sont gardés
    const stems = {
      vocals: new Float32Array([1.0]),
      drums: new Float32Array([0.95]), // Très proche de vocals -> pourrait être gardé
      bass: new Float32Array([0.1]),
      other: new Float32Array([0.1]),
    };

    const result = applyAntiBleed(stems, { thresholds: { drums: 0.9 } });

    // drums à 0.95/1.0 = 0.95 >= 0.9 -> gardé inchangé
    expect(result.stems.drums[0]).toBeCloseTo(0.95);
  });

  test('retourne simulated: true', () => {
    const stems = {
      vocals: new Float32Array([1.0]),
      drums: new Float32Array([0.1]),
      bass: new Float32Array([0.1]),
      other: new Float32Array([0.1]),
    };

    const result = applyAntiBleed(stems);
    expect(result.simulated).toBe(true);
  });

  test('applyAntiBleedToInference enrichit le résultat d\'inférence', () => {
    const inferenceResult = {
      latencyMs: 500,
      sampleRate: 44100,
      channels: 2,
      durationSec: 4.0,
      stems: {
        vocals: new Float32Array([1.0, 0.5]),
        drums: new Float32Array([0.1, 0.1]),
        bass: new Float32Array([0.1, 0.1]),
        other: new Float32Array([0.1, 0.1]),
      },
      simulated: true,
    };

    const result = applyAntiBleedToInference(inferenceResult);

    expect(result.latencyMs).toBe(500);
    expect(result.sampleRate).toBe(44100);
    expect(result.antiBleed).toBeDefined();
    expect(result.antiBleed.attenuationApplied).toBeGreaterThanOrEqual(0);
    expect(result.antiBleed.simulated).toBe(true);
    expect(result.stems.vocals[0]).toBe(1.0);
  });

  test('applyAntiBleedToInference lance une erreur si stems manquants', () => {
    expect(() => applyAntiBleedToInference({})).toThrow(/stems manquants/);
    expect(() => applyAntiBleedToInference(null)).toThrow(/stems manquants/);
  });

  test('calcule correctement le pourcentage d\'atténuation', () => {
    const length = 100;
    const stems = {
      vocals: new Float32Array(length).fill(1.0),   // dominant partout
      drums: new Float32Array(length).fill(0.1),    // non dominant partout
      bass: new Float32Array(length).fill(0.1),     // non dominant partout
      other: new Float32Array(length).fill(0.1),    // non dominant partout
    };

    const result = applyAntiBleed(stems);

    // 3 stems sur 4 sont atténués à chaque échantillon => 75% d'atténuation
    expect(result.attenuationApplied).toBeCloseTo(75.0, 1);
  });
});
