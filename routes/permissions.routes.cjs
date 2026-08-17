// =====================================================================
//  Permissions (autorisations de sortie/absence)
//  Monté dans server.cjs avec : app.use('/api', require('./routes/permissions.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, getEleveDuParentOr403 } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');

// pour administration
// ✅ Nouvelle version sans permissions_vues
router.get('/permissions/:etablissementId/:anneeScolaireId', authenticateJWT, async (req, res) => {
  const { etablissementId, anneeScolaireId } = req.params;

  if (Number(etablissementId) !== Number(req.user.etablissementId)) {
    return res.status(403).json({ message: "Vous n'avez pas accès à cet établissement." });
  }

  try {
    const [permissions] = await req.db.query(
      `SELECT * FROM permission 
       WHERE etablissement_id = ? 
         AND Annee_scolaire_id = ? 
         AND MONTH(Date) = MONTH(CURDATE())`,
      [etablissementId, anneeScolaireId]
    );

    res.status(200).json(permissions);
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.put('/permissions/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { is_read, statut } = req.body;

  try {
    const [owner] = await req.db.query('SELECT etablissement_id FROM permission WHERE id = ?', [id]);
    if (owner.length === 0) {
      return res.status(404).json({ message: 'Permission non trouvée' });
    }
    if (Number(owner[0].etablissement_id) !== Number(req.user.etablissementId)) {
      return res.status(403).json({ message: "Cette permission n'appartient pas à votre établissement." });
    }

    if (is_read !== undefined) {
      await req.db.query(
        `UPDATE permission SET is_read = ? WHERE id = ?`,
        [is_read ? 1 : 0, id]
      );
    }

    if (statut !== undefined) {
      await req.db.query(
        `UPDATE permission SET Statut = ? WHERE id = ?`,
        [statut, id]
      );
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour ajouter une nouvelle permission
router.post('/permissions/:childId', authenticateJWT, async (req, res) => {
  const { date, motif, duree, contact, childId, etablissementId, anneeScolaireId } = req.body;

  if (!date || !motif || !duree || !contact || !etablissementId || !anneeScolaireId) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
  }

  if (!(await getEleveDuParentOr403(req, res, childId))) return;

  try {
    const [result] = await req.db.query(
      'INSERT INTO permission (date, motif, duree, contact, eleve_id, etablissement_id, Annee_scolaire_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [date, motif, duree, contact, childId, etablissementId, anneeScolaireId]
    );
    res.status(201).json({ message: 'Permission ajoutée avec succès', id: result.insertId });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/// Route pour récupérer les permissions par enfant et établissement
router.get('/permissions/:childId/:etablissementId/:anneeScolaireId', authenticateJWT, async (req, res) => {
  const { childId, etablissementId, anneeScolaireId } = req.params; // Récupération des IDs de l'enfant et de l'établissement depuis les paramètres d'URL

  if (!(await getEleveDuParentOr403(req, res, childId))) return;

  try {
    // Requête SQL pour récupérer les permissions d'un enfant spécifique dans un établissement donné
    const [rows] = await req.db.query(
      'SELECT * FROM permission WHERE eleve_id = ? AND etablissement_id = ? AND  Annee_scolaire_id = ?',
      [childId, etablissementId, anneeScolaireId ]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour supprimer une permission
router.delete('/permissions/:permissionId', authenticateJWT, async (req, res) => {
  const { permissionId } = req.params;

  try {
    const [owner] = await db.query(
      `SELECT e.Parents_id FROM permission p JOIN eleve e ON e.id = p.eleve_id WHERE p.id = ?`,
      [permissionId]
    );
    if (owner.length === 0) {
      return res.status(404).json({ message: 'Permission non trouvée' });
    }
    if (Number(owner[0].Parents_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Cette permission n'appartient pas à votre compte." });
    }

    const [result] = await db.query('DELETE FROM permission WHERE id = ?', [permissionId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Permission non trouvée' });
    }

    res.json({ message: 'Permission supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour mettre à jour le statut d'une permission
router.put('/permissions/:id', async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;

  try {
    const [result] = await req.db.query(
      'UPDATE permission SET statut = ? WHERE id = ?',
      [statut, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).send('Permission non trouvée');
    }

    res.send('Statut de la permission mis à jour avec succès');
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la permission:', error);
    res.status(500).send('Erreur serveur');
  }
});

module.exports = router;
