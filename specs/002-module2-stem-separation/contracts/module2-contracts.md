# Contracts: Module 2 — Démixage IA des Stems

**Date** : 2026-11-05 | **Plan** : [plan.md](../plan.md) | **Spec** : [spec.md](../spec.md)

Ce document décrit les interfaces entre le frontend Svelte 5 et le backend Rust (Tauri 2), ainsi que l'interface d'entrée depuis le Module 1. Les noms de commandes et d'événements sont à conserver tels quels dans le code.

## 1. Conventions

- Les commandes Tauri sont en `snake_case`. Les événements sont préfixés `module2://` ou `models://`.
- Les stems sont identifiés en interne par `vocals`, `drums`, `bass`, `other`. L'interface les affiche sous les noms VOIX, BATTERIE, BASSE, AUTRES.
- Les chemins sont absolus. Le backend ne reçoit jamais de chemin relatif au dossier de l'application.
- Toutes les erreurs sont des objets `Module2Error` (voir section 6). Aucune erreur n'est remontée sous forme de simple chaîne.
- Les montants de taille sont en octets (`u64` côté Rust, `number` côté TypeScript).

## 2. Types partagés

### Rust (`src-tauri/src/module2/`)

```rust
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Stem { Vocals, Drums, Bass, Other }

#[derive(Serialize, Deserialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum Mode { Performance, Studio }

#[derive(Serialize, Deserialize, Clone)]
pub struct Track {
    pub id: String,            // identifiant généré par le backend
    pub path: String,          // chemin absolu du fichier source
    pub duration_s: f64,
    pub sample_rate: u32,
    pub channels: u8,
    pub format: String,        // "mp3" | "wav" | "flac"
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ModelInfo {
    pub id: String,            // "voice" | "drums_bass"
    pub name: String,          // nom affiché, ex. "BS-RoFormer (voix)"
    pub stems: Vec<Stem>,
    pub size_bytes: u64,       // taille du téléchargement, affichée avant confirmation
    pub installed: bool,
    pub license: String,       // licence du poids, affichée à côté du nom
}
```

### TypeScript (`frontend/src/lib/module2/types.ts`)

```ts
export type Stem = 'vocals' | 'drums' | 'bass' | 'other';
export type Mode = 'performance' | 'studio';

export interface Track {
  id: string;
  path: string;
  durationS: number;
  sampleRate: number;
  channels: number;
  format: 'mp3' | 'wav' | 'flac';
}

export interface ModelInfo {
  id: 'voice' | 'drums_bass';
  name: string;
  stems: Stem[];
  sizeBytes: number;
  installed: boolean;
  license: string;
}

export interface Settings {
  workDir: string | null;    // null tant que le DJ n'a pas choisi le dossier
}

export interface WorkspaceCheck {
  writable: boolean;
  freeBytes: number;
  requiredBytes: number;
  ok: boolean;               // writable && freeBytes >= requiredBytes
}

export interface Module2Error {
  code: ErrorCode;
  message: string;
}

export type ErrorCode =
  | 'FILE_NOT_FOUND'
  | 'UNSUPPORTED_FORMAT'
  | 'DECODE_FAILED'
  | 'WORKDIR_NOT_SET'
  | 'WORKDIR_NOT_WRITABLE'
  | 'DISK_FULL'
  | 'MODEL_MISSING'
  | 'MODEL_NOT_CONFIRMED'
  | 'DOWNLOAD_FAILED'
  | 'MODEL_CHECKSUM_FAILED'
  | 'CANCELLED'
  | 'IMPORT_REFUSED'
  | 'INVALID_ARGUMENT';
```

## 3. Commandes

### 3.1 Dossier de travail (FR-016, FR-018)

| Commande | Entrée | Sortie | Erreurs |
|---|---|---|---|
| `get_settings` | — | `Settings` | — |
| `set_work_dir` | `path: string` | `Settings` | `WORKDIR_NOT_WRITABLE` |
| `check_workspace` | `requiredBytes: number` | `WorkspaceCheck` | — (le résultat porte le statut) |

- `set_work_dir` valide l'écriture avant d'enregistrer le choix. Le choix est persisté entre les sessions.
- `check_workspace` est appelé avant un téléchargement (taille du modèle) et avant une écriture (taille des stems sélectionnés).

### 3.2 Modèles (FR-015)

| Commande | Entrée | Sortie | Erreurs |
|---|---|---|---|
| `get_model_info` | `modelId: string` | `ModelInfo` | `MODEL_MISSING` |
| `download_model` | `modelId: string`, `confirmed: boolean` | `void` (progression par événement) | `MODEL_NOT_CONFIRMED`, `WORKDIR_NOT_SET`, `DISK_FULL`, `DOWNLOAD_FAILED`, `MODEL_CHECKSUM_FAILED` |
| `cancel_model_download` | `modelId: string` | `void` | — |

- `download_model` refuse de démarrer si `confirmed` vaut `false` (`MODEL_NOT_CONFIRMED`). Ce champ est une garde côté backend : l'UI ne doit pas pouvoir contourner la confirmation.
- Le téléchargement écrit dans un fichier temporaire du sous-dossier `models/`. Le fichier n'est renommé qu'après vérification du checksum.
- En cas d'annulation ou d'échec, le fichier temporaire est supprimé.

### 3.3 Import et Module 1 (FR-009, FR-010)

| Commande | Entrée | Sortie | Erreurs |
|---|---|---|---|
| `import_track` | `path: string` | `Track` | `FILE_NOT_FOUND`, `UNSUPPORTED_FORMAT`, `DECODE_FAILED` |
| `receive_from_module1` | `deck: 'A' \| 'B'`, `path: string`, `validated: boolean` | `Track` | `IMPORT_REFUSED` |

- `receive_from_module1` refuse toute piste dont `validated` vaut `false` (FR-010). Le Module 2 fonctionne sans cette commande (NFR-004).

### 3.4 Séparation (FR-001, FR-005, FR-008)

| Commande | Entrée | Sortie | Erreurs |
|---|---|---|---|
| `start_separation` | `trackId: string`, `mode: Mode` | `{ jobId: string, simulated: boolean }` | `MODEL_MISSING` (converti en simulation si le DJ refuse, voir FR-007), `WORKDIR_NOT_SET` |
| `cancel_separation` | `jobId: string` | `void` | — |

- `simulated: true` signale au frontend que les stems sont fictifs. L'UI l'affiche dans le bandeau de simulation et dans les logs.
- Le backend ne démarre jamais la séparation sans dossier de travail.

### 3.5 Export (FR-017, FR-018)

| Commande | Entrée | Sortie | Erreurs |
|---|---|---|---|
| `export_stems` | `jobId: string`, `stems: Stem[]` | `{ paths: string[] }` | `WORKDIR_NOT_SET`, `WORKDIR_NOT_WRITABLE`, `DISK_FULL`, `CANCELLED` |

- `stems` ne peut pas être vide. Le frontend bloque ce cas, et le backend le refuse avec `INVALID_ARGUMENT`.
- Nom de fichier : `<nom-de-la-piste>__<stem>.wav`, dans le dossier de travail.

### 3.6 Moteur d'inférence (carte alchemix#23)

| Commande | Entrée | Sortie | Erreurs |
|---|---|---|---|
| `get_engine_status` | — | `EngineStatus` | — (le résultat porte le statut) |

```rust
pub struct EngineStatus {
    pub available: bool,   // false si ONNX Runtime ne s'initialise pas
    pub backend: String,   // "DirectML" (Windows, GPU disponible) ou "CPU" (repli)
}
```

- Le backend est détecté au premier appel et reste stable pour la session (initialisation unique d'ONNX Runtime).
- Un runtime indisponible n'est pas une erreur de commande : `available` vaut `false` et l'UI l'affiche.

## 4. Événements

| Événement | Charge utile | Quand |
|---|---|---|
| `models://progress` | `{ modelId, receivedBytes, totalBytes }` | Pendant le téléchargement |
| `models://done` | `{ modelId }` | Téléchargement vérifié et installé |
| `models://error` | `{ modelId, error: Module2Error }` | Échec ou annulation |
| `module2://progress` | `{ jobId, percent: number, stage: 'decode' \| 'infer' \| 'bleed' \| 'encode' }` | Pendant la séparation |
| `module2://done` | `{ jobId }` | Stems prêts en mémoire, avant export |
| `module2://error` | `{ jobId, error: Module2Error }` | Échec ou annulation |

- `percent` est croissant pour un même `jobId`. Le frontend ignore toute valeur inférieure à la précédente.
- Un `module2://done` n'écrit rien sur disque : l'écriture passe par `export_stems`.

## 5. Garanties

- **Confirmation** : aucun téléchargement sans `confirmed: true` (FR-015).
- **Annulation** : `cancel_separation` et `cancel_model_download` rendent la main sans fichier partiel comme résultat final (SC, cas limites).
- **Thread** : les commandes d'inférence s'exécutent hors du thread UI. Les commandes de lecture de métadonnées restent synchrones et rapides.
- **Idempotence** : `set_work_dir` avec le même chemin ne modifie rien.

## 6. Erreurs

```rust
#[derive(Serialize, Clone)]
pub struct Module2Error {
    pub code: ErrorCode,
    pub message: String,       // message lisible en français, pour l'UI
}
```

Le champ `code` sert à la logique de l'UI. Le champ `message` ne doit jamais être utilisé pour décider d'un comportement.

## 7. Tests de contrat

| Contrat | Test | Outil |
|---|---|---|
| `download_model` refuse sans confirmation | Appel avec `confirmed: false` → `MODEL_NOT_CONFIRMED` | `cargo test` |
| Fichier partiel supprimé après échec | Téléchargement simulé interrompu → aucun fichier dans `models/` | `cargo test` |
| Checksum invalide rejeté | Fichier altéré → `MODEL_CHECKSUM_FAILED`, modèle non installé | `cargo test` |
| Export sélectif | `export_stems(['vocals'])` → un seul fichier écrit | `cargo test` |
| Liste vide refusée | `export_stems([])` → erreur | `cargo test` |
| Import refusé sans validation | `receive_from_module1(validated: false)` → `IMPORT_REFUSED` | `cargo test` |
| Stub TypeScript cohérent | Types `types.ts` alignés sur les types Rust (mêmes codes d'erreur) | Vitest |
| UI : bouton Démixer désactivé sans dossier | Composant `Module2View` avec `workDir: null` | Vitest |
