<script lang="ts">
  interface Props {
    deckId?: 'A' | 'B';
    label?: string;
    file?: File | string | null;
    onLoadTrack?: () => void;
    onEjectTrack?: () => void;
    isAnalyzing?: boolean;
    isPlaying?: boolean;
    progress?: number;
    onPlay?: () => void;
    onStop?: () => void;
    title?: string | null;
    artist?: string | null;
    currentTime?: number;
    duration?: number;
  }

  let {
    deckId = 'A',
    label = 'DECK',
    file = null,
    onLoadTrack,
    onEjectTrack,
    isAnalyzing = false,
    isPlaying = false,
    progress = 0,
    onPlay,
    onStop,
    title = null,
    artist = null,
    currentTime = 0,
    duration = 0
  } = $props();

  const isLoaded = $derived(file !== null);
  const isAmber = $derived(deckId === 'A');
  const isSpinning = $derived(isAnalyzing || isPlaying);
  // Couleurs des molettes selon la charte : ambre pour le deck A, émeraude pour le deck B
  const hub = $derived(isAmber ? { ring: '#FFB300', edge: '#8C5A00' } : { ring: '#00E676', edge: '#005226' });
  // Largeur / hauteur d'une cassette audio réelle (100 : 63)
  const CASSETTE_RATIO = 1.587;
  // Rayons des paquets de bande, en % de la largeur. L'aire de bande est proportionnelle
  // à la longueur restante : la bobine gauche se vide et la droite se remplit
  const R_FULL = 20;
  const R_HUB = 11;
  const packRadius = (fraction: number) => Math.sqrt(R_HUB ** 2 + (R_FULL ** 2 - R_HUB ** 2) * fraction);
  const clampedProgress = $derived(Math.min(1, Math.max(0, progress)));
  const leftRadius = $derived(packRadius(1 - clampedProgress));
  const rightRadius = $derived(packRadius(clampedProgress));

  // Repères blancs sur l'anneau du moyeu : un disque uni ne montre pas sa rotation
  const HUB_DOTS = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * Math.PI) / 6;
    return { x: (39 * Math.cos(angle)).toFixed(2), y: (39 * Math.sin(angle)).toFixed(2) };
  });

  const sleeveTitleSize = $derived(trackName && trackName.length > 30 ? '3.6cqw' : '4.4cqw');

  const trackName = $derived.by(() => {
    if (title && artist) return `${artist} - ${title}`;
    if (title) return title;
    if (!file) return null;
    if (typeof file === 'object' && file && 'name' in file) {
      return (file as File).name.replace(/\.[^/.]+$/, '');
    }
    return String(file).split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || null;
  });

  const formattedTime = $derived.by(() => {
    if (!isLoaded) return '--:--';
    const totalSecs = Math.floor(Math.max(0, currentTime));
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });
</script>

<div class="cassette-deck w-full" aria-label="Lecteur de cassettes {label}">
  <div class="cassette-panel relative bg-bg-panel rounded p-space-md flex flex-col gap-space-sm shadow-[0_8px_20px_rgba(0,0,0,0.85)]">
    <!-- Bandeau titre du morceau (étiquette néon rétro) -->
    <div class="w-full flex items-center justify-between gap-2 px-2 py-1 rounded bg-bg-bezel-glass border border-border-copper/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.9)]">
      <div class="flex items-center gap-1.5 truncate">
        <span class="text-[12px] leading-none {isAmber ? 'text-accent-amber-master' : 'text-accent-emerald-candidate'}" aria-hidden="true">◉</span>
        {#if isLoaded}
          <span class="tape-title font-label-sm text-label-sm uppercase tracking-wider font-bold truncate {isAmber ? 'text-accent-amber-glow' : 'text-secondary'}">
            CASSETTE CHARGÉE
          </span>
        {:else}
          <span
            data-testid="deck-insert-tape"
            class="tape-title-empty font-label-sm text-label-sm uppercase tracking-wider font-semibold text-text-muted animate-pulse"
          >
            INSÉRER CASSETTE
          </span>
        {/if}
      </div>
      <span
        class="deck-badge font-label-sm text-label-sm px-1.5 py-0.5 bg-surface-container-high rounded font-bold border border-border-copper/50 whitespace-nowrap {isAmber
          ? 'text-accent-amber-master shadow-[0_0_6px_#FFB300]'
          : 'text-secondary shadow-[0_0_6px_#00E676]'}"
      >
        DECK {deckId}
      </span>
    </div>

    <!-- Ligne de statut -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-space-xs">
        <span
          class="w-2 h-2 rounded-full {isLoaded
            ? isAmber
              ? 'bg-accent-amber-master shadow-[0_0_8px_#FFB300] animate-pulse'
              : 'bg-accent-emerald-candidate shadow-[0_0_8px_#00E676] animate-pulse'
            : 'bg-surface-container-highest'}"
        ></span>
        <span class="font-label-sm text-label-sm tracking-widest uppercase font-bold {isAmber ? 'text-accent-amber-master' : 'text-accent-emerald-candidate'}">
          {label}
        </span>
      </div>
      <span class="font-label-sm text-label-sm text-text-muted bg-surface-container-lowest px-1.5 py-0.5 rounded">
        TAPE FEED #{deckId === 'A' ? '01' : '02'}
      </span>
    </div>

    <!-- Cassette : façade réaliste au ratio 1,587:1 -->
    <div
      data-testid="cassette"
      style="aspect-ratio: {CASSETTE_RATIO} / 1; container-type: inline-size;"
      class="cassette-body relative w-full rounded-md overflow-hidden bg-gradient-to-b from-[#090A0D] to-[#12141A] shadow-[inset_0_3px_10px_rgba(0,0,0,0.95)]"
    >
      <div class="absolute inset-0 transition-opacity duration-300 {isLoaded ? 'opacity-100' : 'opacity-35'}">
        <!-- Coquille transparente, fenêtre de tête et vis -->
        <svg
          data-testid="cassette-shell"
          viewBox="0 0 1587 1000"
          preserveAspectRatio="none"
          class="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="shell-grad-{deckId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#E6EBF0" stop-opacity="0.6" />
              <stop offset="1" stop-color="#9AA4AE" stop-opacity="0.45" />
            </linearGradient>
          </defs>
          <rect x="20" y="20" width="1547" height="960" rx="60" fill="url(#shell-grad-{deckId})" stroke="#D5DCE3" stroke-opacity="0.7" stroke-width="6" />
          <rect x="400" y="36" width="787" height="200" rx="24" fill="#FFFFFF" fill-opacity="0.12" stroke="#9AA4AE" stroke-opacity="0.6" stroke-width="4" />
          <rect x="770" y="60" width="60" height="36" rx="4" fill="#15171B" />
          <circle cx="799" cy="165" r="22" fill="#3A3F47" stroke="#8C949C" stroke-width="4" />
          {#each [[44, 54], [1543, 54], [44, 946], [1543, 946]] as [cx, cy]}
            <circle cx={cx} cy={cy} r="24" fill="#2A2E35" stroke="#8C949C" stroke-width="4" />
            <circle cx={cx} cy={cy} r="8" fill="#101216" />
          {/each}
          {#each [[153, 91], [1427, 93]] as [cx, cy]}
            <circle cx={cx} cy={cy} r="48" fill="#C8254A" stroke="#7A1228" stroke-width="5" />
            <circle cx={cx} cy={cy} r="16" fill="#1A0A0E" />
          {/each}
        </svg>

        <!-- Disque de bande noir, enroulé sur la bobine gauche -->
        {#if isLoaded}
          <div
            data-testid="cassette-tape-disc"
            class="absolute rounded-full"
            style="left: 29%; top: 55.4%; width: {2 * leftRadius}%; aspect-ratio: 1; transform: translate(-50%, -50%); transition: width 250ms linear; background: radial-gradient(circle, #2A2A2E 0 14%, #050506 15% 62%, #161618 70%, #050506 92%); box-shadow: 0 0 0 2px #0B0B0D, 0 4px 14px rgba(0,0,0,0.6);"
          ></div>
        {/if}

        <!-- Bande enroulée sur la bobine droite (se remplit) -->
        {#if isLoaded}
          <div
            data-testid="cassette-tape-disc-take-up"
            class="absolute rounded-full"
            style="left: 71%; top: 55.4%; width: {2 * rightRadius}%; aspect-ratio: 1; transform: translate(-50%, -50%); transition: width 250ms linear; background: radial-gradient(circle, #2A2A2E 0 14%, #050506 15% 62%, #161618 70%, #050506 92%); box-shadow: 0 0 0 2px #0B0B0D, 0 4px 14px rgba(0,0,0,0.6);"
          ></div>
        {/if}

        <!-- Pochette : cache la partie haute de la bande et porte le titre -->
        {#if isLoaded}
          <div
            data-testid="cassette-sleeve"
            class="absolute flex items-center rounded-sm bg-[#F3F0E6] shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
            style="left: 5%; right: 5%; top: 24%; height: 33%; gap: 3cqw; padding: 0 3cqw; z-index: 10;"
          >
            <span data-testid="cassette-sleeve-side" class="font-bold text-[#15161B]" style="font-size: 5cqw;">{isAmber ? 'A' : 'B'}</span>
            <span
              data-testid="deck-track-name"
              class="min-w-0 flex-1 break-words leading-tight font-sleeve text-[#15161B]"
              style="font-size: {sleeveTitleSize};"
            >
              {trackName}
            </span>
          </div>
        {/if}

        <!-- Moyeu gauche (tourne) -->
        <div class="absolute" style="left: 29%; top: 55.4%; width: 22%; aspect-ratio: 1; transform: translate(-50%, -50%);">
          <div class="reel w-full h-full {isSpinning ? 'spinning animate-spin' : ''}">
            <svg viewBox="-50 -50 100 100" class="w-full h-full" aria-hidden="true">
              <circle r="49" fill={hub.ring} stroke={hub.edge} stroke-width="2" />
              {#each HUB_DOTS as dot}
                <circle class="hub-dot" cx={dot.x} cy={dot.y} r="2.6" fill="#E8ECEF" />
              {/each}
              <circle r="30" fill="#B9C2CA" stroke={hub.edge} stroke-width="3" />
              <rect x="-1.5" y="-30" width="3" height="10" fill={hub.edge} />
            </svg>
          </div>
        </div>

        <!-- Moyeu droit (tourne) -->
        <div class="absolute" style="left: 71%; top: 55.4%; width: 20.7%; aspect-ratio: 1; transform: translate(-50%, -50%);">
          <div class="reel w-full h-full {isSpinning ? 'spinning animate-spin' : ''}">
            <svg viewBox="-50 -50 100 100" class="w-full h-full" aria-hidden="true">
              <circle r="49" fill={hub.ring} stroke={hub.edge} stroke-width="2" />
              {#each HUB_DOTS as dot}
                <circle class="hub-dot" cx={dot.x} cy={dot.y} r="2.6" fill="#E8ECEF" />
              {/each}
              <circle r="30" fill="#B9C2CA" stroke={hub.edge} stroke-width="3" />
              <rect x="-1.5" y="-30" width="3" height="10" fill={hub.edge} />
            </svg>
          </div>
        </div>

        <!-- Tête de lecture : bloc trapézoïdal argenté -->
        <div class="absolute" style="left: 50%; top: 82%; width: 8%; height: 5%; transform: translate(-50%, 0); background: linear-gradient(180deg, #B0B8C0, #889098); clip-path: polygon(20% 0%, 80% 0%, 0% 100%, 100% 100%); box-shadow: 0 1px 4px rgba(0,0,0,0.5), inset 0 1px 0 #D5DCE3;"></div>

        <!-- Compteur de bande numérique grand format mm:ss -->
        <div class="absolute font-mono font-extrabold" style="left: 50%; top: 12%; transform: translate(-50%, 0); background: #0D0E11; padding: 4px 10px; border-radius: 4px; box-shadow: inset 0 2px 6px rgba(0,0,0,0.9), 0 3px 10px rgba(0,0,0,0.6); color: #FFB300; font-size: 14px; letter-spacing: 4px; border: 1px solid #C87D55;">
          <span data-testid="deck-counter">{formattedTime}</span>
        </div>
      </div>
    </div>

    <!-- Boutons poussoirs de transport -->
    <div class="deck-controls grid grid-cols-3 gap-1 pt-1">
      <button
        type="button"
        disabled={!isLoaded || isPlaying}
        onclick={onPlay}
        title="PLAY DECK {deckId}"
        class="flex items-center justify-center gap-1 py-1 rounded transition-all font-bold {isLoaded
          ? isAmber
            ? 'bg-gradient-to-b from-[#C87D55] via-accent-amber-master to-[#8C4A27] shadow-[0_2px_6px_rgba(0,0,0,0.6),inset_0_1px_0_#E69D75] text-[#281900]'
            : 'bg-gradient-to-b from-[#00E676] via-[#00A852] to-[#005226] shadow-[0_2px_6px_rgba(0,0,0,0.6),inset_0_1px_0_#7DFFA2] text-[#00210b]'
          : 'bg-surface-container-low text-text-muted opacity-50 cursor-not-allowed border border-border-copper/30'} {isLoaded && !isPlaying
          ? 'hover:brightness-110 active:translate-y-[1px] cursor-pointer'
          : ''} {isPlaying ? 'brightness-75 cursor-default' : ''}"
      >
        <span class="text-[11px] leading-none" aria-hidden="true">▶</span>
        <span class="font-label-sm text-label-sm tracking-wider uppercase font-bold">PLAY</span>
      </button>

      <button
        type="button"
        disabled={!isPlaying}
        onclick={onStop}
        title="STOP DECK {deckId}"
        class="flex items-center justify-center gap-1 py-1 rounded bg-surface-container-high shadow-[0_2px_4px_rgba(0,0,0,0.5)] text-text-copper transition-all border border-border-copper/40 {isPlaying
          ? 'hover:bg-surface-container-highest active:translate-y-[1px] cursor-pointer'
          : 'opacity-50 cursor-not-allowed'}"
      >
        <span class="text-[11px] leading-none" aria-hidden="true">■</span>
        <span class="font-label-sm text-label-sm tracking-wider uppercase font-bold">STOP</span>
      </button>

      <button
        type="button"
        data-testid="deck-load-eject"
        aria-label={isLoaded ? `Éjecter la cassette du Deck ${deckId}` : `Charger une cassette dans le Deck ${deckId}`}
        title={isLoaded ? 'ÉJECTER LA CASSETTE' : 'CHARGER UNE NOUVELLE CASSETTE'}
        onclick={isLoaded ? onEjectTrack : onLoadTrack}
        class="load-eject-btn flex items-center justify-center gap-1 py-1 rounded transition-all cursor-pointer active:translate-y-[1px] {isLoaded
          ? 'bg-surface-container-high hover:bg-surface-container-highest shadow-[0_2px_4px_rgba(0,0,0,0.5)] text-text-copper border border-amber-500/50 hover:border-amber-400'
          : isAmber
            ? 'bg-gradient-to-b from-[#C87D55] to-[#8C4A27] shadow-[0_2px_6px_rgba(0,0,0,0.6),inset_0_1px_0_#E69D75] text-primary hover:brightness-110'
            : 'bg-gradient-to-b from-[#00A852] to-[#005226] shadow-[0_2px_6px_rgba(0,0,0,0.6),inset_0_1px_0_#7DFFA2] text-secondary hover:brightness-110'}"
      >
        <span class="text-[11px] leading-none" aria-hidden="true">{isLoaded ? '⏏' : '⇪'}</span>
        <span class="font-label-sm text-label-sm uppercase font-bold tracking-wider">{isLoaded ? 'EJECT' : 'LOAD'}</span>
      </button>
    </div>
  </div>
</div>
