// =====================================================================
//  Comptes de l'administration (collaborateurs, login)
//  Monté dans server.cjs avec : app.use('/api', require('./routes/administration.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, requireEtablissement } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET;

function genererMotDePasseTemporaire() {
  return crypto.randomBytes(6).toString('hex');
}

function parseModulesAutorises(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

// Connexion d'un collaborateur (comptable, secrétaire, etc.)
router.post('/loginAdministration', async (req, res) => {
  const { email, mot_de_passe } = req.body;

  if (!email || !mot_de_passe) {
    return res.status(400).json({ message: 'Email et mot de passe requis.' });
  }

  try {
    const [rows] = await db.query(
      `SELECT administrations.*, etablissement.nom AS etablissement_nom
       FROM administrations
       LEFT JOIN etablissement ON etablissement.id = administrations.etablissement_id
       WHERE administrations.email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Email incorrect.' });
    }

    const collaborateur = rows[0];
    const passwordOk = await bcrypt.compare(String(mot_de_passe), collaborateur.mot_de_passe);

    if (!passwordOk) {
      return res.status(401).json({ message: 'Mot de passe incorrect.' });
    }

    const modulesAutorises = parseModulesAutorises(collaborateur.modules_autorises);

    const token = jwt.sign(
      {
        type: 'administration',
        administrationId: collaborateur.id,
        etablissementId: collaborateur.etablissement_id,
        nom: collaborateur.nom,
        prenom: collaborateur.prenom,
        poste: collaborateur.poste,
        modules_autorises: modulesAutorises,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Connexion réussie.',
      token,
      administration: {
        id: collaborateur.id,
        nom: collaborateur.nom,
        prenom: collaborateur.prenom,
        poste: collaborateur.poste,
        etablissement_id: collaborateur.etablissement_id,
        etablissement_nom: collaborateur.etablissement_nom,
        modules_autorises: modulesAutorises,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la connexion collaborateur :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Liste des collaborateurs de l'établissement du fondateur connecté
router.get('/administration/collaborateurs', authenticateJWT, requireEtablissement, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nom, prenom, poste, telephone, email, modules_autorises FROM administrations WHERE etablissement_id = ? ORDER BY nom, prenom',
      [req.user.etablissementId]
    );
    res.json(rows.map((row) => ({ ...row, modules_autorises: parseModulesAutorises(row.modules_autorises) })));
  } catch (error) {
    console.error('Erreur lors de la récupération des collaborateurs :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Création d'un collaborateur (mot de passe généré automatiquement)
router.post('/administration/collaborateurs', authenticateJWT, requireEtablissement, async (req, res) => {
  const { nom, prenom, poste, telephone, email, modules_autorises } = req.body;

  if (!nom || !prenom || !poste || !email) {
    return res.status(400).json({ message: 'Nom, prénom, poste et email sont requis.' });
  }

  try {
    const motDePasseTemporaire = genererMotDePasseTemporaire();
    const motDePasseHash = await bcrypt.hash(motDePasseTemporaire, 10);
    const modulesAutorises = Array.isArray(modules_autorises) ? modules_autorises : [];

    const [result] = await db.query(
      `INSERT INTO administrations (nom, prenom, poste, telephone, email, mot_de_passe, etablissement_id, modules_autorises)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nom, prenom, poste, telephone || null, email, motDePasseHash, req.user.etablissementId, JSON.stringify(modulesAutorises)]
    );

    res.status(201).json({
      message: 'Collaborateur créé avec succès.',
      collaborateur: {
        id: result.insertId,
        nom,
        prenom,
        poste,
        telephone: telephone || null,
        email,
        modules_autorises: modulesAutorises,
      },
      mot_de_passe_temporaire: motDePasseTemporaire,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Un collaborateur avec cet email existe déjà.' });
    }
    console.error('Erreur lors de la création du collaborateur :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Modification d'un collaborateur (poste, modules autorisés, coordonnées)
router.put('/administration/collaborateurs/:id', authenticateJWT, requireEtablissement, async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, poste, telephone, email, modules_autorises } = req.body;

  try {
    const [rows] = await db.query('SELECT id FROM administrations WHERE id = ? AND etablissement_id = ?', [
      id,
      req.user.etablissementId,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Collaborateur introuvable.' });
    }

    await db.query(
      `UPDATE administrations
       SET nom = ?, prenom = ?, poste = ?, telephone = ?, email = ?, modules_autorises = ?
       WHERE id = ? AND etablissement_id = ?`,
      [
        nom,
        prenom,
        poste,
        telephone || null,
        email,
        JSON.stringify(Array.isArray(modules_autorises) ? modules_autorises : []),
        id,
        req.user.etablissementId,
      ]
    );

    res.json({ message: 'Collaborateur mis à jour avec succès.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Un collaborateur avec cet email existe déjà.' });
    }
    console.error('Erreur lors de la mise à jour du collaborateur :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Suppression d'un collaborateur
router.delete('/administration/collaborateurs/:id', authenticateJWT, requireEtablissement, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM administrations WHERE id = ? AND etablissement_id = ?', [
      id,
      req.user.etablissementId,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Collaborateur introuvable.' });
    }
    res.json({ message: 'Collaborateur supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression du collaborateur :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Réinitialisation du mot de passe d'un collaborateur, déclenchée par le fondateur
router.post('/administration/collaborateurs/:id/reset-password',
  authenticateJWT,
  requireEtablissement,
  async (req, res) => {
    const { id } = req.params;

    try {
      const [rows] = await db.query('SELECT id FROM administrations WHERE id = ? AND etablissement_id = ?', [
        id,
        req.user.etablissementId,
      ]);
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Collaborateur introuvable.' });
      }

      const motDePasseTemporaire = genererMotDePasseTemporaire();
      const motDePasseHash = await bcrypt.hash(motDePasseTemporaire, 10);

      await db.query('UPDATE administrations SET mot_de_passe = ? WHERE id = ?', [motDePasseHash, id]);

      res.json({ message: 'Mot de passe réinitialisé avec succès.', mot_de_passe_temporaire: motDePasseTemporaire });
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du mot de passe :', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  }
);

// Le collaborateur change lui-même son mot de passe
router.put('/administration/mon-mot-de-passe', authenticateJWT, async (req, res) => {
  if (!req.user || req.user.type !== 'administration') {
    return res.status(403).json({ message: 'Réservé aux comptes collaborateurs.' });
  }

  const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;

  if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
    return res.status(400).json({ message: 'Ancien et nouveau mot de passe requis.' });
  }

  try {
    const [rows] = await db.query('SELECT mot_de_passe FROM administrations WHERE id = ?', [
      req.user.administrationId,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Compte introuvable.' });
    }

    const passwordOk = await bcrypt.compare(String(ancien_mot_de_passe), rows[0].mot_de_passe);
    if (!passwordOk) {
      return res.status(401).json({ message: 'Ancien mot de passe incorrect.' });
    }

    const nouveauHash = await bcrypt.hash(String(nouveau_mot_de_passe), 10);
    await db.query('UPDATE administrations SET mot_de_passe = ? WHERE id = ?', [
      nouveauHash,
      req.user.administrationId,
    ]);

    res.json({ message: 'Mot de passe modifié avec succès.' });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
