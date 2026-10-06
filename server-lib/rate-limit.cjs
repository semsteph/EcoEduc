// =====================================================================
//  Limite d'essais sur la connexion et la réinitialisation de mot de
//  passe. Sans elle, on pouvait essayer des milliers de mots de passe ou
//  de codes à 6 chiffres à la suite.
//  Compteur en mémoire par adresse IP et par identifiant visé.
// =====================================================================
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = Number(process.env.AUTH_MAX_PER_IP || 30);
const MAX_PER_ACCOUNT = Number(process.env.AUTH_MAX_PER_ACCOUNT || 8);

const hits = new Map();

function current(key) {
  const entry = hits.get(key);
  if (!entry || Date.now() - entry.start > WINDOW_MS) return 0;
  return entry.count;
}

function bump(key) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.start > WINDOW_MS) hits.set(key, { start: now, count: 1 });
  else entry.count += 1;
}

// Nettoyage périodique (pas de fuite mémoire).
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) if (now - entry.start > WINDOW_MS) hits.delete(key);
}, WINDOW_MS).unref();

// Seuls les ÉCHECS comptent (mauvais mot de passe, code faux) : un
// utilisateur qui se connecte souvent n'est jamais bloqué ; une réussite
// remet à zéro le compteur du compte.
function authRateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'inconnu';
  const body = req.body || {};
  const account = String(body.nom_utilisateur || body.username || body.email || body.identifiant || '').trim().toLowerCase();
  const ipKey = `ip:${ip}:${req.path}`;
  const accountKey = account ? `compte:${req.path}:${account}` : null;
  if (current(ipKey) >= MAX_PER_IP || (accountKey && current(accountKey) >= MAX_PER_ACCOUNT)) {
    return res.status(429).json({ message: 'Trop de tentatives. Réessayez dans 15 minutes.' });
  }
  res.on('finish', () => {
    if (res.statusCode >= 400 && res.statusCode !== 429) {
      bump(ipKey);
      if (accountKey) bump(accountKey);
    } else if (res.statusCode < 300 && accountKey) {
      hits.delete(accountKey);
    }
  });
  next();
}

module.exports = { authRateLimit, __reset: () => hits.clear() };
