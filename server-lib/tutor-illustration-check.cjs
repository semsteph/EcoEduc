// =====================================================================
// Contrôle géométrique d'une illustration (forme « illustration »).
//
// En test réel (coupe du cœur), les cavités se chevauchaient à moitié et
// deux numéros désignaient presque le même endroit : le dessin était
// confus. Ce contrôle, valable pour toutes les notions, repère :
// - un point de légende posé sur aucune forme ;
// - deux parties légendées qui désignent la même forme ;
// - deux parties dont les formes se chevauchent à moitié (une partie est
//   soit DANS une autre, soit À CÔTÉ, jamais à cheval).
// Les défauts sont renvoyés au dessinateur, qui corrige son dessin.
// =====================================================================

const STROKE_TOLERANCE = 7;

// Contour d'un tracé SVG en points (courbes échantillonnées).
function flattenPath(d) {
  const tokens = String(d).match(/[MLHVCSQTAZmlhvcsqtaz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const arity = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  const points = [];
  let x = 0; let y = 0; let startX = 0; let startY = 0;
  let lastControl = null; let command = null; let i = 0;
  const cubic = (x1, y1, x2, y2, ex, ey) => {
    for (let t = 0.125; t <= 1.0001; t += 0.125) {
      const u = 1 - t;
      points.push([
        u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex,
        u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey,
      ]);
    }
  };
  while (i < tokens.length) {
    if (/[a-z]/i.test(tokens[i])) {
      command = tokens[i];
      i += 1;
      if (/z/i.test(command)) { x = startX; y = startY; points.push([x, y]); lastControl = null; continue; }
    }
    if (!command) break;
    const upper = command.toUpperCase();
    const rel = command !== upper;
    const n = arity[upper];
    const a = tokens.slice(i, i + n).map(Number);
    if (a.length < n || a.some((v) => !Number.isFinite(v))) break;
    i += n;
    const px = (v) => (rel ? x + v : v);
    const py = (v) => (rel ? y + v : v);
    if (upper === 'M') {
      x = px(a[0]); y = py(a[1]); startX = x; startY = y; points.push([x, y]);
      command = rel ? 'l' : 'L'; lastControl = null;
    } else if (upper === 'L' || upper === 'T') {
      x = px(a[0]); y = py(a[1]); points.push([x, y]); lastControl = null;
    } else if (upper === 'H') {
      x = rel ? x + a[0] : a[0]; points.push([x, y]); lastControl = null;
    } else if (upper === 'V') {
      y = rel ? y + a[0] : a[0]; points.push([x, y]); lastControl = null;
    } else if (upper === 'C') {
      const c2 = [px(a[2]), py(a[3])];
      cubic(px(a[0]), py(a[1]), c2[0], c2[1], px(a[4]), py(a[5]));
      x = px(a[4]); y = py(a[5]); lastControl = c2;
    } else if (upper === 'S') {
      const c1 = lastControl ? [2 * x - lastControl[0], 2 * y - lastControl[1]] : [x, y];
      const c2 = [px(a[0]), py(a[1])];
      cubic(c1[0], c1[1], c2[0], c2[1], px(a[2]), py(a[3]));
      x = px(a[2]); y = py(a[3]); lastControl = c2;
    } else if (upper === 'Q') {
      const q = [px(a[0]), py(a[1])];
      const ex = px(a[2]); const ey = py(a[3]);
      cubic(x + (2 / 3) * (q[0] - x), y + (2 / 3) * (q[1] - y), ex + (2 / 3) * (q[0] - ex), ey + (2 / 3) * (q[1] - ey), ex, ey);
      x = ex; y = ey; lastControl = null;
    } else if (upper === 'A') {
      x = px(a[5]); y = py(a[6]); points.push([x, y]); lastControl = null;
    }
  }
  return points;
}

function ellipsePoints({ cx, cy, rx, ry }) {
  return Array.from({ length: 24 }, (_, k) => {
    const angle = (k / 24) * 2 * Math.PI;
    return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)];
  });
}

function pointsOf(attribute) {
  return String(attribute).split(' ').map((pair) => pair.split(',').map(Number));
}

// Zone remplie (polygone) ou trait (ligne brisée) de chaque forme.
function regionOf(shape) {
  let outline = null;
  let stroke = false;
  if (shape.kind === 'ellipse') outline = ellipsePoints(shape);
  else if (shape.kind === 'rect') {
    const { x, y, width: w, height: h } = shape;
    outline = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  } else if (shape.kind === 'polygon') outline = pointsOf(shape.points);
  else if (shape.kind === 'polyline') { outline = pointsOf(shape.points); stroke = true; }
  else if (shape.kind === 'line') { outline = [[shape.x1, shape.y1], [shape.x2, shape.y2]]; stroke = true; }
  else if (shape.kind === 'path') outline = flattenPath(shape.d);
  if (!outline || outline.length < 2) return null;
  if (shape.fill === false || outline.length < 3) stroke = true;
  return { shape, outline, stroke, area: stroke ? 0 : Math.abs(polygonArea(outline)) };
}

function polygonArea(points) {
  let sum = 0;
  points.forEach(([x1, y1], k) => {
    const [x2, y2] = points[(k + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  });
  return sum / 2;
}

function inside(points, x, y) {
  let hit = false;
  for (let k = 0, j = points.length - 1; k < points.length; j = k, k += 1) {
    const [xi, yi] = points[k];
    const [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function distanceToPolyline(points, x, y) {
  let best = Infinity;
  for (let k = 0; k + 1 < points.length; k += 1) {
    const [x1, y1] = points[k];
    const [x2, y2] = points[k + 1];
    const length2 = (x2 - x1) ** 2 + (y2 - y1) ** 2 || 1;
    const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / length2));
    best = Math.min(best, Math.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1))));
  }
  return best;
}

// Formes que peut désigner un point de légende, de la plus probable à la
// moins probable : les traits touchés, puis les zones qui le contiennent,
// de la plus petite à la plus grande.
function shapesAt(regions, { x, y }) {
  const strokes = regions.filter((r) => r.stroke && distanceToPolyline(r.outline, x, y) <= STROKE_TOLERANCE).reverse();
  const areas = regions.filter((r) => !r.stroke && r.area > 0 && inside(r.outline, x, y)).sort((a, b) => a.area - b.area);
  // Une petite zone (bouche, anus, noyau) l'emporte sur un trait qui passe
  // tout près ; une grande zone (silhouette) passe après le trait.
  const small = areas.filter((r) => r.area < 1600);
  const large = areas.filter((r) => r.area >= 1600);
  return [...small, ...strokes, ...large];
}

function bounds(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

// Part de la plus petite des deux zones recouverte par l'autre (grille).
function overlapRatio(a, b) {
  const ba = bounds(a.outline);
  const bb = bounds(b.outline);
  const x0 = Math.max(ba.x0, bb.x0); const x1 = Math.min(ba.x1, bb.x1);
  const y0 = Math.max(ba.y0, bb.y0); const y1 = Math.min(ba.y1, bb.y1);
  if (x1 <= x0 || y1 <= y0) return 0;
  const step = 3;
  let common = 0;
  for (let x = x0; x <= x1; x += step) {
    for (let y = y0; y <= y1; y += step) {
      if (inside(a.outline, x, y) && inside(b.outline, x, y)) common += 1;
    }
  }
  return (common * step * step) / Math.min(a.area, b.area);
}

function checkIllustration(diagram) {
  if (!diagram || diagram.form !== 'illustration' || !Array.isArray(diagram.shapes)) return [];
  const regions = diagram.shapes.map(regionOf).filter(Boolean);
  const defects = [];
  const targets = diagram.nodes.map((node) => {
    const candidates = shapesAt(regions, node.at);
    return { node, candidates, region: candidates[0] || null };
  });
  // Deux parties sur la même forme : on cherche une autre forme possible
  // pour l'une d'elles (membrane tracée sur le bord de la paroi, gaine de
  // myéline posée sur l'axone) avant de conclure à un défaut.
  targets.forEach((target, index) => {
    const clash = targets.slice(0, index).some((other) => other.region && other.region === target.region);
    if (!clash) return;
    const free = target.candidates.find((region) => !targets.some((other) => other !== target && other.region === region));
    if (free) target.region = free;
  });

  targets.forEach(({ node, region }) => {
    if (!region) defects.push(`le point de « ${node.label} » (${node.at.x}, ${node.at.y}) n'est sur aucune forme : place-le à l'intérieur de la partie qu'il désigne`);
  });

  for (let i = 0; i < targets.length; i += 1) {
    for (let j = i + 1; j < targets.length; j += 1) {
      const a = targets[i];
      const b = targets[j];
      if (!a.region || !b.region) continue;
      if (a.region === b.region) {
        defects.push(`« ${a.node.label} » et « ${b.node.label} » désignent la même forme : chaque partie légendée doit avoir sa propre forme`);
        continue;
      }
      if (a.region.stroke || b.region.stroke) continue;
      const ratio = overlapRatio(a.region, b.region);
      // Emboîtement (noyau dans la cellule) : normal. À cheval : défaut.
      if (ratio > 0.2 && ratio < 0.7) {
        defects.push(`les formes de « ${a.node.label} » et « ${b.node.label} » se chevauchent à moitié (${Math.round(ratio * 100)} %) : deux parties voisines se touchent par une cloison commune sans se recouvrir, ou l'une est entièrement dans l'autre`);
      }
    }
  }
  return defects.slice(0, 8);
}

module.exports = { checkIllustration, flattenPath };
