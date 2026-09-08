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
  NEW_EXERCISE_REQUESTED: 'NEW_EXERCISE_REQUESTED',
  EXAMPLE_REQUESTED: 'EXAMPLE_REQUESTED',
  EXPLANATION_REQUESTED: 'EXPLANATION_REQUESTED',
  EXERCISE_REEXPLAINED: 'EXERCISE_REEXPLAINED',
});

// =====================================================================
// Transitions autorisées.
// =====================================================================

const TRANSITIONS = Object.freeze({
  [TUTOR_STATES.EXPLANATION]: {
    [TUTOR_EVENTS.EXPLANATION_SENT]: TUTOR_STATES.UNDERSTANDING_CHECK,
  },

  [TUTOR_STATES.UNDERSTANDING_CHECK]: {
    [TUTOR_EVENTS.NOT_UNDERSTOOD]: TUTOR_STATES.EXPLANATION,
    [TUTOR_EVENTS.EXAMPLE_REQUESTED]: TUTOR_STATES.EXPLANATION,
    [TUTOR_EVENTS.EXPLANATION_REQUESTED]: TUTOR_STATES.EXPLANATION,
    [TUTOR_EVENTS.UNDERSTOOD]: TUTOR_STATES.APPLICATION_EXERCISE,
  },

  [TUTOR_STATES.APPLICATION_EXERCISE]: {
    [TUTOR_EVENTS.ANSWER_INCORRECT]: TUTOR_STATES.APPLICATION_RETRY,
    [TUTOR_EVENTS.ANSWER_CORRECT]: TUTOR_STATES.BOOK_SELECTION,
  },

  [TUTOR_STATES.APPLICATION_RETRY]: {
    [TUTOR_EVENTS.ANSWER_INCORRECT]: TUTOR_STATES.APPLICATION_RETRY,
    [TUTOR_EVENTS.ANSWER_CORRECT]: TUTOR_STATES.BOOK_SELECTION,
    [TUTOR_EVENTS.EXERCISE_REEXPLAINED]: TUTOR_STATES.UNDERSTANDING_CHECK,
  },

  [TUTOR_STATES.BOOK_SELECTION]: {
    [TUTOR_EVENTS.BOOK_PROVIDED]: TUTOR_STATES.BOOK_LOOKUP,
  },

  [TUTOR_STATES.BOOK_LOOKUP]: {
    [TUTOR_EVENTS.REFERENCE_VERIFIED]: TUTOR_STATES.BOOK_REFERENCE,
    [TUTOR_EVENTS.REFERENCE_UNAVAILABLE]: TUTOR_STATES.FOLLOW_UP,
  },

  [TUTOR_STATES.BOOK_REFERENCE]: {
    [TUTOR_EVENTS.FOLLOW_UP_REQUESTED]: TUTOR_STATES.FOLLOW_UP,
  },

  [TUTOR_STATES.FOLLOW_UP]: {
    [TUTOR_EVENTS.FOLLOW_UP_REQUESTED]: TUTOR_STATES.FOLLOW_UP,
    [TUTOR_EVENTS.NEW_EXERCISE_REQUESTED]: TUTOR_STATES.APPLICATION_EXERCISE,
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
    selectedBook: null,
    bookReferenceId: null,
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

    const bookReferenceId = Number.isInteger(parsed.bookReferenceId)
      && parsed.bookReferenceId > 0
      ? parsed.bookReferenceId
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
  }

  if (event === TUTOR_EVENTS.UNDERSTOOD) {
    nextState.attempts = 0;
    nextState.hintsUsed = 0;
  }

  return {
    changed: true,
    state: nextState,
  };
}

// =====================================================================
// Nettoyage / validation d'un exercice.
// =====================================================================

function sanitiseExercise(value) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
  ) {
    return null;
  }

  const text = (input, max) => {
    if (typeof input !== 'string') return '';
    return input.replace(/\s+/g, ' ').trim().slice(0, max);
  };

  const expectedAnswers = Array.isArray(value.expectedAnswers)
    ? value.expectedAnswers.map((answer) => text(answer, 120)).filter(Boolean).slice(0, 8)
    : [];

  const criteria = Array.isArray(value.criteria)
    ? value.criteria.map((criterion) => text(criterion, 400)).filter(Boolean).slice(0, 5)
    : [];

  const hintPlan = Array.isArray(value.hintPlan)
    ? value.hintPlan.map((hint) => text(hint, 400)).filter(Boolean).slice(0, 4)
    : [];

  const prompt = text(value.prompt, 1200);
  const solutionOutline = text(value.solutionOutline, 1600);

  if (
    !prompt
    || expectedAnswers.length === 0
    || criteria.length === 0
    || hintPlan.length === 0
    || !solutionOutline
  ) {
    return null;
  }

  // Claude fournit uniquement des données de géométrie.
  // Le frontend est responsable du rendu SVG.
  let diagram = null;

  if (
    value.diagram
    && typeof value.diagram === 'object'
    && !Array.isArray(value.diagram)
  ) {
    const allowedTypes = new Set([
      'parallelogram',
      'triangle',
      'right-triangle',
      'rectangle',
      'square',
      'circle',
      'coordinate-plane',
    ]);

    const type = text(value.diagram.type, 40).toLowerCase();

    if (allowedTypes.has(type)) {
      const sourcePoints =
        value.diagram.points
        && typeof value.diagram.points === 'object'
        && !Array.isArray(value.diagram.points)
          ? value.diagram.points
          : {};

      const points = {};

      for (const [label, point] of Object.entries(sourcePoints).slice(0, 12)) {
        if (
          !/^[A-Z][A-Z0-9]?$/.test(label)
          || !point
          || typeof point !== 'object'
          || Array.isArray(point)
        ) {
          continue;
        }

        const x = Number(point.x);
        const y = Number(point.y);

        if (
          Number.isFinite(x)
          && Number.isFinite(y)
          && x >= 0 && x <= 500
          && y >= 0 && y <= 320
        ) {
          points[label] = {
            x: Math.round(x),
            y: Math.round(y),
          };
        }
      }

      const measurements = {};

      if (
        value.diagram.measurements
        && typeof value.diagram.measurements === 'object'
        && !Array.isArray(value.diagram.measurements)
      ) {
        for (const [key, measurement] of Object.entries(value.diagram.measurements).slice(0, 12)) {
          if (
            /^[A-Z][A-Z0-9]?(?:-[A-Z][A-Z0-9]?)?$/.test(key)
            && typeof measurement === 'string'
          ) {
            const cleanMeasurement = text(measurement, 80);
            if (cleanMeasurement) measurements[key] = cleanMeasurement;
          }
        }
      }

      diagram = {
        type,
        points,
        labels: value.diagram.labels !== false,
        filled: typeof value.diagram.filled === 'boolean' ? value.diagram.filled : null,
        measurements,
      };
    }
  }

  return {
    prompt,
    expectedAnswers,
    criteria,
    hintPlan,
    solutionOutline,
    diagram,
  };
}

// =====================================================================
// Détection de compréhension.
// =====================================================================

function classifyUnderstandingMessage(message) {
  // Filet de sécurité uniquement.
  //
  // L'interprétation normale est faite par Claude dans inferTutorIntent().
  // En cas d'indisponibilité de Claude, il est plus sûr de ne PAS deviner
  // l'intention de l'élève à partir d'une liste de formulations.
  //
  // Un message inconnu devient donc UNKNOWN et la route demande une
  // clarification plutôt que de faire progresser artificiellement la séance.
  if (!String(message || '').trim()) {
    return 'UNKNOWN';
  }

  return 'UNKNOWN';
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

  // Filet de sécurité : un schéma en ASCII (bloc de code) n'est jamais
  // autorisé par les règles pédagogiques. On le retire du texte visible
  // plutôt que de l'afficher tel quel à l'élève.
  const visibleText = source
    .replace(expression, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
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
// Vérification d'une réponse attendue.
//
// Trois niveaux de vérification :
//
// 1. égalité après normalisation ;
// 2. égalité après simplification des formulations ;
// 3. comparaison numérique prudente.
//
// Exemple accepté :
//
// "16 cm"
// "Le périmètre est de 16 cm."
//
// La comparaison numérique n'est utilisée que lorsque chaque réponse
// contient exactement un nombre.
// =====================================================================

function answerMatchesExpected(userAnswer, exercise) {
  const rawAnswer = String(userAnswer || '').trim();

  if (
    !rawAnswer
    || !exercise?.expectedAnswers?.length
  ) {
    return false;
  }

  const normalizedAnswer = normaliseText(rawAnswer);
  const simplifiedAnswer = normaliseAnswer(rawAnswer);

  if (!normalizedAnswer) {
    return false;
  }

  for (const expected of exercise.expectedAnswers) {
    const normalizedExpected = normaliseText(expected);
    const simplifiedExpected = normaliseAnswer(expected);

    // ---------------------------------------------------------------
    // Niveau 1 : égalité exacte après normalisation.
    // ---------------------------------------------------------------

    if (
      normalizedAnswer === normalizedExpected
      || simplifiedAnswer === simplifiedExpected
    ) {
      return true;
    }

    // ---------------------------------------------------------------
    // Niveau 2 : comparaison numérique prudente.
    // ---------------------------------------------------------------

    const userNumbers = extractNumbers(rawAnswer);
    const expectedNumbers = extractNumbers(expected);

    if (
      userNumbers.length === 1
      && expectedNumbers.length === 1
      && userNumbers[0] === expectedNumbers[0]
    ) {
      return true;
    }
  }

  return false;
}

// =====================================================================
// Validation de l'évaluation produite par Claude.
// =====================================================================

function isValidAssessment(assessment, exercise) {
  if (
    !assessment
    || typeof assessment !== 'object'
    || Array.isArray(assessment)
    || !exercise
    || !Array.isArray(exercise.criteria)
    || exercise.criteria.length === 0
  ) {
    return false;
  }

  if (!['correct', 'incorrect'].includes(assessment.verdict)) {
    return false;
  }

  if (
    !Number.isInteger(assessment.criterionIndex)
    || assessment.criterionIndex < 0
    || assessment.criterionIndex >= exercise.criteria.length
  ) {
    return false;
  }

  if (
    typeof assessment.reason !== 'string'
    || !assessment.reason.trim()
  ) {
    return false;
  }

  return true;
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

  classifyUnderstandingMessage,

  extractTaggedData,

  answerMatchesExpected,
  isValidAssessment,

  normaliseText,
  normaliseAnswer,
  extractNumbers,

  deriveLevelAndSeries,

  getPublicTutorMode,
};

