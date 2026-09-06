const assert = require('node:assert/strict');
const {
  TUTOR_STATES,
  TUTOR_EVENTS,
  createTutorState,
  readTutorState,
  serialiseTutorState,
  transitionTutorState,
  deriveLevelAndSeries,
  sanitiseExercise,
  classifyUnderstandingMessage,
  extractTaggedData,
  answerMatchesExpected,
  isValidAssessment,
} = require('../server-lib/pedagogical-tutor.cjs');
const {
  extractExplicitTopic,
  selectRelevantProgression,
  buildPedagogicalContext,
  formatPedagogicalContext,
} = require('../server-lib/pedagogical-context.cjs');

function move(state, event, expectedPhase) {
  const result = transitionTutorState(state, event);
  assert.equal(result.changed, true, `${event} doit être autorisé depuis ${state.phase}`);
  assert.equal(result.state.phase, expectedPhase);
  return result.state;
}

// Etat initial et restauration, y compris une conversation créée avant la
// migration (tutor_state NULL) ou une valeur JSON invalide.
const initial = createTutorState();
assert.equal(initial.phase, TUTOR_STATES.EXPLANATION);
assert.equal(readTutorState(null).phase, TUTOR_STATES.EXPLANATION);
assert.equal(readTutorState('{invalide').phase, TUTOR_STATES.EXPLANATION);
const restored = readTutorState(serialiseTutorState({ ...initial, topic: 'fractions' }));
assert.equal(restored.topic, 'fractions');
assert.equal(restored.phase, TUTOR_STATES.EXPLANATION);

// Toutes les transitions autorisées du parcours sont définies par le backend.
let state = initial;
state = move(state, TUTOR_EVENTS.EXPLANATION_SENT, TUTOR_STATES.UNDERSTANDING_CHECK);
state = move(state, TUTOR_EVENTS.NOT_UNDERSTOOD, TUTOR_STATES.EXPLANATION);
state = move(state, TUTOR_EVENTS.EXPLANATION_SENT, TUTOR_STATES.UNDERSTANDING_CHECK);
state = move(state, TUTOR_EVENTS.UNDERSTOOD, TUTOR_STATES.APPLICATION_EXERCISE);
state = move(state, TUTOR_EVENTS.ANSWER_INCORRECT, TUTOR_STATES.APPLICATION_RETRY);
assert.equal(state.attempts, 1);
state = move(state, TUTOR_EVENTS.ANSWER_CORRECT, TUTOR_STATES.BOOK_SELECTION);
state = move(state, TUTOR_EVENTS.BOOK_PROVIDED, TUTOR_STATES.BOOK_LOOKUP);
state = move(state, TUTOR_EVENTS.REFERENCE_VERIFIED, TUTOR_STATES.BOOK_REFERENCE);
state = move(state, TUTOR_EVENTS.FOLLOW_UP_REQUESTED, TUTOR_STATES.FOLLOW_UP);

const unavailable = transitionTutorState(
  { ...createTutorState(), phase: TUTOR_STATES.BOOK_LOOKUP },
  TUTOR_EVENTS.REFERENCE_UNAVAILABLE
);
assert.equal(unavailable.state.phase, TUTOR_STATES.FOLLOW_UP);

// Une transition qui ne respecte pas le parcours est refusée et l'état reste
// inchangé : un modèle ne peut donc pas sauter directement à une référence.
const refused = transitionTutorState(createTutorState(), TUTOR_EVENTS.REFERENCE_VERIFIED);
assert.equal(refused.changed, false);
assert.equal(refused.state.phase, TUTOR_STATES.EXPLANATION);

// Détection de compréhension : les formulations hésitantes restent neutres.
assert.equal(classifyUnderstandingMessage("oui j'ai compris"), 'UNDERSTOOD');
assert.equal(classifyUnderstandingMessage("maintenant c'est clair"), 'UNDERSTOOD');
assert.equal(classifyUnderstandingMessage('je ne comprends toujours pas'), 'NOT_UNDERSTOOD');
assert.equal(classifyUnderstandingMessage('je suis perdu'), 'NOT_UNDERSTOOD');
assert.equal(classifyUnderstandingMessage("je pense avoir compris mais je ne suis pas sûr"), 'UNCERTAIN');

const exercise = sanitiseExercise({
  prompt: 'Un rectangle mesure 5 cm sur 3 cm. Quel est son périmètre ?',
  expectedAnswers: ['16 cm', '16'],
  criteria: ['additionner longueur et largeur puis multiplier par deux'],
  hintPlan: ['Rappelle-toi le contour du rectangle.', 'Additionne 5 et 3 avant de multiplier.', 'La formule est P = 2 × (longueur + largeur).'],
  solutionOutline: 'P = 2 × (5 + 3) = 16 cm.',
});
assert.ok(exercise);
assert.equal(answerMatchesExpected('16 cm', exercise), true);
assert.equal(answerMatchesExpected('15 cm', exercise), false);
assert.equal(sanitiseExercise({ prompt: 'incomplet' }), null);

// L'analyse facultative de Claude doit référencer un critère existant ; elle
// n'est jamais une transition libre envoyée par le modèle.
const assessment = { verdict: 'correct', criterionIndex: 0, reason: 'La formule est bien appliquée.' };
assert.equal(isValidAssessment(assessment, exercise), true);
assert.equal(isValidAssessment({ ...assessment, criterionIndex: 9 }, exercise), false);
const tagged = extractTaggedData('<exercise-assessment>{"verdict":"incorrect","criterionIndex":0,"reason":"Calcul incomplet."}</exercise-assessment>', 'exercise-assessment');
assert.equal(tagged.data.verdict, 'incorrect');
assert.equal(tagged.visibleText, '');

// Reprise : exercice, tentatives et indices survivent à une sérialisation.
const resumed = readTutorState(serialiseTutorState({
  ...createTutorState(),
  phase: TUTOR_STATES.APPLICATION_RETRY,
  exercise,
  attempts: 2,
  hintsUsed: 2,
}));
assert.equal(resumed.phase, TUTOR_STATES.APPLICATION_RETRY);
assert.equal(resumed.exercise.prompt, exercise.prompt);
assert.equal(resumed.attempts, 2);
assert.equal(resumed.hintsUsed, 2);
const afterThirdError = transitionTutorState(resumed, TUTOR_EVENTS.ANSWER_INCORRECT).state;
assert.equal(afterThirdError.attempts, 3);
assert.equal(
  transitionTutorState(afterThirdError, TUTOR_EVENTS.EXERCISE_REEXPLAINED).state.phase,
  TUTOR_STATES.UNDERSTANDING_CHECK
);

// Le normaliseur de promotions reste fondé sur les valeurs présentes, sans
// créer de série fictive.
assert.deepEqual(deriveLevelAndSeries('6ème'), { level: '6ème', series: null });
assert.deepEqual(deriveLevelAndSeries('3ème'), { level: '3ème', series: null });
assert.deepEqual(deriveLevelAndSeries('2nd D'), { level: 'Seconde', series: 'D' });
assert.deepEqual(deriveLevelAndSeries('1ere A1'), { level: 'Première', series: 'A1' });
assert.deepEqual(deriveLevelAndSeries('Tle D'), { level: 'Terminale', series: 'D' });

// Le contexte pédagogique sépare strictement l'activité ouverte du programme
// antérieur, tout en limitant la taille envoyée au modèle.
const sixiemeMaths = buildPedagogicalContext({
  eleve: {},
  test: {
    className: '6ème 2', promotionName: '6ème', subjectName: 'Mathématiques',
    schoolYear: '2026-2027', establishmentName: 'CEG Exemple',
    date: '2026-10-12', activity: 'Périmètre du rectangle',
  },
  programmeRows: [
    { date: '2026-10-10', activite: 'Addition des longueurs du rectangle' },
    { date: '2026-10-07', activite: 'Figures géométriques' },
    { date: '2026-09-29', activite: 'Fractions simples' },
  ],
});
assert.equal(sixiemeMaths.identity.level, '6ème');
assert.equal(sixiemeMaths.identity.series, null);
assert.equal(sixiemeMaths.currentActivity.activity, 'Périmètre du rectangle');
assert.equal(sixiemeMaths.currentActivity.topic, 'Périmètre du rectangle');
assert.ok(sixiemeMaths.priorProgression.length <= 4);
assert.notEqual(sixiemeMaths.priorProgression[0].activity, sixiemeMaths.currentActivity.activity);

const terminaleD = buildPedagogicalContext({
  eleve: {},
  test: {
    className: 'Tle D 1', promotionName: 'Tle D', subjectName: 'Mathématiques',
    schoolYear: '2026-2027', establishmentName: 'Lycée Exemple',
    date: '2026-11-02', activity: 'Probabilités conditionnelles',
  },
  programmeRows: [],
});
assert.equal(terminaleD.identity.level, 'Terminale');
assert.equal(terminaleD.identity.series, 'D');
assert.equal(terminaleD.currentActivity.topic, 'Probabilités conditionnelles');

const pct = buildPedagogicalContext({
  eleve: {},
  test: {
    className: '6ème 1', promotionName: '6ème', subjectName: 'PCT',
    schoolYear: '2026-2027', establishmentName: 'CEG Exemple',
    date: '2026-10-12', activity: 'Circuit électrique simple',
  },
  programmeRows: [],
});
assert.equal(pct.identity.subjectName, 'PCT');
assert.equal(pct.currentActivity.topic, 'Circuit électrique simple');

assert.equal(extractExplicitTopic('SA2'), null);
assert.equal(extractExplicitTopic('Activité 2-2'), null);
assert.equal(extractExplicitTopic('Activité : Fractions équivalentes'), 'Fractions équivalentes');

const manyRows = Array.from({ length: 60 }, (_, index) => ({
  date: `2026-09-${String((index % 28) + 1).padStart(2, '0')}`,
  activite: index % 2 === 0 ? `Rectangle et périmètre ${index}` : `Autre activité ${index}`,
}));
assert.ok(selectRelevantProgression(manyRows, 'Périmètre du rectangle', 'Périmètre du rectangle').length <= 4);
const formatted = formatPedagogicalContext(sixiemeMaths);
assert.match(formatted, /Activité actuelle \(prioritaire\)/);
assert.match(formatted, /Progression antérieure utile/);
assert.match(formatted, /Périmètre du rectangle/);

console.log('pedagogical-tutor: tests du moteur d’état et du contexte réussis');
