// =====================================================================
//  Notes
//  Monté dans server.cjs avec : app.use('/api', require('./routes/notes.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, getEleveDuParentOr403 } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');

// Endpoint pour récupérer les notes d'une classe et d'une matière spécifiques
router.get('/notes/:classeId/:subjectId/:semesterId/:anneeScolaireId', authenticateJWT, async (req, res) => {
  const { classeId, subjectId, semesterId, anneeScolaireId } = req.params;

  // Vérifier si les paramètres sont fournis
  if (!classeId || !subjectId || !semesterId || !anneeScolaireId) {
    return res.status(400).json({ error: 'Classe ID, semestre ID et Matière ID sont requis' });
  }

  try {
    // Exécution de la requête SQL pour récupérer les notes des élèves
    const [results] = await req.db.query(`
     SELECT 
    e.id AS eleveId, 
    e.nom, 
    e.prenom, 
    MAX(n.inter1) AS inter1, 
    MAX(n.inter2) AS inter2, 
    MAX(n.inter3) AS inter3, 
    MAX(n.inter4) AS inter4, 
    MAX(n.Dev1) AS Dev1, 
    MAX(n.Dev2) AS Dev2 
FROM eleve e 
LEFT JOIN note n 
    ON e.id = n.Eleves_id 
    AND n.classe_id = ? 
    AND n.matieres_id = ?
    AND n.semestre_id = ? 
    AND n.Annee_scolaire_id = ?
WHERE e.classe_id = ?
GROUP BY e.id, e.nom, e.prenom;

    `, [classeId, subjectId, semesterId, anneeScolaireId, classeId ]);

    // Si aucun résultat, retourner un message vide
    if (results.length === 0) {
      return res.status(404).json({ message: 'Aucune donnée trouvée pour cette classe, cette matière et ce semestre.' });
    }

    // Récupération du coefficient associé à la classe et à la matière
    const [[coefficient]] = await req.db.query(`
      SELECT c.valeur 
      FROM coefficient c 
      JOIN enseigner e ON e.coefficient_id = c.id 
      WHERE e.Classes_id = ? AND e.matiere_id = ?;
    `, [classeId, subjectId]);

    const coeffValue = coefficient ? coefficient.valeur : 0; // Utilisez 'valeur' au lieu de 'coefficient'

    // Calcul des moyennes et ajout au résultat
    const updatedResults = results.map(student => {
      const { inter1, inter2, inter3, inter4, Dev1, Dev2 } = student;

      // Convertir les notes en nombres
      const notes = [parseFloat(inter1), parseFloat(inter2), parseFloat(inter3), parseFloat(inter4)].filter(note => !isNaN(note));
      const moyInter = notes.length > 0 ? (notes.reduce((sum, note) => sum + note, 0) / notes.length) : 0;

      // Calculer moy en incluant Dev1 et Dev2
      const totalNotes = [moyInter, parseFloat(Dev1), parseFloat(Dev2)].filter(note => !isNaN(note));
      const moy = totalNotes.length > 0 ? (totalNotes.reduce((sum, note) => sum + note, 0) / totalNotes.length) : 0;

      // Calcul de coeff
      const coeff = moy * coeffValue;

      // Retourner l'objet mis à jour
      return {
        ...student,
        moyInter: Number(moyInter.toFixed(2)), // Arrondir à 2 décimales
        moy: Number(moy.toFixed(2)),           // Arrondir à 2 décimales
        coeff: Number(coeff.toFixed(2)),       // Arrondir à 2 décimales
      };
    });

    // Retourner les résultats mis à jour au client
    res.json(updatedResults);
  } catch (error) {
    console.error('Erreur lors de la récupération des notes', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// code pour supprimer une ou plusieur note
router.post('/deleteNote', authenticateJWT, async (req, res) => {
  const { eleveId, semestreId, anneeScolaireId, classeId, etablissementId, noteType } = req.body;

  console.log('📤 Requête reçue pour suppression de note :', req.body);

  if (!eleveId || !semestreId || !anneeScolaireId || !classeId || !etablissementId || !noteType) {
      console.error('❌ Données manquantes:', { eleveId, semestreId, anneeScolaireId, classeId, etablissementId, noteType });
      return res.status(400).json({ message: 'Données manquantes pour la suppression de la note.' });
  }

  // Liste blanche des colonnes autorisées : noteType vient du client et ne doit
  // jamais être interpolé tel quel dans le SQL (risque d'injection).
  const allowedNoteColumns = new Set(['inter1', 'inter2', 'inter3', 'inter4', 'TP1', 'TP2', 'Dev1', 'Dev2']);
  if (!allowedNoteColumns.has(noteType)) {
      return res.status(400).json({ message: 'Type de note invalide.' });
  }

  try {
      const deleteQuery = `
          UPDATE note
          SET ${noteType} = NULL
          WHERE Eleves_id = ? AND semestre_id = ? AND Annee_scolaire_id = ?
          AND classe_id = ? AND etablissement_id = ?
      `;

      console.log(`🛠 Exécution de la requête SQL : ${deleteQuery}`);
      console.log('🔹 Paramètres:', [eleveId, semestreId, anneeScolaireId, classeId, etablissementId]);

      const [deleteResult] = await db.execute(deleteQuery, [eleveId, semestreId, anneeScolaireId, classeId, etablissementId]);

      if (deleteResult.affectedRows === 0) {
          console.warn(`⚠️ Note non trouvée pour l'élève ${eleveId} (${noteType})`);
          return res.status(404).json({ message: 'Note non trouvée.' });
      }

      // 🔍 Récupérer le nom et prénom de l'élève après suppression
      const studentQuery = `SELECT nom, prenom FROM eleve WHERE id = ?`;
      const [studentResult] = await db.execute(studentQuery, [eleveId]);

      if (studentResult.length === 0) {
          console.warn(`⚠️ Élève non trouvé avec l'ID ${eleveId}`);
          return res.status(404).json({ message: 'Note supprimée, mais élève non trouvé.' });
      }

      const { nom, prenom } = studentResult[0];
      console.log(`✅ Note "${noteType}" supprimée avec succès pour ${prenom} ${nom}`);

      return res.status(200).json({
          message: `Note supprimée avec succès pour ${prenom} ${nom}.`,
          nom, 
          prenom // 🔹 Envoi du nom et prénom à l'interface
      });
  } catch (error) {
      console.error('❌ Erreur lors de la suppression de la note:', error);
      return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Fonction pour sauvegarder les notes dans la table `Note`
router.post('/notes/save', authenticateJWT, async (req, res) => {
  const { classeId, subjectId, semesterId, notes, etablissementId, anneeScolaireId } = req.body;

  // Valider que les données nécessaires sont présentes
  if (!classeId || !subjectId || !semesterId || !notes || !etablissementId || !Array.isArray(notes) || !anneeScolaireId) {
    return res.status(400).json({ message: 'Données manquantes ou invalides' });
  }

  let connection;
  try {
    connection = await req.db.getConnection(); // Récupérer une connexion à partir du pool

    // Boucle à travers chaque note et effectue la mise à jour
    for (const studentNote of notes) {
      const { nom, prenom, MoyI, Moy, Moycoef } = studentNote;

      // Récupérer l'`eleveId` en fonction du nom et prénom
      const [rows] = await connection.query(`
        SELECT id FROM eleve
        WHERE nom = ? AND prenom = ? AND classe_id = ?
      `, [nom, prenom, classeId]);

      if (rows.length === 0) {
        // Si aucun élève ne correspond, ignorer cette note
        console.warn(`Élève non trouvé: ${nom} ${prenom}`);
        continue;
      }

      const eleveId = rows[0].id;

      // Requête SQL pour mettre à jour les notes dans la base de données
      await connection.query(`
        UPDATE note
        SET moyInter = ?, moy = ?, moycoef = ?
        WHERE Eleves_id = ? AND classe_id = ? AND matieres_id = ? AND Semestre_id = ? AND etablissement_id = ? AND Annee_scolaire_id = ?
      `, [MoyI, Moy, Moycoef, eleveId, classeId, subjectId, semesterId, etablissementId, anneeScolaireId]);
    }

    res.status(200).json({ message: 'Notes sauvegardées avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des notes :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la sauvegarde des notes' });
  } finally {
    if (connection) connection.release();
  }
});

  router.delete("/delete-note", async (req, res) => {
    const { eleveId, matiereId, semestreId, noteType } = req.body;
  
    if (!eleveId || !matiereId || !semestreId || !noteType) {
      return res.status(400).json({
        message: "Les informations nécessaires pour supprimer la note sont manquantes.",
      });
    }
  
    try {
      await req.db.query(
        `UPDATE note
         SET ?? = NULL
         WHERE Eleves_id = ? AND matieres_id = ? AND semestre_id = ?`,
        [noteType, eleveId, matiereId, semestreId]
      );
  
      res.json({ message: "Note supprimée avec succès." });
    } catch (error) {
      console.error("Erreur lors de la suppression de la note :", error);
      res.status(500).json({ message: "Erreur serveur lors de la suppression de la note." });
    }
  });

// Endpoint pour récupérer les semestres et les notes d'un élève en une seule requête
router.get('/eleve-notes', authenticateJWT, async (req, res) => {
  const { childId, anneeScolaireId } = req.query;

  if (!childId) {
    return res.status(400).json({ error: 'childId est requis.' });
  }

  if (!(await getEleveDuParentOr403(req, res, childId))) return;

  if (!anneeScolaireId) {
    return res.json({});
  }

  try {
    const [rows] = await db.query(
      `SELECT 
        semestre.id AS semestreId,
        semestre.nom AS semestreNom,
        matieres.nom AS matiereNom,
        note.inter1,
        note.inter2,
        note.inter3,
        note.inter4,
        note.moyInter,
        note.Dev1,
        note.Dev2,
        note.moy,
        note.moycoef
      FROM note
      INNER JOIN matieres ON note.matieres_id = matieres.id
      INNER JOIN semestre ON note.Semestre_id = semestre.id
      WHERE note.eleves_id = ? AND note.Annee_scolaire_id = ?
      ORDER BY semestre.id ASC, matieres.nom ASC`,
      [childId, anneeScolaireId]
    );

    // Structurer les données pour correspondre à fetchNotes
    const processedData = {};
    
    rows.forEach(row => {
      if (!processedData[row.semestreId]) {
        processedData[row.semestreId] = {
          semestre: row.semestreNom,
          notes: {}
        };
      }
      
      if (!processedData[row.semestreId].notes[row.matiereNom]) {
        processedData[row.semestreId].notes[row.matiereNom] = {
          matiere: row.matiereNom,
          inter1: row.inter1,
          inter2: row.inter2,
          inter3: row.inter3,
          inter4: row.inter4,
          moyInter: row.moyInter,
          dev1: row.Dev1,
          dev2: row.Dev2,
          moy: row.moy,
          moycoef: row.moycoef,
        };
      } else {
        const note = processedData[row.semestreId].notes[row.matiereNom];
        note.inter1 = note.inter1 || row.inter1;
        note.inter2 = note.inter2 || row.inter2;
        note.inter3 = note.inter3 || row.inter3;
        note.inter4 = note.inter4 || row.inter4;
        note.moyInter = note.moyInter || row.moyInter;
        note.dev1 = note.dev1 || row.Dev1;
        note.dev2 = note.dev2 || row.Dev2;
        note.moy = note.moy || row.moy;
        note.moycoef = note.moycoef || row.moycoef;
      }
    });

    // Convertir les objets de notes en tableau
    Object.keys(processedData).forEach(semestreId => {
      processedData[semestreId].notes = Object.values(processedData[semestreId].notes);
    });

    res.json(processedData);
  } catch (error) {
    console.error('Erreur lors de la récupération des notes et des semestres:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des notes et des semestres.' });
  }
});

module.exports = router;
