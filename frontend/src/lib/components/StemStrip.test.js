import { render, screen, fireEvent } from '@testing-library/svelte';
import StemStrip from '$lib/components/StemStrip.svelte';

function props(overrides = {}) {
	return {
		id: 'drums',
		label: 'Batterie',
		playing: false,
		volume: 1,
		muted: false,
		soloed: false,
		onPlay: vi.fn(),
		onVolume: vi.fn(),
		onMute: vi.fn(),
		onSolo: vi.fn(),
		...overrides,
	};
}

describe('StemStrip — tranche d\'un stem (FR-012, FR-013, FR-014)', () => {
	test('affiche le nom du stem et l\'état solo et mute', () => {
		render(StemStrip, { props: props({ soloed: true, muted: false }) });
		expect(screen.getByText('Batterie')).toBeInTheDOM();
		expect(screen.getByTestId('solo-drums')).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByTestId('mute-drums')).toHaveAttribute('aria-pressed', 'false');
	});

	test('Solo et Mute demandent l\'inversion de leur état', async () => {
		const p = props();
		render(StemStrip, { props: p });
		await fireEvent.click(screen.getByTestId('solo-drums'));
		await fireEvent.click(screen.getByTestId('mute-drums'));
		expect(p.onSolo).toHaveBeenCalledWith(true);
		expect(p.onMute).toHaveBeenCalledWith(true);
	});

	test('le fader transmet le volume choisi', async () => {
		const p = props();
		render(StemStrip, { props: p });
		await fireEvent.input(screen.getByTestId('fader-drums'), { target: { value: '0.5' } });
		expect(p.onVolume).toHaveBeenCalledWith(0.5);
	});

	test('le VU-mètre est vide pour un niveau nul', () => {
		render(StemStrip, { props: props({ rms: 0 }) });
		expect(screen.getByTestId('meter-drums')).toHaveStyle({ height: '0%' });
	});

	test('le VU-mètre est plein pour un niveau RMS de 1', () => {
		render(StemStrip, { props: props({ rms: 1 }) });
		expect(screen.getByTestId('meter-drums')).toHaveStyle({ height: '100%' });
	});

	test('la valeur du volume est affichée en dB', () => {
		render(StemStrip, { props: props({ volume: 0.5 }) });
		expect(screen.getByTestId('vol-db-drums')).toHaveTextContent('-6.0 dB');
	});

	test('un volume plein affiche 0.0 dB, un volume nul affiche -∞', () => {
		const { unmount } = render(StemStrip, { props: props({ volume: 1 }) });
		expect(screen.getByTestId('vol-db-drums')).toHaveTextContent('0.0 dB');
		unmount();
		render(StemStrip, { props: props({ volume: 0 }) });
		expect(screen.getByTestId('vol-db-drums')).toHaveTextContent('-∞ dB');
	});

	test('le fader porte un repère central et des graduations', () => {
		render(StemStrip, { props: props() });
		expect(screen.getByTestId('fader-center-drums')).toBeInTheDOM();
	});
});
