import { render, screen } from '@testing-library/svelte';
import TempoDisplay from '$lib/components/TempoDisplay.svelte';

describe('TempoDisplay — confiance de détection', () => {
	test('sans confiance mesurée, affiche « — » au lieu d\'une valeur fixe', () => {
		render(TempoDisplay, { props: { bpm: 128.37, confidence: null, tempoType: 'FIXED_ELECTRONIC' } });
		expect(screen.getByTestId('tempo-confidence')).toHaveTextContent('—');
	});

	test('affiche la confiance mesurée', () => {
		render(TempoDisplay, { props: { bpm: 128.37, confidence: 83.4, tempoType: 'FIXED_ELECTRONIC' } });
		expect(screen.getByTestId('tempo-confidence')).toHaveTextContent('83.4%');
	});
});
