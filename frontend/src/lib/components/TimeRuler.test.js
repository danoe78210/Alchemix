import { render, screen } from '@testing-library/svelte';
import TimeRuler from '$lib/components/TimeRuler.svelte';

describe('TimeRuler — règle temporelle commune (zone 3)', () => {
	test('affiche des graduations du début à la fin de la fenêtre', () => {
		render(TimeRuler, { props: { start: 0, end: 120, divisions: 4 } });
		const ruler = screen.getByTestId('time-ruler');
		expect(ruler).toHaveTextContent('0:00');
		expect(ruler).toHaveTextContent('0:30');
		expect(ruler).toHaveTextContent('1:00');
		expect(ruler).toHaveTextContent('2:00');
	});

	test('reflète une fenêtre zoomée qui ne commence pas à zéro', () => {
		render(TimeRuler, { props: { start: 60, end: 120, divisions: 2 } });
		const ruler = screen.getByTestId('time-ruler');
		expect(ruler).toHaveTextContent('1:00');
		expect(ruler).toHaveTextContent('1:30');
		expect(ruler).not.toHaveTextContent('0:00');
	});
});
