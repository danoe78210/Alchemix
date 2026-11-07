import {
	waveformPeaks,
	waveformPeaksMulti,
	peakAmplitude,
	computeWaveformBars,
	WAVEFORM_MARGIN_RATIO,
	changeMarkers
} from '$lib/waveform.js';

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

	test('les extrêmes globaux du signal sont atteints quand n >= width (vue microscopique)', () => {
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

describe('waveform.js — fidélité dynamique, formats variés et coordonnées (alchemix#44)', () => {
	test('morceau très dynamique : préserve strictement les proportions linéaires entre intro, couplet, refrain et silence', () => {
		// 4 sections de 25 000 échantillons chacune (n = 100 000, w = 40 -> 2 500 éch./colonne)
		const n = 100000;
		const pcm = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			const s = Math.sin((2 * Math.PI * i) / 50);
			if (i < 25000) pcm[i] = 0.2 * s; // Intro (amplitude 0.2)
			else if (i < 50000) pcm[i] = 0.4 * s; // Couplet (amplitude 0.4, 2x intro)
			else if (i < 75000) pcm[i] = 0.8 * s; // Refrain (amplitude 0.8, 2x couplet)
			else pcm[i] = 0; // Silence final
		}
		const peaks = waveformPeaks(pcm, 40);
		const introMax = peaks[2 * 5 + 1];
		const verseMax = peaks[2 * 15 + 1];
		const chorusMax = peaks[2 * 25 + 1];
		const silenceMax = peaks[2 * 35 + 1];

		// Aucune compression dynamique : le rapport d'amplitude est exactement conservé (x2)
		expect(verseMax / introMax).toBeCloseTo(2.0, 2);
		expect(chorusMax / verseMax).toBeCloseTo(2.0, 2);
		expect(silenceMax).toBe(0);
	});

	test('morceau fortement compressé / limité (brickwall) : évite le bloc rectangulaire et distingue couplet, refrain et attaques', () => {
		// Simulation d'une piste masterisée avec limiteur brickwall :
		// Couplet (amplitude de base 0.25) et Refrain (amplitude de base 0.85), avec micro-pics à ±0.98 toutes les 250 échantillons
		const sr = 44100;
		const n = sr * 10; // 10 s = 441 000 échantillons
		const left = new Float32Array(n);
		const right = new Float32Array(n);
		const beatLen = Math.floor(sr * 0.5); // 120 BPM
		for (let i = 0; i < n; i++) {
			const isChorus = i >= n / 2;
			const baseAmp = isChorus ? 0.85 : 0.25;
			const beatEnv = Math.exp(-((i % beatLen) / beatLen) * 6);
			const wave = Math.sin((2 * Math.PI * 110 * i) / sr) * baseAmp * (0.4 + 0.6 * beatEnv);
			// Micro-transitoire de 2 échantillons touchant le plafond ±0.98 du limiteur
			const limiterSpike = i % 250 < 2 ? 0.98 : wave;
			left[i] = Math.max(-0.98, Math.min(0.98, limiterSpike));
			right[i] = Math.max(-0.98, Math.min(0.98, -limiterSpike * 0.95));
		}

		const w = 120; // ~3 675 éch./colonne
		const peaks = waveformPeaksMulti([left, right], w);

		let verseAvg = 0;
		let chorusAvg = 0;
		let verseMinCol = Infinity;
		let chorusMaxCol = 0;
		for (let c = 0; c < w / 2; c++) {
			const amp = peaks[2 * c + 1];
			verseAvg += amp;
			if (amp < verseMinCol) verseMinCol = amp;
		}
		for (let c = w / 2; c < w; c++) {
			const amp = peaks[2 * c + 1];
			chorusAvg += amp;
			if (amp > chorusMaxCol) chorusMaxCol = amp;
		}
		verseAvg /= w / 2;
		chorusAvg /= w / 2;

		// Le couplet n'est PAS écrasé au même niveau que le refrain (pas de brique rectangulaire)
		expect(verseAvg).toBeLessThan(chorusAvg * 0.5);
		// Les creux entre les temps du couplet sont nettement inférieurs aux crêtes du refrain
		expect(verseMinCol).toBeLessThan(chorusMaxCol * 0.35);
	});

	test('fréquences d échantillonnage variées (22.05, 44.1, 48 et 96 kHz) : enveloppe cohérente', () => {
		const sampleRates = [22050, 44100, 48000, 96000];
		const ratios = [];
		for (const sr of sampleRates) {
			const n = sr * 4; // 4 secondes
			const pcm = new Float32Array(n);
			for (let i = 0; i < n; i++) {
				const t = i / sr;
				const env = t < 2 ? 0.3 : 0.9;
				pcm[i] = Math.sin(2 * Math.PI * 220 * t) * env;
			}
			const peaks = waveformPeaks(pcm, 40);
			const firstHalf = peaks[2 * 10 + 1];
			const secondHalf = peaks[2 * 30 + 1];
			ratios.push(secondHalf / firstHalf);
		}
		for (const r of ratios) {
			expect(r).toBeCloseTo(3.0, 1);
		}
	});

	test('computeWaveformBars : correspondance exacte entre amplitudes extraites et coordonnées Y dessinées, marge 8 %, aucun écrêtage', () => {
		// Signal asymétrique (négatif jusqu'à -0.8, positif jusqu'à +0.4)
		const peaks = new Float32Array([-0.8, 0.4, -0.2, 0.1, 0, 0]);
		const width = 600;
		const height = 320;
		const layout = computeWaveformBars(peaks, width, height);

		expect(layout.mid).toBe(160);
		expect(layout.marginRatio).toBeCloseTo(WAVEFORM_MARGIN_RATIO);
		expect(layout.marginPx).toBeCloseTo(160 * 0.08); // 12.8 px
		expect(layout.usableHalfHeight).toBeCloseTo(160 * 0.92); // 147.2 px
		expect(layout.peak).toBeCloseTo(0.8);
		expect(layout.scale).toBeCloseTo((160 * 0.92) / 0.8); // 184 px par unité
		expect(layout.bars).toHaveLength(3);

		// Colonne 0 : min = -0.8 (atteint la limite basse utile), max = +0.4 (moitié de la demi-hauteur utile)
		const b0 = layout.bars[0];
		expect(b0.yBot).toBeCloseTo(160 - (-0.8) * layout.scale); // 307.2 = height - marginPx
		expect(b0.yTop).toBeCloseTo(160 - 0.4 * layout.scale); // 86.4
		expect(b0.yTop).toBeGreaterThanOrEqual(layout.marginPx);
		expect(b0.yBot).toBeLessThanOrEqual(height - layout.marginPx);

		// Colonne 1 : exactement 4 fois plus petite que la colonne 0 (linéarité stricte)
		const b1 = layout.bars[1];
		expect((layout.mid - b1.yTop) / (layout.mid - b0.yTop)).toBeCloseTo(0.25, 5);
		expect((b1.yBot - layout.mid) / (b0.yBot - layout.mid)).toBeCloseTo(0.25, 5);

		// Colonne 2 : silence -> centrée sur mid (160)
		const b2 = layout.bars[2];
		expect(b2.yTop).toBe(160);
		expect(b2.yBot).toBe(160);
	});

	test('computeWaveformBars : signal à très faible volume (pic 0.02) mis à l échelle sans écrêtage ni perte', () => {
		const peaks = new Float32Array([-0.02, 0.02, -0.01, 0.01]);
		const layout = computeWaveformBars(peaks, 400, 200);
		expect(layout.peak).toBeCloseTo(0.02);
		// La crête maximale de 0.02 est projetée exactement à marginPx du haut (8 px) et du bas (192 px)
		expect(layout.bars[0].yTop).toBeCloseTo(layout.marginPx);
		expect(layout.bars[0].yBot).toBeCloseTo(200 - layout.marginPx);
		expect(layout.bars[1].yTop).toBeCloseTo(100 - (100 - layout.marginPx) * 0.5);
	});

	test('computeWaveformBars : adaptation au redimensionnement (cols > width regroupe sans débordement) et cohérence au zoom (referencePeak)', () => {
		const peaks = new Float32Array(2400);
		for (let c = 0; c < 1200; c++) {
			peaks[2 * c] = -0.5;
			peaks[2 * c + 1] = 0.5;
		}
		// Canevas plus étroit (400 px) que le nombre de colonnes (1200) -> 400 barres de 1 px sans chevauchement
		const compact = computeWaveformBars(peaks, 400, 200);
		expect(compact.bars).toHaveLength(400);
		expect(compact.bars[0].yTop).toBeCloseTo(compact.marginPx);

		// Cohérence d'échelle au zoom : une portion calme (pic local 0.25) affichée avec referencePeak = 0.5
		// conserve exactement la moitié de la hauteur utile (pas de normalisation indépendante du segment zoomé)
		const quietZoomed = new Float32Array([-0.25, 0.25]);
		const zoomedLayout = computeWaveformBars(quietZoomed, 400, 200, { referencePeak: 0.5 });
		expect(zoomedLayout.scale).toBeCloseTo(compact.scale);
		expect(zoomedLayout.mid - zoomedLayout.bars[0].yTop).toBeCloseTo(compact.usableHalfHeight * 0.5);
	});

	test('fichiers audio réels du dépôt (WAV 32-bit float stéréo 44.1 kHz faible volume + WAV 16-bit mono 24 kHz) : aucune coupure, marges respectées, variations visibles', async () => {
		const fs = await import('node:fs');
		const path = await import('node:path');

		function decodeWavFile(relPath) {
			const buf = fs.readFileSync(path.resolve(process.cwd(), relPath));
			const fmt = buf.readUInt16LE(20); // 1 = PCM int16, 3 = IEEE float32
			const numCh = buf.readUInt16LE(22);
			const bits = buf.readUInt16LE(34);
			let offset = 12;
			let dataSize = 0;
			while (offset + 8 <= buf.length) {
				const id = buf.toString('ascii', offset, offset + 4);
				const sz = buf.readUInt32LE(offset + 4);
				if (id === 'data') {
					offset += 8;
					dataSize = sz;
					break;
				}
				offset += 8 + sz;
			}
			const bytesPerSample = bits / 8;
			const frames = Math.floor(Math.min(dataSize, buf.length - offset) / (numCh * bytesPerSample));
			const channels = Array.from({ length: numCh }, () => new Float32Array(frames));
			for (let f = 0; f < frames; f++) {
				for (let c = 0; c < numCh; c++) {
					const pos = offset + (f * numCh + c) * bytesPerSample;
					channels[c][f] = fmt === 3 ? buf.readFloatLE(pos) : buf.readInt16LE(pos) / 32768;
				}
			}
			return channels;
		}

		const files = ['test/alchemix-input__drums.wav', 'tts/succes.wav', 'tts/erreur.wav'];
		for (const file of files) {
			const channels = decodeWavFile(file);
			const peaks = waveformPeaksMulti(channels, 600);
			const layout = computeWaveformBars(peaks, 1200, 320);

			expect(layout.peak).toBeGreaterThan(0);
			expect(layout.bars).toHaveLength(600);

			let minTop = Infinity;
			let maxBot = -Infinity;
			let minSpan = Infinity;
			let maxSpan = 0;
			for (let c = 0; c < layout.bars.length; c++) {
				const b = layout.bars[c];
				// Correspondance exacte amplitude -> coordonnée Y
				expect(b.yTop).toBeCloseTo(layout.mid - peaks[2 * c + 1] * layout.scale, 4);
				expect(b.yBot).toBeCloseTo(layout.mid - peaks[2 * c] * layout.scale, 4);
				if (b.yTop < minTop) minTop = b.yTop;
				if (b.yBot > maxBot) maxBot = b.yBot;
				const span = b.yBot - b.yTop;
				if (span < minSpan) minSpan = span;
				if (span > maxSpan) maxSpan = span;
			}

			// Aucune partie du signal n'est coupée verticalement ; les crêtes restent dans [marginPx, height - marginPx]
			expect(minTop).toBeGreaterThanOrEqual(layout.marginPx - 1e-4);
			expect(maxBot).toBeLessThanOrEqual(320 - layout.marginPx + 1e-4);
			// La crête globale atteint exactement la limite utile (marge de sécurité de 8 % = 12.8 px)
			expect(Math.min(minTop, 320 - maxBot)).toBeCloseTo(layout.marginPx, 2);
			// Pour les enregistrements réels avec silences et attaques (tts/*.wav), forte dynamique visible
			if (file.startsWith('tts/')) {
				expect(minSpan).toBeLessThan(maxSpan * 0.25);
			}
		}
	});
});

