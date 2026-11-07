import { render } from '@testing-library/svelte';
import WaveformView from '$lib/components/WaveformView.svelte';

describe('WaveformView — panneau forme d\'onde Module 1 (M3, alchemix#44)', () => {
	// 3 colonnes entrelacées [min0, max0, min1, max1, min2, max2]
	const peaks = new Float32Array([0, 0.5, -0.2, 0.8, -0.9, 0.3]);

	test('rend le canvas, le titre et le badge de mode RYTHME par défaut', () => {
		const { container } = render(WaveformView, { props: { peaks, durationS: 60, markers: [], mode: 'rhythm', title: 'PISTE A' } });
		expect(container.querySelector('[data-testid="waveform-canvas"]')).not.toBeNull();
		expect(container.textContent).toContain('PISTE A');
		expect(container.querySelector('[data-testid="waveform-mode"]')?.textContent).toContain('RYTHME');
	});

	test('badge CLEF en mode key', () => {
		const { container } = render(WaveformView, { props: { peaks, durationS: 60, markers: [], mode: 'key', title: 'PISTE B' } });
		expect(container.querySelector('[data-testid="waveform-mode"]')?.textContent).toContain('CLEF');
	});

	test('affiche les marqueurs avec libellé et position en % (t / durationS)', () => {
		const markers = [
			{ t: 30, label: '120 → 90 BPM' },
			{ t: 45, label: '8B → 10B' }
		];
		const { container } = render(WaveformView, { props: { peaks, durationS: 60, markers, mode: 'rhythm', title: 'PISTE A' } });
		const els = container.querySelectorAll('[data-testid="waveform-marker"]');
		expect(els).toHaveLength(2);
		expect(els[0].textContent).toContain('120 → 90 BPM');
		expect(els[0].style.left).toBe('50%');
		expect(els[1].textContent).toContain('8B → 10B');
		expect(els[1].style.left).toBe('75%');
	});

	test('marqueur hors plage ou sans durée : position bornée, pas de division par zéro', () => {
		const { container } = render(WaveformView, {
			props: { peaks, durationS: null, markers: [{ t: 10, label: 'x' }], mode: 'key' }
		});
		expect(container.querySelector('[data-testid="waveform-marker"]').style.left).toBe('0%');
		const { container: c2 } = render(WaveformView, {
			props: { peaks, durationS: 60, markers: [{ t: 999, label: 'y' }], mode: 'rhythm' }
		});
		expect(c2.querySelector('[data-testid="waveform-marker"]').style.left).toBe('100%');
	});

	test('sans peaks (null) : état vide « AUCUN SIGNAL », sans erreur', () => {
		const { container } = render(WaveformView, { props: { peaks: null, durationS: 60, markers: [], mode: 'rhythm' } });
		expect(container.querySelector('[data-testid="waveform-empty"]')).not.toBeNull();
		expect(container.textContent).toContain('AUCUN SIGNAL');
	});

	test('peaks vide (Float32Array(0)) : état vide également', () => {
		const { container } = render(WaveformView, { props: { peaks: new Float32Array(0), durationS: 60 } });
		expect(container.querySelector('[data-testid="waveform-empty"]')).not.toBeNull();
	});
});
