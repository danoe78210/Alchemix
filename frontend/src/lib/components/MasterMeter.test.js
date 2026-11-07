import { render, screen } from '@testing-library/svelte';
import MasterMeter from '$lib/components/MasterMeter.svelte';

describe('MasterMeter — niveau général de la somme des stems (zone 5)', () => {
	test('au silence, le readout affiche -∞ et la barre est vide', () => {
		render(MasterMeter, { props: { peak: 0, rms: 0 } });
		expect(screen.getByTestId('level-readout')).toHaveTextContent('crête -∞ dBFS · RMS -∞ dBFS');
		expect(screen.getByTestId('master-meter')).toHaveStyle({ width: '0%' });
	});

	test('à pleine échelle, la barre est pleine et le readout affiche 0.0 dBFS', () => {
		render(MasterMeter, { props: { peak: 1, rms: 0.5 } });
		expect(screen.getByTestId('master-meter')).toHaveStyle({ width: '100%' });
		expect(screen.getByTestId('level-readout')).toHaveTextContent('crête 0.0 dBFS');
	});
});
