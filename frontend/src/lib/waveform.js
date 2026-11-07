/**
 * AlcheMix Studio — Module 1 : préparation de la forme d'onde (micro-tâche M2, alchemix#44).
 *
 * Contrairement à `module2/waveform.js` (`peaks`, crête absolue par bin pour les stems
 * du Module 2), on a besoin ici du min ET du max par colonne pour tracer une forme
 * d'onde fidèle centrée sur l'axe médian, avec marqueurs de changements (M5).
 */

/**
 * Min/max par colonne de `channelData` pour `width` colonnes d'affichage.
 *
 * Retourne un `Float32Array` de `2 * width` : `[min0, max0, min1, max1, ...]`.
 * La colonne `c` couvre les échantillons `[floor(c*n/width), floor((c+1)*n/width))` ;
 * une colonne sans échantillon vaut `(0, 0)`. Invariant : `min <= max` sur chaque colonne.
 *
 * - `width <= 0` ou non fini -> `Float32Array` vide ;
 * - entrée vide ou nulle -> `2 * width` zéros.
 */
export function waveformPeaks(channelData, width) {
  return waveformPeaksMulti([channelData], width);
}

/**
 * Min/max par colonne sur PLUSIEURS canaux (stéréo) : pour chaque colonne, le min
 * est le plus petit échantillon de tous les canaux et le max le plus grand.
 * L'enveloppe globale du signal est ainsi préservée quel que soit le nombre de canaux.
 *
 * - `channels` non tableau -> traité comme un seul canal ;
 * - canaux null/vides ignorés ; tous vides -> `2 * width` zéros ;
 * - `width <= 0` ou non fini -> `Float32Array` vide.
 */
export function waveformPeaksMulti(channels, width) {
  const w = Math.floor(width);
  if (!Number.isFinite(w) || w <= 0) return new Float32Array(0);
  const out = new Float32Array(2 * w);
  const list = (Array.isArray(channels) ? channels : [channels]).filter((c) => c && c.length > 0);
  if (list.length === 0) return out; // 2*w zéros
  const n = list[0].length;
  for (let c = 0; c < w; c++) {
    const start = Math.floor((c * n) / w);
    const end = Math.min(n, Math.max(start + 1, Math.floor(((c + 1) * n) / w)));
    let min = Infinity;
    let max = -Infinity;
    for (const ch of list) {
      const lim = Math.min(end, ch.length);
      for (let i = start; i < lim; i++) {
        const v = ch[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    if (min > max) {
      min = 0;
      max = 0;
    }
    out[2 * c] = min;
    out[2 * c + 1] = max;
  }
  return out;
}

/**
 * Amplitude maximale absolue réellement présente dans `peaks` (sortie de
 * `waveformPeaks`/`waveformPeaksMulti`) : `max(|min|, |max|)` sur toutes les colonnes.
 * C'est la valeur mesurée du signal — utilisée pour l'échelle verticale (pas de
 * normalisation en dur à 1.0). Retourne 0 pour une entrée vide/nulle ou un silence.
 */
export function peakAmplitude(peaks) {
  if (!peaks || peaks.length === 0) return 0;
  let m = 0;
  for (let i = 0; i < peaks.length; i++) {
    const a = Math.abs(peaks[i]);
    if (a > m) m = a;
  }
  return m;
}

/**
 * AlcheMix Studio — Module 1 : marqueurs de changements sur la forme d'onde (M5, alchemix#44).
 *
 * À partir des segments renvoyés par `analyzeSegments`/`analyzeSegmentsSync`
 * (`[{ startS, bpm, confidence, regularity, key, keyConfidence }]`), détecte les changements
 * par rapport au segment précédent :
 * - mode `'rhythm'` (défaut) : tempo arrondi différent -> `{ t, label: '120 → 90 BPM' }` ;
 * - mode `'key'` : clef différente -> `{ t, label: '8B → 10B' }`.
 *
 * `t` = `startS` du segment où le changement démarre. Les valeurs nulles (bpm/clef
 * indéterminés) sont ignorées. Entrée invalide -> `[]`.
 */
export function changeMarkers(segments, mode = 'rhythm') {
  if (!Array.isArray(segments) || segments.length < 2) return [];
  const markers = [];
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1] || {};
    const cur = segments[i] || {};
    const t = typeof cur.startS === 'number' ? cur.startS : 0;
    if (mode === 'key') {
      if (prev.key && cur.key && prev.key !== cur.key) {
        markers.push({ t, label: `${prev.key} → ${cur.key}` });
      }
    } else {
      const pb = typeof prev.bpm === 'number' ? Math.round(prev.bpm) : null;
      const cb = typeof cur.bpm === 'number' ? Math.round(cur.bpm) : null;
      if (pb !== null && cb !== null && pb !== cb) {
        markers.push({ t, label: `${pb} → ${cb} BPM` });
      }
    }
  }
  return markers;
}
