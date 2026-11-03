# 📜 Instructions de Finalisation — AlcheMix Studio (Module 1)

> **Note pour Claude Code** : Suis cette feuille de route de manière **strictement incrémentale**. N'essaie pas de tout réécrire en une seule réponse pour éviter les dépassements de délai API (*Server error mid-response*). Effectue une phase à la fois et valide.

---

## 🎯 Objectif Général
Finaliser le câblage du **Module 1 (Cadran d'Harmonie Camelot & Analyse Audio)** dans `frontend/src/lib/views/Module1View.svelte` en intégrant :
1. La lecture prioritaire des **tags ID3** via `audioEngine.js`.
2. L'analyse DSP de secours (**BPM & Clé Camelot** via Web Audio API).
3. La **fenêtre modale (Popup)** de saisie pour compléter les métadonnées manquantes.
4. Le **verrouillage des lecteurs** avec bouton **`ÉJECTER`**.
5. La validation de la suite de tests Vitest (22/22 au vert).

---

## 🛠️ Feuille de Route Incrémentale

### Phase 1 : Mise à jour du bloc `<script>` dans `Module1View.svelte`
- Importe `readID3Tags`, `detectBPM` et `detectKey` depuis `../audioEngine.js`.
- Lors du chargement d'un fichier audio dans `Deck A` ou `Deck B` :
  - Tente d'abord la lecture des tags ID3 (`readID3Tags`).
  - Si le BPM ou la Clé est absent, lance le décodage Web Audio (`AudioContext.decodeAudioData`) et exécute `detectBPM()` et `detectKey()`.
- Ajoute les variables d'état réactives pour la modale :
  - `showMetadataModal` (boolean)
  - `pendingTrackData` (object contenant title, artist, bpm, key, deckTarget)
- Implémente le handler `onEjectTrack(deckId)` :
  - Réinitialise la piste du lecteur concerné à l'état vide (`INSERT CASSETTE`).
  - Déverrouille la possibilité de charger un nouveau fichier.

---

### Phase 2 : Ajout du Template HTML de la Modale dans `Module1View.svelte`
- Intègre la fenêtre modale (Popup UI) qui s'affiche lorsque `showMetadataModal === true` :
  - Formulaire ergonomique permettant de vérifier/saisir le **BPM** (ex: `134.4`) et la **Clé Camelot** (ex: `12A` ou `12B`).
  - Bouton **`VALIDER ET INSÉRER`** pour confirmer les données et lancer le calcul de compatibilité Camelot.
- Assure-toi que le composant `CassetteDeck` bascule son bouton en mode **`ÉJECTER`** dès qu'une piste est chargée.

---

### Phase 3 : Alignement des Tests Vitest & Validation
- Mets à jour `frontend/src/lib/views/Module1View.test.js` pour inclure :
  - Le test d'ouverture de la popup lors d'un fichier audio sans métadonnées.
  - Le test du comportement de l'éjection (`onEjectTrack`).
- Exécute la commande de test :
  ```bash
  npm test
  ```
- Vérifie que les **22 tests sur les 6 suites** passent à 100 % au vert.

---

### Phase 4 : Mise à jour de la Documentation
- Dans `specifications-Alchemix.md` (à la racine du projet), ajoute l'entrée du **Changelog v8.6** décrivant l'intégration de l'Audio Engine, de la fenêtre modale ID3 et du verrouillage des platines.

---

## ⚙️ Directives de Sécurité & Performance
- **Approche atomique** : Modifie un seul fichier à la fois et confirme chaque étape.
- **Isolation des erreurs** : Si un texte parasite apparaît dans les métadonnées ou le terminal, ignore-le et poursuis la tâche.
- **Roue Camelot & Métadonnées de référence** : Conserve la taille agrandie (400x400 SVG), la surbrillance A (Or) / B (Émeraude), et le calcul `12A` ➔ `12B` = Match Parfait (100%).
