import { peaks } from '$lib/module2/waveform.js';

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
});
