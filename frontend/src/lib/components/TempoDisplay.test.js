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

describe('TempoDisplay — confiance et nom musical de la tonalité', () => {
	test('affiche la confiance de la tonalité', () => {
		render(TempoDisplay, { props: { bpm: 128.37, camelotKey: '6A', keyConfidence: 63.2 } });
		expect(screen.getByTestId('key-confidence')).toHaveTextContent('63.2%');
	});

	test('sans confiance de tonalité, affiche « — »', () => {
		render(TempoDisplay, { props: { bpm: 128.37, camelotKey: '6A', keyConfidence: null } });
		expect(screen.getByTestId('key-confidence')).toHaveTextContent('—');
	});

	test('affiche le nom musical en grand (6A -> G Minor)', () => {
		render(TempoDisplay, { props: { bpm: 85, camelotKey: '6A' } });
		expect(screen.getByTestId('key-name')).toHaveTextContent('G Minor');
	});

	test('affiche le nom musical majeur (11B -> A Major)', () => {
		render(TempoDisplay, { props: { bpm: 85, camelotKey: '11B' } });
		expect(screen.getByTestId('key-name')).toHaveTextContent('A Major');
	});
});
