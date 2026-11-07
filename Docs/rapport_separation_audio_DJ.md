# Rapport technique --- Séparation audio IA hors ligne en 4 stems

**Projet :** logiciel DJ\
**Cible fonctionnelle :** séparation locale, sans connexion Internet à
l'exécution, en quatre pistes\
**Stems attendus :** `Vocals`, `Drums`, `Bass`, `Other`\
**Environnement de référence :** Windows 10/11, Python, GPU NVIDIA CUDA\
**Date de vérification documentaire :** 5 novembre 2026

------------------------------------------------------------------------

## 1. Synthèse exécutive

Pour le logiciel DJ, il est pertinent de conserver trois moteurs de
séparation complémentaires, mais de ne pas les considérer comme
interchangeables :

  ---------------------------------------------------------------------------------------------------------------
  Modèle                                                Fonction               Sorties natives Rôle conseillé
  ----------------------------------------------------- ---------------- --------------------- ------------------
  **Demucs HTDemucs FT** (`htdemucs_ft`)                Séparation                     4 stems Moteur principal
                                                        générale                               de référence

  **MelBand RoFormer Kim**                              Extraction       Vocals + Instrumental Mode spécialisé «
  (`melband-roformer-kim-vocals`)                       vocale                                 améliorer/isoler
                                                                                               la voix »

  **BS-RoFormer MUSDB18HQ 4 stems**                     Séparation                     4 stems Moteur alternatif
  (`roformer-model-bs-roformer-musdb18hq-by-zfturbo`)   générale                               à comparer à
                                                                                               Demucs
  ---------------------------------------------------------------------------------------------------------------

### Recommandation

1.  Implémenter **HTDemucs FT** en premier : il répond directement au
    besoin des quatre stems.
2.  Ajouter **BS-RoFormer 4 stems** comme moteur alternatif pour mesurer
    la qualité réelle sur un corpus de morceaux DJ.
3.  Ajouter **MelBand RoFormer Kim** comme traitement vocal spécialisé,
    sans remplacer automatiquement les trois autres stems de Demucs ou
    de BS-RoFormer.

**Point essentiel :** le checkpoint Kim est un modèle voix/instrumental.
Il ne produit pas séparément drums, bass et other. Il ne constitue donc
pas à lui seul une solution 4 stems.

------------------------------------------------------------------------

## 2. Description des modèles

### 2.1 Demucs --- HTDemucs Fine-Tuned

-   Identifiant : `htdemucs_ft`
-   Famille : Hybrid Transformer Demucs.
-   Sorties : `drums`, `bass`, `other`, `vocals`.
-   Fonctionnement : ensemble de modèles spécialisés par source,
    regroupés sous le nom HTDemucs FT.
-   Qualité/temps : la version FT peut demander environ quatre fois plus
    de temps que `htdemucs` standard, avec un gain de qualité possible.
-   Format : fichiers WAV séparés, normalement à 44,1 kHz.

**Avantages** - Produit directement les quatre stems attendus. -
Référence solide pour établir le premier pipeline. - Écosystème Demucs
bien documenté.

**Limites** - Plus lent que la version standard. - Consommation GPU à
mesurer sur la carte réellement utilisée. - Le dépôt Facebook Research
d'origine est archivé depuis le 1er janvier 2025 : figer les versions et
les dépendances est important.

### 2.2 MelBand RoFormer Kim

-   Identifiant de registre : `melband-roformer-kim-vocals`.
-   Fichier de poids : `MelBandRoformer.ckpt`.
-   Taille annoncée : environ 913 Mo.
-   Sorties : voix et instrumental.
-   Le fichier de configuration est fourni par le package d'inférence.

**Avantages** - Modèle reconnu pour l'extraction vocale. - Package
d'inférence indépendant d'une interface graphique complète. -
Téléchargement vérifié par SHA-256 dans le package officiel d'inférence.

**Limites** - Pas de séparation native en quatre pistes. - Les poids
sont distribués séparément du code. - Les droits d'utilisation des poids
doivent être examinés séparément de la licence du code.

### 2.3 BS-RoFormer --- MUSDB18HQ 4 stems

-   Identifiant de registre :
    `roformer-model-bs-roformer-musdb18hq-by-zfturbo`.
-   Catégorie du registre : `four-stem`.
-   Sorties attendues : voix, batterie, basse et autres instruments.
-   Package d'inférence : `bs-roformer-infer`.

**Avantages** - Véritable checkpoint 4 stems. - Permet une comparaison
directe avec HTDemucs FT. - Le package gère le registre de modèles et la
vérification d'intégrité des poids.

**Limites** - Il s'agit d'un checkpoint communautaire : provenance et
licence des poids à contrôler. - Ne pas confondre avec le modèle
BS-RoFormer-SW par défaut, qui est un modèle 6 stems. - Le code du
package sous licence MIT ne donne pas automatiquement des droits
commerciaux sur les poids.

------------------------------------------------------------------------

## 3. Architecture technique conseillée

``` text
Logiciel DJ (Svelte / TypeScript)
          |
          | commandes Tauri
          v
Gestionnaire Rust
  - file de tâches
  - progression / annulation
  - chemins et journalisation
          |
          | processus local + messages JSONL
          v
Worker Python
  - préparation audio
  - sélection du modèle
  - contrôle CUDA / VRAM
  - inférence
  - post-traitement
          |
          +--> Demucs HTDemucs FT
          |
          +--> BS-RoFormer 4 stems
          |
          +--> MelBand RoFormer Kim (voix)
          |
          v
Gestionnaire des stems
  - WAV synchronisés
  - contrôle durée / canaux
  - manifeste JSON
  - intégration dans les decks DJ
```

### Principes d'implémentation

-   Exécuter les moteurs dans un processus Python distinct de
    l'interface.
-   Ne pas démarrer un serveur HTTP local si un échange IPC avec Tauri
    suffit.
-   Isoler les environnements Python si les dépendances PyTorch des
    moteurs deviennent incompatibles.
-   Charger un seul gros modèle à la fois sur le GPU.
-   Conserver les poids sur disque et réutiliser le cache.
-   Distinguer le téléchargement/installation des modèles de leur
    utilisation en production.
-   Interdire tout téléchargement implicite lors d'une session DJ hors
    ligne.

### Arborescence proposée

``` text
DJApp/
├── engine/
│   ├── python/
│   │   ├── worker.py
│   │   ├── audio_loader.py
│   │   ├── model_registry.py
│   │   ├── gpu_manager.py
│   │   └── stem_manager.py
│   └── environments/
│       ├── demucs/
│       ├── melband/
│       └── bs_roformer/
├── models/
│   ├── demucs/
│   ├── melband-roformer/
│   └── bs-roformer/
├── library/
│   └── tracks/
│       └── <track_id>/
│           ├── original.wav
│           ├── vocals.wav
│           ├── drums.wav
│           ├── bass.wav
│           ├── other.wav
│           └── manifest.json
└── logs/
    └── separation.log
```

------------------------------------------------------------------------

## 4. Préparer un environnement Windows

### 4.1 Prérequis

-   Windows 10 ou 11 64 bits.
-   Pilote NVIDIA récent compatible avec la version CUDA de PyTorch
    retenue.
-   Python 3.10 ou 3.11 recommandé pour commencer ; vérifier les
    versions officiellement supportées par chaque package au moment du
    gel de l'environnement.
-   Git installé.
-   Espace disque suffisant pour les environnements, les caches et les
    modèles.
-   Connexion Internet uniquement pendant la phase de préparation.

La RTX 3050 6 Go évoquée pour le projet doit être considérée comme une
contrainte de départ. La faisabilité dépend de la longueur des segments,
de la précision numérique, des versions PyTorch/CUDA et du modèle. Ne
pas garantir que les trois modèles tiendront simultanément en VRAM : ils
ne doivent pas être chargés simultanément.

### 4.2 Créer les dossiers

Dans PowerShell :

``` powershell
$Root = "C:\DJApp"
New-Item -ItemType Directory -Force -Path `
  "$Root\models\demucs", `
  "$Root\models\melband-roformer", `
  "$Root\models\bs-roformer", `
  "$Root\installers", `
  "$Root\tests" | Out-Null
```

### 4.3 Créer un environnement virtuel

Pour une première preuve de concept :

``` powershell
py -3.11 -m venv C:\DJApp\venv-audio
C:\DJApp\venv-audio\Scripts\Activate.ps1

python -m pip install --upgrade pip setuptools wheel
```

Installer ensuite une version de PyTorch compatible avec le pilote
NVIDIA installé. La commande exacte doit être choisie sur le sélecteur
officiel PyTorch, car elle dépend de la plateforme et de la variante
CUDA :

https://pytorch.org/get-started/locally/

Vérifier CUDA :

``` powershell
python -c "import torch; print('Torch:', torch.__version__); print('CUDA disponible:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"
```

Si `CUDA disponible` vaut `False`, ne pas poursuivre les benchmarks GPU
avant d'avoir corrigé l'installation PyTorch/pilote.

**Conseil :** pour un produit distribué, créer ensuite un environnement
figé par moteur (`requirements.txt` ou lockfile), plutôt que de laisser
les versions évoluer.

------------------------------------------------------------------------

## 5. Télécharger Demucs HTDemucs FT

### 5.1 Installer Demucs

Dans l'environnement virtuel :

``` powershell
python -m pip install demucs
```

Contrôler l'installation :

``` powershell
python -m demucs --help
```

### 5.2 Déclencher le téléchargement des poids HTDemucs FT

Le moyen simple et fiable consiste à demander à l'API Demucs de charger
le modèle. Le premier chargement récupère les poids nécessaires dans le
cache PyTorch.

``` powershell
python -c "from demucs import pretrained; model = pretrained.get_model('htdemucs_ft'); print('HTDemucs FT téléchargé et chargé')"
```

Le modèle FT est un ensemble de plusieurs modèles spécialisés. Prévoir
davantage d'espace disque que pour le modèle standard.

### 5.3 Repérer le cache

Demucs utilise le mécanisme de cache de PyTorch. Pour localiser le
répertoire utilisateur :

``` powershell
python -c "import torch; print(torch.hub.get_dir())"
```

Les poids sont généralement placés dans un sous-dossier `checkpoints` de
ce répertoire.

Pour un déploiement maîtrisé, conserver une copie des poids validés dans
le dossier de modèles de l'application, puis configurer et tester le
chemin utilisé par la version Demucs retenue. Ne pas déplacer les
fichiers sans vérifier que l'API les retrouve.

### 5.4 Tester la séparation

Placer un fichier de test dans `C:\DJApp\tests\demo.wav`, puis lancer :

``` powershell
python -m demucs -n htdemucs_ft --out C:\DJApp\tests\demucs-output --int24 C:\DJApp\tests\demo.wav
```

Résultat attendu : un dossier de morceau contenant notamment :

``` text
drums.wav
bass.wav
other.wav
vocals.wav
```

La commande de test sert aussi à vérifier que le cache est complet et
que le modèle peut réellement effectuer une inférence.

------------------------------------------------------------------------

## 6. Télécharger MelBand RoFormer Kim

Le package d'inférence maintenu par OpenMIRLab fournit un téléchargeur
dédié et un registre de modèles.

### 6.1 Installer le package

``` powershell
python -m pip install "melband-roformer-infer @ git+https://github.com/openmirlab/melband-roformer-infer.git"
```

Le dépôt indique que les nouvelles versions ne sont plus publiées sur
PyPI : utiliser la source GitHub indiquée plutôt qu'une ancienne version
PyPI.

### 6.2 Lister les modèles

``` powershell
melband-roformer-download --list-models
```

### 6.3 Télécharger le modèle Kim dans le répertoire du projet

``` powershell
melband-roformer-download --model melband-roformer-kim-vocals --output-dir C:\DJApp\models\melband-roformer
```

Le package peut également utiliser son cache par défaut. Pour le projet,
un répertoire explicite permet de maîtriser l'emplacement des poids.

### 6.4 Vérifier le fichier

Le checkpoint officiel Kim documenté est :

-   Fichier : `MelBandRoformer.ckpt`
-   Taille annoncée : 913 106 900 octets
-   SHA-256 :
    `87201f4d31afb5bc79993230fc49446918425574db48c01c405e44f365c7559e`

Pour vérifier le fichier téléchargé :

``` powershell
Get-ChildItem C:\DJApp\models\melband-roformer -Recurse -Filter *.ckpt |
  Get-FileHash -Algorithm SHA256
```

Comparer le résultat au hash attendu. Le package fournit également une
vérification SHA-256 lors de la résolution de ses assets.

### 6.5 Test d'inférence

Créer un dossier d'entrée et y placer un WAV :

``` powershell
New-Item -ItemType Directory -Force C:\DJApp\tests\melband-input | Out-Null
Copy-Item C:\DJApp\tests\demo.wav C:\DJApp\tests\melband-input\
```

Lancer :

``` powershell
melband-roformer-infer `
  --input_folder C:\DJApp\tests\melband-input `
  --store_dir C:\DJApp\tests\melband-output `
  --device cuda
```

Résultat attendu : une piste `vocals` et une piste `instrumental`. Ce
test valide le modèle vocal, pas une séparation 4 stems.

------------------------------------------------------------------------

## 7. Télécharger BS-RoFormer MUSDB18HQ 4 stems

### 7.1 Installer le package

``` powershell
python -m pip install "bs-roformer-infer @ git+https://github.com/openmirlab/bs-roformer-infer.git"
```

### 7.2 Identifier le bon checkpoint

Lister les modèles :

``` powershell
bs-roformer-download --list-models
```

Le modèle recherché est exactement :

``` text
roformer-model-bs-roformer-musdb18hq-by-zfturbo
```

Ne pas choisir par erreur :

``` text
roformer-model-bs-roformer-sw-by-jarredou
```

Ce dernier est un modèle 6 stems, pas le checkpoint MUSDB18HQ 4 stems
demandé.

### 7.3 Télécharger le checkpoint 4 stems

``` powershell
bs-roformer-download `
  --model roformer-model-bs-roformer-musdb18hq-by-zfturbo `
  --output-dir C:\DJApp\models\bs-roformer
```

Le téléchargeur du package s'appuie sur son registre de checkpoints et
ses métadonnées d'intégrité. Il faut conserver le dossier généré tel
quel, car il peut contenir le checkpoint et les fichiers de
configuration nécessaires.

### 7.4 Contrôler les fichiers

``` powershell
Get-ChildItem C:\DJApp\models\bs-roformer -Recurse |
  Select-Object FullName, Length
```

Conserver un inventaire des fichiers téléchargés et leurs empreintes :

``` powershell
Get-ChildItem C:\DJApp\models\bs-roformer -Recurse -File |
  Get-FileHash -Algorithm SHA256 |
  Export-Csv C:\DJApp\models\bs-roformer\sha256-manifest.csv -NoTypeInformation
```

Le hash ainsi généré constitue un inventaire local ; pour une
vérification d'authenticité, le comparer aux valeurs publiées par le
registre du package.

### 7.5 Test d'inférence

La commande de test doit sélectionner explicitement le checkpoint 4
stems. La syntaxe exacte des options d'inférence peut évoluer :
contrôler d'abord l'aide de la version installée.

``` powershell
bs-roformer-infer --help
```

Puis lancer l'inférence sur un dossier WAV en spécifiant le modèle si
l'option `--model` est proposée par la version installée. Le package
documente également l'API Python `BSRoformerSession` et la résolution
des assets par identifiant de registre.

Exemple de vérification de disponibilité des poids dans Python :

``` powershell
python -c "from bs_roformer import MODEL_REGISTRY; print([m.slug for m in MODEL_REGISTRY.list('four-stem')])"
```

Le test de séparation doit confirmer les quatre sources attendues. Ne
pas considérer la simple présence du checkpoint comme preuve que le
pipeline fonctionne.

------------------------------------------------------------------------

## 8. Procédure de préparation réellement hors ligne

Le mode hors ligne exige de séparer deux phases.

### Phase A --- Préparation connectée

1.  Installer Python, Git, les dépendances audio et PyTorch.
2.  Installer les packages Demucs, MelBand et BS-RoFormer.
3.  Télécharger les trois checkpoints.
4.  Exécuter au moins une inférence de test par moteur.
5.  Vérifier les fichiers et les empreintes SHA-256.
6.  Sauvegarder les environnements ou leurs fichiers de dépendances
    verrouillés.
7.  Copier les modèles dans le répertoire définitif de l'application.
8.  Enregistrer les versions et empreintes dans un manifeste.

### Phase B --- Exécution déconnectée

1.  Couper l'accès Internet.
2.  Démarrer le logiciel DJ.
3.  Vérifier que les trois modèles apparaissent comme disponibles.
4.  Exécuter une séparation test avec chaque moteur.
5.  Vérifier qu'aucun téléchargement ou accès réseau n'est tenté.
6.  Vérifier que les fichiers de sortie sont créés et lisibles.

**Important :** installer les packages Python ne suffit pas toujours à
garantir une installation hors ligne. Les dépendances transitives,
bibliothèques CUDA, FFmpeg éventuel et fichiers de configuration doivent
également être présents localement. Prévoir un dossier d'installation
reproductible ou un wheelhouse Python pour une installation sur une
machine sans Internet.

------------------------------------------------------------------------

## 9. Automatiser le téléchargement avec PowerShell

Le script suivant prépare les dossiers et télécharge les trois modèles
via leurs outils respectifs. Il suppose que les packages ont déjà été
installés dans l'environnement virtuel et que CUDA/PyTorch ont été
préparés.

Enregistrer sous `C:\DJApp\download-models.ps1` :

``` powershell
$ErrorActionPreference = "Stop"

$Root = "C:\DJApp"
$Python = "$Root\venv-audio\Scripts\python.exe"
$Scripts = "$Root\venv-audio\Scripts"

$ModelDirs = @(
    "$Root\models\demucs",
    "$Root\models\melband-roformer",
    "$Root\models\bs-roformer",
    "$Root\tests"
)

foreach ($Dir in $ModelDirs) {
    New-Item -ItemType Directory -Force -Path $Dir | Out-Null
}

if (!(Test-Path $Python)) {
    throw "Environnement Python introuvable : $Python"
}

Write-Host "1/3 - Téléchargement Demucs HTDemucs FT"
& $Python -c "from demucs import pretrained; model = pretrained.get_model('htdemucs_ft'); print('HTDemucs FT prêt')"
if ($LASTEXITCODE -ne 0) { throw "Échec du téléchargement Demucs" }

Write-Host "2/3 - Téléchargement MelBand RoFormer Kim"
& "$Scripts\melband-roformer-download.exe" `
    --model melband-roformer-kim-vocals `
    --output-dir "$Root\models\melband-roformer"
if ($LASTEXITCODE -ne 0) { throw "Échec du téléchargement MelBand RoFormer" }

Write-Host "3/3 - Téléchargement BS-RoFormer 4 stems"
& "$Scripts\bs-roformer-download.exe" `
    --model roformer-model-bs-roformer-musdb18hq-by-zfturbo `
    --output-dir "$Root\models\bs-roformer"
if ($LASTEXITCODE -ne 0) { throw "Échec du téléchargement BS-RoFormer" }

Write-Host "Téléchargement des trois modèles terminé."
Write-Host "Effectuer maintenant les tests d'inférence et les vérifications SHA-256."
```

Exécution :

``` powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
C:\DJApp\download-models.ps1
```

Si les exécutables `.exe` ne sont pas présents dans `Scripts`, utiliser
les commandes sans extension (`melband-roformer-download`,
`bs-roformer-download`) depuis le terminal où le venv est activé.

Le script ne valide pas la licence des poids et ne garantit pas que
chaque checkpoint tient dans les 6 Go de VRAM : ces contrôles restent
des étapes obligatoires.

------------------------------------------------------------------------

## 10. Gestion de la VRAM --- RTX 3050 6 Go

La carte de référence dispose de 6 Go de VRAM. Il faut donc concevoir le
moteur avec une stratégie prudente :

-   Un seul modèle chargé à la fois.
-   Libération explicite du modèle après traitement.
-   Aucun traitement parallèle de plusieurs morceaux sur le GPU au
    départ.
-   Tester d'abord des extraits courts, puis des morceaux complets.
-   Prévoir un mécanisme de réduction de segment ou de traitement par
    blocs si le moteur le permet.
-   Traiter séparément les problèmes de mémoire GPU et les problèmes de
    mémoire RAM.
-   Pour Demucs HTDemucs, réduire la longueur de segment en cas d'erreur
    CUDA out of memory ; la documentation indique une limite de segment
    pour le modèle Transformer.
-   Ne pas imposer FP16 à tous les moteurs sans vérifier le support
    effectif du modèle et du chemin d'inférence.

La mesure décisive sera un benchmark local : durée de traitement, VRAM
maximale, RAM maximale, temps de chargement, stabilité et qualité
audible.

------------------------------------------------------------------------

## 11. Contrôles qualité indispensables pour un logiciel DJ

Pour chaque séparation, vérifier :

1.  Les quatre fichiers attendus existent.
2.  Les fichiers sont stéréo.
3.  La fréquence d'échantillonnage est cohérente.
4.  Les quatre stems ont exactement le même nombre d'échantillons.
5.  Le début et la fin sont alignés sur le morceau source.
6.  Aucun fichier n'est vide ou tronqué.
7.  Les niveaux ne sont pas normalisés indépendamment sans décision
    explicite.
8.  La reconstruction des quatre stems est écoutée et mesurée.

### Reconstruction

Calculer un résidu :

``` text
residual = original - (vocals + drums + bass + other)
```

Le résidu ne sera pas nécessairement nul : les modèles peuvent
introduire des artefacts et ne garantissent pas une reconstruction
parfaite. Il constitue néanmoins un indicateur utile, à compléter par
une écoute.

### Format de sortie recommandé

-   WAV PCM 24 bits ou float32.
-   Stéréo.
-   44,1 kHz minimum pour un premier pipeline compatible avec les
    modèles étudiés.
-   Même durée, même origine temporelle et même nombre d'échantillons
    pour les quatre pistes.
-   Conserver le fichier source original.
-   Éviter une normalisation indépendante des stems, qui modifierait
    leur équilibre relatif au mix d'origine.

------------------------------------------------------------------------

## 12. Manifeste de modèle et de séparation

Créer un manifeste pour tracer chaque traitement :

``` json
{
  "track_id": "track_001",
  "engine": "demucs",
  "model": "htdemucs_ft",
  "model_version": "version_installee",
  "checkpoint_sha256": "empreinte_sha256",
  "engine_version": "version_installee",
  "sample_rate": 44100,
  "channels": 2,
  "output_format": "wav_pcm24",
  "stems": [
    "vocals",
    "drums",
    "bass",
    "other"
  ],
  "device": "cuda",
  "status": "completed"
}
```

Enregistrer également les paramètres d'inférence, la date, la durée de
traitement et les versions de Python, PyTorch et CUDA.

------------------------------------------------------------------------

## 13. Plan de validation

  -----------------------------------------------------------------------
  Étape                   Test                    Critère de validation
  ----------------------- ----------------------- -----------------------
  1                       Chargement HTDemucs FT  Modèle chargé sans
                                                  erreur

  2                       Séparation HTDemucs FT  Quatre WAV produits

  3                       Chargement MelBand Kim  Checkpoint résolu et
                                                  hash validé

  4                       Séparation MelBand Kim  Vocals + instrumental
                                                  produits

  5                       Chargement BS-RoFormer  Bon slug et checkpoint
                          4 stems                 disponibles

  6                       Séparation BS-RoFormer  Quatre stems produits

  7                       Mode avion / réseau     Aucune tentative de
                          coupé                   téléchargement

  8                       Import dans les decks   Quatre pistes
                          DJ                      synchronisées

  9                       Benchmark               Temps et VRAM
                                                  enregistrés

  10                      Écoute comparative      Modèle par défaut
                                                  sélectionné sur corpus
                                                  réel
  -----------------------------------------------------------------------

Tester au minimum plusieurs styles : musique électronique, pop, rock,
hip-hop, morceaux avec voix réverbérées, basses synthétiques et
batteries acoustiques.

------------------------------------------------------------------------

## 14. Licences et distribution

Ne pas confondre :

-   la licence du code du moteur ;
-   la licence du package d'inférence ;
-   la licence des poids pré-entraînés ;
-   les droits sur les morceaux audio traités.

Avant toute distribution commerciale du logiciel DJ :

1.  identifier le propriétaire et la licence de chaque checkpoint ;
2.  conserver la page de provenance et la date de téléchargement ;
3.  vérifier les conditions de redistribution des poids ;
4.  si les droits ne sont pas clairement accordés, ne pas intégrer les
    poids au programme d'installation commercial ;
5.  envisager de laisser l'utilisateur télécharger lui-même les poids
    depuis leur source autorisée.

Le dépôt Demucs d'origine est archivé. Pour une application maintenue
dans le temps, verrouiller les versions et prévoir une couche
d'abstraction permettant de remplacer un moteur.

------------------------------------------------------------------------

## 15. Conclusion et ordre de réalisation

**Ordre conseillé pour le développement :**

1.  **Demucs HTDemucs FT** : implémenter le premier pipeline 4 stems.
2.  **BS-RoFormer MUSDB18HQ 4 stems** : ajouter le second moteur et
    comparer objectivement les résultats.
3.  **MelBand RoFormer Kim** : ajouter un mode vocal spécialisé.
4.  Construire un benchmark reproductible sur les morceaux de test.
5.  Geler les versions et les empreintes des modèles.
6.  Tester l'ensemble en mode avion.
7.  Intégrer les stems dans les decks avec synchronisation stricte.

Le meilleur modèle ne doit pas être choisi sur sa réputation seule. Le
choix final doit reposer sur l'écoute comparative, les performances de
la RTX 3050 6 Go et la stabilité du pipeline sur les genres réellement
utilisés par le logiciel DJ.

------------------------------------------------------------------------

## 16. Sources officielles et documentation

-   Demucs --- dépôt et documentation :
    https://github.com/facebookresearch/demucs
-   MelBand RoFormer Inference --- dépôt :
    https://github.com/openmirlab/melband-roformer-infer
-   Checkpoint MelBand RoFormer Kim :
    https://huggingface.co/KimberleyJSN/melbandroformer
-   BS-RoFormer Inference --- dépôt :
    https://github.com/openmirlab/bs-roformer-infer
-   Modèles pré-entraînés ZFTurbo :
    https://github.com/ZFTurbo/Music-Source-Separation-Training/blob/main/docs/pretrained_models.md
-   PyTorch --- installation locale :
    https://pytorch.org/get-started/locally/

**Note de maintenance :** les registres et hébergements de checkpoints
communautaires peuvent évoluer ou disparaître. Revalider les URLs, les
hashes, les licences et les commandes avant chaque nouvelle version du
logiciel.
