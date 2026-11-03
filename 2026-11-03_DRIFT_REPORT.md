# Rapport de Dérive Documents / Code — AlcheMix Studio

**Généré le** : 2026-11-03 — via la skill EGM `egm-drift-report` (plugin `google/elephant-goldfish-model`)
**Périmètre** : `specifications-Alchemix.md`, `design.md`, `specs/001-module1-audio-analysis/**`
**État des tests au moment du rapport** : `npm test` → 15 fichiers / 130 tests, **4 échecs** (`audioEngine.test.js`, section « Formules Mathématiques DSP »)

---

## specifications-Alchemix.md

- **Dossier `protoype/` inexistant** : §1 et §6.2 référencent `C:\Dev\Alchemix\protoype\` et les scripts `module1-alchemix-analyzer-v2.py` / `module2-stem-engine.py` — le dossier n'existe pas dans le dépôt.
- **Wrapper worker non branché (v8.4)** : la spec affirme que `Module1View.loadTrack` utilise `detectBPMKey()` (délégation au Web Worker). En réalité `views/Module1View.svelte:15` importe `detectBPM`/`detectKey` directement (thread principal) ; `detectBPMKey` et `audioWorker.js` ne sont utilisés que par `audioEngine.js` et son test — code mort côté vue.
- **Inventaire de tests obsolète** : §4.2 annonce « 7 fichiers / 48 tests » puis v8.4 « 7 fichiers, 51/51 au vert ». Réel : **15 fichiers / 130 tests, 4 en échec**. Fichiers absents de l'inventaire : `TempoDisplay.test.js`, `loudness.test.js`, `bitDepth.test.js`, `Module1View.{layout,loading,tempo,playback}.test.js`, `deckPlayer.test.js`, `MetadataModal` (aucun test). Les 4 échecs sont mentionnés comme « limite connue » en fin de §4.2 mais contredisent les statuts « 100 % au vert » des entrées antérieures.
- **« Tailwind n'étant pas installé dans le dépôt » (v8.9, v8.10, v8.11)** : faux désormais — `tailwindcss ^4.3.3` + `@tailwindcss/vite` sont dans `package.json`, et `frontend/src/app.css` commence par `@import "tailwindcss"` avec tokens `@theme`.
- **§4.1 non purgé** : décrit encore les indicateurs HeaderBar « 44.1 kHz | 24-bit | DirectML GPU Ready » (supprimés, confirmé dans le code et dans l'entrée récente du §4.2) et le bouton global « ENVOYER VERS MODULE 2 » (supprimé en v8.11).
- **v8.11 contredite** : « BeatgridOverlay retiré du template de `Module1View` » — le composant est de nouveau monté (`views/Module1View.svelte:440`). L'entrée récente (§4.2, « centre Camelot + beatgrid ») correspond au code ; l'historique v8.11 n'a pas été corrigé.
- **Modale métadonnées** : décrite inline dans `Module1View` (v8.6, `showMetadataModal`/`pendingTrackData`) — extraite depuis dans `components/MetadataModal.svelte`, non documenté.
- **`toggle-relative-mode`** : décrit dans `Module1View` (v8.7) — vit en réalité dans `CamelotCompatibility.svelte:151`.
- **Pochette ID3 contradictoire** : v8.4 dit 96×96 px ; le code (et le paragraphe « Carte ID3 agrandie » plus bas) est à 144×144 px (`w-36 h-36`).
- **Polices** : attribuées à `frontend/index.html` — elles sont définies dans `frontend/src/app.css` (DM Sans, JetBrains Mono, Space Grotesk, IM Fell English).
- **Fichiers orphelins non documentés** (aucun import dans le code) : `components/TitleCard.svelte`, `components/D3TagCard.svelte` (doublon dégradé d'`ID3TagCard`), `components/Module1View.svelte` (346 lignes, doublon obsolète de la vue montée par `main.js`), `components/MetadataModal.svelt.svelte` (doublon avec faute de frappe).
- **TTS §4.3** : référence `succes.mp3`/`erreur.mp3` ; le dossier contient aussi `succes.wav`/`erreur.wav`, que `CLAUDE.md` §16 référence de son côté — les deux documents divergent entre eux.

## design.md

Document v1.4.0 globalement périmé — il décrit l'UI d'une itération antérieure :

- **HeaderBar** : indicateurs « 44.1 kHz | 24-Bit Float | GPU Accelerated (DirectML) » et bouton « CLEAR CACHE & RESTART » — supprimés/remplacés (badge MK-IV, bouton « QUITTER & NETTOYER LE CACHE »).
- **CamelotWheel** : « SVG Diameter 180px max » — réel : viewBox 400×400, `max-width: 480px`, sélecteur de notation 3 modes.
- **TempoDisplay** : badges `FIXED_ELECTRONIC`/`VARIABLE_LIVE_DRUMS`, « 128 Bars detected », BPM simulés 118.50/126.00 — la simulation par hash a été remplacée par le moteur DSP réel (v8.6) ; ces éléments n'existent plus dans l'UI.
- **ID3TagCard** : « Compact 2x2 Grid, hauteur -40% » — réel : pochette 144 px, 7 champs techniques (durée, LUFS, canaux…), statut de chargement.
- **CamelotCompatibility** : « Action Button [ENVOYER VERS MODULE 2] full width » — supprimé (v8.11) au profit des boutons par piste.
- **Typographie** : `codeFont: 'Courier New'` — réel : JetBrains Mono / DM Sans / Space Grotesk / IM Fell English.
- **Absents du document** : façade cassette réaliste, pochette de papier (`cassette-sleeve`), lecture PLAY/STOP (`deckPlayer.js`), modale de métadonnées manquantes, bascule relative Majeur/Mineur.

## specs/001-module1-audio-analysis/spec.md

- **SC-001 violé** : « 100 % des tests Vitest passent (38+ tests / 7 fichiers) » — réel : 130 tests / 15 fichiers dont **4 échecs** dans `audioEngine.test.js`.
- **FR-011 non satisfait** : « calculs lourds hors du thread d'interface, dans des workers dédiés » — la vue appelle `detectBPM`/`detectKey` sur le thread principal ; `audioWorker.js` existe mais n'est pas branché à la vue.
- **FR-002 périmé** : « tempo via interpolation parabolique » — `detectBPM` actuel utilise un tempogramme de Fourier (flux spectral, grille 0,5 → 0,01 BPM, trames 1024/pas 256) ; l'interpolation parabolique décrite appartient à l'ancienne implémentation par autocorrélation.
- **FR-007 / US3** : pochette « 96x96 px » — réel : 144×144 px.
- **FR-012 caduc tel que formulé** : « sans dépendance CSS externe non installée » — Tailwind 4 est désormais installé et importé.
- **Assumptions** : les prototypes Python `protoype/` (référence comportementale) n'existent pas dans le dépôt.

## specs/001-module1-audio-analysis/plan.md

- « Aucune dépendance CSS externe (pas de Tailwind) » — Tailwind 4.3.3 installé (`package.json`, `app.css`).
- « 7 fichiers de test, 38+ tests » — réel : 15 fichiers / 130 tests, 4 en échec (porte constitution I non tenue actuellement).
- Constitution III « PASS avec remédiation planifiée » : le worker a été créé (T003) mais la remédiation est incomplète — la vue n'utilise pas le worker ; l'écart constaté par le plan persiste.
- Arborescence « Source Code » incomplète : manquent `audioWorker.js`, `loudness.js`, `bitDepth.js`, `services/deckPlayer.js`, `camelot.js` y figure mais pas les orphelins `TitleCard.svelte`, `D3TagCard.svelte`, `components/Module1View.svelte`, `MetadataModal.svelt.svelte`.

## specs/001-module1-audio-analysis/research.md

- **R2 périmé** : « conserver detectBPM : interpolation parabolique sur pics d'onset, aucune modification nécessaire » — l'algorithme a été remplacé par le tempogramme de Fourier ; « autocorrélation seule » listée comme alternative rejetée alors que c'est l'approche parabolique qui a été abandonnée.
- **R1 partiellement réalisé** : l'API asynchrone encapsulant le worker existe (`detectBPMKey`) mais n'est pas consommée par la vue — l'écart que R1 devait combler subsiste.

## specs/001-module1-audio-analysis/data-model.md

- **RésultatAnalyseDSP** : champs `type` (FIXED_ELECTRONIC…) et `bars` — non produits par `detectBPM` réel, qui renvoie `{ bpm, confidence, regularity }` ; `type` ne subsiste que dans la simulation `simulateFromFileName`.
- « `bpm` … plage ramenée 70–115 » : inexact — seule une correction conditionnelle s'applique (BPM > 150 et régularité < 0,3 → ÷2 si le résultat tombe dans 70–115) ; des tempi légitimes hors plage (128, 174 BPM testés) ne sont pas ramenés.
- `coverUrl` « 96x96 px en affichage » — réel : 144×144 px.

## specs/001-module1-audio-analysis/contracts/module1-contracts.md

- **`detectBPM`** : contrat `→ { bpm, confidence, type, bars }` — réel : `{ bpm, confidence, regularity }` ; « ramené dans 70–115 BPM » inexact (voir data-model).
- **`detectKey`** : contrat `→ { key, mode }` — réel : `{ code, keyName, confidence }`.
- **Protocole worker (§3)** : contrat entrée `{ type:'analyze', id, buffer: ArrayBuffer }` / sortie `{ …, mode, bitrate, metadata }` — réel (`audioWorker.js`) : entrée `{ type:'analyze', id, pcm: Float32Array, sampleRate }`, sortie `{ type:'result', id, bpm, key }` sans bitrate ni metadata. Règle « aucun calcul lourd hors du worker » non respectée par la vue.
- **Props composants (§4)** divergentes : `ID3TagCard` réel expose `deckLabel`, `isFetchingOnline`, `isAnalyzing`, `actionLabel`… (pas seulement `metadata`/`coverUrl`) ; `CamelotCompatibility` réel : `onHalveTargetBpm` (pas `onHalfTempo`), plus bascule relative ; `Module1View` n'expose pas d'événements `onExportToModule2`/`onQuitAndClean` (boutons gérés en interne) ; `CassetteDeck` réel : `coverUrl` retiré, `onEjectTrack`, lecteur PLAY/STOP non contractualisé.

## specs/001-module1-audio-analysis/quickstart.md

- « 38+ tests sur 7 fichiers, exigé à 100 % au vert » — réel : 130 tests / 15 fichiers, 4 échecs.
- Scénario US3 : pochette « 96x96 » — réel : 144×144 px.
- Cas limite « UI fluide (60 FPS, DSP en worker) » — le DSP de la vue s'exécute sur le thread principal.

## specs/001-module1-audio-analysis/tasks.md

- **T003 cochée** « wired into `Module1View.loadTrack` » — le câblage n'existe plus/pas dans le code actuel (imports directs `detectBPM`/`detectKey`).
- **T015 cochée** « 7 test files, 51/51 passed » — état actuel : 15 fichiers / 130 tests, 4 échecs ; la porte SC-001 n'est plus tenue.
- T016 (build manuel), T017 (validation quickstart) et **T018 (mise à jour de `specifications-Alchemix.md`)** restent non cochées — T018 est confirmée nécessaire par l'ensemble des dérives du présent rapport.

## specs/001-module1-audio-analysis/tasks-module1.md

- **Tâche 1.2 cochée** « conteneur strict 96x96px » — le code est passé à 144×144 px sans mise à jour de la tâche.
- **Tâche 1.5 non cochée** (extraction `TitleCard.svelte`) alors que le fichier `TitleCard.svelte` existe déjà — mais orphelin (jamais importé) : état incohérent entre registre et code.
- **Tâche 1.3 non cochée** : repositionnement du Gatekeeper « en haut de l'écran sous le header » — le code l'a placé sous la roue Camelot en colonne centrale : la disposition décrite ne correspond ni à l'état ni à l'intention actuels.

## specs/001-module1-audio-analysis/checklists/requirements.md

No drift detected.

---

## Mise à jour après application (même journée)

- **Omission du rapport initial** : `Module1View.handleSendToModule2` ne fait qu'un `console.info` ; FR-010 (export vers Module 2) n'est pas réalisé. Le rapport initial ne le signalait pas, et T013 était cochée à tort. Corrigé dans `spec.md` (traçabilité), `tasks.md` (T013 décochée) et `specifications-Alchemix.md` (§4.2).
- **Résolu** : worker DSP branché (FR-011) ; 4 composants orphelins retirés (sauvegarde hors dépôt : `C:\Users\danao\alchemix-orphelins-2026-11-03\`) ; `specifications-Alchemix.md` mis à jour (T018) ; contrat du worker et signatures `detectBPM`/`detectKey` corrigés dans `contracts/module1-contracts.md`.
- **Toujours ouvert** : 4 échecs DSP dans `audioEngine.test.js` ; `design.md`, `plan.md`, `quickstart.md`, `data-model.md` et `research.md` non mis à jour ; tâche 1.5 (`TitleCard.svelte`) à reprendre depuis zéro, le fichier ayant été retiré.
