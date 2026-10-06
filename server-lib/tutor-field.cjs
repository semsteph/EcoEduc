// =====================================================================
// Terrain de sport (type « field ») pour l'EPS.
//
// En test réel, les questions de placement (zones de 6 m et 7 m au hand,
// rotation au volley, zone de passage du relais, planche d'appel au saut en
// longueur) arrivaient sans schéma, ou avec un terrain illisible. Le
// système dessine lui-même les tracés réglementaires du terrain choisi ; le
// modèle place seulement les joueurs et les déplacements, en pourcentage
// de la longueur et de la largeur du terrain (0 à 100).
// =====================================================================

const SPORTS = ['basketball', 'volleyball', 'handball', 'football', 'relais', 'saut-longueur'];

function text(value, max = 30) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function pct(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 10) / 10)) : null;
}

function point(value) {
  if (Array.isArray(value)) return pct(value[0]) !== null && pct(value[1]) !== null ? [pct(value[0]), pct(value[1])] : null;
  if (value && typeof value === 'object') return pct(value.x) !== null && pct(value.y) !== null ? [pct(value.x), pct(value.y)] : null;
  return null;
}

function sanitiseField(value) {
  if (!value || typeof value !== 'object') return null;
  const sport = text(value.sport, 20).toLowerCase()
    .replace(/^basket$/, 'basketball').replace(/^volley$/, 'volleyball').replace(/^hand$/, 'handball').replace(/^foot$/, 'football')
    .replace(/^(course de )?relais$/, 'relais').replace(/^saut en longueur$/, 'saut-longueur');
  if (!SPORTS.includes(sport)) return null;

  const players = (Array.isArray(value.players) ? value.players : []).slice(0, 14).map((p) => {
    const at = point(p);
    if (!at) return null;
    return { label: text(p.label, 6), x: at[0], y: at[1], team: p.team === 'b' ? 'b' : 'a', highlight: p.highlight === true };
  }).filter(Boolean);

  const arrows = (Array.isArray(value.arrows) ? value.arrows : []).slice(0, 10).map((a) => {
    const from = point(a?.from);
    const to = point(a?.to);
    if (!from || !to) return null;
    return { from, to, kind: a.kind === 'pass' ? 'pass' : 'run', label: text(a.label, 24) };
  }).filter(Boolean);

  const notes = (Array.isArray(value.labels) ? value.labels : []).slice(0, 6).map((l) => {
    const at = point(l);
    return at && text(l.text) ? { text: text(l.text), x: at[0], y: at[1] } : null;
  }).filter(Boolean);

  return {
    type: 'field',
    sport,
    title: text(value.title, 80),
    players,
    arrows,
    labels: notes,
    highlightZone: text(value.highlightZone, 30),
  };
}

module.exports = { sanitiseField, SPORTS };
