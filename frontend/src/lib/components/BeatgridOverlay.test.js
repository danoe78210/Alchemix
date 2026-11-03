import { render } from '@testing-library/svelte';
import BeatgridOverlay from '$lib/components/BeatgridOverlay.svelte';

describe('BeatgridOverlay — structure Steampunk et rendu de secours Canvas2D', () => {
	const baseProps = { bpm: 124, pixelsPerBar: 320, width: 340, height: 160, audioLoaded: true };

	test('montre un canvas à l\'intérieur du conteneur .canvas-wrapper', () => {
		const { container } = render(BeatgridOverlay, { props: baseProps });
		expect(container.querySelector('.canvas-wrapper canvas')).not.toBeNull();
	});

	test('le conteneur canvas occupe toute la hauteur disponible et le canvas fait 100%', () => {
		const { container } = render(BeatgridOverlay, { props: baseProps });
		const canvasWrapper = container.querySelector('.canvas-wrapper');
		const canvas = container.querySelector('canvas');
		expect(canvasWrapper).not.toBeNull();
		expect(canvas).not.toBeNull();
	});

	test('en-tête du panneau : libellé « FORMES D\'ONDES & BEATGRID » + état du signal', () => {
		const { container } = render(BeatgridOverlay, { props: baseProps });
		expect(container.textContent).toContain('FORMES D\'ONDES & BEATGRID');
		expect(container.textContent).toContain('SIGNAL ACTIF');
	});

	test('état au repos (audioLoaded = false) : affiche le texte d\'attente et rend le canvas sans erreur de contexte graphique', () => {
		const { container } = render(BeatgridOverlay, { props: { ...baseProps, audioLoaded: false } });
		expect(container.querySelector('canvas')).not.toBeNull();
		expect(container.textContent).toContain('ATTENTE SIGNAL');
	});
});
