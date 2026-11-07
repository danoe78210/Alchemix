import { waveformPeaks, waveformPeaksMulti, peakAmplitude, changeMarkers } from '$lib/waveform.js';

describe('waveform.js — waveformPeaks (M2, alchemix#44)', () => {
	test('retourne un Float32Array de 2*width (min, max entrelacés par colonne)', () => {
		const peaks = waveformPeaks(new Float32Array(1000).fill(0.5), 100);
		expect(peaks).toBeInstanceOf(Float32Array);
		expect(peaks.length).toBe(200);
	});

	test('min <= max sur chaque colonne ; créneau -1/+1 bien réparti', () => {
		const pcm = new Float32Array(1000);
		pcm.fill(-1, 0, 500);
		pcm.fill(1, 500, 1000);
		const peaks = waveformPeaks(pcm, 7);
		// n=1000, w=7 : col 0 = [0,142) -> -1 ; col 3 = [428,571) -> chevauche la transition ; col 6 = [857,1000) -> +1
		expect([peaks[0], peaks[1]]).toEqual([-1, -1]);
		expect([peaks[6], peaks[7]]).toEqual([-1, 1]);
		expect([peaks[12], peaks[13]]).toEqual([1, 1]);
		for (let c = 0; c < 7; c++) expect(peaks[2 * c]).toBeLessThanOrEqual(peaks[2 * c + 1]);
	});

	test('silence -> toutes les colonnes à (0, 0)', () => {
		const peaks = waveformPeaks(new Float32Array(500), 50);
		expect(peaks.length).toBe(100);
		for (let c = 0; c < 50; c++) {
			expect(peaks[2 * c]).toBe(0);
			expect(peaks[2 * c + 1]).toBe(0);
		}
	});

	test('width invalide (<= 0 ou non fini) -> tableau vide', () => {
		expect(waveformPeaks(new Float32Array(10), 0).length).toBe(0);
		expect(waveformPeaks(new Float32Array(10), -3).length).toBe(0);
		expect(waveformPeaks(new Float32Array(10), NaN).length).toBe(0);
	});

	test('entrée vide ou nulle -> 2*width zéros', () => {
		expect(waveformPeaks(null, 8).length).toBe(16);
		const peaks = waveformPeaks(new Float32Array(0), 8);
		expect(peaks.length).toBe(16);
		expect(Array.from(peaks).every((v) => v === 0)).toBe(true);
	});

	test('plus de colonnes que d échantillons : pas d erreur, min <= max partout, extrêmes préservés', () => {
		const peaks = waveformPeaks(new Float32Array([0.25, -0.75]), 10);
		expect(peaks.length).toBe(20);
		for (let c = 0; c < 10; c++) expect(peaks[2 * c]).toBeLessThanOrEqual(peaks[2 * c + 1]);
		const flat = Array.from(peaks);
		expect(Math.min(...flat)).toBe(-0.75);
		expect(Math.max(...flat)).toBe(0.25);
	});

	test('les extrêmes globaux du signal sont atteints quand n >= width', () => {
		let seed = 42;
		const rnd = () => {
			seed = (seed * 1664525 + 1013904223) % 4294967296;
			return seed / 4294967296 - 0.5;
		};
		const pcm = Float32Array.from({ length: 10000 }, rnd);
		const peaks = waveformPeaks(pcm, 200);
		let allMin = Infinity, allMax = -Infinity;
		for (let c = 0; c < 200; c++) {
			allMin = Math.min(allMin, peaks[2 * c]);
			allMax = Math.max(allMax, peaks[2 * c + 1]);
		}
		let pcmMin = Infinity, pcmMax = -Infinity;
		for (const v of pcm) {
			pcmMin = Math.min(pcmMin, v);
			pcmMax = Math.max(pcmMax, v);
		}
		expect(allMin).toBe(pcmMin);
		expect(allMax).toBe(pcmMax);
	});
});

describe('waveform.js — changeMarkers (M5, alchemix#44)', () => {
	const segments = [
		{ startS: 0, bpm: 120.4, key: '8B', keyConfidence: 0.9 },
		{ startS: 30, bpm: 90.2, key: '8B', keyConfidence: 0.8 },
		{ startS: 60, bpm: 90.2, key: '10B', keyConfidence: 0.85 },
	];

	test("mode rhythm (défaut) : marque le changement de tempo arrondi à la position du segment courant", () => {
		expect(changeMarkers(segments)).toEqual([{ t: 30, label: '120 → 90 BPM' }]);
		expect(changeMarkers(segments, 'rhythm')).toEqual([{ t: 30, label: '120 → 90 BPM' }]);
	});

	test("mode key : marque le changement de clef (8B → 10B) à startS du segment courant", () => {
		expect(changeMarkers(segments, 'key')).toEqual([{ t: 60, label: '8B → 10B' }]);
	});

	test('aucun changement -> aucun marqueur', () => {
		const flat = [
			{ startS: 0, bpm: 120, key: '8B' },
			{ startS: 30, bpm: 120, key: '8B' },
		];
		expect(changeMarkers(flat)).toEqual([]);
		expect(changeMarkers(flat, 'key')).toEqual([]);
	});

	test('valeurs null (bpm ou clef indéterminés) -> ignorées, pas de marqueur', () => {
		const withNull = [
			{ startS: 0, bpm: null, key: null },
			{ startS: 30, bpm: 100, key: '8B' },
			{ startS: 60, bpm: 100, key: null },
		];
		expect(changeMarkers(withNull, 'rhythm')).toEqual([]);
		expect(changeMarkers(withNull, 'key')).toEqual([]);
	});

	test('entrée invalide -> tableau vide', () => {
		expect(changeMarkers(null)).toEqual([]);
		expect(changeMarkers('x')).toEqual([]);
		expect(changeMarkers([])).toEqual([]);
		expect(changeMarkers([{ startS: 0, bpm: 120, key: '8B' }])).toEqual([]);
	});

	test('N segments avec plusieurs changements donnent les bons labels et positions', () => {
		const many = [
			{ startS: 0, bpm: 120, key: '8B' },
			{ startS: 30, bpm: 90, key: '8B' },
			{ startS: 60, bpm: 90, key: '10B' },
			{ startS: 90, bpm: 128, key: '10B' },
		];
		expect(changeMarkers(many, 'rhythm')).toEqual([
			{ t: 30, label: '120 → 90 BPM' },
			{ t: 90, label: '90 → 128 BPM' },
		]);
		expect(changeMarkers(many, 'key')).toEqual([{ t: 60, label: '8B → 10B' }]);
	});
});

describe('waveform.js — waveformPeaksMulti (multi-canaux, alchemix#44)', () => {
	test('mono : équivalent à waveformPeaks sur le même canal', () => {
		const pcm = Float32Array.from({ length: 1000 }, (_, i) => Math.sin(i / 10) * (i % 7 === 0 ? -1 : 0.5));
		expect(Array.from(waveformPeaksMulti([pcm], 50))).toEqual(Array.from(waveformPeaks(pcm, 50)));
	});

	test('stéréo : le min de la colonne est le plus petit des deux canaux, le max le plus grand', () => {
		const left = new Float32Array(100).fill(0.2); // canal gauche constant
		const right = new Float32Array(100).fill(-0.1);
		right[40] = 0.9; // crête positive uniquement sur le canal droit
		right[10] = -0.8; // crête négative uniquement sur le canal droit
		const peaks = waveformPeaksMulti([left, right], 10);
		// colonne 1 (échantillons 10-19) : min = -0.8 (droite), max = 0.2 (gauche)
		expect(peaks[2]).toBeCloseTo(-0.8);
		expect(peaks[3]).toBeCloseTo(0.2);
		// colonne 4 (échantillons 40-49) : min = -0.1 (droite), max = 0.9 (crête droite)
		expect(peaks[8]).toBeCloseTo(-0.1);
		expect(peaks[9]).toBeCloseTo(0.9);
		// aucune colonne ne vaut (0,0) : les deux canaux contribuent
		for (let c = 0; c < 10; c++) expect(peaks[2 * c]).toBeLessThanOrEqual(peaks[2 * c + 1]);
	});

	test('canaux null/vides ignorés ; tous vides -> 2*width zéros ; width invalide -> vide', () => {
		const pcm = new Float32Array([0.5, -0.5]);
		expect(Array.from(waveformPeaksMulti([null, pcm, new Float32Array(0)], 4))).toEqual(Array.from(waveformPeaks(pcm, 4)));
		const zeros = waveformPeaksMulti([null, new Float32Array(0)], 8);
		expect(zeros.length).toBe(16);
		expect(Array.from(zeros).every((v) => v === 0)).toBe(true);
		expect(waveformPeaksMulti([pcm], 0).length).toBe(0);
		expect(waveformPeaksMulti([], 8).length).toBe(16); // tous vides -> zéros, pas d'erreur
	});
});

describe('waveform.js — peakAmplitude (échelle verticale mesurée, alchemix#44)', () => {
	test('retourne le max de |v| sur toutes les colonnes (min et max entrelacés)', () => {
		const peaks = new Float32Array([0, 0.4, -0.7, 0.2]); // colonnes (0,0.4) et (-0.7,0.2)
		expect(peakAmplitude(peaks)).toBeCloseTo(0.7);
	});

	test('signal faible : le pic réel est retourné (ex. 0.05), pas 1.0 en dur', () => {
		expect(peakAmplitude(new Float32Array([0.01, -0.05, 0.03, 0.02]))).toBeCloseTo(0.05);
	});

	test('silence / entrée vide ou nulle -> 0', () => {
		expect(peakAmplitude(new Float32Array(10))).toBe(0);
		expect(peakAmplitude(new Float32Array(0))).toBe(0);
		expect(peakAmplitude(null)).toBe(0);
	});

	test('valeur supérieure à 1 (décodeur flottant) -> mesurée telle quelle, sans écrêtage', () => {
		expect(peakAmplitude(new Float32Array([-1.4, 0.8]))).toBeCloseTo(1.4);
	});
});
