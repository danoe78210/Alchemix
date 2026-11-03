import { render, screen, fireEvent } from '@testing-library/svelte';
import Module1View from '$lib/views/Module1View.svelte';

/** Simule le choix d'un fichier audio dans l'explorateur natif (input type="file"). */
function selectAudioFile(fileName) {
	const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
	clickSpy.mockImplementation(function () {
		if (this.accept && this.accept.includes('.mp3')) {
			Object.defineProperty(this, 'files', {
				value: [new File(['audio'], fileName, { type: 'audio/mpeg' })],
				configurable: true,
			});
			this.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
		}
	});
}

async function loadDeck(index, fileName) {
	selectAudioFile(fileName);
	fireEvent.click(screen.getAllByTestId('deck-load-eject')[index]);
	await vi.waitFor(() => {
		expect(screen.getAllByTestId('deck-load-eject')[index]).toHaveTextContent('EJECT');
	});
	// En jsdom, l'analyse échoue et ouvre la saisie manuelle : elle est alors terminée
	await vi.waitFor(() => {
		expect(screen.getByTestId('metadata-modal')).toBeInTheDOM();
	});
}

function reelsOf(index) {
	return screen.getAllByTestId('cassette')[index].querySelectorAll('.reel');
}

describe('Module1View — lecture des cassettes (PLAY / STOP)', () => {
	beforeEach(() => {
		URL.createObjectURL = vi.fn(() => 'blob:cassette');
		URL.revokeObjectURL = vi.fn();
		vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
		vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	test('PLAY lance le fichier chargé et fait tourner les bobines du deck A', async () => {
		render(Module1View);
		await loadDeck(0, 'ACDC - Back In Black.mp3');

		fireEvent.click(screen.getAllByRole('button', { name: /PLAY/ })[0]);

		expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
		reelsOf(0).forEach((reel) => expect(reel.classList.contains('animate-spin')).toBe(true));
		expect(screen.getAllByRole('button', { name: /STOP/ })[0]).not.toBeDisabled();
	});

	test('STOP met la lecture en pause et arrête les bobines', async () => {
		render(Module1View);
		await loadDeck(0, 'ACDC - Back In Black.mp3');
		fireEvent.click(screen.getAllByRole('button', { name: /PLAY/ })[0]);

		fireEvent.click(screen.getAllByRole('button', { name: /STOP/ })[0]);

		expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
		reelsOf(0).forEach((reel) => expect(reel.classList.contains('animate-spin')).toBe(false));
	});

	test('PLAY sur le deck B lance son fichier et fait tourner ses bobines', async () => {
		render(Module1View);
		await loadDeck(1, 'Blind Melon - No Rain.mp3');

		fireEvent.click(screen.getAllByRole('button', { name: /PLAY/ })[1]);

		expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
		reelsOf(1).forEach((reel) => expect(reel.classList.contains('animate-spin')).toBe(true));
		expect(screen.getAllByRole('button', { name: /STOP/ })[1]).not.toBeDisabled();
	});

	test('STOP sur le deck B met sa lecture en pause et arrête ses bobines', async () => {
		render(Module1View);
		await loadDeck(1, 'Blind Melon - No Rain.mp3');
		fireEvent.click(screen.getAllByRole('button', { name: /PLAY/ })[1]);

		fireEvent.click(screen.getAllByRole('button', { name: /STOP/ })[1]);

		expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
		reelsOf(1).forEach((reel) => expect(reel.classList.contains('animate-spin')).toBe(false));
	});

	test('la lecture du deck B n\'affecte pas le deck A', async () => {
		render(Module1View);
		await loadDeck(0, 'ACDC - Back In Black.mp3');
		await loadDeck(1, 'Blind Melon - No Rain.mp3');

		fireEvent.click(screen.getAllByRole('button', { name: /PLAY/ })[1]);

		reelsOf(1).forEach((reel) => expect(reel.classList.contains('animate-spin')).toBe(true));
		reelsOf(0).forEach((reel) => expect(reel.classList.contains('animate-spin')).toBe(false));
	});
});
