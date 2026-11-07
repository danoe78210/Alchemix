import { render, screen, fireEvent } from '@testing-library/svelte';
import WorkDirDialog from '$lib/components/WorkDirDialog.svelte';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve()),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn(() => Promise.resolve(null)),
}));

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

describe('WorkDirDialog — choix obligatoire du dossier de travail (FR-016)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('sans sélecteur fourni, ouvre le sélecteur natif de dossier', async () => {
		open.mockResolvedValueOnce('C:\\Travail');
		invoke.mockResolvedValueOnce({ work_dir: 'C:\\Travail' });
		render(WorkDirDialog, { props: { onSaved: vi.fn() } });

		await fireEvent.click(screen.getByTestId('workdir-pick'));

		await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('set_work_dir', { path: 'C:\\Travail' }));
		expect(open).toHaveBeenCalledWith({ directory: true, multiple: false });
	});

	test('est bloquant : aucun bouton d\'annulation ou de fermeture', () => {
		render(WorkDirDialog, { props: { pickFolder: vi.fn() } });
		expect(screen.getByRole('dialog')).toBeInTheDOM();
		expect(screen.queryByRole('button', { name: /annuler|fermer|✕/i })).toBeNull();
	});

	test('un dossier choisi est enregistré par set_work_dir puis signalé', async () => {
		const settings = { work_dir: 'C:\\Travail' };
		invoke.mockResolvedValueOnce(settings);
		const onSaved = vi.fn();
		render(WorkDirDialog, { props: { pickFolder: () => Promise.resolve('C:\\Travail'), onSaved } });

		await fireEvent.click(screen.getByTestId('workdir-pick'));

		await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith(settings));
		expect(invoke).toHaveBeenCalledWith('set_work_dir', { path: 'C:\\Travail' });
	});

	test('une boîte de dialogue annulée ne déclenche aucun appel', async () => {
		render(WorkDirDialog, { props: { pickFolder: () => Promise.resolve(null), onSaved: vi.fn() } });

		await fireEvent.click(screen.getByTestId('workdir-pick'));

		await vi.waitFor(() => expect(screen.getByTestId('workdir-pick')).not.toBeDisabled());
		expect(invoke).not.toHaveBeenCalled();
	});

	test('un refus du backend affiche le message d\'erreur', async () => {
		invoke.mockRejectedValueOnce({ code: 'WORKDIR_NOT_WRITABLE', message: 'dossier inaccessible' });
		render(WorkDirDialog, { props: { pickFolder: () => Promise.resolve('Z:\\absent'), onSaved: vi.fn() } });

		await fireEvent.click(screen.getByTestId('workdir-pick'));

		await vi.waitFor(() => expect(screen.getByTestId('workdir-error')).toHaveTextContent('dossier inaccessible'));
	});
});
