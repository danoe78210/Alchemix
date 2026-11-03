/**
 * Profondeur de bits du fichier source, lue dans son en-tête.
 * WAV (chunk 'fmt ') et FLAC (STREAMINFO). Renvoie null pour les autres formats
 * (MP3 notamment, qui n'a pas de profondeur de bits).
 */
export function detectBitDepth(arrayBuffer) {
	const view = new DataView(arrayBuffer);
	const length = arrayBuffer.byteLength;
	const text = (offset) => String.fromCharCode(...new Uint8Array(arrayBuffer, offset, 4));

	if (length >= 12 && text(0) === 'RIFF' && text(8) === 'WAVE') {
		let offset = 12;
		while (offset + 8 <= length) {
			const id = text(offset);
			const size = view.getUint32(offset + 4, true);
			if (id === 'fmt ') {
				return offset + 24 <= length ? view.getUint16(offset + 22, true) : null;
			}
			offset += 8 + size + (size % 2);
		}
		return null;
	}

	if (length >= 22 && text(0) === 'fLaC') {
		// STREAMINFO (à l'octet 8) : 20 bits de fréquence, 3 de canaux, puis 5 bits de profondeur − 1
		return (((view.getUint8(20) & 1) << 4) | (view.getUint8(21) >> 4)) + 1;
	}

	return null;
}
