/**
 * Conseils de mix affichés sous le Harmonic Gatekeeper.
 * Aucun conseil tant que le Gate est verrouillé (NO-GO) ou qu'aucune transition n'est calculée.
 * Les règles reprennent la matrice de camelot.js (compatibilityBetween) et le seuil de time-stretch du Gatekeeper (15 %).
 *
 * @param {{ gatekeeper: string, compat: { rule: string, shift: number } | null, timeStretchPercent?: number }} input
 * @returns {{ id: string, tone: 'ok' | 'action' | 'warn', text: string }[]}
 */
export function mixAdvice({ gatekeeper, compat, timeStretchPercent = 0 }) {
  if (gatekeeper !== 'GO' || !compat) return [];

  const advice = [];
  const shift = compat.shift ?? 0;
  const rule = compat.rule;

  if (rule.startsWith('SAME_KEY')) {
    advice.push({ id: 'same-key', tone: 'ok', text: 'Même tonalité : transition idéale.' });
  } else if (rule.startsWith('RELATIVE')) {
    advice.push({ id: 'relative', tone: 'ok', text: 'Relatif majeur/mineur : transition très fluide.' });
  } else if (rule.startsWith('QUINTE')) {
    advice.push({ id: 'quinte', tone: 'ok', text: 'Quinte : forte compatibilité harmonique.' });
  } else if (rule.startsWith('ENERGY_BOOST')) {
    advice.push({ id: 'energy', tone: 'ok', text: 'Boost d\'énergie (+2h) : mix plus énergique, à valider à l\'écoute.' });
  } else if (rule.startsWith('MODULATION')) {
    advice.push({ id: 'modulation', tone: 'warn', text: 'Modulation (+7h) : valider musicalement avant le mix.' });
  }

  if (shift === 0) {
    advice.push({ id: 'mix-direct', tone: 'ok', text: 'Mix direct possible : aucune transposition nécessaire.' });
  } else {
    const signed = `${shift > 0 ? '+' : ''}${shift} st`;
    advice.push({ id: 'pitch', tone: 'action', text: `Appliquer le pitch shift conseillé : ${signed}.` });
  }

  const stretch = Math.abs(timeStretchPercent);
  if (stretch > 15) {
    advice.push({ id: 'warp', tone: 'warn', text: `Warp hazard (${timeStretchPercent.toFixed(1)} %) : corriger le tempo cible (÷2 proposé dans le Gatekeeper).` });
  } else {
    advice.push({ id: 'tempo', tone: 'ok', text: `Time-stretch de ${timeStretchPercent.toFixed(1)} % : sous le seuil de 15 %.` });
  }

  return advice;
}
