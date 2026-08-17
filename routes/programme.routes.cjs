// =====================================================================
//  Programme de cours, activités, tests
//  Monté dans server.cjs avec : app.use('/api', require('./routes/programme.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, getEleveDuParentOr403 } = require('../server-lib/auth.cjs');
const moment = require('moment');

// Route pour ajouter un programme
router.post('/programme', authenticateJWT, async (req, res) => {
  const { classId, jour, horaire, matiereId, etablissementId, anneeScolaireId } = req.body;

  if (!classId || !jour || !horaire || !matiereId || !etablissementId ||   !anneeScolaireId) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }

  try {
    const query = `
      INSERT INTO programmes (classe_id, jour, horaire, matière_id, etablissement_id, Annee_scolaire_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await req.db.query(query, [classId, jour, horaire, matiereId, etablissementId, anneeScolaireId]);

    res.status(201).json({ message: 'Programme ajouté avec succès.' });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du programme:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du programme.' });
  }
});

// Route pour récupérer les programmes d'une classe
router.get('/programmes/:classId', authenticateJWT, async (req, res) => {
  try {
    // Extraction du paramètre classId depuis l'URL
    const classId = req.params.classId;

    // Exécution de la requête SQL pour récupérer les programmes basés sur classId
    const [rows] = await req.db.query(
      'SELECT jour, horaire, matière_id FROM programmes WHERE classe_id = ?',
      [classId] // Utilisation du paramètre classId dans la requête
    );
    
    // Envoi de la réponse avec les données récupérées
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des programmes:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des programmes.' });
  }
});

// API pour supprimer un programme spécifique
router.delete('/programme', authenticateJWT, async (req, res) => {
  const { classId, matiereId, jour } = req.body;

  if (!classId || !matiereId || !jour) {
    return res.status(400).json({ message: 'Les paramètres classId, matiereId et jour sont requis.' });
  }

  try {
    const query = `
      DELETE FROM programmes 
      WHERE classe_id = ? AND matière_id = ? AND jour = ?
    `;
    const [result] = await req.db.execute(query, [classId, matiereId, jour]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Programme non trouvé.' });
    }

    res.status(200).json({ message: 'Programme supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression du programme:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du programme.' });
  }
});

router.post('/addActivity', authenticateJWT, async (req, res) => {
  try {
    const { teacherId, subjectId, activity, date, hours, classId, semesterName, etablissementId, anneeScolaireId } = req.body;

    // Vérification des champs obligatoires
    if (!teacherId || !subjectId || !classId || !semesterName || !date || !hours || !activity || !etablissementId || !anneeScolaireId) {
      return res.status(400).json({ error: "Tous les champs sont obligatoires." });
    }

    // Récupération de l'ID du semestre en fonction du nom du semestre
    const [termResult] = await req.db.query(
      `SELECT id FROM semestre WHERE nom = ? AND etablissement_id = ?`,
      [semesterName, etablissementId]
    );

    if (termResult.length === 0) {
      return res.status(404).json({ error: "Semestre non trouvé." });
    }

    const termId = termResult[0].id;

    // Insertion de l'activité dans la base de données
    const [result] = await req.db.query(
      `INSERT INTO tests (enseignant_id, matière_id, activite, date, horaire, classe_id, semestre_id, etablissement_id, Annee_scolaire_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [teacherId, subjectId, activity, date, hours, classId, termId, etablissementId, anneeScolaireId]
    );

    // Vérification si l'insertion a réussi
    if (result.affectedRows === 1) {
      const [newActivity] = await req.db.query(
        `SELECT * FROM tests WHERE id = ?`,
        [result.insertId]
      );
      res.status(201).json(newActivity[0]);
    } else {
      res.status(400).json({ message: "Impossible d'ajouter l'activité." });
    }
  } catch (error) {33
    console.error('Erreur lors de l\'ajout de l\'activité:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

router.get('/getActivities/:classeId/:subjectId/:anneeScolaireId', authenticateJWT, async (req, res) => {
  try {
    const { classeId, subjectId, anneeScolaireId } = req.params;

    const [activities] = await req.db.query(
      `SELECT * FROM tests WHERE classe_id = ? AND matière_id = ? AND Annee_scolaire_id = ?`,
      [classeId, subjectId, anneeScolaireId]
    );

    if (activities.length > 0) {
      res.status(200).json(activities);
    } else {
      res.status(404).json({ message: "Aucune activité trouvée pour cette classe et matière." });
    }
  } catch (error) {
    console.error('Erreur lors du chargement des activités :', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

// API pour récupérer le programme d'un élève en fonction de son ID
router.get('/programme/:childId', authenticateJWT, async (req, res) => {
  const { childId } = req.params;

  if (!(await getEleveDuParentOr403(req, res, childId))) return;

  try {
    // Récupérer l'ID de la classe correspondant à l'ID de l'élève
    const [rowsEleve] = await req.db.query(
      'SELECT classe_id FROM eleve WHERE id = ?',
      [childId]
    );

    if (rowsEleve.length === 0) {
      return res.status(404).json({ message: 'Élève non trouvé' });
    }

    const classeId = rowsEleve[0].classe_id;

    // Récupérer le programme basé sur l'ID de la classe (sans filtre sur le semestre)
    const [rowsProgramme] = await req.db.query(
      `SELECT p.jour, p.horaire, m.nom AS matiere 
       FROM programmes p 
       JOIN matieres m ON p.matière_id = m.id
       WHERE p.classe_id = ?`,
      [classeId]
    );

    if (rowsProgramme.length === 0) {
      return res.status(404).json({ message: 'Programme non trouvé' });
    }

    // Structurer les données pour l'interface (jours, matières, horaires)
    const programme = {};
    const matieres = [];
    rowsProgramme.forEach(row => {
      if (!programme[row.jour]) {
        programme[row.jour] = {};
      }
      if (!programme[row.jour][row.matiere]) {
        programme[row.jour][row.matiere] = [];
        if (!matieres.includes(row.matiere)) {
          matieres.push(row.matiere);
        }
      }
      programme[row.jour][row.matiere].push(row.horaire);
    });

    // Envoyer les données structurées en réponse à l'interface
    res.json({ programme, jours: Object.keys(programme), matieres });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/tests/:childId', authenticateJWT, async (req, res) => {
  const { childId } = req.params;

  if (!(await getEleveDuParentOr403(req, res, childId))) return;

  try {
    // 1. Récupérer l'ID de la classe de l'élève
    const [rows] = await req.db.query('SELECT classe_id FROM eleve WHERE id = ?', [childId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Élève non trouvé' });
    }

    const classId = rows[0].classe_id;

    // 2. Récupérer les tests associés à cette classe
    const [tests] = await req.db.query(`
      SELECT t.date, t.activite, m.nom AS matiere
      FROM tests t
      JOIN matieres m ON t.matière_id = m.id
      WHERE t.classe_id = ?
    `, [classId]);

    // Vérifier si des tests existent
    if (tests.length === 0) {
      return res.status(200).json([]);  // Pas de tests disponibles
    }

    // Filtrer les tests pour ne garder que ceux du mois actuel
    const currentMonth = moment().month();  // Mois actuel (0 pour janvier, 11 pour décembre)
    const filteredTests = tests.filter(test => {
      const testMonth = moment(test.date, 'YYYY-MM-DD').month();  // Assumer que la date est stockée au format 'YYYY-MM-DD'
      return testMonth === currentMonth;
    });

    // 3. Envoyer les données filtrées au frontend
    res.json(filteredTests);

  } catch (error) {
    console.error('Erreur lors de la récupération des tests :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
