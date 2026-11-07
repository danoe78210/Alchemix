<script lang="ts">
  import StemIcon from './StemIcon.svelte';

  type StemId = 'vocals' | 'drums' | 'bass' | 'other';

  interface Props {
    id: StemId;
    label: string;
    color?: string;
    playing: boolean;
    volume: number;
    muted: boolean;
    soloed: boolean;
    rms?: number;
    onPlay: (playing: boolean) => void;
    onVolume: (volume: number) => void;
    onMute: (muted: boolean) => void;
    onSolo: (soloed: boolean) => void;
  }

  let { id, label, color = '#C87D55', playing, volume, muted, soloed, rms = 0, onPlay, onVolume, onMute, onSolo }: Props = $props();

  // VU-mètre : échelle de −60 dB (vide) à 0 dB (plein).
  const meterPct = $derived(Math.round(Math.min(1, Math.max(0, (20 * Math.log10(rms) + 60) / 60)) * 100));
  // Valeur du fader en dB (gain linéaire 0..1 : 1 → 0 dB, 0 → −∞).
  const volDb = $derived(volume > 0 ? `${(20 * Math.log10(volume)).toFixed(1)} dB` : '-∞ dB');
</script>

<div class="strip">
  <StemIcon stem={id} {color} />
  <span class="title">{label}</span>

  <button type="button" class="play" data-testid="play-{id}" aria-pressed={playing} onclick={() => onPlay(!playing)}>
    {playing ? 'PAUSE' : 'PLAY'}
  </button>

  <div class="console">
    <div class="slot" aria-hidden="true">
      <div class="ticks"></div>
      <div class="center-mark" data-testid="fader-center-{id}"></div>
    </div>
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={volume}
      data-testid="fader-{id}"
      aria-label="Volume {label}"
      oninput={(e) => onVolume(Number((e.currentTarget as HTMLInputElement).value))}
      class="fader"
    />

    <div class="meter" aria-hidden="true">
      <div data-testid="meter-{id}" class="level" style="height: {meterPct}%"></div>
    </div>
  </div>

  <span class="voldb aw-led" data-testid="vol-db-{id}">{volDb}</span>

  <div class="switches">
    <button
      type="button"
      data-testid="solo-{id}"
      aria-pressed={soloed}
      onclick={() => onSolo(!soloed)}
      class="switch"
      class:on-solo={soloed}
    >
      SOLO
    </button>
    <button
      type="button"
      data-testid="mute-{id}"
      aria-pressed={muted}
      onclick={() => onMute(!muted)}
      class="switch"
      class:on-mute={muted}
    >
      MUTE
    </button>
  </div>
</div>

<style>
  .strip {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    width: 13rem;
    padding: 18px 16px 16px;
    border-radius: 12px;
    border: 1px solid var(--aw-copper-dark);
    background: linear-gradient(180deg, #23262e 0%, var(--aw-panel) 60%, #14161b 100%);
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(224, 184, 138, 0.12);
  }

  .title {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 12px;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--aw-copper-light);
    text-shadow: 0 0 8px rgba(224, 184, 138, 0.35);
    padding-bottom: 6px;
    border-bottom: 1px solid var(--aw-copper-dark);
    width: 100%;
    text-align: center;
  }

  .play {
    font-family: 'Courier New', monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: #fff;
    padding: 6px 14px;
    border-radius: 4px;
    border: 1px solid var(--aw-copper-light);
    background: linear-gradient(180deg, var(--aw-copper) 0%, #8c4a27 100%);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    cursor: pointer;
  }

  .console {
    position: relative;
    width: 96px;
    height: 12rem;
  }

  /* Fente encastrée dans laquelle glisse le fader (axe central à 20 px). */
  .slot {
    position: absolute;
    left: 15px;
    top: 0;
    bottom: 0;
    width: 10px;
    border-radius: 5px;
    background: var(--aw-bezel);
    border: 1px solid var(--aw-bezel-border);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.9);
  }

  .ticks {
    position: absolute;
    inset: 6px 0;
    background: repeating-linear-gradient(180deg, rgba(224, 184, 138, 0.35) 0 1px, transparent 1px 16px);
  }

  /* Repère central du fader (gain −6 dB à mi-course sur l'échelle linéaire). */
  .center-mark {
    position: absolute;
    top: 50%;
    left: -5px;
    right: -5px;
    height: 2px;
    background: var(--aw-gold);
    box-shadow: 0 0 6px var(--aw-gold-glow);
  }

  /* Potentiomètre vertical : capuchon de laiton, cannelures et ligne de repère. */
  .fader {
    position: absolute;
    left: 0;
    top: 0;
    width: 40px;
    height: 12rem;
    margin: 0;
    background: transparent;
    writing-mode: vertical-lr;
    direction: rtl;
    appearance: none;
    cursor: pointer;
  }

  .fader::-webkit-slider-runnable-track {
    background: transparent;
  }

  .fader::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 40px;
    height: 20px;
    margin-left: 0;
    border-radius: 4px;
    border: 1px solid #5a3a1e;
    background:
      repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.25) 0 2px, transparent 2px 5px),
      linear-gradient(180deg, #f6dfb0 0%, #c8914a 45%, #7a4a22 100%);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  .fader::-webkit-slider-thumb::after {
    content: '';
  }

  .fader:focus-visible {
    outline: 2px solid var(--aw-copper-light);
    outline-offset: 2px;
  }

  .meter {
    position: absolute;
    left: 60px;
    top: 0;
    width: 12px;
    height: 12rem;
    border-radius: 4px;
    background: var(--aw-bezel);
    border: 1px solid var(--aw-bezel-border);
    overflow: hidden;
    display: flex;
    flex-direction: column-reverse;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.9);
  }

  .level {
    width: 100%;
    background: linear-gradient(0deg, var(--aw-emerald) 0%, var(--aw-gold) 70%, #ff5252 100%);
    box-shadow: 0 0 8px rgba(255, 179, 0, 0.45);
  }

  .switches {
    display: flex;
    gap: 10px;
  }

  .voldb {
    font-size: 0.78rem;
    letter-spacing: 0.08em;
  }

  .switch {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    padding: 8px 14px;
    border-radius: 4px;
    border: 1px solid var(--aw-bezel-border);
    background: linear-gradient(180deg, #2a2d35 0%, #15171c 100%);
    color: var(--aw-text-muted);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.6);
    cursor: pointer;
  }

  .switch.on-solo {
    color: #14110a;
    border-color: var(--aw-gold);
    background: linear-gradient(180deg, #ffd45a 0%, var(--aw-gold) 100%);
    box-shadow: 0 0 10px rgba(255, 179, 0, 0.5);
  }

  .switch.on-mute {
    color: #fff;
    border-color: #ff5252;
    background: linear-gradient(180deg, #e53935 0%, #8e1b1b 100%);
    box-shadow: 0 0 10px rgba(255, 82, 82, 0.45);
  }
</style>
