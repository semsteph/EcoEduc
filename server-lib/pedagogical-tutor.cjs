// Moteur d'état du tuteur. Les valeurs ci-dessous sont strictement internes :
// aucune ne doit être affichée à l'élève.

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

// Les événements sont déclenchés par le backend. Claude peut formuler la
// réponse, mais ne fournit ni état, ni événement de transition.
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
});

const TRANSITIONS = Object.freeze({
  [TUTOR_STATES.EXPLANATION]: {
    [TUTOR_EVENTS.EXPLANATION_SENT]: TUTOR_STATES.UNDERSTANDING_CHECK,
  },
  [TUTOR_STATES.UNDERSTANDING_CHECK]: {
    [TUTOR_EVENTS.NOT_UNDERSTOOD]: TUTOR_STATES.EXPLANATION,
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
  },
});

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

function readTutorState(value) {
  if (!value) return createTutorState();
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || !Object.values(TUTOR_STATES).includes(parsed.phase)) {
      return createTutorState();
    }
    return {
      ...createTutorState(),
      ...parsed,
      // Une ancienne valeur de brouillon ne doit jamais injecter un objet ou
      // une valeur libre dans les champs attendus par le moteur.
      topic: typeof parsed.topic === 'string' ? parsed.topic.slice(0, 255) : null,
      exercise: sanitiseExercise(parsed.exercise),
      selectedBook: typeof parsed.selectedBook === 'string' ? parsed.selectedBook.slice(0, 255) : null,
      attempts: Number.isInteger(parsed.attempts) && parsed.attempts >= 0 ? parsed.attempts : 0,
      hintsUsed: Number.isInteger(parsed.hintsUsed) && parsed.hintsUsed >= 0 ? parsed.hintsUsed : 0,
      bookReferenceId: Number.isInteger(parsed.bookReferenceId) ? parsed.bookReferenceId : null,
    };
  } catch (_) {
    return createTutorState();
  }
}

function transitionTutorState(currentState, event) {
  const state = readTutorState(currentState);
  const nextPhase = TRANSITIONS[state.phase]?.[event];
  if (!nextPhase) return { changed: false, state };

  const nextState = {
    ...state,
    phase: nextPhase,
    updatedAt: new Date().toISOString(),
  };
  if (event === TUTOR_EVENTS.ANSWER_INCORRECT) nextState.attempts += 1;
  return { changed: true, state: nextState };
}

function sanitiseExercise(value) {
  if (!value || typeof value !== 'object') return null;
  const text = (input, max) => typeof input === 'string' ? input.trim().slice(0, max) : '';
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
  if (!prompt || !expectedAnswers.length || !criteria.length || !hintPlan.length || !solutionOutline) return null;
  return { prompt, expectedAnswers, criteria, hintPlan, solutionOutline };
}

function classifyUnderstandingMessage(message) {
  const normalized = normaliseText(message);
  if (!normalized) return 'UNKNOWN';
  if (/\b(je pense|je crois|pas sur|pas certain|peut etre|peut etre que)\b/.test(normalized)) return 'UNCERTAIN';
  if (/^(non|pas vraiment|pas du tout)$/.test(normalized)
    || /\b(je ne comprends|je n ai pas compris|je comprends pas|je suis perdu|explique encore|pas clair|toujours pas compris)\b/.test(normalized)) {
    return 'NOT_UNDERSTOOD';
  }
  if (/^(oui|oui j ai compris|j ai compris|c est clair|maintenant c est clair|d accord j ai compris|oui maintenant je comprends)$/.test(normalized)
    || /\b(maintenant je comprends|j ai bien compris|c est devenu clair)\b/.test(normalized)) {
    return 'UNDERSTOOD';
  }
  return 'UNKNOWN';
}

function extractTaggedData(rawText, tagName) {
  const escapedTag = String(tagName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`<${escapedTag}>\\s*([\\s\\S]*?)\\s*<\\/${escapedTag}>`, 'i');
  const match = String(rawText || '').match(expression);
  const visibleText = String(rawText || '').replace(expression, '').trim();
  if (!match) return { visibleText, data: null };
  try {
    return { visibleText, data: JSON.parse(match[1]) };
  } catch (_) {
    return { visibleText, data: null };
  }
}

function answerMatchesExpected(userAnswer, exercise) {
  const answer = normaliseText(userAnswer);
  if (!answer || !exercise?.expectedAnswers?.length) return false;
  return exercise.expectedAnswers.some((expected) => answer === normaliseText(expected));
}

function isValidAssessment(assessment, exercise) {
  if (!assessment || typeof assessment !== 'object') return false;
  if (!['correct', 'incorrect'].includes(assessment.verdict)) return false;
  if (!Number.isInteger(assessment.criterionIndex)
    || assessment.criterionIndex < 0
    || assessment.criterionIndex >= exercise.criteria.length) return false;
  return typeof assessment.reason === 'string' && assessment.reason.trim().length > 0;
}

function serialiseTutorState(state) {
  return JSON.stringify(readTutorState(state));
}

function normaliseText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Utilitaire conservé pour l'étape contexte classe/série ; il ne crée aucune
// valeur de série et travaille seulement à partir de promotion.nom.
function deriveLevelAndSeries(promotionName) {
  const source = String(promotionName || '').trim();
  const normalized = normaliseText(source);
  const labels = { '6eme': '6ème', '5eme': '5ème', '4eme': '4ème', '3eme': '3ème' };
  const lower = Object.keys(labels).find((level) => normalized === level || normalized.startsWith(`${level} `));
  if (lower) return { level: labels[lower], series: null };

  const match = normalized.match(/^(2nd|seconde|1ere|premiere|tle|terminale)\s+(.+)$/);
  if (!match) return { level: source || null, series: null };
  const levels = { '2nd': 'Seconde', seconde: 'Seconde', '1ere': 'Première', premiere: 'Première', tle: 'Terminale', terminale: 'Terminale' };
  return { level: levels[match[1]], series: match[2].toUpperCase().replace(/\s+/g, ' ') };
}

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
  deriveLevelAndSeries,
};
