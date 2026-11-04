# AlcheMix Studio — Module 1 Design System Specification

> **Project**: AlcheMix Studio — Module 1: Entry Analyzer & Harmonic Decision Gatekeeper  
> **Target Theme**: Steampunk Cyber-Vintage / Dark Industrial Audio Studio  
> **Layout Architecture**: Grille 12 colonnes : 3 / 6 / 3 à partir de `lg` (1024 px), empilée en dessous  
> **Version**: 1.5.0 (alignée sur l'UI réelle de Module 1 ; voir `specs/001-module1-audio-analysis/spec.md`)

---

## 1. Design Tokens & Color Palette

Les tokens sont définis dans deux fichiers : `frontend/src/app.css` (variables Tailwind `--color-*`, `--font-*`, `--text-*`) et `frontend/src/lib/styles/venetian-steampunk.css` (variables `--aw-*`). Les valeurs ci-dessous sont celles de `app.css`, sauf mention contraire.

### 1.1 Color Hierarchy
```json
{
  "backgrounds": {
    "canvas": "#101216",
    "app": "#121316",
    "panel": "#1A1C22",
    "panelHeader": "#14161C",
    "bezelGlass": "#0B0C0E"
  },
  "borders": {
    "copper": "#3A2218",
    "copperLight": "#E69D75"
  },
  "accents": {
    "amberMaster": "#FFB300",
    "amberGlow": "#FFC107",
    "emeraldCandidate": "#00E676",
    "emeraldGlow": "#69F0AE",
    "copperText": "#C87D55",
    "destructive": "#FF3D00",
    "hazard": "#FF9100"
  },
  "typography": {
    "main": "#E0E6ED",
    "muted": "#8A94A6"
  }
}
```

Les couleurs de fréquence des formes d'onde et de la roue suivent la charte du projet : sub-bass et kicks (< 250 Hz) en or `#FFB300`, médiums et voix (250 Hz – 4 kHz) en émeraude `#00E676`, aigus (> 4 kHz) en saphir `#29B6F6`.

### 1.2 Typography

| Rôle | Police | Source |
|---|---|---|
| Labels et affichages LED (`font-label-*`, `font-display-*`) | JetBrains Mono, puis Cascadia Mono, Consolas, Courier New, monospace | `app.css` |
| Titres (`font-headline-*`, `font-title-md`) | Space Grotesk, puis Segoe UI, system-ui | `app.css` |
| Corps de texte (`font-body-*`) | DM Sans, puis Segoe UI, system-ui | `app.css` |
| Pochette (`font-sleeve`) | Merriweather, puis Georgia | `app.css` |

Les tailles suivent les tokens `--text-*` de `app.css` (labels de 9 à 12 px, corps de 11 à 13 px, titres de 13 à 32 px).

### 1.3 Spacing

Gouttière et marge : `0.625rem` (10 px). Les espacements `space-xs` à `space-xl` vont de 0,25 rem à 1,25 rem.

---

## 2. Global Layout & Grid Specs

- **Header Height**: `h-14` (56 px), fixe.
- **Zone principale** : `grid grid-cols-12 gap-gutter p-gutter`, `flex-1 min-h-0 overflow-hidden`.
- **Colonnes** (classes `col-span-12 lg:col-span-3 | 6 | 3`) : gauche = Platine A, centre = analyse et roue Camelot, droite = Platine B. Sous `lg`, les colonnes sont empilées pleine largeur et défilent verticalement.

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ HEADERBAR (56px) : Logo | MODULE 1 · MODULE 2 · MODULE 3 · MODULE 4 | MK-IV | [QUITTER & NETTOYER LE CACHE] │
├─────────────────────────┬───────────────────────────────────────┬──────────────────────────┤
│ COLONNE GAUCHE (3/12)   │ COLONNE CENTRALE (6/12)               │ COLONNE DROITE (3/12)    │
│                         │                                       │                          │
│ CASSETTE DECK A         │ PANNEAU D'ANALYSE (LED A / B)         │ CASSETTE DECK B          │
│ ID3 METADATA ARCHIVE A  │ ROUE CAMELOT (+ sélecteur de notation)│ ID3 METADATA ARCHIVE B   │
│ TEMPO A (BPM, confiance)│ GATEKEEPER (consonance, GO / NO-GO)   │ TEMPO B (BPM, confiance) │
│ [DÉMIXER PISTE A]       │                                       │ [DÉMIXER PISTE B]        │
└─────────────────────────┴───────────────────────────────────────┴──────────────────────────┘
```

Le tout est dans `Module1View.svelte`. Le Gatekeeper est placé sous la roue, dans la colonne centrale (alchemix#16).

---

## 3. UI Component Specifications

### 3.1 HeaderBar Component (`HeaderBar.svelte`)
- **Navigation** : quatre entrées de module, `MODULE 1 : CADRAN CAMELOT` (active), `MODULE 2 : DÉMIXAGE IA`, `MODULE 3 : WARPING & MASHUP`, `MODULE 4 : MASTERING` (inactives, sans routage).
- **Badge** : `MK-IV` (fond `surface-container-highest`, texte copper).
- **Action** : `QUITTER & NETTOYER LE CACHE` : appelle la commande Tauri `clean_cache`, puis ferme la fenêtre.
- Il n'y a pas d'indicateur audio (fréquence, bit-depth, accélération GPU) dans l'en-tête.

### 3.2 CassetteDeck Component (Deck A & Deck B)
- **Visuels** : bobines de laiton animées, étiquette et pochette-cassette (`data-testid="cassette-sleeve"`), LED de statut (ambre = Deck A, émeraude = Deck B).
- **Commandes** : boutons LOAD / EJECT, PLAY / STOP par platine.
- **Chargement** : sélection de fichier par LOAD.

### 3.3 ID3TagCard Component (`ID3TagCard.svelte`)
- **En-tête** : `ID3 METADATA ARCHIVE — {deckLabel}`, badge de format et ligne de statut d'analyse.
- **Pochette** : cadre laiton de 144 px (`w-36 h-36`), image `object-cover`. En l'absence de pochette : repli `Pas de visuel`.
- **Champs** : grille de champs techniques définie par le snippet `spec` de `ID3TagCard.svelte`. Un champ absent s'affiche comme indisponible sans bloquer l'analyse.

### 3.4 TempoDisplay Component (`TempoDisplay.svelte`)
- **Props** : `confidence` (confiance du tempo), `keyConfidence` (confiance de la tonalité), `class`.
- **Métriques** :
  - Confiance du tempo : pourcentage et libellé (`ULTRA-PRECISION` à partir de 97 %, `HIGH-FIDELITY` à partir de 90 %), barre de progression, `—` si indéterminée.
  - Confiance de la tonalité (`key-confidence`).
  - Type de rythme : `ELECTRONIC (FIXED STEADY)` ou `LIVE DRUMS (VARIABLE)`, `—` sinon.
- Les valeurs proviennent du moteur DSP réel (`detectBPMKey`). Il n'y a pas de valeur simulée.

### 3.5 Harmonic Analysis Control Panel (`Module1View.svelte`)
- **Badge d'état** : `ANALYSE COMPLÈTE — SYNC LOCK` (émeraude, LED pulsante) une fois les deux pistes analysées.
- **Bouton** : `⚡ LANCER L'ANALYSE HARMONIQUE`, dégradé cuivre `#C87D55` → `#8C4A27`, bordure `#E69D75`, halo au survol.

### 3.6 CamelotWheel Component (`CamelotWheel.svelte`)
- **Dimensions** : conteneur carré `aspect-ratio: 1 / 1`, `max-width: 432px`.
- **Notation** : sélecteur `CODES` / `NOTES` / `DOUBLE` (`data-testid="notation-switch"`), `DOUBLE` par défaut.
- **Surlignage** :
  - Clé A (Master) : secteur ambre `#FFB300`.
  - Clé B (Candidate) : secteur émeraude `#00E676`.
  - Quand les deux clés sont identiques, le libellé `MATCH PARFAIT` s'affiche au centre.
- **État neutre** : sans clé chargée, seul le cercle vert tournant est affiché, sans surbrillance (alchemix#4).
- **Légende** : libellés des pistes A et B (`Piste A` / `Piste B` par défaut, nom du morceau une fois chargé).

### 3.7 BeatgridOverlay Component (`BeatgridOverlay.svelte`)
- **État** : le composant existe dans le dépôt mais n'est plus rendu par `Module1View` (alchemix#4). La grille 1/16 et la forme d'onde double ne font donc plus partie de l'interface de Module 1.
- Cette section doit être réécrite si le composant est réintégré.

### 3.8 CamelotCompatibility Component (Gatekeeper, `CamelotCompatibility.svelte`)
- **Score** : pourcentage de consonance (`CONSONANCE`).
- **Verdict** : `GO — GATE UNLOCKED` ou `NO-GO — GATE LOCKED`, seuil de 60 %.
- **Alerte** : `WARP HAZARD (±x %)` affichée au-delà de 15 % de time-stretch.
- **Action** : `÷2 TEMPO CIBLE (x BPM)`, qui divise le BPM cible par deux.
- Le bouton « ENVOYER VERS MODULE 2 » a été retiré de ce composant. Les actions d'envoi vers Module 2 se trouvent sur chaque platine (section 3.4, bouton `DÉMIXER PISTE A/B ➔ MODULE 2`), qui reste un placeholder tant que Module 2 n'est pas câblé (alchemix#2).

---

## 4. UI Library Export (CSS)

```css
/* Panneau de base steampunk */
.aw-panel {
  background: #1A1C22;
  border: 1px solid #3A2218;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

/* Bouton primaire steampunk */
.aw-btn-steampunk {
  background: linear-gradient(180deg, #C87D55 0%, #8C4A27 100%);
  border: 1px solid #E69D75;
  border-radius: 4px;
  color: #FFFFFF;
  font-weight: 700;
  text-transform: uppercase;
  box-shadow: 0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2);
}

.aw-btn-steampunk:hover {
  background: linear-gradient(180deg, #D98E66 0%, #9E5B35 100%);
  box-shadow: 0 0 12px rgba(200, 125, 85, 0.5);
}

/* Badges d'état */
.aw-badge-amber {
  background: rgba(255, 179, 0, 0.15);
  color: #FFB300;
  border: 1px solid rgba(255, 179, 0, 0.4);
}

.aw-badge-emerald {
  background: rgba(0, 230, 118, 0.15);
  color: #00E676;
  border: 1px solid rgba(0, 230, 118, 0.4);
}
```

Ces classes décrivent la bibliothèque de référence. Vérifier leur usage dans le code avant de les réutiliser : certaines ne sont peut-être pas appliquées à ce jour.

---

## 5. Limites connues

- Le rendu visuel de l'ensemble n'a pas été contrôlé dans un navigateur par l'agent (cartes #4, #16, #17 en `review`).
- Les tailles de police et d'espacement exactes sont celles des classes Tailwind du code ; ce document ne les reproduit pas toutes.
