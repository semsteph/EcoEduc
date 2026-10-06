// Scénario complet du tuteur, sur les vraies routes Express, avec une base
// MySQL simulée en mémoire et un Claude simulé déterministe.
//
// Le Claude simulé reproduit volontairement le défaut observé en
// conditions réelles : il annonce « Voici le schéma » sans fournir de
// données de schéma. Le test vérifie que l'élève ne reçoit jamais une
// promesse de schéma non tenue, et qu'une vraie demande de schéma produit
// un vrai schéma — en direct et après rechargement.
require('./helpers/vue-sfc-loader.cjs');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');

// ---------------------------------------------------------------------
// Claude simulé.
// ---------------------------------------------------------------------
const llmCalls = [];
let assessmentMode = 'normal';

function lastUserText(params) {
  const last = [...params.messages].reverse().find((m) => m.role === 'user');
  return String(last?.content || '');
}

// Comme l'API réelle : si la réponse est pré-remplie (dernier message
// « assistant »), le modèle renvoie seulement la suite de ce préfixe.
function fakeClaude(params) {
  const last = params.messages[params.messages.length - 1];
  const response = fakeClaudeFull(params);
  if (last?.role === 'assistant') {
    const prefix = String(last.content);
    const text = response.content[0].text;
    response.content[0].text = text.startsWith(prefix) ? text.slice(prefix.length) : text;
  }
  return response;
}

function digestionFlow(highlight) {
  const node = (id, label, detail, extra = {}) => ({ id, label, detail, ...(highlight === id ? { highlight: true } : {}), ...extra });
  return {
    type: 'schema',
    form: 'flow',
    title: 'Le trajet des aliments',
    nodes: [
      node('bouche', 'Bouche', 'les dents broient les aliments'),
      node('oesophage', 'Œsophage', "conduit les aliments jusqu'à l'estomac"),
      node('estomac', 'Estomac', 'brasse les aliments'),
      node('intestin', 'Intestin grêle', 'absorbe les nutriments'),
      node('gros_intestin', 'Gros intestin', "absorbe l'eau"),
      node('anus', 'Anus', 'rejette les déchets'),
      node('foie', 'Foie', 'produit la bile', { attachTo: 'intestin' }),
    ],
  };
}

function fakeClaudeFull(params) {
  const system = String(params.system || '');
  const user = lastUserText(params);
  llmCalls.push({ system, user });
  const text = (value) => ({ content: [{ type: 'text', text: value }] });

  if (system.startsWith("Tu es le classifieur d'intention d'un tuteur scolaire, appelé juste avant de corriger")) {
    return text('{"intent":"ANSWER_ATTEMPT","confidence":0.9}');
  }

  if (system.startsWith("Tu es le classifieur d'intention d'un tuteur scolaire.")) {
    const intent = /\?\s*$/.test(user) || /digestion/.test(user) ? 'FOLLOW_UP_QUESTION' : 'AMBIGUOUS';
    return text(`{"intent":"${intent}","confidence":0.85}`);
  }

  // Relecture avant envoi : rien à corriger dans les messages simulés.
  if (system.startsWith('Tu relis, avant envoi')) return text('{"ok":true}');

  if (system.includes("Tu es l'évaluateur pédagogique")) {
    if (assessmentMode === 'garbage') return text("Bravo, c'est juste !");
    // Correcteur trop indulgent (cas réel : « we walks » validé).
    if (assessmentMode === 'lenient') return text('<exercise-assessment>{"verdict":"correct","reason":"Parfait.","questions":[{"id":1,"verdict":"correct","reason":"Parfait !"}]}</exercise-assessment>');
    const correct = /estomac/i.test(user);
    return text(`<exercise-assessment>{"verdict":"${correct ? 'correct' : 'incorrect'}","reason":"${correct ? 'Bonne réponse.' : "Ce n'est pas le bon organe."}","questions":[{"id":1,"verdict":"${correct ? 'correct' : 'incorrect'}","reason":"${correct ? "C'est bien l'estomac." : "L'intestin grêle vient après l'estomac."}"}]}</exercise-assessment>`);
  }

  if (system.includes('<exercise-data>{"prompt"')) {
    return text(`Voici un exercice :
**Question 1 :**
1. «  »
<exercise-data>{"prompt":"Les aliments quittent l'œsophage. Dans quel organe arrivent-ils ?","questions":[{"id":1,"prompt":"Dans quel organe arrivent les aliments après l'œsophage ?","expectedAnswers":["estomac","l'estomac"],"criteria":["Nommer l'estomac"],"diagram":null}],"criteria":["Connaître l'ordre des organes"],"hintPlan":["Pense au trajet des aliments.","C'est une poche qui brasse les aliments."],"solutionOutline":"Après l'œsophage, les aliments arrivent dans l'estomac.","diagram":null}</exercise-data>`);
  }

  // Appel dédié au schéma obligatoire : Claude choisit la forme générique.
  if (system.startsWith('Tu produis UNIQUEMENT les données du schéma')) {
    const notion = user.match(/Notion de la séance : (.*)/)?.[1] || '';
    if (/respir|poumon/i.test(notion)) {
      return text('<explanation-data>{"diagram":{"type":"schema","form":"illustration","title":"L\'appareil respiratoire","draw":"appareil respiratoire vu de face : fosses nasales, trachée, bronches, poumons, diaphragme"}}</explanation-data>');
    }
    if (/digesti/i.test(notion)) {
      return text(`<explanation-data>{"diagram":${JSON.stringify(digestionFlow(/Question de l'élève : [^\n]*(oesophage|œsophage)/i.test(user) ? 'oesophage' : null))}}</explanation-data>`);
    }
    return text('<explanation-data>{"diagram":{"type":"rectangle","width":5,"height":3,"unit":"cm"}}</explanation-data>');
  }

  // Dessin d'une illustration (modèle dédié).
  if (system.startsWith('Tu dessines une illustration')) {
    // Liste de cases convertie en dessin : le dessin reprend les parties
    // demandées et la partie à mettre en évidence.
    const parts = (user.match(/parties à légender : ([^;\n]+)/) || [])[1];
    if (parts) {
      const focus = (user.match(/mettre en évidence : ([^;\n]+)/) || [])[1];
      const labels = parts.split(', ');
      return text(JSON.stringify({
        title: 'Dessin',
        // Une forme par partie : dessin sans défaut, pas de correction.
        shapes: labels.map((_, index) => ({ kind: 'circle', cx: 150 + (index % 2) * 100, cy: 60 + index * 30, r: 12, tone: 'organ' })),
        nodes: labels.map((label, index) => ({
          id: label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/Œ/g, 'Oe').toLowerCase().replace(/[^a-z]+/g, '-'),
          label,
          detail: 'rôle',
          at: { x: 150 + (index % 2) * 100, y: 60 + index * 30 },
          ...(label === focus ? { highlight: true } : {}),
        })),
      }));
    }
    return text(JSON.stringify({
      title: "L'appareil respiratoire",
      shapes: [
        { kind: 'rect', x: 188, y: 30, width: 24, height: 90, rx: 10, tone: 'air' },
        { kind: 'path', d: 'M190 120 C 120 110 80 170 90 250 C 130 270 180 260 190 230 Z', tone: 'organ' },
        { kind: 'path', d: 'M210 120 C 280 110 320 170 310 250 C 270 270 220 260 210 230 Z', tone: 'organ' },
        { kind: 'path', d: 'M70 270 C 150 240 250 240 330 270', tone: 'blood', fill: false },
      ],
      nodes: [
        { label: 'Trachée', detail: "conduit l'air", at: { x: 200, y: 70 } },
        { label: 'Poumons', detail: 'échanges gazeux', at: { x: 130, y: 190 }, highlight: true },
        { label: 'Diaphragme', detail: 'muscle de la respiration', at: { x: 200, y: 252 } },
      ],
    }));
  }

  // Demande de schéma : le modèle place le schéma DANS son texte.
  if (system.includes("L'élève a demandé à voir un schéma. Fournis-le")) {
    return text(`Voici le trajet des aliments, avec l'œsophage en évidence.

<explanation-data>{"diagram":${JSON.stringify(digestionFlow(/schema de l appareil|appareil digestif/i.test(user.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/'/g, ' ')) ? null : 'oesophage'))}}</explanation-data>

Regarde le schéma : l'œsophage relie la bouche à l'estomac. Pour vérifier : par quel organe les aliments passent-ils juste après la bouche ?`);
  }

  // Cours d'anglais : le modèle tente malgré tout un schéma.
  if (system.includes("on n'utilise AUCUN schéma")) {
    return text('The present simple : I play, he plays. Voici un schéma pour t\'aider :\n<explanation-data>{"diagram":{"type":"composite","elements":[{"type":"circle","center":{"x":250,"y":160},"radius":60,"label":"He plays"}]}}</explanation-data>\nPour vérifier : conjugue « to eat » avec « she ».');
  }


  // Défaut réel reproduit : annonce d'un schéma sans bloc de données.
  if (/oesophage|œsophage/i.test(user)) {
    return text("L'œsophage est un tube qui conduit les aliments de la bouche à l'estomac. Voici le schéma de l'œsophage pour que tu voies bien. Pour vérifier : où va la nourriture après l'œsophage ?");
  }

  return text("Je t'explique simplement. Pour vérifier : quel organe brasse les aliments ?");
}

require.cache[require.resolve('@anthropic-ai/sdk')] = {
  id: require.resolve('@anthropic-ai/sdk'),
  filename: require.resolve('@anthropic-ai/sdk'),
  loaded: true,
  exports: class FakeAnthropic {
    constructor() {
      this.messages = { create: async (params) => fakeClaude(params) };
    }
  },
};

// ---------------------------------------------------------------------
// Base simulée : uniquement les requêtes utilisées par les routes.
// ---------------------------------------------------------------------
const db = {
  eleve: [{ id: 7, nom: 'Test', prenom: 'Ben', classe_id: 3, etablissement_id: 1, Annee_scolaire_id: 2, Parents_id: 11 }],
  tests: [
    { id: 101, activite: 'Appareils digestif', date: '2026-09-27', matiereNom: 'SVT' },
    { id: 102, activite: 'Appareils digestif', date: '2026-09-26', matiereNom: 'SVT' },
    { id: 103, activite: 'Périmètre du rectangle', date: '2026-09-25', matiereNom: 'Mathématique' },
    { id: 104, activite: 'The present simple', date: '2026-09-24', matiereNom: 'Anglais' },
    { id: 105, activite: "La respiration chez l'Homme", date: '2026-09-23', matiereNom: 'SVT' },
  ],
  conversations: [],
  messages: [],
};
let nextId = 1;

async function query(sql, params = []) {
  const s = sql.replace(/\s+/g, ' ').trim();

  if (s.startsWith('SELECT id, nom, prenom, classe_id')) {
    return [db.eleve.filter((e) => e.id === Number(params[0]))];
  }
  if (s.startsWith('SELECT id FROM tests WHERE id = ?')) {
    return [db.tests.filter((t) => t.id === Number(params[0])).map((t) => ({ id: t.id }))];
  }
  if (s.startsWith('SELECT t.id, t.activite')) {
    const t = db.tests.find((row) => row.id === Number(params[2]));
    return [t ? [{
      id: t.id, activite: t.activite, date: t.date, matiereId: 5, matiereNom: t.matiereNom,
      className: '5ème 2', promotionName: '5ème', schoolYear: '2026-2027', establishmentName: 'CEG Test',
    }] : []];
  }
  if (s.startsWith('SELECT id, date, activite FROM tests')) return [[]];
  if (s.startsWith('SELECT id, tutor_state AS tutorState FROM assistant_conversation')) {
    return [db.conversations
      .filter((c) => c.eleve_id === Number(params[0]) && c.test_id === Number(params[1]))
      .map((c) => ({ id: c.id, tutorState: c.tutor_state }))];
  }
  if (s.startsWith('INSERT INTO assistant_conversation')) {
    const id = nextId++;
    db.conversations.push({ id, eleve_id: Number(params[0]), test_id: Number(params[1]), tutor_state: params[4] });
    return [{ insertId: id }];
  }
  if (s.startsWith('UPDATE assistant_conversation SET tutor_state = ?')) {
    db.conversations.find((c) => c.id === params[1]).tutor_state = params[0];
    return [{ affectedRows: 1 }];
  }
  if (s.startsWith('INSERT INTO assistant_message')) {
    const role = s.includes("'user'") ? 'user' : 'assistant';
    db.messages.push({
      id: nextId++,
      conversation_id: params[0],
      role,
      content: params[1],
      explanation_segments: params[2] ?? null,
      exercise_data: params[3] ?? null,
    });
    return [{ insertId: nextId }];
  }
  if (s.startsWith('SELECT role, content, explanation_segments')) {
    return [db.messages.filter((m) => m.conversation_id === params[0]).map((m) => ({
      role: m.role, content: m.content,
      explanationSegments: m.explanation_segments, exerciseData: m.exercise_data, createdAt: null,
    }))];
  }
  if (s.startsWith('SELECT role, content, exercise_data AS exerciseData FROM assistant_message')) {
    return [db.messages.filter((m) => m.conversation_id === params[0]).map((m) => ({ role: m.role, content: m.content, exerciseData: m.exercise_data }))];
  }
  throw new Error(`Requête non simulée : ${s.slice(0, 120)}`);
}

// ---------------------------------------------------------------------
// Serveur de test.
// ---------------------------------------------------------------------
process.env.JWT_SECRET = 'test-secret';
const router = require('../routes/assistant.routes.cjs');
const { readTutorState, TUTOR_STATES } = require('../server-lib/pedagogical-tutor.cjs');

// Le rate limiting (1 message / 5 s) est réel : on avance l'horloge.
const realNow = Date.now;
let clockOffset = 0;
Date.now = () => realNow() + clockOffset;

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.db = { query }; next(); });
app.use('/api/parent/assistant', router);

const token = jwt.sign({ id: 11 }, process.env.JWT_SECRET);
let baseUrl;

async function send(testId, userMessage) {
  // 2 minutes entre deux messages : respecte 1 message / 5 s et 30 / heure.
  clockOffset += 120000;
  const callsBefore = llmCalls.length;
  const response = await fetch(`${baseUrl}/api/parent/assistant/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ eleveId: 7, testId, userMessage }),
  });
  const body = await response.json();
  assert.equal(response.status, 200, `${userMessage} → ${response.status} ${JSON.stringify(body)}`);
  const conversation = db.conversations.find((c) => c.test_id === testId);
  return {
    body,
    state: readTutorState(conversation.tutor_state),
    calls: llmCalls.slice(callsBefore),
  };
}

function hasVisual(body) {
  return (body.explanationSegments || []).some((segment) => segment.diagram);
}

(async () => {
  const server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // Aucune conversation au départ.
    const empty = await (await fetch(`${baseUrl}/api/parent/assistant/conversation/7/101`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    assert.deepEqual(empty.messages, []);

    // 1. « je n'ai pas compris le cours » → explication, puis vérification.
    let turn = await send(101, "je n'ai pas compris le cours");
    assert.equal(turn.state.phase, TUTOR_STATES.UNDERSTANDING_CHECK);
    // SVT : le schéma est donné d'office, sans que l'élève le demande.
    // Schéma générique décrit par Claude (aucun schéma codé par notion).
    let diagram = turn.body.explanationSegments.find((s) => s.diagram)?.diagram;
    assert.equal(diagram?.type, 'schema');
    // Liste de cases sur un appareil du corps en SVT : remplacée par un vrai
    // dessin annoté (test réel : tube digestif en 6e).
    assert.equal(diagram.form, 'illustration');
    assert.ok(diagram.shapes.length > 0 && diagram.nodes.length >= 2);
    assert.equal(turn.body.inputMode, 'question');
    // Le schéma est dans le corps de l'explication, avant la question de
    // vérification (jamais tout en bas).
    const segments = turn.body.explanationSegments;
    assert.ok(segments.findIndex((s) => s.diagram) < segments.length - 1, 'schéma avant la question finale');
    assert.match(segments.at(-1).text, /\?\s*$/);
    // Plus de repères codés par notion : le savoir vient de l'IA.
    assert.doesNotMatch(turn.calls.find((c) => c.system.startsWith('Tu es un assistant pédagogique')).system, /REPÈRES VALIDÉS/);
    // Consigne de vraie vérification (pas seulement « est-ce clair ? »).
    assert.match(turn.calls.find((c) => c.system.startsWith('Tu es un assistant pédagogique')).system, /question courte qui vérifie réellement/);

    // 2. « le fonctionnement de la digestion » → nouvelle question.
    turn = await send(101, 'le fonctionnement de la digestion');
    assert.equal(turn.state.phase, TUTOR_STATES.UNDERSTANDING_CHECK);
    assert.ok(turn.calls.some((c) => c.system.startsWith("Tu es le classifieur d'intention")));

    // Toute explication en SVT porte son schéma, même identique au
    // précédent (en test réel, la réexplication arrivait sans schéma).
    assert.equal(hasVisual(turn.body), true);

    // 3. « c'est quoi tu appel l'œsophage ? » → explication. Le modèle
    //    annonce un schéma sans le fournir : le backend fournit d'office le
    //    vrai schéma, œsophage mis en évidence, donc l'annonce est tenue.
    turn = await send(101, "c'est quoi tu appel l'œsophage ?");
    assert.equal(hasVisual(turn.body), true);
    assert.deepEqual(turn.body.explanationSegments.find((s) => s.diagram).diagram.nodes.filter((n) => n.highlight).map((n) => n.id), ['oesophage']);
    assert.match(turn.body.reply, /conduit les aliments de la bouche à l'estomac/);

    // 4. « tu peux me montrer par un schema ? » → VRAI schéma, choisi par
    //    le contexte, œsophage mis en évidence. Pas d'appel au classifieur.
    turn = await send(101, 'tu peux me montrer par un schema ?');
    assert.equal(hasVisual(turn.body), true);
    diagram = turn.body.explanationSegments.find((s) => s.diagram).diagram;
    assert.equal(diagram.type, 'schema');
    assert.deepEqual(diagram.nodes.filter((n) => n.highlight).map((n) => n.id), ['oesophage']);
    assert.ok(!turn.calls.some((c) => c.system.startsWith("Tu es le classifieur d'intention")));
    // Un seul appel de réponse, plus sa relecture avant envoi (et le dessin
    // qui remplace la liste de cases).
    assert.equal(turn.calls.filter((c) => !c.system.startsWith('Tu relis, avant envoi') && !c.system.startsWith('Tu dessines une illustration')).length, 1);
    assert.ok(turn.calls.some((c) => c.system.startsWith('Tu relis, avant envoi')), 'message relu avant envoi');
    assert.equal(turn.state.phase, TUTOR_STATES.UNDERSTANDING_CHECK);
    // Texte, puis schéma, puis la suite du texte : une seule bulle.
    assert.match(turn.body.explanationSegments[0].text, /Voici le trajet des aliments/);
    assert.equal(turn.body.explanationSegments[0].diagram?.type, 'schema');
    assert.match(turn.body.explanationSegments[1].text, /Regarde le schéma/);

    // 5. « montre moi le schema de l'appareil digestif » → schéma complet.
    turn = await send(101, "montre moi le schema de l'appareil digestif");
    diagram = turn.body.explanationSegments.find((s) => s.diagram).diagram;
    assert.equal(diagram.type, 'schema');
    assert.equal(diagram.nodes.length, 7);
    assert.ok(!diagram.nodes.some((n) => n.highlight));
    assert.equal(turn.body.explanationVisual.type, 'schema');

    // 6. « à quoi sert l'estomac ? » → nouvelle explication.
    turn = await send(101, "à quoi sert l'estomac ?");
    assert.equal(turn.state.phase, TUTOR_STATES.UNDERSTANDING_CHECK);

    // 7. « je n'ai pas compris » → NOT_UNDERSTOOD, réexplication, sans
    //    appel au classifieur (décision déterministe).
    turn = await send(101, "je n'ai pas compris");
    assert.equal(turn.state.phase, TUTOR_STATES.UNDERSTANDING_CHECK);
    assert.ok(!turn.calls.some((c) => c.system.startsWith("Tu es le classifieur d'intention")));
    // Réexplication en SVT : elle a son schéma (appel dédié si besoin).
    assert.equal(hasVisual(turn.body), true);
    assert.match(turn.calls[0].system, /change réellement l'angle pédagogique/);

    // 8. Incertitude : ni exercice, ni réexplication complète.
    turn = await send(101, "je crois que j'ai compris mais je ne suis pas sûr");
    assert.equal(turn.state.phase, TUTOR_STATES.UNDERSTANDING_CHECK);
    assert.equal(turn.body.inputMode, 'question');
    assert.match(turn.calls[0].system, /n'est pas sûr d'avoir compris/);

    // 8 bis. « oui » seul n'est pas une preuve : décision contextuelle.
    turn = await send(101, 'oui');
    assert.ok(turn.calls.some((c) => c.system.startsWith("Tu es le classifieur d'intention")));
    assert.notEqual(turn.body.inputMode, 'exercise');

    // 9. « donne-moi un exercice » → exercice, présenté dans CE message.
    turn = await send(101, 'donne-moi un exercice');
    assert.equal(turn.state.phase, TUTOR_STATES.APPLICATION_EXERCISE);
    assert.equal(turn.body.inputMode, 'exercise');
    assert.ok(turn.body.messageExercise);
    // L'énoncé est dans la carte, pas recopié dans le texte (plus de doublon).
    assert.match(turn.body.messageExercise.prompt, /Dans quel organe arrivent-ils/);
    assert.doesNotMatch(turn.body.reply, /Dans quel organe arrivent-ils/);
    // Plus de squelette vide « Question 1 : » / « 1. «  » » dans la bulle.
    assert.doesNotMatch(turn.body.reply, /Question 1|1\. «/);

    // 10. Mauvaise réponse → indice, même exercice, pas de nouvelle carte.
    turn = await send(101, "l'intestin grêle");
    assert.equal(turn.state.phase, TUTOR_STATES.APPLICATION_RETRY);
    assert.equal(turn.state.attempts, 1);
    assert.match(turn.body.reply, /💡 Indice : Pense au trajet des aliments/);
    // La bonne réponse (« estomac ») glissée par le modèle dans sa raison
    // n'est pas montrée à l'élève.
    assert.doesNotMatch(turn.body.reply, /estomac/i);
    assert.match(turn.body.reply, /❌ Question 1/);
    assert.equal(turn.body.messageExercise, null);
    assert.ok(turn.body.exercise, "l'exercice en cours reste connu du frontend");

    // 10 bis. « oui » seul pendant l'exercice : rappel de l'exercice, sans
    //         correction ni tentative comptée, sans appel au modèle.
    turn = await send(101, 'oui');
    assert.equal(turn.calls.length, 0);
    assert.equal(turn.state.attempts, 1);
    assert.match(turn.body.reply, /écris ta réponse à chaque question/);
    assert.ok(turn.body.messageExercise, "la carte de l'exercice est réaffichée");

    // 10 ter. Le modèle voit les questions exactes de l'exercice (dans
    //         l'historique et dans la consigne) : il ne peut plus les réinventer.
    turn = await send(101, "l'intestin grêle encore");
    const assessorCall = turn.calls.find((c) => c.system.includes("Tu es l'évaluateur pédagogique"));
    assert.ok(assessorCall, 'correcteur appelé');
    // Correcteur dédié : sans le prompt du tuteur ni l'historique.
    assert.doesNotMatch(assessorCall.system, /assistant pédagogique bienveillant/);
    assert.equal(turn.state.attempts, 2);

    // 11. Bonne réponse → note, niveau suivant, nouvel exercice.
    turn = await send(101, "l'estomac");
    assert.equal(turn.state.phase, TUTOR_STATES.APPLICATION_EXERCISE);
    assert.equal(turn.state.completedExercises, 1);
    assert.equal(turn.state.exerciseLevel, 2);
    assert.match(turn.body.reply, /Bravo Ben/);
    assert.ok(turn.body.messageExercise, 'le nouvel exercice est attaché au message');

    // 11 bis. Évaluation de Claude inexploitable : une réponse identique
    //         à la réponse attendue est tout de même reconnue.
    assessmentMode = 'garbage';
    turn = await send(101, 'estomac');
    assert.match(turn.body.reply, /Bravo Ben/);
    assert.equal(turn.state.completedExercises, 2);
    // Deux exercices réussis : le backend (et lui seul) passe au manuel.
    assert.equal(turn.state.phase, TUTOR_STATES.BOOK_SELECTION);
    assert.equal(turn.body.inputMode, 'book');
    assert.match(turn.body.reply, /titre exact de ton livre/);

    // Étape « manuel » : une question n'est pas prise pour un titre, et le
    // message de l'élève est bien enregistré.
    const before = db.messages.length;
    turn = await send(101, "c'est quoi un manuel ?");
    assert.equal(turn.state.phase, TUTOR_STATES.BOOK_SELECTION);
    assert.ok(db.messages.slice(before).some((m) => m.role === 'user' && m.content === "c'est quoi un manuel ?"));
    // « donne moi un exercice » : on continue sans manuel, avec un vrai
    // exercice (en test réel, c'était cherché comme un titre de livre).
    turn = await send(101, 'donne moi un exercice');
    assert.equal(turn.state.phase, TUTOR_STATES.APPLICATION_EXERCISE);
    assert.ok(turn.body.messageExercise);
    assert.doesNotMatch(turn.body.reply, /référence|manuel/i);
    assessmentMode = 'normal';

    // 12. Rechargement : messages, schémas et exercices sont restitués.
    const reloaded = await (await fetch(`${baseUrl}/api/parent/assistant/conversation/7/101`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    assert.equal(reloaded.messages.length, db.messages.filter((m) => m.conversation_id === 1).length);
    const visualMessages = reloaded.messages.filter((m) => m.segments.some((s) => s.diagram?.type === 'schema'));
    assert.ok(visualMessages.length >= 2, 'les schémas survivent au rechargement');
    // Exercices présentés aux étapes 9, 10 bis (rappel), 11 et après
    // « donne moi un exercice » pendant l'étape du manuel.
    assert.equal(reloaded.messages.filter((m) => m.exercise).length, 4, 'un exercice par message qui l’a présenté');
    assert.equal(reloaded.inputMode, 'exercise');
    // Aucun état interne n'est exposé au frontend.
    assert.equal(JSON.stringify(reloaded).includes('UNDERSTANDING_CHECK'), false);

    // Le schéma relu en base est réellement dessiné par le composant Vue.
    const { createSSRApp, h } = require('vue');
    const { renderToString } = require('vue/server-renderer');
    const TutorVisual = require(path.join(__dirname, '../components/parents/TutorVisual.vue')).default;
    const reloadedDiagram = visualMessages[0].segments.find((s) => s.diagram).diagram;
    const html = await renderToString(createSSRApp({ render: () => h(TutorVisual, { diagram: reloadedDiagram }) }));
    assert.match(html, /generic-schema form-illustration/);
    assert.match(html, /Œsophage/);

    // -----------------------------------------------------------------
    // Deuxième conversation : exercice demandé d'emblée, puis trois
    // erreurs → réexplication et retour à la vérification (sans boucle).
    // -----------------------------------------------------------------
    turn = await send(102, 'donne moi un exercice');
    assert.equal(turn.state.phase, TUTOR_STATES.APPLICATION_EXERCISE);
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      turn = await send(102, 'le foie');
      assert.equal(turn.state.phase, TUTOR_STATES.APPLICATION_RETRY);
      assert.equal(turn.state.attempts, attempt);
    }
    turn = await send(102, 'le foie');
    assert.equal(turn.state.phase, TUTOR_STATES.UNDERSTANDING_CHECK);
    assert.match(turn.body.reply, /Je reprends la méthode autrement/);
    assert.equal(turn.body.inputMode, 'question');
    // L'élève peut alors confirmer et repartir sur un exercice.
    turn = await send(102, "oui j'ai compris");
    assert.equal(turn.state.phase, TUTOR_STATES.APPLICATION_EXERCISE);

    // Une demande de schéma pendant un exercice affiche le schéma sans
    // abandonner l'exercice.
    turn = await send(102, 'montre moi le schéma');
    assert.equal(hasVisual(turn.body), true);
    assert.equal(turn.state.phase, TUTOR_STATES.APPLICATION_EXERCISE);
    assert.equal(turn.body.inputMode, 'exercise');

    // -----------------------------------------------------------------
    // Notion dont la forme compte (respiration) : Claude commande une
    // illustration, dessinée par l'appel dédié, validée par le serveur.
    // -----------------------------------------------------------------
    turn = await send(105, 'comment lair rentre dans nos poumon ?');
    diagram = turn.body.explanationSegments.find((s) => s.diagram)?.diagram;
    assert.equal(diagram?.form, 'illustration');
    assert.equal(diagram.pending, undefined, 'aucune commande de dessin envoyée au navigateur');
    assert.ok(diagram.shapes.length >= 3);
    assert.deepEqual(diagram.nodes.map((n) => n.label), ['Trachée', 'Poumons', 'Diaphragme']);
    assert.ok(turn.calls.some((c) => c.system.startsWith('Tu dessines une illustration')));

    // Nouvel exercice demandé pendant un exercice : un vrai exercice
    // structuré remplace l'ancien (plus d'exercice improvisé en texte).
    turn = await send(105, 'donne moi un exercice');
    assert.equal(turn.state.phase, TUTOR_STATES.APPLICATION_EXERCISE);
    const firstPrompt = turn.state.exercise.prompt;
    turn = await send(105, "le foie");
    assert.equal(turn.state.phase, TUTOR_STATES.APPLICATION_RETRY);
    turn = await send(105, 'donne moi un autre exercice');
    assert.equal(turn.state.phase, TUTOR_STATES.APPLICATION_EXERCISE);
    assert.equal(turn.state.attempts, 0);
    assert.ok(turn.body.messageExercise, 'nouvel exercice enregistré et affiché');
    assert.ok(turn.calls.some((c) => c.system.includes('NOUVEL exercice')));
    assert.ok(firstPrompt);

    // Le correcteur valide une réponse fausse à une question courte : le
    // backend la refuse (réponse attendue : « estomac »).
    assessmentMode = 'lenient';
    turn = await send(105, 'le foie');
    assessmentMode = 'normal';
    assert.doesNotMatch(turn.body.reply, /Bravo/);
    assert.equal(turn.state.phase, TUTOR_STATES.APPLICATION_RETRY);
    assert.match(turn.body.reply, /❌ Question 1 : Ce n'est pas encore la bonne réponse/);

    // -----------------------------------------------------------------
    // Mathématiques : schéma obligatoire, produit par un appel dédié
    // quand le modèle n'en a pas fourni.
    // -----------------------------------------------------------------
    turn = await send(103, "je n'ai pas compris le périmètre");
    diagram = turn.body.explanationSegments.find((s) => s.diagram)?.diagram;
    assert.equal(diagram?.type, 'rectangle');
    assert.ok(turn.calls.some((c) => c.system.startsWith('Tu produis UNIQUEMENT les données du schéma')));

    // -----------------------------------------------------------------
    // Anglais : aucun schéma, même si le modèle en produit un ou si
    // l'élève en demande un ; aucune annonce de schéma ne subsiste.
    // -----------------------------------------------------------------
    turn = await send(104, "je n'ai pas compris le present simple");
    assert.equal(hasVisual(turn.body), false);
    assert.doesNotMatch(turn.body.reply, /Voici un schéma/);
    // Matière sans schéma : pas de « je ne peux pas encore afficher ».
    assert.doesNotMatch(turn.body.reply, /pas encore/);
    assert.match(turn.body.reply, /he plays/i);
    assert.ok(!turn.calls.some((c) => c.system.startsWith("Tu produis UNIQUEMENT")));
    turn = await send(104, 'montre moi un schéma');
    assert.equal(hasVisual(turn.body), false);
    assert.match(turn.calls.find((c) => c.system.startsWith('Tu es un assistant pédagogique')).system, /tu ne peux pas afficher de schéma/);

    console.log(`tutor-scenario: scénario complet réussi (${llmCalls.length} appels au modèle simulé)`);
  } finally {
    server.close();
    Date.now = realNow;
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
