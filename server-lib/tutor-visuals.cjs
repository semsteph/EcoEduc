// =====================================================================
// Visuels pédagogiques du tuteur — architecture générique.
//
// Aucun schéma n'est écrit notion par notion : cela ne passe pas à
// l'échelle (toutes les matières, de la 6ème à la Terminale). Trois
// familles génériques couvrent l'ensemble :
//
// 1. Les figures géométriques (angle, triangle, rectangle, cercle...),
//    nettoyées par sanitiseExplanationDiagram / sanitiseExercise et rendues
//    par GeometryDiagram.vue.
// 2. Le circuit électrique en série (n'importe quel montage de pile,
//    interrupteurs, lampes, moteurs, DEL), rendu par
//    ElectricCircuitDiagram.vue. L'état (lampe allumée...) est calculé ici.
// 3. Le « schéma générique » (type "schema") : Claude choisit une FORME
//    (trajet, cycle, classification, comparaison, structure légendée) et
//    la remplit avec le contenu de n'importe quelle notion. Il ne fournit
//    aucune coordonnée : GenericSchema.vue fait la mise en page, toujours
//    lisible et adaptée au mobile.
// =====================================================================

// Normalisation locale (ce module ne dépend d'aucun autre module du tuteur,
// pour que pedagogical-tutor.cjs puisse l'importer sans dépendance
// circulaire). Mêmes règles que normaliseText, ligatures comprises.
function normalise(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// =====================================================================
// Circuit électrique simple en série (niveau collège).
//
// Le backend calcule lui-même si le circuit est fermé et si les
// récepteurs fonctionnent : ce n'est jamais le modèle qui décide qu'une
// lampe « brille » dans un circuit ouvert.
// =====================================================================

const CIRCUIT_COMPONENTS = Object.freeze({
  battery: { label: 'Pile', keywords: /\b(piles?|generateurs?|batteries?)\b/ },
  // Tolère « interupteur », « linterupteur » (apostrophe oubliée)...
  switch: { label: 'Interrupteur', keywords: /interr?upt\w*/ },
  lamp: { label: 'Lampe', keywords: /\b(lampes?|ampoules?)\b/ },
  motor: { label: 'Moteur', keywords: /\bmoteurs?\b/ },
  led: { label: 'DEL', keywords: /\b(del|led|diodes? electroluminescentes?)\b/ },
});

function matchesCircuit(normalized) {
  if (/\b(circuit\w*|dipoles?|courant electrique|court circuit|bornes?|generateurs?|electricite|electrique)\b|interr?upt/.test(normalized)) return true;
  const weak = ['battery', 'lamp', 'motor', 'led'].filter((kind) => CIRCUIT_COMPONENTS[kind].keywords.test(normalized));
  return weak.length >= 2;
}

function buildElectricCircuit({ components, text = '', brokenWire } = {}) {
  const normalized = normalise(text);
  let list = Array.isArray(components) ? components : null;

  if (!list) {
    // Construction à partir du contexte : pile + interrupteur + récepteur(s).
    const opened = /\b(ouvert\w*|ouvre|eteint\w*|appuie pas|relache\w*)\b/.test(normalized)
      && !/\b(ferme\w*)\b/.test(normalized);
    const noSwitch = /\bsans (l |d |un |aucun )?interr?upt/.test(normalized);
    list = noSwitch ? [{ kind: 'battery' }] : [{ kind: 'battery' }, { kind: 'switch', closed: !opened }];
    if (CIRCUIT_COMPONENTS.motor.keywords.test(normalized)) list.push({ kind: 'motor' });
    if (CIRCUIT_COMPONENTS.led.keywords.test(normalized)) list.push({ kind: 'led' });
    if (!list.some((c) => c.kind === 'motor' || c.kind === 'led') || CIRCUIT_COMPONENTS.lamp.keywords.test(normalized) || /\bajout\w*/.test(normalized)) list.push({ kind: 'lamp' });
    // « deux lampes » : deux lampes en série (l'énoncé et le schéma doivent
    // compter les mêmes dipôles).
    if (/\b(deux|2) (lampes|ampoules)\b/.test(normalized)) list.push({ kind: 'lamp' });
    if (brokenWire === undefined) {
      // « deux fils ne sont pas connectés » : non reconnu en test réel.
      brokenWire = /\bfils?\b.{0,60}\b(coupe|casse|debranche|enleve|detache|deconnecte|abime)\w*/.test(normalized)
        || /\b(pas|plus|mal) (connecte|relie|branche|attache)\w*/.test(normalized)
        || /\b(fil (manquant|absent)|circuit (coupe|interrompu))\b/.test(normalized);
    }
    list = list.map((c) => {
      if (c.kind === 'battery' && /\bpiles?\b(?: \w+){0,2} (usee|morte|vide|faible|dechargee)\w*/.test(normalized)) return { ...c, flat: true };
      // « l'un des fils reliant la lampe est cassé » parle du FIL : la lampe
      // n'est grillée que si aucun fil n'est en cause (cas réel).
      if (c.kind === 'lamp' && !brokenWire && /\b(lampe|ampoule)s?\b(?: \w+){0,2} (grill\w*|cass\w*|morte|abime\w*)|\bgrill\w* (lampe|ampoule)/.test(normalized)) return { ...c, broken: true };
      return c;
    });
  }

  const clean = list
    .filter((c) => c && typeof c === 'object' && CIRCUIT_COMPONENTS[c.kind])
    .slice(0, 5)
    .map((c) => {
      if (c.kind === 'switch') return { kind: 'switch', closed: c.closed !== false };
      if (c.kind === 'battery') return { kind: 'battery', ...(c.flat === true ? { flat: true } : {}) };
      if (c.kind === 'lamp') return { kind: 'lamp', ...(c.broken === true ? { broken: true } : {}) };
      return { kind: c.kind };
    });

  if (!clean.some((c) => c.kind === 'battery')) clean.unshift({ kind: 'battery' });
  if (!clean.some((c) => ['lamp', 'motor', 'led'].includes(c.kind))) clean.push({ kind: 'lamp' });

  const broken = brokenWire === true;
  const circuitClosed = !broken && clean.every((c) => c.kind !== 'switch' || c.closed);
  // Pile usée : la boucle reste fermée mais rien ne fonctionne. Lampe
  // grillée : elle seule ne s'allume pas.
  const powered = circuitClosed && !clean.some((c) => c.kind === 'battery' && c.flat);

  return {
    type: 'electric-circuit',
    title: circuitClosed ? 'Circuit électrique fermé' : 'Circuit électrique ouvert',
    components: clean.map((c) => ({
      ...c,
      label: c.kind === 'switch'
        ? `Interrupteur ${c.closed ? 'fermé' : 'ouvert'}`
        : c.flat ? 'Pile usée' : c.broken ? 'Lampe grillée' : CIRCUIT_COMPONENTS[c.kind].label,
      ...(['lamp', 'motor', 'led'].includes(c.kind) ? { working: powered && !c.broken } : {}),
    })),
    brokenWire: broken,
    circuitClosed,
    showCurrent: powered && !clean.some((c) => c.broken),
  };
}

// =====================================================================
// Schéma générique.
//
// Formes :
// - flow       : trajet / chaîne d'étapes reliées par des flèches
//                (nœuds dans l'ordre ; « attachTo » pour un élément annexe
//                qui intervient sur une étape sans en faire partie) ;
// - cycle      : étapes qui reviennent au début ;
// - hierarchy  : classification en arbre (« parent ») ;
// - comparison : 2 ou 3 colonnes côte à côte ;
// - structure  : un ensemble (le titre) et ses parties, placées par zone
//                (top, bottom, left, right, center) ;
// - illustration : un dessin simple (formes dans un cadre 400 × 300) dont
//                les parties sont repérées par des numéros et une légende.
//                Pour ce qui a une forme réelle : organe, cellule, coupe,
//                montage, carte, paysage...
// =====================================================================

const SCHEMA_FORMS = Object.freeze(['flow', 'cycle', 'hierarchy', 'comparison', 'structure', 'illustration']);
const SCHEMA_ZONES = Object.freeze(['top', 'bottom', 'left', 'right', 'center']);
const MIN_NODES = { flow: 2, cycle: 3, hierarchy: 2, structure: 2, illustration: 2 };

function cleanText(value, max) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

// ---------------------------------------------------------------------
// Illustration : seules des formes géométriques simples, sans texte ni
// style libre, sont acceptées. Les couleurs viennent d'une palette fermée
// (« tone ») : le rendu reste homogène et joli quelle que soit la notion.
// ---------------------------------------------------------------------

const ILLUSTRATION_WIDTH = 400;
const ILLUSTRATION_HEIGHT = 300;
const ILLUSTRATION_TONES = Object.freeze([
  'organ', 'blood', 'air', 'water', 'plant', 'earth', 'rock', 'bone',
  'nerve', 'cell', 'energy', 'metal', 'neutral', 'accent', 'dark',
]);
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9\s,.+-]+$/;

function num(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : null;
}

function inFrame(value, axis) {
  const limit = axis === 'x' ? ILLUSTRATION_WIDTH : ILLUSTRATION_HEIGHT;
  return num(value, -10, limit + 10);
}

function sanitisePoints(value) {
  const list = typeof value === 'string'
    ? value.trim().split(/[\s,]+/).map(Number)
    : (Array.isArray(value) ? value.flatMap((p) => (Array.isArray(p) ? p : [p?.x, p?.y])).map(Number) : []);
  if (list.length < 6 || list.length % 2 || list.length > 80) return null;
  const pairs = [];
  for (let i = 0; i < list.length; i += 2) {
    const x = inFrame(list[i], 'x');
    const y = inFrame(list[i + 1], 'y');
    if (x === null || y === null) return null;
    pairs.push(`${x},${y}`);
  }
  return pairs.join(' ');
}

function sanitiseShape(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const kind = cleanText(raw.kind || raw.type, 12).toLowerCase();
  const tone = ILLUSTRATION_TONES.includes(raw.tone) ? raw.tone : 'neutral';
  const style = {
    tone,
    ...(raw.fill === false ? { fill: false } : {}),
    ...(raw.dashed === true ? { dashed: true } : {}),
  };

  if (kind === 'path') {
    const d = typeof raw.d === 'string' ? raw.d.replace(/\s+/g, ' ').trim() : '';
    if (!d || d.length > 2000 || !PATH_DATA.test(d) || !/^[Mm]/.test(d)) return null;
    // Aucune coordonnée aberrante (un tracé hors du cadre serait coupé).
    if ((d.match(/-?\d+(?:\.\d+)?/g) || []).some((n) => Math.abs(Number(n)) > 420)) return null;
    return { kind, d, ...style, ...(raw.arrow === true ? { arrow: true } : {}) };
  }
  if (kind === 'ellipse' || kind === 'circle') {
    const cx = inFrame(raw.cx, 'x');
    const cy = inFrame(raw.cy, 'y');
    const rx = num(kind === 'circle' ? raw.r : raw.rx, 1, 220);
    const ry = num(kind === 'circle' ? raw.r : raw.ry, 1, 170);
    if ([cx, cy, rx, ry].includes(null)) return null;
    return { kind: 'ellipse', cx, cy, rx, ry, ...style };
  }
  if (kind === 'rect') {
    const x = inFrame(raw.x, 'x');
    const y = inFrame(raw.y, 'y');
    const width = num(raw.width, 1, ILLUSTRATION_WIDTH);
    const height = num(raw.height, 1, ILLUSTRATION_HEIGHT);
    if ([x, y, width, height].includes(null)) return null;
    return { kind, x, y, width, height, rx: num(raw.rx, 0, 60) || 0, ...style };
  }
  if (kind === 'line' || kind === 'arrow') {
    const coords = ['x1', 'y1', 'x2', 'y2'].map((key) => inFrame(raw[key], key[0]));
    if (coords.includes(null)) return null;
    const [x1, y1, x2, y2] = coords;
    if (x1 === x2 && y1 === y2) return null;
    return { kind: 'line', x1, y1, x2, y2, ...style, ...(kind === 'arrow' || raw.arrow === true ? { arrow: true } : {}) };
  }
  if (kind === 'polygon' || kind === 'polyline') {
    const points = sanitisePoints(raw.points);
    if (!points) return null;
    return { kind, points, ...style, ...(kind === 'polyline' && raw.arrow === true ? { arrow: true } : {}) };
  }
  return null;
}

// Points de passage d'un tracé SVG (commandes absolues et relatives).
function pathPoints(d) {
  const tokens = String(d).match(/[MLHVCSQTAZmlhvcsqtaz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const arity = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  const points = [];
  let cx = 0; let cy = 0; let command = null; let i = 0;
  while (i < tokens.length) {
    if (/[a-z]/i.test(tokens[i])) { command = tokens[i]; i += 1; if (/z/i.test(command)) continue; }
    if (!command) break;
    const upper = command.toUpperCase();
    const rel = command !== upper;
    const n = arity[upper];
    const args = tokens.slice(i, i + n).map(Number);
    if (args.length < n || args.some((v) => !Number.isFinite(v))) break;
    i += n;
    if (upper === 'H') cx = rel ? cx + args[0] : args[0];
    else if (upper === 'V') cy = rel ? cy + args[0] : args[0];
    else {
      for (let k = 0; k + 1 < n; k += 2) {
        if (upper === 'A' && k < 5) continue;
        points.push([rel ? cx + args[k] : args[k], rel ? cy + args[k + 1] : args[k + 1]]);
      }
      const [ex, ey] = points[points.length - 1];
      cx = ex; cy = ey;
      if (upper === 'M') command = rel ? 'l' : 'L';
      continue;
    }
    points.push([cx, cy]);
  }
  return points;
}

// Zone réellement dessinée (le rendu zoome dessus : en test réel, le dessin
// n'occupait qu'un coin du cadre).
function drawingBox(shapes, nodes) {
  const xs = [];
  const ys = [];
  const add = (x, y) => { if (Number.isFinite(x) && Number.isFinite(y)) { xs.push(x); ys.push(y); } };
  shapes.forEach((shape) => {
    if (shape.kind === 'ellipse') { add(shape.cx - shape.rx, shape.cy - shape.ry); add(shape.cx + shape.rx, shape.cy + shape.ry); }
    else if (shape.kind === 'rect') { add(shape.x, shape.y); add(shape.x + shape.width, shape.y + shape.height); }
    else if (shape.kind === 'line') { add(shape.x1, shape.y1); add(shape.x2, shape.y2); }
    else if (shape.points) shape.points.split(' ').forEach((pair) => { const [x, y] = pair.split(',').map(Number); add(x, y); });
    else if (shape.d) pathPoints(shape.d).forEach(([x, y]) => add(x, y));
  });
  nodes.forEach((node) => add(node.at.x, node.at.y));
  if (!xs.length) return { x: 0, y: 0, w: ILLUSTRATION_WIDTH, h: ILLUSTRATION_HEIGHT };
  const minX = Math.max(-10, Math.min(...xs));
  const maxX = Math.min(ILLUSTRATION_WIDTH + 10, Math.max(...xs));
  const minY = Math.max(-10, Math.min(...ys));
  const maxY = Math.min(ILLUSTRATION_HEIGHT + 10, Math.max(...ys));
  return { x: Math.round(minX), y: Math.round(minY), w: Math.round(Math.max(40, maxX - minX)), h: Math.round(Math.max(40, maxY - minY)) };
}

function sanitiseIllustration({ title, note, value }) {
  const shapes = (Array.isArray(value.shapes) ? value.shapes : [])
    .slice(0, 40)
    .map(sanitiseShape)
    .filter(Boolean);
  if (!shapes.length) return null;

  const ids = new Set();
  const nodes = (Array.isArray(value.nodes) ? value.nodes : [])
    .slice(0, 12)
    .map((node, index) => {
      const label = cleanText(node?.label, 48);
      const x = inFrame(node?.at?.x ?? node?.x, 'x');
      const y = inFrame(node?.at?.y ?? node?.y, 'y');
      if (!label || x === null || y === null) return null;
      let id = typeof node.id === 'string' && /^[\w-]{1,24}$/.test(node.id) ? node.id : `n${index + 1}`;
      if (ids.has(id)) id = `${id}_${index + 1}`;
      ids.add(id);
      return {
        id,
        label,
        detail: cleanText(node.detail, 180),
        at: { x, y },
        ...(node.highlight === true ? { highlight: true } : {}),
      };
    })
    .filter(Boolean);
  if (nodes.length < MIN_NODES.illustration) return null;

  // Cadres vides : un rectangle sans aucune partie numérotée dedans (et qui
  // n'est pas le contour d'ensemble) est retiré (cas réels : « rectangles
  // vides parasites » sur 4 illustrations sur 4).
  const area = (shape) => (shape.kind === 'rect' ? shape.width * shape.height : shape.kind === 'ellipse' ? Math.PI * shape.rx * shape.ry : 0);
  const largest = Math.max(...shapes.map(area));
  const contains = (shape, { x, y }) => (shape.kind === 'rect'
    ? x >= shape.x - 4 && x <= shape.x + shape.width + 4 && y >= shape.y - 4 && y <= shape.y + shape.height + 4
    : false);
  const kept = shapes.filter((shape) => shape.kind !== 'rect'
    || area(shape) >= largest
    || nodes.some((node) => contains(shape, node.at)));
  if (!kept.length) return null;

  return {
    type: 'schema',
    form: 'illustration',
    title,
    bbox: drawingBox(kept, nodes),
    shapes: kept,
    nodes,
    ...(note ? { note } : {}),
  };
}

function sanitiseSchema(value) {
  const form = cleanText(value.form, 20).toLowerCase();
  if (!SCHEMA_FORMS.includes(form)) return null;
  const title = cleanText(value.title, 90);
  const note = cleanText(value.note, 220);

  if (form === 'illustration') {
    // Commande de dessin (« draw ») : le dessin est produit par un appel
    // dédié côté serveur, puis remplace cette commande. Une commande non
    // résolue n'est jamais envoyée au navigateur.
    const draw = cleanText(value.draw, 300);
    if (draw && !Array.isArray(value.shapes)) return { type: 'schema', form, title, pending: true, draw };
    return sanitiseIllustration({ title, note, value });
  }

  if (form === 'comparison') {
    const columns = (Array.isArray(value.columns) ? value.columns : [])
      .slice(0, 3)
      .map((column) => ({
        title: cleanText(column?.title, 60),
        items: (Array.isArray(column?.items) ? column.items : [])
          .map((item) => cleanText(item, 160))
          .filter(Boolean)
          .slice(0, 8),
      }))
      .filter((column) => column.title && column.items.length);
    if (columns.length < 2) return null;
    return { type: 'schema', form, title, columns, ...(note ? { note } : {}) };
  }

  const ids = new Set();
  const nodes = (Array.isArray(value.nodes) ? value.nodes : [])
    .slice(0, 14)
    .map((node, index) => {
      if (!node || typeof node !== 'object') return null;
      const label = cleanText(node.label, 48);
      if (!label) return null;
      let id = typeof node.id === 'string' && /^[\w-]{1,24}$/.test(node.id) ? node.id : `n${index + 1}`;
      if (ids.has(id)) id = `${id}_${index + 1}`;
      ids.add(id);
      return {
        id,
        label,
        detail: cleanText(node.detail, 180),
        ...(node.highlight === true ? { highlight: true } : {}),
        raw: node,
      };
    })
    .filter(Boolean);

  const clean = nodes.map(({ raw, ...node }) => {
    if (form === 'hierarchy' && typeof raw.parent === 'string' && ids.has(raw.parent) && raw.parent !== node.id) {
      return { ...node, parent: raw.parent };
    }
    if (form === 'flow' && typeof raw.attachTo === 'string' && ids.has(raw.attachTo) && raw.attachTo !== node.id) {
      return { ...node, attachTo: raw.attachTo };
    }
    if (form === 'structure' && SCHEMA_ZONES.includes(raw.zone)) {
      return { ...node, zone: raw.zone };
    }
    return node;
  });

  // Un élément annexe s'attache à une étape principale, pas à un autre
  // élément annexe.
  if (form === 'flow') {
    const attached = new Set(clean.filter((node) => node.attachTo).map((node) => node.id));
    clean.forEach((node) => { if (node.attachTo && attached.has(node.attachTo)) delete node.attachTo; });
  }

  // Classification : pas de boucle, au moins une racine.
  if (form === 'hierarchy') {
    const byId = new Map(clean.map((node) => [node.id, node]));
    clean.forEach((node) => {
      let depth = 0;
      let cursor = node;
      while (cursor?.parent && depth < 6) { cursor = byId.get(cursor.parent); depth += 1; }
      if (depth >= 6) delete node.parent;
    });
    if (!clean.some((node) => !node.parent)) return null;
  }

  const mainCount = clean.filter((node) => !node.attachTo).length;
  if (mainCount < MIN_NODES[form]) return null;

  const links = (Array.isArray(value.links) ? value.links : [])
    .filter((link) => link && ids.has(link.from) && ids.has(link.to) && link.from !== link.to)
    .slice(0, 16)
    .map((link) => ({ from: link.from, to: link.to, label: cleanText(link.label, 48) }))
    .filter((link) => link.label);

  return {
    type: 'schema',
    form,
    title,
    nodes: clean,
    ...(links.length ? { links } : {}),
    ...(note ? { note } : {}),
  };
}

// Anciennes conversations : les schémas « appareil digestif » et
// « appareil respiratoire » enregistrés en base sont convertis en schéma
// générique à partir des données qu'ils contiennent (aucun contenu codé ici).
function legacyOrgansToFlow(value) {
  const organs = (Array.isArray(value.organs) ? value.organs : []).filter((organ) => organ && organ.label);
  const highlight = new Set(Array.isArray(value.highlight) ? value.highlight : []);
  const nodes = [];
  organs.forEach((organ, index) => {
    const node = {
      id: String(organ.id || `o${index}`).replace(/[^\w-]/g, '').slice(0, 24) || `o${index}`,
      label: organ.label,
      detail: organ.role || '',
      highlight: highlight.has(organ.id),
    };
    // Glande annexe : rattachée à l'étape principale suivante.
    if (organ.kind === 'gland') {
      const next = organs.slice(index + 1).find((o) => o.kind !== 'gland');
      if (next) node.attachTo = String(next.id);
    }
    nodes.push(node);
  });
  return sanitiseSchema({ form: 'flow', title: value.title || '', nodes });
}

// =====================================================================
// Registre des familles de visuels.
// =====================================================================

const { sanitiseGraph } = require('./tutor-graph.cjs');
const { sanitiseMolecule } = require('./tutor-molecule.cjs');
const { sanitiseField } = require('./tutor-field.cjs');

const VISUAL_REGISTRY = Object.freeze({
  'electric-circuit': {
    // Reconnu d'après le texte : le backend construit le montage décrit.
    matches: matchesCircuit,
    build: ({ text }) => buildElectricCircuit({ text }),
    sanitise(value) {
      return buildElectricCircuit({
        components: Array.isArray(value.components) ? value.components : [{ kind: 'battery' }, { kind: 'switch', closed: true }, { kind: 'lamp' }],
        brokenWire: value.brokenWire === true,
      });
    },
    // Réexplication : le cas opposé (ouvert ↔ fermé), pour comparer.
    alternative(diagram) {
      const components = diagram.components.map(({ label, working, ...c }) => (
        c.kind === 'switch' ? { ...c, closed: !c.closed } : c
      ));
      if (!components.some((c) => c.kind === 'switch')) components.splice(1, 0, { kind: 'switch', closed: false });
      return buildElectricCircuit({ components, brokenWire: false });
    },
  },

  schema: {
    // Jamais déduit d'après des mots-clés : c'est Claude qui le décrit.
    matches: () => false,
    sanitise: sanitiseSchema,
  },

  // Graphique mathématique : positions calculées par le serveur.
  graph: { matches: () => false, sanitise: sanitiseGraph },
  // Molécule : hydrogènes et positions calculés par le serveur.
  molecule: { matches: () => false, sanitise: sanitiseMolecule },
  // Terrain de sport (EPS) : tracés réglementaires dessinés par le système.
  field: { matches: () => false, sanitise: sanitiseField },

  'digestive-system': { matches: () => false, sanitise: legacyOrgansToFlow },
  'respiratory-system': { matches: () => false, sanitise: legacyOrgansToFlow },
});

// Types géométriques historiques, rendus par GeometryDiagram.vue.
const GEOMETRY_VISUAL_TYPES = Object.freeze([
  'point', 'line', 'segment', 'angle', 'triangle', 'right-triangle',
  'parallelogram', 'rectangle', 'square', 'circle', 'coordinate-plane',
  'composite',
]);

// Variante d'un schéma du registre pour une réexplication (sinon null).
function alternativeVisual(diagram) {
  const entry = diagram && VISUAL_REGISTRY[diagram.type];
  return entry?.alternative ? entry.alternative(diagram) : null;
}

function isRegisteredVisualType(type) {
  return Object.prototype.hasOwnProperty.call(VISUAL_REGISTRY, type);
}

// Mode « question » pour les schémas d'exercice : le schéma ne doit pas
// donner la réponse (lampe allumée, nom de l'organe...).
function toQuizVisual(diagram) {
  if (!diagram) return diagram;
  if (diagram.type === 'electric-circuit') {
    return {
      ...diagram,
      quiz: true,
      title: 'Circuit électrique',
      circuitClosed: null,
      showCurrent: false,
      components: diagram.components.map(({ working, ...component }) => (
        component.kind === 'switch' ? { ...component, label: 'Interrupteur' } : component
      )),
    };
  }
  return { ...diagram, quiz: true };
}

// Nettoie un schéma de domaine provenant de Claude ou de la base.
// Retourne null pour tout type qui n'est pas dans le registre.
function sanitiseRegisteredVisual(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const type = typeof value.type === 'string' ? value.type.trim().toLowerCase() : '';
  if (!isRegisteredVisualType(type)) return null;
  const built = VISUAL_REGISTRY[type].sanitise(value);
  return value.quiz === true ? toQuizVisual(built) : built;
}

// =====================================================================
// Politique visuelle par matière.
//
// - 'required' : sciences et mathématiques. Dès que la notion peut se
//   représenter, une explication DOIT être accompagnée d'un vrai schéma.
// - 'none' : langues, histoire-géographie, philosophie, lecture... On n'y
//   produit jamais de schéma : on aide par des exemples, des phrases
//   modèles, des tableaux simples.
// - 'optional' : EPS, matière non reconnue... Claude décide si un schéma
//   aide vraiment (terrain, placement des joueurs, zone de passage...).
// =====================================================================

const NO_VISUAL_SUBJECTS = /\b(francais|french|anglais|english|espagnol\w*|spanish|allemand|german|italien|portugais|arabe|latin|grec|chinois|langues?|lv1|lv2|philosophie|philo|histoire|geographie|hist geo|histoire geo|education civique|ecm|lecture|expression ecrite|litterature|grammaire|conjugaison|orthographe|musique|dessin|arts?)\b/;
const VISUAL_SUBJECTS = /\b(math\w*|pct|physique\w*|chimie|svt|biologie|geologie|sciences?|technologie|geometrie|algebre|statistiques?)\b/;

function getSubjectVisualPolicy(subjectName) {
  const normalized = normalise(subjectName);
  if (!normalized) return 'optional';
  if (NO_VISUAL_SUBJECTS.test(normalized)) return 'none';
  if (VISUAL_SUBJECTS.test(normalized)) return 'required';
  return 'optional';
}

// =====================================================================
// Détection d'une demande de visuel.
//
// Déterministe : une demande explicite de schéma ne doit pas dépendre
// d'un classifieur probabiliste. Tolère fautes, absence d'accents et
// français familier.
// =====================================================================

const VISUAL_NOUNS = /\b(schemas?|shemas?|chemas?|schema|diagrammes?|dessins?|dessine\w*|images?|illustrations?|figures?|photos?|croquis|visuels?)\b/;
const VISUAL_VERBS = /\b(montr\w*|visualis\w*|affiche\w*)\b/;
const SEE_REQUEST = /\b(je veux|j aimerais|je voudrais|je peux|tu peux|peux tu|fais|fait|faire)\s+(me\s+|le\s+|la\s+|les\s+|l\s+)?voir\b|\ba quoi (ca|cela|il|elle) ressembl\w*\b|\bcomment c est fait\b/;
const REQUEST_CUES = /\b(montr\w*|fais|fait|faire|dessin\w*|donne\w*|peux|peut|veux|voudrais|aimerais|avoir|voir|affiche\w*|envoie\w*|stp|svp|possible)\b/;
// « montre-moi comment calculer » demande une méthode, pas une image.
const PROCEDURE_REQUEST = /\bcomment (on |je |il faut |tu )?(calcul\w*|resou\w*|trouv\w*|repond\w*|redig\w*|fai\w* (l exercice|le calcul|l operation))\b/;

function detectVisualRequest(message) {
  const normalized = normalise(message);
  if (!normalized) return false;

  const hasNoun = VISUAL_NOUNS.test(normalized);

  if (VISUAL_VERBS.test(normalized)) {
    return hasNoun || !PROCEDURE_REQUEST.test(normalized);
  }

  if (SEE_REQUEST.test(normalized)) return true;

  if (hasNoun) {
    const wordCount = normalized.split(' ').length;
    return REQUEST_CUES.test(normalized) || /\?\s*$/.test(String(message).trim()) || wordCount <= 4;
  }

  return false;
}

// =====================================================================
// Choix du schéma demandé, à partir du message puis du contexte.
//
// Ordre de priorité :
// 1. le message actuel (« montre-moi l'appareil digestif ») ;
// 2. les derniers messages de l'élève puis du tuteur (« montre moi »
//    juste après une explication sur l'œsophage) ;
// 3. l'activité et la notion de la séance.
//
// Les organes à mettre en évidence ne viennent que des messages de
// l'élève : le texte du tuteur cite trop d'organes pour être un signal.
// =====================================================================

function resolveRequestedVisual({
  userMessage,
  recentUserMessages = [],
  lastAssistantMessage = '',
  activity = '',
  topic = '',
} = {}) {
  const sources = [
    userMessage,
    ...recentUserMessages.slice().reverse(),
    lastAssistantMessage,
    `${topic || ''} ${activity || ''}`,
  ];

  // Seules les familles reconnues d'après le texte (circuit) sont
  // construites ici ; tout le reste est décrit par Claude (schéma
  // générique).
  for (const [type, entry] of Object.entries(VISUAL_REGISTRY)) {
    if (!entry.build) continue;
    if (sources.some((source) => entry.matches(normalise(source)))) {
      const contextText = [userMessage, ...recentUserMessages.slice(-1)].join(' ');
      return { type, diagram: entry.build({ text: contextText }) };
    }
  }

  return null;
}

// Un schéma « composite » (cercles, segments posés par coordonnées) pour
// un circuit est remplacé par le vrai circuit normalisé.
function preferRegisteredVisual(diagram, { text = '', userMessage = '', recentUserMessages = [] } = {}) {
  if (!diagram || diagram.type !== 'composite') return diagram;
  const resolved = resolveRequestedVisual({ userMessage, recentUserMessages, lastAssistantMessage: text });
  return resolved ? resolved.diagram : diagram;
}

// SVT / biologie : tout ce qui a une forme réelle (organe, appareil,
// cellule, plante, fleur, coupe géologique...) se montre par un DESSIN
// annoté, comme dans un manuel. En test réel (tube digestif, 6e), le
// modèle a répondu par une liste de cases « Bouche → Œsophage → ... »
// alors que l'élève voulait voir à quoi ressemble l'appareil. Un schéma
// flow / structure sur une telle notion est donc converti en commande de
// dessin ; les vrais processus (cycle, classification, comparaison) restent.
const LIFE_SCIENCE_SUBJECT = /\b(svt|biologie|sciences? de la vie|sciences? naturelles?|sciences? de la terre|geologie)\b/;
const ANATOMY_WORDS = /\b(appareils?|systemes? (digestif|respiratoire|circulatoire|nerveux|excreteur|urinaire|reproducteur|osseux|immunitaire)|tube digestif|digesti\w*|organes?|bouche|oesophage|estomac|intestins?|foie|pancreas|poumons?|bronch\w*|trachee|alveoles?|coeur|oreillettes?|ventricules?|arteres?|veines?|vaisseaux|reins?|vessie|ureteres?|uterus|ovaires?|testicules?|cerveau|moelle|neurones?|nerfs?|oeil|oreille|peau|squelette|os|muscles?|articulations?|dents?|cellules?|noyau|membrane|cytoplasme|chloroplastes?|mitochondries?|fleurs?|petales?|etamines?|pistil|graines?|racines?|tiges?|feuilles?|stomates?|fruits?|volcans?|cheminee|magma|seismes?|failles?|plis?|couches? geologiques?|globe terrestre|manteau|croute|noyau terrestre)\b/;

function needsAnatomicalDrawing(diagram, { subjectName = '', topic = '' } = {}) {
  if (!diagram || diagram.type !== 'schema' || !['flow', 'structure'].includes(diagram.form)) return false;
  if (!LIFE_SCIENCE_SUBJECT.test(normalise(subjectName))) return false;
  const nodes = Array.isArray(diagram.nodes) ? diagram.nodes : [];
  const text = normalise([diagram.title, ...nodes.map((node) => node.label)].join(' '));
  return ANATOMY_WORDS.test(text) || (nodes.length === 0 && ANATOMY_WORDS.test(normalise(topic)));
}

function anatomicalDrawingCommand(diagram) {
  const nodes = Array.isArray(diagram.nodes) ? diagram.nodes : [];
  const parts = nodes.map((node) => node.label).filter(Boolean).join(', ');
  const highlighted = nodes.find((node) => node.highlight)?.label;
  return {
    type: 'schema',
    form: 'illustration',
    title: diagram.title || '',
    pending: true,
    draw: `dessin anatomique réaliste et annoté (comme dans un manuel) : ${diagram.title || 'la structure étudiée'}${parts ? ` ; parties à légender : ${parts}` : ''}${highlighted ? ` ; mettre en évidence : ${highlighted}` : ''}`,
  };
}

// Catalogue des visuels présenté au modèle.
function describeRegisteredVisuals() {
  return `- Schéma générique (toutes matières scientifiques) : choisis la FORME qui convient et remplis-la, sans aucune coordonnée :
  • étapes d'un processus (sans forme à montrer) : <explanation-data>{"diagram":{"type":"schema","form":"flow","title":"Étapes de la germination","nodes":[{"id":"graine","label":"Graine sèche","detail":"vie ralentie"},{"id":"eau","label":"Absorption d'eau","detail":"la graine gonfle"},{"id":"radicule","label":"Sortie de la radicule","detail":"première racine"},{"id":"plantule","label":"Plantule","detail":"tige et premières feuilles"}]}}</explanation-data>
  • cycle : {"type":"schema","form":"cycle","title":"...","nodes":[{"label":"...","detail":"..."}, ...]}
  • classification : {"type":"schema","form":"hierarchy","title":"...","nodes":[{"id":"a","label":"Êtres vivants"},{"id":"b","label":"Animaux","parent":"a"}]}
  • comparaison : {"type":"schema","form":"comparison","title":"...","columns":[{"title":"Inspiration","items":["...","..."]},{"title":"Expiration","items":["..."]}]}
  • structure légendée : {"type":"schema","form":"structure","title":"La cellule","nodes":[{"label":"Membrane","detail":"...","zone":"top"},{"label":"Noyau","detail":"...","zone":"center"}]}
  • illustration = DESSIN annoté (tout ce qui a une FORME réelle : organe, appareil du corps, cellule, coupe, fleur, plante, volcan, montage, carte...) : ne dessine pas toi-même, décris seulement ce qu'il faut dessiner, le système produit le dessin numéroté et légendé : <explanation-data>{"diagram":{"type":"schema","form":"illustration","title":"L'appareil respiratoire","draw":"buste humain vu de face : fosses nasales, trachée, deux bronches, deux poumons, diaphragme ; mettre en évidence les poumons"}}</explanation-data>
  SVT / biologie / géologie, TOUTES les classes : un organe, un appareil (digestif, respiratoire, circulatoire, urinaire, reproducteur, nerveux), une cellule, une plante, une fleur, une graine, une structure de la Terre se montre TOUJOURS par une illustration (dessin réaliste annoté), JAMAIS par une liste de cases, un trajet en flèches ou une structure en zones. Dès la première explication d'une telle notion, mets ce dessin sans attendre qu'on te le demande. Le trajet (des aliments, de l'air, du sang) se décrit dans le texte ou s'ajoute au dessin, il ne le remplace pas.
  Règles : 2 à 12 éléments, étiquettes courtes (moins de 40 caractères), « detail » = rôle en une phrase, « highlight »: true pour l'élément dont on parle.
  Choix de la forme : un trajet ou une transformation → flow ; ce qui recommence → cycle ; des catégories → hierarchy ; deux situations à opposer → comparison ; les parties d'un objet, d'un organe ou d'un être vivant → illustration (structure seulement pour un objet abstrait sans forme réelle).
- Graphique mathématique (OBLIGATOIRE pour tout ce qui a des coordonnées ou des mesures : fonction, dérivée et tangente, intégrale et aire, limite et asymptote, suite, droite, vecteurs et relation de Chasles, barycentre, nombre complexe, cercle trigonométrique, mouvement x(t), forces et leur décomposition, courbe de dosage, de cinétique, de potentiel d'action...). Tu donnes des DONNÉES, le système calcule et dessine exactement (repère gradué, point posé sur la courbe, tangente qui touche la courbe, angle juste) :
  <explanation-data>{"diagram":{"type":"graph","title":"f(x) = x² et sa tangente en A","functions":[{"expr":"x^2","label":"f(x) = x²","domain":[-3,3]}],"points":[{"label":"A","x":1,"on":0,"guides":true}],"tangents":[{"function":0,"at":1,"label":"tangente en A"}]}}</explanation-data>
  Éléments possibles : "functions" [{"expr","label","domain":[a,b]}] (expr en x : 3x^2-5x+2, sqrt(x), exp(x), ln(x), sin(x), 1/(x-2)) ; "areas" [{"function":0,"from":a,"to":b,"label"}] ; "tangents" [{"function":0,"at":x0,"label"}] ; "points" [{"label","x","y"} ou {"label","x","on":0}, "guides":true pour les pointillés vers les axes] ; "segments" [{"from":"A","to":"B","arrow":true,"dashed":false,"label"}] ; "vectors" [{"label","from":[x,y],"components":[dx,dy]} ou {"label","from":[x,y],"length":50,"angle":60}] ; "lines" [{"x":2,"label":"asymptote x = 2"}] ; "circles" [{"center":[0,0],"r":1}] ; "angles" [{"at":[0,0],"from":[1,0],"to":"A","label":"60°"}] ; "curves" [{"label","points":[[x,y],...]}] pour des mesures (dosage, cinétique) ; "xLabel","yLabel" (ex. "V (mL)", "pH") ; "equalScale":true pour vecteurs, angles et cercles ; "axes":false,"grid":false pour un schéma de forces sans repère.
  Les nombres du graphique sont EXACTEMENT ceux du texte. N'utilise jamais une illustration ni un composite pour ces notions.
- Molécule (chimie organique : alcanes, alcools, acides, nomenclature) : tu donnes la chaîne principale et les ramifications, le système compte les hydrogènes et dessine la formule :
  <explanation-data>{"diagram":{"type":"molecule","title":"2-méthylbutane","name":"C₅H₁₂","chain":["C","C","C","C"],"substituents":[{"at":2,"group":"CH3"}],"numbering":true,"mode":"condensed"}}</explanation-data>
  "chain" : atomes de la chaîne principale (C, O, N...) ; "bonds" : [1,2,...] liaisons entre atomes consécutifs (2 = double) ; "substituents" : [{"at": position 1, 2..., "group": "CH3|C2H5|OH|NH2|Cl|Br|=O|COOH", "side":"up|down"}] ; "mode" : "condensed" (semi-développée) ou "developed" (développée, tous les H). Dans un exercice, le titre ne doit pas donner le nom demandé.
- Terrain de sport (EPS : placement, zones, rotation, transmission, appel) : le système dessine les tracés réglementaires, tu places joueurs et déplacements en % de la longueur (x) et de la largeur (y) :
  <explanation-data>{"diagram":{"type":"field","sport":"handball","title":"Jet de 7 m","highlightZone":"zone-6m","players":[{"label":"T","x":17,"y":50},{"label":"G","x":3,"y":50,"team":"b"}],"arrows":[{"from":[17,50],"to":[2,50],"kind":"pass","label":"tir"}]}}</explanation-data>
  "sport" : basketball | volleyball | handball | football | relais | saut-longueur ; "highlightZone" : raquette | ligne-3m | zone-6m | surface | zone-passage | planche ; "arrows" kind : "run" (course) ou "pass" (passe, tir).
- Circuit électrique : <explanation-data>{"diagram":{"type":"electric-circuit","components":[{"kind":"battery"},{"kind":"switch","closed":false},{"kind":"lamp"}],"brokenWire":false}}</explanation-data>`;
}

// =====================================================================
// Honnêteté visuelle.
//
// Si aucun schéma n'accompagne réellement le message, les phrases qui
// annoncent en afficher un (« Voici le schéma... ») sont retirées et
// remplacées par une phrase honnête.
// =====================================================================

const CLAIM_NOUN = /\b(schemas?|shemas?|dessins?|images?|figures?|illustrations?|croquis|ci dessous|ci contre)\b/;
const CLAIM_VERB = /\b(voici|voila|regarde\w*|observe\w*|ci dessous|ci contre|suivant|je te montre|je vais te montrer|je t ai (fait|dessine|prepare)|comme (sur|dans) (le|ce) (schema|dessin))\b/;

const HONEST_NO_VISUAL_NOTE = "Je ne peux pas encore afficher de schéma pour cette partie, alors je te l'ai décrit avec des mots.";

// Une phrase qui dit justement qu'il n'y a pas de schéma n'est pas une
// annonce trompeuse (« je ne peux pas faire de dessin, mais voici... »).
const CLAIM_NEGATION = /\b(ne (peux|peut|vais|pourrai)|pas de (schema|dessin|image|carte)|impossible|je ne|n est pas possible)\b/;

function enforceVisualHonesty(text, hasVisual, { note = HONEST_NO_VISUAL_NOTE } = {}) {
  const source = String(text || '');
  if (hasVisual || !source) return { text: source, removed: false };

  let removed = false;

  const cleaned = source
    .split('\n')
    .map((line) => {
      const sentences = line.split(/(?<=[.!?:])\s+/);
      const kept = sentences.filter((sentence) => {
        const normalized = normalise(sentence);
        const claims = CLAIM_NOUN.test(normalized) && CLAIM_VERB.test(normalized) && !CLAIM_NEGATION.test(normalized);
        if (claims) removed = true;
        return !claims;
      });
      return kept.join(' ');
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!removed) return { text: source, removed: false };

  if (!note) return { text: cleaned, removed: true };

  return {
    text: cleaned ? `${cleaned}\n\n${note}` : note,
    removed: true,
  };
}

// Un énoncé qui renvoie à un schéma absent est inutilisable par l'élève.
function textReferencesVisual(text) {
  const normalized = normalise(text);
  if (/\b(figures? suivantes?|schemas? suivants?|dessins? suivants?|situations? suivantes?|chaque situation|chaque figure|ci dessous|ci contre)\b/.test(normalized)) return true;
  return CLAIM_NOUN.test(normalized) && /\b(observe\w*|regarde\w*|ci dessous|ci contre|sur le schema|sur la figure|d apres le schema|d apres la figure)\b/.test(normalized);
}

module.exports = {
  getSubjectVisualPolicy,
  needsAnatomicalDrawing,
  anatomicalDrawingCommand,
  VISUAL_REGISTRY,
  GEOMETRY_VISUAL_TYPES,
  SCHEMA_FORMS,
  ILLUSTRATION_TONES,
  sanitiseSchema,
  buildElectricCircuit,
  normalise,
  isRegisteredVisualType,
  sanitiseRegisteredVisual,
  toQuizVisual,
  alternativeVisual,
  detectVisualRequest,
  resolveRequestedVisual,
  preferRegisteredVisual,
  describeRegisteredVisuals,
  enforceVisualHonesty,
  textReferencesVisual,
  HONEST_NO_VISUAL_NOTE,
};
