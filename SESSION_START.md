## 📊 État des lieux Kanzo — $(Get-Date -Format 'yyyy-MM-dd HH:mm UTC')

### Résumé par status
- À faire : 8 tickets
- En cours : 2 tickets  
- Terminados : 17 tickets

### Détail des tickets
| ID | Titre | Status | Tags | Progression estimée | Dernière activité |
|----|-------|--------|------|---------------------|-------------------|
| alchemix#2 | FR-010 — Export vers Module 2 non implémenté | todo | module2, pipeline | 10 % | 2026-11-03 |
| alchemix#7 | Tâches 2.1 et 2.2 — Valider le tempo et la tonalité sur cas réels | todo | validation, tempo, tonalite | 100 % | 2026-11-03 |
| alchemix#19 | Créer une page d'index présentant le projet | todo | ui, documentation | 10 % | 2026-11-04 |
| alchemix#22 | Module 2 - Modèles ONNX BS-RoFormer et HTDemucs v4 | todo | module2, models, onnx | 10 % | 2026-11-05 |
| alchemix#28 | Module 2 - Modale de choix de qualité | todo | module2, ui | 10 % | 2026-11-05 |
| alchemix#29 | Module 2 - Réception optionnelle des fichiers depuis Module 1 | todo | module2, integration | 10 % | 2026-11-05 |
| alchemix#17 | Valider la clef | done | validation, clef, tonalite | 100 % | 2026-11-05 |
| alchemix#4 | Tâche 1.4 — État neutre de la roue Camelot | done | ui, calibration | 100 % | 2026-11-03 |

### 🎯 Prochain ticket recommandé
**#alchemix#2 — FR-010 — Export vers Module 2 non implémenté**
- **Pourquoi :** Ticket bloqué critique (module2) qui arrête le pipeline complet. Aucune dépendance bloquante, priorité haute pour débloquer le Module 2.
- **Premières actions :** Implémenter handleSendToModule2 dans Module1View.svelte, câbler les boutons DÉMIXER PISTE A/B, créer les contrats de transfert vers Module 2.
- **Fichiers cibles :** `frontend/src/Module1View.svelte`, `src-tauri/src/module2/` (si existe)
- **DoD :** handleSendToModule2 implémenté, tests d'intégration du module2 passent, export exportable vers le module2.

### ⚠️ Points de vigilance
- Tickets bloqués : alchemix#2 (export vers Module 2), alchemix#22 (modèles ONNX)
- Dépendances non résolues : alchemix#22 nécessite des vérifications de licence avant le déploiement
- Tickets avec activity récente limitée : alchemix#19 (page d'index), alchemix#28 (modale de choix qualité)