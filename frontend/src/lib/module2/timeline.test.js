import { formatTime, visibleRange, rulerTicks } from '$lib/module2/timeline.js';

describe('formatTime — durée en m:ss pour la règle temporelle', () => {
	test('zéro donne 0:00', () => {
		expect(formatTime(0)).toBe('0:00');
	});

	test('les secondes sont tronquées et complétées à deux chiffres', () => {
		expect(formatTime(272)).toBe('4:32');
		expect(formatTime(61.4)).toBe('1:01');
	});

	test('une valeur invalide donne 0:00', () => {
		expect(formatTime(NaN)).toBe('0:00');
		expect(formatTime(-3)).toBe('0:00');
	});
});

describe('visibleRange — fenêtre du zoom commun', () => {
	test('au zoom 1, la fenêtre couvre tout le morceau', () => {
		expect(visibleRange(100, 1, 50)).toEqual({ start: 0, end: 100 });
	});

	test('au zoom 4, la fenêtre est centrée sur la position demandée', () => {
		expect(visibleRange(100, 4, 50)).toEqual({ start: 37.5, end: 62.5 });
	});

	test('la fenêtre est bornée au début du morceau', () => {
		expect(visibleRange(100, 4, 0)).toEqual({ start: 0, end: 25 });
	});

	test('la fenêtre est bornée à la fin du morceau', () => {
		expect(visibleRange(100, 4, 100)).toEqual({ start: 75, end: 100 });
	});
});

describe('rulerTicks — graduations équidistantes de la règle', () => {
	test('renvoie n+1 graduations étiquetées, du début à la fin', () => {
		const ticks = rulerTicks(0, 100, 4);
		expect(ticks.map((t) => t.time)).toEqual([0, 25, 50, 75, 100]);
		expect(ticks[0].label).toBe('0:00');
		expect(ticks[4].label).toBe('1:40');
	});

	test('fonctionne sur une fenêtre zoomée qui ne commence pas à zéro', () => {
		const ticks = rulerTicks(60, 120, 2);
		expect(ticks.map((t) => t.time)).toEqual([60, 90, 120]);
		expect(ticks[1].label).toBe('1:30');
	});
});
