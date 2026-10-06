// =====================================================================
//  Conduite et punitions
//  Monté dans server.cjs avec : app.use('/api', require('./routes/conduite.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, requireAdminStaff } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const bulletinService = require('../server-lib/bulletin-service.cjs');
const evenements = require('../server-lib/alertes-evenements.cjs');

// Note de conduite d'une ou plusieurs classes pour une période.
// Une note déjà attribuée est remplacée (avant : « déjà ajoutée », et
// aucun moyen de la corriger).
router.post('/conduite', authenticateJWT, requireAdminStaff, async (req, res) => {
  const { note_conduite, classe_ids, semestre_id, anneeScolaireId } = req.body;
  const etablissementId = Number(req.user.etablissementId);
  const note = Number(String(note_conduite ?? '').replace(',', '.'));

  if (!Array.isArray(classe_ids) || classe_ids.length === 0 || !semestre_id || !anneeScolaireId) {
    return res.status(400).json({ error: 'Choisissez la note, la période et au moins une classe.' });
  }
  if (!Number.isFinite(note) || note < 0 || note > 20) {
    return res.status(400).json({ error: 'La note de conduite doit être comprise entre 0 et 20.' });
  }

  const conn = await db.getConnection();
  try {
    const ids = [...new Set(classe_ids.map(Number))];
    const [owned] = await conn.query('SELECT id FROM classes WHERE id IN (?) AND etablissement_id = ?', [ids, etablissementId]);
    if (owned.length !== ids.length) {
      return res.status(403).json({ error: "Certaines classes n'appartiennent pas à votre établissement." });
    }
    const [[annee]] = await conn.query('SELECT statut FROM annee_scolaire WHERE id = ? AND etablissement_id = ?', [anneeScolaireId, etablissementId]);
    if (!annee) return res.status(403).json({ error: 'Année scolaire invalide.' });
    if (annee.statut === 'cloturee') {
      return res.status(409).json({ error: 'Cette année est clôturée : ses notes de conduite ne peuvent plus être modifiées.' });
    }
    await conn.beginTransaction();
    let remplacees = 0;
    for (const classeId of ids) {
      const [del] = await conn.query('DELETE FROM conduite WHERE classe_id = ? AND semestre_id = ? AND Annee_scolaire_id = ?', [classeId, semestre_id, anneeScolaireId]);
      if (del.affectedRows) remplacees += 1;
      await conn.query(
        'INSERT INTO conduite (note_conduite, classe_id, semestre_id, etablissement_id, Annee_scolaire_id) VALUES (?, ?, ?, ?, ?)',
        [note, classeId, semestre_id, etablissementId, anneeScolaireId]
      );
    }
    await conn.commit();

    // Bulletins déjà enregistrés : recalculés avec la nouvelle conduite
    // (sinon parents et administration verraient l'ancienne note).
    let bulletinsMisAJour = 0;
    const [avecBulletins] = await conn.query(
      `SELECT DISTINCT n.classe_id FROM bulletin b
       JOIN note n ON n.Eleves_id = b.eleve_id AND n.Annee_scolaire_id = b.Annee_scolaire_id
       WHERE b.etablissement_id = ? AND b.Annee_scolaire_id = ? AND n.classe_id IN (?)`,
      [etablissementId, anneeScolaireId, ids]
    );
    for (const { classe_id: classeId } of avecBulletins) {
      const ctx = await bulletinService.computeClassBulletins(conn, { classeId, etablissementId, anneeScolaireId });
      if (!ctx) continue;
      await conn.beginTransaction();
      bulletinsMisAJour += await bulletinService.saveClassBulletins(conn, ctx, { etablissementId, anneeScolaireId });
      await conn.commit();
    }

    res.status(200).json({
      message: `Note de conduite ${String(note).replace('.', ',')}/20 attribuée à ${ids.length} classe(s)${remplacees ? ` (${remplacees} modifiée(s))` : ''}.${bulletinsMisAJour ? ` ${bulletinsMisAJour} bulletin(s) mis à jour.` : ''}`,
      bulletinsMisAJour,
    });
  } catch (error) {
    try { await conn.rollback(); } catch (_) {}
    console.error('Erreur lors de l\'ajout de la note de conduite :', error);
    res.status(500).json({ error: 'Erreur du serveur.' });
  } finally {
    conn.release();
  }
});

// État des notes de conduite de l'année : { [classeId]: { [semestreId]: note } }.
router.get('/conduite/etat/:anneeScolaireId', authenticateJWT, requireAdminStaff, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT co.classe_id, co.semestre_id, MAX(co.note_conduite) AS note
       FROM conduite co JOIN classes c ON c.id = co.classe_id
       WHERE c.etablissement_id = ? AND co.Annee_scolaire_id = ?
       GROUP BY co.classe_id, co.semestre_id`,
      [req.user.etablissementId, req.params.anneeScolaireId]
    );
    const etat = {};
    rows.forEach((r) => { (etat[r.classe_id] = etat[r.classe_id] || {})[r.semestre_id] = Number(r.note); });
    res.json(etat);
  } catch (error) {
    console.error('Erreur état conduite :', error);
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
    const punitionsCreees = [];
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
      punitionsCreees.push(punitionId);

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
    punitionsCreees.forEach((id) => evenements.plusTard(evenements.punitionDonnee, id));
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
