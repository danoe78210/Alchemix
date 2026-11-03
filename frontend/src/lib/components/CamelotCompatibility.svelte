<script lang="ts">
  import { keyInfo, compatibleCodes, badgeLabel } from '../camelot.js';

  interface Props {
    compatibilityScore?: number;
    ruleApplied?: string;
    gatekeeper?: string;
    goForStemSeparation?: boolean;
    suggestedPitchShift?: number;
    timeStretchPercent?: number;
    sourceCamelot?: string;
    targetCamelot?: string;
    sourceBpm?: number | null;
    targetBpm?: number | null;
    targetBpmSession?: number | null;
    onHalveTargetBpm?: () => void;
    onToggleRelative?: () => void;
    keyA?: string | null;
    keyB?: string | null;
    bpmA?: number | null;
    bpmB?: number | null;
  }

  let {
    compatibilityScore = 0,
    ruleApplied = '',
    gatekeeper = 'NO-GO',
    goForStemSeparation = false,
    suggestedPitchShift = 0,
    timeStretchPercent = 0,
    sourceCamelot = '8B',
    targetCamelot = '8B',
    sourceBpm = null,
    targetBpm = null,
    targetBpmSession = null,
    onHalveTargetBpm = undefined,
    onToggleRelative = undefined,
    keyA = null,
    keyB = null,
    bpmA = null,
    bpmB = null
  } = $props();

  const srcKey = $derived(keyA || sourceCamelot || '8B');
  const tgtKey = $derived(keyB || targetCamelot || '8B');
  const srcInfo = $derived(keyInfo(srcKey));
  const tgtInfo = $derived(keyInfo(tgtKey));

  const effectiveTargetBpm = $derived(targetBpmSession ?? targetBpm ?? bpmB ?? 120);

  const isGo = $derived(gatekeeper === 'GO' || compatibilityScore >= 60);

  const relativeLabel = $derived.by(() => {
    const info = tgtInfo;
    if (!info) return '12B ↔ 12A';
    return `${info.code} ↔ ${info.relativeCode}`;
  });

  const compatList = $derived.by(() => {
    const codes = compatibleCodes(srcKey);
    return codes.map((c) => ({
      code: c,
      label: badgeLabel(c)
    }));
  });
</script>

<div class="camelot-compat-panel w-full bg-bg-bezel-glass rounded p-space-sm flex flex-col gap-1 shadow-[inset_0_3px_12px_rgba(0,0,0,0.95)]">
  <!-- En-tête Gatekeeper + score de consonance -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-1">
      <span class="text-[14px] leading-none {isGo ? 'text-accent-emerald-candidate' : 'text-status-destructive'}" aria-hidden="true">
        {isGo ? '✓' : '✗'}
      </span>
      <span class="font-label-sm text-label-sm text-text-main font-bold uppercase">HARMONIC GATEKEEPER</span>
    </div>
    <div class="flex items-baseline gap-1 font-label-md text-label-md font-bold {isGo ? 'text-accent-emerald-candidate' : 'text-status-hazard'}">
      <span data-testid="consonance-score">{compatibilityScore}%</span>
      <span>CONSONANCE</span>
    </div>
  </div>

  <!-- Vumètre de consonance -->
  <div class="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
    <div
      class="h-full rounded-full transition-all duration-300 bg-gradient-to-r {isGo
        ? 'from-[#00622E] via-accent-emerald-candidate to-accent-emerald-glow shadow-[0_0_8px_#00E676]'
        : 'from-[#542101] via-status-hazard to-accent-amber-glow shadow-[0_0_8px_#FF9100]'}"
      style="width: {Math.max(0, Math.min(100, compatibilityScore))}%;"
    ></div>
  </div>

  <!-- Verdict physique du portail -->
  <div class="p-1.5 rounded bg-surface-container-lowest flex items-center justify-between shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
    <div class="flex items-center gap-1.5">
      <span class="text-[13px] leading-none {isGo ? 'text-accent-emerald-candidate' : 'text-status-destructive'}" aria-hidden="true">
        {isGo ? '🔓' : '🔒'}
      </span>
      <span class="font-label-md text-label-md font-bold tracking-wider {isGo ? 'text-accent-emerald-candidate' : 'text-status-destructive'}">
        {isGo ? 'GO — GATE UNLOCKED' : 'NO-GO — GATE LOCKED'}
      </span>
    </div>
    <span class="font-label-sm text-label-sm px-1 py-0.5 rounded bg-surface-container font-bold {isGo ? 'text-secondary' : 'text-error'}">
      {isGo ? 'VALIDÉ' : 'REFUSÉ'}
    </span>
  </div>

  <!-- Transition détectée -->
  <div class="flex items-center justify-between px-0.5">
    <span data-testid="rule-applied" class="font-label-sm text-label-sm text-text-main font-bold truncate">
      {ruleApplied || 'WAITING FOR TRACKS (0/2)'}
    </span>
    {#if srcInfo && tgtInfo}
      <div class="flex items-center gap-1 font-label-sm text-label-sm text-text-muted shrink-0">
        <span data-testid="key-camelot-code" class="font-bold text-accent-amber-master">{srcInfo.code}</span>
        <span data-testid="key-full-name" class="text-text-muted">({srcInfo.noteFr})</span>
        <span aria-hidden="true">➔</span>
        <span data-testid="key-info" class="font-bold text-accent-emerald-candidate">{tgtInfo.code} ({tgtInfo.noteFr})</span>
      </div>
    {/if}
  </div>

  <!-- Alerte WARP HAZARD (>15 % de time-stretch) -->
  {#if Math.abs(timeStretchPercent) > 15}
    <div
      data-testid="warp-hazard"
      class="warp-hazard-alert p-1.5 rounded bg-surface-container-lowest border border-status-hazard/60 flex items-center justify-between gap-2"
    >
      <div class="flex items-center gap-1.5 font-label-sm text-label-sm font-bold text-status-hazard">
        <span class="animate-pulse" aria-hidden="true">⚠</span>
        <span>WARP HAZARD ({timeStretchPercent > 0 ? '+' : ''}{timeStretchPercent.toFixed(1)}%)</span>
      </div>
      {#if onHalveTargetBpm}
        <button
          type="button"
          data-testid="halve-target-bpm"
          onclick={onHalveTargetBpm}
          class="flex items-center justify-center gap-1 px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest shadow-[0_2px_4px_rgba(0,0,0,0.5)] text-text-copper active:translate-y-[1px] transition-all cursor-pointer border border-border-copper/40 font-label-sm text-label-sm uppercase font-bold tracking-wider"
        >
          ÷2 TEMPO CIBLE ({(effectiveTargetBpm / 2).toFixed(1)} BPM)
        </button>
      {/if}
    </div>
  {/if}

  <!-- Interrupteurs tactiles : bascule relative Majeur/Mineur -->
  {#if onToggleRelative}
    <div class="grid grid-cols-1 gap-space-xs pt-0.5">
      <button
        type="button"
        data-testid="toggle-relative-mode"
        onclick={onToggleRelative}
        title="Bascule la clé de la Piste B entre Majeur et Mineur relatif (même numéro, lettre opposée)"
        class="flex items-center justify-center gap-1 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest shadow-[0_2px_4px_rgba(0,0,0,0.5)] text-text-copper active:translate-y-[1px] transition-all cursor-pointer border border-border-copper/40 font-label-sm text-label-sm uppercase font-bold tracking-wider"
      >
        ⇄ RELATIF {relativeLabel}
      </button>
    </div>
  {/if}

  <!-- Badges des clés compatibles avec la piste Master -->
  <div data-testid="compat-badges" class="compat-badges-container flex flex-wrap gap-1 pt-0.5">
    {#each compatList as b}
      <span
        data-testid="compat-badge"
        class="px-1.5 py-0.5 font-label-sm text-label-sm font-bold rounded border transition-all {b.code === tgtKey
          ? 'bg-surface-container text-accent-emerald-candidate border-accent-emerald-candidate/50 shadow-[0_0_6px_rgba(0,230,118,0.3)]'
          : 'bg-surface-container-lowest text-[#29B6F6] border-[#29B6F6]/30'}"
      >
        {b.code} · {b.label}
      </span>
    {/each}
  </div>
</div>
