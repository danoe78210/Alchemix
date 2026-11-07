/**
 * Règle temporelle et zoom commun des stems (Module 2, zone des waveforms).
 */

/** Durée en `m:ss`. Les valeurs invalides ou négatives donnent `0:00`. */
export function formatTime(seconds) {
	if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
	const total = Math.floor(seconds);
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
}

/** Fenêtre visible d'un morceau de `duration` s au facteur `zoom`, centrée sur `center` et bornée au morceau. */
export function visibleRange(duration, zoom, center) {
	const span = duration / Math.max(1, zoom);
	let start = center - span / 2;
	start = Math.min(Math.max(0, start), duration - span);
	return { start, end: start + span };
}

/** `n + 1` graduations équidistantes de `start` à `end`, étiquetées en `m:ss`. */
export function rulerTicks(start, end, n) {
	const ticks = [];
	for (let i = 0; i <= n; i++) {
		const time = start + ((end - start) * i) / n;
		ticks.push({ time, label: formatTime(time) });
	}
	return ticks;
}
