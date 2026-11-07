# Tasks: Module 2 — Démixage IA des Stems

**Input** : [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [contracts/module2-contracts.md](./contracts/module2-contracts.md)

**Légende** : `[P]` = tâche parallélisable (fichiers distincts, pas de dépendance). La colonne **Kanzo** donne la carte correspondante ; « nouvelle » signifie qu'une carte doit être créée.

## Phase 1 — Fondations

| ID | Tâche | Fichiers | FR | Kanzo |
|---|---|---|---|---|
| T001 | Squelette des modules Rust (`src-tauri/src/module2/`) et Svelte (`frontend/src/lib/module2/`), types partagés selon contrats §2 et §2 TypeScript | `module2/mod.rs`, `module2/types.ts` | — | #23 |
| T002 | Dossier de travail : lecture, écriture, persistance, contrôle d'espace et d'accès en écriture. Tests de `set_work_dir` et `check_workspace` | `settings.rs` | FR-016, FR-018 | #35 |
| T003 | Gestion des modèles : `get_model_info`, `download_model` avec garde `confirmed`, fichier temporaire, checksum, nettoyage, annulation | `models.rs` | FR-015 | #36 |

**Garde de phase** : `cargo test` vert sur T002 et T003 (cas « confirmation absente », « fichier partiel supprimé », « checksum invalide »).

## Phase 2 — Pipeline (backend)

| ID | Tâche | Fichiers | FR | Kanzo |
|---|---|---|---|---|
| T004 | Import : `import_track` (décodage des métadonnées), `receive_from_module1` avec refus si non validé | `decode.rs`, `mod.rs` | FR-009, FR-010, NFR-004 | #33, #29 |
| T005 [P] | Découpage en segments 8,0 s, recouvrement 87,5 %, fenêtre linéaire, recollage. Tests sur bornes et durée | `chunk.rs` | FR-003 | #24 |
| T006 [P] | Mode simulation : stems fictifs de même durée, drapeau `simulated: true` | `simulate.rs` | FR-007 | #30 |
| T007 | Inférence ONNX via `ort` : session, backend CPU puis DirectML, choix du modèle selon le stem | `infer.rs` | FR-001, FR-002, FR-006 | #23 |
| T008 | Soustraction spectrale anti-fuite, mesure de fuite | `bleed.rs` | FR-004 | #25 |
| T009 | Job de séparation : modes Performance et Studio, progression, annulation par drapeau atomique entre segments, événements `module2://` | `job.rs`, `mod.rs` | FR-005, FR-008 | #26 |
| T010 | Export sélectif : `export_stems` écrit uniquement les stems demandés, nommage `<piste>__<stem>.wav`, refus d'une liste vide | `encode.rs` | FR-017 | #35 |

**Garde de phase** : `cargo test` vert sur T004 à T010. SC-001 atteint en mode simulation.

## Phase 3 — Interface (frontend)

| ID | Tâche | Fichiers | FR | Kanzo |
|---|---|---|---|---|
| T011 | `Module2View`, `StemLane` (Play/Pause à gauche, bronze), `StemStrip` (fader, VU, Solo, Mute). Styles repris de `venetian-steampunk.css` | `module2/*.svelte` | FR-011, FR-012, FR-013, FR-014 | #27 |
| T012 | Modale qualité Performance / Studio, accessible au clavier | `QualityDialog.svelte` | FR-005, FR-011 | #28 |
| T013 | Dialogues : choix du dossier de travail (bloquant tant qu'il n'est pas défini), confirmation de téléchargement avec taille, sélection des stems à exporter | `module2/WorkDirDialog.svelte`, `ModelConfirmDialog.svelte`, `ExportDialog.svelte` | FR-015, FR-016, FR-017 | #35, #36 |
| T014 | Store d'état en runes (`stemStore.svelte.ts`) : sélection d'écoute, progression, statut de simulation | `stemStore.svelte.ts` | FR-008, FR-013 | #27 |
| T015 | Lecture des stems sélectionnés en Web Audio ; Play et Pause par stem, mélange simultané | `module2/player.ts` | FR-013, FR-014 | #27 |

**Garde de phase** : Vitest vert sur T011 à T015. Parcours clavier vérifié sur la modale et les dialogues.

## Phase 4 — Intégration et documentation

| ID | Tâche | Fichiers | FR | Kanzo |
|---|---|---|---|---|
| T016 | Tests d'intégration : import, séparation en simulation, export sélectif, dossier de travail manquant | `src-tauri/tests/module2_flow.rs`, tests Vitest | SC-001, SC-004, SC-005, SC-008 | #31 |
| T017 | Réception depuis le Module 1 câblée (raccourci optionnel) | `Module1View.svelte` | FR-010 | #29 |
| T018 | Mesure SDR et fuite sur jeu de test, une fois le modèle validé | scripts de test | SC-002, SC-003 | #22 |
| T019 | Mise à jour de `specifications-Alchemix.md` (§7) une fois le module livré | `specifications-Alchemix.md` | — | #32 |

## Dépendances

- T001 avant tout le reste.
- T002 et T003 avant T007 (le backend d'inférence a besoin d'un modèle installé et d'un dossier de travail).
- T005, T006 et T008 sont indépendants entre eux.
- T009 dépend de T005, T006, T007 et T008.
- T011 à T015 peuvent démarrer dès que les types de T001 existent, en utilisant le mode simulation.
- T018 dépend du choix de modèle validé (research §4).

## Points à trancher pendant l'implémentation

- Modèle voix retenu (BS-RoFormer ou Mel-Band RoFormer) : décidé après conversion ONNX et licence du poids (T007, T018).
- Mode Studio : nombre de passes à mesurer (T009).
- Le type `ErrorCode` côté Rust doit reprendre exactement les codes listés dans `contracts/module2-contracts.md` §2.
