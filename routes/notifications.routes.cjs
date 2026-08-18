// =====================================================================
//  Notifications administration + enseignants + parents
//  Monté dans server.cjs avec : app.use('/api', require('./routes/notifications.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const moment = require('moment');

///////////////////////////////////////////////////////notification vrai
router.get('/notifications/unread/:etablissementId/:anneeScolaireId', async (req, res) => {
  const { etablissementId, anneeScolaireId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS count FROM notifications 
       WHERE etablissement_id = ? AND annee_scolaire_id = ? AND is_read = 0`,
      [etablissementId, anneeScolaireId]
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.put('/notifications/mark-read/:etabId/:anneeId', async (req, res) => {
  const { etabId, anneeId } = req.params;

  try {
    await db.query(
      `UPDATE notifications SET is_read = true 
       WHERE etablissement_id = ? AND annee_scolaire_id = ? AND is_read = false`,
      [etabId, anneeId]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur mise à jour des notifications :', err);
    res.status(500).send('Erreur mise à jour des notifications');
  }
});

// Vérifie si une notification existe déjà pour une période donnée
router.get('/notifications/check/:eleveId/:startDate/:endDate/:etabId/:anneeId', async (req, res) => {
  const { eleveId, startDate, endDate, etabId, anneeId } = req.params;

  try {
    const [results] = await req.db.query(
      `SELECT * FROM notifications 
       WHERE eleve_id = ? 
         AND etablissement_id = ? 
         AND annee_scolaire_id = ? 
         AND periode_debut_absence = ? 
         AND periode_fin_absence = ?`,
      [eleveId, etabId, anneeId, startDate, endDate]
    );

    res.json({ exists: results.length > 0 });
  } catch (err) {
    console.error('Erreur lors de la vérification des notifications :', err);
    res.status(500).json({ error: 'Erreur serveur lors de la vérification des notifications' });
  }
});

router.post('/notifications/generate', async (req, res) => {
  const { etablissement_id, annee_scolaire_id } = req.body;

  if (!etablissement_id || !annee_scolaire_id) {
    console.warn("❌ Paramètres manquants");
    return res.status(400).json({ error: 'Paramètres manquants' });
  }

  try {
    console.log(`📥 Début génération notifications pour : Établissement=${etablissement_id}, Année scolaire=${annee_scolaire_id}`);

    // 1. Récupération des absences
    const [absences] = await db.query(
      `SELECT eleve_id, date
       FROM presence
       WHERE etablissement_id = ? AND Annee_scolaire_id = ? AND statut = 'Absent'
       ORDER BY eleve_id, date`,
      [etablissement_id, annee_scolaire_id]
    );

    console.log(`📊 Total absences récupérées : ${absences.length}`);
    if (absences.length > 0) {
      console.log(`🧾 Exemple :`, absences.slice(0, 3));
    }

    // 2. Groupement des absences consécutives
    const absencesGrouped = [];
    let currentEleve = null;
    let currentGroup = [];

    function dateDiffInDays(date1, date2) {
      return Math.round((date2 - date1) / (1000 * 60 * 60 * 24));
    }

    for (const absence of absences) {
      const absenceDate = new Date(absence.date);

      if (absence.eleve_id !== currentEleve) {
        if (currentGroup.length >= 3) {
          absencesGrouped.push({ eleve_id: currentEleve, dates: currentGroup });
        }
        currentEleve = absence.eleve_id;
        currentGroup = [absenceDate];
      } else {
        const prevDate = currentGroup[currentGroup.length - 1];
        if (dateDiffInDays(prevDate, absenceDate) === 1) {
          currentGroup.push(absenceDate);
        } else {
          if (currentGroup.length >= 3) {
            absencesGrouped.push({ eleve_id: currentEleve, dates: currentGroup });
          }
          currentGroup = [absenceDate];
        }
      }
    }

    if (currentGroup.length >= 3) {
      absencesGrouped.push({ eleve_id: currentEleve, dates: currentGroup });
    }

    console.log(`📦 Groupes d'absences consécutives détectés : ${absencesGrouped.length}`);
    if (absencesGrouped.length > 0) {
      console.log(`🧪 Exemple groupe :`, absencesGrouped[0]);
    }

    // 3. Vérification et insertion des notifications
    let notificationsCreees = 0;

    for (const group of absencesGrouped) {
      const debut = group.dates[0].toISOString().slice(0, 10);
      const fin = group.dates[group.dates.length - 1].toISOString().slice(0, 10);

      const [exists] = await db.query(
        `SELECT 1 FROM notifications 
         WHERE eleve_id = ? AND etablissement_id = ? AND annee_scolaire_id = ?
           AND periode_debut_absence = ? AND periode_fin_absence = ?`,
        [group.eleve_id, etablissement_id, annee_scolaire_id, debut, fin]
      );

      if (exists.length === 0) {
        await db.query(
          `INSERT INTO notifications 
           (eleve_id, etablissement_id, annee_scolaire_id, date_notification, is_read, periode_debut_absence, periode_fin_absence)
           VALUES (?, ?, ?, NOW(), false, ?, ?)`,
          [group.eleve_id, etablissement_id, annee_scolaire_id, debut, fin]
        );
        notificationsCreees++;
        console.log(`✅ Notification CRÉÉE pour élève ${group.eleve_id} → ${debut} ➡️ ${fin}`);
      } else {
        console.log(`🔁 Notification DÉJÀ EXISTANTE pour élève ${group.eleve_id} → ${debut} ➡️ ${fin}`);
      }
    }

    console.log(`🎉 Total notifications créées : ${notificationsCreees}`);
    res.json({ message: 'Notifications générées avec succès', notificationsCreees });

  } catch (error) {
    console.error('❌ Erreur serveur lors de la génération des notifications :', error);
    res.status(500).json({ error: 'Erreur serveur lors création notifications' });
  }
});

router.get('/notifications/:etabId/:anneeId', async (req, res) => {
  const { etabId, anneeId } = req.params;

  try {
    const [notifications] = await req.db.query(
      `SELECT * FROM notifications 
       WHERE etablissement_id = ? 
         AND Annee_scolaire_id = ?
         AND MONTH(date_notification) = MONTH(CURDATE())
         AND YEAR(date_notification) = YEAR(CURDATE())
       ORDER BY date_notification DESC`,
      [etabId, anneeId]
    );

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications du mois en cours:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

//////////////////////////////////////////////////
//Enseignant
// Enseignant - récupérer notifications et s'assurer qu'elles existent dans notificationProf (non lues par défaut)
// 🔹 Synchronisation des notifications (pas de retour de données)
// Un enseignant ne peut agir que sur ses propres notifications : le token JWT
// enseignant porte `id` (enseignantId) et `etablissement` (etablissementId), à
// distinguer des tokens administration qui portent `etablissementId`.
const verifierProprieteEnseignant = (req, res, etablissementId, enseignantId) => {
  if (
    Number(req.user.etablissement) !== Number(etablissementId) ||
    Number(req.user.id) !== Number(enseignantId)
  ) {
    res.status(403).json({ message: 'Accès non autorisé.' });
    return false;
  }
  return true;
};

router.post('/notificationprof/sync/:etablissementId/:anneeScolaireId/:enseignantId', authenticateJWT, async (req, res) => {
  const { etablissementId, anneeScolaireId, enseignantId } = req.params;
  if (!verifierProprieteEnseignant(req, res, etablissementId, enseignantId)) return;

  try {
    const insertQuery = `
      INSERT IGNORE INTO notificationProf (enseignant_id, permission_id, etablissement_id)
      SELECT DISTINCT ens.Enseignants_id, p.id, p.etablissement_id
      FROM permission p
      JOIN eleve e ON p.eleve_id = e.id
      JOIN classes c ON e.classe_id = c.id
      JOIN enseigner ens ON e.classe_id = ens.Classes_id
      WHERE p.Statut = 'autoriser'
        AND ens.Enseignants_id = ?
        AND ens.etablissement_id = ?
        AND ens.Annee_scolaire_id = ?
        AND p.etablissement_id = ?
        AND p.Annee_scolaire_id = ?;
    `;

    await req.db.query(insertQuery, [
      enseignantId,
      etablissementId,
      anneeScolaireId,
      etablissementId,
      anneeScolaireId
    ]);

    res.status(204).send(); // ✅ Pas de contenu
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation des notifications:', error);
    res.status(500).json({ message: 'Erreur interne du serveur', details: error.message });
  }
});

// 🔹 Récupération des notifications depuis notificationProf
router.get('/notificationprof/:etablissementId/:anneeScolaireId/:enseignantId', authenticateJWT, async (req, res) => {
  const { etablissementId, anneeScolaireId, enseignantId } = req.params;
  if (!verifierProprieteEnseignant(req, res, etablissementId, enseignantId)) return;

  try {
    const selectQuery = `
      SELECT
        np.id AS notificationId,
        p.id AS permissionId,
        e.nom AS nom_eleve,
        e.prenom AS prenom_eleve,
        c.nom AS classeNom,
        p.Date AS permissionDate,
        p.Duree AS permissionDuree,
        np.is_read AS isRead,
        np.created_at AS notificationCreatedAt
      FROM notificationProf np
      JOIN permission p ON np.permission_id = p.id
      JOIN eleve e ON p.eleve_id = e.id
      JOIN classes c ON e.classe_id = c.id
      WHERE np.enseignant_id = ?
        AND np.etablissement_id = ?
        AND p.Annee_scolaire_id = ?
        AND p.Statut = 'autoriser'
      ORDER BY np.created_at DESC;
    `;

    const [rows] = await req.db.query(selectQuery, [
      enseignantId,
      etablissementId,
      anneeScolaireId
    ]);

    res.json(rows);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des notifications:', error);
    res.status(500).json({ message: 'Erreur interne du serveur', details: error.message });
  }
});

// Marque TOUTES les notifications non lues d'un enseignant comme lues (clic sur la cloche).
// Route utilisée par pages/professeurs/dashbord.vue::showNotifications() — jusqu'ici absente,
// l'appel échouait en 404 et le clic sur la cloche ne faisait donc rien côté serveur.
router.put('/notificationprof/mark-read/:etablissementId/:anneeScolaireId/:enseignantId', authenticateJWT, async (req, res) => {
  const { etablissementId, anneeScolaireId, enseignantId } = req.params;
  if (!verifierProprieteEnseignant(req, res, etablissementId, enseignantId)) return;

  try {
    await req.db.query(
      `UPDATE notificationProf np
       JOIN permission p ON np.permission_id = p.id
       SET np.is_read = 1, np.read_at = NOW()
       WHERE np.enseignant_id = ?
         AND np.etablissement_id = ?
         AND p.Annee_scolaire_id = ?
         AND np.is_read = 0`,
      [enseignantId, etablissementId, anneeScolaireId]
    );
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Erreur mark-read notificationprof:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

router.put('/notificationprof/mark-read-bulk', authenticateJWT, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const enseignantId = req.user.id;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'notificationIds must be a non-empty array.',
      });
    }

    const idsUniques = [...new Set(notificationIds.map((id) => Number(id)).filter(Boolean))];
    if (idsUniques.length === 0) {
      return res.status(400).json({ success: false, message: 'Identifiants invalides.' });
    }

    // On ne marque que les notifications qui appartiennent bien à l'enseignant connecté.
    const placeholders = idsUniques.map(() => '?').join(',');
    const sql = `
      UPDATE notificationProf
      SET is_read = 1, read_at = NOW()
      WHERE id IN (${placeholders}) AND enseignant_id = ?
    `;

    const [result] = await db.query(sql, [...idsUniques, enseignantId]);

    return res.json({
      success: true,
      message: 'Notifications marquées comme lues.',
      updatedCount: result.affectedRows || 0,
    });
  } catch (err) {
    console.error('❌ Erreur mark-read-bulk:', err);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      details: err.message,
    });
  }
});

// Route pour récupérer les notifications d'un établissement et d'un parent spécifiques
router.get("/notificationed/:parentId/:etablissementId/:anneeScolaireId", authenticateJWT, async (req, res) => {
  const { parentId, etablissementId, anneeScolaireId } = req.params;

  console.log("[1] ➡ Requête reçue pour récupérer les notifications");
  console.log("[1] 🔹 Parent ID :", parentId);
  console.log("[1] 🔹 Établissement ID :", etablissementId);
  console.log("[1] 🔹 Année scolaire ID :", anneeScolaireId);

  if (!parentId || !etablissementId || !anneeScolaireId) {
    return res.status(400).json({ message: "Paramètres requis manquants." });
  }

  if (Number(parentId) !== Number(req.user.id)) {
    return res.status(403).json({ message: "Ces notifications n'appartiennent pas à votre compte." });
  }

  try {
    // ✅ Bornes du mois en cours
    const startMonth = moment().startOf("month").format("YYYY-MM-DD");
    const endMonth = moment().endOf("month").format("YYYY-MM-DD");

    /**
     * ✅ Requête unique :
     * - Récupère uniquement les absences des enfants du parent
     * - Filtre mois en cours + etablissement + année scolaire
     * - LEFT JOIN AbsenceVueParents => is_read
     */
    const [rows] = await req.db.execute(
      `
      SELECT
        p.id AS presence_id,
        p.date,
        p.statut,
        p.motif,
        e.id AS eleve_id,
        e.nom AS studentName,
        e.prenom AS studentPrenom,
        CASE
          WHEN avp.id IS NULL THEN 0
          ELSE 1
        END AS is_read,
        avp.viewed_at
      FROM presence p
      INNER JOIN eleve e ON e.id = p.eleve_id
      LEFT JOIN absenceVueParents avp
        ON avp.presence_id = p.id
       AND avp.parent_id = ?
      WHERE e.Parents_id = ?
        AND p.etablissement_id = ?
        AND p.Annee_scolaire_id = ?
        AND LOWER(p.statut) = 'absent'
        AND p.date BETWEEN ? AND ?
      ORDER BY p.date DESC, p.id DESC
      `,
      [parentId, parentId, etablissementId, anneeScolaireId, startMonth, endMonth]
    );

    // ✅ Enregistrer automatiquement comme "vu" les absences non lues
    const toInsert = rows
      .filter((n) => Number(n.is_read) === 0)
      .map((n) => [parentId, n.presence_id]);

    if (toInsert.length > 0) {
      await req.db.query(
        `INSERT IGNORE INTO absenceVueParents (parent_id, presence_id) VALUES ?`,
        [toInsert]
      );
    }

    // ✅ Générer les messages
    const today = moment().format("YYYY-MM-DD");
    const yesterday = moment().subtract(1, "days").format("YYYY-MM-DD");
    const dayBeforeYesterday = moment().subtract(2, "days").format("YYYY-MM-DD");

    const alertMessages = rows.map((n) => {
      const dateStr = moment(n.date).format("YYYY-MM-DD");
      const prefix = Number(n.is_read) === 0 ? "[NOUVELLE] " : "";

      if (dateStr === today) {
        return `${prefix}Votre enfant ${n.studentName} ${n.studentPrenom} est absent aujourd'hui.`;
      } else if (dateStr === yesterday) {
        return `${prefix}Votre enfant ${n.studentName} ${n.studentPrenom} était absent hier.`;
      } else if (dateStr === dayBeforeYesterday) {
        return `${prefix}Votre enfant ${n.studentName} ${n.studentPrenom} était absent avant-hier.`;
      } else {
        return `${prefix}Votre enfant ${n.studentName} ${n.studentPrenom} était absent le ${moment(n.date).format("DD/MM/YYYY")}.`;
      }
    });

    const absenceNotifications = rows.map((r) => ({
      type: 'absence',
      presence_id: r.presence_id,
      date: r.date,
      statut: r.statut,
      motif: r.motif,
      eleve_id: r.eleve_id,
      studentName: r.studentName,
      studentPrenom: r.studentPrenom,
      is_read: Boolean(Number(r.is_read)),
      viewed_at: r.viewed_at,
    }));

    // ✅ Devoirs récents (donnés à la classe d'un des enfants de ce parent),
    // même principe de "vu" que les absences (table devoir_vue_parent).
    const [devoirRows] = await req.db.execute(
      `
      SELECT
        d.id AS devoir_id,
        d.titre,
        d.description,
        d.date_limite,
        d.created_at AS date,
        m.nom AS matiereNom,
        e.id AS eleve_id,
        e.nom AS studentName,
        e.prenom AS studentPrenom,
        CASE WHEN dvp.id IS NULL THEN 0 ELSE 1 END AS is_read
      FROM devoirs d
      JOIN eleve e ON e.classe_id = d.classe_id
      LEFT JOIN matieres m ON m.id = d.matiere_id
      LEFT JOIN devoir_vue_parent dvp
        ON dvp.devoir_id = d.id
       AND dvp.parent_id = ?
      WHERE e.Parents_id = ?
        AND d.etablissement_id = ?
        AND d.annee_scolaire_id = ?
        AND d.created_at >= (NOW() - INTERVAL 21 DAY)
      ORDER BY d.created_at DESC
      `,
      [parentId, parentId, etablissementId, anneeScolaireId]
    );

    const devoirToInsert = devoirRows
      .filter((n) => Number(n.is_read) === 0)
      .map((n) => [parentId, n.devoir_id]);

    if (devoirToInsert.length > 0) {
      await req.db.query(
        `INSERT IGNORE INTO devoir_vue_parent (parent_id, devoir_id) VALUES ?`,
        [devoirToInsert]
      );
    }

    const devoirNotifications = devoirRows.map((d) => ({
      type: 'devoir',
      devoir_id: d.devoir_id,
      date: d.date,
      titre: d.titre,
      description: d.description,
      date_limite: d.date_limite,
      matiereNom: d.matiereNom,
      eleve_id: d.eleve_id,
      studentName: d.studentName,
      studentPrenom: d.studentPrenom,
      is_read: Boolean(Number(d.is_read)),
    }));

    devoirRows.forEach((d) => {
      const prefix = Number(d.is_read) === 0 ? "[NOUVELLE] " : "";
      alertMessages.push(
        `${prefix}Votre enfant ${d.studentName} ${d.studentPrenom} a un nouveau devoir de ${d.matiereNom || ""} : ${d.titre}.`
      );
    });

    // Si rien à afficher (ni absence, ni devoir), on renvoie vide sans 404 (UX mieux)
    if (!absenceNotifications.length && !devoirNotifications.length) {
      return res.json({ notifications: [], alertMessages: [] });
    }

    // ✅ Réponse finale : absences + devoirs, plus récents en premier
    const notifications = [...absenceNotifications, ...devoirNotifications].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return res.json({ notifications, alertMessages });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des notifications :", error);
    return res.status(500).json({ message: "Erreur serveur lors de la récupération des données." });
  }
});

module.exports = router;
