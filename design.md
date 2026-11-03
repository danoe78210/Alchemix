# AlcheMix Studio — Module 1 Design System Specification

> **Project**: AlcheMix Studio — Module 1: Entry Analyzer & Harmonic Decision Gatekeeper  
> **Target Theme**: Steampunk Cyber-Vintage / Dark Industrial Audio Studio  
> **Layout Architecture**: 3-Column Equalized Viewport (28% / 44% / 28%)  
> **Version**: 1.4.0  

---

## 1. Design Tokens & Color Palette

### 1.1 Color Hierarchy
```json
{
  "backgrounds": {
    "app": "#121316",
    "panel": "#1A1C22",
    "panelHeader": "#14161C",
    "canvas": "#101216",
    "bezelGlass": "#0B0C0E"
  },
  "borders": {
    "copper": "#3A2218",
    "copperLight": "#E69D75",
    "amber": "rgba(255, 179, 0, 0.4)",
    "emerald": "rgba(0, 230, 118, 0.4)"
  },
  "accents": {
    "copperPrimary": "#C87D55",
    "copperDark": "#8C4A27",
    "amberMaster": "#FFB300",
    "amberGlow": "#FFC107",
    "emeraldCandidate": "#00E676",
    "emeraldGlow": "#69F0AE",
    "turquoiseHigh": "#00E5FF",
    "sapphireSub": "#29B6F6"
  },
  "typography": {
    "main": "#E0E6ED",
    "muted": "#8A94A6",
    "headerCopper": "#C87D55",
    "codeFont": "'Courier New', monospace"
  }
}
```

---

## 2. Global Layout & Grid Specs

- **Viewport Constraint**: `height: calc(100vh - 56px); width: 100vw; overflow: hidden;`
- **Header Height**: `56px`
- **Grid Layout**: `display: grid; grid-template-columns: 28% 44% 28%; gap: 10px; padding: 10px;`
- **Column Stretch**: `display: flex; flex-direction: column; gap: 10px; height: 100%;`

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ HEADERBAR (56px) : Logo ALCHEMIX STUDIO | Status Audio (44.1kHz / 24-bit / GPU) | [QUITTER & NETTOYER LE CACHE]        │
├──────────────────────────────┬──────────────────────────────────────────────────────────┬──────────────────────────────┤
│ COLONNE 1 : DECK A (28%)     │ COLONNE 2 : ANALYSE & WAVEFORM (44%)                     │ COLONNE 3 : DECK B (28%)     │
│                              │                                                          │                              │
│ ┌──────────────────────────┐ │ ┌──────────────────────────────────────────────────────┐ │ ┌──────────────────────────┐ │
│ │ CASSETTE DECK A (MASTER) │ │ │ CONTRÔLE D'ANALYSE (Bandeau 1 Ligne Compact)         │ │ │ CASSETTE DECK B (CANDID.)│ │
│ └──────────────────────────┘ │ └──────────────────────────────────────────────────────┘ │ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │ ┌──────────────────────────────────────────────────────┐ │ ┌──────────────────────────┐ │
│ │ ID3 TAG INFO (2 cols)    │ │ │ ROUE CAMELOT (Cadran 180px + Légende A/B)            │ │ │ ID3 TAG INFO (2 cols)    │ │
│ └──────────────────────────┘ │ └──────────────────────────────────────────────────────┘ │ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │ ┌──────────────────────────────────────────────────────┐ │ ┌──────────────────────────┐ │
│ │ BPM & BEATGRID DETECTION │ │ │ BEATGRID & WAVEFORM OVERLAY                          │ │ │ BPM & BEATGRID DETECTION │ │
│ │ (S'étire flex:1 jusqu'au │ │ │ - Veille : Oscilloscope Sécurisé + Grille Spectrale  │ │ └──────────────────────────┘ │
│ │ bas de la colonne)       │ │ │ - Post-Analyse : Dual Waveform (A:Or / B:Émeraude)   │ │ ┌──────────────────────────┐ │
│ └──────────────────────────┘ │ └──────────────────────────────────────────────────────┘ │ │ CAMELOT COMPATIBILITY    │ │
│                              │ (S'étire flex:1 sur tout le bas du centre)               │ │ (Verdict & Bouton Mod 2) │ │
│                              │                                                          │ └──────────────────────────┘ │
└──────────────────────────────┴──────────────────────────────────────────────────────────┴──────────────────────────────┘
```

---

## 3. UI Component Specifications

### 3.1 HeaderBar Component
- **Title**: `ALCHEMIX STUDIO — Module 1: Entry Analyzer`
- **Indicators**: `44.1 kHz | 24-Bit Float | GPU Accelerated (DirectML)`
- **Actions**: `[CLEAR CACHE & RESTART]` (Amber outlined button)

### 3.2 CassetteDeck Component (Deck A & Deck B)
- **Props**: `deckId: "A" | "B"`, `trackLabel: string`, `file: File | null`
- **Visuals**:
  - Dual brass reels with animated rotation state.
  - Tape progress bar & glowing status LED (`Amber` = Deck A, `Emerald` = Deck B).
  - Drag & Drop zone with file selector button.

### 3.3 ID3TagCard Component (Compact 2x2 Grid)
- **Props**: `metadata: Object`, `trackLabel: string`
- **Layout**:
  - Header: Track Title & Artist (Bold 12px copper).
  - Body (2x2 Grid): Album, Genre, Year, Bitrate / Sample Rate.
- **Height**: Reduced by 40% to prevent bottom black gaps.

### 3.4 TempoDisplay Component
- **Props**: `bpmData: Object`, `trackLabel: string`, `class: "stretch-bottom"`
- **Metrics**:
  - Large LED Digits: `118.50 BPM` (Deck A) vs `126.00 BPM` (Deck B).
  - Confidence Meter: `96.4%` progress bar.
  - Grid Type Badge: `FIXED_ELECTRONIC` / `VARIABLE_LIVE_DRUMS`.
  - Bar Count: `128 Bars detected`.

### 3.5 Harmonic Analysis Control Panel
- **Badge**: `○ PRÊT POUR CALCUL` (Amber) ➔ `● ANALYSE COMPLÈTE` (Emerald).
- **Primary CTA Button**: 
  - Text: `⚡ LANCER L'ANALYSE HARMONIQUE (CALCUL)`
  - Style: Copper Steampunk Gradient (`#C87D55` to `#8C4A27`), Gold Border (`#E69D75`), Glow on hover.

### 3.6 CamelotWheel Component (Harmonic Clockface)
- **Dimensions**: SVG Diameter `180px` max height.
- **Highlights**:
  - `Key A (Master)`: Glowing Amber sector (`#FFB300`).
  - `Key B (Candidate)`: Glowing Emerald sector (`#00E676`).
  - Dual Match Badge: `"MATCH PARFAIT"` when Key A === Key B.
- **Legend Box**:
  - `🟡 Piste A (Master): Key 8B — Don't Blame Me`
  - `🟢 Piste B (Candidate): Key 9A — I Just Don't Know`

### 3.7 BeatgridOverlay Component (Canvas2D Dual State)
- **Dimensions**: `flex: 1; min-height: 200px;` with `ResizeObserver` dynamic pixel sizing.
- **Idle State (`audioLoaded = false`)**:
  - Dark Radial Gradient background (`#14161C` to `#090A0D`).
  - Amber Spectral Grid lines (`rgba(255,179,0,0.08)`).
  - Sweeping oscilloscope beam with text: `"⚡ ATTENTE SIGNAL AUDIO A & B — INSERER CASSETTES"`.
- **Post-Analysis State (`audioLoaded = true`)**:
  - Top Half: Track A Waveform (Amber Fill `#FFB300`, Gold Peaks `#FFD54F`).
  - Bottom Half: Track B Waveform (Emerald Fill `#00E676`, Mint Peaks `#69F0AE`).
  - Overlay: 1/16th Beatgrid lines with bar markers (`M1`, `M2`, `M3`...).

### 3.8 CamelotCompatibility Component (Gatekeeper)
- **Props**: `compatibility: Object`, `class: "stretch-bottom"`
- **Elements**:
  - Score Gauge: `85% CONSONANCE` (Radial meter).
  - Transition Rule: `ENERGY_BOOST (+1 Wheel Step)`.
  - Processing Presets: `Pitch Shift: -1 Semi-tone | Time Stretch: +6.3%`.
  - Gatekeeper Status: `🔓 GATE UNLOCKED` (Emerald Glowing Badge).
  - Action Button: `[ENVOYER VERS MODULE 2: DÉMIXAGE IA]` (Full width bottom CTA).

---

## 4. UI Library Export (Tailwind / Pure CSS Classes)

```css
/* Steampunk Base Panel */
.aw-panel {
  background: #1A1C22;
  border: 1px solid #3A2218;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

/* Steampunk Primary Button */
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

/* Status Badges */
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
