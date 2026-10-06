// =====================================================================
//  Programme de cours, activités, tests
//  Monté dans server.cjs avec : app.use('/api', require('./routes/programme.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, getEleveDuParentOr403 } = require('../server-lib/auth.cjs');
const moment = require('moment');
const messagesParents = require('../server-lib/messages-parents.cjs');
const programmesMatiere = require('../server-lib/programmes-matiere.cjs');

// Route pour ajouter un programme
router.post('/programme', authenticateJWT, async (req, res) => {
  const { classId, jour, horaire, matiereId, etablissementId, anneeScolaireId } = req.body;

  if (!classId || !jour || !horaire || !matiereId || !etablissementId ||   !anneeScolaireId) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }

  try {
    // Pas deux cours au même moment : ni dans la classe, ni pour l'enseignant
    // de cette matière (avant : aucun contrôle).
    const minutes = (t) => { const m = String(t || '').trim().match(/^(\d{1,2})\s*(?:h|:)\s*(\d{0,2})/i); return m ? Number(m[1]) * 60 + Number(m[2] || 0) : null; };
    const plage = (h) => { const [a, b] = String(h || '').split(/\s*[-–à]\s*/); const d = minutes(a); const f = minutes(b); return { d, f: f ?? (d === null ? null : d + 60) }; };
    const p = plage(horaire);
    if (p.d === null) return res.status(400).json({ error: "Horaire illisible : écrivez par exemple « 8h00-10h00 »." });
    const chevauche = (h) => { const q = plage(h); return q.d !== null && p.d < q.f && q.d < p.f; };
    const memeJour = (j) => String(j || '').trim().toLowerCase() === String(jour).trim().toLowerCase();

    const [cours] = await req.db.query(
      `SELECT p.jour, p.horaire, m.nom AS matiere FROM programmes p JOIN matieres m ON m.id = p.\`matière_id\` WHERE p.classe_id = ? AND p.Annee_scolaire_id = ?`,
      [classId, anneeScolaireId]
    );
    const conflitClasse = cours.find((c) => memeJour(c.jour) && chevauche(c.horaire));
    if (conflitClasse) {
      return res.status(409).json({ error: `La classe a déjà cours le ${conflitClasse.jour} ${conflitClasse.horaire} (${conflitClasse.matiere}).` });
    }
    const [[prof]] = await req.db.query(
      'SELECT Enseignants_id AS id FROM enseigner WHERE Classes_id = ? AND matiere_id = ? AND Annee_scolaire_id = ? LIMIT 1',
      [classId, matiereId, anneeScolaireId]
    );
    if (prof) {
      const [occupe] = await req.db.query(
        `SELECT p.jour, p.horaire, c.nom AS classe, en.nom, en.prenom
         FROM programmes p
         JOIN enseigner e ON e.Classes_id = p.classe_id AND e.matiere_id = p.\`matière_id\` AND e.Annee_scolaire_id = ?
         JOIN classes c ON c.id = p.classe_id
         JOIN enseignants en ON en.id = e.Enseignants_id
         WHERE e.Enseignants_id = ? AND p.classe_id <> ? AND p.Annee_scolaire_id = ?`,
        [anneeScolaireId, prof.id, classId, anneeScolaireId]
      );
      const conflitProf = occupe.find((c) => memeJour(c.jour) && chevauche(c.horaire));
      if (conflitProf) {
        return res.status(409).json({ error: `${conflitProf.prenom} ${conflitProf.nom} a déjà cours en ${conflitProf.classe} le ${conflitProf.jour} ${conflitProf.horaire}.` });
      }
    }

    const query = `
      INSERT INTO programmes (classe_id, jour, horaire, matière_id, etablissement_id, Annee_scolaire_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await req.db.query(query, [classId, jour, horaire, matiereId, etablissementId, anneeScolaireId]);
    await messagesParents.programmeModifie(req.db, { classeId: classId, action: 'ajout', jour, horaire, matiereId });

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
      `SELECT p.jour, p.horaire, p.\`matière_id\` FROM programmes p WHERE p.classe_id = ? AND p.Annee_scolaire_id = (SELECT a.id FROM annee_scolaire a WHERE a.etablissement_id = p.etablissement_id AND a.statut = 'ouverte' ORDER BY a.id DESC LIMIT 1)`,
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
      DELETE p FROM programmes p
      WHERE p.classe_id = ? AND p.\`matière_id\` = ? AND p.jour = ? AND p.Annee_scolaire_id = (SELECT a.id FROM annee_scolaire a WHERE a.etablissement_id = p.etablissement_id AND a.statut = 'ouverte' ORDER BY a.id DESC LIMIT 1)
    `;
    const [retires] = await req.db.query(`SELECT p.horaire FROM programmes p WHERE p.classe_id = ? AND p.\`matière_id\` = ? AND p.jour = ? AND p.Annee_scolaire_id = (SELECT a.id FROM annee_scolaire a WHERE a.etablissement_id = p.etablissement_id AND a.statut = 'ouverte' ORDER BY a.id DESC LIMIT 1)`, [classId, matiereId, jour]);
    const [result] = await req.db.execute(query, [classId, matiereId, jour]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Programme non trouvé.' });
    }
    for (const r of retires) {
      await messagesParents.programmeModifie(req.db, { classeId: classId, action: 'retrait', jour, horaire: r.horaire, matiereId });
    }

    res.status(200).json({ message: 'Programme supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression du programme:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du programme.' });
  }
});

router.post('/addActivity', authenticateJWT, async (req, res) => {
  try {
    const { teacherId, subjectId, date, hours, classId, semesterName, etablissementId, anneeScolaireId } = req.body;
    // Séance rattachée au programme : partie choisie, ce qui a été fait, terminée.
    const programmeElementId = Number(req.body.programmeElementId) || null;
    const contenu = String(req.body.contenu || '').trim().slice(0, 5000) || null;
    const termine = req.body.termine ? 1 : 0;
    let activity = String(req.body.activity || '').trim();

    // Vérification des champs obligatoires (l'intitulé peut venir du programme)
    if (!teacherId || !subjectId || !classId || !semesterName || !date || !hours || (!activity && !programmeElementId) || !etablissementId || !anneeScolaireId) {
      return res.status(400).json({ error: "Tous les champs sont obligatoires." });
    }

    // La partie choisie doit appartenir au programme de cette classe pour
    // cette matière ; l'intitulé de la séance reprend son chemin
    // (« SA 1 : … › Activité 2 : … ») pour l'assistant et les parents.
    if (programmeElementId) {
      const classe = await programmesMatiere.classeInfo(req.db, classId);
      const programme = await programmesMatiere.programmeDeClasse(req.db, classe, Number(subjectId), req.user.role === 'enseignant' ? Number(req.user.id) : null);
      const entrees = programme ? programmesMatiere.aplatir(await programmesMatiere.arbre(req.db, programme.id)) : [];
      const entree = entrees.find((x) => x.element.id === programmeElementId);
      if (!entree) return res.status(400).json({ error: "Cette partie n'appartient pas au programme de la classe." });
      if (!activity) activity = programmesMatiere.cheminTexte(entree.chemin);
    }
    activity = activity.slice(0, 255);

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
      `INSERT INTO tests (enseignant_id, matière_id, activite, date, horaire, classe_id, semestre_id, etablissement_id, Annee_scolaire_id, programme_element_id, contenu, element_termine)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [teacherId, subjectId, activity, date, hours, classId, termId, etablissementId, anneeScolaireId, programmeElementId, contenu, termine]
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
  } catch (error) {
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
      res.status(200).json([]); // aucune activité encore : liste vide, pas une erreur
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
    const [[classe]] = await req.db.query('SELECT nom FROM classes WHERE id = ?', [classeId]);

    // Cours de la classe pour l'année en cours, avec l'enseignant de chaque matière.
    const [rowsProgramme] = await req.db.query(
      `SELECT p.jour, p.horaire, m.nom AS matiere,
              (SELECT CONCAT(en.prenom, ' ', en.nom) FROM enseigner g JOIN enseignants en ON en.id = g.Enseignants_id
               WHERE g.Classes_id = p.classe_id AND g.matiere_id = p.\`matière_id\` AND g.Annee_scolaire_id = p.Annee_scolaire_id LIMIT 1) AS enseignant
       FROM programmes p 
       JOIN matieres m ON p.matière_id = m.id
       WHERE p.classe_id = ? AND p.Annee_scolaire_id = (SELECT a.id FROM annee_scolaire a WHERE a.etablissement_id = p.etablissement_id AND a.statut = 'ouverte' ORDER BY a.id DESC LIMIT 1)`,
      [classeId]
    );

    const creneaux = rowsProgramme.map((r) => ({ jour: r.jour, horaire: r.horaire, matiere: r.matiere, enseignant: r.enseignant || null }));
    if (rowsProgramme.length === 0) {
      return res.json({ programme: {}, jours: [], matieres: [], creneaux: [], classe: classe ? classe.nom : null }); // pas encore d'emploi du temps
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
    res.json({ programme, jours: Object.keys(programme), matieres, creneaux, classe: classe ? classe.nom : null });
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
