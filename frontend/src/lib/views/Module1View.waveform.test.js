import { render, screen, fireEvent } from '@testing-library/svelte';
import Module1View from '$lib/views/Module1View.svelte';

// audioEngine partiellement mocké : detectBPMKey et analyzeSegments sont contrôlés
// (worker DSP simulé), le reste (parseID3Tags, resolveTempo, analyzeMetadata, ...) reste réel.
vi.mock('$lib/audioEngine.js', async (importOriginal) => {
	const mod = await importOriginal();
	return {
		...mod,
		detectBPMKey: vi.fn(async () => ({ bpm: 120, confidence: 0.95, regularity: 0.9, key: '8B', keyConfidence: 0.92 })),
		analyzeSegments: vi.fn(async () => [
			{ startS: 0, bpm: 120, confidence: 0.9, regularity: 0.9, key: '8B', keyConfidence: 0.9 },
			{ startS: 30, bpm: 90, confidence: 0.8, regularity: 0.8, key: '10B', keyConfidence: 0.85 }
		])
	};
});

const SAMPLE_RATE = 8000;
const DURATION_S = 65; // 2 segments de 30 s + 5 s (marqueur attendu à t = 30)

/** Faux AudioBuffer décodé : sinusoïde 440 Hz ; en stéréo, le canal droit est une copie atténuée inversée. */
function fakeAudioBuffer(numChannels = 1) {
	const length = SAMPLE_RATE * DURATION_S;
	const chans = [];
	for (let c = 0; c < numChannels; c++) {
		const pcm = new Float32Array(length);
		const gain = c === 0 ? 1 : -0.5;
		for (let i = 0; i < length; i++) pcm[i] = gain * Math.sin((2 * Math.PI * i) / (SAMPLE_RATE / 440));
		chans.push(pcm);
	}
	return {
		sampleRate: SAMPLE_RATE,
		length,
		duration: DURATION_S,
		numberOfChannels: numChannels,
		getChannelData: (c) => chans[c % chans.length]
	};
}

class FakeAudioContext {
	static numChannels = 1;
	decodeAudioData = async () => fakeAudioBuffer(FakeAudioContext.numChannels);
	close() {}
}

/** Simule le choix d'un fichier audio dans l'explorateur natif (input type="file"). */
function selectAudioFile(fileName) {
	const inputSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
	inputSpy.mockImplementation(function () {
		const input = this;
		if (input.accept && input.accept.includes('.mp3')) {
			Object.defineProperty(input, 'files', {
				value: [{ name: fileName, arrayBuffer: async () => new ArrayBuffer(0) }],
				configurable: true
			});
			input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
		}
	});
	return inputSpy;
}

async function clickLoad(deckIndex) {
	fireEvent.click(screen.getAllByTestId('deck-load-eject')[deckIndex]);
	// Laisse les promesses (décodage, DSP mocké, analyse par segments) se vider.
	await new Promise((resolve) => setTimeout(resolve, 0));
}

async function loadDeckA() {
	selectAudioFile('ACDC - Back In Black.mp3');
	await clickLoad(0);
	await vi.waitFor(() => {
		expect(screen.getByTestId('waveform-canvas')).toBeInTheDOM();
	});
	// L'analyse par segments (mockée) est terminée : plus d'état de chargement
	await vi.waitFor(() => {
		expect(screen.queryByTestId('waveform-loading')).not.toBeInTheDOM();
	});
}

describe('Module1View — panneau forme d onde A/B (M6, alchemix#44)', () => {
	beforeEach(() => {
		FakeAudioContext.numChannels = 1;
		vi.stubGlobal('AudioContext', FakeAudioContext);
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }))
		);
		URL.createObjectURL = vi.fn(() => 'blob:cassette');
		URL.revokeObjectURL = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	test('à l’ouverture, le panneau affiche AUCUN SIGNAL (aucune piste chargée)', () => {
		render(Module1View, { props: { activeTab: 'waveform' } });
		expect(screen.getByTestId('waveform-section')).toBeInTheDOM();
		expect(screen.getByTestId('waveform-empty')).toHaveTextContent('AUCUN SIGNAL');
		expect(screen.getByTestId('waveform-mode')).toHaveTextContent('RYTHME');
		expect(screen.getByTestId('track-state')).toHaveTextContent('A');
	});

	test('piste A chargée : canvas de la forme d’onde + badge RYTHME, chargement terminé', async () => {
		render(Module1View, { props: { activeTab: 'waveform' } });
		await loadDeckA();
		expect(screen.getByTestId('waveform-canvas')).toBeInTheDOM();
		expect(screen.getByTestId('waveform-mode')).toHaveTextContent('RYTHME');
		expect(screen.getByTestId('waveform-mode')).toHaveTextContent('●');
	});

	test('le levier PISTE bascule l’affichage sur la piste B (non chargée -> AUCUN SIGNAL)', async () => {
		render(Module1View, { props: { activeTab: 'waveform' } });
		await loadDeckA();
		fireEvent.click(screen.getByTestId('track-toggle'));
		expect(screen.getByTestId('track-state')).toHaveTextContent('B');
		expect(screen.getByTestId('waveform-empty')).toHaveTextContent('AUCUN SIGNAL');
		// Retour sur A : le canvas réapparaît
		fireEvent.click(screen.getByTestId('track-toggle'));
		expect(screen.getByTestId('track-state')).toHaveTextContent('A');
		await vi.waitFor(() => {
			expect(screen.getByTestId('waveform-canvas')).toBeInTheDOM();
		});
	});

	test('le levier MARQUEURS bascule le badge entre RYTHME et CLEF', async () => {
		render(Module1View, { props: { activeTab: 'waveform' } });
		await loadDeckA();
		expect(screen.getByTestId('mode-state')).toHaveTextContent('RYTHME');
		fireEvent.click(screen.getByTestId('mode-toggle'));
		expect(screen.getByTestId('mode-state')).toHaveTextContent('CLEF');
		expect(screen.getByTestId('waveform-mode')).toHaveTextContent('CLEF');
		fireEvent.click(screen.getByTestId('mode-toggle'));
		expect(screen.getByTestId('mode-state')).toHaveTextContent('RYTHME');
	});

	test('marqueurs rendus d’après les segments : 120 → 90 BPM en RYTHME, 8B → 10B en CLEF', async () => {
		render(Module1View, { props: { activeTab: 'waveform' } });
		await loadDeckA();
		await vi.waitFor(() => {
			expect(screen.getAllByTestId('waveform-marker').length).toBe(1);
		});
		expect(screen.getByTestId('waveform-marker')).toHaveTextContent('120 → 90 BPM');
		fireEvent.click(screen.getByTestId('mode-toggle'));
		await vi.waitFor(() => {
			expect(screen.getByTestId('waveform-marker')).toHaveTextContent('8B → 10B');
		});
	});

	test('éjecter la piste A réinitialise le panneau forme d’onde (AUCUN SIGNAL)', async () => {
		render(Module1View, { props: { activeTab: 'waveform' } });
		await loadDeckA();
		fireEvent.click(screen.getAllByTestId('deck-load-eject')[0]);
		await vi.waitFor(() => {
			expect(screen.getByTestId('waveform-empty')).toHaveTextContent('AUCUN SIGNAL');
		});
		expect(screen.queryByTestId('waveform-canvas')).not.toBeInTheDOM();
	});

	test('buffer stéréo : tous les canaux alimentent l’enveloppe (canvas rendu sans erreur)', async () => {
		FakeAudioContext.numChannels = 2;
		render(Module1View, { props: { activeTab: 'waveform' } });
		await loadDeckA();
		expect(screen.getByTestId('waveform-canvas')).toBeInTheDOM();
		expect(screen.queryByTestId('waveform-loading')).not.toBeInTheDOM();
	});
});
