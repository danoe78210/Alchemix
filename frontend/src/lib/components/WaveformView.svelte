<script lang="ts">
  // AlcheMix Studio — Module 1 : forme d'onde d'une piste avec marqueurs de changements
  // (micro-tâche M3, alchemix#44). Les marqueurs sont rendus en overlay DOM (testable
  // en jsdom) au-dessus du canvas qui trace les barres min/max de `waveformPeaks`.
  // L'échelle verticale est mesurée sur le pic réel du signal (`peakAmplitude`) avec
  // 7 % de marge : aucune valeur n'est écrêtée, la dynamique relative est préservée
  // (une seule échelle globale pour tout le morceau, aucune compression).
  import { peakAmplitude } from '../waveform.js';

  interface Marker {
    t: number; // position en secondes
    label: string;
  }

  interface Props {
    peaks?: Float32Array | null; // 2*width entrelacé [min0, max0, ...] (waveformPeaks)
    durationS?: number | null; // durée totale : position des marqueurs en %
    markers?: Marker[];
    mode?: 'rhythm' | 'key'; // mode d'annotation affiché (M4 : sélecteur)
    title?: string;
  }

  let { peaks = null, durationS = null, markers = [], mode = 'rhythm', title = "FORME D'ONDE" }: Props = $props();

  let canvas = $state<HTMLCanvasElement | undefined>();

  const hasPeaks = $derived(!!peaks && peaks.length >= 2);
  const modeLabel = $derived(mode === 'key' ? 'CLEF' : 'RYTHME');

  /** Position horizontale d'un marqueur en %, bornée à [0, 100] ; 0% sans durée. */
  function markerLeft(t: number): string {
    if (!durationS || durationS <= 0) return '0%';
    const pct = Math.min(100, Math.max(0, (t / durationS) * 100));
    return `${Math.round(pct * 100) / 100}%`;
  }

  // Dessin statique (pas de boucle rAF) : une barre min/max par colonne, axe médian cuivré.
  $effect(() => {
    if (!canvas || !hasPeaks || !peaks) return;
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return; // jsdom sans paquet canvas : le rendu DOM suffit aux tests
      const { width, height } = canvas;
      if (width <= 0 || height <= 0) return;
      const cols = peaks.length / 2;
      const mid = height / 2;
      // Échelle verticale globale, mesurée sur le signal réel : le pic le plus haut
      // atteint 93 % de la demi-hauteur (marge de 7 % en haut et en bas, symétrique).
      // Aucun clamping : `peak` est le max absolu, donc max*scale <= mid*0.93 < mid.
      const peak = peakAmplitude(peaks);
      const scale = peak > 0 ? (mid * 0.93) / peak : 0;
      const step = width / cols;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#101216';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#FFB300';
      for (let c = 0; c < cols; c++) {
        const min = peaks[2 * c];
        const max = peaks[2 * c + 1];
        const yTop = mid - max * scale;
        const yBot = mid - min * scale;
        ctx.fillRect(c * step, yTop, Math.max(1, step - 0.5), Math.max(1, yBot - yTop));
      }
      ctx.strokeStyle = '#C87D55';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(width, mid);
      ctx.stroke();
    } catch (err) {
      console.error('WaveformView draw error:', err);
    }
  });
</script>

<div class="aw-panel waveform-panel">
  <div class="waveform-header">
    <div class="title-with-icon">
      <span class="icon">〰</span>
      <span class="aw-panel-title">{title}</span>
    </div>
    <span
      class="aw-badge waveform-badge {mode === 'key' ? 'badge-sapphire' : 'badge-amber'}"
      data-testid="waveform-mode"
    >
      ● {modeLabel}
    </span>
  </div>

  <div class="aw-bezel-glass canvas-wrapper">
    {#if hasPeaks}
      <canvas
        bind:this={canvas}
        data-testid="waveform-canvas"
        width="1200"
        height="320"
        aria-label="Forme d'onde {title}"
      ></canvas>
      <div class="markers">
        {#each markers as m, i (i)}
          <div class="marker {mode}" data-testid="waveform-marker" style="left: {markerLeft(m.t)}">
            <span class="marker-line"></span>
            <span class="marker-label">{m.label}</span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty" data-testid="waveform-empty">AUCUN SIGNAL</div>
    {/if}
  </div>
</div>

<style>
  .waveform-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
    box-sizing: border-box;
  }

  .waveform-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .title-with-icon {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .icon {
    font-size: 13px;
  }

  .waveform-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    letter-spacing: 0.5px;
  }

  .badge-amber {
    background: rgba(255, 179, 0, 0.15);
    color: #ffb300;
    border: 1px solid rgba(255, 179, 0, 0.4);
  }

  .badge-sapphire {
    background: rgba(41, 182, 246, 0.15);
    color: #29b6f6;
    border: 1px solid rgba(41, 182, 246, 0.4);
  }

  .canvas-wrapper {
    position: relative;
    flex: 1;
    width: 100%;
    min-height: 120px;
    overflow: hidden;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .markers {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .marker {
    position: absolute;
    top: 0;
    bottom: 0;
  }

  .marker-line {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: currentColor;
    box-shadow: 0 0 6px currentColor;
  }

  .marker-label {
    position: absolute;
    top: 2px;
    left: 5px;
    font-size: 9px;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    color: currentColor;
    text-shadow: 0 0 6px currentColor;
    white-space: nowrap;
  }

  .marker.rhythm {
    color: #ffb300;
  }

  .marker.key {
    color: #29b6f6;
  }

  .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 120px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    color: rgba(255, 179, 0, 0.6);
  }
</style>
