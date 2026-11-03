<!--
Sync Impact Report (temporary — remove before commit):
- Version change: template placeholders → 1.0.0 (initial adoption; no prior ratified version existed)
- Modified principles: none (initial fill of [PRINCIPLE_1..5] slots with 4 user-supplied principles; 5th slot removed per user input)
- Added sections: "Additional Constraints" and "Development Workflow" filled from project context
- Removed sections: none
- Deferred TODOs: none
-->

# AlcheMix Studio Constitution

## Core Principles

### I. Tests & Build (Règle absolue)
100 % des tests Vitest (`npm test`) doivent être au vert à chaque étape. Le build de
production (`npm run build`) doit compiler sans erreur. Aucun changement ne peut être
considéré comme terminé tant que ces deux contrôles n'ont pas été exécutés et observés au vert.

### II. Style & CSS
Pas de dépendances Tailwind CSS externes non installées. Utiliser exclusivement du CSS
Scoped Svelte avec la charte graphique Steampunk / Synthwave (ambre, cuivre, vert néon, cyan).
Toute couleur ou style doit s'appuyer sur les tokens existants plutôt que d'en introduire de nouveaux.

### III. Architecture Audio Non-Bloquante
Les calculs lourds (FFT, analyse tempo/key, et inférence ONNX/DirectML pour le démixage IA)
doivent s'exécuter dans des Web Workers dédiés pour garantir une interface fluide à 60 FPS.
Le thread principal ne doit jamais héberger de traitement audio bloquant.

### IV. Modularité & Fast-Track
Travailler par injections ciblées sans réécrire des fichiers complets en un seul bloc, afin
d'éviter les timeouts d'API. Chaque modification doit rester localisée, minimale et vérifiable
indépendamment.

## Additional Constraints

- Stack déclarée : Svelte 5 + TypeScript pour l'interface, Tauri 2 / Rust pour le shell desktop,
  C++20 / JUCE 8 pour le moteur audio natif, ONNX Runtime pour l'inférence IA.
- Thème UI : Venetian Steampunk Dark DAW (ardoise sombre, accents cuivre/laiton `#C87D55`,
  ambre `#FFB300`, vert néon `#00E676`, cyan `#29B6F6`).
- Aucune dépendance ne peut être ajoutée sans nécessité démontrée et sans vérification
  préalable des outils déjà configurés dans le dépôt.

## Development Workflow

- Compréhension → inspection → plan si nécessaire → tests → implémentation → vérification → documentation.
- Toute tâche modifiant le comportement ou l'architecture met à jour `specifications-Alchemix.md`.
- Les vérifications réellement exécutées doivent être rapportées telles quelles (réussi / échoué /
  non exécuté / bloqué) ; aucune tâche n'est présentée comme validée sans preuve observée.

## Governance

Cette constitution prime sur toutes les autres pratiques du projet. Toute modification doit être
documentée, datée et versionnée selon le versionnage sémantique :
- MAJOR : retrait ou redéfinition incompatible d'un principe ;
- MINOR : ajout d'un principe ou d'une section, ou extension substantielle ;
- PATCH : clarifications, corrections de formulation.
Toute revue de code ou PR doit vérifier la conformité à cette constitution.

**Version**: 1.0.0 | **Ratified**: 2026-11-01 | **Last Amended**: 2026-11-01
