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

	test('compare les amplitudes extraites avec les coordonnées Y réellement dessinées sur le canvas (marge 8 %, centrage, aucun écrêtage)', () => {
		const fillRectCalls = [];
		const strokeCalls = [];
		const fakeCtx = {
			fillStyle: '',
			strokeStyle: '',
			globalAlpha: 1,
			lineWidth: 1,
			clearRect: vi.fn(),
			fillRect: vi.fn((x, y, w, h) => {
				fillRectCalls.push({ x, y, w, h, fillStyle: fakeCtx.fillStyle, alpha: fakeCtx.globalAlpha });
			}),
			beginPath: vi.fn(),
			moveTo: vi.fn((x, y) => strokeCalls.push({ type: 'moveTo', x, y })),
			lineTo: vi.fn((x, y) => strokeCalls.push({ type: 'lineTo', x, y })),
			stroke: vi.fn()
		};
		const ctxSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeCtx);

		// 3 colonnes : col 0 (0, 0.5), col 1 (-0.2, 0.8), col 2 (-1.0, 0.4) -> pic global = 1.0
		const testPeaks = new Float32Array([0, 0.5, -0.2, 0.8, -1.0, 0.4]);
		const { container } = render(WaveformView, {
			props: { peaks: testPeaks, durationS: 60, markers: [], mode: 'rhythm', title: 'PISTE A' }
		});

		const canvas = container.querySelector('[data-testid="waveform-canvas"]');
		expect(canvas).not.toBeNull();
		const height = 320;
		const mid = 160;
		const marginPx = height * 0.08; // 25.6 px = 8 % de la hauteur TOTALE par côté
		const usableHalf = mid - marginPx; // 134.4 px

		expect(Number(canvas.dataset.peak)).toBeCloseTo(1.0);
		expect(Number(canvas.dataset.midY)).toBe(160);
		expect(Number(canvas.dataset.marginPx)).toBeCloseTo(25.6);
		expect(Number(canvas.dataset.scale)).toBeCloseTo(usableHalf / 1.0);

		// 1er fillRect = fond sombre #101216 sur (0, 0, 1200, 320)
		expect(fillRectCalls[0]).toMatchObject({ x: 0, y: 0, w: 1200, h: 320, fillStyle: '#101216' });

		// Barres d'enveloppe (passe 1, alpha 0.78, #FFB300) : 3 colonnes
		const outerBars = fillRectCalls.slice(1, 4);
		expect(outerBars).toHaveLength(3);
		for (const bar of outerBars) {
			expect(bar.fillStyle).toBe('#FFB300');
			// Aucune crête ne touche les bords (0 ou 320) : respect strict de la marge [25.6, 294.4]
			expect(bar.y).toBeGreaterThanOrEqual(marginPx - 1e-5);
			expect(bar.y + bar.h).toBeLessThanOrEqual(height - marginPx + 1e-5);
		}

		// Vérification exacte colonne par colonne : yTop = mid - max * scale, yBot = mid - min * scale
		// Col 0 : min=0, max=0.5 -> yTop = 160 - 0.5 * 134.4 = 92.8, yBot = 160
		expect(outerBars[0].y).toBeCloseTo(160 - 0.5 * usableHalf);
		expect(outerBars[0].y + outerBars[0].h).toBeCloseTo(160);

		// Col 1 : min=-0.2, max=0.8 -> yTop = 160 - 0.8 * 134.4 = 52.48, yBot = 160 + 0.2 * 134.4 = 186.88
		expect(outerBars[1].y).toBeCloseTo(160 - 0.8 * usableHalf);
		expect(outerBars[1].y + outerBars[1].h).toBeCloseTo(160 + 0.2 * usableHalf);

		// Col 2 : min=-1.0, max=0.4 -> yTop = 160 - 0.4 * 134.4 = 106.24, yBot = 160 + 1.0 * 134.4 = 294.4
		expect(outerBars[2].y).toBeCloseTo(160 - 0.4 * usableHalf);
		expect(outerBars[2].y + outerBars[2].h).toBeCloseTo(height - marginPx);

		// Axe horizontal médian tracé à y = mid (160) en #C87D55
		expect(fakeCtx.strokeStyle).toBe('#C87D55');
		expect(strokeCalls).toEqual([
			{ type: 'moveTo', x: 0, y: 160 },
			{ type: 'lineTo', x: 1200, y: 160 }
		]);

		ctxSpy.mockRestore();
	});

	test('maintient une échelle verticale identique au zoom grâce à maxPeak et s adapte au redimensionnement (ResizeObserver)', async () => {
		let resizeCb = null;
		const OrigRO = globalThis.ResizeObserver;
		globalThis.ResizeObserver = class {
			constructor(cb) {
				resizeCb = cb;
			}
			observe() {}
			disconnect() {}
		};

		try {
			// Segment zoomé calme (pic local 0.25) mais pic global de la piste = 1.0
			const zoomedPeaks = new Float32Array([-0.25, 0.25, -0.1, 0.1]);
			const { container } = render(WaveformView, {
				props: { peaks: zoomedPeaks, maxPeak: 1.0, durationS: 60 }
			});
			const canvas = container.querySelector('[data-testid="waveform-canvas"]');
			// L'échelle utilise maxPeak = 1.0 (134.4 px de demi-hauteur utile) et non 0.25 (pas de normalisation indépendante du segment)
			expect(Number(canvas.dataset.peak)).toBeCloseTo(1.0);
			expect(Number(canvas.dataset.scale)).toBeCloseTo(160 - 320 * 0.08);

			// Simule un redimensionnement du conteneur en 800 × 200
			if (resizeCb) {
				resizeCb([{ contentRect: { width: 800, height: 200 } }]);
			}
			await new Promise((r) => setTimeout(r, 0));
			expect(canvas.getAttribute('width')).toBe('800');
			expect(canvas.getAttribute('height')).toBe('200');
			expect(Number(canvas.dataset.midY)).toBe(100);
			expect(Number(canvas.dataset.scale)).toBeCloseTo(100 - 200 * 0.08);
		} finally {
			globalThis.ResizeObserver = OrigRO;
		}
	});
});
