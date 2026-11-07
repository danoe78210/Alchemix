import { render, screen, fireEvent } from '@testing-library/svelte';
import EngineCard from '$lib/components/EngineCard.svelte';
import { MODELS } from '$lib/module2/models.js';

function props(overrides = {}) {
	return {
		models: MODELS,
		selectedId: null,
		onSelect: vi.fn(),
		...overrides,
	};
}

describe('EngineCard — zone de configuration IA (zone 2)', () => {
	test('liste les trois moteurs retenus, tous non installés', () => {
		render(EngineCard, { props: props() });
		expect(screen.getByText('Demucs HTDemucs FT')).toBeInTheDOM();
		expect(screen.getByText('BS-RoFormer 4 stems')).toBeInTheDOM();
		expect(screen.getByText('MelBand RoFormer Kim')).toBeInTheDOM();
		for (const m of MODELS) {
			expect(screen.getByTestId(`installed-${m.id}`)).toHaveTextContent('NON INSTALLÉ');
		}
	});

	test('choisir un modèle appelle onSelect avec son identifiant', async () => {
		const p = props();
		render(EngineCard, { props: p });
		await fireEvent.click(screen.getByTestId('model-bs-roformer-4s'));
		expect(p.onSelect).toHaveBeenCalledWith('bs-roformer-4s');
	});

	test('distingue le modèle sélectionné du modèle réellement utilisé (simulation)', () => {
		render(EngineCard, { props: props({ selectedId: 'htdemucs-ft', activeModel: null }) });
		expect(screen.getByTestId('model-htdemucs-ft')).toBeChecked();
		expect(screen.getByTestId('active-model')).toHaveTextContent('aucun — simulation');
	});

	test('affiche accélération, mémoire GPU et temps de traitement', () => {
		render(EngineCard, { props: props({ backend: 'CPU — simulation', vramText: '—', lastMs: 1500 }) });
		expect(screen.getByTestId('engine-backend')).toHaveTextContent('CPU — simulation');
		expect(screen.getByTestId('engine-vram')).toHaveTextContent('—');
		expect(screen.getByTestId('engine-time')).toHaveTextContent('1.5 s');
	});

	test('sans séparation en cours, aucune progression ; avec, un indicateur visible', () => {
		const { unmount } = render(EngineCard, { props: props() });
		expect(screen.queryByTestId('separation-progress')).toBeNull();
		unmount();
		render(EngineCard, { props: props({ busy: true }) });
		expect(screen.getByTestId('separation-progress')).toHaveTextContent('Séparation en cours');
	});
});
