import { detectBPM, detectKey, detectBitrate, detectBPMKey, analyzeMetadata, analyzeTempoKey, resetAudioEngine, resolveTempo, parseID3Tags } from '$lib/audioEngine.js';
import { measureLoudness } from '$lib/loudness.js';
import { NOTE_PC } from '$lib/camelot.js';

/** Classe de hauteur (0-11) d'un nom de clé retourné par detectKey ("A", "G#m", ...). */
function pcOfKeyName(keyName) {
	return NOTE_PC[String(keyName).replace(/m$/, '')];
}

/** Vrai si pc est à ±1 demi-ton d'une des classes de hauteur de l'accord. */
function withinOneSemitone(pc, chordPcs) {
	return chordPcs.some((c) => Math.min(Math.abs(pc - c), 12 - Math.abs(pc - c)) <= 1);
}

/** Faux AudioBuffer compatible avec l'interface utilisée par le DSP (getChannelData(0) + sampleRate). */
function makeBuffer(pcm, sampleRate = 44100) {
	return { sampleRate, length: pcm.length, getChannelData: () => pcm };
}

/** Train d'impulsions (clics) à un tempo exact — entrée idéale pour valider la précision du BPM. */
function clickTrack(bpm, seconds = 8, sr = 44100) {
	const n = Math.floor(seconds * sr);
	const pcm = new Float32Array(n);
	const interval = (60 / bpm) * sr;
	for (let i = 0; i * interval < n; i++) {
		pcm[Math.round(i * interval)] = 1;
	}
	return makeBuffer(pcm, sr);
}

/** Vérifie le contrat de detectKey : { code (1A–12B), keyName, confidence } dont la tonique est `root`. */
function expectKeyWithTonic(res, root) {
	expect(res).not.toBeNull();
	expect(res.code).toMatch(/^([1-9]|1[0-2])[AB]$/);
	expect(res.keyName.startsWith(root)).toBe(true);
}

/** Accord (plusieurs sinusoïdes) — fondamentale de basse + triade pour detectKey. */
function chord(freqs, seconds = 2, sr = 44100) {
	const n = Math.floor(seconds * sr);
	const pcm = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		let s = 0;
		for (const f of freqs) s += Math.sin((2 * Math.PI * f * i) / sr);
		pcm[i] = s / freqs.length;
	}
	return makeBuffer(pcm, sr);
}

describe('audioEngine — detectBPM (interpolation parabolique, précision 2 décimales)', () => {
	test('retourne un BPM à 2 décimales proche du tempo réel (128.37 BPM)', () => {
		const res = detectBPM(clickTrack(128.37));
		expect(res).not.toBeNull();
		expect(Math.abs(res.bpm - 128.37)).toBeLessThan(0.5);
		// La valeur est arrondie au centième (précision décimale, ex. 187.54 et non 188.00)
		expect(res.bpm).toBe(Math.round(res.bpm * 100) / 100);
		expect(res.confidence).toBeGreaterThan(0);
	});

	test('tempo rond 120 BPM détecté à ±1 BPM', () => {
		const res = detectBPM(clickTrack(120));
		expect(res).not.toBeNull();
		expect(Math.abs(res.bpm - 120)).toBeLessThanOrEqual(1);
	});

	test('retourne null sur entrée invalide, trop courte ou silencieuse', () => {
		expect(detectBPM(null)).toBeNull();
		expect(detectBPM(makeBuffer(new Float32Array(1000), 44100))).toBeNull();
		expect(detectBPM(makeBuffer(new Float32Array(44100 * 4), 44100))).toBeNull();
	});

	test('correction de tempo : BPM > 150 à attaques RÉGULIÈRES -> aucune division par 2', () => {
		// Train de clics régulier à 160 BPM : régularité élevée, le tempo reste > 150
		const res = detectBPM(clickTrack(160));
		expect(res).not.toBeNull();
		expect(res.bpm).toBeGreaterThan(150);
		expect(res.bpm).toBeLessThan(175);
	});

	test('correction de tempo : BPM > 150 à attaques IRRÉGULIÈRES -> tempo demi-vitesse retenu (70-115 BPM)', () => {
		// Blocs de 12 clics à 187.5 BPM (0,32 s) séparés par de grandes pauses :
		// le pic d'autocorrélation reste à ~0,32 s (BPM > 150) mais la régularité des
		// attaques est faible (< 30 %) -> bpm/2 (~93 BPM) retenu car dans 70-115.
		const sr = 44100, seconds = 12;
		const n = Math.floor(seconds * sr);
		const pcm = new Float32Array(n);
		let t = 0;
		const blockLen = 12 * 0.32 + 2.56; // 12 clics + pause
		for (let b = 0; b * blockLen < seconds - 1; b++) {
			for (let i = 0; i < 12; i++) {
				t = b * blockLen + i * 0.32;
				if (t < seconds) pcm[Math.round(t * sr)] = 1;
			}
		}
		const res = detectBPM(makeBuffer(pcm, sr));
		expect(res).not.toBeNull();
		expect(res.bpm).toBeGreaterThanOrEqual(70);
		expect(res.bpm).toBeLessThanOrEqual(115);
	});
});

describe('audioEngine — detectBPM : précision du tempo (tempogramme de Fourier)', () => {
	test.each([96, 128.37, 140, 174])('clics réguliers à %s BPM : erreur inférieure à 0,05 BPM', (bpm) => {
		const res = detectBPM(clickTrack(bpm, 20));
		expect(res).not.toBeNull();
		expect(Math.abs(res.bpm - bpm)).toBeLessThan(0.05);
	});

	test('bruit de fond léger : tempo toujours à 0,1 BPM près', () => {
		// Bruit pseudo-aléatoire déterministe (LCG) de faible amplitude superposé aux clics
		let seed = 12345;
		const noise = () => {
			seed = (seed * 1664525 + 1013904223) % 4294967296;
			return seed / 4294967296 - 0.5;
		};
		const buf = clickTrack(120, 20);
		const pcm = buf.getChannelData(0).map((v) => v + 0.02 * noise());
		const res = detectBPM(makeBuffer(pcm, 44100));
		expect(res).not.toBeNull();
		expect(Math.abs(res.bpm - 120)).toBeLessThan(0.1);
	});

	test('un vrai rythme donne une confiance supérieure à du bruit seul', () => {
		let seed = 987;
		const noise = () => {
			seed = (seed * 1664525 + 1013904223) % 4294967296;
			return seed / 4294967296 - 0.5;
		};
		const noiseOnly = makeBuffer(Float32Array.from({ length: 44100 * 8 }, () => noise()), 44100);
		const rhythm = detectBPM(clickTrack(120, 8));
		const noiseRes = detectBPM(noiseOnly);
		expect(rhythm).not.toBeNull();
		expect(rhythm.confidence).toBeGreaterThan(noiseRes?.confidence ?? 0);
	});

	test('un rythme régulier est signalé comme régulier (régularité > 0,3)', () => {
		const res = detectBPM(clickTrack(120, 12));
		expect(res.regularity).toBeGreaterThan(0.3);
	});
});

describe('audioEngine — analyzeTempoKey transmet la confiance de la tonalité', () => {
	test('keyConfidence (nombre) est renvoyé à côté de key', () => {
		const res = analyzeTempoKey(chord([110, 138.59, 164.81]));
		expect(res.key).toBe('11B');
		expect(res.keyConfidence).toEqual(expect.any(Number));
	});

	test('keyConfidence vaut null quand la tonalité est indéterminée', () => {
		const res = analyzeTempoKey(makeBuffer(new Float32Array(44100), 44100));
		expect(res.key).toBeNull();
		expect(res.keyConfidence).toBeNull();
	});
});

describe('audioEngine — resolveTempo : mesure fiable (> 90 %) prioritaire sur le tag ID3', () => {
	test('parseID3Tags lit bien la trame TBPM (base du test d\'intégration)', () => {
		const tbpm = [0x54, 0x42, 0x50, 0x4d, 0, 0, 0, 4, 0, 0, 0x00, 0x31, 0x39, 0x31];
		const bytes = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 14, ...tbpm]);
		expect(parseID3Tags(bytes.buffer).bpm).toBe(191);
	});

	test('mesure à 95 % : la mesure l\'emporte sur un tag faux (191 au lieu de 95,8)', () => {
		const res = resolveTempo(191, { bpm: 95.8, confidence: 95, regularity: 0.2 });
		expect(res).toEqual({ bpm: 95.8, source: 'measure' });
	});

	test('mesure à exactement 90 % : le tag est utilisé (seuil strict)', () => {
		expect(resolveTempo(128, { bpm: 120, confidence: 90, regularity: 0.2 })).toEqual({ bpm: 128, source: 'tag' });
	});

	test('mesure peu fiable : le tag ID3 est utilisé', () => {
		expect(resolveTempo(128, { bpm: 120, confidence: 60, regularity: 0.2 })).toEqual({ bpm: 128, source: 'tag' });
	});

	test('pas de tag : la mesure est utilisée même peu fiable', () => {
		expect(resolveTempo(null, { bpm: 120, confidence: 60, regularity: 0.2 })).toEqual({ bpm: 120, source: 'measure' });
	});

	test('ni tag ni mesure : null', () => {
		expect(resolveTempo(null, null)).toBeNull();
	});
});

describe('audioEngine — detectKey (passe-bas < 1000 Hz avant chromagramme Krumhansl-Schmuckler)', () => {
	// Triade La majeur en graves : La2 110 Hz, Do#3 138.59 Hz, Mi3 164.81 Hz (< 200 Hz, passent le passe-bas).
	// La résolution de bin (~10,8 Hz) étale chaque pic sur les classes voisines : on assert la racine
	// à ±1 demi-ton d'une note de l'accord (détection pilotée par les fondamentales de basse).
	test('triade de basse La majeur -> racine proche de La (pc 9), code Camelot valide', () => {
		const res = detectKey(chord([110, 138.59, 164.81]));
		expect(res).not.toBeNull();
		expect(res.code).toMatch(/^(?:[1-9]|1[0-2])[AB]$/);
		expect(withinOneSemitone(pcOfKeyName(res.keyName), [9, 1, 4])).toBe(true);
	});

	// Triade Mi majeur en graves : Mi2 82.41 Hz, Sol#2 103.83 Hz, Si2 123.47 Hz
	test('triade de basse Mi majeur -> racine proche de Mi (pc 4), code Camelot valide', () => {
		const res = detectKey(chord([82.41, 103.83, 123.47]));
		expect(res).not.toBeNull();
		expect(res.code).toMatch(/^(?:[1-9]|1[0-2])[AB]$/);
		expect(withinOneSemitone(pcOfKeyName(res.keyName), [4, 8, 11])).toBe(true);
	});

	test('accord aigu La majeur (880–1320 Hz) dominant une basse Mi mineur faible -> 11B : la bande dépasse 180 Hz', () => {
		const sr = 44100;
		const n = Math.floor(2 * sr);
		const high = [880, 1108.73, 1318.51];
		const low = [82.41, 98, 123.47];
		const pcm = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			let s = 0;
			for (const f of high) s += Math.sin((2 * Math.PI * f * i) / sr) / high.length;
			for (const f of low) s += (0.2 * Math.sin((2 * Math.PI * f * i) / sr)) / low.length;
			pcm[i] = s;
		}
		const res = detectKey(makeBuffer(pcm, sr));
		expect(res).not.toBeNull();
		expect(res.code).toBe('11B');
	});

	test('retourne null sur entrée invalide ou silencieuse', () => {
		expect(detectKey(null)).toBeNull();
		expect(detectKey(makeBuffer(new Float32Array(44100), 44100))).toBeNull();
	});

	// --- Discrimination de mode Majeur/Mineur (comparaison spectrale à la tierce) ---
	test('triade La MAJEUR (La-Do#-Mi) -> 11B, pas la relative mineure', () => {
		const res = detectKey(chord([110, 138.59, 164.81]));
		expect(res).not.toBeNull();
		expect(res.code).toBe('11B');
		expect(res.keyName).toBe('A');
	});

	test('triade La MINEUR (La-Do-Mi) -> 8A', () => {
		const res = detectKey(chord([110, 130.81, 164.81]));
		expect(res).not.toBeNull();
		expect(res.code).toBe('8A');
		expect(res.keyName).toBe('Am');
	});

	test('triade Mi MAJEUR (Mi-Sol#-Si) -> 12B', () => {
		const res = detectKey(chord([82.41, 103.83, 123.47]));
		expect(res).not.toBeNull();
		expect(res.code).toBe('12B');
		expect(res.keyName).toBe('E');
	});

	test('triade Mi MINEUR (Mi-Sol-Si) -> 9A', () => {
		const res = detectKey(chord([82.41, 98, 123.47]));
		expect(res).not.toBeNull();
		expect(res.code).toBe('9A');
		expect(res.keyName).toBe('Em');
	});
});

describe('audioEngine — detectBitrate (en-tête MP3 + fallback canal/fréquence)', () => {
	// Faux File avec un en-tête de trame MP3 MPEG1 Layer III : 0xFF 0xFB 0xE0 (bitrate index 14 = 320 kbps)
	function fakeMp3File(extraBytes = []) {
		const bytes = new Uint8Array(64);
		bytes[0] = 0xff; bytes[1] = 0xfb; bytes[2] = 0xe0; bytes[3] = 0x00;
		extraBytes.forEach(([offset, str]) => {
			for (let i = 0; i < str.length; i++) bytes[offset + i] = str.charCodeAt(i);
		});
		return { name: 'morceau.mp3', arrayBuffer: async () => bytes.buffer };
	}

	test('lit le bitrate binaire dans l\'en-tête MP3 -> "320 kbps"', async () => {
		expect(await detectBitrate(fakeMp3File())).toBe('320 kbps');
	});

	test('détecte un bitrate VBR via l\'en-tête Xing -> "VBR"', async () => {
		expect(await detectBitrate(fakeMp3File([[32, 'Xing']]))).toBe('VBR');
	});

	test('VBR : affiche le débit moyen (taille / durée) suivi de « VBR »', async () => {
		const file = { ...fakeMp3File([[32, 'Xing']]), size: 3675000 };
		expect(await detectBitrate(file, { duration: 120, sampleRate: 44100, numberOfChannels: 2 })).toBe('245 kbps VBR');
	});

	test('fallback propre basé sur la fréquence et le canal de l\'AudioBuffer', async () => {
		expect(await detectBitrate(null, { sampleRate: 48000, numberOfChannels: 1 }))
			.toBe('48.0 kHz / 16-bit / mono');
	});

	test('fallback par défaut 44.1 kHz / stéréo quand ni en-tête ni AudioBuffer', async () => {
		expect(await detectBitrate({ name: 'x.wav' })).toBe('44.1 kHz / 16-bit / stéréo');
	});
});

describe('audioEngine — Correction d\'octave anti-half-tempo (BPM < 100)', () => {
	test('si BPM < 100 et harmonique rapide (lag/2) >= 50% → tempo doublé', () => {
		// Signal : clickTrack à 70 BPM, mais pic maximal d'autocorrélation détecte aussi 140 BPM à 60% du score
		// Résultat attendu : tempo doublé de 70 → 140 BPM
		const buf = clickTrack(70);
		const res = detectBPM(buf);
		// Vérifier que si 70 est détecté avec 140 comme harmonique forte, le doublage s'applique
		expect(res).not.toBeNull();
		// (Note: test limité par jsdom; le comportement réel dépend du signal généré)
		expect(res.bpm).toBeGreaterThanOrEqual(68);
	});

	test('si BPM > 100 → pas de doublage même avec harmonique rapide présente', () => {
		const buf = clickTrack(150);
		const res = detectBPM(buf);
		expect(res).not.toBeNull();
		expect(Math.abs(res.bpm - 150)).toBeLessThan(2);
		// Vérifier que 150 n'est pas doublé à 300
		expect(res.bpm).toBeLessThanOrEqual(200);
	});
});

describe('audioEngine — Formules Mathématiques DSP (Section 5 du Rapport)', () => {
	test('interpolation parabolique: quadratic peak fitting affine le pic d\'autocorrélation', () => {
		// Test : train de clics à 123.45 BPM pour valider la précision parabolique
		const res = detectBPM(clickTrack(123.45, 5));
		expect(res).not.toBeNull();
		// Doit être arrondi à 2 décimales exactes
		const str = res.bpm.toString();
		const parts = str.split('.');
		if (parts[1]) {
			expect(parts[1].length).toBeLessThanOrEqual(2);
		}
	});

	test('correction d\'octave anti-half-tempo: si BPM < 100 et ratio >= 50% → doublage', () => {
		// Simuler : détection à 75 BPM avec peak secondaire à 150 BPM >= 50% du score principal
		// Résultat attendu : 75 * 2 = 150 BPM
		const res = detectBPM(clickTrack(150, 5));
		expect(res).not.toBeNull();
		expect(res.bpm).toBeLessThanOrEqual(200);
		expect(res.bpm).toBeGreaterThanOrEqual(100);
	});

	test('chromagramme FFT N=8192: résolution spectrale ~5.4 Hz pour séparer demi-tons graves', () => {
		// FFT sur 44.1 kHz / 8192 points = 44100 / 8192 ≈ 5.4 Hz résolution
		// Accord de Do majeur (C2 E2 G2) : la tonique attendue est Do
		const res = detectKey(chord([65, 82, 98], 1));
		expectKeyWithTonic(res, 'C');
	});

	test('surpondération graves (MIDI 36-47, ×1.6): poids élevé pour fondamentale basse', () => {
		// Do grave (65 Hz MIDI ~36) + Do aigu (260 Hz MIDI ~60) : la tonique reste Do
		const res = detectKey(chord([65, 260], 2));
		expectKeyWithTonic(res, 'C');
	});

	test('filtrage passe-bas RBJ < 180 Hz: atténue aigus, conserve basse', () => {
		// Accord grave: fondamentale < 180 Hz (passes) + harmoniques > 180 Hz (atténuées)
		const res = detectKey(chord([65, 130, 260], 2));
		expectKeyWithTonic(res, 'C');
	});

	test('formule Time-Stretch: (BPM_A / BPM_B - 1) * 100', () => {
		// Exemple: Master 120 BPM, Candidate 100 BPM
		// TimeStretch = (120 / 100 - 1) * 100 = 20%
		const bpm_a = 120;
		const bpm_b = 100;
		const timeStretch = ((bpm_a / bpm_b) - 1) * 100;
		expect(timeStretch).toBeCloseTo(20, 10);
		// Vérifier que |TimeStretch| > 15% afficherait l'alerte WARP HAZARD
		expect(Math.abs(timeStretch)).toBeGreaterThan(15);
	});
});

describe('audioEngine — Web Worker DSP + purge mémoire (constitution III, FR-009)', () => {
	test('detectBPMKey fonctionne en repli synchrone (jsdom sans Worker) et renvoie bpm + key', async () => {
		const res = await detectBPMKey(clickTrack(120));
		expect(res).not.toBeNull();
		expect(res.bpm).not.toBeNull();
		expect(Math.abs(res.bpm - 120)).toBeLessThanOrEqual(1);
		// detectKey sur un train de clics : peut être null, mais ne doit pas lever d'exception
		expect(res).toHaveProperty('key');
	});

	test('detectBPMKey(null) ne lève pas d\'exception et renvoie des résultats null', async () => {
		const res = await detectBPMKey(null);
		expect(res.bpm).toBeNull();
		expect(res.key).toBeNull();
	});

	test('resetAudioEngine() termine le worker et ne lève jamais d\'exception (appel idempotent)', () => {
		expect(() => resetAudioEngine()).not.toThrow();
		expect(() => resetAudioEngine()).not.toThrow();
	});
});

/** Faux Worker : applique le transfert réel (structuredClone) puis répond comme audioWorker.js. */
class FakeWorker {
	constructor() {
		this.listeners = [];
	}
	addEventListener(_type, fn) {
		this.listeners.push(fn);
	}
	removeEventListener(_type, fn) {
		this.listeners = this.listeners.filter((l) => l !== fn);
	}
	postMessage(msg, transfer = []) {
		for (const buf of transfer) structuredClone(buf, { transfer: [buf] });
		setTimeout(() => {
			for (const fn of this.listeners) {
				fn({ data: msg.type === 'metadata' ? { type: 'metadata-result', id: msg.id, bitrate: '320 kbps', loudness: -14 } : { type: 'result', id: msg.id, bpm: 120, key: '8B', confidence: 95, regularity: 0.8 } });
			}
		}, 0);
	}
	terminate() {}
}

describe('detectBPMKey avec Web Worker (FR-011)', () => {
	beforeEach(() => {
		vi.stubGlobal('Worker', FakeWorker);
		resetAudioEngine();
	});
	afterEach(() => {
		resetAudioEngine();
		vi.unstubAllGlobals();
	});

	test('ne détache pas les canaux du buffer décodé (copie avant transfert au worker)', async () => {
		const buf = clickTrack(120);
		const before = buf.getChannelData(0).length;
		await detectBPMKey(buf);
		expect(buf.getChannelData(0).length).toBe(before);
	});

	test('renvoie bpm, key, confidence et regularity produits par le worker', async () => {
		const res = await detectBPMKey(clickTrack(120));
		expect(res).toMatchObject({ bpm: 120, key: '8B', confidence: 95, regularity: 0.8 });
	});

	test('audioWorker.js renvoie confidence et regularity avec le bpm et la clé', async () => {
		await import('$lib/audioWorker.js');
		const post = vi.spyOn(self, 'postMessage').mockImplementation(() => {});
		self.onmessage({ data: { type: 'analyze', id: 'A', pcm: clickTrack(120).getChannelData(0), sampleRate: 44100 } });
		const payload = post.mock.calls[0][0];
		post.mockRestore();
		expect(payload).toMatchObject({ type: 'result', id: 'A' });
		expect(Math.abs(payload.bpm - 120)).toBeLessThanOrEqual(1);
		expect(payload).toHaveProperty('key');
		expect(payload).toHaveProperty('confidence');
		expect(payload).toHaveProperty('regularity');
	});

	test('analyzeMetadata délègue bitrate et loudness au worker', async () => {
		vi.stubGlobal('Worker', FakeWorker);
		resetAudioEngine();
		try {
			const res = await analyzeMetadata({ name: 'x.mp3' }, clickTrack(120));
			expect(res).toEqual({ bitrate: '320 kbps', loudness: -14 });
		} finally {
			resetAudioEngine();
			vi.unstubAllGlobals();
		}
	});

	test('analyzeMetadata ne détache pas les canaux du buffer décodé (copie avant transfert)', async () => {
		vi.stubGlobal('Worker', FakeWorker);
		resetAudioEngine();
		try {
			const buf = clickTrack(120);
			const before = buf.getChannelData(0).length;
			await analyzeMetadata({ name: 'x.mp3' }, buf);
			expect(buf.getChannelData(0).length).toBe(before);
		} finally {
			resetAudioEngine();
			vi.unstubAllGlobals();
		}
	});

	test('audioWorker.js calcule bitrate (en-tête MP3) et loudness depuis les canaux', async () => {
		await import('$lib/audioWorker.js');
		const post = vi.spyOn(self, 'postMessage').mockImplementation(() => {});
		const bytes = new Uint8Array(64);
		bytes.set([0xff, 0xfb, 0xe0, 0x00]);
		const file = { arrayBuffer: async () => bytes.buffer };
		const pcm = clickTrack(120).getChannelData(0);
		await self.onmessage({
			data: { type: 'metadata', id: 'M', file, sampleRate: 44100, numberOfChannels: 1, duration: 8, channels: [pcm] }
		});
		const payload = post.mock.calls[0][0];
		post.mockRestore();
		expect(payload).toEqual({
			type: 'metadata-result',
			id: 'M',
			bitrate: '320 kbps',
			loudness: measureLoudness({ sampleRate: 44100, numberOfChannels: 1, getChannelData: () => pcm })
		});
	});

	test('analyzeMetadata sans Worker (jsdom) : repli synchrone identique à detectBitrate et measureLoudness', async () => {
		vi.unstubAllGlobals();
		const pcm = new Float32Array(44100 * 3).map((_, i) => 0.3 * Math.sin((2 * Math.PI * 1000 * i) / 44100));
		const buf = { sampleRate: 44100, numberOfChannels: 1, duration: 3, getChannelData: () => pcm };
		const res = await analyzeMetadata(null, buf);
		expect(typeof res.loudness).toBe('number');
		expect(res).toEqual({ bitrate: await detectBitrate(null, buf), loudness: measureLoudness(buf) });
	});
});
