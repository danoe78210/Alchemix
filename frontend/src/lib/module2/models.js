/**
 * Catalogue des moteurs de séparation retenus (Docs/rapport_separation_audio_DJ.md §1-2).
 * Aucun modèle n'est livré avec l'application : l'installation viendra avec les tickets #22/#36.
 */
export const MODELS = [
	{ id: 'htdemucs-ft', label: 'Demucs HTDemucs FT', usage: 'Séparation 4 stems — moteur principal', sizeMb: null },
	{ id: 'bs-roformer-4s', label: 'BS-RoFormer 4 stems', usage: 'Séparation 4 stems — moteur alternatif', sizeMb: null },
	{ id: 'melband-kim', label: 'MelBand RoFormer Kim', usage: 'Extraction vocale (voix + instrumental)', sizeMb: 913 },
];
