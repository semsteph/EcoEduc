// =====================================================================
// Graphique mathématique (type « graph ») : repère, courbes, tangentes,
// aires, points, segments, vecteurs, cercles, angles.
//
// Les tests réels ont montré des figures dessinées « à main levée » fausses
// (point hors de la courbe, tangente qui recoupe la courbe, angle de 45°
// dessiné pour 60°, repère vide). Ici le modèle ne dessine rien : il donne
// des DONNÉES (une expression, des coordonnées, un angle, une norme) et le
// serveur calcule toutes les positions. Une tangente touche donc la
// courbe, un point « sur la courbe » y est, un angle mesure ce qu'il annonce.
// =====================================================================

const MAX_ITEMS = 12;
const SAMPLES = 160;

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function text(value, max = 40) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

// ---------------------------------------------------------------------
// Expression f(x) écrite par le modèle → fonction JavaScript sûre.
// Seuls x, nombres, + - * / ^, parenthèses et fonctions usuelles.
// ---------------------------------------------------------------------
const FUNCTIONS = {
  sqrt: 'Math.sqrt', racine: 'Math.sqrt', exp: 'Math.exp', ln: 'Math.log', log: 'Math.log10',
  sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', abs: 'Math.abs',
};

function compileExpression(raw) {
  let s = text(raw, 120).toLowerCase().replace(/\s+/g, '');
  if (!s) return null;
  s = s.replace(/^(?:f\(x\)|y)=/, '').replace(/,/g, '.').replace(/×|·/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
    .replace(/²/g, '^2').replace(/³/g, '^3').replace(/π|\bpi\b/g, '(PI)');
  // Multiplications implicites : 2x, 3(x+1), x(x-1), )(  , 2sin(x)
  s = s.replace(/(\d)(?=[a-z(])/g, '$1*').replace(/\)(?=[\d a-z(])/g, ')*').replace(/x(?=[\d(])/g, 'x*');
  const tokens = s.match(/[a-z]+|\d*\.?\d+|\(PI\)|[()+\-*/^]/g);
  if (!tokens || tokens.join('') !== s) return null;
  const js = tokens.map((token) => {
    if (/^[a-z]+$/.test(token)) {
      if (token === 'x') return 'x';
      if (token === 'e') return 'Math.E';
      return FUNCTIONS[token] || null;
    }
    if (token === '(PI)') return 'Math.PI';
    if (token === '^') return '**';
    return token;
  });
  if (js.includes(null)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const fn = Function('x', `"use strict"; return (${js.join('')});`);
    fn(1);
    return (x) => {
      try {
        const y = fn(x);
        return Number.isFinite(y) ? y : null;
      } catch (_) {
        return null;
      }
    };
  } catch (_) {
    return null;
  }
}

function pair(value) {
  if (Array.isArray(value) && value.length === 2) {
    const x = num(value[0]);
    const y = num(value[1]);
    return x === null || y === null ? null : [x, y];
  }
  if (value && typeof value === 'object') {
    const x = num(value.x);
    const y = num(value.y);
    return x === null || y === null ? null : [x, y];
  }
  return null;
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

// ---------------------------------------------------------------------
// Validation et calcul.
// ---------------------------------------------------------------------
function sanitiseGraph(value) {
  if (!value || typeof value !== 'object') return null;

  const out = {
    type: 'graph',
    title: text(value.title, 80),
    xLabel: text(value.xLabel, 24) || 'x',
    yLabel: text(value.yLabel, 24) || 'y',
    axes: value.axes !== false,
    grid: value.grid !== false,
    equalScale: value.equalScale === true,
    functions: [],
    curves: [],
    areas: [],
    tangents: [],
    points: [],
    segments: [],
    vectors: [],
    lines: [],
    circles: [],
    angles: [],
  };
  const pointByLabel = new Map();
  const fnList = [];

  // Fonctions : échantillonnées sur leur domaine (ou celui du repère).
  const domain = Array.isArray(value.xRange) && pair(value.xRange) ? pair(value.xRange) : null;
  (Array.isArray(value.functions) ? value.functions : []).slice(0, 4).forEach((f) => {
    const fn = compileExpression(f?.expr);
    if (!fn) return;
    const [a, b] = pair(f.domain) || domain || [-5, 5];
    if (!(b > a)) return;
    const samples = [];
    for (let i = 0; i <= SAMPLES; i += 1) {
      const x = a + ((b - a) * i) / SAMPLES;
      const y = fn(x);
      samples.push(y === null ? null : [round(x), round(y)]);
    }
    fnList.push({ fn, a, b });
    out.functions.push({ label: text(f.label, 60), samples, highlight: f.highlight === true });
  });

  // Courbes de mesures (dosage, cinétique...) : points donnés, lissés au rendu.
  (Array.isArray(value.curves) ? value.curves : []).slice(0, 3).forEach((c) => {
    const pts = (Array.isArray(c?.points) ? c.points : []).map(pair).filter(Boolean).slice(0, 60);
    if (pts.length >= 2) out.curves.push({ label: text(c.label, 60), points: pts.sort((p, q) => p[0] - q[0]) });
  });

  // Aires sous une courbe (intégrale) : polygone calculé.
  (Array.isArray(value.areas) ? value.areas : []).slice(0, 2).forEach((area) => {
    const fn = compileExpression(area?.expr) || fnList[Number(area?.function) || 0]?.fn;
    const a = num(area?.from);
    const b = num(area?.to);
    if (!fn || a === null || b === null || b <= a) return;
    const pts = [[a, 0]];
    for (let i = 0; i <= 60; i += 1) {
      const x = a + ((b - a) * i) / 60;
      const y = fn(x);
      if (y !== null) pts.push([round(x), round(y)]);
    }
    pts.push([b, 0]);
    out.areas.push({ label: text(area.label, 60), polygon: pts });
  });

  // Points : coordonnées données, ou point d'une fonction à une abscisse.
  (Array.isArray(value.points) ? value.points : []).slice(0, MAX_ITEMS).forEach((p) => {
    const label = text(p?.label, 24);
    let xy = pair(p);
    if (!xy && p && num(p.x) !== null && p.on !== undefined) {
      const fn = fnList[Number(p.on) || 0]?.fn;
      const y = fn ? fn(num(p.x)) : null;
      if (y !== null) xy = [num(p.x), round(y)];
    }
    if (!xy) return;
    const point = { label, x: xy[0], y: xy[1], guides: p.guides === true };
    out.points.push(point);
    if (label) pointByLabel.set(label, point);
  });

  // Tangentes : pente calculée par dérivée numérique au point d'abscisse « at ».
  (Array.isArray(value.tangents) ? value.tangents : []).slice(0, 3).forEach((t) => {
    const fn = compileExpression(t?.expr) || fnList[Number(t?.function) || 0]?.fn;
    const x0 = num(t?.at);
    if (!fn || x0 === null) return;
    const y0 = fn(x0);
    const h = 1e-4;
    const yp = fn(x0 + h);
    const ym = fn(x0 - h);
    if (y0 === null || yp === null || ym === null) return;
    const slope = (yp - ym) / (2 * h);
    out.tangents.push({ label: text(t.label, 60), x0: round(x0), y0: round(y0), slope: round(slope) });
  });

  const resolve = (ref) => (typeof ref === 'string' ? pointByLabel.get(text(ref, 24)) && [pointByLabel.get(text(ref, 24)).x, pointByLabel.get(text(ref, 24)).y] : pair(ref));

  (Array.isArray(value.segments) ? value.segments : []).slice(0, MAX_ITEMS).forEach((seg) => {
    const from = resolve(seg?.from);
    const to = resolve(seg?.to);
    if (!from || !to || (from[0] === to[0] && from[1] === to[1])) return;
    out.segments.push({ from, to, label: text(seg.label, 24), arrow: seg.arrow === true, dashed: seg.dashed === true });
  });

  // Vecteurs / forces : origine + (composantes) ou (norme, angle en degrés).
  (Array.isArray(value.vectors) ? value.vectors : []).slice(0, MAX_ITEMS).forEach((v) => {
    const from = resolve(v?.from) || [0, 0];
    let d = pair(v?.components);
    if (!d && num(v?.length) !== null && num(v?.angle) !== null) {
      const r = (num(v.angle) * Math.PI) / 180;
      d = [round(num(v.length) * Math.cos(r)), round(num(v.length) * Math.sin(r))];
    }
    const to = d ? [round(from[0] + d[0]), round(from[1] + d[1])] : resolve(v?.to);
    if (!to || (to[0] === from[0] && to[1] === from[1])) return;
    out.vectors.push({ from, to, label: text(v.label, 24), highlight: v.highlight === true });
  });

  // Droites remarquables : asymptotes x = a, y = b.
  (Array.isArray(value.lines) ? value.lines : []).slice(0, 4).forEach((l) => {
    if (num(l?.x) !== null) out.lines.push({ x: num(l.x), label: text(l.label, 24) });
    else if (num(l?.y) !== null) out.lines.push({ y: num(l.y), label: text(l.label, 24) });
  });

  (Array.isArray(value.circles) ? value.circles : []).slice(0, 2).forEach((c) => {
    const center = resolve(c?.center) || [0, 0];
    const r = num(c?.r);
    if (r && r > 0) out.circles.push({ center, r, label: text(c.label, 24) });
  });

  // Angles : au sommet, entre deux directions (points ou vecteurs).
  (Array.isArray(value.angles) ? value.angles : []).slice(0, 3).forEach((a) => {
    const at = resolve(a?.at) || [0, 0];
    const p1 = resolve(a?.from);
    const p2 = resolve(a?.to);
    if (!p1 || !p2) return;
    const a1 = Math.atan2(p1[1] - at[1], p1[0] - at[0]);
    const a2 = Math.atan2(p2[1] - at[1], p2[0] - at[0]);
    out.angles.push({ at, a1: round(a1), a2: round(a2), label: text(a.label, 16) });
  });

  const drawable = out.functions.length + out.curves.length + out.points.length + out.segments.length
    + out.vectors.length + out.circles.length + out.tangents.length + out.areas.length;
  if (!drawable) return null;

  out.bounds = computeBounds(out, value);
  return out;
}

// Fenêtre du repère : fournie (xRange, yRange) ou calculée sur le contenu.
function computeBounds(graph, value) {
  const xs = [];
  const ys = [];
  const add = (x, y) => {
    if (Number.isFinite(x)) xs.push(x);
    if (Number.isFinite(y)) ys.push(y);
  };
  graph.functions.forEach((f) => f.samples.forEach((p) => p && add(p[0], p[1])));
  graph.curves.forEach((c) => c.points.forEach((p) => add(p[0], p[1])));
  graph.points.forEach((p) => add(p.x, p.y));
  graph.segments.forEach((s) => { add(...s.from); add(...s.to); });
  graph.vectors.forEach((v) => { add(...v.from); add(...v.to); });
  graph.circles.forEach((c) => { add(c.center[0] - c.r, c.center[1] - c.r); add(c.center[0] + c.r, c.center[1] + c.r); });
  graph.tangents.forEach((t) => add(t.x0, t.y0));
  graph.lines.forEach((l) => add(l.x ?? NaN, l.y ?? NaN));
  if (graph.axes) add(0, 0);

  let [xMin, xMax] = pair(value.xRange) || [Math.min(...xs), Math.max(...xs)];
  let [yMin, yMax] = pair(value.yRange) || [Math.min(...ys), Math.max(...ys)];
  // Valeurs extrêmes d'une fonction (asymptote) : on coupe au 5e-95e centile.
  if (!pair(value.yRange) && graph.functions.length && ys.length > 20) {
    const sorted = [...ys].sort((a, b) => a - b);
    yMin = Math.min(sorted[Math.floor(sorted.length * 0.05)], ...graph.points.map((p) => p.y), 0);
    yMax = Math.max(sorted[Math.floor(sorted.length * 0.95)], ...graph.points.map((p) => p.y), 0);
  }
  if (!(xMax > xMin)) { xMin -= 1; xMax += 1; }
  if (!(yMax > yMin)) { yMin -= 1; yMax += 1; }
  const padX = (xMax - xMin) * 0.08;
  const padY = (yMax - yMin) * 0.1;
  return { xMin: round(xMin - padX), xMax: round(xMax + padX), yMin: round(yMin - padY), yMax: round(yMax + padY) };
}

module.exports = { sanitiseGraph, compileExpression };
