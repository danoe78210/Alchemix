import { render, screen } from '@testing-library/svelte';
import StemWaveform from '$lib/components/StemWaveform.svelte';

describe('StemWaveform — forme d\'onde d\'un stem (prototype Module 2)', () => {
	test('affiche un canevas nommé par stem avec son libellé', () => {
		render(StemWaveform, { props: { id: 'drums', label: 'Batterie', color: '#29B6F6', peaks: null } });
		expect(screen.getByTestId('wave-drums')).toBeInTheDOM();
		expect(screen.getByTestId('wave-drums')).toHaveAttribute('aria-label', 'Forme d\'onde Batterie');
		expect(screen.getByText('Batterie')).toBeInTheDOM();
	});

	test('dessine sans erreur quand des crêtes sont fournies', () => {
		render(StemWaveform, { props: { id: 'bass', label: 'Basse', color: '#FFB300', peaks: new Float32Array([0.2, 0.9, 0.4]) } });
		expect(screen.getByTestId('wave-bass')).toBeInTheDOM();
	});

	test('affiche la durée du stem et l\'état d\'arrêt par défaut', () => {
		render(StemWaveform, { props: { id: 'vocals', label: 'Voix', color: '#00E676', peaks: null, duration: 272 } });
		expect(screen.getByTestId('wave-duration-vocals')).toHaveTextContent('4:32');
		expect(screen.getByTestId('wave-state-vocals')).toHaveTextContent('ARRÊT');
	});

	test('signale la lecture en cours', () => {
		render(StemWaveform, { id: 'drums', label: 'Batterie', color: '#29B6F6', peaks: null, playing: true });
		expect(screen.getByTestId('wave-state-drums')).toHaveTextContent('LECTURE');
	});

	test('applique l échelle verticale avec marge de 8 % et conserve la référence maxPeak au zoom', () => {
		render(StemWaveform, {
			props: {
				id: 'bass',
				label: 'Basse',
				color: '#FFB300',
				peaks: new Float32Array([0.1, 0.25]),
				maxPeak: 0.5
			}
		});
		const canvas = screen.getByTestId('wave-bass');
		// height = 200 -> mid = 100 -> usableHalf = 92 -> scale = 92 / 0.5 = 184
		expect(Number(canvas.dataset.peak)).toBeCloseTo(0.5);
		expect(Number(canvas.dataset.midY)).toBe(100);
		expect(Number(canvas.dataset.scale)).toBeCloseTo(92 / 0.5);
	});
});
