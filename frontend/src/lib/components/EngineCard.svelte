<script lang="ts">
  interface Model {
    id: string;
    label: string;
    usage: string;
    sizeMb: number | null;
  }

  interface Props {
    models: Model[];
    selectedId: string | null;
    installedIds?: string[];
    /** Libellé du modèle réellement utilisé par la dernière séparation ; null = simulation. */
    activeModel?: string | null;
    backend?: string;
    vramText?: string;
    lastMs?: number | null;
    busy?: boolean;
    onSelect: (id: string) => void;
  }

  let {
    models,
    selectedId,
    installedIds = [],
    activeModel = null,
    backend = 'CPU — simulation',
    vramText = '—',
    lastMs = null,
    busy = false,
    onSelect
  }: Props = $props();

  const lastText = $derived(lastMs == null ? '—' : `${(lastMs / 1000).toFixed(1)} s`);
</script>

<section class="aw-panel" aria-label="Moteur IA">
  <div class="aw-header">
    <h3 class="aw-panel-title">Moteur IA</h3>
    <span class="aw-badge" data-testid="active-model">
      Modèle utilisé : {activeModel ?? 'aucun — simulation'}
    </span>
  </div>

  <div class="grid">
    <fieldset class="models">
      <legend>Modèle de séparation</legend>
      {#each models as m (m.id)}
        <label class="model" class:selected={selectedId === m.id}>
          <input
            type="radio"
            name="separation-model"
            value={m.id}
            checked={selectedId === m.id}
            data-testid="model-{m.id}"
            onchange={() => onSelect(m.id)}
          />
          <span class="name">{m.label}</span>
          <span class="usage">{m.usage}</span>
          <span class="size">Taille : {m.sizeMb == null ? '—' : `${m.sizeMb} Mo`}</span>
          <span class="installed" data-testid="installed-{m.id}" data-installed={installedIds.includes(m.id)}>
            {installedIds.includes(m.id) ? 'INSTALLÉ' : 'NON INSTALLÉ'}
          </span>
        </label>
      {/each}
    </fieldset>

    <dl class="status">
      <div class="aw-field">
        <dt class="aw-label">Accélération</dt>
        <dd class="aw-value" data-testid="engine-backend">{backend}</dd>
      </div>
      <div class="aw-field">
        <dt class="aw-label">Mémoire GPU</dt>
        <dd class="aw-value" data-testid="engine-vram">{vramText}</dd>
      </div>
      <div class="aw-field">
        <dt class="aw-label">Traitement</dt>
        <dd class="aw-value" data-testid="engine-time">{lastText}</dd>
      </div>
      {#if busy}
        <div class="busy" data-testid="separation-progress" role="status">
          <span class="aw-spinner-gear"></span>
          <span>Séparation en cours…</span>
        </div>
      {/if}
    </dl>
  </div>
</section>

<style>
  .grid {
    display: grid;
    grid-template-columns: 1fr minmax(220px, 0.6fr);
    gap: 18px;
    padding: 14px 16px 16px;
    background: var(--aw-panel);
  }

  .models {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 10px 12px 12px;
    border: 1px solid var(--aw-border-bright);
    border-radius: var(--radius);
  }

  legend {
    padding: 0 6px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--aw-copper);
  }

  .model {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    grid-template-areas:
      'radio name size installed'
      'radio usage size installed';
    column-gap: 12px;
    align-items: center;
    padding: 8px 10px;
    border: 1px solid var(--aw-border);
    border-radius: var(--radius);
    cursor: pointer;
  }

  .model.selected {
    border-color: var(--aw-gold);
    box-shadow: 0 0 12px var(--aw-gold-glow);
    background: var(--aw-panel-inset);
  }

  .model input {
    grid-area: radio;
    accent-color: var(--aw-gold);
  }

  .name {
    grid-area: name;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--aw-text);
  }

  .usage {
    grid-area: usage;
    font-size: 0.72rem;
    color: var(--aw-text-muted);
  }

  .size {
    grid-area: size;
    font-size: 0.72rem;
    color: var(--aw-text-muted);
    white-space: nowrap;
  }

  .installed {
    grid-area: installed;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid var(--aw-copper-dark);
    color: var(--aw-text-muted);
  }

  .installed[data-installed='true'] {
    color: var(--aw-bg);
    background: var(--aw-emerald);
    border-color: var(--aw-emerald);
  }

  .status {
    display: flex;
    flex-direction: column;
    margin: 0;
  }

  .status dt,
  .status dd {
    margin: 0;
  }

  .busy {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    color: var(--aw-gold);
  }
</style>
