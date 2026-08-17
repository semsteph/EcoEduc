// =====================================================================
//  Middlewares d'authentification partagés par tous les routers de /routes.
// =====================================================================

const jwt = require('jsonwebtoken');
const db = require('./db.cjs');

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Middleware pour authentifier les requêtes
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1) header manquant
  if (!authHeader) {
    return res.status(401).json({ message: "Token manquant" });
  }

  // 2) format attendu : Bearer <token>
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Format token invalide (Bearer requis)" });
  }

  const token = authHeader.split(" ")[1];

  // 3) token vide
  if (!token) {
    return res.status(401).json({ message: "Token manquant" });
  }

  // 4) vérification token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      const msg = err.name === "TokenExpiredError" ? "Token expiré" : "Token invalide";
      return res.status(403).json({ message: msg });
    }

    // decoded contient { id, etablissementId, role, iat, exp }
    req.user = decoded;
    next();
  });
};

// Réservé au fondateur/directeur connecté (token établissement)
const requireEtablissement = (req, res, next) => {
  if (!req.user || req.user.type !== 'etablissement') {
    return res.status(403).json({ message: 'Accès réservé au fondateur/directeur.' });
  }
  next();
};

// Vérifie que l'élève appartient bien au parent authentifié (req.user.id),
// renvoie l'élève si oui, sinon répond 404/403 et renvoie null.
// Même pattern que getEleveDuParentOr403() dans routes/scolarite.routes.cjs.
async function getEleveDuParentOr403(req, res, eleveId) {
  const [rows] = await db.query(
    `SELECT id, nom, prenom, classe_id, etablissement_id, Annee_scolaire_id, Parents_id
     FROM eleve WHERE id = ?`,
    [eleveId]
  );
  if (rows.length === 0) {
    res.status(404).json({ message: "Élève introuvable." });
    return null;
  }
  if (Number(rows[0].Parents_id) !== Number(req.user.id)) {
    res.status(403).json({ message: "Cet élève n'appartient pas à votre compte." });
    return null;
  }
  return rows[0];
}

module.exports = { authenticateJWT, requireEtablissement, getEleveDuParentOr403, JWT_SECRET };
