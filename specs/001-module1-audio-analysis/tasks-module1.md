# Registre de Tâches : Module 1 - Audio Analysis, ID3 Metadata & Refonte Ergonomique
**Feature Directory** : `specs/001-module1-audio-analysis/`  
**Statut** : Prêt pour implémentation (`/speckit-implement`)  
**Règles d'or** : 100 % des tests Vitest au vert (`npm test`), 0 avertissement de build (`npm run build`).

---

## Phase 1 : Refonte Ergonomique & Optimisation UI (Blocs & Disposition)

- [x] **Tâche 1.1 : Extension & Enrichissement de la carte ID3 Tag (`ID3TagCard.svelte`)**
  - [x] Redimensionner le conteneur principal de la carte ID3 Tag pour chaque platine (A & B) afin de doubler la surface d'affichage.
  - [x] Ajouter les métadonnées audio dynamiques : Bitrate (`320 kbps` / `VBR`), Fréquence d'échantillonnage (`44.1 kHz` / `48 kHz`), Format audio (`MP3` / `WAV` / `FLAC`), Année d'édition et Genre musical.
  - [x] Intégrer un badge dynamique d'état d'analyse (ex: `ANALYSE DSP EN COURS...` / `PRÊT`).

- [x] **Tâche 1.2 : Paramétrage & Normalisation de la Pochette d'Album HD (`ID3TagCard.svelte`)**
  - [x] Fixer un conteneur dédié de dimensions strictes `96x96px` avec la propriété CSS `object-fit: cover` et des bordures néon rétro.
  - [x] Mettre en place un composant Fallback SVG Steampunk / Synthwave en cas d'absence de pochette dans les tags ID3 ou via l'API iTunes.
  - [x] Ajouter un effet de survol (glow ambre/cyan) et un gestionnaire d'erreur d'image (`onerror`).

- [x] **Tâche 1.3 : Repositionnement du Panneau de Compatibilité Gatekeeper (`Module1View.svelte`)**
  > **Remplacée** par alchemix#16 : le Gatekeeper est finalement placé sous la roue Camelot (colonne centrale), et non en haut de l'écran. Les sous-tâches ci-dessous décrivent l'ancienne disposition ; elles sont conservées pour l'historique.
  - [x] Déplacer le bloc `CamelotCompatibility.svelte` du bas de page vers le haut de l'écran, immédiatement sous le titre/header principal de l'application.
  - [x] Restructurer la disposition responsive à 3 colonnes : Platine Master A (Gauche) | Gatekeeper Camelot (Centre Haut) | Platine Candidate B (Droite).
  - [x] Assurer la visibilité immédiate du score de consonance (%), des recommandations de Pitch Shift et de l'alerte `⚠ WARP HAZARD (>15%)`.

- [x] **Tâche 1.4 : Réinitialisation & État Neutre de la Roue de Camelot (`CamelotWheel.svelte`)**
  - [x] Désactiver la mise en surbrillance automatique des clés au chargement initial de l'application (défauts `keyA`/`keyB` = `null`).
  - [x] Définir un état `idle` (neutre) : sans clé, seul le cercle vert tournant est affiché (demande utilisateur, alchemix#4). Écart : les segments ne sont plus rendus en opacité réduite.
  - [x] Réinitialiser l'état de la roue lors de la purge (`handleQuitClean` → `handleEjectTrack` remet `key` à `null`). Non couvert par un test automatisé.
  - [ ] Vérification visuelle dans le navigateur (`npm run dev`) — en attente de l'utilisateur.

- [ ] **Tâche 1.5 : Extraction du Titre dans un Cadre Dédié Néon (`CassetteDeck.svelte` & `TitleCard.svelte`)**
  - [ ] Retirer l'affichage étriqué du titre/artiste présent sur l'étiquette centrale du composant cassette `CassetteDeck.svelte`.
  - [ ] Créer un composant indépendant `TitleCard.svelte` (ou en-tête dédié) positionné au-dessus de chaque platine cassette.
  - [ ] Styliser le cadre avec un encadrement cuivré/ambre, une typographie lisible haute résolution et un défilement automatique (*marquee*) pour les titres longs.

---

## Phase 2 : Moteur Audio DSP & Calculs d'Harmonie (`audioEngine.js` & `camelot.js`)

- [ ] **Tâche 2.1 : Validation & Précision du Moteur de Tempo (BPM)**
  - [ ] Vérifier l'interpolation parabolique (*quadratic peak fitting*) pour garantir une mesure au centième près (ex: `187.54 BPM`).
  - [ ] Appliquer et tester la règle de régularité des attaques (`onsetRegularity`) pour borner la plage de recherche (70–115 BPM) et éliminer les erreurs de double/demi-tempo.

- [ ] **Tâche 2.2 : Validation du Filtrage & Profil Harmonique (Key / Camelot)**
  - [ ] Valider l'isolation de la fondamentale de basse via le filtre passe-bas biquad RBJ (< 180–200 Hz).
  - [ ] Ajuster le profil de corrélation Krumhansl-Schmuckler pour la discrimination exacte entre modes Majeur (B) et Mineur (A).

- [x] **Tâche 2.3 : Forme d'onde A/B avec marqueurs de changements de rythme ou de clef (alchemix#44)**
  - [x] Ajouter une forme d'onde audio pour le titre de la piste A ou de la piste B (composant dédié `WaveformView.svelte`, panneau intégré à la colonne centrale de `Module1View.svelte`).
  - [x] Proposer à l'utilisateur de choisir le mode d'annotation sur la forme d'onde : changements de **rythme** (tempo) ou changements de **clef** (key) (`WaveformControls.svelte`, leviers A/B + RYTHME/CLEF).
  - [x] Calculer clef et tempo par segments (analyse par fenêtres, 30 s) via `analyzeSegments` (qui réutilise `detectBPM`/`detectKey` dans `audioEngine.js`) et tracer les marqueurs de changements correspondants sur la forme d'onde (`changeMarkers`).
  - [x] **M1 (2026-11-06, alchemix#44)** : analyse par segments livrée dans `audioEngine.js` (`analyzeSegmentsSync` / `analyzeSegments`, délégation worker `segments` → `segments-result`) — 6 tests ajoutés, `npm test` 283/283 au vert.
  - [x] **M2 (2026-11-06, alchemix#44)** : `waveformPeaks(channelData, width)` dans `frontend/src/lib/waveform.js` — min/max par colonne (`Float32Array` 2×width entrelacé) ; 7 tests dans `waveform.test.js`, suite complète 290/290 au vert.
  - [x] **M3 (2026-11-06, alchemix#44)** : `WaveformView.svelte` — canvas 2D (barres min/max) + marqueurs en overlay DOM, props `peaks`/`durationS`/`markers`/`mode`/`title` ; 6 tests dans `WaveformView.test.js`.
  - [x] **M4 (2026-11-06, alchemix#44)** : `WaveformControls.svelte` — leviers `.aw-toggle-lever` piste A/B + RYTHME/CLEF, callbacks `onTrackChange`/`onModeChange` ; 6 tests dans `WaveformControls.test.js`.
  - [x] **M5 (2026-11-06, alchemix#44)** : `changeMarkers(segments, mode)` dans `frontend/src/lib/waveform.js` — marqueurs `{ t, label }` (`'120 → 90 BPM'` / `'8B → 10B'`) à chaque changement vs segment précédent ; 6 tests dans `waveform.test.js` (RED puis GREEN, 13/13 au vert).
  - [x] **M6 (2026-11-06, alchemix#44)** : intégration `Module1View.svelte` — panneau forme d'onde en colonne centrale (`waveform-section` : `WaveformControls` + `WaveformView`), `loadWaveform()` non bloquant (peaks immédiats + `analyzeSegments` via worker, état `isWaveLoading`) ; 6 tests dans `Module1View.waveform.test.js` (worker mocké).
  - [x] **M7 (2026-11-06, alchemix#44)** : validation globale — `npm test` 38 fichiers / 314 tests 100 % verts, `npm run build` OK ; doc (`specifications-Alchemix.md` §4.1, contrat §1/§4, coches 2.3) à jour ; carte passée en review.

---

## Phase 3 : Gestion Mémoire, Flux Inter-Modules & Nettoyage

- [ ] **Tâche 3.1 : Purge Mémoire & Action de Sortie (`resetAudioEngine()`)**
  - [ ] Relier le bouton « Quitter et nettoyer le cache » à la libération des buffers `AudioBuffer` de la mémoire du navigateur.
  - [ ] Réinitialiser les stores Svelte (`deckA`, `deckB`, `compatibility`) à leurs valeurs initiales neutres.

- [ ] **Tâche 3.2 : Export Direct vers le Moteur de Démixage IA (`Module 2`)**
  - [ ] Implémenter les handlers des boutons d'action « Démixer Piste A ➔ Module 2 » et « Démixer Piste B ➔ Module 2 ».
  - [ ] Garantir le transfert du buffer audio décodé vers le sous-système de séparation de tiges (ONNX / Web Workers).

---

## Phase 4 : Assurance Qualité & Validation CI/CD

- [ ] **Tâche 4.1 : Batterie de Tests Vitest (`npm test`)**
  - [ ] Exécuter la suite complète de 38+ tests distribués sur les 7 fichiers de test (`audioEngine.test.js`, `CamelotCompatibility.test.js`, etc.).
  - [ ] Valider que 100 % des assertions restent au vert sans aucune régression.
