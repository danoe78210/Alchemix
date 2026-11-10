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
	test('le panneau Gatekeeper est dans la colonne centrale (onglet Gatekeeper actif)', () => {
		render(Module1View, { props: { activeTab: 'gatekeeper' } });
		const gatekeeper = screen.getByTestId('compatibility-section');
		const center = document.querySelector('.col-center');
		expect(center.contains(gatekeeper)).toBe(true);
	});

	test('le cadran Camelot est dans la colonne centrale (onglet Gatekeeper)', () => {
		render(Module1View, { props: { activeTab: 'gatekeeper' } });
		const wheel = document.querySelector('.wheel-wrapper');
		const center = document.querySelector('.col-center');
		expect(center.contains(wheel)).toBe(true);
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

describe('Module1View — forme d\'onde et beatgrid restaurés', () => {
	test('le panneau FORMES D\'ONDES & BEATGRID est présent dans la colonne centrale (onglet Forme d\'Onde actif)', () => {
		const { container } = render(Module1View, { props: { activeTab: 'waveform' } });
		const panel = container.querySelector('.beatgrid-panel');
		expect(panel).not.toBeNull();
		expect(panel.closest('.col-center')).not.toBeNull();
	});
});