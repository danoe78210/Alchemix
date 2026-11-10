import { peaks, stemPeakAmplitude, CHUNK_CONFIG, computeChunkStarts, chunkAudio, chunkAudioForStems, reconstructFromChunks } from '$lib/module2/waveform.js';

describe('peaks — formes d\'onde des stems (prototype Module 2)', () => {
	test('retourne la crête absolue de chaque tranche de l\'échantillon', () => {
		const result = peaks(new Float32Array([0.5, -0.25, 0.1, 0.8]), 2);
		expect(result[0]).toBeCloseTo(0.5);
		expect(result[1]).toBeCloseTo(0.8);
	});

	test('un nombre de tranches supérieur aux échantillons ne perd aucun échantillon', () => {
		const result = peaks(new Float32Array([0.5]), 3);
		expect(result.length).toBe(3);
		expect(result[0]).toBeCloseTo(0.5);
	});

	test('tranches macroscopiques (> 64 éch.) : préserve la dynamique relative et évite la saturation en bloc', () => {
		const n = 40000;
		const pcm = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			const amp = i < n / 2 ? 0.25 : 0.75;
			pcm[i] = Math.sin((2 * Math.PI * i) / 40) * amp;
		}
		const result = peaks(pcm, 20);
		expect(result[15] / result[5]).toBeCloseTo(3.0, 1);
		expect(stemPeakAmplitude(result)).toBeGreaterThan(0.48);
	});
});
describe('chunking — pipeline Module 2 (Micro-tâche #1)', () => {
	test('CHUNK_CONFIG : paramètres par défaut corrects', () => {
		expect(CHUNK_CONFIG.chunkDurationSec).toBe(8.0);
		expect(CHUNK_CONFIG.hopDurationSec).toBe(1.0);
		expect(CHUNK_CONFIG.stemCount).toBe(4);
		expect(CHUNK_CONFIG.stemNames).toEqual(['vocals', 'drums', 'bass', 'other']);
	});
});