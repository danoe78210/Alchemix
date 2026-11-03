/**
 * AlcheMix Studio — Données partagées de la roue de Camelot (24 tonalités).
 *
 * Utilisé par CamelotWheel.svelte (rendu de la roue, notation, surlignages)
 * et CamelotCompatibility.svelte (panneau d'information harmonique + badges).
 *
 * Anneau extérieur = tonalités majeures (codes B : 1B-12B)
 * Anneau intérieur = tonalités mineures (codes A : 1A-12A)
 */

export const CAMELOT_KEYS = [
  { num: 1, codeA: '1A', codeB: '1B', minorEn: 'Abm', majorEn: 'B' },
  { num: 2, codeA: '2A', codeB: '2B', minorEn: 'Ebm', majorEn: 'F#' },
  { num: 3, codeA: '3A', codeB: '3B', minorEn: 'Bbm', majorEn: 'Db' },
  { num: 4, codeA: '4A', codeB: '4B', minorEn: 'Fm', majorEn: 'Ab' },
  { num: 5, codeA: '5A', codeB: '5B', minorEn: 'Cm', majorEn: 'Eb' },
  { num: 6, codeA: '6A', codeB: '6B', minorEn: 'Gm', majorEn: 'Bb' },
  { num: 7, codeA: '7A', codeB: '7B', minorEn: 'Dm', majorEn: 'F' },
  { num: 8, codeA: '8A', codeB: '8B', minorEn: 'Am', majorEn: 'C' },
  { num: 9, codeA: '9A', codeB: '9B', minorEn: 'Em', majorEn: 'G' },
  { num: 10, codeA: '10A', codeB: '10B', minorEn: 'Bm', majorEn: 'D' },
  { num: 11, codeA: '11A', codeB: '11B', minorEn: 'F#m', majorEn: 'A' },
  { num: 12, codeA: '12A', codeB: '12B', minorEn: 'C#m', majorEn: 'E' }
];

/** Nom français des 12 notes à partir du nom anglais (C, F#, Bb, ...) */
const FRENCH_NOTES = {
  C: 'Do', 'C#': 'Do#', Db: 'Ré♭', D: 'Ré', 'D#': 'Ré#', Eb: 'Mi♭',
  E: 'Mi', F: 'Fa', 'F#': 'Fa#', Gb: 'Sol♭', G: 'Sol', 'G#': 'Sol#',
  Ab: 'La♭', A: 'La', 'A#': 'La#', Bb: 'Si♭', B: 'Si'
};

/** Extrait la racine anglaise d'un nom comme "Am" / "F#m" / "C" */
function rootOf(nameEn) {
  return String(nameEn || '').replace(/m$/, '');
}

export function frenchNote(nameEn) {
  return FRENCH_NOTES[rootOf(nameEn)] ?? rootOf(nameEn);
}

/** "8B" -> { num: 8, letter: 'B' } ; valeurs invalides -> null */
export function parseCode(code) {
  const m = /^(\d{1,2})([AB])$/.exec(String(code || '').trim());
  if (!m) return null;
  const num = parseInt(m[1], 10);
  if (num < 1 || num > 12) return null;
  return { num, letter: m[2] };
}

export function codeFor(num, letter) {
  const n = ((num - 1) % 12 + 12) % 12 + 1; // wrap 1..12
  return `${n}${letter}`;
}

function entryFor(code) {
  const p = parseCode(code);
  if (!p) return null;
  return CAMELOT_KEYS.find((k) => k.num === p.num) ?? null;
}

/**
 * Informations complètes d'une tonalité.
 * Exemple pour '8B' :
 *   { code: '8B', isMinor: false, noteEn: 'C', noteFr: 'Do',
 *     fullName: 'Do majeur (C)', relativeCode: '8A',
 *     relativeName: 'La mineur (A min)' }
 */
export function keyInfo(code) {
  const p = parseCode(code);
  const entry = entryFor(code);
  if (!p || !entry) return null;
  const isMinor = p.letter === 'A';
  const nameEn = isMinor ? entry.minorEn : entry.majorEn;
  const root = rootOf(nameEn);
  const noteFr = frenchNote(nameEn);
  const quality = isMinor ? 'mineur' : 'majeur';
  const relativeCode = codeFor(p.num, isMinor ? 'B' : 'A');
  const relIsMinor = !isMinor;
  const relEntry = entry; // même numéro, lettre opposée
  const relNameEn = relIsMinor ? relEntry.minorEn : relEntry.majorEn;
  const relRoot = rootOf(relNameEn);
  const relativeName = `${frenchNote(relNameEn)} ${relIsMinor ? 'mineur' : 'majeur'} (${relRoot}${relIsMinor ? ' min' : ''})`;
  return {
    code,
    num: p.num,
    letter: p.letter,
    isMinor,
    noteEn: root,
    noteFr,
    fullName: `${noteFr} ${quality} (${root})`,
    relativeCode,
    relativeName
  };
}

/**
 * Les 4 transitions harmoniques directes (compatibles) d'une tonalité,
 * conformes à l'exemple de référence : 8B (Do majeur) ->
 *   [Sol (G) = 9B, Fa (F) = 7B, La min (A min) = 8A, Mi min (E min) = 5A]
 * Règle : +1h et -1h sur le même anneau, relative A<->B (même numéro),
 * et ±3 sur l'anneau opposé (mineur de la dominante pour une majeure,
 * majeure parallèle pour une mineure).
 */
export function compatibleCodes(code) {
  const p = parseCode(code);
  if (!p) return [];
  const other = p.letter === 'A' ? 'B' : 'A';
  const third = p.letter === 'A' ? p.num + 3 : p.num - 3; // wrap via codeFor
  return [codeFor(p.num + 1, p.letter), codeFor(p.num - 1, p.letter), codeFor(p.num, other), codeFor(third, other)];
}

/** Libellé court d'un badge de transition : "Sol (G)" ou "La min (A min)" */
export function badgeLabel(code) {
  const info = keyInfo(code);
  if (!info) return String(code);
  return info.isMinor ? `${info.noteFr} min (${info.noteEn} min)` : `${info.noteFr} (${info.noteEn})`;
}

/** Classe de hauteur (0 = Do ... 11 = Si) d'un nom de note anglais ("C#", "Bb", ...) */
export const NOTE_PC = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11
};

/**
 * Normalise une saisie utilisateur en code Camelot valide (1A-12B).
 * Accepte :
 *   - un code Camelot direct : "8B", "12a" -> "12A"
 *   - une clé musicale : "C#m", "C# minor", "Db major", "Am", "F# min", "Bb"
 * Retourne null si la saisie n'est pas reconnue.
 */
export function camelotFromKeyName(input) {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;
  const asCode = parseCode(s.toUpperCase());
  if (asCode) return s.toUpperCase();
  const m = /^([A-Ga-g])\s*([#b♯♭]?)\s*(m|min|minor|maj|major)?$/i.exec(s);
  if (!m) return null;
  let pc = NOTE_PC[m[1].toUpperCase()];
  if (pc === undefined) return null;
  const acc = m[2];
  if (acc === '#' || acc === '♯') pc += 1;
  if (acc === 'b' || acc === '♭') pc -= 1;
  pc = ((pc % 12) + 12) % 12;
  const minor = /^(m|min|minor)$/i.test(m[3] || '');
  for (const k of CAMELOT_KEYS) {
    if (!minor && NOTE_PC[rootOf(k.majorEn)] === pc) return k.codeB;
    if (minor && NOTE_PC[rootOf(k.minorEn)] === pc) return k.codeA;
  }
  return null;
}

/**
 * Score de consonance entre deux clés Camelot (matrice de référence du projet) :
 *   même code            -> SAME_KEY (0h)      100/100  GO
 *   même n°, A <-> B     -> RELATIVE           95/100   GO
 *   ±1h (même anneau)    -> QUINTE             90/100   GO
 *   ±2h (même anneau)    -> ENERGY_BOOST       80/100   GO
 *   ±7h (même anneau)    -> MODULATION         75/100   GO
 *   autre écart          -> DISSONANT          55/100   NO-GO (seuil 60 %)
 * Exemple : 12B ➔ 12B = SAME_KEY, 100 % de consonance.
 */
export function compatibilityBetween(keyA, keyB) {
  const a = parseCode(keyA);
  const b = parseCode(keyB);
  if (!a || !b) {
    return { score: 0, rule: 'CLÉ INVALIDE', status: 'GATE_LOCKED', shift: 0 };
  }
  if (String(keyA) === String(keyB)) {
    return { score: 100, rule: 'SAME_KEY (0h)', status: 'GATE_UNLOCKED', shift: 0 };
  }
  if (a.num === b.num) {
    return { score: 95, rule: 'RELATIVE (A↔B)', status: 'GATE_UNLOCKED', shift: 0 };
  }
  let hours;
  if (a.letter === b.letter) {
    const d = Math.abs(a.num - b.num);
    hours = d === 5 || d === 7 ? 7 : Math.min(d, 12 - d);
  } else {
    const posA = (a.num - 1) * 2 + (a.letter === 'B' ? 1 : 0);
    const posB = (b.num - 1) * 2 + (b.letter === 'B' ? 1 : 0);
    const d = Math.abs(posA - posB);
    hours = Math.min(d, 24 - d);
  }
  if (hours === 1) return { score: 90, rule: 'QUINTE (±1h)', status: 'GATE_UNLOCKED', shift: 0 };
  if (hours === 2) return { score: 80, rule: 'ENERGY_BOOST (+2h)', status: 'GATE_UNLOCKED', shift: -2 };
  if (hours === 7) return { score: 75, rule: 'MODULATION (+7h)', status: 'GATE_UNLOCKED', shift: 1 };
  return { score: 55, rule: 'DISSONANT', status: 'GATE_LOCKED', shift: 3 };
}
