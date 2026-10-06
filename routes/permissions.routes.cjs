// =====================================================================
//  Permissions (autorisations de sortie/absence)
//  Monté dans server.cjs avec : app.use('/api', require('./routes/permissions.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, requireAdminStaff, getEleveDuParentOr403 } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const evenements = require('../server-lib/alertes-evenements.cjs');

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

// Décision sur une permission (autoriser / refuser / sous réserve) et
// « lue » : réservé à l'administration — un parent ne décide pas de sa
// propre demande.
const STATUTS_PERMISSION = ['autoriser', 'non autoriser', 'sous reserve de justification'];
router.put('/permissions/:id', authenticateJWT, requireAdminStaff, async (req, res) => {
  const { id } = req.params;
  const { is_read, statut } = req.body;
  if (statut !== undefined && !STATUTS_PERMISSION.includes(statut)) {
    return res.status(400).json({ message: 'Statut de permission invalide.' });
  }

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
      const [[avant]] = await req.db.query('SELECT Statut FROM permission WHERE id = ?', [id]);
      await req.db.query(
        `UPDATE permission SET Statut = ? WHERE id = ?`,
        [statut, id]
      );
      // Le parent est prévenu de la décision.
      if (!avant || avant.Statut !== statut) evenements.plusTard(evenements.permissionDecidee, Number(id));
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour ajouter une nouvelle permission
// Demande d'un parent. Forme précise : une journée, plusieurs jours (date
// de fin) ou quelques heures (heure de début et de fin) — sert à prévenir
// uniquement les enseignants qui ont cours pendant l'absence. `Duree` est
// rempli en clair pour l'affichage. L'ancienne forme (durée en texte libre)
// reste acceptée.
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const jourLisible = (iso) => { const [, m, j] = iso.split('-').map(Number); return `${j} ${MOIS[m - 1]}`; };
const heureLisible = (h) => String(h).slice(0, 5).replace(':', 'h');
router.post('/permissions/:childId', authenticateJWT, async (req, res) => {
  const { type, date, dateFin, heureDebut, heureFin, motif, duree, contact, childId, etablissementId, anneeScolaireId } = req.body;
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const heure = /^\d{2}:\d{2}(:\d{2})?$/;

  if (!date || !iso.test(String(date)) || !String(motif || '').trim() || !String(contact || '').trim() || !etablissementId || !anneeScolaireId) {
    return res.status(400).json({ message: 'Date, motif et téléphone sont obligatoires.' });
  }
  let fin = null; let hDebut = null; let hFin = null; let texteDuree = String(duree || '').trim();
  if (type === 'jours') {
    if (!iso.test(String(dateFin || '')) || dateFin < date) return res.status(400).json({ message: 'Indiquez un dernier jour après le premier.' });
    const nb = Math.round((new Date(`${dateFin}T12:00:00`) - new Date(`${date}T12:00:00`)) / 86400000) + 1;
    if (nb > 60) return res.status(400).json({ message: 'Une permission ne peut pas dépasser 60 jours.' });
    fin = dateFin;
    texteDuree = `${nb} jours (du ${jourLisible(date)} au ${jourLisible(dateFin)})`;
  } else if (type === 'heures') {
    if (!heure.test(String(heureDebut || '')) || !heure.test(String(heureFin || '')) || heureFin <= heureDebut) {
      return res.status(400).json({ message: "Indiquez l'heure de début et une heure de fin plus tardive." });
    }
    hDebut = heureDebut; hFin = heureFin;
    texteDuree = `${heureLisible(heureDebut)}-${heureLisible(heureFin)}`;
  } else if (type === 'journee') {
    texteDuree = '1 journée';
  } else if (!texteDuree) {
    return res.status(400).json({ message: 'Indiquez la durée de la permission.' });
  }

  if (!(await getEleveDuParentOr403(req, res, childId))) return;

  try {
    const [result] = await req.db.query(
      `INSERT INTO permission (date, date_fin, heure_debut, heure_fin, motif, duree, contact, eleve_id, etablissement_id, Annee_scolaire_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, fin, hDebut, hFin, String(motif).trim(), texteDuree, String(contact).trim(), childId, etablissementId, anneeScolaireId]
    );
    res.status(201).json({ message: 'Permission ajoutée avec succès', id: result.insertId, duree: texteDuree });
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

module.exports = router;
