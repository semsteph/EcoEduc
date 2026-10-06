// Tests de régression : demandes de schéma, schéma générique (toutes
// notions), honnêteté visuelle, classification de la compréhension et transitions
// ajoutées à la machine à états.
const assert = require('node:assert/strict');
const {
  TUTOR_STATES,
  TUTOR_EVENTS,
  createTutorState,
  transitionTutorState,
  classifyUnderstandingMessage,
  isExerciseRequest,
  normaliseText,
  sanitiseExercise,
  answerMatchesExpected,
} = require('../server-lib/pedagogical-tutor.cjs');
const {
  detectVisualRequest,
  resolveRequestedVisual,
  sanitiseRegisteredVisual,
  sanitiseSchema,
  describeRegisteredVisuals,
  enforceVisualHonesty,
  textReferencesVisual,
  HONEST_NO_VISUAL_NOTE,
} = require('../server-lib/tutor-visuals.cjs');

// ---------------------------------------------------------------------
// Normalisation : la ligature œ n'est plus perdue.
// ---------------------------------------------------------------------
assert.equal(normaliseText('œsophage'), 'oesophage');
assert.equal(normaliseText("C'est quoi l'Œsophage ?"), 'c est quoi l oesophage');

// ---------------------------------------------------------------------
// Détection des demandes visuelles (fautes, familier, sans accents).
// ---------------------------------------------------------------------
const visualRequests = [
  'montre moi le schéma',
  'montre-moi un schéma',
  'tu peux me montrer ?',
  'fais moi un dessin',
  'fais-moi un schéma',
  'je veux voir',
  'je peux avoir une image ?',
  'tu peux faire une image ?',
  "montre moi l'appareil digestif",
  "montre-moi comment c'est",
  "je n'arrive pas à visualiser",
  'tu peux me montrer par un schema ?',
  'montre moi le schema de l appareil digestif',
  'montre moi le shema',
  'un schéma stp',
  'montre moi',
  'a quoi ca ressemble ?',
];
for (const message of visualRequests) {
  assert.equal(detectVisualRequest(message), true, `demande visuelle non détectée : ${message}`);
}

const notVisualRequests = [
  "c'est quoi tu appel l'œsophage ? je n'ai jamais vus",
  'je ne comprends toujours pas',
  'à quoi sert l’estomac ?',
  'donne-moi un exercice',
  'montre moi comment calculer le périmètre',
  'le fonctionnement de la digestion',
  'oui',
  '',
];
for (const message of notVisualRequests) {
  assert.equal(detectVisualRequest(message), false, `faux positif : ${message}`);
}

// ---------------------------------------------------------------------
// Test 1 — plus aucun schéma codé par notion : le backend ne fabrique
// lui-même que le circuit électrique (montage calculé). Pour toute autre
// notion, c'est Claude qui décrit un schéma générique.
// ---------------------------------------------------------------------
assert.equal(resolveRequestedVisual({ userMessage: "montre moi le schema de l'appareil digestif", activity: 'Appareils digestif' }), null);
assert.equal(resolveRequestedVisual({ userMessage: "c'est quoi les alveole ?" }), null);
assert.equal(resolveRequestedVisual({ userMessage: 'montre moi', activity: 'Périmètre du rectangle' }), null);
assert.equal(resolveRequestedVisual({ userMessage: 'montre moi', activity: 'Le circuit électrique simple' }).type, 'electric-circuit');

// Le catalogue envoyé à Claude présente les formes génériques, pas des notions.
const catalogue = describeRegisteredVisuals();
for (const form of ['flow', 'cycle', 'hierarchy', 'comparison', 'structure', 'illustration']) {
  assert.match(catalogue, new RegExp(`"form":"${form}"`), `forme absente du catalogue : ${form}`);
}

// ---------------------------------------------------------------------
// Schéma générique : chaque forme est validée, tout champ inconnu retiré.
// ---------------------------------------------------------------------
const flow = sanitiseRegisteredVisual({
  type: 'schema',
  form: 'flow',
  title: 'Trajet des aliments',
  nodes: [
    { id: 'bouche', label: 'Bouche', detail: 'les dents broient', onclick: 'alert(1)' },
    { id: 'estomac', label: 'Estomac', detail: 'brasse les aliments', highlight: true },
    { id: 'intestin', label: 'Intestin grêle', detail: 'absorbe les nutriments' },
    { id: 'foie', label: 'Foie', detail: 'produit la bile', attachTo: 'intestin' },
    { id: 'x', label: '' },
  ],
  links: [{ from: 'bouche', to: 'estomac', label: 'œsophage' }, { from: 'bouche', to: 'nulle-part', label: 'x' }],
  x: 12,
});
assert.equal(flow.form, 'flow');
assert.deepEqual(flow.nodes.map((n) => n.id), ['bouche', 'estomac', 'intestin', 'foie']);
assert.equal(flow.nodes[0].onclick, undefined);
assert.equal(flow.nodes[1].highlight, true);
assert.equal(flow.nodes[3].attachTo, 'intestin');
assert.deepEqual(flow.links, [{ from: 'bouche', to: 'estomac', label: 'œsophage' }]);
assert.equal(flow.x, undefined);

// Trop peu d'éléments pour la forme : rejeté.
assert.equal(sanitiseSchema({ form: 'cycle', nodes: [{ label: 'a' }, { label: 'b' }] }), null);
assert.equal(sanitiseSchema({ form: 'comparison', columns: [{ title: 'Seul', items: ['x'] }] }), null);
assert.equal(sanitiseSchema({ form: 'volcan', nodes: [{ label: 'a' }, { label: 'b' }] }), null);
assert.equal(sanitiseRegisteredVisual({ type: 'unknown-visual' }), null);
assert.equal(sanitiseRegisteredVisual(null), null);

// Classification sans boucle ; comparaison ; structure par zones.
const tree = sanitiseSchema({
  form: 'hierarchy',
  nodes: [
    { id: 'v', label: 'Vertébrés' },
    { id: 'm', label: 'Mammifères', parent: 'v' },
    { id: 'o', label: 'Oiseaux', parent: 'v' },
  ],
});
assert.deepEqual(tree.nodes.map((n) => n.parent || null), [null, 'v', 'v']);
// Une boucle (A parent de B, B parent de A) est cassée : il reste une racine.
const looped = sanitiseSchema({ form: 'hierarchy', nodes: [{ id: 'a', label: 'A', parent: 'b' }, { id: 'b', label: 'B', parent: 'a' }] });
assert.equal(looped.nodes.filter((n) => !n.parent).length, 1);
const comparison = sanitiseSchema({ form: 'comparison', columns: [{ title: 'Inspiration', items: ['le diaphragme descend'] }, { title: 'Expiration', items: ['le diaphragme remonte'] }] });
assert.equal(comparison.columns.length, 2);
const structure = sanitiseSchema({ form: 'structure', nodes: [{ label: 'Membrane', zone: 'top' }, { label: 'Noyau', zone: 'center' }, { label: 'Autre', zone: 'dehors' }] });
assert.deepEqual(structure.nodes.map((n) => n.zone || null), ['top', 'center', null]);

// Illustration : formes simples, palette fermée, rien d'exécutable.
const illustration = sanitiseSchema({
  form: 'illustration',
  title: 'Cellule animale',
  shapes: [
    { kind: 'ellipse', cx: 200, cy: 150, rx: 170, ry: 120, tone: 'cell' },
    { kind: 'circle', cx: 210, cy: 140, r: 35, tone: 'nerve' },
    { kind: 'path', d: 'M20 20 C 60 10 90 40 120 30', tone: 'accent', arrow: true },
    { kind: 'path', d: 'M0 0 L10 10" onload="alert(1)', tone: 'cell' },
    { kind: 'path', d: 'M0 0 L 9000 10', tone: 'cell' },
    { kind: 'rect', x: 10, y: 10, width: 50, height: 20, tone: '#ff0000' },
    { kind: 'foreignObject', x: 0 },
  ],
  nodes: [
    { label: 'Membrane', detail: 'limite la cellule', at: { x: 40, y: 150 } },
    { label: 'Noyau', at: { x: 210, y: 140 }, highlight: true },
    { label: 'Hors cadre', at: { x: 900, y: 10 } },
  ],
});
// Le rectangle sans aucune partie numérotée dedans (cadre vide) est retiré.
assert.equal(illustration.shapes.length, 3);
assert.equal(illustration.shapes[1].kind, 'ellipse');
assert.ok(!illustration.shapes.some((shape) => shape.kind === 'rect'), 'cadre vide retiré');
// Une couleur libre est remplacée par la palette (rectangle qui contient une partie).
const toned = sanitiseSchema({
  form: 'illustration',
  shapes: [
    { kind: 'ellipse', cx: 200, cy: 150, rx: 170, ry: 120, tone: 'cell' },
    { kind: 'rect', x: 20, y: 20, width: 80, height: 40, tone: '#ff0000' },
  ],
  nodes: [{ label: 'Cellule', at: { x: 200, y: 150 } }, { label: 'Boîte', at: { x: 50, y: 40 } }],
});
assert.equal(toned.shapes[1].tone, 'neutral', 'couleur libre remplacée par la palette');
assert.deepEqual(illustration.nodes.map((n) => n.label), ['Membrane', 'Noyau']);
assert.equal(sanitiseSchema({ form: 'illustration', shapes: [], nodes: [] }), null);
// Commande de dessin : marquée « pending », résolue côté serveur.
assert.deepEqual(sanitiseSchema({ form: 'illustration', draw: 'cellule animale : membrane, noyau' }).pending, true);

// Anciennes conversations : les schémas digestif / respiratoire enregistrés
// en base sont convertis en trajet générique à partir de leurs propres données.
const legacy = sanitiseRegisteredVisual({
  type: 'digestive-system',
  title: "L'appareil digestif",
  highlight: ['estomac'],
  organs: [
    { id: 'bouche', label: 'Bouche', role: 'broie', kind: 'tube' },
    { id: 'estomac', label: 'Estomac', role: 'brasse', kind: 'tube' },
    { id: 'foie', label: 'Foie', role: 'bile', kind: 'gland' },
    { id: 'intestin_grele', label: 'Intestin grêle', role: 'absorbe', kind: 'tube' },
  ],
});
assert.equal(legacy.type, 'schema');
assert.equal(legacy.form, 'flow');
assert.equal(legacy.nodes.find((n) => n.id === 'foie').attachTo, 'intestin_grele');
assert.equal(legacy.nodes.find((n) => n.id === 'estomac').highlight, true);

// Un exercice peut porter un schéma générique : il est en mode question.
const svtExercise = sanitiseExercise({
  prompt: 'Observe le schéma du trajet des aliments.',
  questions: [{
    id: 1,
    prompt: "Quel est l'organe n° 2 ?",
    expectedAnswers: ['estomac', "l'estomac"],
    criteria: ["Reconnaître l'estomac."],
    diagram: { type: 'schema', form: 'flow', nodes: [{ label: 'Bouche' }, { label: 'Estomac' }] },
  }],
  criteria: ["Reconnaître l'estomac."],
  hintPlan: ['Il se trouve juste après l’œsophage.'],
  solutionOutline: "C'est l'estomac.",
});
assert.equal(svtExercise.questions[0].diagram.type, 'schema');
assert.equal(svtExercise.questions[0].diagram.quiz, true);
assert.equal(answerMatchesExpected("l'estomac", svtExercise.questions[0]), true);
assert.equal(answerMatchesExpected('le foie', svtExercise.questions[0]), false);

for (const type of ['triangle', 'right-triangle', 'rectangle', 'square', 'parallelogram', 'circle', 'coordinate-plane']) {
  const geometry = sanitiseExercise({
    prompt: 'Figure', expectedAnswers: ['1'], criteria: ['c'], hintPlan: ['h'], solutionOutline: 's',
    diagram: { type, points: { A: { x: 10, y: 100 }, B: { x: 100, y: 100 }, C: { x: 100, y: 10 }, D: { x: 10, y: 10 } } },
  });
  assert.equal(geometry.diagram.type, type, `figure géométrique perdue : ${type}`);
}

// Régression (test réel) : un carré envoyé sans aucun point s'affichait
// vide. Il est rejeté, ou construit à partir de ses dimensions.
const figureExercise = (diagram) => sanitiseExercise({
  prompt: 'Figure', expectedAnswers: ['1'], criteria: ['c'], hintPlan: ['h'], solutionOutline: 's', diagram,
}).diagram;
assert.equal(figureExercise({ type: 'square', points: {} }), null);
assert.equal(figureExercise({ type: 'rectangle', points: { A: { x: 1, y: 1 }, B: { x: 50, y: 1 }, C: { x: 50, y: 50 } } }), null);
const dimensioned = figureExercise({ type: 'rectangle', width: 5, height: 3, unit: 'cm' });
assert.deepEqual(dimensioned.measurements, { 'A-B': '5 cm', 'B-C': '3 cm' });
// Proportions respectées : largeur / hauteur = 5 / 3.
const w = dimensioned.points.B.x - dimensioned.points.A.x;
const h = dimensioned.points.A.y - dimensioned.points.D.y;
assert.ok(Math.abs(w / h - 5 / 3) < 0.05, `proportions fausses : ${w}x${h}`);
const square = figureExercise({ type: 'square', side: 7 });
assert.equal(square.points.B.x - square.points.A.x, square.points.A.y - square.points.D.y);
assert.deepEqual(square.measurements, { 'A-B': '7 cm', 'B-C': '7 cm' });
assert.equal(sanitiseExercise({
  prompt: 'Angle', expectedAnswers: ['aigu'], criteria: ['c'], hintPlan: ['h'], solutionOutline: 's',
  diagram: { type: 'angle', angleDegrees: 45 },
}).diagram.type, 'angle');

// ---------------------------------------------------------------------
// Honnêteté visuelle : sans schéma réel, l'annonce d'un schéma est retirée.
// ---------------------------------------------------------------------
const falseClaim = enforceVisualHonesty(
  "Bien sûr ! Voici le schéma de l'appareil digestif. Les aliments passent par la bouche puis l'œsophage.",
  false
);
assert.equal(falseClaim.removed, true);
assert.doesNotMatch(falseClaim.text, /Voici le schéma/);
assert.match(falseClaim.text, /Les aliments passent par la bouche/);
assert.ok(falseClaim.text.endsWith(HONEST_NO_VISUAL_NOTE));
// Avec un schéma réellement présent, le texte est inchangé.
assert.equal(
  enforceVisualHonesty('Regarde le schéma ci-dessous.', true).text,
  'Regarde le schéma ci-dessous.'
);
// Un texte sans annonce n'est pas modifié.
assert.equal(enforceVisualHonesty("L'estomac brasse les aliments.", false).removed, false);
assert.equal(textReferencesVisual('Observe le schéma et nomme les organes.'), true);
assert.equal(textReferencesVisual('Calcule le périmètre du rectangle.'), false);

// ---------------------------------------------------------------------
// Tests 3, 4, 5 — classification de la compréhension.
// ---------------------------------------------------------------------
assert.equal(classifyUnderstandingMessage('je ne comprends toujours pas'), 'NOT_UNDERSTOOD');
assert.equal(classifyUnderstandingMessage("je n'ai pas compris"), 'NOT_UNDERSTOOD');
assert.equal(classifyUnderstandingMessage("je crois que je n'ai pas compris"), 'NOT_UNDERSTOOD');
assert.equal(classifyUnderstandingMessage("oui j'ai compris"), 'UNDERSTOOD');
assert.equal(classifyUnderstandingMessage("je crois que j'ai compris mais je ne suis pas sûr"), 'UNCERTAIN');
assert.equal(classifyUnderstandingMessage('je pense avoir compris'), 'UNCERTAIN');
assert.equal(classifyUnderstandingMessage('pas sûr'), 'UNCERTAIN');
assert.equal(classifyUnderstandingMessage("j'ai compris mais pas le rôle du foie"), 'PARTIAL_UNDERSTANDING');
// « oui » seul n'est pas une preuve de compréhension.
assert.equal(classifyUnderstandingMessage('oui'), 'UNKNOWN');
assert.equal(classifyUnderstandingMessage('ok'), 'UNKNOWN');
// Une réponse hésitante à une question de vérification doit être évaluée,
// pas classée comme incertitude.
assert.equal(classifyUnderstandingMessage("je crois que c'est l'estomac"), 'UNKNOWN');

// Test 6 — demande d'exercice.
assert.equal(isExerciseRequest('donne-moi un exercice'), true);
assert.equal(isExerciseRequest('donne moi un exo stp'), true);
assert.equal(isExerciseRequest('je veux m’entraîner'), true);
assert.equal(isExerciseRequest("c'est quoi un exercice d'application ?"), false);
assert.equal(isExerciseRequest("à quoi sert l'estomac ?"), false);

// ---------------------------------------------------------------------
// Transitions ajoutées : plus d'état bloqué.
// ---------------------------------------------------------------------
function phaseAfter(phase, event) {
  return transitionTutorState({ ...createTutorState(), phase }, event);
}

// Exercice demandé depuis l'explication, la vérification ou le suivi.
for (const phase of [TUTOR_STATES.EXPLANATION, TUTOR_STATES.UNDERSTANDING_CHECK, TUTOR_STATES.FOLLOW_UP]) {
  const result = phaseAfter(phase, TUTOR_EVENTS.EXERCISE_REQUESTED);
  assert.equal(result.changed, true, `EXERCISE_REQUESTED refusé depuis ${phase}`);
  assert.equal(result.state.phase, TUTOR_STATES.APPLICATION_EXERCISE);
  assert.equal(result.state.attempts, 0);
}
// Nouvelle question pendant la vérification : réexplication puis revérification.
const asked = phaseAfter(TUTOR_STATES.UNDERSTANDING_CHECK, TUTOR_EVENTS.QUESTION_ASKED);
assert.equal(asked.state.phase, TUTOR_STATES.EXPLANATION);
assert.equal(
  transitionTutorState(asked.state, TUTOR_EVENTS.EXPLANATION_SENT).state.phase,
  TUTOR_STATES.UNDERSTANDING_CHECK
);
// Le modèle ne peut toujours pas sauter vers une référence de manuel.
assert.equal(phaseAfter(TUTOR_STATES.UNDERSTANDING_CHECK, TUTOR_EVENTS.REFERENCE_VERIFIED).changed, false);
assert.equal(phaseAfter(TUTOR_STATES.APPLICATION_EXERCISE, TUTOR_EVENTS.QUESTION_ASKED).changed, false);

// Chaque état a au moins une sortie : aucun état n'est un cul-de-sac.
const { TRANSITIONS } = require('../server-lib/pedagogical-tutor.cjs');
for (const phase of Object.values(TUTOR_STATES)) {
  const exits = Object.values(TRANSITIONS[phase] || {}).filter((next) => next !== phase);
  assert.ok(exits.length > 0 || phase === TUTOR_STATES.FOLLOW_UP, `état sans sortie : ${phase}`);
}
assert.ok(Object.keys(TRANSITIONS[TUTOR_STATES.FOLLOW_UP]).includes(TUTOR_EVENTS.EXERCISE_REQUESTED));

// ---------------------------------------------------------------------
// Tests 7 et 8 — évaluation : le backend recalcule le verdict global.
// Les trois cas ci-dessous sont des sorties réelles de Claude pour un
// exercice à 3 questions où l'élève n'a répondu qu'à la question 1.
// ---------------------------------------------------------------------
const { normaliseAssessment } = require('../server-lib/pedagogical-tutor.cjs');
const threeQuestions = {
  prompt: 'Ben mange une pomme.',
  questions: [
    { id: 1, prompt: 'Bouche ?', expectedAnswers: ['dents et salive'], criteria: ['c'] },
    { id: 2, prompt: 'Quel tube ?', expectedAnswers: ['œsophage'], criteria: ['c'] },
    { id: 3, prompt: 'Estomac ?', expectedAnswers: ['brasse'], criteria: ['c'] },
  ],
};

// Cas réel 1 : questions non traitées notées « correct » → 100/100 à tort.
const falselyCorrect = normaliseAssessment({
  verdict: 'correct',
  reason: 'Question 1 juste.',
  questions: [
    { id: 1, verdict: 'correct', reason: 'Dents et salive ✓' },
    { id: 2, verdict: 'correct', reason: 'Question non traitée mais la réponse cible Q1.' },
    { id: 3, verdict: 'correct', reason: 'Question non traitée par cette réponse.' },
  ],
}, threeQuestions);
assert.equal(falselyCorrect.verdict, 'in_progress');
assert.deepEqual(falselyCorrect.questions.map((q) => q.verdict), ['correct', 'unanswered', 'unanswered']);

// Cas réel 2 : verdict « unanswered » (auparavant rejeté → message d'erreur).
const withUnanswered = normaliseAssessment({
  verdict: 'correct',
  reason: 'Q1 juste.',
  questions: [
    { id: 1, verdict: 'correct', reason: 'ok' },
    { id: 2, verdict: 'unanswered', reason: 'Question non abordée dans la réponse' },
    { id: 3, verdict: 'unanswered', reason: 'Question non abordée dans la réponse' },
  ],
}, threeQuestions);
assert.equal(withUnanswered.verdict, 'in_progress');

// Cas réel 3 : une seule entrée pour trois questions.
const truncated = normaliseAssessment({
  verdict: 'correct',
  reason: 'Q1 juste.',
  questions: [{ id: 1, verdict: 'correct', reason: 'ok' }],
}, threeQuestions);
assert.equal(truncated.verdict, 'in_progress');
assert.equal(truncated.questions.length, 3);

// L'élève répond ensuite aux questions 2 et 3 : la question 1 reste acquise.
const completed = normaliseAssessment({
  verdict: 'correct',
  reason: 'Q2 et Q3 justes.',
  questions: [
    { id: 1, verdict: 'unanswered', reason: 'Pas de réponse dans ce message.' },
    { id: 2, verdict: 'correct', reason: 'Œsophage.' },
    { id: 3, verdict: 'correct', reason: 'Brassage.' },
  ],
}, threeQuestions, [1]);
assert.equal(completed.verdict, 'correct');

// Une vraie erreur reste une erreur, même si Claude dit « correct ».
const wrong = normaliseAssessment({
  verdict: 'correct',
  reason: 'bilan',
  questions: [
    { id: 1, verdict: 'correct', reason: 'ok' },
    { id: 2, verdict: 'incorrect', reason: "Ce n'est pas le foie." },
    { id: 3, verdict: 'correct', reason: 'ok' },
  ],
}, threeQuestions);
assert.equal(wrong.verdict, 'partially_correct');
assert.equal(normaliseAssessment({ verdict: 'incorrect', reason: 'x', questions: [{ id: 1, verdict: 'incorrect', reason: 'faux' }] }, threeQuestions).verdict, 'incorrect');
// Format invalide : null (le route affiche alors un message clair).
assert.equal(normaliseAssessment({ verdict: 'correct', reason: 'x', questions: [{ id: 1, verdict: 'bof', reason: 'x' }] }, threeQuestions), null);

console.log('tutor-visuals: tests des visuels, intentions et transitions réussis');

// Un composite improvisé pour un circuit est remplacé par le montage
// calculé ; un composite de géométrie reste intact.
{
  const { preferRegisteredVisual } = require('../server-lib/tutor-visuals.cjs');
  const improvised = { type: 'composite', elements: [{ type: 'circle', center: { x: 250, y: 160 }, radius: 40, label: 'Lampe' }] };
  const upgraded = preferRegisteredVisual(improvised, {
    text: "Voici un circuit : la pile, l'interrupteur fermé et la lampe.",
    userMessage: "c'est quoi un circuit fermé ?",
  });
  assert.equal(upgraded.type, 'electric-circuit');
  const geometry = { type: 'composite', elements: [{ type: 'circle', center: { x: 250, y: 160 }, radius: 40, label: 'Disque' }] };
  assert.equal(preferRegisteredVisual(geometry, { text: 'Voici un disque de rayon 4 cm.', userMessage: "c'est quoi un disque ?" }), geometry);
  console.log('tutor-visuals: remplacement des composites improvisés vérifié');
}

// Circuit : le montage décrit est calculé par le backend (état exact).
{
  const { resolveRequestedVisual: resolve } = require('../server-lib/tutor-visuals.cjs');
  const openCircuit = resolve({ userMessage: 'pourquoi la lampe sallume pas quand linterupteur est ouvert ?' }).diagram;
  assert.equal(openCircuit.type, 'electric-circuit');
  assert.equal(openCircuit.circuitClosed, false);
  assert.ok(openCircuit.components.every((c) => c.working !== true), 'aucun récepteur ne fonctionne en circuit ouvert');
  assert.equal(resolve({ userMessage: 'c est quoi un circuit fermer ?' }).diagram.circuitClosed, true);
  assert.equal(resolve({ userMessage: 'si le fil est coupe', activity: 'Le circuit électrique simple' }).diagram.circuitClosed, false);
  // Le modèle ne peut pas déclarer une lampe allumée dans un circuit ouvert.
  const forged = sanitiseRegisteredVisual({ type: 'electric-circuit', components: [{ kind: 'battery' }, { kind: 'switch', closed: false }, { kind: 'lamp', working: true }] });
  assert.equal(forged.circuitClosed, false);
  assert.equal(forged.components.find((c) => c.kind === 'lamp').working, false);
  assert.equal(resolve({ userMessage: 'comment calculer le périmètre ?' }), null);
  console.log('tutor-visuals: circuit vérifié');
}

// ---------------------------------------------------------------------
// Régressions du second test réel (6 matières).
// ---------------------------------------------------------------------
{
  const {
    answerMatchesExpected: match, isClosedQuestion, inferFigureFromText, normaliseText: norm,
  } = require('../server-lib/pedagogical-tutor.cjs');
  const { toQuizVisual, resolveRequestedVisual: resolve } = require('../server-lib/tutor-visuals.cjs');
  const q = (expectedAnswers) => ({ expectedAnswers });

  // « cm² » n'est plus confondu avec « cm ».
  assert.equal(norm('24 cm²'), '24 cm2');
  // Réponses justes refusées à tort en test réel.
  assert.equal(match('vingt quatre centimetres carré', q(['24 cm²'])), true);
  assert.equal(match('imperative', q(['injonctive'])), true);
  assert.equal(match('quinze cm2', q(['15 cm²'])), true);
  // Réponses fausses validées à tort en test réel, ou à ne pas valider.
  assert.equal(match('walks', q(['walk'])), false);
  assert.equal(match('walks', q(['walk']), { strict: false }), false);
  assert.equal(match('24 cm', q(['24 cm²'])), false, 'une longueur n’est pas une aire');
  assert.equal(match('pas injonctive', q(['injonctive'])), false);
  assert.equal(isClosedQuestion(q(['walk'])), true);
  assert.equal(isClosedQuestion(q(['Les dents coupent et broient la pomme'])), false);

  // Figures déduites de l'énoncé (exercices « des figures suivantes »
  // sans figure en test réel).
  const wall = inferFigureFromText('Un mur rectangulaire mesure 5 m sur 3 m. Calcule son aire.');
  assert.deepEqual(wall.measurements, { 'A-B': '5 m', 'B-C': '3 m' });
  assert.deepEqual(inferFigureFromText('rectangle en petits carrés de 4 cm sur 3 cm').grid, { cols: 4, rows: 3 });
  assert.equal(inferFigureFromText('Un carré a une aire de 16 cm². Quel est son côté ?'), null, 'une aire n’est pas un côté');

  // Mode question : le schéma d'exercice ne donne pas la réponse.
  const quiz = toQuizVisual(resolve({ userMessage: 'circuit avec interrupteur fermé' }).diagram);
  assert.equal(quiz.circuitClosed, null);
  assert.equal(quiz.showCurrent, false);
  assert.ok(quiz.components.every((c) => c.working === undefined));

  // Circuit sans interrupteur : la lampe s'allume.
  const noSwitch = resolve({ userMessage: 'et sans interrupteur la lampe sallume ?' }).diagram;
  assert.ok(!noSwitch.components.some((c) => c.kind === 'switch'));
  assert.equal(noSwitch.circuitClosed, true);

  console.log('tutor-visuals: régressions du second test réel vérifiées');
}

// ---------------------------------------------------------------------
// Régressions du troisième test réel.
// ---------------------------------------------------------------------
{
  const { answerMatchesExpected: match, sanitiseExercise: sanitise } = require('../server-lib/pedagogical-tutor.cjs');
  const { resolveRequestedVisual: resolve, enforceVisualHonesty: honesty } = require('../server-lib/tutor-visuals.cjs');
  const q = (expectedAnswers) => ({ expectedAnswers });

  // Contractions anglaises (« doesnt » refusé en test réel).
  assert.equal(match('doesnt explain', q(["doesn't explain"])), true);
  assert.equal(match('does not explain', q(["doesn't explain"])), true);
  assert.equal(match("don't eat", q(['do not eat'])), true);
  // Fautes de frappe tolérées hors langue étrangère, jamais les fautes de
  // grammaire anglaises.
  assert.equal(match('plus acidenté', q(['plus accidenté']), { fuzzy: true }), true);
  // En langue étrangère la route désactive la tolérance : « explains » ≠ « explain ».
  assert.equal(match('explains', q(['explain']), { fuzzy: false }), false);
  assert.equal(match('plus acidenté', q(['plus accidenté'])), false, 'pas de tolérance sans l’option');

  // Tout schéma de domaine d'un exercice est en mode question (le 1er
  // exercice PCT montrait « CIRCUIT FERMÉ » et sa conclusion).
  const exerciseCircuit = sanitise({
    prompt: 'p', expectedAnswers: ['fermé'], criteria: ['c'], hintPlan: ['h'], solutionOutline: 's',
    diagram: { type: 'electric-circuit', components: [{ kind: 'battery' }, { kind: 'switch', closed: true }, { kind: 'lamp' }] },
  }).diagram;
  assert.equal(exerciseCircuit.quiz, true);
  assert.equal(exerciseCircuit.circuitClosed, null);
  assert.ok(exerciseCircuit.components.every((c) => !/fermé|ouvert/.test(c.label)));

  // Refus poli conservé ; annonce trompeuse retirée sans note en matière
  // sans schéma.
  assert.equal(honesty('Je ne peux pas faire de schéma ici, mais voici un tableau.', false).removed, false);
  assert.equal(honesty('Voici le schéma de la phrase. Elle est déclarative.', false, { note: '' }).text, 'Elle est déclarative.');
  console.log('tutor-visuals: régressions du troisième test réel vérifiées');
}

// =====================================================================
// SVT : un organe ou un appareil se montre par un dessin annoté, jamais
// par une liste de cases (test réel : tube digestif en 6e) ; le dessin est
// cadré sur la zone réellement dessinée.
// =====================================================================
{
  const { needsAnatomicalDrawing, anatomicalDrawingCommand } = require('../server-lib/tutor-visuals.cjs');
  const boxes = sanitiseSchema({
    type: 'schema', form: 'flow', title: 'Le tube digestif',
    nodes: [{ label: 'Bouche' }, { label: 'Œsophage' }, { label: 'Estomac', highlight: true }, { label: 'Intestin grêle' }],
  });
  assert.equal(needsAnatomicalDrawing(boxes, { subjectName: 'SVT' }), true);
  assert.equal(needsAnatomicalDrawing(boxes, { subjectName: 'Sciences de la Vie et de la Terre' }), true);
  // Hors SVT, ou pour un vrai processus, la forme choisie est gardée.
  assert.equal(needsAnatomicalDrawing(boxes, { subjectName: 'Histoire-Géographie' }), false);
  const steps = sanitiseSchema({ type: 'schema', form: 'flow', title: 'Étapes de la mitose', nodes: [{ label: 'Prophase' }, { label: 'Métaphase' }] });
  assert.equal(needsAnatomicalDrawing(steps, { subjectName: 'SVT' }), false);
  const cycle = sanitiseSchema({ type: 'schema', form: 'cycle', title: "Cycle de l'eau", nodes: [{ label: 'Évaporation' }, { label: 'Condensation' }, { label: 'Pluie' }] });
  assert.equal(needsAnatomicalDrawing(cycle, { subjectName: 'SVT' }), false);

  const command = anatomicalDrawingCommand(boxes);
  assert.equal(command.pending, true);
  assert.equal(command.form, 'illustration');
  assert.match(command.draw, /Bouche, Œsophage, Estomac, Intestin grêle/);
  assert.match(command.draw, /mettre en évidence : Estomac/);

  // Cadrage : la boîte englobe les formes (tracés relatifs compris).
  const drawing = sanitiseSchema({
    type: 'schema', form: 'illustration', title: 'Organe',
    shapes: [
      { kind: 'path', d: 'M100 50 c 20 0 40 20 40 60 l -40 40 Z', tone: 'organ' },
      { kind: 'ellipse', cx: 200, cy: 150, rx: 30, ry: 20, tone: 'organ' },
    ],
    nodes: [{ label: 'A', at: { x: 120, y: 80 } }, { label: 'B', at: { x: 200, y: 150 } }],
  });
  assert.deepEqual(drawing.bbox, { x: 100, y: 50, w: 130, h: 120 });
  console.log('tutor-visuals: dessin annoté imposé en SVT et cadrage vérifiés');
}

// Contrôle géométrique des illustrations : défauts renvoyés au dessinateur.
{
  const { checkIllustration } = require('../server-lib/tutor-illustration-check.cjs');
  const draw = (shapes, nodes) => sanitiseSchema({ type: 'schema', form: 'illustration', title: 'T', shapes, nodes });
  // Deux cavités à cheval (diaphragme sur les poumons) : défaut.
  const overlapping = draw(
    [{ kind: 'ellipse', cx: 150, cy: 150, rx: 60, ry: 80, tone: 'organ' }, { kind: 'rect', x: 80, y: 180, width: 240, height: 60, tone: 'energy' }],
    [{ label: 'Poumon', at: { x: 150, y: 120 } }, { label: 'Diaphragme', at: { x: 280, y: 210 } }],
  );
  assert.match(checkIllustration(overlapping).join(' '), /se chevauchent/);
  // Noyau dans la cellule, membrane tracée sur le bord : correct.
  const nested = draw(
    [{ kind: 'ellipse', cx: 200, cy: 150, rx: 150, ry: 100, tone: 'cell' }, { kind: 'ellipse', cx: 200, cy: 150, rx: 150, ry: 100, tone: 'dark', fill: false }, { kind: 'circle', cx: 200, cy: 150, r: 30, tone: 'nerve' }],
    [{ label: 'Cytoplasme', at: { x: 120, y: 150 } }, { label: 'Membrane', at: { x: 50, y: 150 } }, { label: 'Noyau', at: { x: 200, y: 150 } }],
  );
  assert.deepEqual(checkIllustration(nested), []);
  // Point de légende dans le vide : défaut.
  const lost = draw(
    [{ kind: 'circle', cx: 100, cy: 100, r: 30, tone: 'organ' }, { kind: 'circle', cx: 300, cy: 100, r: 30, tone: 'organ' }],
    [{ label: 'A', at: { x: 100, y: 100 } }, { label: 'B', at: { x: 200, y: 250 } }],
  );
  assert.match(checkIllustration(lost).join(' '), /« B ».*n'est sur aucune forme/);
  console.log('tutor-visuals: contrôle géométrique des illustrations vérifié');
}
