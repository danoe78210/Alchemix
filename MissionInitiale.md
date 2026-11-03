MISSION INITIALE — AUDIT TECHNIQUE ET ORGANISATION DU PROJET

Tu interviens sur le projet en appliquant intégralement les instructions de ton rôle de Senior Software Engineer, Software Architect et Technical Project Manager.

Pour cette première mission, tu ne dois pas commencer par développer une nouvelle fonctionnalité.

Tu dois d'abord établir un état des lieux fiable du projet.

PHASE 1 — EXPLORATION DU DÉPÔT

Examine la structure du dépôt, les fichiers de configuration, les scripts, les composants, les services, les tests et la documentation.

Identifie notamment :

L'architecture Svelte 5 et l'utilisation effective des Runes.

Les configurations TypeScript et Vite.

L'organisation des tests Vitest.

Le moteur DSP et le Worker audio.

Le wrapper detectBPMKey().

Le moteur de compatibilité harmonique.

Les services de métadonnées.

Les composants Canvas2D et WebGPU.

Le backend Tauri et Rust.

Les composants C++ et JUCE.

Les mécanismes de persistance.

Les modules d'inférence IA.

Les mécanismes de nettoyage des ressources.

Ne suppose pas que tous ces composants sont présents ou opérationnels.

Distingue les éléments confirmés, partiellement implémentés, absents et impossibles à vérifier.

PHASE 2 — ÉTAT DES LIEUX TECHNIQUE

Produis une synthèse comprenant :

L'architecture réelle du projet.

Les principaux modules et leurs responsabilités.

Les dépendances entre modules.

Les points d'entrée de l'application.

Les mécanismes de communication entre frontend et backend.

Les mécanismes de gestion des ressources.

Les scripts disponibles.

Les tests existants.

Les points de fragilité identifiés.

Les écarts éventuels entre l'architecture documentée et l'architecture réelle.

Pour chaque constat important, indique les éléments du dépôt qui le justifient.

PHASE 3 — VALIDATION TECHNIQUE

Lorsque l'environnement le permet, vérifie :

L'installation et la cohérence des dépendances.

Le fonctionnement des tests.

Le typage TypeScript.

Le build frontend.

Les vérifications Rust disponibles.

Les tests natifs disponibles.

Les éventuelles erreurs ou limitations de l'environnement.

Ne modifie pas le code pour faire passer artificiellement les tests.

Ne supprime pas les tests qui échouent.

Ne masque pas les erreurs existantes.

Ne prétends pas avoir exécuté les vérifications auxquelles tu n'as pas accès.

PHASE 4 — CARTOGRAPHIE DES RISQUES

Classe les risques identifiés selon quatre catégories :

CRITIQUE : sécurité, corruption de données ou blocage majeur.

ÉLEVÉ : défaut susceptible de compromettre une fonctionnalité importante.

MODÉRÉ : fragilité ou limitation affectant la maintenabilité ou la fiabilité.

FAIBLE : amélioration secondaire.

Pour chaque risque, indique :

Le problème observé.

Les éléments qui le démontrent.

Son impact potentiel.

La correction recommandée.

Les dépendances éventuelles.

Le niveau de confiance du diagnostic.

Ne présente pas une hypothèse comme un défaut avéré.

PHASE 5 — CONSTRUCTION DU BACKLOG

Propose un backlog technique organisé par EPIC et tâches.

Pour chaque tâche, précise :

Un identifiant stable.

Un titre explicite.

L'objectif.

La priorité P0 à P3.

Les prérequis.

Les dépendances.

Les composants concernés.

Les critères d'acceptation.

Les tests nécessaires.

Les risques.

Une estimation indicative.

Le statut initial.

Sépare les corrections nécessaires des améliorations facultatives.

Évite de créer des tâches sans objectif concret ou sans résultat vérifiable.

PHASE 6 — PLAN D'ACTION

Propose un ordre de réalisation fondé sur :

La réduction des risques critiques.

Le rétablissement des vérifications essentielles si elles sont défaillantes.

La correction des défauts bloquants.

La stabilisation des interfaces entre modules.

L'amélioration de la couverture de tests.

Les évolutions fonctionnelles.

Les optimisations de performance justifiées.

Tiens compte des dépendances réelles : cet ordre n'est pas une séquence rigide.

Identifie les tâches qui peuvent être exécutées indépendamment.

PHASE 7 — LIVRABLE FINAL

Présente les résultats dans cet ordre :

Résumé exécutif.

Architecture réelle.

État des composants.

Résultats des vérifications.

Écarts et risques.

Backlog priorisé.

Plan d'action recommandé.

Première tâche à entreprendre.

À cette étape, ne modifie aucun fichier applicatif.

Tu peux consulter les fichiers et exécuter des vérifications non destructives.

Termine en indiquant clairement :

Ce qui est confirmé.

Ce qui reste incertain.

Les blocages éventuels.

La prochaine action recommandée.

Le succès de cette mission se mesure à la fiabilité de l'état des lieux et à la qualité du plan d'action, pas au nombre de fichiers examinés ni au volume du rapport produit.