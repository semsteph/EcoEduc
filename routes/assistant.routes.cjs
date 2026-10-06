// =====================================================================
//  ROUTES ASSISTANT IA DE MATIÈRE
//  Chat enfant/parent fondé sur une entrée du cahier de texte (table "tests"),
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
  sanitiseCompositeElements,
  classifyUnderstandingMessage,
  extractTaggedData,
  isValidAssessment,
  normaliseAssessment,
  summariseVerdict,
  matchesExpectedAnswer,
  isClosedQuestion,
  canonicalAnswer,
  buildDimensionedFigure,
  inferFigureFromText,
  hasEnoughPoints,
  sanitiseGrid,
  getPublicTutorMode,
  normaliseText,
  isExerciseRequest,
  answerMatchesExpected,
} = require('../server-lib/pedagogical-tutor.cjs');

const { readValue, compareNumericAnswer } = require('../server-lib/answer-math.cjs');
const { checkIllustration } = require('../server-lib/tutor-illustration-check.cjs');

const {
  sanitiseRegisteredVisual,
  toQuizVisual,
  alternativeVisual,
  isRegisteredVisualType,
  detectVisualRequest,
  resolveRequestedVisual,
  preferRegisteredVisual,
  getSubjectVisualPolicy,
  needsAnatomicalDrawing,
  anatomicalDrawingCommand,
  describeRegisteredVisuals,
  enforceVisualHonesty,
  textReferencesVisual,
} = require('../server-lib/tutor-visuals.cjs');

const {
  buildPedagogicalContext,
  formatPedagogicalContext,
} = require('../server-lib/pedagogical-context.cjs');

const programmesMatiere = require('../server-lib/programmes-matiere.cjs');

// Discussion d'une séance. Séance rattachée à une partie du programme : une
// seule discussion par élève pour toute la partie, quelle que soit la séance
// ouverte (une ancienne discussion sur l'une de ses séances est reprise).
async function conversationDuFil(conn, eleveId, testId, fil) {
  if (fil) {
    const [parPartie] = await conn.query(
      'SELECT id, tutor_state AS tutorState FROM assistant_conversation WHERE eleve_id = ? AND programme_element_id = ? ORDER BY id LIMIT 1',
      [eleveId, fil.elementId]
    );
    if (parPartie.length) return parPartie;
    const ids = fil.seances.map((x) => x.id).concat([Number(testId)]);
    const [ancienne] = await conn.query(
      'SELECT id, tutor_state AS tutorState FROM assistant_conversation WHERE eleve_id = ? AND test_id IN (?) ORDER BY id LIMIT 1',
      [eleveId, ids]
    );
    if (ancienne.length) {
      await conn.query('UPDATE assistant_conversation SET programme_element_id = ? WHERE id = ?', [fil.elementId, ancienne[0].id]);
    }
    return ancienne;
  }
  const [rows] = await conn.query(
    'SELECT id, tutor_state AS tutorState FROM assistant_conversation WHERE eleve_id = ? AND test_id = ?',
    [eleveId, testId]
  );
  return rows;
}

const anthropic = new Anthropic(); // lit ANTHROPIC_API_KEY depuis .env

// ---------------------------------------------------------------------
// Appels au modèle.
// - Les modèles récents (Sonnet) n'acceptent pas de réponse pré-remplie
//   (dernier message « assistant ») : le pré-remplissage est alors retiré et
//   le début attendu est retrouvé dans le texte (prefixedText).
// - Une réponse peut arriver en plusieurs blocs de texte : ils sont tous
//   réunis (seul le premier était lu, d'où des messages tronqués).
// ---------------------------------------------------------------------
async function createMessage(params) {
  const messages = params.messages || [];
  const last = messages[messages.length - 1];
  const prefill = last && last.role === 'assistant' ? String(last.content) : null;
  if (prefill !== null && !/haiku/i.test(String(params.model))) {
    const response = await createMessage({ ...params, messages: messages.slice(0, -1) });
    response.withoutPrefill = prefill;
    return response;
  }
  return anthropic.messages.create(params);
}

function responseText(response) {
  return (response?.content || []).filter((block) => block.type === 'text').map((block) => block.text).join('');
}

function prefixedText(prefix, response) {
  const text = responseText(response);
  if (!response?.withoutPrefill) return prefix + text;
  const at = text.indexOf(prefix);
  if (at >= 0) return text.slice(at);
  if (prefix.endsWith('{')) {
    const brace = text.indexOf('{');
    if (brace >= 0) return prefix + text.slice(brace + 1);
  }
  return prefix + text;
}

// ---------------------------------------------------------------------
// Auth parent (même secret que server.cjs). Dupliqué volontairement plutôt
// qu'importé de scolarite.routes.cjs : c'est déjà la convention de ce repo
// (voir authenticateStaff dupliqué dans dashboard.routes.cjs).
// ---------------------------------------------------------------------

function authenticateParent(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Token manquant.',
    });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        message: 'Token invalide ou expiré.',
      });
    }

    req.user = user;
    next();
  });
}

// ---------------------------------------------------------------------
// Vérifie que l'élève appartient bien au parent authentifié,
// renvoie l'élève ou répond 403/404.
// ---------------------------------------------------------------------

async function getEleveDuParentOr403(req, res, eleveId) {
  const [rows] = await req.db.query(
    `SELECT
       id,
       nom,
       prenom,
       classe_id,
       etablissement_id,
       Annee_scolaire_id,
       Parents_id
     FROM eleve
     WHERE id = ?`,
    [eleveId]
  );

  if (rows.length === 0) {
    res.status(404).json({
      message: 'Élève introuvable.',
    });

    return null;
  }

  if (Number(rows[0].Parents_id) !== Number(req.user.id)) {
    res.status(403).json({
      message: "Cet élève n'appartient pas à votre compte.",
    });

    return null;
  }

  return rows[0];
}

// ---------------------------------------------------------------------
// Rate limiting serveur, en mémoire, par élève :
// 1 message / 5 secondes + 30 messages / heure.
// Le plafond horaire peut être relevé par ASSISTANT_MAX_MESSAGES_PER_HOUR
// (tests locaux uniquement ; en production la valeur par défaut s'applique).
//
// Suffisant pour une seule instance Node.
// ---------------------------------------------------------------------

const rateLimitState = new Map();
const MAX_MESSAGES_PER_HOUR = Number(process.env.ASSISTANT_MAX_MESSAGES_PER_HOUR) || 30;

function checkRateLimit(eleveId) {
  const now = Date.now();

  const state = rateLimitState.get(eleveId) || {
    lastMessageAt: 0,
    hourWindowStart: now,
    hourCount: 0,
  };

  if (now - state.lastMessageAt < 5000) {
    return {
      ok: false,
      message: 'Merci de patienter quelques secondes avant de renvoyer un message.',
    };
  }

  if (now - state.hourWindowStart > 60 * 60 * 1000) {
    state.hourWindowStart = now;
    state.hourCount = 0;
  }

  if (state.hourCount >= MAX_MESSAGES_PER_HOUR) {
    return {
      ok: false,
      message: "Trop de messages envoyés cette heure. Réessaie plus tard.",
    };
  }

  state.lastMessageAt = now;
  state.hourCount += 1;

  rateLimitState.set(eleveId, state);

  return {
    ok: true,
  };
}

// ---------------------------------------------------------------------
// Prompt système : garde-fous pédagogiques.
// Séparé du contenu utilisateur pour limiter les tentatives de
// contournement par l'élève.
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Texte d'un exercice tel que l'élève le voit (énoncé + questions
// numérotées). Sert à la fois à l'historique envoyé au modèle — qui sans
// cela ne voyait que l'énoncé général et réinventait les questions — et
// aux rappels affichés à l'élève.
// ---------------------------------------------------------------------

// Exercice tel qu'il est envoyé au navigateur : sans les réponses
// attendues, critères, indices ni solution (en test réel, un élève
// pouvait lire le corrigé dans les outils du navigateur).
function publicExercise(exercise) {
  if (!exercise || typeof exercise !== 'object') return null;
  return {
    prompt: exercise.prompt,
    diagram: exercise.diagram || null,
    questions: (exercise.questions || []).map((question) => ({
      id: question.id,
      prompt: question.prompt,
      diagram: question.diagram || null,
    })),
  };
}

function formatExerciseForTranscript(exercise) {
  if (!exercise || !Array.isArray(exercise.questions)) return '';
  const questions = exercise.questions
    .filter((question) => question.prompt && question.prompt !== exercise.prompt)
    .map((question, index) => `${index + 1}. ${question.prompt}`);
  return [exercise.prompt, ...questions].filter(Boolean).join('\n');
}

function buildSystemPrompt({
  studentFirstName,
  subjectName,
  activity,
  activityDate,
  tutorState,
  pedagogicalContext,
  turnInstruction,
}) {
  const currentExercise = [
    TUTOR_STATES.APPLICATION_EXERCISE,
    TUTOR_STATES.APPLICATION_RETRY,
  ].includes(tutorState?.phase) && tutorState?.exercise
    ? tutorState.exercise
    : null;

  // Lycée (2nde, 1ère, Terminale) : niveau du programme dès le premier
  // message. En test réel, la consigne « ton d'enfant, sans jargon » donnait
  // des explications de collège en Terminale (ni formules ni notations).
  const identity = pedagogicalContext?.identity || {};
  const levelLabel = [identity.level, identity.className, identity.promotionName].filter(Boolean).join(' ');
  const isLycee = /\b(2nd|2nde|seconde|1ere|1re|premiere|tle|terminale)\b/i.test(normaliseText(levelLabel));
  const levelRule = isLycee
    ? `3. L'élève est au LYCÉE (${levelLabel}${identity.series ? `, série ${identity.series}` : ''}) : dès le premier message, emploie le vocabulaire, les notations, les définitions et les formules officielles du programme de ce niveau et de cette série (ex. en Terminale : définitions formelles, lois, unités, équations-bilans, notations vectorielles, noms des structures). Commence par la notion juste et précise ; une analogie ne vient qu'en appui, jamais à la place de la définition. Pas d'analogie enfantine. Ton bienveillant et clair, phrases nettes, sans condescendance.`
    : `3. Adapte ton ton à un élève de collège${levelLabel ? ` (${levelLabel})` : ''} :
   phrases courtes, encourageantes, mots simples (définis quand ils sont nouveaux), sans condescendance.`;
  const lengthRule = isLycee
    ? `8. Réponds en français, de façon claire et structurée : assez long pour être complet et exact (en général 6 à 12 phrases hors schéma, plus pour une démonstration ou un calcul détaillé), jamais de remplissage.`
    : `8. Réponds en français, dans un style simple et court (3 à 6 phrases maximum hors schéma, sauf si une explication plus longue est vraiment nécessaire pour que l'élève comprenne bien).`;

  return `Tu es un assistant pédagogique bienveillant pour un(e) élève nommé(e) ${studentFirstName}.

Contexte : en classe de ${subjectName}, l'activité du ${activityDate} portait sur : "${activity}".

${formatPedagogicalContext(pedagogicalContext)}
But de cet outil : aider les élèves trop timides pour poser leurs questions en classe ou à leur professeur. Ton rôle est de RÉELLEMENT expliquer et débloquer l'élève — pas de te défausser ni de le renvoyer ailleurs.

Règles strictes à respecter :

1. Reste dans le sujet de cette activité.
   Si l'élève pose une question complètement hors sujet, réponds gentiment que tu es là uniquement pour l'aider sur "${activity}" et invite-le à en reparler avec son professeur pour le reste.
   EN DEHORS de ce cas précis, ne renvoie JAMAIS l'élève vers son professeur : c'est justement parce qu'il n'ose pas lui demander que cet outil existe.

2. Distingue bien deux types de questions :
   - Si l'élève demande la réponse finale toute faite d'un exercice ou devoir précis ("c'est quoi la réponse à la question 3 ?"), ne la donne pas directement : guide-le avec des indices et des questions (méthode socratique).
   - Si l'élève dit qu'il ne comprend pas une notion, un mot, un principe, ou comment faire quelque chose en général, EXPLIQUE-LUI CLAIREMENT ET DIRECTEMENT dès ta toute première réponse, avec des mots simples et un exemple concret.
   Ne renvoie jamais une question par une autre question sans avoir d'abord donné une vraie explication utilisable.

${levelRule}

4. Contexte important :
   l'élève est au Bénin, où beaucoup de familles ont des moyens limités.
   Base TOUS tes exemples et analogies sur des objets simples, courants et peu coûteux :
   lampe de poche, pile plate, ampoule de torche, robinet et eau, marché, moto, vélo, etc.
   Ne suppose jamais que l'élève a accès à du matériel spécialisé, un ordinateur puissant, ou des objets chers.

5. Pour les figures géométriques, ne fabrique pas de pseudo-dessins ASCII avec "___", "---", "/" ou "\\".
   Le système peut afficher de vraies figures vectorielles à partir d'un bloc de données structuré.
   Si l'exercice nécessite une figure, ajoute un objet "diagram" dans <exercise-data> avec uniquement les données de la figure : type, points, labels et measurements.
   N'envoie jamais de SVG, HTML, CSS, JavaScript ou code de dessin dans <exercise-data>.
   L'énoncé doit toujours rester compréhensible sans dépendre uniquement du dessin.

6. Si la question semble dangereuse, inappropriée, ou clairement hors du cadre scolaire, refuse poliment et suggère d'en parler à un adulte (parent ou professeur).

7. Ne prétends jamais être le professeur humain de l'élève.
   Ne parle ni d'API, ni de prompt, ni de modèle de langage.

${lengthRule}

9. N'utilise JAMAIS de titres Markdown avec #, ##, ###, etc. N'utilise pas de lignes "---" comme séparateurs. Utilise des phrases naturelles, du gras si nécessaire et des listes simples.

10. Pour un angle, fournis obligatoirement angleDegrees entre 1 et 179. B est le sommet et l'angle représenté est ABC. Ne choisis pas les coordonnées : le backend les calcule à partir de angleDegrees.

11. Exactitude scientifique : simplifie le vocabulaire, jamais le sens. N'invente ni chiffre, ni taille, ni comparaison approximative (par exemple, ne dis pas qu'un organe est « court comme un doigt » s'il ne l'est pas). Emploie le terme juste : l'intestin grêle absorbe les nutriments, il ne « récupère pas l'énergie ». En cas de doute sur un détail, reste général plutôt que d'inventer. Adapte la profondeur au niveau scolaire de l'élève.

12. Ne dis jamais « voici le schéma », « regarde le dessin » ou une formule équivalente si ta réponse ne contient pas de bloc <explanation-data> : l'élève ne verrait rien.

13. Pour vérifier la compréhension, ne te contente pas de « Est-ce que c'est clair ? » : pose une vraie question courte sur la notion qui demande une PRODUCTION (un calcul, un exemple, une justification, une définition avec ses mots), jamais une question à laquelle on répond par oui ou non (par exemple « Pour vérifier : quel est le rôle principal de l'œsophage ? »). Un « oui » ou un « j'ai compris » n'est jamais une preuve : ne félicite que pour une réponse juste et démontrée.

14. Ne réponds JAMAIS seulement par une question. Si l'élève dit simplement qu'il n'a pas compris (le cours, la leçon, ton explication), explique directement : les bases de l'activité de la séance s'il s'agit du cours, ou la même notion autrement (autre exemple, étapes plus petites) s'il s'agit de ton explication. Tu peux ensuite lui demander ce qui reste difficile.

15. N'affirme rien dont tu n'es pas sûr : pas de nom alternatif, de date, de chiffre ou de source inventés. Si tu n'es pas certain d'un détail, ne le mentionne pas.

16. Si tu fournis un schéma, ses mesures, nombres et étiquettes doivent être exactement ceux de ton texte.

17. Ne salue l'élève (« Bonjour », « Salut »...) que dans ton tout premier message de la conversation, jamais ensuite.

18. Dans chaque explication, donne au moins un exemple tiré de la vie quotidienne au Bénin (marché, zémidjan, igname, maïs, pagne, puits, lampe torche, pluie, champ...).

19. Une question de vérification doit faire appliquer la notion à un cas nouveau : elle ne doit jamais pouvoir se résoudre en recopiant ta dernière phrase, ni se réduire à un choix entre deux mots. Quand l'élève répond à ta question, dis-lui d'abord clairement si sa réponse est juste avant de continuer.

20. Quand l'élève se trompe, ne lui donne pas directement la bonne réponse : explique ce qui ne va pas et donne un indice pour qu'il la trouve lui-même, puis pose-lui une nouvelle question (pas la même mot pour mot). Ne donne la solution qu'après deux essais infructueux sur la même question. La réponse attendue ne doit jamais apparaître non plus dans un titre ou une légende de schéma, ni dans l'énoncé d'une question.

22. Cohérence : ne contredis jamais ce que tu as affirmé plus tôt dans la conversation. Si tu t'aperçois que tu t'es trompé, dis-le explicitement (« Je me suis trompé tout à l'heure : ... ») et corrige ; ne reproche jamais à l'élève d'avoir répété ce que tu lui as enseigné.

23. Sécurité : ne propose jamais de manipulation dangereuse (mélange de produits ménagers comme eau de Javel et acide, flamme, électricité du secteur, produit toxique ou corrosif).

24. En langue étrangère, chaque phrase modèle est entièrement correcte dans la langue étudiée (mots de cette langue uniquement : « motorbike », pas « moto » ; grammaire et conjugaison exactes).

25. Ne laisse jamais une phrase, une liste ou une étape inachevée : ton message est complet et se termine par la question de vérification annoncée.

21. N'écris jamais un exercice complet (questions numérotées à résoudre) dans ta réponse : les exercices sont préparés par le système. Si un exercice serait utile, propose-le simplement (« Veux-tu un petit exercice pour t'entraîner ? »).

22. Une analogie doit respecter le sens du phénomène ; si elle risque d'inverser ou de fausser l'idée, n'en utilise pas.

23. Écris dans un français correct (accords, constructions, vocabulaire ; une négation a toujours « ne » : « je ne peux pas », jamais « je peux pas ») : l'élève apprend aussi en te lisant.

24. Ne pose jamais de question de vérification de la forme « A ou B ? » (réussie une fois sur deux au hasard), et ne mets jamais la réponse dans ta question : demande d'expliquer, de nommer, de calculer ou d'appliquer à un cas nouveau.
${currentExercise ? `
EXERCICE EN COURS (texte exact, déjà affiché à l'élève) :
${formatExerciseForTranscript(currentExercise)}
Ne réécris jamais cet exercice avec d'autres phrases ou d'autres questions, et n'en invente pas un nouveau dans ton texte : si l'élève veut le revoir, recopie exactement ces questions. Ne donne pas les réponses.
` : ''}
Instruction interne de séance :
${turnInstruction || (
  tutorState.phase === TUTOR_STATES.EXPLANATION
    ? "explique la notion demandée, puis pose une question courte qui vérifie réellement la compréhension."
    : "poursuis naturellement l'accompagnement scolaire, sans citer d'étape technique ni de statut interne."
)}`;
}

// ---------------------------------------------------------------------
// Instruction de génération d'exercice.
// ---------------------------------------------------------------------

function buildExerciseGenerationInstruction(difficultyLevel = 1, { requestedByStudent = false, visualPolicy = 'optional' } = {}) {
  const level = Math.max(1, Math.min(5, Number(difficultyLevel) || 1));
  const levelDescription = {
    1: 'très facile : reconnaissance et application directe d’une règle',
    2: 'facile : deux étapes simples',
    3: 'intermédiaire : raisonnement et petite justification',
    4: 'avancé : plusieurs étapes ou combinaison de notions',
    5: 'maîtrise : problème plus complet demandant autonomie et justification',
  }[level];

  return `${requestedByStudent ? "L'élève demande un exercice pour s'entraîner." : "L'élève confirme clairement avoir compris."}

${requestedByStudent
    ? "L'élève demande simplement un exercice : annonce-le en une phrase courte, sans le féliciter pour une réponse qu'il n'a pas donnée et sans saluer."
    : "Commence par UNE phrase qui valide précisément la réponse que l'élève vient de donner (par exemple « Exact : c'est bien le dioxygène qui passe dans le sang. »), sans saluer l'élève."} Puis propose immédiatement un exercice d'application ORIGINAL, court et adapté à son niveau, lié à la notion explicitement présente dans le contexte.
N'utilise pas les mêmes nombres ni les mêmes exemples que ceux déjà travaillés dans la conversation : l'élève doit appliquer la notion à un cas nouveau.
Ne mets jamais la réponse dans l'énoncé (par exemple pas de « (does / repair) » : donne seulement le verbe à l'infinitif).
Chaque question demande UNE seule chose, et ses réponses attendues couvrent exactement ce qui est demandé (si la question laisse une partie déjà écrite dans l'énoncé, la réponse attendue est seulement la partie manquante).
N'exige que des règles et des faits déjà expliqués dans la conversation. S'il existe des repères validés pour la notion, les questions et les réponses attendues doivent reposer UNIQUEMENT sur ces repères (pas d'altitude, de chiffre ou de fait qui n'y figure pas).
Si l'énoncé annonce un nombre de questions ou de situations, il doit être exactement celui des questions fournies. N'invente aucune distance, date ou donnée chiffrée non sûre.
Pas de questions trop évidentes ni de simple choix entre deux mots ; des situations réalistes, tirées si possible de la vie quotidienne au Bénin (pas de prémisse absurde). Reste dans le programme du niveau de l'élève.
Les réponses attendues doivent être scientifiquement exactes et lister TOUTES les formulations correctes acceptables (synonymes comme « impérative » / « injonctive », avec et sans article, unités écrites en symboles).

Niveau de difficulté demandé : ${level}/5 — ${levelDescription}.

L'objectif est une progression : ne rends pas l'exercice plus difficile que ce niveau.

Un exercice peut contenir plusieurs questions. Chaque question doit avoir sa propre réponse attendue.

Format obligatoire :
<exercise-data>{"prompt":"énoncé général","questions":[{"id":1,"prompt":"question 1","expectedAnswers":["réponse acceptable"],"criteria":["critère vérifiable"],"diagram":null}],"criteria":["critère global"],"hintPlan":["indice 1","indice 2","indice 3"],"solutionOutline":"solution complète","diagram":null}</exercise-data>

IMPORTANT POUR LA GÉOMÉTRIE : si l'exercice parle de plusieurs figures ou de plusieurs angles, CHAQUE question concernée doit avoir son propre champ "diagram". Ne mets pas un seul schéma global quand plusieurs figures sont nécessaires. Par exemple, un exercice qui demande d'identifier trois angles doit contenir trois questions et trois diagrammes différents.

Pour un angle, utilise uniquement : "diagram":{"type":"angle","angleDegrees":45,"labels":true}. Ne fournis jamais de coordonnées pour un angle.
angleDegrees < 90 = aigu ; angleDegrees = 90 = droit ; 90 < angleDegrees < 180 = obtus.

Si une question porte sur une notion qui n'est pas une figure géométrique (sciences, SVT, physique-chimie...) et qu'un schéma aiderait vraiment à répondre, donne-lui un "diagram" de schéma générique (le système le dessine proprement et, dans un exercice, remplace les noms par des numéros pour ne pas donner la réponse) :
${describeRegisteredVisuals().replace(/<\/?explanation-data>/g, '')}
N'en mets un que si le schéma est vraiment utile pour répondre à la question ; sinon laisse "diagram":null.

N'écris jamais « observe le schéma » si tu ne fournis pas de "diagram".
${visualPolicy === 'required' ? `
DANS CETTE MATIÈRE, CHAQUE QUESTION QUI PORTE SUR UNE FIGURE, UN CIRCUIT, UN MONTAGE OU UN ORGANE DOIT AVOIR SON "diagram". Pour un rectangle, un carré ou un cercle, donne les dimensions : {"type":"rectangle","width":5,"height":3,"unit":"m"}. Pour un circuit : {"type":"electric-circuit","components":[{"kind":"battery"},{"kind":"switch","closed":false},{"kind":"lamp"}],"quiz":true}. Un schéma d'exercice ne doit jamais montrer la réponse.
` : ''}
${visualPolicy === 'none' ? `
DANS CETTE MATIÈRE, AUCUN SCHÉMA : mets toujours "diagram":null. Pour une langue étrangère, les questions portent sur des phrases à compléter, traduire, conjuguer ou corriger, et les réponses attendues listent les variantes correctes acceptables.
` : ''}
Ne génère jamais de SVG, HTML, CSS, JavaScript ou dessin ASCII.
N'utilise aucun titre Markdown avec # dans le texte visible.`;
}

// ---------------------------------------------------------------------
// Génération robuste d'un exercice structuré.
// ---------------------------------------------------------------------
// Claude peut parfois répondre sans le bloc <exercise-data>. Dans ce cas,
// on effectue une seconde tentative strictement structurée avant d'utiliser
// un petit exercice de secours déterministe pour les notions courantes.
// ---------------------------------------------------------------------

function buildFallbackExercise({ subjectName, topic, activity }) {
  const subject = normaliseBookText(subjectName);
  const notion = cleanBookName(topic || activity || 'la notion étudiée', 120);

  if (
    subject.includes('math') &&
    /\b(angle|angles)\b/.test(normaliseBookText(notion))
  ) {
    return {
      prompt: 'Observe les trois angles suivants et indique pour chacun s’il est aigu, droit ou obtus.',
      questions: [
        {
          id: 1,
          prompt: 'Quel est le type de l’angle ABC ?',
          expectedAnswers: ['aigu', 'angle aigu'],
          criteria: ['L’angle de 45° est aigu.'],
          diagram: { type: 'angle', angleDegrees: 45, labels: true },
        },
        {
          id: 2,
          prompt: 'Quel est le type de l’angle DEF ?',
          expectedAnswers: ['droit', 'angle droit'],
          criteria: ['L’angle de 90° est droit.'],
          diagram: { type: 'angle', angleDegrees: 90, labels: true },
        },
        {
          id: 3,
          prompt: 'Quel est le type de l’angle GHI ?',
          expectedAnswers: ['obtus', 'angle obtus'],
          criteria: ['L’angle de 120° est obtus.'],
          diagram: { type: 'angle', angleDegrees: 120, labels: true },
        },
      ],
      criteria: ['Reconnaître un angle aigu.', 'Reconnaître un angle droit.', 'Reconnaître un angle obtus.'],
      hintPlan: ['Un angle inférieur à 90° est aigu.', 'Un angle égal à 90° est droit.', 'Un angle supérieur à 90° et inférieur à 180° est obtus.'],
      solutionOutline: '45° est aigu, 90° est droit et 120° est obtus.',
      diagram: null,
    };
  }

  if (
    subject.includes('math') &&
    normaliseBookText(notion).includes('parallelogram')
  ) {
    return {
      prompt:
        'Dans un parallélogramme ABCD, le côté AB mesure 6 cm. Combien mesure le côté CD ?\n\nA. 3 cm\nB. 6 cm\nC. 12 cm',
      expectedAnswers: ['B', 'B.', '6 cm', '6'],
      criteria: ['Les côtés opposés d’un parallélogramme ont la même longueur.'],
      hintPlan: [
        'Cherche le côté opposé à AB.',
        'Dans un parallélogramme, les côtés opposés ont la même longueur.',
        'Le côté CD est opposé à AB : il mesure donc 6 cm.',
      ],
      solutionOutline:
        'AB et CD sont des côtés opposés du parallélogramme. Ils ont la même longueur, donc CD = 6 cm.',
      diagram: {
        type: 'parallelogram',
        points: {
          A: { x: 80, y: 220 },
          B: { x: 130, y: 70 },
          C: { x: 350, y: 70 },
          D: { x: 300, y: 220 },
        },
        labels: true,
        measurements: { 'A-B': '6 cm' },
      },
    };
  }

  return null;
}

function exerciseRequiresPerQuestionDiagrams({ subjectName, topic, activity, exercise }) {
  const context = normaliseText(`${subjectName || ''} ${topic || ''} ${activity || ''}`);
  const angleContext = /\b(angle|angles|angle aigu|angle droit|angle obtus|angle plat|geometrie|rapporteur)\b/.test(context);

  if (!angleContext || !exercise || !Array.isArray(exercise.questions)) {
    return false;
  }

  const exerciseText = normaliseText(`${exercise.prompt || ''} ${exercise.questions.map(q => q.prompt || '').join(' ')}`);
  const mentionsSeveralFigures = exercise.questions.length > 1 || /\b(aigu|droit|obtus|plat|angles|angle)\b/.test(exerciseText);

  return mentionsSeveralFigures && exercise.questions.some(q => !q.diagram);
}

// Un énoncé qui renvoie à un schéma absent (« Observe le schéma ») est
// impossible à résoudre pour l'élève : on retente la génération.
function exerciseReferencesMissingVisual(exercise) {
  if (!exercise) return false;
  const hasVisual = Boolean(exercise.diagram)
    || (exercise.questions || []).some((question) => question.diagram);
  if (hasVisual) return false;
  return textReferencesVisual(`${exercise.prompt} ${(exercise.questions || []).map((q) => q.prompt).join(' ')}`);
}

function exerciseHasRequiredDiagrams({ subjectName, topic, activity, exercise }) {
  return !exerciseRequiresPerQuestionDiagrams({ subjectName, topic, activity, exercise })
    && !exerciseReferencesMissingVisual(exercise);
}

// Aucune figure dans les exercices des matières sans schéma.
function stripExerciseVisuals(exercise) {
  if (!exercise) return exercise;
  return {
    ...exercise,
    diagram: null,
    questions: exercise.questions.map((question) => ({ ...question, diagram: null })),
  };
}

// ---------------------------------------------------------------------
// Vérification du corrigé d'un exercice généré.
// En test réel, un corrigé était faux (« Abomey = plaine » alors
// qu'Abomey est sur un plateau) ou incomplet (bronchioles oubliées). Un
// appel dédié relit chaque réponse attendue, corrige les réponses fausses
// et ajoute les formulations correctes manquantes. En cas d'échec,
// l'exercice est gardé tel quel.
// ---------------------------------------------------------------------

async function verifyExerciseKey(exercise, { subjectName, activity, topic }) {
  if (!exercise || !Array.isArray(exercise.questions) || !exercise.questions.length) return exercise;

  const prefix = '{';

  for (const model of VISUAL_MODELS) try {
    const response = await createMessage({
      // Modèle le plus fiable d'abord : en test réel, des corrigés faux
      // (K² L⁸ M³ pour Z = 19) et des données incohérentes passaient.
      model,
      max_tokens: 1400,
      system: `Tu vérifies le corrigé d'un exercice de ${subjectName} (activité : « ${cleanBookName(activity || topic || '', 150)} »).
Pour chaque question :
- refais toi-même chaque calcul et chaque raisonnement à partir des données de l'énoncé : la réponse attendue doit être exactement le bon résultat ;
- les données de l'énoncé doivent être cohérentes entre elles et avec les résultats (un énoncé qui annonce « F = 4,8 N » alors que les données donnent 1,6 N doit être corrigé dans "prompt") ;
- les réponses attendues sont-elles scientifiquement et factuellement exactes, au niveau de la classe ? Appuie-toi sur tes connaissances sûres ;
- si la réponse est une grandeur physique, chaque réponse attendue contient la valeur ET l'unité (« 0,375 mol/L/min », pas « 0,375 ») ;
- sont-elles complètes (toutes les formulations correctes acceptables, synonymes, variantes d'écriture) ?
- si la question laisse une partie déjà écrite (ex. « We ___ go (not) »), les réponses attendues doivent accepter la seule partie manquante (« don't », « do not ») ;
- une réponse attendue ne doit pas exiger une précision fausse (ex. les échanges gazeux ont lieu en permanence, pas « seulement à l'inspiration »).
Si une réponse attendue est fausse ou incomplète, donne la liste corrigée dans "expectedAnswers" et "ok": false. Sinon "ok": true et recopie les réponses.
Si l'énoncé général annonce un nombre de questions ou de situations différent du nombre réel, donne l'énoncé corrigé dans "prompt".
Si une question ou l'énoncé contient déjà une réponse (ex. « dans le nord-ouest, où se trouve... ? » avec la réponse « nord-ouest », ou une « Note » / « Remarque » / parenthèse qui donne la solution), reformule sans la réponse dans "prompt" (énoncé) ou dans "prompt" de la question.
Si l'exercice demande une manipulation dangereuse (mélange de produits ménagers comme eau de Javel et acide, flamme, électricité du secteur, produit toxique ou corrosif hors du laboratoire...), réponds "unsafe": true.
Réponds UNIQUEMENT en JSON : {"unsafe":false,"prompt":null,"questions":[{"id":1,"ok":true,"expectedAnswers":["..."],"prompt":null}]}`,
      messages: [
        { role: 'user', content: JSON.stringify({ prompt: exercise.prompt, questions: exercise.questions.map(({ id, prompt, expectedAnswers }) => ({ id, prompt, expectedAnswers })) }) },
        { role: 'assistant', content: prefix },
      ],
    });

    const raw = prefixedText(prefix, response);
    const parsed = JSON.parse(raw.slice(0, raw.lastIndexOf('}') + 1));
    const byId = new Map((parsed.questions || []).map((q) => [q.id, q]));

    const fixedPrompt = typeof parsed.prompt === 'string' && parsed.prompt.trim().length > 10
      ? parsed.prompt.replace(/\s+/g, ' ').trim().slice(0, 1400)
      : null;

    if (parsed.unsafe === true) return { ...exercise, unsafe: true };

    return {
      ...exercise,
      ...(fixedPrompt ? { prompt: fixedPrompt } : {}),
      questions: exercise.questions.map((question) => {
        const check = byId.get(question.id);
        const answers = Array.isArray(check?.expectedAnswers)
          ? check.expectedAnswers.filter((a) => typeof a === 'string' && a.trim()).map((a) => a.trim().slice(0, 400)).slice(0, 12)
          : [];
        const fixedQuestion = typeof check?.prompt === 'string' && check.prompt.trim().length > 8
          ? { prompt: check.prompt.replace(/\s+/g, ' ').trim().slice(0, 700) }
          : {};
        if (!answers.length) return { ...question, ...fixedQuestion };
        const merged = check.ok === false ? answers : [...new Set([...question.expectedAnswers, ...answers])].slice(0, 12);
        return { ...question, ...fixedQuestion, expectedAnswers: merged };
      }),
    };
  } catch (error) {
    console.error(`Erreur verifyExerciseKey (${model}) :`, error.message);
  }
  return exercise;
}

// ---------------------------------------------------------------------
// Corrigé calculé pour les aires et périmètres : quand une question donne
// les dimensions d'un rectangle ou d'un carré, le backend calcule la
// réponse (en test réel, le corrigé généré attendait « 27 cm² » pour une
// parcelle de 9 m × 3 m, et validait donc une réponse fausse).
// ---------------------------------------------------------------------

function computedMathsAnswers(question) {
  const prompt = String(question.prompt || '');
  const figure = inferFigureFromText(prompt);
  if (!figure || !['rectangle', 'square'].includes(figure.type)) return null;
  const values = Object.values(figure.measurements || {}).map((m) => {
    const match = String(m).match(/^([\d,.]+)\s*(\w+)$/);
    return match ? { value: Number(match[1].replace(',', '.')), unit: match[2] } : null;
  });
  if (values.some((v) => !v)) return null;
  const [a, b] = values;
  const unit = a.unit;
  const n = normaliseText(prompt);
  const format = (x) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100).replace('.', ','));
  if (/\b(aire|surface)\b/.test(n) && !/\bperimetre\b/.test(n)) {
    const area = a.value * b.value;
    return [`${format(area)} ${unit}²`, `${format(area)} ${unit}2`];
  }
  if (/\bperimetre\b/.test(n) && !/\b(aire|surface)\b/.test(n)) {
    const perimeter = 2 * (a.value + b.value);
    return [`${format(perimeter)} ${unit}`];
  }
  return null;
}

function applyComputedMathsKey(exercise, subjectName) {
  if (!exercise || !/\bmath/.test(normaliseText(subjectName))) return exercise;
  return {
    ...exercise,
    questions: exercise.questions.map((question) => {
      const computed = computedMathsAnswers(question);
      return computed ? { ...question, expectedAnswers: computed } : question;
    }),
  };
}

async function generateStructuredExercise(options) {
  let generated = await generateStructuredExerciseRaw(options);

  if (generated.exercise) {
    generated.exercise = await resolveExerciseIllustrations(generated.exercise, options);
    generated.exercise = await verifyExerciseKey(generated.exercise, options);
    // Exercice dangereux (cas réel : doser de l'eau de Javel avec un acide) :
    // régénéré une fois avec une consigne de sécurité, sinon abandonné.
    if (generated.exercise?.unsafe) {
      generated = await generateStructuredExerciseRaw({
        ...options,
        systemPrompt: `${options.systemPrompt}\n\nSÉCURITÉ : aucune manipulation dangereuse (pas de mélange de produits ménagers, pas de produit toxique ou corrosif hors du laboratoire, pas de flamme ni d'électricité du secteur).`,
      });
      if (generated.exercise) {
        generated.exercise = await resolveExerciseIllustrations(generated.exercise, options);
        generated.exercise = await verifyExerciseKey(generated.exercise, options);
      }
      if (generated.exercise?.unsafe) generated = { ...generated, exercise: null };
    }
    generated.exercise = applyComputedMathsKey(generated.exercise, options.subjectName);
  }

  if (generated.exercise && getSubjectVisualPolicy(options.subjectName) === 'none') {
    return { ...generated, exercise: stripExerciseVisuals(generated.exercise) };
  }

  return generated;
}

// Illustrations demandées dans un exercice : dessinées, puis affichées en
// mode « question » (numéros sans noms). Une commande non résolue est
// retirée.
async function resolveExerciseIllustrations(exercise, { subjectName, activity, topic }) {
  const context = { subjectName, activity, topic, reply: formatExerciseForTranscript(exercise) };
  const resolve = async (diagram) => {
    if (!diagram?.pending) return diagram || null;
    const drawn = await drawIllustration({ ...context, draw: diagram.draw, title: diagram.title });
    return drawn ? toQuizVisual(drawn) : null;
  };
  const [diagram, ...questionDiagrams] = await Promise.all([
    resolve(exercise.diagram),
    ...exercise.questions.map((question) => resolve(question.diagram)),
  ]);
  return {
    ...exercise,
    diagram,
    questions: exercise.questions.map((question, index) => ({ ...question, diagram: questionDiagrams[index] })),
  };
}

// ---------------------------------------------------------------------
// Schémas d'exercice (sciences, mathématiques). Le modèle oubliait
// souvent la figure (« calcule l'aire des figures suivantes » sans aucune
// figure). Le backend la déduit de l'énoncé :
// - figure dimensionnée (rectangle, carré, cercle) décrite dans le texte ;
// - circuit, organe... du registre, en mode « question » pour ne pas
//   donner la réponse (lampe non allumée, organes sans nom).
// ---------------------------------------------------------------------

function inferExerciseVisual(text, { activity, topic, force }) {
  const figure = inferFigureFromText(text);
  if (figure) return figure;
  const registered = resolveRequestedVisual({ userMessage: text, activity: force ? activity : '', topic: force ? topic : '' });
  if (!registered) return null;
  // Un schéma anatomique légendé donnerait la réponse : on ne l'ajoute que
  // si l'énoncé renvoie explicitement à un schéma, et sans les noms.
  if (registered.type !== 'electric-circuit' && !force) return null;
  return toQuizVisual(registered.diagram);
}

function ensureExerciseVisuals(exercise, { subjectName, activity, topic }) {
  if (!exercise || getSubjectVisualPolicy(subjectName) !== 'required') return exercise;

  const refersToVisual = textReferencesVisual(`${exercise.prompt} ${exercise.questions.map((q) => q.prompt).join(' ')}`);
  const questions = exercise.questions.map((question) => {
    if (question.diagram) return question;
    const diagram = inferExerciseVisual(`${question.prompt} ${exercise.prompt}`, { activity, topic, force: refersToVisual })
      || (exercise.questions.length === 1 ? inferExerciseVisual(exercise.prompt, { activity, topic, force: refersToVisual }) : null);
    return diagram ? { ...question, diagram } : question;
  });

  const anyVisual = questions.some((question) => question.diagram) || exercise.diagram;
  const diagram = exercise.diagram
    || (!anyVisual ? inferExerciseVisual(exercise.prompt, { activity, topic, force: refersToVisual }) : null);

  return { ...exercise, questions, diagram: diagram || null };
}

async function generateStructuredExerciseRaw({
  systemPrompt,
  messages,
  subjectName,
  topic,
  activity,
  difficultyLevel = 1,
}) {
  // Première tentative : le prompt pédagogique normal.
  // max_tokens à 1300 (et non 600) : un exercice à plusieurs questions
  // (prompt + questions + critères + indices + solution, tout en JSON)
  // dépasse facilement 600 tokens et se retrouve tronqué avant la fermeture
  // du bloc <exercise-data>, ce qui le rend illisible (testé en conditions
  // réelles : stop_reason "max_tokens" observé sur un exercice à 3 questions).
  const firstResponse = await createMessage({
    model: 'claude-haiku-4-5',
    max_tokens: 1300,
    system: systemPrompt,
    messages,
  });

  const firstRawReply = responseText(firstResponse);
  const firstParsed = extractTaggedData(firstRawReply, 'exercise-data');
  const firstExercise = ensureExerciseVisuals(sanitiseExercise(firstParsed.data), { subjectName, activity, topic });

  if (firstExercise && exerciseHasRequiredDiagrams({ subjectName, topic, activity, exercise: firstExercise })) {
    return {
      rawReply: firstRawReply,
      visibleText: firstParsed.visibleText,
      exercise: firstExercise,
    };
  }

  // Deuxième tentative : demande volontairement stricte et sans ambiguïté.
  const strictSystemPrompt = `${systemPrompt}

IMPORTANT : ta réponse doit obligatoirement contenir un bloc <exercise-data> valide.
Le bloc doit être du JSON valide sur une seule ligne. Chaque objet de "questions" doit contenir : id, prompt, expectedAnswers, criteria et diagram.
Si plusieurs questions concernent plusieurs angles, chaque question DOIT avoir son propre diagram avec son propre angleDegrees.
Ne termine jamais ta réponse sans ce bloc.`;

  const retryResponse = await createMessage({
    model: 'claude-haiku-4-5',
    max_tokens: 1300,
    system: strictSystemPrompt,
    messages: [
      {
        role: 'user',
        content:
          `Génère maintenant un seul exercice d'application de niveau ${Math.max(1, Math.min(5, Number(difficultyLevel) || 1))} sur la notion "${
            cleanBookName(topic || activity || 'notion étudiée', 150)
          }" en ${cleanBookName(subjectName, 80)}. Retourne obligatoirement le bloc <exercise-data> demandé.`,
      },
    ],
  });

  const retryRawReply = responseText(retryResponse);
  const retryParsed = extractTaggedData(retryRawReply, 'exercise-data');
  const retryExercise = ensureExerciseVisuals(sanitiseExercise(retryParsed.data), { subjectName, activity, topic });

  if (retryExercise && exerciseHasRequiredDiagrams({ subjectName, topic, activity, exercise: retryExercise })) {
    return {
      rawReply: retryRawReply,
      visibleText: retryParsed.visibleText,
      exercise: retryExercise,
    };
  }

  // Dernier filet de sécurité : uniquement si nous connaissons une notion
  // pour laquelle le backend possède un exercice sûr et déterministe.
  const fallbackExercise = buildFallbackExercise({
    subjectName,
    topic,
    activity,
  });

  if (fallbackExercise) {
    return {
      rawReply: '',
      visibleText: 'Très bien. Voici un petit exercice pour vérifier ta compréhension :',
      exercise: sanitiseExercise(fallbackExercise),
    };
  }

  return {
    rawReply: retryRawReply || firstRawReply,
    visibleText: retryParsed.visibleText || firstParsed.visibleText,
    exercise: null,
  };
}

// ---------------------------------------------------------------------
// Instruction d'évaluation de l'exercice.
// ---------------------------------------------------------------------

function buildExerciseAssessmentInstruction(exercise) {
  const questions = Array.isArray(exercise.questions) && exercise.questions.length
    ? exercise.questions
    : [{
        id: 1,
        prompt: exercise.prompt,
        expectedAnswers: exercise.expectedAnswers || [],
        criteria: exercise.criteria || [],
      }];

  return `Tu es l'évaluateur pédagogique de l'exercice en cours.

Analyse intelligemment la dernière réponse de l'élève. Le backend ne comprend pas la formulation : c'est ton rôle.

ÉNONCÉ GÉNÉRAL :
${exercise.prompt}

QUESTIONS :
${questions.map((q, i) => `Question ${i + 1} (id ${q.id}) : ${q.prompt}\nRéponses conceptuellement acceptables : ${q.expectedAnswers.join(' | ')}\nCritères : ${(q.criteria || []).join(' ; ')}`).join('\n\n')}

RÈGLES :
- Juge d'abord si la réponse de l'élève est VRAIE et répond bien à la question, avec tes connaissances : une réponse juste formulée autrement que les réponses de référence est "correct" ; une réponse scientifiquement, historiquement ou grammaticalement fausse est "incorrect", même si un mot attendu y figure (ex. « 2-éthylbutane » pour une chaîne de 5 carbones est faux).
- Calculs : refais toi-même le calcul. Compare la VALEUR FINALE de l'élève (dernier résultat écrit) à la bonne valeur, en acceptant les arrondis raisonnables et les écritures équivalentes (« 12racine2 » = 12√2 ; « 1,125x10^6 » = 1 125 000 ; « 3x7+8 = 29 » contient la valeur 29). Valeur juste sans unité alors qu'une unité est attendue : "partial". Valeur fausse : "incorrect".
- Une réponse qui hésite entre plusieurs possibilités (« X ou Y, je sais plus ») n'est jamais "correct".
- Toute réponse non vide que l'élève donne pour une question est une tentative : note-la "correct", "partial" ou "incorrect", jamais "unanswered".
- Langues et français : une production contenant une faute de grammaire, de conjugaison ou d'orthographe n'est pas "correct" ("partial", en nommant la faute).
- Questions ouvertes (philosophie, dissertation, argumentation, explication) : évalue la justesse et la qualité de l'argument par rapport à la question, pas l'identité avec une réponse de référence. Une position exacte et argumentée est "correct".
- Comprends le sens, pas seulement les mots exacts.
- Accepte les fautes d'orthographe et les formulations naturelles si le sens est correct.
- Une réponse peut répondre à plusieurs questions.
- Une réponse comme "1 aigu, 2 droit, 3 obtus" doit être évaluée question par question.
- Si le raisonnement est correct, accepte-le même si la formulation diffère.
- N'invente jamais une erreur.
- Utilise "partial" pour une question seulement partiellement résolue.
- Utilise "unanswered" pour une question à laquelle l'élève n'a pas répondu dans ce message. Ne note JAMAIS "correct" une question non traitée.
- Vérifie chaque réponse avec rigueur : une réponse fausse (par exemple « we walks » au lieu de « we walk ») est "incorrect", même si elle ressemble à la bonne. N'écris jamais « presque » ou « tu as raison » pour une réponse fausse.
- Ne cite dans "reason" que ce que l'élève a réellement écrit ; n'attribue jamais à l'élève un mot ou un élément qu'il n'a pas donné.
- Accepte les variantes équivalentes : accents manquants, majuscules, synonymes reconnus (« impérative » = « injonctive »), nombres écrits en lettres, unités écrites en toutes lettres (« vingt-quatre centimètres carrés » = « 24 cm² »).
- Un indice doit être conforme à la leçon et ne jamais pousser l'élève vers son erreur (par exemple, ne dis pas « regarde le point d'exclamation » si le type ne dépend pas de la ponctuation).
- Pour une question "incorrect" ou "partial", n'écris JAMAIS la bonne réponse dans "reason" ni dans "hint" : explique ce qui ne va pas et donne dans "hint" un indice qui aide l'élève à trouver lui-même, en lien direct avec SA réponse et CETTE question.
- "correct" global signifie que toutes les questions sont correctes.
- "partially_correct" signifie qu'au moins une question est correcte et qu'une autre est partielle ou incorrecte.
- "incorrect" signifie qu'aucune question n'est correctement résolue.

Retourne UNIQUEMENT :
<exercise-assessment>{"verdict":"correct|partially_correct|incorrect","reason":"bilan court","questions":[{"id":1,"verdict":"correct|partial|incorrect|unanswered","reason":"raison courte (une phrase complète)","hint":"indice sans la réponse (seulement si incorrect ou partial)"}]}</exercise-assessment>

Le tableau questions doit contenir exactement une entrée par question, dans le même ordre.
Rédige "reason" et chaque "reason" de question en t'adressant directement à l'élève, au tutoiement (« Tu as bien cité... »), jamais à la troisième personne (« L'élève a... ») : ces textes lui sont affichés.
Ne décide pas de la suite pédagogique et ne donne aucune page de manuel.`;
}

// ---------------------------------------------------------------------
// Correction robuste d'une réponse d'exercice.
// ---------------------------------------------------------------------
// Même principe que generateStructuredExercise() : Claude ignore parfois
// la consigne stricte de ne renvoyer QUE le bloc <exercise-assessment> et
// répond en mode conversationnel normal (observé en conditions réelles :
// une correction bien tournée, mais sans le bloc structuré attendu, donc
// perdue et remplacée par un message d'erreur générique). Une deuxième
// tentative, volontairement stricte, rattrape ce cas avant d'abandonner.
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Mise en forme de la correction.
// ---------------------------------------------------------------------

const IMPROVISED_EXERCISE_NOTE = "Si tu veux t'entraîner, écris « donne-moi un exercice » : je te prépare un exercice que je pourrai corriger.";

// Retire un exercice rédigé dans le texte : au moins deux lignes
// numérotées qui sont des questions ou des phrases à trous, annoncées
// comme exercice.
function stripImprovisedExercise(text, { note = true } = {}) {
  const source = String(text || '');
  const lines = source.split('\n');
  const isItem = (line) => /^\s*(\*\*)?\s*(\d+\s*[.)-]|question\s*\d+)/i.test(line) && /(\?|_{2,}|\.\.\.|…)/.test(line);
  const items = lines.filter(isItem).length;
  if (items < 2 || !/\b(exercice|questions?|entraîne|entraine|réponds|reponds)\b/i.test(source)) return source;

  // Début de l'exercice : un titre « Exercice : » seul sur sa ligne, ou la
  // première question numérotée — pas n'importe quelle phrase contenant
  // « exercice » (tout le texte disparaissait en test réel).
  const start = lines.findIndex((line) => /^\W*(exercice|questions?)\W*(\d+\W*)?:?\W*$/i.test(line.trim()) || isItem(line));
  // La phrase qui annonçait l'exercice (« Voici un petit exercice pour
  // toi ») est retirée aussi : elle promettait un exercice absent.
  const kept = lines.slice(0, Math.max(0, start))
    .map((line) => line.split(/(?<=[.!?:])\s+/).filter((sentence) => !/\b(exercice|questions? suivantes?|réponds|reponds)\b/i.test(sentence)).join(' '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return note ? `${kept}${kept ? '\n\n' : ''}${IMPROVISED_EXERCISE_NOTE}` : kept;
}

// Coupe un texte à la fin d'un mot (plus de « le sens est clai »).
function trimAtWord(value, max = 280) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:\s]+$/, '')}…`;
}

const VERDICT_ICONS = { correct: '✅', partial: '🟡', incorrect: '❌', unanswered: '⏳' };

// Une ligne par question, numérotée d'après sa place dans l'exercice.
function formatQuestionFeedback(questions, allQuestions = questions) {
  return questions
    .map((q) => {
      const number = allQuestions.findIndex((item) => item.id === q.id) + 1;
      return `${VERDICT_ICONS[q.verdict] || '•'} Question ${number} : ${trimAtWord(q.reason, 260)}`;
    })
    .join('\n');
}

// Texte d'introduction d'un exercice, sans l'énoncé ni les questions
// (affichés par la carte d'exercice).
function introWithoutExerciseText(text, exercise, fallback) {
  let intro = cleanTutorVisibleText(text || '');
  for (const fragment of [exercise?.prompt, ...(exercise?.questions || []).map((q) => q.prompt)]) {
    if (fragment && fragment.length > 12) intro = intro.split(fragment).join('');
  }

  // On ne garde que l'introduction : tout ce qui suit la première ligne de
  // question (« 1. », « **Question 1 :** », « Exercice ») est déjà dans la
  // carte. Sinon il restait des listes vides « 1. 2. 3. ».
  const kept = [];
  for (const line of intro.split('\n')) {
    const bare = line.replace(/[*_#>«»"“”']/g, '').trim();
    if (/^(question|questions|situation|situations|\d+\s*[.)-]|exercice\b|consigne\b|énoncé\b)/i.test(bare)) break;
    // Ligne sans vrai contenu (« **** : », « 1. «  » ») : ignorée.
    if (!/[a-zà-ÿ]{2,}/i.test(bare.replace(/^\d+\s*[.)-]?/, ''))) continue;
    // Une question posée dans l'introduction ferait diverger la bulle et la
    // carte (cas réel : la bonne réponse à la question de la bulle était
    // refusée). Les questions sont uniquement dans la carte.
    const withoutQuestions = line.split(/(?<=[.!?:])\s+/).filter((sentence) => !/\?\s*$/.test(sentence.trim())).join(' ');
    if (!withoutQuestions.trim()) continue;
    kept.push(withoutQuestions);
  }
  intro = kept.join('\n').replace(/\n{3,}/g, '\n\n').replace(/[:\s]+$/, '').trim();
  return intro ? `${intro}${/[.!?]$/.test(intro) ? '' : ' :'}` : fallback;
}

// Réponse de l'élève pour chaque question (message entier si l'exercice
// n'a qu'une question, sinon réponses numérotées « 1 : ... »).
function answersByQuestion(exercise, userMessage) {
  const questions = exercise.questions || [];
  if (questions.length === 1) return { [questions[0].id]: String(userMessage || '') };
  const numbered = parseNumberedAnswers(userMessage, questions.length);
  const result = {};
  questions.forEach((question, index) => {
    if (numbered[index + 1]) result[question.id] = numbered[index + 1];
  });
  return result;
}

function revealsExpectedAnswer(text, question) {
  const canonical = ` ${canonicalAnswer(text)} `;
  return (question.expectedAnswers || []).some((expected) => {
    const answer = canonicalAnswer(expected);
    return answer.length >= 2 && canonical.includes(` ${answer} `);
  });
}

// Vérification par le backend des verdicts du modèle sur les questions
// courtes, et retrait des réponses glissées dans les raisons ou indices.
function isForeignLanguageSubject(subjectName) {
  return /\b(anglais|english|espagnol\w*|spanish|allemand|german|italien|portugais|arabe|latin|chinois|langues?)\b/.test(normaliseText(subjectName));
}

// Réponses attendues d'une question, plus leurs variantes sans les mots
// déjà écrits dans l'énoncé (« We ___ go to school (not) » : « don't »
// suffit, l'élève n'a pas à réécrire « go » — refusé en test réel).
function expectedVariants(question) {
  const promptWords = new Set(canonicalAnswer(question.prompt).split(' '));
  const variants = [];
  for (const expected of question.expectedAnswers || []) {
    variants.push(expected);
    const reduced = canonicalAnswer(expected).split(' ').filter((word) => !promptWords.has(word)).join(' ');
    if (reduced && reduced !== canonicalAnswer(expected)) variants.push(reduced);
  }
  return variants;
}

// Réponse attendue numérique (une seule valeur, avec ou sans unité) : la
// valeur finale de l'élève est calculée et comparée (server-lib/answer-math).
function numericVerdict(answer, variants) {
  const numericVariants = variants.filter((expected) => {
    const text = String(expected || '');
    return readValue(text) && !/\b(ou|et|or|and)\b|;/i.test(text) && (text.match(/=/g) || []).length <= 1;
  });
  if (!answer || !numericVariants.length) return null;
  const results = numericVariants.map((expected) => compareNumericAnswer(answer, expected)).filter(Boolean);
  for (const verdict of ['correct', 'missing-unit', 'wrong-unit', 'different']) {
    if (results.includes(verdict)) return verdict;
  }
  return null;
}

// Réponse hésitante (« prophase ou métaphase je sais plus ») : jamais
// validée comme juste (cas réel validé « Bonne réponse »).
const HEDGED_ANSWER = /\bje (?:ne )?(?:sais|suis) (?:pas|plus)(?: sur)?\b|\bpeut[- ]?etre\b|\baucune idee\b|\bje crois que\b.*\bou\b/;

function crossCheckAssessment(assessment, exercise, userMessage, previouslyCorrectIds = [], { fuzzy = false } = {}) {
  const answers = answersByQuestion(exercise, userMessage);
  const numbered = exercise.questions.length > 1 && Object.keys(answers).length > 0;
  const questions = assessment.questions.map((result) => {
    const question = exercise.questions.find((q) => q.id === result.id);
    if (!question) return result;
    const answer = answers[question.id];
    const variants = expectedVariants(question);
    let next = { ...result };
    const numeric = previouslyCorrectIds.includes(question.id) ? null : numericVerdict(answer, variants);

    if (numeric) {
      // Valeur calculée : elle fait foi, quel que soit l'avis du modèle.
      if (numeric === 'correct') {
        next = { id: next.id, verdict: 'correct', reason: 'Bonne réponse.' };
      } else if (numeric === 'missing-unit') {
        next = { ...next, verdict: 'partial', reason: "Ta valeur est juste, mais il manque l'unité : une réponse de physique, de chimie ou de géométrie s'écrit toujours avec son unité." };
      } else if (numeric === 'wrong-unit') {
        next = { ...next, verdict: 'partial', reason: "Ta valeur est juste, mais l'unité ne convient pas : vérifie quelle grandeur on te demande." };
      } else if (next.verdict === 'correct' || next.verdict === 'partial' || next.verdict === 'unanswered') {
        next = { ...next, verdict: 'incorrect', reason: "Ce n'est pas encore le bon résultat : reprends ton calcul étape par étape." };
      }
    } else if (answer && next.verdict === 'correct' && isClosedQuestion(question) && HEDGED_ANSWER.test(normaliseText(answer))) {
      next = { ...next, verdict: 'partial', reason: 'Ta réponse hésite entre plusieurs possibilités : choisis-en une seule et justifie-la.' };
    } else if (answer && isClosedQuestion(question) && !previouslyCorrectIds.includes(question.id)) {
      const strict = variants.some((expected) => matchesExpectedAnswer(answer, expected, { strict: true, fuzzy }));
      const loose = strict || variants.some((expected) => matchesExpectedAnswer(answer, expected, { strict: false, fuzzy }));

      if (next.verdict === 'correct' && !loose) {
        next = { ...next, verdict: 'incorrect', reason: "Ce n'est pas encore la bonne réponse." };
      } else if (next.verdict === 'correct' && !strict && loose) {
        // Le bon nombre sans la bonne unité (« 26 » pour « 26 cm »).
        next = { ...next, verdict: 'partial', reason: "Le nombre est juste, mais il manque la bonne unité (par exemple cm, m, cm² ou m²)." };
      } else if (next.verdict !== 'correct' && strict) {
        next = { id: next.id, verdict: 'correct', reason: 'Bonne réponse.' };
      } else if (next.verdict === 'incorrect' && loose) {
        // Bon nombre, mauvaise unité (« 36 m » pour « 36 m² ») : crédit
        // partiel plutôt que 0.
        next = { ...next, verdict: 'partial', reason: "Le nombre est juste, mais l'unité ne convient pas : vérifie s'il s'agit d'une longueur (cm, m) ou d'une aire (cm², m²)." };
      } else if (next.verdict === 'unanswered' && !strict && !loose) {
        next = { ...next, verdict: 'incorrect', reason: "Ce n'est pas encore la bonne réponse." };
      }
    } else if (
      !answer
      && !numbered
      && exercise.questions.length > 1
      && next.verdict === 'correct'
      && isClosedQuestion(question)
      && !previouslyCorrectIds.includes(question.id)
      && !variants.some((expected) => matchesExpectedAnswer(userMessage, expected, { strict: false, fuzzy }))
    ) {
      // Réponse non numérotée : une question courte n'est validée que si
      // sa réponse figure dans le message (en test réel, « 36 m » pour la
      // question 1 avait aussi validé la question 2, dont la réponse
      // attendue était « 24 m »).
      next = { id: next.id, verdict: 'unanswered', reason: 'Pas encore de réponse.' };
    }

    if (next.verdict === 'incorrect' || next.verdict === 'partial') {
      if (revealsExpectedAnswer(next.reason, question)) {
        next.reason = next.verdict === 'partial'
          ? "C'est en partie juste : il manque un élément, regarde l'indice pour compléter ta réponse."
          : "Ce n'est pas encore la bonne réponse.";
      }
      if (next.hint && revealsExpectedAnswer(next.hint, question)) delete next.hint;
    }

    return next;
  });

  return { ...assessment, questions, verdict: summariseVerdict(questions) };
}

async function assessExerciseAnswer({ exercise, userMessage, previouslyCorrectIds = [] }) {
  // Appel dédié : seulement la consigne d'évaluation et la réponse de
  // l'élève. Auparavant, le correcteur recevait tout le prompt du tuteur et
  // tout l'historique, et répondait souvent de façon conversationnelle au
  // lieu du format attendu (13 échecs « Je n'ai pas pu corriger » sur 6
  // conversations de test). La réponse est en plus pré-remplie avec
  // l'ouverture du bloc attendu.
  const alreadyCorrect = exercise.questions
    .map((question, index) => (previouslyCorrectIds.includes(question.id) ? index + 1 : null))
    .filter(Boolean);

  const content = `${alreadyCorrect.length ? `Questions déjà réussies dans un message précédent : ${alreadyCorrect.join(', ')}. Si l'élève n'y répond pas à nouveau, note-les "unanswered".\n` : ''}Réponse de l'élève :
${String(userMessage || '').trim().slice(0, 2500)}`;

  const prefix = '<exercise-assessment>{';

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await createMessage({
        // Correction : le modèle le plus fiable (les tests réels ont montré
        // des réponses fausses validées et des justes refusées avec Haiku),
        // Haiku seulement en secours.
        model: VISUAL_MODELS[attempt] || VISUAL_MODELS[VISUAL_MODELS.length - 1],
        max_tokens: 900,
        system: buildExerciseAssessmentInstruction(exercise),
        messages: [
          { role: 'user', content },
          { role: 'assistant', content: prefix },
        ],
      });

      const rawReply = prefixedText(prefix, response);
      const closed = rawReply.includes('</exercise-assessment>') ? rawReply : `${rawReply}</exercise-assessment>`;
      const assessment = extractTaggedData(closed, 'exercise-assessment').data;

      if (isValidAssessment(assessment, exercise)) {
        return { rawReply: closed, assessment };
      }

      console.warn('Évaluation invalide (tentative %d) : %s', attempt + 1, closed.slice(0, 400));
    } catch (error) {
      console.error('Erreur assessExerciseAnswer :', error.message);
    }
  }

  return { rawReply: '', assessment: null };
}

// ---------------------------------------------------------------------
// Réponses numérotées (« 1) 16 cm 2) 64 m », « question 1 : ... »).
// Utilisé quand l'évaluation du modèle reste inexploitable : chaque
// réponse identique à une réponse attendue est reconnue.
// ---------------------------------------------------------------------

function parseNumberedAnswers(message, questionCount) {
  const text = String(message || '');
  // Repères « 1. », « 1) », « 1 : », « question 1 », mais aussi un numéro
  // seul (« 1 grows 2 do not play ») — refusé en test réel. Un numéro seul
  // n'est un repère que s'il suit l'ordre des questions (1, puis 2...), pour
  // ne pas confondre avec un nombre de la réponse (« 1 24 cm² 2 36 m »).
  const marker = /(?:^|[\s;,.])(?:question|q|exercice)?\s*(\d{1,2})(\s*(?:\)|\.|:|-|=>|→)|(?=\s+\S))\s*/gi;
  const candidates = [];
  let match;
  while ((match = marker.exec(text)) !== null) {
    const number = Number(match[1]);
    const explicit = Boolean(match[2] && /[).:\-=>→]/.test(match[2]));
    if (number < 1 || number > questionCount) continue;
    candidates.push({ number, explicit, start: match.index + match[0].length, markerStart: match.index });
  }
  // Dès que l'élève numérote explicitement (« 1) », « 2. », « Q3 : »), un
  // nombre isolé n'est jamais un repère : c'est une valeur de sa réponse
  // (test réel : « 1) dans le cytoplasme, 2 ATP » coupé en Q1 / Q2).
  const hasExplicit = candidates.some((item) => item.explicit);
  const found = [];
  let expected = 1;
  candidates.forEach((item) => {
    if (hasExplicit && !item.explicit) return;
    // Sans repère explicite, un numéro seul est un repère s'il suit l'ordre
    // des questions, ou s'il ouvre le message (« 2 centr et 3 nor ouest »).
    const opensMessage = found.length === 0 && text.slice(0, item.markerStart).trim() === '';
    if (!item.explicit && item.number !== expected && !opensMessage) return;
    found.push(item);
    expected = item.number + 1;
  });
  // Un numéro seul isolé (« 2 cm ») n'est pas un repère : il en faut au
  // moins deux pour former une séquence.
  if (found.length === 1 && !found[0].explicit) found.length = 0;
  const answers = {};
  found.forEach((item, index) => {
    const end = index + 1 < found.length ? found[index + 1].markerStart : text.length;
    const answer = text.slice(item.start, end).trim().replace(/[;,]$/, '');
    if (answer) answers[item.number] = answer;
  });
  return answers;
}

function deterministicAssessment(exercise, userMessage) {
  const questions = exercise.questions || [];
  if (questions.length === 1) {
    return answerMatchesExpected(userMessage, questions[0])
      ? {
        verdict: 'correct',
        reason: 'Ta réponse correspond à la réponse attendue.',
        questions: [{ id: questions[0].id, verdict: 'correct', reason: 'Réponse exacte.' }],
      }
      : null;
  }

  const answers = parseNumberedAnswers(userMessage, questions.length);
  const numbers = Object.keys(answers).map(Number);
  if (!numbers.length) return null;

  const results = questions.map((question, index) => {
    const answer = answers[index + 1];
    if (!answer) return { id: question.id, verdict: 'unanswered', reason: 'Pas encore de réponse.' };
    return answerMatchesExpected(answer, question)
      ? { id: question.id, verdict: 'correct', reason: 'Réponse exacte.' }
      : null;
  });

  // Une réponse différente de la réponse attendue n'est pas forcément
  // fausse (formulation libre) : sans évaluation fiable, on ne tranche pas.
  if (results.some((result) => result === null)) return null;

  return {
    verdict: 'correct',
    reason: 'Tes réponses correspondent aux réponses attendues.',
    questions: results,
  };
}

// ---------------------------------------------------------------------
// Classification : le message de l'élève est-il une tentative de réponse
// à l'exercice en cours, ou autre chose (hors sujet, demande d'aide,
// contenu sensible) ? Sans cette étape, TOUT message reçu pendant un
// exercice était systématiquement envoyé au correcteur strict — y compris
// une question hors sujet ou un sujet dangereux — ce qui contournait les
// règles générales (rester sur le sujet, refuser poliment un contenu
// inapproprié) tant qu'un exercice était en cours.
// ---------------------------------------------------------------------

async function classifyExerciseMessageIntent({ exercisePrompt, userMessage }) {
  const fallback = { intent: 'ANSWER_ATTEMPT', confidence: 0 };

  try {
    const response = await createMessage({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system: `Tu es le classifieur d'intention d'un tuteur scolaire, appelé juste avant de corriger un exercice.

Un exercice est en cours. Détermine seulement la NATURE du message de l'élève : est-ce une tentative de réponse à cet exercice, ou autre chose ?

Retourne UNIQUEMENT un JSON valide sur une seule ligne :
{"intent":"...","confidence":0.00}

Intentions autorisées : ANSWER_ATTEMPT, OFF_TOPIC, UNSAFE_OR_INAPPROPRIATE, HELP_REQUEST, OTHER.

Règles :
- ANSWER_ATTEMPT : l'élève essaie de répondre à une ou plusieurs questions de l'exercice, même partiellement, même faux, même mal formulé.
- OFF_TOPIC : l'élève parle de tout autre chose, sans lien avec l'exercice ni la matière.
- UNSAFE_OR_INAPPROPRIATE : le message porte sur un sujet dangereux, violent, sexuel, ou clairement hors cadre scolaire.
- HELP_REQUEST : l'élève demande de l'aide, un indice, une réexplication, ou dit clairement qu'il ne sait pas répondre, sans donner de réponse.
- OTHER : aucun de ces cas ne correspond clairement.
- En cas de doute réel entre ANSWER_ATTEMPT et autre chose, préfère ANSWER_ATTEMPT : mieux vaut tenter de corriger une vraie réponse que de la bloquer à tort.
- La confiance doit être comprise entre 0 et 1.

Énoncé de l'exercice en cours : ${JSON.stringify(String(exercisePrompt || '').slice(0, 800))}
Message de l'élève : ${JSON.stringify(String(userMessage || '').slice(0, 1500))}`,
      messages: [{ role: 'user', content: String(userMessage || '').trim() }],
    });

    const raw = responseText(response);
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '');

    const allowed = new Set([
      'ANSWER_ATTEMPT',
      'OFF_TOPIC',
      'UNSAFE_OR_INAPPROPRIATE',
      'HELP_REQUEST',
      'OTHER',
    ]);

    if (!allowed.has(parsed.intent) || !Number.isFinite(Number(parsed.confidence))) {
      return fallback;
    }

    return {
      intent: parsed.intent,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence))),
    };
  } catch (error) {
    console.error('Erreur classifyExerciseMessageIntent :', error.message);
    return fallback;
  }
}

// ---------------------------------------------------------------------
// Petit nettoyage de texte utilisé uniquement pour les réponses visibles.
// ---------------------------------------------------------------------

function shortText(value, max = 280) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// Repère « [SCHEMA] » : endroit du texte où le système insère le schéma.
const SCHEMA_MARKER = /\[\s*SCH[EÉ]MA\s*\]/i;

function cleanTutorVisibleText(value) {
  return String(value || '')
    .replace(new RegExp(SCHEMA_MARKER.source, 'gi'), '')
    .replace(/<exercise-data>[\s\S]*?<\/exercise-data>/gi, '')
    .replace(/<exercise-assessment>[\s\S]*?<\/exercise-assessment>/gi, '')
    .replace(/<explanation-data>[\s\S]*?<\/explanation-data>/gi, '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/^\s*#{1,6}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isAngleContext({ subjectName, activity, topic }) {
  const text = normaliseText(`${subjectName || ''} ${activity || ''} ${topic || ''}`);
  return /\b(angle|angles|geometrie|geometrie plane|rapporteur|angle droit|angle aigu|angle obtus)\b/.test(text);
}

function buildFallbackExplanationVisuals({ subjectName, activity, topic }) {
  if (!isAngleContext({ subjectName, activity, topic })) return [];

  return [
    {
      type: 'angle',
      angleDegrees: 45,
      points: canonicalAnglePoints(45),
      labels: true,
      measurements: { angle: '45°' },
      annotations: ['Angle aigu', '45° < 90°'],
    },
    {
      type: 'angle',
      angleDegrees: 90,
      points: canonicalAnglePoints(90),
      labels: true,
      measurements: { angle: '90°' },
      annotations: ['Angle droit', '90°'],
    },
    {
      type: 'angle',
      angleDegrees: 120,
      points: canonicalAnglePoints(120),
      labels: true,
      measurements: { angle: '120°' },
      annotations: ['Angle obtus', '90° < 120° < 180°'],
    },
    {
      type: 'angle',
      angleDegrees: 180,
      points: canonicalAnglePoints(180),
      labels: true,
      measurements: { angle: '180°' },
      annotations: ['Angle plat', '180°'],
    },
  ];
}

// Compatibilité avec l'ancien appel qui attendait un seul schéma.
function buildFallbackExplanationVisual(context) {
  return buildFallbackExplanationVisuals(context)[0] || null;
}

// Consigne d'explication sans schéma (langues, histoire-géographie,
// philosophie...) : l'aide passe par des exemples et des modèles.
function buildTextOnlyExplanationInstruction(subjectName) {
  const subject = normaliseText(subjectName);
  const isLanguage = /\b(anglais|english|espagnol\w*|allemand|italien|portugais|arabe|latin|langues?)\b/.test(subject);

  return `Explique réellement la notion demandée depuis les bases, avec des mots simples et au moins un exemple concret.
Dans cette matière, on n'utilise AUCUN schéma : ne produis jamais de bloc <explanation-data>, de dessin ASCII ou de SVG, et n'annonce jamais de schéma, d'image ou de dessin.
${isLanguage
    ? `C'est un cours de langue étrangère : explique en français (la langue de l'élève), puis donne des phrases modèles courtes dans la langue étudiée avec leur traduction, et signale les pièges fréquents (prononciation, ordre des mots, conjugaison). Un petit tableau (par exemple une conjugaison) est possible s'il aide vraiment.`
    : `Appuie-toi sur des exemples, des phrases modèles, des étapes numérotées, des dates ou des repères précis selon la matière. Un petit tableau est possible s'il aide vraiment.`}
Termine par UNE question courte qui vérifie réellement la compréhension (pas seulement « est-ce clair ? »).`;
}

function buildExplanationInstruction({ subjectName, activity, topic }) {
  const visualPolicy = getSubjectVisualPolicy(subjectName);

  if (visualPolicy === 'none') {
    return buildTextOnlyExplanationInstruction(subjectName);
  }

  const geometry = isAngleContext({ subjectName, activity, topic });

  if (geometry) {
    return `Explique réellement les bases des angles comme à un élève débutant. Ne te contente pas d'une définition.

Explique progressivement :
1. ce qu'est un angle ;
2. le sommet et les deux côtés ;
3. comment nommer un angle avec trois lettres ;
4. comment mesurer un angle en degrés ;
5. les quatre types suivants : angle aigu, angle droit, angle obtus et angle plat.

IMPORTANT : lorsque tu présentes plusieurs types d'angles, tu DOIS fournir un schéma distinct pour CHACUN des quatre types. Ne réutilise jamais le même schéma pour plusieurs types.

Pour chaque type, écris d'abord son explication puis place immédiatement son propre bloc <explanation-data>. Exemple de structure :
Texte sur l'angle aigu.
<explanation-data>{"diagram":{"type":"angle","angleDegrees":45,"labels":true}}</explanation-data>
Texte sur l'angle droit.
<explanation-data>{"diagram":{"type":"angle","angleDegrees":90,"labels":true}}</explanation-data>
Texte sur l'angle obtus.
<explanation-data>{"diagram":{"type":"angle","angleDegrees":120,"labels":true}}</explanation-data>
Texte sur l'angle plat.
<explanation-data>{"diagram":{"type":"angle","angleDegrees":180,"labels":true}}</explanation-data>

Règles pour les schémas :
- angle aigu : angleDegrees strictement inférieur à 90 ;
- angle droit : angleDegrees = 90 ;
- angle obtus : angleDegrees strictement supérieur à 90 et inférieur à 180 ;
- angle plat : angleDegrees = 180 ;
- B doit être le sommet et l'angle représenté doit être ABC ;
- ne fournis jamais de coordonnées ; le backend les calcule ;
- ne fournis jamais de SVG, HTML, CSS ou dessin ASCII ;
- chaque bloc <explanation-data> doit être un JSON valide sur une seule ligne.

Après les quatre explications et les quatre schémas, termine par une vraie question de vérification (par exemple : « Pour vérifier : un angle de 130°, est-il aigu, droit ou obtus ? »).`;
  }

  return `Explique réellement la notion demandée depuis les bases, avec un exemple concret et, lorsque la notion est visuelle, fournis un schéma distinct pour chaque élément que tu expliques.${visualPolicy === 'required'
    ? `
IMPORTANT : dans cette matière, le schéma n'est pas une option. Dès que la notion peut se représenter (organe, circuit, force, montage, figure, aire, périmètre, graphique, cycle, trajet...), ta réponse DOIT contenir au moins un bloc <explanation-data>. Pour un rectangle, un carré ou un cercle, donne ses dimensions ({"type":"rectangle","width":5,"height":3,"unit":"cm"}) : les nombres doivent être exactement ceux de ton texte. En SVT, un organe, un appareil du corps, une cellule, une plante ou une structure de la Terre se montre par une illustration (dessin annoté avec "draw"), donnée spontanément dès cette première explication, jamais par une liste de cases.`
    : ''} Ne réutilise pas le même schéma pour plusieurs notions. Place chaque bloc <explanation-data> DANS ton texte, juste après le paragraphe qu'il illustre (jamais tout à la fin, jamais après la question finale) : l'élève lit l'explication et voit le schéma au même endroit, comme dans un manuel. Ne fabrique jamais de SVG, HTML ou dessin ASCII. Termine par UNE question courte qui vérifie réellement la compréhension (pas seulement « est-ce clair ? »).

Formats de schéma (le système les dessine proprement ; tu donnes seulement le contenu) :
- figure avec ses dimensions : {"type":"rectangle","width":5,"height":3,"unit":"cm"} ; {"type":"square","side":4,"unit":"cm"} ; {"type":"circle","radius":3,"unit":"cm"} ; angle : {"type":"angle","angleDegrees":45}
${describeRegisteredVisuals()}`;
}

function canonicalAnglePoints(angleDegrees) {
  const degrees = Number(angleDegrees);

  if (!Number.isFinite(degrees) || degrees <= 0 || degrees > 180) {
    return null;
  }

  const radians = degrees * Math.PI / 180;
  const B = { x: 250, y: 170 };
  const radius = 120;

  return {
    A: { x: 130, y: 170 },
    B,
    C: {
      x: Math.round(B.x - radius * Math.cos(radians)),
      y: Math.round(B.y - radius * Math.sin(radians)),
    },
  };
}

function sanitiseExplanationDiagram(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const type = typeof value.type === 'string'
    ? value.type.trim().toLowerCase()
    : '';

  if (isRegisteredVisualType(type)) return sanitiseRegisteredVisual(value);

  // Ancien repère (souvent rendu vide, coordonnées mathématiques prises pour
  // des pixels) : converti en graphique mathématique, qui place les points.
  if (type === 'coordinate-plane' && value.points && typeof value.points === 'object') {
    const graph = sanitiseRegisteredVisual({
      type: 'graph',
      title: typeof value.title === 'string' ? value.title : '',
      equalScale: true,
      points: Object.entries(value.points).map(([label, point]) => ({ label, x: point?.x, y: point?.y, guides: true })),
      segments: Array.isArray(value.segments) ? value.segments : [],
    });
    if (graph) return graph;
  }

  const allowed = new Set([
    'point', 'line', 'segment', 'angle', 'triangle', 'right-triangle',
    'parallelogram', 'rectangle', 'square', 'circle', 'coordinate-plane',
    'composite',
  ]);

  if (!allowed.has(type)) return null;

  if (type === 'angle') {
    const angleDegrees = Number(value.angleDegrees);
    const points = canonicalAnglePoints(angleDegrees);

    if (!points) return null;

    return {
      type: 'angle',
      angleDegrees,
      points,
      labels: true,
      measurements: {
        angle: `${angleDegrees}°`,
        'A-B': 'côté',
        'B-C': 'côté',
      },
      annotations: [`Angle ABC = ${angleDegrees}°`],
    };
  }

  if (type === 'composite') {
    const elements = sanitiseCompositeElements(value.elements);
    if (!elements.length) return null;

    return {
      type: 'composite',
      elements,
      labels: value.labels !== false,
      annotations: Array.isArray(value.annotations)
        ? value.annotations.slice(0, 6)
            .filter(x => typeof x === 'string')
            .map(x => x.trim().slice(0, 120))
            .filter(Boolean)
        : [],
    };
  }

  const rawPoints = value.points
    && typeof value.points === 'object'
    && !Array.isArray(value.points)
      ? value.points
      : {};

  const points = {};

  for (const [label, point] of Object.entries(rawPoints).slice(0, 12)) {
    if (!/^[A-Z][A-Z0-9]?$/.test(label)) continue;
    if (!point || typeof point !== 'object' || Array.isArray(point)) continue;

    const x = Number(point.x);
    const y = Number(point.y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < 0 || x > 500 || y < 0 || y > 320) continue;

    points[label] = { x: Math.round(x), y: Math.round(y) };
  }

  // Figure sans assez de points (ex. carré vide) : on la construit à partir
  // de ses dimensions si elles sont données, sinon on la rejette.
  if (!hasEnoughPoints(type, points)) {
    const dimensioned = buildDimensionedFigure(value);
    return dimensioned
      ? { ...dimensioned, annotations: Array.isArray(value.annotations) ? value.annotations.filter((x) => typeof x === 'string').slice(0, 4) : [] }
      : null;
  }

  return {
    type,
    points,
    ...(sanitiseGrid(value.grid) ? { grid: sanitiseGrid(value.grid) } : {}),
    labels: value.labels !== false,
    filled: typeof value.filled === 'boolean' ? value.filled : null,
    measurements: value.measurements && typeof value.measurements === 'object'
      ? value.measurements
      : {},
    annotations: Array.isArray(value.annotations)
      ? value.annotations.slice(0, 10)
          .filter(x => typeof x === 'string')
          .map(x => x.trim())
          .filter(Boolean)
      : [],
  };
}

function extractExplanationSegments(rawReply) {
  const source = String(rawReply || '');
  const tagRegex = /<explanation-data>\s*([\s\S]*?)\s*<\/explanation-data>/gi;
  const segments = [];
  let cursor = 0;
  let match;

  while ((match = tagRegex.exec(source)) !== null) {
    const textBefore = cleanTutorVisibleText(source.slice(cursor, match.index));
    let diagram = null;

    try {
      const parsed = JSON.parse(match[1]);
      diagram = sanitiseExplanationDiagram(parsed?.diagram);
    } catch (_) {
      diagram = null;
    }

    if (textBefore || diagram) {
      segments.push({
        text: textBefore,
        diagram,
      });
    }

    cursor = match.index + match[0].length;
  }

  const remainingText = cleanTutorVisibleText(source.slice(cursor));
  if (remainingText) {
    segments.push({
      text: remainingText,
      diagram: null,
    });
  }

  return segments.filter((segment) => segment.text || segment.diagram);
}

function extractExplanationVisual(rawReply) {
  return extractExplanationSegments(rawReply).find(
    (segment) => segment.diagram
  )?.diagram || null;
}

function getAngleDiagramKinds(rawReply) {
  const text = normaliseText(rawReply);
  const kinds = [];

  if (/\baigu\b/.test(text)) kinds.push({ type: 'aigu', angleDegrees: 45 });
  if (/\bdroit\b/.test(text)) kinds.push({ type: 'droit', angleDegrees: 90 });
  if (/\bobtus\b/.test(text)) kinds.push({ type: 'obtus', angleDegrees: 120 });
  if (/\bplat\b/.test(text)) kinds.push({ type: 'plat', angleDegrees: 180 });

  return kinds;
}

function ensureAngleExplanationSegments(rawReply, segments, context) {
  if (!isAngleContext(context)) return segments;

  const source = normaliseText(rawReply);
  const mentionedKinds = getAngleDiagramKinds(rawReply);
  const existingDegrees = new Set(
    segments
      .map((segment) => Number(segment.diagram?.angleDegrees))
      .filter((value) => Number.isFinite(value))
  );

  const shouldTeachAllFour =
    mentionedKinds.length >= 2
    || /\bangle aigu\b/.test(source)
    || /\bangle droit\b/.test(source)
    || /\bangle obtus\b/.test(source)
    || /\bangle plat\b/.test(source);

  if (!shouldTeachAllFour) return segments;

  const fallbackByDegree = new Map(
    buildFallbackExplanationVisuals(context).map((diagram) => [
      Number(diagram.angleDegrees),
      diagram,
    ])
  );

  const orderedDegrees = [45, 90, 120, 180];
  const missing = orderedDegrees.filter((degree) => !existingDegrees.has(degree));

  if (!missing.length) return segments;

  // Claude a parlé des quatre types mais n'a pas fourni tous les schémas.
  // On ajoute uniquement les schémas manquants, dans l'ordre pédagogique.
  const result = [...segments];

  for (const degree of missing) {
    const diagram = fallbackByDegree.get(degree);
    if (!diagram) continue;

    const label = degree === 45
      ? 'Schéma de l’angle aigu : 45°.'
      : degree === 90
        ? 'Schéma de l’angle droit : 90°.'
        : degree === 120
          ? 'Schéma de l’angle obtus : 120°.'
          : 'Schéma de l’angle plat : 180°.';

    result.push({
      text: label,
      diagram,
    });
  }

  return result;
}

// ---------------------------------------------------------------------
// Tour « schéma demandé ».
// Le schéma est construit par le backend AVANT l'appel à Claude : Claude
// ne fait que commenter un schéma qui existe réellement.
// ---------------------------------------------------------------------

function buildVisualTurnInstruction(visual) {
  if (visual?.type === 'electric-circuit') {
    const d = visual.diagram;
    const parts = d.components.map((c) => ({
      battery: c.flat ? 'une pile usée' : 'une pile',
      switch: c.closed ? 'un interrupteur fermé' : 'un interrupteur ouvert',
      lamp: c.broken ? 'une lampe grillée' : 'une lampe',
      motor: 'un moteur',
      buzzer: 'un buzzer',
    }[c.kind] || c.kind));
    return `L'élève a demandé à voir un schéma. Le système affiche, au milieu de ta réponse, le schéma normalisé d'un circuit électrique en boucle avec ${parts.join(', ')}${d.brokenWire ? ', et un fil débranché' : ''} : ${d.working ? 'la lampe brille, le courant circule' : "la lampe ne brille pas"}.
Écris d'abord une ou deux phrases qui introduisent le schéma, puis une ligne contenant seulement [SCHEMA], puis commente-le en 2 à 4 phrases simples (le trajet du courant, pourquoi la lampe brille ou non).
Tu ne vois pas le schéma : ne décris ni ses couleurs ni sa disposition. Ne produis aucun bloc <explanation-data>, aucun dessin ASCII, aucun SVG.
Termine par une question courte qui vérifie la compréhension à partir du schéma.`;
  }

  return '';
}

// Schéma relu en base : les anciens types (appareil digestif,
// respiratoire...) sont convertis en schéma générique ; une commande de
// dessin non résolue n'est jamais affichée.
function upgradeStoredVisual(diagram) {
  if (!diagram || typeof diagram !== 'object') return null;
  if (!isRegisteredVisualType(diagram.type)) return diagram;
  const upgraded = sanitiseRegisteredVisual(diagram);
  return upgraded && !upgraded.pending ? upgraded : null;
}

// ---------------------------------------------------------------------
// Relecture d'un message du tuteur avant envoi.
// Les tests réels ont relevé des erreurs de calcul (f au lieu de F), des
// faits faux (6 milliards de milliards, la photosynthèse « la nuit »), des
// contradictions entre messages, des fautes de français, des modèles faux
// en anglais et des messages tronqués. Un relecteur dédié vérifie le
// message et le corrige si besoin ; les blocs de schéma et d'exercice sont
// masqués et remis à leur place à l'identique.
// ---------------------------------------------------------------------

async function reviewTutorReply({ rawReply, subjectName, levelLabel, activity, history = [] }) {
  const source = String(rawReply || '');
  if (source.length < 40) return source;
  const blocks = [];
  const masked = source.replace(/<(explanation-data|exercise-data)>[\s\S]*?<\/\1>/g, (block) => {
    blocks.push(block);
    return `[[BLOC_${blocks.length}]]`;
  });
  const previous = history.slice(-6).map((m) => `${m.role === 'user' ? 'Élève' : 'Tuteur'} : ${shortText(typeof m.content === 'string' ? m.content : '', 600)}`).join('\n');
  const prefix = '{';

  try {
    const response = await createMessage({
      model: VISUAL_MODELS[0],
      max_tokens: 2400,
      system: `Tu relis, avant envoi, le message d'un tuteur à un élève (${levelLabel || 'secondaire'}, ${subjectName}, activité : « ${cleanBookName(activity || '', 150)} »).
Vérifie :
1. l'exactitude : refais chaque calcul ; chaque fait, définition, formule, date et ordre de grandeur doit être juste au niveau de la classe ;
2. la cohérence avec les messages précédents de la conversation (aucune contradiction ; si le tuteur s'était trompé plus tôt, le message doit le dire et corriger) ;
3. la sécurité (aucune manipulation dangereuse) ;
4. la langue : français correct (orthographe, accords, conjugaison) ; phrases modèles en langue étrangère entièrement correctes dans cette langue ;
5. la complétude : aucune phrase, liste ou étape inachevée ; le message se termine par une vraie question.
Ne change NI le style, NI le contenu juste, NI les questions posées, NI les marqueurs [[BLOC_n]] (laisse-les exactement à leur place).
Réponds UNIQUEMENT en JSON : {"ok":true} si le message est sans erreur ; sinon {"ok":false,"text":"le message corrigé en entier"}.`,
      messages: [
        { role: 'user', content: `Conversation précédente :\n${previous || '(début)'}\n\nMessage à relire :\n${masked}` },
        { role: 'assistant', content: prefix },
      ],
    });
    const raw = prefixedText(prefix, response);
    const parsed = JSON.parse(raw.slice(0, raw.lastIndexOf('}') + 1));
    if (parsed.ok !== false || typeof parsed.text !== 'string' || parsed.text.trim().length < 20) return source;
    // Tous les blocs doivent être conservés, sinon la correction est ignorée.
    if (!blocks.every((_, i) => parsed.text.includes(`[[BLOC_${i + 1}]]`))) return source;
    return parsed.text.replace(/\[\[BLOC_(\d+)\]\]/g, (_, n) => blocks[Number(n) - 1] || '');
  } catch (error) {
    console.error('Erreur reviewTutorReply :', error.message);
    return source;
  }
}

// ---------------------------------------------------------------------
// Illustrations (forme « illustration » du schéma générique).
// Claude indique CE QU'IL FAUT dessiner à l'endroit voulu du texte ; un
// appel dédié, avec un modèle plus précis, produit le dessin (formes
// simples dans un cadre 400 × 300, parties repérées par un point). Le
// serveur le valide (sanitiseSchema) ; le rendu (numéros, légende,
// couleurs) est celui de l'application, identique pour toutes les notions.
// ---------------------------------------------------------------------

const VISUAL_MODELS = [process.env.TUTOR_VISUAL_MODEL || 'claude-sonnet-5-5', 'claude-haiku-4-5'];
// Budget de réflexion du dessinateur (0 pour la désactiver).
const DRAW_THINKING_BUDGET = Number(process.env.TUTOR_DRAW_THINKING ?? 6000);

const ILLUSTRATION_SYSTEM = `Tu dessines une illustration pédagogique propre et exacte, comme dans un bon manuel scolaire, pour un élève du secondaire.
Réponds UNIQUEMENT par du JSON valide sur une ligne :
{"title":"...","plan":[...],"shapes":[...],"nodes":[...]}

"plan" (à remplir EN PREMIER) : la mise en place avant le dessin, une entrée par partie légendée : {"part":"...","box":[x,y,largeur,hauteur],"inside":"partie qui la contient ou null"}. Les boîtes de deux parties voisines se touchent sans se recouvrir ; celle d'une partie interne est entièrement dans celle qui la contient. Les formes suivent ensuite exactement ce plan.

Cadre : x de 0 à 400, y de 0 à 300 (y vers le bas). Le dessin occupe la plus grande place possible (le système zoome dessus et place les numéros dans les marges).
"shapes" (6 à 30 formes, dessinées dans l'ordre, du fond vers le dessus) :
- {"kind":"path","d":"M.. C.. Z","tone":"..."} : contours courbes (commandes M L H V C S Q T A Z, coordonnées absolues de préférence) ; c'est la forme principale pour un organe ou un être vivant (contours arrondis et naturels, pas de rectangles ni de simples ovales empilés) ; un tube (œsophage, intestin, trachée, vaisseau) est un path épais "fill":false ;
- {"kind":"ellipse","cx":..,"cy":..,"rx":..,"ry":..,"tone":"..."} ; {"kind":"circle","cx":..,"cy":..,"r":..,"tone":"..."} ;
- {"kind":"rect","x":..,"y":..,"width":..,"height":..,"rx":..,"tone":"..."} ;
- {"kind":"polygon","points":"x,y x,y x,y","tone":"..."} ;
- {"kind":"line","x1":..,"y1":..,"x2":..,"y2":..,"tone":"...","arrow":true} pour une flèche (trajet, mouvement, échange).
Options : "fill":false (contour seul), "dashed":true.
"tone" (palette imposée, choisis selon le sens) : organ (rose), blood (rouge), air (bleu ciel), water (bleu), plant (vert), earth (brun), rock (gris-brun), bone (ivoire), nerve (jaune), cell (lavande), energy (orange), metal (gris acier), neutral (gris clair), accent (turquoise), dark (contour sombre).
"nodes" (2 à 10 parties à légender) : {"label":"Noyau","detail":"rôle en une phrase courte","at":{"x":..,"y":..},"highlight":false}
- "at" est un point situé À L'INTÉRIEUR de la partie désignée, sur la forme elle-même (le système y pose un point relié à un numéro dans la marge) ; deux points doivent être éloignés d'au moins 20 ;
- "detail" = le RÔLE de la partie (« broie les aliments », « échanges de gaz »), jamais la répétition de son nom ni sa position ;
- "highlight": true pour la partie dont parle l'explication.
Aucun texte dans le dessin (le système ajoute numéros et légende). Pas de couleur libre, pas de SVG, pas de style.

Exigences :
- AUCUN cadre, rectangle ou forme décorative sans rôle : chaque forme est une partie réelle de l'objet (ou son contour) ;
- relations spatiales exactes : une partie interne est entièrement DANS le contour (organites dans la cellule, jamais à cheval sur la membrane), une partie externe est dehors ; les nombres d'éléments sont justes (même nombre de chromatides de chaque côté...) ;
- pour une coordonnée, une courbe, un vecteur, une force ou un angle, n'utilise pas ce dessin : le système a un graphique mathématique pour cela ;
- style manuel de SVT : un appareil du corps se dessine dans la silhouette du corps (tronc, et tête si la bouche ou le nez sont légendés, en tone neutral, fill clair) avec chaque organe à sa vraie place et à sa vraie taille relative ; un organe seul se dessine en grand ; une cellule en coupe ; une plante ou une fleur entière ou en coupe ; une structure géologique en coupe ;
- organe en coupe (cœur, rein, œil, dent, graine, fruit...) : un contour extérieur arrondi et épais (la paroi), puis les cavités ou compartiments en formes ARRONDIES à l'intérieur, séparées par des cloisons fines (un espace de 4 à 6 entre deux cavités, la couleur de la paroi y reste visible) ; pas de découpage en blocs par des traits droits ; les vaisseaux ou conduits sont des tubes courbes de largeur constante (un path "fill":false épais, ou deux bords parallèles) qui partent de leur cavité et sortent du contour ;
- les organes reliés en vrai sont reliés sur le dessin (bouche → œsophage → estomac → intestin grêle → gros intestin → anus forment UN tube continu ; trachée → bronches → poumons) ;
- exactitude scientifique : formes, proportions et positions relatives justes (par exemple, le foie est à droite du corps, donc à GAUCHE de l'image vue de face ; le cœur a quatre cavités ; un volcan a sa cheminée au centre) ;
- lisibilité : formes simples, grandes, bien séparées, pas de détails inutiles ; les parties qui se touchent en vrai se touchent sur le dessin ;
- les étiquettes et leurs rôles utilisent EXACTEMENT les mots du texte envoyé à l'élève ;
- niveau de la classe : pas plus de parties que ce que l'explication mentionne.`;

async function drawIllustration({ draw, title, subjectName, activity, topic, reply }) {
  const content = `Matière : ${subjectName}
Notion de la séance : ${cleanBookName(topic || activity || '', 200)}
À dessiner : ${shortText(draw, 300)}
${title ? `Titre souhaité : ${shortText(title, 90)}
` : ''}Texte envoyé à l'élève : ${shortText(reply, 2000)}`;

  for (const model of VISUAL_MODELS) {
    try {
      // Réflexion avant le dessin (placement des parties, tracé des
      // courbes) : en test réel, le cœur dessiné sans réflexion était fait
      // de blocs. Un dessin dont le contrôle géométrique relève des défauts
      // est renvoyé une fois au dessinateur avec la liste des défauts.
      const thinking = DRAW_THINKING_BUDGET > 0 && !/haiku/i.test(model)
        ? { thinking: { type: 'enabled', budget_tokens: DRAW_THINKING_BUDGET } }
        : {};
      const ask = async (messages) => {
        const response = await createMessage({
          model,
          max_tokens: 9000 + (thinking.thinking ? DRAW_THINKING_BUDGET : 0),
          system: ILLUSTRATION_SYSTEM,
          messages: thinking.thinking ? messages : [...messages, { role: 'assistant', content: '{' }],
          ...thinking,
        });
        const raw = thinking.thinking ? responseText(response) : prefixedText('{', response);
        const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
        const parsed = JSON.parse(json);
        const diagram = sanitiseRegisteredVisual({
          ...parsed,
          type: 'schema',
          form: 'illustration',
          title: parsed.title || title,
        });
        return diagram && !diagram.pending ? { diagram, json } : null;
      };

      const first = await ask([{ role: 'user', content }]);
      if (!first) continue;
      const defects = checkIllustration(first.diagram);
      if (!defects.length) return first.diagram;
      try {
        const revised = await ask([
          { role: 'user', content },
          { role: 'assistant', content: first.json },
          { role: 'user', content: `Le contrôle du dessin a relevé ces défauts :\n- ${defects.join('\n- ')}\nRenvoie le dessin COMPLET corrigé, au même format JSON, en gardant ce qui était juste.` },
        ]);
        if (revised && checkIllustration(revised.diagram).length < defects.length) return revised.diagram;
      } catch (error) {
        console.error(`Erreur correction drawIllustration (${model}) :`, error.message);
      }
      return first.diagram;
    } catch (error) {
      console.error(`Erreur drawIllustration (${model}) :`, error.message);
    }
  }
  return null;
}

// Remplace chaque commande de dessin par l'illustration produite ; une
// commande qui échoue est retirée (jamais envoyée au navigateur).
async function resolvePendingVisuals(segments, context) {
  return Promise.all(segments.map(async (segment) => {
    // SVT : une liste de cases sur un organe ou un appareil devient un
    // vrai dessin annoté (si le dessin échoue, la liste est gardée).
    if (needsAnatomicalDrawing(segment.diagram, context)) {
      const command = anatomicalDrawingCommand(segment.diagram);
      const drawn = await drawIllustration({ ...context, draw: command.draw, title: command.title });
      return { ...segment, diagram: drawn || segment.diagram };
    }
    if (!segment.diagram?.pending) return segment;
    const diagram = await drawIllustration({ ...context, draw: segment.diagram.draw, title: segment.diagram.title });
    return { ...segment, diagram };
  })).then((list) => list.filter((segment) => segment.text || segment.diagram));
}

// Aucun schéma après la question finale : il semblait en donner la réponse
// ou illustrer autre chose. Les schémas placés après la dernière question
// sont remontés juste avant elle.
function placeDiagramsBeforeQuestion(segments) {
  const blocks = [];
  segments.forEach((segment) => {
    String(segment.text || '').split(/\n{2,}/).filter((p) => p.trim()).forEach((paragraph) => {
      // Question collée à l'explication : isolée en dernier bloc.
      const trimmed = paragraph.trim();
      const sentences = trimmed.split(/(?<=[.!?])\s+(?=\S)/);
      if (/\?\s*\S{0,3}$/.test(trimmed) && sentences.length > 1) {
        blocks.push({ text: sentences.slice(0, -1).join(' ') });
        blocks.push({ text: sentences[sentences.length - 1] });
      } else {
        blocks.push({ text: paragraph });
      }
    });
    if (segment.diagram) blocks.push({ diagram: segment.diagram });
  });

  let questionIndex = -1;
  blocks.forEach((block, index) => {
    if (block.text && /\?\s*\S{0,3}$/.test(block.text.trim())) questionIndex = index;
  });
  const lastText = blocks.map((b) => Boolean(b.text)).lastIndexOf(true);
  // La question n'est « finale » que si elle termine le texte.
  if (questionIndex >= 0 && questionIndex === lastText) {
    const moved = blocks.filter((block, index) => index > questionIndex && block.diagram);
    if (moved.length) {
      const kept = blocks.filter((block, index) => !(index > questionIndex && block.diagram));
      kept.splice(questionIndex, 0, ...moved);
      blocks.length = 0;
      blocks.push(...kept);
    }
  }

  const rebuilt = [];
  let buffer = [];
  blocks.forEach((block) => {
    if (block.text) {
      buffer.push(block.text);
    } else {
      rebuilt.push({ text: buffer.join('\n\n'), diagram: block.diagram });
      buffer = [];
    }
  });
  if (buffer.length) rebuilt.push({ text: buffer.join('\n\n'), diagram: null });
  return rebuilt.filter((segment) => segment.text || segment.diagram);
}

// Place un schéma dans le corps du texte, juste après le paragraphe qui en
// parle (le plus de mots en commun avec ses étiquettes), et toujours avant
// la question de vérification finale.
function insertVisualInSegments(segments, diagram) {
  const words = (value) => new Set(normaliseText(value).split(/\s+/).filter((w) => w.length > 3));
  const labels = words([
    diagram.title,
    ...(diagram.nodes || []).map((node) => node.label),
    ...(diagram.columns || []).map((column) => column.title),
    ...(diagram.components || []).map((component) => component.kind),
  ].filter(Boolean).join(' '));

  const target = segments.map((segment, index) => ({ segment, index })).filter(({ segment }) => segment.text && !segment.diagram).pop();
  if (!target) return [...segments, { text: '', diagram }];

  const paragraphs = target.segment.text.split(/\n{2,}/);
  // Question finale collée à l'explication (« ... Pour vérifier : ... ? ») :
  // elle devient son propre paragraphe, pour que le schéma la précède.
  const lastParagraph = paragraphs[paragraphs.length - 1].trim();
  if (/\?\s*\S{0,3}$/.test(lastParagraph)) {
    const sentences = lastParagraph.split(/(?<=[.!?])\s+(?=\S)/);
    if (sentences.length > 1) {
      paragraphs.splice(paragraphs.length - 1, 1, sentences.slice(0, -1).join(' '), sentences[sentences.length - 1]);
    }
  }
  const lastIsQuestion = paragraphs.length > 1 && /\?\s*\S{0,3}$/.test(paragraphs[paragraphs.length - 1].trim());
  const candidates = paragraphs.length - (lastIsQuestion ? 1 : 0);

  let best = candidates - 1;
  let bestScore = 0;
  paragraphs.slice(0, candidates).forEach((paragraph, index) => {
    const own = words(paragraph);
    const score = [...labels].filter((w) => own.has(w)).length;
    if (score > bestScore) { best = index; bestScore = score; }
  });

  const before = paragraphs.slice(0, best + 1).join('\n\n');
  const after = paragraphs.slice(best + 1).join('\n\n');
  return [
    ...segments.slice(0, target.index),
    { text: before, diagram },
    ...(after ? [{ text: after, diagram: null }] : []),
    ...segments.slice(target.index + 1),
  ];
}

// ---------------------------------------------------------------------
// Schéma obligatoire (sciences, mathématiques).
// 1. Un schéma exact du registre si la notion y correspond (en évitant de
//    répéter à l'identique le schéma du message précédent) ;
// 2. sinon, un appel court et dédié qui ne produit QUE le schéma, ou
//    {"diagram":null} si la notion n'est réellement pas représentable.
// ---------------------------------------------------------------------

function sameVisual(a, b) {
  if (!a || !b || a.type !== b.type) return false;
  return JSON.stringify(a.highlight || a.elements || a.points || null)
    === JSON.stringify(b.highlight || b.elements || b.points || null);
}

async function buildRequiredVisual({
  userMessage, recentUserMessages, reply, activity, topic, subjectName, previousVisual, allowRepeat = true,
}) {
  // Figure décrite dans l'explication (« un rectangle de 5 cm sur 3 cm ») :
  // dessinée à l'échelle par le backend, sans appel au modèle.
  const figure = inferFigureFromText(reply);
  if (figure) return figure;

  // Schéma exact du registre, choisi sur la question de l'élève et la
  // notion de la séance — jamais sur le seul texte de la réponse (un mot
  // comme « bouche » y faisait afficher l'appareil digestif pendant un
  // cours sur la respiration).
  const registered = resolveRequestedVisual({
    userMessage,
    recentUserMessages,
    activity,
    topic,
  });

  if (registered) {
    // Une réexplication redonne le schéma (il manquait en test réel) ; seul
    // un simple suivi évite de répéter à l'identique le schéma précédent.
    return !allowRepeat && sameVisual(registered.diagram, previousVisual) ? null : registered.diagram;
  }

  const system = `Tu produis UNIQUEMENT les données du schéma qui accompagne une explication, pour un élève du secondaire, en ${subjectName}.
Dans cette matière, le schéma est obligatoire dès que la notion expliquée peut se représenter. Réponds {"diagram":null} UNIQUEMENT si la notion est purement abstraite et qu'aucun schéma ne peut aider.
Réponds uniquement par un bloc :
<explanation-data>{"diagram":{...}}</explanation-data>
ou, exceptionnellement : <explanation-data>{"diagram":null}</explanation-data>

Formats autorisés :
- figure avec ses dimensions (le système la dessine à l'échelle, préfère ce format pour une figure) : {"type":"rectangle","width":5,"height":3,"unit":"cm"} ; {"type":"square","side":4,"unit":"cm"} ; {"type":"circle","radius":3,"unit":"cm"}
- figure par points : {"type":"triangle|right-triangle|parallelogram","points":{"A":{"x":..,"y":..},...},"labels":true,"measurements":{"A-B":"5 cm"}} (x de 0 à 500, y de 0 à 320, noms de points en lettres majuscules ; pour un repère, des coordonnées, une courbe ou des vecteurs, utilise le graphique mathématique « graph » ci-dessous)
- angle : {"type":"angle","angleDegrees":45}
${describeRegisteredVisuals().replace(/<\/?explanation-data>/g, '')}
Le schéma doit être scientifiquement exact et utiliser EXACTEMENT les nombres, mesures et mots du texte envoyé à l'élève. Il illustre la notion principale du texte.`;

  const content = `Notion de la séance : ${cleanBookName(topic || activity || '', 200)}\nQuestion de l'élève : ${shortText(userMessage, 400)}\nTexte envoyé : ${shortText(reply, 2500)}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await createMessage({
        model: VISUAL_MODELS[attempt] || VISUAL_MODELS[VISUAL_MODELS.length - 1],
        max_tokens: 900,
        system: attempt === 0
          ? system
          : `${system}\n\nIMPORTANT : fournis un schéma valide et simple de la notion principale du texte.`,
        messages: [{ role: 'user', content }],
      });

      const raw = responseText(response);
      let diagram = extractExplanationSegments(raw).find((segment) => segment.diagram)?.diagram || null;
      if (needsAnatomicalDrawing(diagram, { subjectName, topic })) {
        const command = anatomicalDrawingCommand(diagram);
        diagram = (await drawIllustration({ draw: command.draw, title: command.title, subjectName, activity, topic, reply })) || diagram;
      }
      if (diagram?.pending) {
        diagram = await drawIllustration({ draw: diagram.draw, title: diagram.title, subjectName, activity, topic, reply });
      }
      if (diagram) return diagram;
      if (/"diagram"\s*:\s*null/.test(raw) && attempt === 1) return null;
    } catch (error) {
      console.error('Erreur buildRequiredVisual :', error.message);
    }
  }

  return null;
}

function buildUnavailableVisualInstruction(explanationInstruction) {
  return `${explanationInstruction}

L'élève a demandé à voir un schéma. Fournis-le avec un bloc <explanation-data> valide (forme de schéma générique, illustration, figure géométrique ou circuit), placé dans ton texte à l'endroit où tu en parles. Sinon, dis simplement que tu ne peux pas dessiner cette notion ici et décris-la avec des mots : n'annonce jamais un schéma que tu ne fournis pas.`;
}

async function inferTutorIntent({ phase, lastAssistantMessage, userMessage }) {
  const fallback = { intent: 'OTHER', confidence: 0 };

  try {
    const response = await createMessage({
      model: 'claude-haiku-4-5',
      max_tokens: 320,
      system: `Tu es le classifieur d'intention d'un tuteur scolaire.

Tu dois comprendre le SENS du message de l'élève dans son contexte, et non rechercher une phrase exacte.
Comprends le français naturel, les fautes d'orthographe, les abréviations, les réponses très courtes, les formulations familières et les phrases qui dépendent du dernier message du tuteur.

Le dernier message du tuteur est indispensable : "oui", "d'accord", "ça va", "je vois" ou une autre réponse courte peut avoir des sens différents selon la question précédente.

Retourne UNIQUEMENT un JSON valide sur une seule ligne :
{"intent":"...","confidence":0.00}

Intentions autorisées :
UNDERSTOOD, NOT_UNDERSTOOD, EXAMPLE_REQUEST, PARTIAL_UNDERSTANDING, UNCERTAIN,
VISUAL_REQUEST, CORRECTION_OF_TUTOR, ACCEPT_PROPOSED_EXERCISE, NEW_EXERCISE_REQUEST,
FOLLOW_UP_QUESTION, BOOK_PROVIDED, AMBIGUOUS, OTHER.

Règles importantes :
- UNDERSTOOD signifie que l'élève exprime réellement qu'il a compris la notion ou l'explication.
- Ne cherche jamais une formulation exacte. Interprète le sens.
- "oui", "ok", "d'accord" ou "ça va" seuls ne suffisent pas automatiquement pour conclure UNDERSTOOD.
- Si l'élève dit qu'il comprend mieux, que c'est plus clair, qu'il voit maintenant, qu'il a compris, ou qu'il peut expliquer la notion, cela doit être UNDERSTOOD lorsque le cœur de son message confirme qu'il a compris.
- Si l'élève doute de sa propre compréhension (« je crois avoir compris mais je ne suis pas sûr »), utilise UNCERTAIN.
- Si le dernier message du tuteur pose une question de vérification et que l'élève y RÉPOND : réponse juste → UNDERSTOOD ; réponse en partie juste → PARTIAL_UNDERSTANDING ; réponse fausse → NOT_UNDERSTOOD. Juge le sens scientifique, pas l'orthographe.
- « oui » ou « ok » ne répond pas à une question ouverte de vérification : utilise AMBIGUOUS.
- Si l'élève demande à voir un schéma, une image ou un dessin, utilise VISUAL_REQUEST.
- Les fautes ne changent pas le sens évident.
- NOT_UNDERSTOOD correspond à une incompréhension explicite.
- PARTIAL_UNDERSTANDING correspond à une compréhension encore incomplète.
- EXAMPLE_REQUEST correspond à une demande d'exemple ou de schéma supplémentaire avant validation complète.
- Si l'élève corrige une erreur du tuteur, utilise CORRECTION_OF_TUTOR.
- Si l'élève accepte explicitement de commencer l'exercice, utilise ACCEPT_PROPOSED_EXERCISE ou NEW_EXERCISE_REQUEST.
- Si l'élève pose une autre question sur la notion, utilise FOLLOW_UP_QUESTION.
- En cas de doute réel, utilise AMBIGUOUS ou OTHER avec une confiance faible.
- La confiance doit être comprise entre 0 et 1.

État pédagogique : ${phase}
Dernier message du tuteur : ${JSON.stringify(String(lastAssistantMessage || '').slice(-3500))}
Message de l'élève : ${JSON.stringify(String(userMessage || '').slice(0, 2500))}`,
      messages: [{
        role: 'user',
        content: String(userMessage || '').trim(),
      }],
    });

    const raw = responseText(response);
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '');

    const allowed = new Set([
      'UNDERSTOOD',
      'NOT_UNDERSTOOD',
      'EXAMPLE_REQUEST',
      'PARTIAL_UNDERSTANDING',
      'UNCERTAIN',
      'VISUAL_REQUEST',
      'CORRECTION_OF_TUTOR',
      'ACCEPT_PROPOSED_EXERCISE',
      'NEW_EXERCISE_REQUEST',
      'FOLLOW_UP_QUESTION',
      'BOOK_PROVIDED',
      'AMBIGUOUS',
      'OTHER',
    ]);

    if (!allowed.has(parsed.intent) || !Number.isFinite(Number(parsed.confidence))) {
      return fallback;
    }

    return {
      intent: parsed.intent,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence))),
    };
  } catch (error) {
    console.error('Erreur inferTutorIntent :', error.message);
    return fallback;
  }
}

// =====================================================================
// OUTILS — CATALOGUE DE MANUELS ET RÉFÉRENCES
// =====================================================================

function normaliseBookText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cleanBookName(value, max = 180) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function extractBookSelection(userMessage) {
  const raw = cleanBookName(userMessage);
  if (!raw) {
    return { name: null, publisher: null, level: null, series: null };
  }

  let name = raw
    .replace(
      /^(j['’]utilise|j utilise|mon manuel est|mon livre est|c['’]est|c est|le manuel est|le livre est)\s+/i,
      ''
    )
    .trim();

  let level = null;
  let series = null;

  const levelMatch = name.match(
    /\b(6e|6eme|6ème|5e|5eme|5ème|4e|4eme|4ème|3e|3eme|3ème|2nde|2nd|seconde|1ere|1ère|premiere|première|tle|terminale)\b/i
  );

  if (levelMatch) {
    const token = normaliseBookText(levelMatch[1]);
    const levelMap = {
      '6e': '6ème',
      '6eme': '6ème',
      '5e': '5ème',
      '5eme': '5ème',
      '4e': '4ème',
      '4eme': '4ème',
      '3e': '3ème',
      '3eme': '3ème',
      '2nde': 'Seconde',
      '2nd': 'Seconde',
      seconde: 'Seconde',
      '1ere': 'Première',
      premiere: 'Première',
      tle: 'Terminale',
      terminale: 'Terminale',
    };

    level = levelMap[token] || null;
    name = name.replace(levelMatch[0], '').replace(/\s+/g, ' ').trim();
  }

  const seriesMatch = raw.match(
    /\b(?:2nd|2nde|seconde|1ere|1ère|premiere|première|tle|terminale)\s+([A-Za-z0-9][A-Za-z0-9 -]{0,20})\b/i
  );

  if (seriesMatch) {
    series = cleanBookName(seriesMatch[1], 40).toUpperCase();
  }

  return {
    name: name || raw,
    publisher: null,
    level,
    series,
  };
}

// Un titre de manuel n'est ni une question, ni une demande, ni une
// réponse de compréhension.
function looksLikeBookTitle(message) {
  const text = String(message || '').trim();
  const normalized = normaliseText(text);
  if (!normalized || text.includes('?')) return false;
  if (normalized.split(' ').length > 12) return false;
  if (detectVisualRequest(text) || isExerciseRequest(text)) return false;
  if (classifyUnderstandingMessage(text) !== 'UNKNOWN') return false;
  return !/^(c est quoi|pourquoi|comment|quel|quelle|est ce|je ne|j ai pas|je n ai|oui|non|ok|d accord|merci|attends?|donne|montre|explique|aide)\b/.test(normalized);
}

function buildBookSearchTerms({
  book,
  subjectName,
  level,
  series,
  activity,
  topic,
}) {
  return [
    cleanBookName(book),
    cleanBookName(subjectName),
    cleanBookName(level),
    cleanBookName(series),
    cleanBookName(topic),
    cleanBookName(activity),
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 500);
}

function referenceMatchesContext(reference, context) {
  const norm = normaliseBookText;

  const same = (a, b) => {
    if (!a || !b) return true;
    return norm(a) === norm(b);
  };

  if (!same(reference.subject, context.subjectName)) return false;
  if (!same(reference.level, context.level)) return false;
  if (!same(reference.series, context.series)) return false;

  const topic = norm(context.topic);
  const refTopic = norm(reference.topic);

  if (topic && refTopic) {
    return (
      refTopic === topic
      || refTopic.includes(topic)
      || topic.includes(refTopic)
    );
  }

  return true;
}

function getReferenceNavigation(reference) {
  const page = Number(reference.pageNumber);
  const exercise = cleanBookName(reference.exerciseNumber, 80);

  if (!Number.isInteger(page) || page <= 0 || !exercise) {
    return null;
  }

  return {
    page,
    exercise,
    label: `page ${page}, exercice ${exercise}`,
  };
}

async function findVerifiedBookReference(req, {
  bookName,
  subjectName,
  level,
  series,
  activity,
  topic,
}) {
  if (!level || !subjectName || !bookName) return null;

  const [rows] = await req.db.query(
    `SELECT
       r.id AS referenceId,
       r.book_id AS bookId,
       r.class_label AS level,
       r.series_label AS series,
       r.subject_name AS subject,
       r.topic,
       r.page AS pageNumber,
       r.exercise_number AS exerciseNumber,
       r.status,
       r.confidence_score AS confidenceScore,
       b.title AS bookTitle,
       b.publisher AS publisher
     FROM assistant_book_references r
     JOIN assistant_books b
       ON b.id = r.book_id
     LEFT JOIN assistant_book_aliases ba
       ON ba.book_id = b.id
     WHERE b.active = 1
       AND r.status = 'verified'
       AND (
         LOWER(b.title) LIKE ?
         OR LOWER(ba.alias) LIKE ?
       )
       AND LOWER(r.subject) = LOWER(?)
       AND LOWER(r.level) = LOWER(?)
       AND (
         ? IS NULL
         OR LOWER(COALESCE(r.series, '')) = LOWER(?)
       )
       AND r.page_number IS NOT NULL
       AND r.exercise_number IS NOT NULL
     ORDER BY
       CASE WHEN LOWER(b.title) = LOWER(?) THEN 0 ELSE 1 END,
       COALESCE(r.confidence_score, 0) DESC,
       r.id DESC
     LIMIT 20`,
    [
      `%${bookName}%`,
      `%${bookName}%`,
      subjectName,
      level,
      series || null,
      series || null,
      bookName,
    ]
  );

  for (const row of rows) {
    const candidate = {
      ...row,
      pageNumber: row.pageNumber,
      exerciseNumber: row.exerciseNumber,
    };

    if (!referenceMatchesContext(candidate, {
      subjectName,
      level,
      series,
      activity,
      topic,
    })) {
      continue;
    }

    const navigation = getReferenceNavigation(candidate);
    if (!navigation) continue;

    if (Number(candidate.confidenceScore || 0) < 85) continue;

    const [evidenceRows] = await req.db.query(
      `SELECT
         id,
         source_url AS sourceUrl,
         source_title AS sourceTitle,
         source_type AS sourceType,
         source_independence_key AS sourceIndependenceKey
       FROM assistant_reference_evidence
       WHERE reference_id = ?
       ORDER BY id ASC`,
      [candidate.referenceId]
    );

    const validEvidence = evidenceRows.filter(
      (evidence) => evidence.sourceUrl && evidence.sourceTitle
    );

    const strongSource = validEvidence.some((evidence) =>
      ['publisher', 'institutional', 'official', 'catalog'].includes(
        normaliseBookText(evidence.sourceType)
      )
    );

    const independentSources = new Set(
      validEvidence
        .map((evidence) => evidence.sourceIndependenceKey)
        .filter(Boolean)
    );

    if (!strongSource && independentSources.size < 2) {
      continue;
    }

    return {
      ...candidate,
      navigation,
      evidenceCount: validEvidence.length,
      independentSourceCount: independentSources.size,
    };
  }

  return null;
}

async function createBookSearchJob(req, {
  conversationId,
  bookName,
  subjectName,
  level,
  series,
  activity,
  topic,
}) {
  const query = buildBookSearchTerms({
    book: bookName,
    subjectName,
    level,
    series,
    activity,
    topic,
  });

  try {
    const [result] = await req.db.query(
      `INSERT INTO assistant_book_search_jobs
       (
         conversation_id,
         query,
         status
       )
       VALUES (?, ?, 'pending')`,
      [conversationId, query]
    );

    return result.insertId;
  } catch (error) {
    console.error(
      'Impossible de créer le job de recherche du manuel :',
      error.message
    );
    return null;
  }
}

function buildBookReferenceReply(bookName, reference) {
  return `J'ai trouvé une référence vérifiée dans ${bookName} : ${reference.navigation.label}. Ouvre ton manuel à cette page : nous allons maintenant travailler la même notion avec un exercice d'application.`;
}

function buildBookExerciseInstruction({ bookName, reference, subjectName, level, series, activity, topic }) {
  const page = reference?.navigation?.page || reference?.pageNumber || 'référence vérifiée';
  const exerciseNumber = reference?.navigation?.exercise || reference?.exerciseNumber || 'lié à la notion';
  const referenceTopic = cleanBookName(reference?.topic || topic || activity || 'la notion étudiée', 180);

  return `Après deux exercices réussis sur la notion étudiée en classe, l'élève travaille maintenant avec son manuel personnel.

Manuel indiqué par l'élève : ${cleanBookName(bookName, 180)}.
Matière : ${cleanBookName(subjectName, 100)}.
Promotion / niveau : ${cleanBookName(level, 80)}.
Série : ${cleanBookName(series, 80)}.
Activité de classe : ${cleanBookName(activity, 180)}.
Notion ciblée : ${referenceTopic}.
Référence vérifiée dans le catalogue : page ${page}, exercice ${exerciseNumber}.

Génère un exercice ORIGINAL qui fait travailler la même notion que la référence du manuel. Ne recopie pas le contenu du manuel. L'exercice doit être adapté au niveau de l'élève et plus exigeant que les deux premiers exercices.

Retourne exactement un bloc <exercise-data> avec le format structuré habituel. Si un schéma est nécessaire, ajoute un diagramme structuré. Pour les angles, utilise uniquement angleDegrees.

Le texte visible doit indiquer clairement le nom du manuel, la page et l'exercice de référence, puis présenter l'exercice proposé. Ne prétends pas que l'exercice généré est une reproduction exacte du manuel.`;
}

function buildBookUnavailableReply(bookName, subjectName) {
  return `Je n'ai pas trouvé une référence suffisamment fiable pour ${bookName} en ${subjectName}. Je préfère ne pas inventer une page ou un exercice. Je peux continuer avec un nouvel exercice original sur cette notion.`;
}

// GET /subjects/:eleveId
// =====================================================================
//
// Liste les entrées de cahier de texte disponibles pour cet élève.
// =====================================================================

router.get('/subjects/:eleveId', authenticateParent, async (req, res) => {
  const { eleveId } = req.params;

  try {
    const eleve = await getEleveDuParentOr403(req, res, eleveId);

    if (!eleve) {
      return;
    }

    const [rows] = await req.db.query(
      `SELECT
         t.id AS testId,
         t.date,
         t.activite,
         m.id AS matiereId,
         m.nom AS matiereNom
       FROM tests t
       JOIN matieres m ON t.matière_id = m.id
       WHERE t.classe_id = ?
         AND t.Annee_scolaire_id = ?
         AND t.etablissement_id = ?
       ORDER BY t.date DESC`,
      [
        eleve.classe_id,
        eleve.Annee_scolaire_id,
        eleve.etablissement_id,
      ]
    );

    res.json({
      assistants: rows,
    });
  } catch (err) {
    console.error(
      'Erreur GET /assistant/subjects :',
      err
    );

    res.status(500).json({
      message: 'Erreur lors de la récupération des assistants.',
    });
  }
});

// =====================================================================
// GET /matieres/:eleveId
// =====================================================================
//
// Un assistant par matière. Pour chacune : les parties du programme déjà
// abordées en classe (une discussion chacune, rangées par SA dans l'ordre du
// programme) et les séances hors programme (une discussion par séance).
// =====================================================================

router.get('/matieres/:eleveId', authenticateParent, async (req, res) => {
  try {
    const eleve = await getEleveDuParentOr403(req, res, req.params.eleveId);
    if (!eleve) return;

    const [seances] = await req.db.query(
      `SELECT t.id, t.date, t.activite, t.\`matière_id\` AS matiereId, m.nom AS matiere,
              t.programme_element_id AS elementId, t.element_termine AS termine
         FROM tests t JOIN matieres m ON m.id = t.\`matière_id\`
        WHERE t.classe_id = ? AND t.Annee_scolaire_id = ? AND t.etablissement_id = ?
        ORDER BY t.date, t.id`,
      [eleve.classe_id, eleve.Annee_scolaire_id, eleve.etablissement_id]
    );

    // Éléments cités et leurs ancêtres (pour le titre de la SA et le chemin).
    const ids = [...new Set(seances.map((x) => x.elementId).filter(Boolean))];
    const elements = new Map();
    if (ids.length) {
      const [lignes] = await req.db.query(
        `SELECT e.id, e.parent_id AS parentId, e.ordre, e.libelle, e.numero, e.titre
           FROM programme_element e
          WHERE e.programme_id IN (SELECT DISTINCT programme_id FROM programme_element WHERE id IN (?))`,
        [ids]
      );
      lignes.forEach((l) => elements.set(l.id, l));
    }
    const intituleEl = (e) => `${e.libelle}${e.numero ? ` ${e.numero}` : ''} : ${e.titre}`;
    const ancetres = (e) => {
      const chaine = [];
      let x = e && elements.get(e.parentId);
      while (x) { chaine.unshift(x); x = elements.get(x.parentId); }
      return chaine;
    };

    const parMatiere = new Map();
    seances.forEach((x) => {
      if (!parMatiere.has(x.matiereId)) parMatiere.set(x.matiereId, { matiereId: x.matiereId, nom: x.matiere, derniereDate: null, parties: new Map(), horsProgramme: [] });
      const m = parMatiere.get(x.matiereId);
      m.derniereDate = x.date;
      const el = x.elementId && elements.get(x.elementId);
      if (!el) {
        m.horsProgramme.push({ testId: x.id, activite: x.activite, date: x.date });
        return;
      }
      if (!m.parties.has(el.id)) {
        const chaine = ancetres(el);
        m.parties.set(el.id, {
          elementId: el.id,
          testId: x.id,
          titre: intituleEl(el),
          parents: chaine.map(intituleEl).join(' › '),
          sa: chaine.length ? intituleEl(chaine[0]) : intituleEl(el),
          ordre: [...chaine.map((c) => c.ordre), el.ordre],
          seances: 0,
          derniereDate: null,
          termine: false,
        });
      }
      const pt = m.parties.get(el.id);
      pt.seances += 1;
      pt.derniereDate = x.date;
      if (x.termine) pt.termine = true;
    });

    const comparer = (a, b) => {
      for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
        const d = (a[i] ?? -1) - (b[i] ?? -1);
        if (d) return d;
      }
      return 0;
    };
    const matieres = [...parMatiere.values()]
      .map((m) => ({
        ...m,
        parties: [...m.parties.values()].sort((a, b) => comparer(a.ordre, b.ordre)).map(({ ordre, ...p }) => p),
        horsProgramme: m.horsProgramme.reverse(),
      }))
      .sort((a, b) => new Date(b.derniereDate) - new Date(a.derniereDate));

    res.json({ matieres });
  } catch (err) {
    console.error('Erreur GET /assistant/matieres :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des assistants.' });
  }
});

// =====================================================================
// GET /conversation/:eleveId/:testId
// =====================================================================
//
// Historique persistant du fil de discussion lié à une entrée du cahier.
// =====================================================================

router.get(
  '/conversation/:eleveId/:testId',
  authenticateParent,
  async (req, res) => {
    const { eleveId, testId } = req.params;

    try {
      const eleve = await getEleveDuParentOr403(
        req,
        res,
        eleveId
      );

      if (!eleve) {
        return;
      }

      const [testRows] = await req.db.query(
        `SELECT id, classe_id AS classeId, \`matière_id\` AS matiereId, programme_element_id AS elementId, date
         FROM tests
         WHERE id = ?
           AND classe_id = ?
           AND Annee_scolaire_id = ?
           AND etablissement_id = ?`,
        [
          testId,
          eleve.classe_id,
          eleve.Annee_scolaire_id,
          eleve.etablissement_id,
        ]
      );

      if (testRows.length === 0) {
        return res.status(404).json({
          message:
            "Entrée de cahier de texte introuvable pour cet élève.",
        });
      }

      const filGet = await programmesMatiere.filDePartie(req.db, testRows[0]);
      const convRows = await conversationDuFil(req.db, eleveId, testId, filGet);

      if (convRows.length === 0) {
        return res.json({
          messages: [],
          inputMode: 'question',
        });
      }

      const tutorState = readTutorState(
        convRows[0].tutorState
      );

      const inputMode = getPublicTutorMode(tutorState);

      const [messageRows] = await req.db.query(
        `SELECT
           role,
           content,
           explanation_segments AS explanationSegments,
           exercise_data AS exerciseData,
           created_at AS createdAt
         FROM assistant_message
         WHERE conversation_id = ?
         ORDER BY created_at ASC, id ASC`,
        [convRows[0].id]
      );

      // Chaque message reprend ses propres schémas/exercice tels qu'ils
      // étaient au moment où il a été envoyé — sans ça, un rechargement de
      // la page ne montrerait plus que l'exercice EN COURS et perdrait tous
      // les schémas déjà expliqués plus haut dans la conversation.
      const messages = messageRows.map((row) => {
        let segments = [];
        let exercise = null;

        try {
          if (row.explanationSegments) segments = JSON.parse(row.explanationSegments) || [];
          segments = segments
            .map((segment) => ({ ...segment, diagram: upgradeStoredVisual(segment.diagram) }))
            .filter((segment) => segment.text || segment.diagram);
        } catch (_) { segments = []; }

        try {
          if (row.exerciseData) {
            const stored = publicExercise(JSON.parse(row.exerciseData));
            exercise = stored && {
              ...stored,
              diagram: upgradeStoredVisual(stored.diagram),
              questions: (stored.questions || []).map((question) => ({ ...question, diagram: upgradeStoredVisual(question.diagram) })),
            };
          }
        } catch (_) { exercise = null; }

        return {
          role: row.role,
          content: row.content,
          createdAt: row.createdAt,
          segments,
          exercise,
        };
      });

      // L'état interne reste côté serveur.
      // Le frontend reçoit uniquement un mode public.
      res.json({
        messages,
        inputMode,
        exercise: publicExercise(tutorState.exercise),
        explanationVisual: tutorState.lastExplanationVisual || null,
        explanationSegments: Array.isArray(tutorState.lastExplanationSegments)
          ? tutorState.lastExplanationSegments
          : [],
      });
    } catch (err) {
      console.error(
        'Erreur GET /assistant/conversation :',
        err
      );

      res.status(500).json({
        message:
          'Erreur lors du chargement de la conversation.',
      });
    }
  }
);

// =====================================================================
// POST /message
// =====================================================================
//
// body :
// {
//   eleveId,
//   testId,
//   userMessage
// }
//
// Le nom de l'élève, la matière et l'activité sont relus côté serveur.
// Ils ne sont jamais fournis par le client.
// =====================================================================

router.post(
  '/message',
  authenticateParent,
  async (req, res) => {
    const {
      eleveId,
      testId,
      userMessage,
    } = req.body;

    if (
      !eleveId ||
      !testId ||
      !userMessage ||
      !String(userMessage).trim()
    ) {
      return res.status(400).json({
        message: 'Champs manquants.',
      });
    }

    try {
      // ---------------------------------------------------------------
      // 1. Vérification de l'élève
      // ---------------------------------------------------------------

      const eleve = await getEleveDuParentOr403(
        req,
        res,
        eleveId
      );

      if (!eleve) {
        return;
      }

      // ---------------------------------------------------------------
      // 2. Rate limiting
      // ---------------------------------------------------------------

      const limit = checkRateLimit(
        Number(eleveId)
      );

      if (!limit.ok) {
        return res.status(429).json({
          message: limit.message,
        });
      }

      // ---------------------------------------------------------------
      // 3. Récupération du test / cahier de texte
      // ---------------------------------------------------------------

      const [testRows] = await req.db.query(
        `SELECT
           t.id,
           t.activite,
           t.date,
           t.\`matière_id\` AS matiereId,
           t.classe_id AS classeId,
           t.programme_element_id AS elementId,
           m.nom AS matiereNom,
           c.nom AS className,
           p.nom AS promotionName,
           a.nom_annee AS schoolYear,
           et.nom AS establishmentName
         FROM tests t
         JOIN matieres m
           ON t.matière_id = m.id
         JOIN classes c
           ON c.id = t.classe_id
         LEFT JOIN promotion p
           ON p.id = c.Promotion_id
         LEFT JOIN annee_scolaire a
           ON a.id = ?
         LEFT JOIN etablissement et
           ON et.id = ?
         WHERE t.id = ?
           AND t.classe_id = ?
           AND t.Annee_scolaire_id = ?
           AND t.etablissement_id = ?`,
        [
          eleve.Annee_scolaire_id,
          eleve.etablissement_id,
          testId,
          eleve.classe_id,
          eleve.Annee_scolaire_id,
          eleve.etablissement_id,
        ]
      );

      if (testRows.length === 0) {
        return res.status(404).json({
          message:
            "Entrée de cahier de texte introuvable pour cet élève.",
        });
      }

      const test = testRows[0];

      // Séance rattachée au programme : la discussion porte sur toute la
      // partie ; sa date de référence est la dernière séance de la partie.
      const fil = await programmesMatiere.filDePartie(req.db, test);
      if (fil) test.date = fil.derniereDate;

      // ---------------------------------------------------------------
      // 4. Récupération d'une petite partie de la progression passée
      // ---------------------------------------------------------------

      const [programmeRows] = await req.db.query(
        `SELECT
           id,
           date,
           activite
         FROM tests
         WHERE classe_id = ?
           AND \`matière_id\` = ?
           AND Annee_scolaire_id = ?
           AND etablissement_id = ?
           AND id <> ?
           AND (
             date < ?
             OR (
               date = ?
               AND id < ?
             )
           )
         ORDER BY date DESC, id DESC
         LIMIT 12`,
        [
          eleve.classe_id,
          test.matiereId,
          eleve.Annee_scolaire_id,
          eleve.etablissement_id,
          test.id,
          test.date,
          test.date,
          test.id,
        ]
      );

      // ---------------------------------------------------------------
      // 5. Construction du contexte pédagogique fiable
      // ---------------------------------------------------------------

      const pedagogicalContext =
        buildPedagogicalContext({
          eleve,
          test,
          programmeRows,
          programmeTexte: programmesMatiere.contexteFilTexte(fil),
        });

      // ---------------------------------------------------------------
      // 6. Récupération / création de la conversation
      // ---------------------------------------------------------------

      const convRows = await conversationDuFil(req.db, eleveId, testId, fil);

      let conversationId;

      if (convRows.length === 0) {
        const initialTutorState =
          createTutorState();

        const [insertResult] = await req.db.query(
          `INSERT INTO assistant_conversation
             (
               eleve_id,
               test_id,
               etablissement_id,
               annee_scolaire_id,
               tutor_state,
               programme_element_id
             )
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            eleveId,
            fil ? fil.premiereSeanceId : testId,
            eleve.etablissement_id,
            eleve.Annee_scolaire_id,
            JSON.stringify(initialTutorState),
            fil ? fil.elementId : null,
          ]
        );

        conversationId =
          insertResult.insertId;

        convRows.push({
          id: conversationId,
          tutorState:
            JSON.stringify(initialTutorState),
        });
      } else {
        conversationId =
          convRows[0].id;
      }

      // ---------------------------------------------------------------
      // 7. Lecture et sécurisation de l'état pédagogique
      // ---------------------------------------------------------------

      let tutorState = readTutorState(
        convRows[0].tutorState
      );

      // IMPORTANT :
      // Ne jamais remplacer une notion connue par null.
      //
      // Si l'activité actuelle contient explicitement une notion,
      // elle devient la notion de la séance.
      //
      // Si aucune notion explicite n'est détectée,
      // on conserve l'ancienne valeur éventuelle.
      if (
        pedagogicalContext.currentActivity.topic
      ) {
        tutorState.topic =
          pedagogicalContext.currentActivity.topic;
      }

      // ---------------------------------------------------------------
      // 8. Détermination du type de tour
      // ---------------------------------------------------------------

      let turnKind = 'EXPLANATION';

      let turnInstruction =
        buildExplanationInstruction({
          subjectName: test.matiereNom,
          activity: test.activite,
          topic: tutorState.topic || pedagogicalContext.currentActivity.topic,
        });

      // ---------------------------------------------------------------
      // Cas : sélection et recherche du manuel
      // ---------------------------------------------------------------

      if (tutorState.phase === TUTOR_STATES.BOOK_SELECTION) {
        const selectedBook = extractBookSelection(userMessage);
        const declinesBook = /\b(pas de (livre|manuel)|j ai pas de (livre|manuel)|je n ai pas de (livre|manuel)|aucun (livre|manuel)|sans (livre|manuel)|je (ne )?(le )?connais pas|je (ne )?sais pas (le|son) (nom|titre))\b/
          .test(normaliseText(userMessage));

        if (isExerciseRequest(userMessage) || declinesBook) {
          // Pas de manuel, ou demande d'exercice : on continue sans
          // manuel (en test réel, « donne moi un exercice » était pris
          // pour un titre de livre).
          tutorState = transitionTutorState(tutorState, TUTOR_EVENTS.BOOK_DECLINED).state;
        } else if (!selectedBook.name || !looksLikeBookTitle(userMessage)) {
          turnKind = 'BOOK_SELECTION';
          turnInstruction =
            "Le message de l'élève n'est pas un titre de manuel. Réponds-lui brièvement, puis redemande le titre exact de son manuel de cette matière (tel qu'il est écrit sur la couverture). Précise qu'il peut aussi écrire « je n'ai pas de livre » ou « donne-moi un exercice » pour continuer sans manuel. Ne donne aucune référence de page.";
        } else {
          tutorState.selectedBook = selectedBook.name;

          // Le message de l'élève est enregistré aussi sur ce chemin (il
          // disparaissait de l'historique après rechargement).
          await req.db.query(
            `INSERT INTO assistant_message
               (conversation_id, role, content)
             VALUES (?, 'user', ?)`,
            [conversationId, String(userMessage).trim()]
          );

          tutorState =
            transitionTutorState(
              tutorState,
              TUTOR_EVENTS.BOOK_PROVIDED
            ).state;

          const level = pedagogicalContext.level || selectedBook.level || null;
          const series = pedagogicalContext.series || selectedBook.series || null;

          const reference = await findVerifiedBookReference(req, {
            bookName: selectedBook.name,
            subjectName: test.matiereNom,
            level,
            series,
            activity: test.activite,
            topic: tutorState.topic,
          });

          if (reference) {
            tutorState.bookReferenceId = Number(reference.referenceId);
            tutorState.bookReferencePage = Number(reference.navigation.page);
            tutorState.bookReferenceExercise = String(reference.navigation.exercise || '');
            tutorState.bookReferenceTopic = reference.topic || tutorState.topic || test.activite;

            tutorState =
              transitionTutorState(
                tutorState,
                TUTOR_EVENTS.REFERENCE_VERIFIED
              ).state;

            const bookName = reference.bookTitle || selectedBook.name;
            const bookInstruction = buildBookExerciseInstruction({
              bookName,
              reference,
              subjectName: test.matiereNom,
              level,
              series,
              activity: test.activite,
              topic: tutorState.topic,
            });

            const bookSystemPrompt = buildSystemPrompt({
              studentFirstName: eleve.prenom,
              subjectName: test.matiereNom,
              activity: test.activite,
              activityDate: dayjs(test.date).format('YYYY-MM-DD'),
              tutorState,
              pedagogicalContext,
              turnInstruction: bookInstruction,
            });

            const bookGenerated = await generateStructuredExercise({
              systemPrompt: bookSystemPrompt,
              messages: [{
                role: 'user',
                content: `J'utilise le manuel « ${bookName} ». Donne-moi maintenant l'exercice d'application lié à la référence vérifiée de la page ${reference.navigation.page}, exercice ${reference.navigation.exercise}.`,
              }],
              subjectName: test.matiereNom,
              topic: reference.topic || tutorState.topic || test.activite,
              activity: test.activite,
              difficultyLevel: Math.max(3, tutorState.exerciseLevel || 3),
            });

            if (bookGenerated.exercise) {
              tutorState.exercise = bookGenerated.exercise;
              tutorState.attempts = 0;
              tutorState.hintsUsed = 0;
              tutorState.bookPracticeActive = true;
              tutorState.bookExerciseCount = 0;

              tutorState = transitionTutorState(
                tutorState,
                TUTOR_EVENTS.BOOK_EXERCISE_STARTED
              ).state;

              const intro = buildBookReferenceReply(bookName, reference);
              const generatedText = cleanTutorVisibleText(bookGenerated.visibleText || 'Voici ton exercice :');
              const reply = `${intro}\n\n${introWithoutExerciseText(generatedText, bookGenerated.exercise, 'Voici ton exercice :')}`;

              await req.db.query(
                `UPDATE assistant_conversation
                 SET tutor_state = ?
                 WHERE id = ?`,
                [serialiseTutorState(tutorState), conversationId]
              );

              await req.db.query(
                `INSERT INTO assistant_message
                 (conversation_id, role, content, exercise_data)
                 VALUES (?, 'assistant', ?, ?)`,
                [conversationId, reply, JSON.stringify(tutorState.exercise)]
              );

              return res.json({
                reply,
                inputMode: getPublicTutorMode(tutorState),
                exercise: publicExercise(tutorState.exercise),
                messageExercise: publicExercise(tutorState.exercise),
                explanationVisual: null,
                explanationSegments: [],
                bookReference: {
                  bookTitle: bookName,
                  page: reference.navigation.page,
                  exercise: reference.navigation.exercise,
                  topic: reference.topic || tutorState.topic || null,
                },
              });
            }

            const reply = `${buildBookReferenceReply(bookName, reference)}\n\nJe n'ai pas pu construire automatiquement l'exercice associé. Garde cette référence : page ${reference.navigation.page}, exercice ${reference.navigation.exercise}.`;

            await req.db.query(
              `UPDATE assistant_conversation
               SET tutor_state = ?
               WHERE id = ?`,
              [serialiseTutorState(tutorState), conversationId]
            );

            await req.db.query(
              `INSERT INTO assistant_message
               (conversation_id, role, content)
               VALUES (?, 'assistant', ?)`,
              [conversationId, reply]
            );

            return res.json({
              reply,
              inputMode: getPublicTutorMode(tutorState),
              exercise: null,
              bookReference: {
                bookTitle: bookName,
                page: reference.navigation.page,
                exercise: reference.navigation.exercise,
                topic: reference.topic || tutorState.topic || null,
              },
            });
          }

          await createBookSearchJob(req, {
            conversationId,
            bookName: selectedBook.name,
            subjectName: test.matiereNom,
            level,
            series,
            activity: test.activite,
            topic: tutorState.topic,
          });

          tutorState =
            transitionTutorState(
              tutorState,
              TUTOR_EVENTS.REFERENCE_UNAVAILABLE
            ).state;

          const reply = buildBookUnavailableReply(
            selectedBook.name,
            test.matiereNom
          );

          await req.db.query(
            `UPDATE assistant_conversation
             SET tutor_state = ?
             WHERE id = ?`,
            [
              serialiseTutorState(tutorState),
              conversationId,
            ]
          );

          await req.db.query(
            `INSERT INTO assistant_message
             (
               conversation_id,
               role,
               content
             )
             VALUES (?, 'assistant', ?)`,
            [conversationId, reply]
          );

          return res.json({
            reply,
            inputMode: getPublicTutorMode(tutorState),
            exercise: publicExercise(tutorState.exercise),
          });
        }
      }

      // ---------------------------------------------------------------
      // Historique : lu une seule fois, il sert à la fois au contexte des
      // intentions (« montre moi » juste après une explication) et aux
      // messages envoyés à Claude.
      // ---------------------------------------------------------------

      const [history] = await req.db.query(
        `SELECT
           role,
           content,
           exercise_data AS exerciseData
         FROM assistant_message
         WHERE conversation_id = ?
         ORDER BY created_at ASC, id ASC`,
        [conversationId]
      );

      const lastAssistantMessage = [...history]
        .reverse()
        .find((h) => h.role === 'assistant')?.content || '';

      const recentUserMessages = history
        .filter((h) => h.role === 'user')
        .slice(-3)
        .map((h) => h.content);

      // ---------------------------------------------------------------
      // Signaux déterministes : une demande explicite de schéma ou
      // d'exercice, ou une réponse de compréhension sans ambiguïté, ne
      // dépend pas d'un classifieur probabiliste (et économise un appel).
      // ---------------------------------------------------------------

      const activeTopic = tutorState.topic || pedagogicalContext.currentActivity.topic;
      const visualRequested = detectVisualRequest(userMessage);
      const exerciseRequested = !visualRequested && isExerciseRequest(userMessage);
      // Un « oui » / « non » isolé peut répondre à une question de
      // vérification (« les aliments passent-ils dans le foie ? ») : seul
      // le classifieur contextuel, qui voit la question, peut le juger.
      const isBareReply = /^(oui|non|ok|okay|d accord|pas vraiment|pas du tout|non pas vraiment)$/
        .test(normaliseText(userMessage));
      const localUnderstanding = isBareReply
        ? 'UNKNOWN'
        : classifyUnderstandingMessage(userMessage);

      const visualPolicy = getSubjectVisualPolicy(test.matiereNom);

      // Pendant un exercice, « montre moi » concerne l'exercice en cours.
      const exerciseContext = [TUTOR_STATES.APPLICATION_EXERCISE, TUTOR_STATES.APPLICATION_RETRY].includes(tutorState.phase)
        && tutorState.exercise
        ? [formatExerciseForTranscript(tutorState.exercise)]
        : [];

      const requestedVisual = visualRequested && visualPolicy !== 'none'
        ? resolveRequestedVisual({
          userMessage,
          recentUserMessages: [...recentUserMessages, ...exerciseContext],
          lastAssistantMessage,
          activity: test.activite,
          topic: activeTopic,
        })
        : null;

      const explanationContext = {
        subjectName: test.matiereNom,
        activity: test.activite,
        topic: activeTopic,
      };

      function visualTurnInstruction() {
        if (visualPolicy === 'none') {
          return `${buildExplanationInstruction(explanationContext)}

L'élève demande un schéma ou une image. Ici, tu ne peux pas afficher de schéma : dis-le-lui gentiment en une phrase (sans dire que la matière « n'en a pas besoin » et sans la comparer à d'autres matières), puis aide-le tout de suite autrement (exemples, phrases modèles, étapes, repères précis) pour qu'il se représente bien la notion.`;
        }

        return requestedVisual
          ? buildVisualTurnInstruction(requestedVisual)
          : buildUnavailableVisualInstruction(buildExplanationInstruction(explanationContext));
      }

      let naturalIntent = null;

      // ---------------------------------------------------------------
      // Compréhension sémantique du message de l'élève.
      // Claude n'est consulté que si les signaux déterministes ne
      // suffisent pas (réponse à une question de vérification, message
      // ambigu, formulation inhabituelle).
      // ---------------------------------------------------------------

      if (
        tutorState.phase === TUTOR_STATES.UNDERSTANDING_CHECK
        || tutorState.phase === TUTOR_STATES.FOLLOW_UP
      ) {
        if (visualRequested) {
          naturalIntent = { intent: 'VISUAL_REQUEST', confidence: 1 };
        } else if (exerciseRequested) {
          naturalIntent = { intent: 'NEW_EXERCISE_REQUEST', confidence: 1 };
        } else if (['UNDERSTOOD', 'NOT_UNDERSTOOD', 'UNCERTAIN', 'PARTIAL_UNDERSTANDING'].includes(localUnderstanding)) {
          naturalIntent = { intent: localUnderstanding, confidence: 0.9 };
        } else {
          naturalIntent = await inferTutorIntent({
            phase: tutorState.phase,
            lastAssistantMessage,
            userMessage,
          });
        }

        // Filet de sécurité si le classifieur n'a pas produit de décision.
        if (
          !naturalIntent ||
          !naturalIntent.intent ||
          !Number.isFinite(Number(naturalIntent.confidence))
        ) {
          naturalIntent = { intent: 'AMBIGUOUS', confidence: 0.30 };
        }
      }

      // ---------------------------------------------------------------
      // Cas : suivi après une référence vérifiée
      // ---------------------------------------------------------------

      if (
        tutorState.phase === TUTOR_STATES.BOOK_REFERENCE
        || tutorState.phase === TUTOR_STATES.FOLLOW_UP
      ) {
        if (tutorState.phase === TUTOR_STATES.BOOK_REFERENCE) {
          tutorState =
            transitionTutorState(
              tutorState,
              TUTOR_EVENTS.FOLLOW_UP_REQUESTED
            ).state;
        }

        if (visualRequested) {
          turnKind = 'SHOW_VISUAL';
          turnInstruction = visualTurnInstruction();
        } else if (
          exerciseRequested
          || (['ACCEPT_PROPOSED_EXERCISE', 'NEW_EXERCISE_REQUEST'].includes(naturalIntent?.intent)
            && Number(naturalIntent?.confidence) >= 0.7)
        ) {
          // « oui vas y donne » après une proposition d'exercice : un vrai
          // exercice est généré (il était improvisé en texte, sans carte).
          turnKind = 'GENERATE_EXERCISE';
          turnInstruction = buildExerciseGenerationInstruction(
            tutorState.exerciseLevel || 1,
            { requestedByStudent: true, visualPolicy }
          );
        } else {
          turnKind = 'FOLLOW_UP';

          turnInstruction =
            "Réponds à la question de suivi de l'élève en restant strictement sur l'activité et la notion déjà travaillées. Ne donne jamais une nouvelle page de manuel sans référence vérifiée.";
        }
      }

      // ---------------------------------------------------------------
      // Cas : l'élève doit confirmer sa compréhension.
      // ---------------------------------------------------------------

      else if (
        tutorState.phase === TUTOR_STATES.UNDERSTANDING_CHECK
      ) {
        const intent = naturalIntent?.intent || 'OTHER';
        const confidence = Number(naturalIntent?.confidence || 0);

        if (intent === 'VISUAL_REQUEST' && confidence >= 0.7) {
          turnKind = 'SHOW_VISUAL';
          turnInstruction = visualTurnInstruction();
        } else if (
          (intent === 'UNDERSTOOD' ||
            intent === 'ACCEPT_PROPOSED_EXERCISE' ||
            intent === 'NEW_EXERCISE_REQUEST') &&
          confidence >= 0.70
        ) {
          // Une compréhension déclarée est vérifiée par un exercice :
          // c'est l'exercice, pas le « oui j'ai compris », qui fait foi.
          // En revanche, après une bonne réponse à la question de
          // vérification, on félicite et on PROPOSE l'exercice (lancer un
          // exercice sans demande était relevé à chaque test réel).
          if (intent === 'UNDERSTOOD' && isBareReply) {
            // « oui », « ok », « d'accord » seuls ne prouvent rien (cas réels :
            // « Super ! Tu as compris » sur un simple « oui ») : on redemande
            // une vraie réponse, sans féliciter.
            turnKind = 'CLARIFY_UNDERSTANDING';
            turnInstruction = "L'élève a seulement répondu « oui » (ou « ok ») : ce n'est PAS une preuve de compréhension. Ne le félicite pas et ne dis pas qu'il a compris. Repose ta question de vérification (ou une nouvelle question courte sur la notion) qui demande une vraie production : un calcul, un exemple, une justification ou une définition avec ses mots. Jamais une question à laquelle on répond par oui ou non.";
          } else if (intent === 'UNDERSTOOD' && localUnderstanding === 'UNKNOWN') {
            turnKind = 'PROPOSE_EXERCISE';
            turnInstruction = "L'élève vient de répondre juste à ta question de vérification. Dis-lui précisément en une ou deux phrases pourquoi sa réponse est juste (sans saluer), puis propose-lui un petit exercice pour s'entraîner (« Veux-tu un petit exercice pour t'entraîner ? »). N'écris pas l'exercice toi-même.";
          } else {
          turnKind = 'GENERATE_EXERCISE';

          turnInstruction =
            buildExerciseGenerationInstruction(
              tutorState.exerciseLevel || 1,
              { requestedByStudent: intent !== 'UNDERSTOOD', visualPolicy }
            )
            + (intent === 'UNDERSTOOD'
              ? "\nL'élève DIT avoir compris mais ne l'a pas encore montré : ne le félicite pas pour sa compréhension (pas de « Exact », « Bravo, tu as compris ») ; annonce simplement que cet exercice va permettre de le vérifier."
              : '');
          }
        } else if (
          (intent === 'NOT_UNDERSTOOD' ||
            intent === 'EXAMPLE_REQUEST' ||
            intent === 'PARTIAL_UNDERSTANDING') &&
          confidence >= 0.70
        ) {
          turnKind = 'REEXPLAIN';

          turnInstruction =
            buildExplanationInstruction(explanationContext)
            + (intent === 'PARTIAL_UNDERSTANDING'
              ? " L'élève a compris une partie de la notion : identifie précisément ce qui manque dans sa réponse, réexplique seulement ce point avec un exemple différent, puis revérifie."
              : localUnderstanding === 'UNKNOWN'
                // L'élève a répondu (faux) à la question de vérification.
                ? " L'élève vient de répondre à ta question de vérification et sa réponse est fausse. Ne lui donne pas la bonne réponse : dis-lui clairement que ce n'est pas juste, explique ce qui ne va pas dans SA réponse, donne un indice, puis pose une nouvelle question de vérification différente."
                : " L'élève n'a pas compris : change réellement l'angle pédagogique (autre exemple de la vie quotidienne, autres mots, étapes plus petites) au lieu de répéter la même explication, puis revérifie.");
        } else if (intent === 'UNCERTAIN' && confidence >= 0.70) {
          // Incertitude : ni réexplication complète, ni exercice. On
          // rassure et on pose une vraie question de vérification.
          turnKind = 'VERIFY_UNDERSTANDING';

          turnInstruction =
            "L'élève n'est pas sûr d'avoir compris. Rassure-le en une phrase, récapitule l'essentiel de la notion en une ou deux phrases, puis pose UNE question de vérification courte et précise, sans donner la réponse. Ne lance pas encore d'exercice.";
        } else if (intent === 'FOLLOW_UP_QUESTION' && confidence >= 0.5) {
          // Nouvelle question sur la notion (« à quoi sert l'estomac ? ») :
          // c'est une vraie explication, pas une simple précision.
          turnKind = 'ANSWER_QUESTION';

          turnInstruction =
            `${buildExplanationInstruction(explanationContext)} Réponds d'abord précisément à la nouvelle question de l'élève, en restant dans la notion de la séance.`;
        } else {
          turnKind = 'CLARIFY_UNDERSTANDING';

          turnInstruction =
            "L'élève n'a pas confirmé clairement sa compréhension. Donne une courte précision utile, puis pose une question courte qui vérifie réellement la compréhension. Ne lance pas encore d'exercice.";
        }
      }

      // ---------------------------------------------------------------
      // Cas : exercice en cours
      // ---------------------------------------------------------------

      else if (
        [
          TUTOR_STATES.APPLICATION_EXERCISE,
          TUTOR_STATES.APPLICATION_RETRY,
        ].includes(tutorState.phase)
      ) {
        if (exerciseRequested) {
          // Nouvel exercice demandé : il remplace l'exercice en cours.
          turnKind = 'GENERATE_EXERCISE';
          turnInstruction = buildExerciseGenerationInstruction(
            tutorState.exerciseLevel || 1,
            { requestedByStudent: true, visualPolicy }
          ) + "\nL'élève demande un NOUVEL exercice : dis-lui en une phrase que tu remplaces l'exercice en cours par un nouveau, puis propose un exercice différent.";
        } else if (isBareReply && tutorState.exercise) {
          // « oui », « ok »... ne répond à aucune question : on rappelle
          // l'exercice au lieu d'envoyer ce message au correcteur.
          turnKind = 'EXERCISE_REMINDER';
        } else if (visualRequested) {
          // Le schéma est une aide : l'exercice en cours reste à faire.
          turnKind = 'SHOW_VISUAL';
          turnInstruction = `${visualTurnInstruction()}\nUn exercice est en cours : ne donne pas sa réponse et rappelle brièvement à l'élève qu'il peut ensuite y répondre.`;
        } else if (tutorState.exercise) {
          // Avant de forcer une correction, on vérifie que le message est
          // bien une tentative de réponse : sinon (hors sujet, demande
          // d'aide, contenu sensible), les règles générales doivent
          // continuer à s'appliquer normalement, exercice ou pas.
          const exerciseIntent = await classifyExerciseMessageIntent({
            exercisePrompt: tutorState.exercise.prompt,
            userMessage,
          });

          const isSideMessage =
            ['OFF_TOPIC', 'UNSAFE_OR_INAPPROPRIATE', 'HELP_REQUEST'].includes(exerciseIntent.intent)
            && exerciseIntent.confidence >= 0.6;

          if (isSideMessage) {
            turnKind = 'EXERCISE_SIDE_MESSAGE';

            turnInstruction =
              "Le message de l'élève n'est PAS une tentative de réponse à l'exercice en cours (question hors sujet, demande d'aide générale, ou sujet sensible). Réponds-lui normalement en respectant scrupuleusement toutes tes règles habituelles : reste sur le sujet de l'activité, refuse poliment un sujet dangereux ou inapproprié en suggérant d'en parler à un adulte, garde la méthode socratique si on te demande la réponse toute faite. Ne révèle jamais la réponse de l'exercice en cours : si sa question porte sur la notion d'une question de l'exercice (ex. nommer cette molécule, faire ce calcul), explique la méthode sur un AUTRE exemple (autre molécule, autres nombres), ne confirme ni n'infirme aucune réponse de l'exercice et ne recopie ni son énoncé ni ses données. Ne relance pas un nouvel exercice : celui en cours reste à faire, tu peux le lui rappeler brièvement à la fin si c'est naturel.";
          } else {
            turnKind =
              'ASSESS_EXERCISE';

            turnInstruction =
              buildExerciseAssessmentInstruction(
                tutorState.exercise
              );
          }
        } else {
          turnKind =
            'CLARIFY_UNDERSTANDING';

          turnInstruction =
            "Le suivi de l'exercice n'est pas disponible. Reprends brièvement la notion et pose une question courte qui vérifie la compréhension.";
        }
      }

      // ---------------------------------------------------------------
      // Cas : phase d'explication (premier message, ou reprise après
      // trois erreurs sur un exercice).
      // ---------------------------------------------------------------

      else if (tutorState.phase === TUTOR_STATES.EXPLANATION) {
        if (visualRequested) {
          turnKind = 'SHOW_VISUAL';
          turnInstruction = visualTurnInstruction();
        } else if (exerciseRequested) {
          turnKind = 'GENERATE_EXERCISE';
          turnInstruction = buildExerciseGenerationInstruction(
            tutorState.exerciseLevel || 1,
            { requestedByStudent: true, visualPolicy }
          );
        }
      }

      // ---------------------------------------------------------------
      // 10. Construction du prompt système
      // ---------------------------------------------------------------

      const systemPrompt =
        buildSystemPrompt({
          studentFirstName:
            eleve.prenom,
          subjectName:
            test.matiereNom,
          activity:
            test.activite,
          activityDate:
            dayjs(test.date).format(
              'YYYY-MM-DD'
            ),
          tutorState,
          pedagogicalContext,
          turnInstruction,
        });

      // ---------------------------------------------------------------
      // 11. Messages envoyés à Claude
      // ---------------------------------------------------------------

      const messages = [
        ...history.map((h) => {
          // Les questions d'un exercice ne sont affichées que dans la carte
          // d'exercice : on les ajoute au texte vu par le modèle.
          let exerciseText = '';
          if (h.role === 'assistant' && h.exerciseData) {
            try {
              exerciseText = formatExerciseForTranscript(JSON.parse(h.exerciseData));
            } catch (_) { exerciseText = ''; }
          }
          return {
            role: h.role,
            content: exerciseText && !h.content.includes(exerciseText)
              ? `${h.content}\n\n[Exercice affiché à l'élève]\n${exerciseText}`
              : h.content,
          };
        }),
        {
          role: 'user',
          content: String(userMessage).trim(),
        },
      ];

      // ---------------------------------------------------------------
      // 12. Persistance du message utilisateur
      // ---------------------------------------------------------------

      await req.db.query(
        `INSERT INTO assistant_message
           (
             conversation_id,
             role,
             content
           )
         VALUES (?, 'user', ?)`,
        [
          conversationId,
          String(userMessage).trim(),
        ]
      );

      // ---------------------------------------------------------------
      // 13. L'IA évalue directement la réponse de l'élève.
      // Le backend ne tente plus de comprendre la formulation.
      // ---------------------------------------------------------------

      // ---------------------------------------------------------------
      // 14. Appel Claude
      // ---------------------------------------------------------------

      let rawReply = '';
      let reply = '';
      let generatedExercise = null;
      let parsedAssessment = null;
      let explanationVisual = null;
      let currentExplanationSegments = [];
      // Réaffiche la carte de l'exercice en cours sous ce message (rappel).
      let reattachExercise = false;
      // Exercice présenté pour la première fois dans ce message.
      let presentedExercise = null;

      if (turnKind === 'GENERATE_EXERCISE') {
        const generated = await generateStructuredExercise({
          systemPrompt,
          messages,
          subjectName: test.matiereNom,
          topic: tutorState.topic || pedagogicalContext.currentActivity.topic,
          activity: test.activite,
          difficultyLevel: tutorState.exerciseLevel || 1,
        });

        rawReply = generated.rawReply || '';
        generatedExercise = generated.exercise;
        reply = cleanTutorVisibleText(generated.visibleText || rawReply || '');

        if (generatedExercise) {
          tutorState.exercise = generatedExercise;
        }
      } else if (turnKind === 'EXERCISE_REMINDER') {
        reply = "Pour que je puisse corriger, écris ta réponse à chaque question, par exemple « 1 : ... ». Je te remets l'exercice ci-dessous.";
        reattachExercise = true;
      } else if (turnKind === 'ASSESS_EXERCISE') {
        // Branche dédiée (plutôt que l'appel générique partagé) pour
        // pouvoir retenter strictement si Claude ne renvoie pas le bloc
        // <exercise-assessment> attendu — voir assessExerciseAnswer().
        const assessed = await assessExerciseAnswer({
          exercise: tutorState.exercise,
          userMessage,
          previouslyCorrectIds:
            tutorState.exerciseProgress?.prompt === tutorState.exercise.prompt
              ? tutorState.exerciseProgress.correctIds || []
              : [],
        });

        rawReply = assessed.rawReply || '';
        parsedAssessment = assessed.assessment;
      } else {
        // Réponse principale : modèle le plus fiable (erreurs scientifiques
        // et messages tronqués à 900 jetons en test réel), Haiku en secours.
        let aiResponse = null;
        for (const model of VISUAL_MODELS) {
          try {
            aiResponse = await createMessage({
              model,
              max_tokens: 2000,
              system: systemPrompt,
              messages,
            });
            break;
          } catch (error) {
            console.error(`Erreur réponse principale (${model}) :`, error.message);
          }
        }

        rawReply =
          responseText(aiResponse) ||
          "Désolé, je n'ai pas pu formuler de réponse.";

        // Relecture avant envoi : calculs, faits, cohérence, sécurité, langue.
        rawReply = await reviewTutorReply({
          rawReply,
          subjectName: test.matiereNom,
          levelLabel: [pedagogicalContext?.identity?.className, pedagogicalContext?.identity?.series ? `série ${pedagogicalContext.identity.series}` : ''].filter(Boolean).join(', '),
          activity: test.activite,
          history: messages,
        });

        // Le schéma de secours (identique à chaque fois, ex. les 4 types
        // d'angle) n'a de sens que lors d'une VRAIE explication. Pendant un
        // simple suivi (CLARIFY_UNDERSTANDING / FOLLOW_UP / message hors
        // exercice), la réponse doit rester explicative — comme un
        // enseignant qui commente une erreur précise — et ne doit pas
        // systématiquement recevoir un schéma générique sans rapport avec
        // la question de l'élève. (ASSESS_EXERCISE a sa propre branche
        // dédiée ci-dessus et ne passe jamais par ici.)
        const isExplanationTurnKinds = [
          'EXPLANATION', 'REEXPLAIN', 'ANSWER_QUESTION', 'SHOW_VISUAL',
        ];
        const isExplanationTurn = isExplanationTurnKinds.includes(turnKind);

        let explanationSegments = await resolvePendingVisuals(
          extractExplanationSegments(rawReply),
          {
            subjectName: test.matiereNom,
            activity: test.activite,
            topic: activeTopic,
            reply: cleanTutorVisibleText(rawReply),
          }
        );

        if (turnKind === 'SHOW_VISUAL' && requestedVisual) {
          // Le schéma demandé a été construit par le backend : il est
          // toujours présent, quel que soit le texte produit par Claude.
          const text = explanationSegments
            .map((segment) => segment.text)
            .filter(Boolean)
            .join('\n\n');
          const marker = rawReply.search(SCHEMA_MARKER);
          if (marker >= 0) {
            const before = cleanTutorVisibleText(rawReply.slice(0, marker));
            const after = cleanTutorVisibleText(rawReply.slice(marker));
            explanationSegments = [
              { text: before, diagram: requestedVisual.diagram },
              ...(after ? [{ text: after, diagram: null }] : []),
            ];
          } else {
            explanationSegments = insertVisualInSegments(
              [{ text, diagram: null }],
              requestedVisual.diagram
            );
          }
        } else if (explanationSegments.some((segment) => segment.diagram?.type === 'composite')) {
          // Un composite improvisé (cercles, rectangles étiquetés) est
          // remplacé par un schéma exact quand il en existe un : schéma du
          // registre, ou figure dimensionnée décrite dans le texte (en test
          // réel, des composites de rectangles étaient illisibles et faux).
          explanationSegments = explanationSegments.map((segment) => {
            if (segment.diagram?.type !== 'composite') return segment;
            const registered = preferRegisteredVisual(segment.diagram, {
              text: segment.text,
              userMessage,
              recentUserMessages,
            });
            if (registered !== segment.diagram) return { ...segment, diagram: registered };
            // Les étiquettes du composite (« côté = 8 cm ») décrivent souvent
            // la figure voulue.
            const labels = [
              ...(segment.diagram.elements || []).map((element) => element.label || ''),
              ...(segment.diagram.annotations || []),
            ].join(' ');
            const figure = inferFigureFromText(`${labels.includes('carr') ? 'carré ' : ''}${labels}`)
              || inferFigureFromText(segment.text)
              || inferFigureFromText(rawReply);
            return figure ? { ...segment, diagram: figure } : segment;
          });
        } else if (!explanationSegments.some((segment) => segment.diagram)) {
          if (isExplanationTurn) {
            const fallbackVisuals = buildFallbackExplanationVisuals(explanationContext);

            if (fallbackVisuals.length) {
              // Le texte de l'explication est conservé : auparavant il était
              // remplacé par les seuls schémas de secours et disparaissait.
              explanationSegments = [
                ...explanationSegments,
                ...fallbackVisuals.map((diagram) => ({
                  text: diagram.annotations?.[0] || '',
                  diagram,
                })),
              ];
            }
          }
        } else {
          explanationSegments = ensureAngleExplanationSegments(
            rawReply,
            explanationSegments,
            explanationContext
          );
        }

        // Langues, histoire-géographie, philosophie : aucun schéma, même si
        // le modèle en propose un.
        if (visualPolicy === 'none') {
          explanationSegments = explanationSegments
            .map((segment) => ({ ...segment, diagram: null }))
            .filter((segment) => segment.text);
        }

        // Sciences et mathématiques : une explication d'une notion
        // représentable doit être accompagnée d'un vrai schéma.
        if (
          visualPolicy === 'required'
          && [...isExplanationTurnKinds, 'FOLLOW_UP', 'EXERCISE_SIDE_MESSAGE'].includes(turnKind)
          && !explanationSegments.some((segment) => segment.diagram)
        ) {
          const requiredVisual = await buildRequiredVisual({
            userMessage,
            recentUserMessages,
            reply: cleanTutorVisibleText(rawReply),
            activity: test.activite,
            topic: activeTopic,
            subjectName: test.matiereNom,
            previousVisual: tutorState.lastExplanationVisual,
            allowRepeat: turnKind !== 'FOLLOW_UP',
          });

          if (requiredVisual) {
            // Réexplication : pas le même schéma que la fois précédente,
            // mais une autre vue (en test réel, schéma identique après
            // « je n'ai pas compris »). Pour un circuit, le cas opposé est
            // ajouté pour comparer.
            const repeated = turnKind === 'REEXPLAIN' && sameVisual(requiredVisual, tutorState.lastExplanationVisual);
            const alternative = repeated ? alternativeVisual(requiredVisual) : null;
            explanationSegments = insertVisualInSegments(explanationSegments, alternative || requiredVisual);
            // Circuit : le cas opposé est montré juste après, pour comparer.
            if (alternative && requiredVisual.type === 'electric-circuit') {
              const index = explanationSegments.findIndex((segment) => segment.diagram === alternative);
              explanationSegments.splice(index, 1, { ...explanationSegments[index], diagram: requiredVisual }, { text: '', diagram: alternative });
            }
          }
        }

        // Figure dimensionnée dont les mesures contredisent le texte (en
        // test réel : natte de 5 m × 3 m dessinée en cm, carré de 4 cm
        // dessiné avec 3 cm) : on redessine la figure décrite par le texte.
        explanationSegments = explanationSegments.map((segment) => {
          const diagram = segment.diagram;
          if (!diagram || !['rectangle', 'square', 'circle'].includes(diagram.type)) return segment;
          // Pas de \b après « é » (sans option Unicode, il ne marche pas :
          // « carré » n'était jamais reconnu).
          const announced = /\bcarr[eé](?![a-zà-ÿ])/i.test(segment.text) && !/rectang/i.test(segment.text) ? 'square' : null;
          const described = inferFigureFromText(segment.text, { preferType: announced })
            || inferFigureFromText(rawReply, { preferType: announced || diagram.type });
          if (!described) return segment;
          // Les mesures de la figure du modèle figurent dans le texte : elle
          // correspond à ce qui est expliqué, on la garde.
          const diagramNumbers = Object.values(diagram.measurements || {}).map((m) => String(m).match(/[\d.,]+/)?.[0]).filter(Boolean);
          const textNumbers = new Set((cleanTutorVisibleText(rawReply).match(/\d+(?:[.,]\d+)?/g) || []));
          if (diagram.type === (announced || diagram.type) && diagramNumbers.length && diagramNumbers.every((n) => textNumbers.has(n))) return segment;
          // Texte « un carré » sous un rectangle (cas réel) : on dessine la
          // figure annoncée ; sinon on corrige seulement les mesures.
          if (described.type !== diagram.type && described.type !== announced) return segment;
          const same = JSON.stringify(Object.values(described.measurements || {}).sort())
            === JSON.stringify(Object.values(diagram.measurements || {}).sort());
          return same ? segment : { ...segment, diagram: { ...described, ...(diagram.grid ? { grid: diagram.grid } : {}) } };
        });

        // Sciences et maths, hors tours d'explication (vérification,
        // précision) : une figure décrite dans le texte est dessinée aussi.
        if (visualPolicy === 'required' && !explanationSegments.some((segment) => segment.diagram)) {
          const described = inferFigureFromText(rawReply);
          if (described) explanationSegments = insertVisualInSegments(explanationSegments, described);
        }

        // Un schéma ne doit pas afficher le résultat d'une question posée à
        // l'élève (« 7 × 7 = 49 cm² » sous « combien fait 7 × 7 ? »).
        if (/\?/.test(cleanTutorVisibleText(rawReply))) {
          explanationSegments = explanationSegments.map((segment) => (
            segment.diagram && (Array.isArray(segment.diagram.annotations) || Array.isArray(segment.diagram.elements))
              ? {
                ...segment,
                diagram: {
                  ...segment.diagram,
                  ...(Array.isArray(segment.diagram.annotations) ? { annotations: segment.diagram.annotations.filter((a) => !/=\s*\d/.test(a)) } : {}),
                  ...(Array.isArray(segment.diagram.elements)
                    ? { elements: segment.diagram.elements.map((e) => (e.label && /=\s*\d/.test(e.label) ? { ...e, label: e.label.replace(/\s*=\s*\d[^,;]*$/, '') } : e)) }
                    : {}),
                },
              }
              : segment
          ));
        }

        // Un schéma suit toujours l'explication qu'il illustre et précède la
        // question de vérification (placé après, il semblait en donner la
        // réponse ou illustrer une autre figure).
        explanationSegments = placeDiagramsBeforeQuestion(explanationSegments);

        // Pendant un exercice, un schéma légendé donnerait la réponse : il
        // est affiché en mode « question » (sans noms ni état du circuit).
        if ([TUTOR_STATES.APPLICATION_EXERCISE, TUTOR_STATES.APPLICATION_RETRY].includes(tutorState.phase)) {
          explanationSegments = explanationSegments.map((segment) => (
            segment.diagram && isRegisteredVisualType(segment.diagram.type)
              ? { ...segment, diagram: toQuizVisual(segment.diagram) }
              : segment
          ));
        }

        explanationVisual = explanationSegments.find(
          (segment) => segment.diagram
        )?.diagram || null;

        reply = cleanTutorVisibleText(rawReply);

        // Exercice improvisé dans le texte (malgré la consigne) : non
        // enregistré, donc impossible à corriger. On le retire et on
        // propose un vrai exercice (cas réel sur « montre moi »).
        const stripped = stripImprovisedExercise(reply);
        if (stripped !== reply) {
          reply = stripped;
          explanationSegments = explanationSegments.map((segment) => ({ ...segment, text: stripImprovisedExercise(segment.text, { note: false }) }))
            .filter((segment) => segment.text || segment.diagram);
          if (explanationSegments.length) {
            const lastIndex = explanationSegments.length - 1;
            explanationSegments[lastIndex] = { ...explanationSegments[lastIndex], text: `${explanationSegments[lastIndex].text}\n\n${IMPROVISED_EXERCISE_NOTE}`.trim() };
          }
        }

        // Aucune réponse ne doit annoncer un schéma que l'élève ne verra pas.
        // Le texte annonce un schéma qui n'a pas été fourni : on le produit
        // (cas réels : « je vais te montrer » puis « je ne peux pas encore
        // afficher de schéma » en SVT et en EPS).
        if (!explanationVisual && visualPolicy !== 'none' && textReferencesVisual(cleanTutorVisibleText(rawReply))) {
          const promised = await buildRequiredVisual({
            userMessage,
            recentUserMessages,
            reply: cleanTutorVisibleText(rawReply),
            activity: test.activite,
            topic: activeTopic,
            subjectName: test.matiereNom,
            previousVisual: tutorState.lastExplanationVisual,
          });
          if (promised) {
            explanationSegments = placeDiagramsBeforeQuestion(insertVisualInSegments(explanationSegments, promised));
            explanationVisual = promised;
          }
        }

        if (!explanationVisual) {
          // Annonce d'un schéma absent : retirée sans phrase d'excuse (« je ne
          // peux pas encore afficher de schéma » déroutait les élèves).
          const honesty = { note: '' };
          reply = enforceVisualHonesty(reply, false, honesty).text;
          explanationSegments = explanationSegments.map((segment) => ({
            ...segment,
            text: enforceVisualHonesty(segment.text, false, honesty).text,
          }));
        }

        // Conserve tous les schémas de la dernière explication.
        tutorState.lastExplanationVisual = explanationVisual || null;
        tutorState.lastExplanationSegments = explanationSegments;
        currentExplanationSegments = explanationSegments;
      }

      // ---------------------------------------------------------------
      // 15. Traitement d'une évaluation d'exercice
      // ---------------------------------------------------------------

      if (
        turnKind === 'ASSESS_EXERCISE'
      ) {
        // Déjà extrait par assessExerciseAnswer() dans la section 14.
        let assessment = parsedAssessment;

        // Filet de sécurité : si l'évaluation de Claude est inexploitable,
        // les réponses identiques aux réponses attendues sont reconnues.
        if (!isValidAssessment(assessment, tutorState.exercise)) {
          assessment = deterministicAssessment(tutorState.exercise, userMessage);
        }

        // Questions déjà réussies à un message précédent, pour CET exercice
        // (l'élève peut répondre question par question).
        const previouslyCorrectIds =
          tutorState.exerciseProgress?.prompt === tutorState.exercise.prompt
            ? tutorState.exerciseProgress.correctIds
            : [];

        // Le verdict global est recalculé par le backend (voir
        // normaliseAssessment) : Claude ne décide pas seul de la note.
        assessment = normaliseAssessment(
          assessment,
          tutorState.exercise,
          previouslyCorrectIds
        );

        // Questions courtes : le backend vérifie chaque verdict du modèle
        // (« we walks » validé à tort, « imperative » sans accent refusé à
        // tort en test réel) et retire toute réponse glissée dans un indice.
        if (assessment) {
          assessment = crossCheckAssessment(assessment, tutorState.exercise, userMessage, previouslyCorrectIds, {
            // Fautes de frappe tolérées (« acidenté »), sauf en langue
            // étrangère où « explains » pour « explain » est une vraie erreur.
            fuzzy: !isForeignLanguageSubject(test.matiereNom),
          });
        }

        const validAssessment = Boolean(assessment);

        if (validAssessment) {
          tutorState.exerciseProgress = {
            prompt: tutorState.exercise.prompt,
            correctIds: assessment.questions
              .filter((q) => q.verdict === 'correct')
              .map((q) => q.id),
          };
        }

        const acceptedByAI =
          validAssessment && assessment.verdict === 'correct';

        const answeredOnlyPartOfExercise =
          validAssessment && ['in_progress', 'no_answer'].includes(assessment.verdict);

        // -------------------------------------------------------------
        // Correction + note + progression de niveau.
        // -------------------------------------------------------------

        if (acceptedByAI) {
          const totalQuestions = tutorState.exercise.questions.length;
          const correctQuestions = assessment.questions.filter(
            q => q.verdict === 'correct'
          ).length;
          const score = Math.round((correctQuestions / totalQuestions) * 100);

          tutorState.score = score;
          tutorState.lastAssessment = {
            score,
            verdict: assessment.verdict,
            reason: shortText(assessment.reason, 360),
            questions: assessment.questions,
          };

          tutorState =
            transitionTutorState(
              tutorState,
              TUTOR_EVENTS.ANSWER_CORRECT
            ).state;

          const previousLevel = tutorState.exerciseLevel || 1;
          const completedExercises = tutorState.completedExercises || 0;
          const nextLevel = Math.min(5, previousLevel + 1);
          tutorState.exerciseLevel = nextLevel;

          // Retour question par question, une ligne chacune ; le bilan
          // global du modèle n'est plus affiché (il contredisait parfois
          // le détail : « tu n'as pas répondu... » puis « Déjà réussie »).
          reply =
            `Bravo ${eleve.prenom} ! 🎉 Note : ${score}/100.\n\n${formatQuestionFeedback(assessment.questions)}`;

          if (tutorState.bookPracticeActive) {
            tutorState.bookExerciseCount = Math.min(100, (tutorState.bookExerciseCount || 0) + 1);

            const bookLevel = Math.min(5, Math.max(3, nextLevel));
            tutorState.exerciseLevel = bookLevel;

            reply += `\n\nTu viens de réussir un exercice directement lié à ton manuel. On continue avec une application plus exigeante de la même notion.`;

            const selectedBookName = tutorState.selectedBook || 'ton manuel';
            const bookInstruction = buildBookExerciseInstruction({
              bookName: selectedBookName,
              reference: {
                navigation: {
                  page: tutorState.bookReferencePage,
                  exercise: tutorState.bookReferenceExercise,
                },
                topic: tutorState.bookReferenceTopic || tutorState.topic,
              },
              subjectName: test.matiereNom,
              level: pedagogicalContext.level,
              series: pedagogicalContext.series,
              activity: test.activite,
              topic: tutorState.topic,
            });

            const nextBookInstruction = `${bookInstruction}\nC'est une nouvelle application de consolidation. Ne demande pas à l'élève de redonner le livre. Utilise la même référence vérifiée déjà sélectionnée et augmente légèrement la difficulté.`;

            const nextBookSystemPrompt = buildSystemPrompt({
              studentFirstName: eleve.prenom,
              subjectName: test.matiereNom,
              activity: test.activite,
              activityDate: dayjs(test.date).format('YYYY-MM-DD'),
              tutorState,
              pedagogicalContext,
              turnInstruction: nextBookInstruction,
            });

            const nextBookGenerated = await generateStructuredExercise({
              systemPrompt: nextBookSystemPrompt,
              messages: [{
                role: 'user',
                content: `Continue l'application de la notion du manuel ${selectedBookName} avec un exercice de niveau ${bookLevel}/5.`,
              }],
              subjectName: test.matiereNom,
              topic: tutorState.topic || test.activite,
              activity: test.activite,
              difficultyLevel: bookLevel,
            });

            if (nextBookGenerated.exercise) {
              tutorState.exercise = nextBookGenerated.exercise;
              tutorState.attempts = 0;
              tutorState.hintsUsed = 0;
              reply += `\n\n${introWithoutExerciseText(nextBookGenerated.visibleText, nextBookGenerated.exercise, 'Voici le prochain exercice :')}`;
              presentedExercise = nextBookGenerated.exercise;
            }
          } else if (completedExercises >= 2) {
            tutorState = transitionTutorState(
              tutorState,
              TUTOR_EVENTS.BOOK_SELECTION_REQUESTED
            ).state;

            reply += `\n\nTu as maintenant terminé deux exercices sur cette notion. Pour aller plus loin, j'aimerais travailler avec le manuel que tu utilises à la maison. Quel est le titre exact de ton livre de ${test.matiereNom} (tel qu'il est écrit sur la couverture) ?${pedagogicalContext.identity?.series ? ' Si tu peux, indique aussi la classe et la série inscrites sur le livre.' : ''} Si tu n'as pas de livre, écris simplement « je n'ai pas de livre » et on continue ensemble.`;
          } else {
            reply += `\n\nTu passes maintenant au niveau ${nextLevel}/5.`;

            // Le modèle connaît l'exercice réussi : le suivant doit être
            // différent et un peu plus difficile (en test réel, le « niveau
            // 2 » était un doublon plus facile du niveau 1).
            const nextInstruction = `${buildExerciseGenerationInstruction(nextLevel, { visualPolicy })}

Exercice que l'élève vient de réussir (ne le répète pas, ne reprends ni ses nombres ni ses phrases) :
${formatExerciseForTranscript(tutorState.exercise)}
Le nouvel exercice doit être plus exigeant : plus d'étapes, un raisonnement ou une justification en plus.`;
            const nextSystemPrompt = buildSystemPrompt({
              studentFirstName: eleve.prenom,
              subjectName: test.matiereNom,
              activity: test.activite,
              activityDate: dayjs(test.date).format('YYYY-MM-DD'),
              tutorState,
              pedagogicalContext,
              turnInstruction: nextInstruction,
            });

            const nextGenerated = await generateStructuredExercise({
              systemPrompt: nextSystemPrompt,
              messages: [{
                role: 'user',
                content: `La réponse précédente est correcte. Propose maintenant l'exercice suivant au niveau ${nextLevel}/5.`,
              }],
              subjectName: test.matiereNom,
              topic: tutorState.topic || pedagogicalContext.currentActivity.topic,
              activity: test.activite,
              difficultyLevel: nextLevel,
            });

            if (nextGenerated.exercise) {
              tutorState.exercise = nextGenerated.exercise;
              tutorState.attempts = 0;
              tutorState.hintsUsed = 0;
              reply += ` ${introWithoutExerciseText(nextGenerated.visibleText, nextGenerated.exercise, 'Voici le prochain exercice :')}`;
              presentedExercise = nextGenerated.exercise;
            }
          }
        }

        else if (!validAssessment) {
          // Rappel de l'exercice exact : l'élève sait à quoi répondre.
          reply = tutorState.exercise.questions.length === 1
            ? "Je n'ai pas réussi à corriger ta réponse cette fois-ci. Peux-tu la réécrire en une phrase complète ? Je te remets l'exercice ci-dessous."
            : "Je n'ai pas réussi à corriger ta réponse cette fois-ci. Réécris-la en indiquant le numéro de chaque question, par exemple « 1 : ... ». Je te remets l'exercice ci-dessous.";
          reattachExercise = true;
        }

        // -------------------------------------------------------------
        // Réponses justes mais exercice incomplet : ce n'est pas une
        // erreur (pas de tentative comptée), on demande la suite.
        // -------------------------------------------------------------

        else if (answeredOnlyPartOfExercise) {
          const remaining = assessment.questions
            .map((q, index) => ({ ...q, number: index + 1 }))
            .filter((q) => q.verdict === 'unanswered')
            .map((q) => q.number);
          const done = formatQuestionFeedback(assessment.questions.filter((q) => q.verdict === 'correct'), assessment.questions);

          reply = assessment.verdict === 'no_answer'
            ? `Je n'ai pas trouvé de réponse aux questions dans ton message. Réponds en indiquant le numéro de la question, par exemple « Question 1 : ... ».`
            : `${done ? `Bien joué !\n\n${done}\n\n` : ''}Il te reste ${remaining.length > 1 ? `les questions ${remaining.join(', ')}` : `la question ${remaining[0]}`} : à toi de jouer !`;
        }

        else {
          const totalQuestions = tutorState.exercise.questions.length;
          const correctQuestions = assessment.questions.filter(
            q => q.verdict === 'correct'
          ).length;
          const partialQuestions = assessment.questions.filter(
            q => q.verdict === 'partial'
          ).length;
          const remaining = assessment.questions
            .map((q, index) => ({ ...q, number: index + 1 }))
            .filter((q) => q.verdict === 'unanswered')
            .map((q) => q.number);

          // Pas de note tant que l'élève n'a pas répondu à tout : les
          // questions non traitées ne comptent pas comme des échecs
          // (une seule réponse fausse sur 3 questions donnait 0/100).
          const score = remaining.length
            ? null
            : Math.round(((correctQuestions + partialQuestions * 0.5) / totalQuestions) * 100);

          tutorState.score = score;
          tutorState.lastAssessment = {
            score,
            verdict: assessment.verdict,
            reason: shortText(assessment.reason, 360),
            questions: assessment.questions,
          };

          // Une tentative n'est comptée que sur une réponse COMPLÈTE : en
          // répondant question par question (comme demandé), l'élève
          // atteignait « 3 tentatives » et recevait « Tu as fait des
          // efforts... » alors qu'il réussissait (cas réel).
          if (!remaining.length) {
            tutorState =
              transitionTutorState(
                tutorState,
                TUTOR_EVENTS.ANSWER_INCORRECT
              ).state;
          } else if (tutorState.phase === TUTOR_STATES.APPLICATION_EXERCISE) {
            tutorState = { ...tutorState, phase: TUTOR_STATES.APPLICATION_RETRY };
          }

          const feedback = formatQuestionFeedback(
            assessment.questions.filter((q) => q.verdict !== 'unanswered'),
            assessment.questions
          );
          const noteLine = score === null ? '' : `Note de cette tentative : ${score}/100.\n\n`;
          const toRetry = assessment.questions
            .map((q, index) => ({ ...q, number: index + 1 }))
            .filter((q) => q.verdict === 'incorrect' || q.verdict === 'partial')
            .map((q) => q.number);

          if (tutorState.attempts >= 3) {
            tutorState.exerciseProgress = null;

            tutorState =
              transitionTutorState(
                tutorState,
                TUTOR_EVENTS.EXERCISE_REEXPLAINED
              ).state;

            // La réexplication est envoyée dans ce message même : on passe
            // donc à la vérification, sinon le message suivant de l'élève
            // déclenchait une nouvelle explication complète.
            tutorState =
              transitionTutorState(
                tutorState,
                TUTOR_EVENTS.EXPLANATION_SENT
              ).state;

            tutorState.exerciseLevel = Math.max(1, (tutorState.exerciseLevel || 1) - 1);

            reply =
              `${noteLine}${feedback}\n\nTu as fait des efforts. Je reprends la méthode autrement : ${trimAtWord(tutorState.exercise.solutionOutline, 600)}\n\nAprès cette explication, on reprendra avec un exercice plus simple pour consolider.`;
          } else {
            // Indice de la première question à revoir, propre à cette
            // question ; à défaut, le plan d'indices de l'exercice.
            const firstWrong = assessment.questions.find((q) => q.verdict === 'incorrect' || q.verdict === 'partial');
            const hintIndex = Math.min(
              tutorState.hintsUsed,
              Math.max(0, tutorState.exercise.hintPlan.length - 1)
            );
            // Sans indice propre à la question (retiré s'il donnait la
            // réponse), le plan d'indices général n'est utilisé que pour un
            // exercice à une seule question : sinon il parlait d'une autre
            // question que celle à revoir (cas réel).
            const wrongNumber = assessment.questions.findIndex((q) => q.id === firstWrong?.id) + 1;
            const hint = firstWrong?.hint
              || (tutorState.exercise.questions.length === 1 ? tutorState.exercise.hintPlan[hintIndex] : '')
              || `Pour la question ${wrongNumber || 1}, relis l'énoncé mot par mot et repense à ce que nous avons vu ensemble dans l'explication.`;
            tutorState.hintsUsed += 1;

            const retryLine = `Essaie encore ${toRetry.length > 1 ? `les questions ${toRetry.join(', ')}` : `la question ${toRetry[0]}`}${remaining.length ? `, puis réponds ${remaining.length > 1 ? `aux questions ${remaining.join(', ')}` : `à la question ${remaining[0]}`}` : ''}.`;

            reply =
              `${noteLine}${feedback}\n\n💡 Indice : ${trimAtWord(hint, 300)}\n\n${retryLine}`;
          }
        }
      }

      // ---------------------------------------------------------------
      // 16. Génération d'un exercice
      // ---------------------------------------------------------------

      else if (
        turnKind === 'GENERATE_EXERCISE'
      ) {
        const parsed =
          extractTaggedData(
            rawReply,
            'exercise-data'
          );

        const exercise =
          generatedExercise ||
          sanitiseExercise(
            parsed.data
          );

        if (exercise) {
          tutorState.exercise =
            exercise;

          tutorState.attempts = 0;
          tutorState.hintsUsed = 0;

          tutorState =
            transitionTutorState(
              tutorState,
              tutorState.phase === TUTOR_STATES.UNDERSTANDING_CHECK
                && naturalIntent?.intent === 'UNDERSTOOD'
                ? TUTOR_EVENTS.UNDERSTOOD
                : TUTOR_EVENTS.EXERCISE_REQUESTED
            ).state;

          // L'énoncé est affiché par la carte d'exercice : il n'est plus
          // recopié dans le texte (il apparaissait jusqu'à trois fois).
          reply = introWithoutExerciseText(
            reply && !reply.includes('<exercise-data>') ? reply : parsed.visibleText,
            exercise,
            'Très bien. Essayons ce petit exercice :'
          );
          presentedExercise = exercise;
        } else {
          // Sans structure complète, l'état ne bouge pas :
          // le backend ne peut pas corriger de manière fiable
          // un exercice mal structuré.
          // Message honnête : aucun exercice n'est affiché dans ce cas.
          reply =
            "Je n'ai pas réussi à préparer l'exercice cette fois-ci. Redemande-moi « donne-moi un exercice » dans un instant, ou pose-moi une question sur la notion.";
        }
      }

      // ---------------------------------------------------------------
      // 17. Réexplication
      // ---------------------------------------------------------------

      else if (
        turnKind === 'REEXPLAIN'
      ) {
        tutorState =
          transitionTutorState(
            tutorState,
            TUTOR_EVENTS.NOT_UNDERSTOOD
          ).state;

        tutorState =
          transitionTutorState(
            tutorState,
            TUTOR_EVENTS.EXPLANATION_SENT
          ).state;
      }

      // ---------------------------------------------------------------
      // 17 bis. Nouvelle question ou schéma pendant la vérification :
      // explication envoyée, puis nouvelle vérification.
      // (Pendant un exercice ou un suivi, le schéma est une aide et ne
      // change pas l'étape.)
      // ---------------------------------------------------------------

      else if (
        (turnKind === 'ANSWER_QUESTION' || turnKind === 'SHOW_VISUAL')
        && tutorState.phase === TUTOR_STATES.UNDERSTANDING_CHECK
      ) {
        tutorState =
          transitionTutorState(
            tutorState,
            TUTOR_EVENTS.QUESTION_ASKED
          ).state;

        tutorState =
          transitionTutorState(
            tutorState,
            TUTOR_EVENTS.EXPLANATION_SENT
          ).state;
      }

      // ---------------------------------------------------------------
      // 18. Première explication
      // ---------------------------------------------------------------

      else if (
        (turnKind === 'EXPLANATION' || turnKind === 'SHOW_VISUAL') &&
        tutorState.phase ===
          TUTOR_STATES.EXPLANATION
      ) {
        tutorState =
          transitionTutorState(
            tutorState,
            TUTOR_EVENTS.EXPLANATION_SENT
          ).state;
      }

      reply = cleanTutorVisibleText(reply);

      // ---------------------------------------------------------------
      // 20. Sauvegarde de l'état pédagogique
      // ---------------------------------------------------------------

      await req.db.query(
        `UPDATE assistant_conversation
         SET tutor_state = ?
         WHERE id = ?`,
        [
          serialiseTutorState(
            tutorState
          ),
          conversationId,
        ]
      );

      // ---------------------------------------------------------------
      // 21. Sauvegarde de la réponse de l'assistant
      // ---------------------------------------------------------------
      //
      // Chaque message garde ses propres schémas et son propre exercice,
      // plutôt qu'un seul slot transitoire dans tutor_state écrasé au tour
      // suivant : sans ça, un rechargement de page ne montre plus que
      // l'exercice EN COURS et perd tous les schémas déjà expliqués.
      //
      // Plusieurs chemins de code (nouvel exercice, exercice suivant après
      // une bonne réponse, exercice de consolidation du manuel...) peuvent
      // faire passer tutorState.exercice à un nouvel exercice au même tour.
      // Plutôt que de dupliquer cette détection à chaque endroit, on
      // vérifie directement si le texte envoyé à l'élève contient bien
      // l'énoncé de l'exercice courant : c'est le signal fiable qu'un
      // exercice vient réellement d'être présenté dans CE message.
      // ---------------------------------------------------------------

      const exerciseIntroducedThisTurn = presentedExercise
        || (reattachExercise ? tutorState.exercise : null);

      await req.db.query(
        `INSERT INTO assistant_message
           (
             conversation_id,
             role,
             content,
             explanation_segments,
             exercise_data
           )
         VALUES (?, 'assistant', ?, ?, ?)`,
        [
          conversationId,
          reply,
          currentExplanationSegments.length ? JSON.stringify(currentExplanationSegments) : null,
          exerciseIntroducedThisTurn ? JSON.stringify(exerciseIntroducedThisTurn) : null,
        ]
      );

      // ---------------------------------------------------------------
      // 22. Réponse publique au frontend
      // ---------------------------------------------------------------
      //
      // IMPORTANT :
      // tutorState.phase n'est jamais envoyé.
      // Le frontend reçoit seulement inputMode.
      // ---------------------------------------------------------------

      const publicExplanationSegments =
        Array.isArray(currentExplanationSegments)
          ? currentExplanationSegments
          : [];

      res.json({
        reply,
        inputMode:
          getPublicTutorMode(
            tutorState
          ),
        exercise: publicExercise(tutorState.exercise),
        // Exercice présenté DANS ce message (null sinon) : c'est lui que le
        // frontend attache au message, exactement comme après un reload.
        messageExercise: publicExercise(exerciseIntroducedThisTurn),
        explanationVisual: explanationVisual || null,
        explanationSegments: publicExplanationSegments,
      });
    } catch (err) {
      console.error(
        'Erreur POST /assistant/message :',
        err.status
          ? `${err.status} ${err.message}`
          : err.message
      );

      res.status(
        err.status || 500
      ).json({
        message:
          "Une erreur est survenue avec l'assistant. Réessaie plus tard.",
      });
    }
  }
);

// =====================================================================
// EXPORT
// =====================================================================

module.exports = router;

// Fonctions internes exposées pour les tests de régression uniquement.
module.exports.__test = {
  crossCheckAssessment,
  expectedVariants,
  introWithoutExerciseText,
  formatQuestionFeedback,
  looksLikeBookTitle,
  parseNumberedAnswers,
  stripImprovisedExercise,
  computedMathsAnswers,
  drawIllustration,
  buildRequiredVisual,
  insertVisualInSegments,
  placeDiagramsBeforeQuestion,
};
