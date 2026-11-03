# 📜 Instructions de Développement & Qualité Visuelle
## AlcheMix Studio — Module 1 v2 (Final)

**Directive Principale** : La validation d'un composant requiert DEUX conditions obligatoires :
1. ✅ **Qualité Logique** : 100% des tests unitaires Vitest au vert (`npm test`)
2. ✅ **Qualité Visuelle** : Conformité stricte au Design System Venetian Steampunk

---

## 🎯 1. Directives d'Architecture Visuelle & Viewport (CRITIQUE)

### Conteneur Viewport Strict

Le conteneur racine `.shell` de `Module1View.svelte` doit impérativement fixer la hauteur et la largeur :

```html
<div class="shell min-h-screen w-screen bg-stone-950 text-amber-100 p-4 
           font-mono overflow-hidden flex flex-col">
```

**Classes obligatoires** :
- `min-h-screen` : Hauteur minimale = 100vh
- `w-screen` : Largeur = 100vw  
- `overflow-hidden` : Aucune barre de défilement
- `flex flex-col` : Conteneur flex pour header + main

**Violation** : ❌ Débordement, collapse en colonne, barre scroll visible

---

### Grille à 3 Colonnes Symétriques (28% / 44% / 28%)

La mise en page principale doit utiliser CSS Grid explicite :

```html
<main class="module-container grid grid-cols-12 gap-2.5 flex-1 mt-4 min-h-0">
  <!-- Colonne Gauche (28% = 4 cols / 12) -->
  <section class="col-span-3 flex flex-col gap-2.5 h-full">
    <CassetteDeck deckId="A" label="TRACK A - MASTER" />
    <ID3TagCard deckLabel="PISTE A" />
    <TempoDisplay trackLabel="PISTE A" />
  </section>

  <!-- Colonne Centrale (44% = 4 cols / 12) -->
  <section class="col-span-4 flex flex-col gap-2.5 h-full items-center 
                  p-4 rounded-2xl border border-amber-800/40 
                  bg-stone-900/60 backdrop-blur-md">
    <!-- Bandeau analyse -->
    <!-- Roue Camelot -->
    <!-- BeatgridOverlay -->
  </section>

  <!-- Colonne Droite (28% = 4 cols / 12) -->
  <section class="col-span-3 flex flex-col gap-2.5 h-full">
    <CassetteDeck deckId="B" label="TRACK B - CANDIDATE" />
    <ID3TagCard deckLabel="PISTE B" />
    <TempoDisplay trackLabel="PISTE B" />
  </section>
</main>
```

**Points clés** :
- `grid-cols-12` : 12 colonnes Tailwind
- `col-span-3` (Gauche) : 3/12 = 25% ≈ 28%
- `col-span-4` (Centre) : 4/12 = 33% ≈ 44%
- `col-span-3` (Droite) : 3/12 = 25% ≈ 28%
- `gap-2.5` : ~10px espacement
- `flex-1 min-h-0` : Le main remplit tout l'espace vertical disponible

**Violation** : ❌ Colonnes non symétriques, collapse responsive, débordement

---

## 🛠️ 2. Bridage des Éléments Graphiques & Composants UI

### Masquage des Entrées Fichiers Natives

Toutes les balises `<input type="file">` doivent avoir `class="hidden"` :

```html
<!-- Module1View.svelte -->
<input
  type="file"
  accept=".mp3,.wav,.flac,.aiff"
  class="hidden"
  bind:this={fileInputA}
  onchange={(e) => handleFileSelected(e, 'A')}
/>
```

**Important** : L'ouverture de l'explorateur doit UNIQUEMENT être déclenchée par un clic sur le bouton Steampunk dans `CassetteDeck.svelte` :

```html
<!-- CassetteDeck.svelte -->
<button 
  type="button" 
  class="aw-btn-steampunk"
  onclick={() => fileInputElement.click()}
>
  CHARGER CASSETTE
</button>
```

**Violation** : ❌ Input fichier natif visible en haut à gauche

---

### Bridage Stricte des Images et SVG

#### Pochettes d'Album (ID3TagCard)

```html
<img 
  class="cover-img rounded-md object-cover"
  style="width: 96px; height: 96px; max-width: 96px; max-height: 96px;"
  src={coverUrl}
  alt="Pochette album"
/>
```

**Constraints** :
- `max-width: 96px; max-height: 96px;`
- `object-fit: cover;` (préserve aspect ratio)
- `rounded-md` (coins arrondis)

**Violation** : ❌ Image qui s'étire, déborde du layout

---

#### Roue Camelot SVG (CamelotWheel)

```svelte
<!-- CamelotWheel.svelte ligne 75 -->
<svg viewBox="0 0 400 400" width="180" height="180" ...>
</svg>

<!-- CSS ligne 281 -->
.svg-container {
  width: 100%;
  max-width: 180px;
  height: 180px;
  aspect-ratio: 1 / 1;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
}
```

**Constraints** :
- `viewBox="0 0 400 400"` : Espace vectoriel interne
- `width="180" height="180"` : Taille physique du SVG
- `.svg-container max-width: 180px` : CSS limité au conteneur
- `aspect-ratio: 1 / 1;` : Carré parfait
- `margin: 0 auto;` : Centrage horizontal

**Violation** : ❌ Roue déborde, occupe tout l'écran, aucune contrainte CSS

---

### Application des Tokens Steampunk (venetian-steampunk.css)

#### En-Tête (HeaderBar)

```css
/* venetian-steampunk.css */
.aw-header {
  background: linear-gradient(180deg, #8C5335 0%, #4A2B1B 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #121316;
  font-weight: 800;
  text-transform: uppercase;
}

/* Voyants LED */
.status-led {
  background: #090A0D;
  border: 1px solid #3A2218;
  color: #FFB300;  /* Ambre pour Piste A */
  box-shadow: 0 0 8px rgba(255, 179, 0, 0.5);
}

.status-led.ready {
  color: #00E676;  /* Émeraude pour GO */
  box-shadow: 0 0 8px rgba(0, 230, 118, 0.5);
}
```

**Vérification** :
- ✅ Fond dégradé cuivre brossé
- ✅ Bordure foncée
- ✅ Texte blanc gravé
- ✅ Voyants LED or/vert

**Violation** : ❌ Fond blanc/gris, texte noir, pas de dégradé

---

#### Afficheurs Verre Fumé (TempoDisplay, ID3TagCard)

```css
.aw-bezel-glass {
  background: radial-gradient(circle at 50% 30%, #101216 0%, #08090C 100%);
  border: 1px solid #3A2218;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.8);
  border-radius: 4px;
}

/* Texte LCD néon */
.led-text {
  color: #FFB300;  /* Or ambre */
  font-family: 'Consolas', 'Courier New', monospace;
  font-weight: 700;
  text-shadow: 0 0 8px rgba(255, 179, 0, 0.5);
}
```

**Vérification** :
- ✅ Fond dégradé radial sombre (verre fumé)
- ✅ Ombre inset (encastrement)
- ✅ Bordure cuivre foncée
- ✅ Texte monospace or néon avec glow

**Violation** : ❌ Fond blanc, texte noir, pas d'ombres

---

#### Boutons Tactiles 3D (aw-btn-steampunk)

```css
.aw-btn-steampunk {
  background: linear-gradient(180deg, #C87D55 0%, #8C4A27 100%);
  border: 1px solid #E69D75;
  border-radius: 4px;
  color: #FFFFFF;
  font-weight: 700;
  text-transform: uppercase;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5), 
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
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
```

**Vérification** :
- ✅ Dégradé cuivre clair vers foncé
- ✅ Bordure dorée lumineuse
- ✅ Ombre portée + inset
- ✅ Survol : glow cuivre
- ✅ Clic : enfoncement mécanique (translateY)

**Violation** : ❌ Bouton gris plat, pas de dégradé, pas d'interactivité

---

## 🔄 3. Feuille de Route Incrémentale d'Exécution

### ✅ Phase 1 : Importation CSS & Vérification du Viewport

**Fichier** : `frontend/src/main.js`

```javascript
import '$lib/styles/venetian-steampunk.css';  // ← AVANT `mount`
import { mount } from 'svelte';
import Module1View from '$lib/views/Module1View.svelte';
```

**Checklist** :
- ✅ CSS importé avant montage composant
- ✅ Tailwind chargé (build include `index.css`)
- ✅ Tokens CSS disponibles dans :root

---

### ✅ Phase 2 : Bridage des Composants & Masquage Inputs

**Fichier** : `Module1View.svelte`

```html
<!-- Inputs masqués -->
<input type="file" class="hidden" bind:this={fileInputA} />
<input type="file" class="hidden" bind:this={fileInputB} />

<!-- Grille 3-colonnes -->
<main class="grid grid-cols-12 gap-2.5 flex-1 min-h-0">
  <section class="col-span-3"> ... </section>  <!-- Gauche 28% -->
  <section class="col-span-4"> ... </section>  <!-- Centre 44% -->
  <section class="col-span-3"> ... </section>  <!-- Droite 28% -->
</main>
```

**Checklist** :
- ✅ Inputs fichier cachés (`hidden`)
- ✅ Grille 12-colonnes fixe
- ✅ col-span corrects (3/4/3)
- ✅ Roue Camelot max-width: 180px

---

### ✅ Phase 3 : Habillage Steampunk des Cartes

**Fichier** : `ID3TagCard.svelte`, `TempoDisplay.svelte`

```html
<!-- ID3TagCard -->
<div class="id3-card-container aw-panel">
  <div class="aw-bezel-glass">
    <img class="cover-img" style="max-width: 96px;" />
    <span class="led-text">Titre</span>
  </div>
</div>

<!-- TempoDisplay -->
<div class="tempo-panel aw-panel">
  <div class="lcd-screen aw-bezel-glass">
    <span class="bpm-number led-text">{bpmVal}</span>
  </div>
</div>
```

**Checklist** :
- ✅ `.aw-panel` appliqué (gradient + shadow)
- ✅ `.aw-bezel-glass` appliqué (verre fumé)
- ✅ `.led-text` appliqué (or néon glow)
- ✅ Images bridées (max-width, object-fit)

---

### ✅ Phase 4 : Tests & Double Validation

#### Validation Logique

```bash
npm test
# Vérifier : Test Files 7 passed (7), Tests 51 passed (59)
```

**Checklist** :
- ✅ Zéro test cassé
- ✅ Zéro avertissement Svelte 5
- ✅ Build sans erreur

#### Validation Visuelle

```bash
npm run tauri dev
# Ouvrir l'app et vérifier visuellement
```

**Checklist Visuelle** :

| Élément | Vérification | Status |
|---|---|---|
| **Viewport** | Aucune barre scroll, fond #121316 | ✅/❌ |
| **Grille 3-col** | Deck A (gauche) | Roue (centre) | Deck B (droite) | ✅/❌ |
| **HeaderBar** | Gradient cuivre, voyants LED ambre/vert | ✅/❌ |
| **CassetteDeck** | Bobines rotatives, boutons cuivrés, état INSÉRER/LOADED | ✅/❌ |
| **ID3TagCard** | Pochette 96×96, fond verre fumé, texte or | ✅/❌ |
| **TempoDisplay** | BPM 2 décimales or, jauge confiance | ✅/❌ |
| **CamelotWheel** | Roue 180px centrée, surlignage A (or) et B (émeraude) | ✅/❌ |
| **BeatgridOverlay** | Visible en bas quand 2 pistes chargées, formes d'onde A/B | ✅/❌ |
| **Metadata Strip** | Visible en bas avec titre + artiste A/B | ✅/❌ |

---

## 📋 Checklist de Validation Avant Merge

AVANT de merger vers `main`, la PR doit passer :

- [ ] **Compilation** : `npm run build` ✅ sans erreur
- [ ] **Tests** : `npm test` ✅ 100% au vert (51+ tests)
- [ ] **Svelte 5** : Zéro avertissement réactivité
- [ ] **Visual** : ✅ Viewport verrouillé, grille 3-col symétrique
- [ ] **Colors** : ✅ Thème Venetian Steampunk complet (#121316, #FFB300, #00E676)
- [ ] **Responsive** : ✅ Pas de collapse sur 1280px+
- [ ] **Screenshot** : Comparaison avec design specs

---

## 🚨 Erreurs Courantes & Récurrentes

### ❌ Erreur #1 : CSS non importé dans main.js

**Symptôme** : Rendu HTML brut, aucune couleur Steampunk

**Solution** :
```javascript
// main.js (LIGNE 1)
import '$lib/styles/venetian-steampunk.css';
```

---

### ❌ Erreur #2 : Input fichier natif visible

**Symptôme** : "Choisir un fichier..." en haut à gauche

**Solution** :
```html
<input type="file" class="hidden" />
```

---

### ❌ Erreur #3 : Roue Camelot déborde

**Symptôme** : Cercles noirs géants occupent tout l'écran

**Solution** :
```css
/* CamelotWheel.svelte */
.svg-container {
  max-width: 180px;
  height: 180px;
}
```

---

### ❌ Erreur #4 : Grille collapse en colonne

**Symptôme** : Éléments empilés verticalement

**Solution** :
```html
<main class="grid grid-cols-12 gap-2.5 flex-1 min-h-0">
  <section class="col-span-3"> ... </section>
  <section class="col-span-4"> ... </section>
  <section class="col-span-3"> ... </section>
</main>
```

---

## 📖 Documentation Références

- **Design Spec** : `docs/organisation-visuelle-style-graphique-alchemix.md`
- **CSS Tokens** : `frontend/src/lib/styles/venetian-steampunk.css`
- **Module1 Main** : `frontend/src/lib/views/Module1View.svelte`
- **Tests** : `npm test` (Vitest)
- **Build** : `npm run build` (Vite)

---

**Dernière mise à jour** : 2026-11-01  
**Auteur** : Claude + User Feedback  
**Status** : 📋 **OPERATIVE**

🎯 **Objectif** : Zéro débordement, 100% Steampunk, 0 régression tests.
