// =====================================================================
//  Compte unique enseignant
//
//  Un enseignant a UN compte (identifiant ou e-mail ou téléphone + mot de
//  passe) et une fiche par établissement où il enseigne (`enseignants`,
//  inchangée pour les notes, affectations, devoirs...). Une école qui ajoute
//  un professeur déjà connu (même téléphone ou e-mail) rattache simplement sa
//  fiche au compte existant. Une école qui le retire ne touche qu'à sa fiche.
// =====================================================================
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const chiffres = (t) => String(t || '').replace(/\D/g, '');
const emailNorm = (e) => String(e || '').trim().toLowerCase();

// Comptes correspondant à ce que l'enseignant tape pour se connecter.
async function comptesPourIdentifiant(conn, identifiant) {
  const ident = String(identifiant || '').trim().toLowerCase();
  if (!ident) return [];
  const tel = chiffres(ident);
  const [rows] = await conn.query(
    `SELECT * FROM compte_enseignant
     WHERE LOWER(nom_utilisateur) = ? OR (email IS NOT NULL AND email = ?)
        OR (? <> '' AND LENGTH(?) >= 8 AND telephone = ?)`,
    [ident, ident, tel, tel, tel]
  );
  return rows;
}

// Mot de passe : bcrypt ; anciens comptes en clair migrés à la volée.
async function motDePasseValide(conn, compte, saisi) {
  const stocke = String(compte.mot_de_passe || '').trim();
  const mdp = String(saisi || '').trim();
  if (!mdp) return false;
  if (/^\$2[aby]\$/.test(stocke)) return bcrypt.compare(mdp, stocke);
  if (mdp !== stocke) return false;
  const hash = await bcrypt.hash(mdp, 10);
  await conn.query('UPDATE compte_enseignant SET mot_de_passe = ? WHERE id = ?', [hash, compte.id]);
  return true;
}

// Établissements où le compte enseigne encore.
async function fichesActives(conn, compteIds) {
  if (!compteIds.length) return [];
  const [rows] = await conn.query(
    `SELECT e.id, e.compte_id, e.nom, e.prenom, e.nom_utilisateur, e.etablissement_id, et.nom AS etablissement_nom
     FROM enseignants e JOIN etablissement et ON et.id = e.etablissement_id
     WHERE e.compte_id IN (?) AND e.actif = 1
     ORDER BY et.nom`,
    [compteIds]
  );
  return rows;
}

function signerJeton(fiche) {
  return jwt.sign(
    {
      id: fiche.id,
      compte_id: fiche.compte_id,
      username: fiche.nom_utilisateur,
      etablissement: fiche.etablissement_id,
      enseignant_nom: fiche.nom,
      enseignant_prenom: fiche.prenom,
      etablissement_nom: fiche.etablissement_nom,
    },
    process.env.JWT_SECRET,
    // 24 h comme l'administration : avec 1 h, un enseignant était
    // déconnecté au milieu de sa saisie de notes.
    { expiresIn: '24h' }
  );
}

// Jeton court qui prouve le mot de passe, le temps de choisir l'école.
function jetonDeChoix(fiches) {
  return jwt.sign({ purpose: 'choix-etablissement', fiches: fiches.map((f) => f.id) }, process.env.JWT_SECRET, { expiresIn: '10m' });
}

// Identifiant libre (unique dans toute l'application) : « kossi.adje »,
// sinon « kossi.adje2 », « kossi.adje3 »...
async function identifiantLibre(conn, souhaite) {
  const base = String(souhaite || '').trim().toLowerCase() || 'enseignant';
  for (let n = 1; n < 500; n += 1) {
    const essai = n === 1 ? base : `${base}${n}`;
    const [pris] = await conn.query('SELECT id FROM compte_enseignant WHERE LOWER(nom_utilisateur) = ? LIMIT 1', [essai]);
    if (!pris.length) return essai;
  }
  return `${base}${Date.now()}`;
}

// Compte déjà connu d'après le téléphone ou l'e-mail saisis par l'école.
// Plusieurs comptes possibles (anciennes fiches) : celui qui a les deux,
// sinon aucun (on ne devine pas).
async function compteConnu(conn, { email, telephone }) {
  const mail = emailNorm(email);
  const tel = chiffres(telephone);
  if (!mail && tel.length < 8) return null;
  const [rows] = await conn.query(
    `SELECT * FROM compte_enseignant
     WHERE (? <> '' AND email = ?) OR (LENGTH(?) >= 8 AND telephone = ?)`,
    [mail, mail, tel, tel]
  );
  if (rows.length <= 1) return rows[0] || null;
  const lesDeux = rows.filter((r) => mail && tel && r.email === mail && r.telephone === tel);
  return lesDeux.length === 1 ? lesDeux[0] : null;
}

module.exports = {
  chiffres, emailNorm, comptesPourIdentifiant, motDePasseValide, fichesActives,
  signerJeton, jetonDeChoix, identifiantLibre, compteConnu,
};
