import { render, screen, fireEvent } from '@testing-library/svelte';
import ExportDialog from '$lib/components/ExportDialog.svelte';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve()),
}));

import { invoke } from '@tauri-apps/api/core';

describe('ExportDialog — export sélectif des stems (FR-017, FR-018)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('aucun stem coché : le bouton EXPORTER est désactivé', () => {
		render(ExportDialog, { props: { requiredBytes: 1000, onExport: vi.fn() } });
		expect(screen.getByTestId('export-submit')).toBeDisabled();
	});

	test('exporte uniquement les stems cochés, après contrôle d\'espace', async () => {
		invoke.mockResolvedValueOnce({ writable: true, ok: true, free_bytes: 5000, required_bytes: 1000 });
		const onExport = vi.fn();
		render(ExportDialog, { props: { requiredBytes: 1000, onExport } });

		await fireEvent.click(screen.getByLabelText('Batterie'));
		await fireEvent.click(screen.getByLabelText('Autres'));
		await fireEvent.click(screen.getByTestId('export-submit'));

		await vi.waitFor(() => expect(onExport).toHaveBeenCalledWith(['drums', 'other']));
		expect(invoke).toHaveBeenCalledWith('check_workspace', { requiredBytes: 1000 });
	});

	test('espace insuffisant : export refusé et message affiché', async () => {
		invoke.mockResolvedValueOnce({ writable: true, ok: false, free_bytes: 10, required_bytes: 1000 });
		const onExport = vi.fn();
		render(ExportDialog, { props: { requiredBytes: 1000, onExport } });

		await fireEvent.click(screen.getByLabelText('Voix'));
		await fireEvent.click(screen.getByTestId('export-submit'));

		await vi.waitFor(() => expect(screen.getByTestId('export-error')).toHaveTextContent('Espace disque insuffisant'));
		expect(onExport).not.toHaveBeenCalled();
	});

	test('dossier inaccessible : message dédié et export refusé', async () => {
		invoke.mockResolvedValueOnce({ writable: false, ok: false, free_bytes: 0, required_bytes: 1000 });
		const onExport = vi.fn();
		render(ExportDialog, { props: { requiredBytes: 1000, onExport } });

		await fireEvent.click(screen.getByLabelText('Basse'));
		await fireEvent.click(screen.getByTestId('export-submit'));

		await vi.waitFor(() => expect(screen.getByTestId('export-error')).toHaveTextContent('inaccessible en écriture'));
		expect(onExport).not.toHaveBeenCalled();
	});

	test('Annuler appelle onCancel sans rien exporter', async () => {
		const onCancel = vi.fn();
		const onExport = vi.fn();
		render(ExportDialog, { props: { requiredBytes: 1000, onExport, onCancel } });

		await fireEvent.click(screen.getByTestId('export-cancel'));

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onExport).not.toHaveBeenCalled();
	});
});
