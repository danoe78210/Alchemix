<script lang="ts">
  // AlcheMix Studio — Module 1 : sélecteur du panneau forme d'onde (micro-tâche M4, alchemix#44).
  // Deux leviers steampunk .aw-toggle-lever : piste A/B et mode de marqueurs RYTHME/CLEF.
  // Composant contrôlé : l'état (track, mode) vit chez le parent (Module1View en M6),
  // les changements remontent par onTrackChange / onModeChange.

  interface Props {
    track?: 'A' | 'B';
    mode?: 'rhythm' | 'key';
    onTrackChange?: (t: 'A' | 'B') => void;
    onModeChange?: (m: 'rhythm' | 'key') => void;
  }

  let { track = 'A', mode = 'rhythm', onTrackChange, onModeChange }: Props = $props();
</script>

<div class="waveform-controls" data-testid="waveform-controls">
  <div class="control-group">
    <span class="group-label">PISTE</span>
    <label class="aw-toggle-lever">
      <input
        type="checkbox"
        data-testid="track-toggle"
        checked={track === 'B'}
        onchange={() => onTrackChange?.(track === 'B' ? 'A' : 'B')}
      />
      <span class="aw-toggle-track"><span class="aw-toggle-cap"></span></span>
      <span class="aw-toggle-led"></span>
      <span class="lever-state" data-testid="track-state">{track}</span>
    </label>
  </div>

  <div class="control-group">
    <span class="group-label">MARQUEURS</span>
    <label class="aw-toggle-lever">
      <input
        type="checkbox"
        data-testid="mode-toggle"
        checked={mode === 'key'}
        onchange={() => onModeChange?.(mode === 'key' ? 'rhythm' : 'key')}
      />
      <span class="aw-toggle-track"><span class="aw-toggle-cap"></span></span>
      <span class="aw-toggle-led"></span>
      <span class="lever-state" data-testid="mode-state">{mode === 'key' ? 'CLEF' : 'RYTHME'}</span>
    </label>
  </div>
</div>

<style>
  .waveform-controls {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .group-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #c87d55;
    text-transform: uppercase;
  }

  .lever-state {
    min-width: 4.5ch;
    font-family: var(--led-font, 'Courier New', monospace);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--aw-text, #e8e6e3);
  }
</style>
