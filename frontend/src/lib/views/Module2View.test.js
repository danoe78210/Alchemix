import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Module2View from '$lib/views/Module2View.svelte';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve()),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('@tauri-apps/api/webviewWindow', () => ({
	WebviewWindow: { getCurrent: vi.fn() },
}));

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

/** Réponses par défaut des commandes Tauri pour une session avec dossier de travail. */
function mockCommands(overrides = {}) {
	invoke.mockImplementation((cmd, args) => {
		const table = {
			get_settings: () => Promise.resolve({ work_dir: 'C:\\Travail', selected_model: null }),
			get_engine_status: () => Promise.resolve({ available: true, backend: 'DirectML' }),
			probe_track: () => Promise.resolve({ durationSeconds: 272, sampleRate: 44100, channels: 2 }),
			start_separation: () => Promise.resolve({ jobId: 'job-1', simulated: true, bytesPerStem: 1000 }),
			get_stem_audio: () => Promise.resolve(new ArrayBuffer(8)),
			check_workspace: () => Promise.resolve({ writable: true, ok: true, free_bytes: 9999, required_bytes: 4000 }),
			export_stems: () => Promise.resolve({ paths: ['C:\\Travail\\track__drums.wav'] }),
			...overrides,
		};
		return table[cmd] ? table[cmd](args) : Promise.resolve();
	});
}

function fakeAudioContext() {
	return {
		currentTime: 0,
		destination: {},
		createGain: () => ({ gain: { value: 1 }, connect: () => {} }),
		createBufferSource: () => ({ buffer: null, connect: () => {}, start: () => {}, stop: () => {} }),
		createAnalyser: () => ({ fftSize: 4, connect: () => {}, getFloatTimeDomainData: () => {} }),
		decodeAudioData: vi.fn(() => Promise.resolve({ duration: 2 })),
	};
}

async function importTrack() {
	open.mockResolvedValueOnce('C:\\Musique\\track.mp3');
	render(Module2View, { props: {} });
	await waitFor(() => expect(screen.getByTestId('module2-workdir')).toBeInTheDOM());
	await fireEvent.click(screen.getByTestId('import-track'));
	await waitFor(() => expect(screen.getByTestId('track-name')).toHaveTextContent('track.mp3'));
}

async function importAndSeparate() {
	await importTrack();
	await fireEvent.click(screen.getByTestId('separate-track'));
	await waitFor(() => expect(screen.getByTestId('tab-separation')).toHaveAttribute('aria-selected', 'true'));
}

describe('Module2View — navigation en deux onglets', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		globalThis.AudioContext = class {
			constructor() {
				return fakeAudioContext();
			}
		};
		mockCommands();
	});

	afterEach(() => {
		invoke.mockImplementation(() => Promise.resolve());
		delete globalThis.AudioContext;
	});

	test('l\'onglet Import & paramétrage est actif par défaut, Séparation montre un état vide', async () => {
		render(Module2View, { props: {} });
		await waitFor(() => expect(screen.getByTestId('module2-workdir')).toBeInTheDOM());
		expect(screen.getByTestId('tab-setup')).toHaveAttribute('aria-selected', 'true');

		await fireEvent.click(screen.getByTestId('tab-separation'));

		expect(screen.getByTestId('separation-empty')).toBeInTheDOM();
		expect(screen.queryByTestId('stem-rack')).toBeNull();
	});

	test('après la séparation, la vue bascule sur l\'onglet Séparation avec les stems et le mixeur', async () => {
		await importAndSeparate();
		expect(screen.getByTestId('stem-rack')).toBeInTheDOM();
		expect(screen.getByTestId('master-meter')).toBeInTheDOM();
		expect(screen.queryByTestId('import-track')).toBeNull();
	});

	test('on peut revenir à l\'onglet Import & paramétrage puis retourner à la séparation', async () => {
		await importAndSeparate();

		await fireEvent.click(screen.getByTestId('tab-setup'));
		expect(screen.getByTestId('import-track')).toBeInTheDOM();
		expect(screen.queryByTestId('stem-rack')).toBeNull();

		await fireEvent.click(screen.getByTestId('tab-separation'));
		expect(screen.getByTestId('stem-rack')).toBeInTheDOM();
	});

	test('avec un morceau importé, l\'état vide propose de lancer la séparation sur place', async () => {
		await importTrack();
		await fireEvent.click(screen.getByTestId('tab-separation'));

		expect(screen.getByTestId('separation-empty')).toHaveTextContent('track.mp3');
		await fireEvent.click(screen.getByTestId('empty-separate'));

		await waitFor(() => expect(screen.getByTestId('stem-rack')).toBeInTheDOM());
		expect(invoke).toHaveBeenCalledWith('start_separation', { path: 'C:\\Musique\\track.mp3' });
		expect(screen.queryByTestId('separation-empty')).toBeNull();
	});

	test('sans morceau importé, l\'état vide renvoie vers l\'import sans proposer de séparer', async () => {
		render(Module2View, { props: {} });
		await waitFor(() => expect(screen.getByTestId('module2-workdir')).toBeInTheDOM());
		await fireEvent.click(screen.getByTestId('tab-separation'));

		expect(screen.queryByTestId('empty-separate')).toBeNull();
		expect(screen.getByTestId('empty-goto-import')).toBeInTheDOM();
	});

	test('le bouton Ouvrir la séparation a été retiré : la navigation passe par les onglets', async () => {
		render(Module2View, { props: {} });
		await waitFor(() => expect(screen.getByTestId('module2-workdir')).toBeInTheDOM());
		expect(screen.queryByTestId('goto-separation')).toBeNull();
	});

	test('annuler la séparation ramène sur l\'onglet Import et vide l\'onglet Séparation', async () => {
		await importAndSeparate();
		await fireEvent.click(screen.getByTestId('tab-setup'));

		await fireEvent.click(screen.getByTestId('cancel-job'));

		await waitFor(() => expect(screen.getByTestId('cancel-status')).toBeInTheDOM());
		expect(screen.getByTestId('tab-setup')).toHaveAttribute('aria-selected', 'true');
		await fireEvent.click(screen.getByTestId('tab-separation'));
		expect(screen.getByTestId('separation-empty')).toBeInTheDOM();
		expect(screen.queryByTestId('stem-rack')).toBeNull();
	});
});

describe('Module2View — dossier de travail obligatoire (FR-016)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('sans dossier de travail, affiche le dialogue de choix', async () => {
		invoke.mockResolvedValueOnce({ work_dir: null });
		render(Module2View, { props: {} });

		await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDOM());
		expect(invoke).toHaveBeenCalledWith('get_settings');
	});

	test('avec un dossier de travail, affiche le chemin sans le dialogue', async () => {
		invoke.mockResolvedValueOnce({ work_dir: 'C:\\Travail' });
		render(Module2View, { props: {} });

		await waitFor(() => expect(screen.getByTestId('module2-workdir')).toHaveTextContent('C:\\Travail'));
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	test('après le choix du dossier, la vue affiche le nouveau chemin', async () => {
		invoke.mockResolvedValueOnce({ work_dir: null });
		render(Module2View, { props: {} });
		await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDOM());

		open.mockResolvedValueOnce('D:\\Stems');
		invoke.mockResolvedValueOnce({ work_dir: 'D:\\Stems' });
		await fireEvent.click(screen.getByTestId('workdir-pick'));

		await waitFor(() => expect(screen.getByTestId('module2-workdir')).toHaveTextContent('D:\\Stems'));
		expect(screen.queryByRole('dialog')).toBeNull();
	});
});

describe('Module2View — zone 1 : import et en-tête du module', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCommands();
	});

	afterEach(() => {
		invoke.mockImplementation(() => Promise.resolve());
	});

	test('importer lit les métadonnées sans lancer la séparation', async () => {
		await importTrack();
		expect(invoke).toHaveBeenCalledWith('probe_track', { path: 'C:\\Musique\\track.mp3' });
		expect(invoke).not.toHaveBeenCalledWith('start_separation', expect.anything());
		expect(screen.getByTestId('track-meta')).toHaveTextContent('44,1 kHz · Stéréo · 4:32');
	});

	test('avant import, SÉPARER est désactivé ; après import, il devient actif', async () => {
		render(Module2View, { props: {} });
		await waitFor(() => expect(screen.getByTestId('module2-workdir')).toBeInTheDOM());
		expect(screen.getByTestId('separate-track')).toBeDisabled();
	});
});

describe('Module2View — séparation simulée et export (FR-007, FR-017)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		globalThis.AudioContext = class {
			constructor() {
				return fakeAudioContext();
			}
		};
		mockCommands();
	});

	afterEach(() => {
		invoke.mockImplementation(() => Promise.resolve());
		delete globalThis.AudioContext;
	});

	test('SÉPARER lance une séparation signalée comme simulée', async () => {
		await importAndSeparate();
		expect(invoke).toHaveBeenCalledWith('start_separation', { path: 'C:\\Musique\\track.mp3' });
		expect(screen.getByTestId('simulation-banner')).toBeInTheDOM();
	});

	test('exporter les stems cochés envoie le job et la sélection, puis affiche les fichiers écrits', async () => {
		await importAndSeparate();
		await fireEvent.click(screen.getByTestId('tab-setup'));
		await fireEvent.click(screen.getByTestId('open-export'));
		await fireEvent.click(screen.getByLabelText('Batterie'));
		await fireEvent.click(screen.getByTestId('export-submit'));

		await waitFor(() => expect(screen.getByTestId('export-result')).toHaveTextContent('track__drums.wav'));
		expect(invoke).toHaveBeenCalledWith('export_stems', { jobId: 'job-1', stems: ['drums'] });
	});

	test('annuler la séparation appelle cancel_separation et désactive l\'export', async () => {
		await importAndSeparate();
		await fireEvent.click(screen.getByTestId('tab-setup'));

		await fireEvent.click(screen.getByTestId('cancel-job'));

		await waitFor(() => expect(screen.getByTestId('open-export')).toBeDisabled());
		expect(invoke).toHaveBeenCalledWith('cancel_separation', { jobId: 'job-1' });
		expect(screen.getByTestId('cancel-status')).toHaveTextContent('Séparation annulée');
	});
});

describe('Module2View — zone 2 : configuration du moteur IA', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCommands();
	});

	afterEach(() => {
		invoke.mockImplementation(() => Promise.resolve());
	});

	test('les trois moteurs du rapport sont proposés', async () => {
		render(Module2View, { props: {} });
		await waitFor(() => expect(screen.getByTestId('module2-workdir')).toBeInTheDOM());
		expect(screen.getByText('Demucs HTDemucs FT')).toBeInTheDOM();
		expect(screen.getByText('BS-RoFormer 4 stems')).toBeInTheDOM();
		expect(screen.getByText('MelBand RoFormer Kim')).toBeInTheDOM();
	});

	test('choisir un modèle le mémorise via set_selected_model', async () => {
		render(Module2View, { props: {} });
		await waitFor(() => expect(screen.getByTestId('module2-workdir')).toBeInTheDOM());

		await fireEvent.click(screen.getByTestId('model-bs-roformer-4s'));

		await waitFor(() => expect(invoke).toHaveBeenCalledWith('set_selected_model', { model: 'bs-roformer-4s' }));
		expect(screen.getByTestId('model-bs-roformer-4s')).toBeChecked();
	});

	test('le modèle utilisé reste « simulation » tant que l\'inférence réelle est absente', async () => {
		render(Module2View, { props: {} });
		await waitFor(() => expect(screen.getByTestId('active-model')).toHaveTextContent('aucun — simulation'));
	});

	test('la zone IA affiche le backend réellement détecté par le runtime ONNX', async () => {
		render(Module2View, { props: {} });
		await waitFor(() => expect(screen.getByTestId('engine-backend')).toHaveTextContent('DirectML'));
		expect(invoke).toHaveBeenCalledWith('get_engine_status');
	});

	test('un runtime indisponible est signalé dans la zone IA', async () => {
		mockCommands({ get_engine_status: () => Promise.resolve({ available: false, backend: 'indisponible' }) });
		render(Module2View, { props: {} });
		await waitFor(() => expect(screen.getByTestId('engine-backend')).toHaveTextContent('indisponible'));
	});
});

describe('Module2View — zones 3 à 5 : stems, mixeur et master (FR-011 à FR-014)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		globalThis.AudioContext = class {
			constructor() {
				return fakeAudioContext();
			}
		};
		mockCommands();
	});

	afterEach(() => {
		invoke.mockImplementation(() => Promise.resolve());
		delete globalThis.AudioContext;
	});

	test('après séparation, les quatre tranches de stems sont affichées', async () => {
		await importAndSeparate();
		await waitFor(() => expect(screen.getByTestId('play-vocals')).toBeInTheDOM());
		for (const id of ['vocals', 'drums', 'bass', 'other']) {
			expect(screen.getByTestId(`play-${id}`)).toBeInTheDOM();
			expect(screen.getByTestId(`solo-${id}`)).toBeInTheDOM();
			expect(screen.getByTestId(`mute-${id}`)).toBeInTheDOM();
		}
	});

	test('PLAY passe le stem en lecture et le bouton affiche PAUSE', async () => {
		await importAndSeparate();
		await waitFor(() => expect(screen.getByTestId('play-drums')).toBeInTheDOM());

		await fireEvent.click(screen.getByTestId('play-drums'));

		await waitFor(() => expect(screen.getByTestId('play-drums')).toHaveTextContent('PAUSE'));
		expect(screen.getByTestId('wave-state-drums')).toHaveTextContent('LECTURE');
		expect(invoke).toHaveBeenCalledWith('get_stem_audio', { jobId: 'job-1', stem: 'drums' });
	});

	test('le niveau de sortie master est affiché en dBFS avec son bargraphe', async () => {
		await importAndSeparate();
		await waitFor(() => expect(screen.getByTestId('level-readout')).toHaveTextContent('-∞ dBFS'));
		expect(screen.getByTestId('master-meter')).toBeInTheDOM();
	});

	test('chaque tranche affiche son VU-mètre et sa valeur en dB', async () => {
		await importAndSeparate();
		await waitFor(() => expect(screen.getByTestId('meter-bass')).toHaveStyle({ height: '0%' }));
		for (const id of ['vocals', 'drums', 'bass', 'other']) {
			expect(screen.getByTestId(`meter-${id}`)).toBeInTheDOM();
			expect(screen.getByTestId(`vol-db-${id}`)).toHaveTextContent('0.0 dB');
		}
	});

	test('les quatre formes d\'onde partagent règle temporelle, curseur et zoom', async () => {
		await importAndSeparate();
		await waitFor(() => expect(screen.getByTestId('wave-vocals')).toBeInTheDOM());
		for (const id of ['vocals', 'drums', 'bass', 'other']) {
			expect(screen.getByTestId(`wave-${id}`)).toBeInTheDOM();
		}
		expect(screen.getByTestId('time-ruler')).toBeInTheDOM();
		expect(screen.getByTestId('playhead')).toBeInTheDOM();
		expect(screen.getByTestId('zoom-level')).toHaveTextContent('×1');
	});

	test('le zoom commun double la fenêtre à chaque cran et se borne à ×8', async () => {
		await importAndSeparate();
		await waitFor(() => expect(screen.getByTestId('zoom-in')).toBeInTheDOM());

		await fireEvent.click(screen.getByTestId('zoom-in'));
		expect(screen.getByTestId('zoom-level')).toHaveTextContent('×2');
		await fireEvent.click(screen.getByTestId('zoom-in'));
		await fireEvent.click(screen.getByTestId('zoom-in'));
		expect(screen.getByTestId('zoom-level')).toHaveTextContent('×8');
		expect(screen.getByTestId('zoom-in')).toBeDisabled();

		await fireEvent.click(screen.getByTestId('zoom-out'));
		expect(screen.getByTestId('zoom-level')).toHaveTextContent('×4');
	});
});
