import { render, screen } from '@testing-library/svelte';
import Module1View from '$lib/views/Module1View.svelte';

describe('Module1View — bouton DÉMIXER placé après la carte Tempo', () => {
	test.each([
		['A', 0],
		['B', 1],
	])('piste %s : le bouton suit immédiatement la carte Tempo', (_deck, index) => {
		render(Module1View);
		const tempo = document.querySelectorAll('.tempo-panel')[index];
		const button = screen.getAllByTestId('track-action-btn')[index];
		expect(tempo.nextElementSibling).toBe(button);
	});
});

describe('Module1View — pas de bandeau de specs sous les cartes ID3', () => {
	test('le bandeau doublon (BITRATE / DEPTH / FORMAT) n\'est plus affiché', () => {
		render(Module1View);
		expect(screen.queryAllByTestId('audio-specs-strip')).toHaveLength(0);
	});
});
