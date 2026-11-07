<script lang="ts">
  import StemIcon from './StemIcon.svelte';
  import { formatTime } from '../module2/timeline.js';

  type StemId = 'vocals' | 'drums' | 'bass' | 'other';

  interface Props {
    id: StemId;
    label: string;
    color: string;
    peaks: Float32Array | null;
    duration?: number | null;
    playing?: boolean;
  }

  let { id, label, color, peaks, duration = null, playing = false }: Props = $props();

  let canvas = $state<HTMLCanvasElement | undefined>();

  // Dessin de la forme d'onde : une barre symétrique par tranche, centrée verticalement.
  $effect(() => {
    if (!canvas || !peaks) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    const mid = height / 2;
    const step = width / peaks.length;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;
    for (let i = 0; i < peaks.length; i++) {
      const h = peaks[i] * mid;
      ctx.fillRect(i * step, mid - h, Math.max(1, step - 1), h * 2);
    }
  });
</script>

<div class="row" style="--stem: {color}">
  <div class="name">
    <StemIcon stem={id} {color} />
    <span class="title">{label}</span>
  </div>

  <div class="frame">
    <div class="glass">
      <canvas
        bind:this={canvas}
        data-testid="wave-{id}"
        aria-label="Forme d'onde {label}"
        width="1200"
        height="200"
      ></canvas>
    </div>
  </div>

  <div class="meta">
    {#if duration != null}
      <span class="time" data-testid="wave-duration-{id}">{formatTime(duration)}</span>
    {/if}
    <span class="state" class:playing data-testid="wave-state-{id}">{playing ? 'LECTURE' : 'ARRÊT'}</span>
  </div>
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 22px;
  }

  .name {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 10px;
    width: 12rem;
  }

  .title {
    flex: 1;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 13px;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--stem);
    text-shadow: 0 0 10px color-mix(in srgb, var(--stem) 55%, transparent);
    border-bottom: 1px solid var(--aw-copper-dark);
    padding-bottom: 6px;
  }

  /* Cadre cuivre biseauté, à la manière des platines du Module 1. */
  .frame {
    flex: 1;
    padding: 5px;
    border-radius: 12px;
    background: linear-gradient(180deg, var(--aw-copper-light) 0%, var(--aw-copper-dark) 45%, #2a160e 100%);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }

  /* Écran de verre fumé encastré. */
  .glass {
    padding: 6px;
    border-radius: 8px;
    background: radial-gradient(circle at 50% 30%, #101216 0%, var(--aw-bezel) 100%);
    box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.95);
  }

  canvas {
    display: block;
    width: 100%;
    height: 100px;
  }

  /* Colonne d'état : durée du stem et témoin de lecture. */
  .meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    width: 5.5rem;
    flex-shrink: 0;
  }

  .time {
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    color: var(--aw-text-muted);
  }

  .state {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid var(--aw-bezel-border);
    color: var(--aw-text-muted);
  }

  .state.playing {
    color: var(--aw-bg);
    background: var(--stem);
    border-color: var(--stem);
    box-shadow: 0 0 10px color-mix(in srgb, var(--stem) 55%, transparent);
  }
</style>
