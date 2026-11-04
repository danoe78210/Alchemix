<script lang="ts">
  import { camelotFromKeyName } from '../camelot.js';

  interface Props {
    isOpen?: boolean;
    deckLabel?: string;
    initialBpm?: string | number;
    initialKey?: string;
    keyConfidence?: number | null;
    onConfirm?: ((p: { bpm: number; key: string; title?: string; artist?: string }) => void) | null;
    onSave?: ((p: { bpm: number; key: string; title?: string; artist?: string }) => void) | null;
    onCancel?: () => void;
  }

  let {
    isOpen = true,
    deckLabel = 'PISTE',
    initialBpm = '',
    initialKey = '',
    keyConfidence = null,
    onConfirm = null,
    onSave = null,
    onCancel = null
  } = $props();

  let bpmInput = $state('');
  let keyInput = $state('');

  // Initialiser et synchroniser les entrées avec les props
  $effect(() => {
    bpmInput = String(initialBpm ?? '');
    keyInput = String(initialKey ?? '');
  });

  const bpmValue = $derived(parseFloat(bpmInput));
  const keyCode = $derived(camelotFromKeyName(keyInput));
  const bpmValid = $derived(Number.isFinite(bpmValue) && bpmValue >= 30 && bpmValue <= 300);
  const canSubmit = $derived(bpmValid && keyCode !== null);

  const camelotOptions = [
    '1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B',
    '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B',
    '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B'
  ];

  function submit() {
    if (!canSubmit) return;
    const payload = { bpm: bpmValue, key: keyCode as string };
    if (typeof onConfirm === 'function') onConfirm(payload);
    if (typeof onSave === 'function') onSave(payload);
  }
</script>

{#if isOpen}
  <div class="modal-backdrop fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-mono" data-testid="metadata-modal" role="dialog" aria-modal="true" aria-label="Métadonnées manquantes">
    <div class="aw-panel modal-panel bg-stone-900 border-2 border-amber-700/80 rounded-2xl shadow-2xl p-5 max-w-md w-full flex flex-col gap-4 text-amber-100">
      <div class="modal-header flex items-center justify-between border-b border-amber-900/60 pb-2">
        <div class="flex items-center gap-2">
          <span class="text-base text-amber-400">⚠️</span>
          <span class="aw-panel-title font-bold text-xs uppercase tracking-widest text-amber-300">MÉTADONNÉES MANQUANTES — {deckLabel}</span>
        </div>
        {#if onCancel}
          <button type="button" onclick={onCancel} class="text-stone-400 hover:text-red-400 text-xs font-bold uppercase cursor-pointer">✕</button>
        {/if}
      </div>

      <p class="modal-hint text-xs text-stone-300 leading-relaxed">
        Le BPM et/ou la Tonalité (Clé Camelot) n'ont pas pu être extraits des tags ID3 ou de l'analyse DSP. Veuillez vérifier ou renseigner les valeurs :
      </p>

      <!-- Champ BPM -->
      <label class="modal-field flex flex-col gap-1">
        <span class="modal-label text-[10px] font-bold uppercase tracking-wider text-amber-500">BPM (ex: 134.4)</span>
        <input
          data-testid="modal-bpm-input"
          class="modal-input bg-stone-950 border border-amber-900/60 rounded px-3 py-2 text-sm text-amber-200 font-bold focus:border-amber-500 focus:outline-none"
          type="text"
          inputmode="decimal"
          placeholder="134.4"
          bind:value={bpmInput}
        />
      </label>

      <!-- Champ Clé Camelot (Saisie Texte + Dropdown Select) -->
      <label class="modal-field flex flex-col gap-1">
        <span class="modal-label text-[10px] font-bold uppercase tracking-wider text-amber-500">TONALITÉ / CLÉ CAMELOT (ex: 12A ou C#m)</span>
        
        <div class="flex gap-2">
          <!-- Input texte direct (data-testid="modal-key-input") -->
          <input
            data-testid="modal-key-input"
            class="modal-input flex-1 bg-stone-950 border border-amber-900/60 rounded px-3 py-2 text-sm text-amber-200 font-bold focus:border-amber-500 focus:outline-none"
            type="text"
            placeholder="12A"
            bind:value={keyInput}
          />

          <!-- Sélecteur liste déroulante (data-testid="modal-key-select") -->
          <select
            data-testid="modal-key-select"
            class="modal-select bg-stone-950 border border-amber-900/60 rounded px-2 py-2 text-xs text-amber-200 font-bold focus:border-amber-500 focus:outline-none cursor-pointer"
            bind:value={keyInput}
          >
            <option value="">-- Choisir --</option>
            {#each camelotOptions as opt}
              <option value={opt}>{opt}</option>
            {/each}
          </select>
        </div>
      </label>

      {#if keyConfidence != null}
        <span class="modal-warning text-[11px] text-amber-300 font-semibold" data-testid="modal-key-warning">
          Confiance de la tonalité détectée : {keyConfidence.toFixed(1)} %. Vérifiez ou corrigez la clé.
        </span>
      {/if}

      {#if keyInput.trim() !== '' && keyCode === null}
        <span class="modal-error text-[11px] text-red-400 font-semibold" data-testid="modal-key-error">
          Clé invalide — utilisez un code Camelot (ex: 12A) ou une note musicale (ex: C#m).
        </span>
      {/if}

      <!-- Boutons de validation (data-testid="modal-confirm" & data-testid="modal-confirm-btn") -->
      <div class="flex items-center gap-3 mt-2">
        <button
          type="button"
          class="aw-btn-steampunk modal-confirm w-full py-2.5 text-xs font-bold uppercase tracking-wider rounded border bg-gradient-to-b from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-100 border-amber-500/80 shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="modal-confirm"
          disabled={!canSubmit}
          onclick={submit}
        >
          ✔ VALIDER ET INSÉRER LA CASSETTE
        </button>

        <button
          type="button"
          class="hidden"
          data-testid="modal-confirm-btn"
          disabled={!canSubmit}
          onclick={submit}
        >
          ✔ VALIDER
        </button>
      </div>
    </div>
  </div>
{/if}
