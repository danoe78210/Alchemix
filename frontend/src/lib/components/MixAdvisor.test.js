import { render, screen } from '@testing-library/svelte';
import MixAdvisor from '$lib/components/MixAdvisor.svelte';

describe('MixAdvisor — cadre de conseils sous le Gatekeeper', () => {
	test('Gate verrouillé : cadre visible, message d\'attente et aucun conseil', () => {
		const { container } = render(MixAdvisor, { props: { gatekeeper: 'NO-GO', compat: { rule: 'DISSONANT', shift: 3 }, timeStretchPercent: 0 } });
		expect(screen.getByTestId('mix-advisor')).toBeInTheDOM();
		expect(screen.getByTestId('mix-advisor-locked')).toBeInTheDOM();
		expect(container.querySelectorAll('[data-testid="mix-advisor-item"]')).toHaveLength(0);
	});

	test('Gate déverrouillé : un élément par conseil', () => {
		const { container } = render(MixAdvisor, { props: { gatekeeper: 'GO', compat: { rule: 'SAME_KEY (0h)', shift: 0 }, timeStretchPercent: 43 } });
		expect(screen.queryByTestId('mix-advisor-locked')).toBeNull();
		expect(container.querySelectorAll('[data-testid="mix-advisor-item"]').length).toBeGreaterThanOrEqual(3);
	});
});
