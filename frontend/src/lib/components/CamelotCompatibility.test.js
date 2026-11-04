import { render, screen, fireEvent } from '@testing-library/svelte';
import CamelotCompatibility from '$lib/components/CamelotCompatibility.svelte';

describe('CamelotCompatibility — clés relatives (visibles seulement quand les deux pistes sont chargées)', () => {
	test('sans showKeyLinks : ni bouton RELATIF ni liste de clés compatibles', () => {
		render(CamelotCompatibility, {
			props: { gatekeeper: 'NO-GO', compatibilityScore: 0, sourceCamelot: '8B', targetCamelot: '8B', onToggleRelative: vi.fn(), showKeyLinks: false },
		});
		expect(screen.queryByTestId('toggle-relative-mode')).toBeNull();
		expect(screen.queryAllByTestId('compat-badge')).toHaveLength(0);
	});

	test('avec showKeyLinks : bouton RELATIF et quatre clés compatibles', () => {
		render(CamelotCompatibility, {
			props: { gatekeeper: 'GO', compatibilityScore: 100, keyA: '8B', keyB: '8B', onToggleRelative: vi.fn(), showKeyLinks: true },
		});
		expect(screen.getByTestId('toggle-relative-mode')).toBeInTheDOM();
		expect(screen.getAllByTestId('compat-badge')).toHaveLength(4);
	});
});

describe('CamelotCompatibility — panneau de compatibilité (Phase 2 : sans bouton global Module 2)', () => {
	test('n\'affiche plus le bouton global ENVOYER VERS MODULE 2 (seuls les boutons dédiés par piste restent)', () => {
		render(CamelotCompatibility, {
			props: { gatekeeper: 'GO', compatibilityScore: 100 },
		});
		expect(screen.queryByRole('button', { name: /ENVOYER VERS MODULE 2/ })).toBeNull();
		expect(screen.getByText(/GO/)).toBeInTheDOM();
	});

	test('affiche WARP HAZARD (>15%) et le bouton ÷2 tempo cible quand le time stretch dépasse ±15 %', () => {
		const onHalveTargetBpm = vi.fn();
		render(CamelotCompatibility, {
			props: { gatekeeper: 'GO', compatibilityScore: 100, timeStretchPercent: 63.6, targetBpm: 148.7, onHalveTargetBpm },
		});
		expect(screen.getByTestId('warp-hazard')).toBeInTheDOM();
		expect(screen.getByText(/WARP HAZARD/)).toBeInTheDOM();
		const fixBtn = screen.getByTestId('halve-target-bpm');
		expect(fixBtn).toHaveTextContent('74.3 BPM'); // 148.7 / 2 = 74.35 -> toFixed(1) = "74.3"
		fireEvent.click(fixBtn);
		expect(onHalveTargetBpm).toHaveBeenCalledTimes(1);
	});

	test('affiche le pitch shift recommandé (demi-tons) pour la transition', () => {
		render(CamelotCompatibility, {
			props: { gatekeeper: 'GO', compatibilityScore: 75, suggestedPitchShift: 2 },
		});
		expect(screen.getByTestId('pitch-shift')).toHaveTextContent('+2 st');
	});

	test('aucun badge WARP HAZARD quand le time stretch reste dans ±15 %', () => {
		render(CamelotCompatibility, {
			props: { gatekeeper: 'GO', compatibilityScore: 90, timeStretchPercent: 10.5 },
		});
		expect(screen.queryByTestId('warp-hazard')).not.toBeInTheDOM();
	});
});
