import { render, screen, fireEvent } from '@testing-library/svelte';
import Module1View from '$lib/views/Module1View.svelte';
import { detectBPMKey } from '$lib/audioEngine.js';

vi.mock('$lib/audioEngine.js', async (importOriginal) => ({
	...(await importOriginal()),
	detectBPMKey: vi.fn()
}));

/** Buffer décodé minimal : une impulsion pour que la lecture audio et le bitrate aient une entrée valide. */
function decodedBuffer(seconds = 2, sr = 44100) {
	const pcm = new Float32Array(Math.floor(seconds * sr));
	pcm[0] = 1;
	return { sampleRate: sr, length: pcm.length, duration: seconds, numberOfChannels: 1, getChannelData: () => pcm };
}

/** Fichier avec arrayBuffer (jsdom ne fournit pas Blob.arrayBuffer) */
function audioFile(name) {
	const bytes = new Uint8Array(64);
	const file = new File([bytes], name, { type: 'audio/mpeg' });
	file.arrayBuffer = async () => bytes.buffer;
	return file;
}

function selectFile(file) {
	vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function () {
		if (this.accept && this.accept.includes('.mp3')) {
			Object.defineProperty(this, 'files', { value: [file], configurable: true });
			this.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
		}
	});
}

/** Charge une piste A dont le DSP renvoie la clé et la confiance données. */
async function loadTrackWithKey(key, keyConfidence) {
	detectBPMKey.mockResolvedValue({ bpm: 85, confidence: 95, regularity: 0.5, key, keyConfidence });
	render(Module1View);
	selectFile(audioFile('Artiste - Titre.mp3'));
	fireEvent.click(screen.getAllByTestId('deck-load-eject')[0]);
	await vi.waitFor(() => {
		expect(document.querySelector('.bpm-number').textContent).toMatch(/^\d+\.\d{2}$/);
	});
}

describe('Module1View — confiance de la tonalité', () => {
	beforeEach(() => {
		URL.createObjectURL = vi.fn(() => 'blob:cassette');
		URL.revokeObjectURL = vi.fn();
		vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 404, json: async () => ({}) })));
		vi.stubGlobal(
			'AudioContext',
			class {
				decodeAudioData() {
					return Promise.resolve(decodedBuffer());
				}
				close() {}
			}
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	test('la confiance de la tonalité s\'affiche sur la piste', async () => {
		await loadTrackWithKey('6A', 85.5);
		expect(screen.getAllByTestId('key-confidence')[0]).toHaveTextContent('85.5%');
	});

	test('confiance sous le seuil : la fenêtre de saisie s\'ouvre, pré-remplie avec la clé détectée', async () => {
		await loadTrackWithKey('6A', 40);
		expect(screen.getByTestId('metadata-modal')).toBeInTheDocument();
		expect(screen.getByTestId('modal-key-input')).toHaveValue('6A');
		expect(screen.getByTestId('modal-key-warning')).toHaveTextContent('40.0');
	});

	test('confiance suffisante : pas de fenêtre de saisie', async () => {
		await loadTrackWithKey('6A', 85);
		expect(screen.queryByTestId('metadata-modal')).toBeNull();
	});
});
