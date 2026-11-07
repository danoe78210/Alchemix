<script lang="ts">
  interface Props {
    peak: number;
    rms: number;
  }

  let { peak, rms }: Props = $props();

  function dbfs(x: number): string {
    return x > 0 ? (20 * Math.log10(x)).toFixed(1) : '-∞';
  }

  // Échelle du bargraphe : −60 dBFS (vide) à 0 dBFS (plein), sur la crête.
  function pct(x: number): number {
    if (x <= 0) return 0;
    return Math.round(Math.min(1, Math.max(0, (20 * Math.log10(x) + 60) / 60)) * 100);
  }
</script>

<section class="aw-panel master" aria-label="Sortie master">
  <div class="row">
    <span class="title">Sortie master</span>
    <span class="readout aw-led" data-testid="level-readout">
      crête {dbfs(peak)} dBFS · RMS {dbfs(rms)} dBFS
    </span>
  </div>
  <div class="aw-meter-track big">
    <div class="aw-meter-fill" data-testid="master-meter" style="width: {pct(peak)}%"></div>
  </div>
</section>

<style>
  .master {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 16px 16px;
  }

  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .title {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--aw-copper);
  }

  .readout {
    font-size: 0.8rem;
  }

  .big {
    height: 14px;
  }
</style>
