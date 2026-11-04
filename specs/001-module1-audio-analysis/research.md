# Research — Module 1 (Phase 0)

**Feature**: `specs/001-module1-audio-analysis` | **Date**: 2026-11-01

Toutes les inconnues du Technical Context sont résolues ci-dessous. Aucun `[NEEDS CLARIFICATION]`
ne subsiste dans la spec.

## R1 — Traitement DSP non bloquant (Web Worker)

- **Decision**: Introduire un Web Worker dédié (`frontend/src/lib/audioWorker.js`) recevant le PCM
  des pistes (tempo, tonalité) et les canaux avec le fichier (bitrate, loudness). `audioEngine.js`
  expose une API asynchrone qui encapsule le worker (`detectBPMKey`, `analyzeMetadata`), avec repli
  synchrone uniquement pour les tests jsdom (où `Worker` est indisponible). Le décodage
  `decodeAudioData` reste sur le thread principal (AudioContext indisponible dans un worker).
- **Rationale**: Constitution v1.0.0 principe III (MUST) + critère SC-006 (60 FPS). Constat initial
  (2026-11-01) : `frontend/src` ne contenait aucun `Worker` ; les appels `detectBPM`/`detectKey`
  tournaient sur le thread principal — écart comblé depuis (alchemix#6, alchemix#11).
- **Alternatives considered**: (a) DSP synchrone sur le thread principal — rejeté, viole la
  constitution et bloque l'UI ; (b) `OffscreenCanvas`/WASM — rejeté pour le Module 1 (YAGNI,
  aucune preuve de besoin au-delà d'un worker JS).

## R2 — Détection de tempo (BPM)

- **Decision**: Conserver `detectBPM(audioBuffer)` dans `audioEngine.js` (révisé 2026-11-04) : tempogramme
  de Fourier sur le flux spectral (trames de 1024, pas de 256), évalué sur une grille de BPM puis affiné
  à 0,01 BPM, avec renfort du double tempo ; correction de demi-tempo pour les tempos > 150 BPM à
  attaques irrégulières. Résultat arrondi à 2 décimales (ex. 187.54 BPM). L'interpolation parabolique
  initialement prévue n'est plus utilisée.
- **Rationale**: Requis par FR-002 et FR-003 ; couvert par `audioEngine.test.js`. Les tests verts
  (signaux synthétiques) ne suffisent pas à valider la précision sur morceaux réels (voir alchemix#7).
- **Alternatives considered**: Détection par autocorrélation seule — rejetée, moins précise sur les
  rythmes variables.

## R3 — Détection harmonique (tonalité / Camelot)

- **Decision**: Conserver `detectKey(audioBuffer)` (révisé 2026-11-04) : filtre passe-bas biquad RBJ
  à 1000 Hz pour isoler la basse et les accords, chromagramme N = 8192, matrice Krumhansl-Schmuckler
  ajustée Majeur/Mineur (discrimination par tierce), puis conversion en code Camelot 1A–12B via
  `camelot.js` (`camelotFromKeyName`, `keyInfo`). Le seuil de 180–200 Hz initial a été relevé à 1000 Hz
  (alchemix#17). Un tag ID3 `TKEY` est normalisé en code Camelot avant usage.
- **Rationale**: Requis par FR-004 ; la discrimination Majeur/Mineur (ex. 10B vs 7A) est un critère
  de succès (SC-004). La précision sur morceaux réels reste à valider (alchemix#7, alchemix#17).
- **Alternatives considered**: Chroma seul sans filtrage de la basse — rejeté, la fondamentale de
  basse fausse la corrélation Krumhansl-Schmuckler.

## R4 — Purge mémoire audio (`resetAudioEngine()`)

- **Decision**: Implémenter `resetAudioEngine()` dans `audioEngine.js` : libération des
  `AudioBuffer`/décodeurs, révocation des `URL.createObjectURL`, remise à zéro de l'état interne,
  et `worker.terminate()` lorsque le worker est actif.
- **Rationale**: Requis par FR-009 (bouton « Quitter et nettoyer le cache ») ; garantit l'absence de
  fuite mémoire entre sessions du Module 1.
- **Alternatives considered**: Simple remise à zéro des variables d'état — rejetée, laisse des
  buffers et des workers vivants en mémoire.

## R5 — Enrichissement des métadonnées

- **Decision**: Conserver `metadataService.js` (`fetchOnlineMetadata(title, artist)`, iTunes Search
  sans clé) comme enrichissement progressif et non bloquant : en cas d'erreur ou hors-ligne, repli
  silencieux `{ success: false }`, l'UI affiche les tags ID3 locaux ou des champs indisponibles.
- **Rationale**: La spec (FR-007, story 3) exige une carte enrichie (pochette, `coverUrl` 144x144 px
  en affichage, champs complets) ; le contrat d'erreur « jamais d'exception » préserve la fluidité.
- **Alternatives considered**: Métadonnées 100 % locales — rejeté, ne satisfait pas la carte
  enrichie requise ; bloquer l'UI sur le réseau — rejeté (viole le non-bloquant).

## R6 — Stratégie de test et de build

- **Decision**: Porte de validation continue depuis la racine du dépôt : `npm test` (Vitest 5, jsdom,
  20 fichiers de test, 179 tests, 100 % au vert au 2026-11-04) puis `npm run build` (`vite build`, sortie `dist/`,
  sans erreur). Les scénarios de validation manuelle sont documentés dans `quickstart.md`.
- **Rationale**: Constitution v1.0.0 principe I (règle absolue) et critères SC-001/SC-002 de la spec.
- **Alternatives considered**: Tests exécutés depuis `frontend/` — rejeté, il n'y a pas de
  `frontend/package.json` ; la racine est l'unique point d'entrée valide (vérifié dans
  `package.json` et `vite.config.js`).
