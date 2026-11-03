# Quickstart — Validation du Module 1 (Phase 1)

**Feature**: `specs/001-module1-audio-analysis` | **Date**: 2026-11-01

Guide de validation exécutable du Module 1. Toutes les commandes se lancent **à la racine du dépôt**
(`C:\Dev\Alchemix`) — il n'existe pas de `frontend/package.json`.

## Prérequis

- Node.js installé ; dépendances installées à la racine : `npm install` (une seule fois).
- Deux fichiers audio de test (MP3 320 kbps 44,1 kHz et WAV) disponibles pour le chargement manuel.

## Commandes de validation (portes de la constitution, principe I)

```bash
npm test          # Vitest run : 38+ tests sur 7 fichiers, exigé à 100 % au vert
npm run build     # vite build (sortie dist/) : exigé sans erreur
npm run dev       # prévisualisation web (Vite, port 5173) pour la validation manuelle
```

## Scénarios de validation manuelle (mappés aux user stories de spec.md)

1. **US1 (P1)** — Ouvrir le Module 1, charger un fichier sur la Platine A puis un second sur la Platine B.
   *Attendu* : chaque platine affiche BPM (2 décimales, ex. 187.54), code Camelot et carte ID3.
2. **US2 (P2)** — Avec A et B analysées, lire le panneau Gatekeeper sous la Roue de Camelot.
   *Attendu* : score de consonance %, déplacement, verdict GO/NO-GO (seuil 60 %). Cas 8A/8A → 100/100 GO ;
   écart de tempo > 15 % → badge `⚠ WARP HAZARD (>15%)` ; bouton `÷2 TEMPO CIBLE` présent.
3. **US3 (P3)** — Consulter les cartes ID3. *Attendu* : pochette 96x96 (`coverUrl`), titre, artiste, album,
   année, genre, bitrate (`320 kbps` ou `VBR`), fréquence (`44.1 kHz`), format (`MP3`/`WAV`). Fichier sans
   tags → champs « indisponibles », analyse DSP non bloquée.
4. **US4 (P3)** — Cliquer sur « Démixer Piste A ➔ Module 2 » (puis B) : la piste est transmise au Module 2.
   Cliquer sur « Quitter et nettoyer le cache » : `resetAudioEngine()` exécuté, retour à l'état initial.

## Cas limites à vérifier

- Fichier corrompu/illisible → message d'erreur clair, autre platine fonctionnelle.
- Tempo hors plage → ramené dans 70–115 BPM (anti-double tempo).
- Réseau indisponible → enrichissement iTunes en repli `{ success: false }`, UI fluide (60 FPS, DSP en worker).

## Références

- Données et règles de validation : [data-model.md](./data-model.md)
- Contrats (API moteur, worker, composants) : [contracts/module1-contracts.md](./contracts/module1-contracts.md)
- Décisions techniques : [research.md](./research.md)
