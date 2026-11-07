---

description: "Task list for Module 1 — Importation Audio, Analyse DSP & Métadonnées ID3"
---

# Tasks: Module 1 — Audio Analysis & ID3 Metadata

**Input**: Design documents from `/specs/001-module1-audio-analysis/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/module1-contracts.md, quickstart.md

**Tests**: The spec mandates 100 % green Vitest (38+ tests / 7 files) at every step (constitution principle I), so validation tasks are included as blocking checkpoints.

**Organization**: Tasks are grouped by user story (US1–US4 from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- All paths are relative to the repo root `C:\Dev\Alchemix`; npm commands run from the root (no `frontend/package.json` exists)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the working baseline before any change

- [x] T001 Verify prerequisites: Node.js present and `npm install` already run at repo root (`package.json` scripts `test`/`build` available)
- [x] T002 Run `npm test` from `C:\Dev\Alchemix` — 51/51 tests green on 7 files (run after the T003/T004/T011/T014 edits; no pre-edit baseline captured, noted in report)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Created `frontend/src/lib/audioWorker.js` + async wrapper `detectBPMKey()` in `frontend/src/lib/audioEngine.js`, wired into `Module1View.loadTrack` with synchronous jsdom fallback (constitution III; contracts §3; research.md R1)
- [x] T004 Implemented `resetAudioEngine()` in `frontend/src/lib/audioEngine.js` (terminates DSP worker, idempotent) + regression tests in `audioEngine.test.js` (FR-009, research.md R4)

**Checkpoint**: Foundation ready — user story work can now begin

---

## Phase 3: User Story 1 - Chargement et analyse simultanées de deux pistes (Priority: P1) 🎯 MVP

**Goal**: Load one track on Platine A (Master) and one on Platine B (Candidate); each deck shows BPM (2 decimals), Camelot key and ID3 card.

**Independent Test**: Load two audio files (MP3 + WAV) on decks A and B in `frontend/src/lib/views/Module1View.svelte`; each deck displays BPM to 2 decimals, Camelot code and metadata card. A file without ID3 tags shows fields as unavailable without blocking DSP analysis.

### Implementation for User Story 1

- [x] T005 [P] [US1] Verified `CassetteDeck.svelte` retro neon cassette decks, animated reels/label, LOAD/EJECT toggle in `frontend/src/lib/components/CassetteDeck.svelte` (tests: `frontend/test/CassetteDeck.test.js`) — aligned
- [x] T006 [US1] Verified `Module1View.svelte` 3-column assembly of both decks with Svelte 5 `$state` A/B in `frontend/src/lib/views/Module1View.svelte` (tests: `frontend/src/lib/views/Module1View.test.js`) — aligned
- [x] T007 [P] [US1] Verified `detectBPM` in `frontend/src/lib/audioEngine.js`: parabolic peak fitting, 2-decimal rounding, onsetRegularity anti-double-tempo clamp 70–115 BPM (FR-002/FR-003; covered by `audioEngine.test.js`) — aligned
- [x] T008 [P] [US1] Verified `detectKey` in `frontend/src/lib/audioEngine.js`: RBJ biquad low-pass < 180 Hz + adjusted Krumhansl-Schmuckler with third-based Major/Minor discrimination (11B vs 8A, 12B vs 9A tests) (FR-004) — aligned

**Checkpoint**: User Story 1 fully functional and testable independently — run `npm test` (must stay 100 % green)

---

## Phase 4: User Story 2 - Verdict de compatibilité harmonique (Gatekeeper) (Priority: P2)

**Goal**: Central Gatekeeper panel under the Camelot Wheel showing consonance %, Camelot shift, GO/NO-GO verdict (threshold 60 %), `⚠ WARP HAZARD (>15%)` badge and `÷2 TEMPO CIBLE` button.

**Independent Test**: With two analyzed tracks (e.g. 8A vs 8A → 100/100 GO; incompatible pair < 60 → NO-GO with max ±3 semitone pitch shift; tempo gap > 15 % warp → hazard badge visible).

### Implementation for User Story 2

- [x] T009 [P] [US2] Verified `CamelotCompatibility.svelte` Gatekeeper centered under the Camelot Wheel in `Module1View.svelte`: score %, pitch shift, `⚠ WARP HAZARD (>15%)` badge (strictly > 15 %), `÷2 TEMPO CIBLE` button wired to `halveTargetBpm` (FR-006) — aligned
- [x] T010 [US2] Verified `compatibilityBetween` in `frontend/src/lib/camelot.js` matches the reference matrix (100/95/90/80/75/55, GO threshold 60) and is wired into `Module1View.svelte` runAnalysis (FR-005; tests: `Module1View.test.js`) — aligned

**Checkpoint**: User Stories 1 AND 2 both work independently — run `npm test` (100 % green)

---

## Phase 5: User Story 3 - Carte de métadonnées enrichies (Priority: P3)

**Goal**: Enriched ID3 card per track: 96x96 px cover (`coverUrl`), title, artist, album, year, genre, dynamic bitrate (`320 kbps`/`VBR`), sample rate (`44.1 kHz`), format (`MP3`/`WAV`).

**Independent Test**: Load a 320 kbps 44.1 kHz MP3 with full tags + artwork, then a VBR file: each card shows all fields, `VBR` bitrate label where applicable; missing tags render as unavailable without breaking analysis.

### Implementation for User Story 3

- [x] T011 [P] [US3] Fixed `ID3TagCard.svelte`: cover 80→96 px (`cover-img` CSS) and added `sample_rate` (FRÉQ.) meta item with `data-testid="meta-sample-rate"`; dynamic bitrate `320 kbps`/`VBR` and format badge already present; test title updated to 96x96 (FR-007)
- [x] T012 [US3] Verified `fetchOnlineMetadata` in `frontend/src/lib/services/metadataService.js` non-blocking with silent `{ success: false }` fallback; `coverUrlA`/`coverUrlB` enrichment wired in `Module1View.svelte` (FR-007; research.md R5) — aligned

**Checkpoint**: User Stories 1–3 work independently — run `npm test` (100 % green)

---

## Phase 6: User Story 4 - Export vers Module 2 et sortie propre (Priority: P3)

**Goal**: « Démixer Piste A ➔ Module 2 » / « Démixer Piste B ➔ Module 2 » export buttons and « Quitter et nettoyer le cache » button triggering `resetAudioEngine()`.

**Independent Test**: With two tracks loaded, clicking an export button transmits the concerned track to Module 2 (`onExportToModule2('A'|'B')`); clicking « Quitter et nettoyer le cache » resets the audio engine state to initial.

### Implementation for User Story 4

- [ ] T013 [P] [US4] **Non réalisé (constat 2026-11-03)** : le handler `handleSendToModule2` de `Module1View.svelte` ne fait qu'un `console.info`, sans transfert vers le Module 2. Boutons « DÉMIXER PISTE A/B ➔ MODULE 2 » présents sur chaque `ID3TagCard` (FR-010 partiel). Initialement : Verified export buttons « DÉMIXER PISTE A/B ➔ MODULE 2 » on each `ID3TagCard` (FR-010; covered by `Module1View.test.js`) — aligned
- [x] T014 [US4] Added « 🧹 QUITTER ET NETTOYER LE CACHE » button (`data-testid="quit-clean-cache"`) + `quitAndCleanCache()` calling `resetAudioEngine()` and resetting decks/analysis in `frontend/src/lib/views/Module1View.svelte` (FR-009)

**Checkpoint**: All user stories independently functional — run `npm test` (100 % green)

---

## Phase 7: Polish & Cross-Cutting Concerns (Quality Gates)

**Purpose**: Constitution principle I (règle absolue) — final validation before delivery

- [x] T015 [P] Ran `npm test` from `C:\Dev\Alchemix`: **7 test files, 51/51 tests passed** (was 48 before the 3 new worker/reset tests) — 100 % green (SC-001)
- [ ] T016 **Build final manuel (hors exécution automatique)** : le build de production Vite (`npx vite build` / `npm run build` depuis `C:\Dev\Alchemix`, sortie `dist/`) est exécuté **manuellement par l'utilisateur**, pas automatiquement par l'agent. Critère : compilation sans erreur (SC-002).
- [x] T017 [P] Run `quickstart.md` manual validation scenarios US1–US4 in `npm run dev` (Vite port 5173): two-deck load, Gatekeeper verdicts, ID3 cards, export buttons, quit-and-clean — **validée et clôturée par l'utilisateur (2026-11-03)** ; aucune exécution automatisée par l'agent (navigateur refusé pendant la session)
- [ ] T018 [P] Update `specifications-Alchemix.md` if any behavior/interface changed, per project rules

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (T003 worker + T004 purge are prerequisites)
- **User Stories (Phases 3–6)**: All depend on Foundational; proceed in priority order P1 → P2 → P3 → P3, or in parallel if staffed
- **Polish (Phase 7)**: Depends on all user stories; T015/T016 are the final quality gates

### User Story Dependencies

- **US1 (P1)**: After Foundational — no dependency on other stories (MVP)
- **US2 (P2)**: After Foundational and US1 analysis output; independently testable via `camelot.js`
- **US3 (P3)**: After Foundational; independently testable via `ID3TagCard.svelte` + `metadataService.js`
- **US4 (P3)**: After Foundational (uses T004 `resetAudioEngine()`); independently testable via `Module1View.svelte` events

### Within Each User Story

- Verify existing tests before implementing (baseline from T002)
- Components before view wiring; engine functions before view wiring
- Run `npm test` at each story checkpoint (must stay 100 % green)

### Parallel Opportunities

- T005, T007, T008 (US1) touch different files → parallelizable
- T009 (US2) and T011 (US3) touch different components → parallelizable across stories
- T013, T014 (US4) both edit `Module1View.svelte` → sequential within US4
- T015, T017 (Phase 7) → parallelizable; T016 after tests are green

---

## Parallel Example: User Story 1

```text
Task T005: verify CassetteDeck.svelte in frontend/src/lib/components/CassetteDeck.svelte
Task T007: validate detectBPM in frontend/src/lib/audioEngine.js
Task T008: validate detectKey in frontend/src/lib/audioEngine.js
(T006 wires the view after T005)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T004) — CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T005–T008)
4. **STOP and VALIDATE**: run `npm test` independently ; le build final Vite est exécuté manuellement par l'utilisateur (voir T016)
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add US1 → `npm test` green → MVP
3. Add US2 → `npm test` green
4. Add US3, US4 → `npm test` green
5. Phase 7: full `npm test` (38+/7 files) + quickstart validation ; build final Vite exécuté manuellement par l'utilisateur (T016)

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Then: Dev A → US1, Dev B → US2, Dev C → US3 + US4
3. Each story integrates independently; final Phase 7 gates unify validation

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [USx] labels map tasks to spec.md user stories for traceability
- Every checkpoint runs `npm test` from repo root and must stay 100 % green (constitution principle I)
- Constitution principle IV: make targeted edits; do not rewrite whole files in one block
- Avoid: vague tasks, same-file conflicts within a phase, cross-story dependencies that break independence
