import { effectiveGain, StemMixer } from '$lib/module2/mixer.js';

function fakeContext() {
	const sources = [];
	const analysers = [];
	const createAnalyser = () => {
		const a = {
			fftSize: 4,
			samples: [0, 0, 0, 0],
			connect: vi.fn(),
			getFloatTimeDomainData: (arr) => arr.set(a.samples),
		};
		analysers.push(a);
		return a;
	};
	return {
		currentTime: 0,
		destination: {},
		sources,
		analysers,
		createAnalyser,
		createGain: () => ({ gain: { value: 1 }, connect: vi.fn() }),
		createBufferSource: () => {
			const source = { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
			sources.push(source);
			return source;
		},
	};
}

describe('effectiveGain — mute et solo (FR-013, FR-014)', () => {
	test('un stem muet est coupé', () => {
		expect(effectiveGain({ volume: 0.8, muted: true, soloed: false, anySolo: false })).toBe(0);
	});

	test('sans solo, le gain est le volume', () => {
		expect(effectiveGain({ volume: 0.8, muted: false, soloed: false, anySolo: false })).toBe(0.8);
	});

	test('avec un solo actif, les autres stems sont coupés', () => {
		expect(effectiveGain({ volume: 0.8, muted: false, soloed: false, anySolo: true })).toBe(0);
	});

	test('le stem en solo garde son volume', () => {
		expect(effectiveGain({ volume: 0.8, muted: false, soloed: true, anySolo: true })).toBe(0.8);
	});
});

describe('StemMixer — lecture par stem', () => {
	test('lancer un stem démarre sa source avec son buffer, arrêter la coupe', () => {
		const ctx = fakeContext();
		const mixer = new StemMixer(ctx);
		const buffer = { duration: 2 };
		mixer.load('drums', buffer);

		mixer.setPlaying('drums', true);
		expect(ctx.sources).toHaveLength(1);
		expect(ctx.sources[0].buffer).toBe(buffer);
		expect(ctx.sources[0].start).toHaveBeenCalled();

		mixer.setPlaying('drums', false);
		expect(ctx.sources[0].stop).toHaveBeenCalled();
	});

	test('le solo applique le gain effectif à chaque stem', () => {
		const ctx = fakeContext();
		const mixer = new StemMixer(ctx);
		mixer.load('vocals', {});
		mixer.load('drums', {});

		mixer.setSolo('drums', true);

		expect(mixer.gainOf('vocals')).toBe(0);
		expect(mixer.gainOf('drums')).toBe(1);
	});

	test('le niveau de sortie est mesuré sur l\'analyseur : crête et RMS', () => {
		const ctx = fakeContext();
		const mixer = new StemMixer(ctx);
		ctx.analysers[0].samples = [0.5, -0.5, 0.5, -0.5];

		const level = mixer.level();

		expect(level.peak).toBeCloseTo(0.5);
		expect(level.rms).toBeCloseTo(0.5);
	});

	test('la fin naturelle d\'un stem le remet à l\'arrêt et le signale', () => {
		const ctx = fakeContext();
		const onEnded = vi.fn();
		const mixer = new StemMixer(ctx, onEnded);
		mixer.load('drums', { duration: 2 });

		mixer.setPlaying('drums', true);
		ctx.sources[0].onended();

		expect(onEnded).toHaveBeenCalledWith('drums');
		mixer.setPlaying('drums', true);
		expect(ctx.sources).toHaveLength(2);
	});

	test('le niveau d\'un stem est mesuré sur son propre analyseur', () => {
		const ctx = fakeContext();
		const mixer = new StemMixer(ctx);
		mixer.load('vocals', {});
		mixer.load('drums', {});
		// Analyseur 0 : sortie générale ; 1 : voix ; 2 : batterie.
		ctx.analysers[2].samples = [0.25, -0.25, 0.25, -0.25];

		expect(mixer.stemLevel('drums').peak).toBeCloseTo(0.25);
		expect(mixer.stemLevel('vocals').peak).toBe(0);
	});
});

describe('StemMixer — transport partagé (curseur de lecture commun)', () => {
	test('à l\'arrêt, la position est 0 et la durée est celle du plus long stem', () => {
		const ctx = fakeContext();
		const mixer = new StemMixer(ctx);
		mixer.load('vocals', { duration: 120 });
		mixer.load('drums', { duration: 90 });

		expect(mixer.position()).toBe(0);
		expect(mixer.duration()).toBe(120);
	});

	test('pendant la lecture, la position suit l\'horloge du contexte', () => {
		const ctx = fakeContext();
		const mixer = new StemMixer(ctx);
		mixer.load('drums', { duration: 120 });

		mixer.setPlaying('drums', true);
		ctx.currentTime = 3;

		expect(mixer.position()).toBeCloseTo(3);
	});

	test('la pause fige la position, et la reprise repart de cette position partagée', () => {
		const ctx = fakeContext();
		const mixer = new StemMixer(ctx);
		mixer.load('drums', { duration: 120 });

		mixer.setPlaying('drums', true);
		ctx.currentTime = 3;
		mixer.setPlaying('drums', false);
		ctx.currentTime = 10;

		expect(mixer.position()).toBeCloseTo(3);
		mixer.setPlaying('drums', true);
		expect(ctx.sources[1].start).toHaveBeenCalledWith(0, 3);
	});

	test('un stem lancé pendant la lecture rejoint la position courante du transport', () => {
		const ctx = fakeContext();
		const mixer = new StemMixer(ctx);
		mixer.load('vocals', { duration: 120 });
		mixer.load('drums', { duration: 120 });

		mixer.setPlaying('vocals', true);
		ctx.currentTime = 5;
		mixer.setPlaying('drums', true);

		expect(ctx.sources[1].start).toHaveBeenCalledWith(0, 5);
	});

	test('mettre un stem en pause ne fige pas le transport si un autre joue encore', () => {
		const ctx = fakeContext();
		const mixer = new StemMixer(ctx);
		mixer.load('vocals', { duration: 120 });
		mixer.load('drums', { duration: 120 });

		mixer.setPlaying('vocals', true);
		mixer.setPlaying('drums', true);
		ctx.currentTime = 2;
		mixer.setPlaying('vocals', false);
		ctx.currentTime = 7;

		expect(mixer.position()).toBeCloseTo(7);
	});

	test('seek déplace la position et redémarre les stems en lecture au nouvel endroit', () => {
		const ctx = fakeContext();
		const mixer = new StemMixer(ctx);
		mixer.load('drums', { duration: 120 });

		mixer.setPlaying('drums', true);
		ctx.currentTime = 2;
		mixer.seek(30);

		expect(ctx.sources[0].stop).toHaveBeenCalled();
		expect(ctx.sources[1].start).toHaveBeenCalledWith(0, 30);
		expect(mixer.position()).toBeCloseTo(30);
	});

	test('la fin naturelle du dernier stem en lecture remet la position à zéro', () => {
		const ctx = fakeContext();
		const mixer = new StemMixer(ctx);
		mixer.load('drums', { duration: 2 });

		mixer.setPlaying('drums', true);
		ctx.currentTime = 2;
		ctx.sources[0].onended();

		expect(mixer.position()).toBe(0);
	});
});
