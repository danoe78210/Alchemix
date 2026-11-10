import { describe, it, expect, vi } from 'vitest';
import {
  simulateOnnxInference,
  generateTestSignal,
  separateAudio,
  SIMULATION_LATENCY_MS,
  STEM_NAMES,
} from '$lib/module2/onnxRuntime.mock.js';

describe('ONNX Mock — Micro-tâche #2', () => {
  describe('simulateOnnxInference', () => {
    it('retourne un résultat avec 4 stems', () => {
      const input = generateTestSignal(1.0, 44100);
      const result = simulateOnnxInference(input, 44100);
      
      expect(result).toHaveProperty('stems');
      expect(result.stems).toHaveProperty('vocals');
      expect(result.stems).toHaveProperty('drums');
      expect(result.stems).toHaveProperty('bass');
      expect(result.stems).toHaveProperty('other');
    });

    it('chaque stem a la même longueur que l\'entrée', () => {
      const input = generateTestSignal(2.0, 44100);
      const result = simulateOnnxInference(input, 44100);
      
      for (const stem of Object.values(result.stems)) {
        expect(stem.length).toBe(input.length);
      }
    });

    it('marque le résultat comme simulé', () => {
      const input = generateTestSignal(1.0, 44100);
      const result = simulateOnnxInference(input, 44100);
      
      expect(result.simulated).toBe(true);
    });

    it('retourne les métadonnées correctes', () => {
      const input = generateTestSignal(2.0, 44100);
      const result = simulateOnnxInference(input, 44100);
      
      expect(result.sampleRate).toBe(44100);
      expect(result.channels).toBe(2);
      expect(result.durationSec).toBeCloseTo(2.0, 5);
      expect(result.latencyMs).toBe(SIMULATION_LATENCY_MS);
    });

    it('respecte la latence configurée', () => {
      const input = generateTestSignal(1.0, 44100);
      const result = simulateOnnxInference(input, 44100, { latencyMs: 1000 });
      
      expect(result.latencyMs).toBe(1000);
    });

    it('gère une entrée vide', () => {
      const input = new Float32Array(0);
      const result = simulateOnnxInference(input, 44100);
      
      expect(result.stems.vocals.length).toBe(0);
      expect(result.stems.drums.length).toBe(0);
      expect(result.stems.bass.length).toBe(0);
      expect(result.stems.other.length).toBe(0);
    });
  });

  describe('generateTestSignal', () => {
    it('génère un signal de la bonne durée', () => {
      const signal = generateTestSignal(1.0, 44100);
      // Stéréo = 2 canaux entrelacés
      expect(signal.length).toBe(44100 * 2);
    });

    it('génère un signal non vide', () => {
      const signal = generateTestSignal(1.0, 44100);
      expect(signal.length).toBeGreaterThan(0);
    });

    it('génère un signal déterministe', () => {
      const signal1 = generateTestSignal(1.0, 44100);
      const signal2 = generateTestSignal(1.0, 44100);
      
      for (let i = 0; i < signal1.length; i++) {
        expect(signal1[i]).toBeCloseTo(signal2[i], 10);
      }
    });

    it('gère une durée de 0', () => {
      const signal = generateTestSignal(0, 44100);
      expect(signal.length).toBe(0);
    });
  });

  describe('separateAudio', () => {
    it('appelle simulateOnnxInference', async () => {
      const result = await separateAudio();
      
      expect(result.simulated).toBe(true);
      expect(result.stems).toHaveProperty('vocals');
      expect(result.stems).toHaveProperty('drums');
      expect(result.stems).toHaveProperty('bass');
      expect(result.stems).toHaveProperty('other');
    });

    it('retourne un résultat cohérent', async () => {
      const result = await separateAudio(undefined, { latencyMs: 100 });
      
      expect(result.latencyMs).toBe(100);
      expect(result.durationSec).toBeGreaterThan(0);
    });
  });

  describe('Constants', () => {
    it('SIMULATION_LATENCY_MS est un nombre positif', () => {
      expect(SIMULATION_LATENCY_MS).toBeGreaterThan(0);
    });

    it('STEM_NAMES contient les 4 stems', () => {
      expect(STEM_NAMES).toEqual(['vocals', 'drums', 'bass', 'other']);
    });
  });
});