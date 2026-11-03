<script lang="ts">
  interface Metadata {
    title?: string;
    artist?: string;
    album?: string;
    year?: string | number;
    genre?: string;
    bitrate?: string | number;
    sample_rate?: string | number;
    channels?: number;
    duration?: number;
    loudness?: number | null;
  }

  interface Props {
    metadata?: Metadata;
    fileName?: string | null;
    coverUrl?: string | null;
    isAnalyzing?: boolean;
    isFetchingOnline?: boolean;
    deckLabel?: string;
    variant?: 'amber' | 'emerald';
  }

  let {
    metadata = {},
    fileName = null,
    coverUrl = null,
    isAnalyzing = false,
    isFetchingOnline = false,
    deckLabel = 'PISTE',
    variant = 'amber'
  } = $props();

  const isAmber = $derived(variant === 'amber');
  const deckletter = $derived(isAmber ? 'A' : 'B');

  const title = $derived.by(() => {
    if (metadata.title) return metadata.title;
    if (!fileName) return '—';
    const clean = fileName.replace(/\.[^/.]+$/, '');
    const parts = clean.split(/\s*-\s*/);
    return parts.length >= 2 ? parts.slice(1).join(' - ').trim() : clean;
  });

  const artist = $derived.by(() => {
    if (metadata.artist) return metadata.artist;
    if (!fileName) return '—';
    const clean = fileName.replace(/\.[^/.]+$/, '');
    const parts = clean.split(/\s*-\s*/);
    return parts.length >= 2 ? parts[0].trim() : 'Artiste Inconnu';
  });

  const album = $derived(metadata.album || '—');
  const year = $derived(metadata.year ? String(metadata.year) : '—');

  function formatDuration(seconds: unknown) {
    const total = Math.round(Number(seconds));
    if (!Number.isFinite(total) || total <= 0) return '—';
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = String(total % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
  }

  function formatBitrate(bitrate: unknown) {
    const text = String(bitrate ?? '');
    const kbps = /(\d+)\s*kbps/.exec(text);
    if (kbps) return `${kbps[1]} kbit/s${text.includes('VBR') ? ' VBR' : ''}`;
    return text === 'VBR' ? 'VBR' : '—';
  }

  function formatLoudness(lufs: unknown) {
    return typeof lufs === 'number' && Number.isFinite(lufs) ? `${lufs.toFixed(1)} LUFS` : '—';
  }

  function formatSampleRate(hz: unknown) {
    const n = Number(hz);
    if (!Number.isFinite(n) || n <= 0) return '—';
    return `${(n / 1000).toFixed(1).replace('.', ',')} kHz`;
  }

  function formatChannels(count: unknown) {
    const n = Number(count);
    if (!Number.isFinite(n) || n <= 0) return '—';
    if (n === 1) return 'Mono';
    if (n === 2) return 'Stéréo';
    if (n === 6) return '5.1';
    return `${n} canaux`;
  }

  const format = $derived(fileName && fileName.includes('.') ? fileName.split('.').pop()!.toUpperCase() : '—');

  const statusText = $derived.by(() => {
    if (isAnalyzing) return 'Analyse du fichier audio en cours — patientez…';
    if (isFetchingOnline) return 'Recherche des métadonnées en ligne — patientez…';
    return null;
  });

  const sourceBadge = $derived(
    metadata.title || metadata.artist ? 'TAG ID3' : fileName ? 'NOM FICHIER' : 'EN ATTENTE'
  );
</script>

{#snippet spec(label: string, value: string, testid: string, wide: boolean = false)}
  <div
    class="flex flex-col min-w-0 border-l-2 pl-2 {wide ? 'col-span-2' : ''} {isAmber
      ? 'border-accent-amber-master/60'
      : 'border-accent-emerald-candidate/60'}"
  >
    <span class="font-label-sm text-[11px] uppercase tracking-wider text-text-muted">{label}</span>
    <span
      data-testid={testid}
      class="font-label-sm text-[13px] font-bold truncate {isAmber ? 'text-accent-amber-glow' : 'text-secondary'}"
    >
      {value}
    </span>
  </div>
{/snippet}

<div class="id3-card-container bg-bg-panel rounded p-space-md flex flex-col gap-space-sm shadow-[0_8px_20px_rgba(0,0,0,0.85)]">
  <!-- En-tête de l'archive -->
  <div class="flex items-center justify-between">
    <span class="font-label-sm text-[12px] text-text-copper tracking-widest uppercase">
      ID3 METADATA ARCHIVE — {deckLabel}
    </span>
    <span
      class="font-label-sm text-[12px] px-1.5 py-0.5 rounded bg-surface-container-lowest font-bold uppercase {isAmber
        ? 'text-accent-amber-master'
        : 'text-accent-emerald-candidate'}"
    >
      {sourceBadge}
    </span>
  </div>

  {#if statusText}
    <div
      role="status"
      aria-live="polite"
      class="flex items-center gap-2 px-2.5 py-1.5 rounded bg-surface-container-lowest border border-border-copper/40"
    >
      <span
        class="w-3 h-3 shrink-0 rounded-full border-2 border-t-transparent animate-spin {isAmber
          ? 'border-accent-amber-master'
          : 'border-accent-emerald-candidate'}"
        aria-hidden="true"
      ></span>
      <span class="font-label-sm text-[12px] text-text-main">{statusText}</span>
    </div>
  {/if}

  <!-- Pochette et identité du morceau -->
  <div class="flex gap-space-md">
    <!-- Pochette d'album 144x144 encadrée laiton -->
    <div
      class="relative w-36 h-36 shrink-0 rounded p-1.5 bg-gradient-to-b shadow-[0_4px_12px_rgba(0,0,0,0.9)] {isAmber
        ? 'from-[#C87D55] via-[#8C4A27] to-[#3A2218]'
        : 'from-[#00E676] via-[#00622E] to-[#121316]'}"
    >
      {#if coverUrl}
        <img
          data-testid="id3-cover"
          src={coverUrl}
          alt="Pochette de l'album"
          class="cover-img rounded-md w-full h-full object-cover bg-surface-container-lowest"
        />
      {:else}
        <div
          data-testid="id3-cover-fallback"
          class="w-full h-full rounded flex flex-col items-center justify-center bg-surface-container-lowest text-text-muted"
        >
          <svg class="w-14 h-14 {isAmber ? 'text-[#8C4A27]' : 'text-[#00622E]'}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5" />
            <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="1" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
          <span class="font-label-sm text-[11px] text-text-muted mt-1 uppercase">Pas de visuel</span>
        </div>
      {/if}
      <div
        class="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center {isAmber
          ? 'bg-accent-amber-master/90 shadow-[0_0_8px_#FFB300]'
          : 'bg-accent-emerald-candidate shadow-[0_0_8px_#00E676]'}"
      >
        <span class="font-label-sm text-[12px] font-bold {isAmber ? 'text-on-primary' : 'text-on-secondary'}">{deckletter}</span>
      </div>
    </div>

    <div class="flex flex-col justify-center min-w-0 flex-1">
      <span class="font-headline-sm text-[20px] leading-tight truncate {isAmber ? 'text-accent-amber-glow' : 'text-secondary'}">{title}</span>
      <span class="font-body-md text-[16px] text-text-main font-semibold truncate">{artist}</span>
      <div class="font-body-sm text-[14px] text-text-muted truncate">
        <span>{album}</span>
        {#if year !== '—'}<span> ({year})</span>{/if}
      </div>
    </div>
  </div>

  <!-- Fiche technique -->
  <div class="grid grid-cols-2 gap-x-4 gap-y-2.5 bg-bg-bezel-glass rounded p-3 shadow-[inset_0_1px_4px_rgba(0,0,0,0.8)]">
    {@render spec('Durée', formatDuration(metadata.duration), 'meta-duration')}
    {@render spec('Format', format, 'meta-format')}
    {@render spec('Genre', metadata.genre || '—', 'meta-genre', true)}
    {@render spec('Débit', formatBitrate(metadata.bitrate), 'meta-bitrate')}
    {@render spec('Niveau sonore', formatLoudness(metadata.loudness), 'meta-loudness')}
    {@render spec('Fréq. échant.', formatSampleRate(metadata.sample_rate), 'meta-sample-rate')}
    {@render spec('Canaux', formatChannels(metadata.channels), 'meta-channels')}
  </div>
</div>
