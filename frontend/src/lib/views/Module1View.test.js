import { render, screen, fireEvent } from '@testing-library/svelte';
import Module1View from '$lib/views/Module1View.svelte';

const deckAName = 'ACDC - Back In Black.mp3';
const deckBName = 'Blind Melon - No Rain.mp3';

/**
 * Simule la sélection d'un fichier audio par l'explorateur natif
 * (input type="file" utilisé par pickFile dans Module1View).
 */
function selectAudioFile(fileName) {
	const inputSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
	inputSpy.mockImplementation(function () {
		const input = this;
		if (input.accept && input.accept.includes('.mp3')) {
			Object.defineProperty(input, 'files', {
				value: [{ name: fileName, arrayBuffer: async () => new ArrayBuffer(0) }],
				configurable: true,
			});
			input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
		}
	});
	return inputSpy;
}

async function clickLoad(deckIndex) {
	fireEvent.click(screen.getAllByTestId('deck-load-eject')[deckIndex]);
	// Laisse les promesses de pickFile et le rendu Svelte se vider.
	await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Remplit et valide la modale de métadonnées manquantes (BPM + clé Camelot).
 * En jsdom, pas d'ID3 lisible ni d'AudioContext : BPM/clé sont indéterminés
 * après l'import -> la modale s'ouvre, le DJ saisit les valeurs manuellement.
 */
async function fillAndConfirmModal(bpm, key) {
	await vi.waitFor(() => {
		expect(screen.getByTestId('metadata-modal')).toBeInTheDOM();
	});
	fireEvent.input(screen.getByTestId('modal-bpm-input'), { target: { value: bpm } });
	fireEvent.change(screen.getByTestId('modal-key-select'), { target: { value: key } });
	const confirm = screen.getByTestId('modal-confirm');
	await vi.waitFor(() => {
		expect(confirm).not.toBeDisabled();
	});
	fireEvent.click(confirm);
	await vi.waitFor(() => {
		expect(screen.queryByTestId('metadata-modal')).not.toBeInTheDOM();
	});
}

describe('Module1View — chargement par cassette et grille plein écran', () => {
	beforeEach(() => {
		// Mock global de fetch : intercepte itunes.apple.com. Par défaut, résultats vides
		// (simule hors-ligne) -> metadataService renvoie { success: false } sans bloquer l'UI.
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url) => {
				if (String(url).includes('itunes.apple.com')) {
					return { ok: true, json: async () => ({ resultCount: 0, results: [] }) };
				}
				return { ok: false, status: 404, json: async () => ({}) };
			})
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	test('affiche les deux lecteurs vides et le calcul verrouillé à l\'ouverture', () => {
		render(Module1View);
		expect(screen.getByText('TRACK A - MASTER')).toBeInTheDOM();
		expect(screen.getByText('TRACK B - CANDIDATE')).toBeInTheDOM();
		expect(screen.getAllByText('INSÉRER CASSETTE').length).toBe(2);
		expect(screen.getByText('WAITING FOR TRACKS (0/2)')).toBeInTheDOM();
		expect(screen.getByRole('button', { name: /LANCER L'ANALYSE HARMONIQUE/ })).toBeDisabled();
	});

	test('le bouton LOAD du Deck A ouvre l\'explorateur audio et met à jour la piste A', async () => {
		render(Module1View);
		const clickSpy = selectAudioFile(deckAName);
		await clickLoad(0);

		expect(clickSpy).toHaveBeenCalledTimes(1);
		await vi.waitFor(() => {
			expect(screen.queryAllByTestId('deck-track-name').length).toBe(1);
		});
		expect(screen.getByTestId('deck-track-name')).toHaveTextContent('ACDC - Back In Black');
		expect(screen.getByText('ACDC')).toBeInTheDOM(); // ID3TagCard (fallback nom de fichier)
		expect(screen.getByText('Back In Black')).toBeInTheDOM();
		expect(screen.getAllByText('INSÉRER CASSETTE').length).toBe(1);

		// Fichier sans ID3 lisible ni DSP en jsdom : BPM/clé indéterminés -> modale ouverte
		await vi.waitFor(() => {
			expect(screen.getByTestId('metadata-modal')).toBeInTheDOM();
		});

		// Un seul deck chargé : calcul encore verrouillé
		expect(screen.getByRole('button', { name: /LANCER L'ANALYSE HARMONIQUE/ })).toBeDisabled();
		expect(screen.getByText('WAITING FOR TRACKS (1/2)')).toBeInTheDOM();
	});

	test('le chargement des deux decks (saisie modale) déverrouille le calcul et lance l\'analyse', async () => {
		render(Module1View);
		const clickSpy = selectAudioFile(deckAName);
		await clickLoad(0);
		await vi.waitFor(() => {
			expect(screen.queryAllByTestId('deck-track-name').length).toBe(1);
		});
		// Métadonnées manquantes -> saisie manuelle piste A (référence : 12B / 90.8 BPM)
		await fillAndConfirmModal('90.8', '12B');

		vi.restoreAllMocks();
		const clickSpyB = selectAudioFile(deckBName);
		await clickLoad(1);
		expect(clickSpyB).toHaveBeenCalledTimes(1);
		await vi.waitFor(() => {
			expect(screen.queryAllByTestId('deck-track-name').length).toBe(2);
		});
		expect(screen.queryAllByTestId('deck-track-name')[1]).toHaveTextContent(
			'Blind Melon - No Rain'
		);
		// Saisie manuelle piste B (référence : 12B / 148.7 BPM)
		await fillAndConfirmModal('148.7', '12B');

		expect(screen.getByText('OK - READY TO ANALYZE')).toBeInTheDOM();
		const calcBtn = screen.getByRole('button', { name: /LANCER L'ANALYSE HARMONIQUE/ });
		expect(calcBtn).not.toBeDisabled();

		fireEvent.click(calcBtn);
		await new Promise((resolve) => setTimeout(resolve, 0)); // laisse le rendu Svelte se vider
		// Valeurs saisies via la modale : 90.80 BPM (A) et 148.70 BPM (B) affichées par les TempoDisplay
		expect(screen.getByText('90.80')).toBeInTheDOM();
		expect(screen.getByText('148.70')).toBeInTheDOM();

		// Gatekeeper : 12B ➔ 12B = SAME_KEY → 100 % de consonance, statut GO
		expect(screen.getByText('GO — GATE UNLOCKED')).toBeInTheDOM();
		expect(screen.getByText('100%')).toBeInTheDOM();
		// Phase 2 : plus de bouton global Module 2 ; seuls les boutons dédiés par piste restent actifs
		expect(screen.queryByRole('button', { name: /ENVOYER VERS MODULE 2/ })).toBeNull();
		expect(screen.getByRole('button', { name: /DÉMIXER PISTE A/ })).not.toBeDisabled();
		expect(screen.getByRole('button', { name: /DÉMIXER PISTE B/ })).not.toBeDisabled();
	});

	test('la modale de métadonnées manquantes s\'affiche et applique la saisie du DJ', async () => {
		render(Module1View);
		selectAudioFile('morceau-inconnu.mp3');
		await clickLoad(0);
		// Pas d'ID3 lisible ni de DSP en jsdom : BPM/clé indéterminés -> modale ouverte
		await vi.waitFor(() => {
			expect(screen.getByTestId('metadata-modal')).toBeInTheDOM();
		});
		expect(screen.getByTestId('modal-confirm')).toBeDisabled(); // champs vides -> saisie invalide
		fireEvent.input(screen.getByTestId('modal-bpm-input'), { target: { value: '123.4' } });
		fireEvent.change(screen.getByTestId('modal-key-select'), { target: { value: '8A' } });
		await vi.waitFor(() => {
			expect(screen.getByTestId('modal-confirm')).not.toBeDisabled();
		});
		fireEvent.click(screen.getByTestId('modal-confirm'));
		await vi.waitFor(() => {
			expect(screen.queryByTestId('metadata-modal')).not.toBeInTheDOM();
		});
		// La saisie est appliquée : le TempoDisplay de la piste A affiche 123.40 BPM
		expect(screen.getByText('123.40')).toBeInTheDOM();
	});

	test('références mesurées : All That She Wants (187.50 BPM / 12A) et Fallin\' (191.90 BPM / 9A)', async () => {
		render(Module1View);
		selectAudioFile('Ace of Base - All That She Wants.mp3');
		await clickLoad(0);
		await vi.waitFor(() => {
			expect(screen.queryAllByTestId('deck-track-name').length).toBe(1);
		});
		// Référence : 187.50 BPM / 12A
		await fillAndConfirmModal('187.50', '12A');

		vi.restoreAllMocks();
		selectAudioFile("Alicia Keys - Fallin'.mp3");
		await clickLoad(1);
		await vi.waitFor(() => {
			expect(screen.queryAllByTestId('deck-track-name').length).toBe(2);
		});
		// Référence : 191.90 BPM / 9A
		await fillAndConfirmModal('191.90', '9A');

		const calcBtn = screen.getByRole('button', { name: /LANCER L'ANALYSE HARMONIQUE/ });
		expect(calcBtn).not.toBeDisabled();
		fireEvent.click(calcBtn);
		await new Promise((resolve) => setTimeout(resolve, 0));
		// Valeurs de référence affichées par les TempoDisplay
		expect(screen.getByText('187.50')).toBeInTheDOM();
		expect(screen.getByText('191.90')).toBeInTheDOM();
	});

	test('le bouton RELATIF bascule la clé détectée entre Majeur et Mineur relatif (9B ↔ 9A)', async () => {
		render(Module1View);
		selectAudioFile(deckAName);
		await clickLoad(0);
		await vi.waitFor(() => {
			expect(screen.queryAllByTestId('deck-track-name').length).toBe(1);
		});
		await fillAndConfirmModal('90.8', '12B');
		vi.restoreAllMocks();
		selectAudioFile(deckBName);
		await clickLoad(1);
		await vi.waitFor(() => {
			expect(screen.queryAllByTestId('deck-track-name').length).toBe(2);
		});
		await fillAndConfirmModal('148.7', '9B'); // Sol majeur (9B)

		const calcBtn = screen.getByRole('button', { name: /LANCER L'ANALYSE HARMONIQUE/ });
		fireEvent.click(calcBtn);
		await new Promise((resolve) => setTimeout(resolve, 0));

		const toggle = screen.getByTestId('toggle-relative-mode');
		expect(toggle).toHaveTextContent('9B ↔ 9A');
		// Bascule 9B (Sol majeur) -> 9A (Mi mineur, relative)
		fireEvent.click(toggle);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(toggle).toHaveTextContent('9A ↔ 9B');
		// 12B ➔ 9A : écart de 7h -> MODULATION (+7h), 75 % de consonance, GO
		expect(screen.getByText('GO — GATE UNLOCKED')).toBeInTheDOM();
		expect(screen.getByText('75%')).toBeInTheDOM();
	});

	test('le bouton ÉJECTER réinitialise le lecteur à l\'état vide (INSÉRER CASSETTE)', async () => {
		render(Module1View);
		selectAudioFile(deckAName);
		await clickLoad(0);
		await vi.waitFor(() => {
			expect(screen.queryAllByTestId('deck-track-name').length).toBe(1);
		});
		const deckBtn = screen.getAllByTestId('deck-load-eject')[0];
		expect(deckBtn).toHaveTextContent('EJECT'); // piste chargée -> verrouillage ÉJECTER
		fireEvent.click(deckBtn);
		await vi.waitFor(() => {
			expect(screen.queryAllByTestId('deck-track-name').length).toBe(0);
		});
		expect(deckBtn).toHaveTextContent('LOAD');
		expect(screen.getAllByText('INSÉRER CASSETTE').length).toBe(2);
		expect(screen.getByText('WAITING FOR TRACKS (0/2)')).toBeInTheDOM();
		expect(screen.getByRole('button', { name: /LANCER L'ANALYSE HARMONIQUE/ })).toBeDisabled();
		// La modale ouverte pour ce deck est fermée par l'éjection
		expect(screen.queryByTestId('metadata-modal')).not.toBeInTheDOM();
	});

	test('enrichissement en ligne : un nom de fichier sans « Artiste - Titre » n\'envoie pas « Artiste Inconnu » à la recherche', async () => {
		const fetchMock = vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }));
		vi.stubGlobal('fetch', fetchMock);

		render(Module1View);
		selectAudioFile('Lorelei.flac');
		await clickLoad(0);

		await vi.waitFor(() => {
			expect(fetchMock).toHaveBeenCalled();
		});
		const calledUrls = fetchMock.mock.calls.map((call) => String(call[0])).join(' ');
		expect(calledUrls).not.toContain('Artiste');
		expect(calledUrls).toContain('term=Lorelei');
	});

	test('titre affiché : l\'extension de format est retirée même quand le nom contient un second point (« Lorelei.Flac.mp3 »)', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));

		render(Module1View);
		selectAudioFile('Lorelei.Flac.mp3');
		await clickLoad(0);

		await vi.waitFor(() => {
			expect(screen.getAllByTestId('deck-track-name')[0].textContent).toContain('Lorelei');
		});
		expect(screen.getAllByTestId('deck-track-name')[0].textContent).not.toMatch(/flac/i);
	});

	test('enrichissement en ligne : l\'extension de format (« .Flac ») n\'est pas envoyée à la recherche', async () => {
		const fetchMock = vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }));
		vi.stubGlobal('fetch', fetchMock);

		render(Module1View);
		selectAudioFile('Lorelei.Flac.mp3');
		await clickLoad(0);

		await vi.waitFor(() => {
			expect(fetchMock).toHaveBeenCalled();
		});
		const calledUrls = fetchMock.mock.calls.map((call) => String(call[0])).join(' ');
		expect(calledUrls).not.toContain('Flac');
		expect(calledUrls).toContain('term=Lorelei');
	});

	test('enrichissement en ligne : pochette HD 600x600 et métadonnées iTunes quand les tags ID3 manquent', async () => {
		const fetchMock = vi.fn(async (url) => {
			if (!String(url).includes('itunes.apple.com')) {
				return { ok: false, status: 404, json: async () => ({}) };
			}
			return {
				ok: true,
				json: async () => ({
					resultCount: 1,
					results: [
						{
							trackName: 'Back In Black',
							artistName: 'AC/DC',
							collectionName: 'Back In Black',
							primaryGenreName: 'Rock',
							releaseDate: '2005-07-30T07:00:00Z',
							artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/Music/100x100bb.jpg',
							previewUrl: 'https://audio-ssl.itunes.apple.com/preview.m4a',
						},
					],
				}),
			};
		});
		vi.stubGlobal('fetch', fetchMock);

		render(Module1View);
		selectAudioFile(deckAName);
		await clickLoad(0);

		// La pochette HD s'affiche dans la carte ID3 de la piste A (à côté des métadonnées)
		await vi.waitFor(() => {
			expect(screen.getByTestId('id3-cover')).toBeInTheDOM();
		});
		const cover = screen.getByTestId('id3-cover');
		expect(cover).toHaveAttribute(
			'src',
			'https://is1-ssl.mzstatic.com/image/thumb/Music/600x600bb.jpg'
		);
		expect(cover.classList.contains('rounded-md')).toBe(true);

		// L'appel iTunes Search API est conforme : term "ACDC Back In Black" encodé + media/entity/limit
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const calledUrl = String(fetchMock.mock.calls[0][0]);
		expect(calledUrl).toContain('https://itunes.apple.com/search?');
		expect(calledUrl).toContain('term=ACDC%20Back%20In%20Black');
		expect(calledUrl).toContain('media=music');
		expect(calledUrl).toContain('entity=song');
		expect(calledUrl).toContain('limit=1');

		// Les métadonnées en ligne complètent les champs manquants de la carte ID3 (piste A)
		await vi.waitFor(() => {
			expect(screen.getByText('Rock')).toBeInTheDOM();
		});
	});

	test('hors-ligne (résultats iTunes vides) : aucune pochette affichée et UI non bloquée', async () => {
		// fetch reste stubbé par le beforeEach avec results: [] -> { success: false }
		render(Module1View);
		selectAudioFile(deckAName);
		await clickLoad(0);
		await vi.waitFor(() => {
			expect(screen.queryAllByTestId('deck-track-name').length).toBe(1);
		});
		// Laisse la promesse fetch en arrière-plan se vider
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(screen.queryByTestId('id3-cover')).not.toBeInTheDOM();
		expect(screen.getByTestId('deck-track-name')).toHaveTextContent('ACDC - Back In Black');
	});
});
