# Implementation Plan: Module 2 — Démixage IA des Stems

**Branch**: `002-module2-stem-separation` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: spec validée par l'utilisateur (2026-11-05). Décision de runtime : Rust / Tauri 2.

## Summary

Module 2 sépare une piste importée en 4 stems (voix, batterie, basse, autres) par inférence ONNX locale. Le pipeline tourne en Rust (backend Tauri) ; l'interface est en Svelte 5 et reprend le rack et les formes d'onde du prototype validé. Le Module 2 fonctionne seul (import direct) ; la réception depuis le Module 1 est un raccourci optionnel.

## Technical Context

| Élément | Choix |
|---|---|
| Langage backend | Rust (édition du `src-tauri/Cargo.toml` existant) |
| Shell desktop | Tauri 2 (déjà en place dans `src-tauri/`) |
| Interface | Svelte 5 + TypeScript (runes), dans `frontend/` |
| Inférence | ONNX Runtime via le crate `ort` (à confirmer : version et features DirectML, CoreML, CUDA) |
| Décodage audio | À choisir : `symphonia` (pur Rust) préféré, à valider en research |
| Écriture WAV | À choisir : `hound` préféré, à valider en research |
| Lecture temps réel des stems | `cpal` (à valider), sinon lecture par l'UI en Web Audio |
| Tests | Vitest (UI), `cargo test` (pipeline Rust) |
| Plateformes | Windows 11 en priorité (DirectML), macOS et Linux ensuite (CoreML, CPU) |

**Dépendances nouvelles** : `ort`, un décodeur audio, un encodeur WAV. Chacune est à justifier dans `research.md` avant ajout dans `Cargo.toml`.

## Constitution Check

Pas de `constitution.md` dans le dépôt. Règles appliquées : CLAUDE.md (YAGNI, TDD, pas de dépendance sans nécessité, specs à jour), et NFR-001 à NFR-004 de la spec.

## Project Structure

```text
src-tauri/src/module2/
├── mod.rs            # commandes Tauri exposées à l'UI
├── job.rs            # job de séparation : mode, progression, annulation
├── decode.rs         # décodage du fichier importé
├── chunk.rs          # segments 8,0 s, recouvrement 87,5 %, fenêtre linéaire
├── infer.rs          # session ONNX, choix du backend (DirectML, CoreML, CUDA, CPU)
├── bleed.rs          # soustraction spectrale anti-fuite (< -30 dB)
├── encode.rs         # écriture des stems sélectionnés dans le dossier de travail
├── models.rs         # téléchargement des modèles : taille affichée, confirmation, vérification, sous-dossier dédié
├── settings.rs       # dossier de travail choisi par le DJ, mémorisé entre sessions
└── simulate.rs       # repli simulation si les modèles ONNX sont absents

frontend/src/lib/module2/
├── Module2View.svelte       # rack, formes d'onde, transport
├── StemLane.svelte          # une bande : Play/Pause, forme d'onde, estompage
├── StemStrip.svelte         # une tranche du rack : fader, VU, Solo, Mute
├── QualityDialog.svelte     # modale Performance / Studio
└── stemStore.svelte.ts      # état des stems (runes Svelte 5)
```

Les composants reprennent les classes et tokens de `frontend/src/lib/styles/venetian-steampunk.css`. Le prototype `specs/002-module2-stem-separation/prototype/module2-prototype.html` sert de référence visuelle, pas de code à copier.

## Interfaces

Les commandes et événements Tauri sont décrits dans `contracts/module2-contracts.md` (à rédiger avec `tasks.md`).

- **Commandes** : `import_track(path)`, `start_separation(track_id, mode)`, `cancel_separation(job_id)`.
- **Événements** : `module2://progress` (job, pourcentage), `module2://done` (job, chemins des 4 stems), `module2://error` (job, message).
- **Mode simulation** : signalé dans la réponse de `start_separation` (champ `simulated: true`) et dans l'UI.

## Architecture de l'inférence

1. Décodage du fichier importé en PCM float 32 bits, stéréo ou mono ramené à un canal par stem.
2. Découpage en segments de 8,0 s avec 87,5 % de recouvrement (pas de 1,0 s).
3. Inférence par segment : BS-RoFormer ou Mel-Band RoFormer pour la voix, HTDemucs v4 pour batterie et basse. Le « autres » est le résidu.
4. Recollage par fenêtre linéaire, puis soustraction spectrale anti-fuite.
5. Écriture des 4 stems de même durée que la source.

Le travail d'inférence tourne sur un thread de travail Rust, jamais sur le thread UI. L'annulation est un drapeau atomique vérifié entre deux segments.

## Décisions validées

- **Modèles** : téléchargement au premier usage (option A). Taille affichée et confirmation avant téléchargement (FR-015). Vérification d'intégrité avant usage, suppression du fichier partiel en cas d'échec.
- **Stockage** : dossier de travail choisi par le DJ, mémorisé (FR-016). Modèles dans un sous-dossier dédié.
- **Export** : sélection des stems à écrire, un à quatre (FR-017). Contrôle d'espace disque et d'accès en écriture avant traitement (FR-018).

Ces décisions ajoutent les modules `models.rs` et `settings.rs` à la structure, et une phase de gestion des modèles et du dossier de travail (voir Phases).

## Phases

1. **Research** (`research.md`) : version et features de `ort`, licences et conversion ONNX des modèles (carte alchemix#22), choix du décodeur et de l'encodeur, faisabilité de `cpal`.
2. **Pipeline sans modèle** : `decode`, `chunk`, `encode`, `simulate`, `settings`. Tests `cargo test` sur les bornes des segments, la durée des stems et l'écriture sélective (FR-017). Couvre SC-001 en mode simulation.
3. **Modèles et inférence ONNX** : `models` (confirmation avec taille, téléchargement, vérification, nettoyage du partiel, FR-015) puis `infer` avec repli CPU d'abord, puis DirectML. Test de SDR sur un jeu de test (SC-002).
4. **Anti-fuite** : `bleed.rs`, mesure de la fuite (SC-003).
5. **Commandes Tauri et job** : progression, annulation, événements. Tests d'intégration du job.
6. **UI** : `Module2View` et composants, store en runes, modale qualité. Tests Vitest, clavier inclus.
7. **Import direct puis raccourci Module 1** : FR-009 d'abord, FR-010 ensuite (alchemix#2, #29).
8. **Lecture** : sélection d'écoute et Play/Pause par stem (FR-013, FR-014). Première version en Web Audio dans l'UI ; `cpal` seulement si la latence l'exige.
9. **Documentation** : mise à jour de `specifications-Alchemix.md` (§7) une fois le module livré.

## Risques

- **Modèles et licences** : les poids BS-RoFormer et HTDemucs doivent être convertibles en ONNX et utilisables sous leur licence. Bloquant pour la phase 3 ; couvert par alchemix#22.
- **Performance** : une piste de 4 minutes en mode Studio peut être lente sur CPU. À mesurer ; le repli simulation évite de bloquer le développement.
- **Versions de `ort`** : API et features à confirmer en research avant le choix de version.
- **Lecture temps réel** : si Web Audio ne suffit pas, passer à `cpal` demande de respecter NFR-001 (pas d'allocation ni de blocage dans le callback).
- **Écart avec CLAUDE.md** : la stack déclarée cite C++20/JUCE. Le plan suit le choix validé (Rust / Tauri 2) ; CLAUDE.md devra être mis à jour si la décision est retenue durablement.

## Critères de passage à l'étape suivante

- Phase 1 : `research.md` validé, licences et versions confirmées.
- Phase 2 : tests `cargo test` verts pour `chunk`, `encode` et `simulate`.
- Phase 3 : SDR > 11 dB sur le jeu de test (SC-002).
- Phase 6 : tests Vitest verts, parcours clavier vérifié.
