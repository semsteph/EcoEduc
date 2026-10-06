// Régressions de la correction et de la mise en forme, tirées des tests
// réels multi-matières (4 passages de 6 agents).
const assert = require('node:assert/strict');
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test';
const { __test: t } = require('../routes/assistant.routes.cjs');
const { normaliseAssessment } = require('../server-lib/pedagogical-tutor.cjs');
const visuals = require('../server-lib/tutor-visuals.cjs');

const exercise = (questions) => ({ prompt: 'Exercice', questions });
const judge = (ex, raw, message, options) => t.crossCheckAssessment(normaliseAssessment(raw, ex), ex, message, [], options);

// 1. Réponse non numérotée : « 36 m » ne valide pas la question 2 (24 m).
{
  const ex = exercise([
    { id: 1, prompt: 'Aire du carré de 6 m ?', expectedAnswers: ['36 m²'] },
    { id: 2, prompt: 'Périmètre du carré de 6 m ?', expectedAnswers: ['24 m'] },
  ]);
  const result = judge(ex, {
    verdict: 'correct', reason: 'x',
    questions: [{ id: 1, verdict: 'partial', reason: 'unité' }, { id: 2, verdict: 'correct', reason: '36 m (6 m × 4 côtés)' }],
  }, '36 m');
  assert.equal(result.questions[1].verdict, 'unanswered');
  assert.notEqual(result.verdict, 'correct');
}

// 2. Nombre juste sans unité : « en partie juste », pas 100/100.
{
  const ex = exercise([{ id: 1, prompt: 'Périmètre ?', expectedAnswers: ['26 cm'] }]);
  const result = judge(ex, { verdict: 'correct', reason: 'x', questions: [{ id: 1, verdict: 'correct', reason: 'ok' }] }, '26');
  assert.equal(result.questions[0].verdict, 'partial');
  assert.match(result.questions[0].reason, /unité/);
}

// 3. « don't » suffit quand « go » est déjà écrit dans l'énoncé.
{
  const question = { id: 1, prompt: 'We _____ go to school on Saturdays. (not)', expectedAnswers: ["don't go"] };
  assert.ok(t.expectedVariants(question).includes('dont'));
  const ex = exercise([question]);
  for (const answer of ["don't", 'do not', 'dont']) {
    const result = judge(ex, { verdict: 'incorrect', reason: 'x', questions: [{ id: 1, verdict: 'incorrect', reason: 'il manque le verbe' }] }, answer);
    assert.equal(result.questions[0].verdict, 'correct', answer);
  }
}

// 4. Faute de frappe acceptée hors langue étrangère, refusée en anglais.
{
  const ex = exercise([{ id: 1, prompt: 'Le relief au nord-ouest ?', expectedAnswers: ['plus accidenté'] }]);
  const wrongly = { verdict: 'partially_correct', reason: 'x', questions: [{ id: 1, verdict: 'partial', reason: 'orthographe' }] };
  assert.equal(judge(ex, wrongly, 'plus acidenté', { fuzzy: true }).questions[0].verdict, 'correct');
  const en = exercise([{ id: 1, prompt: 'He ___ (explain)', expectedAnswers: ['explains'] }]);
  const lenient = { verdict: 'correct', reason: 'x', questions: [{ id: 1, verdict: 'correct', reason: 'ok' }] };
  assert.equal(judge(en, lenient, 'explain', { fuzzy: false }).questions[0].verdict, 'incorrect');
}

// 5. Bulles d'exercice sans squelette vide.
{
  const ex = { prompt: 'Relie chaque phrase à son type.', questions: [{ id: 1, prompt: 'Range ta chambre !' }] };
  for (const text of [
    "Bravo ! Voici un exercice :\n**Situation :**\n**Questions :** :",
    'Super ! Essaie ceci :\n1. «  »\n2. «  »\n3. «  »',
    'Voici ton exercice :\n**** :',
  ]) {
    const intro = t.introWithoutExerciseText(text, ex, 'Voici un exercice :');
    assert.doesNotMatch(intro, /Situation|Questions|\*\*\*\*|1\.|«/, intro);
  }
}

// 6. Étape du manuel : une question ou une demande n'est pas un titre.
{
  assert.equal(t.looksLikeBookTitle("c'est quoi un manuel ?"), false);
  assert.equal(t.looksLikeBookTitle('donne moi un exercice'), false);
  assert.equal(t.looksLikeBookTitle('oui vas y'), false);
  assert.equal(t.looksLikeBookTitle('Majors en Maths 6e'), true);
}

// 7. Circuit : fil non connecté, pile usée, lampe grillée ; schéma
//    différent pour une réexplication.
{
  const r = (m) => visuals.resolveRequestedVisual({ userMessage: m, activity: 'Le circuit électrique simple' }).diagram;
  assert.equal(r('deux fils ne sont pas connectés ensemble').brokenWire, true);
  const flat = r("la pile est usée, l'interrupteur est fermé");
  assert.equal(flat.circuitClosed, true);
  assert.ok(flat.components.every((c) => c.working !== true), 'pile usée : rien ne fonctionne');
  const bulb = r("l'ampoule est grillée");
  assert.equal(bulb.components.find((c) => c.kind === 'lamp').working, false);
  const closed = r('circuit fermé');
  assert.equal(visuals.alternativeVisual(closed).circuitClosed, false);
  // Schéma générique : pas de variante fabriquée par le backend (c'est
  // Claude qui propose une autre forme en réexplication).
  assert.equal(visuals.alternativeVisual(visuals.sanitiseSchema({ form: 'flow', nodes: [{ label: 'a' }, { label: 'b' }] })), null);
}

// 8. Cinquième passage réel.
{
  // Réponses numérotées sans ponctuation (« 3 Jumps. » refusé à tort).
  assert.deepEqual(t.parseNumberedAnswers('1 grows 2 do not play 3 Jumps. 4 Sell', 4), { 1: 'grows', 2: 'do not play', 3: 'Jumps', 4: 'Sell' });
  assert.deepEqual(t.parseNumberedAnswers('1 24 cm2 2 36 m', 2), { 1: '24 cm2', 2: '36 m' });
  assert.deepEqual(t.parseNumberedAnswers('2 centr et 3 nor ouest', 3), { 2: 'centr et', 3: 'nor ouest' });
  assert.deepEqual(t.parseNumberedAnswers('2 cm', 2), {}, 'un nombre isolé n’est pas un numéro de question');

  const en = exercise([
    { id: 1, prompt: 'She ___ (grow)', expectedAnswers: ['grows'] },
    { id: 2, prompt: 'They ___ football. (not play)', expectedAnswers: ["don't play"] },
    { id: 3, prompt: 'He ___ (jump)', expectedAnswers: ['jumps'] },
  ]);
  const wrong = {
    verdict: 'partially_correct', reason: 'x',
    questions: [
      { id: 1, verdict: 'correct', reason: 'ok' },
      { id: 2, verdict: 'partial', reason: 'préfère la contraction' },
      { id: 3, verdict: 'incorrect', reason: 'majuscule' },
    ],
  };
  const fixed = judge(en, wrong, '1 grows 2 do not play 3 Jumps.', { fuzzy: false });
  assert.deepEqual(fixed.questions.map((q) => q.verdict), ['correct', 'correct', 'correct']);

  // Fautes de frappe sur des mots courts (hors langue étrangère).
  const geo = exercise([
    { id: 1, prompt: 'Où est Dassa ?', expectedAnswers: ['Centre'] },
    { id: 2, prompt: "Où est l'Atacora ?", expectedAnswers: ['Nord-Ouest'] },
  ]);
  const unanswered = { verdict: 'correct', reason: 'x', questions: [{ id: 1, verdict: 'unanswered', reason: '-' }, { id: 2, verdict: 'unanswered', reason: '-' }] };
  assert.deepEqual(judge(geo, unanswered, '1 centr 2 nor ouest', { fuzzy: true }).questions.map((q) => q.verdict), ['correct', 'correct']);

  // Mauvaise unité : crédit partiel au lieu de 0.
  const area = exercise([{ id: 1, prompt: 'Aire ?', expectedAnswers: ['36 m²'] }]);
  const zero = { verdict: 'incorrect', reason: 'x', questions: [{ id: 1, verdict: 'incorrect', reason: 'unité' }] };
  assert.equal(judge(area, zero, '36 m').questions[0].verdict, 'partial');

  // Variantes collées par « | » découpées.
  const { sanitiseExercise } = require('../server-lib/pedagogical-tutor.cjs');
  const split = sanitiseExercise({
    prompt: 'p', criteria: ['c'], hintPlan: ['h'], solutionOutline: 's',
    questions: [{ id: 1, prompt: 'Type ?', expectedAnswers: ["interrogative, point d'interrogation|interrogative, ?"], criteria: ['c'] }],
  });
  assert.deepEqual(split.questions[0].expectedAnswers, ["interrogative, point d'interrogation", 'interrogative, ?']);

  // Exercice improvisé dans le texte : retiré et remplacé par une proposition.
  const cleaned = t.stripImprovisedExercise("Bien !\n\nExercice :\n1. Quel organe reçoit l'air ?\n2. Où passe le dioxygène ?");
  assert.doesNotMatch(cleaned, /Quel organe/);
  assert.match(cleaned, /donne-moi un exercice/);
  assert.equal(t.stripImprovisedExercise("Les étapes :\n1. L'air entre.\n2. Il descend."), "Les étapes :\n1. L'air entre.\n2. Il descend.", 'une liste d’étapes n’est pas un exercice');

  // Deux lampes dans l'énoncé → deux lampes dessinées.
  const two = visuals.resolveRequestedVisual({ userMessage: 'un circuit avec deux lampes et un interrupteur fermé' }).diagram;
  assert.equal(two.components.filter((c) => c.kind === 'lamp').length, 2);
}

// 9. Sixième passage réel.
{
  // Une variante longue ne désactive plus le contrôle (« un plateau plat »
  // validé à tort pour Natitingou).
  const geo = exercise([{ id: 1, prompt: 'Quel relief trouve-t-on à Natitingou ?', expectedAnswers: ['une montagne', 'une montagne avec des pentes raides'] }]);
  const lenient = { verdict: 'correct', reason: 'x', questions: [{ id: 1, verdict: 'correct', reason: 'ok' }] };
  assert.equal(judge(geo, lenient, 'un plateau plat', { fuzzy: true }).questions[0].verdict, 'incorrect');
  const partial = { verdict: 'partially_correct', reason: 'x', questions: [{ id: 1, verdict: 'partial', reason: '?' }] };
  assert.equal(judge(geo, partial, 'une montagne', { fuzzy: true }).questions[0].verdict, 'correct');
  // Une question d'explication reste jugée par le modèle.
  const why = exercise([{ id: 1, prompt: 'Explique pourquoi il pleut plus en montagne.', expectedAnswers: ['altitude'] }]);
  assert.equal(judge(why, lenient, "parce que l'air monte et se refroidit", { fuzzy: true }).questions[0].verdict, 'correct');

  // Lettres de choix : « c'est la A » = « parcelle A ».
  const choice = exercise([{ id: 1, prompt: 'Quelle parcelle est la plus grande ?', expectedAnswers: ['la parcelle A', 'A'] }]);
  const refused = { verdict: 'incorrect', reason: 'x', questions: [{ id: 1, verdict: 'incorrect', reason: 'non' }] };
  assert.equal(judge(choice, refused, "cest la A la plus grande", { fuzzy: true }).questions[0].verdict, 'correct');
  assert.equal(judge(choice, lenient, 'la B', { fuzzy: true }).questions[0].verdict, 'incorrect');

  // Corrigé calculé : parcelle de 9 m × 3 m → 27 m², pas 27 cm².
  assert.deepEqual(t.computedMathsAnswers({ prompt: 'Une parcelle rectangulaire mesure 9 m sur 3 m. Calcule son aire.' }), ['27 m²', '27 m2']);
  assert.deepEqual(t.computedMathsAnswers({ prompt: 'Calcule le périmètre d’un carré de 7 cm de côté.' }), ['28 cm']);
  assert.equal(t.computedMathsAnswers({ prompt: 'Quelle parcelle est la plus grande ?' }), null);

  // Filtre d'exercice improvisé : une phrase contenant « exercice » ne
  // fait plus disparaître tout le texte.
  const kept = t.stripImprovisedExercise("L'air entre par le nez.\n\nSi tu veux, je peux te donner un exercice.");
  assert.match(kept, /L'air entre par le nez/);

  // Circuit : « l'un des fils reliant la lampe est cassé » = fil coupé,
  // pas lampe grillée.
  const wire = visuals.resolveRequestedVisual({ userMessage: "l'un des deux fils reliant la lampe est cassé", activity: 'circuit électrique' }).diagram;
  assert.equal(wire.brokenWire, true);
  assert.ok(!wire.components.some((c) => c.broken));

}

// 10. Septième passage réel.
{
  const tutor = require('../server-lib/pedagogical-tutor.cjs');
  // Verdict global « partial » (hors liste) : l'évaluation reste exploitable
  // (sinon « Je n'ai pas réussi à corriger » sur une réponse juste).
  const open = exercise([{ id: 1, prompt: 'Explique en une phrase pourquoi la lampe s’éteint.', expectedAnswers: ['le fil est cassé donc la boucle est ouverte'] }]);
  const raw = { verdict: 'partial', reason: 'x', questions: [{ id: 1, verdict: 'partial', reason: 'formulation' }] };
  assert.equal(tutor.isValidAssessment(raw, open), true);
  assert.equal(normaliseAssessment(raw, open).verdict, 'partially_correct');

  // Introduction d'exercice : aucune question hors carte.
  const ex = { prompt: 'Observe le circuit.', questions: [{ id: 1, prompt: 'Explique pourquoi la lampe s’éteint.' }] };
  const intro = t.introWithoutExerciseText("Bravo ! Voici le suivant. Si tu réparais ce fil cassé, que se passerait-il ?", ex, 'Voici un exercice :');
  assert.doesNotMatch(intro, /réparais/);
  assert.match(intro, /Bravo/);

  // Exercice improvisé : l'annonce est retirée avec les questions.
  const stripped = t.stripImprovisedExercise("Super ! Voici un petit exercice pour toi :\n1. Par où entre l'air ?\n2. Où va le dioxygène ?");
  assert.doesNotMatch(stripped, /Voici un petit exercice/);

  // « plato » = « plateau » (tolérance phonétique hors langue étrangère).
  assert.equal(tutor.answerMatchesExpected('un plato', { expectedAnswers: ['plateau'] }, { fuzzy: true }), true);
  assert.equal(tutor.answerMatchesExpected('plaine', { expectedAnswers: ['plateau'] }, { fuzzy: true }), false);

  // Une question qui mentionne « l'exo » n'est pas une demande d'exercice.
  assert.equal(tutor.isExerciseRequest("dans l'exo, quel est le type de « Je ne mange pas de piment. » ?"), false);
  assert.equal(tutor.isExerciseRequest('donne moi un autre exo'), true);
  assert.equal(tutor.isExerciseRequest('donne-moi un exercice'), true);

  // « petits carrés de 1 cm » décrit le quadrillage, pas la figure.
  const fig = tutor.inferFigureFromText('Tu vois ce carré de 2 cm ? Je le découpe en petits carrés de 1 cm.');
  assert.deepEqual(fig.measurements, { 'A-B': '2 cm', 'B-C': '2 cm' });

  // Trait de longueur nulle écarté des composites.
  assert.equal(tutor.sanitiseCompositeElements([{ type: 'line', points: { A: { x: 100, y: 100 }, B: { x: 101, y: 100 } }, label: 'Aire' }]).length, 0);
}

// 11. Tests réels lycée (séries C et D) : correction des calculs.
{
  const { compareNumericAnswer } = require('../server-lib/answer-math.cjs');
  // Nombre isolé dans une réponse numérotée (« 2 ATP » n'est pas la Q2).
  assert.deepEqual(t.parseNumberedAnswers('1) dans le cytoplasme, 2 ATP', 2), { 1: 'dans le cytoplasme, 2 ATP' });
  assert.deepEqual(t.parseNumberedAnswers('1) 2 ATP 2) mitochondrie', 2), { 1: '2 ATP', 2: 'mitochondrie' });
  // Écritures équivalentes reconnues.
  assert.equal(compareNumericAnswer('DE.DF = 6x4xcos45 = 24 x racine2/2 = 12racine2', '12√2'), 'correct');
  assert.equal(compareNumericAnswer('E = 1,125x10^6 N/C', '1 125 000 N/C'), 'correct');
  assert.equal(compareNumericAnswer('0,53 mol', '0,526 mol'), 'correct');
  // Unité absente ou fausse : jamais 100/100.
  assert.equal(compareNumericAnswer('x = 3x7+8 = 29', '29 m'), 'missing-unit');
  assert.equal(compareNumericAnswer('36 m', '36 m²'), 'wrong-unit');
  // Valeurs fausses refusées.
  assert.equal(compareNumericAnswer('v = 3/4 = 0,75 mol/min', '0,375 mol/L/min'), 'different');
  assert.equal(compareNumericAnswer('ca fait x+5 donc 10', '-10'), 'different');
  assert.equal(compareNumericAnswer('environ 10', '9'), 'different');

  const exo = exercise([
    { id: 1, prompt: 'Calcule x', expectedAnswers: ['29 m'] },
    { id: 2, prompt: 'Calcule la vitesse volumique', expectedAnswers: ['0,375 mol/L/min'] },
    { id: 3, prompt: 'Quelle est cette phase ?', expectedAnswers: ['métaphase'] },
  ]);
  const checked = t.crossCheckAssessment({
    verdict: 'correct', reason: 'x',
    questions: [
      { id: 1, verdict: 'incorrect', reason: 'faux' },
      { id: 2, verdict: 'correct', reason: 'ok' },
      { id: 3, verdict: 'correct', reason: 'ok' },
    ],
  }, exo, '1) x = 3x7+8 = 29 m 2) v = 3/4 = 0,75 mol/min 3) prophase ou metaphase je sais plus');
  assert.deepEqual(checked.questions.map((q) => q.verdict), ['correct', 'incorrect', 'partial']);
}

console.log('tutor-correction: régressions de la correction vérifiées');
