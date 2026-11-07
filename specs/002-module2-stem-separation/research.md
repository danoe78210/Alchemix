# Research: Module 2 — Démixage IA des Stems

**Date** : 2026-11-05 | **Plan** : [plan.md](./plan.md) | **Spec** : [spec.md](./spec.md)

Ce document tranche les points techniques du plan et distingue ce qui est **vérifié** (source consultée) de ce qui reste **à vérifier** (carte alchemix#22 ou tests).

## 1. Runtime ONNX : crate `ort`

| Point | Valeur | Statut |
|---|---|---|
| Crate | `ort` (Rust, bindings ONNX Runtime) | Vérifié (docs.rs) |
| Version la plus récente | `2.0.0-rc.15`, encapsule ONNX Runtime 1.31 | Vérifié (docs.rs, 2026-11-05) |
| Version à épingler | `=2.0.0-rc.15` (version release candidate) | Décision |
| Feature DirectML | `directml` (mappe vers `ort-sys/directml`) | Vérifié |
| Feature CoreML | `coreml` (mappe vers `ort-sys/coreml`) | Vérifié |
| Feature CUDA | `cuda` (mappe vers `ort-sys/cuda`) | Vérifié |
| Feature TensorRT | `tensorrt` (mappe vers `ort-sys/tensorrt`) | Vérifié |
| Binaires ONNX Runtime | `download-binaries` activé par défaut | Vérifié |
| Licence du crate | Non vérifiée (page crates.io sans contenu exploitable) | À vérifier |

**Décision** : utiliser `ort` avec `download-binaries` par défaut, et activer `directml` sous Windows via une cible `cfg`. Le repli CPU ne demande aucune feature supplémentaire.

**Points à valider en phase 3** :
- Compatibilité des binaires DirectML avec Windows 11 et le GPU du DJ.
- Le fait que la version est une release candidate : tout changement d'API entre rc sera traité lors de la montée de version.
- Licence du crate et des binaires ONNX Runtime, à confirmer avant ajout dans `Cargo.toml`.

## 2. Décodage audio : `symphonia`

| Point | Valeur | Statut |
|---|---|---|
| Crate | `symphonia` (Rust, pur) | Vérifié (dépôt GitHub) |
| Licence | MPL-2.0 | Vérifié |
| Conteneurs WAV, OGG, MP4, MKV, AIFF, CAF | Oui | Vérifié |
| Codecs MP3, FLAC, AAC-LC, Vorbis, PCM, ALAC | Oui | Vérifié |
| Codecs Opus et WavPack | Listés, statut non précisé | À vérifier |

**Décision** : `symphonia` pour MP3, FLAC et WAV, qui couvrent les formats d'import (point ouvert de la spec). MPL-2.0 est compatible avec un usage applicatif, mais l'obligation de partager les modifications des fichiers couverts s'applique : à noter dans le README.

## 3. Écriture WAV : `hound`

| Point | Valeur | Statut |
|---|---|---|
| Crate | `hound` (Rust, WAV) | À vérifier (non consulté) |
| Usage | Écriture de WAV PCM 16/24 bits et float 32 bits | À vérifier |

**Décision provisoire** : `hound` pour l'écriture WAV float 32 bits, format le plus sûr pour des stems sans perte. Licence et support float à confirmer avant ajout.

## 4. Modèles de séparation

| Modèle | Rôle | Code | Poids pré-entraînés | Statut |
|---|---|---|---|---|
| HTDemucs v4 | Batterie, basse | Licence MIT (dépôt `facebookresearch/demucs`) | Licence des poids non précisée dans le dépôt | Code vérifié ; poids à vérifier |
| BS-RoFormer | Voix, mélodie | Dépôt de référence `lucidrains` (licence non vérifiée) | Poids communautaires, licence variable par checkpoint | À vérifier |
| Mel-Band RoFormer | Voix, mélodie (alternative) | Idem, via `ZFTurbo/Music-Source-Separation-Training` (licence MIT annoncée) | Liste de poids à consulter | À vérifier |

**Vérification des licences (2026-11-05, sources consultées)** :
- **HTDemucs v4** : le dépôt `facebookresearch/demucs` est sous MIT. La page ne précise aucune licence pour les poids `htdemucs`, `htdemucs_ft` ou `htdemucs_6s`. Le MIT du code ne couvre pas les poids sans mention explicite.
- **BS-RoFormer et Mel-Band RoFormer** : le dépôt `ZFTurbo/Music-Source-Separation-Training` ne mentionne aucune licence pour les modèles pré-entraînés. Les entrées vocales listées (BS RoFormer viperx, MelBand RoFormer viperx, MelBand RoFormer KimberleyJensen) n'ont **aucune licence déclarée**. Le dépôt `lucidrains/BS-RoFormer` est sous MIT ; le code ne couvre pas les poids entraînés par d'autres auteurs.
- **Conséquence** : sans licence déclarée, les droits d'utilisation et de redistribution des poids ne sont pas établis. Le téléchargement par l'application (option A) reste une copie de poids dont l'usage n'est pas autorisé explicitement. **Ce point est bloquant pour le Module 2 tel qu'il est spécifié**, et ne peut pas être levé par une affirmation.

**Recherche de checkpoints à licence explicite (2026-11-05)** :
- **Open-Unmix `umx` / `umxhq`** : code MIT. Licence des poids non déclarée. SDR voix médian (SiSEC 2018) : 6,32 (umx), 6,25 (umxhq).
- **Open-Unmix `umxl`** : poids sous **CC BY-NC-SA 4.0**, usage non commercial uniquement, partage à l'identique. SDR voix : 7,21. Incompatible avec un usage commercial.
- **Spleeter (Deezer)** : code MIT. Licence des poids non déclarée. Aucune performance chiffrée sur la page.
- **Modèles ZFTurbo / MVSep (BS-RoFormer, Mel-Band, HTDemucs4 FT)** : aucune licence déclarée. SDR voix entre 9,67 et 11,00 ; batterie et basse HTDemucs4 FT entre 11,13 et 11,96.
- **Résultat** : aucun checkpoint à licence permissive explicite trouvé à ce stade. Le seul avec licence déclarée (`umxl`) est non commercial et sous ShareAlike. Les checkpoints réellement performants n'ont pas de licence déclarée.
- **Écart avec la spec** : le critère SC-002 (SDR voix > 11 dB) n'est atteint par aucun checkpoint à licence explicite. Le meilleur à licence explicite (`umxl`) est à 7,21 dB.

**Dépôts analysés comme sources d'alternatives (2026-11-05)** :
- **nomadkaraoke/python-audio-separator** : code sous licence MIT. Télécharge les poids depuis les versions de UVR, Demucs et autres. Aucune licence déclarée pour les poids.
- **Anjok07/ultimatevocalremovergui (UVR)** : code sous licence MIT, avec demande de crédit à UVR. Les poids sont "primarily from UVR", **sans licence déclarée**. La mention « free for anyone to use and modify as they wish » n'est pas une licence accordée sur les poids.
- **facebookresearch/demucs** : code sous MIT. Aucune licence déclarée pour les poids `htdemucs`, `htdemucs_ft`, `htdemucs_6s`, `hdemucs_mmi`.
- **Conclusion** : ces dépôts ne résolvent pas le problème de licence. Ce sont les mêmes poids, distribués par d'autres canaux. Leur code MIT peut être réutilisé avec attribution, mais pas les poids.
- **Valeur comme référence** : ils recensent les modèles et des SDR auto-déclarés. Par exemple UVR annonce 12,9 dB pour la voix avec BS-RoFormer, et 10,8 / 10,1 / 11,9 dB pour HTDemucs FT (voix / batterie / basse). Ces chiffres ne sont pas mesurés chez nous, et ils ne sont pas comparables directement au SDR de la page Demucs (9,0 dB en moyenne, autre jeu d'évaluation).

**openmirlab/melband-roformer-infer** (2026-11-05) : code MIT, poids non fournis et téléchargés à l'exécution (vérifiés par sha256). Le modèle par défaut (`MelBandRoformer.ckpt`, Kimberley Jensen) n'a pas de licence déclarée. Le registre inclut des comptes personnels et des liens morts. Pas de métrique SDR. Stems : voix et instrumental seulement. PyTorch uniquement, CPU et CUDA, sans ONNX ni DirectML. Ne couvre ni batterie ni basse, et n'est pas compatible avec le pipeline `ort` / DirectML prévu. Non retenu.

**Points bloquants** :
- **Licence des poids** : une licence de code MIT ne garantit pas celle des poids. Il faut lire la licence de chaque checkpoint retenu. Si elle est restrictive ou absente, le modèle ne peut pas être distribué avec l'application ; il devra être téléchargé par l'utilisateur, ou remplacé.
- **Conversion ONNX** : non testée. Les modèles RoFormer et HTDemucs ont des opérations (attention, STFT) qui peuvent ne pas s'exporter proprement. Test de conversion à faire en phase 3, sur un checkpoint par modèle.
- **SDR > 11 dB pour la voix** : critère issu de `skills.md`, non mesuré. À confirmer sur un jeu de test (SC-002).

**Décision provisoire** :
- Voix : BS-RoFormer ou Mel-Band RoFormer, le choix dépendra du résultat de conversion ONNX et de la licence du checkpoint.
- Batterie et basse : HTDemucs v4 ; « autres » est le résidu.
- Ne pas livrer de poids dans le dépôt avant vérification de leur licence.

## 5. Recollage et anti-fuite

- **Segments** : 8,0 s, recouvrement 87,5 % (pas de 1,0 s). Fenêtre linéaire pour le recollage. Valeurs issues de la spec et de `skills.md` ; pas de mesure encore.
- **Soustraction spectrale** : cible < -30 dB de fuite. **Méthode définie et implémentée en phase 4 (2026-11-06, alchemix#25)** : soustraction par bin du STFT (FFT 2048, Hann, pas N/4) entre stems adjacents, avec seuil de dominance de 6 dB (`DOMINANCE_RATIO`) ; mesurée sur un signal de référence dans `src-tauri/src/module2/bleed.rs` (test FR-004 : < -30 dB après traitement).

## 6. Ce qui reste ouvert

0. **Décision (2026-11-05)** : option B. Alchemix est gratuit et non commercial. La cible SC-002 (SDR voix > 11 dB) est conservée. Les modèles performants nécessitent une **licence écrite** de leurs auteurs, pour un usage gratuit et non commercial. Aucune licence n'a encore été obtenue. Tant qu'elle ne l'est pas, le module ne peut pas être livré.
   - Demandes à envoyer : viperx (BS-RoFormer et MelBand RoFormer), KimberleyJensen (MelBand RoFormer), MVSep (HTDemucs4 FT), Meta (HTDemucs v4).
   - Les demandes ne sont pas envoyées par l'assistant : elles sont à rédiger et envoyer par le titulaire du projet.
   - Repli de développement : `umxl` (CC BY-NC-SA 4.0, 7,2 dB) peut servir à construire et tester le pipeline, sans être livré tant que SC-002 n'est pas atteint.

1. Choix final du modèle voix (BS-RoFormer ou Mel-Band RoFormer) : conversion ONNX et licence du checkpoint.
2. Licence exacte des poids HTDemucs v4 et du crate `ort`.
3. Version et licence de `hound`.
4. Format de sortie des stems (WAV float 32 bits proposé).
5. Support du mode simulation : requis tant qu'aucun modèle n'est validé (FR-007).

## Références

- docs.rs `ort` : version 2.0.0-rc.15, features listées.
- Dépôt `symphonia` : licence et codecs.
- Dépôt `facebookresearch/demucs` : licence MIT.
- Dépôt `ZFTurbo/Music-Source-Separation-Training` : architectures et liste de modèles (liste non consultée).
