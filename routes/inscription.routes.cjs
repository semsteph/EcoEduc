// =====================================================================
//  Inscription d'un nouvel élève
//  Monté dans server.cjs avec : app.use('/api', require('./routes/inscription.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT } = require('../server-lib/auth.cjs');
const { fetchClotureParams } = require('../server-lib/clotureParams.cjs');

// Route pour ajouter un élève
router.post('/inscription', authenticateJWT, async (req, res) => {
  const { nom, prenom, dateNaissance, sexe, classe, parentId, etablissementId, anneeScolaireId } = req.body;

  if (!nom || !prenom || !dateNaissance || !sexe || !classe || !parentId || !etablissementId || !anneeScolaireId) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    const params = await fetchClotureParams(req.db, etablissementId);
    const [effectifRows] = await req.db.query(
      'SELECT COUNT(*) AS total FROM eleve WHERE classe_id = ?',
      [classe]
    );
    const effectifActuel = effectifRows[0].total;

    if (effectifActuel >= params.effectifMaxParClasse) {
      return res.status(409).json({
        error: `Effectif maximum atteint pour cette classe (${effectifActuel}/${params.effectifMaxParClasse}). Impossible d'inscrire un élève supplémentaire.`
      });
    }

    // Insertion de l'élève dans la base de données
    const [result] = await req.db.query(
      'INSERT INTO eleve (nom, prenom, date_naissance, sexe, classe_id, Parents_id, etablissement_id, Annee_scolaire_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nom, prenom, dateNaissance, sexe, classe, parentId, etablissementId, anneeScolaireId]
    );

    // Récupération des informations de l'élève ajouté
    const [rows] = await req.db.query(
      'SELECT id, nom, prenom, date_naissance AS dateNaissance, sexe, classe_id AS classe, Parents_id AS parentId FROM eleve WHERE id = ?',
      [result.insertId] // Utilisez l'ID de l'insertion pour récupérer les données
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erreur lors de l\'inscription de l\'élève:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}); 

module.exports = router;
