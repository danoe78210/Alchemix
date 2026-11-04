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

describe('Module1View — Gatekeeper sous la roue Camelot (tâche alchemix#16)', () => {
	test('le panneau Gatekeeper est dans la colonne centrale, après le cadran Camelot', () => {
		render(Module1View);
		const gatekeeper = screen.getByTestId('compatibility-section');
		const center = document.querySelector('.col-center');
		const wheel = document.querySelector('.camelot-panel');
		expect(center.contains(gatekeeper)).toBe(true);
		expect(wheel.compareDocumentPosition(gatekeeper) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	test('le Gatekeeper n\'est plus dans la colonne droite (Deck B)', () => {
		render(Module1View);
		const right = document.querySelector('.col-right');
		expect(right.querySelector('[data-testid="compatibility-section"]')).toBeNull();
	});
});

describe('Module1View — pas de bandeau de specs sous les cartes ID3', () => {
	test('le bandeau doublon (BITRATE / DEPTH / FORMAT) n\'est plus affiché', () => {
		render(Module1View);
		expect(screen.queryAllByTestId('audio-specs-strip')).toHaveLength(0);
	});
});

describe('Module1View — clés relatives masquées sans deux pistes chargées', () => {
	test('aucune piste : pas de bouton RELATIF ni de liste de clés compatibles', () => {
		render(Module1View);
		expect(screen.queryByTestId('toggle-relative-mode')).toBeNull();
		expect(screen.queryAllByTestId('compat-badge')).toHaveLength(0);
	});
});

describe('Module1View — cadre de conseils sous le Gatekeeper', () => {
	test('le cadre de conseils suit immédiatement le Gatekeeper dans la colonne centrale', () => {
		render(Module1View);
		const gatekeeper = screen.getByTestId('compatibility-section');
		expect(gatekeeper.nextElementSibling).toBe(screen.getByTestId('mix-advisor'));
	});
});

describe('Module1View — pas de forme d\'onde ni de beatgrid', () => {
	test('les trois colonnes restent des frères directs (la colonne droite n\'est pas imbriquée dans le centre)', () => {
		render(Module1View);
		const center = document.querySelector('.col-center');
		const right = document.querySelector('.col-right');
		expect(center.contains(right)).toBe(false);
		expect(right.parentElement).toBe(center.parentElement);
	});

	test('le panneau FORMES D\'ONDES & BEATGRID et son footer (PHASE OFFSET, GRID SNAP, TIME-STRETCH) sont retirés', () => {
		const { container } = render(Module1View);
		expect(container.querySelector('.beatgrid-panel')).toBeNull();
		expect(container.querySelector('canvas')).toBeNull();
		expect(screen.queryByText(/PHASE OFFSET/)).toBeNull();
		expect(screen.queryByText(/GRID SNAP/)).toBeNull();
		expect(screen.queryByText(/FORMES D'ONDES/)).toBeNull();
	});
});
