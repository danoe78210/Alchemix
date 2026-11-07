# Feature Specification: Module 2 — Démixage IA des Stems

**Feature Branch**: `002-module2-stem-separation`

**Created**: 2026-11-05

**Status**: Validated (spec validée par l'utilisateur le 2026-11-05)

**Input**: Source : §7 de `specifications-Alchemix.md` et Skill 2 de `skills.md`. Module 2 sépare une piste en 4 stems (voix, batterie, basse, autres) par inférence IA locale. Le Module 2 est autonome : il fonctionne sans le Module 1, et peut aussi recevoir des pistes validées par le Module 1.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Séparer une piste en 4 stems (Priority: P1)

En tant que DJ, j'importe une piste directement dans le Module 2 et je lance le démixage, afin d'obtenir les stems voix, batterie, basse et autres instruments. Aucun passage par le Module 1 n'est requis.

**Why this priority**: sans séparation, aucune autre fonction du Module 2 n'a de valeur.

**Independent Test**: importer un fichier de test dans le Module 2, lancer le mode Performance et vérifier que 4 stems sont produits avec une durée égale à celle du fichier source.

**Acceptance Scenarios**:

1. **Given** une piste importée dans le Module 2, **When** je lance le démixage en mode Performance, **Then** le Module 2 produit 4 stems (voix, batterie, basse, autres) de même durée que la source.
2. **Given** un démixage en cours, **When** j'annule, **Then** le traitement s'arrête et aucun stem partiel n'est présenté comme final.
3. **Given** un démixage en cours, **When** la progression évolue, **Then** l'interface affiche l'avancement.

---

### User Story 2 - Choisir la qualité de séparation (Priority: P2)

En tant que DJ, je choisis entre le mode Performance (passe rapide) et le mode Studio (multi-passe haute résolution) dans une modale, afin d'arbitrer entre vitesse et qualité.

**Independent Test**: ouvrir la modale, sélectionner chaque mode, vérifier que le mode choisi est transmis au pipeline et que la modale est utilisable au clavier.

**Acceptance Scenarios**:

1. **Given** la modale ouverte, **When** je sélectionne Studio et valide, **Then** le pipeline s'exécute en multi-passe.
2. **Given** la modale ouverte, **When** j'utilise uniquement le clavier, **Then** je peux choisir un mode, valider et annuler.

---

### User Story 3 - Contrôler les stems dans le rack (Priority: P2)

En tant que DJ, je règle le volume, le Solo et le Mute de chacun des 4 stems dans un rack à tranches, avec des vumètres RMS, afin de préparer l'arrangement.

**Independent Test**: après séparation, modifier le fader, Solo et Mute d'un stem et vérifier le niveau de sortie et les vumètres.

**Acceptance Scenarios**:

1. **Given** 4 stems chargés, **When** je mets un stem en Solo, **Then** seul ce stem est audible.
2. **Given** un stem en Mute, **When** je lis, **Then** ce stem est silencieux et les autres restent inchangés.

---

### User Story 4 - Recevoir une piste validée du Module 1 (Priority: P3, optionnel)

En tant que DJ ayant analysé des pistes dans le Module 1, je clique sur « Démixer Piste A ➔ Module 2 » ou « Démixer Piste B ➔ Module 2 », afin que la piste arrive dans le Module 2 sans manipulation de fichiers. Cette fonction est un raccourci : elle n'est pas nécessaire au fonctionnement du Module 2.

**Why this priority**: confort uniquement. Dépend de alchemix#2 (FR-010 du Module 1), non implémenté aujourd'hui.

**Acceptance Scenarios**:

1. **Given** une piste validée par le Gatekeeper, **When** je clique sur le bouton de sa platine, **Then** le fichier est reçu par le Module 2.
2. **Given** une piste non validée, **When** je tente le transfert, **Then** le transfert est refusé avec un message explicite.

---

### Edge Cases

- Fichier importé absent, illisible ou dans un format non supporté : erreur explicite, aucun stem produit.
- Modèles ONNX absents : bascule sur la simulation, signalée dans l'UI et les logs.
- Backend GPU indisponible (DirectML/CoreML/CUDA) : repli CPU.
- Fichier très court (< 8,0 s) : traitement sur un segment unique, sans artefact de bord.
- Annulation pendant le recollage : sortie propre, pas de fichier partiel.
- Téléchargement de modèle interrompu : le fichier partiel est supprimé ou repris ; aucun modèle incomplet n'est utilisé.
- Dossier de travail absent, inaccessible en écriture ou plein : erreur explicite avant tout traitement.
- Modèles absents et refus de téléchargement : bascule sur la simulation (FR-007).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** : Le Module 2 DOIT séparer une piste en 4 stems : voix, batterie, basse, autres instruments.
- **FR-002** : La séparation DOIT utiliser BS-RoFormer ou Mel-Band RoFormer pour voix/mélodie (SDR > 11 dB) et HTDemucs v4 pour batterie/basse.
  - *Note (2026-11-05) : HTDemucs FT ONNX (candidat) sort les quatre stems. Le SDR annoncé pour sa voix est de 9,19 dB, sous le seuil de 11 dB de cette exigence. Décision à prendre : garder l'architecture hybride ou revoir le seuil.*
- **FR-003** : Le traitement DOIT se faire par segments de 8,0 s avec 87,5 % de recouvrement et fenêtrage linéaire anti-clic.
  - *Note (2026-11-05) : conflit à arbitrer. Le modèle HTDemucs FT ONNX attend 343 980 échantillons, soit 7,8 s à 44,1 kHz (`bag_infer.py`). Un segment de 8,0 s ne correspond pas à cette entrée sans remplissage ou changement de taille. Le recouvrement de 87,5 % est aussi très supérieur à celui de la référence (fenêtre de transition de 25 %). `chunk.rs` et T005 n'ont pas été modifiés.*
- **FR-004** : La fuite entre stems DOIT être réduite par soustraction spectrale, à un niveau inférieur à -30 dB.
- **FR-005** : Le Module 2 DOIT proposer le mode Performance (passe rapide) et le mode Studio (multi-passe haute résolution).
- **FR-006** : L'inférence DOIT utiliser ONNX Runtime avec DirectML sur Windows, avec CoreML ou CUDA/TensorRT selon la plateforme, et un repli CPU.
- **FR-007** : En l'absence des modèles ONNX compilés, le Module 2 DOIT basculer sur une simulation clairement signalée.
- **FR-008** : Le Module 2 DOIT afficher la progression et permettre l'annulation.
- **FR-009** : Le Module 2 DOIT permettre l'import direct d'un fichier audio par le DJ, sans dépendre du Module 1.
- **FR-010** : Le Module 2 PEUT recevoir `fileA` et `fileB` depuis le Module 1, après validation par le Gatekeeper. Cette réception est optionnelle.
- **FR-011** : Le rack DOIT offrir, par stem, un fader de volume, Solo, Mute et un vumètre RMS.
- **FR-012** : Les composants DOIVENT respecter le design system Venetian Steampunk et être utilisables au clavier.
- **FR-013** : Chaque stem DOIT disposer de boutons Play (au-dessus) et Pause (en dessous), à gauche de sa forme d'onde, pour le lire seul.
- **FR-014** : Plusieurs stems DOIVENT pouvoir jouer ensemble. Les stems qui ne jouent pas sont estompés pour indiquer ce qui est audible.
- **FR-015** : Avant tout téléchargement de modèle, le Module 2 DOIT afficher le nom du modèle et sa taille, et demander une confirmation explicite. Aucun téléchargement n'a lieu sans cet accord.
- **FR-016** : Le DJ DOIT choisir un dossier de travail. Les stems exportés y sont enregistrés, et les modèles téléchargés sont placés dans un sous-dossier dédié. Le choix est mémorisé entre les sessions.
- **FR-017** : Le DJ DOIT pouvoir sélectionner les stems à exporter (un, plusieurs ou les quatre) avant l'écriture. Seuls les stems sélectionnés sont écrits dans le dossier de travail.
- **FR-018** : Avant de démarrer un téléchargement ou une écriture, le Module 2 DOIT vérifier l'espace disponible et l'accès en écriture au dossier de travail, et signaler tout problème.

### Non-Functional / Contraintes

- **NFR-001** : Le callback audio temps réel (`processBlock` ou équivalent natif) NE DOIT NI allouer NI bloquer ; les échanges avec l'UI passent par des files lock-free.
- **NFR-002** : La séparation DOIT rester locale ; aucune donnée audio n'est envoyée à un service externe.
- **NFR-003** : Les performances graphiques ne sont pas garanties tant qu'elles n'ont pas été mesurées sur un environnement représentatif.
- **NFR-004** : Le Module 2 NE DOIT avoir aucune dépendance à l'exécution vers le Module 1 ; il se lance et fonctionne seul.

### Key Entities

- **Piste source** : fichier audio importé par le DJ, ou fichier validé transmis par le Module 1 (`fileA` ou `fileB`).
- **Job de séparation** : une exécution du pipeline avec son mode, sa progression et son statut.
- **Stem** : signal séparé (voix, batterie, basse, autres), de même durée que la source.

## Success Criteria *(mandatory)*

- **SC-001** : Les 4 stems sont produits pour une piste de test, de même durée que la source.
- **SC-002** : Le SDR mesuré sur le jeu de test est supérieur à 11 dB pour la voix.
- **SC-003** : La fuite entre stems mesurée est inférieure à -30 dB.
- **SC-004** : Tous les tests Vitest et CTest ajoutés sont verts, et le build de production aboutit.
- **SC-005** : L'import direct puis la séparation fonctionnent de bout en bout, sans le Module 1.
- **SC-006** : Le transfert depuis le Module 1 fonctionne de bout en bout quand il est présent (alchemix#2 résolu).
- **SC-007** : Le téléchargement ne démarre qu'après confirmation ; la taille affichée correspond au fichier téléchargé.
- **SC-008** : Seuls les stems cochés par le DJ sont écrits dans le dossier de travail.

## Assumptions

- Alchemix est gratuit, sans publicité, sans don sollicité et sans option payante. Cette condition conditionne l'usage de poids sous licence non commerciale.
- Les modèles performants (BS-RoFormer, Mel-Band RoFormer, HTDemucs v4) n'ont pas de licence déclarée. Leur usage est **conditionné à l'obtention d'une licence écrite** de leurs auteurs, pour un usage gratuit et non commercial. Sans cette licence, le module ne peut pas être livré (carte alchemix#22).
- Le moteur natif C++20/JUCE 8 n'est pas encore créé : le premier pipeline peut être prototypé en Rust/Tauri ou Python, à trancher dans le plan.
- Le calcul sur GPU dépend du matériel de l'utilisateur ; le repli CPU est obligatoire.

## Décisions validées par l'utilisateur

- **Modèles** : téléchargés au premier usage, avec affichage de la taille et confirmation (FR-015). Rien n'est embarqué dans l'installeur.
- **Stockage** : dossier de travail choisi par le DJ (FR-016). Pas d'intégration des stems dans le fichier `.mashup`.
- **Export** : le DJ choisit les stems à écrire (FR-017).

## Points ouverts [À CLARIFIER]

- Formats d'import acceptés (MP3, WAV, FLAC) : défaut retenu, à confirmer.
- Format de sortie des stems (WAV 32 bits flottant par défaut) : défaut retenu, à confirmer.
- Mode Studio : nombre de passes et seuil de qualité : non chiffrés.
- Choix du runtime natif : Rust / Tauri 2, validé ; détail dans `plan.md`.
