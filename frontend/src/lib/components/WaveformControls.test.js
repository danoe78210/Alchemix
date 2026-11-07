import { render, screen, fireEvent } from '@testing-library/svelte';
import WaveformControls from '$lib/components/WaveformControls.svelte';

describe('WaveformControls — sélecteur piste A/B + mode RYTHME/CLEF (M4, alchemix#44)', () => {
	test('valeurs par défaut : piste A, mode RYTHME', () => {
		render(WaveformControls, { props: {} });
		expect(screen.getByTestId('track-state').textContent).toBe('A');
		expect(screen.getByTestId('mode-state').textContent).toBe('RYTHME');
	});

	test('clic sur le levier de mode (rhythm) -> onModeChange("key")', async () => {
		const onModeChange = vi.fn();
		render(WaveformControls, { props: { mode: 'rhythm', onModeChange } });
		await fireEvent.click(screen.getByTestId('mode-toggle'));
		expect(onModeChange).toHaveBeenCalledTimes(1);
		expect(onModeChange).toHaveBeenCalledWith('key');
	});

	test('clic sur le levier de mode (key) -> onModeChange("rhythm")', async () => {
		const onModeChange = vi.fn();
		render(WaveformControls, { props: { mode: 'key', onModeChange } });
		expect(screen.getByTestId('mode-state').textContent).toBe('CLEF');
		await fireEvent.click(screen.getByTestId('mode-toggle'));
		expect(onModeChange).toHaveBeenCalledWith('rhythm');
	});

	test('clic sur le levier de piste (A) -> onTrackChange("B")', async () => {
		const onTrackChange = vi.fn();
		render(WaveformControls, { props: { track: 'A', onTrackChange } });
		await fireEvent.click(screen.getByTestId('track-toggle'));
		expect(onTrackChange).toHaveBeenCalledTimes(1);
		expect(onTrackChange).toHaveBeenCalledWith('B');
	});

	test('piste B affichée -> le clic renvoie "A"', async () => {
		const onTrackChange = vi.fn();
		render(WaveformControls, { props: { track: 'B', onTrackChange } });
		expect(screen.getByTestId('track-state').textContent).toBe('B');
		await fireEvent.click(screen.getByTestId('track-toggle'));
		expect(onTrackChange).toHaveBeenCalledWith('A');
	});

	test('les deux leviers sont des checkbox dans un label .aw-toggle-lever (accessibles)', () => {
		render(WaveformControls, { props: {} });
		for (const id of ['track-toggle', 'mode-toggle']) {
			const input = screen.getByTestId(id);
			expect(input.type).toBe('checkbox');
			expect(input.closest('label')?.classList.contains('aw-toggle-lever')).toBe(true);
		}
	});
});
