/**
 * AlcheMix Studio — Module 1 : préparation de la forme d'onde (micro-tâche M2, alchemix#44).
 *
 * Contrairement à `module2/waveform.js` (`peaks`, crête absolue par bin pour les stems
 * du Module 2), on a besoin ici du min ET du max par colonne pour tracer une forme
 * d'onde fidèle centrée sur l'axe médian, avec marqueurs de changements (M5).
 */

/** Marge verticale symétrique par défaut : 8 % de la HAUTEUR TOTALE en haut et 8 % en bas (plage requise 5–10 % par côté). */
export const WAVEFORM_MARGIN_RATIO = 0.08;

/**
 * Seuil (en échantillons par colonne et par canal) séparant la vue microscopique
 * (oscillation individuelle, <= 256 éch. ≈ 5,8 ms à 44,1 kHz) de la vue macroscopique
 * (enveloppe multi-cycles d'un morceau complet, > 256 éch.).
 */
const MACRO_COLUMN_THRESHOLD = 256;

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
export function waveformPeaks(channelData, width, startRatio = 0, endRatio = 1) {
  return waveformPeaksMulti([channelData], width, startRatio, endRatio);
}

/**
 * Extraction fidèle des amplitudes négatives et positives par colonne sur un ou
 * plusieurs canaux (mono, stéréo, multicanal), avec support optionnel de fenêtre
 * temporelle `[startRatio, endRatio]` (zoom).
 *
 * - À l'échelle microscopique (`<= 256` échantillons/colonne), conserve le min et le max
 *   exacts échantillon par échantillon sur l'ensemble des canaux.
 * - À l'échelle macroscopique (`> 256` échantillons/colonne, ex. piste complète où chaque
 *   colonne couvre 10 à 250 ms), combine de façon strictement linéaire (`f(α·x) = α·f(x)`) :
 *   1. la moyenne demi-onde négative et positive intégrée sur 100 % des échantillons de la
 *      colonne (65 %), qui restitue fidèlement la dynamique globale (intros, couplets,
 *      refrains, creux entre les temps, fondus) sans être saturée par les micro-pics ;
 *   2. la crête de moyenne quadratique (RMS) des sous-fenêtres acoustiques (~10–20 ms) de
 *      la colonne (35 %), qui restitue distinctement toutes les attaques transitoires
 *      (batterie, caisse claire, transitoires rythmiques).
 *
 * - `channels` non tableau -> traité comme un seul canal ;
 * - canaux null/vides ignorés ; tous vides -> `2 * width` zéros ;
 * - `width <= 0` ou non fini -> `Float32Array` vide.
 */
export function waveformPeaksMulti(channels, width, startRatio = 0, endRatio = 1) {
  const w = Math.floor(width);
  if (!Number.isFinite(w) || w <= 0) return new Float32Array(0);
  const out = new Float32Array(2 * w);
  const list = (Array.isArray(channels) ? channels : [channels]).filter((c) => c && c.length > 0);
  if (list.length === 0) return out; // 2*w zéros

  // Longueur maximale parmi les canaux (supporte des fréquences / durées quelconques)
  let totalLen = 0;
  for (const ch of list) {
    if (ch.length > totalLen) totalLen = ch.length;
  }
  if (totalLen === 0) return out;

  const r0 = Number.isFinite(startRatio) ? Math.max(0, Math.min(1, startRatio)) : 0;
  const r1 = Number.isFinite(endRatio) ? Math.max(r0, Math.min(1, endRatio)) : 1;
  const winOffset = Math.floor(r0 * totalLen);
  const winSpan = Math.max(1, Math.floor((r1 - r0) * totalLen));

  for (let c = 0; c < w; c++) {
    const start = winOffset + Math.floor((c * winSpan) / w);
    const end = Math.min(totalLen, Math.max(start + 1, winOffset + Math.floor(((c + 1) * winSpan) / w)));
    const colSamples = end - start;

    if (colSamples <= MACRO_COLUMN_THRESHOLD) {
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
      continue;
    }

    // Vue macroscopique : intégration sur 100 % des échantillons de la colonne + crête par sous-fenêtre
    const subWinSize = Math.max(64, Math.min(1024, Math.floor(colSamples / 8)));
    let crestMin = Infinity;
    let crestMax = -Infinity;
    let colSumNeg = 0;
    let colSumPos = 0;
    let colNegCount = 0;
    let colPosCount = 0;
    let colTotalCount = 0;
    let colRawMin = Infinity;
    let colRawMax = -Infinity;

    for (let ws = start; ws < end; ws += subWinSize) {
      const we = Math.min(end, ws + subWinSize);
      let sumNegSq = 0;
      let sumPosSq = 0;
      let negCount = 0;
      let posCount = 0;
      let totalCount = 0;
      let wMin = Infinity;
      let wMax = -Infinity;

      for (const ch of list) {
        const lim = Math.min(we, ch.length);
        for (let i = ws; i < lim; i++) {
          const v = ch[i];
          if (v < wMin) wMin = v;
          if (v > wMax) wMax = v;
          if (v < colRawMin) colRawMin = v;
          if (v > colRawMax) colRawMax = v;
          if (v < 0) {
            sumNegSq += v * v;
            negCount++;
            colSumNeg += v;
            colNegCount++;
          } else if (v > 0) {
            sumPosSq += v * v;
            posCount++;
            colSumPos += v;
            colPosCount++;
          }
          totalCount++;
          colTotalCount++;
        }
      }

      if (totalCount === 0 || wMin > wMax) continue;

      const subMin =
        negCount > 0 ? -Math.sqrt(sumNegSq / totalCount) : posCount > 0 ? wMin : 0;
      const subMax =
        posCount > 0 ? Math.sqrt(sumPosSq / totalCount) : negCount > 0 ? wMax : 0;

      if (subMin < crestMin) crestMin = subMin;
      if (subMax > crestMax) crestMax = subMax;
    }

    if (colTotalCount === 0 || crestMin > crestMax) {
      out[2 * c] = 0;
      out[2 * c + 1] = 0;
      continue;
    }

    const meanMin =
      colNegCount > 0 ? colSumNeg / colTotalCount : colPosCount > 0 ? colRawMin : 0;
    const meanMax =
      colPosCount > 0 ? colSumPos / colTotalCount : colNegCount > 0 ? colRawMax : 0;

    // Combinaison linéaire convexe : 65 % corps demi-onde moyen + 35 % crête transitoire
    const finalMin = 0.65 * meanMin + 0.35 * crestMin;
    const finalMax = 0.65 * meanMax + 0.35 * crestMax;
    out[2 * c] = Math.min(finalMin, finalMax);
    out[2 * c + 1] = Math.max(finalMin, finalMax);
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
 * Convertit le tableau d'amplitudes entrelacées `peaks` (`[min0, max0, ...]`) en
 * coordonnées verticales et horizontales de dessin (pixels) pour un canevas de
 * dimensions `width × height`.
 *
 * Garanties :
 * - Centrage exact sur l'axe horizontal médian `mid = height / 2`.
 * - Échelle verticale globale linéaire `scale = usableHalfHeight / refPeak` où
 *   `marginPx = height * marginRatio` (marge exprimée en % de la hauteur TOTALE
 *   du canevas, appliquée en haut ET en bas — défaut 8 % par côté, plage 5–10 %) et
 *   `usableHalfHeight = mid - marginPx`.
 * - Aucun écrêtage (clamping) : les coordonnées `yTop = mid - max * scale` et
 *   `yBot = mid - min * scale` sont strictement proportionnelles aux amplitudes ;
 *   les crêtes globales restent strictement dans `[marginPx, height - marginPx]`.
 * - Adaptation automatique à la largeur disponible : si `cols > width`, regroupe les
 *   colonnes par pixel horizontal pour éviter tout recouvrement en bloc.
 */
export function computeWaveformBars(peaks, width, height, options = {}) {
  const w = Math.floor(width);
  const h = Math.floor(height);
  const rawMargin =
    typeof options.marginRatio === 'number' && Number.isFinite(options.marginRatio)
      ? options.marginRatio
      : WAVEFORM_MARGIN_RATIO;
  const marginRatio = Math.max(0.05, Math.min(0.25, rawMargin));

  if (!peaks || peaks.length < 2 || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return {
      width: Math.max(0, w || 0),
      height: Math.max(0, h || 0),
      mid: h > 0 ? h / 2 : 0,
      marginRatio,
      marginPx: 0,
      usableHalfHeight: 0,
      peak: 0,
      scale: 0,
      bars: []
    };
  }

  const cols = Math.floor(peaks.length / 2);
  const mid = h / 2;
  const marginPx = h * marginRatio; // marge par côté en % de la hauteur totale (ex. 8 % de 320 px = 25,6 px)
  const usableHalfHeight = mid - marginPx;
  const measuredPeak = peakAmplitude(peaks);
  const refPeak =
    typeof options.referencePeak === 'number' &&
    Number.isFinite(options.referencePeak) &&
    options.referencePeak > 0
      ? Math.max(options.referencePeak, measuredPeak)
      : measuredPeak;
  const scale = refPeak > 0 ? usableHalfHeight / refPeak : 0;

  const bars = [];
  if (cols <= w) {
    const step = w / cols;
    const barWidth = step >= 2 ? Math.max(1, step - 0.75) : Math.max(0.75, step * 0.85);
    for (let c = 0; c < cols; c++) {
      const min = peaks[2 * c];
      const max = peaks[2 * c + 1];
      const yTop = mid - max * scale;
      const yBot = mid - min * scale;
      const coreTop = mid - max * scale * 0.62;
      const coreBot = mid - min * scale * 0.62;
      bars.push({
        x: c * step,
        width: barWidth,
        min,
        max,
        yTop,
        yBot,
        height: Math.max(1, yBot - yTop),
        coreTop,
        coreBot,
        coreHeight: Math.max(1, coreBot - coreTop)
      });
    }
  } else {
    // Plus de colonnes que de pixels horizontaux : agrégation par pixel d'affichage
    for (let px = 0; px < w; px++) {
      const cStart = Math.floor((px * cols) / w);
      const cEnd = Math.min(cols, Math.max(cStart + 1, Math.floor(((px + 1) * cols) / w)));
      let min = Infinity;
      let max = -Infinity;
      for (let c = cStart; c < cEnd; c++) {
        const mn = peaks[2 * c];
        const mx = peaks[2 * c + 1];
        if (mn < min) min = mn;
        if (mx > max) max = mx;
      }
      if (min > max) {
        min = 0;
        max = 0;
      }
      const yTop = mid - max * scale;
      const yBot = mid - min * scale;
      const coreTop = mid - max * scale * 0.62;
      const coreBot = mid - min * scale * 0.62;
      bars.push({
        x: px,
        width: 0.85,
        min,
        max,
        yTop,
        yBot,
        height: Math.max(1, yBot - yTop),
        coreTop,
        coreBot,
        coreHeight: Math.max(1, coreBot - coreTop)
      });
    }
  }

  return {
    width: w,
    height: h,
    mid,
    marginRatio,
    marginPx,
    usableHalfHeight,
    peak: refPeak,
    scale,
    bars
  };
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
