import { render, screen, fireEvent } from '@testing-library/svelte';
import Module2Header from '$lib/components/Module2Header.svelte';

function props(overrides = {}) {
	return {
		track: null,
		onImport: vi.fn(),
		onSeparate: vi.fn(),
		onExport: vi.fn(),
		...overrides,
	};
}

const demoTrack = { name: 'Demo Track.wav', durationSeconds: 272, sampleRate: 44100, channels: 2 };

describe('Module2Header — en-tête du module (zone 1)', () => {
	test('sans morceau, SÉPARER et EXPORTER sont désactivés', () => {
		render(Module2Header, { props: props() });
		expect(screen.getByTestId('track-name')).toHaveTextContent('Aucun morceau chargé');
		expect(screen.getByTestId('separate-track')).toBeDisabled();
		expect(screen.getByTestId('open-export')).toBeDisabled();
	});

	test('avec un morceau, le nom et les métadonnées (kHz, canaux, durée) sont affichés', () => {
		render(Module2Header, { props: props({ track: demoTrack }) });
		expect(screen.getByTestId('track-name')).toHaveTextContent('Demo Track.wav');
		expect(screen.getByTestId('track-meta')).toHaveTextContent('44,1 kHz · Stéréo · 4:32');
	});

	test('avec un morceau et le moteur prêt, SÉPARER devient l\'action principale', async () => {
		const p = props({ track: demoTrack });
		render(Module2Header, { props: p });
		const separate = screen.getByTestId('separate-track');
		expect(separate).toBeEnabled();
		expect(separate.className).toContain('primary');
		await fireEvent.click(separate);
		expect(p.onSeparate).toHaveBeenCalled();
	});

	test('IMPORTER appelle onImport, EXPORTER est actif avec un job et appelle onExport', async () => {
		const p = props({ track: demoTrack, hasJob: true });
		render(Module2Header, { props: p });
		await fireEvent.click(screen.getByTestId('import-track'));
		expect(p.onImport).toHaveBeenCalled();
		await fireEvent.click(screen.getByTestId('open-export'));
		expect(p.onExport).toHaveBeenCalled();
	});

	test('l\'état du moteur IA est affiché en badge', () => {
		render(Module2Header, { props: props({ engineLabel: 'SIMULATION' }) });
		expect(screen.getByTestId('engine-badge')).toHaveTextContent('SIMULATION');
	});

	test('pendant la séparation, le bouton SÉPARER est désactivé', () => {
		render(Module2Header, { props: props({ track: demoTrack, separating: true }) });
		expect(screen.getByTestId('separate-track')).toBeDisabled();
		expect(screen.getByTestId('separate-track')).toHaveTextContent('Séparation…');
	});
});
