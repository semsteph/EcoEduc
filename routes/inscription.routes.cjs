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

  if (Number(etablissementId) !== Number(req.user.etablissementId)) {
    return res.status(403).json({ error: "Vous n'avez pas accès à cet établissement." });
  }

  try {
    const [classeRows] = await req.db.query('SELECT id FROM classes WHERE id = ? AND etablissement_id = ?', [classe, etablissementId]);
    if (classeRows.length === 0) {
      return res.status(403).json({ error: "Cette classe n'appartient pas à votre établissement." });
    }
    // Même élève déjà inscrit (double clic, ou inscription refaite) : refusé.
    const [doublon] = await req.db.query(
      "SELECT id FROM eleve WHERE etablissement_id = ? AND nom = ? AND prenom = ? AND date_naissance = ? AND statut = 'actif'",
      [etablissementId, nom.trim(), prenom.trim(), dateNaissance]
    );
    if (doublon.length > 0) {
      return res.status(409).json({ error: `${prenom} ${nom}, né(e) le ${dateNaissance}, est déjà inscrit(e).` });
    }

    const params = await fetchClotureParams(req.db, etablissementId);
    // Seuls les élèves présents comptent dans l'effectif (pas les partis).
    const [effectifRows] = await req.db.query(
      "SELECT COUNT(*) AS total FROM eleve WHERE classe_id = ? AND statut = 'actif'",
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
      [nom.trim(), prenom.trim(), dateNaissance, sexe, classe, parentId, etablissementId, anneeScolaireId]
    );

    // Matricule automatique et unique : année d'inscription + numéro.
    const [[anneeRow]] = await req.db.query('SELECT nom_annee FROM annee_scolaire WHERE id = ?', [anneeScolaireId]);
    const debut = String(anneeRow?.nom_annee || new Date().getFullYear()).slice(0, 4);
    await req.db.query('UPDATE eleve SET matricule = ? WHERE id = ? AND matricule IS NULL', [`${debut}-${String(result.insertId).padStart(5, '0')}`, result.insertId]);

    // Récupération des informations de l'élève ajouté
    const [rows] = await req.db.query(
      'SELECT id, matricule, nom, prenom, date_naissance AS dateNaissance, sexe, classe_id AS classe, Parents_id AS parentId FROM eleve WHERE id = ?',
      [result.insertId] // Utilisez l'ID de l'insertion pour récupérer les données
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erreur lors de l\'inscription de l\'élève:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}); 

module.exports = router;
