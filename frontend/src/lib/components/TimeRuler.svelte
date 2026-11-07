<script lang="ts">
  import { rulerTicks } from '../module2/timeline.js';

  interface Props {
    start: number;
    end: number;
    divisions?: number;
  }

  let { start, end, divisions = 6 }: Props = $props();

  const ticks = $derived(rulerTicks(start, end, divisions));
</script>

<div class="ruler" data-testid="time-ruler">
  {#each ticks as t, i (i)}
    <span class="tick" style="left: {(i / divisions) * 100}%">{t.label}</span>
  {/each}
</div>

<style>
  .ruler {
    position: relative;
    height: 18px;
    border-bottom: 1px solid var(--aw-border-bright);
    font-size: 0.65rem;
    letter-spacing: 0.08em;
    color: var(--aw-text-muted);
  }

  .tick {
    position: absolute;
    bottom: 2px;
    transform: translateX(-50%);
    white-space: nowrap;
  }

  .tick::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -3px;
    width: 1px;
    height: 4px;
    background: var(--aw-copper);
  }

  .tick:first-child {
    transform: none;
  }

  .tick:last-child {
    transform: translateX(-100%);
  }
</style>
