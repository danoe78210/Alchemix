<script lang="ts">
  import { mixAdvice } from '../mixAdvice.js';

  let { gatekeeper = 'NO-GO', compat = null, timeStretchPercent = 0 } = $props<{
    gatekeeper?: string;
    compat?: { rule: string; shift: number } | null;
    timeStretchPercent?: number;
  }>();

  const advice = $derived(mixAdvice({ gatekeeper, compat, timeStretchPercent }));

  const toneIcon = { ok: '✓', action: '➔', warn: '⚠' };
  const toneClass = { ok: 'text-accent-emerald-candidate', action: 'text-accent-amber-master', warn: 'text-status-hazard' };
</script>

<div data-testid="mix-advisor" class="mix-advisor mt-2 w-full shrink-0 bg-bg-bezel-glass rounded p-space-md flex flex-col gap-2 shadow-[inset_0_3px_12px_rgba(0,0,0,0.95)]">
  <div class="flex items-center gap-1">
    <span class="text-[14px] leading-none text-text-copper" aria-hidden="true">◈</span>
    <span class="font-label-sm text-[12px] text-text-copper font-bold uppercase tracking-wider">CONSEILS DE MIX</span>
  </div>

  {#if advice.length === 0}
    <p data-testid="mix-advisor-locked" class="px-0.5 font-label-sm text-[12px] text-text-muted">
      Gate verrouillé : aucun conseil tant que la transition est refusée.
    </p>
  {:else}
    <ul class="flex flex-col gap-2 px-0.5">
      {#each advice as item (item.id)}
        <li data-testid="mix-advisor-item" class="flex items-start gap-2 font-label-sm text-[12px] text-text-main">
          <span class="shrink-0 font-bold {toneClass[item.tone]}" aria-hidden="true">{toneIcon[item.tone]}</span>
          <span>{item.text}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>
