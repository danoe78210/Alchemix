import { detectBitDepth } from './bitDepth.js';

function wavHeader(bitsPerSample) {
	const buffer = new ArrayBuffer(44);
	const view = new DataView(buffer);
	const write = (offset, text) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
	write(0, 'RIFF');
	view.setUint32(4, 36, true);
	write(8, 'WAVE');
	write(12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 2, true);
	view.setUint32(24, 44100, true);
	view.setUint32(28, 44100 * 2 * (bitsPerSample / 8), true);
	view.setUint16(32, 2 * (bitsPerSample / 8), true);
	view.setUint16(34, bitsPerSample, true);
	write(36, 'data');
	view.setUint32(40, 0, true);
	return buffer;
}

function flacHeader(bitsPerSample) {
	const buffer = new ArrayBuffer(42);
	const bytes = new Uint8Array(buffer);
	bytes.set([0x66, 0x4c, 0x61, 0x43], 0); // 'fLaC'
	// STREAMINFO commence à l'octet 8 ; bits par échantillon = bits 23 à 27 de son 11ᵉ octet
	const value = bitsPerSample - 1;
	bytes[8 + 12] = (value >> 4) & 1;
	bytes[8 + 13] = (value & 0x0f) << 4;
	return buffer;
}

describe('bitDepth — profondeur de bits lue dans l\'en-tête', () => {
	test('WAV 16 bits', () => {
		expect(detectBitDepth(wavHeader(16))).toBe(16);
	});

	test('WAV 24 bits', () => {
		expect(detectBitDepth(wavHeader(24))).toBe(24);
	});

	test('FLAC 24 bits', () => {
		expect(detectBitDepth(flacHeader(24))).toBe(24);
	});

	test('FLAC 16 bits', () => {
		expect(detectBitDepth(flacHeader(16))).toBe(16);
	});

	test('MP3 (pas de profondeur de bits dans l\'en-tête) : null', () => {
		const mp3 = new Uint8Array([0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
		expect(detectBitDepth(mp3)).toBeNull();
	});
});
