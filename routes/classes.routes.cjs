// =====================================================================
//  Classes et promotions
//  Monté dans server.cjs avec : app.use('/api', require('./routes/classes.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');

router.post('/Classes/multiple', authenticateJWT, async (req, res) => {
  const { promotion_id, etablissement_id, cycle, nombre } = req.body;

  if (!promotion_id || !etablissement_id || !cycle || !nombre || isNaN(nombre)) {
    return res.status(400).json({ error: 'Champs requis manquants ou invalides.' });
  }
  if (Number(etablissement_id) !== Number(req.user.etablissementId)) {
    return res.status(403).json({ error: "Vous n'avez pas accès à cet établissement." });
  }

  const connection = req.db;

  try {
    // 1. Récupère le nom EXACT de la promotion (ex: "6ème")
    const [promoRows] = await connection.query(
      'SELECT nom FROM promotion WHERE id = ?',
      [promotion_id]
    );

    if (promoRows.length === 0) {
      return res.status(404).json({ error: 'Promotion non trouvée.' });
    }

    const nomPromotion = promoRows[0].nom;
    const createdClasses = [];
    
    // 2. Initialisation des compteurs
    let nombreCrees = 0;
    let tentativeIndex = 1;

    // 3. Boucle intelligente : on cherche les numéros libres
    while (nombreCrees < nombre) {
      // On génère le nom cible (ex: "6ème 1", "6ème 2"...)
      const nomClasse = `${nomPromotion} ${tentativeIndex}`;
      
      // On vérifie si ce nom existe déjà pour cet établissement
      const [existing] = await connection.query(
        'SELECT id FROM classes WHERE nom = ? AND etablissement_id = ?',
        [nomClasse, etablissement_id]
      );

      // Si la "place" est libre (pas de classe avec ce nom)
      if (existing.length === 0) {
        const [result] = await connection.query(
          'INSERT INTO classes (nom, Promotion_id, etablissement_id, cycle) VALUES (?, ?, ?, ?)',
          [nomClasse, promotion_id, etablissement_id, cycle]
        );
        createdClasses.push({ id: result.insertId, nom: nomClasse });
        nombreCrees++; // Une classe de faite !
      }

      // On passe au numéro suivant pour le prochain test
      tentativeIndex++;

      // Sécurité anti-boucle infinie
      if (tentativeIndex > 500) break; 
    }

    if (createdClasses.length === 0) {
      return res.status(200).json({ message: 'Toutes les classes demandées existent déjà.' });
    }

    res.status(201).json({
      message: `${createdClasses.length} classe(s) créée(s) avec succès.`,
      classes: createdClasses
    });

  } catch (error) {
    console.error('Erreur lors de la création des classes :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création.' });
  }
});

router.get('/Promotions', async (req, res) => {
  try {
    const [promotions] = await req.db.query('SELECT id, nom FROM promotion');
    res.status(200).json(promotions);
  } catch (error) {
    console.error('Erreur lors de la récupération des promotions', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des promotions.' });
  }
});

// Route pour obtenir une classe par ID
router.get('/Classes/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await req.db.query('SELECT * FROM classes WHERE id = ?', [id]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'Classe non trouvée.' });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de la classe', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

router.get('/classetablissement/:etablissementId', authenticateJWT, async (req, res) => {
  const etablissementId = req.params.etablissementId;

  if (!etablissementId || isNaN(etablissementId)) {
    return res.status(400).json({ error: 'L\'ID de l\'établissement est invalide.' });
  }
  if (Number(etablissementId) !== Number(req.user.etablissementId)) {
    return res.status(403).json({ error: "Vous n'avez pas accès à cet établissement." });
  }

  try {
    // Requête avec jointure pour avoir le nom de la promotion et le compte des élèves
    const [results] = await req.db.query(`
      SELECT 
        c.id, 
        c.nom AS class_name, 
        p.nom AS promotion_name, 
        c.Promotion_id as promotion_id,
        (SELECT COUNT(*) FROM eleve e WHERE e.classe_id = c.id) AS studentCount
      FROM classes c
      JOIN promotion p ON c.Promotion_id = p.id
      WHERE c.etablissement_id = ?
      ORDER BY p.nom ASC, c.nom ASC
    `, [etablissementId]);

    // Regrouper les résultats par nom de promotion
    const classesByPromotion = results.reduce((acc, classe) => {
      const { promotion_name, class_name, studentCount, id, promotion_id } = classe;
      
      if (!acc[promotion_name]) {
        acc[promotion_name] = [];
      }
      
      acc[promotion_name].push({
        id: id,
        name: class_name,
        studentCount: studentCount,
        promotion_id: promotion_id // Utile pour la modification
      });
      
      return acc;
    }, {});

    res.json(classesByPromotion);

  } catch (error) {
    console.error('Erreur lors de la récupération des classes :', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des données.' });
  }
});

// Route pour mettre à jour une classe par ID
router.put('/Classes/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { nom, promotion_id, } = req.body;

  if (nom && promotion_id) {
    try {
      const [result] = await req.db.query(
        'UPDATE classes SET nom = ?, Promotion_id = ? WHERE id = ?',
        [nom, promotion_id, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Classe non trouvée.' });
      }

      res.status(200).json({ id, nom, promotion_id });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la classe', error);
      res.status(500).json({ error: 'Une erreur est survenue lors de la mise à jour de la classe.' });
    }
  } else {
    res.status(400).json({ error: 'Le nom de la classe et l\'ID de la promotion sont requis.' });
  }
});

// Route pour supprimer une classe par id
// Route pour obtenir le nombre d'élèves dans une classe par ID et la supprimer si elle est vide
router.delete('/Classes/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const [classRows] = await req.db.query('SELECT etablissement_id FROM classes WHERE id = ?', [id]);
    if (classRows.length === 0) {
      return res.status(404).json({ error: 'Classe non trouvée.' });
    }
    if (Number(classRows[0].etablissement_id) !== Number(req.user.etablissementId)) {
      return res.status(403).json({ error: "Cette classe n'appartient pas à votre établissement." });
    }

    // Vérifier le nombre d'élèves associés à la classe
    const [countRows] = await req.db.query(
      'SELECT COUNT(*) AS studentCount FROM eleve WHERE classe_id = ?',
      [id]
    );

    const studentCount = countRows[0].studentCount;

    if (studentCount > 0) {
      return res.status(400).json({ error: 'Impossible de supprimer cette classe car elle contient des élèves.' });
    }

    // Supprimer la classe si elle est vide
    const [result] = await req.db.query('DELETE FROM classes WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Classe non trouvée.' });
    }

    res.status(200).json({ message: 'Classe supprimée avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la classe', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la suppression de la classe.' });
  }
});

router.get('/classes/:classeId/eleves', authenticateJWT, async (req, res) => {
  try {
    const classId = req.params.classeId;
    const inclurePartis = req.query.inclurePartis === 'true';

    // Une classe sans élève (ex. classe nouvellement créée, pas encore peuplée) est un
    // état normal, pas une erreur : on renvoie un tableau vide plutôt qu'un 404, pour
    // que les écrans (présence, notes, conduite...) l'affichent comme "vide" au lieu
    // d'un message d'erreur générique.
    // Par défaut on exclut les élèves marqués "parti" (non réinscrits) : ils ne
    // doivent plus apparaître en présence/notes/conduite ni dans la liste à traiter
    // en réinscription. ?inclurePartis=true permet de les revoir pour annuler un
    // marquage fait par erreur.
    const sql = inclurePartis
      ? 'SELECT id, nom, prenom, statut FROM eleve WHERE classe_id = ?'
      : "SELECT id, nom, prenom, statut FROM eleve WHERE classe_id = ? AND statut = 'actif'";

    const [rows] = await req.db.execute(sql, [classId]);

    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des élèves:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des élèves.' });
  }
});

//api pour notification administration dashbord
// Endpoint pour le nom de la classe
// Endpoint pour récupérer les informations d'une classe par son ID
router.get('/classes/:classId', authenticateJWT, async (req, res) => {
  const classId = parseInt(req.params.classId);
  try {
    const [rows] = await req.db.query('SELECT * FROM classes WHERE id = ?', [classId]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).send('Classe non trouvée');
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des informations de la classe:', err);
    res.status(500).send('Erreur interne du serveur');
  }
});

//api a revoir
router.get('/classe/:etablissementId', authenticateJWT, async (req, res) => {
  const etablissementId = req.params.etablissementId; // Récupérer l'ID de l'établissement depuis l'URL
  try {
    const [rows] = await db.query('SELECT id, nom FROM classes WHERE etablissement_id = ?', [etablissementId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Aucune classe trouvée pour cet établissement.' });
    }
    res.json(rows); // Envoyer les résultats en JSON
  } catch (err) {
    console.error('Erreur lors de la récupération des classes:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des classes' });
  }
});

router.get('/classes/:classId/:anneeScolaireId/details', authenticateJWT, async (req, res) => {
  const { classId, anneeScolaireId } = req.params;

  // Log des paramètres reçus
  console.log('Requête reçue avec les paramètres :', { classId, anneeScolaireId });

  // Vérification des paramètres
  if (!classId || !anneeScolaireId) {
    console.error('Paramètres manquants: classId ou anneeScolaireId');
    return res.status(400).json({ message: 'Paramètres manquants: classId ou anneeScolaireId.' });
  }

  const query = `
    SELECT 
      t.date, t.horaire, t.activite, 
      m.id AS matiere_id, m.nom AS matiere, 
      s.id AS semestre_id, s.nom AS semestre, 
      e.nom AS enseignantNom, e.prenom AS enseignantPrenom
    FROM tests t
    JOIN matieres m ON t.matière_id = m.id
    JOIN semestre s ON t.semestre_id = s.id
    JOIN enseignants e ON t.enseignant_id = e.id
    WHERE t.classe_id = ? AND t.Annee_scolaire_id = ?
    ORDER BY m.id, s.id, t.date;
  `;

  try {
    // Log de la requête SQL et des paramètres
    console.log('Exécution de la requête SQL :', query);
    console.log('Avec les paramètres :', [classId, anneeScolaireId]);

    const [results] = await req.db.query(query, [classId, anneeScolaireId]);

    // Log des résultats bruts
    console.log('Résultats de la requête :', results);

    // Vérifiez si aucun résultat n'est trouvé
    if (!results || results.length === 0) {
      console.warn('Aucun détail trouvé pour cette classe et cette année scolaire.');
      return res.status(404).json({ message: 'Aucun détail trouvé pour cette classe.' });
    }

    const matieresData = {};

    results.forEach(row => {
      const matiereId = row.matiere_id;

      if (!matieresData[matiereId]) {
        matieresData[matiereId] = {
          id: matiereId,
          nom: row.matiere,
          enseignant: {
            nom: row.enseignantNom,
            prenom: row.enseignantPrenom,
          },
          semestres: {},
          tests: [],
        };
      }

      if (!matieresData[matiereId].semestres[row.semestre_id]) {
        matieresData[matiereId].semestres[row.semestre_id] = {
          id: row.semestre_id,
          nom: row.semestre,
        };
      }

      matieresData[matiereId].tests.push({
        date: row.date,
        horaire: row.horaire,
        activite: row.activite,
        semestre_id: row.semestre_id,
      });
    });

    // Log des données transformées avant envoi
    const data = {
      matieres: Object.values(matieresData),
    };
    console.log('Données transformées à envoyer au client :', data);

    res.json(data);
  } catch (error) {
    // Log des erreurs
    console.error('Erreur lors de la récupération des détails de la classe :', error);

    res.status(500).json({
      message: 'Erreur interne du serveur lors de la récupération des détails de la classe.',
      error: error.message,
    });
  }
});

  router.get('/classe-details', authenticateJWT, async (req, res) => {
  const { classeId, anneeScolaireId } = req.query;

  try {
    // 🔹 Requête SQL
    const [results] = await req.db.query(
      `SELECT e.id AS eleve_id, e.nom AS eleve_nom, e.prenom AS eleve_prenom, 
              m.id AS matiere_id, m.nom AS matiere_nom, 
              s.id AS semestre_id, s.nom AS semestre_nom, 
              n.inter1, n.inter2, n.inter3, n.inter4, n.moyInter, 
              n.Dev1, n.Dev2, n.moy, n.moycoef 
       FROM eleve e
       JOIN note n ON e.id = n.Eleves_id
       JOIN matieres m ON m.id = n.matieres_id
       JOIN semestre s ON s.id = n.semestre_id
       JOIN enseigner en ON en.matiere_id = m.id
       WHERE n.classe_id = ? AND n.Annee_scolaire_id = ?`,
      [classeId, anneeScolaireId]
    );

    if (results.length === 0) {
      return res.json({
        semestres: [],
        matieres: [],
        notes: {},
        message: "Aucune note trouvée pour cette classe."
      });
    }

    // 🔹 Structuration
    const semestres = [];
    const matieres = [];
    let notes = {};

    results.forEach(row => {
      // ✅ Ajout semestre unique
      if (!semestres.find(sem => sem.id === row.semestre_id)) {
        semestres.push({ id: row.semestre_id, nom: row.semestre_nom });
      }

      // ✅ Ajout matière unique
      if (!matieres.find(mat => mat.id === row.matiere_id)) {
        matieres.push({ id: row.matiere_id, nom: row.matiere_nom });
      }

      // ✅ Initialiser la structure du semestre
      if (!notes[row.semestre_id]) {
        notes[row.semestre_id] = [];
      }

      // ✅ Vérifier si un objet existe déjà pour cet élève + matière
      let existing = notes[row.semestre_id].find(
        n => n.matiereId === row.matiere_id && n.eleveId === row.eleve_id
      );

      if (!existing) {
        // Si pas encore créé → on initialise
        existing = {
          matiereId: row.matiere_id,
          eleveId: row.eleve_id,
          nom: row.eleve_nom,
          prenom: row.eleve_prenom,
          inter1: row.inter1 || '',
          inter2: row.inter2 || '',
          inter3: row.inter3 || '',
          inter4: row.inter4 || '',
          moyInter: row.moyInter || '',
          dev1: row.Dev1 || '',
          dev2: row.Dev2 || '',
          moy: row.moy || '',
          moycoef: row.moycoef || '',
        };
        notes[row.semestre_id].push(existing);
      } else {
        // Si déjà créé → on complète les cases vides
        existing.inter1 = existing.inter1 || row.inter1 || '';
        existing.inter2 = existing.inter2 || row.inter2 || '';
        existing.inter3 = existing.inter3 || row.inter3 || '';
        existing.inter4 = existing.inter4 || row.inter4 || '';
        existing.moyInter = existing.moyInter || row.moyInter || '';
        existing.dev1 = existing.dev1 || row.Dev1 || '';
        existing.dev2 = existing.dev2 || row.Dev2 || '';
        existing.moy = existing.moy || row.moy || '';
        existing.moycoef = existing.moycoef || row.moycoef || '';
      }
    });

    // 🔹 Envoi de la réponse
    res.json({ semestres, matieres, notes });
  } catch (error) {
    console.error("Erreur lors de la récupération des détails de la classe :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des détails de la classe" });
  }
});

module.exports = router;
