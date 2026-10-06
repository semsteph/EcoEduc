// =====================================================================
//  Présences et incidents
//  Monté dans server.cjs avec : app.use('/api', require('./routes/presence.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, getEleveDuParentOr403 } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const notesService = require('../server-lib/notes-service.cjs');
const evenements = require('../server-lib/alertes-evenements.cjs');
const moment = require('moment');

router.get('/absents', authenticateJWT, async (req, res) => {
  const { classeId, etablissementId, anneeScolaireId } = req.query;

  if (!classeId || !etablissementId || !anneeScolaireId) {
    return res.status(400).json({ error: 'Les paramètres classeId et etablissementId sont requis.' });
  }

  try {
    // Obtenir la date la plus récente avec des absences dans cette classe et cet établissement
    const [dateRows] = await db.query(
      `SELECT MAX(date) AS derniere_date 
       FROM presence 
       WHERE classe_id = ? AND etablissement_id = ? AND statut = 'Absent' AND Annee_scolaire_id = ?`,
      [classeId, etablissementId, anneeScolaireId]
    );

    const derniereDate = dateRows[0]?.derniere_date;

    if (!derniereDate) {
      return res.status(404).json({ error: 'Aucune absence trouvée pour cette classe.' });
    }

    // Récupérer les informations des élèves absents pour cette date
    const [absents] = await db.query(
      `SELECT eleve.nom, eleve.prenom, presence.motif
       FROM presence
       INNER JOIN eleve ON presence.eleve_id = eleve.id
       WHERE presence.classe_id = ? AND presence.etablissement_id = ? 
       AND presence.statut = 'Absent' AND presence.date = ?`,
      [classeId, etablissementId, derniereDate]
    );

    res.json(absents);
  } catch (error) {
    console.error('Erreur lors de la récupération des absents :', error);
    res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer plus tard.' });
  }
});

// Enregistre l'appel : seules les absences sont stockées. Un même élève,
// même jour, même matière n'a qu'une ligne (avant : doublons à chaque
// nouvel enregistrement, taux d'absence faussés). Statut « Présent »
// = l'absence notée par erreur est retirée.
router.post('/presence', authenticateJWT, async (req, res) => {
  const presences = Array.isArray(req.body) ? req.body : [];
  if (!presences.length) return res.status(400).json({ error: 'Aucune présence à enregistrer.' });
  if (presences.length > 500) return res.status(400).json({ error: 'Trop de lignes en une fois.' });

  const STATUTS = { absent: 'Absent', permissionnaire: 'Permissionnaire', permissionaire: 'Permissionnaire', present: null, 'présent': null };
  let connection;

  try {
    connection = await db.getConnection();
    const etablissementId = Number(req.user.etablissementId);
    const first = presences[0];
    if (!(await notesService.canWriteNotes(connection, req.user, { classeId: first.classeId, matiereId: first.subjectId, anneeScolaireId: first.anneeScolaireId }))) {
      return res.status(403).json({ error: "Vous n'enseignez pas cette matière dans cette classe." });
    }
    await connection.beginTransaction();

    let enregistrees = 0;
    for (const presence of presences) {
      const { date, status, eleveId, subjectId, classeId, semesterName, anneeScolaireId } = presence;
      const key = String(status || '').trim().toLowerCase();
      if (!(key in STATUTS) || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
        throw Object.assign(new Error('Statut ou date invalide.'), { code: 'VALIDATION' });
      }
      if (new Date(`${date}T00:00:00`) > new Date()) {
        throw Object.assign(new Error('La date ne peut pas être dans le futur.'), { code: 'VALIDATION' });
      }
      if (Number(classeId) !== Number(first.classeId) || Number(subjectId) !== Number(first.subjectId)) {
        throw Object.assign(new Error('Un appel concerne une seule classe et une seule matière.'), { code: 'VALIDATION' });
      }

      const [semesterResult] = await connection.query(
        `SELECT id FROM semestre WHERE nom = ? AND etablissement_id = ?`,
        [semesterName, etablissementId]
      );
      if (!semesterResult.length) {
        throw Object.assign(new Error(`Période introuvable : ${semesterName}`), { code: 'VALIDATION' });
      }

      await connection.query(
        'DELETE FROM presence WHERE eleve_id = ? AND date = ? AND matieres_id = ? AND Annee_scolaire_id = ?',
        [eleveId, date, subjectId, anneeScolaireId]
      );
      if (STATUTS[key]) {
        await connection.query(
          `INSERT INTO presence (date, statut, eleve_id, matieres_id, classe_id, semestre_id, etablissement_id, Annee_scolaire_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [date, STATUTS[key], eleveId, subjectId, classeId, semesterResult[0].id, etablissementId, anneeScolaireId]
        );
        enregistrees += 1;
      }
    }

    // Trace de l'appel (dénominateur du taux de présence).
    await connection.query(
      'INSERT IGNORE INTO appel (classe_id, matiere_id, date, etablissement_id, Annee_scolaire_id) VALUES (?, ?, ?, ?, ?)',
      [first.classeId, first.subjectId, first.date, etablissementId, first.anneeScolaireId]
    );

    await connection.commit();
    // Parents prévenus (application, téléphone, SMS si activé) ; une
    // correction (élève finalement présent) retire l'alerte non lue.
    evenements.plusTard(evenements.absencesDuJour, presences.map((p) => Number(p.eleveId)), first.date);
    res.status(201).json({ message: enregistrees ? `${enregistrees} absence(s) enregistrée(s).` : 'Appel enregistré : aucun absent.', enregistrees });
  } catch (error) {
    if (connection) { try { await connection.rollback(); } catch (_) {} }
    if (error.code === 'VALIDATION') return res.status(400).json({ error: error.message });
    console.error('Erreur lors de l\'enregistrement des présences :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'enregistrement des présences.' });
  } finally {
    if (connection) connection.release();
  }
});

// Route pour obtenir les données de présence en fonction de l'élève et de l'année scolaire
router.get('/presence', authenticateJWT, async (req, res) => {
  try {
    const { childId, anneeScolaireId } = req.query;

    if (!(await getEleveDuParentOr403(req, res, childId))) return;

    const query = `
      SELECT p.id, p.date, p.heures AS heure, p.statut AS presence, 
             m.nom AS matiere, s.nom AS semestreNom
      FROM presence p
      JOIN matieres m ON p.matieres_id = m.id
      JOIN semestre s ON p.semestre_id = s.id
      WHERE p.eleve_id = ? AND p.Annee_scolaire_id = ?
    `;

    const [results] = await db.query(query, [childId, anneeScolaireId]);
    res.json(results);

  } catch (error) {
    console.error('Erreur lors de la récupération des données de présence :', error);
    res.status(500).send('Erreur serveur');
  }
});

// Route pour mettre à jour le motif dans la table Presence
router.post('/presence/:id/motif', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { motif } = req.body;

  if (!motif) {
    return res.status(400).send('Le motif est requis');
  }

  try {
    const [rows] = await req.db.query(
      `SELECT e.Parents_id FROM presence p
       JOIN eleve e ON e.id = p.eleve_id
       WHERE p.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).send('Présence non trouvée');
    }
    if (Number(rows[0].Parents_id) !== Number(req.user.id)) {
      return res.status(403).send("Cette présence n'appartient pas à votre compte.");
    }

    const query = 'UPDATE presence SET motif = ? WHERE id = ?';
    const [result] = await req.db.query(query, [motif, id]);

    if (result.affectedRows === 0) {
      return res.status(404).send('Présence non trouvée');
    }

    res.send('Motif mis à jour avec succès');
  } catch (error) {
    console.error('Erreur lors de la mise à jour du motif :', error);
    res.status(500).send('Erreur serveur');
  }
});

// API pour récupérer les incidents basés sur l'élève et le semestre
router.get('/incidents', authenticateJWT, async (req, res) => {
  const { eleveId, anneeScolaireId } = req.query;

  // Vérifier que eleveId est fourni
  if (!eleveId) {
    return res.status(400).json({ error: "eleveId est requis" });
  }

  if (!(await getEleveDuParentOr403(req, res, eleveId))) return;

  // Si anneeScolaireId n'est pas défini, retourner une liste vide
  if (!anneeScolaireId) {
    return res.json([]);
  }

  try {
    const [rows] = await req.db.execute(
      `SELECT p.id, p.auteur, p.date, p.heure, p.punition, p.motif, 
      p.total_hours, s.nom AS semestreNom
      FROM punitions p
      JOIN semestre s ON p.semestre_id = s.id
      WHERE p.eleve_id = ? AND p.Annee_scolaire_id = ?`,
      [eleveId, anneeScolaireId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des incidents :', error);
    res.status(500).send('Erreur serveur');
  }
});

router.get('/presence/:studentId/:semestre/:anneeScolaireId', authenticateJWT, async (req, res) => {
  const { studentId, semestre, anneeScolaireId } = req.params;
  
  // Log pour vérifier les valeurs des paramètres
  console.log('Student ID:', studentId);
  console.log('Semestre:', semestre);
  console.log('Année Scolaire ID:', anneeScolaireId);

  // Vérifier si semestre est un string
  if (typeof semestre !== 'string') {
    return res.status(400).json({ error: 'Le semestre doit être un caractère.' });
  }

  try {
    const [rows] = await req.db.query(`
      SELECT p.date, p.heures, p.statut, p.motif, m.nom AS matiere 
      FROM presence p 
      JOIN matieres m ON p.matieres_id = m.id 
      JOIN semestre s ON p.semestre_id = s.id
      WHERE p.eleve_id = ? AND s.nom = ? AND p.Annee_scolaire_id = ?
    `, [studentId, semestre, anneeScolaireId]);

    // Log pour vérifier le résultat de la requête
    console.log('Résultats de la requête:', rows);

    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des données' });
  }
});

// API pour récupérer les incidents basés sur l'élève et le semestre pour l'administration
router.get('/incident', authenticateJWT, async (req, res) => {
  const { studentId, semestre, anneeScolaireId } = req.query;

  try {
    // Requête SQL pour récupérer les incidents basés sur l'élève et le semestre
    const [rows] = await req.db.execute(
      `SELECT p.id, p.auteur, p.date, p.heure, p.punition, p.motif, 
      p.total_hours,
      s.nom
      FROM punitions p
      JOIN semestre s ON p.semestre_id = s.id
      WHERE p.eleve_id = ? AND s.nom = ? AND p.Annee_scolaire_id = ?`,
      [studentId, semestre, anneeScolaireId]
    );

    // Renvoyer les incidents au format JSON
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des incidents :', error);
    res.status(500).send('Erreur serveur');
  }
});

router.post('/incidents', authenticateJWT, async (req, res) => {
  const { eleveId, semestre, auteur, date, punition, heure, motif, etablissementId, anneeScolaireId } = req.body;

  let connection;

  try {
    // Vérifier et formater la date
    const formattedDate = moment(date, 'YYYY-MM-DD', true);
    if (!formattedDate.isValid()) {
      return res.status(400).json({ error: 'La date est invalide. Le format attendu est YYYY-MM-DD.' });
    }

    // Vérifier et normaliser le format de l'heure (HH:mm ou Hh:mm)
    const normalizedHeure = heure.replace('h', ':'); // Remplacer 'h' par ':'
    const formattedHeure = moment(normalizedHeure, ['HH:mm', 'H:mm'], true);
    if (!formattedHeure.isValid()) {
      return res.status(400).json({ error: 'L\'heure est invalide. Le format attendu est HH:mm ou Hh:mm.' });
    }

    // Obtenir une connexion à partir du pool
    connection = await req.db.getConnection();
    await connection.beginTransaction();

    // Récupérer l'ID du semestre à partir du nom du semestre
    const [semestreRows] = await connection.query(
      'SELECT id FROM semestre WHERE nom = ? AND etablissement_id = ?',
      [semestre, etablissementId]
    );

    if (semestreRows.length === 0) {
      throw new Error(`Semestre avec le nom "${semestre}" introuvable.`);
    }

    const semestreId = semestreRows[0].id;

    // Récupérer le dernier total_hours pour cet élève et ce semestre
    const [lastPunitionRows] = await connection.query(
      'SELECT total_hours FROM punitions WHERE eleve_id = ? AND semestre_id = ? AND Annee_scolaire_id = ? ORDER BY id DESC LIMIT 1',
      [eleveId, semestreId, anneeScolaireId]
    );

    let lastTotalHours = 0; // Par défaut, s'il n'y a pas de punition précédente
    if (lastPunitionRows.length > 0) {
      lastTotalHours = lastPunitionRows[0].total_hours;
    }

    // Gestion de la nouvelle punition :
    let newTotalHours = lastTotalHours;
    
    // Vérifier si la nouvelle punition est sous la forme "a h" (exemple "2h", "3h", etc.)
    const punitionHeureMatch = punition.match(/^(\d+)\s*h$/i);
    if (punitionHeureMatch) {
      // Extraire le nombre d'heures et l'ajouter au total
      const heures = parseInt(punitionHeureMatch[1], 10);
      newTotalHours += heures;
    } else if (!isNaN(punition)) {
      // Si c'est un nombre simple (ex: "2", "3"), ajouter directement au total des heures
      newTotalHours += parseFloat(punition);
    }

    // Insertion des données dans la table Punitions
    const [result] = await connection.query(
      `INSERT INTO punitions (eleve_id, semestre_id, auteur, date, punition, heure, motif, total_hours, etablissement_id, Annee_scolaire_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [eleveId, semestreId, auteur, formattedDate.format('YYYY-MM-DD'), punition, formattedHeure.format('HH:mm'), motif, newTotalHours, etablissementId, anneeScolaireId]
    );

    // Commit la transaction
    await connection.commit();

    // Renvoyer les données ajoutées avec l'ID généré
    const newPunition = {
      id: result.insertId,
      eleveId,
      semestreId,
      auteur,
      date: formattedDate.format('YYYY-MM-DD'),
      punition,
      heure: formattedHeure.format('HH:mm'),
      motif,
      total_hours: newTotalHours,
      etablissementId,
      anneeScolaireId,
    };

    res.status(201).json(newPunition);
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erreur lors de l\'ajout de la punition:', err);
    res.status(500).json({ error: 'Erreur de serveur.' });
  } finally {
    if (connection) connection.release();
  }
});

// Endpoint pour les données de présence
router.get('/presenceidd/:etablissementId/:anneeScolaireId?', authenticateJWT, async (req, res) => {
  const { etablissementId, anneeScolaireId } = req.params; // Récupérer les paramètres de la requête
  
  try {
    // Vérifier si l'ID de l'établissement est valide
    if (!etablissementId) {
      return res.status(400).json({ error: 'Paramètre etablissementId manquant' });
    }
    
    // Si anneeScolaireId n'est pas défini, retourner une liste vide
    if (!anneeScolaireId) {
      return res.json([]);
    }
    
    // Exécuter la requête SQL pour récupérer les présences filtrées
    const [results] = await req.db.query(
      'SELECT * FROM presence WHERE etablissement_id = ? AND Annee_scolaire_id = ?', 
      [etablissementId, anneeScolaireId]
    );
    
    res.json(results);
  } catch (err) {
    console.error('Erreur lors de la récupération des présences:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;
