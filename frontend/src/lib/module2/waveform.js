/**
 * Formes d'onde des stems (prototype Module 2) : crête absolue par tranche de l'échantillon.
 */

/** Crête absolue de `bins` tranches de `samples` ; chaque échantillon appartient à au moins une tranche. */
export function peaks(samples, bins) {
	const out = new Float32Array(bins);
	const size = samples.length / bins;
	for (let b = 0; b < bins; b++) {
		const start = Math.floor(b * size);
		const end = Math.min(samples.length, Math.ceil((b + 1) * size));
		let peak = 0;
		for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(samples[i]));
		out[b] = peak;
	}
	return out;
}
