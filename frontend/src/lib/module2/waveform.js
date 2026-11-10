/**
 * Formes d'onde des stems (Module 2) : crête dynamique par tranche de l'échantillon.
 *
 * - À l'échelle microscopique (<= 64 échantillons par tranche), conserve le max exact |v|.
 * - À l'échelle macroscopique (> 64 échantillons par tranche), découpe la tranche en
 *   sous-fenêtres acoustiques (~10–20 ms), calcule la moyenne quadratique (RMS) dans
 *   chacune sur 100 % des échantillons, et retient le max des sous-fenêtres afin de
 *   préserver les attaques (batterie, basse) tout en évitant l'effet de bloc rectangulaire.
 */
const MACRO_BIN_THRESHOLD = 256;

/**
 * Paramètres de chunking pour le pipeline de séparation (spécification Module 2).
 * - Chunk duration: 8 secondes (8000 ms)
 * - Overlap: 87.5% (1 seconde de pas / hop = 1000 ms)
 * - 4 stems: voix, batterie, basse, autres
 */
export const CHUNK_CONFIG = {
  /** Durée d'un chunk en secondes */
  chunkDurationSec: 8.0,
  /** Pas entre les chunks en secondes (recouvrement 87.5%) */
  hopDurationSec: 1.0,
  /** Nombre de stems attendues */
  stemCount: 4,
  /** Noms des stems (ordre standard) */
  stemNames: ['vocals', 'drums', 'bass', 'other'],
};

/**
 * Calcule les positions de début de chaque chunk pour une durée totale donnée.
 *
 * @param totalDurationSec - Durée totale de l'audio en secondes
 * @param sampleRate - Taux d'échantillonnage (par défaut 44100 Hz)
 * @returns Tableau des positions de début en échantillons
 */
export function computeChunkStarts(totalDurationSec, sampleRate = 44100) {
  const chunkSamples = Math.floor(CHUNK_CONFIG.chunkDurationSec * sampleRate);
  const hopSamples = Math.floor(CHUNK_CONFIG.hopDurationSec * sampleRate);
  const totalSamples = Math.floor(totalDurationSec * sampleRate);

  const starts = [];
  for (let pos = 0; pos < totalSamples; pos += hopSamples) {
    if (pos + chunkSamples <= totalSamples) {
      starts.push(pos);
    } else {
      // Dernier chunk : on prend la fin si on a assez de données
      if (pos < totalSamples) {
        starts.push(Math.max(0, totalSamples - chunkSamples));
      }
      break;
    }
  }
  return starts;
}

/**
 * Découpe un signal audio mono en chunks de 8s avec recouvrement 87.5%.
 *
 * @param channelData - Float32Array mono (un canal)
 * @param sampleRate - Taux d'échantillonnage
 * @returns Tableau de chunks, chacun étant un Float32Array de 8s
 */
export function chunkAudio(channelData, sampleRate = 44100) {
  if (!channelData || channelData.length === 0) {
    return [];
  }

  const totalDurationSec = channelData.length / sampleRate;
  const chunkStarts = computeChunkStarts(totalDurationSec, sampleRate);
  const chunkSamples = Math.floor(CHUNK_CONFIG.chunkDurationSec * sampleRate);

  const chunks = [];
  for (const start of chunkStarts) {
    const end = Math.min(start + chunkSamples, channelData.length);
    const chunk = channelData.slice(start, end);

    // Padding si le dernier chunk est trop court
    if (chunk.length < chunkSamples) {
      const padded = new Float32Array(chunkSamples);
      padded.set(chunk);
      chunks.push(padded);
    } else {
      chunks.push(chunk);
    }
  }

  return chunks;
}

/**
 * Découpe un signal audio stéréo/multicanal en chunks pour chaque stem.
 * Retourne un objet avec 4 tableaux de chunks (un par stem).
 *
 * @param channels - Array de Float32Array (stéréo = 2 canaux, mono = 1)
 * @param sampleRate - Taux d'échantillonnage
 * @returns Objet { vocals: Float32Array[], drums: Float32Array[], bass: Float32Array[], other: Float32Array[] }
 */
export function chunkAudioForStems(channels, sampleRate = 44100) {
  const monoChannel = channels && channels.length > 0 ? channels[0] : null;
  if (!monoChannel || monoChannel.length === 0) {
    return {
      vocals: [],
      drums: [],
      bass: [],
      other: [],
    };
  }

  const chunks = chunkAudio(monoChannel, sampleRate);

  // Pour l'instant, on duplique les chunks pour chaque stem
  // L'assignation réelle aux stems se fera après l'inférence
  return {
    vocals: chunks.map(c => new Float32Array(c)),
    drums: chunks.map(c => new Float32Array(c)),
    bass: chunks.map(c => new Float32Array(c)),
    other: chunks.map(c => new Float32Array(c)),
  };
}

/**
 * Reconstitue le signal complet à partir des chunks traités (avec fenêtre de recollage linéaire).
 *
 * @param stemChunks - Tableau de chunks traités pour un stem
 * @param originalLength - Longueur originale en échantillons
 * @param sampleRate - Taux d'échantillonnage
 * @returns Float32Array reconstitué
 */
export function reconstructFromChunks(stemChunks, originalLength, sampleRate = 44100) {
  if (!stemChunks || stemChunks.length === 0) {
    return new Float32Array(originalLength);
  }

  const chunkSamples = Math.floor(CHUNK_CONFIG.chunkDurationSec * sampleRate);
  const hopSamples = Math.floor(CHUNK_CONFIG.hopDurationSec * sampleRate);

  const output = new Float32Array(originalLength);
  const weightSum = new Float32Array(originalLength);

  for (let i = 0; i < stemChunks.length; i++) {
    const chunk = stemChunks[i];
    const start = i * hopSamples;
    const end = Math.min(start + chunkSamples, originalLength);
    const validLen = end - start;

    // Fenêtre linéaire : fade-in/fade-out sur la zone de recouvrement
    for (let j = 0; j < validLen; j++) {
      const pos = start + j;
      let weight = 1.0;

      // Zone de recouvrement au début (sauf premier chunk)
      if (i > 0 && j < hopSamples) {
        weight = j / hopSamples; // fade-in
      }
      // Zone de recouvrement à la fin (sauf dernier chunk)
      if (i < stemChunks.length - 1 && j >= chunkSamples - hopSamples) {
        weight = (chunkSamples - j) / hopSamples; // fade-out
      }

      output[pos] += chunk[j] * weight;
      weightSum[pos] += weight;
    }
  }

  // Normalisation par la somme des poids
  for (let i = 0; i < originalLength; i++) {
    if (weightSum[i] > 0) {
      output[i] /= weightSum[i];
    }
  }

  return output;
}

/** Crête de `bins` tranches de `samples` ; chaque échantillon appartient à au moins une tranche. */
export function peaks(samples, bins) {
	const count = Math.floor(bins);
	if (!Number.isFinite(count) || count <= 0) return new Float32Array(0);
	const out = new Float32Array(count);
	if (!samples || samples.length === 0) return out;
	const size = samples.length / count;
	for (let b = 0; b < count; b++) {
		const start = Math.floor(b * size);
		const end = Math.min(samples.length, Math.max(start + 1, Math.ceil((b + 1) * size)));
		const len = end - start;
		if (len <= MACRO_BIN_THRESHOLD) {
			let peak = 0;
			for (let i = start; i < end; i++) {
				const a = Math.abs(samples[i]);
				if (a > peak) peak = a;
			}
			out[b] = peak;
			continue;
		}
		const subWin = Math.max(64, Math.min(1024, Math.floor(len / 8)));
		let binPeak = 0;
		let sumAbs = 0;
		for (let ws = start; ws < end; ws += subWin) {
			const we = Math.min(end, ws + subWin);
			let sumSq = 0;
			for (let i = ws; i < we; i++) {
				const v = Math.abs(samples[i]);
				sumAbs += v;
				sumSq += v * v;
			}
			const rms = Math.sqrt(sumSq / (we - ws));
			if (rms > binPeak) binPeak = rms;
		}
		const meanAbs = sumAbs / len;
		out[b] = 0.65 * meanAbs + 0.35 * binPeak;
	}
	return out;
}

/** Amplitude maximale présente dans un tableau de crêtes de stem (0 si silence/vide). */
export function stemPeakAmplitude(peakArray) {
	if (!peakArray || peakArray.length === 0) return 0;
	let m = 0;
	for (let i = 0; i < peakArray.length; i++) {
		const a = Math.abs(peakArray[i]);
		if (a > m) m = a;
	}
	return m;
}
