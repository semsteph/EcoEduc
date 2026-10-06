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
router.get('/notifications/unread/:etablissementId/:anneeScolaireId', authenticateJWT, async (req, res) => {
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

router.put('/notifications/mark-read/:etabId/:anneeId', authenticateJWT, async (req, res) => {
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
router.get('/notifications/check/:eleveId/:startDate/:endDate/:etabId/:anneeId', authenticateJWT, async (req, res) => {
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

router.post('/notifications/generate', authenticateJWT, async (req, res) => {
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

router.get('/notifications/:etabId/:anneeId', authenticateJWT, async (req, res) => {
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

// =====================================================================
//  Espace enseignant : une seule liste de notifications (identité lue dans
//  le jeton, jamais dans l'URL).
//  - permissions d'absence accordées (ou sous réserve de justification) aux
//    élèves de ses classes, récentes ou à venir ;
//  - réponses de l'administration à ses demandes de modification de notes.
// =====================================================================
const STATUTS_ABSENCE = ['autoriser', 'sous reserve de justification'];

// Nombre de jours couverts par une permission (« 2 jours », « 1 semaine »,
// « 8h-10h » → 1).
function joursDePermission(duree) {
  const t = String(duree || '').toLowerCase();
  const n = Number((t.match(/(\d+)/) || [])[1]) || 1;
  if (/semaine/.test(t)) return Math.min(n * 7, 60);
  if (/jour|journ|\bj\b/.test(t) && !/\d+\s*h/.test(t)) return Math.min(n, 60);
  return 1;
}
const isoJour = (d) => {
  if (typeof d === 'string') return d.slice(0, 10);
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const ajouterJours = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return isoJour(d);
};

const JOURS_SEMAINE = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const minutesDe = (t) => { const m = String(t || '').trim().match(/^(\d{1,2})\s*(?:h|:)\s*(\d{0,2})/i); return m ? Number(m[1]) * 60 + Number(m[2] || 0) : null; };
const plageDe = (h) => { const [a, b] = String(h || '').split(/\s*[-–à]\s*/); const d = minutesDe(a); const f = minutesDe(b); return { d, f: f ?? (d === null ? null : d + 60) }; };

// Période couverte par une permission : jours (début → fin) et, pour une
// absence de quelques heures, la plage horaire. Anciennes demandes : durée
// lue dans le texte.
function etendue(p) {
  const debut = isoJour(p.Date);
  const fin = p.date_fin ? isoJour(p.date_fin) : ajouterJours(debut, joursDePermission(p.Duree) - 1);
  let heures = null;
  if (p.heure_debut && p.heure_fin) heures = { d: minutesDe(p.heure_debut), f: minutesDe(p.heure_fin) };
  else if (!p.date_fin && joursDePermission(p.Duree) === 1) {
    const h = plageDe(p.Duree);
    if (h.d !== null && /\d\s*h/i.test(String(p.Duree))) heures = h;
  }
  return { debut, fin, heures };
}

// Jours de la semaine (« Lundi »...) couverts, au plus deux semaines.
function joursCouverts(debut, fin) {
  const jours = new Set();
  for (let d = debut, i = 0; d <= fin && i < 14; d = ajouterJours(d, 1), i += 1) jours.add(JOURS_SEMAINE[new Date(`${d}T12:00:00`).getDay()]);
  return jours;
}

// L'enseignant a-t-il cours avec la classe pendant l'absence ? Si la classe
// n'a pas encore d'emploi du temps, on prévient tous ses enseignants.
function aCoursPendant(etendueP, creneauxClasse, creneauxProf) {
  if (!creneauxClasse.length) return true;
  const jours = joursCouverts(etendueP.debut, etendueP.fin);
  return creneauxProf.some((c) => {
    if (!jours.has(c.jour)) return false;
    if (!etendueP.heures) return true;
    const q = plageDe(c.horaire);
    return q.d === null || (etendueP.heures.d < q.f && q.d < etendueP.heures.f);
  });
}

async function creneaux(conn, { enseignantId, annee, classeIds }) {
  if (!classeIds.length) return { classe: {}, prof: {} };
  const [tous] = await conn.query('SELECT classe_id, `matière_id` AS matiereId, jour, horaire FROM programmes WHERE classe_id IN (?) AND Annee_scolaire_id = ?', [classeIds, annee]);
  const [mesMatieres] = await conn.query('SELECT Classes_id, matiere_id FROM enseigner WHERE Enseignants_id = ? AND Annee_scolaire_id = ?', [enseignantId, annee]);
  const miennes = new Set(mesMatieres.map((m) => `${m.Classes_id}:${m.matiere_id}`));
  const classe = {}; const prof = {};
  for (const c of tous) {
    (classe[c.classe_id] = classe[c.classe_id] || []).push(c);
    if (miennes.has(`${c.classe_id}:${c.matiereId}`)) (prof[c.classe_id] = prof[c.classe_id] || []).push(c);
  }
  return { classe, prof };
}

function enseignantDuJeton(req, res) {
  const u = req.user || {};
  if (u.type !== undefined || u.role === 'parent' || !u.id || !u.etablissementId) {
    res.status(403).json({ message: 'Réservé aux enseignants.' });
    return null;
  }
  return { id: Number(u.id), etab: Number(u.etablissementId) };
}

async function anneeOuverte(etab) {
  const [[a]] = await db.query("SELECT id FROM annee_scolaire WHERE etablissement_id = ? AND statut = 'ouverte' ORDER BY id DESC LIMIT 1", [etab]);
  return a ? a.id : null;
}

router.get('/enseignant/notifications', authenticateJWT, async (req, res) => {
  const ens = enseignantDuJeton(req, res);
  if (!ens) return;
  try {
    const annee = await anneeOuverte(ens.etab);
    const items = [];
    if (annee) {
      // Permissions récentes ou à venir des élèves de ses classes, retenues
      // seulement s'il a cours avec la classe pendant l'absence (jour et
      // heures, d'après l'emploi du temps).
      const [candidates] = await db.query(
        `SELECT DISTINCT p.id, p.Date, p.date_fin, p.heure_debut, p.heure_fin, p.Duree, e.classe_id
         FROM permission p
         JOIN eleve e ON e.id = p.eleve_id
         JOIN enseigner g ON g.Classes_id = e.classe_id AND g.Enseignants_id = ? AND g.Annee_scolaire_id = ?
         WHERE p.etablissement_id = ? AND p.Annee_scolaire_id = ? AND p.Statut IN (?)
           AND COALESCE(p.date_fin, p.Date) >= CURDATE() - INTERVAL 30 DAY`,
        [ens.id, annee, ens.etab, annee, STATUTS_ABSENCE]
      );
      const cr = await creneaux(db, { enseignantId: ens.id, annee, classeIds: [...new Set(candidates.map((c) => c.classe_id))] });
      const concernees = candidates
        .filter((p) => aCoursPendant(etendue(p), cr.classe[p.classe_id] || [], cr.prof[p.classe_id] || []))
        .map((p) => p.id);
      if (concernees.length) {
        await db.query(
          'INSERT IGNORE INTO notificationProf (enseignant_id, permission_id, etablissement_id) VALUES ?',
          [concernees.map((id) => [ens.id, id, ens.etab])]
        );
      }
      const [perms] = await db.query(
        `SELECT np.id, np.is_read, np.created_at, p.id AS permissionId, p.Date, p.date_fin, p.heure_debut, p.heure_fin, p.Duree, p.Statut,
                e.nom, e.prenom, c.id AS classeId, c.nom AS classe,
                (SELECT MIN(g2.matiere_id) FROM enseigner g2 WHERE g2.Classes_id = c.id AND g2.Enseignants_id = ? AND g2.Annee_scolaire_id = ?) AS matiereId
         FROM notificationProf np
         JOIN permission p ON p.id = np.permission_id
         JOIN eleve e ON e.id = p.eleve_id
         JOIN classes c ON c.id = e.classe_id
         WHERE np.enseignant_id = ? AND np.etablissement_id = ? AND p.Annee_scolaire_id = ?
           AND p.Statut IN (?) AND p.id IN (?)
         ORDER BY p.Date DESC LIMIT 200`,
        [ens.id, annee, ens.id, ens.etab, annee, STATUTS_ABSENCE, concernees.length ? concernees : [0]]
      );
      const auj = isoJour(new Date());
      for (const p of perms) {
        const { debut, fin } = etendue(p);
        const quand = fin < auj ? 'passee' : debut > auj ? 'a-venir' : 'aujourdhui';
        items.push({
          cle: `perm:${p.permissionId}`,
          type: 'permission',
          lu: Boolean(p.is_read),
          date: p.created_at,
          eleve: `${p.nom} ${p.prenom}`,
          classe: p.classe,
          classeId: p.classeId,
          matiereId: p.matiereId,
          debut, fin, duree: p.Duree,
          sousReserve: p.Statut !== 'autoriser',
          quand,
        });
      }
    }
    // Réponses de l'administration aux demandes de modification de notes.
    const [demandes] = await db.query(
      `SELECT r.id, r.statut, r.note_type, r.type_demande, r.ancienne_valeur, r.nouvelle_valeur,
              r.commentaire_admin, r.vu_par_enseignant, r.date_traitement, r.date_demande,
              r.matieres_id AS matiereId, r.classe_id AS classeId, e.nom, e.prenom, m.nom AS matiere
       FROM note_modification_requests r
       JOIN eleve e ON e.id = r.eleve_id
       JOIN matieres m ON m.id = r.matieres_id
       WHERE r.enseignant_id = ? AND r.statut <> 'en_attente'
       ORDER BY COALESCE(r.date_traitement, r.date_demande) DESC LIMIT 50`,
      [ens.id]
    );
    for (const d of demandes) {
      items.push({
        cle: `dem:${d.id}`,
        type: 'demande',
        lu: Boolean(d.vu_par_enseignant),
        date: d.date_traitement || d.date_demande,
        eleve: `${d.nom} ${d.prenom}`,
        matiere: d.matiere,
        matiereId: d.matiereId,
        classeId: d.classeId,
        champ: d.note_type,
        acceptee: d.statut === 'approuvee',
        statut: d.statut,
        suppression: d.type_demande !== 'modification',
        ancienne: d.ancienne_valeur,
        nouvelle: d.nouvelle_valeur,
        commentaire: d.commentaire_admin,
      });
    }
    items.sort((a, b) => (a.lu - b.lu) || (new Date(b.date) - new Date(a.date)));
    res.json({ items, nonLues: items.filter((i) => !i.lu).length });
  } catch (error) {
    console.error('Erreur notifications enseignant :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

router.put('/enseignant/notifications/lues', authenticateJWT, async (req, res) => {
  const ens = enseignantDuJeton(req, res);
  if (!ens) return;
  try {
    await db.query('UPDATE notificationProf SET is_read = 1, read_at = NOW() WHERE enseignant_id = ? AND etablissement_id = ? AND is_read = 0', [ens.id, ens.etab]);
    await db.query("UPDATE note_modification_requests SET vu_par_enseignant = 1 WHERE enseignant_id = ? AND statut <> 'en_attente' AND vu_par_enseignant = 0", [ens.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Erreur marquage notifications enseignant :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// Élèves d'une classe ayant une permission accordée couvrant une date :
// l'appel les marque d'office « Permissionnaire ».
router.get('/enseignant/permissions', authenticateJWT, async (req, res) => {
  const ens = enseignantDuJeton(req, res);
  if (!ens) return;
  const classeId = Number(req.query.classeId);
  const matiereId = Number(req.query.matiereId) || null;
  const date = String(req.query.date || '');
  if (!classeId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: 'Classe et date requises.' });
  try {
    const annee = await anneeOuverte(ens.etab);
    const [[ok]] = await db.query('SELECT 1 AS ok FROM enseigner WHERE Enseignants_id = ? AND Classes_id = ? AND Annee_scolaire_id = ? LIMIT 1', [ens.id, classeId, annee]);
    if (!ok) return res.status(403).json({ message: "Vous n'enseignez pas dans cette classe." });
    const [perms] = await db.query(
      `SELECT p.eleve_id, p.Date, p.date_fin, p.heure_debut, p.heure_fin, p.Duree, p.Statut FROM permission p JOIN eleve e ON e.id = p.eleve_id
       WHERE e.classe_id = ? AND p.Annee_scolaire_id = ? AND p.Statut IN (?) AND p.Date BETWEEN ? - INTERVAL 60 DAY AND ?`,
      [classeId, annee, STATUTS_ABSENCE, date, date]
    );
    // Absence de quelques heures : seulement si elle touche le cours de cette
    // matière ce jour-là (ou si l'horaire du cours n'est pas connu).
    const [cours] = matiereId
      ? await db.query('SELECT horaire FROM programmes WHERE classe_id = ? AND `matière_id` = ? AND jour = ? AND Annee_scolaire_id = ?', [classeId, matiereId, JOURS_SEMAINE[new Date(`${date}T12:00:00`).getDay()], annee])
      : [[]];
    const eleves = perms
      .map((p) => ({ p, e: etendue(p) }))
      .filter(({ e }) => e.debut <= date && e.fin >= date)
      .filter(({ e }) => !e.heures || !cours.length || cours.some((c) => { const q = plageDe(c.horaire); return q.d === null || (e.heures.d < q.f && q.d < e.heures.f); }))
      .map(({ p }) => ({ eleveId: p.eleve_id, duree: p.Duree, sousReserve: p.Statut !== 'autoriser' }));
    res.json(eleves);
  } catch (error) {
    console.error('Erreur permissions du jour :', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
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

    // Ancienne route (remplacée par GET /parent/notifications) : elle ne
    // marque plus rien comme « vu » — le simple calcul d'un badge faisait
    // disparaître les nouvelles absences avant que le parent les lise.

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
