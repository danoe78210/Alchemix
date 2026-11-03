import { render, screen, fireEvent } from '@testing-library/svelte';
import HeaderBar from '$lib/components/HeaderBar.svelte';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve()),
}));
vi.mock('@tauri-apps/api/webviewWindow', () => ({
	WebviewWindow: {
		getCurrent: vi.fn(() => ({ close: mockClose })),
	},
}));

const mockClose = vi.fn();

import { invoke } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

describe('HeaderBar — indicateurs système et bouton QUITTER & NETTOYER LE CACHE', () => {
	test('affiche le titre AlcheMix Studio sans les indicateurs système (retirés de l\'en-tête)', () => {
		render(HeaderBar, { props: { appTitle: 'AlcheMix Studio' } });
		expect(screen.getByText('AlcheMix Studio')).toBeInTheDOM();
		// Indicateurs FREQ / DEPTH / GPU supprimés de la barre d'en-tête (demande du 2026-11-02)
		expect(screen.queryByText('44.1 kHz')).toBeNull();
		expect(screen.queryByText('24-bit')).toBeNull();
		expect(screen.queryByText('DirectML Ready')).toBeNull();
	});

	test('le bouton QUITTER & NETTOYER LE CACHE appelle clean_cache puis ferme la fenêtre', async () => {
		render(HeaderBar, { props: { appTitle: 'AlcheMix Studio' } });
		expect(invoke).not.toHaveBeenCalledWith('clean_cache');

		fireEvent.click(screen.getByTestId('quit-clean'));

		await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('clean_cache'));
		await vi.waitFor(() => expect(WebviewWindow.getCurrent).toHaveBeenCalledTimes(1));
		expect(mockClose).toHaveBeenCalledTimes(1);
	});
});
