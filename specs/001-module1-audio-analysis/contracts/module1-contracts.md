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
- **Règles** : aucun calcul lourd hors du worker ; en environnement de test (jsdom, sans `Worker`),
  repli synchrone documenté ; `resetAudioEngine()` appelle `worker.terminate()`.

## 4. Contrats des composants Svelte (props / événements)

| Composant | Props principales | Événements |
|---|---|---|
| `Module1View.svelte` | — (vue racine du module) | `onExportToModule2('A' \| 'B')`, `onQuitAndClean()` |
| `CassetteDeck.svelte` | `label` ("A"/"B"), `track`, `isMaster` | `onLoadFile(file)`, `onEject()` |
| `ID3TagCard.svelte` | `metadata`, `coverUrl` | — (affichage seul) |
| `CamelotCompatibility.svelte` | `verdict` (VerdictCompatibilité), `bpmA`, `bpmB` | `onHalfTempo()` (bouton `÷2 TEMPO CIBLE`) |
| `TempoDisplay.svelte`, `CamelotWheel.svelte`, `BeatgridOverlay.svelte`, `HeaderBar.svelte`, `MetadataModal.svelte` | Données d'analyse courante | — |

**Règles transverses** : props typées (TypeScript) ; aucun composant ne bloque sur le réseau ;
les états chargement/erreur sont gérés par `Module1View` ; style CSS Scoped uniquement.
