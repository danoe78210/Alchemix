import { fetchFallbackCover } from '$lib/services/metadataService.js';

const MB_RELEASE_A = '11111111-1111-1111-1111-111111111111';
const MB_RELEASE_B = '22222222-2222-2222-2222-222222222222';

function mockFetch(routes) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url, init) => {
			const key = Object.keys(routes).find((k) => String(url).startsWith(k));
			if (!key) return { ok: false, status: 404, json: async () => ({}) };
			return routes[key](url, init);
		})
	);
}

const musicBrainzHit = {
	ok: true,
	json: async () => ({
		recordings: [{ releases: [{ id: MB_RELEASE_A }, { id: MB_RELEASE_B }] }],
	}),
};

describe('fetchFallbackCover — pochette de secours (MusicBrainz + Cover Art Archive)', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test('renvoie la pochette 500 px de la première release qui en possède une', async () => {
		mockFetch({
			'https://musicbrainz.org/ws/2/recording/': () => musicBrainzHit,
			[`https://coverartarchive.org/release/${MB_RELEASE_A}/front-500`]: () => ({ ok: false, status: 404 }),
			[`https://coverartarchive.org/release/${MB_RELEASE_B}/front-500`]: () => ({ ok: true, status: 200 }),
		});
		const res = await fetchFallbackCover('AC/DC', 'Back In Black');
		expect(res).toEqual({
			success: true,
			coverUrl: `https://coverartarchive.org/release/${MB_RELEASE_B}/front-500`,
		});
	});

	test('interroge MusicBrainz avec l\'artiste et le titre, au format JSON', async () => {
		mockFetch({ 'https://musicbrainz.org/ws/2/recording/': () => ({ ok: true, json: async () => ({ recordings: [] }) }) });
		await fetchFallbackCover('Blind Melon', 'No Rain');
		const calledUrl = String(fetch.mock.calls[0][0]);
		expect(calledUrl).toContain('fmt=json');
		expect(calledUrl).toContain(encodeURIComponent('artist:"Blind Melon"'));
		expect(calledUrl).toContain(encodeURIComponent('recording:"No Rain"'));
	});

	test('échec propre quand aucune release n\'a de pochette', async () => {
		mockFetch({
			'https://musicbrainz.org/ws/2/recording/': () => musicBrainzHit,
			'https://coverartarchive.org/': () => ({ ok: false, status: 404 }),
		});
		expect(await fetchFallbackCover('X', 'Y')).toEqual({ success: false });
	});

	test('échec propre hors-ligne (fetch rejeté), sans exception', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
		expect(await fetchFallbackCover('X', 'Y')).toEqual({ success: false });
	});
});
