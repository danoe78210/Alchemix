# Implementation Plan: Module 1 — Importation Audio, Analyse DSP & Métadonnées ID3

**Branch**: `001-module1-audio-analysis` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-module1-audio-analysis/spec.md`

## Summary

Le Module 1 charge deux pistes audio (Platine A — Master, Platine B — Candidate) et affiche pour chacune
le BPM (2 décimales), la tonalité Camelot et les métadonnées ID3 enrichies, puis calcule un verdict de
compatibilité harmonique (Gatekeeper) entre les deux. L'approche technique repose sur le moteur DSP
existant `frontend/src/lib/audioEngine.js` (BPM par tempogramme de Fourier + correction de demi-tempo,
tonalité par filtre passe-bas < 1000 Hz + Krumhansl-Schmuckler) et `camelot.js`,
assemblés par `Module1View.svelte` et les composants Svelte existants. Conformément à la constitution,
les calculs DSP lourds sont exécutés dans un Web Worker dédié (`audioWorker.js`, en place depuis alchemix#6 et
alchemix#11 ; seul le décodage reste sur le fil principal) et l'UI restera en CSS Scoped Steampunk sans dépendance externe.

## Technical Context

**Language/Version**: JavaScript ES2022 + TypeScript (blocs `<script lang="ts">` Svelte 5) ; Svelte 5, Vite 6, Vitest 5

**Primary Dependencies**: `svelte@^5`, `@sveltejs/vite-plugin-svelte@^5`, `vite@^6`, `vitest@^5`, `jsdom@^30`, `@testing-library/svelte@^5.4.2`, `@testing-library/jest-dom@^7`, shell desktop Tauri 2 (`@tauri-apps/api@^2`, `@tauri-apps/cli@^2`). Aucune dépendance CSS externe (pas de Tailwind).

**Storage**: N/A pour le Module 1 — buffers audio et état d'analyse en mémoire (Web Audio API) ; la persistance de session `.mashup` est hors périmètre.

**Testing**: Vitest 5 + jsdom + Testing Library, exécuté depuis la racine du dépôt (`npm test` = `vitest run`) ; 20 fichiers de test (état du 2026-11-04 : 179 tests, 100 % au vert), dont `frontend/src/lib/audioEngine.test.js`, `frontend/src/lib/loudness.test.js` et les tests des composants et vues sous `frontend/src/lib/`. Build : `npm run build` = `vite build` (root Vite `frontend/`, sortie `dist/`), exigé sans erreur.

**Target Platform**: Application desktop Tauri 2 (Windows 11 Pro en environnement de dev) ; prévisualisation web via `npm run dev` (Vite, port 5173).

**Project Type**: Application desktop (shell Tauri 2 / Rust + frontend Svelte 5). Les commandes npm se lancent à la racine du dépôt (`C:\Dev\Alchemix`), il n'existe pas de `frontend/package.json`.

**Performance Goals**: Interface fluide à 60 FPS pendant l'analyse ; aucun calcul DSP lourd (FFT, tempo, tonalité, inférence IA) sur le thread principal.

**Constraints**: 100 % des tests Vitest au vert et build de production sans erreur à chaque étape (règle absolue) ; CSS Scoped Svelte exclusivement, charte Steampunk/Synthwave (ambre `#FFB300`, cuivre `#C87D55`, vert néon `#00E676`, cyan `#29B6F6`) ; calculs lourds en Web Workers dédiés ; modifications par injections ciblées.

**Scale/Scope**: 2 pistes simultanées, ~8 composants Svelte + 1 vue, 2 moteurs de lib (`audioEngine.js`, `camelot.js`), 1 service (`metadataService.js`), 20 fichiers de test (état du 2026-11-04).

## Constitution Check

*GATE: vérifié avant Phase 0, re-vérifié après la conception Phase 1 — conforme à `.specify/memory/constitution.md` v1.0.0.*

| Principe (constitution v1.0.0) | Statut | Justification / action |
|---|---|---|
| I. Tests & Build (règle absolue) | PASS | `npm test` (179 tests / 20 fichiers au 2026-11-04) et `npm run build` sont des portes de validation continues listées dans `quickstart.md` et les tâches. |
| II. Style & CSS Scoped Steampunk | PASS | Aucun ajout de dépendance CSS ; styles via `frontend/src/lib/styles/venetian-steampunk.css` et styles scopés des composants. |
| III. Audio non-bloquant (Web Workers, 60 FPS) | PASS (remédié) | Écart initial (aucun `Worker`) comblé par `audioWorker.js`. Restent sur le fil principal : `decodeAudioData` (AudioContext indisponible dans un worker). Gain de fluidité non mesuré. |
| IV. Modularité & Fast-Track | PASS | Implémentation par injections ciblées dans les fichiers existants ; aucun réécriture de fichier complet en un bloc. |

## Project Structure

### Documentation (this feature)

```text
specs/001-module1-audio-analysis/
├── spec.md                  # Spécification de la feature (/speckit-specify)
├── plan.md                  # Ce fichier (/speckit-plan)
├── research.md              # Phase 0 (/speckit-plan)
├── data-model.md            # Phase 1 (/speckit-plan)
├── contracts/
│   └── module1-contracts.md # Contrats module/composants/worker (Phase 1)
├── quickstart.md            # Guide de validation (Phase 1)
├── checklists/
│   └── requirements.md      # Checklist qualité de la spec
└── tasks.md                 # Phase 2 (/speckit-tasks — NON créé par /speckit-plan)
```

### Source Code (repository root)

```text
C:\Dev\Alchemix/
├── package.json             # Scripts racine : test=vitest run, build=vite build, dev=vite
├── vite.config.js           # root=frontend, test jsdom, setup test/vitest-setup.js
├── frontend/
│   ├── index.html
│   ├── src/
│   │   ├── main.js
│   │   └── lib/
│   │       ├── audioEngine.js          # Moteur DSP : parseID3Tags/readID3Tags, detectBPM, detectKey, detectBitrate, simulateFromFileName
│   │       ├── audioEngine.test.js
│   │       ├── camelot.js              # Matrice Camelot + compatibilityBetween
│   │       ├── components/
│   │       │   ├── HeaderBar.svelte / .test.js
│   │       │   ├── CassetteDeck.svelte
│   │       │   ├── ID3TagCard.svelte / .test.js
│   │       │   ├── TempoDisplay.svelte
│   │       │   ├── BeatgridOverlay.svelte / .test.js
│   │       │   ├── CamelotWheel.svelte
│   │       │   ├── CamelotCompatibility.svelte / .test.js
│   │       │   └── MetadataModal.svelte
│   │       ├── services/
│   │       │   └── metadataService.js  # fetchOnlineMetadata (iTunes Search, non bloquant)
│   │       ├── styles/
│   │       │   └── venetian-steampunk.css
│   │       └── views/
│   │           ├── Module1View.svelte  # Vue 3 colonnes, état Svelte 5 ($state)
│   │           └── Module1View.test.js
│   └── test/
│       ├── CassetteDeck.test.js
│       └── vitest-setup.js
└── specs/001-module1-audio-analysis/   # Artefacts Spec Kit de la feature
```

**Structure Decision**: Application desktop mono-dépôt existante (Option 2 adaptée : un seul frontend `frontend/` servi par Vite à la racine, shell Tauri 2). Aucune restructuration de dépôt n'est introduite par le Module 1 ; les nouveaux fichiers se limitent au worker audio et à d'éventuels tests ciblés.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Ajout d'un Web Worker dédié pour le DSP (constitution III) | Garantir 60 FPS pendant l'analyse FFT/tempo/tonalité de deux pistes ; le thread principal ne doit héberger aucun calcul lourd. | Garder le DSP synchrone sur le thread principal : rejeté car contraire à la constitution v1.0.0 (principe III) et aux objectifs de performance (SC-006). |
| Enrichissement en ligne des métadonnées (iTunes Search) | Pochette HD et champs manquants lorsque les tags ID3 locaux sont incomplets. | S'appuyer uniquement aux tags ID3 locaux : rejeté car la spec exige une carte enrichie (pochette 144x144, champs complets) ; le service reste non bloquant avec repli `{ success: false }`. |
