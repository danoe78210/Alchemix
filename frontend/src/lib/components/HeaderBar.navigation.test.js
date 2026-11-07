import { render, screen, fireEvent } from '@testing-library/svelte';
import HeaderBar from '$lib/components/HeaderBar.svelte';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve()),
}));
vi.mock('@tauri-apps/api/webviewWindow', () => ({
	WebviewWindow: { getCurrent: vi.fn() },
}));

describe('HeaderBar — navigation entre modules', () => {
	test('cliquer sur l\'onglet Module 2 demande ce module', async () => {
		const onSelectModule = vi.fn();
		render(HeaderBar, { props: { appTitle: 'AlcheMix Studio', onSelectModule } });

		await fireEvent.click(screen.getByRole('button', { name: /MODULE 2/ }));

		expect(onSelectModule).toHaveBeenCalledWith(2);
	});

	test('les modules 3 et 4 restent verrouillés', () => {
		render(HeaderBar, { props: { appTitle: 'AlcheMix Studio', onSelectModule: vi.fn() } });
		expect(screen.queryByRole('button', { name: /MODULE 3/ })).toBeNull();
		expect(screen.queryByRole('button', { name: /MODULE 4/ })).toBeNull();
	});

	test('l\'onglet du module courant est marqué comme page courante', () => {
		render(HeaderBar, { props: { appTitle: 'AlcheMix Studio', currentModule: 2, onSelectModule: vi.fn() } });
		expect(screen.getByText('MODULE 2: DÉMIXAGE IA').closest('a')).toHaveAttribute('aria-current', 'page');
	});
});
