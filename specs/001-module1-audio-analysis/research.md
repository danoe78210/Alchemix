# Research — Module 1 (Phase 0)

**Feature**: `specs/001-module1-audio-analysis` | **Date**: 2026-11-01

Toutes les inconnues du Technical Context sont résolues ci-dessous. Aucun `[NEEDS CLARIFICATION]`
ne subsiste dans la spec.

## R1 — Traitement DSP non bloquant (Web Worker)

- **Decision**: Introduire un Web Worker dédié (`frontend/src/lib/audioWorker.js`) recevant les
  `ArrayBuffer` des pistes et renvoyant `{ bpm, key, bitrate, metadata }` ; `audioEngine.js` expose
  une API asynchrone qui encapsule le worker, avec repli synchrone uniquement pour les tests jsdom
  (où `Worker` est indisponible).
- **Rationale**: Constitution v1.0.0 principe III (MUST) + critère SC-006 (60 FPS). Actuellement,
  `frontend/src` ne contient aucun `Worker` (vérifié par grep) : les appels `detectBPM`/`detectKey`
  tournent sur le thread principal — écart à combler impérativement.
- **Alternatives considered**: (a) DSP synchrone sur le thread principal — rejeté, viole la
  constitution et bloque l'UI ; (b) `OffscreenCanvas`/WASM — rejeté pour le Module 1 (YAGNI,
  aucune preuve de besoin au-delà d'un worker JS).

## R2 — Détection de tempo (BPM)

- **Decision**: Conserver `detectBPM(audioBuffer)` dans `audioEngine.js` : interpolation parabolique
  (*quadratic peak fitting*) sur les pics d'onset, précision affichée à 2 décimales (ex. 187.54 BPM),
  protection anti-double tempo (*onsetRegularity*) ramenant le résultat dans 70–115 BPM.
- **Rationale**: Comportement déjà requis par la spec (FR-002, FR-003) et testé dans
  `audioEngine.test.js` ; aucune modification de l'algorithme n'est nécessaire.
- **Alternatives considered**: Détection par autocorrélation seule — rejetée, moins précise sur les
  rythmes variables (moins bonne que le fitting parabolique sur les pics).

## R3 — Détection harmonique (tonalité / Camelot)

- **Decision**: Conserver `detectKey(audioBuffer)` : filtre passe-bas biquad RBJ (< 180–200 Hz) pour
  isoler la fondamentale de basse, puis matrice Krumhansl-Schmuckler optimisée Majeur/Mineur,
  converti en code Camelot 1A–12B via `camelot.js` (`camelotFromKeyName`, `keyInfo`).
- **Rationale**: Requis par FR-004 ; la discrimination Majeur/Mineur (ex. 10B vs 7A) est un critère
  de succès (SC-004) déjà couvert par les tests existants.
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
- **Rationale**: La spec (FR-007, story 3) exige une carte enrichie (pochette, `coverUrl` 96x96 en
  affichage, champs complets) ; le contrat d'erreur « jamais d'exception » préserve la fluidité.
- **Alternatives considered**: Métadonnées 100 % locales — rejeté, ne satisfait pas la carte
  enrichie requise ; bloquer l'UI sur le réseau — rejeté (viole le non-bloquant).

## R6 — Stratégie de test et de build

- **Decision**: Porte de validation continue depuis la racine du dépôt : `npm test` (Vitest 5, jsdom,
  7 fichiers de test, 38+ tests, 100 % au vert) puis `npm run build` (`vite build`, sortie `dist/`,
  sans erreur). Les scénarios de validation manuelle sont documentés dans `quickstart.md`.
- **Rationale**: Constitution v1.0.0 principe I (règle absolue) et critères SC-001/SC-002 de la spec.
- **Alternatives considered**: Tests exécutés depuis `frontend/` — rejeté, il n'y a pas de
  `frontend/package.json` ; la racine est l'unique point d'entrée valide (vérifié dans
  `package.json` et `vite.config.js`).
