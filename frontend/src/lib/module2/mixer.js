/**
 * Mixage des stems en Web Audio (T015) : lecture par stem, gain, mute et solo (FR-013, FR-014).
 */

/** Gain effectif d'un stem : coupé s'il est muet, ou si un autre stem est en solo. */
export function effectiveGain({ volume, muted, soloed, anySolo }) {
	if (muted) return 0;
	if (anySolo && !soloed) return 0;
	return volume;
}

/** Crête et RMS des échantillons courants d'un analyseur (valeurs de 0 à 1). */
function readLevel(analyser) {
	const data = new Float32Array(analyser.fftSize);
	analyser.getFloatTimeDomainData(data);
	let peak = 0;
	let sum = 0;
	for (const x of data) {
		peak = Math.max(peak, Math.abs(x));
		sum += x * x;
	}
	return { peak, rms: Math.sqrt(sum / data.length) };
}

export class StemMixer {
	#ctx;
	#analyser;
	#onEnded;
	#stems = new Map();
	// Transport partagé : tous les stems jouent à la même position (curseur commun).
	#offset = 0;
	#startedAt = 0;
	#playing = new Set();

	/** `onEnded(stem)` est appelé quand un stem atteint la fin de son buffer. */
	constructor(audioContext, onEnded = null) {
		this.#ctx = audioContext;
		this.#onEnded = onEnded;
		this.#analyser = audioContext.createAnalyser();
		this.#analyser.connect(audioContext.destination);
	}

	/** Enregistre le buffer audio d'un stem : gain, puis analyseur propre au stem, puis sortie mesurée. */
	load(stem, buffer) {
		const gain = this.#ctx.createGain();
		const analyser = this.#ctx.createAnalyser();
		gain.connect(analyser);
		analyser.connect(this.#analyser);
		this.#stems.set(stem, { buffer, gain, analyser, source: null, volume: 1, muted: false, soloed: false });
	}

	/** Niveau de sortie générale : crête et RMS des échantillons courants (valeurs de 0 à 1). */
	level() {
		return readLevel(this.#analyser);
	}

	/** Niveau d'un stem avant mélange (VU-mètre). Un stem inconnu donne un niveau nul. */
	stemLevel(stem) {
		const s = this.#stems.get(stem);
		return s ? readLevel(s.analyser) : { peak: 0, rms: 0 };
	}

	/** Position du transport en secondes : avance avec l'horloge tant qu'au moins un stem joue. */
	position() {
		return this.#playing.size > 0 ? this.#offset + (this.#ctx.currentTime - this.#startedAt) : this.#offset;
	}

	/** Durée du plus long stem chargé, en secondes. */
	duration() {
		let d = 0;
		for (const s of this.#stems.values()) d = Math.max(d, s.buffer?.duration ?? 0);
		return d;
	}

	/** Déplace le transport, en redémarrant à cet endroit les stems en cours de lecture. */
	seek(seconds) {
		const playing = [...this.#playing];
		for (const stem of playing) this.#stopSource(stem);
		this.#offset = seconds;
		this.#startedAt = this.#ctx.currentTime;
		for (const stem of playing) this.#startSource(stem);
	}

	/** Lance ou met en pause un stem. Un stem lancé rejoint la position partagée du transport. */
	setPlaying(stem, playing) {
		const s = this.#stems.get(stem);
		if (!s) return;
		if (playing && !s.source) {
			if (this.#playing.size === 0) this.#startedAt = this.#ctx.currentTime;
			this.#startSource(stem);
		} else if (!playing && s.source) {
			const pos = this.position();
			this.#stopSource(stem);
			// Dernier stem en lecture : la position partagée est figée pour la reprise.
			if (this.#playing.size === 0) {
				this.#offset = s.buffer?.duration ? pos % s.buffer.duration : pos;
			}
		}
	}

	setVolume(stem, volume) {
		this.#update(stem, { volume });
	}

	setMuted(stem, muted) {
		this.#update(stem, { muted });
	}

	setSolo(stem, soloed) {
		this.#update(stem, { soloed });
	}

	gainOf(stem) {
		return this.#stems.get(stem).gain.gain.value;
	}

	#startSource(stem) {
		const s = this.#stems.get(stem);
		const source = this.#ctx.createBufferSource();
		source.buffer = s.buffer;
		source.connect(s.gain);
		source.start(0, this.position());
		s.source = source;
		this.#playing.add(stem);
		source.onended = () => {
			if (s.source !== source) return;
			s.source = null;
			this.#playing.delete(stem);
			if (this.#playing.size === 0) this.#offset = 0;
			this.#onEnded?.(stem);
		};
	}

	#stopSource(stem) {
		const s = this.#stems.get(stem);
		const source = s.source;
		// Neutralise le onended de la source avant l'arrêt volontaire.
		s.source = null;
		this.#playing.delete(stem);
		source.stop();
	}

	#update(stem, patch) {
		const s = this.#stems.get(stem);
		if (!s) return;
		Object.assign(s, patch);
		const anySolo = [...this.#stems.values()].some((x) => x.soloed);
		for (const x of this.#stems.values()) {
			x.gain.gain.value = effectiveGain({ volume: x.volume, muted: x.muted, soloed: x.soloed, anySolo });
		}
	}
}
