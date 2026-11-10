<script lang="ts">
  interface QualityModalProps {
    /** Mode actuellement sélectionné */
    selectedMode: 'performance' | 'studio';
    /** Callback appelé quand l'utilisateur change de mode */
    onModeChange: (mode: 'performance' | 'studio') => void;
    /** État de séparation en cours */
    separating: boolean;
  }

  const MODES = [
    {
      id: 'performance' as const,
      label: 'Mode Performance',
      description: 'Passe unique, VRAM ≤ 6 Go, latence faible',
      vramGb: 6,
      passes: 1,
      color: '#FFB300',
    },
    {
      id: 'studio' as const,
      label: 'Mode Studio',
      description: 'Multi-passes (3 passes), VRAM ≤ 8 Go, qualité studio',
      vramGb: 8,
      passes: 3,
      color: '#00E676',
    },
  ] as const;

  let { selectedMode, onModeChange, separating }: QualityModalProps = $props();

  function modeChange(mode: 'performance' | 'studio') {
    if (separating) return;
    selectedMode = mode;
    onModeChange(mode);
  }
</script>

<section class="aw-panel" aria-label="Sélection de qualité">
  <div class="aw-header">
    <h3 class="aw-panel-title">Choix de la qualité</h3>
    <span class="aw-badge" data-testid="quality-mode-badge">
      {selectedMode === 'performance' ? 'Performance' : 'Studio'}
    </span>
  </div>

  <div class="grid" role="radiogroup" aria-label="Mode de séparation">
    {#each MODES as mode (mode.id)}
      <button type="button" class="model"
        role="radio"
        aria-checked={selectedMode === mode.id}
        class:selected={selectedMode === mode.id}
        onclick={() => modeChange(mode.id)}
        data-testid="quality-{mode.id}"
        disabled={separating}>
        <div class="color-indicator" style="background: {mode.color}"></div>
        <div>
          <h4 class="model-name">{mode.label}</h4>
          <p class="model-desc">{mode.description}</p>
        </div>
      </button>
    {/each}
  </div>

  <div class="compromis" data-testid="quality-compromis">
    <div>
      <strong>VRAM requis :</strong> {selectedMode === 'performance' ? '≤ 6 Go' : '≤ 8 Go'}
    </div>
    <div>
      <strong>Passes de raffinement :</strong> {selectedMode === 'performance' ? '1 passe' : '3 passes'}
    </div>
    <div>
      <strong>Temps estimé :</strong> {selectedMode === 'performance' ? '~0.5 s' : '~1.5 s'}
    </div>
  </div>
</section>

<style>
  .aw-panel {
    --aw-panel: #1a1e28;
    --aw-panel-inset: #151a22;
    --aw-border-bright: #3a3f4f;
    --aw-border: #2a2d35;
    --aw-copper: #b06a43;
    --aw-copper-light: #c07a53;
    --aw-copper-dark: #a05a33;
    --aw-gold: #d4af3c;
    --aw-gold-glow: rgba(212, 175, 60, 0.45);
    --aw-emerald: #00E676;
    --aw-text: #e0e0e0;
    --aw-text-muted: #7a7a7a;
    --aw-bg: #121316;
    --aw-bg-inset: #1e222d;
    --aw-radius: 8px;
    --aw-spinner-gear: #d4af3c;
  }

  .aw-panel-title {
    color: var(--aw-text);
  }

  .aw-badge {
    --aw-badge: #d4af3c;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    padding: 16px;
    background: var(--aw-panel);
  }

  .model {
    padding: 16px;
    border: 2px solid var(--aw-border);
    border-radius: var(--radius);
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }

  .model.selected {
    border-color: var(--aw-gold);
    box-shadow: 0 0 16px var(--aw-gold-glow);
    background: var(--aw-panel-inset);
  }

  .model:not(.selected):hover {
    border-color: var(--aw-copper);
  }

  .color-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: 12px;
    flex-shrink: 0;
  }

  .model-name {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--aw-text);
    margin-bottom: 4px;
  }

  .model-desc {
    font-size: 0.75rem;
    color: var(--aw-text-muted);
    line-height: 1.4;
  }

  .compromis {
    margin-top: 16px;
    padding: 12px;
    background: var(--aw-panel-inset);
    border-radius: var(--radius);
    font-size: 0.8rem;
    color: var(--aw-text-muted);
  }

  .compromis div {
    margin-bottom: 4px;
  }

  .compromis strong {
    color: var(--aw-gold);
    display: block;
    margin-bottom: 2px;
  }

  .model:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .model:disabled:hover {
    border-color: var(--aw-border);
  }
</style>
