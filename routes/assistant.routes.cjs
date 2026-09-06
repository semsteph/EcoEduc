// =====================================================================
//  ROUTES ASSISTANT IA DE MATIÈRE
//  Chat enfant/parent grondé sur une entrée du cahier de texte (table "tests"),
//  pour permettre à l'élève de poser à la maison les questions qu'il n'a pas
//  osé poser en classe.
//
//  Monté dans server.cjs avec :
//     const assistantRoutes = require('./routes/assistant.routes.cjs');
//     app.use('/api/parent/assistant', assistantRoutes);
//
//  NB : req.db provient du middleware déjà présent dans server.cjs.
// =====================================================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');
const Anthropic = require('@anthropic-ai/sdk');
const {
  TUTOR_STATES,
  TUTOR_EVENTS,
  createTutorState,
  readTutorState,
  transitionTutorState,
  serialiseTutorState,
  sanitiseExercise,
  classifyUnderstandingMessage,
  extractTaggedData,
  answerMatchesExpected,
  isValidAssessment,
} = require('../server-lib/pedagogical-tutor.cjs');
const {
  buildPedagogicalContext,
  formatPedagogicalContext,
} = require('../server-lib/pedagogical-context.cjs');

const anthropic = new Anthropic(); // lit ANTHROPIC_API_KEY depuis .env

// ---------------------------------------------------------------------
// Auth parent (même secret que server.cjs). Dupliqué volontairement plutôt
// qu'importé de scolarite.routes.cjs : c'est déjà la convention de ce repo
// (voir authenticateStaff dupliqué dans dashboard.routes.cjs).
// ---------------------------------------------------------------------
function authenticateParent(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant.' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token invalide ou expiré.' });
    req.user = user;
    next();
  });
}

// Vérifie que l'élève appartient bien au parent authentifié, renvoie l'élève
// (avec classe_id/etablissement_id/Annee_scolaire_id) ou répond 403/404.
async function getEleveDuParentOr403(req, res, eleveId) {
  const [rows] = await req.db.query(
    `SELECT id, nom, prenom, classe_id, etablissement_id, Annee_scolaire_id, Parents_id
     FROM eleve WHERE id = ?`,
    [eleveId]
  );
  if (rows.length === 0) {
    res.status(404).json({ message: 'Élève introuvable.' });
    return null;
  }
  if (Number(rows[0].Parents_id) !== Number(req.user.id)) {
    res.status(403).json({ message: "Cet élève n'appartient pas à votre compte." });
    return null;
  }
  return rows[0];
}

// ---------------------------------------------------------------------
// Rate limiting serveur, en mémoire, par élève : 1 message / 5s + 30 / heure.
// Suffisant pour une seule instance Node (cas actuel) ; ne survit pas à un
// redémarrage ni à un déploiement multi-instance — acceptable pour l'usage
// visé, à revoir si le trafic grandit.
// ---------------------------------------------------------------------
const rateLimitState = new Map(); // eleveId -> { lastMessageAt, hourWindowStart, hourCount }

function checkRateLimit(eleveId) {
  const now = Date.now();
  const state = rateLimitState.get(eleveId) || { lastMessageAt: 0, hourWindowStart: now, hourCount: 0 };

  if (now - state.lastMessageAt < 5000) {
    return { ok: false, message: 'Merci de patienter quelques secondes avant de renvoyer un message.' };
  }
  if (now - state.hourWindowStart > 60 * 60 * 1000) {
    state.hourWindowStart = now;
    state.hourCount = 0;
  }
  if (state.hourCount >= 30) {
    return { ok: false, message: 'Trop de messages envoyés cette heure. Réessaie plus tard.' };
  }

  state.lastMessageAt = now;
  state.hourCount += 1;
  rateLimitState.set(eleveId, state);
  return { ok: true };
}

// ---------------------------------------------------------------------
// Prompt système : garde-fous pédagogiques. Séparé du contenu utilisateur
// pour limiter les tentatives de contournement par l'élève.
// ---------------------------------------------------------------------
function buildSystemPrompt({ studentFirstName, subjectName, activity, activityDate, tutorState, pedagogicalContext, turnInstruction }) {
  return `Tu es un assistant pédagogique bienveillant pour un(e) élève nommé(e) ${studentFirstName}.
Contexte : en classe de ${subjectName}, l'activité du ${activityDate} portait sur : "${activity}".

${formatPedagogicalContext(pedagogicalContext)}

But de cet outil : aider les élèves trop timides pour poser leurs questions en classe ou à leur professeur. Ton rôle est de RÉELLEMENT expliquer et débloquer l'élève — pas de te défausser ni de le renvoyer ailleurs.

Règles strictes à respecter :
1. Reste dans le sujet de cette activité. Si l'élève pose une question complètement hors sujet, réponds gentiment que tu es là uniquement pour l'aider sur "${activity}" et invite-le à en reparler avec son professeur pour le reste. EN DEHORS de ce cas précis, ne renvoie JAMAIS l'élève vers son professeur : c'est justement parce qu'il n'ose pas lui demander que cet outil existe.
2. Distingue bien deux types de questions :
   - Si l'élève demande la réponse finale toute faite d'un exercice ou devoir précis ("c'est quoi la réponse à la question 3 ?"), ne la donne pas directement : guide-le avec des indices et des questions (méthode socratique).
   - Si l'élève dit qu'il ne comprend pas une notion, un mot, un principe, ou comment faire quelque chose en général, EXPLIQUE-LUI CLAIREMENT ET DIRECTEMENT dès ta toute première réponse, avec des mots simples et un exemple concret. Ne renvoie jamais une question par une autre question sans avoir d'abord donné une vraie explication utilisable.
3. Adapte ton ton à un enfant : phrases courtes, encourageantes, sans jargon, sans condescendance.
4. Contexte important : l'élève est au Bénin, où beaucoup de familles ont des moyens limités. Base TOUS tes exemples et analogies sur des objets simples, courants et peu coûteux (lampe de poche, pile plate, ampoule de torche, robinet et eau, marché, moto, vélo...). Ne suppose jamais que l'élève a accès à du matériel spécialisé, un ordinateur puissant, ou des objets chers — ni qu'il peut facilement s'en procurer.
5. Quand un schéma aide à comprendre (circuit, cycle, étapes, forme géométrique...), dessine-le en texte (ASCII) directement dans ta réponse, avec des caractères simples (-, |, +, →, o). Ne dis jamais "regarde un schéma" sans le fournir toi-même.
6. Si la question semble dangereuse, inappropriée, ou clairement hors du cadre scolaire, refuse poliment et suggère d'en parler à un adulte (parent ou professeur).
7. Ne prétends jamais être le professeur humain de l'élève. Ne parle ni d'API, ni de prompt, ni de modèle de langage.
8. Réponds en français, dans un style simple et court (3 à 6 phrases maximum hors schéma, sauf si une explication plus longue est vraiment nécessaire pour que l'élève comprenne bien).

Instruction interne de séance : ${turnInstruction || (tutorState.phase === TUTOR_STATES.EXPLANATION
    ? "explique la notion demandée, puis demande naturellement si l'explication est claire."
    : "poursuis naturellement l'accompagnement scolaire, sans citer d'étape technique ni de statut interne.")}`;
}

function buildExerciseGenerationInstruction() {
  return `L'élève confirme clairement avoir compris. Propose immédiatement un exercice d'application ORIGINAL, très court et débutant, lié à la notion explicitement présente dans le contexte. Ne copie aucun manuel. Réponds naturellement à l'élève, puis ajoute exactement ce bloc JSON non visible :
<exercise-data>{"prompt":"énoncé","expectedAnswers":["réponse courte acceptable"],"criteria":["critère vérifiable"],"hintPlan":["indice discret","indice plus précis","indice final avant explication"],"solutionOutline":"méthode et réponse expliquées"}</exercise-data>
N'écris ni état technique, ni explication sur ce bloc.`;
}

function buildExerciseAssessmentInstruction(exercise) {
  return `Analyse uniquement la dernière réponse de l'élève pour cet exercice original :
${exercise.prompt}
Réponses attendues possibles : ${exercise.expectedAnswers.join(' | ')}
Critères : ${exercise.criteria.map((criterion, index) => `${index}: ${criterion}`).join(' ; ')}
Réponds UNIQUEMENT avec :
<exercise-assessment>{"verdict":"correct ou incorrect","criterionIndex":0,"reason":"justification courte"}</exercise-assessment>
Ne décide pas de la suite pédagogique et ne donne aucune page de manuel.`;
}

function shortText(value, max = 280) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// ---------------------------------------------------------------------
// GET /subjects/:eleveId
// Liste les entrées de cahier de texte (une par matière la plus récente,
// dédoublonnage laissé au frontend) disponibles pour cet élève.
// ---------------------------------------------------------------------
router.get('/subjects/:eleveId', authenticateParent, async (req, res) => {
  const { eleveId } = req.params;
  try {
    const eleve = await getEleveDuParentOr403(req, res, eleveId);
    if (!eleve) return;

    const [rows] = await req.db.query(
      `SELECT t.id AS testId, t.date, t.activite, m.id AS matiereId, m.nom AS matiereNom
       FROM tests t
       JOIN matieres m ON t.matière_id = m.id
       WHERE t.classe_id = ? AND t.Annee_scolaire_id = ? AND t.etablissement_id = ?
       ORDER BY t.date DESC`,
      [eleve.classe_id, eleve.Annee_scolaire_id, eleve.etablissement_id]
    );

    res.json({ assistants: rows });
  } catch (err) {
    console.error('Erreur GET /assistant/subjects :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des assistants.' });
  }
});

// ---------------------------------------------------------------------
// GET /conversation/:eleveId/:testId
// Historique persistant du fil de discussion lié à une entrée de cahier de texte.
// ---------------------------------------------------------------------
router.get('/conversation/:eleveId/:testId', authenticateParent, async (req, res) => {
  const { eleveId, testId } = req.params;
  try {
    const eleve = await getEleveDuParentOr403(req, res, eleveId);
    if (!eleve) return;

    const [testRows] = await req.db.query(
      `SELECT id FROM tests
       WHERE id = ? AND classe_id = ? AND Annee_scolaire_id = ? AND etablissement_id = ?`,
      [testId, eleve.classe_id, eleve.Annee_scolaire_id, eleve.etablissement_id]
    );
    if (testRows.length === 0) {
      return res.status(404).json({ message: 'Entrée de cahier de texte introuvable pour cet élève.' });
    }

    const [convRows] = await req.db.query(
      `SELECT id, tutor_state AS tutorState FROM assistant_conversation WHERE eleve_id = ? AND test_id = ?`,
      [eleveId, testId]
    );
    if (convRows.length === 0) {
      return res.json({ messages: [] });
    }

    const [messages] = await req.db.query(
      `SELECT role, content, created_at AS createdAt
       FROM assistant_message WHERE conversation_id = ? ORDER BY created_at ASC, id ASC`,
      [convRows[0].id]
    );
    // L'historique reste le contrat public du chat. L'état de séance est relu
    // côté serveur au prochain message et n'est jamais exposé à l'élève.
    res.json({ messages });
  } catch (err) {
    console.error('Erreur GET /assistant/conversation :', err);
    res.status(500).json({ message: 'Erreur lors du chargement de la conversation.' });
  }
});

// ---------------------------------------------------------------------
// POST /message
// body : { eleveId, testId, userMessage }
// Le nom de l'élève, la matière et l'activité sont relus côté serveur —
// jamais fournis par le client — pour empêcher de sortir l'IA de son cadre.
// ---------------------------------------------------------------------
router.post('/message', authenticateParent, async (req, res) => {
  const { eleveId, testId, userMessage } = req.body;

  if (!eleveId || !testId || !userMessage || !String(userMessage).trim()) {
    return res.status(400).json({ message: 'Champs manquants.' });
  }

  try {
    const eleve = await getEleveDuParentOr403(req, res, eleveId);
    if (!eleve) return;

    const limit = checkRateLimit(Number(eleveId));
    if (!limit.ok) return res.status(429).json({ message: limit.message });

    const [testRows] = await req.db.query(
      `SELECT t.id, t.activite, t.date, t.\`matière_id\` AS matiereId, m.nom AS matiereNom,
              c.nom AS className, p.nom AS promotionName,
              a.nom_annee AS schoolYear, et.nom AS establishmentName
       FROM tests t
       JOIN matieres m ON t.matière_id = m.id
       JOIN classes c ON c.id = t.classe_id
       LEFT JOIN promotion p ON p.id = c.Promotion_id
       LEFT JOIN annee_scolaire a ON a.id = ?
       LEFT JOIN etablissement et ON et.id = ?
       WHERE t.id = ? AND t.classe_id = ? AND t.Annee_scolaire_id = ? AND t.etablissement_id = ?`,
      [eleve.Annee_scolaire_id, eleve.etablissement_id, testId, eleve.classe_id, eleve.Annee_scolaire_id, eleve.etablissement_id]
    );
    if (testRows.length === 0) {
      return res.status(404).json({ message: 'Entrée de cahier de texte introuvable pour cet élève.' });
    }
    const test = testRows[0];

    // On prélève peu de lignes et seulement antérieures à l'activité ouverte :
    // le module de contexte les réduit ensuite à 3 ou 4 éléments au maximum.
    const [programmeRows] = await req.db.query(
      `SELECT id, date, activite
       FROM tests
       WHERE classe_id = ? AND \`matière_id\` = ? AND Annee_scolaire_id = ?
         AND etablissement_id = ? AND id <> ?
         AND (date < ? OR (date = ? AND id < ?))
       ORDER BY date DESC, id DESC
       LIMIT 12`,
      [eleve.classe_id, test.matiereId, eleve.Annee_scolaire_id, eleve.etablissement_id, test.id, test.date, test.date, test.id]
    );
    const pedagogicalContext = buildPedagogicalContext({ eleve, test, programmeRows });

    const [convRows] = await req.db.query(
      `SELECT id, tutor_state AS tutorState FROM assistant_conversation WHERE eleve_id = ? AND test_id = ?`,
      [eleveId, testId]
    );
    let conversationId;
    if (convRows.length === 0) {
      const initialTutorState = createTutorState();
      const [insertResult] = await req.db.query(
        `INSERT INTO assistant_conversation (eleve_id, test_id, etablissement_id, annee_scolaire_id, tutor_state)
         VALUES (?, ?, ?, ?, ?)`,
        [eleveId, testId, eleve.etablissement_id, eleve.Annee_scolaire_id, JSON.stringify(initialTutorState)]
      );
      conversationId = insertResult.insertId;
      convRows.push({ id: conversationId, tutorState: JSON.stringify(initialTutorState) });
    } else {
      conversationId = convRows[0].id;
    }
    let tutorState = readTutorState(convRows[0].tutorState);
    // La notion est dérivée seulement lorsqu'elle est explicitement inscrite
    // dans l'activité du cahier de texte ; Claude ne la définit jamais.
    tutorState.topic = pedagogicalContext.currentActivity.topic;

    let turnKind = 'EXPLANATION';
    let turnInstruction = "Explique la notion demandée, puis demande naturellement si l'explication est claire.";
    if (tutorState.phase === TUTOR_STATES.UNDERSTANDING_CHECK) {
      const understanding = classifyUnderstandingMessage(userMessage);
      if (understanding === 'UNDERSTOOD') {
        turnKind = 'GENERATE_EXERCISE';
        turnInstruction = buildExerciseGenerationInstruction();
      } else if (understanding === 'NOT_UNDERSTOOD') {
        turnKind = 'REEXPLAIN';
        turnInstruction = "L'élève n'a pas compris. Rassure-le, réexplique réellement d'une autre manière avec un exemple différent et termine en vérifiant naturellement si c'est plus clair.";
      } else {
        turnKind = 'CLARIFY_UNDERSTANDING';
        turnInstruction = "L'élève n'a pas confirmé clairement sa compréhension. Rassure-le, donne une courte explication complémentaire et demande naturellement s'il a compris. Ne lance pas encore d'exercice.";
      }
    } else if ([TUTOR_STATES.APPLICATION_EXERCISE, TUTOR_STATES.APPLICATION_RETRY].includes(tutorState.phase)) {
      if (tutorState.exercise) {
        turnKind = 'ASSESS_EXERCISE';
        turnInstruction = buildExerciseAssessmentInstruction(tutorState.exercise);
      } else {
        turnKind = 'CLARIFY_UNDERSTANDING';
        turnInstruction = "Le suivi de l'exercice n'est pas disponible. Reprends brièvement la notion et demande naturellement si l'élève a compris.";
      }
    }

    const [history] = await req.db.query(
      `SELECT role, content FROM assistant_message WHERE conversation_id = ? ORDER BY created_at ASC, id ASC`,
      [conversationId]
    );

    const systemPrompt = buildSystemPrompt({
      studentFirstName: eleve.prenom,
      subjectName: test.matiereNom,
      activity: test.activite,
      activityDate: dayjs(test.date).format('YYYY-MM-DD'),
      tutorState,
      pedagogicalContext,
      turnInstruction,
    });

    // Claude Messages API : le prompt système est un paramètre à part,
    // pas un message dans la liste (contrairement à l'API OpenAI).
    const messages = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: userMessage },
    ];

    // On persiste le message utilisateur avant l'appel à l'IA pour ne rien
    // perdre si l'appel échoue (quota, réseau, etc.).
    await req.db.query(
      `INSERT INTO assistant_message (conversation_id, role, content) VALUES (?, 'user', ?)`,
      [conversationId, userMessage]
    );

    // Une réponse qui correspond exactement à une réponse attendue est validée
    // sans déléguer cette décision à Claude.
    if (turnKind === 'ASSESS_EXERCISE' && answerMatchesExpected(userMessage, tutorState.exercise)) {
      tutorState = transitionTutorState(tutorState, TUTOR_EVENTS.ANSWER_CORRECT).state;
      const reply = `Bravo ! C'est correct. ${tutorState.exercise.criteria[0]} Pour continuer avec ton propre livre, quel manuel de ${test.matiereNom} utilises-tu à la maison ?`;
      await req.db.query(
        `UPDATE assistant_conversation SET tutor_state = ? WHERE id = ?`,
        [serialiseTutorState(tutorState), conversationId]
      );
      await req.db.query(
        `INSERT INTO assistant_message (conversation_id, role, content) VALUES (?, 'assistant', ?)`,
        [conversationId, reply]
      );
      return res.json({ reply });
    }

    const aiResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: systemPrompt,
      messages,
    });

    const textBlock = aiResponse.content.find((b) => b.type === 'text');
    const rawReply = textBlock?.text || "Désolé, je n'ai pas pu formuler de réponse.";
    let reply = rawReply;

    if (turnKind === 'ASSESS_EXERCISE') {
      const assessment = extractTaggedData(rawReply, 'exercise-assessment').data;
      const acceptedByBackend = isValidAssessment(assessment, tutorState.exercise)
        && assessment.verdict === 'correct';

      if (acceptedByBackend) {
        tutorState = transitionTutorState(tutorState, TUTOR_EVENTS.ANSWER_CORRECT).state;
        reply = `Bravo ! C'est correct. ${shortText(assessment.reason)} Pour continuer avec ton propre livre, quel manuel de ${test.matiereNom} utilises-tu à la maison ?`;
      } else {
        tutorState = transitionTutorState(tutorState, TUTOR_EVENTS.ANSWER_INCORRECT).state;
        if (tutorState.attempts >= 3) {
          tutorState = transitionTutorState(tutorState, TUTOR_EVENTS.EXERCISE_REEXPLAINED).state;
          reply = `Tu as fait de vrais efforts. Reprenons ensemble : ${tutorState.exercise.solutionOutline} Est-ce que cette méthode est plus claire maintenant ?`;
        } else {
          const hintIndex = Math.min(tutorState.hintsUsed, tutorState.exercise.hintPlan.length - 1);
          const hint = tutorState.exercise.hintPlan[hintIndex];
          tutorState.hintsUsed += 1;
          reply = `Tu es proche. ${hint} Essaie encore tranquillement.`;
        }
      }
    } else if (turnKind === 'GENERATE_EXERCISE') {
      const parsed = extractTaggedData(rawReply, 'exercise-data');
      const exercise = sanitiseExercise(parsed.data);
      if (exercise) {
        tutorState.exercise = exercise;
        tutorState.attempts = 0;
        tutorState.hintsUsed = 0;
        tutorState = transitionTutorState(tutorState, TUTOR_EVENTS.UNDERSTOOD).state;
        reply = parsed.visibleText || 'Très bien. Essayons ce petit exercice :';
        if (!reply.includes(exercise.prompt)) reply = `${reply}\n\n${exercise.prompt}`;
      } else {
        // Sans structure complète, l'état ne bouge pas : un modèle ne peut pas
        // créer un exercice impossible à corriger de manière fiable.
        reply = "Très bien. Je vais te proposer un petit exercice simple pour vérifier ensemble.";
      }
    } else if (turnKind === 'REEXPLAIN') {
      tutorState = transitionTutorState(tutorState, TUTOR_EVENTS.NOT_UNDERSTOOD).state;
      tutorState = transitionTutorState(tutorState, TUTOR_EVENTS.EXPLANATION_SENT).state;
    } else if (turnKind === 'EXPLANATION' && tutorState.phase === TUTOR_STATES.EXPLANATION) {
      tutorState = transitionTutorState(tutorState, TUTOR_EVENTS.EXPLANATION_SENT).state;
    }

    await req.db.query(
      `UPDATE assistant_conversation SET tutor_state = ? WHERE id = ?`,
      [serialiseTutorState(tutorState), conversationId]
    );

    await req.db.query(
      `INSERT INTO assistant_message (conversation_id, role, content) VALUES (?, 'assistant', ?)`,
      [conversationId, reply]
    );

    res.json({ reply });
  } catch (err) {
    console.error('Erreur POST /assistant/message :', err.status ? `${err.status} ${err.message}` : err.message);
    res.status(err.status || 500).json({
      message: "Une erreur est survenue avec l'assistant. Réessaie plus tard.",
    });
  }
});

module.exports = router;
