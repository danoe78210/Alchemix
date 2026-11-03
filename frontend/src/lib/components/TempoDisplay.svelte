<script lang="ts">
  import { keyInfo } from '../camelot.js';

  interface Props {
    bpm?: number | null;
    confidence?: number | null;
    tempoType?: string | null;
    gridNudgeMs?: number;
    bpmData?: any;
    trackLabel?: string;
    camelotKey?: string | null;
    variant?: 'amber' | 'emerald';
  }

  let {
    bpm = null,
    confidence = null,
    tempoType = null,
    gridNudgeMs = 0,
    bpmData = null,
    trackLabel = 'PISTE',
    camelotKey = null,
    variant = 'amber'
  } = $props();

  const isAmber = $derived(variant === 'amber');

  const bpmValue = $derived(bpm ?? bpmData?.bpm ?? null);
  const bpmVal = $derived(bpmValue != null ? Number(bpmValue).toFixed(2) : '---.--');
  const confidenceVal = $derived(confidence ?? bpmData?.confidence ?? null);
  const type = $derived(tempoType ?? bpmData?.type ?? null);

  const info = $derived(camelotKey ? keyInfo(camelotKey) : null);

  const confidenceLabel = $derived.by(() => {
    if (confidenceVal >= 97) return 'ULTRA-PRECISION';
    if (confidenceVal >= 90) return 'HIGH-FIDELITY';
    return 'STANDARD';
  });
</script>

<div class="tempo-panel bg-bg-bezel-glass rounded p-space-sm flex flex-col gap-space-xs shadow-[inset_0_3px_12px_rgba(0,0,0,0.95)]">
  <!-- En-tête télémétrie -->
  <div class="tempo-header flex items-center justify-between">
    <span class="font-label-sm text-label-sm text-text-copper tracking-widest uppercase">
      TEMPO &amp; KEY TELEMETRY ({trackLabel})
    </span>
    <span
      class="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-high font-bold {isAmber ? 'text-accent-amber-master' : 'text-secondary'}"
    >
      {bpmValue != null ? 'LOCKED' : 'STANDBY'}
    </span>
  </div>

  <!-- Afficheur LED BPM + clé Camelot -->
  <div class="flex items-baseline justify-between py-1 border-b border-border-copper/30">
    <div class="flex flex-col">
      <div class="flex items-baseline gap-1">
        <span
          class="bpm-number font-display-md text-display-md {isAmber
            ? 'text-accent-amber-master drop-shadow-[0_0_12px_rgba(255,179,0,0.45)]'
            : 'text-accent-emerald-candidate drop-shadow-[0_0_10px_rgba(0,230,118,0.4)]'}"
        >
          {bpmVal}
        </span>
        <span class="bpm-unit font-label-sm text-label-sm text-text-muted">BPM</span>
      </div>
      <span class="font-label-sm text-label-sm text-text-muted">
        {isAmber ? 'BPM TARGET MASTER' : 'BPM CANDIDATE FEED'}
      </span>
    </div>
    <div class="flex flex-col items-end">
      <div
        class="px-2.5 py-0.5 rounded bg-surface-container-highest {isAmber
          ? 'shadow-[0_0_12px_rgba(255,179,0,0.3)]'
          : 'shadow-[0_0_10px_rgba(0,230,118,0.3)]'}"
      >
        <span
          data-testid="telemetry-key"
          class="font-headline-lg text-headline-lg font-bold tracking-wider {isAmber ? 'text-accent-amber-master' : 'text-accent-emerald-candidate'}"
        >
          {camelotKey || '--'}
        </span>
      </div>
      <span class="font-label-sm text-label-sm mt-0.5 {isAmber ? 'text-text-copper' : 'text-secondary'}">
        {info ? info.fullName : 'Clé indéterminée'}
      </span>
    </div>
  </div>

  <!-- Confiance de détection + profil de grille -->
  <div class="flex flex-col gap-1 bg-surface-container-lowest p-1.5 rounded">
    <div class="flex items-center justify-between font-label-sm text-label-sm">
      <span class="text-text-muted">DETECTION CONFIDENCE</span>
      <span data-testid="tempo-confidence" class="font-bold {isAmber ? 'text-accent-amber-master' : 'text-accent-emerald-candidate'}">
        {confidenceVal == null ? '—' : `${confidenceVal.toFixed(1)}% ${confidenceLabel}`}
      </span>
    </div>
    <div class="progress-bar w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
      <div
        class="progress-fill h-full rounded-full bg-gradient-to-r {isAmber
          ? 'from-[#8C4A27] via-accent-amber-master to-accent-amber-glow shadow-[0_0_8px_#FFB300]'
          : 'from-[#00622E] via-accent-emerald-candidate to-accent-emerald-glow shadow-[0_0_8px_#00E676]'}"
        style="width: {Math.max(0, Math.min(100, confidenceVal ?? 0))}%;"
      ></div>
    </div>
    <div class="flex items-center justify-between font-label-sm text-label-sm pt-0.5">
      <span class="text-text-muted">GRID PROFILE</span>
      <span class="text-text-main font-bold">
        {type === 'FIXED_ELECTRONIC' ? 'ELECTRONIC (FIXED STEADY)' : type === 'LIVE_DRUMS' ? 'LIVE DRUMS (VARIABLE)' : '—'}
      </span>
    </div>
  </div>
</div>
