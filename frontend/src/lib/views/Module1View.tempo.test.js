import { render, screen, fireEvent } from '@testing-library/svelte';
import Module1View from '$lib/views/Module1View.svelte';

/** Buffer décodé simulé : clics réguliers à un tempo exact (même principe que audioEngine.test.js). */
function clickBuffer(bpm, seconds = 12, sr = 44100) {
	const pcm = new Float32Array(Math.floor(seconds * sr));
	const interval = (60 / bpm) * sr;
	for (let i = 0; i * interval < pcm.length; i++) pcm[Math.round(i * interval)] = 1;
	return { sampleRate: sr, length: pcm.length, duration: seconds, numberOfChannels: 1, getChannelData: () => pcm };
}

/** Fichier avec arrayBuffer (jsdom ne fournit pas Blob.arrayBuffer) */
function audioFile(name) {
	const bytes = new Uint8Array(64);
	const file = new File([bytes], name, { type: 'audio/mpeg' });
	file.arrayBuffer = async () => bytes.buffer;
	return file;
}

/** Fichier portant un tag ID3v2.3 avec une seule trame TKEY (ex. « Am ») */
function taggedFile(name, key) {
	const text = [0, ...Array.from(key, (c) => c.charCodeAt(0))];
	const frame = [0x54, 0x4b, 0x45, 0x59, 0, 0, 0, text.length, 0, 0, ...text];
	const bytes = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, frame.length, ...frame]);
	const file = new File([bytes], name, { type: 'audio/mpeg' });
	file.arrayBuffer = async () => bytes.buffer;
	return file;
}

function selectFile(file) {
	const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
	clickSpy.mockImplementation(function () {
		if (this.accept && this.accept.includes('.mp3')) {
			Object.defineProperty(this, 'files', { value: [file], configurable: true });
			this.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
		}
	});
}

describe('Module1View — tempo calculé à partir du décodage audio', () => {
	beforeEach(() => {
		URL.createObjectURL = vi.fn(() => 'blob:cassette');
		URL.revokeObjectURL = vi.fn();
		vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 404, json: async () => ({}) })));
		vi.stubGlobal(
			'AudioContext',
			class {
				decodeAudioData() {
					return Promise.resolve(clickBuffer(128.37));
				}
				close() {}
			}
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	test('le BPM calculé s\'affiche comme nombre (ni NaN ni objet) et proche du tempo réel', async () => {
		render(Module1View);
		selectFile(audioFile('Artiste - Titre.mp3'));
		fireEvent.click(screen.getAllByTestId('deck-load-eject')[0]);

		await vi.waitFor(() => {
			expect(document.querySelector('.bpm-number').textContent).toMatch(/^\d+\.\d{2}$/);
		});
		const bpm = parseFloat(document.querySelector('.bpm-number').textContent);
		expect(Math.abs(bpm - 128.37)).toBeLessThan(0.1);
		expect(document.body.textContent).not.toContain('NaN');
		expect(document.body.textContent).not.toContain('[object Object]');
	});

	test('un tag TBPM faux (191) ne remplace pas une mesure fiable (128,37)', async () => {
		render(Module1View);
		// En-tête ID3v2.3 minimal : une seule trame TBPM = "191"
		const tbpm = [0x54, 0x42, 0x50, 0x4d, 0, 0, 0, 4, 0, 0, 0x00, 0x31, 0x39, 0x31];
		const bytes = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 14, ...tbpm]);
		const file = new File([bytes], 'Artiste - Titre.mp3', { type: 'audio/mpeg' });
		file.arrayBuffer = async () => bytes.buffer;
		selectFile(file);
		fireEvent.click(screen.getAllByTestId('deck-load-eject')[0]);

		await vi.waitFor(() => {
			expect(document.querySelector('.bpm-number').textContent).toMatch(/^\d+\.\d{2}$/);
		});
		const bpm = parseFloat(document.querySelector('.bpm-number').textContent);
		expect(Math.abs(bpm - 128.37)).toBeLessThan(0.1);
	});

	test('la clé affichée est un code Camelot ou « -- », jamais un objet', async () => {
		render(Module1View);
		selectFile(audioFile('Artiste - Titre.mp3'));
		fireEvent.click(screen.getAllByTestId('deck-load-eject')[0]);

		await vi.waitFor(() => {
			expect(document.querySelector('.bpm-number').textContent).toMatch(/^\d+\.\d{2}$/);
		});
		const key = screen.getAllByTestId('telemetry-key')[0].textContent.trim();
		expect(key).toMatch(/^(\d{1,2}[AB]|--)$/);
	});

	test('un tag ID3 TKEY en notation musicale (« Am ») est converti en code Camelot 8A', async () => {
		render(Module1View);
		selectFile(taggedFile('Artiste - Titre.mp3', 'Am'));
		fireEvent.click(screen.getAllByTestId('deck-load-eject')[0]);

		await vi.waitFor(() => {
			expect(document.querySelector('.bpm-number').textContent).toMatch(/^\d+\.\d{2}$/);
		});
		expect(screen.getAllByTestId('telemetry-key')[0].textContent.trim()).toBe('8A');
	});
});
