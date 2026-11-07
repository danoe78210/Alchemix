<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { open } from '@tauri-apps/plugin-dialog';
  import HeaderBar from '../components/HeaderBar.svelte';
  import WorkDirDialog from '../components/WorkDirDialog.svelte';
  import ExportDialog from '../components/ExportDialog.svelte';
  import Module2Header from '../components/Module2Header.svelte';
  import EngineCard from '../components/EngineCard.svelte';
  import TimeRuler from '../components/TimeRuler.svelte';
  import MasterMeter from '../components/MasterMeter.svelte';
  import StemStrip from '../components/StemStrip.svelte';
  import StemWaveform from '../components/StemWaveform.svelte';
  import { StemMixer } from '../module2/mixer.js';
  import { peaks, stemPeakAmplitude } from '../module2/waveform.js';
  import { visibleRange } from '../module2/timeline.js';
  import { MODELS } from '../module2/models.js';

  interface Props {
    onSelectModule?: ((id: number) => void) | null;
  }

  interface StartedJob {
    jobId: string;
    simulated: boolean;
    bytesPerStem: number;
  }

  interface TrackInfo {
    durationSeconds: number;
    sampleRate: number;
    channels: number;
  }

  type StemId = 'vocals' | 'drums' | 'bass' | 'other';

  let { onSelectModule = null }: Props = $props();

  // Navigation interne : onglet « Import & paramétrage » (zones 1-2) ou « Séparation » (zones 3-5).
  let activeTab = $state<'setup' | 'separation'>('setup');

  // --- Zone 1 : en-tête du module (morceau, métadonnées, actions) ---
  let workDir = $state<string | null>(null);
  let loaded = $state(false);
  let track = $state<(TrackInfo & { name: string }) | null>(null);
  let trackPath: string | null = null;
  let job = $state<StartedJob | null>(null);
  let separating = $state(false);
  let exportOpen = $state(false);
  let exportedPaths = $state<string[]>([]);
  let error = $state<string | null>(null);
  let cancelStatus = $state<string | null>(null);

  // --- Zone 2 : moteur IA (modèle choisi, backend détecté, temps de traitement) ---
  let selectedModel = $state<string | null>(null);
  let lastMs = $state<number | null>(null);
  let engine = $state<{ available: boolean; backend: string } | null>(null);

  // --- Zones 3 à 5 : stems, mixeur, master ---
  // Mixeur hors de l'état réactif : sa classe utilise des champs privés, incompatibles avec un proxy.
  let mixer: StemMixer | null = null;
  // Échantillons par stem, hors réactivité (gros tableaux) ; `waveVersion` invalide les dérivés.
  let channelData: Record<StemId, Float32Array | null> = { vocals: null, drums: null, bass: null, other: null };
  let waveVersion = $state(0);
  let stemsReady = $state(false);
  let audioDuration = $state(0);
  let playhead = $state(0);
  let zoom = $state(1);
  let zoomCenter = $state(0);
  let level = $state({ peak: 0, rms: 0 });
  let stemRms = $state<Record<StemId, number>>({ vocals: 0, drums: 0, bass: 0, other: 0 });
  let strips = $state<Record<StemId, { playing: boolean; volume: number; muted: boolean; soloed: boolean }>>({
    vocals: { playing: false, volume: 1, muted: false, soloed: false },
    drums: { playing: false, volume: 1, muted: false, soloed: false },
    bass: { playing: false, volume: 1, muted: false, soloed: false },
    other: { playing: false, volume: 1, muted: false, soloed: false }
  });

  // Couleurs du style : ambre pour les graves, émeraude pour les médiums, saphir pour les aigus, cuivre pour le reste.
  const STEMS: { id: StemId; label: string; color: string }[] = [
    { id: 'vocals', label: 'Voix', color: '#00E676' },
    { id: 'drums', label: 'Batterie', color: '#29B6F6' },
    { id: 'bass', label: 'Basse', color: '#FFB300' },
    { id: 'other', label: 'Autres', color: '#C87D55' }
  ];

  // Fenêtre visible du zoom commun, partagée par la règle, les formes d'onde et le curseur.
  const win = $derived(audioDuration > 0 ? visibleRange(audioDuration, zoom, zoomCenter) : { start: 0, end: 0 });

  // Crêtes affichées pour chaque stem, recalculées sur la fenêtre du zoom.
  const displayed = $derived.by(() => {
    void waveVersion;
    const out: Record<StemId, Float32Array | null> = { vocals: null, drums: null, bass: null, other: null };
    if (!(audioDuration > 0)) return out;
    const w = visibleRange(audioDuration, zoom, zoomCenter);
    for (const { id } of STEMS) {
      const ch = channelData[id];
      if (!ch || ch.length === 0) continue;
      const a = Math.floor((w.start / audioDuration) * ch.length);
      const b = Math.max(a + 1, Math.ceil((w.end / audioDuration) * ch.length));
      out[id] = peaks(ch.subarray(a, b), 600);
    }
    return out;
  });

  // Pic global par stem (calculé sur l'intégralité du stem) pour maintenir une échelle verticale constante au zoom.
  const stemMaxPeaks = $derived.by(() => {
    void waveVersion;
    const out: Record<StemId, number> = { vocals: 0, drums: 0, bass: 0, other: 0 };
    for (const { id } of STEMS) {
      const ch = channelData[id];
      if (!ch || ch.length === 0) continue;
      out[id] = stemPeakAmplitude(peaks(ch, 600));
    }
    return out;
  });

  // Niveaux et position de lecture, rafraîchis 4 fois par seconde (FR-012).
  $effect(() => {
    if (!stemsReady) return;
    const timer = setInterval(() => {
      if (!mixer) return;
      level = mixer.level();
      playhead = mixer.position();
      for (const { id } of STEMS) stemRms[id] = mixer.stemLevel(id).rms;
    }, 250);
    return () => clearInterval(timer);
  });

  // Lecture unique des réglages : le dialogue de choix s'affiche tant qu'aucun dossier n'est défini (FR-016).
  $effect(() => {
    invoke<{ work_dir: string | null; selected_model?: string | null }>('get_settings')
      .then((settings) => {
        workDir = settings.work_dir;
        selectedModel = settings.selected_model ?? null;
      })
      .catch((err) => {
        console.warn('Réglages du Module 2 illisibles:', err);
      })
      .finally(() => {
        loaded = true;
      });
  });

  // Backend d'inférence réellement détecté (DirectML ou repli CPU) — contrat §3.6.
  $effect(() => {
    invoke<{ available: boolean; backend: string }>('get_engine_status')
      .then((status) => {
        engine = status;
      })
      .catch((err) => {
        console.warn('État du moteur ONNX illisible:', err);
      });
  });

  // Libellé d'accélération de la zone IA : backend réel, séparation encore simulée (#22).
  const backendLabel = $derived(
    engine == null ? '—' : engine.available ? `${engine.backend} — séparation simulée` : 'ONNX Runtime indisponible'
  );

  function messageOf(e: unknown): string {
    return (e as { message?: string })?.message ?? String(e);
  }

  function resetStems() {
    if (mixer) for (const { id } of STEMS) mixer.setPlaying(id, false);
    mixer = null;
    stemsReady = false;
    channelData = { vocals: null, drums: null, bass: null, other: null };
    audioDuration = 0;
    playhead = 0;
    zoom = 1;
    waveVersion++;
    activeTab = 'setup';
  }

  // Chargement des 4 stems du job dans un mixeur Web Audio (octets WAV reçus en binaire).
  async function loadStems(jobId: string) {
    const ctx = new AudioContext();
    const next = new StemMixer(ctx, (id) => {
      strips[id].playing = false;
    });
    for (const { id } of STEMS) {
      const bytes = await invoke<ArrayBuffer>('get_stem_audio', { jobId, stem: id });
      const audio = await ctx.decodeAudioData(bytes);
      next.load(id, audio);
      if (audio.getChannelData) {
        const nCh = audio.numberOfChannels || 1;
        if (nCh <= 1) {
          channelData[id] = audio.getChannelData(0);
        } else {
          const ch0 = audio.getChannelData(0);
          const merged = new Float32Array(ch0.length);
          for (let c = 0; c < nCh; c++) {
            const ch = audio.getChannelData(c);
            for (let i = 0; i < merged.length; i++) {
              if (Math.abs(ch[i]) > Math.abs(merged[i])) merged[i] = ch[i];
            }
          }
          channelData[id] = merged;
        }
      } else {
        channelData[id] = null;
      }
      strips[id] = { playing: false, volume: 1, muted: false, soloed: false };
    }
    mixer = next;
    audioDuration = next.duration();
    zoom = 1;
    zoomCenter = audioDuration / 2;
    playhead = 0;
    waveVersion++;
    stemsReady = true;
  }

  function setPlaying(id: StemId, playing: boolean) {
    mixer?.setPlaying(id, playing);
    strips[id].playing = playing;
  }

  function setVolume(id: StemId, volume: number) {
    mixer?.setVolume(id, volume);
    strips[id].volume = volume;
  }

  function setMuted(id: StemId, muted: boolean) {
    mixer?.setMuted(id, muted);
    strips[id].muted = muted;
  }

  function setSolo(id: StemId, soloed: boolean) {
    mixer?.setSolo(id, soloed);
    strips[id].soloed = soloed;
  }

  // Zoom commun : la fenêtre se recentre sur la position de lecture courante.
  function setZoom(z: number) {
    zoom = Math.min(8, Math.max(1, z));
    zoomCenter = zoom === 1 ? audioDuration / 2 : (mixer ? mixer.position() : audioDuration / 2);
  }

  // IMPORTER : choix du fichier et lecture de ses métadonnées, sans lancer la séparation.
  async function importTrack() {
    error = null;
    exportedPaths = [];
    cancelStatus = null;
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: 'Audio', extensions: ['mp3', 'flac', 'wav'] }]
      });
      if (!path) return;
      const info = await invoke<TrackInfo>('probe_track', { path });
      trackPath = String(path);
      track = { name: trackPath.split(/[\\/]/).pop() ?? trackPath, ...info };
      resetStems();
      job = null;
      lastMs = null;
    } catch (e) {
      error = messageOf(e);
    }
  }

  // SÉPARER : lance le job (simulé tant que les modèles ne sont pas branchés) et charge les stems.
  async function separate() {
    if (!trackPath) return;
    error = null;
    cancelStatus = null;
    separating = true;
    const t0 = Date.now();
    try {
      job = await invoke<StartedJob>('start_separation', { path: trackPath });
      await loadStems(job.jobId);
      lastMs = Date.now() - t0;
      // Les stems sont prêts : on bascule sur l'onglet de séparation.
      activeTab = 'separation';
    } catch (e) {
      error = messageOf(e);
    } finally {
      separating = false;
    }
  }

  // Choix du modèle (zone IA) : mémorisé avec les réglages, utilisé quand l'inférence réelle sera branchée.
  function selectModel(id: string) {
    selectedModel = id;
    invoke('set_selected_model', { model: id }).catch((err) => {
      console.warn('Choix du modèle non enregistré:', err);
    });
  }

  // Export des stems cochés du job courant, après le contrôle d'espace fait par ExportDialog (FR-018).
  async function exportStems(stems: StemId[]) {
    if (!job) return;
    error = null;
    try {
      const result = await invoke<{ paths: string[] }>('export_stems', { jobId: job.jobId, stems });
      exportedPaths = result.paths;
      exportOpen = false;
    } catch (e) {
      error = messageOf(e);
    }
  }

  // Annulation du job courant : l'export n'est plus proposé (le backend refuse avec CANCELLED).
  async function cancelJob() {
    if (!job) return;
    error = null;
    try {
      await invoke('cancel_separation', { jobId: job.jobId });
      resetStems();
      job = null;
      exportOpen = false;
      cancelStatus = 'Séparation annulée.';
    } catch (e) {
      error = messageOf(e);
    }
  }
</script>

<div class="h-screen flex flex-col overflow-hidden bg-stone-950 text-amber-100 font-mono">
  <HeaderBar appTitle="AlcheMix Studio" currentModule={2} {onSelectModule} />

  <main class="flex-1 min-h-0 p-6 flex flex-col gap-4 overflow-y-auto">
    {#if loaded && workDir}
      <!-- Navigation interne du module : deux onglets pour économiser la hauteur d'écran -->
      <div class="tabs" role="tablist" aria-label="Étapes du Module 2">
        <button
          type="button"
          role="tab"
          data-testid="tab-setup"
          aria-selected={activeTab === 'setup'}
          class:active={activeTab === 'setup'}
          onclick={() => (activeTab = 'setup')}
        >
          Import &amp; paramétrage
        </button>
        <button
          type="button"
          role="tab"
          data-testid="tab-separation"
          aria-selected={activeTab === 'separation'}
          class:active={activeTab === 'separation'}
          onclick={() => (activeTab = 'separation')}
        >
          Séparation
        </button>
      </div>

      {#if job?.simulated}
        <p data-testid="simulation-banner" role="status" class="text-xs font-bold text-amber-400 border border-amber-700 rounded px-3 py-2">
          SIMULATION : stems fictifs, modèles ONNX absents.
        </p>
      {/if}

      {#if activeTab === 'setup'}
        <!-- Zone 1 : en-tête du module -->
        <Module2Header
          {track}
          engineLabel="SIMULATION"
          engineReady={true}
          {separating}
          hasJob={!!job}
          onImport={importTrack}
          onSeparate={separate}
          onExport={() => (exportOpen = true)}
        />

        <p class="text-[10px] text-stone-400">
          <span class="font-bold uppercase tracking-widest text-amber-500">Dossier de travail :</span>
          <span data-testid="module2-workdir" class="break-all">{workDir}</span>
        </p>

        {#if job}
          <button
            type="button"
            data-testid="cancel-job"
            onclick={cancelJob}
            class="self-start text-xs font-bold uppercase tracking-wider text-stone-400 hover:text-red-400 cursor-pointer"
          >
            ANNULER LA SÉPARATION
          </button>
        {/if}
        {#if cancelStatus}
          <p data-testid="cancel-status" role="status" class="text-xs text-stone-300">{cancelStatus}</p>
        {/if}

        <!-- Zone 2 : configuration du moteur IA -->
        <EngineCard
          models={MODELS}
          selectedId={selectedModel}
          installedIds={[]}
          activeModel={null}
          backend={backendLabel}
          vramText="—"
          {lastMs}
          busy={separating}
          onSelect={selectModel}
        />

        {#if exportedPaths.length > 0}
          <ul data-testid="export-result" class="text-xs text-amber-200 break-all list-disc pl-5">
            {#each exportedPaths as path (path)}
              <li>{path}</li>
            {/each}
          </ul>
        {/if}
      {:else if stemsReady}
        <!-- Zone 3 : les quatre stems (règle commune, curseur partagé, zoom) -->
        <section class="aw-panel" aria-label="Les quatre stems">
          <div class="aw-header">
            <h3 class="aw-panel-title">Les quatre stems</h3>
            <div class="zoom-ctl">
              <button type="button" data-testid="zoom-out" onclick={() => setZoom(zoom / 2)} disabled={zoom <= 1} aria-label="Zoom arrière">−</button>
              <span class="aw-led" data-testid="zoom-level">×{zoom}</span>
              <button type="button" data-testid="zoom-in" onclick={() => setZoom(zoom * 2)} disabled={zoom >= 8} aria-label="Zoom avant">+</button>
            </div>
          </div>
          <div class="stems-body">
            <div class="ruler-row">
              <TimeRuler start={win.start} end={win.end} />
            </div>
            <div data-testid="stem-waveforms" class="waves">
              {#each STEMS as stem (stem.id)}
                <StemWaveform
                  id={stem.id}
                  label={stem.label}
                  color={stem.color}
                  peaks={displayed[stem.id]}
                  maxPeak={stemMaxPeaks[stem.id]}
                  duration={audioDuration}
                  playing={strips[stem.id].playing}
                />
              {/each}
              {#if win.end > win.start && playhead >= win.start && playhead <= win.end}
                <div
                  class="playhead"
                  data-testid="playhead"
                  style="left: calc(12rem + 22px + (100% - 12rem - 22px - 5.5rem - 22px) * {(playhead - win.start) / (win.end - win.start)})"
                ></div>
              {/if}
            </div>
          </div>
        </section>

        <!-- Zone 4 : mixeur -->
        <section class="aw-panel" aria-label="Mixeur">
          <div class="aw-header">
            <h3 class="aw-panel-title">Mixeur</h3>
          </div>
          <div data-testid="stem-rack" class="rack">
            {#each STEMS as stem (stem.id)}
              <StemStrip
                id={stem.id}
                label={stem.label}
                color={stem.color}
                playing={strips[stem.id].playing}
                volume={strips[stem.id].volume}
                muted={strips[stem.id].muted}
                soloed={strips[stem.id].soloed}
                rms={stemRms[stem.id]}
                onPlay={(p) => setPlaying(stem.id, p)}
                onVolume={(v) => setVolume(stem.id, v)}
                onMute={(m) => setMuted(stem.id, m)}
                onSolo={(s) => setSolo(stem.id, s)}
              />
            {/each}
          </div>
        </section>

        <!-- Zone 5 : sortie master -->
        <MasterMeter peak={level.peak} rms={level.rms} />
      {:else}
        <!-- Onglet Séparation sans stems : état vide qui guide vers l'import et la séparation. -->
        <section class="aw-panel" aria-label="Séparation" data-testid="separation-empty">
          <div class="aw-header">
            <h3 class="aw-panel-title">Séparation</h3>
          </div>
          <div class="empty-body">
            {#if track}
              <p>Morceau importé : <strong>{track.name}</strong>. Aucun stem pour l'instant.</p>
              <p>Lance la séparation pour afficher les formes d'onde, le mixeur et la sortie master.</p>
              <button
                type="button"
                class="aw-btn-steampunk"
                data-testid="empty-separate"
                disabled={separating}
                onclick={separate}
              >
                {separating ? 'Séparation…' : 'Séparer maintenant'}
              </button>
            {:else}
              <p>Aucun stem à afficher pour l'instant.</p>
              <p>
                Importe un morceau puis lance <strong>SÉPARER</strong> depuis l'onglet
                « Import &amp; paramétrage » : les formes d'onde, le mixeur et la sortie master apparaîtront ici.
              </p>
              <button type="button" class="aw-btn-steampunk" data-testid="empty-goto-import" onclick={() => (activeTab = 'setup')}>
                ➔ Aller à l'import
              </button>
            {/if}
          </div>
        </section>
      {/if}

      {#if error}
        <p data-testid="module2-error" role="alert" class="text-xs text-red-400">{error}</p>
      {/if}
    {/if}
  </main>

  {#if loaded && !workDir}
    <WorkDirDialog onSaved={(settings) => { workDir = (settings as { work_dir: string | null }).work_dir; }} />
  {/if}

  {#if exportOpen && job}
    <ExportDialog
      requiredBytes={job.bytesPerStem * 4}
      onExport={exportStems}
      onCancel={() => (exportOpen = false)}
    />
  {/if}
</div>

<style>
  /* Onglets internes du module, dans l'esprit des plaques de laiton. */
  .tabs {
    display: flex;
    gap: 8px;
    border-bottom: 1px solid var(--aw-border-bright);
    padding-bottom: 0;
  }

  .tabs button {
    font-family: var(--led-font);
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--aw-text-muted);
    background: linear-gradient(180deg, #2a2d35 0%, #15171c 100%);
    border: 1px solid var(--aw-bezel-border);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    padding: 10px 22px;
    cursor: pointer;
  }

  .tabs button.active {
    color: #121316;
    background: linear-gradient(180deg, #e0b88a 0%, var(--aw-copper) 55%, #b06a43 100%);
    border-color: var(--aw-copper-light);
    box-shadow: 0 0 14px rgba(200, 125, 85, 0.45);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  .tabs button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .tabs button:focus-visible {
    outline: 2px solid var(--aw-gold);
    outline-offset: 2px;
  }

  .empty-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 36px 16px 32px;
    background: var(--aw-panel);
    text-align: center;
  }

  .empty-body p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--aw-text-muted);
  }

  .empty-body strong {
    color: var(--aw-gold);
  }

  .empty-body button {
    margin-top: 10px;
  }

  .zoom-ctl {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .zoom-ctl button {
    width: 26px;
    height: 26px;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--aw-bg);
    background: var(--aw-copper);
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .zoom-ctl button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .zoom-ctl .aw-led {
    font-size: 0.8rem;
    min-width: 2.2rem;
    text-align: center;
  }

  .stems-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 16px 16px;
    background: var(--aw-panel);
  }

  /* La règle s'aligne sur la colonne des formes d'onde (nom 12rem + écart 22px, état 5.5rem + 22px). */
  .ruler-row {
    margin-left: calc(12rem + 22px);
    margin-right: calc(5.5rem + 22px);
  }

  .waves {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* Curseur de lecture vertical partagé par les quatre stems. */
  .playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--aw-gold);
    box-shadow: 0 0 8px var(--aw-gold-glow);
    pointer-events: none;
  }

  .rack {
    display: flex;
    justify-content: center;
    gap: 36px;
    padding: 18px 16px 20px;
    background: var(--aw-panel);
  }
</style>
