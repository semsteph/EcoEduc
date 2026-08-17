// =====================================================================
//  Matières et coefficients
//  Monté dans server.cjs avec : app.use('/api', require('./routes/matieres.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');

router.post('/Matieres', authenticateJWT, async (req, res) => {
  const { name , etablissementId} = req.body;

  if (!name || !etablissementId) {
    return res.status(400).json({ error: "Le nom de la matière est requis" });
  }
  if (Number(etablissementId) !== Number(req.user.etablissementId)) {
    return res.status(403).json({ error: "Vous n'avez pas accès à cet établissement." });
  }

  try {
    // Insertion dans la table 'Matieres'
    const result = await req.db.query('INSERT INTO matieres (nom, etablissement_id) VALUES (?, ?)', [name,etablissementId]);
    res.status(201).json({ message: 'Matière ajoutée avec succès', id: result.insertId });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la matière:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'ajout de la matiere'});
    }
  });

// ✅ DELETE : supprimer une matière par son id (avec vérif table enseigner)
router.delete('/Matieres/:id', authenticateJWT, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;

    const [target] = await conn.query('SELECT etablissement_id FROM matieres WHERE id = ?', [id]);
    if (target.length === 0) {
      return res.status(404).json({ message: 'Matière introuvable.' });
    }
    if (Number(target[0].etablissement_id) !== Number(req.user.etablissementId)) {
      return res.status(403).json({ message: "Cette matière n'appartient pas à votre établissement." });
    }

    // 1) Vérifier si la matière est déjà utilisée dans la table enseigner
    const [usedRows] = await conn.execute(
      `SELECT Enseignants_id, Classes_id, Annee_scolaire_id, etablissement_id
       FROM enseigner
       WHERE matiere_id = ?
       LIMIT 1`,
      [id]
    );

    if (usedRows.length > 0) {
      // ✅ matière déjà affectée -> on refuse la suppression
      return res.status(409).json({
        message: "Suppression refusée : cette matière est déjà affectée à une classe et un enseignant (table enseigner).",
        details: usedRows[0], // optionnel: utile pour debug
      });
    }

    // 2) Supprimer la matière (si pas utilisée)
    const [result] = await conn.execute(
      `DELETE FROM matieres WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Matière introuvable." });
    }

    res.json({ message: "Matière supprimée avec succès." });
  } catch (err) {
    console.error(err);

    // ✅ Cas fréquent : contrainte FK (matière utilisée ailleurs)
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      return res.status(409).json({
        message: "Impossible de supprimer : cette matière est déjà utilisée (affectations, notes, etc.).",
      });
    }

    res.status(500).json({ message: "Erreur lors de la suppression de la matière." });
  } finally {
    conn.release();
  }
});

// Route pour récupérer les classes (ID, nom)
router.get('/Coefficient', async (req, res) => {
  try {
    const [coefficient] = await req.db.query('SELECT id, valeur FROM coefficient');
    res.status(200).json(coefficient)
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route pour récupérer les matières (ID, nom)
router.get('/Matieres/:etablissementId', authenticateJWT, async (req, res) => {
  const{etablissementId} = req.params
  if (Number(etablissementId) !== Number(req.user.etablissementId)) {
    return res.status(403).json({ error: "Vous n'avez pas accès à cet établissement." });
  }
  try {
    const [subjects] = await req.db.query('SELECT id, nom FROM matieres where etablissement_id = ?', [etablissementId]);
    res.status(200).json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route pour récupérer les matières par ID de classe
router.get('/matiere/:classId', async (req, res) => {
  const classId = req.params.classId;

  if (!classId) {
    return res.status(400).json({ error: 'L\'ID de la classe est requis.' });
  }

  try {
    const [results] = await req.db.query(`
      SELECT m.id, m.nom 
      FROM matieres m
      JOIN enseigner e ON m.id = e.matiere_id
      WHERE e.Classes_id = ?
    `, [classId]);

    res.json(results);
  } catch (error) {
    console.error('Erreur lors de la récupération des matières:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des matières.' });
  }
});

module.exports = router;
