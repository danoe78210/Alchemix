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

describe('Module1View — indicateur de chargement des métadonnées', () => {
	beforeEach(() => {
		URL.createObjectURL = vi.fn(() => 'blob:cassette');
		URL.revokeObjectURL = vi.fn();
		// Recherche en ligne qui ne répond pas : le statut doit rester visible
		vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	test('pendant la recherche en ligne, la carte ID3 affiche un statut « patientez »', async () => {
		render(Module1View);
		selectAudioFile('ACDC - Back In Black.mp3');
		fireEvent.click(screen.getAllByTestId('deck-load-eject')[0]);

		await vi.waitFor(() => {
			expect(screen.getByRole('status')).toHaveTextContent('Recherche des métadonnées en ligne');
		});
	});
});
