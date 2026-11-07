<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { open } from '@tauri-apps/plugin-dialog';

  interface Props {
    pickFolder?: () => Promise<string | null>;
    onSaved?: ((settings: unknown) => void) | null;
  }

  // Sélecteur natif Windows par défaut ; un sélecteur peut être injecté (tests).
  const openFolderDialog = async () => open({ directory: true, multiple: false });

  let { pickFolder = openFolderDialog, onSaved = null }: Props = $props();

  let error = $state<string | null>(null);
  let busy = $state(false);

  // Pas de bouton de fermeture : le choix du dossier est obligatoire avant tout traitement (FR-016).
  async function choose() {
    error = null;
    busy = true;
    try {
      const path = await pickFolder();
      if (!path) return;
      const settings = await invoke('set_work_dir', { path });
      if (typeof onSaved === 'function') onSaved(settings);
    } catch (e) {
      error = (e as { message?: string })?.message ?? String(e);
    } finally {
      busy = false;
    }
  }
</script>

<div class="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono" role="dialog" aria-modal="true" aria-labelledby="workdir-title">
  <div class="aw-panel bg-stone-900 border-2 border-amber-700/80 rounded-2xl shadow-2xl p-5 max-w-md w-full flex flex-col gap-4 text-amber-100">
    <h2 id="workdir-title" class="font-bold text-xs uppercase tracking-widest text-amber-300 border-b border-amber-900/60 pb-2">DOSSIER DE TRAVAIL</h2>

    <p class="text-xs text-stone-300 leading-relaxed">
      Choisissez le dossier où seront enregistrés les stems et les modèles téléchargés. Ce choix est mémorisé entre les sessions.
    </p>

    <button
      type="button"
      data-testid="workdir-pick"
      onclick={choose}
      disabled={busy}
      class="aw-btn-steampunk bg-amber-700 hover:bg-amber-600 text-stone-950 font-bold text-xs uppercase tracking-wider rounded px-4 py-2 cursor-pointer disabled:opacity-50"
    >
      CHOISIR LE DOSSIER
    </button>

    {#if error}
      <p data-testid="workdir-error" role="alert" class="text-xs text-red-400">{error}</p>
    {/if}
  </div>
</div>
