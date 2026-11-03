import { render, screen, fireEvent } from '@testing-library/svelte';
import CassetteDeck from '$lib/components/CassetteDeck.svelte';

describe('CassetteDeck — lecteur de cassettes steampunk (Deck A / Deck B)', () => {
	const baseProps = { deckId: 'A', label: 'TRACK A - MASTER', file: null };

	test('affiche "INSÉRER CASSETTE" quand aucun fichier n\'est chargé', () => {
		render(CassetteDeck, { props: baseProps });
		expect(screen.getByText('INSÉRER CASSETTE')).toBeInTheDOM();
		expect(screen.getByTestId('deck-insert-tape')).toBeInTheDOM();
	});

	test('affiche le nom du morceau quand file est renseigné', () => {
		render(CassetteDeck, {
			props: { ...baseProps, file: 'C:/Dev/Alchemix/protoype/ACDC - Back In Black.mp3' },
		});
		expect(screen.getByText('ACDC - Back In Black')).toBeInTheDOM();
		expect(screen.queryByText('INSÉRER CASSETTE')).toBeNull();
		expect(screen.getByTestId('deck-track-name')).toBeInTheDOM();
	});

	test('déclenche le callback onLoadTrack au clic sur le bouton LOAD', () => {
		const onLoadTrack = vi.fn();
		render(CassetteDeck, { props: { ...baseProps, onLoadTrack } });
		fireEvent.click(screen.getByRole('button', { name: /CHARGER/i }));
		expect(onLoadTrack).toHaveBeenCalledTimes(1);
	});

	test('déclenche le callback onEjectTrack au clic sur le bouton EJECT quand un fichier est chargé', () => {
		const onEjectTrack = vi.fn();
		render(CassetteDeck, {
			props: { ...baseProps, deckId: 'B', file: 'track.mp3', onEjectTrack },
		});
		fireEvent.click(screen.getByRole('button', { name: /ÉJECTER/i }));
		expect(onEjectTrack).toHaveBeenCalledTimes(1);
	});

	test('applique l\'animation de rotation des bobines quand isAnalyzing est vrai', () => {
		render(CassetteDeck, { props: { ...baseProps, isAnalyzing: true } });
		const reels = screen.getByTestId('cassette').querySelectorAll('.reel');
		expect(reels.length).toBeGreaterThan(0);
		reels.forEach(reel => {
			expect(reel.classList.contains('animate-spin')).toBe(true);
		});
	});

	test('affiche le badge DECK A ou DECK B selon deckId', () => {
		render(CassetteDeck, { props: { ...baseProps, deckId: 'B' } });
		expect(screen.getByText('DECK B')).toBeInTheDOM();
	});

	test('n\'affiche aucune pochette sur la cassette : étiquette néon rétro par défaut', () => {
		render(CassetteDeck, { props: { ...baseProps, file: 'track.mp3' } });
		expect(screen.queryByTestId('deck-cover')).toBeNull();
		expect(screen.queryByRole('img')).toBeNull();
		// L'étiquette néon reste l'affichage par défaut quand une cassette est chargée
		expect(screen.getByTestId('deck-track-name')).toHaveTextContent('track');
	});

	test('le corps de cassette respecte le ratio réel 1,587:1 (largeur / hauteur)', () => {
		render(CassetteDeck, { props: baseProps });
		const body = screen.getByTestId('cassette');
		expect(body.getAttribute('style')).toContain('aspect-ratio: 1.587 / 1');
		expect(body.classList.contains('h-28')).toBe(false);
	});

	test('une cassette chargée affiche la façade réaliste : coquille, disque de bande et deux moyeux', () => {
		render(CassetteDeck, { props: { ...baseProps, file: 'track.mp3' } });
		expect(screen.getByTestId('cassette-shell')).toBeInTheDOM();
		expect(screen.getByTestId('cassette-tape-disc')).toBeInTheDOM();
		expect(screen.getByTestId('cassette').querySelectorAll('.reel')).toHaveLength(2);
	});

	test('sans cassette, le disque de bande n\'apparaît pas (façade éteinte)', () => {
		render(CassetteDeck, { props: baseProps });
		expect(screen.queryByTestId('cassette-tape-disc')).toBeNull();
	});

	test('chaque moyeu porte 12 repères pour que sa rotation soit visible', () => {
		render(CassetteDeck, { props: { ...baseProps, file: 'track.mp3' } });
		const reels = screen.getByTestId('cassette').querySelectorAll('.reel');
		reels.forEach((reel) => {
			expect(reel.querySelectorAll('circle.hub-dot')).toHaveLength(12);
		});
	});

	test('la bande passe de la bobine gauche à la droite selon la progression', () => {
		const { unmount } = render(CassetteDeck, { props: { ...baseProps, file: 'track.mp3', progress: 0 } });
		const leftDisc = screen.getByTestId('cassette-tape-disc');
		const takeUpDisc = screen.getByTestId('cassette-tape-disc-take-up');
		expect(leftDisc.getAttribute('style')).toContain('width: 40%');
		expect(takeUpDisc.getAttribute('style')).toContain('width: 22%');
		unmount();

		render(CassetteDeck, { props: { ...baseProps, file: 'track.mp3', progress: 1 } });
		expect(screen.getByTestId('cassette-tape-disc').getAttribute('style')).toContain('width: 22%');
		expect(screen.getByTestId('cassette-tape-disc-take-up').getAttribute('style')).toContain('width: 40%');
	});

	test('une cassette chargée porte une pochette : lettre de face et titre du morceau', () => {
		render(CassetteDeck, { props: { ...baseProps, file: 'ACDC - Back In Black.mp3' } });
		const sleeve = screen.getByTestId('cassette-sleeve');
		expect(sleeve).toBeInTheDOM();
		expect(screen.getByTestId('cassette-sleeve-side').textContent.trim()).toBe('A');
		expect(sleeve.querySelector('[data-testid="deck-track-name"]').textContent.trim()).toBe('ACDC - Back In Black');
	});

	test('sans cassette, aucune pochette n\'est affichée', () => {
		render(CassetteDeck, { props: baseProps });
		expect(screen.queryByTestId('cassette-sleeve')).toBeNull();
	});

	test('les molettes suivent la charte du deck : ambre pour A, émeraude pour B', () => {
		const { unmount } = render(CassetteDeck, { props: { ...baseProps, file: 'track.mp3' } });
		const ringA = screen.getByTestId('cassette').querySelector('.reel circle[r="49"]');
		expect(ringA.getAttribute('fill')).toBe('#FFB300');
		unmount();

		render(CassetteDeck, { props: { ...baseProps, deckId: 'B', file: 'track.mp3' } });
		const ringB = screen.getByTestId('cassette').querySelector('.reel circle[r="49"]');
		expect(ringB.getAttribute('fill')).toBe('#00E676');
	});

	test('le titre de la pochette passe à la ligne au lieu d\'être tronqué', () => {
		render(CassetteDeck, { props: { ...baseProps, file: 'Bon Jovi - You Give Love A Bad Name.mp3' } });
		const title = screen.getByTestId('cassette-sleeve').querySelector('[data-testid="deck-track-name"]');
		expect(title.classList.contains('truncate')).toBe(false);
		expect(title.textContent.trim()).toBe('Bon Jovi - You Give Love A Bad Name');
	});

	test('la pochette passe au premier plan, au-dessus des molettes', () => {
		render(CassetteDeck, { props: { ...baseProps, file: 'track.mp3' } });
		const sleeve = screen.getByTestId('cassette-sleeve');
		expect(sleeve.getAttribute('style')).toMatch(/z-index:\s*\d+/);
	});

	test('PLAY est désactivé tant qu\'aucune cassette n\'est chargée', () => {
		render(CassetteDeck, { props: baseProps });
		expect(screen.getByRole('button', { name: /PLAY/ })).toBeDisabled();
	});

	test('PLAY déclenche onPlay quand une cassette est chargée', () => {
		const onPlay = vi.fn();
		render(CassetteDeck, { props: { ...baseProps, file: 'track.mp3', onPlay } });
		fireEvent.click(screen.getByRole('button', { name: /PLAY/ }));
		expect(onPlay).toHaveBeenCalledTimes(1);
	});

	test('pendant la lecture (isPlaying) : bobines en rotation, PLAY désactivé, STOP actif', () => {
		render(CassetteDeck, { props: { ...baseProps, file: 'track.mp3', isPlaying: true } });
		const reels = screen.getByTestId('cassette').querySelectorAll('.reel');
		reels.forEach(reel => {
			expect(reel.classList.contains('animate-spin')).toBe(true);
		});
		expect(screen.getByRole('button', { name: /PLAY/ })).toBeDisabled();
		expect(screen.getByRole('button', { name: /STOP/ })).not.toBeDisabled();
	});

	test('STOP déclenche onStop pendant la lecture et reste désactivé à l\'arrêt', () => {
		const onStop = vi.fn();
		const { unmount } = render(CassetteDeck, {
			props: { ...baseProps, file: 'track.mp3', isPlaying: true, onStop },
		});
		fireEvent.click(screen.getByRole('button', { name: /STOP/ }));
		expect(onStop).toHaveBeenCalledTimes(1);
		unmount();

		render(CassetteDeck, { props: { ...baseProps, file: 'track.mp3', isPlaying: false } });
		expect(screen.getByRole('button', { name: /STOP/ })).toBeDisabled();
		const reels = screen.getByTestId('cassette').querySelectorAll('.reel');
		reels.forEach(reel => {
			expect(reel.classList.contains('animate-spin')).toBe(false);
		});
	});
});
