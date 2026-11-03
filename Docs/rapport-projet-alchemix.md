# Rapport Technique et Fonctionnel du Projet AlcheMix Studio

## 1. Introduction et Spécifications Fonctionnelles

**AlcheMix Studio** est une station de travail audio numérique (DAW — *Digital Audio Workstation*) spécialisée dans la création de mashups audio haut de gamme, le mixage harmonique avancé et la séparation de sources sonores par intelligence artificielle. Développée pour répondre aux exigences des DJs professionnels, producteurs et enseignants audio, l'application se distingue par son interface utilisateur immersive au thème **Venetian Steampunk Dark DAW** (alliant cuivres biseautés, laiton, cadrans en verre fumé et voyants néon ambre/émeraude) et par son architecture technique hybride haute performance.

### 1.1 Module 1 : Analyse Audio, Cadran d'Harmonie Camelot & Gatekeeper
* **Analyse de Tempo (BPM)** : Mesure automatique du tempo de chaque piste audio avec une précision au centième près (2 décimales, ex. `123.40 BPM`), jauge de confiance numérique (%) et classification automatique de la nature du rythme (`FIXED_ELECTRONIC` pour les rythmes électroniques réguliers ou `LIVE DRUMS` pour les batteries acoustiques).
* **Détection de Tonalité Harmonique** : Extraction de la clé musicale et conversion vers le code du système Camelot Wheel (`1A` à `12B`).
* **Lecture & Enrichissement des Métadonnées** : Lecture prioritaire des tags **ID3v2** (Titre, Artiste, Album, Année, Genre, Bitrate, Fréquence d'échantillonnage). En cas de métadonnées absentes, un service d'enrichissement réseau interroge l'API iTunes Search en arrière-plan sans bloquer l'interface. Si des données manquent encore, une fenêtre modale de saisie ergonomique s'affiche pour le DJ.
* **Double Platine Steampunk (Deck A / Deck B)** : Platines visuelles simulant des lecteurs de cassettes vintage avec bobines rotatives animées (`.spinning`), bouton de chargement natif (`LOAD`), bouton d'éjection (`EJECT`), voyants LED d'état et badges explicites (`TRACK A - MASTER` et `TRACK B - CANDIDATE`).
* **Cadran d'Harmonie Camelot (Roue 24 Touches)** : Horlogerie mécanique SVG dynamique (400×400 px) représentant les 24 tonalités majeures et mineures. Surlignage Or/Ambre (`#FFB300`) pour la Piste A (Master) et Émeraude/Turquoise (`#00E676`) pour la Piste B (Candidat), avec arc connecteur néon et badge `"MATCH PARFAIT"` en cas d'identité stricte.
* **Vumètre Gatekeeper de Compatibilité** : Calcul en temps réel d'un score de consonance (0 à 100 %), détermination du statut d'autorisation de mix (`GO — GATE UNLOCKED` pour score $\ge 60\%$, sinon `NO-GO`), affichage des recommandations de *Time-Stretch* (%) et de *Pitch-Shift* (demi-tons).
* **Alerte WARP HAZARD & Division du Tempo** : Lorsque le taux de compression/extension temporelle (*Time-Stretch*) dépasse $\pm 15\%$, un badge d'alerte clignotant `⚠ WARP HAZARD (>15%)` apparaît, accompagné d'un bouton d'action directe `÷2 TEMPO CIBLE` qui divise le tempo cible par deux pour ramener l'étirement dans une zone de haute fidélité acoustique.
* **Mode Relatif Majeur/Mineur** : Bouton de bascule `⇄ RELATIF` permettant d'intervertir dynamiquement la clé de la piste candidat entre son mode Majeur et Mineur relatif (ex. `9B ↔ 9A`) et de recalculer instantanément la compatibilité Gatekeeper.

### 1.2 Module 2 : Démixage IA & Séparation de Stems par Intelligence Artificielle
* **Séparation Quadri-Pistes (4 Stems)** : Isolement en temps réel des composantes musicales : **Vocals** (Voix), **Drums** (Batterie/Percussions), **Bass** (Ligne de basse) et **Other** (Instruments/Melodie).
* **Inférence IA sur GPU (DirectML / ONNX Runtime)** : Exploitation des modèles de réseaux de neurones profonds **BS-RoFormer** (*Band-Split RoFormer*) et **Mel-Band RoFormer**, offrant une séparation haute fidélité sans artéfact de déphasage (*phase cancellation free*).
* **Boutons d'Exportation Dédiés par Piste** : Chaque carte d'information ID3 intègre un bouton d'action directe (`DÉMIXER PISTE A ➔ MODULE 2` et `DÉMIXER PISTE B ➔ MODULE 2`), permettant d'envoyer la piste sélectionnée vers le moteur d'isolation IA.

### 1.3 Module 3 : Éditeur de Mashup, Alignement Temporel & Warping
* **Moteur de Time-Stretching & Pitch-Shifting** : Algorithme de rééchantillonnage temporel de qualité studio (Solfa / Rubberband / Elastique) permettant d'aligner parfaitement deux morceaux de tempos différents sans altérer la hauteur tonale (ou inversement).
* **Grille Temporelle 1/16e & Alignement de Phase** : Alignement automatique des mesures sur une grille rythmique au 1/16e de note (*beatgrid*), avec compensation automatique des légers décalages d'attaque.
* **Formes d'Onde Oscilloscope Canvas2D/WebGPU** : Visualisation tricolore superposée des formes d'onde des deux pistes avec balayage néon synchrone.

### 1.4 Module 4 : Exportation, Mastering & Format de Projet
* **Moteur de Mastering Virtuel** : Limitation crête, égalisation dynamique et harmonisation spectrale du mashup final.
* **Format de Projet Autoporteur `.mashup`** : Archive compressée ZIP64 / Zstandard contenant le fichier de structure `project.json`, les métadonnées, les marques de calage et les fichiers audio/stems bruts.
* **Exportations Audio Multi-Formats** : Exportation en MP3 (320 kbps), WAV (24-bit / 44.1 kHz ou 48 kHz) et FLAC haute résolution.

---

## 2. Spécifications Techniques et Architecture Système

### 2.1 Stack Technologique Globale
* **Frontend GUI** : Framework **Svelte 5** exploitant exclusivement la nouvelle syntaxe des **Runes** (`$state`, `$derived`, `$props`, `$effect`), **TypeScript**, **Vite**, **TailwindCSS** et une feuille de style CSS sur-mesure (`venetian-steampunk.css`).
* **Desktop Wrapper & Native Bridge** : **Tauri 2.0** (Rust) offrant une empreinte mémoire minimale, une sécurité renforcée et un pont IPC (*Inter-Process Communication*) asynchrone non-bloquant.
* **Backend Audio Core & DSP** : C++20 et framework **JUCE 8**. Thread audio temps réel conçu sans aucune allocation mémoire dynamique (*zero allocation* dans la boucle de rendu audio) et communication par files circulaires lock-free (`juce::AbstractFifo`).
* **Inférence IA** : Moteur **ONNX Runtime C++** accouplé à l'API **DirectML** sous Windows (DirectX 12 GPU Acceleration), **CoreML** sous macOS (Apple Silicon NPU) et **TensorRT / CUDA** sous Linux/NVIDIA.

### 2.2 Architecture Multi-Tier et Flux de Données

* **Interface Graphique (GUI)** : Svelte 5 (Runes `$state`, `$derived`) + WebGL / Canvas2D Oscilloscope.
* **Services Frontend & Workers DSP** : `audioWorker.js` (Worker DSP non-bloquant) et `metadataService.js` (Appels d'enrichissement réseau iTunes).
* **Moteur Audio Native & Inférence IA** : Backend C++20 JUCE 8 (Core audio lock-free) et ONNX Runtime C++ (Separation de stems BS-RoFormer via DirectML GPU).

---

## 3. Rôle Détaillé de Chaque Fichier du Projet

| Fichier | Dossier de destination | Rôle et Responsabilités Techniques |
| :--- | :--- | :--- |
| **`Module1View.svelte`** | `frontend/src/lib/views/` | Vue d'intégration principale du Module 1. Organise le conteneur plein écran à 3 colonnes (Deck A / Panneau Central / Deck B), gère l'état réactif global (`$state` pour `trackA` et `trackB`), orchestre le décodage audio, la modale de métadonnées, le bandeau `.analysis-panel` et les appels API. |
| **`HeaderBar.svelte`** | `frontend/src/lib/components/` | Barre d'en-tête de l'application. Affiche le logo AlcheMix, le titre gravé en laiton, les indicateurs système (*44.1 kHz, 24-bit, DirectML Ready*) et le bouton cuivré biseauté `QUITTER & NETTOYER LE CACHE` (`data-testid="quit-clean"`) déclenchant la commande Rust `clean_cache`. |
| **`CassetteDeck.svelte`** | `frontend/src/lib/components/` | Composant de platine à cassette vintage Steampunk. Gère l'animation CSS de rotation des bobines (`.spinning`), l'état à vide `INSÉRER CASSETTE` (`deck-insert-tape`), les boutons métalliques `LOAD` et `EJECT`, ainsi que les badges d'identification (`DECK A` / `DECK B`). |
| **`ID3TagCard.svelte`** | `frontend/src/lib/components/` | Carte d'affichage des métadonnées ID3v2. Présente le Titre, l'Artiste, l'Album, l'Année, le Genre, la fréquence d'échantillonnage (`meta-sample-rate`), le Bitrate dynamique (`meta-bitrate`), la pochette HD 96×96 px (`id3-cover` / fallback SVG), les badges `TAG`/`FICHIER` et le bouton de transfert vers le Module 2. |
| **`TempoDisplay.svelte`** | `frontend/src/lib/components/` | Afficheur numérique biseauté encastré dans du verre fumé (`.aw-bezel-glass`). Affiche le tempo en néon ambre au centième près (ex. `123.40 BPM`), la jauge de confiance de détection (0–100 %) et la qualification du tempo (`ELECTRONIC (FIXED)` ou `LIVE DRUMS`). |
| **`CamelotWheel.svelte`** | `frontend/src/lib/components/` | Composant graphique SVG interactif (400×400 px) représentant le cadran harmonique de Camelot à 24 segments. Surligne en Or/Ambre la clé de la Piste A, en Émeraude la clé de la Piste B, trace l'arc de liaison néon et affiche le badge `"MATCH PARFAIT"` en cas d'accord exact. |
| **`CamelotCompatibility.svelte`** | `frontend/src/lib/components/` | Vumètre Gatekeeper de consonance. Affiche la barre de consonance (0 à 100 %), le verdict `GO` / `NO-GO`, la règle Camelot appliquée (`<span data-testid="rule-applied">`), l'alerte `WARP HAZARD (>15%)` et le bouton de division du tempo par 2 (`÷2 TEMPO CIBLE`). |
| **`MetadataModal.svelte`** | `frontend/src/lib/components/` | Fenêtre modale de saisie/correction manuelle pour les pistes sans métadonnées. Expose le double sélecteur universel `modal-key-select` / `modal-key-input`, le champ `modal-bpm-input` et le bouton de confirmation `modal-confirm` (`modal-confirm-btn`). |
| **`BeatgridOverlay.svelte`** | `frontend/src/lib/components/` | Composant de visualisation oscilloscope et beatgrid 1/16e. Utilise Canvas2D/WebGPU avec boucle de rendu sécurisée (try/catch), ResizeObserver responsive et écran de veille ambré en l'absence de signal audio. |
| **`audioEngine.js`** | `frontend/src/lib/` | Moteur DSP JavaScript / Web Audio API. Implémente `readID3Tags` (parsing ID3v2), `detectBPM` (autocorrélation spectral flux, interpolation parabolique, anti-half-tempo), `detectKey` (filtre passe-bas RBJ < 180 Hz, chromagramme N=8192, profils Krumhansl-Schmuckler), `detectBitrate` (en-têtes MP3/Xing) et `resetAudioEngine` (purge mémoire FR-009). |
| **`audioWorker.js`** | `frontend/src/lib/` | Web Worker dédié à l'analyse DSP lourde en arrière-plan (constitution III), empêchant tout blocage ou saccade de l'interface utilisateur à 60 fps. |
| **`camelot.js`** | `frontend/src/lib/` | Moteur théorique de l'harmonie musicale. Contient la matrice de consonance `compatibilityBetween()`, les fonctions de conversion entre clés traditionnelles et codes Camelot, le calcul des modulations relatives et les formules de pitch/time-stretch. |
| **`metadataService.js`** | `frontend/src/lib/services/` | Service d'enrichissement réseau en arrière-plan. Interroge l'API iTunes Search (`fetchOnlineMetadata`), parse les résultats, extrait les couvertures HD (600×600 px) et complète silencieusement les champs ID3 manquants. |
| **`venetian-steampunk.css`** | `frontend/src/lib/styles/` | Feuille de style globale du thème Venetian Steampunk. Définition des variables CSS cuivrées (`--aw-copper`), laiton (`--aw-brass`), verre fumé (`--aw-bezel-glass`), néons ambre/émeraude et animations 3D tactiles. |
| **`main.rs` / `tauri.conf.json`** | `src-tauri/` | Configuration et code source de l'application hôte Rust/Tauri 2.0. Gère la fenêtre maximisée (1920×1080), les autorisations de système de fichiers et les commandes native IPC (`clean_cache`). |
| **`Module1View.test.js`** | `frontend/src/lib/views/` | Suite de tests d'intégration Vitest pour le Module 1 (8 tests : chargement, déverrouillage, analyse, modale, bascule relative, éjection, enrichissement iTunes, mode hors-ligne). |
| **`audioEngine.test.js`** | `frontend/src/lib/` | Suite de tests unitaires du moteur DSP (20 tests : précision du BPM, correction d'octave, filtres biquad, extraction du bitrate). |
| **`BeatgridOverlay.test.js`** | `frontend/src/lib/components/` | Suite de tests unitaires du visualiseur Canvas2D (4 tests : structure wrapper, responsive, état au repos). |
| **`CamelotCompatibility.test.js`** | `frontend/src/lib/components/` | Suite de tests unitaires du Gatekeeper (3 tests : absence de bouton global, alerte WARP HAZARD, seuil $\pm 15\%$). |
| **`CassetteDeck.test.js`** | `frontend/test/` | Suite de tests unitaires du lecteur de cassettes (7 tests : état vide, chargement, éjection, rotation des bobines, badges). |
| **`HeaderBar.test.js`** | `frontend/src/lib/components/` | Suite de tests unitaires de l'en-tête (2 tests : titre/indicateurs et commande `clean_cache`). |
| **`ID3TagCard.test.js`** | `frontend/src/lib/components/` | Suite de tests unitaires de la carte ID3 (7 tests : affichage des tags, fallback nom de fichier, bitrate, pochette HD). |

---

## 4. Règles de Gestion Métier

### 4.1 Règle d'Autorisation du Gatekeeper (Accord de Mixage)
1. **Seuil d'Autorisation** : Un score de consonance harmonique $\ge 60\%$ déverrouille le verdict **`GO — GATE UNLOCKED`** (voyant Émeraude), autorisant le transfert des pistes vers le Module 2 (Démixage IA).
2. **Interdiction de Mix** : Si le score est $< 60\%$, le Gatekeeper affiche **`NO-GO — INCOMPATIBLE`** (voyant Rouge), et le bouton de transfert reste verrouillé pour éviter les dissonances acoustiques.

### 4.2 Règle d'Éjection et Purge Mémoire (Exigence FR-009)
* Le clic sur le bouton `EJECT` d'un lecteur de cassette ou sur le bouton `🧹 QUITTER ET NETTOYER LE CACHE` réinitialise immédiatement le lecteur concerné à l'état vide `INSÉRER CASSETTE`.
* **Séquence de purge** :
  1. Annulation des tâches d'analyse en cours.
  2. Appel de `resetAudioEngine()` dans `audioEngine.js` (terminaison du Web Worker DSP, idempotent).
  3. Réinitialisation des objets `$state` (`file`, `title`, `artist`, `bpm`, `key`, `coverUrl`, `metadata`).
  4. Réinitialisation du champ `<input type="file">` pour autoriser la re-sélection du même fichier.
  5. Déclenchement de la commande Tauri `clean_cache` pour purger les fichiers temporaires du disque.

### 4.3 Règle de Tolérance du Time-Stretch & Alerte WARP HAZARD
* Le taux de *Time-Stretch* nécessaire pour aligner la Piste B sur la Piste A est calculé par la formule :
  $$\text{TimeStretch (\%)} = \left( \frac{\text{BPM}_{\text{Master}}}{\text{BPM}_{\text{Candidat}}} - 1 \right) \times 100$$
* **Seuil d'Alerte** : Si $|\text{TimeStretch}| > 15\%$, l'interface affiche l'alerte clignotante `⚠ WARP HAZARD (>15%)`.
* **Action Corrective** : Un bouton `÷2 TEMPO CIBLE` est proposé au DJ. Un clic divise le tempo cible par deux, ramenant l'extension temporelle dans une plage naturelle sans dégradation de la qualité sonore.

### 4.4 Règle de Bascule Majeur/Mineur Relatif
* Le bouton `⇄ RELATIF` inverse la lettre du code Camelot de la Piste B (`A ↔ B`) tout en conservant son numéro horaire (`1` à `12`).
* Exemple : Une piste détectée en `9B` (Sol Majeur) bascule en `9A` (Mi Mineur). Le score de consonance Gatekeeper est instantanément recalculé en fonction de cette nouvelle orientation harmonique.

---

## 5. Fonctionnement Détaillé du Moteur Audio (DSP)

Le moteur d'analyse DSP (`frontend/src/lib/audioEngine.js`) fonctionne en deux phases complémentaires : l'extraction du tempo et la détection de la tonalité.

### 5.1 Détection du Tempo (BPM) par Flux Spectral et Interpolation Parabolique
1. **Extraction de l'Enveloppe d'Attaque (Spectral Flux)** :
   Le signal audio est découpé en fenêtres de STFT (*Short-Time Fourier Transform*). La différence d'énergie positive entre deux trames spectrales successives calcule le flux spectral :
   $$SF(n) = \sum_{k} \max(0, |X(n, k)| - |X(n-1, k)|)$$
2. **Autocorrélation Temporelle** :
   L'autocorrélation du signal $SF(n)$ est évaluée sur une plage de décalages (*lags*) correspondant à des tempos compris entre 40 BPM et 200 BPM :
   $$R(\tau) = \sum_{n} SF(n) \cdot SF(n + \tau)$$
3. **Interpolation Parabolique du Pic (Précision au centième)** :
   Autour du pic maximal d'autocorrélation situé à l'indice $\tau_0$, un ajustement parabolique (*quadratic peak fitting*) affine l'estimation :
   $$\Delta = \frac{1}{2} \cdot \frac{R(\tau_0 - 1) - R(\tau_0 + 1)}{R(\tau_0 - 1) - 2 R(\tau_0) + R(\tau_0 + 1)}$$
   $$\tau_{\text{exact}} = \tau_0 + \Delta$$
   $$\text{BPM} = \frac{60 \times f_s}{\tau_{\text{exact}}}$$
   Le résultat est arrondi à 2 décimales.

4. **Correction d'Octave Anti-Half-Tempo** :
   Si le tempo détecté est $< 100\text{ BPM}$ et que le score d'autocorrélation à la demi-période ($\tau/2$) représente au moins 50 % du pic principal, le tempo est automatiquement doublé ($\text{BPM} \times 2$) pour éviter les sous-estimations de tempo sur la musique électronique rapide.

### 5.2 Détection de Tonalité (Clé Camelot) et Profils Chromatiques
1. **Filtrage Passe-Bas Biquad RBJ** :
   Afin d'isoler la ligne de basse fondamentale et d'éliminer les harmoniques aiguës perturbatrices, le signal passe par un filtre passe-bas numérique biquad de type Robert Bristow-Johnson (RBJ) réglé à une fréquence de coupure $f_c < 180\text{ Hz}$.
2. **Chromagramme FFT Haute Résolution ($N = 8192$)** :
   Une transformée de Fourier rapide sur 8192 points fournit une résolution spectrale de $\approx 5.4\text{ Hz}$, permettant de séparer distinctement les demi-tons dans le registre grave ($< 200\text{ Hz}$).
   Les énergies spectrales sont accumulées dans un vecteur de chromagramme à 12 classes de hauteurs (*Pitch Class Profile* : Do, Do#, Re, ..., Si).
3. **Surpondération des Octaves Graves** :
   Les composantes d'énergie situées dans les octaves graves (notes MIDI 36 à 47, soit 65 Hz à 130 Hz) reçoivent une surpondération de $\times 1.6$ pour renforcer la détection de la tonique fondamentale.
4. **Pondération Krumhansl-Schmuckler Ajustée sur la Tierce** :
   Le vecteur chromatique est corrélé aux 24 profils de tonalités majeures et mineures de Krumhansl-Schmuckler. Les coefficients des profils sont spécifiquement renforcés sur la tierce (majeure vs mineure) pour éviter toute confusion entre une tonalité majeure et sa relative mineure (ex. `11B` vs `8A`).
5. **Conversion Camelot** :
   La classe de hauteur possédant le coefficient de corrélation maximal est convertie vers son code Camelot équivalent (`1A` à `12B`).

### 5.3 Extraction du Bitrate
La fonction `detectBitrate(file, audioBuffer)` analyse l'en-tête binaire MPEG-1 Layer III des fichiers MP3 (recherche des trames binaires de débit $320\text{ kbps}$ ou de la balise VBR `Xing`/`Info`). En cas d'absence d'en-tête binaire, un fallback propre calcule le débit théorique d'après les canaux et la fréquence d'échantillonnage de l'AudioBuffer (ex. `"44.1 kHz / 16-bit / stéréo"`).

---

## 6. Fonctionnement Détaillé de la Roue de Camelot et de l'Harmonie

### 6.1 Structure Théorique de la Roue de Camelot
La Roue de Camelot est une représentation simplifiée du cercle des quintes. Elle organise les 24 tonalités musicales sur un cadran horaire gradué de `1` à `12` avec deux anneaux concentriques :
* **Anneau Extérieur (B)** : Tonalités Majeures.
* **Anneau Intérieur (A)** : Tonalités Mineures.

```
                  12B (Mi Maj / E)
            11B (La Maj)   1B (Si Maj)
        10B (Ré Maj)           2B (Fa# Maj)
       9B (Sol Maj)             3B (Ré# Maj)
        8B (Do Maj)            4B (La# Maj)
            7B (Fa Maj)    5B (Do# Maj)
                   6B (Sol# Maj)
```

### 6.2 Matrice de Consonance et Calcul du Score (`compatibilityBetween`)

Le score de consonance entre la clé de la Piste A ($\text{Key}_A$) et la clé de la Piste B ($\text{Key}_B$) est calculé selon les règles harmoniques strictes du tableau suivant :

| Relation Harmonique | Écart Horaire / Relation | Score (%) | Statut Gatekeeper |
| :--- | :--- | :---: | :---: |
| **Match Parfait** | Clés identiques (ex. `12B ➔ 12B`) | **100 %** | **GO — GATE UNLOCKED** |
| **Relative Majeur/Mineur** | Même numéro, lettre opposée (ex. `12B ↔ 12A`) | **95 %** | **GO — GATE UNLOCKED** |
| **Modulation Douce (Quinte)** | $\pm 1$ Heure, même lettre (ex. `12B ➔ 1B` ou `11B`) | **90 %** | **GO — GATE UNLOCKED** |
| **Energy Boost (+2h)** | $+2$ Heures, même lettre (ex. `12B ➔ 2B`) | **80 %** | **GO — GATE UNLOCKED** |
| **Sous-Dominante / Dominante** | $\pm 7$ Heures (ex. `12B ➔ 5B` ou `7B`) | **75 %** | **GO — GATE UNLOCKED** |
| **Incompatible / Dissonant** | Tout autre écart (ex. `12B ➔ 3B` ou `6A`) | **$< 60 \%$** | **NO-GO — INCOMPATIBLE** |

---

## 7. Fonctionnement Détaillé de l'Importation et Enrichissement iTunes

### 7.1 Chaîne Prioritaire de Résolution des Métadonnées
Au chargement d'un fichier audio dans la platine A ou B, l'application suit une séquence d'extraction de métadonnées stricte :

```
[1. Chargement Fichier Audio]
               │
               ▼
[2. Read ID3v2 Tags (readID3Tags)] ──(Champs complets)──► [Affichage Direct ID3TagCard]
               │
      (BPM ou Key manquant)
               │
               ▼
[3. Web Audio DSP Analysis (detectBPMKey)] ──(Champs détectés)──► [Mise à jour Réactive]
               │
     (Données indéterminées)
               │
               ▼
[4. Fenêtre Modale (MetadataModal)] ──(Validation DJ)──► [Mise à jour Réactive]
               │
               ▼
[5. Service d'Enrichissement distant (fetchOnlineMetadata)] ──(iTunes API)──► [Pochette HD 600x600]
               │
       (Mode Hors-Ligne)
               │
               ▼
[6. Fallback Nom de Fichier ("Artiste - Titre.mp3") + SVG Fallback Steampunk]
```

### 7.2 Service Réseau iTunes Search API (`metadataService.js`)
* **Requête HTTP Asynchrone** : Lorsque le Titre, l'Artiste, l'Album ou la Pochette manquent, `fetchOnlineMetadata(artist, title)` lance une requête GET non-bloquante vers l'API publique iTunes Search.
* **Extraction et Formatage de la Pochette HD 600×600** :
  L'API iTunes renvoie une URL de vignette $100\times 100\text{ px}$ (`artworkUrl100`). Le service applique une substitution par expression régulière pour obtenir la version haute définition $600\times 600\text{ px}$ :
  ```javascript
  const coverHD = result.artworkUrl100.replace(/\/100x100(bb|wa)\.jpg$/, '/600x600wa.jpg');
  ```
* **Résilience Hors-Ligne** : Si le réseau est indisponible, si la requête échoue ou si le tableau `results` est vide, le service intercepte l'erreur sans lever d'exception. `coverUrl` est réinitialisé à `null`, et le composant `ID3TagCard` affiche instantanément la pochette SVG Steampunk de secours (`data-testid="id3-cover-fallback"`). L'interface utilisateur reste fluide à 60 fps sans blocage.

---

## 8. Bilan de Validation et Conformité des Tests

L'intégralité du code source du projet AlcheMix Studio (Module 1) a été auditée et validée par la suite de tests automatisés Vitest.

* **Fichiers de tests validés** : **7 / 7 (100 % de réussite)**.
* **Assertions unitaires et d'intégration** : **51 / 51 tests au vert (100 % de réussite)**.
* **Démarrage à neutre** : L'application s'ouvre à vide sans aucune donnée pré-chargée (0 piste), les platines affichent `INSÉRER CASSETTE`, et le Gatekeeper reste en attente (`WAITING FOR TRACKS (0/2)`).

```
✓ src/lib/audioEngine.test.js (20 tests passed)
✓ src/lib/views/Module1View.test.js (8 tests passed)
✓ frontend/test/CassetteDeck.test.js (7 tests passed)
✓ src/lib/components/ID3TagCard.test.js (7 tests passed)
✓ src/lib/components/BeatgridOverlay.test.js (4 tests passed)
✓ src/lib/components/CamelotCompatibility.test.js (3 tests passed)
✓ src/lib/components/HeaderBar.test.js (2 tests passed)

Test Files  7 passed (7)
     Tests  51 passed (51)
```
