# Feature Specification: Module 1 — Importation Audio, Analyse DSP & Métadonnées ID3

**Feature Branch**: `001-module1-audio-analysis`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Module 1 : Importation Audio, Analyse DSP & Métadonnées ID3 — charger et analyser deux pistes simultanément (Platine A - Master, Platine B - Candidate), calculer compatibilité harmonique (Roue de Camelot), tempo exact (BPM) et consonance de transition ; moteur DSP avec détection de tempo par interpolation parabolique (2 décimales) et protection anti-double tempo (70–115 BPM), détection harmonique par filtre passe-bas < 180-200 Hz + matrice Krumhansl-Schmuckler ; composants Svelte CassetteDeck, ID3TagCard, CamelotCompatibility (Gatekeeper) ; actions Quitter/nettoyer le cache et exports Démixer vers Module 2 ; critères : 100 % tests Vitest au vert (38+ tests / 7 fichiers) et build de production sans erreur."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Chargement et analyse simultanées de deux pistes (Priority: P1)

En tant que DJ, je charge un morceau sur la Platine A (Master) et un second sur la Platine B (Candidate) dans l'interface rétro-futuriste Synthwave/Steampunk, afin de voir immédiatement pour chaque piste son tempo (BPM), sa tonalité (Camelot) et ses métadonnées ID3.

**Why this priority**: C'est le flux principal du Module 1 ; sans chargement double et sans analyse affichée, aucune autre fonction du module n'a de valeur.

**Independent Test**: Charger deux fichiers audio quelconques (MP3 ou WAV) sur les platines A et B ; vérifier que chaque platine affiche BPM, code Camelot et carte de métadonnées. Le Module 1 délivre sa valeur minimale dès ce scénario.

**Acceptance Scenarios**:

1. **Given** le Module 1 ouvert sans piste chargée, **When** l'utilisateur importe un fichier sur la Platine A puis un second sur la Platine B, **Then** chaque platine affiche le BPM (2 décimales), le code Camelot et la carte ID3 correspondante.
2. **Given** un fichier sans métadonnées ID3 lisibles, **When** il est importé, **Then** l'interface affiche les champs ID3 comme indisponibles sans bloquer l'analyse BPM/tonalité.

---

### User Story 2 - Verdict de compatibilité harmonique entre les deux pistes (Priority: P2)

En tant que DJ, je consulte le panneau Gatekeeper positionné sous la Roue de Camelot pour obtenir le pourcentage de consonance, le pitch shift recommandé, et un verdict GO / NO-GO entre le Master (A) et le Candidate (B), afin de décider si le mix est jouable tel quel.

**Why this priority**: C'est la décision métier centrale du module (gatekeeper) ; elle s'appuie sur l'analyse de la story 1 mais reste testable isolément via la matrice Camelot.

**Independent Test**: Avec deux pistes analysées (ex. 10B vs 7A), vérifier que le panneau affiche le score de consonance, le déplacement Camelot, le badge d'alerte `⚠ WARP HAZARD (>15%)` le cas échéant, et le bouton `÷2 TEMPO CIBLE`.

**Acceptance Scenarios**:

1. **Given** Platine A en 8A et Platine B en 8A, **When** l'analyse de compatibilité est calculée, **Then** le score affiché est 100/100 et le verdict est GO.
2. **Given** deux tonalités incompatibles selon la matrice de référence (score < 60), **When** le verdict est affiché, **Then** il indique NO-GO avec le pitch shift maximal conseillé (±3 demi-tons).
3. **Given** un écart de tempo entraînant un warp > 15 %, **When** le panneau Gatekeeper s'affiche, **Then** le badge `⚠ WARP HAZARD (>15%)` est visible.

---

### User Story 3 - Consultation des métadonnées enrichies par piste (Priority: P3)

En tant que DJ, je consulte la carte métadonnées de chaque piste (pochette 96x96 px, titre, artiste, album, année, genre, bitrate, fréquence, format) pour identifier rapidement chaque morceau.

**Why this priority**: Aide à l'identification et à la confiance dans le choix des pistes, mais le module reste utilisable sans elle.

**Independent Test**: Importer un MP3 320 kbps 44,1 kHz puis un WAV ; vérifier que chaque carte affiche pochette, champs ID3, bitrate (`320 kbps` ou `VBR`), fréquence (`44.1 kHz`) et format (`MP3`/`WAV`).

**Acceptance Scenarios**:

1. **Given** un fichier MP3 avec tags ID3 complets et pochette, **When** la carte s'affiche, **Then** tous les champs sont renseignés, pochette incluse (96x96 px).
2. **Given** un fichier à bitrate variable, **When** la carte s'affiche, **Then** le bitrate indique `VBR`.

---

### User Story 4 - Export vers le Module 2 et sortie propre (Priority: P3)

En tant que DJ, je quitte le Module 1 en vidant le cache audio, ou j'exporte directement la Piste A ou la Piste B vers le Module 2 (« Démixer Piste A ➔ Module 2 » / « Démixer Piste B ➔ Module 2 »), afin de poursuivre le workflow de démixage sans fuite mémoire.

**Why this priority**: Termine le cycle de vie du module ; la purge mémoire garantit la fiabilité des sessions suivantes.

**Independent Test**: Cliquer sur « Quitter et nettoyer le cache » puis vérifier que l'état du moteur audio est réinitialisé (`resetAudioEngine()`) ; cliquer sur un bouton d'export et vérifier que la piste concernée est transmise au Module 2.

**Acceptance Scenarios**:

1. **Given** deux pistes chargées et analysées, **When** l'utilisateur clique sur « Quitter et nettoyer le cache », **Then** le moteur audio est réinitialisé et l'interface revient à l'état initial.
2. **Given** une piste analysée sur la Platine A, **When** l'utilisateur clique sur « Démixer Piste A ➔ Module 2 », **Then** la piste A est transmise au Module 2.

---

### Edge Cases

- Fichier audio illisible ou corrompu : message d'erreur clair, platine laissée vide, l'autre platine reste fonctionnelle.
- Tempo détecté hors plage standard (ex. ballade lente ou rythme rapide) : la protection anti-double tempo ramène le résultat dans la plage 70–115 BPM.
- BPM à la frontière de la précision : l'affichage conserve toujours 2 décimales (ex. 187.54 BPM).
- Pistes de formats différents (MP3 + WAV) chargées simultanément : analyse et affichage corrects des deux côtés.
- Métadonnées ID3 absentes ou partielles : champs affichés comme indisponibles, analyse DSP non bloquée.
- Compatibilité exactement au seuil de décision (60 %) : le verdict suit la règle de référence (score < 60 = NO-GO).
- Warp exactement à 15 % : le badge WARP HAZARD ne s'affiche qu'au-delà de 15 %.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST permettre de charger et d'analyser deux pistes audio simultanément, désignées Platine A (Master) et Platine B (Candidate).
- **FR-002**: Le système MUST calculer le tempo (BPM) de chaque piste avec une précision affichée à 2 décimales (ex. 187.54 BPM), via interpolation parabolique (*quadratic peak fitting*) sur les pics de détection.
- **FR-003**: Le système MUST appliquer une protection anti-double tempo (*onsetRegularity*) ramenant les tempi détectés dans la plage standard 70–115 BPM.
- **FR-004**: Le système MUST détecter la tonalité de chaque piste et la représenter en code Camelot (1A–12B), en isolant la fondamentale de basse par filtre passe-bas (< 180–200 Hz) et en appliquant la matrice Krumhansl-Schmuckler optimisée pour discriminer finement les modes Majeur et Mineur (ex. Ré Majeur 10B vs Ré mineur 7A).
- **FR-005**: Le système MUST calculer la compatibilité harmonique entre les deux pistes : score de consonance en pourcentage, déplacement sur la Roue de Camelot, pitch shift conseillé, et verdict GO / NO-GO selon la matrice de référence (seuil 60 %, pitch shift maximal ±3 demi-tons).
- **FR-006**: Le système MUST afficher un badge d'alerte `⚠ WARP HAZARD (>15%)` lorsque l'écart de tempo entre les deux pistes entraîne un warp supérieur à 15 %, ainsi qu'un bouton d'action rapide `÷2 TEMPO CIBLE`.
- **FR-007**: Le système MUST afficher par piste une carte de métadonnées ID3 enrichie : pochette d'album (`coverUrl`, 96x96 px), titre, artiste, album, année, genre, bitrate dynamique (`320 kbps` / `VBR`), fréquence (`44.1 kHz`) et format (`MP3` / `WAV`).
- **FR-008**: Le système MUST présenter les deux platines sous forme de cassettes néon rétro avec étiquettes centrales animées.
- **FR-009**: Le système MUST fournir un bouton « Quitter et nettoyer le cache » procédant à la purge mémoire du moteur audio (`resetAudioEngine()`).
- **FR-010**: Le système MUST fournir des boutons d'export direct « Démixer Piste A ➔ Module 2 » et « Démixer Piste B ➔ Module 2 ».
- **FR-011**: Le système MUST exécuter les calculs lourds (FFT, analyse tempo/tonalité, inférence IA de démixage) hors du thread d'interface, dans des workers dédiés, conformément à la constitution du projet.
- **FR-012**: L'interface MUST respecter la charte graphique Steampunk / Synthwave en CSS Scoped Svelte, sans dépendance CSS externe non installée.

### Key Entities *(include if feature involves data)*

- **Piste (Track)** : morceau audio chargé sur une platine (A ou B) ; attributs : fichier source, format, durée, métadonnées ID3, résultat d'analyse (BPM, tonalité Camelot).
- **Métadonnées ID3** : titre, artiste, album, année, genre, pochette (`coverUrl`), bitrate, fréquence d'échantillonnage, format ; champs potentiellement absents.
- **Résultat d'analyse DSP** : BPM (2 décimales), code Camelot, mode Majeur/Mineur — produit par le moteur d'analyse de chaque piste.
- **Verdict de compatibilité (Gatekeeper)** : score de consonance (%), déplacement Camelot, pitch shift conseillé, indicateur de warp (>15 %), verdict GO / NO-GO — calculé entre la Piste A et la Piste B.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des tests Vitest (`npm test`) passent — au moins 38 tests répartis sur 7 fichiers de test — à chaque étape de livraison du Module 1.
- **SC-002**: Le build de production (`npm run build`) compile sans erreur ni avertissement bloquant.
- **SC-003**: Le BPM de chaque piste chargée est affiché avec exactement 2 décimales, pour 100 % des pistes analysées en conditions nominales.
- **SC-004**: La détection de tonalité distingue correctement les modes Majeur et Mineur sur les cas de référence (ex. Ré Majeur 10B vs Ré mineur 7A).
- **SC-005**: Pour 100 % des paires de pistes testées, le panneau Gatekeeper affiche un score de consonance cohérent avec la matrice de référence et un verdict GO / NO-GO conforme au seuil de 60 %.
- **SC-006**: L'interface reste fluide (60 FPS) pendant l'analyse, les calculs DSP s'exécutant hors du thread principal.

## Assumptions

- Les composants de base existent déjà dans le dépôt et servent de socle : `frontend/src/lib/audioEngine.js` (`parseID3Tags`, `detectBPM`, `detectKey`, `simulateFromFileName`), `frontend/src/lib/camelot.js` (matrice Camelot et `compatibilityBetween`), et les composants Svelte (`CassetteDeck`, `ID3TagCard`, `CamelotWheel`, `CamelotCompatibility`, `TempoDisplay`, `BeatgridOverlay`, `Module1View`).
- Le seuil de décision GO / NO-GO est de 60 % et le pitch shift maximal conseillé de ±3 demi-tons, conformément à la règle métier de référence du projet.
- Les formats d'entrée supportés sont MP3 et WAV ; les fichiers sans métadonnées ID3 restent analysables en DSP.
- L'interface est en français et respecte le thème Venetian Steampunk Dark DAW.
- Les prototypes Python initiaux (dossier `protoype/`, supprimé le 2026-11-03) ont servi de référence comportementale ; la référence désormais est la suite Vitest et la matrice Camelot de `frontend/src/lib/camelot.js`.

## Traçabilité FR → code (état au 2026-11-03)

| Exigence | Implémentation | Statut |
|---|---|---|
| FR-001 | `frontend/src/lib/views/Module1View.svelte` | Réalisé |
| FR-002 | `frontend/src/lib/audioEngine.js` (`detectBPM`, tempogramme de Fourier, arrondi au centième) | Réalisé ; l'algorithme n'est plus l'interpolation parabolique décrite |
| FR-003 | `frontend/src/lib/audioEngine.js` (`detectBPM`, correction de demi-tempo) | Partiel : ne ramène que les tempi > 150 BPM à attaques irrégulières |
| FR-004 | `frontend/src/lib/audioEngine.js` (`detectKey`), `frontend/src/lib/camelot.js` | Réalisé |
| FR-005 | `frontend/src/lib/camelot.js` (`compatibilityBetween`) | Réalisé |
| FR-006 | `frontend/src/lib/components/CamelotCompatibility.svelte` | Réalisé |
| FR-007 | `frontend/src/lib/components/ID3TagCard.svelte`, `audioEngine.js` (`readID3Tags`, `detectBitrate`), `services/metadataService.js` | Réalisé ; pochette affichée en 144 px, non 96 px |
| FR-008 | `frontend/src/lib/components/CassetteDeck.svelte`, `services/deckPlayer.js` | Réalisé |
| FR-009 | `frontend/src/lib/audioEngine.js` (`resetAudioEngine`), `Module1View.svelte` (`handleQuitClean`) | Réalisé |
| FR-010 | `frontend/src/lib/views/Module1View.svelte` (`handleSendToModule2`) | **Non réalisé** : le handler ne fait qu'un `console.info` |
| FR-011 | `frontend/src/lib/audioWorker.js`, `audioEngine.js` (`detectBPMKey`), `Module1View.svelte` | Réalisé pour tempo et tonalité ; décodage, bitrate et loudness restent sur le fil principal |
| FR-012 | `frontend/src/lib/styles/venetian-steampunk.css`, `frontend/src/app.css` | Réalisé |
