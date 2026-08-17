// =====================================================================
//  Conduite et punitions
//  Monté dans server.cjs avec : app.use('/api', require('./routes/conduite.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');

router.post('/conduite', authenticateJWT, async (req, res) => {
  try {
    const { note_conduite, classe_ids, semestre_id, anneeScolaireId } = req.body;

    // Vérifiez les données reçues
    if (!note_conduite || !classe_ids || classe_ids.length === 0 || !semestre_id || !anneeScolaireId) {
      return res.status(400).json({ error: 'Veuillez fournir une note de conduite, des identifiants de classe et un identifiant de semestre.' });
    }

    // Vérifiez si des notes de conduite existent déjà pour les classes sélectionnées dans le semestre donné
    const placeholders = classe_ids.map(() => '?').join(',');
    const checkQuery = `
      SELECT c.id, c.nom AS className
      FROM conduite co
      JOIN classes c ON co.classe_id = c.id
      WHERE co.classe_id IN (${placeholders}) AND co.semestre_id = ? AND co.Annee_scolaire_id = ?
    `;
    const [rows] = await req.db.execute(checkQuery, [...classe_ids, semestre_id, anneeScolaireId]);

    if (rows.length > 0) {
      // Récupération des noms des classes pour lesquelles une note existe déjà
      const existingClasses = rows.map(row => row.className);
      return res.status(400).json({
        error: `Une note de conduite a déjà été ajoutée pour cette/ces classe(s) : ${existingClasses.join(', ')}.`
      });
    }

    // Insertion des notes de conduite pour chaque classe
    const insertQuery = 'INSERT INTO conduite (note_conduite, classe_id, semestre_id, Annee_scolaire_id) VALUES (?, ?, ?, ?)';
    const insertPromises = classe_ids.map(classe_id => 
      req.db.execute(insertQuery, [note_conduite, classe_id, semestre_id, anneeScolaireId])
    );

    await Promise.all(insertPromises);

    res.status(200).json({ message: 'Notes de conduite ajoutées avec succès.' });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la note de conduite :', error);
    res.status(500).json({ error: 'Erreur du serveur.' });
  }
});

// ✅ Route sauvegarde conduite SANS heure
router.post('/save/conduct', authenticateJWT, async (req, res) => {
  const { semester, records, etablissementId, anneeScolaireId } = req.body;

  let connection;

  try {
    connection = await req.db.getConnection();
    await connection.beginTransaction();

    // 1) Trouver semestre_id à partir du nom + établissement
    const [rows] = await connection.query(
      'SELECT id FROM semestre WHERE nom = ? AND etablissement_id = ?',
      [semester, etablissementId]
    );

    if (rows.length === 0) {
      throw new Error(`Semestre avec le nom "${semester}" introuvable.`);
    }

    const semesterId = rows[0].id;

    // 2) Insert + update total_hours
    for (const record of records) {
      const { auteur, punition, date, motif, studentId } = record;

      // Insertion (SANS heure)
      const [insertResult] = await connection.query(
        `INSERT INTO punitions
         (auteur, punition, date, motif, eleve_id, semestre_id, etablissement_id, Annee_scolaire_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [auteur, punition, date, motif, studentId, semesterId, etablissementId, anneeScolaireId]
      );

      const punitionId = insertResult.insertId;

      // Somme des heures pour cet élève dans ce semestre (et année si tu veux)
      const [sumResult] = await connection.query(
        `SELECT COALESCE(SUM(punition), 0) AS totalHours
         FROM punitions
         WHERE eleve_id = ?
           AND semestre_id = ?
           AND etablissement_id = ?
           AND Annee_scolaire_id = ?`,
        [studentId, semesterId, etablissementId, anneeScolaireId]
      );

      const totalHours = sumResult[0].totalHours;

      await connection.query(
        'UPDATE punitions SET total_hours = ? WHERE id = ?',
        [totalHours, punitionId]
      );
    }

    await connection.commit();
    res.status(200).json({ message: 'Données de conduite sauvegardées avec succès.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erreur lors de la sauvegarde des données de conduite :', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde des données de conduite.' });
  } finally {
    if (connection) connection.release();
  }
});

// ✅ Somme des heures SANS heure
router.get('/punitions/somme-heures/:studentId/:anneeScolaireId', authenticateJWT, async (req, res) => {
  try {
    const { studentId, anneeScolaireId } = req.params;

    const [result] = await db.query(
      `SELECT COALESCE(SUM(punition), 0) AS totalHours
       FROM punitions
       WHERE eleve_id = ? AND Annee_scolaire_id = ?`,
      [studentId, anneeScolaireId]
    );

    res.json({ totalHours: result[0].totalHours });
  } catch (error) {
    console.error('Erreur lors de la récupération des heures de punition :', error);
    res.status(500).send('Erreur serveur');
  }
});

module.exports = router;
