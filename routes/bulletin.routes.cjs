// =====================================================================
//  Bulletins scolaires
//  Monté dans server.cjs avec : app.use('/api', require('./routes/bulletin.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, getEleveDuParentOr403 } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');

  router.get('/bulletin', async (req, res) => {
    const { classeId, etablissementId, anneeScolaireId } = req.query;
    console.log("Requête reçue avec params:", { classeId, etablissementId, anneeScolaireId });

    try {
        const [results] = await req.db.query(
            `SELECT e.id AS eleve_id, e.nom AS eleve_nom, e.prenom AS eleve_prenom,
                    c.nom AS classe_nom, m.id AS matiere_id, m.nom AS matiere_nom,
                    s.id AS semestre_id, s.nom AS semestre_nom, n.moy, n.moycoef,
                    COALESCE(MAX(p.total_hours), 0) AS total_hours
             FROM eleve e 
             JOIN note n ON e.id = n.Eleves_id 
             JOIN matieres m ON m.id = n.matieres_id 
             JOIN semestre s ON s.id = n.semestre_id 
             JOIN classes c ON c.id = n.classe_id 
             LEFT JOIN punitions p ON e.id = p.eleve_id AND s.id = p.semestre_id
             WHERE n.classe_id = ? AND n.Annee_scolaire_id = ?
             GROUP BY e.id, m.id, s.id`,
            [classeId, anneeScolaireId]
        );

        if (results.length === 0) {
            return res.json({ semestres: [], matieres: [], notes: {}, classeNom: null, message: "Aucune note trouvée pour cette classe." });
        }

        const [semestresList] = await req.db.query(
            `SELECT id, nom FROM semestre WHERE etablissement_id = ? ORDER BY id ASC`,
            [etablissementId]
        );

        const [conduiteClasse] = await req.db.query(
            `SELECT note_conduite FROM conduite WHERE classe_id = ? AND Annee_scolaire_id = ?`,
            [classeId, anneeScolaireId]
        );
        const noteConduite = conduiteClasse.length > 0 ? Number(conduiteClasse[0].note_conduite) : 0;

        const dernierSemestreId = semestresList.length > 0 ? semestresList.at(-1).id : null;
        const semestres = semestresList.map(s => ({ id: s.id, nom: s.nom }));
        const matieres = [];
        let notes = {};
        const classeNom = results[0]?.classe_nom || null;

        results.forEach(row => {
            if (!matieres.some(mat => mat.id === row.matiere_id)) {
                matieres.push({ id: row.matiere_id, nom: row.matiere_nom });
            }
            if (!notes[row.semestre_id]) notes[row.semestre_id] = {};
            if (!notes[row.semestre_id][row.eleve_id]) {
                notes[row.semestre_id][row.eleve_id] = {
                    eleveId: row.eleve_id,
                    nom: row.eleve_nom,
                    prenom: row.eleve_prenom,
                    moyennes: [],
                    total_hours: row.total_hours || 0,
                    conduite: noteConduite - (row.total_hours / 2),
                    moyenne_semestrielle: null,
                    moyenne_annuelle: null,
                    rang: null,
                    mention: null,
                    decision: null
                };
            }
            notes[row.semestre_id][row.eleve_id].moyennes.push({
                matiereId: row.matiere_id,
                moy: row.moy ? Number(row.moy) : null,
                moycoef: row.moycoef ? Number(row.moycoef) : null,
                coefficient: null
            });
        });

        const [coefficients] = await req.db.query(
            `SELECT en.matiere_id, c.valeur AS coefficient 
             FROM coefficient c
             JOIN enseigner en ON en.coefficient_id = c.id
             WHERE en.Classes_id = ?`,
            [classeId]
        );

        coefficients.forEach(coef => {
            Object.values(notes).flatMap(semestre => Object.values(semestre)).forEach(eleve => {
                eleve.moyennes.forEach(note => {
                    if (note.matiereId === coef.matiere_id) {
                        note.coefficient = Number(coef.coefficient);
                    }
                });
            });
        });

        // === Ajouter "matière" Conduite dans la liste des matières ===
        const matiereConduite = { id: 'conduite', nom: 'Conduite' };
        matieres.push(matiereConduite);

        // === Calcul des moyennes semestrielles + mention ===
        Object.values(notes).forEach(semestre => {
            Object.values(semestre).forEach(eleve => {
                // Ajouter la conduite comme matière avec coefficient 1
                eleve.moyennes.push({
                    matiereId: 'conduite',
                    moy: Number(eleve.conduite),
                    coefficient: 1,
                    moycoef: Number(eleve.conduite)* 1,
                });

                let sommeMoyCoef = 0, sommeCoef = 0;
                eleve.moyennes.forEach(note => {
                    if (note.moy !== null && note.coefficient !== null) {
                        sommeMoyCoef += note.moy * note.coefficient;
                        sommeCoef += note.coefficient;
                    }
                });

                eleve.moyenne_semestrielle = sommeCoef ? (sommeMoyCoef / sommeCoef).toFixed(2) : null;

                const moyenne = Number(eleve.moyenne_semestrielle);
                if (moyenne >= 16) eleve.mention = "Très Bien";
                else if (moyenne >= 14) eleve.mention = "Bien";
                else if (moyenne >= 12) eleve.mention = "Assez Bien";
                else if (moyenne >= 10) eleve.mention = "Passable";
                else eleve.mention = "Insuffisant";
            });
        });

        // === Calcul des rangs ===
        Object.entries(notes).forEach(([semestreId, elevesMap]) => {
            const elevesArray = Object.values(elevesMap).filter(e => e.moyenne_semestrielle !== null);
            elevesArray.sort((a, b) => b.moyenne_semestrielle - a.moyenne_semestrielle);
            elevesArray.forEach((eleve, index) => {
                eleve.rang = index + 1;
            });
        });

        // === Calcul des moyennes annuelles (uniquement dernier semestre) ===
        const elevesAnnuel = {};
        semestres.forEach(sem => {
            const semId = sem.id;
            const eleves = notes[semId];
            if (!eleves) return;
            Object.values(eleves).forEach(eleve => {
                if (!elevesAnnuel[eleve.eleveId]) {
                    elevesAnnuel[eleve.eleveId] = {
                        total: 0,
                        compte: 0,
                        moyenneDernier: null
                    };
                }
                const moyenneSem = parseFloat(eleve.moyenne_semestrielle);
                if (!isNaN(moyenneSem)) {
                    if (Number(semId) === Number(dernierSemestreId)) {
                        elevesAnnuel[eleve.eleveId].moyenneDernier = moyenneSem;
                    } else {
                        elevesAnnuel[eleve.eleveId].total += moyenneSem;
                        elevesAnnuel[eleve.eleveId].compte++;
                    }
                }
            });
        });

        const elevesDernierSemestre = notes[dernierSemestreId] || {};
        Object.values(elevesDernierSemestre).forEach(eleve => {
            const stats = elevesAnnuel[eleve.eleveId];
            if (stats && stats.moyenneDernier !== null) {
                const total = stats.total + (stats.moyenneDernier * 2);
                const diviseur = stats.compte + 2;
                const moyenneAnnuelle = total / diviseur;
                eleve.moyenne_annuelle = moyenneAnnuelle.toFixed(2);
                eleve.decision = moyenneAnnuelle >= 10 ? "Admis" : "Refusé";
            }
        });

        // === Valeurs nulles pour moyenne_annuelle et decision dans les autres semestres ===
        Object.entries(notes).forEach(([semestreId, elevesMap]) => {
            if (Number(semestreId) !== Number(dernierSemestreId)) {
                Object.values(elevesMap).forEach(eleve => {
                    eleve.moyenne_annuelle = null;
                    eleve.decision = null;
                });
            }
        });

        res.json({ semestres, matieres, notes, classeNom });

    } catch (error) {
        console.error("Erreur serveur:", error);
        res.status(500).json({ message: "Erreur serveur lors du traitement des bulletins." });
    }
});

router.post('/sauvegarde-bulletin', authenticateJWT, async (req, res) => {
  const {
    eleveId,
    classeId,
    etablissementId,
    anneeScolaireId,
    semestreId,
    notes,
    moyenneSemestrielle,
    moyenneAnnuelle,
    rang,
    mention,
    decision,
    conduite
  } = req.body;

  if (Number(etablissementId) !== Number(req.user.etablissementId)) {
    return res.status(403).json({ message: "Vous n'avez pas accès à cet établissement." });
  }

  let connection;
  try {
    connection = await db.getConnection();
    console.log('🔍 Début de la vérification des matières avec moyenne...');

    // Étape 1 : Récupération des matières enseignées
    const [enseignements] = await connection.query(
      `SELECT DISTINCT matiere_id FROM enseigner 
       WHERE Classes_id = ? AND etablissement_id = ?`,
      [classeId, etablissementId]
    );

    console.log('✅ Matières enseignées récupérées :', enseignements);

    const matieresRequises = enseignements.map(e => e.matiere_id);
    console.log('📚 Matières requises pour la classe :', matieresRequises);

    const matieresAvecNote = notes.map(n => n.matiereId).filter(id => id && id !== 'conduite');
    console.log('📝 Matières avec note fournie :', matieresAvecNote);

    const matieresManquantes = matieresRequises.filter(
      id => !matieresAvecNote.includes(id)
    );
    console.log('❗ Matières manquantes (sans moyenne) :', matieresManquantes);

    // 🚨 Si matières manquantes, récupérer leurs noms depuis la table Matieres
    if (matieresManquantes.length > 0) {
      const [matieresInfos] = await connection.query(
        `SELECT id, nom FROM matieres WHERE id IN (?)`,
        [matieresManquantes]
      );

      console.log('📛 Noms des matières manquantes :', matieresInfos);

      return res.status(400).json({
        error: "Impossible de sauvegarder le bulletin : certaines matières de la classe n'ont pas encore de moyenne calculée.",
        matieresManquantes: matieresInfos // tableau [{id, nom}]
      });
    }

    // Vérification de la conduite
    if (conduite === null || conduite === undefined) {
      console.log('❌ Note de conduite manquante. Bulletin non sauvegardé.');
      return res.status(400).json({
        error: "Impossible de sauvegarder le bulletin : la note de conduite n'a pas encore été attribuée pour ce semestre à cette classe."
      });
    }

    console.log('✅ Toutes les vérifications sont passées. Début de la transaction...');

    await connection.beginTransaction();

    // Suppression des anciennes données du bulletin
    console.log('🧹 Suppression des anciennes données du bulletin...');
    await connection.query(
      `DELETE FROM bulletin 
       WHERE eleve_id = ? AND semestre_id = ? AND etablissement_id = ? AND Annee_scolaire_id = ?`,
      [eleveId, semestreId, etablissementId, anneeScolaireId]
    );
    console.log('🗑️ Anciennes données supprimées.');

    // Insertion des nouvelles données
    console.log('📥 Insertion des nouvelles notes dans le bulletin...');
    for (const note of notes) {
      const { matiereId, coefficient, moy, moycoef } = note;

      if (!matiereId || matiereId === 'conduite') continue;

      console.log(`➡️ Insertion de la note pour la matière ${matiereId} : moy = ${moy}, coef = ${coefficient}`);

      await connection.query(
        `INSERT INTO bulletin (
            eleve_id, semestre_id, matiere_id, coef_id, moy, moycoef, 
            moySem, rang, mention, etablissement_id, moyAn, decision, Annee_scolaire_id, conduite
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eleveId,
          semestreId,
          matiereId,
          coefficient,
          moy,
          moycoef,
          moyenneSemestrielle,
          rang,
          mention,
          etablissementId,
          moyenneAnnuelle,
          decision,
          anneeScolaireId,
          conduite
        ]
      );
    }

    await connection.commit();
    console.log('✅ Bulletin sauvegardé avec succès !');
    res.status(200).json({ message: 'Bulletin sauvegardé avec succès.' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('🔥 Erreur lors de la sauvegarde du bulletin :', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde du bulletin.' });
  } finally {
    if (connection) connection.release();
    console.log('🔚 Connexion à la base de données libérée.');
  }
});

// API pour récupérer les bulletins, semestres, matières, coefficients et informations d'un élève
// API pour récupérer les bulletins, semestres, matières, coefficients et informations d'un élève
router.get('/bulletined/:childId/:anneeScolaireId', authenticateJWT, async (req, res) => {
  const { childId, anneeScolaireId } = req.params;

  // Vérifier si childId est fourni
  if (!childId) {
    return res.status(400).json({ error: "childId est requis" });
  }

  if (!(await getEleveDuParentOr403(req, res, childId))) return;

  // Si anneeScolaireId n'est pas défini, retourner un tableau vide
  if (!anneeScolaireId) {
    return res.json([]);
  }

  try {
    // La table bulletin ne stocke pas la classe de l'élève au moment de l'édition.
    // On la retrouve via la table note (qui, elle, garde classe_id par élève/semestre/
    // année) pour éviter d'afficher la classe ACTUELLE de l'élève sur un bulletin
    // d'une année antérieure. Repli sur la classe courante si aucune note historique
    // ne correspond (cas résiduel, ex. bulletin saisi sans passer par la saisie de notes).
    const [results] = await req.db.query(`
      SELECT
        e.nom AS eleveNom,
        e.prenom AS elevePrenom,
        COALESCE(hc.nom, cLive.nom) AS classeNom,
        s.id AS semestre_id,
        s.nom AS semestreNom,
        m.nom AS matiereNom,
        coef.valeur AS coef,
        b.moy,
        b.moycoef,
        b.moySem,
        b.moyAn,
        b.rang,
        b.mention,
        b.conduite,
        b.decision
      FROM bulletin b
      JOIN eleve e ON e.id = b.eleve_id
      JOIN semestre s ON s.id = b.semestre_id
      JOIN matieres m ON m.id = b.matiere_id
      JOIN coefficient coef ON coef.id = b.coef_id
      LEFT JOIN (
        SELECT Eleves_id, Semestre_id, Annee_scolaire_id, MAX(classe_id) AS classe_id
        FROM note
        GROUP BY Eleves_id, Semestre_id, Annee_scolaire_id
      ) hn ON hn.Eleves_id = b.eleve_id AND hn.Semestre_id = b.semestre_id AND hn.Annee_scolaire_id = b.Annee_scolaire_id
      LEFT JOIN classes hc ON hc.id = hn.classe_id
      LEFT JOIN classes cLive ON cLive.id = e.classe_id
      WHERE b.eleve_id = ? AND b.Annee_scolaire_id = ?
      ORDER BY s.nom, m.nom
    `, [childId, anneeScolaireId]);

    // Si aucune donnée n'est trouvée, renvoyer un tableau vide
    if (results.length === 0) {
      return res.json([]);
    }

    const semestres = {};
    const bulletins = [];

    // Regrouper les données par semestre
    results.forEach(row => {
      const { semestre_id, semestreNom, matiereNom, coef, moy, moycoef, moySem, moyAn, rang, mention, conduite, decision } = row;

      if (!semestres[semestre_id]) {
        semestres[semestre_id] = {
          semestre_id,
          nom: semestreNom,
          bulletins: [],
          moySem,
          moyAn,
          rang,
          mention,
          conduite,
          decision
        };
      }

      semestres[semestre_id].bulletins.push({
        matiere: matiereNom,
        coef,
        moy,
        moycoef
      });
    });

    // Transformer l'objet en tableau
    Object.values(semestres).forEach(semestre => {
      bulletins.push(semestre);
    });

    res.json({
      eleveNom: results[0].eleveNom,
      elevePrenom: results[0].elevePrenom,
      classeNom: results[0].classeNom,
      semestres: bulletins,
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des données.' });
  }
});

module.exports = router;
