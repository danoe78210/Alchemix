# AlcheMix Studio — Custom Agent Skills Reference (skills.md)
*Version optimisée pour Nemotron 3.5 / Claude Code Free — Alignée sur reco_skills.txt*

---

## 🏛️ PARTIE 1 : RÈGLES COMMUNES & PRINCIPES DIRECTEURS AGENTIQUES

### 1. Priorité Absolue des Spécifications
Le fichier `specifications-Alchemix.md` (à la racine du projet) fait autorité. Avant toute décision technique ou architecturale, tu dois vérifier l'état exact des modules et des conventions.

### 2. Autonomie et Procédure de Repli (Fallback)
Les compétences méthodologiques décrivent des procédures systématiques. Si des sous-agents, des extensions Git Worktrees ou des outils externes ne sont pas disponibles dans ton environnement d'exécution :
- Applique la procédure directement dans la session courante sans te bloquer.
- Ne prétends jamais avoir exécuté un sous-agent ou un outil externe qui n'a pas été utilisé.

### 3. Pragmatisme TDD (RED-GREEN-REFACTOR)
- Principe : Pour toute fonctionnalité non triviale, écris un test de validation avant l'implémentation finale.
- Gestion du code exploratoire : Ne détruis pas aveuglément du code fonctionnel écrit lors d'une phase d'exploration. Encadre-le simplement avec des tests appropriés avant la finalisation.
- Tests impossibles à automatiser : Si un test automatique est irréalisable (ex. rendu graphique WebGPU / Canvas2D sous environnement headless jsdom), documente la méthode de validation alternative (ex. build Vite vert, inspection visuelle, logs).

### 4. Classification des Métriques Techniques
Lors de l'évaluation du code audio et IA, distingue toujours :
1. Exigence Fonctionnelle : Doit être respectée et validée à 100% (ex. Gatekeeper NO_GO si score < 60%).
2. Objectif de Performance : Valeur cible à mesurer selon un protocole défini (ex. SDR > 11 dB, dé-bleed < -30 dB, précision 0,01 BPM).
3. Hypothèse Technique : À valider dans le code ou les spécifications avant d'en faire un choix d'architecture.

### 5. Clôture & Validation Graduée
Adapte la procédure de validation à l'ampleur de la tâche :
- Modification locale / Correctif : Exécution des tests ciblés du composant + npm run build rapide.
- Nouvelle Fonctionnalité : Tests unitaires + tests d'intégration + vérification de non-régression.
- Changement Majeur / Livraison : Suite complète de tests (npm test, cargo check), build de production, mise à jour de specifications-Alchemix.md et notification sonore TTS (succes.mp3).

---

## 🎛️ PARTIE 2 : SKILLS TECHNIQUES (MÉTIER ALCHEMIX STUDIO)

### Skill 1: module1-entry-analyzer
#### Objectif :
Implémenter et affiner le Module 1 (Analyseur d'Entrée & Gatekeeper de Décision Harmonique).

#### Procédure :
1. Extraction ID3 : Parser les en-têtes audio. Fallback sur le nom de fichier (Artiste - Titre.ext) si tags absents.
2. Détection BPM & Beatgrid : Flux spectral (objectif d'affichage : 0,01 BPM), grille 1/16 mesure.
3. Matrice Camelot & Gatekeeper : Mapping 1A-12B, score de consonance (0-100). Si score < 60% et pitch shift > ±3 demi-tons -> statut NO_GO.

### Skill 2: module2-stem-separation-onnx
#### Objectif :
Guider l'implémentation du Moteur de Démixage IA (ONNX Runtime C++ / DirectML / CoreML).

#### Procédure :
1. Assignation des Modèles : BS-RoFormer / Mel-Band RoFormer (Voix/Mélodie, SDR > 11 dB) et HTDemucs v4 (Batterie/Basse/DrumSep).
2. Chunking : Segments de 8,0s avec 87,5% de chevauchement et fenêtrage linéaire anti-clics.
3. Anti-Bleed : Soustraction spectrale (réduction de fuite < -30 dB).
4. Fallback : Maintenir la simulation Python/Svelte en l'absence des modèles ONNX compilés.

### Skill 3: ui-theme-venetian-steampunk
#### Objectif :
Garantir le respect de la charte visuelle Venetian Steampunk Dark DAW (Svelte 5 & WebGPU).

#### Palette :
Fond #121316, Cartes #1A1C22, Cuivre/Laiton #C87D55, LED Ambre #FFB300, LED Émeraude #00E676, LED Rouge #FF5252.

#### Shaders WebGPU :
Sub-bass (<250Hz: Ambre), Médiums/Voix (250Hz-4kHz: Émeraude), Aigus (>4kHz: Saphir).

### Skill 4: audio-dsp-juce8
#### Objectif :
Encadrer les traitements audio natifs C++20 / JUCE 8 en temps réel.

#### Contraintes Absolues :
ZERO allocation mémoire (new, malloc, resize) et ZERO blocage sur le thread audio (processBlock). Files lock-free (juce::AbstractFifo).

---

## 🛠️ PARTIE 3 : SKILLS MÉTHODOLOGIQUES (SUPERPOWERS ADAPTÉES)

### Skill 5: superpowers-brainstorming — Clarification du besoin selon l'ambiguïté et le risque.

### Skill 6: superpowers-writing-plans — Construction de plans d'exécution modulaires et vérifiables.

### Skill 7: superpowers-tdd-workflow — Approche RED-GREEN-REFACTOR pragmatique avec validation explicite.

### Skill 8: superpowers-systematic-debugging — Analyse de cause racine en 4 phases avec reproduction préalable exigée.

### Skill 9: superpowers-subagent-execution-review — Revue de code directe (conformité spec + sécurité temps réel/Svelte 5).

### Skill 10: superpowers-branch-finalization — Clôture graduée, mise à jour de specifications-Alchemix.md et signal sonore succes.mp3.
