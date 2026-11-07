/**
 * Formes d'onde des stems (Module 2) : crête dynamique par tranche de l'échantillon.
 *
 * - À l'échelle microscopique (<= 64 échantillons par tranche), conserve le max exact |v|.
 * - À l'échelle macroscopique (> 64 échantillons par tranche), découpe la tranche en
 *   sous-fenêtres acoustiques (~10–20 ms), calcule la moyenne quadratique (RMS) dans
 *   chacune sur 100 % des échantillons, et retient le max des sous-fenêtres afin de
 *   préserver les attaques (batterie, basse) tout en évitant l'effet de bloc rectangulaire.
 */
const MACRO_BIN_THRESHOLD = 64;

/** Crête de `bins` tranches de `samples` ; chaque échantillon appartient à au moins une tranche. */
export function peaks(samples, bins) {
	const count = Math.floor(bins);
	if (!Number.isFinite(count) || count <= 0) return new Float32Array(0);
	const out = new Float32Array(count);
	if (!samples || samples.length === 0) return out;
	const size = samples.length / count;
	for (let b = 0; b < count; b++) {
		const start = Math.floor(b * size);
		const end = Math.min(samples.length, Math.max(start + 1, Math.ceil((b + 1) * size)));
		const len = end - start;
		if (len <= MACRO_BIN_THRESHOLD) {
			let peak = 0;
			for (let i = start; i < end; i++) {
				const a = Math.abs(samples[i]);
				if (a > peak) peak = a;
			}
			out[b] = peak;
			continue;
		}
		const subWin = Math.max(MACRO_BIN_THRESHOLD, Math.min(1024, Math.floor(len / 8)));
		let binPeak = 0;
		for (let ws = start; ws < end; ws += subWin) {
			const we = Math.min(end, ws + subWin);
			let sumSq = 0;
			for (let i = ws; i < we; i++) {
				const v = samples[i];
				sumSq += v * v;
			}
			const rms = Math.sqrt(sumSq / (we - ws));
			if (rms > binPeak) binPeak = rms;
		}
		out[b] = binPeak;
	}
	return out;
}

/** Amplitude maximale présente dans un tableau de crêtes de stem (0 si silence/vide). */
export function stemPeakAmplitude(peakArray) {
	if (!peakArray || peakArray.length === 0) return 0;
	let m = 0;
	for (let i = 0; i < peakArray.length; i++) {
		const a = Math.abs(peakArray[i]);
		if (a > m) m = a;
	}
	return m;
}
