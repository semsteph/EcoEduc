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
  classifyUnderstandingMessage,
  extractTaggedData,
  answerMatchesExpected,
  isValidAssessment,
  getPublicTutorMode,
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
//
// Suffisant pour une seule instance Node.
// ---------------------------------------------------------------------

const rateLimitState = new Map();

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

  if (state.hourCount >= 30) {
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

function buildSystemPrompt({
  studentFirstName,
  subjectName,
  activity,
  activityDate,
  tutorState,
  pedagogicalContext,
  turnInstruction,
}) {
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

3. Adapte ton ton à un enfant :
   phrases courtes, encourageantes, sans jargon, sans condescendance.

4. Contexte important :
   l'élève est au Bénin, où beaucoup de familles ont des moyens limités.
   Base TOUS tes exemples et analogies sur des objets simples, courants et peu coûteux :
   lampe de poche, pile plate, ampoule de torche, robinet et eau, marché, moto, vélo, etc.
   Ne suppose jamais que l'élève a accès à du matériel spécialisé, un ordinateur puissant, ou des objets chers.

5. LA VISUALISATION EST UNE EXIGENCE PÉDAGOGIQUE.
   Pour une notion visuelle, tu ne dois pas te contenter de la décrire avec des mots.
   EN GÉOMÉTRIE, UN SCHÉMA STRUCTURÉ EST OBLIGATOIRE DÈS QU'UNE NOTION PEUT ÊTRE REPRÉSENTÉE.
   Cela s'applique aux explications, aux réexplications, aux exemples et aux exercices.
   Pour une explication de géométrie, produis obligatoirement <explanation-data> avec un diagramme.
   Pour une demande d'exemples en géométrie, produis au moins un diagramme montrant l'exemple expliqué.
   Si l'élève dit qu'il n'a rien compris aux bases, reprends depuis zéro avec une progression très claire :
   notion simple → explication → exemple concret → schéma → explication du schéma → deuxième exemple si utile → vérification.
   Ne passe PAS directement à un exercice.
   Ne dessine JAMAIS un schéma toi-même sous quelque forme que ce soit : ni en ASCII,
   ni dans un bloc de code entre triples apostrophes inverses, ni en SVG, HTML, CSS ou JavaScript.
   Le texte visible ne doit contenir AUCUN dessin : uniquement des phrases et, si besoin,
   du texte en gras avec **...**. Le frontend transforme les données structurées en véritable schéma visuel.
   Si tu expliques PLUSIEURS notions ou formes dans la même réponse (ex: le carré, puis le triangle),
   NE REGROUPE PAS tous les schémas à la fin : insère un bloc <explanation-data> séparé juste après
   CHAQUE notion, immédiatement à l'endroit du texte où elle vient d'être expliquée. L'élève doit
   voir le schéma du carré juste après avoir lu l'explication du carré, puis le schéma du triangle
   juste après l'explication du triangle, etc.
   Si UNE SEULE figure doit montrer plusieurs formes ensemble (une comparaison côte à côte, par
   exemple), utilise un diagramme "composite" avec un élément par forme, chacun avec ses propres
   points décalés pour ne pas se chevaucher (ex: un triangle vers x=60-180, un carré vers x=220-320).
   Pour distinguer un contour d'une forme remplie (ex: cercle vs disque, carré vide vs carré plein),
   ajoute "filled":true (rempli) ou "filled":false (contour) sur la forme concernée.
   Pour un cercle, fournis toujours au moins deux points dans "points" : le centre ET un point du
   bord (ex: {"O":{...centre...},"A":{...bord...}}), avec la mesure du rayon dans "measurements"
   (ex: {"O-A":"rayon = 4 cm"}). Sans ces deux points, le rayon et le centre ne peuvent pas être
   dessinés alors que ton texte en parle : le schéma doit toujours correspondre exactement à ce que
   tu expliques dans le texte (même vocabulaire, mêmes éléments).
   Dans tous les cas, un schéma est dû : ne termine jamais une notion représentable sans son schéma.
   Un tableau markdown (barres verticales |...|) reste possible, mais UNIQUEMENT pour des données
   réellement tabulaires (table de multiplication, tableau de conjugaison, liste de valeurs) — il est
   alors correctement affiché. Pour comparer des formes ou une notion géométrique/visuelle, préfère
   toujours un schéma "composite" à un tableau : une image se comprend mieux qu'un tableau pour ce
   genre de notion. N'utilise jamais de tableau pour remplacer un schéma que tu devrais produire.
   Pour une notion non géométrique, utilise aussi un schéma structuré lorsqu'elle est pédagogiquement nécessaire.

6. Si la question semble dangereuse, inappropriée, ou clairement hors du cadre scolaire, refuse poliment et suggère d'en parler à un adulte (parent ou professeur).

7. Ne prétends jamais être le professeur humain de l'élève.
   Ne parle ni d'API, ni de prompt, ni de modèle de langage.

8. Réponds en français avec une explication réellement compréhensible par un élève de ce niveau.
   La clarté est prioritaire sur la brièveté. Utilise des phrases courtes, des étapes numérotées et des exemples concrets lorsque cela aide.

9. Pour toute explication géométrique, ajoute un bloc <explanation-data> avec un JSON valide sur une seule ligne,
   placé directement après le passage de texte qu'il illustre.
   CE BLOC EST OBLIGATOIRE, même si l'élève demande seulement une explication générale.
   Si ta réponse explique plusieurs notions distinctes, ajoute PLUSIEURS blocs <explanation-data>,
   un par notion, chacun juste après le texte correspondant (jamais tous regroupés à la fin).
   Pour une réexplication, utilise un nouveau schéma ou une représentation plus simple si cela améliore la compréhension.
   Format (segment) :
   <explanation-data>{"diagram":{"type":"segment","points":{"A":{"x":80,"y":160},"B":{"x":380,"y":160}},"labels":true,"measurements":{},"annotations":["Le segment [AB] a deux extrémités : A et B."]}}</explanation-data>
   Format (cercle avec centre, rayon et remplissage) :
   <explanation-data>{"diagram":{"type":"circle","points":{"O":{"x":250,"y":150},"A":{"x":330,"y":150}},"labels":true,"measurements":{"O-A":"rayon"},"filled":false}}</explanation-data>
   N'inclus jamais de SVG, HTML, CSS ou JavaScript dans ce bloc.

Instruction interne de séance :
${turnInstruction || (
  tutorState.phase === TUTOR_STATES.EXPLANATION
    ? "explique la notion demandée, puis demande naturellement si l'explication est claire."
    : "poursuis naturellement l'accompagnement scolaire, sans citer d'étape technique ni de statut interne."
)}`;
}

// ---------------------------------------------------------------------
// Instruction de génération d'exercice.
// ---------------------------------------------------------------------

function buildExerciseGenerationInstruction() {
  return `L'élève confirme clairement avoir compris.

Propose immédiatement un exercice d'application ORIGINAL, très court et débutant, lié à la notion explicitement présente dans le contexte.

Ne copie aucun manuel et n'invente jamais une référence de manuel.

Si un schéma géométrique est utile, fournis uniquement des données structurées dans la clé "diagram". Ne dessine pas le schéma en ASCII et ne génère jamais de SVG, HTML, CSS ou JavaScript.

Réponds naturellement à l'élève, puis ajoute exactement un bloc <exercise-data> contenant un JSON valide sur une seule ligne.

Format :
<exercise-data>{"prompt":"énoncé","expectedAnswers":["réponse courte acceptable"],"criteria":["critère vérifiable"],"hintPlan":["indice discret","indice plus précis","indice final avant explication"],"solutionOutline":"méthode et réponse expliquées","diagram":{"type":"parallelogram","points":{"A":{"x":80,"y":220},"B":{"x":130,"y":70},"C":{"x":350,"y":70},"D":{"x":300,"y":220}},"labels":true,"measurements":{"A-B":"6 cm"}}}</exercise-data>

La clé "diagram" est obligatoire lorsqu'une figure est nécessaire, et doit être omise lorsqu'elle n'est pas utile.

N'écris ni état technique, ni explication sur ce bloc.`;
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
        measurements: {
          'A-B': '6 cm',
        },
      },
    };
  }

  return null;
}

async function generateStructuredExercise({
  systemPrompt,
  messages,
  subjectName,
  topic,
  activity,
}) {
  // Première tentative : le prompt pédagogique normal.
  const firstResponse = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    system: systemPrompt,
    messages,
  });

  const firstTextBlock = firstResponse.content.find(
    (block) => block.type === 'text'
  );
  const firstRawReply = firstTextBlock?.text || '';
  const firstParsed = extractTaggedData(firstRawReply, 'exercise-data');
  const firstExercise = sanitiseExercise(firstParsed.data);

  if (firstExercise) {
    return {
      rawReply: firstRawReply,
      visibleText: firstParsed.visibleText,
      exercise: firstExercise,
    };
  }

  // Deuxième tentative : demande volontairement stricte et sans ambiguïté.
  const strictSystemPrompt = `${systemPrompt}

IMPORTANT : ta réponse doit obligatoirement contenir un bloc <exercise-data> valide.
Le bloc doit être du JSON valide sur une seule ligne et contenir les clés :
prompt, expectedAnswers, criteria, hintPlan, solutionOutline et, si une figure est nécessaire, diagram.
Pour une figure, diagram doit contenir type, points, labels et measurements.
Ne termine jamais ta réponse sans ce bloc.`;

  const retryResponse = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    system: strictSystemPrompt,
    messages: [
      {
        role: 'user',
        content:
          `Génère maintenant un seul exercice d'application débutant sur la notion "${
            cleanBookName(topic || activity || 'notion étudiée', 150)
          }" en ${cleanBookName(subjectName, 80)}. ${
            'Retourne obligatoirement le bloc <exercise-data> demandé.'
          }`,
      },
    ],
  });

  const retryTextBlock = retryResponse.content.find(
    (block) => block.type === 'text'
  );
  const retryRawReply = retryTextBlock?.text || '';
  const retryParsed = extractTaggedData(retryRawReply, 'exercise-data');
  const retryExercise = sanitiseExercise(retryParsed.data);

  if (retryExercise) {
    return {
      rawReply: retryRawReply,
      visibleText: retryParsed.visibleText,
      exercise: retryExercise,
    };
  }

  // Filet de sécurité déterministe : uniquement si nous connaissons une
  // notion pour laquelle le backend possède un exercice sûr et fiable.
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

  // Dernier palier : un exercice est dû dès que l'élève a confirmé sa
  // compréhension, ce n'est pas une option. Si le modèle rapide échoue
  // deux fois, on escalade vers un modèle plus capable.
  const escalatedResponse = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 700,
    system: strictSystemPrompt,
    messages: [
      {
        role: 'user',
        content:
          `Génère maintenant un seul exercice d'application débutant sur la notion "${
            cleanBookName(topic || activity || 'notion étudiée', 150)
          }" en ${cleanBookName(subjectName, 80)}. `
          + 'Retourne obligatoirement le bloc <exercise-data> demandé, avec un JSON valide.',
      },
    ],
  });

  const escalatedTextBlock = escalatedResponse.content.find(
    (block) => block.type === 'text'
  );
  const escalatedRawReply = escalatedTextBlock?.text || '';
  const escalatedParsed = extractTaggedData(escalatedRawReply, 'exercise-data');
  const escalatedExercise = sanitiseExercise(escalatedParsed.data);

  return {
    rawReply: escalatedRawReply || retryRawReply || firstRawReply,
    visibleText:
      escalatedParsed.visibleText
      || retryParsed.visibleText
      || firstParsed.visibleText,
    exercise: escalatedExercise,
  };
}

// ---------------------------------------------------------------------
// Instruction d'évaluation de l'exercice.
// ---------------------------------------------------------------------

function buildExerciseAssessmentInstruction(exercise) {
  return `Analyse uniquement la dernière réponse de l'élève pour cet exercice original :

${exercise.prompt}

Réponses attendues possibles :
${exercise.expectedAnswers.join(' | ')}

Critères :
${exercise.criteria
    .map((criterion, index) => `${index}: ${criterion}`)
    .join(' ; ')}

Réponds UNIQUEMENT avec :

<exercise-assessment>{"verdict":"correct ou incorrect","criterionIndex":0,"reason":"justification courte"}</exercise-assessment>

Ne décide pas de la suite pédagogique et ne donne aucune page de manuel.`;
}


// =====================================================================
// Compréhension d'intention par Claude.
//
// Le backend ne maintient pas une liste de formulations françaises.
// Claude interprète le message en tenant compte de l'état et du dernier
// message de l'assistant. Le backend utilise ensuite uniquement l'intention
// structurée pour autoriser ou refuser la transition.
// =====================================================================

async function inferTutorIntent({
  phase,
  lastAssistantMessage,
  userMessage,
}) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 320,
    system: `Tu es le module qui COMPREND le message de l'élève dans son contexte pédagogique.

Tu ne dois pas chercher une phrase exacte ni utiliser une liste de formulations à reconnaître.
Comprends le français naturel, les fautes d'orthographe, les phrases incomplètes, les corrections de l'élève,
les réponses très courtes et les messages qui dépendent du dernier message du tuteur.

Analyse obligatoirement :
- l'état pédagogique actuel ;
- le dernier message du tuteur ;
- le message actuel de l'élève ;
- la cohérence avec les messages précédents implicitement visibles dans le dernier échange.

Retourne UNIQUEMENT un JSON valide sur une seule ligne :
{"intent":"...","confidence":0.00,"action":"..."}

Intentions autorisées :
- UNDERSTOOD : l'élève confirme clairement avoir compris la notion.
- NOT_UNDERSTOOD : l'élève dit clairement qu'il ne comprend pas.
- EXPLANATION_REQUEST : l'élève demande une explication, une reprise des bases ou une explication autrement.
- EXAMPLE_REQUEST : l'élève demande un ou plusieurs exemples, une illustration ou une représentation.
- CORRECTION_OF_TUTOR : l'élève corrige explicitement une mauvaise interprétation du tuteur.
- PARTIAL_UNDERSTANDING : l'élève a compris une partie mais indique une difficulté restante.
- ACCEPT_PROPOSED_EXERCISE : l'élève accepte clairement l'exercice proposé juste avant.
- NEW_EXERCISE_REQUEST : l'élève demande un nouvel exercice.
- FOLLOW_UP_QUESTION : l'élève pose une question de suivi.
- BOOK_PROVIDED : l'élève fournit le nom d'un manuel.
- AMBIGUOUS : plusieurs interprétations restent plausibles.
- OTHER : aucune intention précédente ne convient.

Actions autorisées :
- EXPLAIN
- EXPLAIN_WITH_EXAMPLES
- ASK_CLARIFICATION
- GENERATE_EXERCISE
- CONTINUE
- BOOK_LOOKUP
- NONE

RÈGLES ESSENTIELLES :
1. Le dernier message du tuteur est indispensable pour interpréter une réponse courte.
2. Un "oui", "ok" ou "d'accord" seul ne signifie JAMAIS automatiquement que l'élève a compris.
3. Si le tuteur a posé plusieurs questions ou proposé plusieurs choses et que la réponse est trop courte,
   retourne AMBIGUOUS + ASK_CLARIFICATION.
4. Si l'élève dit en substance "j'ai dit que je n'ai pas compris", "non, je voulais dire que je ne comprends pas",
   ou corrige une interprétation précédente, reconnais la correction et traite la difficulté qu'il vient de confirmer.
5. Les fautes et formulations maladroites ne doivent pas inverser le sens évident du contexte.
   Exemple : après "je n'ai pas compris les bases", une phrase maladroite contenant "les bases de la géométrie plane"
   ne doit pas être interprétée comme une maîtrise des bases sans preuve claire.
6. Si l'élève demande des exemples, des schémas ou une autre explication, l'action est EXPLAIN_WITH_EXAMPLES,
   pas GENERATE_EXERCISE.
7. UNDERSTOOD exige une confirmation suffisamment explicite et cohérente avec le dernier message.
8. N'invente jamais une intention uniquement parce qu'une transition serait pratique.
9. Si l'intention est incertaine, préfère AMBIGUOUS.
10. Tu analyses le SENS, pas les mots-clés.

État pédagogique actuel : ${phase}

Dernier message du tuteur :
${JSON.stringify(String(lastAssistantMessage || '').slice(-3000))}

Message actuel de l'élève :
${JSON.stringify(String(userMessage || '').slice(0, 2000))}`,
    messages: [
      {
        role: 'user',
        content: String(userMessage || '').trim(),
      },
    ],
  });

  const block = response.content.find((item) => item.type === 'text');
  const raw = block?.text || '';

  try {
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '');

    const allowedIntents = new Set([
      'UNDERSTOOD',
      'NOT_UNDERSTOOD',
      'EXPLANATION_REQUEST',
      'EXAMPLE_REQUEST',
      'CORRECTION_OF_TUTOR',
      'PARTIAL_UNDERSTANDING',
      'ACCEPT_PROPOSED_EXERCISE',
      'NEW_EXERCISE_REQUEST',
      'FOLLOW_UP_QUESTION',
      'BOOK_PROVIDED',
      'AMBIGUOUS',
      'OTHER',
    ]);

    const allowedActions = new Set([
      'EXPLAIN',
      'EXPLAIN_WITH_EXAMPLES',
      'ASK_CLARIFICATION',
      'GENERATE_EXERCISE',
      'CONTINUE',
      'BOOK_LOOKUP',
      'NONE',
    ]);

    if (
      !allowedIntents.has(parsed.intent)
      || !allowedActions.has(parsed.action)
      || !Number.isFinite(Number(parsed.confidence))
    ) {
      return {
        intent: 'OTHER',
        confidence: 0,
        action: 'NONE',
      };
    }

    return {
      intent: parsed.intent,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence))),
      action: parsed.action,
    };
  } catch (_) {
    return {
      intent: 'OTHER',
      confidence: 0,
      action: 'NONE',
    };
  }
}

// =====================================================================
// Validation d'une représentation visuelle produite pour une EXPLICATION.
// Le frontend rend ensuite le diagramme en SVG.
// =====================================================================

function sanitiseExplanationDiagram(value) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
  ) {
    return null;
  }

  const allowedTypes = new Set([
    'point',
    'line',
    'segment',
    'angle',
    'triangle',
    'right-triangle',
    'parallelogram',
    'rectangle',
    'square',
    'circle',
    'coordinate-plane',
    'composite',
  ]);

  const clean = (input, max) =>
    typeof input === 'string'
      ? input.replace(/\s+/g, ' ').trim().slice(0, max)
      : '';

  const type = clean(value.type, 40).toLowerCase();

  if (!allowedTypes.has(type)) {
    return null;
  }

  // ---------------------------------------------------------------
  // Cas spécial : plusieurs éléments dans un seul schéma.
  // Claude peut utiliser "composite" pour montrer simultanément
  // un point, un segment, une droite, etc.
  // ---------------------------------------------------------------
  if (type === 'composite') {
    const sourceElements = Array.isArray(value.elements)
      ? value.elements
      : [];

    const elements = [];

    for (const element of sourceElements.slice(0, 20)) {
      if (
        !element
        || typeof element !== 'object'
        || Array.isArray(element)
      ) {
        continue;
      }

      const elementType = clean(element.type, 40).toLowerCase();

      if (!allowedTypes.has(elementType) || elementType === 'composite') {
        continue;
      }

      if (elementType === 'point') {
        const source =
          element.coordinates
          || element.point
          || element;

        const x = Number(source?.x);
        const y = Number(source?.y);

        if (
          !Number.isFinite(x)
          || !Number.isFinite(y)
          || x < 0 || x > 500
          || y < 0 || y > 320
        ) {
          continue;
        }

        elements.push({
          type: 'point',
          coordinates: {
            x: Math.round(x),
            y: Math.round(y),
          },
          label: clean(element.label, 20),
        });

        continue;
      }

      if (
        elementType === 'segment'
        || elementType === 'line'
        || elementType === 'angle'
      ) {
        const sourcePoints =
          element.points
          && typeof element.points === 'object'
          && !Array.isArray(element.points)
            ? element.points
            : {};

        const cleanPoints = {};

        for (
          const [label, point]
          of Object.entries(sourcePoints).slice(0, 4)
        ) {
          const x = Number(point?.x);
          const y = Number(point?.y);

          if (
            /^[A-Z][A-Z0-9]?$/.test(label)
            && Number.isFinite(x)
            && Number.isFinite(y)
            && x >= 0 && x <= 500
            && y >= 0 && y <= 320
          ) {
            cleanPoints[label] = {
              x: Math.round(x),
              y: Math.round(y),
            };
          }
        }

        const minimumPoints =
          elementType === 'angle' ? 3 : 2;

        if (Object.keys(cleanPoints).length < minimumPoints) {
          continue;
        }

        elements.push({
          type: elementType,
          points: cleanPoints,
          label: clean(element.label, 80),
        });

        continue;
      }

      if (
        [
          'triangle',
          'right-triangle',
          'parallelogram',
          'rectangle',
          'square',
        ].includes(elementType)
      ) {
        const sourcePoints =
          element.points
          && typeof element.points === 'object'
          && !Array.isArray(element.points)
            ? element.points
            : {};

        const cleanPoints = {};

        for (
          const [label, point]
          of Object.entries(sourcePoints).slice(0, 4)
        ) {
          const x = Number(point?.x);
          const y = Number(point?.y);

          if (
            Number.isFinite(x)
            && Number.isFinite(y)
            && x >= 0 && x <= 500
            && y >= 0 && y <= 320
          ) {
            cleanPoints[label] = {
              x: Math.round(x),
              y: Math.round(y),
            };
          }
        }

        const minimumPoints =
          elementType === 'triangle'
          || elementType === 'right-triangle'
            ? 3
            : 4;

        if (Object.keys(cleanPoints).length < minimumPoints) {
          continue;
        }

        elements.push({
          type: elementType,
          points: cleanPoints,
          label: clean(element.label, 80),
          filled: typeof element.filled === 'boolean' ? element.filled : null,
        });

        continue;
      }

      if (elementType === 'circle') {
        const center =
          element.center
          || element.coordinates;

        const x = Number(center?.x);
        const y = Number(center?.y);
        const radius = Number(element.radius);

        if (
          !Number.isFinite(x)
          || !Number.isFinite(y)
          || !Number.isFinite(radius)
          || radius <= 0
          || x < 0 || x > 500
          || y < 0 || y > 320
        ) {
          continue;
        }

        elements.push({
          type: 'circle',
          center: {
            x: Math.round(x),
            y: Math.round(y),
          },
          radius: Math.min(Math.round(radius), 140),
          label: clean(element.label, 80),
          filled: typeof element.filled === 'boolean' ? element.filled : null,
        });
      }
    }

    if (elements.length === 0) {
      return null;
    }

    return {
      type: 'composite',
      elements,
      points: {},
      labels: value.labels !== false,
      measurements: {},
      annotations: Array.isArray(value.annotations)
        ? value.annotations
            .slice(0, 10)
            .map((item) => clean(item, 160))
            .filter(Boolean)
        : [],
    };
  }

  // ---------------------------------------------------------------
  // Cas des schémas simples.
  // ---------------------------------------------------------------

  const sourcePoints =
    value.points
    && typeof value.points === 'object'
    && !Array.isArray(value.points)
      ? value.points
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
    value.measurements
    && typeof value.measurements === 'object'
    && !Array.isArray(value.measurements)
  ) {
    for (
      const [key, measurement]
      of Object.entries(value.measurements).slice(0, 12)
    ) {
      if (
        /^[A-Z][A-Z0-9]?(?:-[A-Z][A-Z0-9]?)?$/.test(key)
        && typeof measurement === 'string'
      ) {
        const cleanMeasurement = clean(measurement, 80);
        if (cleanMeasurement) {
          measurements[key] = cleanMeasurement;
        }
      }
    }
  }

  const annotations = Array.isArray(value.annotations)
    ? value.annotations
        .slice(0, 10)
        .map((item) => clean(item, 160))
        .filter(Boolean)
    : [];

  return {
    type,
    points,
    labels: value.labels !== false,
    // Permet de distinguer un contour (cercle, forme vide) d'une forme
    // remplie (disque, forme pleine) — vital pour ce genre de distinction.
    // null = pas précisé, le frontend applique alors l'apparence par
    // défaut habituelle de la forme.
    filled: typeof value.filled === 'boolean' ? value.filled : null,
    measurements,
    annotations,
  };
}

// ---------------------------------------------------------------------
// Génération robuste d'une explication structurée.
// Le texte visible ne doit JAMAIS contenir <explanation-data>.
// Si Claude renvoie un bloc invalide ou tronqué, on effectue une seconde
// tentative structurée avant de rendre le texte.
// ---------------------------------------------------------------------

function cleanExplanationText(text) {
  return String(text || '')
    // Bloc commencé mais tronqué : on supprime tout ce qui suit.
    .replace(/<explanation-data>[\s\S]*$/gi, '')
    // Filet de sécurité : la règle interdit tout schéma en ASCII, mais un
    // modèle peut malgré tout produire un bloc de code (triple backticks).
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------
// Découpe la réponse de Claude en tronçons texte + schéma, dans l'ordre
// où ils apparaissent. Chaque notion expliquée doit garder son propre
// schéma à sa place, plutôt qu'un schéma unique regroupé à la fin.
// ---------------------------------------------------------------------

function extractExplanationSegments(rawText) {
  const source = String(rawText || '');
  const tagExpression = /<explanation-data>\s*([\s\S]*?)\s*<\/explanation-data>/gi;

  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = tagExpression.exec(source)) !== null) {
    const text = cleanExplanationText(
      source.slice(lastIndex, match.index)
    );

    let diagram = null;

    try {
      diagram = sanitiseExplanationDiagram(
        JSON.parse(match[1])?.diagram
      );
    } catch (_) {
      diagram = null;
    }

    if (text || diagram) {
      segments.push({ text, diagram });
    }

    lastIndex = tagExpression.lastIndex;
  }

  const trailingText = cleanExplanationText(source.slice(lastIndex));

  if (trailingText || segments.length === 0) {
    segments.push({ text: trailingText, diagram: null });
  }

  return segments;
}

// ---------------------------------------------------------------------
// Relit les tronçons texte + schéma stockés en base pour un message.
// Ne fait jamais confiance au contenu brut : un JSON invalide ou une
// forme inattendue retombe simplement sur "pas de schéma".
// ---------------------------------------------------------------------

function parseStoredSegments(rawValue) {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((segment) => segment && typeof segment === 'object' && !Array.isArray(segment))
      .map((segment) => ({
        text: typeof segment.text === 'string' ? segment.text : '',
        diagram: sanitiseExplanationDiagram(segment.diagram),
      }))
      .slice(0, 20);
  } catch (_) {
    return [];
  }
}

// Un segment sans schéma est acceptable seulement pour une remarque de
// clôture qui n'a rien à représenter visuellement. Dès qu'une notion
// visuelle (géométrie, forme, figure) est présente, elle doit avoir son
// schéma : c'est une exigence pédagogique, pas une option.
function hasUsableDiagram(segments) {
  return segments.some((segment) => segment.diagram);
}

async function generateStructuredExplanation({
  systemPrompt,
  messages,
  subjectName,
  topic,
}) {
  const lastUserMessage = [...(messages || [])]
    .reverse()
    .find((message) => message.role === 'user')?.content || '';

  const firstResponse = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 900,
    system: systemPrompt,
    messages,
  });

  const firstTextBlock = firstResponse.content.find(
    (block) => block.type === 'text'
  );
  const firstRaw = firstTextBlock?.text || '';
  const firstSegments = extractExplanationSegments(firstRaw);

  if (hasUsableDiagram(firstSegments)) {
    return {
      rawReply: firstRaw,
      segments: firstSegments,
    };
  }

  // Deuxième tentative : format imposé et types autorisés explicitement.
  const strictResponse = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 700,
    system: `${systemPrompt}

IMPORTANT — la réponse précédente n'était pas exploitable.
Cette fois, retourne obligatoirement un bloc <explanation-data> VALIDE.
Le JSON doit être complet et tenir sur une seule ligne.

Le diagramme doit utiliser UNIQUEMENT l'un de ces types :
point, line, segment, angle, triangle, right-triangle, parallelogram,
rectangle, square, circle, coordinate-plane, composite.
Il n'existe PAS de type "tableau" ou "comparison" dans le schéma : pour comparer, utilise composite
(un tableau markdown reste possible ailleurs dans ta réponse pour des données tabulaires, mais pas ici).

N'utilise AUCUN autre type pour ce diagramme.
Si plusieurs éléments doivent apparaître dans le même schéma, utilise :
{"type":"composite","elements":[...]}
Pour composite :
- point : {"type":"point","coordinates":{"x":100,"y":100},"label":"A"}
- segment : {"type":"segment","points":{"A":{"x":100,"y":100},"B":{"x":300,"y":100}}}
- line : {"type":"line","points":{"A":{"x":100,"y":200},"B":{"x":300,"y":200}}}
- une forme (triangle, right-triangle, parallelogram, rectangle, square), "filled":false pour un contour vide :
  {"type":"triangle","points":{"A":{"x":60,"y":220},"B":{"x":60,"y":100},"C":{"x":170,"y":220}},"filled":true}
- un cercle, avec son centre et un point du bord pour que le rayon soit dessinable :
  {"type":"circle","center":{"x":260,"y":150},"radius":60,"filled":false}
Pour un cercle isolé (pas dans un composite), utilise plutôt le format "points" avec centre + bord
(voir l'exemple du cercle plus haut dans tes instructions) pour que le rayon s'affiche.
Exemple pour comparer DEUX formes côte à côte dans un seul schéma :
{"diagram":{"type":"composite","elements":[
{"type":"triangle","points":{"A":{"x":60,"y":220},"B":{"x":60,"y":100},"C":{"x":170,"y":220}}},
{"type":"square","points":{"A":{"x":230,"y":120},"B":{"x":320,"y":120},"C":{"x":320,"y":210},"D":{"x":230,"y":210}}}
],"labels":true}}
Ne génère jamais SVG, HTML, CSS ou JavaScript.
Ne laisse jamais le bloc <explanation-data> ouvert ou tronqué.`,
    messages: [
      {
        role: 'user',
        content:
          `Réexplique "${topic || 'la notion étudiée'}" en ${subjectName} avec un exemple concret et un schéma valide. `
          + `La question précise de l'élève à laquelle il faut répondre était : `
          + `${JSON.stringify(String(lastUserMessage || '').slice(0, 500))}`,
      },
    ],
  });

  const strictTextBlock = strictResponse.content.find(
    (block) => block.type === 'text'
  );
  const strictRaw = strictTextBlock?.text || '';
  const strictSegments = extractExplanationSegments(strictRaw);

  if (hasUsableDiagram(strictSegments)) {
    return {
      rawReply: strictRaw,
      segments: strictSegments,
    };
  }

  // Troisième et dernier palier : un schéma est une exigence pédagogique,
  // pas une option. Si le modèle rapide échoue deux fois, on escalade
  // vers un modèle plus capable plutôt que d'abandonner le schéma.
  const escalatedResponse = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 900,
    system: systemPrompt,
    messages: [
      ...messages,
      {
        role: 'user',
        content:
          'Réponds à nouveau à ma question précédente. Le schéma est obligatoire '
          + "si la notion peut être représentée visuellement : n'oublie pas le "
          + 'bloc <explanation-data> avec un JSON valide.',
      },
    ],
  });

  const escalatedTextBlock = escalatedResponse.content.find(
    (block) => block.type === 'text'
  );
  const escalatedRaw = escalatedTextBlock?.text || '';
  const escalatedSegments = extractExplanationSegments(escalatedRaw);

  if (hasUsableDiagram(escalatedSegments)) {
    return {
      rawReply: escalatedRaw,
      segments: escalatedSegments,
    };
  }

  // Aucun schéma valide n'a pu être obtenu après trois tentatives.
  // Un schéma générique et sans rapport avec la notion réellement
  // expliquée serait trompeur pour l'élève : mieux vaut une explication
  // texte seule, honnête, qu'un mauvais schéma présenté comme fiable.
  const fallbackSegments = escalatedSegments.length
    ? escalatedSegments
    : (strictSegments.length ? strictSegments : firstSegments);

  return {
    rawReply: escalatedRaw || strictRaw || firstRaw,
    segments: fallbackSegments.length
      ? fallbackSegments
      : [{ text: "Je vais reprendre l'explication autrement.", diagram: null }],
  };
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

// =====================================================================

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
     WHERE r.status = 'verified'
       AND (
         LOWER(b.title) LIKE ?
         OR LOWER(ba.alias) LIKE ?
       )
       AND LOWER(r.subject_name) = LOWER(?)
       AND LOWER(r.class_label) = LOWER(?)
       AND (
         ? IS NULL
         OR LOWER(COALESCE(r.series_label, '')) = LOWER(?)
       )
       AND r.page IS NOT NULL
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
         independent_source_key AS independentSourceKey
       FROM assistant_reference_evidence
       WHERE reference_id = ?
       ORDER BY id ASC`,
      [candidate.referenceId]
    );

    const validEvidence = evidenceRows.filter(
      (evidence) => evidence.sourceUrl && evidence.sourceTitle
    );

    const strongSource = validEvidence.some((evidence) =>
      ['publisher', 'institutional', 'library_catalog', 'bibliographic_catalog'].includes(
        normaliseBookText(evidence.sourceType).replace(/ /g, '_')
      )
    );

    const independentSources = new Set(
      validEvidence
        .map((evidence) => evidence.independentSourceKey)
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

// =====================================================================
// Recherche et vérification réelle d'une référence de manuel.
//
// Utilise l'outil de recherche web natif de Claude. Le backend ne fait
// JAMAIS confiance à un score de confiance déclaré par le modèle : il
// calcule lui-même la confiance à partir des citations réellement
// renvoyées par l'outil de recherche (URL, titre, extrait cité).
// =====================================================================

const KNOWN_PUBLISHER_HOSTS = [
  'edicef.com',
  'hachette.fr',
  'hachette-education.com',
  'nathan.fr',
  'nathan.com',
  'hatier.fr',
  'bordas-espace-svt.fr',
  'editions-hatier.fr',
  'ciam-edu.org',
];

const KNOWN_CATALOG_HOSTS = [
  'worldcat.org',
  'sudoc.abes.fr',
  'bnf.fr',
  'openlibrary.org',
];

function classifySourceType(url) {
  let host = '';

  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch (_) {
    return { type: 'other', host: '' };
  }

  if (host.endsWith('.gov') || host.endsWith('.edu') || host.includes('.gouv.')) {
    return { type: 'institutional', host };
  }

  if (KNOWN_PUBLISHER_HOSTS.some((known) => host === known || host.endsWith(`.${known}`))) {
    return { type: 'publisher', host };
  }

  if (KNOWN_CATALOG_HOSTS.some((known) => host === known || host.endsWith(`.${known}`))) {
    return { type: 'bibliographic_catalog', host };
  }

  if (host.includes('bibliotheque') || host.includes('library')) {
    return { type: 'library_catalog', host };
  }

  if (host.endsWith('.org') || host.includes('ecole') || host.includes('education')) {
    return { type: 'educational', host };
  }

  return { type: 'other', host };
}

// Construit les preuves à partir des citations réellement renvoyées par
// l'outil de recherche web (dédupliquées par URL).
function buildEvidenceFromCitations(citations) {
  const byUrl = new Map();

  for (const citation of citations) {
    if (
      !citation
      || citation.type !== 'web_search_result_location'
      || !citation.url
    ) {
      continue;
    }

    if (byUrl.has(citation.url)) continue;

    const { type: sourceType, host } = classifySourceType(citation.url);

    if (!host) continue;

    byUrl.set(citation.url, {
      sourceUrl: citation.url.slice(0, 1000),
      sourceTitle: cleanBookName(citation.title || host, 500),
      sourceType,
      sourceHost: host,
      independentSourceKey: host,
      evidenceExcerpt: cleanBookName(citation.cited_text || '', 500),
    });
  }

  return [...byUrl.values()].slice(0, 10);
}

// Score déterministe, calculé par le backend — jamais déclaré par le modèle.
// Reprend la politique documentée dans la migration 2026_09_tuteur_pedagogique.sql.
function computeReferenceConfidence(evidence) {
  const strongSource = evidence.some((e) =>
    ['institutional', 'publisher', 'bibliographic_catalog'].includes(e.sourceType)
  );

  const independentCount = new Set(
    evidence.map((e) => e.independentSourceKey)
  ).size;

  if (strongSource && evidence.length >= 1) return 92;
  if (independentCount >= 2) return 87;
  if (independentCount === 1) return 60;

  return 0;
}

async function findOrCreateBook(req, bookName) {
  const normalizedTitle = normaliseBookText(bookName);

  const [existing] = await req.db.query(
    `SELECT b.id
     FROM assistant_books b
     LEFT JOIN assistant_book_aliases ba ON ba.book_id = b.id
     WHERE b.normalized_title = ?
        OR ba.normalized_alias = ?
     LIMIT 1`,
    [normalizedTitle, normalizedTitle]
  );

  if (existing.length) return existing[0].id;

  const [result] = await req.db.query(
    `INSERT INTO assistant_books (title, normalized_title)
     VALUES (?, ?)`,
    [cleanBookName(bookName, 255), normalizedTitle]
  );

  return result.insertId;
}

async function searchAndVerifyBookReference(req, {
  conversationId,
  bookName,
  subjectName,
  level,
  series,
  activity,
  topic,
}) {
  const normalizedDeclaredBookName = normaliseBookText(bookName);
  const queryText = buildBookSearchTerms({
    book: bookName,
    subjectName,
    level,
    series,
    activity,
    topic,
  });

  let searchJobId = null;

  try {
    const [jobResult] = await req.db.query(
      `INSERT INTO assistant_book_search_jobs
       (
         conversation_id,
         declared_book_name,
         normalized_declared_book_name,
         class_label,
         series_label,
         subject_name,
         current_activity,
         topic,
         status,
         provider,
         query_text
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'searching', 'anthropic_web_search', ?)`,
      [
        conversationId,
        cleanBookName(bookName, 255),
        normalizedDeclaredBookName,
        cleanBookName(level, 100),
        series ? cleanBookName(series, 100) : null,
        cleanBookName(subjectName, 100),
        cleanBookName(activity || topic || 'notion étudiée', 255),
        cleanBookName(topic || activity || 'notion étudiée', 255),
        queryText,
      ]
    );

    searchJobId = jobResult.insertId;
  } catch (error) {
    console.error('Impossible de créer le job de recherche du manuel :', error.message);
  }

  const markJob = async (status, errorMessage) => {
    if (!searchJobId) return;
    try {
      await req.db.query(
        `UPDATE assistant_book_search_jobs
         SET status = ?, error_message = ?, completed_at = NOW()
         WHERE id = ?`,
        [status, errorMessage ? cleanBookName(errorMessage, 500) : null, searchJobId]
      );
    } catch (_) {
      // Le suivi du job est secondaire : une erreur ici ne doit jamais
      // empêcher de répondre à l'élève.
    }
  };

  let response;

  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1000,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5,
        },
      ],
      system:
        `Tu es un module de recherche documentaire strict pour une plateforme scolaire. `
        + `Tu dois trouver, dans un manuel scolaire précis, la page et le numéro d'exercice qui `
        + `correspondent à une notion donnée — en te basant UNIQUEMENT sur des sources trouvées `
        + `par la recherche web. N'invente RIEN : si les sources ne permettent pas de confirmer `
        + `une page et un exercice précis pour CE manuel exact (titre, niveau, matière), dis-le `
        + `clairement plutôt que de deviner.\n\n`
        + `Termine TOUJOURS ta réponse par exactement un bloc sur une seule ligne :\n`
        + `<book-reference>{"page":"12","exercise":"4","found":true}</book-reference>\n`
        + `ou, si tu n'as rien trouvé de fiable :\n`
        + `<book-reference>{"found":false}</book-reference>`,
      messages: [
        {
          role: 'user',
          content:
            `Manuel déclaré par l'élève : "${cleanBookName(bookName, 180)}"\n`
            + `Niveau : ${cleanBookName(level, 60)}${series ? ` ${cleanBookName(series, 40)}` : ''}\n`
            + `Matière : ${cleanBookName(subjectName, 80)}\n`
            + `Notion à localiser : "${cleanBookName(topic || activity || 'notion étudiée', 180)}"\n\n`
            + `Cherche la page et le numéro d'exercice correspondants dans ce manuel précis.`,
        },
      ],
    });
  } catch (error) {
    console.error('Erreur recherche web manuel :', error.message);
    await markJob('failed', error.message);
    return null;
  }

  const textBlocks = response.content.filter((block) => block.type === 'text');
  const finalText = textBlocks.map((block) => block.text).join('\n');
  const citations = textBlocks.flatMap((block) => block.citations || []);

  const tagMatch = finalText.match(/<book-reference>([\s\S]*?)<\/book-reference>/);

  let claimed = null;
  try {
    claimed = tagMatch ? JSON.parse(tagMatch[1]) : null;
  } catch (_) {
    claimed = null;
  }

  const page = claimed?.found ? cleanBookName(String(claimed.page || ''), 50) : '';
  const exerciseNumber = claimed?.found ? cleanBookName(String(claimed.exercise || ''), 50) : '';
  const pageAsNumber = Number(page);

  // La page doit être un entier positif exploitable pour la navigation :
  // un intervalle ("12-13") ou une valeur non numérique n'est pas assez
  // précis pour orienter l'élève de façon fiable.
  if (!page || !exerciseNumber || !Number.isInteger(pageAsNumber) || pageAsNumber <= 0) {
    await markJob('needs_clarification', "Aucune page/exercice fiable trouvée par la recherche.");
    return null;
  }

  const evidence = buildEvidenceFromCitations(citations);
  const confidenceScore = computeReferenceConfidence(evidence);

  const strongSource = evidence.some((e) =>
    ['institutional', 'publisher', 'bibliographic_catalog'].includes(e.sourceType)
  );
  const independentCount = new Set(evidence.map((e) => e.independentSourceKey)).size;

  if (confidenceScore < 85 || (!strongSource && independentCount < 2)) {
    await markJob('needs_clarification', `Confiance insuffisante (${confidenceScore}).`);
    return null;
  }

  try {
    const bookId = await findOrCreateBook(req, bookName);

    const normalizedTopic = normaliseBookText(topic || activity || 'notion étudiée');

    const [refResult] = await req.db.query(
      `INSERT INTO assistant_book_references
       (
         search_job_id,
         book_id,
         class_label,
         series_label,
         subject_name,
         current_activity,
         topic,
         normalized_topic,
         page,
         exercise_number,
         status,
         confidence_score,
         validation_reason,
         verified_by,
         verified_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?, 'anthropic_web_search', NOW())`,
      [
        searchJobId,
        bookId,
        cleanBookName(level, 100),
        series ? cleanBookName(series, 100) : null,
        cleanBookName(subjectName, 100),
        cleanBookName(activity, 255) || null,
        cleanBookName(topic || activity || 'notion étudiée', 255),
        normalizedTopic,
        page,
        exerciseNumber,
        confidenceScore,
        `${evidence.length} source(s), ${independentCount} indépendante(s), source forte: ${strongSource}`,
      ]
    );

    const referenceId = refResult.insertId;

    for (const e of evidence) {
      await req.db.query(
        `INSERT INTO assistant_reference_evidence
         (
           reference_id,
           source_url,
           source_title,
           source_type,
           source_host,
           independent_source_key,
           searched_at,
           evidence_excerpt,
           reported_page,
           reported_exercise_number,
           metadata_match_score
         )
         VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)`,
        [
          referenceId,
          e.sourceUrl,
          e.sourceTitle,
          e.sourceType,
          e.sourceHost,
          e.independentSourceKey,
          e.evidenceExcerpt,
          page,
          exerciseNumber,
          confidenceScore,
        ]
      );
    }

    await markJob('completed', null);

    const [bookRows] = await req.db.query(
      `SELECT title, publisher FROM assistant_books WHERE id = ?`,
      [bookId]
    );

    return {
      referenceId,
      bookId,
      bookTitle: bookRows[0]?.title || bookName,
      publisher: bookRows[0]?.publisher || null,
      pageNumber: page,
      exerciseNumber,
      confidenceScore,
      navigation: getReferenceNavigation({ pageNumber: page, exerciseNumber }),
      evidenceCount: evidence.length,
      independentSourceCount: independentCount,
    };
  } catch (error) {
    console.error('Erreur persistance référence manuel :', error.message);
    await markJob('failed', error.message);
    return null;
  }
}

function buildBookReferenceReply(bookName, reference) {
  return `J'ai trouvé une référence vérifiée dans ${bookName} : ${reference.navigation.label}. Tu peux ouvrir ton manuel à cet endroit.`;
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
        `SELECT id
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

      const [convRows] = await req.db.query(
        `SELECT
           id,
           tutor_state AS tutorState
         FROM assistant_conversation
         WHERE eleve_id = ?
           AND test_id = ?`,
        [eleveId, testId]
      );

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
           created_at AS createdAt
         FROM assistant_message
         WHERE conversation_id = ?
         ORDER BY created_at ASC, id ASC`,
        [convRows[0].id]
      );

      const messages = messageRows.map((row) => ({
        role: row.role,
        content: row.content,
        segments: parseStoredSegments(row.explanationSegments),
      }));

      // L'état interne reste côté serveur.
      // Le frontend reçoit uniquement un mode public.
      res.json({
        messages,
        inputMode,
        exercise: tutorState.exercise || null,
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
        });

      // ---------------------------------------------------------------
      // 6. Récupération / création de la conversation
      // ---------------------------------------------------------------

      const [convRows] = await req.db.query(
        `SELECT
           id,
           tutor_state AS tutorState
         FROM assistant_conversation
         WHERE eleve_id = ?
           AND test_id = ?`,
        [eleveId, testId]
      );

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
               tutor_state
             )
           VALUES (?, ?, ?, ?, ?)`,
          [
            eleveId,
            testId,
            eleve.etablissement_id,
            eleve.Annee_scolaire_id,
            JSON.stringify(initialTutorState),
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
        "Enseigne directement la notion. Ne demande pas d'abord à l'élève ce que le professeur a fait. Si l'élève demande les bases ou dit qu'il ne comprend rien, reprends depuis zéro. Utilise une progression claire avec exemples concrets. En géométrie, un schéma structuré est OBLIGATOIRE dans l'explication via <explanation-data>. Termine par une vérification simple de compréhension.";

      // ---------------------------------------------------------------
      // Compréhension du langage naturel par Claude.
      // Le backend ne devine pas les formulations de l'élève.
      // ---------------------------------------------------------------

      let naturalIntent = null;

      if (
        tutorState.phase === TUTOR_STATES.UNDERSTANDING_CHECK
        || tutorState.phase === TUTOR_STATES.FOLLOW_UP
      ) {
        const [lastAssistantRows] = await req.db.query(
          `SELECT content
           FROM assistant_message
           WHERE conversation_id = ?
             AND role = 'assistant'
           ORDER BY created_at DESC, id DESC
           LIMIT 1`,
          [conversationId]
        );

        naturalIntent = await inferTutorIntent({
          phase: tutorState.phase,
          lastAssistantMessage: lastAssistantRows[0]?.content || '',
          userMessage,
        });
      }

      // ---------------------------------------------------------------
      // Cas : sélection et recherche du manuel
      // ---------------------------------------------------------------

      if (tutorState.phase === TUTOR_STATES.BOOK_SELECTION) {
        const selectedBook = extractBookSelection(userMessage);

        if (!selectedBook.name) {
          turnKind = 'BOOK_SELECTION';
          turnInstruction =
            "Demande simplement le nom exact du manuel utilisé par l'élève. Ne donne aucune référence de page.";
        } else {
          tutorState.selectedBook = selectedBook.name;

          tutorState =
            transitionTutorState(
              tutorState,
              TUTOR_EVENTS.BOOK_PROVIDED
            ).state;

          const level = pedagogicalContext.level || selectedBook.level || null;
          const series = pedagogicalContext.series || selectedBook.series || null;

          const cachedReference = await findVerifiedBookReference(req, {
            bookName: selectedBook.name,
            subjectName: test.matiereNom,
            level,
            series,
            activity: test.activite,
            topic: tutorState.topic,
          });

          // Aucune référence déjà vérifiée en base : on cherche réellement
          // maintenant plutôt que d'abandonner immédiatement.
          const reference = cachedReference || await searchAndVerifyBookReference(req, {
            conversationId,
            bookName: selectedBook.name,
            subjectName: test.matiereNom,
            level,
            series,
            activity: test.activite,
            topic: tutorState.topic,
          });

          if (reference) {
            tutorState.bookReferenceId = Number(reference.referenceId);

            tutorState =
              transitionTutorState(
                tutorState,
                TUTOR_EVENTS.REFERENCE_VERIFIED
              ).state;

            const reply = buildBookReferenceReply(
              reference.bookTitle || selectedBook.name,
              reference
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
              exercise: tutorState.exercise || null,
            });
          }

          // La recherche vient d'être tentée (searchAndVerifyBookReference
          // ci-dessus) et n'a rien donné d'assez fiable : le job est déjà
          // tracé dans assistant_book_search_jobs avec le détail.

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
            exercise: tutorState.exercise || null,
          });
        }
      }

      // ---------------------------------------------------------------
      // Cas : suivi après une référence vérifiée
      // ---------------------------------------------------------------

      else if (
        tutorState.phase === TUTOR_STATES.BOOK_REFERENCE
        || tutorState.phase === TUTOR_STATES.FOLLOW_UP
      ) {
        const acceptedExercise =
          tutorState.phase === TUTOR_STATES.FOLLOW_UP
          && naturalIntent
          && naturalIntent.confidence >= 0.70
          && (
            naturalIntent.intent === 'ACCEPT_PROPOSED_EXERCISE'
            || naturalIntent.intent === 'NEW_EXERCISE_REQUEST'
          );

        if (acceptedExercise) {
          tutorState =
            transitionTutorState(
              tutorState,
              TUTOR_EVENTS.NEW_EXERCISE_REQUESTED
            ).state;

          tutorState.exercise = null;
          tutorState.attempts = 0;
          tutorState.hintsUsed = 0;

          turnKind = 'GENERATE_EXERCISE';
          turnInstruction = buildExerciseGenerationInstruction();
        } else {
          turnKind = 'FOLLOW_UP';

          if (naturalIntent?.intent === 'EXAMPLE_REQUEST') {
            turnKind = 'EXAMPLE_REQUEST';
            turnInstruction =
              "L'élève demande des exemples ou une explication supplémentaire. Réponds directement avec des exemples simples liés à la notion déjà travaillée. Si la notion est géométrique et qu'une représentation aide, fournis aussi <explanation-data> avec un diagramme structuré. Ne lance pas d'exercice sauf si l'élève le demande clairement.";
          } else if (naturalIntent?.intent === 'AMBIGUOUS') {
            turnKind = 'CLARIFY_FOLLOW_UP';
            turnInstruction =
              "La réponse de l'élève est ambiguë. Ne choisis pas arbitrairement son intention. Pose une seule question courte pour clarifier ce qu'il veut faire ensuite.";
          } else {
            turnInstruction =
              "Réponds à la question de suivi de l'élève en restant strictement sur l'activité et la notion déjà travaillées. Si l'élève accepte clairement une proposition d'exercice original, donne-lui cet exercice. Ne donne jamais une nouvelle page de manuel sans référence vérifiée.";
          }

          if (tutorState.phase === TUTOR_STATES.BOOK_REFERENCE) {
            tutorState =
              transitionTutorState(
                tutorState,
                TUTOR_EVENTS.FOLLOW_UP_REQUESTED
              ).state;
          }
        }
      }

      // ---------------------------------------------------------------
      // Cas : l'élève doit confirmer sa compréhension
      // ---------------------------------------------------------------

      else if (
        tutorState.phase ===
        TUTOR_STATES.UNDERSTANDING_CHECK
      ) {
        const intent =
          naturalIntent?.confidence >= 0.70
            ? naturalIntent.intent
            : classifyUnderstandingMessage(userMessage);

        if (intent === 'UNDERSTOOD') {
          turnKind = 'GENERATE_EXERCISE';
          turnInstruction = buildExerciseGenerationInstruction();
        } else if (
          intent === 'NOT_UNDERSTOOD'
          || intent === 'EXPLANATION_REQUEST'
          || intent === 'CORRECTION_OF_TUTOR'
        ) {
          turnKind = 'REEXPLAIN';
          turnInstruction =
            "L'élève dit qu'il n'a pas compris ou corrige une mauvaise interprétation. PRENDS L'INITIATIVE D'ENSEIGNER : ne lui demande pas ce que le professeur a fait et ne lui demande pas de choisir la partie qu'il ne comprend pas. Reprends directement depuis zéro si l'incompréhension est globale. Explique étape par étape avec des mots simples, donne plusieurs exemples concrets si nécessaire et, pour toute notion géométrique, fournis OBLIGATOIREMENT un véritable <explanation-data> avec un schéma structuré. N'envoie aucun exercice tant que la compréhension n'est pas clairement confirmée. Termine par une seule vérification simple.";
        } else if (
          intent === 'EXAMPLE_REQUEST'
          || intent === 'PARTIAL_UNDERSTANDING'
        ) {
          turnKind = 'EXAMPLE_REQUEST';
          turnInstruction =
            "L'élève demande des exemples ou indique une compréhension partielle. Donne immédiatement des exemples concrets et explique chaque exemple. En géométrie, le schéma est OBLIGATOIRE : ajoute <explanation-data> avec un diagramme correspondant aux exemples. Ne lance surtout pas d'exercice tant que l'élève n'a pas clairement confirmé sa compréhension.";
        } else if (intent === 'AMBIGUOUS') {
          turnKind = 'CLARIFY_UNDERSTANDING';
          turnInstruction =
            "La réponse de l'élève est réellement ambiguë par rapport à ton dernier message. Ne suppose pas qu'il a compris et ne lance surtout pas d'exercice. Pose une seule question courte qui clarifie précisément ce qu'il veut dire.";
        } else if (intent === 'FOLLOW_UP_QUESTION') {
          turnKind = 'FOLLOW_UP_QUESTION';
          turnInstruction =
            "L'élève pose une question de suivi. Réponds directement et utilement à cette question. Si la notion est visuelle, utilise une représentation structurée. Ne lance pas d'exercice tant que l'élève n'a pas clairement confirmé sa compréhension.";
        } else {
          turnKind = 'CLARIFY_UNDERSTANDING';
          turnInstruction =
            "L'élève n'a pas confirmé clairement sa compréhension. Ne transforme jamais une réponse courte en confirmation. Demande simplement ce qu'il veut clarifier ou reformule brièvement la notion, sans lancer d'exercice.";
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
        if (tutorState.exercise) {
          turnKind =
            'ASSESS_EXERCISE';

          turnInstruction =
            buildExerciseAssessmentInstruction(
              tutorState.exercise
            );
        } else {
          turnKind =
            'CLARIFY_UNDERSTANDING';

          turnInstruction =
            "Le suivi de l'exercice n'est pas disponible. Reprends brièvement la notion et demande naturellement si l'élève a compris.";
        }
      }

      // ---------------------------------------------------------------
      // 9. Historique de la conversation
      // ---------------------------------------------------------------

      const [history] = await req.db.query(
        `SELECT
           role,
           content
         FROM assistant_message
         WHERE conversation_id = ?
         ORDER BY created_at ASC, id ASC`,
        [conversationId]
      );

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
        ...history.map((h) => ({
          role: h.role,
          content: h.content,
        })),
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
      // 13. Validation déterministe d'une réponse exacte
      // ---------------------------------------------------------------
      //
      // Avant même de demander à Claude d'évaluer,
      // le backend vérifie si la réponse correspond
      // directement à une réponse attendue.
      // ---------------------------------------------------------------

      if (
        turnKind === 'ASSESS_EXERCISE' &&
        answerMatchesExpected(
          userMessage,
          tutorState.exercise
        )
      ) {
        tutorState =
          transitionTutorState(
            tutorState,
            TUTOR_EVENTS.ANSWER_CORRECT
          ).state;

        const reply =
          `Bravo ! C'est correct. ${tutorState.exercise.criteria[0]} Pour continuer avec ton propre livre, quel manuel de ${test.matiereNom} utilises-tu à la maison ?`;

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

        await req.db.query(
          `INSERT INTO assistant_message
             (
               conversation_id,
               role,
               content
             )
           VALUES (?, 'assistant', ?)`,
          [
            conversationId,
            reply,
          ]
        );

        return res.json({
          reply,
          inputMode:
            getPublicTutorMode(
              tutorState
            ),
        });
      }

      // ---------------------------------------------------------------
      // 14. Appel Claude
      // ---------------------------------------------------------------

      let rawReply = '';
      let reply = '';
      let generatedExercise = null;
      let explanationSegments = [];

      if (turnKind === 'GENERATE_EXERCISE') {
        const generated = await generateStructuredExercise({
          systemPrompt,
          messages,
          subjectName: test.matiereNom,
          topic: tutorState.topic || pedagogicalContext.currentActivity.topic,
          activity: test.activite,
        });

        rawReply = generated.rawReply || '';
        generatedExercise = generated.exercise;
        reply = generated.visibleText || rawReply || '';
      } else {
        const generatedExplanation =
          await generateStructuredExplanation({
            systemPrompt,
            messages,
            subjectName: test.matiereNom,
            topic:
              tutorState.topic
              || pedagogicalContext.currentActivity.topic
              || test.activite,
          });

        rawReply =
          generatedExplanation.rawReply || '';

        explanationSegments =
          generatedExplanation.segments?.length
            ? generatedExplanation.segments
            : [{ text: "Désolé, je n'ai pas pu formuler de réponse.", diagram: null }];

        // Le texte complet reste nécessaire pour l'historique de la
        // conversation renvoyé à Claude aux tours suivants.
        reply = explanationSegments
          .map((segment) => segment.text)
          .filter(Boolean)
          .join('\n\n');
      }

      // ---------------------------------------------------------------
      // 15. Traitement d'une évaluation d'exercice
      // ---------------------------------------------------------------

      if (
        turnKind === 'ASSESS_EXERCISE'
      ) {
        const assessment =
          extractTaggedData(
            rawReply,
            'exercise-assessment'
          ).data;

        const acceptedByBackend =
          isValidAssessment(
            assessment,
            tutorState.exercise
          ) &&
          assessment.verdict ===
            'correct';

        // -------------------------------------------------------------
        // Réponse correcte
        // -------------------------------------------------------------

        if (acceptedByBackend) {
          tutorState =
            transitionTutorState(
              tutorState,
              TUTOR_EVENTS.ANSWER_CORRECT
            ).state;

          reply =
            `Bravo ! C'est correct. ${shortText(
              assessment.reason
            )} Pour continuer avec ton propre livre, quel manuel de ${test.matiereNom} utilises-tu à la maison ?`;
        }

        // -------------------------------------------------------------
        // Réponse incorrecte
        // -------------------------------------------------------------

        else {
          tutorState =
            transitionTutorState(
              tutorState,
              TUTOR_EVENTS.ANSWER_INCORRECT
            ).state;

          // -----------------------------------------------------------
          // Après 3 tentatives :
          // on réexplique la méthode.
          // -----------------------------------------------------------

          if (
            tutorState.attempts >= 3
          ) {
            tutorState =
              transitionTutorState(
                tutorState,
                TUTOR_EVENTS.EXERCISE_REEXPLAINED
              ).state;

            reply =
              `Tu as fait de vrais efforts. Reprenons ensemble : ${tutorState.exercise.solutionOutline} Est-ce que cette méthode est plus claire maintenant ?`;
          }

          // -----------------------------------------------------------
          // Avant 3 tentatives :
          // on donne progressivement des indices.
          // -----------------------------------------------------------

          else {
            const hintIndex =
              Math.min(
                tutorState.hintsUsed,
                tutorState.exercise
                  .hintPlan.length - 1
              );

            const hint =
              tutorState.exercise
                .hintPlan[hintIndex];

            tutorState.hintsUsed += 1;

            reply =
              `Tu es proche. ${hint} Essaie encore tranquillement.`;
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

          if (tutorState.phase === TUTOR_STATES.APPLICATION_EXERCISE) {
            tutorState.updatedAt = new Date().toISOString();
          } else {
            tutorState =
              transitionTutorState(
                tutorState,
                TUTOR_EVENTS.UNDERSTOOD
              ).state;
          }

          reply =
            (reply && !reply.includes('<exercise-data>')
              ? reply
              : parsed.visibleText) ||
            'Très bien. Essayons ce petit exercice :';

          if (
            !reply.includes(
              exercise.prompt
            )
          ) {
            reply =
              `${reply}\n\n${exercise.prompt}`;
          }
        } else {
          // Sans structure complète, l'état ne bouge pas : le backend ne
          // peut pas corriger de manière fiable un exercice mal structuré.
          // Le message reste honnête : il ne promet jamais un exercice qui
          // n'arrivera pas, pour ne pas laisser l'élève bloqué en silence.
          reply =
            "Je n'arrive pas à préparer un exercice fiable sur cette notion pour l'instant. "
            + 'Tu peux me redemander un exercice dans un instant, ou continuer à me poser des questions sur la notion.';
        }
      }

      // ---------------------------------------------------------------
      // 17. Demande d'exemples / explication complémentaire
      // ---------------------------------------------------------------

      else if (
        turnKind === 'EXAMPLE_REQUEST'
      ) {
        tutorState.exercise = null;
        tutorState.attempts = 0;
        tutorState.hintsUsed = 0;

        tutorState =
          transitionTutorState(
            tutorState,
            TUTOR_EVENTS.EXAMPLE_REQUESTED
          ).state;

        tutorState =
          transitionTutorState(
            tutorState,
            TUTOR_EVENTS.EXPLANATION_SENT
          ).state;
      }

      // ---------------------------------------------------------------
      // 18. Réexplication
      // ---------------------------------------------------------------

      else if (
        turnKind === 'REEXPLAIN'
      ) {
        tutorState.exercise = null;
        tutorState.attempts = 0;
        tutorState.hintsUsed = 0;

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
      // 19. Première explication
      // ---------------------------------------------------------------

      else if (
        turnKind === 'EXPLANATION' &&
        tutorState.phase ===
          TUTOR_STATES.EXPLANATION
      ) {
        tutorState =
          transitionTutorState(
            tutorState,
            TUTOR_EVENTS.EXPLANATION_SENT
          ).state;
      }

      // ---------------------------------------------------------------
      // 21. Sauvegarde de l'état pédagogique
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

      await req.db.query(
        `INSERT INTO assistant_message
           (
             conversation_id,
             role,
             content,
             explanation_segments
           )
         VALUES (?, 'assistant', ?, ?)`,
        [
          conversationId,
          reply,
          explanationSegments.length
            ? JSON.stringify(explanationSegments)
            : null,
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

      res.json({
        reply,
        inputMode:
          getPublicTutorMode(
            tutorState
          ),
        exercise: tutorState.exercise || null,
        explanationSegments,
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
