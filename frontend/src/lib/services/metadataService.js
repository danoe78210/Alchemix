/**
 * AlcheMix Studio — Service d'enrichissement de métadonnées en ligne.
 *
 * Interroge l'API publique iTunes Search (GET, sans clé API requise) pour
 * compléter les métadonnées ID3 manquantes d'un morceau importé :
 * pochette HD 600x600, titre, artiste, album, genre, année et extrait 30 s.
 *
 * Contrat d'erreur : toute erreur (hors-ligne, réponse invalide, results vide)
 * renvoie `{ success: false }` sans jamais lever d'exception ni bloquer l'UI.
 */

const ITUNES_SEARCH_ENDPOINT = 'https://itunes.apple.com/search';

/**
 * Recherche un morceau sur iTunes Search API.
 *
 * @param {string} title  Titre du morceau (utilisé seul si artist est vide).
 * @param {string} artist Artiste du morceau.
 * @returns {Promise<{success: boolean, coverUrl?: string, title?: string,
 *   artist?: string, album?: string, genre?: string, year?: string,
 *   previewUrl?: string}>}
 */
export async function fetchOnlineMetadata(title, artist) {
	try {
		if (typeof fetch !== 'function') return { success: false };
		const term = [artist, title]
			.filter((part) => typeof part === 'string' && part.trim() !== '')
			.join(' ')
			.trim();
		if (!term) return { success: false };

		const url =
			`${ITUNES_SEARCH_ENDPOINT}?term=${encodeURIComponent(term)}` +
			`&media=music&entity=song&limit=1`;

		const response = await fetch(url);
		if (!response || !response.ok) return { success: false };

		const data = await response.json();
		const first = Array.isArray(data?.results) ? data.results[0] : null;
		if (!first) return { success: false };

		// Pochette HD : artworkUrl100 (…/100x100bb.jpg ou …/100x100wa.jpg) → …/600x600bb.jpg (plein cadre, sans marge blanche)
		const artworkUrl100 = typeof first.artworkUrl100 === 'string' ? first.artworkUrl100 : '';
		const coverUrl = artworkUrl100.replace(/\/100x100(?:bb|wa)\.jpg$/, '/600x600bb.jpg');

		return {
			success: true,
			coverUrl,
			title: typeof first.trackName === 'string' ? first.trackName : '',
			artist: typeof first.artistName === 'string' ? first.artistName : '',
			album: typeof first.collectionName === 'string' ? first.collectionName : '',
			genre: typeof first.primaryGenreName === 'string' ? first.primaryGenreName : '',
			year:
				typeof first.releaseDate === 'string' && first.releaseDate.length >= 4
					? first.releaseDate.substring(0, 4)
					: '',
			previewUrl: typeof first.previewUrl === 'string' ? first.previewUrl : '',
		};
	} catch {
		// Hors-ligne ou réponse illisible : pas d'enrichissement, l'UI continue.
		return { success: false };
	}
}
