import { mixAdvice } from '$lib/mixAdvice.js';

const go = (rule, shift, timeStretchPercent = 0) => mixAdvice({ gatekeeper: 'GO', compat: { rule, shift }, timeStretchPercent });

describe('mixAdvice — conseils de mix (Gate Unlocked uniquement)', () => {
	test('aucun conseil quand le Gate est verrouillé', () => {
		expect(mixAdvice({ gatekeeper: 'NO-GO', compat: { rule: 'DISSONANT', shift: 3 }, timeStretchPercent: 43 })).toEqual([]);
	});

	test('aucun conseil sans transition calculée', () => {
		expect(mixAdvice({ gatekeeper: 'GO', compat: null, timeStretchPercent: 0 })).toEqual([]);
	});

	test('même tonalité : transition idéale et mix direct', () => {
		const ids = go('SAME_KEY (0h)', 0).map((a) => a.id);
		expect(ids).toContain('same-key');
		expect(ids).toContain('mix-direct');
		expect(ids).not.toContain('pitch');
	});

	test('relatif majeur/mineur et quinte : mix direct sans transposition', () => {
		expect(go('RELATIVE (A↔B)', 0).map((a) => a.id)).toContain('relative');
		expect(go('QUINTE (±1h)', 0).map((a) => a.id)).toContain('quinte');
	});

	test('boost d\'énergie (+2h) : pitch shift conseillé affiché avec sa valeur', () => {
		const advice = go('ENERGY_BOOST (+2h)', -2);
		const pitch = advice.find((a) => a.id === 'pitch');
		expect(pitch.text).toContain('-2 st');
		expect(advice.map((a) => a.id)).toContain('energy');
	});

	test('modulation (+7h) : avertissement de validation musicale', () => {
		const advice = go('MODULATION (+7h)', 1);
		expect(advice.find((a) => a.id === 'pitch').text).toContain('+1 st');
		expect(advice.find((a) => a.id === 'modulation').tone).toBe('warn');
	});

	test('time-stretch au-delà de 15 % : avertissement warp hazard', () => {
		const warp = go('QUINTE (±1h)', 0, 43.2).find((a) => a.id === 'warp');
		expect(warp.tone).toBe('warn');
		expect(warp.text).toContain('43.2');
	});

	test('time-stretch sous le seuil : tempo compatible, pas d\'alerte', () => {
		const ids = go('QUINTE (±1h)', 0, 5).map((a) => a.id);
		expect(ids).toContain('tempo');
		expect(ids).not.toContain('warp');
	});
});
