// =====================================================================
//  Demandes de modification / suppression de notes déjà enregistrées
//  ---------------------------------------------------------------
//  Règle métier : dès qu'une note (inter1..4, TP1, TP2, Dev1, Dev2) a déjà
//  été sauvegardée pour un élève, un enseignant ne peut plus la modifier ou
//  la supprimer directement. Il doit soumettre une demande ; rien n'est
//  appliqué à la table `note` tant que l'administration ne l'a pas validée.
//
//  Monté dans server.cjs avec :
//    app.use('/api', require('./routes/note-modification-requests.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, requireAdminStaff } = require('../server-lib/auth.cjs');
const notesService = require('../server-lib/notes-service.cjs');

// Liste blanche des colonnes de `note` qu'une demande peut viser : le nom de
// colonne vient du client et ne doit jamais être interpolé tel quel dans le SQL.
const ALLOWED_NOTE_COLUMNS = new Set(['inter1', 'inter2', 'inter3', 'inter4', 'TP1', 'TP2', 'Dev1', 'Dev2']);

function toNullableFloat(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------
// ENSEIGNANT — Crée une demande de modification/suppression.
// ---------------------------------------------------------------------
router.post('/notes/modification-requests', authenticateJWT, async (req, res) => {
  const {
    eleveId, classeId, matiereId, semestreId, anneeScolaireId, etablissementId,
    noteType, ancienneValeur, nouvelleValeur, motif,
  } = req.body;

  if (!eleveId || !classeId || !matiereId || !semestreId || !anneeScolaireId || !etablissementId || !noteType) {
    return res.status(400).json({ message: 'Données manquantes pour créer la demande.' });
  }
  if (!ALLOWED_NOTE_COLUMNS.has(noteType)) {
    return res.status(400).json({ message: 'Type de note invalide.' });
  }

  const nouvelleValeurNum = toNullableFloat(nouvelleValeur);
  const typeDemande = nouvelleValeurNum === null ? 'suppression' : 'modification';
  if (nouvelleValeurNum !== null && (nouvelleValeurNum < 0 || nouvelleValeurNum > 20)) {
    return res.status(400).json({ message: 'La nouvelle note doit être entre 0 et 20.' });
  }

  try {
    if (!(await notesService.canWriteNotes(req.db, req.user, { classeId, matiereId, anneeScolaireId }))) {
      return res.status(403).json({ message: "Vous n'enseignez pas cette matière dans cette classe." });
    }
    // Une seule demande en attente à la fois pour une même note : évite les doublons.
    const [existing] = await req.db.query(
      `SELECT id FROM note_modification_requests
       WHERE eleve_id = ? AND matieres_id = ? AND semestre_id = ? AND annee_scolaire_id = ?
         AND note_type = ? AND statut = 'en_attente'`,
      [eleveId, matiereId, semestreId, anneeScolaireId, noteType]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        message: "Une demande est déjà en attente de validation pour cette note. L'administration doit d'abord la traiter avant qu'une nouvelle demande puisse être envoyée.",
      });
    }

    const [result] = await req.db.query(
      `INSERT INTO note_modification_requests
        (eleve_id, classe_id, matieres_id, semestre_id, annee_scolaire_id, etablissement_id,
         enseignant_id, note_type, type_demande, ancienne_valeur, nouvelle_valeur, motif, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente')`,
      [
        eleveId, classeId, matiereId, semestreId, anneeScolaireId, etablissementId,
        req.user.id, noteType, typeDemande,
        toNullableFloat(ancienneValeur), nouvelleValeurNum, motif || null,
      ]
    );

    return res.status(201).json({
      id: result.insertId,
      statut: 'en_attente',
      message: "Cette note est déjà enregistrée. Votre demande a été transmise à l'administration pour validation : aucun changement ne sera appliqué avant son approbation.",
    });
  } catch (error) {
    console.error('Erreur lors de la création de la demande de modification de note:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ---------------------------------------------------------------------
// ENSEIGNANT — Liste ses propres demandes (pour suivre leur statut).
// ---------------------------------------------------------------------
router.get('/notes/modification-requests/mine', authenticateJWT, async (req, res) => {
  try {
    const [rows] = await req.db.query(
      `SELECT r.*, e.nom AS eleve_nom, e.prenom AS eleve_prenom, m.nom AS matiere_nom
       FROM note_modification_requests r
       JOIN eleve e ON e.id = r.eleve_id
       JOIN matieres m ON m.id = r.matieres_id
       WHERE r.enseignant_id = ?
       ORDER BY r.date_demande DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes de l\'enseignant:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Compteur des demandes traitées mais pas encore vues par l'enseignant
// (pour afficher un badge « une réponse de l'administration est arrivée »).
router.get('/notes/modification-requests/mine/count', authenticateJWT, async (req, res) => {
  try {
    const [[row]] = await req.db.query(
      `SELECT COUNT(*) AS count FROM note_modification_requests
       WHERE enseignant_id = ? AND statut != 'en_attente' AND vu_par_enseignant = 0`,
      [req.user.id]
    );
    res.json({ count: row.count });
  } catch (error) {
    console.error('Erreur lors du comptage des demandes de l\'enseignant:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.put('/notes/modification-requests/mine/mark-seen', authenticateJWT, async (req, res) => {
  try {
    await req.db.query(
      `UPDATE note_modification_requests SET vu_par_enseignant = 1
       WHERE enseignant_id = ? AND statut != 'en_attente' AND vu_par_enseignant = 0`,
      [req.user.id]
    );
    res.sendStatus(200);
  } catch (error) {
    console.error('Erreur lors du marquage des demandes comme vues:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ---------------------------------------------------------------------
// ADMINISTRATION — Liste des demandes de l'établissement.
// ---------------------------------------------------------------------
router.get('/notes/modification-requests/:etablissementId/:anneeScolaireId', authenticateJWT, requireAdminStaff, async (req, res) => {
  const { etablissementId, anneeScolaireId } = req.params;
  const { statut } = req.query;

  if (Number(etablissementId) !== Number(req.user.etablissementId)) {
    return res.status(403).json({ message: "Vous n'avez pas accès à cet établissement." });
  }

  try {
    const params = [etablissementId, anneeScolaireId];
    let statutClause = '';
    if (statut && ['en_attente', 'approuvee', 'rejetee'].includes(statut)) {
      statutClause = ' AND r.statut = ?';
      params.push(statut);
    }

    const [rows] = await req.db.query(
      `SELECT r.*, e.nom AS eleve_nom, e.prenom AS eleve_prenom,
              c.nom AS classe_nom, m.nom AS matiere_nom,
              s.nom AS semestre_nom,
              ens.nom AS enseignant_nom, ens.prenom AS enseignant_prenom
       FROM note_modification_requests r
       JOIN eleve e ON e.id = r.eleve_id
       JOIN classes c ON c.id = r.classe_id
       JOIN matieres m ON m.id = r.matieres_id
       LEFT JOIN semestre s ON s.id = r.semestre_id
       JOIN enseignants ens ON ens.id = r.enseignant_id
       WHERE r.etablissement_id = ? AND r.annee_scolaire_id = ?${statutClause}
       ORDER BY (r.statut = 'en_attente') DESC, r.date_demande DESC`,
      params
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes de modification de notes:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Compteur pour le badge d'alerte de l'administration (demandes en attente non lues).
router.get('/notes/modification-requests/count/:etablissementId/:anneeScolaireId', authenticateJWT, requireAdminStaff, async (req, res) => {
  const { etablissementId, anneeScolaireId } = req.params;

  if (Number(etablissementId) !== Number(req.user.etablissementId)) {
    return res.status(403).json({ message: "Vous n'avez pas accès à cet établissement." });
  }

  try {
    const [[row]] = await req.db.query(
      `SELECT COUNT(*) AS count FROM note_modification_requests
       WHERE etablissement_id = ? AND annee_scolaire_id = ? AND statut = 'en_attente' AND is_read = 0`,
      [etablissementId, anneeScolaireId]
    );
    res.json({ count: row.count });
  } catch (error) {
    console.error('Erreur lors du comptage des demandes de modification de notes:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.put('/notes/modification-requests/mark-read/:etablissementId/:anneeScolaireId', authenticateJWT, requireAdminStaff, async (req, res) => {
  const { etablissementId, anneeScolaireId } = req.params;

  if (Number(etablissementId) !== Number(req.user.etablissementId)) {
    return res.status(403).json({ message: "Vous n'avez pas accès à cet établissement." });
  }

  try {
    await req.db.query(
      `UPDATE note_modification_requests SET is_read = 1
       WHERE etablissement_id = ? AND annee_scolaire_id = ? AND statut = 'en_attente'`,
      [etablissementId, anneeScolaireId]
    );
    res.sendStatus(200);
  } catch (error) {
    console.error('Erreur lors du marquage des demandes comme lues:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ---------------------------------------------------------------------
// ADMINISTRATION — Approuve une demande : applique enfin le changement à
// la table `note`, puis archive la demande comme traitée.
// ---------------------------------------------------------------------
router.put('/notes/modification-requests/:id/approve', authenticateJWT, requireAdminStaff, async (req, res) => {
  const { id } = req.params;
  const { commentaire } = req.body;

  let connection;
  try {
    connection = await req.db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT * FROM note_modification_requests WHERE id = ? FOR UPDATE`,
      [id]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Demande introuvable.' });
    }
    const demande = rows[0];

    if (Number(demande.etablissement_id) !== Number(req.user.etablissementId)) {
      await connection.rollback();
      return res.status(403).json({ message: "Cette demande n'appartient pas à votre établissement." });
    }
    if (demande.statut !== 'en_attente') {
      await connection.rollback();
      return res.status(409).json({ message: 'Cette demande a déjà été traitée.' });
    }
    if (!ALLOWED_NOTE_COLUMNS.has(demande.note_type)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Type de note invalide sur cette demande.' });
    }

    const nouvelleValeur = demande.type_demande === 'suppression' ? null : demande.nouvelle_valeur;

    // Note changée puis moyenne recalculée (avant : la moyenne du bulletin
    // restait l'ancienne).
    await notesService.setNote(connection, {
      eleveId: demande.eleve_id, matiereId: demande.matieres_id, semestreId: demande.semestre_id,
      classeId: demande.classe_id, etablissementId: demande.etablissement_id, anneeScolaireId: demande.annee_scolaire_id,
    }, notesService.noteField(demande.note_type) || demande.note_type, nouvelleValeur);

    await connection.query(
      `UPDATE note_modification_requests
       SET statut = 'approuvee', commentaire_admin = ?, is_read = 1,
           traite_par_etablissement_id = ?, date_traitement = NOW()
       WHERE id = ?`,
      [commentaire || null, req.user.etablissementId, id]
    );

    await connection.commit();
    res.json({ message: 'Demande approuvée : la note a été mise à jour.' });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === 'ANNEE_CLOTUREE') return res.status(409).json({ message: error.message });
    console.error('Erreur lors de l\'approbation de la demande de modification de note:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  } finally {
    if (connection) connection.release();
  }
});

// ---------------------------------------------------------------------
// ADMINISTRATION — Rejette une demande : la note existante n'est pas touchée.
// ---------------------------------------------------------------------
router.put('/notes/modification-requests/:id/reject', authenticateJWT, requireAdminStaff, async (req, res) => {
  const { id } = req.params;
  const { commentaire } = req.body;

  try {
    const [rows] = await req.db.query(`SELECT * FROM note_modification_requests WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Demande introuvable.' });
    }
    const demande = rows[0];

    if (Number(demande.etablissement_id) !== Number(req.user.etablissementId)) {
      return res.status(403).json({ message: "Cette demande n'appartient pas à votre établissement." });
    }
    if (demande.statut !== 'en_attente') {
      return res.status(409).json({ message: 'Cette demande a déjà été traitée.' });
    }

    await req.db.query(
      `UPDATE note_modification_requests
       SET statut = 'rejetee', commentaire_admin = ?, is_read = 1,
           traite_par_etablissement_id = ?, date_traitement = NOW()
       WHERE id = ?`,
      [commentaire || null, req.user.etablissementId, id]
    );

    res.json({ message: 'Demande rejetée. La note existante reste inchangée.' });
  } catch (error) {
    console.error('Erreur lors du rejet de la demande de modification de note:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
