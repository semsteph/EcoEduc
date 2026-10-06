// =====================================================================
// Comparaison numérique des réponses d'exercice.
//
// Les tests réels ont montré des réponses justes refusées parce qu'elles
// étaient écrites autrement que le corrigé : « 3x7+8 = 29 », « 12racine2 »,
// « 1,125x10^6 N/C » (pour 1 125 000), « 0,53 mol » (pour 0,526...), et des
// réponses fausses validées (« 0,75 mol/min » pour 0,375 mol/L/min). Ce
// module calcule la valeur finale écrite par l'élève et la compare à celle
// du corrigé, avec une tolérance d'arrondi, puis vérifie l'unité.
// =====================================================================

const SUPERSCRIPTS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };

// Unités reconnues, de la plus longue à la plus courte (forme normalisée).
const UNIT_ALIASES = [
  [/mol\s*(?:\/|\.|·)\s*l(?:\s*(?:\/|\.|·)\s*min|\s*-1\s*(?:\.|·)?\s*min\s*-1)|mol\s*l\s*-1\s*min\s*-1/, 'mol/l/min'],
  [/mol\s*(?:\/|\.|·)\s*l\b|mol\s*\.?\s*l\s*-1|mol\s*l-1/, 'mol/l'],
  [/g\s*(?:\/|\.|·)\s*mol|g\s*\.?\s*mol\s*-1/, 'g/mol'],
  [/g\s*(?:\/|\.|·)\s*l\b|g\s*\.?\s*l\s*-1/, 'g/l'],
  [/mol\s*(?:\/|\.|·)\s*min/, 'mol/min'],
  [/n\s*(?:\/|\.|·)\s*c\b|n\s*\.?\s*c\s*-1|v\s*(?:\/|\.|·)\s*m\b/, 'n/c'],
  [/m\s*(?:\/|\.|·)\s*s\s*(?:2|²|\^2)|m\s*\.?\s*s\s*-2/, 'm/s2'],
  [/m\s*(?:\/|\.|·)\s*s\b|m\s*\.?\s*s\s*-1/, 'm/s'],
  [/km\s*(?:\/|\.|·)\s*h\b|km\s*\.?\s*h\s*-1/, 'km/h'],
  [/rad\s*(?:\/|\.|·)\s*s\b/, 'rad/s'],
  [/(?:cm|centimetres?)\s*(?:2|²|carres?)/, 'cm2'],
  [/(?:mm|millimetres?)\s*(?:2|²|carres?)/, 'mm2'],
  [/(?:km|kilometres?)\s*(?:2|²|carres?)/, 'km2'],
  [/(?:m|metres?)\s*(?:2|²|carres?)/, 'm2'],
  [/(?:cm|centimetres?)\s*(?:3|³|cubes?)/, 'cm3'],
  [/(?:m|metres?)\s*(?:3|³|cubes?)/, 'm3'],
  [/\bml\b|millilitres?/, 'ml'],
  [/\bl\b|litres?/, 'l'],
  [/\bmmol\b/, 'mmol'],
  [/\bmol(?:es?)?\b/, 'mol'],
  [/\bkj\b|kilojoules?/, 'kj'],
  [/\bj\b|joules?/, 'j'],
  [/\bkw\b|kilowatts?/, 'kw'],
  [/\bw\b|watts?/, 'w'],
  [/\bkn\b/, 'kn'],
  [/\bn\b|newtons?/, 'n'],
  [/\bkv\b/, 'kv'],
  [/\bmv\b|millivolts?/, 'mv'],
  [/\bv\b|volts?/, 'v'],
  [/\bma\b|milliamperes?/, 'ma'],
  [/\ba\b|amperes?/, 'a'],
  [/\bohms?\b|Ω/, 'ohm'],
  [/\bhz\b|hertz/, 'hz'],
  [/\bkg\b|kilogrammes?/, 'kg'],
  [/\bmg\b|milligrammes?/, 'mg'],
  [/\bg\b|grammes?/, 'g'],
  [/\bkm\b|kilometres?/, 'km'],
  [/\bcm\b|centimetres?/, 'cm'],
  [/\bmm\b|millimetres?/, 'mm'],
  [/\bm\b|metres?/, 'm'],
  [/\bmin\b|minutes?/, 'min'],
  [/\bms\b|millisecondes?/, 'ms'],
  [/\bh\b|heures?/, 'h'],
  [/\bs\b|secondes?/, 's'],
  [/\brad\b|radians?/, 'rad'],
  [/°\s*c|degres? celsius/, '°c'],
  [/°|degres?/, '°'],
  [/%|pour ?cent/, '%'],
  [/\batp\b/, 'atp'],
  [/\bfcfa\b|\bf\b|francs?/, 'f'],
];

function stripAccents(text) {
  return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Texte de l'élève → expression évaluable (ou null).
function toExpression(raw) {
  let s = stripAccents(raw).toLowerCase();
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => `^(${[...m].map((c) => SUPERSCRIPTS[c]).join('')})`);
  s = s
    .replace(/(\d)\s+(?=\d{3}(?!\d))/g, '$1') // 1 125 000 → 1125000
    .replace(/(\d),(\d)/g, '$1.$2') // virgule décimale
    .replace(/[×·∙]/g, '*')
    .replace(/÷/g, '/')
    .replace(/−|–/g, '-')
    .replace(/\bpi\b|π/g, '(PI)')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/(?:racine(?:\s+carree)?(?:\s+de)?|rac|sqrt|√)\s*(\d+(?:\.\d+)?)/g, 'sqrt($1)')
    .replace(/(\d)\s*e\s*(-?\d+)\b/g, '$1*10^($2)') // 1.2e-5
    .replace(/(\d|\))\s*[x]\s*(?=[\d(s])/g, '$1*') // 3x7, 1,125x10^6
    .replace(/(\d|\))\s*(?=sqrt|\(PI\)|\()/g, '$1*') // 12racine2, 2pi
    .replace(/\^/g, '**');
  // Uniquement nombres, opérateurs, parenthèses, sqrt et PI.
  const cleaned = s.replace(/\s+/g, '');
  if (!cleaned || !/^[\d.+\-*/()]*(?:(?:sqrt|PI)[\d.+\-*/()]*)*$/.test(cleaned.replace(/sqrt|PI/g, ''))) {
    if (!/^[\d.+\-*/()sqrtPI]+$/.test(cleaned)) return null;
  }
  if (!/\d/.test(cleaned)) return null;
  return cleaned.replace(/sqrt/g, 'Math.sqrt').replace(/PI/g, 'Math.PI');
}

function evaluate(expression) {
  if (!expression || expression.length > 120) return null;
  if (!/^[\d.+\-*/()Mathsqrt.PI]+$/.test(expression.replace(/Math\.(sqrt|PI)/g, ''))) return null;
  try {
    // eslint-disable-next-line no-new-func
    const value = Function(`"use strict"; return (${expression});`)();
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch (_) {
    return null;
  }
}

function normaliseUnit(rest) {
  const text = stripAccents(rest).toLowerCase().replace(/[⁻]/g, '-').replace(/¹/g, '1').replace(/²/g, '2').replace(/³/g, '3').trim();
  if (!text) return null;
  for (const [pattern, unit] of UNIT_ALIASES) {
    const match = text.match(pattern);
    if (match && match.index <= 2) return unit;
  }
  return null;
}

// Dernier segment d'un calcul : « x = 3x7+8 = 29 m » → « 29 m » ;
// « ça fait x+5 donc 10 » → « 10 ».
function lastSegment(text) {
  const parts = stripAccents(text).split(/=|≈|~|\b(?:donc|soit|ca fait|ca donne|on trouve|resultat\s*:?)\b/i);
  return parts[parts.length - 1].trim();
}

// Valeur numérique et unité écrites dans une réponse courte.
//   « 2) x = 3x7+8 = 29 m » → { value: 29, unit: 'm' }
//   « 12racine2 »            → { value: 16.97..., unit: null }
// Retourne null si la réponse n'est pas une valeur (texte, plusieurs idées).
function readValue(text) {
  const segment = lastSegment(text).replace(/^(?:donc|soit|alors|environ|a peu pres|reponse\s*:?)\s+/i, '');
  if (!segment) return null;
  // Partie numérique la plus longue en tête, puis l'unité.
  const match = segment.match(/^([-+−]?[\d\s.,×xX*·/^()+\-√πpie⁰¹²³⁴⁵⁶⁷⁸⁹⁻]*(?:racine|rac|sqrt|pi|π)?[\d\s.,×xX*·/^()+\-√⁰¹²³⁴⁵⁶⁷⁸⁹⁻]*)(.*)$/i);
  if (!match) return null;
  let numeric = match[1].trim();
  let rest = match[2].trim();
  // « 3racine2 cm » : la regex peut s'arrêter avant « racine ».
  const extended = segment.match(/^(.*?(?:\d|\)))\s*((?:[a-zA-Zµ°%Ω/·.\-⁻¹²³ ]|\b)*)$/);
  if (extended && toExpression(extended[1])) {
    numeric = extended[1];
    rest = extended[2] || '';
  }
  const expression = toExpression(numeric);
  const value = evaluate(expression);
  if (value === null) return null;
  // Trop de mots après le nombre : ce n'est pas une valeur seule.
  if (rest.split(/\s+/).filter(Boolean).length > 3) return null;
  return { value, unit: normaliseUnit(rest), decimals: (numeric.match(/[.,](\d+)\s*$/)?.[1] || '').length };
}

// Égalité à l'arrondi près : l'élève peut arrondir à son nombre de décimales
// (0,53 pour 0,526...), avec au minimum 1 % de tolérance relative.
function sameValue(student, expected) {
  if (student.value === expected.value) return true;
  const diff = Math.abs(student.value - expected.value);
  const roundingTolerance = student.decimals ? 0.5 * 10 ** -student.decimals + 1e-12 : 0.5;
  const relative = Math.abs(expected.value) * 0.01;
  return diff <= Math.max(Math.min(roundingTolerance, Math.abs(expected.value) * 0.05 || roundingTolerance), relative);
}

// Comparaison d'une réponse à une réponse attendue numérique.
//   'correct'     : même valeur, unité juste (ou non exigée)
//   'missing-unit': même valeur, unité absente alors qu'elle est attendue
//   'wrong-unit'  : même valeur, autre unité
//   'different'   : valeur différente
//   null          : comparaison impossible (réponse ou corrigé non numérique)
function compareNumericAnswer(answer, expectedAnswer) {
  const expected = readValue(expectedAnswer);
  const student = readValue(answer);
  if (!expected || !student) return null;
  if (!sameValue(student, expected)) return 'different';
  if (!expected.unit) return 'correct';
  if (!student.unit) return 'missing-unit';
  return student.unit === expected.unit ? 'correct' : 'wrong-unit';
}

module.exports = { readValue, compareNumericAnswer, toExpression };
