// =====================================================================
//  Gestion administrative des comptes parents
//  Monté dans server.cjs avec : app.use('/api', require('./routes/parents.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT } = require('../server-lib/auth.cjs');
const bcrypt = require('bcrypt');

router.post('/Parents', async (req, res) => {
  const {
    name,
    firstName,
    contact,
    email,
    username,
    password,
    etablissementId,
    anneeScolaireId, // ✅ ajouté côté front
  } = req.body;

  // ✅ validation
  if (
    !name ||
    !firstName ||
    !contact ||
    !email ||
    !username ||
    !password ||
    !etablissementId ||
    !anneeScolaireId
  ) {
    return res.status(400).json({ error: 'Tous les champs sont requis (y compris anneeScolaireId).' });
  }

  try {
    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Insertion du parent (avec Annee_scolaire_id)
    const [result] = await req.db.query(
      `INSERT INTO parents
        (nom, prenom, contact, email, nom_utilisateur, mot_de_passe, etablissement_id, Annee_scolaire_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, firstName, contact, email, username, hashedPassword, etablissementId, anneeScolaireId]
    );

    // ✅ Récupération des infos du parent ajouté (table = parents en minuscule)
    const [rows] = await req.db.query(
      `SELECT
         id,
         nom AS name,
         prenom AS firstName,
         contact AS phone,
         email,
         etablissement_id AS etablissementId,
         Annee_scolaire_id AS anneeScolaireId
       FROM parents
       WHERE id = ?`,
      [result.insertId]
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Erreur lors de l'ajout du parent:", error);

    // ✅ message plus clair si doublon username/email (optionnel)
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: "Nom d'utilisateur ou email déjà utilisé." });
    }

    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour récupérer les parents d'un établissement
router.get('/Parents/:etablissementId', authenticateJWT, async (req, res) => {
  const { etablissementId } = req.params;
  try {
    const [rows] = await req.db.query(
      'SELECT id, nom AS name, prenom AS firstName, email, contact, nom_utilisateur AS username FROM parents WHERE etablissement_id = ?',
      [etablissementId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des parents:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour modifier un parent
router.put('/Parents/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { name, firstName, email, contact, username, password } = req.body;
  try {
    const [existing] = await req.db.query('SELECT etablissement_id FROM parents WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Parent non trouvé' });
    }
    if (Number(existing[0].etablissement_id) !== Number(req.user.etablissementId)) {
      return res.status(403).json({ error: "Ce parent n'appartient pas à votre établissement." });
    }

    // ✅ Ne toucher au mot de passe que s'il est explicitement fourni (sinon on
    // écrasait mot_de_passe avec `undefined`/NULL à chaque modification de profil,
    // ce qui bloquait le parent hors de son compte au login suivant).
    let query = 'UPDATE parents SET nom = ?, prenom = ?, email = ?, contact = ?, nom_utilisateur = ?';
    const params = [name, firstName, email, contact, username];

    if (password) {
      const hashed = await bcrypt.hash(String(password), 10);
      query += ', mot_de_passe = ?';
      params.push(hashed);
    }

    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await req.db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Parent non trouvé' });
    }

    const updatedParent = {
      id,
      name,
      firstName,
      email,
      contact,
      username,
    };

    res.json(updatedParent);
  } catch (error) {
    console.error('Erreur lors de la modification du parent:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour supprimer un parent
router.delete('/Parents/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const [target] = await req.db.query('SELECT etablissement_id FROM parents WHERE id = ?', [id]);
    if (target.length === 0) {
      return res.status(404).json({ error: 'Parent non trouvé' });
    }
    if (Number(target[0].etablissement_id) !== Number(req.user.etablissementId)) {
      return res.status(403).json({ error: "Ce parent n'appartient pas à votre établissement." });
    }

    // Vérifier si des élèves sont associés à ce parent
    const [eleves] = await req.db.query('SELECT nom, prenom FROM eleve WHERE Parents_id = ?', [id]);

    if (eleves.length > 0) {
      // Si des élèves sont associés, renvoyer un message d'erreur avec les noms des élèves
      const eleveNames = eleves.map(eleve => `${eleve.prenom} ${eleve.nom}`).join(', ');
      return res.status(400).json({
        error: `Impossible de supprimer ce parent car il a au moins un élève associé : ${eleveNames}. Veuillez supprimer cet élève avant de supprimer ce parent.`
      });
    }

    // Si aucun élève n'est associé, supprimer le parent
    const [result] = await req.db.query('DELETE FROM parents WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Parent non trouvé' });
    }

    res.status(204).send(); // Réponse sans contenu
  } catch (error) {
    console.error('Erreur lors de la suppression du parent:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

//api pour notification administration dashbord
router.get('/parentid/:parentId', authenticateJWT, async (req, res) => {
  const  parentId  = req.params.parentId;
  try {
    const [results] = await req.db.query(
      'SELECT id, nom, prenom, email, contact, nom_utilisateur, etablissement_id FROM parents WHERE id = ?',
      [parentId]
    );
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ message: "Le parent n'existe pas" });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des informations du parent:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
