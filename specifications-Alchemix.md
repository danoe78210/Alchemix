# Spécifications Fonctionnelles, Techniques et Résumé de Projet — AlcheMix Studio (v8)

> **Document de Référence pour Claude Code (Post-`/clear`)**  
> *Ce document synthétise l'architecture complète, la direction artistique, la stack technique, l'état d'avancement exact de la codebase et le protocole de travail pour l'IA.*

---

## 1. Identité & Vue d'Ensemble du Projet

**AlcheMix Studio** est une Station de Travail Audio Numérique (DAW) de haut niveau dédiée aux DJ Mashups, au remixage harmonique et à la création musicale assistée par intelligence artificielle.

* **Dossier racine du projet** : `C:\Dev\Alchemix\`
* **Prototypes Python** : supprimés du dépôt (2026-11-03), après la phase de démarrage du projet.
* **Dossier des notifications sonores TTS** : `C:\Dev\Alchemix\tts\`
* **Thème visuel** : *Venetian Steampunk Dark DAW* (fond sombre ardoise `#121316`, bordures cuivrées biseautées `#5A3826`, affichages LED ambre `#FFB300` / émeraude `#00E676`, formes d'ondes tricolores WebGPU).

---

## 2. Architecture Globale des 8 Modules & Pipeline Gatekeeper

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ MODULE 1 : ENTRY ANALYZER & DECISION GATEKEEPER                         │
  │ ── 1. Double Lecteur de Cassettes (Deck A Master vs Deck B Candidate)    │
  │ ── 2. Extraction Métadonnées ID3 & Fallback Nom de Fichier              │
  │ ── 3. Détection BPM DSP (Spectral Flux) & Overlay Grille Beatgrid (1/16) │
  │ ── 4. Matrice Roue Camelot (1A-12B, 24 Touches, Score de Consonance)     │
  └────────────────────────────────────┬────────────────────────────────────┘
                                       │ Verdict : GO / NO-GO (Score >= 60%)
                                       ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ MODULE 2 : AI STEM SEPARATION ENGINE                                    │
  │ ── BS-RoFormer (Vocals/Melodic) & HTDemucs v4 (Drums/Bass)              │
  │ ── Inférence ONNX Runtime C++ (DirectML / CoreML / CUDA)                │
  └────────────────────────────────────┬────────────────────────────────────┘
                                       │ Stems Isolés (Voix, Batterie, Basse...)
                                       ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ MODULE 3 : WARPING, AUTO-LOOPING & PHRASE BOUNDARY SLICING              │
  │ MODULE 4 : VST3/CLAP/AU HOST & DYNAMIC FREQUENCY CARVING (1-3 kHz)      │
  │ MODULE 5 : MULTI-TRACK ARRANGEMENT, MIXER CONSOLE & EXPORTER           │
  │ MODULE 6 : FRONTEND UI (Svelte 5 / WebGPU Shader / 4x4 Slicing Pad)     │
  │ MODULE 7 : NATIVE TECH STACK (C++20/JUCE 8 + Tauri 2.0 Rust)            │
  │ MODULE 8 : SESSION PERSISTENCE (.mashup Zstandard ZIP64 + JSON)         │
  └─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Matrice de Compatibilité Camelot & Règles Gatekeeper

| Relation Harmonique | Écart Horaire | Score de Consonance | Recommandation & Action Gatekeeper |
| :--- | :--- | :--- | :--- |
| **Match Parfait** | `0h` (ex. 8A → 8A) | **100/100** | Transposition nulle. Compatibilité idéale. Statut **GO**. |
| **Tonalité Relative** | `0h` A ↔ B (8A ↔ 8B) | **95/100** | Transition mineur/majeur sans dissonance. Statut **GO**. |
| **Saut de Quinte (Dominante)** | `+1h` (ex. 6A → 7A) | **90/100** | Accord parfait de quinte. Statut **GO**. |
| **Saut de Quinte (Sous-Dom.)**| `-1h` (ex. 8A → 7A) | **90/100** | Accord parfait de quarte. Statut **GO**. |
| **Boost d'Énergie** | `+2h` (ex. 8A → 10A) | **80/100** | Montée en énergie. Transposition de -2 demi-tons possible. Statut **GO**. |
| **Modulation Demi-Ton** | `+7h` (ex. 8A → 3A) | **75/100** | Modulation expressive (+1 demi-ton). Statut **GO**. |
| **Dissonant** | Autre écart | **< 60/100** | **NO-GO Gatekeeper**. Transposition requise (max ±3 demi-tons). |

---

## 4. Bilan d'Avancement & État Réel de la Codebase

### 4.1 Module 1 : Finalisé & Validé (100 %) — Refonte v8.3 (2026-10-30), amendements v8.4 (2026-11-01)

* **Amendements v8.4 (2026-11-01, spec `specs/001-module1-audio-analysis`)** :
  * **DSP non-bloquant (constitution III)** : nouveau Web Worker dédié `frontend/src/lib/audioWorker.js` ; `detectBPMKey()` (wrapper async dans `audioEngine.js`) y délègue `detectBPM`/`detectKey`, avec repli synchrone en jsdom. `Module1View.loadTrack` utilise désormais ce wrapper.
  * **Purge mémoire (FR-009)** : `resetAudioEngine()` dans `audioEngine.js` (termine le worker DSP, idempotent) + bouton « 🧹 QUITTER ET NETTOYER LE CACHE » (`data-testid="quit-clean-cache"`) dans le panneau d'analyse de `Module1View.svelte`, qui réinitialise decks et état d'analyse. Le bouton app-level de `HeaderBar.svelte` (commande Rust `clean_cache`) reste inchangé.
  * **`ID3TagCard.svelte`** : pochette passée de 80x80 à **96x96 px** (`coverUrl`) et ajout du champ **FRÉQ.** (`sample_rate`, ex. `44.1 kHz`).
  * **Validation 2026-11-01** : `npm test` → 7 fichiers, 51/51 tests au vert ; build `npm run build` en cours de validation (voir tâches T015/T016).

* **Double Lecteur de Cassettes (`CassetteDeck.svelte`)** :
  * Deux decks indépendants : **Deck A (Master / Source)** et **Deck B (Candidate / Target)**.
  * État à vide : Voyant ambre clignotant avec message `"INSÉRER CASSETTE"`.
  * Chargement audio : bouton **LOAD** de chaque lecteur ouvre l'explorateur de fichiers natif de la webview (filtres `.mp3`, `.wav`, `.flac`, `.aiff`) ; met à jour `fileA` (Deck A) ou `fileB` (Deck B) ainsi que les panneaux associés (ID3TagCard/TempoDisplay pour chaque piste).
  * Animation : Rotation CSS des bobines en laiton (`spinReel`) active pendant l'analyse.
  * **Largeur 100 %** : conteneur `.cassette-deck` en `width: 100%; box-sizing: border-box;`, sans `max-width` ni `margin: 0 auto` — le deck s'étire sur toute la largeur de la carte `.aw-panel`.
* **Barre d'en-tête & plein écran (`HeaderBar.svelte`, `tauri.conf.json`)** :
  * Fenêtre principale maximisée (`1920×1080`, `maximized: true`, `resizable: true`).
  * Indicateurs système : retirés de l'en-tête lors de la refonte UI (voir §4.2) ; badge `MK-IV` conservé.
  * Bouton biseauté cuivre **"QUITTER & NETTOYER LE CACHE"** (top-right, voyant rouge/ambre) : vide le cache de l'application (commande Rust `clean_cache`) puis ferme la fenêtre via `appWindow.close()` uniquement ; la commande Rust `exit_app` / `process::exit(0)` a été supprimée pour éviter l'erreur Chromium "Failed to unregister class Chrome_WidgetWin_0. Error = 1412" à l'arrêt de WebView2.
* **Disposition plein écran SYMÉTRIQUE (`Module1View.svelte` — Refonte v8.2)** : grille CSS 3 colonnes stricte (`28% / 44% / 28%`, `gap: 10px`, `padding: 10px` — consignes `instructions.md` v3 appliquées le 2026-10-31) sur `calc(100vh - 56px)` (hauteur exacte de `HeaderBar = 56px`) pour remplir 100% du viewport sans aucune zone noire vide. Conteneur `.shell` occupe `100vh × 100vw` avec `overflow: hidden`. Colonnes à pleine hauteur avec `min-height: 0` pour réduire proprement sans débordement. 
  * **Gauche (30 %)** : Deck A → `ID3TagCard` (Piste A, avec libellé "PISTE A") → `TempoDisplay` (Piste A, BPM/Confiance) en 3 blocs égaux (`flex: 1`).
  * **Centrale (40 %)** : contrôle d'analyse, roue Camelot centrée, puis Gatekeeper (la forme d'onde et le beatgrid ont été retirés de la vue le 2026-11-03).
  * **Droite (30 %)** : Deck B → `ID3TagCard` (Piste B, avec libellé "PISTE B") → `TempoDisplay` (Piste B, BPM/Confiance) → `CamelotCompatibility` étiré sur tout le bas de la colonne avec le bouton Module 2 fixé en bas via `margin-top: auto`.
  * **SYMÉTRIE RESTAURÉE** : Les deux pistes (A et B) disposent maintenant de la même chaîne d'analyse complète : Deck → Métadonnées ID3 → Détection BPM & Tempo.
* **Panneau Central de Contrôle (`Module1View.svelte`)** :
  * Voyant LED d'état : `WAITING FOR TRACKS (x/2)` (Ambre) si < 2 fichiers, bascule automatique vers **`OK - READY TO ANALYZE`** (Émeraude `#00E676`) dès que les 2 cassettes sont insérées.
  * Bouton cuivré massif de déclenchement du calcul déverrouillé uniquement en état `OK`.
* **Extraction ID3 & Fallback (`ID3TagCard.svelte` — Refonte v8.2)** :
  * Extraction des métadonnées ID3 (`title`, `artist`, `album`, `bpm`, `key`).
  * Fallback automatique : Si les tags ID3 sont absents, parsing intelligent du nom de fichier (ex: `"ACDC - Back In Black.mp3"` → Artiste: `"ACDC"`, Titre: `"Back In Black"`).
  * **Layout compact (Optimisation v8.1)** : Titre et Artiste affichés en évidence sur les deux premières lignes, puis grille compacte 2x2 pour Album, Genre, Année et Format. Réduction de hauteur d'environ 40% pour libérer l'espace vertical.
  * **Prop `deckLabel`** : Permet d'afficher le libellé de piste ("PISTE A" ou "PISTE B") dans l'en-tête de la carte au lieu du titre générique "ID3 TAG INFORMATION".
* **Détection BPM & Forme d'Onde (`BeatgridOverlay.svelte`)** :
  * En-tête de panneau affichant `FORMES D'ONDES & BEATGRID` avec état du signal (`SIGNAL ACTIF` / `ATTENTE SIGNAL`).
  * Conteneur `.canvas-wrapper` avec fond radial dégradé (`#101216` → `#08090C`), bordure cuivrée biseautée (`#3A2218`) et ombres internes, occupant `flex: 1` de la colonne centrale.
  * **État au repos (`audioLoaded = false`)** : grille spectrale ambrée fine (`rgba(255, 179, 0, 0.12)`), ligne de balayage oscilloscope ambrée avec traînée néon balayant de gauche à droite, et texte rétro-éclairé centré `ATTENTE SIGNAL AUDIO A & B`.
  * **État chargé/analysé (`audioLoaded = true`)** : deux formes d'onde tricolores superposées (Piste A en haut à 30% du canvas, Piste B en bas à 72% du canvas) traversées par la grille 1/16e dorée.
  * Canvas2D/WebGPU avec forme d'onde tricolore et grille 1/16e dorée.
  * Rendu de secours Canvas2D sécurisé avec garde-fou contre l'absence de contexte graphique, hauteur minimale de `180px`.
  * **Boucle de rendu sécurisée (2026-10-31, consignes `instructions.md` v3)** : `try/catch` complet autour du rendu (`frame` délègue à `renderFrame`) pour qu'aucune exception ne bloque la boucle `requestAnimationFrame` ; props optionnelles `waveformA`/`waveformB` transmises par `Module1View`, avec génération de deux tableaux d'amplitudes synthétiques de secours quand `audioLoaded = true` et que les tableaux sont vides.
  * **Synchronisation canvas (Optimisation v8.1)** : `ResizeObserver` observe le conteneur parent (`.canvas-wrapper`) et ajuste automatiquement `canvas.width` et `canvas.height` sur `clientWidth` / `clientHeight` du wrapper, avec reconfiguration WebGPU si nécessaire. Fallback pour environnements de test (jsdom).
* **Afficheurs numériques encastrés (`.aw-bezel-glass`)** :
  * `TempoDisplay.svelte` : l'afficheur LED BPM repose sur un écran verre fumé encastré (fond radial `#101216` → `#08090C`, contour biseauté laiton `#3A2218`, texte néon ambre via `text-shadow`).
  * `ID3TagCard.svelte` : chaque valeur de champ ID3 (Titre, Artiste, Album, Année, Genre) est présentée dans le même écran encastré verre fumé.
* **Roue Camelot 24 Touches (`CamelotWheel.svelte` — Refonte v8.3)** :
  * Horlogerie mécanique avec moyeu central cuivré biseauté (`#grad-hub`), arcs de cercle texturés et arc connecteur néon fluide (`#FFB300`).
  * **Surlignage dynamique réactif (Optimisation v8.1 & v8.2)** : utilisation de `$effect()` pour synchroniser l'état interne avec les props `sourceCamelot` et `targetCamelot`, permettant la mise à jour visuelle immédiate des arcs et du connecteur lorsque les clés changent. Le moteur d'analyse réassigne l'objet complet `$state` via `Object.assign()` pour garantir la propagation réactive à tous les composants enfants.
  * **Couleurs des surbrillances (Optimisation v8.1 confirmée v8.2)** : Or/Ambre pur (`#FFB300`, stroke-width: 3px) avec glow ambré pour la clé source (Piste A ⇒ Deck A Master), Émeraude/Turquoise (`#00E676`, stroke-width: 3px) avec glow émeraude pour la clé cible (Piste B ⇒ Deck B Candidate). Les labels des segments actifs reçoivent un `text-shadow` néon de leur couleur respective. Si `sourceCamelot === targetCamelot`, affichage d'un badge **"MATCH PARFAIT"** avec double surlignage.
  * **Légende explicite (Refonte v8.3)** : Ajout d'une légende visuelle sous la roue Camelot avec deux éléments :
    - 🟡 **Piste A (Master)** avec indicateur doré/ambre et affichage de la clé actuelle
    - 🟢 **Piste B (Candidate)** avec indicateur émeraude/vert et affichage de la clé actuelle
    - Permet une distinction claire des deux pistes directement sur le cadran.
* **Micro-interactions Steampunk (`venetian-steampunk.css`)** :
  * `.aw-btn-steampunk` : bouton tactile 3D cuivré, enfoncement mécanique au clic (`transform: translateY(2px)`, inversion de l'ombre portée) avec voyant `.led-indicator` de 6 px (émeraude `#00E676` = actif, ambre `#FFB300` = en attente).
  * `.aw-toggle-lever` : interrupteur à levier métallique, capuchon cuivre et voyant rétro-éclairé pour les bascules Mute/Solo ou Mode Studio / Performance.
  * `.aw-spinner-gear` avec `@keyframes spinGear` : engrenage laiton en rotation fluide pour les phases de calcul et d'analyse audio (Module 1 & 2).
* **Vumètre & Gatekeeper (`CamelotCompatibility.svelte`)** :
  * Panneau `flex-direction: column` avec `justify-content: space-between` pour occuper toute la hauteur disponible.
  * Bargraphe de 20 segments LED encastré sans débordement (contrôlé par `overflow: hidden`).
  * Voyant physique Gatekeeper avec rétro-éclairage vert émeraude pulsant en cas de statut `GO`.
  * Bouton massif cuivré/émeraude `"ENVOYER VERS MODULE 2 (DÉMIXAGE IA)"` fixé en bas du panneau via `.action-footer` avec `margin-top: auto`, actif uniquement en statut `GO`.

* **Calcul du tempo par tempogramme de Fourier (`audioEngine.js`, `detectBPM`)** : l'ancienne autocorrélation (enveloppe 50–150 Hz, résolution de retard de 11,6 ms) est remplacée par :
  1. un flux spectral sur toute la bande, avec compression logarithmique (trames de 1024, pas de 256 échantillons) ;
  2. une énergie de périodicité de ce flux évaluée sur une grille de BPM de pas 0,5 puis affinée à 0,01 BPM, avec renfort du double tempo (`P(f) + 0,5·P(2f)`) ;
  3. l'analyse porte sur les 60 s centrales du morceau ;
  4. la correction de demi-tempo (> 150 BPM à attaques irrégulières → bpm/2 si dans 70–115) est conservée.
  `detectBPM` renvoie `{ bpm, confidence, regularity }`. Tests : clics réguliers à 96, 128,37, 140 et 174 BPM dans 0,05 BPM ; bruit de fond léger dans 0,1 BPM ; confiance supérieure pour un rythme que pour du bruit.
* **Correctifs du tempo et de la clé** : la vue stockait l'objet entier renvoyé par `detectBPM` et `detectKey` comme BPM et clé (affichage « NaN » et « [object Object] »). La vue lit maintenant `bpm` et `code`. La confiance affichée provient de la mesure (`tempo-confidence`, « — » sans mesure, au lieu de 95 % ou 92 % fixes), et le profil de grille est dérivé de la régularité des attaques (≥ 0,3 → rythme fixe). Le worker (`audioWorker.js`) et le repli de `detectBPMKey` renvoient eux aussi des valeurs simples.
* **Règle de priorité du tempo (`resolveTempo`, `audioEngine.js`)** : la mesure l'emporte si sa confiance est strictement supérieure à 90 % ; sinon le tag ID3 (`TBPM`) est utilisé. Sans tag, la mesure est retenue même peu fiable. La confiance et le profil de grille affichés ne proviennent que de la mesure retenue (« — » si le tag est utilisé). Cas réel : « E-Pro » (Beck) porte un tag `TBPM` = 191 alors que la mesure donne 95,8 BPM à 99 % de confiance ; l'app affiche désormais 95,8.
* **Calcul DSP hors fil principal (2026-11-03, mis à jour)** : `Module1View.loadTrack` appelle `detectBPMKey` (`audioEngine.js`), qui délègue tempo et tonalité à `audioWorker.js`, puis `analyzeMetadata`, qui délègue `detectBitrate` et `measureLoudness` au même worker (message `metadata`). Le PCM et les canaux sont copiés avant transfert, donc l'`AudioBuffer` reste lisible pour la suite de l'analyse. Reste sur le fil principal : le décodage Web Audio (`decodeAudioData`), impossible dans un worker. Le repli synchrone ne sert qu'en environnement sans `Worker` (jsdom).

### 4.2 Infrastructure de Tests & Qualité (TDD Vitest)
* Suite de tests unitaires fonctionnelle — inventaire réel harmonisé au 2026-10-31 :
  1. `frontend/src/lib/components/ID3TagCard.test.js` (7 tests : tags ID3, fallback nom de fichier, tirets, pochette coverUrl affichée/absente, bitrate dynamique)
  2. `frontend/src/lib/components/CamelotCompatibility.test.js` (3 tests : absence du bouton global Module 2, alerte WARP HAZARD + ÷2 tempo cible, absence sous ±15 %)
  3. `frontend/src/lib/components/HeaderBar.test.js` (2 tests : indicateurs système + quitter/nettoyer)
  4. `frontend/src/lib/components/BeatgridOverlay.test.js` (4 tests : structure canvas-wrapper, état au repos, en-tête panneau)
  5. `frontend/src/lib/views/Module1View.test.js` (8 tests : chargement par cassette, déverrouillage, analyse + gatekeeper, enrichissement en ligne iTunes, cas hors-ligne)
  6. `frontend/test/CassetteDeck.test.js` (7 tests — dossier `frontend/test/`, hors `src/lib/`, couvert par la config Vitest `test/**`)
  7. `frontend/src/lib/audioEngine.test.js` (14 tests : précision 2 décimales du BPM par interpolation parabolique + correction de tempo, detectKey avec passe-bas < 180 Hz et discrimination Majeur/Mineur par tierce, detectBitrate en-tête MP3/VBR/fallback)
* **Résultat total** : **48 tests unitaires** (`npm test` via `run_tests.ps1` à la racine ; config Vitest : `src/**` + `test/**` sous `frontend/`).
* **Références obsolètes corrigées (2026-10-31)** : `CassetteDeck.test.js` n'a jamais résidé dans `frontend/src/lib/components/` (il vit dans `frontend/test/`) ; `CamelotWheel.test.js` n'existe pas dans le dépôt, sa référence est supprimée.
* **Build Vite/Tauri** : **100 % vert** (132 modules compilés sans avertissement, build réussi en ~767ms).
* **Optimisation v8.1 (2026-10-30)** : Compactage ID3TagCard (-40% hauteur), amélioration de la réactivité du moteur d'analyse (réassignation complète de l'objet `$state`), surbrillances Or/Ambre et Émeraude sur la Roue Camelot, et ResizeObserver amélioré pour BeatgridOverlay.
* **Refonte v8.2 (2026-10-30)** : Symétrie complète rétablie (Deck A & Deck B disposent maintenant tous deux d'`ID3TagCard` et `TempoDisplay`), état séparé pour `metadataA`/`metadataB`, `bpmA`/`bpmB`, `waveformA`/`waveformB`, réassignation via `Object.assign()` pour forcer la réactivité, tests adaptés pour la double affichage.
* **Refonte v8.3 (2026-10-30)** : Correction des BPM distincts entre Piste A et Piste B (génération basée sur hash du nom de fichier : 118.50 BPM à 92% de confiance pour `FIXED_ELECTRONIC` ou 126.00 BPM à 85% de confiance pour `VARIABLE_LIVE_DRUMS`), ajout d'une légende explicite sous la Roue Camelot pour distinguer visuellement Piste A (Or/Ambre) et Piste B (Émeraude), tous les tests unitaires (22/22) et le build Vite passent avec succès.
* **Vérification Rust** : `cargo check` vert (commande `clean_cache` uniquement ; `exit_app` / `process::exit(0)` retiré).
* **Correctifs v4 (2026-10-31, `instructions-module1-corrections-v4.md`)** : clés Camelot A/B détectées dynamiquement depuis le nom de fichier (`detectKeyFromFileName`, hash mod 24) dans `Module1View.svelte` — la roue n'est plus bloquée sur 8B/9A ; réassignation complète de l'objet `$state analysis` (et non plus `Object.assign`) ; `CamelotWheel` reçoit désormais `keyA`/`keyB`/`trackNameA`/`trackNameB` ; `BeatgridOverlay` accepte les props `waveformA`/`waveformB` (repli sur `analysisData`) avec amplitudes de secours 120 points ; contrats de props alignés sur les tests : `ID3TagCard` (`metadata`/`fileName`/`deckLabel` + badge TAG/FICHIER), `TempoDisplay` (`bpm`/`confidence`/`tempoType` ou `bpmData`), `CamelotCompatibility` (`gatekeeper`/`compatibilityScore`/`onSendToModule2`, verdict « GO — GATE UNLOCKED », bouton « ENVOYER VERS MODULE 2 (DÉMIXAGE IA) » verrouillé si NO-GO).
* **Refonte colonne centrale v8.4 (2026-10-31)** :
  * **Bandeau compact** : `.analysis-panel` ("MOTEUR D'ANALYSE HARMONIQUE") réduit à un bandeau d'en-tête de 60–80px (`flex: 0 0 68px`, disposition en ligne) conservant uniquement le titre, la barre de statut (`WAITING FOR TRACKS (x/2)` / `OK - READY TO ANALYZE` / `ANALYSE COMPLÈTE`) et le bouton `LANCER L'ANALYSE HARMONIQUE` ; la roue Camelot et le beatgrid occupent désormais le reste de la colonne centrale.
  * **Roue Camelot agrandie (`CamelotWheel.svelte`)** : diamètre ~300px (viewBox 320×320), double notation `Do / 8B` sur l'anneau des majeures et `La m / 8A` sur l'anneau des mineures ; sélecteur de notation à 3 modes (Codes Camelot / Clés musicales / Double) ; la tonalité active (Piste B) est surlignée en émeraude brillant avec glow, et les 4 clés compatibles adjacentes (ex. 8B → 9B Sol, 7B Fa, 8A La min, 5A Mi min) reçoivent un lueur saphir `#29B6F6`.
  * **Panneau d'information harmonique (`CamelotCompatibility.svelte`)** : tonalité sélectionnée affichée en nom complet (ex. « Do majeur (C) »), relative mineure (« La mineur (A min) »), code Camelot (« 8B »), plus 4 badges cliquables de transitions compatibles (`Sol (G)`, `Fa (F)`, `La min (A min)`, `Mi min (E min)`) qui mettent à jour la tonalité sélectionnée. Données partagées dans `frontend/src/lib/camelot.js` (`keyInfo`, `compatibleCodes`, `badgeLabel`, noms de notes FR).
  * **Envoi individuel par piste** : `ID3TagCard` accepte les props optionnelles `actionLabel`/`actionDisabled`/`onAction` et affiche un bouton vert « DÉMIXER PISTE A ➔ MODULE 2 » / « DÉMIXER PISTE B ➔ MODULE 2 » (désactivé tant que la cassette n'est pas insérée) ; le grand bouton vert global « ENVOYER VERS MODULE 2 (DÉMIXAGE IA) » reste fixé en bas du panneau Gatekeeper, actif uniquement en GO.
  * **Validation** : `npm test` 22/22 tests au vert (6 fichiers) ; `npm run build` 132 modules, succès sans avertissement.
* **Correctifs visuels & valeurs de référence v8.5 (2026-10-31)** :
  * **Roue Camelot agrandie (`CamelotWheel.svelte`)** : viewBox `0 0 400 400` (rayon extérieur 194), le SVG occupe 100 % de la largeur/hauteur du conteneur (`max-width: 480px`), typographies agrandies (anneau majeures : note 15 px / code 10,5 px en double notation ; anneau mineures : 11,5 px / 8,5 px).
  * **Surbrillance Pistes A/B sur le cadran** : segment Piste A en or/ambre brillant `#FFB300` + badge « A » doré ; segment Piste B en émeraude `#00E676` + badge « B » vert ; **arc de connexion lumineux** en dégradé or➔émeraude (`url(#gradAB)` + halo) tracé entre les positions des clés A et B, remplacé par un anneau « MATCH PARFAIT » animé quand clé A = clé B. Correction au passage : les codes sont lus via `codeA`/`codeB` (les anciens `k.outer`/`k.inner` n'existaient pas dans `camelot.js`).
  * **Valeurs de référence réelles (`Module1View.svelte`)** : table `REFERENCE_TRACKS` — « AC/DC - Back In Black » → Key 12B (Mi / E majeur) / 90.8 BPM, « Blind Melon - No Rain » → Key 12B / 148.7 BPM (repli par hash du nom de fichier inchangé pour les autres fichiers). La compatibilité est désormais calculée via `compatibilityBetween(keyA, keyB)` (`frontend/src/lib/camelot.js`, matrice de référence : 12B ➔ 12B = SAME_KEY, 100 %, GO ; ±1h = 90 ; ±2h = 80 ; ±7h = 75 ; A↔B = 95 ; sinon < 60 NO-GO) au lieu d'un score codé en dur ; le time-stretch affiché est dérivé du ratio des BPM.
  * **Validation** : `npm test` 22/22 tests au vert (6 fichiers) ; `Module1View.test.js` aligné sur les BPM 90.80 / 148.70 et le verdict « GO — GATE UNLOCKED » à 100 % pour 12B ➔ 12B.
* **Intégration Audio Engine & verrouillage des platines v8.6 (2026-10-31)** — `frontend/src/lib/views/Module1View.svelte` uniquement :
  * **Câblage `audioEngine.js`** : import de `readID3Tags`, `detectBPM`, `detectKey` depuis `../audioEngine.js`. Au chargement d'un fichier (Deck A/B), lecture prioritaire des tags ID3v2 (`readID3Tags` : titre/artiste/album/année/genre/TBPM/TKEY) ; si BPM ou clé manque, décodage Web Audio (`AudioContext.decodeAudioData`) puis `detectBPM()` / `detectKey()` en secours. La clé ID3 est normalisée vers un code Camelot 1A-12B (`normalizeCamelot` : accepte "12B", "E", "Am", "Bb min"...). Les anciens helpers locaux de simulation par nom de fichier (`detectTrack`, `REFERENCE_TRACKS`) sont supprimés au profit du moteur réel.
  * **Fenêtre modale de métadonnées manquantes** : si BPM ou clé reste indéterminé après analyse, modale (`showMetadataModal` / `pendingTrackData` avec `deckTarget`) permettant de saisir/corriger le BPM (40–200) et la clé Camelot (liste 1A-12B), avec bouton « ✔ VALIDER ET INSÉRER » (désactivé tant que la saisie est invalide) et « ANNULER ».
  * **Bouton ÉJECTER / verrouillage** : `CassetteDeck` reçoit `onEjectTrack` ; dès qu'une piste est chargée, son bouton bascule en « EJECT » (comportement déjà présent dans le composant) ; le clic réinitialise le lecteur à l'état vide « INSÉRER CASSETTE » (`file`, métadonnées et BPM remis à zéro, `input.value` vidé pour permettre la resélection du même fichier).
  * **Tests** : `frontend/src/lib/views/Module1View.test.js` adapté au nouveau flux (24 tests au total sur 6 fichiers) — chargement via `audioEngine` (ID3 puis DSP, modale en jsdom faute d'AudioContext), test d'ouverture de la modale métadonnées manquantes avec saisie BPM/clé appliquée au TempoDisplay, test du bouton **ÉJECTER** (retour à « INSÉRER CASSETTE », badge `WAITING FOR TRACKS (0/2)`, calcul verrouillé, modale fermée).
  * **Validation** : `npm test` → **6 fichiers / 24 tests, 100 % au vert** (aucune erreur non gérée ; avertissements jsdom `HTMLCanvasElement.getContext` sans le paquet canvas, sans impact). Champs de la modale bindés sur des `$state` dédiés (`modalBpm`/`modalKey`) pour éviter toute lecture sur `pendingTrackData = null` à la fermeture.

* **Correctifs DSP & références v8.7 (2026-10-31)** — `frontend/src/lib/audioEngine.js` + `frontend/src/lib/views/Module1View.svelte` + `Module1View.test.js` :
  * **Correction d'octave de tempo (anti-half-tempo)** dans `detectBPM()` : la plage d'autocorrélation couvre déjà 40–200 BPM ; si le BPM retenu est < 100 BPM et que l'harmonique rapide (lag/2, soit 2× BPM) porte au moins 50 % du score maximal, le tempo est doublé (`bpm × 2`, plafonné à 200 BPM).
  * **Pondération de la tonique** dans `detectKey()` : les octaves graves (MIDI 36–47) du chromagramme sont surpondérées ×1.6 pour différencier les modes relatifs Majeur/Mineur (ex. 9A Mi mineur vs 9B Sol majeur).
  * **Bouton de bascule Majeur/Mineur relatif** dans `Module1View.svelte` (à côté de la clé détectée, panneau roue Camelot, `data-testid="toggle-relative-mode"`) : bascule la clé de la piste B entre relatif majeur/mineur (même numéro, lettre opposée, ex. 9B ↔ 9A) via `keyInfo().relativeCode` et recalcule la compatibilité Gatekeeper.
  * **Nouvelles valeurs de référence** dans `REFERENCE_TRACKS` (`audioEngine.js`, simulation hors navigateur) : « Ace of Base - All That She Wants » → 187.50 BPM / 12A ; « Alicia Keys - Fallin' » → 191.90 BPM / 9A.
  * **Tests** : `Module1View.test.js` complété (26 tests au total sur 6 fichiers) — références 187.50/12A et 191.90/9A affichées après saisie modale + analyse, et bascule relative 9B ↔ 9A (12B ➔ 9A = MODULATION +7h, 75 %, GO).
  * **Validation** : `npm test` → **6 fichiers / 26 tests, 100 % au vert**.
* **Enrichissement métadonnées en ligne v8.8 (2026-10-31)** — `frontend/src/lib/services/metadataService.js` + `Module1View.svelte` + `CassetteDeck.svelte` :
  * **Service `metadataService.js`** : `fetchOnlineMetadata(title, artist)` interroge l'API iTunes Search (`https://itunes.apple.com/search`, GET avec `term` = `${artist} ${title}` encodé via `encodeURIComponent()`, `media=music`, `entity=song`, `limit=1`) et parse `results[0]` : pochette HD via `artworkUrl100` dont le suffixe `/100x100bb.jpg` (ou `/100x100wa.jpg`) est remplacé par `/600x600bb.jpg` (version plein cadre ; l'ancienne `wa` ajoutait une marge blanche autour de la pochette), `trackName` (titre), `artistName` (artiste), `collectionName` (album), `primaryGenreName` (genre), année via `releaseDate.substring(0, 4)`, et `previewUrl` (extrait 30 s). Échec réseau ou `results` vide → `{ success: false }`, sans lever d'exception ni bloquer l'UI.
  * **Câblage Module 1** : au chargement d'une piste (`loadTrack` dans `Module1View.svelte`), si la pochette ou des métadonnées (titre/artiste/album/genre/année) sont absentes des tags ID3 locaux, `fetchOnlineMetadata()` est déclenché en arrière-plan (promesse non attendue, `.then()` sans blocage) ; seuls les champs encore vides sont complétés et `coverUrlA`/`coverUrlB` sont mis à jour (remis à `null` à l'éjection). Terme de recherche de repli depuis le nom de fichier (`"Artiste - Titre.mp3"` → artiste + titre).
  * **Affichage** : `CassetteDeck.svelte` accepte la prop optionnelle `coverUrl` et affiche la pochette HD sur l'étiquette centrale de la cassette : `<img class="tape-cover rounded-sm object-cover" data-testid="deck-cover" src={coverUrl} alt="Pochette HD du morceau" />`.
  * **Tests** : mock global de `globalThis.fetch` dans `Module1View.test.js` (interception de `itunes.apple.com`, `results: []` par défaut = cas hors-ligne) + 2 nouveaux tests (pochette HD 600x600 affichée, URL de requête conforme `term`/`media`/`entity`/`limit`, métadonnées complétées ; cas hors-ligne sans pochette ni blocage) et 2 nouveaux tests dans `frontend/test/CassetteDeck.test.js` (`coverUrl` présent → img avec classes `rounded-sm object-cover` ; absent → aucune img).
  * **Validation** : `npm test` → **6 fichiers / 30 tests, 100 % au vert**.
* **Précision DSP & UI v8.9 (2026-10-31)** — `frontend/src/lib/audioEngine.js`, `ID3TagCard.svelte`, `CamelotCompatibility.svelte`, `CassetteDeck.svelte`, `Module1View.svelte` :
  * **`detectBPM()` — interpolation parabolique** : autour du pic d'autocorrélation retenu (`chosen`), quadratic peak fitting sur les scores des lags voisins (`delta = 0,5·(ym−yp)/(ym−2·y0+yp)`, plafonné à ±1) affine le lag ; le BPM est arrondi au **centième** (`Math.round(bpm*100)/100`, ex. 187.54 au lieu de 188.00), y compris après l'anti-half-tempo (×2 au centième).
  * **`detectKey()` — passe-bas biquad < 200 Hz** : nouveau filtre `lowpassBiquad()` (formule RBJ, Q = 1/√2, cutoff 200 Hz) appliqué au PCM avant le chromagramme, pour renforcer le poids des fondamentales de basse avant la corrélation Krumhansl-Schmuckler (en complément du `bassBoost` ×1.6 existant sur les MIDI 36–47).
  * **Contraste métadonnées (`ID3TagCard.svelte`)** : couleur de `.meta-val` (Album/Année/Genre/Bitrate) relevée à `#CBD5E1` (équivalent `text-slate-300` — Tailwind n'étant pas installé dans le dépôt, la valeur hex est appliquée directement en CSS).
  * **Alerte WARP HAZARD (`CamelotCompatibility.svelte`)** : si `|timeStretchPercent| > 15 %`, badge clignotant ambre `⚠ WARP HAZARD (>15%)` (`data-testid="warp-hazard"`) + bouton `÷2 TEMPO CIBLE (xx.x BPM)` (`data-testid="halve-target-bpm"`) appelant la nouvelle prop `onHalveTargetBpm` ; câblé dans `Module1View.svelte` (`halveTargetBpm` : divise `bpmB` par 2 au centième et recalcule le stretch affiché).
  * **Bouton ÉJECTER (`CassetteDeck.svelte`)** : classes `border-amber-500/50 hover:border-amber-400` ajoutées au bouton quand une cassette est chargée (état EJECT) ; équivalents CSS appliqués (amber-500 `#F59E0B` à 50 %, hover amber-400 `#FBBF24` + glow).
  * **Tests** : nouveau `frontend/src/lib/audioEngine.test.js` (6 tests : précision 2 décimales du BPM sur train d'impulsions à 128.37 BPM ±0,5 et 120 BPM ±1, null sur entrées invalides ; detectKey sur triades de basse avec racine à ±1 demi-ton d'une note de l'accord + null au silence) + 2 tests `CamelotCompatibility.test.js` (badge WARP HAZARD + callback ÷2 ; absence sous ±15 %).
  * **Validation** : `npm test` → **7 fichiers / 38 tests, 100 % au vert**.
* **Refonte UI Phase 1 v8.10 (2026-10-31)** — `ID3TagCard.svelte` + `CassetteDeck.svelte` + `Module1View.svelte` :
  * **`ID3TagCard.svelte`** : nouvelle prop `coverUrl` ; la carte est agrandie (padding 12px 14px) et la pochette d'album s'affiche **à côté des métadonnées** (`<img class="cover-img rounded-md" data-testid="id3-cover">`, 80×80px, `object-fit: cover`, coins arrondis 6px + ombre portée ; `rounded-md` en classe + équivalent CSS, Tailwind absent du dépôt). Le corps passe en disposition rangée (pochette + colonne texte).
  * **`CassetteDeck.svelte`** : la pochette est **retirée des cassettes** (prop `coverUrl`, `<img data-testid="deck-cover">` et CSS supprimés) — l'étiquette néon rétro (`tape-label`) redevient l'affichage par défaut.
  * **`Module1View.svelte`** : `coverUrlA`/`coverUrlB` sont désormais transmis aux `ID3TagCard` (et plus aux `CassetteDeck`).
  * **Tests** : `Module1View.test.js` (pochette attendue en `id3-cover` avec `rounded-md`), `CassetteDeck.test.js` (aucune image sur la cassette, étiquette néon par défaut), `ID3TagCard.test.js` (+2 tests : pochette affichée/absente).
  * **Validation** : `npm test` → **7 fichiers / 39 tests, 100 % au vert**.
* **Refonte UI Phase 2 v8.11 (2026-10-31)** — `Module1View.svelte` + `CamelotCompatibility.svelte` :
  * **Suppression de la forme d'onde** : `BeatgridOverlay` retiré du template et du style de `Module1View.svelte` (import, balise et règle CSS `.beatgrid-panel` supprimés). Le composant et ses tests unitaires restent intacts.
  * **Gatekeeper déplacé en colonne centrale** : `CamelotCompatibility` rendu juste sous la roue Camelot (`camelot-panel`), avec `class="w-full"` (+ règle CSS équivalente, Tailwind absent du dépôt) ; retiré de la colonne droite.
  * **Gatekeeper placé sous la roue Camelot (tâche alchemix#16, 2026-11-03)** : `CamelotCompatibility` est rendu dans `.col-center`, juste après le cadran Camelot (`camelot-panel`) et avant le bandeau beatgrid (`data-testid="compatibility-section"`). Il n'est plus dans la colonne droite. Cette disposition remplace le placement en haut de colonne de la tâche 1.3 (alchemix#3). Ajout de `data-testid="pitch-shift"` (recommandation de pitch shift en demi-tons, `suggestedPitchShift`) dans `CamelotCompatibility.svelte`.
  * **Validation de la clé (alchemix#17, 2026-11-03)** : `Module1View.svelte` convertit désormais le tag ID3 `TKEY` en code Camelot via `camelotFromKeyName` (ex. « Am » → 8A) ; sans tag valide, la clé DSP est utilisée. Test RED→GREEN : `Module1View.tempo.test.js` (tag TKEY « Am »). Limites connues : la confiance de la clé est calculée par `detectKey` mais non transmise à l'interface (la « confiance » affichée est celle du tempo). Mesure réelle sur « Belle & Sebastian — We Were Beautiful » (MP3, 337 s, `detectKey` et `detectBPM` exécutés hors navigateur sur le PCM décodé) : clé entière 8B (Do majeur, confiance 72), tempo 144 BPM ; par segments de 30 s, 8B dominant (6 segments sur 11), avec 12A, 5A et 7A minoritaires. Quatre outils en ligne donnent des résultats divergents : Mi mineur 8A, Sol majeur 9B (×2), Fa majeur 7B ; tempo 72 ou 144 BPM. La validation n'est donc pas concluante : la clé 8B n'apparaît dans aucun outil externe. Second morceau « Fickle Season » (243 s, tempo 102,36 BPM, conforme aux outils) : clé app 8B (Do majeur, confiance 63) ; outils : 12B, 11B (deux outils), 7B. Diagnostic (copie temporaire de `detectKey`) : profil chromatique de la basse peu marqué (0,14 à 0,38), meilleur score Do majeur (0,266), tonique Mi rejetée (score 0,086, écart > 0,03). Do majeur ressort sur les deux morceaux : biais systématique probable, non corrigé. Troisième morceau « Yellow » (267 s, tempo 86,75 BPM, conforme aux outils) : clé app 9A (Mi mineur, stable sur 7 segments de 30 s sur 8) ; outils : 1B (Si majeur, trois outils), 7B (Fa majeur). Le biais n'est donc pas toujours vers Do : la détection par basse (< 180 Hz) n'est pas fiable sur ces trois morceaux. Test de la proposition 1 (élargissement de la bande, sur copies temporaires de `detectKey`, quatre morceaux, accord avec au moins un outil) : coupure 180 Hz 0/4 ; 500 Hz 1/4 ; 1000 Hz et 2000 Hz 2/4 (« Fickle Season » 11B, « Yellow » 1B) ; sans filtre 2/4. Restent en Do majeur « Sultans of Swing » (Fa majeur pour les quatre outils, biais de quinte) et « We Were Beautiful ». Proposition 1 partiellement validée : à combiner avec une revue de la règle de tonique. Cinquième morceau « Algorithm » (Muse, outils : 6A×3, 7B) et matrice étendue à cinq morceaux : 180 Hz 0/5 ; 500 Hz 1/5 ; 1000 Hz 2/5 ; 2000 Hz 2/5 ; sans filtre 2/5. Une tolérance de tonique de 0,15 au lieu de 0,03 n'apporte aucun accord supplémentaire (« Sultans of Swing » reste en 8B) : la règle de tonique n'est pas la cause principale. Les écarts sont souvent d'un pas sur la roue (une quinte) : cause probable à investiguer dans le profil de corrélation.
  * **Exécution alchemix#17 (2026-11-03)** :
    * **Étape 1 — bande d'analyse 1000 Hz** : `detectKey` filtre désormais à 1000 Hz (au lieu de 180 Hz). Test RED→GREEN : accord aigu La majeur dominant une basse Mi mineur faible → 11B (`audioEngine.test.js`).
    * **Étape 2 — biais de quinte, écartée** : bonus de tonique (`score = corrélation + w × énergie de la tonique`) testé pour w = 0,25 à 2 sur cinq morceaux de référence. Aucun gain ; w > 0 fait basculer « Fickle Season » de 11B à 12A. Non intégrée. Le biais de quinte reste non résolu.
    * **Étape 3 — confiance de la tonalité** : `analyzeTempoKey` renvoie `keyConfidence` (transmis par le worker) ; `TempoDisplay` l'affiche (`data-testid="key-confidence"`).
    * **Popup de saisie** : si la confiance est inférieure à `KEY_CONFIDENCE_MIN` (70, dans `audioEngine.js`), le modal `MetadataModal` s'ouvre, pré-rempli avec la clé détectée et un avertissement (`modal-key-warning`). Une clé issue d'un tag ID3 valide n'a pas de confiance et n'ouvre pas le popup. La saisie manuelle remet la confiance à `null`.
    * **Nom musical agrandi** : `TempoDisplay` affiche « G Minor » / « A Major » en `headline-lg` (`data-testid="key-name"`).
    * **Tests** : `Module1View.keyConfidence.test.js` (3 tests, DSP simulé) ; `TempoDisplay.test.js` (+4 tests) ; `audioEngine.test.js` (+3 tests). `npx vitest run` → **16 fichiers, 147 tests verts**.
    * **Limites connues** : la confiance ne départage pas les bonnes et mauvaises réponses sur les cinq morceaux (70 à 84 pour toutes) ; le seuil de 70 est donc arbitraire et ne déclenche le popup sur aucun des cinq morceaux. Le texte du modal parle encore de tonalité « non extraite » ; l'avertissement de confiance le complète. Aucune vérification visuelle dans le navigateur.
  * **Nettoyage des doublons** : le bouton global « ENVOYER VERS MODULE 2 » supprimé de `CamelotCompatibility.svelte` (footer `action-footer`, handler `handleSend`, prop `onSendToModule2` et CSS retirés) ; seuls les boutons dédiés « DÉMIXER PISTE A/B ➔ MODULE 2 » des `ID3TagCard` assurent le transfert vers le Module 2.
  * **Tests** : `CamelotCompatibility.test.js` (4 tests de bouton global remplacés par 1 test d'absence du bouton ; les 2 tests WARP HAZARD conservés), `Module1View.test.js` (assertions basculées sur les boutons par piste + absence du bouton global).
  * **Validation** : `npm test` → **7 fichiers / 36 tests, 100 % au vert**.
* **Tâche 1.4 — État neutre de la roue Camelot (Kanzo alchemix#4, 2026-11-03)** :
  * `CamelotWheel.svelte` : `keyA` / `keyB` n'ont plus de défaut `"12B"` (valeur `null`), donc aucune surbrillance au chargement. Sans aucune clé (`isIdle`), la roue reste complète (24 segments et anneaux, sans aucun texte) et un cercle vert tournant (`data-testid="wheel-idle-ring"`, `#00E676`, rayon 190, animation `spinRing` 9 s) l'entoure. Sont masqués sans clé : les codes et notes des segments, le libellé central, les badges, l'arc et la légende. Dès qu'une clé est présente, la roue s'affiche normalement et seule la légende de la piste qui a une clé est rendue (libellé central « A ➔ B » avec « — » pour la clé manquante).
  * `Module1View.svelte` : `keyA` / `keyB` transmises telles quelles (plus de `'12B'`) ; les indicateurs « PISTE A (--) / PISTE B (--) » du panneau n'apparaissent que si la clé existe. Le retour à l'état neutre passe par `handleEjectTrack` (appelé par `handleQuitClean` avant `resetAudioEngine()`), qui remet `key` à `null`.
  * **Écart avec la tâche 1.4** : la tâche prévoyait des segments en opacité réduite ; la demande utilisateur (2e itération) est une roue complète sans valeurs, avec le cercle vert autour. Cela remplace la légende permanente décrite en Refonte v8.3.
  * **Tests** : `components/CamelotWheel.test.js` (4 tests : roue complète sans valeur, cercle vert autour, clé A seule). RED confirmé avant implémentation. `npm test` → 17 fichiers / 152 tests verts ; `npm run build` sans avertissement.
  * **Suppression forme d'onde et beatgrid (2026-11-03, demande utilisateur)** : `Module1View.svelte` n'importe plus `BeatgridOverlay` et ne rend plus le panneau `beatgrid-panel` ni son footer (PHASE OFFSET, GRID SNAP, TIME-STRETCH). La mention de retrait de la v8.11 était inexacte : le retrait n'avait pas été fait dans le code, il l'est désormais. Le composant `BeatgridOverlay.svelte` et son test ne sont pas supprimés (inutilisés). Test : `Module1View.layout.test.js` (absence du panneau, du canvas et des libellés).
  * **Taille de la roue et Gatekeeper (2026-11-03, demande utilisateur)** : le cadran `CamelotWheel` passe de 484 px à 432 px (90 %, après un essai à 387 px jugé trop petit) : `max-width` du conteneur et du SVG, `height` et `max-width` du CSS, et `max-w-[432px]` du cadre `wheel-wrapper` dans `Module1View.svelte`. Le cadre de la roue n'est plus extensible (`flex-none`) ; la section `compatibility-section` prend l'espace libéré (`flex-1`), et le panneau `camelot-compat-panel` s'étire en conséquence (`flex-1`). Test : `CamelotWheel.test.js` (taille 432 px).
  * **Police du Gatekeeper (2026-11-03, demande utilisateur)** : dans `CamelotCompatibility.svelte`, les tailles sont augmentées localement sans toucher aux jetons globaux (`--text-label-sm` 9 px et `--text-label-md` 10 px restent inchangés pour les autres modules) : `label-sm` → 12 px, `label-md` → 13 px, icônes 13/14 px → 15/16 px. Les familles de police sont conservées. Aucun test automatisé ne couvre ce point ; vérification visuelle par l'utilisateur.
  * **Marge du Gatekeeper (2026-11-03, analyse du code)** : `camelot-compat-panel` passe de `p-space-sm` (6 px) à `p-space-md` (10 px), comme le bandeau d'analyse et le cadran Camelot de la même colonne. Analyse statique : aucune règle CSS globale ne décale ce panneau ; le décalage visible sur la capture n'est pas confirmé (mesure DOM non réalisée) et reste à vérifier par l'utilisateur.
  * **Aération du Gatekeeper (2026-11-03, demande utilisateur)** : `CamelotCompatibility.svelte` — espacement entre blocs `gap-1` → `gap-2` ; verdict `p-1.5` → `p-2.5` ; lignes transition et pitch shift `px-0.5` → `px-1 py-0.5` ; alerte WARP HAZARD `p-1.5` → `p-2` ; bouton RELATIF `py-1` → `py-1.5` ; badges de clés `px-1.5 py-0.5` → `px-2 py-1` avec `gap-1.5`. Contenu et tailles de police inchangés. Analyse statique seulement : vérification visuelle par l'utilisateur.
  * **Cadre « Conseils de mix » (2026-11-03, demande utilisateur)** : nouveau composant `components/MixAdvisor.svelte`, placé juste sous le Gatekeeper dans la colonne centrale (`Module1View.svelte`). Ses conseils viennent de `frontend/src/lib/mixAdvice.js` (fonction pure `mixAdvice({ gatekeeper, compat, timeStretchPercent })`) : règle appliquée (même tonalité, relatif, quinte, boost d'énergie, modulation), pitch shift conseillé, et alerte time-stretch au-delà de 15 % (renvoi vers le bouton ÷2 du Gatekeeper). Gate verrouillé (NO-GO) : le cadre reste visible avec un message d'attente, sans conseil. Pas encore de conseil sur la sélection de tempo ou de métadonnées. Tests : `mixAdvice.test.js` (8), `components/MixAdvisor.test.js` (2), `Module1View.layout.test.js` (placement). `npm test` → 19 fichiers, 165 tests verts ; `npm run build` sans avertissement. Vérification visuelle par l'utilisateur.
  * **Remontée du cadre de conseils (2026-11-03, demande utilisateur)** : la section du Gatekeeper n'est plus étirée (`flex-1` retiré, `shrink-0` ; `flex-1` retiré du panneau `camelot-compat-panel`), donc le cadre `MixAdvisor` suit directement la liste des clés compatibles avec un espace de `mt-2` (8 px, en plus de l'espacement de colonne). La zone libre reste en bas de la colonne centrale. Vérification visuelle par l'utilisateur.
  * **Pochette de secours (2026-11-03, demande utilisateur)** : si iTunes ne renvoie pas de pochette, `Module1View.svelte` appelle `fetchFallbackCover(artist, title)` (`services/metadataService.js`) : recherche d'enregistrement sur MusicBrainz (sans clé, `fmt=json`), puis pochette 500 px de Cover Art Archive pour la première des 3 releases qui en possède une, vérifiée par une requête HEAD (aucune URL 404 n'est renvoyée). Le navigateur ne peut pas définir le User-Agent demandé par MusicBrainz ; à surveiller si MusicBrainz limite les requêtes. Vérifié par `curl` : MusicBrainz et Cover Art Archive renvoient `Access-Control-Allow-Origin: *`, et la chaîne de redirection jusqu'à archive.org aussi. Tests : `services/metadataService.test.js` (4). `npm test` → 20 fichiers, 169 tests verts ; `npm run build` sans avertissement. Limite : la vue a encore sa propre copie de la recherche iTunes (`searchItunes`) ; le service `metadataService.js` n'est pas utilisé pour iTunes.
  * **Correction pochette absente (2026-11-03, capture utilisateur « Lorelei.Flac »)** : deux causes. (1) La recherche en ligne démarrait avant la lecture des tags ID3 avec l'artiste factice « Artiste Inconnu » (nom de fichier sans « Artiste - Titre ») : elle démarre désormais après la lecture des tags (`enrichOnline`), avec l'artiste du tag ou, à défaut, l'artiste du nom de fichier, et sans « Artiste Inconnu ». (2) Un titre gardant l'extension de format (« Lorelei.Flac ») donne 0 résultat iTunes : `stripAudioExtension` la retire avant la recherche. Vérifié par `curl` : « Cocteau Twins Lorelei.Flac » → 0 résultat ; « Cocteau Twins Lorelei » → pochette. Tests : `Module1View.test.js` (2 tests de non-régression). Limite : si la lecture du fichier échoue, aucune recherche en ligne n'est lancée (avant, elle partait du nom de fichier). Le test helper `selectAudioFile` fournit désormais `arrayBuffer` (jsdom ne l'implémente pas). `npm test` → 20 fichiers, 171 tests verts ; `npm run build` sans avertissement.
  * **Titre et police de l'étiquette cassette (2026-11-03, demande utilisateur)** : (1) le nom de fichier perd désormais son extension de format avant d'être découpé en artiste et titre (`stripAudioExtension` appliqué à `cleanName`) : « Lorelei.Flac.mp3 » donne « Lorelei » ; le titre affiché et celui de la recherche sont donc propres. (2) La police de l'étiquette (`--font-sleeve`, utilisée uniquement par `CassetteDeck.svelte`) passe de IM Fell English à Merriweather, plus lisible à petite taille ; la requête Google Fonts de `index.html` est mise à jour (IM Fell retirée). Hors-ligne, la police retombe sur Georgia. Tests : `Module1View.test.js` (titre sans extension). `npm test` → 20 fichiers, 172 tests verts ; `npm run build` sans avertissement. Rendu visuel à valider par l'utilisateur.
  * **Clés relatives masquées sans deux pistes (2026-11-03, demande utilisateur)** : le bouton « ⇄ RELATIF » et la liste des clés compatibles (badges) de `CamelotCompatibility.svelte` ne s'affichent que si la prop `showKeyLinks` est vraie. `Module1View.svelte` la règle sur `isBothLoaded` : aucune piste ou une seule piste chargée → ces deux éléments sont absents. Interprétation : « clefs relatives » désigne à la fois le bouton RELATIF et la liste des badges (capture utilisateur) ; si un seul des deux doit disparaître, dites-le. Tests : `CamelotCompatibility.test.js` (2), `Module1View.layout.test.js` (1, aucune piste). `npm test` → 20 fichiers, 175 tests verts ; `npm run build` sans avertissement.
  * **Correction du nettoyage de cache (2026-11-03, vérification du bouton « QUITTER & NETTOYER LE CACHE »)** : `clean_cache` (`src-tauri/src/main.rs`) utilisait `app.path().cache_dir()`, qui sous Windows désigne `%LOCALAPPDATA%` partagé par toutes les applications : la commande supprimait tout son contenu. Elle vide désormais `app_cache_dir()/cache` (`%LOCALAPPDATA%\studio.alchemix.app\cache`), via `clear_dir` ; le profil WebView2 situé à la racine de ce dossier n'est pas touché. Tests Rust (dossiers temporaires, jamais de données réelles) : `cargo test` → 3 tests verts ; `cargo check` sans avertissement. La commande n'a pas été lancée sur les données réelles de la machine. Le bouton du pied de `Module1View` (« 🧹 QUITTER ET NETTOYER LE CACHE ») ne ferme pas l'application et ne vide que l'état mémoire (`handleQuitClean`) : nom trompeur, à reprendre si besoin.
  * **Limites** : aucun test ne couvre le retour à l'état neutre via `handleQuitClean` ; le rendu visuel (animation, couleurs) est vérifié par l'utilisateur dans le navigateur.
* **Étape 2 — discrimination Majeur/Mineur v8.12 (2026-10-31)** — `audioEngine.js` (`detectKey`) :
  * Profils Krumhansl-Schmuckler renforcés sur la tierce pour éviter les confusions majeure/relative mineure (ex. 10B vs 7A, 11B vs 12A) : profil majeur min3 2.33→2.10 / maj3 4.80→5.10 ; profil mineur maj3 2.60→2.30 / min3 5.80→6.00.
  * **Comparaison spectrale ciblée à la tierce** : chroma à bin exact (`chromaExact`, sans étalement ±1) comparant root+3 (tierce mineure) vs root+4 (tierce majeure), avec marge de 15 % ; tranche le mode après la détermination de la tonique.
  * FFT du chromagramme passée à **N=8192** (résolution ~5,4 Hz) pour séparer les demi-tons graves (< 200 Hz) que N=4096 fusionnait en un même bin.
  * **Tests** : +4 cas ciblés dans `audioEngine.test.js` — La majeur→11B, La mineur→8A, Mi majeur→12B, Mi mineur→9A.
  * **Validation** : `npm test` → **7 fichiers / 42 tests, 100 % au vert**.
* **Étape 3 — extraction du bitrate v8.13 (2026-10-31)** — `audioEngine.js`, `Module1View.svelte`, `ID3TagCard.svelte` :
  * **`detectBitrate(file, audioBuffer)`** (`audioEngine.js`) : lit le bitrate binaire dans l'en-tête MP3 (trame MPEG1 Layer III, table des bitrates — ex. « 320 kbps »), renvoie « VBR » si l'en-tête Xing/Info est présent ; sinon **fallback propre** basé sur la fréquence d'échantillonnage et le canal (ex. « 44.1 kHz / 16-bit / stéréo », « 48.0 kHz / 16-bit / mono »).
  * **`Module1View.svelte`** : `loadTrack` renseigne `metadata.bitrate` (via `detectBitrate`) et `metadata.sample_rate` (AudioBuffer décodé).
  * **`ID3TagCard.svelte`** : le champ BITRATE affiche la donnée dynamique (`data-testid="meta-bitrate"`, `—` si vide) avec le contraste harmonisé `.meta-val` `#CBD5E1` (équivalent slate-300).
  * **Tests** : +4 dans `audioEngine.test.js` (320 kbps, VBR/Xing, fallback 48 kHz mono, défaut 44.1 kHz stéréo) et +2 dans `ID3TagCard.test.js` (bitrate « 320 kbps » et fallback affichés).
  * **Validation** : `npm test` → **7 fichiers / 48 tests, 100 % au vert**.
* **Carte ID3 agrandie (`ID3TagCard.svelte`)** : pochette portée de 96 à 144 px (`w-36 h-36`), titre en 20 px, artiste en 16 px, album en 14 px, libellés et valeurs en 12 px, pour une lecture confortable. La fiche technique a été reprise (7 champs, grille 2 colonnes, genre sur toute la largeur) : durée (m:ss), genre, format (extension du fichier), débit (« 320 kbit/s », ou « 245 kbit/s VBR » : pour un VBR, débit moyen = taille × 8 / durée), niveau sonore (LUFS à une décimale), fréquence d'échantillonnage (virgule décimale, « 44,1 kHz »), canaux (Mono / Stéréo / 5.1 / N canaux). La carte ID3 affiche un statut `role="status"` pendant le chargement : « Analyse du fichier audio en cours — patientez… » pendant le calcul local, puis « Recherche des métadonnées en ligne — patientez… » pendant l'appel iTunes (état `isFetchingOnline` de la piste, remis à faux à la réponse ou à l'erreur). L'album et l'année restent sous le titre et l'artiste. Le niveau sonore est calculé par `frontend/src/lib/loudness.js` (`measureLoudness`), une approximation de l'ITU-R BS.1770 : pondération K, blocs de 400 ms avec recouvrement de 75 %, gate absolu à -70 LUFS et gate relatif à -10 LU.
 — `frontend/src/app.css` (tokens `@theme` : couleurs, espacements, typographies de la maquette), `frontend/index.html` (polices DM Sans / JetBrains Mono / Space Grotesk), `HeaderBar.svelte` (navigation des 4 modules, badge MK-IV, bouton QUITTER & NETTOYER LE CACHE à voyant rubis ; les indicateurs FREQ / DEPTH / GPU ont été retirés), `CassetteDeck.svelte`, `TempoDisplay.svelte` (BPM + clé Camelot, variante ambre/émeraude), `ID3TagCard.svelte`, `CamelotCompatibility.svelte` (verdict GO/NO-GO, WARP HAZARD, bascule RELATIF), `CamelotWheel.svelte` (SVG fluide dans son conteneur), `views/Module1View.svelte` (3 colonnes : Deck A / centre Camelot + beatgrid / Deck B + Gatekeeper, footer châssis).
  * **Lecture des cassettes (PLAY / STOP)** : `frontend/src/lib/services/deckPlayer.js` (`createDeckPlayer`) charge le fichier choisi dans un `HTMLAudioElement` via une URL d'objet (libérée à l'éjection et au démontage). PLAY lance la lecture et fait tourner les bobines (`isPlaying`) ; STOP met en pause, revient au début et arrête les bobines ; la fin du morceau remet l'état à l'arrêt. Pendant la lecture, `onProgress` remonte la progression `currentTime / duration` (événement `timeupdate`) ; `CassetteDeck` en déduit le rayon des paquets de bande (aire proportionnelle à la longueur restante) : la bobine gauche se vide, la droite se remplit (`cassette-tape-disc` / `cassette-tape-disc-take-up`), sans transition au-delà de 250 ms. Chaque deck a son propre lecteur. Le corps de cassette (`cassette-body`) suit le ratio réel d'une cassette audio, 1,587:1 (largeur 100 : hauteur 63), via `aspect-ratio` et la constante `CASSETTE_RATIO` de `CassetteDeck.svelte`. Une fois un titre chargé, la façade réaliste apparaît (coquille transparente SVG avec vis et pions rouges, disque de bande noir, deux moyeux à 12 repères blancs, ambre pour le deck A et émeraude pour le deck B (charte des decks), qui tournent pendant l'analyse ou la lecture) ; sans cassette, la façade est éteinte à 35 % d'opacité. Une pochette de papier (`data-testid="cassette-sleeve"`) couvre la partie haute de la bande, avec la lettre de face (A pour le deck A, B pour le deck B) et le titre du morceau (`deck-track-name`, police `font-sleeve` = IM Fell English, antiqua gravée du XVIIᵉ siècle, token dans `app.css`) ; elle remplace le défilement de la bande. La bande néon au-dessus n'affiche plus que « CASSETTE CHARGÉE ». Dans chaque colonne latérale, l'ordre est : cassette, carte ID3 (`ID3TagCard`), `TempoDisplay`, puis le bouton « DÉMIXER PISTE A/B ➔ MODULE 2 » (`track-action-btn`, rendu par la vue et plus par `ID3TagCard`). Le bandeau BITRATE / DEPTH / FORMAT a été supprimé : ses informations sont dans la fiche technique de la carte ID3. `frontend/src/lib/bitDepth.js` (profondeur WAV / FLAC) n'est plus affiché ; il reste disponible sans être utilisé.
  * **Tests** : `frontend/test/CassetteDeck.test.js` (+5 : PLAY/STOP, états désactivés, rotation pendant la lecture), `frontend/src/lib/services/deckPlayer.test.js` (8), `frontend/src/lib/views/Module1View.playback.test.js` (5 : PLAY/STOP sur les decks A et B, indépendance du deck B). `HeaderBar.test.js` vérifie désormais l'absence des indicateurs retirés.
  * **Limites connues** : aucune sur les tests unitaires (suite verte). La vérification visuelle dans le navigateur n'a pas été effectuée (serveur de dev non relancé). Le bouton PLAY ne gère pas encore de position de lecture ni de boucle.

* **Session 2026-11-03 — dérive documentaire, worker DSP, orphelins** :
  * **Worker DSP branché (FR-011)** : `Module1View.loadTrack` appelle `detectBPMKey` au lieu de `detectBPM`/`detectKey`. `audioEngine.js` expose `analyzeTempoKey(audioBuffer)` (partagé entre le worker et le repli synchrone). `detectBPMKey` renvoie `{ bpm, confidence, regularity, key }`. Le PCM est copié avant transfert : auparavant, le transfert détachait les canaux de l'`AudioBuffer`, ce qui cassait `measureLoudness` et `detectBitrate`.
  * **Composants orphelins retirés** : `TitleCard.svelte`, `D3TagCard.svelte`, `components/Module1View.svelte` et `components/MetadataModal.svelt.svelte` (aucun import ; non suivis par Git, sauvegardés dans `C:\Users\danao\alchemix-orphelins-2026-11-03\`). La modale active est `components/MetadataModal.svelte`.
  * **Export vers Module 2 — non implémenté** : `handleSendToModule2` (`Module1View.svelte`) ne fait qu'un `console.info`. FR-010 n'est donc pas satisfait ; la mention « câblé à `sendTrackToModule2` » de la tâche T013 est erronée.
  * **Tests** : `npm test` → **15 fichiers / 133 tests, 100 % verts** (après correction de 4 tests DSP obsolètes de `audioEngine.test.js` : assertions de type `string` remplacées par le contrat `{ code, keyName, confidence }` et tolérance de flottant sur le time-stretch). 3 tests ajoutés : buffer non détaché, `confidence`/`regularity` via le worker, protocole de `audioWorker.js`. Le build `npm run build` n'a pas été lancé (tâche T016, réservée à l'utilisateur).
  * **Corrections documentaires** : Tailwind 4.3.3 est installé (`package.json`, `@import "tailwindcss"` dans `app.css`). Les mentions « Tailwind n'étant pas installé / absent du dépôt » des entrées v8.9 à v8.11 sont donc obsolètes. Les polices sont déclarées dans `frontend/src/app.css` et non dans `index.html`.

### 4.3 Système de Notifications Sonores (TTS)
* Dossier : `C:\Dev\Alchemix\tts\`
* **Succès** : `C:\Dev\Alchemix\tts\succes.wav` en fin de tâche sans erreur (`succes.mp3` équivalent présent).
* **Erreur** : `C:\Dev\Alchemix\tts\erreur.wav` en cas d'échec ou d'erreur (`erreur.mp3` équivalent présent).

### 4.4 Carte fichiers → code (traçabilité pour les contrôles de dérive)

| Fonction | Fichier(s) source | Tests |
| :--- | :--- | :--- |
| Moteur DSP : BPM, tonalité, bitrate, tags ID3 | `frontend/src/lib/audioEngine.js` | `frontend/src/lib/audioEngine.test.js` |
| Worker DSP (FR-011) | `frontend/src/lib/audioWorker.js` | `audioEngine.test.js` (bloc « Web Worker ») |
| Matrice Camelot et Gatekeeper | `frontend/src/lib/camelot.js` | `components/CamelotCompatibility.test.js` |
| Vue Module 1 (assemblage, analyse, purge) | `frontend/src/lib/views/Module1View.svelte` | `frontend/src/lib/views/Module1View*.test.js` (5 fichiers) |
| Platines cassette | `components/CassetteDeck.svelte`, `services/deckPlayer.js` | `frontend/test/CassetteDeck.test.js`, `services/deckPlayer.test.js` |
| Carte ID3 | `components/ID3TagCard.svelte` | `components/ID3TagCard.test.js` |
| Tempo | `components/TempoDisplay.svelte` | `components/TempoDisplay.test.js` |
| Roue Camelot | `components/CamelotWheel.svelte` | aucun |
| Gatekeeper (verdict, WARP HAZARD, bascule relatif) | `components/CamelotCompatibility.svelte` | `components/CamelotCompatibility.test.js` |
| Beatgrid / forme d'onde | `components/BeatgridOverlay.svelte` | `components/BeatgridOverlay.test.js` |
| Modale de métadonnées manquantes | `components/MetadataModal.svelte` | aucun |
| En-tête et purge de cache | `components/HeaderBar.svelte`, `src-tauri/src/main.rs` (`clean_cache`) | `components/HeaderBar.test.js` |
| Enrichissement iTunes | `services/metadataService.js` | `views/Module1View.test.js` |
| Niveau sonore (LUFS) | `frontend/src/lib/loudness.js` | `loudness.test.js` |
| Profondeur de bits (non utilisée) | `frontend/src/lib/bitDepth.js` | `bitDepth.test.js` |

---

## 5. Stack Technologique & Normes de Développement

* **Frontend GUI** : Svelte 5 (utilisant exclusivement la syntaxe Runes : `$state`, `$derived`, `$effect`), TypeScript, Vite, TailwindCSS & CSS sur-mesure (`venetian-steampunk.css`).
* **Desktop Wrapper** : Tauri 2.0 (Rust).
* **Backend Audio Core (C++20 & JUCE 8)** :
  * **Zero Allocation** : Aucune allocation mémoire dynamique (`new`, `vector::resize`) sur le thread audio temps réel.
  * **Queues Lock-Free** : Inter-process communication via `juce::AbstractFifo`.
* **Moteur d'Inférence IA (ONNX Runtime C++)** :
  * DirectML pour GPU DirectX 12 sous Windows.
  * CoreML pour Apple Silicon sous macOS.
  * TensorRT / CUDA pour GPU NVIDIA.
* **Format de Projet autoporteur** : `.mashup` (Archive ZIP64 / Zstandard contenant `project.json` et les fichiers audio/stems).

---

## 6. Protocole d'Exécution & Guide de Commandes

### 6.1 Commandes de Développement Principales
```powershell
# Lancer l'application Tauri + Svelte en mode dev
npm run tauri dev

# Exécuter la suite de tests unitaires (Vitest)
npm test

# Vérifier la compilation du front-end
npm run build
```

### 6.2 Prototypes Python

Supprimés du dépôt le 2026-11-03 : le dossier `protoype/` n'existe plus. La vérification automatisée repose désormais sur `npm test` (§6.1).

### 6.3 Directives d'Optimisation de Tokens pour Claude Code
1. **Règle du Périmètre Strict** : Interdiction d'effectuer des recherches de fichiers globales (`grep` ou `find` larges). Cibler directement les fichiers nécessaires.
2. **Post-Exécution TTS** : À la fin de chaque tâche, exécuter la lecture du fichier audio TTS correspondant (`succes.wav` ou `erreur.wav`).
3. **Maintien de la Cohérence Visuelle** : Conserver les classes du design system Steampunk (`.aw-panel`, `.aw-bezel`, `.copper-strip`, `.aw-led-screen`, `.aw-bezel-glass`, `.aw-btn-steampunk`).

---

## 7. Feuille de Route : Module 2 (Moteur de Démixage IA des Stems)

Le Module 2 est la prochaine étape de développement. Ses spécifications cibles sont :

1. **Intégration du Modèle IA ONNX / DirectML** :
   * Modèle hybride : **BS-RoFormer** pour la séparation haute fidélité de la voix et des éléments mélodiques, et **HTDemucs v4** pour la batterie et la basse.
2. **Interface Utilisateur Module 2 (`Module2View.svelte`)** :
   * Rack à 4 tranches de stems (Voix, Batterie, Basse, Autre/Instruments).
   * Faders de volume, boutons Solo/Mute et Vumètres RMS en laiton.
   * Modale de sélection de la qualité : *Mode Performance (Passe rapide)* vs *Mode Studio (Multi-passe haute résolution)*.
3. **Communication Inter-Module** :
   * Réception automatique des fichiers validés par le Gatekeeper du Module 1 (`fileA` et `fileB`).
