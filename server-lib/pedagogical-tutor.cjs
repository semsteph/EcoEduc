// =====================================================================
// Moteur d'état du tuteur pédagogique.
//
// IMPORTANT :
// Les valeurs TUTOR_STATES sont strictement internes.
// Elles ne doivent jamais être affichées directement à l'élève.
//
// Le backend est l'unique autorité pour les transitions.
// Claude peut expliquer, générer ou évaluer un exercice,
// mais Claude ne décide jamais du prochain état.
// =====================================================================

const { sanitiseRegisteredVisual, isRegisteredVisualType, toQuizVisual } = require('./tutor-visuals.cjs');

const TUTOR_STATES = Object.freeze({
  EXPLANATION: 'EXPLANATION',
  UNDERSTANDING_CHECK: 'UNDERSTANDING_CHECK',
  APPLICATION_EXERCISE: 'APPLICATION_EXERCISE',
  APPLICATION_RETRY: 'APPLICATION_RETRY',
  BOOK_SELECTION: 'BOOK_SELECTION',
  BOOK_LOOKUP: 'BOOK_LOOKUP',
  BOOK_REFERENCE: 'BOOK_REFERENCE',
  FOLLOW_UP: 'FOLLOW_UP',
});

// =====================================================================
// Événements internes déclenchés exclusivement par le backend.
// =====================================================================

const TUTOR_EVENTS = Object.freeze({
  EXPLANATION_SENT: 'EXPLANATION_SENT',
  NOT_UNDERSTOOD: 'NOT_UNDERSTOOD',
  UNDERSTOOD: 'UNDERSTOOD',
  ANSWER_INCORRECT: 'ANSWER_INCORRECT',
  ANSWER_CORRECT: 'ANSWER_CORRECT',
  BOOK_PROVIDED: 'BOOK_PROVIDED',
  REFERENCE_VERIFIED: 'REFERENCE_VERIFIED',
  REFERENCE_UNAVAILABLE: 'REFERENCE_UNAVAILABLE',
  FOLLOW_UP_REQUESTED: 'FOLLOW_UP_REQUESTED',
  EXERCISE_REEXPLAINED: 'EXERCISE_REEXPLAINED',
  BOOK_SELECTION_REQUESTED: 'BOOK_SELECTION_REQUESTED',
  BOOK_EXERCISE_STARTED: 'BOOK_EXERCISE_STARTED',
  // L'élève demande explicitement un exercice (« donne-moi un exercice »).
  EXERCISE_REQUESTED: 'EXERCISE_REQUESTED',
  // Pendant la vérification, l'élève pose une nouvelle question sur la
  // notion (ou demande un schéma) : on réexplique, puis on revérifie.
  QUESTION_ASKED: 'QUESTION_ASKED',
  // Pas de manuel (ou demande d'exercice) pendant la sélection du manuel.
  BOOK_DECLINED: 'BOOK_DECLINED',
});

// =====================================================================
// Transitions autorisées.
// =====================================================================

const TRANSITIONS = Object.freeze({
  [TUTOR_STATES.EXPLANATION]: {
    [TUTOR_EVENTS.EXPLANATION_SENT]: TUTOR_STATES.UNDERSTANDING_CHECK,
    [TUTOR_EVENTS.EXERCISE_REQUESTED]: TUTOR_STATES.APPLICATION_EXERCISE,
  },

  [TUTOR_STATES.UNDERSTANDING_CHECK]: {
    [TUTOR_EVENTS.NOT_UNDERSTOOD]: TUTOR_STATES.EXPLANATION,
    [TUTOR_EVENTS.QUESTION_ASKED]: TUTOR_STATES.EXPLANATION,
    [TUTOR_EVENTS.UNDERSTOOD]: TUTOR_STATES.APPLICATION_EXERCISE,
    [TUTOR_EVENTS.EXERCISE_REQUESTED]: TUTOR_STATES.APPLICATION_EXERCISE,
  },

  [TUTOR_STATES.APPLICATION_EXERCISE]: {
    [TUTOR_EVENTS.ANSWER_INCORRECT]: TUTOR_STATES.APPLICATION_RETRY,
    [TUTOR_EVENTS.ANSWER_CORRECT]: TUTOR_STATES.APPLICATION_EXERCISE,
    [TUTOR_EVENTS.BOOK_SELECTION_REQUESTED]: TUTOR_STATES.BOOK_SELECTION,
    // L'élève demande un autre exercice : le nouvel exercice remplace
    // l'ancien (sans cela, le modèle en improvisait un en simple texte,
    // inconnu du système et donc impossible à corriger).
    [TUTOR_EVENTS.EXERCISE_REQUESTED]: TUTOR_STATES.APPLICATION_EXERCISE,
  },

  [TUTOR_STATES.APPLICATION_RETRY]: {
    [TUTOR_EVENTS.ANSWER_INCORRECT]: TUTOR_STATES.APPLICATION_RETRY,
    [TUTOR_EVENTS.ANSWER_CORRECT]: TUTOR_STATES.APPLICATION_EXERCISE,
    [TUTOR_EVENTS.EXERCISE_REEXPLAINED]: TUTOR_STATES.EXPLANATION,
    [TUTOR_EVENTS.EXERCISE_REQUESTED]: TUTOR_STATES.APPLICATION_EXERCISE,
  },

  [TUTOR_STATES.BOOK_SELECTION]: {
    [TUTOR_EVENTS.BOOK_PROVIDED]: TUTOR_STATES.BOOK_LOOKUP,
    // L'élève n'a pas de manuel, ou veut simplement continuer à s'exercer :
    // on ne reste pas bloqué à attendre un titre.
    [TUTOR_EVENTS.BOOK_DECLINED]: TUTOR_STATES.FOLLOW_UP,
  },

  [TUTOR_STATES.BOOK_LOOKUP]: {
    [TUTOR_EVENTS.REFERENCE_VERIFIED]: TUTOR_STATES.BOOK_REFERENCE,
    [TUTOR_EVENTS.REFERENCE_UNAVAILABLE]: TUTOR_STATES.FOLLOW_UP,
  },

  [TUTOR_STATES.BOOK_REFERENCE]: {
    [TUTOR_EVENTS.FOLLOW_UP_REQUESTED]: TUTOR_STATES.FOLLOW_UP,
    [TUTOR_EVENTS.BOOK_EXERCISE_STARTED]: TUTOR_STATES.APPLICATION_EXERCISE,
  },

  [TUTOR_STATES.FOLLOW_UP]: {
    [TUTOR_EVENTS.FOLLOW_UP_REQUESTED]: TUTOR_STATES.FOLLOW_UP,
    // Sans cette sortie, un élève en suivi ne pouvait plus jamais obtenir
    // de nouvel exercice : l'état restait bloqué en FOLLOW_UP.
    [TUTOR_EVENTS.EXERCISE_REQUESTED]: TUTOR_STATES.APPLICATION_EXERCISE,
  },
});

// =====================================================================
// Création de l'état initial.
// =====================================================================

function createTutorState() {
  return {
    version: 1,
    phase: TUTOR_STATES.EXPLANATION,
    topic: null,
    exercise: null,
    attempts: 0,
    hintsUsed: 0,
    exerciseLevel: 1,
    completedExercises: 0,
    bookPracticeActive: false,
    bookExerciseCount: 0,
    lastExplanationVisual: null,
    score: null,
    lastAssessment: null,
    selectedBook: null,
    bookReferenceId: null,
    bookReferencePage: null,
    bookReferenceExercise: null,
    bookReferenceTopic: null,
    updatedAt: new Date().toISOString(),
  };
}

// =====================================================================
// Lecture / restauration d'un état existant.
// =====================================================================

function readTutorState(value) {
  if (!value) {
    return createTutorState();
  }

  try {
    const parsed = typeof value === 'string'
      ? JSON.parse(value)
      : value;

    if (
      !parsed
      || typeof parsed !== 'object'
      || Array.isArray(parsed)
      || !Object.values(TUTOR_STATES).includes(parsed.phase)
    ) {
      return createTutorState();
    }

    const baseState = createTutorState();

    const attempts = Number.isInteger(parsed.attempts)
      ? Math.max(0, Math.min(parsed.attempts, 100))
      : 0;

    const hintsUsed = Number.isInteger(parsed.hintsUsed)
      ? Math.max(0, Math.min(parsed.hintsUsed, 20))
      : 0;

    const exerciseLevel = Number.isInteger(parsed.exerciseLevel)
      ? Math.max(1, Math.min(parsed.exerciseLevel, 5))
      : 1;

    const completedExercises = Number.isInteger(parsed.completedExercises)
      ? Math.max(0, Math.min(parsed.completedExercises, 100))
      : 0;

    const bookExerciseCount = Number.isInteger(parsed.bookExerciseCount)
      ? Math.max(0, Math.min(parsed.bookExerciseCount, 100))
      : 0;

    const score = Number.isFinite(Number(parsed.score))
      ? Math.max(0, Math.min(Number(parsed.score), 100))
      : null;

    const bookReferenceId = Number.isInteger(parsed.bookReferenceId)
      && parsed.bookReferenceId > 0
      ? parsed.bookReferenceId
      : null;

    const bookReferencePage = Number.isInteger(parsed.bookReferencePage)
      && parsed.bookReferencePage > 0
      ? parsed.bookReferencePage
      : null;

    const bookReferenceExercise = typeof parsed.bookReferenceExercise === 'string'
      ? parsed.bookReferenceExercise.trim().slice(0, 100)
      : null;

    const bookReferenceTopic = typeof parsed.bookReferenceTopic === 'string'
      ? parsed.bookReferenceTopic.trim().slice(0, 255)
      : null;

    return {
      ...baseState,
      ...parsed,

      version: 1,

      phase: parsed.phase,

      topic: typeof parsed.topic === 'string'
        ? parsed.topic.trim().slice(0, 255)
        : null,

      exercise: sanitiseExercise(parsed.exercise),

      selectedBook: typeof parsed.selectedBook === 'string'
        ? parsed.selectedBook.trim().slice(0, 255)
        : null,

      attempts,

      hintsUsed,

      exerciseLevel,
      completedExercises,
      bookPracticeActive: parsed.bookPracticeActive === true,
      bookExerciseCount,
      lastExplanationVisual: parsed.lastExplanationVisual && typeof parsed.lastExplanationVisual === 'object'
        ? parsed.lastExplanationVisual
        : null,
      score,
      lastAssessment: parsed.lastAssessment && typeof parsed.lastAssessment === 'object'
        ? parsed.lastAssessment
        : null,

      bookReferenceId,

      updatedAt: typeof parsed.updatedAt === 'string'
        ? parsed.updatedAt
        : baseState.updatedAt,
    };
  } catch (_) {
    return createTutorState();
  }
}

// =====================================================================
// Transition d'état.
// =====================================================================

function transitionTutorState(currentState, event) {
  const state = readTutorState(currentState);

  const nextPhase = TRANSITIONS[state.phase]?.[event];

  if (!nextPhase) {
    return {
      changed: false,
      state,
    };
  }

  const nextState = {
    ...state,
    phase: nextPhase,
    updatedAt: new Date().toISOString(),
  };

  if (event === TUTOR_EVENTS.ANSWER_INCORRECT) {
    nextState.attempts = Math.min(nextState.attempts + 1, 100);
  }

  if (event === TUTOR_EVENTS.ANSWER_CORRECT) {
    nextState.attempts = 0;
    nextState.hintsUsed = 0;
    nextState.completedExercises = Math.min(100, (nextState.completedExercises || 0) + 1);
  }

  if (event === TUTOR_EVENTS.UNDERSTOOD || event === TUTOR_EVENTS.EXERCISE_REQUESTED) {
    nextState.attempts = 0;
    nextState.hintsUsed = 0;
  }

  return {
    changed: true,
    state: nextState,
  };
}

// =====================================================================
// Schémas "composite" (plusieurs formes simples combinées : cercles,
// rectangles, segments, angles, points...) — seul moyen de représenter
// visuellement une notion qui n'est pas une figure géométrique classique
// (ex: une cellule = un cercle + un petit cercle + des étiquettes, ou un
// échange gazeux = des segments fléchés annotés). Partagé entre les
// schémas d'explication (assistant.routes.cjs) et ceux d'exercice
// (ci-dessous) pour que les deux acceptent exactement le même format.
// =====================================================================

function sanitisePoint2D(point) {
  if (!point || typeof point !== 'object' || Array.isArray(point)) return null;

  const x = Number(point.x);
  const y = Number(point.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < 0 || x > 500 || y < 0 || y > 320) return null;

  return { x: Math.round(x), y: Math.round(y) };
}

function sanitisePointsDict(rawPoints, maxCount) {
  const points = {};

  if (!rawPoints || typeof rawPoints !== 'object' || Array.isArray(rawPoints)) {
    return points;
  }

  for (const [label, point] of Object.entries(rawPoints).slice(0, maxCount)) {
    if (!/^[A-Z][A-Z0-9]?$/.test(label)) continue;
    const clean = sanitisePoint2D(point);
    if (clean) points[label] = clean;
  }

  return points;
}

const COMPOSITE_ELEMENT_TYPES = new Set([
  'point', 'segment', 'line', 'triangle', 'right-triangle',
  'rectangle', 'square', 'parallelogram', 'circle', 'angle',
]);

function sanitiseCompositeElements(rawElements) {
  if (!Array.isArray(rawElements)) return [];

  return rawElements.slice(0, 20).map((el) => {
    if (!el || typeof el !== 'object' || Array.isArray(el)) return null;

    const type = typeof el.type === 'string' ? el.type.trim().toLowerCase() : '';
    if (!COMPOSITE_ELEMENT_TYPES.has(type)) return null;

    const label = typeof el.label === 'string'
      ? el.label.replace(/\s+/g, ' ').trim().slice(0, 40)
      : '';

    if (type === 'point') {
      const coordinates = sanitisePoint2D(el.coordinates || el.point || el);
      if (!coordinates) return null;
      return { type, coordinates, ...(label ? { label } : {}) };
    }

    if (type === 'segment' || type === 'line') {
      const points = sanitisePointsDict(el.points, 2);
      if (Object.keys(points).length < 2) return null;
      // Trait de longueur nulle (utilisé comme étiquette) : flèches en
      // « nœud papillon » au rendu (cas réel), on l'écarte.
      const [p1, p2] = Object.values(points);
      if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < 8) return null;
      return { type, points, ...(label ? { label } : {}) };
    }

    if (['triangle', 'right-triangle', 'rectangle', 'square', 'parallelogram'].includes(type)) {
      const points = sanitisePointsDict(el.points, 4);
      if (Object.keys(points).length < 3) return null;
      return { type, points, filled: el.filled === false ? false : true, ...(label ? { label } : {}) };
    }

    if (type === 'circle') {
      const center = sanitisePoint2D(el.center || el.coordinates);
      const radius = Number(el.radius);
      if (!center || !Number.isFinite(radius) || radius <= 0) return null;
      return { type, center, radius: Math.min(radius, 140), filled: el.filled === true, ...(label ? { label } : {}) };
    }

    if (type === 'angle') {
      const points = sanitisePointsDict(el.points, 3);
      if (Object.keys(points).length < 3) return null;
      return { type, points, ...(label ? { label } : {}) };
    }

    return null;
  }).filter(Boolean);
}

// =====================================================================
// Figures dimensionnées : le modèle donne les mesures (« rectangle de
// 5 cm sur 3 cm »), le backend calcule les coordonnées. Le schéma est
// ainsi toujours proportionné et cohérent avec le texte (observé en test :
// « carré de 3 cm » dans le texte, « 4 cm » sur la figure, ou un carré
// envoyé sans aucun point et affiché vide).
// =====================================================================

// Nombre minimal de points pour qu'une figure soit dessinable.
const MIN_POINTS = {
  point: 1, segment: 2, line: 2, circle: 1,
  triangle: 3, 'right-triangle': 3,
  rectangle: 4, square: 4, parallelogram: 4,
};

function formatMeasure(value, unit) {
  const number = Number(value);
  const text = Number.isInteger(number) ? String(number) : String(Math.round(number * 100) / 100).replace('.', ',');
  return unit ? `${text} ${unit}` : text;
}

// Quadrillage en carrés-unités (pour « compter les petits carrés »).
function unitGrid(width, height) {
  const w = Number(width);
  const h = Number(height);
  return Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0 && w <= 15 && h <= 15
    ? { cols: w, rows: h }
    : null;
}

function buildDimensionedFigure(d) {
  if (!d || typeof d !== 'object') return null;
  const type = String(d.type || '').toLowerCase();
  const unit = typeof d.unit === 'string' ? d.unit.trim().slice(0, 6) : 'cm';
  const positive = (v) => Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) < 100000;
  const cx = 250;
  const cy = 160;

  if (type === 'square' && positive(d.side)) {
    const px = 180;
    return {
      type,
      points: {
        A: { x: cx - px / 2, y: cy + px / 2 }, B: { x: cx + px / 2, y: cy + px / 2 },
        C: { x: cx + px / 2, y: cy - px / 2 }, D: { x: cx - px / 2, y: cy - px / 2 },
      },
      labels: true,
      measurements: { 'A-B': formatMeasure(d.side, unit), 'B-C': formatMeasure(d.side, unit) },
      ...(d.grid ? { grid: unitGrid(d.side, d.side) } : {}),
    };
  }

  if (type === 'rectangle' && positive(d.width) && positive(d.height)) {
    const scale = Math.min(300 / Number(d.width), 190 / Number(d.height));
    const w = Math.max(40, Math.round(Number(d.width) * scale));
    const h = Math.max(30, Math.round(Number(d.height) * scale));
    return {
      type,
      points: {
        A: { x: cx - w / 2, y: cy + h / 2 }, B: { x: cx + w / 2, y: cy + h / 2 },
        C: { x: cx + w / 2, y: cy - h / 2 }, D: { x: cx - w / 2, y: cy - h / 2 },
      },
      labels: true,
      measurements: { 'A-B': formatMeasure(d.width, unit), 'B-C': formatMeasure(d.height, unit) },
      ...(d.grid ? { grid: unitGrid(d.width, d.height) } : {}),
    };
  }

  if (type === 'circle' && positive(d.radius)) {
    return {
      type,
      points: { O: { x: cx, y: cy }, A: { x: cx + 110, y: cy } },
      labels: true,
      filled: typeof d.filled === 'boolean' ? d.filled : null,
      measurements: { 'O-A': formatMeasure(d.radius, unit) },
    };
  }

  return null;
}

// Figure décrite dans un texte (« un rectangle de 5 cm sur 3 cm », « un
// carré de 7 m de côté », « un cercle de rayon 3 cm ») : construite par le
// backend, donc toujours cohérente avec le texte.
function inferFigureFromText(text, { preferType = null } = {}) {
  // Figure du type annoncé par le texte (« Et maintenant un carré : »)
  // cherchée en priorité.
  if (preferType === 'square') {
    const square = inferFigureFromText(String(text || '').replace(/rectang\w*/gi, ''), {});
    if (square?.type === 'square') return square;
  }

  const source = String(text || '').replace(/,(\d)/g, '.$1');
  const num = '(\\d+(?:\\.\\d+)?)';
  const unit = '(mm|cm|km|m)\\b';
  const grid = /\b(petits? carr\w*|carreaux|quadrill\w*|carr\w* unit\w*)\b/i.test(source);

  let match = source.match(new RegExp(`rectang\\w*[^.?!]{0,80}?${num}\\s*(?:${unit})?\\s*(?:sur|par|x|×|de long\\w*\\s*et|et)\\s*${num}\\s*${unit}`, 'i'));
  if (match) {
    return buildDimensionedFigure({ type: 'rectangle', width: Number(match[1]), height: Number(match[3]), unit: match[4] || match[2], grid });
  }

  match = source.match(new RegExp(`longueur\\s*(?:de|=|:)?\\s*${num}\\s*${unit}[^.?!]{0,40}?largeur\\s*(?:de|=|:)?\\s*${num}\\s*${unit}`, 'i'));
  if (match) {
    return buildDimensionedFigure({ type: 'rectangle', width: Number(match[1]), height: Number(match[3]), unit: match[4] || match[2], grid });
  }

  // « petits carrés de 1 cm » décrit le quadrillage, pas la figure (cas
  // réel : le carré de 2 cm remplacé par un carré-unité).
  match = source.replace(/petits?\s+carr[eé]s?[^.?!]{0,30}?\d+(?:\.\d+)?\s*(mm|cm|km|m)\b/gi, '')
    .match(new RegExp(`carr[eé]\\w*[^.?!]{0,50}?${num}\\s*${unit}`, 'i'));
  if (match && !/\b(cm|m|mm|km)\s*[²2]/.test(source.slice(match.index, match.index + match[0].length + 2))) {
    return buildDimensionedFigure({ type: 'square', side: Number(match[1]), unit: match[2], grid });
  }

  match = source.match(new RegExp(`(?:cercle|disque)[^.?!]{0,50}?(rayon|diam[eè]tre)\\s*(?:de|=|:)?\\s*${num}\\s*${unit}`, 'i'));
  if (match) {
    const value = Number(match[2]);
    return buildDimensionedFigure({ type: 'circle', radius: /diam/i.test(match[1]) ? value / 2 : value, unit: match[3] });
  }

  return null;
}

function sanitiseGrid(grid) {
  if (!grid || typeof grid !== 'object') return null;
  return unitGrid(grid.cols, grid.rows);
}

function hasEnoughPoints(type, points) {
  const required = MIN_POINTS[type] || 0;
  return Object.keys(points || {}).length >= required;
}

// =====================================================================
// Nettoyage / validation d'un exercice.
// =====================================================================

function sanitiseExercise(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const text = (input, max) => typeof input === 'string'
    ? input.replace(/\s+/g, ' ').trim().slice(0, max)
    : '';

  // 400 caractères : les réponses attendues rédigées étaient coupées en
  // plein mot à 160 (« ...pour êtr »), ce qui faussait la correction.
  // Le modèle envoie parfois plusieurs variantes dans une seule chaîne,
  // séparées par « | » : elles sont découpées.
  const answers = (v) => Array.isArray(v)
    ? v.flatMap((x) => (typeof x === 'string' ? x.split('|') : [x]))
      .map(x => text(x, 400)).filter(Boolean).slice(0, 12)
    : [];

  const criteria = (v) => Array.isArray(v)
    ? v.map(x => text(x, 400)).filter(Boolean).slice(0, 8)
    : [];

  const hints = (v) => Array.isArray(v)
    ? v.map(x => text(x, 400)).filter(Boolean).slice(0, 5)
    : [];

  const sanitiseDiagram = (d) => {
    if (!d || typeof d !== 'object' || Array.isArray(d)) return null;

    const allowed = new Set([
      'angle', 'parallelogram', 'triangle', 'right-triangle',
      'rectangle', 'square', 'circle', 'coordinate-plane', 'composite',
    ]);

    const type = text(d.type, 40).toLowerCase();
    // Un schéma d'exercice ne doit jamais montrer la réponse (lampe
    // allumée, nom de l'organe...) : toujours en mode « question ».
    if (isRegisteredVisualType(type)) return toQuizVisual(sanitiseRegisteredVisual(d));
    if (!allowed.has(type)) return null;

    if (type === 'composite') {
      const elements = sanitiseCompositeElements(d.elements);
      if (!elements.length) return null;

      return {
        type: 'composite',
        elements,
        labels: d.labels !== false,
        annotations: Array.isArray(d.annotations)
          ? d.annotations.slice(0, 6).map(a => text(a, 120)).filter(Boolean)
          : [],
      };
    }

    if (type === 'angle') {
      const angleDegrees = Number(d.angleDegrees);
      if (!Number.isFinite(angleDegrees) || angleDegrees <= 0 || angleDegrees >= 180) {
        return null;
      }

      const radians = angleDegrees * Math.PI / 180;
      const B = { x: 250, y: 170 };
      const radius = 120;

      return {
        type: 'angle',
        angleDegrees,
        points: {
          A: { x: 130, y: 170 },
          B,
          C: {
            x: Math.round(B.x - radius * Math.cos(radians)),
            y: Math.round(B.y - radius * Math.sin(radians)),
          },
        },
        labels: true,
        measurements: {
          'A-B': 'côté',
          'B-C': 'côté',
          angle: `${angleDegrees}°`,
        },
      };
    }

    const points = {};
    const rawPoints = d.points;

    if (rawPoints && typeof rawPoints === 'object' && !Array.isArray(rawPoints)) {
      for (const [label, point] of Object.entries(rawPoints).slice(0, 12)) {
        if (!/^[A-Z][A-Z0-9]?$/.test(label)) continue;
        if (!point || typeof point !== 'object' || Array.isArray(point)) continue;

        const x = Number(point.x);
        const y = Number(point.y);

        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (x < 0 || x > 500 || y < 0 || y > 320) continue;

        points[label] = { x: Math.round(x), y: Math.round(y) };
      }
    }

    if (!hasEnoughPoints(type, points)) {
      const dimensioned = buildDimensionedFigure(d);
      return dimensioned ? { ...dimensioned, labels: d.labels !== false } : null;
    }

    const measurements = {};

    if (d.measurements && typeof d.measurements === 'object' && !Array.isArray(d.measurements)) {
      for (const [key, measurement] of Object.entries(d.measurements).slice(0, 20)) {
        if (!/^[A-Z][A-Z0-9]?(?:-[A-Z][A-Z0-9]?)?$/.test(key)) continue;
        const clean = text(measurement, 80);
        if (clean) measurements[key] = clean;
      }
    }

    return {
      type,
      points,
      labels: d.labels !== false,
      measurements,
      ...(sanitiseGrid(d.grid) ? { grid: sanitiseGrid(d.grid) } : {}),
    };
  };

  const prompt = text(value.prompt, 1400);
  const solutionOutline = text(value.solutionOutline, 1800);

  let questions = [];

  if (Array.isArray(value.questions)) {
    questions = value.questions
      .slice(0, 12)
      .map((question, index) => {
        if (!question || typeof question !== 'object' || Array.isArray(question)) {
          return null;
        }

        const qPrompt = text(question.prompt, 700);
        const expectedAnswers = answers(question.expectedAnswers);
        const qCriteria = criteria(question.criteria);
        const qDiagram = sanitiseDiagram(question.diagram);

        if (!qPrompt || expectedAnswers.length === 0) return null;

        return {
          id: Number.isInteger(question.id) ? question.id : index + 1,
          prompt: qPrompt,
          expectedAnswers,
          criteria: qCriteria,
          diagram: qDiagram,
        };
      })
      .filter(Boolean);
  }

  if (questions.length === 0) {
    const expectedAnswers = answers(value.expectedAnswers);
    const qCriteria = criteria(value.criteria);

    if (prompt && expectedAnswers.length) {
      questions = [{
        id: 1,
        prompt,
        expectedAnswers,
        criteria: qCriteria,
      }];
    }
  }

  if (!prompt || !questions.length || !solutionOutline) return null;

  const globalCriteria = criteria(value.criteria);
  const finalCriteria = globalCriteria.length
    ? globalCriteria
    : questions.flatMap(q => q.criteria).filter(Boolean).slice(0, 8);

  if (!finalCriteria.length) return null;

  const hintPlan = hints(value.hintPlan);
  if (!hintPlan.length) return null;

  return {
    prompt,
    questions,
    expectedAnswers: questions.length === 1 ? questions[0].expectedAnswers : [],
    criteria: finalCriteria,
    hintPlan,
    solutionOutline,
    diagram: sanitiseDiagram(value.diagram),
  };
}

// =====================================================================
// Détection de compréhension.
// =====================================================================

function classifyUnderstandingMessage(message) {
  const normalized = normaliseText(message);

  if (!normalized) {
    return 'UNKNOWN';
  }

  // ---------------------------------------------------------------
  // L'élève dit explicitement qu'il n'a pas compris. Testé en premier :
  // « je crois que je n'ai pas compris » reste une incompréhension.
  // ---------------------------------------------------------------

  if (
    /^(non|pas vraiment|pas du tout|non pas vraiment|toujours pas)$/.test(normalized)
    || /\b(je ne comprends|je ne comprend|je n ai pas compris|j ai pas compris|je comprends pas|je comprend pas|je suis perdue?|explique encore|reexplique|pas clair|toujours pas compris|je ne comprends toujours pas|je comprends toujours pas|rien compris|je ne vois pas)\b/
      .test(normalized)
  ) {
    return 'NOT_UNDERSTOOD';
  }

  // ---------------------------------------------------------------
  // L'élève exprime une incertitude sur SA compréhension. Une simple
  // hésitation dans une réponse (« je crois que c'est l'estomac ») n'est
  // pas concernée : elle doit être évaluée comme une réponse.
  // ---------------------------------------------------------------

  const hedge = /\b(je pense|je crois|pas sur|pas sure|pas certaine?|peut etre|il me semble)\b/.test(normalized);
  const aboutUnderstanding = /\b(compris|comprends|comprend|clair|saisi|capte)\b/.test(normalized);

  if (
    (hedge && aboutUnderstanding)
    || /^(je (ne )?suis pas (sure?|certaine?)|pas sure?|bof|moyen|moyennement|je sais pas trop|je ne sais pas trop)$/.test(normalized)
  ) {
    return 'UNCERTAIN';
  }

  // ---------------------------------------------------------------
  // Compréhension partielle exprimée par l'élève.
  // ---------------------------------------------------------------

  if (
    /\b(un peu compris|compris un peu|a moitie|pas tout compris|pas tout a fait|presque compris|sauf|mais pas)\b/.test(normalized)
    && aboutUnderstanding
  ) {
    return 'PARTIAL_UNDERSTANDING';
  }

  // ---------------------------------------------------------------
  // L'élève confirme clairement avoir compris. Un « oui » ou un « ok »
  // seul n'est PAS une preuve de compréhension : il reste UNKNOWN et
  // sera interprété dans son contexte (question posée par le tuteur).
  // ---------------------------------------------------------------

  if (
    /^(oui j ai compris|j ai compris|c est clair|maintenant c est clair|d accord j ai compris|oui maintenant je comprends|je comprends mieux|je comprend mieux|ok je comprends mieux|ok d accord je comprends mieux|ok d accord je comprend mieux|ok j ai compris|oui c est clair)$/
      .test(normalized)
    || /\b(maintenant je comprends|j ai bien compris|c est devenu clair|je comprends maintenant|oui je comprends|je comprends mieux|je comprend mieux|je vois mieux|je comprends beaucoup mieux|j ai compris)\b/
      .test(normalized)
  ) {
    return 'UNDERSTOOD';
  }

  return 'UNKNOWN';
}

// =====================================================================
// Demande explicite d'exercice (« donne-moi un exercice », « je veux
// m'entraîner »). Déterministe : ce n'est pas au modèle de décider.
// =====================================================================

function isExerciseRequest(message) {
  const normalized = normaliseText(message);
  if (!normalized) return false;

  // Il faut une vraie demande (« donne-moi un exercice », « un autre
  // exo », « je veux m'entraîner ») : une question qui mentionne « l'exo »
  // (« dans l'exo, quel est le type de... ? ») n'en est pas une (cas réel).
  if (String(message).includes('?') || /\b(comment|pourquoi|c est quoi|explique|quel|quelle|quels|quelles)\b/.test(normalized)) return false;
  return /\b(exercices?|exo|exos)\b/.test(normalized)
      && /\b(donne\w*|propose\w*|veux|voudrais|aimerais|autre|nouvel\w*|encore|un|des|faire|fais)\b/.test(normalized)
    || /\b(entrainer|entraine|entrainement|teste moi|interroge moi|pose moi une question|quiz)\b/.test(normalized);
}

// =====================================================================
// Extraction des données techniques cachées dans une réponse Claude.
// =====================================================================

function extractTaggedData(rawText, tagName) {
  const escapedTag = String(tagName)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const expression = new RegExp(
    `<${escapedTag}>\\s*([\\s\\S]*?)\\s*</${escapedTag}>`,
    'i'
  );

  const source = String(rawText || '');

  const match = source.match(expression);

  const visibleText = source
    .replace(expression, '')
    .trim();

  if (!match) {
    return {
      visibleText,
      data: null,
    };
  }

  try {
    return {
      visibleText,
      data: JSON.parse(match[1]),
    };
  } catch (_) {
    return {
      visibleText,
      data: null,
    };
  }
}

// =====================================================================
// Normalisation avancée des réponses.
// =====================================================================

function normaliseAnswer(value) {
  return normaliseText(value)
    .replace(/\b(le|la|les|un|une|du|de|des)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// =====================================================================
// Extraction des nombres présents dans une réponse.
// =====================================================================

function extractNumbers(value) {
  const text = String(value || '')
    .replace(/,/g, '.');

  return [...text.matchAll(/-?\d+(?:\.\d+)?/g)]
    .map((match) => Number(match[0]))
    .filter((number) => Number.isFinite(number));
}

// =====================================================================
// Comparaison déterministe avec les réponses attendues.
//
// Utilisée comme filet de sécurité quand l'évaluation de Claude est
// inexploitable : « 16 cm », « 16 » et « Le périmètre est de 16 cm. »
// sont équivalents. La comparaison numérique n'est utilisée que lorsque
// chaque réponse contient exactement un nombre.
// =====================================================================

// Nombres écrits en lettres → chiffres (« vingt quatre » → 24,
// « quatre vingt dix » → 90). « un / une » isolés restent des articles.
const NUMBER_WORDS = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7,
  huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14,
  quinze: 15, seize: 16, vingt: 20, vingts: 20, trente: 30, quarante: 40,
  cinquante: 50, soixante: 60, cent: 100, cents: 100, mille: 1000,
};

function convertNumberWords(normalized) {
  const tokens = normalized.split(' ');
  const out = [];
  let i = 0;

  while (i < tokens.length) {
    if (!(tokens[i] in NUMBER_WORDS)) { out.push(tokens[i]); i += 1; continue; }

    const run = [];
    let j = i;
    while (j < tokens.length && ((tokens[j] in NUMBER_WORDS) || (tokens[j] === 'et' && run.length && tokens[j + 1] in NUMBER_WORDS))) {
      if (tokens[j] !== 'et') run.push(tokens[j]);
      j += 1;
    }

    if (run.length === 1 && (run[0] === 'un' || run[0] === 'une')) {
      out.push(run[0]);
      i = j;
      continue;
    }

    let total = 0;
    let current = 0;
    run.forEach((word, index) => {
      const value = NUMBER_WORDS[word];
      if (value === 100) current = (current || 1) * 100;
      else if (value === 1000) { total += (current || 1) * 1000; current = 0; }
      else if (value === 20 && run[index - 1] === 'quatre') current += 76;
      else current += value;
    });
    out.push(String(total + current));
    i = j;
  }

  return out.join(' ');
}

// Forme canonique d'une réponse courte : sans accents ni articles, nombres
// en chiffres, unités écrites en toutes lettres ramenées à leur symbole.
function canonicalAnswer(value) {
  // Lettres de choix (« c'est la A », « parcelle B ») : protégées, sinon
  // « A » était retiré comme préposition et la réponse devenait vide.
  const protectedLetters = String(value || '').replace(/(^|[^A-Za-zÀ-ÿ'’])([A-H])(?![A-Za-zÀ-ÿ'’])/g, '$1 choix$2 ');
  const units = convertNumberWords(normaliseText(protectedLetters))
    // Contractions anglaises : « doesn't », « doesnt », « does not » sont
    // équivalents (« doesnt » était refusé en test réel).
    .replace(/\b(do|does|did|is|are|was|were|has|have|had|could|would|should)\s+not\b/g, '$1nt')
    .replace(/\b(can)\s*not\b/g, 'cant')
    .replace(/\bwill not\b/g, 'wont')
    .replace(/\b(\w+)n t\b/g, '$1nt')
    .replace(/\b(centimetres?|centimetre) (carres?|carre)\b/g, 'cm2')
    .replace(/\b(metres?) (carres?|carre)\b/g, 'm2')
    .replace(/\b(millimetres?) (carres?|carre)\b/g, 'mm2')
    .replace(/\b(kilometres?) (carres?|carre)\b/g, 'km2')
    .replace(/\b(cm|m|mm|km) 2\b/g, '$12')
    .replace(/\bcentimetres?\b/g, 'cm')
    .replace(/\bmillimetres?\b/g, 'mm')
    .replace(/\bkilometres?\b/g, 'km')
    .replace(/\bmetres?\b/g, 'm')
    .replace(/(\d)(cm2|m2|mm2|km2|cm|mm|km|m)\b/g, '$1 $2');

  return units
    .replace(/\b(le|la|les|l|un|une|du|de|des|d|c|est|ce|reponse|a|the|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // Synonymes scolaires reconnus : une réponse juste ne doit jamais être
    // refusée parce qu'elle emploie l'autre nom accepté.
    .replace(/\bimperatives?\b/g, 'injonctive')
    .replace(/\binjonctives\b/g, 'injonctive')
    .replace(/\b(gaz carbonique|co2|dioxyde carbone)\b/g, 'dioxyde_carbone')
    .replace(/\b(dioxygene|oxygene|o2)\b/g, 'dioxygene');
}

function numbersWithUnits(canonical) {
  return [...canonical.matchAll(/(-?\d+(?:\s\d{3})*)(?:\s(cm2|m2|mm2|km2|cm|mm|km|m)\b)?/g)]
    .map((match) => ({ value: Number(match[1].replace(/\s/g, '')), unit: match[2] || null }));
}

// strict : utilisé pour VALIDER une réponse que le modèle a refusée (les
// unités doivent correspondre). Souple : utilisé pour vérifier qu'une
// réponse validée par le modèle ressemble bien à une réponse attendue.
// Distance d'édition (fautes de frappe : « acidenté » / « accidenté »).
function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

// Deux mots « presque identiques » : une faute de frappe sur un mot long.
// Désactivé en langue étrangère, où « explains » pour « explain » est une
// vraie erreur de grammaire et non une faute de frappe.
// Forme « phonétique » française simplifiée : « plato » = « plateau ».
function phonetic(word) {
  return word
    .replace(/eaux?$/, 'o').replace(/eau/g, 'o').replace(/aux?$/, 'o').replace(/au/g, 'o')
    .replace(/ph/g, 'f').replace(/qu/g, 'k').replace(/c(?=[aou])/g, 'k')
    .replace(/(.)\1+/g, '$1')
    .replace(/[ts]$/, '');
}

function similarWords(a, b) {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && !a.startsWith('choix') && !b.startsWith('choix') && phonetic(a) === phonetic(b)) return true;
  if (/\d/.test(a) || /\d/.test(b)) return false;
  // Lettres de choix (A, B...) : « la B » n'est jamais « la A ».
  if (a.startsWith('choix') || b.startsWith('choix')) return false;
  const length = Math.min(a.length, b.length);
  // Mot court amputé de sa dernière lettre (« nor » / « nord »,
  // « centr » / « centre »).
  if (length >= 3 && Math.abs(a.length - b.length) === 1 && (a.startsWith(b) || b.startsWith(a))) return true;
  if (length < 4) return false;
  return editDistance(a, b) <= (length >= 10 ? 2 : 1);
}

function matchesExpectedAnswer(answer, expected, { strict = true, fuzzy = false } = {}) {
  const a = canonicalAnswer(answer);
  const e = canonicalAnswer(expected);
  if (!a || !e) return false;
  if (a === e) return true;

  if (fuzzy) {
    const aW = a.split(' ');
    const eW = e.split(' ');
    for (let i = 0; i + eW.length <= aW.length; i += 1) {
      if (eW.every((word, k) => similarWords(aW[i + k], word))) return true;
    }
  }

  const aWords = a.split(' ');
  const eWords = e.split(' ');
  const negated = /\b(pas|non|not|n)\b/.test(a) && !/\b(pas|non|not|n)\b/.test(e);

  // Réponse rédigée (« les aliments arrivent dans l'estomac ») : en mode
  // souple, il suffit qu'elle contienne la réponse attendue.
  if (!negated && (!strict || aWords.length <= eWords.length + 5)) {
    for (let i = 0; i + eWords.length <= aWords.length; i += 1) {
      if (eWords.every((word, k) => aWords[i + k] === word)) return true;
    }
  }

  const aNumbers = numbersWithUnits(a);
  const eNumbers = numbersWithUnits(e);
  if (aNumbers.length === 1 && eNumbers.length === 1 && aNumbers[0].value === eNumbers[0].value) {
    if (!strict) return true;
    return !eNumbers[0].unit || aNumbers[0].unit === eNumbers[0].unit;
  }

  return false;
}

function answerMatchesExpected(userAnswer, exercise, options = {}) {
  const rawAnswer = String(userAnswer || '').trim();
  const expectedAnswers = exercise?.expectedAnswers || [];
  if (!rawAnswer || !expectedAnswers.length) return false;
  return expectedAnswers.some((expected) => matchesExpectedAnswer(rawAnswer, expected, options));
}

// Question « fermée » : toutes les réponses attendues sont courtes (un mot,
// un nombre avec son unité...). Pour elles, le backend peut vérifier le
// verdict du modèle ; pour une réponse rédigée, il s'en remet au modèle.
function isClosedQuestion(question) {
  const answers = question?.expectedAnswers || [];
  if (!answers.length) return false;
  // Question qui demande d'expliquer : réponse rédigée, le modèle juge.
  if (/\b(explique|expliquer|pourquoi|comment|decris|decrire|justifie|justifier|raconte|compare)\b/.test(normaliseText(question.prompt))) return false;
  // Une seule réponse courte suffit (« montagne ») : une variante longue
  // (« une montagne avec des pentes raides ») désactivait le contrôle et
  // laissait valider « un plateau plat » en test réel.
  return answers.some((answer) => canonicalAnswer(answer).split(' ').filter(Boolean).length <= 3);
}

// =====================================================================
// Validation de l'évaluation produite par Claude.
// =====================================================================

const QUESTION_VERDICTS = ['correct', 'partial', 'incorrect', 'unanswered'];

function isValidAssessment(assessment, exercise) {
  if (!assessment || typeof assessment !== 'object' || Array.isArray(assessment) || !exercise) {
    return false;
  }

  // Le verdict global est recalculé par le backend (summariseVerdict) :
  // une valeur inattendue (« partial » au lieu de « partially_correct »)
  // ne doit plus faire rejeter toute l'évaluation (cas réel : réponse juste
  // à une question ouverte → « Je n'ai pas réussi à corriger »).
  if (typeof assessment.verdict !== 'string' || !/^(correct|partially_correct|partial|incorrect|unanswered|in_progress)$/.test(assessment.verdict)) {
    return false;
  }

  if (typeof assessment.reason !== 'string' || !assessment.reason.trim()) {
    return false;
  }

  if (!Array.isArray(exercise.questions) || !exercise.questions.length) {
    return false;
  }

  // Claude omet parfois les questions auxquelles l'élève n'a pas encore
  // répondu : une liste plus courte est acceptée, les manquantes seront
  // considérées comme non traitées par normaliseAssessment.
  if (
    !Array.isArray(assessment.questions)
    || assessment.questions.length === 0
    || assessment.questions.length > exercise.questions.length
  ) {
    return false;
  }

  return assessment.questions.every((result) =>
    result
    && typeof result === 'object'
    && QUESTION_VERDICTS.includes(result.verdict)
    && typeof result.reason === 'string'
    && result.reason.trim()
  );
}

// =====================================================================
// Normalisation d'une évaluation : le backend fait autorité sur la note.
//
// Observé en conditions réelles : pour un exercice à 3 questions dont
// l'élève ne traite que la première, Claude peut noter « correct » les
// questions non traitées (l'élève obtenait alors 100/100). Le verdict
// global est donc recalculé ici, question par question :
// - une question dont la raison dit « non traitée » est non traitée ;
// - une question absente de l'évaluation est non traitée ;
// - une question déjà réussie à un message précédent reste réussie.
// =====================================================================

const UNANSWERED_REASON = /\b(non (traitee|abordee|repondue?|resolue)|pas (encore )?(de )?repons\w*|n a pas (encore )?(re)?(repondu|traite|aborde|donne)|n as pas (encore )?(re)?(repondu|traite|aborde|donne)|pas (re)?donne\w*|sans reponse|pas (ete )?(traitee|abordee)|question ignoree|ne repond pas a cette question|ne reponds pas a cette question|pas dans ce message|absente? de (ta|la) reponse|tu n as rien (ecrit|dit|repondu))\b/;

function normaliseAssessment(assessment, exercise, previouslyCorrectIds = []) {
  if (!isValidAssessment(assessment, exercise)) return null;

  const previous = new Set(previouslyCorrectIds);
  const complete = assessment.questions.length === exercise.questions.length;
  const byId = new Map(
    assessment.questions
      .filter((result) => Number.isInteger(result.id))
      .map((result) => [result.id, result])
  );

  const questions = exercise.questions.map((question, index) => {
    const result = byId.get(question.id) || (complete ? assessment.questions[index] : null);
    let verdict = result?.verdict || 'unanswered';
    let reason = typeof result?.reason === 'string' ? result.reason.replace(/\s+/g, ' ').trim().slice(0, 300) : '';

    if (verdict !== 'unanswered' && UNANSWERED_REASON.test(normaliseText(reason))) {
      verdict = 'unanswered';
    }

    if (verdict === 'unanswered' && previous.has(question.id)) {
      verdict = 'correct';
      reason = 'Déjà réussie.';
    }

    const hint = typeof result?.hint === 'string' ? result.hint.replace(/\s+/g, ' ').trim().slice(0, 300) : '';

    return {
      id: question.id,
      verdict,
      reason: reason || (verdict === 'unanswered' ? 'Pas encore de réponse.' : 'Évaluée.'),
      ...(hint && verdict !== 'correct' ? { hint } : {}),
    };
  });

  return {
    verdict: summariseVerdict(questions),
    reason: assessment.reason.replace(/\s+/g, ' ').trim().slice(0, 400),
    questions,
  };
}

// Verdict global calculé par le backend à partir des verdicts par question.
function summariseVerdict(questions) {
  const count = (verdict) => questions.filter((q) => q.verdict === verdict).length;
  const answered = questions.length - count('unanswered');

  if (count('correct') === questions.length) return 'correct';
  if (count('incorrect') + count('partial') > 0) return count('correct') + count('partial') > 0 ? 'partially_correct' : 'incorrect';
  if (answered > 0) return 'in_progress';
  return 'no_answer';
}

// =====================================================================
// Sérialisation de l'état.
// =====================================================================

function serialiseTutorState(state) {
  return JSON.stringify(readTutorState(state));
}

// =====================================================================
// Normalisation générale du texte.
// =====================================================================

function normaliseText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    // NFD ne décompose pas les ligatures : sans cela « œsophage » devenait
    // « sophage » et ne correspondait plus à « oesophage ».
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    // « cm² » devenait « cm » : une aire et une longueur étaient alors
    // indiscernables pour la correction.
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// =====================================================================
// Niveau / série.
//
// Cette fonction ne crée jamais une série fictive.
// Elle travaille uniquement à partir de promotion.nom.
// =====================================================================

function deriveLevelAndSeries(promotionName) {
  const source = String(promotionName || '').trim();

  const normalized = normaliseText(source);

  const labels = {
    '6eme': '6ème',
    '5eme': '5ème',
    '4eme': '4ème',
    '3eme': '3ème',
  };

  const lower = Object.keys(labels).find(
    (level) =>
      normalized === level
      || normalized.startsWith(`${level} `)
  );

  if (lower) {
    return {
      level: labels[lower],
      series: null,
    };
  }

  const match = normalized.match(
    /^(2nd|seconde|1ere|premiere|tle|terminale)\s+(.+)$/
  );

  if (!match) {
    return {
      level: source || null,
      series: null,
    };
  }

  const levels = {
    '2nd': 'Seconde',
    seconde: 'Seconde',
    '1ere': 'Première',
    premiere: 'Première',
    tle: 'Terminale',
    terminale: 'Terminale',
  };

  return {
    level: levels[match[1]],
    series: match[2]
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim(),
  };
}

// =====================================================================
// Mode public destiné au frontend.
//
// Le frontend ne reçoit jamais les états internes.
// Il reçoit seulement un mode fonctionnel.
// =====================================================================

function getPublicTutorMode(state) {
  const tutorState = readTutorState(state);

  switch (tutorState.phase) {
    case TUTOR_STATES.APPLICATION_EXERCISE:
    case TUTOR_STATES.APPLICATION_RETRY:
      return 'exercise';

    case TUTOR_STATES.BOOK_SELECTION:
    case TUTOR_STATES.BOOK_LOOKUP:
      return 'book';

    case TUTOR_STATES.BOOK_REFERENCE:
    case TUTOR_STATES.FOLLOW_UP:
      return 'follow_up';

    case TUTOR_STATES.EXPLANATION:
    case TUTOR_STATES.UNDERSTANDING_CHECK:
    default:
      return 'question';
  }
}

// =====================================================================
// Exports.
// =====================================================================

module.exports = {
  TUTOR_STATES,
  TUTOR_EVENTS,
  TRANSITIONS,

  createTutorState,
  readTutorState,
  transitionTutorState,
  serialiseTutorState,

  sanitiseExercise,
  sanitiseCompositeElements,
  buildDimensionedFigure,
  inferFigureFromText,
  hasEnoughPoints,
  sanitiseGrid,

  classifyUnderstandingMessage,
  isExerciseRequest,

  extractTaggedData,

  answerMatchesExpected,
  matchesExpectedAnswer,
  canonicalAnswer,
  isClosedQuestion,

  isValidAssessment,
  normaliseAssessment,
  summariseVerdict,

  normaliseText,
  normaliseAnswer,
  extractNumbers,

  deriveLevelAndSeries,

  getPublicTutorMode,
};

