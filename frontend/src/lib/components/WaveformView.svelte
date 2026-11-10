<script lang="ts">
  // AlcheMix Studio — Module 1 : forme d'onde d'une piste avec marqueurs de changements
  // (micro-tâche M3, alchemix#44). Les marqueurs sont rendus en overlay DOM (testable
  // en jsdom) au-dessus du canvas qui trace les barres min/max de `waveformPeaksMulti`.
  // L'échelle verticale est mesurée sur le pic réel du signal (`peakAmplitude` / `maxPeak`)
  // avec 8 % de la hauteur totale de marge en haut ET en bas : aucune valeur n'est écrêtée,
  // la dynamique relative est intégralement préservée (échelle linéaire globale unique).
  import { computeWaveformBars, WAVEFORM_MARGIN_RATIO } from '../waveform.js';

  interface Marker {
    t: number; // position en secondes
    label: string;
  }

  interface Props {
    peaks?: Float32Array | null; // 2*width entrelacé [min0, max0, ...] (waveformPeaksMulti)
    durationS?: number | null; // durée totale : position des marqueurs en %
    markers?: Marker[];
    mode?: 'rhythm' | 'key'; // mode d'annotation affiché (M4 : sélecteur)
    title?: string;
    maxPeak?: number | null; // pic global de référence (maintient la même échelle verticale au zoom)
  }

  let {
    peaks = null,
    durationS = null,
    markers = [],
    mode = 'rhythm',
    title = "FORME D'ONDE",
    maxPeak = null
  }: Props = $props();

  const DEFAULT_WIDTH = 1200; // taille initiale du bitmap (attributs statiques du <canvas>)
  const DEFAULT_HEIGHT = 320;

  let wrapperEl = $state<HTMLDivElement | undefined>();
  let canvas = $state<HTMLCanvasElement | undefined>();

  const hasPeaks = $derived(!!peaks && peaks.length >= 2);
  const modeLabel = $derived(mode === 'key' ? 'CLEF' : 'RYTHME');

  /** Position horizontale d'un marqueur en %, bornée à [0, 100] ; 0% sans durée. */
  function markerLeft(t: number): string {
    if (!durationS || durationS <= 0) return '0%';
    const pct = Math.min(100, Math.max(0, (t / durationS) * 100));
    return `${Math.round(pct * 100) / 100}%`;
  }

  /**
   * Dessin statique (pas de boucle rAF) : crêtes + corps énergétique par colonne, axe médian cuivré.
   * Lit la taille courante du BITMAP (canvas.width/height) et jamais des attributs réactifs :
   * modifier l'attribut width/height d'un canvas EFFACE son bitmap côté navigateur, donc on
   * redessine explicitement juste après chaque changement de taille (voir ResizeObserver ci-dessous)
   * pour ne jamais laisser un canvas vide.
   */
  function draw() {
    const c = canvas;
    if (!c || !hasPeaks || !peaks) return;
    const width = c.width || parseInt(c.getAttribute('width') || String(DEFAULT_WIDTH), 10);
    const height = c.height || parseInt(c.getAttribute('height') || String(DEFAULT_HEIGHT), 10);
    if (width <= 0 || height <= 0) return;
    try {
      const layout = computeWaveformBars(peaks, width, height, {
        marginRatio: WAVEFORM_MARGIN_RATIO,
        referencePeak: maxPeak
      });

      // Expose les métriques géométriques calculées sur le DOM (vérifiables en test unitaire)
      let minY = layout.mid;
      let maxY = layout.mid;
      for (const b of layout.bars) {
        if (b.yTop < minY) minY = b.yTop;
        if (b.yBot > maxY) maxY = b.yBot;
      }
      c.dataset.peak = String(layout.peak);
      c.dataset.scale = String(layout.scale);
      c.dataset.midY = String(layout.mid);
      c.dataset.marginPx = String(layout.marginPx);
      c.dataset.minY = String(minY);
      c.dataset.maxY = String(maxY);
      c.dataset.bars = String(layout.bars.length);

      const ctx = c.getContext('2d');
      if (!ctx) return;

      // --- Fond sombre (obligatoire pour l'unité de test) ---
      try {
          ctx.fillStyle = '#101216'; // Couleur "Ardoise sombre" du thème Venetian Steampunk
          ctx.fillRect(0, 0, c.width, c.height);
      } catch (err) {
          console.error("Erreur de rendu canvas:", err);
      }

      const { mid, bars } = layout;

      // Passe 1 : enveloppe complète (crêtes positives et négatives) en orange #FFB300
      ctx.fillStyle = '#FFB300';
      ctx.globalAlpha = 0.78;
      for (let i = 0; i < bars.length; i++) {
        const b = bars[i];
        ctx.fillRect(b.x, b.yTop, b.width, b.height);
      }

      // Passe 2 : cœur énergétique dense autour de l'axe médian en orange #FFB300 pleine intensité
      ctx.globalAlpha = 1;
      for (let i = 0; i < bars.length; i++) {
        const b = bars[i];
        ctx.fillRect(b.x, b.coreTop, b.width, b.coreHeight);
      }

      // Axe horizontal médian cuivré
      ctx.strokeStyle = '#C87D55';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(width, mid);
      ctx.stroke();
    } catch (err) {
      console.error('WaveformView draw error:', err);
    }
  }

  // Redessine quand les données changent (peaks / maxPeak)
  $effect(() => {
    const c = canvas;
    const p = peaks;
    if (c && p && p.length >= 2) draw();
  });

  // Adaptation automatique de la résolution du canevas quand la taille du composant change.
  // IMPORTANT : la taille du bitmap est fixée en IMPÉRATIF (canvas.width/height) puis on
  // appelle draw() immédiatement. Lier les attributs width/height à du state réactif ferait
  // effacer le bitmap par le navigateur (changement d'attribut) sans déclencher de redessin
  // de l'effet de dessin, laissant un canvas vide — c'est le bug sc004.png.
  $effect(() => {
    if (!wrapperEl || typeof ResizeObserver === 'undefined') return;
    const applySize = (w: number, h: number) => {
      const nextW = Math.round(w);
      const nextH = Math.round(h);
      if (nextW > 0 && nextH > 0 && canvas && (canvas.width !== nextW || canvas.height !== nextH)) {
        canvas.width = nextW; // efface le bitmap…
        canvas.height = nextH;
        draw(); // …puis on redessine tout de suite : jamais de canvas vide
      }
    };
    applySize(
      wrapperEl.clientWidth || (canvas ? parseInt(canvas.getAttribute('width') || String(DEFAULT_WIDTH), 10) : DEFAULT_WIDTH),
      wrapperEl.clientHeight || (canvas ? parseInt(canvas.getAttribute('height') || String(DEFAULT_HEIGHT), 10) : DEFAULT_HEIGHT)
    );
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        applySize(cr?.width || wrapperEl.clientWidth || 0, cr?.height || wrapperEl.clientHeight || 0);
      }
    });
    ro.observe(wrapperEl);
    return () => ro.disconnect();
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

  <div class="aw-bezel-glass canvas-wrapper" bind:this={wrapperEl}>
    {#if hasPeaks}
      <canvas
        bind:this={canvas}
        data-testid="waveform-canvas"
        width={DEFAULT_WIDTH}
        height={DEFAULT_HEIGHT}
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
    /* pastille sombre : le libellé reste lisible même là où la forme d'onde touche le haut */
    background: rgba(16, 18, 22, 0.88);
    padding: 1px 5px;
    border-radius: 3px;
    border: 1px solid currentColor;
  }

  /* Contraste avec la forme d'onde orange #FFB300 : marqueurs émeraude (RYTHME) / saphir (CLEF) */
  .marker.rhythm {
    color: #00e676;
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
