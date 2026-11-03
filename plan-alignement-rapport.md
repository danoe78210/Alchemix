# Plan d'Alignement — Rapport Technique vs État Actuel
## AlcheMix Studio Module 1 — Conformité 2026-11-01

---

## 1. Résumé des Écarts Détectés

D'après le document `rapport-projet-alchemix.md`, l'état FINAL doit être :

| Élément | Spécification Attendue | État Actuel | Écart | Priorité |
|---|---|---|---|---|
| **Tests audioEngine.js** | 20 tests | 14 tests | **-6 tests** | 🔴 Critique |
| **Tests Module1View.js** | 8 tests (tous vert) | 0 tests (9 échouent) | **-8 tests** | 🔴 Critique |
| **Total Tests** | **51 tests** | **42 tests** | **-9 tests** | 🔴 Critique |
| **Fichiers de tests** | 7 fichiers (100% vert) | 6 vert + 1 partiel | 1 fichier | ⚠️ Important |

---

## 2. Fichiers de Tests — Inventaire Détaillé

### Selon le document (Lignes 69-75) :

```
✓ audioEngine.test.js              →  20 tests  ←  (Actuellement : 14)
✓ Module1View.test.js              →   8 tests  ←  (Actuellement : 0 vert, 9 échouent)
✓ CassetteDeck.test.js (test/)     →   7 tests  ✅ (VERT)
✓ ID3TagCard.test.js               →   7 tests  ✅ (VERT)
✓ BeatgridOverlay.test.js          →   4 tests  ✅ (VERT)
✓ CamelotCompatibility.test.js     →   3 tests  ✅ (VERT)
✓ HeaderBar.test.js                →   2 tests  ✅ (VERT)
────────────────────────────────────────────────
                           TOTAL : 51 tests     ←  (Actuellement : 42)
```

---

## 3. Tests Manquants — Analyse Détaillée

### 3.1 audioEngine.test.js (20 attendus | 14 actuels | **-6 manquants**)

**Tests actuellement présents (14)** :
- ✅ detectBPM : précision 2 décimales (3 tests)
- ✅ detectKey : passe-bas + Krumhansl-Schmuckler (4 tests)
- ✅ detectBitrate : MP3 header + VBR + fallback (4 tests)
- ✅ detectBPMKey + resetAudioEngine (3 tests)

**Tests MANQUANTS (6)** selon section 5.1-5.3 du document :
1. Anti-half-tempo correction (BPM > 100 doublement) — **Manquant**
2. Correction d'octave (BPM < 100, tempo doublé) — **Manquant**
3. Filtrage passe-bas biquad RBJ (< 180 Hz) — **Manquant**
4. Surpondération des octaves graves (MIDI 36-47, ×1.6) — **Manquant**
5. Pondération Krumhansl-Schmuckler sur la tierce — **Manquant**
6. Conversion Camelot complète (clés → codes 1A-12B) — **Manquant**

### 3.2 Module1View.test.js (8 attendus | 0 vert | **-8 manquants**)

**Spécification (Ligne 69)** :
> "Vue d'intégration principale du Module 1. ... 8 tests : chargement, déverrouillage, analyse, modale, bascule relative, éjection, enrichissement iTunes, mode hors-ligne"

**Tests actuellement** :
- ❌ 9 tests échouent (problèmes iTunes en jsdom)
- ❌ Aucun test ne passe en configuration actuelle

**Tests REQUIS (8 prioritaires)** :
1. ✅ Chargement piste audio (file upload)
2. ✅ Déverrouillage bouton analyse (2 pistes chargées)
3. ✅ Analyse BPM/Clé (détection DSP)
4. ✅ Affichage modale métadonnées manquantes
5. ✅ Bascule relative Majeur/Mineur (⇄ RELATIF)
6. ✅ Éjection piste (EJECT button)
7. ✅ Enrichissement iTunes (pochette HD)
8. ✅ Mode hors-ligne (fallback SVG + pas de blocage)

---

## 4. Plan de Corrections à Effectuer

### Phase 1 : audioEngine.test.js (+6 tests)

**Action** : Ajouter 6 tests manquants pour couvrir :

```javascript
test('Anti-half-tempo : BPM > 100 avec harmonique rapide → pas de doublement', () => {
  // Tester un signal à 150 BPM avec peak à 75 BPM et 150 BPM
  // Vérifier que 150 BPM est retenu (pas doublé)
});

test('Correction d\'octave : BPM < 100 avec harmonique rapide → doublement', () => {
  // Tester un signal à 70 BPM détecté mais harmonique à 140 BPM > 50%
  // Vérifier que BPM est doublé à 140 BPM
});

test('Filtrage passe-bas biquad RBJ < 180 Hz', () => {
  // Vérifier que le filtre RBJ est appliqué
  // Comparer chromagramme avant/après (fondamental renforcé)
});

test('Surpondération octaves graves (MIDI 36-47, ×1.6)', () => {
  // Test avec note grave (Do 2 = MIDI 36)
  // Vérifier coefficient ×1.6 appliqué
});

test('Pondération Krumhansl-Schmuckler sur la tierce', () => {
  // Teste discrimination Majeur/Mineur
  // Ex. : Do majeur (Do-Mi-Sol) vs Do mineur (Do-Mib-Sol)
});

test('Conversion Camelot complète (1A-12B)', () => {
  // Vérifier chaque note envoie vers code Camelot correct
  // Ex. : La → 8A, La# → 3B, Si → 12B
});
```

### Phase 2 : Module1View.test.js (+8 tests)

**Action** : Corriger tests existants pour passer en jsdom (sans iTunes) :

```javascript
test('Chargement piste audio + lecture ID3 locale', () => {
  // Mock : File avec tags ID3 intégrés
  // Vérifier : metadata.title, artist, bpm, key affichés
});

test('Déverrouillage bouton analyse (2 pistes chargées)', () => {
  // Charger 2 fichiers → button actif
  // Vérifier : isBothLoaded = true, bouton non-disabled
});

test('Analyse BPM/Clé par DSP (sans Web Audio en jsdom)', () => {
  // Mock : audioBuffer simulé (PCM Float32)
  // Vérifier : detectBPM() et detectKey() appelés
  // Affichage TempoDisplay + CamelotWheel mis à jour
});

test('Affichage modale si BPM/Clé manquant', () => {
  // Fichier sans tags ID3
  // Vérifier : showMetadataModal = true
  // Modal affichée avec champs BPM/Clé vides
});

test('Bascule relative (⇄ RELATIF)', () => {
  // Charger piste en 9B (Sol Majeur)
  // Clic ⇄ RELATIF → 9A (Mi Mineur)
  // Vérifier : gatekeeper recalculé (75%, GO)
});

test('Éjection piste (EJECT button)', () => {
  // Charger piste → état EJECT
  // Clic EJECT → état INSÉRER CASSETTE
  // Vérifier : file = null, metadata = {}
});

test('Enrichissement iTunes (mode connecté)', () => {
  // Mock : fetch → iTunes API response avec pochette HD
  // Vérifier : coverUrlA/coverUrlB mis à jour
  // coverUrl affiché en ID3TagCard
  // (Note: En jsdom, garder mock silencieux)
});

test('Mode hors-ligne (fetch échoue)', () => {
  // Mock : fetch → Error ou empty results
  // Vérifier : coverUrl = null, pas d'exception
  // Interface fluide sans blocage
  // Affichage fallback SVG Steampunk
});
```

---

## 5. Directives d'Implémentation

### Étape 1 : audioEngine.test.js

1. Ouvrir `frontend/src/lib/audioEngine.test.js`
2. Lire les implémentations actuelles de `detectBPM()`, `detectKey()`
3. Ajouter 6 nouveaux blocs `test()` couvrant les cas spécifiés
4. Relancer `npm test` → vérifier 20 tests au vert

### Étape 2 : Module1View.test.js

1. Ouvrir `frontend/src/lib/views/Module1View.test.js`
2. Vérifier les imports (mocks fetch, AudioContext, etc.)
3. Corriger/adapter les 9 tests existants en 8 tests jsdom-compatibles
4. Ajouter mocks cohérents (ID3, DSP simulé, iTunes silent fallback)
5. Relancer `npm test` → vérifier 8 tests au vert

### Étape 3 : Validation globale

```bash
npm test  # Doit afficher : Test Files 7 passed (7)
          #                Tests 51 passed (51)
```

---

## 6. Conformité Finale

Une fois toutes les corrections appliquées, le projet devra aligner **100 %** avec le rapport technique :

```
✅ 7 fichiers de tests validés
✅ 51 tests au vert (100 % réussite)
✅ Démarrage à neutre (0 piste chargée)
✅ Tous les comportements décrits en section 1-7 du rapport validés
```

---

## 7. Référence des Sections du Rapport Technique

Le document `rapport-projet-alchemix.md` contient les détails complets pour chaque correction :

- **Section 1.1** : Spécifications Module 1 (8 points clés)
- **Section 3** : Rôle détaillé de chaque fichier (tableaus)
- **Section 4** : Règles de gestion métier (4 règles importantes)
- **Section 5** : Fonctionnement DSP (formules mathématiques)
- **Section 6** : Roue de Camelot et matrice de consonance
- **Section 7** : Importation et enrichissement iTunes
- **Section 8** : Résultats de validation (51/51 tests)

