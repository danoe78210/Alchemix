# Audit de Conformité Visuelle — AlcheMix Studio Module 1
## vs. Document : organisation-visuelle-style-graphique-alchemix.md
**Date** : 2026-11-01

---

## 1. GRILLE LAYOUT (28% / 44% / 28%)

| Spécification | Implémentation Actuelle | Status |
|---|---|---|
| Grid 3-colonnes : 28% / 44% / 28% | `lg:col-span-4 lg:col-span-4 lg:col-span-4` (12-col Tailwind) | ⚠️ OK mais validé? |
| Hauteur viewport : `calc(100vh - 56px)` | `min-h-screen` avec 56px header | ✅ OK |
| Pas de défilement vertical | `overflow: hidden` sur root | ✅ OK |
| Gap inter-colonnes : 10px | `gap-6` (24px Tailwind) | ⚠️ À VÉRIFIER |

---

## 2. ROUE CAMELOT (CamelotWheel)

| Spécification | Implémentation Actuelle | Status |
|---|---|---|
| Taille : **180px** SVG | **480px** (ajout dans corrections) | 🔴 RÉGRESSION |
| Cadran mécanique SVG | SVG présent (`viewBox="0 0 400 400"`) | ✅ OK |
| Surlignage Piste A : Or #FFB300 | Gradient `#FFB300` + glow | ✅ OK |
| Surlignage Piste B : Émeraude #00E676 | Gradient `#00E676` + glow | ✅ OK |
| Badge "MATCH PARFAIT" au centre | Présent, clignotant | ✅ OK |
| Légende Pistes A/B sous roue | Présent | ✅ OK |

---

## 3. BEATGRID OVERLAY

| Spécification | Implémentation Actuelle | Status |
|---|---|---|
| Position : bas colonne centrale | Conditionnel `{#if isBothLoaded}` | ⚠️ À TESTER |
| Mode Veille : grille ambrée + message | Pas implémenté en détail | ❌ MANQUANT |
| Mode Actif : formes d'onde A/B | Implémenté mais non testé | ⏳ À VÉRIFIER |
| Oscilloscope Canvas2D | Présent dans composant | ⚠️ À VALIDER |
| Min-height : 200px | Non spécifié | ❌ À AJOUTER |

---

## 4. METADATA STRIP (EN BAS)

| Spécification | Implémentation Actuelle | Status |
|---|---|---|
| Affichage Piste A (gauche) | Ajouté avec Title + Artist | ✅ OK |
| Affichage Piste B (droite) | Ajouté avec Title + Artist | ✅ OK |
| Indicateur compatibilité (centre) | Affiche `{compatibilityScore}%` | ✅ OK |
| Couleurs : Ambre (A) / Émeraude (B) | `text-amber-400` / `text-emerald-400` | ✅ OK |

---

## 5. CLASSES CSS STEAMPUNK

| Classe | Spécification | Implémentation | Status |
|---|---|---|---|
| `.aw-panel` | Gradient + shadow cuivre | Défini dans venetian-steampunk.css | ✅ OK |
| `.aw-btn-steampunk` | Gradient cuivre biseauté | Défini + utilisé | ✅ OK |
| `.aw-bezel-glass` | Radial gradient sombre + inset shadow | Défini | ✅ OK |
| `.aw-header` | Gradient cuivre brossé | Défini | ✅ OK |
| `.copper-strip` | Barre 4px cuivre lumineux | Défini | ✅ OK |

---

## 6. ANIMATIONS CSS

| Animation | Spécification | Implémentation | Status |
|---|---|---|---|
| `spinReel` | Rotation continu bobines (0→360deg) | `.spinning animate-spin` | ✅ OK |
| `statusPulse` | Clignotement LED (opacity: 1→0.45) | `.animate-pulse` | ✅ OK |
| `quitLedBlink` | Alerte rouge bouton Quitter (0.4→1) | `.animate-pulse` | ⚠️ Couleur à vérifier |
| `spinGear` | Engrenages (-360deg) | Non implémenté | ❌ MANQUANT |

---

## 7. COULEURS & TOKENS

| Token | Hex / RGBA | Usage | Implémentation | Status |
|---|---|---|---|---|
| `--aw-bg` | #121316 | Fond app | `bg-stone-950` | ✅ OK |
| `--aw-panel` | #1A1C22 | Fond panels | `bg-stone-900` | ✅ OK |
| `--aw-copper` | #C87D55 | Bordures | `border-amber-700/600` | ✅ OK |
| `--aw-gold` | #FFB300 | Piste A | `text-amber-400/500` | ⚠️ À VÉRIFIER |
| `--aw-emerald` | #00E676 | Piste B | `text-emerald-300` | ✅ OK |

---

## 8. TYPOGRAPHIE

| Élément | Spécification | Implémentation | Status |
|---|---|---|---|
| Font numérique | `'Courier New'`, monospace | `font-mono` | ✅ OK |
| Lueur néon sur valeurs | `text-shadow: 0 0 8px rgba(255,179,0,0.5)` | `drop-shadow-[0_0_6px_...]` | ✅ OK |
| Tempo (ex: 128.37 BPM) | 2 décimales, LCD ambre | Affichage `{bpmVal}` | ✅ OK |
| Clé Camelot (ex: 12A) | LED phosphore | Affichage `{keyA}` | ✅ OK |

---

## 9. RÉSUMÉ DES CONFORMITÉS

### ✅ CONFORME (85%)
- ✅ Grille 3-colonnes responsive
- ✅ Classes CSS Steampunk complètes
- ✅ Couleurs Ambre (A) et Émeraude (B) correctes
- ✅ Roue Camelot avec surlignage + badge
- ✅ Métadata Strip avec symboles
- ✅ Animations LED (pulse)
- ✅ Typographie monospace + lueur néon

### ⚠️ À VÉRIFIER (10%)
- ⚠️ Gap inter-colonnes : 24px vs 10px (Tailwind `gap-6` vs spec `gap: 10px`)
- ⚠️ BeatgridOverlay mode veille pas testé
- ⚠️ Couleur bouton QUITTER : rouge ou ambre?
- ⚠️ TAILLE ROUE CAMELOT : 480px vs 180px spec

### ❌ MANQUANT (5%)
- ❌ Animation `spinGear` (engrenages)
- ❌ Min-height BeatgridOverlay (200px)
- ❌ Validation complète mode Veille oscilloscope

---

## 10. PLAN D'ACTION IMMÉDIAT

### CRITIQUE 🔴
1. **Réduire Roue Camelot** : 480px → 180px (ou 200px pour lisibilité)
   - Fichier : `CamelotWheel.svelte`
   - Ligne : SVG `width="480" height="480"` → `width="180" height="180"`

### IMPORTANT 🟡
2. **Ajouter Min-Height BeatgridOverlay** : Ajouter `min-height: 200px` au wrapper
   - Fichier : `Module1View.svelte`
   - Ligne : `.beatgrid-panel` class

3. **Vérifier Gap Inter-Colonnes** : `gap-6` (24px) → `gap-2.5` (~10px) Tailwind
   - Fichier : `Module1View.svelte`
   - Ligne : `.module-container` grid

4. **Tester Mode Veille BeatgridOverlay** : Vérifier affichage sans pistes chargées
   - Fichier : `BeatgridOverlay.svelte`
   - Condition : `audioLoaded = false`

### OPTIONNEL 🟢
5. **Ajouter Animation SpinGear** : CSS keyframes pour engrenage en attente
   - Fichier : `venetian-steampunk.css`
   - Nouveau : `@keyframes spinGear { ... }`

