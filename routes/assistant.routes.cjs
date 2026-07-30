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
const axios = require('axios');
const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');

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

Règles strictes à respecter :
1. Reste strictement dans le sujet de cette activité. Si l'élève pose une question hors sujet, réponds gentiment que tu es là uniquement pour l'aider sur "${activity}" et invite-le à en reparler avec son professeur pour le reste.
2. N'écris jamais directement la réponse finale d'un exercice ou devoir. Guide par des questions et des indices (méthode socratique) pour que l'élève trouve la réponse par lui-même.
3. Adapte ton ton à un enfant : phrases courtes, encourageantes, sans jargon, sans condescendance.
4. Si la question semble dangereuse, inappropriée, ou clairement hors du cadre scolaire, refuse poliment et suggère d'en parler à un adulte (parent ou professeur).
5. Ne prétends jamais être un humain ; tu es un assistant IA.
6. Réponds en français, dans un style simple et court (3 à 5 phrases maximum, sauf si une explication plus longue est vraiment nécessaire).`;
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
      `SELECT t.id, t.activite, t.date, m.nom AS matiereNom
       FROM tests t
       JOIN matieres m ON t.matière_id = m.id
       WHERE t.id = ? AND t.classe_id = ? AND t.Annee_scolaire_id = ? AND t.etablissement_id = ?`,
      [testId, eleve.classe_id, eleve.Annee_scolaire_id, eleve.etablissement_id]
    );
    if (testRows.length === 0) {
      return res.status(404).json({ message: 'Entrée de cahier de texte introuvable pour cet élève.' });
    }
    const test = testRows[0];

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

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: userMessage },
    ];

    // On persiste le message utilisateur avant l'appel OpenAI pour ne rien
    // perdre si l'appel échoue (quota, réseau, etc.).
    await req.db.query(
      `INSERT INTO assistant_message (conversation_id, role, content) VALUES (?, 'user', ?)`,
      [conversationId, userMessage]
    );

    const apiKey = process.env.OPENAI_API_KEY;
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      { model: 'gpt-4o-mini', messages, max_tokens: 300, temperature: 0.4 },
      {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );

    const reply = response.data.choices[0].message.content;

    await req.db.query(
      `INSERT INTO assistant_message (conversation_id, role, content) VALUES (?, 'assistant', ?)`,
      [conversationId, reply]
    );

    res.json({ reply });
  } catch (err) {
    console.error('Erreur POST /assistant/message :', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      message: "Une erreur est survenue avec l'assistant. Réessaie plus tard.",
    });
  }
});

module.exports = router;
