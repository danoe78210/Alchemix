# Contracts — Module 1 (Phase 1)

**Feature**: `specs/001-module1-audio-analysis` | **Date**: 2026-11-01

Contrats internes du Module 1 : API du moteur audio, protocole du worker et props/événements des
composants Svelte. Aucun contrat externe (API publique) n'est exposé par le module ; le seul appel
réseau sortant est celui, non bloquant, de `metadataService.js`.

## 1. Contrat du module `audioEngine.js`

| Fonction | Signature | Contrat |
|---|---|---|
| `parseID3Tags` / `readID3Tags` | `(buffer: ArrayBuffer) → MétadonnéesID3` | Extrait les tags ID3 ; champs absents = chaînes vides, jamais d'exception. |
| `detectBPM` | `(audioBuffer: AudioBuffer) → { bpm: number, confidence: number, regularity: number } \| null` | `bpm` arrondi au centième ; correction de demi-tempo conditionnelle (> 150 BPM à attaques irrégulières). |
| `detectKey` | `(audioBuffer: AudioBuffer) → { code: string, keyName: string, confidence: number } \| null` | `code` = code Camelot 1A–12B ; discrimination Majeur/Mineur (ex. 10B vs 7A). |
| `analyzeTempoKey` | `(audioBuffer: AudioBuffer) → { bpm, confidence, regularity, key }` | Enchaîne `detectBPM` et `detectKey` ; utilisé par le worker et le repli synchrone. |
| `analyzeSegmentsSync` | `(pcm: Float32Array, sampleRate: number, segmentSeconds?: number) → [{ startS, bpm, confidence, regularity, key, keyConfidence }]` | Découpe le PCM en segments (défaut 30 s), applique `analyzeTempoKey` à chacun ; tranches < 1 s ignorées. Fonction pure, partagée avec le worker (alchemix#44, M1). |
| `analyzeSegments` | `(audioBuffer: AudioBuffer, segmentSeconds?: number) → Promise<segments[]>` | Délègue au worker (`type: 'segments'`) si `Worker` existe, sinon repli synchrone. Ne détache pas le buffer de l'appelant (alchemix#44, M1). |
| `waveformPeaks` (`waveform.js`) | `(channelData: Float32Array, width: number, startRatio?: number, endRatio?: number) → Float32Array (2×width)` | Min/max entrelacés par colonne `[min0, max0, ...]` ; invariant min ≤ max ; width ≤ 0 → vide (alchemix#44, M2). Délègue à `waveformPeaksMulti([channelData], width, startRatio, endRatio)`. |
| `waveformPeaksMulti` (`waveform.js`) | `(channels: Float32Array[], width: number, startRatio?: number, endRatio?: number) → Float32Array (2×width)` | Extraction multi-canaux (mono/stéréo) sur 100 % des échantillons : min/max exacts en vue microscopique (`≤ 256` éch./colonne) ; combinaison linéaire (65 % moyenne demi-onde de la colonne + 35 % crête RMS sur sous-fenêtres acoustiques ~10–20 ms) en vue macroscopique (`> 256` éch./colonne), préservant les attaques et la dynamique linéaire sans effet de bloc rectangulaire (alchemix#44). |
| `peakAmplitude` (`waveform.js`) | `(peaks: Float32Array) → number` | Pic réel du signal `max(|v|)` sur toutes les colonnes (0 si silence/entrée vide). Sert à l'échelle verticale globale linéaire (alchemix#44). |
| `computeWaveformBars` (`waveform.js`) | `(peaks: Float32Array, width: number, height: number, options?: { marginRatio?: number, referencePeak?: number }) → Layout` | Convertit les amplitudes `[min, max]` en coordonnées pixels `yTop`/`yBot` centrées sur `mid = height / 2`, avec marge de sécurité symétrique par défaut de 8 % (`WAVEFORM_MARGIN_RATIO = 0.08`), échelle linéaire globale (`referencePeak`), agrégation automatique si `cols > width`, et zéro écrêtage (alchemix#44). |
| `changeMarkers` (`waveform.js`) | `(segments: segments[], mode?: 'rhythm' \| 'key') → [{ t, label }]` | Détecte les changements vs segment précédent : tempo arrondi (`'120 → 90 BPM'`) ou clef (`'8B → 10B'`) ; `t` = `startS` du segment courant ; valeurs null ignorées ; entrée invalide → `[]` (alchemix#44, M5). |
| `detectBPMKey` | `(audioBuffer: AudioBuffer) → Promise<{ bpm, confidence, regularity, key }>` | Délègue à `audioWorker.js` si `Worker` existe, sinon repli synchrone. Ne détache pas le buffer de l'appelant. |
| `detectBitrate` | `(file: File, audioBuffer: AudioBuffer) → string` | Retourne ex. "320 kbps", "1411 kbps" ou "VBR". |
| `simulateFromFileName` | `(fileName: string) → MétadonnéesID3` | Simulation de repli explicite si le décodage réel est indisponible. |
| `resetAudioEngine` | `() → void` | Purge mémoire : libère buffers, révoque les object URLs, termine le worker. |

## 2. Contrat du module `camelot.js`

| Export | Contrat |
|---|---|
| `CAMELOT_KEYS` | Tableau des 24 codes 1A–12B. |
| `compatibilityBetween(keyA, keyB)` | → `{ score, rule, shift, stretch, status, message }` ; score selon la matrice de référence, seuil GO/NO-GO à 60, pitch shift max ±3 demi-tons. |
| `camelotFromKeyName(input)` / `keyInfo(code)` / `parseCode` / `codeFor` | Conversion nom de tonalité ↔ code Camelot. |
| `compatibleCodes(code)` / `badgeLabel(code)` | Codes compatibles et libellé de badge pour l'UI. |

## 3. Protocole du Web Worker DSP (`audioWorker.js`, à créer — voir research.md R1)

- **Message entrant** : `{ type: 'analyze', id: string, pcm: Float32Array, sampleRate: number }` (`pcm` transféré, copié au préalable par `detectBPMKey`).
- **Message sortant** : `{ type: 'result', id, bpm, confidence, regularity, key }` ou `{ type: 'error', id, message }`. Le worker appelle `analyzeTempoKey` (audioEngine.js) ; `detectBPMKey` renvoie le même résultat sans l'`id`.
- **Message entrant (métadonnées)** : `{ type: 'metadata', id, file: File, sampleRate, numberOfChannels, duration, channels: Float32Array[] }` (canaux transférés, copiés au préalable par `analyzeMetadata`).
- **Message sortant (métadonnées)** : `{ type: 'metadata-result', id, bitrate, loudness }` ou `{ type: 'error', id, message }`. Le worker appelle `detectBitrate` et `measureLoudness` ; `analyzeMetadata` renvoie `{ bitrate, loudness }` sans l'`id`.
- **Message entrant (segments, alchemix#44)** : `{ type: 'segments', id: string, pcm: Float32Array, sampleRate: number, segmentSeconds: number }` (`pcm` transféré, copié au préalable par `analyzeSegments`).
- **Message sortant (segments)** : `{ type: 'segments-result', id, segments: [{ startS, bpm, confidence, regularity, key, keyConfidence }] }` ou `{ type: 'error', id, message }`. Le worker appelle `analyzeSegmentsSync` ; `analyzeSegments` renvoie `segments` sans l'`id`.
- **Règles** : aucun calcul lourd hors du worker (le décodage `decodeAudioData` reste sur le fil principal, `AudioContext` étant indisponible dans un worker) ; en environnement de test (jsdom, sans `Worker`),
  repli synchrone documenté ; `resetAudioEngine()` appelle `worker.terminate()`.

## 4. Contrats des composants Svelte (props / événements)

| Composant | Props principales | Événements |
|---|---|---|
| `Module1View.svelte` | — (vue racine du module) | `onExportToModule2('A' \| 'B')`, `onQuitAndClean()` ; panneau forme d'onde intégré (colonne centrale) : `WaveformControls` + `WaveformView` alimentés par `waveformPeaks` + `analyzeSegments` (état par piste `wave`/`isWaveLoading`) (alchemix#44, M6) |
| `CassetteDeck.svelte` | `label` ("A"/"B"), `track`, `isMaster` | `onLoadFile(file)`, `onEject()` |
| `ID3TagCard.svelte` | `metadata`, `coverUrl` | — (affichage seul) |
| `CamelotCompatibility.svelte` | `verdict` (VerdictCompatibilité), `bpmA`, `bpmB` | `onHalfTempo()` (bouton `÷2 TEMPO CIBLE`) |
| `TempoDisplay.svelte`, `CamelotWheel.svelte`, `BeatgridOverlay.svelte`, `HeaderBar.svelte`, `MetadataModal.svelte` | Données d'analyse courante | — |
| `WaveformView.svelte` | `peaks` (`Float32Array` 2×width, `waveformPeaks`/`waveformPeaksMulti`), `durationS`, `markers` (`{ t, label }[]`), `mode` (`'rhythm' \| 'key'`), `title`, `maxPeak` (optionnel, référence d'échelle constante au zoom) | — (affichage seul ; marqueurs en overlay DOM, testables en jsdom). Canvas : résolution adaptative (`ResizeObserver`), coordonnées calculées par `computeWaveformBars` avec marge symétrique de 8 % haut/bas, rendu double passe `#FFB300` (crêtes + cœur énergétique) sur fond `#101216`, axe médian `#C87D55`, aucun écrêtage (alchemix#44) |
| `WaveformControls.svelte` | `track` (`'A' \| 'B'`), `mode` (`'rhythm' \| 'key'`) | `onTrackChange(track)`, `onModeChange(mode)` — composant contrôlé, deux leviers `.aw-toggle-lever` (alchemix#44, M4) |

**Règles transverses** : props typées (TypeScript) ; aucun composant ne bloque sur le réseau ;
les états chargement/erreur sont gérés par `Module1View` ; style CSS Scoped uniquement.
