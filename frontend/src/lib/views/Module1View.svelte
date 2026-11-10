<script lang="ts">
  /**
   * AlcheMix Studio — Module 1 : Vue principale complète (maquette MK-IV)
   * Disposition 3 colonnes : Deck A Master (ambre) / Gatekeeper, Harmonic Engine & Camelot
   * Wheel (centre, Gatekeeper sous la roue) / Deck B Candidate (émeraude).
   */
  import HeaderBar from '../components/HeaderBar.svelte';
  import CassetteDeck from '../components/CassetteDeck.svelte';
  import ID3TagCard from '../components/ID3TagCard.svelte';
  import TempoDisplay from '../components/TempoDisplay.svelte';
  import CamelotWheel from '../components/CamelotWheel.svelte';
  import BeatgridOverlay from '../components/BeatgridOverlay.svelte';
  import CamelotCompatibility from '../components/CamelotCompatibility.svelte';

  let { onSelectModule = null, activeTab: initialActiveTab = 'gatekeeper' } = $props();
  import MixAdvisor from '../components/MixAdvisor.svelte';
  import MetadataModal from '../components/MetadataModal.svelte';
  import WaveformView from '../components/WaveformView.svelte';
  import WaveformControls from '../components/WaveformControls.svelte';
  import { waveformPeaksMulti, changeMarkers } from '../waveform.js';
  import { parseID3Tags, detectBPMKey, analyzeMetadata, resetAudioEngine, resolveTempo, KEY_CONFIDENCE_MIN, analyzeSegments } from '../audioEngine.js';
  import { fetchFallbackCover } from '../services/metadataService.js';
  import { compatibilityBetween, keyInfo, camelotFromKeyName } from '../camelot.js';
  import { createDeckPlayer } from '../services/deckPlayer.js';
  import { onDestroy } from 'svelte';

  interface WaveData {
    peaks: Float32Array | null; // min/max par colonne (waveformPeaks)
    durationS: number;
    segments: unknown[]; // [{ startS, bpm, key, ... }] (analyzeSegments)
  }

  interface Track {
    id: 'A' | 'B';
    file: File | string | null;
    title: string | null;
    artist: string | null;
    bpm: number | null;
    key: string | null;
    coverUrl: string | null;
    metadata: Record<string, any>;
    isAnalyzing: boolean;
    isPlaying: boolean;
    progress: number;
    isFetchingOnline: boolean;
    tempoConfidence: number | null;
    tempoRegularity: number | null;
    keyConfidence: number | null;
    wave: WaveData | null; // forme d'onde + analyse par segments (alchemix#44, M6)
    isWaveLoading: boolean;
    currentTime: number;
    duration: number;
  }

  function emptyTrack(id: 'A' | 'B'): Track {
    return { id, file: null, title: null, artist: null, bpm: null, key: null, coverUrl: null, metadata: {}, isAnalyzing: false, isPlaying: false, progress: 0, currentTime: 0, duration: 0, isFetchingOnline: false, tempoConfidence: null, tempoRegularity: null, keyConfidence: null, wave: null, isWaveLoading: false };
  }

  let trackA = $state<Track>(emptyTrack('A'));
  let trackB = $state<Track>(emptyTrack('B'));

  const playerA = createDeckPlayer({
    onPlayingChange: (playing) => (trackA.isPlaying = playing),
    onProgress: (fraction) => (trackA.progress = fraction),
    onTime: (secs) => (trackA.currentTime = secs)
  });
  const playerB = createDeckPlayer({
    onPlayingChange: (playing) => (trackB.isPlaying = playing),
    onProgress: (fraction) => (trackB.progress = fraction),
    onTime: (secs) => (trackB.currentTime = secs)
  });

  onDestroy(() => {
    playerA.dispose();
    playerB.dispose();
  });


  let showModal = $state(false);
  let pendingDeckId = $state<'A' | 'B' | null>(null);
  let analysisDone = $state(false);
  let activeTab = $state('gatekeeper');
  // Override initial tab from props if provided (for tests)
  if (initialActiveTab !== 'gatekeeper') activeTab = initialActiveTab;
  let fileInputA = <HTMLInputElement | null>(null);
  let fileInputB = <HTMLInputElement | null>(null);

  // Panneau forme d'onde A/B (alchemix#44, M6) : piste affichée + mode de marqueurs
  const WAVEFORM_WIDTH = 1200; // colonnes d'affichage de la forme d'onde
  const SEGMENT_SECONDS = 30; // fenêtre d'analyse par segments (detectBPM/detectKey)
  let waveTrack = $state<'A' | 'B'>('A');
  let waveMode = $state<'rhythm' | 'key'>('rhythm');
  const waveTrackData = $derived(waveTrack === 'A' ? trackA : trackB);
  const waveMarkers = $derived(changeMarkers((waveTrackData.wave?.segments ?? []) as any[], waveMode));

  const countLoaded = $derived((trackA.file ? 1 : 0) + (trackB.file ? 1 : 0));
  const isBothLoaded = $derived(countLoaded === 2);

  // Simulation de niveau audio stéréo réaliste pour les VU-mètres
  let vuLeftA = $state(0);
  let vuRightA = $state(0);
  let vuLeftB = $state(0);
  let vuRightB = $state(0);

  // Met à jour les niveaux VU 20×/s pour un suivi temps réel de la musique
  $effect(() => {
    const timer = setInterval(() => {
      // Piste A : oscillation rapide + bruit important, canaux L/R décalés pour l'effet stéréo
      if (trackA.isPlaying) {
        const t = Date.now() / 1000;
        const beat1 = Math.sin(t * 17.3) * 0.35 + 0.45;
        const beat2 = Math.sin(t * 11.7 + 2.3) * 0.25 + 0.3;
        const noise1 = Math.random() * 0.35 + 0.05;
        const noise2 = Math.random() * 0.35 + 0.05;
        vuLeftA = Math.min(1, Math.max(0.02, beat1 + beat2 * 0.5 + noise1));
        vuRightA = Math.min(1, Math.max(0.02, beat1 * 0.6 + beat2 + noise2));
      } else {
        if (vuLeftA > 0) { vuLeftA = 0; vuRightA = 0; }
      }
      // Piste B : motif rythmique différent, rapide et punchy
      if (trackB.isPlaying) {
        const t = Date.now() / 1000;
        const beat1 = Math.sin(t * 19.1) * 0.3 + 0.4;
        const beat2 = Math.cos(t * 13.3 + 1.7) * 0.25 + 0.3;
        const noise1 = Math.random() * 0.35 + 0.05;
        const noise2 = Math.random() * 0.35 + 0.05;
        vuLeftB = Math.min(1, Math.max(0.02, beat1 * 0.7 + beat2 + noise1));
        vuRightB = Math.min(1, Math.max(0.02, beat1 + beat2 * 0.6 + noise2));
      } else {
        if (vuLeftB > 0) { vuLeftB = 0; vuRightB = 0; }
      }
    }, 60);
    return () => clearInterval(timer);
  });

  // Matrice de consonance Camelot (camelot.js) : SAME_KEY 100 / RELATIVE 95 /
  // QUINTE 90 / ENERGY_BOOST 80 / MODULATION 75 / DISSONANT 55 (NO-GO < 60)
  const compat = $derived.by(() => {
    if (!trackA.key || !trackB.key) return null;
    return compatibilityBetween(trackA.key, trackB.key);
  });

  const compatibilityScore = $derived(countLoaded < 2 || !compat ? 0 : compat.score);
  const gatekeeper = $derived(countLoaded === 2 && compat?.status === 'GATE_UNLOCKED' ? 'GO' : 'NO-GO');
  const ruleApplied = $derived(countLoaded < 2 || !compat ? 'STANDBY — ANALYSE EN ATTENTE' : compat.rule);

  const timeStretchPercent = $derived.by(() => {
    if (!trackA.bpm || !trackB.bpm) return 0;
    return (trackA.bpm / trackB.bpm - 1) * 100;
  });

  /** Clé DSP sous le seuil de confiance : la saisie manuelle est proposée (une clé issue d'un tag ID3 n'a pas de confiance) */
  function isKeyUncertain(track: Track) {
    return track.keyConfidence != null && track.keyConfidence < KEY_CONFIDENCE_MIN;
  }

  function triggerLoadTrack(deckId: 'A' | 'B') {
    if (deckId === 'A') {
      if (fileInputA) fileInputA.value = '';
      fileInputA?.click();
    } else {
      if (fileInputB) fileInputB.value = '';
      fileInputB?.click();
    }
  }

  /**
   * Forme d'onde + analyse par segments d'une piste (alchemix#44, M6) :
   * les peaks sont calculés tout de suite, l'analyse segment-wise est déléguée
   * au worker DSP via `analyzeSegments` (non bloquante, état `isWaveLoading`).
   */
  function loadWaveform(track: Track, audioBuffer: AudioBuffer) {
    track.isWaveLoading = true;
    try {
      // Tous les canaux (mono/stéréo) : l'enveloppe min/max est fusionnée par colonne,
      // aucune crête d'aucun canal n'est perdue.
      const channels: Float32Array[] = [];
      const nCh = audioBuffer.numberOfChannels || 1;
      for (let c = 0; c < nCh; c++) channels.push(audioBuffer.getChannelData(c));
      track.wave = { peaks: waveformPeaksMulti(channels, WAVEFORM_WIDTH), durationS: audioBuffer.duration, segments: [] };
    } catch (err) {
      console.warn("Forme d'onde indisponible :", err);
      track.wave = null;
    }
    analyzeSegments(audioBuffer, SEGMENT_SECONDS)
      .then((segments) => {
        if (track.wave) track.wave = { ...track.wave, segments };
      })
      .catch((err) => console.warn('Analyse par segments indisponible :', err))
      .finally(() => {
        track.isWaveLoading = false;
      });
  }

  async function handleFileSelected(event: Event, deckId: 'A' | 'B') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const track = deckId === 'A' ? trackA : trackB;
    track.file = file;
    track.isAnalyzing = true;
    (deckId === 'A' ? playerA : playerB).load(file);
    analysisDone = false;

    const cleanName = stripAudioExtension(file.name.replace(/\.[^/.]+$/, ''));
    const parts = cleanName.split(/\s*-\s*/);

    let parsedArtist = 'Artiste Inconnu';
    let parsedTitle = cleanName;
    if (parts.length >= 2) {
      parsedArtist = parts[0].trim();
      parsedTitle = parts.slice(1).join(' - ').trim();
    }

    track.artist = parsedArtist;
    track.title = parsedTitle;

    try {
      // Phase 1 : tags ID3 locaux
      const arrayBuffer = await file.arrayBuffer();
      const id3Tags = parseID3Tags(arrayBuffer) || {};

      track.metadata = {
        ...track.metadata,
        title: id3Tags.title || parsedTitle,
        artist: id3Tags.artist || parsedArtist,
        album: id3Tags.album || track.metadata.album,
        year: id3Tags.year || track.metadata.year,
        genre: id3Tags.genre || track.metadata.genre
      };
      track.title = track.metadata.title;
      track.artist = track.metadata.artist;

      // Enrichissement en ligne une fois les tags lus : artiste réel (tag, ou nom de fichier « Artiste - Titre »),
      // sans « Artiste Inconnu » qui fausserait la recherche
      enrichOnline(track, file, id3Tags.artist || (parts.length >= 2 ? parsedArtist : ''), track.metadata.title);

      // Phase 2 : décodage Web Audio + DSP de secours si BPM/clé manquants
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

      // Forme d'onde + marqueurs de changements (alchemix#44) : calcul en arrière-plan
      loadWaveform(track, audioBuffer);

      const dsp = await detectBPMKey(audioBuffer);
      const measured = dsp.bpm === null ? null : { bpm: dsp.bpm, confidence: dsp.confidence, regularity: dsp.regularity };
      const tempo = resolveTempo(id3Tags.bpm ?? null, measured);
      track.bpm = tempo?.bpm ?? null;
      track.tempoConfidence = tempo?.source === 'measure' ? measured.confidence : null;
      track.tempoRegularity = tempo?.source === 'measure' ? measured.regularity : null;
      const keyFromTag = camelotFromKeyName(id3Tags.key);
      track.key = keyFromTag || dsp.key || null;
      track.keyConfidence = keyFromTag ? null : dsp.keyConfidence;

      const { bitrate, loudness } = await analyzeMetadata(file, audioBuffer);
      track.metadata.bitrate = bitrate;
      track.metadata.sample_rate = audioBuffer.sampleRate;
      track.metadata.channels = audioBuffer.numberOfChannels;
      track.metadata.duration = audioBuffer.duration;
      track.metadata.loudness = loudness;
      audioContext.close?.();

      // BPM ou clé toujours indéterminés, ou clé peu fiable -> saisie manuelle du DJ
      if (!track.bpm || !track.key || isKeyUncertain(track)) {
        pendingDeckId = deckId;
        showModal = true;
      }
      track.isAnalyzing = false;
    } catch (error) {
      console.warn("Analyse locale indisponible, saisie manuelle requise :", error);
      pendingDeckId = deckId;
      showModal = true;
      track.isAnalyzing = false;
    }
  }

  /** Retire une extension de format restée dans le nom (« Lorelei.Flac » -> « Lorelei ») : iTunes ne renvoie rien avec elle */
  function stripAudioExtension(name: string) {
    return name.replace(/\.(flac|wav|mp3|m4a|aac|ogg|aiff?)$/i, '').trim();
  }

  /** Complète les champs manquants depuis le web, sans bloquer l'analyse locale */
  function enrichOnline(track: Track, file: File, artist: string, title: string) {
    track.isFetchingOnline = true;
    fetchOnlineMetadata(artist, title)
      .then((online) => {
        track.isFetchingOnline = false;
        // $state proxifie l'objet File : comparaison par nom, pas par référence
        const current = track.file as File | null;
        if (!current || current.name !== file.name) return; // piste éjectée/remplacée
        if (online.coverUrl && !track.coverUrl) track.coverUrl = online.coverUrl;
        if (online.genre && !track.metadata.genre) track.metadata.genre = online.genre;
        if (online.album && !track.metadata.album) track.metadata.album = online.album;
        if (online.year && !track.metadata.year) track.metadata.year = online.year;
      })
      .catch(() => {
        track.isFetchingOnline = false;
        // Hors-ligne / API indisponible : l'UI reste fonctionnelle
      });
  }

  /** Enrichissement en ligne : iTunes d'abord, pochette de secours (MusicBrainz / Cover Art Archive) si iTunes n'en a pas */
  async function fetchOnlineMetadata(artist: string, title: string) {
    const online = await searchItunes(artist, title);
    if (online.coverUrl) return online;
    const fallback = await fetchFallbackCover(artist, title);
    return { ...online, coverUrl: fallback.success ? fallback.coverUrl : null };
  }

  async function searchItunes(artist: string, title: string) {
    try {
      const term = encodeURIComponent([artist, title].filter(Boolean).join(' '));
      const res = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`);
      const json = await res.json();
      if (json?.results && json.results.length > 0) {
        const item = json.results[0];
        return {
          coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace(/100x100(bb|wa)\.jpg/, '600x600bb.jpg') : null,
          genre: item.primaryGenreName || null,
          album: item.collectionName || null,
          year: item.releaseDate ? item.releaseDate.substring(0, 4) : null
        };
      }
      return {};
    } catch {
      return {};
    }
  }

  function handleEjectTrack(deckId: 'A' | 'B') {
    if (deckId === 'A') {
      playerA.dispose();
      trackA = emptyTrack('A');
      if (fileInputA) fileInputA.value = '';
    } else {
      playerB.dispose();
      trackB = emptyTrack('B');
      if (fileInputB) fileInputB.value = '';
    }
    if (pendingDeckId === deckId) {
      showModal = false;
      pendingDeckId = null;
    }
    analysisDone = false;
  }

  function handleModalSave(data: { bpm: number; key: string; title?: string; artist?: string }) {
    if (!pendingDeckId) return;
    const track = pendingDeckId === 'A' ? trackA : trackB;
    track.bpm = data.bpm;
    track.key = data.key;
    track.keyConfidence = null;
    if (data.title) track.title = data.title;
    if (data.artist) track.artist = data.artist;
    track.metadata = { ...track.metadata, bpm: data.bpm, key: data.key };
    track.isAnalyzing = false;
    showModal = false;
    pendingDeckId = null;
  }

  /** Bascule la clé de la Piste B entre Majeur et Mineur relatif (9B ↔ 9A) */
  function handleToggleRelative() {
    const info = keyInfo(trackB.key || '12B');
    if (!info) return;
    trackB.key = info.relativeCode;
  }

  /** ÷2 tempo cible : corrige une détection double-tempo de la Piste B */
  function handleHalveTargetBpm() {
    if (!trackB.bpm) return;
    trackB.bpm = Math.round((trackB.bpm / 2) * 100) / 100;
  }

  function handleQuitClean() {
    handleEjectTrack('A');
    handleEjectTrack('B');
    resetAudioEngine();
  }

  function handleStartAnalysis() {
    if (!isBothLoaded) return;
    analysisDone = true;
  }

  function handlePlay(deckId: 'A' | 'B') {
    const track = deckId === 'A' ? trackA : trackB;
    if (!track.file) return;
    (deckId === 'A' ? playerA : playerB).play();
  }

  function handleStop(deckId: 'A' | 'B') {
    (deckId === 'A' ? playerA : playerB).stop();
  }

  function handleSendToModule2(deckId: 'A' | 'B') {
    // Routage vers le Module 2 (Démixage IA) — câblé lors de l'intégration Module 2
    console.info(`Transfert de la piste ${deckId} vers le Module 2 (démixage IA)`);
  }

  /** Profil de grille : régularité des attaques >= 0,3 → rythme fixe (électronique), sinon variable */
  function tempoTypeOf(track: Track) {
    if (track.tempoRegularity == null) return null;
    return track.tempoRegularity >= 0.3 ? 'FIXED_ELECTRONIC' : 'LIVE_DRUMS';
  }

  const pendingTrack = $derived(pendingDeckId === 'A' ? trackA : pendingDeckId === 'B' ? trackB : null);
</script>

<div class="shell w-screen h-screen bg-bg-canvas text-on-surface font-body-md text-body-md select-none flex flex-col overflow-hidden">
  <input
    type="file"
    accept=".mp3,.wav,.flac,.aiff"
    class="hidden"
    bind:this={fileInputA}
    onchange={(e) => handleFileSelected(e, 'A')}
  />
  <input
    type="file"
    accept=".mp3,.wav,.flac,.aiff"
    class="hidden"
    bind:this={fileInputB}
    onchange={(e) => handleFileSelected(e, 'B')}
  />

  <HeaderBar appTitle="AlcheMix Studio" {onSelectModule} />

  <main class="module-container w-full flex-1 min-h-0 p-gutter grid grid-cols-12 gap-gutter overflow-hidden">
    <!-- ═══ COLONNE 1 : DECK A MASTER (AMBRE / OR) ═══ -->
    <section class="col-left col-span-12 lg:col-span-3 flex flex-col gap-space-md h-full min-h-0 overflow-y-auto">
      <CassetteDeck
        deckId="A"
        label="TRACK A - MASTER"
        title={trackA.title}
        artist={trackA.artist}
        file={trackA.file}
        isAnalyzing={trackA.isAnalyzing}
        isPlaying={trackA.isPlaying}
        progress={trackA.progress}
        currentTime={trackA.currentTime}
        duration={trackA.duration}
        onPlay={() => handlePlay('A')}
        onStop={() => handleStop('A')}
        onLoadTrack={() => triggerLoadTrack('A')}
        onEjectTrack={() => handleEjectTrack('A')}
      />

      <ID3TagCard
        metadata={trackA.metadata}
        fileName={trackA.file && typeof trackA.file === 'object' ? trackA.file.name : trackA.file}
        coverUrl={trackA.coverUrl}
        isFetchingOnline={trackA.isFetchingOnline}
        isAnalyzing={trackA.isAnalyzing}
        deckLabel="PISTE A"
        variant="amber"
      />

      <TempoDisplay
        bpm={trackA.bpm}
        confidence={trackA.tempoConfidence}
        keyConfidence={trackA.keyConfidence}
        tempoType={tempoTypeOf(trackA)}
        trackLabel="A"
        camelotKey={trackA.key}
        variant="amber"
      />

      <button
        type="button"
        data-testid="track-action-btn"
        disabled={!trackA.file}
        onclick={() => handleSendToModule2('A')}
        class="w-full flex items-center justify-center gap-space-xs py-1.5 rounded transition-all shadow-[0_2px_8px_rgba(0,0,0,0.7)] disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-110 enabled:active:translate-y-[1px] enabled:cursor-pointer bg-gradient-to-b from-[#C87D55] to-[#8C4A27] text-primary [box-shadow:0_2px_8px_rgba(0,0,0,0.7),inset_0_1px_0_#E69D75]"
      >
        <span class="text-[13px] leading-none" aria-hidden="true">≋</span>
        <span class="font-label-md text-label-md tracking-wider uppercase font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">DÉMIXER PISTE A ➔ MODULE 2</span>
      </button>
    </section>

    <!-- ═══ COLONNE 2 : HARMONIC ENGINE & CAMELOT WHEEL (CENTRE) ═══ -->
    <section class="col-center col-span-12 lg:col-span-6 flex flex-col gap-space-md h-full min-h-0 overflow-y-auto">
      <!-- Bandeau moteur d'analyse harmonique -->
      <div class="analysis-panel bg-bg-panel rounded px-space-md py-space-sm flex items-center justify-between gap-space-md shadow-[0_4px_14px_rgba(0,0,0,0.7)] shrink-0">
        <div class="flex items-center gap-space-md min-w-0">
          <div class="flex items-center gap-1.5 shrink-0">
            {#if countLoaded < 2}
              <span class="w-2 h-2 rounded-full bg-accent-amber-master shadow-[0_0_8px_#FFB300] animate-pulse"></span>
              <span class="status-led font-label-md text-label-md text-accent-amber-master font-bold">
                WAITING FOR TRACKS ({countLoaded}/2)
              </span>
            {:else if analysisDone}
              <span class="w-2 h-2 rounded-full bg-accent-emerald-candidate shadow-[0_0_8px_#00E676]"></span>
              <span class="status-led font-label-md text-label-md text-accent-emerald-candidate font-bold">ANALYSE COMPLÈTE — SYNC LOCK</span>
            {:else}
              <span class="w-2 h-2 rounded-full bg-accent-emerald-candidate shadow-[0_0_8px_#00E676] animate-pulse"></span>
              <span class="status-led font-label-md text-label-md text-accent-emerald-candidate font-bold">OK - READY TO ANALYZE</span>
            {/if}
          </div>
          <span class="text-border-copper hidden xl:inline">|</span>
          <div class="hidden xl:flex items-center gap-1.5 min-w-0 truncate">
            <span class="font-label-sm text-label-sm text-text-muted">HARMONIC DELTA:</span>
            <span class="font-label-md text-label-md text-secondary font-bold truncate">
              {compat ? compat.rule : '—'}
            </span>
          </div>
        </div>

        <button
          type="button"
          class="btn-analyze flex items-center justify-center gap-space-xs px-space-md py-1.5 rounded transition-all shrink-0 font-label-md text-label-md tracking-wider uppercase font-bold {isBothLoaded
            ? 'bg-gradient-to-b from-[#00A852] to-[#005226] shadow-[0_2px_8px_rgba(0,0,0,0.7),inset_0_1px_0_#7DFFA2] text-secondary hover:brightness-110 active:translate-y-[1px] cursor-pointer'
            : 'bg-surface-container-low text-text-muted border border-border-copper/40 opacity-60 cursor-not-allowed'}"
          disabled={!isBothLoaded}
          onclick={handleStartAnalysis}
        >
          ⚡ LANCER L'ANALYSE HARMONIQUE
        </button>
      </div>

      <!-- ═══════ BARRETTE DE SÉLECTION : TOUCHES PIANO Hi-Fi (CONCEPT 2) ═══════ -->
      <div class="max-w-[440px] w-full mx-auto my-2 p-1 bg-[#0B0C0E] border border-[#3A2218] rounded-xl shadow-[inset_0_1px_4px_rgba(0,0,0,0.6)] flex gap-2 select-none"
        role="group" aria-label="Sélecteur de vue : Roue de Camelot ou Forme d'onde"
      >
        <!-- Touche 1 : ROUE DE CAMELOT (active si gatekeeper) -->
        <button
          type="button"
          class="flex-1 py-2.5 px-2 rounded-lg transition-all duration-150 cursor-pointer relative {activeTab === 'gatekeeper'
            ? 'bg-gradient-to-b from-[#4A2618] to-[#26130B] border border-[#E69D75]/80 shadow-[inset_0_3px_8px_rgba(0,0,0,0.85)] text-white translate-y-[2px]'
            : 'bg-[#1A1C22] border border-[#3A2218]/60 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-[#2D3039] text-[#8A94A6] hover:text-amber-200 translate-y-0'}"
          onclick={() => activeTab = 'gatekeeper'}
          data-testid="tab-gatekeeper"
        >
          <!-- Voyant LED rond 8px -->
          <span class="w-2 h-2 rounded-full inline-block align-middle mr-1.5 {activeTab === 'gatekeeper'
            ? 'bg-[#FFB300] shadow-[0_0_8px_#FFB300]'
            : 'bg-[#1c1e24] border border-[#333]/60'}">
          </span>
          <span class="inline-block align-middle text-[10px] font-mono font-extrabold uppercase tracking-wider">1. ROUE DE CAMELOT</span>
        </button>

        <!-- Touche 2 : FORME D'ONDE & BEATGRID (active si waveform) -->
        <button
          type="button"
          class="flex-1 py-2.5 px-2 rounded-lg transition-all duration-150 cursor-pointer relative {activeTab === 'waveform'
            ? 'bg-gradient-to-b from-[#003A1F] to-[#001F0E] border border-[#00E676]/80 shadow-[inset_0_3px_8px_rgba(0,0,0,0.85)] text-white translate-y-[2px]'
            : 'bg-[#1A1C22] border border-[#3A2218]/60 shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-[#2D3039] text-[#8A94A6] hover:text-emerald-200 translate-y-0'}"
          onclick={() => activeTab = 'waveform'}
          data-testid="tab-waveform"
        >
          <!-- Voyant LED rond 8px -->
          <span class="w-2 h-2 rounded-full inline-block align-middle mr-1.5 {activeTab === 'waveform'
            ? 'bg-[#00E676] shadow-[0_0_8px_#00E676]'
            : 'bg-[#1c1e24] border border-[#333]/60'}">
          </span>
          <span class="inline-block align-middle text-[10px] font-mono font-extrabold uppercase tracking-wider">2. FORME D'ONDE & BEATGRID</span>
        </button>
      </div>

      <!-- ═══════ CONTENEUR D'AFFICHAGE EXCLUSIF ═══════ -->
      <div class="relative w-full flex-1 min-h-[400px] overflow-hidden flex flex-col gap-4">
        {#if activeTab === 'gatekeeper'}
          <!-- CHOIX 1 : Cadran Camelot + Harmonic Gatekeeper -->
          <div class="flex flex-col items-center gap-4 w-full h-full">
            <!-- Roue Camelot -->
            <div class="wheel-wrapper w-full flex flex-col items-center">
              <CamelotWheel
                keyA={trackA.key}
                keyB={trackB.key}
                trackNameA={trackA.title || 'Piste A'}
                trackNameB={trackB.title || 'Piste B'}
              />
            </div>

            <!-- Bascule relatif & Gatekeeper -->
            <div class="w-full flex flex-col gap-3">
              <section data-testid="compatibility-section" class="w-full">
                <CamelotCompatibility
                  compatibilityScore={compatibilityScore}
                  ruleApplied={ruleApplied}
                  gatekeeper={gatekeeper}
                  suggestedPitchShift={compat?.shift ?? 0}
                  timeStretchPercent={timeStretchPercent}
                  sourceCamelot={trackA.key || '8B'}
                  targetCamelot={trackB.key || '8B'}
                  keyA={trackA.key}
                  keyB={trackB.key}
                  bpmA={trackA.bpm}
                  bpmB={trackB.bpm}
                  targetBpm={trackB.bpm}
                  onHalveTargetBpm={handleHalveTargetBpm}
                  onToggleRelative={handleToggleRelative}
                  showKeyLinks={isBothLoaded}
                />
              </section>
              <MixAdvisor gatekeeper={gatekeeper} compat={compat} timeStretchPercent={timeStretchPercent} />

            <!-- VU-mètres stéréo analogiques (Gauche/Droite par piste) -->
            <div class="w-full mt-2 p-1 bg-[#0B0C0E] border border-[#3A2218]/60 rounded-lg shadow-[inset_0_1px_4px_rgba(0,0,0,0.6)]" data-testid="vu-meters">
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                  <span class="text-[8px] font-mono font-bold text-amber-300">A</span>
                  <span class="text-[7px] font-mono text-stone-500">L</span>
                  <div class="flex-1 h-2 bg-[#1A1C22] rounded-sm flex gap-0.5">
                    {#each [1,2,3,4,5,6,7,8] as i}
                    <span class="flex-1 rounded-sm {i <= 6 ? 'bg-[#00E676]' : i <= 7 ? 'bg-[#FFB300]' : 'bg-[#FF3D00]'}" style="opacity: {vuLeftA >= i / 8 ? 0.9 : 0.08}"></span>
                    {/each}
                  </div>
                  <span class="text-[7px] font-mono text-stone-500">R</span>
                  <div class="flex-1 h-2 bg-[#1A1C22] rounded-sm flex gap-0.5">
                    {#each [1,2,3,4,5,6,7,8] as i}
                    <span class="flex-1 rounded-sm {i <= 6 ? 'bg-[#00E676]' : i <= 7 ? 'bg-[#FFB300]' : 'bg-[#FF3D00]'}" style="opacity: {vuRightA >= i / 8 ? 0.9 : 0.08}"></span>
                    {/each}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[8px] font-mono font-bold text-emerald-300">B</span>
                  <span class="text-[7px] font-mono text-stone-500">L</span>
                  <div class="flex-1 h-2 bg-[#1A1C22] rounded-sm flex gap-0.5">
                    {#each [1,2,3,4,5,6,7,8] as i}
                    <span class="flex-1 rounded-sm {i <= 6 ? 'bg-[#00E676]' : i <= 7 ? 'bg-[#FFB300]' : 'bg-[#FF3D00]'}" style="opacity: {vuLeftB >= i / 8 ? 0.9 : 0.08}"></span>
                    {/each}
                  </div>
                  <span class="text-[7px] font-mono text-stone-500">R</span>
                  <div class="flex-1 h-2 bg-[#1A1C22] rounded-sm flex gap-0.5">
                    {#each [1,2,3,4,5,6,7,8] as i}
                    <span class="flex-1 rounded-sm {i <= 6 ? 'bg-[#00E676]' : i <= 7 ? 'bg-[#FFB300]' : 'bg-[#FF3D00]'}" style="opacity: {vuRightB >= i / 8 ? 0.9 : 0.08}"></span>
                    {/each}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

        {:else if activeTab === 'waveform'}
          <!-- CHOIX 2 : Forme d'onde & Beatgrid -->
          <div class="flex flex-col w-full h-full flex-1">
            <div class="beatgrid-panel w-full flex-1 min-h-[300px] flex flex-col">
              <BeatgridOverlay
                audioLoaded={isBothLoaded}
                analysisData={{ waveformA: trackA.wave?.peaks, waveformB: trackB.wave?.peaks }}
              />
            </div>
            <section data-testid="waveform-section" class="w-full flex-1 min-h-[220px] bg-bg-panel rounded p-space-md flex flex-col gap-space-sm shadow-[0_4px_14px_rgba(0,0,0,0.7)]">
              <WaveformControls
                track={waveTrack}
                mode={waveMode}
                onTrackChange={(t) => (waveTrack = t)}
                onModeChange={(m) => (waveMode = m)}
              />
              {#if waveTrackData.isWaveLoading}
                <div class="font-label-sm text-label-sm text-accent-amber-master font-bold animate-pulse" data-testid="waveform-loading">
                  ANALYSE DES SEGMENTS…
                </div>
              {/if}
              <div class="flex-1 min-h-0">
                <WaveformView
                  peaks={waveTrackData.wave?.peaks ?? null}
                  durationS={waveTrackData.wave?.durationS ?? null}
                  markers={waveMarkers}
                  mode={waveMode}
                  title="PISTE {waveTrack}"
                />
              </div>
            </section>
          </div>
        {/if}
      </div>
    </section>
    <section class="col-right col-span-12 lg:col-span-3 flex flex-col gap-space-md h-full min-h-0 overflow-y-auto">
      <CassetteDeck
        deckId="B"
        label="TRACK B - CANDIDATE"
        title={trackB.title}
        artist={trackB.artist}
        file={trackB.file}
        isAnalyzing={trackB.isAnalyzing}
        isPlaying={trackB.isPlaying}
        progress={trackB.progress}
        currentTime={trackB.currentTime}
        duration={trackB.duration}
        onPlay={() => handlePlay('B')}
        onStop={() => handleStop('B')}
        onLoadTrack={() => triggerLoadTrack('B')}
        onEjectTrack={() => handleEjectTrack('B')}
      />

      <ID3TagCard
        metadata={trackB.metadata}
        fileName={trackB.file && typeof trackB.file === 'object' ? trackB.file.name : trackB.file}
        coverUrl={trackB.coverUrl}
        isFetchingOnline={trackB.isFetchingOnline}
        isAnalyzing={trackB.isAnalyzing}
        deckLabel="PISTE B"
        variant="emerald"
      />

      <TempoDisplay
        bpm={trackB.bpm}
        confidence={trackB.tempoConfidence}
        keyConfidence={trackB.keyConfidence}
        tempoType={tempoTypeOf(trackB)}
        trackLabel="B"
        camelotKey={trackB.key}
        variant="emerald"
      />

      <button
        type="button"
        data-testid="track-action-btn"
        disabled={!trackB.file}
        onclick={() => handleSendToModule2('B')}
        class="w-full flex items-center justify-center gap-space-xs py-1.5 rounded transition-all shadow-[0_2px_8px_rgba(0,0,0,0.7)] disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-110 enabled:active:translate-y-[1px] enabled:cursor-pointer bg-gradient-to-b from-[#00A852] to-[#005226] text-secondary [box-shadow:0_2px_8px_rgba(0,0,0,0.7),inset_0_1px_0_#7DFFA2]"
      >
        <span class="text-[13px] leading-none" aria-hidden="true">≋</span>
        <span class="font-label-md text-label-md tracking-wider uppercase font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">DÉMIXER PISTE B ➔ MODULE 2</span>
      </button>

    </section>
  </main>

  <!-- Pied de châssis horloger -->
  <footer class="w-full bg-bg-panel border-t border-border-copper/50 py-space-sm px-gutter shrink-0">
    <div class="w-full flex items-center justify-between gap-space-xs font-label-sm text-label-sm text-text-muted">
      <div class="flex items-center gap-space-md">
        <span>CHASSIS HARDWARE ID: #ALCH-9801-VX</span>
        <span class="text-border-copper">|</span>
        <span>CLOCK JITTER: &lt; 0.002 ps</span>
        <span class="text-border-copper">|</span>
        <span>SAMPLE RATE STABILITY: 100% LOCK</span>
      </div>
      <div class="flex items-center gap-space-md">
        <span>ALCHEMIX VENETIAN HOROLOGICAL DAW <span class="text-border-copper-light font-bold">© MMXXV</span></span>
      </div>
    </div>
  </footer>

  {#if showModal}
    <MetadataModal
      isOpen={showModal}
      deckLabel={pendingDeckId === 'A' ? 'PISTE A (MASTER)' : 'PISTE B (CANDIDATE)'}
      initialBpm={pendingTrack?.bpm || ''}
      initialKey={pendingTrack?.key || ''}
      keyConfidence={pendingTrack?.keyConfidence ?? null}
      onConfirm={handleModalSave}
      onSave={handleModalSave}
      onCancel={() => (showModal = false)}
    />
  {/if}
</div>
