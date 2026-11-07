<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';

  type StemId = 'vocals' | 'drums' | 'bass' | 'other';

  interface WorkspaceCheck {
    writable: boolean;
    free_bytes: number;
    required_bytes: number;
    ok: boolean;
  }

  interface Props {
    requiredBytes?: number;
    onExport: (stems: StemId[]) => void;
    onCancel?: (() => void) | null;
  }

  let { requiredBytes = 0, onExport, onCancel = null }: Props = $props();

  const STEMS: { id: StemId; label: string }[] = [
    { id: 'vocals', label: 'Voix' },
    { id: 'drums', label: 'Batterie' },
    { id: 'bass', label: 'Basse' },
    { id: 'other', label: 'Autres' }
  ];

  let selected = $state<StemId[]>([]);
  let error = $state<string | null>(null);
  let busy = $state(false);

  const canSubmit = $derived(selected.length > 0 && !busy);

  // Liste vide refusée côté interface (contrat §3.5) ; l'espace et l'accès sont vérifiés avant l'écriture (FR-018).
  async function submit() {
    if (!canSubmit) return;
    error = null;
    busy = true;
    try {
      const check = await invoke<WorkspaceCheck>('check_workspace', { requiredBytes });
      if (!check.ok) {
        error = check.writable
          ? 'Espace disque insuffisant pour les stems sélectionnés.'
          : 'Dossier de travail inaccessible en écriture.';
        return;
      }
      onExport(STEMS.map((s) => s.id).filter((id) => selected.includes(id)));
    } catch (e) {
      error = (e as { message?: string })?.message ?? String(e);
    } finally {
      busy = false;
    }
  }
</script>

<div class="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono" role="dialog" aria-modal="true" aria-labelledby="export-title">
  <div class="aw-panel bg-stone-900 border-2 border-amber-700/80 rounded-2xl shadow-2xl p-5 max-w-md w-full flex flex-col gap-4 text-amber-100">
    <h2 id="export-title" class="font-bold text-xs uppercase tracking-widest text-amber-300 border-b border-amber-900/60 pb-2">EXPORT DES STEMS</h2>

    <fieldset class="flex flex-col gap-2">
      <legend class="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">Stems à écrire</legend>
      {#each STEMS as stem (stem.id)}
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" value={stem.id} bind:group={selected} class="accent-amber-500" />
          <span>{stem.label}</span>
        </label>
      {/each}
    </fieldset>

    {#if error}
      <p data-testid="export-error" role="alert" class="text-xs text-red-400">{error}</p>
    {/if}

    <div class="flex justify-end gap-2">
      {#if onCancel}
        <button type="button" data-testid="export-cancel" onclick={onCancel} class="text-stone-400 hover:text-red-400 text-xs font-bold uppercase cursor-pointer px-3 py-2">ANNULER</button>
      {/if}
      <button
        type="button"
        data-testid="export-submit"
        onclick={submit}
        disabled={!canSubmit}
        class="aw-btn-steampunk bg-amber-700 hover:bg-amber-600 text-stone-950 font-bold text-xs uppercase tracking-wider rounded px-4 py-2 cursor-pointer disabled:opacity-50"
      >
        EXPORTER
      </button>
    </div>
  </div>
</div>
