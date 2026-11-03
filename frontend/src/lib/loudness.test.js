import { measureLoudness } from './loudness.js';

function buffer({ sampleRate = 48000, channels = [] }) {
	return {
		sampleRate,
		numberOfChannels: channels.length,
		duration: channels[0] ? channels[0].length / sampleRate : 0,
		getChannelData: (i) => channels[i],
	};
}

function sine({ freq = 1000, amplitude = 0.1, seconds = 10, sampleRate = 48000 } = {}) {
	const n = Math.round(seconds * sampleRate);
	const data = new Float32Array(n);
	for (let i = 0; i < n; i++) data[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / sampleRate);
	return data;
}

describe('loudness — niveau intégré (approximation ITU-R BS.1770)', () => {
	test('un silence n\'a pas de niveau mesurable (null)', () => {
		const silence = new Float32Array(48000 * 5);
		expect(measureLoudness(buffer({ channels: [silence] }))).toBeNull();
	});

	test('un sinus mono à -20 dBFS RMS mesure environ -20,7 LUFS', () => {
		// RMS = A / √2 = 0,1 → A ≈ 0,1414 ; -0,691 + 10·log10(ms) ≈ -20,7
		const amplitude = Math.SQRT2 * Math.pow(10, -20 / 20);
		const lufs = measureLoudness(buffer({ channels: [sine({ amplitude })] }));
		expect(lufs).toBeGreaterThan(-21.7);
		expect(lufs).toBeLessThan(-19.7);
	});

	test('doubler l\'amplitude (+6 dB) élève le niveau d\'environ 6 LU', () => {
		const quiet = measureLoudness(buffer({ channels: [sine({ amplitude: 0.05 })] }));
		const loud = measureLoudness(buffer({ channels: [sine({ amplitude: 0.1 })] }));
		expect(loud - quiet).toBeGreaterThan(5.5);
		expect(loud - quiet).toBeLessThan(6.5);
	});

	test('la mesure renvoie un nombre fini pour un signal réel court', () => {
		const lufs = measureLoudness(buffer({ channels: [sine({ seconds: 1 })] }));
		expect(Number.isFinite(lufs)).toBe(true);
	});
});
