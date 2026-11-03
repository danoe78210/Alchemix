import { render, screen } from '@testing-library/svelte';
import ID3TagCard from '$lib/components/ID3TagCard.svelte';

describe('ID3TagCard — fallback nom de fichier', () => {
	test('affiche les tags ID3 quand ils sont présents', () => {
		render(ID3TagCard, {
			props: {
				metadata: {
					title: 'Back In Black',
					artist: 'ACDC',
					album: 'The Razors Edge',
					year: '1980',
					source: 'tag',
				},
			},
		});
		expect(screen.getByText('Back In Black')).toBeInTheDOM();
		expect(screen.getByText('ACDC')).toBeInTheDOM();
		expect(screen.getByText('The Razors Edge')).toBeInTheDOM();
		expect(screen.getByText(/TAG ID3/i)).toBeInTheDOM();
	});

	test('déduit l\'artiste et le titre depuis le nom de fichier quand les tags sont vides', () => {
		render(ID3TagCard, {
			props: { metadata: {}, fileName: 'ACDC - Back In Black.mp3' },
		});
		expect(screen.getByText('ACDC')).toBeInTheDOM();
		expect(screen.getByText('Back In Black')).toBeInTheDOM();
		expect(screen.getByText(/NOM FICHIER/i)).toBeInTheDOM();
		expect(screen.getAllByText('—').length).toBeGreaterThan(0);
	});

	test('affiche des tirets quand ni tags ni nom de fichier ne sont disponibles', () => {
		render(ID3TagCard, { props: { metadata: {} } });
		expect(screen.getAllByText('—').length).toBeGreaterThan(0);
	});

	test('affiche la pochette d\'album (rounded-md) quand coverUrl est renseigné', () => {
		render(ID3TagCard, {
			props: { metadata: { title: 'Back In Black', artist: 'ACDC' }, coverUrl: 'https://example.com/600x600bb.jpg' },
		});
		const cover = screen.getByTestId('id3-cover');
		expect(cover).toHaveAttribute('src', 'https://example.com/600x600bb.jpg');
		expect(cover.classList.contains('rounded-md')).toBe(true);
		expect(cover.classList.contains('cover-img')).toBe(true);
		expect(screen.getByText('Back In Black')).toBeInTheDOM();
		expect(screen.getByText('ACDC')).toBeInTheDOM();
	});

	test('n\'affiche aucune pochette quand coverUrl est absent', () => {
		render(ID3TagCard, { props: { metadata: { title: 'X' } } });
		expect(screen.queryByTestId('id3-cover')).toBeNull();
	});
});

describe('ID3TagCard — indicateur de chargement', () => {
	test('affiche un statut « patientez » pendant la recherche des métadonnées en ligne', () => {
		render(ID3TagCard, { props: { metadata: {}, isFetchingOnline: true } });
		expect(screen.getByRole('status')).toHaveTextContent('Recherche des métadonnées en ligne');
		expect(screen.getByRole('status')).toHaveTextContent('patientez');
	});

	test('affiche un statut pendant l\'analyse locale du fichier', () => {
		render(ID3TagCard, { props: { metadata: {}, isAnalyzing: true } });
		expect(screen.getByRole('status')).toHaveTextContent('Analyse du fichier');
	});

	test('aucun statut quand rien n\'est en cours', () => {
		render(ID3TagCard, { props: { metadata: { title: 'X' } } });
		expect(screen.queryByRole('status')).toBeNull();
	});
});

describe('ID3TagCard — informations techniques', () => {
	const full = {
		title: 'Back In Black',
		artist: 'ACDC',
		genre: 'Rock',
		bitrate: '320 kbps',
		sample_rate: 44100,
		channels: 2,
		duration: 222,
		loudness: -12.34,
	};

	test('affiche durée, genre, format, débit, niveau, fréquence et canaux', () => {
		render(ID3TagCard, { props: { metadata: full, fileName: 'ACDC - Back In Black.mp3' } });
		expect(screen.getByTestId('meta-duration')).toHaveTextContent('3:42');
		expect(screen.getByTestId('meta-genre')).toHaveTextContent('Rock');
		expect(screen.getByTestId('meta-format')).toHaveTextContent('MP3');
		expect(screen.getByTestId('meta-bitrate')).toHaveTextContent('320 kbit/s');
		expect(screen.getByTestId('meta-loudness')).toHaveTextContent('-12.3 LUFS');
		expect(screen.getByTestId('meta-sample-rate')).toHaveTextContent('44,1 kHz');
		expect(screen.getByTestId('meta-channels')).toHaveTextContent('Stéréo');
	});

	test.each([
		[1, 'Mono'],
		[2, 'Stéréo'],
		[6, '5.1'],
		[4, '4 canaux'],
	])('canaux %s → %s', (channels, label) => {
		render(ID3TagCard, { props: { metadata: { ...full, channels } } });
		expect(screen.getByTestId('meta-channels')).toHaveTextContent(label);
	});

	test('affiche le débit suivi de VBR pour un fichier à débit variable', () => {
		render(ID3TagCard, { props: { metadata: { ...full, bitrate: '245 kbps VBR' } } });
		expect(screen.getByTestId('meta-bitrate')).toHaveTextContent('245 kbit/s VBR');
	});

	test('affiche le débit constant sans mention VBR', () => {
		render(ID3TagCard, { props: { metadata: { ...full, bitrate: '320 kbps' } } });
		expect(screen.getByTestId('meta-bitrate').textContent.trim()).toBe('320 kbit/s');
	});

	test('affiche VBR tel quel pour un débit variable', () => {
		render(ID3TagCard, { props: { metadata: { ...full, bitrate: 'VBR' } } });
		expect(screen.getByTestId('meta-bitrate')).toHaveTextContent('VBR');
	});

	test('affiche « — » pour chaque information inconnue (débit, niveau, durée, format)', () => {
		render(ID3TagCard, { props: { metadata: { title: 'X' } } });
		expect(screen.getByTestId('meta-bitrate')).toHaveTextContent('—');
		expect(screen.getByTestId('meta-loudness')).toHaveTextContent('—');
		expect(screen.getByTestId('meta-duration')).toHaveTextContent('—');
		expect(screen.getByTestId('meta-format')).toHaveTextContent('—');
	});
});
