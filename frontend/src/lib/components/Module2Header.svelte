<script lang="ts">
  import { formatTime } from '../module2/timeline.js';

  interface Track {
    name: string;
    durationSeconds: number;
    sampleRate: number;
    channels: number;
  }

  interface Props {
    track: Track | null;
    engineLabel?: string;
    engineReady?: boolean;
    separating?: boolean;
    hasJob?: boolean;
    onImport: () => void;
    onSeparate: () => void;
    onExport: () => void;
  }

  let {
    track = null,
    engineLabel = 'SIMULATION',
    engineReady = true,
    separating = false,
    hasJob = false,
    onImport,
    onSeparate,
    onExport
  }: Props = $props();

  const meta = $derived(
    track
      ? `${(track.sampleRate / 1000).toLocaleString('fr-FR')} kHz · ${track.channels === 2 ? 'Stéréo' : `${track.channels} canaux`} · ${formatTime(track.durationSeconds)}`
      : ''
  );
  // SÉPARER est l'action mise en avant dès qu'un morceau est chargé et que le moteur répond.
  const canSeparate = $derived(!!track && engineReady && !separating);
</script>

<header class="aw-panel">
  <div class="aw-header">
    <h2 class="aw-panel-title">AlcheMix Studio — Stem Studio</h2>
    <span class="aw-badge" data-testid="engine-badge" data-ready={engineReady}>{engineLabel}</span>
  </div>
  <div class="body">
    <p class="subtitle">Console de séparation audio — Module 2</p>
    <div class="trackline">
      {#if track}
        <p class="track" data-testid="track-name">Morceau chargé : <strong>{track.name}</strong></p>
        <p class="meta" data-testid="track-meta">{meta}</p>
      {:else}
        <p class="track empty" data-testid="track-name">Aucun morceau chargé</p>
      {/if}
    </div>
    <div class="actions">
      <button type="button" data-testid="import-track" class="aw-btn-steampunk" onclick={onImport}>
        Importer
      </button>
      <button
        type="button"
        data-testid="separate-track"
        class="aw-btn-steampunk separate"
        class:primary={canSeparate}
        disabled={!canSeparate}
        onclick={onSeparate}
      >
        {separating ? 'Séparation…' : 'Séparer'}
      </button>
      <button type="button" data-testid="open-export" class="aw-btn-steampunk ghost" disabled={!hasJob} onclick={onExport}>
        Exporter
      </button>
    </div>
  </div>
</header>

<style>
  .body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px 16px;
    background: var(--aw-panel);
  }

  .subtitle {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--aw-text-muted);
  }

  .trackline {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--aw-border);
    padding-bottom: 10px;
  }

  .track {
    margin: 0;
    font-size: 0.9rem;
    color: var(--aw-copper-light);
  }

  .track strong {
    color: var(--aw-text);
  }

  .track.empty {
    color: var(--aw-text-muted);
    font-style: italic;
  }

  .meta {
    margin: 0;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    color: var(--aw-text-muted);
    white-space: nowrap;
  }

  .actions {
    display: flex;
    gap: 12px;
  }

  .actions .separate {
    flex: 1;
  }

  /* L'action principale brille en or quand elle est disponible. */
  .separate.primary {
    border-color: var(--aw-gold) #8a6a00 #6e5400 var(--aw-gold);
    box-shadow: 0 5px 0 #4a2b1b, 0 0 22px var(--aw-gold-glow), inset 0 1px 1px rgba(255, 255, 255, 0.5);
  }

  .ghost {
    background: linear-gradient(180deg, #2a2d35 0%, #15171c 100%);
    color: var(--aw-copper-light);
    border-color: var(--aw-copper-dark) #2a1810 #1a0f0a var(--aw-copper-dark);
  }
</style>
