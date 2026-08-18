// =====================================================================
//  Devoirs / exercices à faire à la maison (donnés par un enseignant à
//  une classe, consultés par les parents, "non fait" signalé par élève).
//  Monté dans server.cjs avec : app.use('/api', require('./routes/devoirs.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, getEleveDuParentOr403 } = require('../server-lib/auth.cjs');

// ---------------------------------------------------------------------
// POST /devoirs — un enseignant donne un devoir à une classe/matière.
// ---------------------------------------------------------------------
router.post('/devoirs', authenticateJWT, async (req, res) => {
  const {
    enseignantId,
    classeId,
    matiereId,
    etablissementId,
    anneeScolaireId,
    titre,
    description,
    dateLimite,
  } = req.body;

  if (!enseignantId || !classeId || !matiereId || !etablissementId || !anneeScolaireId || !titre) {
    return res.status(400).json({ message: 'Tous les champs obligatoires ne sont pas renseignés.' });
  }

  try {
    const [result] = await req.db.query(
      `INSERT INTO devoirs
        (enseignant_id, matiere_id, classe_id, etablissement_id, annee_scolaire_id, titre, description, date_limite)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        enseignantId,
        matiereId,
        classeId,
        etablissementId,
        anneeScolaireId,
        titre,
        description || null,
        dateLimite || null,
      ]
    );

    const [rows] = await req.db.query('SELECT * FROM devoirs WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Erreur lors de la création du devoir :", error);
    res.status(500).json({ message: 'Erreur serveur lors de la création du devoir.' });
  }
});

// ---------------------------------------------------------------------
// GET /devoirs/classe/:classeId/:matiereId/:anneeScolaireId — liste des devoirs
// donnés par un enseignant pour cette classe/matière (vue enseignant).
// ---------------------------------------------------------------------
router.get('/devoirs/classe/:classeId/:matiereId/:anneeScolaireId', authenticateJWT, async (req, res) => {
  const { classeId, matiereId, anneeScolaireId } = req.params;

  try {
    const [rows] = await req.db.query(
      `SELECT
        d.*,
        COUNT(dnf.id) AS nonFaitCount
       FROM devoirs d
       LEFT JOIN devoir_non_fait dnf ON dnf.devoir_id = d.id
       WHERE d.classe_id = ? AND d.matiere_id = ? AND d.annee_scolaire_id = ?
       GROUP BY d.id
       ORDER BY d.created_at DESC`,
      [classeId, matiereId, anneeScolaireId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des devoirs :", error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des devoirs.' });
  }
});

// ---------------------------------------------------------------------
// GET /devoirs/:devoirId/eleves — élèves de la classe concernée par ce devoir,
// avec leur statut "non fait" actuel (pour la case à cocher côté enseignant).
// ---------------------------------------------------------------------
router.get('/devoirs/:devoirId/eleves', authenticateJWT, async (req, res) => {
  const { devoirId } = req.params;

  try {
    const [devoirRows] = await req.db.query('SELECT classe_id FROM devoirs WHERE id = ?', [devoirId]);
    if (devoirRows.length === 0) {
      return res.status(404).json({ message: 'Devoir introuvable.' });
    }

    const [rows] = await req.db.query(
      `SELECT
        e.id, e.nom, e.prenom,
        CASE WHEN dnf.id IS NULL THEN 0 ELSE 1 END AS nonFait
       FROM eleve e
       LEFT JOIN devoir_non_fait dnf ON dnf.devoir_id = ? AND dnf.eleve_id = e.id
       WHERE e.classe_id = ?
       ORDER BY e.nom ASC, e.prenom ASC`,
      [devoirId, devoirRows[0].classe_id]
    );

    res.json(rows.map((r) => ({ ...r, nonFait: Boolean(Number(r.nonFait)) })));
  } catch (error) {
    console.error("Erreur lors de la récupération des élèves du devoir :", error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des élèves.' });
  }
});

// ---------------------------------------------------------------------
// PUT /devoirs/:devoirId/non-faits — remplace la liste des élèves signalés
// "non fait" pour ce devoir par l'ensemble reçu (cases cochées côté enseignant).
// ---------------------------------------------------------------------
router.put('/devoirs/:devoirId/non-faits', authenticateJWT, async (req, res) => {
  const { devoirId } = req.params;
  const eleveIds = Array.isArray(req.body.eleveIds) ? req.body.eleveIds : [];

  const connection = await req.db.getConnection();
  try {
    const [devoirRows] = await connection.query('SELECT id FROM devoirs WHERE id = ?', [devoirId]);
    if (devoirRows.length === 0) {
      connection.release();
      return res.status(404).json({ message: 'Devoir introuvable.' });
    }

    await connection.beginTransaction();
    await connection.query('DELETE FROM devoir_non_fait WHERE devoir_id = ?', [devoirId]);

    if (eleveIds.length > 0) {
      const values = eleveIds.map((eleveId) => [devoirId, eleveId]);
      await connection.query('INSERT INTO devoir_non_fait (devoir_id, eleve_id) VALUES ?', [values]);
    }

    await connection.commit();
    res.json({ success: true, nonFaitCount: eleveIds.length });
  } catch (error) {
    await connection.rollback();
    console.error("Erreur lors de l'enregistrement des devoirs non faits :", error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement.' });
  } finally {
    connection.release();
  }
});

// ---------------------------------------------------------------------
// GET /devoirs/eleve/:childId — devoirs de la classe de cet enfant (vue parent).
// ---------------------------------------------------------------------
router.get('/devoirs/eleve/:childId', authenticateJWT, async (req, res) => {
  const { childId } = req.params;

  const eleve = await getEleveDuParentOr403(req, res, childId);
  if (!eleve) return;

  try {
    const [rows] = await req.db.query(
      `SELECT
        d.id, d.titre, d.description, d.date_limite, d.created_at,
        m.nom AS matiereNom,
        CASE WHEN dnf.id IS NULL THEN 0 ELSE 1 END AS nonFait
       FROM devoirs d
       LEFT JOIN matieres m ON m.id = d.matiere_id
       LEFT JOIN devoir_non_fait dnf ON dnf.devoir_id = d.id AND dnf.eleve_id = ?
       WHERE d.classe_id = ? AND d.annee_scolaire_id = ?
       ORDER BY d.created_at DESC`,
      [childId, eleve.classe_id, eleve.Annee_scolaire_id]
    );

    res.json(rows.map((r) => ({ ...r, nonFait: Boolean(Number(r.nonFait)) })));
  } catch (error) {
    console.error("Erreur lors de la récupération des devoirs de l'élève :", error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des devoirs.' });
  }
});

module.exports = router;
