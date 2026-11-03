/**
 * Niveau sonore intégré (LUFS), selon l'ITU-R BS.1770 :
 * pondération K (shelf haut + passe-haut RLB), blocs de 400 ms avec recouvrement
 * de 75 %, gate absolu à -70 LUFS puis gate relatif à -10 LU.
 */

const ABSOLUTE_GATE_LUFS = -70;
const RELATIVE_GATE_LU = -10;
const HOP_SECONDS = 0.1;
const BLOCK_HOPS = 4;

// Coefficients de référence BS.1770 (étage 1 : shelf haut ; étage 2 : passe-haut RLB)
const SHELF = { f0: 1681.974450955533, gainDb: 3.999843853973347, q: 0.7071752369554196 };
const HIGH_PASS = { f0: 38.13547087602444, q: 0.5003270373238773 };

function normalize(b0, b1, b2, a0, a1, a2) {
	return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function highShelf(sampleRate, { f0, gainDb, q }) {
	const A = Math.pow(10, gainDb / 40);
	const w0 = (2 * Math.PI * f0) / sampleRate;
	const cos = Math.cos(w0);
	const twoSqrtAAlpha = 2 * Math.sqrt(A) * (Math.sin(w0) / (2 * q));
	return normalize(
		A * (A + 1 + (A - 1) * cos + twoSqrtAAlpha),
		-2 * A * (A - 1 + (A + 1) * cos),
		A * (A + 1 + (A - 1) * cos - twoSqrtAAlpha),
		A + 1 - (A - 1) * cos + twoSqrtAAlpha,
		2 * (A - 1 - (A + 1) * cos),
		A + 1 - (A - 1) * cos - twoSqrtAAlpha
	);
}

function highPass(sampleRate, { f0, q }) {
	const w0 = (2 * Math.PI * f0) / sampleRate;
	const cos = Math.cos(w0);
	const alpha = Math.sin(w0) / (2 * q);
	return normalize((1 + cos) / 2, -(1 + cos), (1 + cos) / 2, 1 + alpha, -2 * cos, 1 - alpha);
}

function biquad(c) {
	let x1 = 0;
	let x2 = 0;
	let y1 = 0;
	let y2 = 0;
	return (x) => {
		const y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
		x2 = x1;
		x1 = x;
		y2 = y1;
		y1 = y;
		return y;
	};
}

// Pondération des canaux : 5.1 (L R C LFE Ls Rs) → LFE exclu, surround ×1,41
function channelWeight(index, count) {
	if (count === 6 && index === 3) return 0;
	if (count === 6 && index >= 4) return 1.41;
	return 1;
}

function toLoudness(meanSquare) {
	return -0.691 + 10 * Math.log10(meanSquare);
}

/**
 * Niveau intégré en LUFS d'un AudioBuffer (ou objet équivalent), ou null si
 * le signal est trop court ou silencieux pour être mesuré.
 */
export function measureLoudness(audioBuffer) {
	const { sampleRate, numberOfChannels } = audioBuffer;
	if (!numberOfChannels) return null;
	const hop = Math.round(sampleRate * HOP_SECONDS);
	const hopCount = Math.floor(audioBuffer.getChannelData(0).length / hop);
	const hopEnergy = new Float64Array(hopCount);

	const shelf = highShelf(sampleRate, SHELF);
	const highPassCoefficients = highPass(sampleRate, HIGH_PASS);
	for (let c = 0; c < numberOfChannels; c++) {
		const weight = channelWeight(c, numberOfChannels);
		const samples = audioBuffer.getChannelData(c);
		const runShelf = biquad(shelf);
		const runHighPass = biquad(highPassCoefficients);
		for (let i = 0; i < samples.length; i++) {
			const y = runHighPass(runShelf(samples[i]));
			hopEnergy[Math.floor(i / hop)] += weight * y * y;
		}
	}

	const blockCount = hopCount - BLOCK_HOPS + 1;
	if (blockCount <= 0) return null;
	const blockLength = BLOCK_HOPS * hop;
	const blockMeans = [];
	for (let k = 0; k < blockCount; k++) {
		let energy = 0;
		for (let h = k; h < k + BLOCK_HOPS; h++) energy += hopEnergy[h];
		const meanSquare = energy / blockLength;
		if (meanSquare > 0 && toLoudness(meanSquare) > ABSOLUTE_GATE_LUFS) blockMeans.push(meanSquare);
	}
	if (blockMeans.length === 0) return null;

	const meanAbsolute = blockMeans.reduce((a, b) => a + b, 0) / blockMeans.length;
	const relativeGate = toLoudness(meanAbsolute) + RELATIVE_GATE_LU;
	const gated = blockMeans.filter((z) => toLoudness(z) > relativeGate);
	return toLoudness(gated.reduce((a, b) => a + b, 0) / gated.length);
}
