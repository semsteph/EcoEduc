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
function buildSystemPrompt({ studentFirstName, subjectName, activity, activityDate }) {
  return `Tu es un assistant pédagogique bienveillant pour un(e) élève nommé(e) ${studentFirstName}.
Contexte : en classe de ${subjectName}, l'activité du ${activityDate} portait sur : "${activity}".

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
7. Ne prétends jamais être un humain ; tu es un assistant IA.
8. Réponds en français, dans un style simple et court (3 à 6 phrases maximum hors schéma, sauf si une explication plus longue est vraiment nécessaire pour que l'élève comprenne bien).`;
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
      `SELECT id FROM assistant_conversation WHERE eleve_id = ? AND test_id = ?`,
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
      `SELECT t.id, t.activite, t.date, t.\`matière_id\` AS matiereId, m.nom AS matiereNom
       FROM tests t
       JOIN matieres m ON t.matière_id = m.id
       WHERE t.id = ? AND t.classe_id = ? AND t.Annee_scolaire_id = ? AND t.etablissement_id = ?`,
      [testId, eleve.classe_id, eleve.Annee_scolaire_id, eleve.etablissement_id]
    );
    if (testRows.length === 0) {
      return res.status(404).json({ message: 'Entrée de cahier de texte introuvable pour cet élève.' });
    }
    const test = testRows[0];

    // Tout le cahier de texte de cette matière pour cette classe cette année :
    // donne à l'assistant une vision d'ensemble du "programme réellement couvert"
    // (on n'a pas de programme officiel en base), pas juste l'activité du jour.
    const [programmeRows] = await req.db.query(
      `SELECT date, activite FROM tests
       WHERE classe_id = ? AND \`matière_id\` = ? AND Annee_scolaire_id = ? AND etablissement_id = ?
       ORDER BY date ASC
       LIMIT 60`,
      [eleve.classe_id, test.matiereId, eleve.Annee_scolaire_id, eleve.etablissement_id]
    );

    const [convRows] = await req.db.query(
      `SELECT id FROM assistant_conversation WHERE eleve_id = ? AND test_id = ?`,
      [eleveId, testId]
    );
    let conversationId;
    if (convRows.length === 0) {
      const [insertResult] = await req.db.query(
        `INSERT INTO assistant_conversation (eleve_id, test_id, etablissement_id, annee_scolaire_id)
         VALUES (?, ?, ?, ?)`,
        [eleveId, testId, eleve.etablissement_id, eleve.Annee_scolaire_id]
      );
      conversationId = insertResult.insertId;
    } else {
      conversationId = convRows[0].id;
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

    const aiResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: systemPrompt,
      messages,
    });

    const textBlock = aiResponse.content.find((b) => b.type === 'text');
    const reply = textBlock?.text || "Désolé, je n'ai pas pu formuler de réponse.";

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
