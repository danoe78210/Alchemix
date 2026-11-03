# Direction Artistique, Système de Design et Architecture Visuelle d'AlcheMix Studio

## 1. Vision Artistique et Design System (Thème Cyber-Vintage Steampunk)

Le système de design d'AlcheMix Studio (Module 1) repose sur un paradigme esthétique unique qualifié de **Venetian Steampunk / Dark Industrial Audio DAW**. Cette direction artistique fusionne le charme mécanique de l'horlogerie cuivrée du XIXe siècle avec la rigueur numérique des stations de travail audio électroniques modernes.

L'environnement visuel s'appuie sur une hiérarchie de couleurs sombres et contrastées, conçue pour minimiser la fatigue visuelle lors de sessions prolongées de mixage en studio tout en offrant une lisibilité maximale pour les données de tempo (BPM) et de tonalité (Clés Camelot).

### 1.1 Hiérarchie Chromatique et Tokens de Design

Le nuancier officiel d'AlcheMix Studio s'articule autour de trois familles fondamentales : les fonds sombres effet "verre fumé / métal patiné", les bordures en laiton et cuivre biseauté, et les accents lumineux fluorescents (Ambre pour la Piste Master A, Émeraude pour la Piste Candidate B).

| Catégorie | Token CSS / Propriété | Valeur Hex / RGBA | Usage et Application dans l'Interface |
| :--- | :--- | :--- | :--- |
| **Arrière-plans** | `bg-app` | `#121316` | Fond de canevas général de l'application. |
| | `bg-panel` | `#1A1C22` | Fond des cartes et panneaux biseautés. |
| | `bg-panel-header` | `#14161C` | Bandeaux d'en-tête de modules. |
| | `bg-canvas` | `#101216` | Zone d'affichage des formes d'onde Canvas2D. |
| | `bg-bezel-glass` | `#0B0C0E` | Écrans LCD encastrés effet verre fumé. |
| **Bordures** | `border-copper` | `#3A2218` | Encadrement cuivré biseauté des panneaux. |
| | `border-copper-light` | `#E69D75` | Surbrillance métallique des boutons tactiles. |
| | `border-amber` | `rgba(255, 179, 0, 0.4)` | Contour réactif des composants Piste A. |
| | `border-emerald` | `rgba(0, 230, 118, 0.4)` | Contour réactif des composants Piste B. |
| **Accents Piste A** | `accent-amber-master` | `#FFB300` | Voyants, textes LCD et forme d'onde Piste A (Master). |
| | `accent-amber-glow` | `#FFC107` | Lueur d'activation et pics d'amplitude Piste A. |
| **Accents Piste B** | `accent-emerald-candidate` | `#00E676` | Voyants, textes LCD et forme d'onde Piste B (Candidate). |
| | `accent-emerald-glow` | `#69F0AE` | Lueur d'activation et pics d'amplitude Piste B. |
| **Typographie** | `text-main` | `#E0E6ED` | Valeurs de métadonnées principales. |
| | `text-muted` | `#8A94A6` | Libellés secondaires et étiquettes. |
| | `text-copper` | `#C87D55` | Titres majeurs et gravures Steampunk. |

### 1.2 Typographie et Lisibilité
La typographie associe une police sans-serif moderne pour la navigation générale à des polices monospace fixe (`'Courier New'`, `font-mono`) pour la restitution des données numériques. L'affichage des valeurs critiques (comme `128.37 BPM` ou `12A`) simule des affichages rétro-éclairés au néon avec ombres portées lumineuses (`text-shadow: 0 0 8px rgba(255, 179, 0, 0.5)`).

---

## 2. Architecture du Viewport et Layout en Grille 3 Colonnes

Pour offrir un contrôle direct sans défilement vertical, l'organisation spatiale du Module 1 est verrouillée dans les limites strictes de l'écran hôte (*single-viewport DAW*).

### 2.1 Spécifications de la Grille Globale
* **Hauteur du Viewport** : `height: calc(100vh - 56px)` avec `overflow: hidden`.
* **Barre d'en-tête** : `height: 56px` fixe en haut d'écran.
* **Disposition Principale** : Grille CSS à 3 colonnes strictly équilibrée (`grid-template-columns: 28% 44% 28%`) avec un espacement inter-colonnes (`gap`) de `10px` et une marge interne (`padding`) de `10px`.

### 2.2 Cartographie de la Disposition Symétrique

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ HEADERBAR (56px) : Logo AlcheMix | Indicateurs Audio (44.1 kHz / 24-bit / GPU) | [QUITTER & NETTOYER LE CACHE]         │
├──────────────────────────────┬──────────────────────────────────────────────────────────┬──────────────────────────────┤
│ COLONNE 1 : DECK A (28%)     │ COLONNE 2 : ANALYSE & HARMONIE (44%)                     │ COLONNE 3 : DECK B (28%)     │
│                              │                                                          │                              │
│ ┌──────────────────────────┐ │ ┌──────────────────────────────────────────────────────┐ │ ┌──────────────────────────┐ │
│ │ CASSETTE DECK A (MASTER) │ │ │ BANDEAU D'ANALYSE HARMONIQUE (Bandeau compact)       │ │ │ CASSETTE DECK B (CANDID.)│ │
│ └──────────────────────────┘ │ └──────────────────────────────────────────────────────┘ │ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │ ┌──────────────────────────────────────────────────────┐ │ ┌──────────────────────────┐ │
│ │ ID3 TAG INFO (Piste A)   │ │ │ ROUE CAMELOT (Cadran 180px + Légende Pistes A/B)      │ │ │ ID3 TAG INFO (Piste B)   │ │
│ └──────────────────────────┘ │ └──────────────────────────────────────────────────────┘ │ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │ ┌──────────────────────────────────────────────────────┐ │ ┌──────────────────────────┐ │
│ │ TEMPO DISPLAY (Piste A)  │ │ │ BEATGRID & OSCILLOSCOPE OVERLAY (Canvas2D)           │ │ │ TEMPO DISPLAY (Piste B)  │ │
│ └──────────────────────────┘ │ │ - Veille : Rayon oscilloscope & grille ambrée        │ │ └──────────────────────────┘ │
│                              │ │ - Actif : Formes d'onde A (Or) & B (Émeraude)          │ │ ┌──────────────────────────┐ │
│                              │ └──────────────────────────────────────────────────────┘ │ │ CAMELOT COMPATIBILITY    │ │
│                              │                                                          │ │ (Gatekeeper & Score)     │ │
│                              │                                                          │ └──────────────────────────┘ │
└──────────────────────────────┴──────────────────────────────────────────────────────────┴──────────────────────────────┘
```

---

## 3. Spécifications Anatomiques des Composants UI

Chaque composant d'AlcheMix Studio répond à des spécifications d'encapsulation et de contrat visuel strictes.

### 3.1 En-Tête Principal (HeaderBar)
Le composant `HeaderBar` surplombe l'interface sur une hauteur de 56px. Il intègre :
* **Identité Visuelle** : Le logo AlcheMix encastré dans un boîtier cuivré à gauche avec le titre gravé en or mat.
* **Badges Moniteurs Système** : Trois voyants LED vert émeraude affichant la fréquence d'échantillonnage (`44.1 kHz`), la résolution binaire (`24-bit`) et le statut du GPU (`DirectML Ready`).
* **CTA d'Urgence** : Un bouton biseauté cuivré `QUITTER & NETTOYER LE CACHE` (`data-testid="quit-clean"`) doté d'une LED rouge clignotante (`@keyframes quitLedBlink`).

### 3.2 Double Platine Cassette (CassetteDeck)
Présents au sommet des colonnes gauche (Deck A) et droite (Deck B), les lecteurs de cassettes simulent une mécanique vintage :
* **Mécanique Rotative** : Deux bobines en laiton perforé animées par une rotation CSS (`.spinning`) en phase d'analyse audio.
* **Signalétique d'État** :
  * À vide : Fenêtre sombre affichant `INSÉRER CASSETTE` avec voyant ambre clignotant.
  * Chargé : Bande néon affichant le nom du morceau et bouton basculant en mode `EJECT`.
* **Identification Visuelle** : Badge doré `DECK A - MASTER` à gauche et badge émeraude `DECK B - CANDIDATE` à droite.

### 3.3 Cartes de Métadonnées et Afficheurs LCD (ID3TagCard & TempoDisplay)
* **ID3TagCard** : Disposée sous chaque platine, elle présente une grille compacte 2x2 encastrée sous du verre fumé (`.aw-bezel-glass`), affichant le Titre, l'Artiste, l'Album, le Genre, l'Année, le Bitrate (`meta-bitrate`) et la Fréquence (`meta-sample-rate`). La pochette d'album HD (96x96px) est affichée sous `id3-cover`, avec bascule automatique vers un visuel SVG Steampunk de secours (`id3-cover-fallback`) en mode hors-ligne.
* **TempoDisplay** : Afficheur numérique reproduisant un écran LCD à rétro-éclairage ambré. Il affiche le tempo au centième près (ex: `123.40 BPM`), la barre de confiance du moteur DSP (0 à 100 %), la signature temporelle (ex: `128 BARS (1/16)`) et le badge de type de tempo (`ELECTRONIC (FIXED)` / `LIVE DRUMS (VAR)`).

### 3.4 Cadran d'Harmonie et Gatekeeper (CamelotWheel & CamelotCompatibility)
* **Roue de Camelot (CamelotWheel)** : Cadran vectoriel SVG de 180px simulant une horlogerie mécanique avec moyeu central biseauté (`#grad-hub`).
  * La clé de la Piste A est surlignée par un secteur doré fluorescent (`#FFB300`).
  * La clé de la Piste B est surlignée par un secteur vert émeraude (`#00E676`).
  * En cas d'équivalence absolue (`Key A === Key B`), un badge `MATCH PARFAIT` illumine le centre du cadran.
  * Une légende explicite située sous la roue identifie la Piste A (Or) et la Piste B (Émeraude).
* **Vumètre de Compatibilité (CamelotCompatibility)** : Situé au bas de la colonne droite, ce module calcule et affiche :
  * Le vumètre de consonance harmonique (score de 0 à 100 %).
  * Le badge de statut Gatekeeper (`🔓 GATE UNLOCKED` en émeraude ou `🔒 GATE LOCKED` en rouge).
  * L'alerte de Time Stretch `⚠ WARP HAZARD (>15%)` avec le bouton de correction rapide `÷2 tempo cible`.
  * Le libellé exact de la règle appliquée (`<span data-testid="rule-applied">`).

---

## 4. Moteur de Rendu Graphique et Oscilloscope (BeatgridOverlay)

Le composant `BeatgridOverlay` occupe le bas de la colonne centrale (`flex: 1`, `min-height: 200px`). Son rendu s'appuie sur l'API Web Audio et Canvas2D avec un système d'auto-redimensionnement dynamique piloté par `ResizeObserver`.

```
        +-----------------------------------------------------------------------+
        |  FORMES D'ONDES & BEATGRID                    [SIGNAL ACTIF A & B]    |
        +-----------------------------------------------------------------------+
        |  PISTE A (Master - Doré/Ambre #FFB300)                                |
        |  /\  /\/\  /\    /\/\/\  /\  /\/\  /\    /\/\/\  /\  /\/\  /\    /\/\ |
        | /  \/    \/  \  /      \/  \/    \/  \  /      \/  \/    \/  \  /     |
        |-----------------------------------------------------------------------|
        |  PISTE B (Candidate - Émeraude #00E676)                               |
        |   /\/\  /\  /\/\/\  /\  /\/\  /\    /\/\/\  /\  /\/\  /\    /\/\/\  / |
        |  /    \/  \/      \/  \/    \/  \  /      \/  \/    \/  \  /      \/  |
        +-----------------------------------------------------------------------+
        |  |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||  |
        |  M1       M2       M3       M4       M5       M6       M7       M8   |
        +-----------------------------------------------------------------------+
```

### 4.1 Comportement Bi-Mode de l'Oscilloscope
1. **Mode Veille (`audioLoaded = false`)** :
   * Fond en dégradé radial sombre (`#101216` à `#08090C`).
   * Grille spectrale ambrée très fine (`rgba(255, 179, 0, 0.08)`).
   * Ligne de balayage vert-phosphore d'oscilloscope traversant horizontalement le canevas.
   * Message rétro-éclairé centré : `ATTENTE SIGNAL AUDIO A & B — INSÉRER CASSETTES`.
2. **Mode Actif Post-Analyse (`audioLoaded = true`)** :
   * **Moitié Supérieure** : Forme d'onde de la Piste A (Remplissage Or `#FFB300`, pics lumineux `#FFD54F`).
   * **Moitié Inférieure** : Forme d'onde de la Piste B (Remplissage Émeraude `#00E676`, pics lumineux `#69F0AE`).
   * **Superposition Temporelle** : Grille verticale dorée au 1/16e de mesure avec marqueurs de mesures principaux (`M1`, `M2`, `M3`...).

---

## 5. Spécifications CSS, Classes Réutilisables et Micro-Animations

La cohérence visuelle d'AlcheMix Studio est assurée par un jeu de classes utilitaires composées et de règles d'animation CSS personnalisées.

### 5.1 Extrait des Classes Principales (Venetian-Steampunk CSS)

```css
/* Panneau de base Steampunk */
.aw-panel {
  background: #1A1C22;
  border: 1px solid #3A2218;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

/* Bouton tactile Steampunk biseauté */
.aw-btn-steampunk {
  background: linear-gradient(180deg, #C87D55 0%, #8C4A27 100%);
  border: 1px solid #E69D75;
  border-radius: 4px;
  color: #FFFFFF;
  font-weight: 700;
  text-transform: uppercase;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease-in-out;
}

.aw-btn-steampunk:hover:not(:disabled) {
  background: linear-gradient(180deg, #D98E66 0%, #9E5B35 100%);
  box-shadow: 0 0 12px rgba(200, 125, 85, 0.5);
}

.aw-btn-steampunk:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

/* Écran LCD encastré verre fumé */
.aw-bezel-glass {
  background: radial-gradient(circle at 50% 30%, #101216 0%, #08090C 100%);
  border: 1px solid #3A2218;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.8);
  border-radius: 4px;
}
```

### 5.2 Keyframes des Micro-Animations CSS

| Animation | Règle CSS Keyframe | Application dans l'Interface |
| :--- | :--- | :--- |
| **`spinReel`** | `0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }` | Rotation continue des bobines de laiton pendant l'analyse DSP. |
| **`statusPulse`** | `0%, 100% { opacity: 1; } 50% { opacity: 0.45; }` | Clignotement doux des voyants LED d'état système. |
| **`quitLedBlink`**| `0%, 100% { opacity: 0.4; } 50% { opacity: 1; }` | Clignotement d'alerte rouge du bouton Quitter & Nettoyer. |
| **`spinGear`** | `0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); }` | Engrenages mécaniques d'attente lors du traitement audio. |

---

## 6. Synthèse des Règles de Cohérence Graphique

En résumé, l'expérience visuelle d'AlcheMix Studio repose sur quatre règles fondamentales d'ergonomie :
1. **Verrouillage Strict du Viewport** : Aucune barre de défilement verticale ou horizontale n'est tolérée sur l'écran principal.
2. **Code Couleur Bipolaire Fixe** : L'Ambre (`#FFB300`) désigne exclusivement la Piste A (Master), tandis que l'Émeraude (`#00E676`) désigne exclusivement la Piste B (Candidate).
3. **Contraste Rétro-Éclairé** : Les valeurs numériques et textuelles critiques doivent systématiquement utiliser des effets de lueur néon (`text-shadow`) sur fond sombre encastré (`.aw-bezel-glass`).
4. **Symétrie Bilatérale** : Les colonnes gauche (Piste A) et droite (Piste B) conservent une largeur identique (28 %) et un chaînage de composants parfaitement miroir.
