# Data Model — Module 1 (Phase 1)

**Feature**: `specs/001-module1-audio-analysis` | **Date**: 2026-11-01

Entités extraites de la spec (section « Key Entities »), avec champs, règles de validation et
transitions d'état. Aucune implémentation de stockage n'est impliquée : tout vit en mémoire.

## Entités

### Piste (Track)

- **Rôle** : morceau audio chargé sur une platine (A = Master, B = Candidate).
- **Champs** : `id` (A | B), `file` (File navigateur, optionnel), `buffer` (AudioBuffer décodé),
  `métadonnées` (MétadonnéesID3), `analyse` (RésultatAnalyseDSP), `coverUrl` (string | null,
  pochette enrichie en ligne).
- **Validation** : `id` ∈ {A, B} ; une piste sans `file` est en état « vide » ; le décodage échoue →
  état « erreur » avec message, l'autre platine reste fonctionnelle.
- **Relations** : possède exactement une MétadonnéesID3 et un RésultatAnalyseDSP (une fois analysée).

### MétadonnéesID3

- **Champs** : `title`, `artist`, `album`, `year`, `genre`, `initial_key` (code Camelot), `sample_rate`
  (ex. "44.1 kHz"), `bitrate` (ex. "320 kbps" ou "VBR"), `format` ("MP3" | "WAV"), `source`
  ("file" | enrichi en ligne), `coverUrl` (96x96 px en affichage).
- **Validation** : tout champ peut être indisponible (fichier sans tags) → affiché comme tel, sans
  bloquer l'analyse DSP ; `format` ∈ {MP3, WAV} ; `bitrate` affiche "VBR" si bitrate variable.

### RésultatAnalyseDSP

- **Champs** : `bpm` (number, affiché avec 2 décimales, plage ramenée 70–115), `confidence` (0–100),
  `type` (ex. FIXED_ELECTRONIC, VARIABLE_LIVE_DRUMS), `bars` (number), `key` (code Camelot 1A–12B,
  mode Majeur/Mineur discriminé).
- **Validation** : `bpm` à 2 décimales (SC-003) ; `key` ∈ CAMELOT_KEYS (24 codes) ; détection
  Majeur/Mineur correcte sur les cas de référence 10B vs 7A (SC-004).

### VerdictCompatibilité (Gatekeeper)

- **Champs** : `score` (0–100, % de consonance), `rule` (ex. "SAME_KEY (0h)"), `shift`
  (déplacement Camelot en heures), `stretch` (% de warp tempo), `status` ("GATE_UNLOCKED" |
  "GATE_LOCKED"), `message` (texte affiché), `warpHazard` (booléen, vrai si stretch > 15 %),
  `pitchShiftMax` (±3 demi-tons).
- **Validation** : verdict GO si score ≥ 60, NO-GO sinon (règle de référence) ; `warpHazard` vrai
  strictement au-delà de 15 % (SC-005) ; badge `⚠ WARP HAZARD (>15%)` et bouton `÷2 TEMPO CIBLE`
  exposés au panneau CamelotCompatibility.
- **Relations** : calculé entre la Piste A et la Piste B via `compatibilityBetween(keyA, keyB)`.

### ÉtatMoteurAudio

- **Champs** : références internes (buffers, worker, object URLs).
- **Transitions** : `idle → loaded → analyzing → analyzed → (exported | reset)` ; `resetAudioEngine()`
  ramène à `idle` en libérant buffers, object URLs et worker (FR-009).

## Règles de transition globales

- Le chargement d'une piste ne modifie jamais l'autre platine (indépendance des stories).
- L'analyse ne démarre que si les deux pistes sont chargées (verdict Gatekeeper) ; chaque piste
  reste analysable individuellement pour BPM/tonalité.
- Toute erreur (fichier illisible, métadonnées absentes, réseau indisponible) dégrade l'affichage
  sans jamais bloquer ni lever d'exception non gérée.
