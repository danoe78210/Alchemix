import { createDeckPlayer } from './deckPlayer.js';

function fakeAudio() {
	return {
		src: '',
		currentTime: 0,
		onended: null,
		play: vi.fn(() => Promise.resolve()),
		pause: vi.fn(),
	};
}

describe('deckPlayer — lecture d\'une cassette', () => {
	let audio;
	let onPlayingChange;
	let onProgress;
	let player;

	beforeEach(() => {
		audio = fakeAudio();
		onPlayingChange = vi.fn();
		onProgress = vi.fn();
		URL.createObjectURL = vi.fn(() => 'blob:cassette-a');
		URL.revokeObjectURL = vi.fn();
		player = createDeckPlayer({ onPlayingChange, onProgress, createAudio: () => audio });
	});

	test('load crée une URL d\'objet pour un Blob et la relie à l\'élément audio', () => {
		const file = new Blob(['audio'], { type: 'audio/mpeg' });
		player.load(file);
		expect(URL.createObjectURL).toHaveBeenCalledWith(file);
		expect(audio.src).toBe('blob:cassette-a');
	});

	test('play lance la lecture et signale isPlaying = true', () => {
		player.load(new Blob(['audio']));
		player.play();
		expect(audio.play).toHaveBeenCalledTimes(1);
		expect(onPlayingChange).toHaveBeenLastCalledWith(true);
	});

	test('play sans fichier chargé ne fait rien', () => {
		player.play();
		expect(onPlayingChange).not.toHaveBeenCalled();
	});

	test('play échoué (rejet) remet isPlaying à false', async () => {
		audio.play = vi.fn(() => Promise.reject(new Error('NotAllowedError')));
		player.load(new Blob(['audio']));
		player.play();
		await vi.waitFor(() => expect(onPlayingChange).toHaveBeenLastCalledWith(false));
	});

	test('stop met en pause, revient au début et signale isPlaying = false', () => {
		player.load(new Blob(['audio']));
		player.play();
		player.stop();
		expect(audio.pause).toHaveBeenCalledTimes(1);
		expect(audio.currentTime).toBe(0);
		expect(onPlayingChange).toHaveBeenLastCalledWith(false);
	});

	test('la fin du morceau (ended) remet isPlaying à false', () => {
		player.load(new Blob(['audio']));
		player.play();
		audio.onended();
		expect(onPlayingChange).toHaveBeenLastCalledWith(false);
	});

	test('charger un nouveau fichier libère l\'URL précédente', () => {
		player.load(new Blob(['a']));
		player.load(new Blob(['b']));
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cassette-a');
	});

	test('la progression suit currentTime / duration pendant la lecture', () => {
		player.load(new Blob(['audio']));
		audio.duration = 200;
		audio.currentTime = 50;
		audio.ontimeupdate();
		expect(onProgress).toHaveBeenLastCalledWith(0.25);
	});

	test('stop ramène la progression à 0 et la fin du morceau la porte à 1', () => {
		player.load(new Blob(['audio']));
		audio.duration = 200;
		audio.onended();
		expect(onProgress).toHaveBeenLastCalledWith(1);
		player.stop();
		expect(onProgress).toHaveBeenLastCalledWith(0);
	});

	test('dispose arrête la lecture et libère l\'URL', () => {
		player.load(new Blob(['audio']));
		player.play();
		player.dispose();
		expect(audio.pause).toHaveBeenCalled();
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cassette-a');
		expect(onPlayingChange).toHaveBeenLastCalledWith(false);
	});
});
