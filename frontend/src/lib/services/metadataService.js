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
const MUSICBRAINZ_RECORDING_ENDPOINT = 'https://musicbrainz.org/ws/2/recording/';
const COVER_ART_ENDPOINT = 'https://coverartarchive.org/release';
/** Nombre maximal de releases testées : limite les requêtes (MusicBrainz autorise ~1 requête/s) */
const MAX_FALLBACK_RELEASES = 3;

/** Échappe les guillemets et antislashs d'une valeur insérée dans une requête Lucene MusicBrainz */
function luceneQuoted(value) {
	return `"${String(value).replace(/["\\]/g, '\\$&')}"`;
}

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

/**
 * Pochette de secours, utilisée quand iTunes ne renvoie aucune image.
 * 1. MusicBrainz (recherche d'enregistrement, sans clé API) donne les releases du morceau ;
 * 2. Cover Art Archive fournit la pochette 500 px de la première release qui en possède une,
 *    vérifiée par une requête HEAD (une URL 404 n'est jamais renvoyée).
 *
 * @param {string} artist Artiste du morceau.
 * @param {string} title  Titre du morceau.
 * @returns {Promise<{success: boolean, coverUrl?: string}>}
 */
export async function fetchFallbackCover(artist, title) {
	try {
		if (typeof fetch !== 'function') return { success: false };
		if (!title || !String(title).trim()) return { success: false };

		const query = [
			`recording:${luceneQuoted(String(title).trim())}`,
			artist && String(artist).trim() ? `artist:${luceneQuoted(String(artist).trim())}` : null,
		]
			.filter(Boolean)
			.join(' AND ');
		const searchUrl = `${MUSICBRAINZ_RECORDING_ENDPOINT}?query=${encodeURIComponent(query)}&fmt=json&limit=5`;

		const response = await fetch(searchUrl);
		if (!response || !response.ok) return { success: false };
		const data = await response.json();

		const releaseIds = (Array.isArray(data?.recordings) ? data.recordings : [])
			.flatMap((recording) => (Array.isArray(recording?.releases) ? recording.releases : []))
			.map((release) => release?.id)
			.filter((id) => typeof id === 'string' && id !== '')
			.slice(0, MAX_FALLBACK_RELEASES);

		for (const id of releaseIds) {
			const coverUrl = `${COVER_ART_ENDPOINT}/${id}/front-500`;
			const probe = await fetch(coverUrl, { method: 'HEAD' });
			if (probe && probe.ok) return { success: true, coverUrl };
		}
		return { success: false };
	} catch {
		// Hors-ligne ou réponse illisible : pas de pochette, l'UI continue.
		return { success: false };
	}
}
