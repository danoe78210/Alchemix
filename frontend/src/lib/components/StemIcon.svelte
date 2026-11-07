<script lang="ts">
  type StemId = 'vocals' | 'drums' | 'bass' | 'other';

  interface Props {
    stem: StemId;
    color: string;
  }

  let { stem, color }: Props = $props();

  // Nom en anglais, compréhensible sans texte français à côté de l'icône.
  const NAMES: Record<StemId, string> = { vocals: 'Vocals', drums: 'Drums', bass: 'Bass', other: 'Other' };
</script>

<svg
  data-testid="icon-{stem}"
  role="img"
  aria-label={NAMES[stem]}
  viewBox="0 0 24 24"
  width="28"
  height="28"
  fill="none"
  stroke={color}
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  class="shrink-0 drop-shadow-[0_0_4px_rgba(255,255,255,0.15)]"
>
  {#if stem === 'vocals'}
    <!-- Microphone -->
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5V21" />
    <path d="M8.5 21h7" />
  {:else if stem === 'drums'}
    <!-- Tambour et baguettes -->
    <ellipse cx="12" cy="13" rx="7.5" ry="3" />
    <path d="M4.5 13v3.5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V13" />
    <path d="M7 3.5l3.5 6.5" />
    <path d="M17 3.5l-3.5 6.5" />
  {:else if stem === 'bass'}
    <!-- Haut-parleur grave -->
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.2" />
  {:else}
    <!-- Note de musique -->
    <path d="M9 17.5V5l11-2v12.5" />
    <circle cx="6" cy="17.5" r="3" />
    <circle cx="17" cy="15.5" r="3" />
  {/if}
</svg>
