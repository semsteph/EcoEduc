// =====================================================================
//  Élèves : CRUD, réinscription, migration, import Excel
//  Monté dans server.cjs avec : app.use('/api', require('./routes/eleves.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT } = require('../server-lib/auth.cjs');
const { upload } = require('../server-lib/upload.cjs');
const db = require('../server-lib/db.cjs');
const XLSX = require('xlsx');
const dayjs = require('dayjs');
const fs = require('fs');
const { fetchClotureParams } = require('../server-lib/clotureParams.cjs');

// Route pour le traitement du fichier Excel d'inscription multiple
// a parti de l fonction normalizeDate jusqu'au  post
// Fonction pour normaliser les dates au format YYYY-MM-DD
function normalizeDate(input) {
  if (!input) return null;

  // Si c’est déjà un objet Date
  if (input instanceof Date) {
    return dayjs(input).format('YYYY-MM-DD');
  }

  const formats = ['DD-MM-YYYY', 'D-M-YYYY', 'DD/MM/YYYY', 'D/M/YYYY', 'YYYY-MM-DD'];

  for (const fmt of formats) {
    const parsed = dayjs(input, fmt, true);
    if (parsed.isValid()) {
      return parsed.format('YYYY-MM-DD');
    }
  }

  // Dernier recours
  const fallback = dayjs(new Date(input));
  return fallback.isValid() ? fallback.format('YYYY-MM-DD') : null;
}

// Fonction pour rendre la date compréhensible pour MySQL (YYYY-MM-DD)
function normalizeDate(dateInput) {
  if (!dateInput) return null;

  // Cas 1 : Date au format nombre (Excel Serial Date)
  if (typeof dateInput === 'number') {
    const date = new Date(Math.round((dateInput - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }

  // Cas 2 : Chaîne de caractères (ex: "12/10/2011" ou "12-10-2011")
  const strDate = String(dateInput).trim();
  const parts = strDate.split(/[/ -]/);

  if (parts.length === 3) {
    // Format DD/MM/YYYY -> YYYY-MM-DD
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    // Format YYYY/MM/DD
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }

  return strDate; // Retourne tel quel si déjà correct
}

router.post('/eleves', authenticateJWT, async (req, res) => {
  const { etablissement_id, annee_scolaire_id } = req.body;

  if (!etablissement_id || !annee_scolaire_id) {
    return res.status(400).json({ error: "Champs manquants." });
  }

  try {
    const [rows] = await db.execute(
      `SELECT
         e.id, e.nom, e.prenom, e.date_naissance, e.sexe, e.classe_id, c.nom AS classe_nom, e.Parents_id AS parent_id
       FROM
         eleve e
       JOIN
         classes c ON e.classe_id = c.id
       WHERE
         e.etablissement_id = ? AND e.Annee_scolaire_id = ? AND e.statut = 'actif'`,
      [etablissement_id, annee_scolaire_id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des élèves :", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post('/eleves/reinscription', authenticateJWT, async (req, res) => {
  const { eleveIds, anneeScolaireId } = req.body;

  if (!Array.isArray(eleveIds) || eleveIds.length === 0 || !anneeScolaireId) {
    return res.status(400).json({ message: 'Données manquantes' });
  }

  const etablissementId = req.user.etablissementId;
  if (!etablissementId) {
    return res.status(403).json({ message: 'Accès non autorisé.' });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [anneeRows] = await connection.query(
      'SELECT id FROM annee_scolaire WHERE id = ? AND etablissement_id = ?',
      [anneeScolaireId, etablissementId]
    );
    if (anneeRows.length === 0) {
      await connection.rollback();
      return res.status(403).json({ message: "Cette année scolaire n'appartient pas à votre établissement." });
    }

    const idsUniques = [...new Set(eleveIds.map((id) => Number(id)).filter(Boolean))];
    if (idsUniques.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Identifiants élèves invalides.' });
    }

    const placeholders = idsUniques.map(() => '?').join(', ');
    const [elevesRows] = await connection.query(
      `SELECT id FROM eleve WHERE id IN (${placeholders}) AND etablissement_id = ?`,
      [...idsUniques, etablissementId]
    );
    if (elevesRows.length !== idsUniques.length) {
      await connection.rollback();
      return res.status(403).json({ message: "Certains élèves n'appartiennent pas à votre établissement." });
    }

    await connection.query(
      `UPDATE eleve SET Annee_scolaire_id = ? WHERE id IN (${placeholders})`,
      [anneeScolaireId, ...idsUniques]
    );

    await connection.commit();
    res.json({ message: 'Réinscription réussie' });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Erreur rollback réinscription :', rollbackError);
      }
    }
    console.error('Erreur API réinscription:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    if (connection) connection.release();
  }
});

// Marquer des élèves comme partis (non réinscrits) : les retire des listes de classe
// actives sans effacer leur historique, contrairement à une suppression.
router.post('/eleves/marquer-parti', authenticateJWT, async (req, res) => {
  const { eleveIds } = req.body;
  const etablissementId = req.user.etablissementId;

  if (!etablissementId) {
    return res.status(403).json({ message: 'Accès non autorisé.' });
  }
  if (!Array.isArray(eleveIds) || eleveIds.length === 0) {
    return res.status(400).json({ message: 'Aucun élève sélectionné.' });
  }

  const idsUniques = [...new Set(eleveIds.map((id) => Number(id)).filter(Boolean))];
  if (idsUniques.length === 0) {
    return res.status(400).json({ message: 'Identifiants élèves invalides.' });
  }

  let connection;
  try {
    connection = await db.getConnection();

    const placeholders = idsUniques.map(() => '?').join(', ');
    const [elevesRows] = await connection.query(
      `SELECT id FROM eleve WHERE id IN (${placeholders}) AND etablissement_id = ?`,
      [...idsUniques, etablissementId]
    );
    if (elevesRows.length !== idsUniques.length) {
      return res.status(403).json({ message: "Certains élèves n'appartiennent pas à votre établissement." });
    }

    await connection.query(
      `UPDATE eleve SET statut = 'parti', date_depart = CURDATE() WHERE id IN (${placeholders})`,
      idsUniques
    );

    res.json({ message: `${idsUniques.length} élève(s) marqué(s) comme parti(s).` });
  } catch (error) {
    console.error('Erreur lors du marquage des élèves partis:', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  } finally {
    if (connection) connection.release();
  }
});

// Annule un marquage "parti" fait par erreur (remet l'élève actif).
router.post('/eleves/annuler-depart', authenticateJWT, async (req, res) => {
  const { eleveIds } = req.body;
  const etablissementId = req.user.etablissementId;

  if (!etablissementId) {
    return res.status(403).json({ message: 'Accès non autorisé.' });
  }
  if (!Array.isArray(eleveIds) || eleveIds.length === 0) {
    return res.status(400).json({ message: 'Aucun élève sélectionné.' });
  }

  const idsUniques = [...new Set(eleveIds.map((id) => Number(id)).filter(Boolean))];
  if (idsUniques.length === 0) {
    return res.status(400).json({ message: 'Identifiants élèves invalides.' });
  }

  let connection;
  try {
    connection = await db.getConnection();

    const placeholders = idsUniques.map(() => '?').join(', ');
    const [elevesRows] = await connection.query(
      `SELECT id FROM eleve WHERE id IN (${placeholders}) AND etablissement_id = ?`,
      [...idsUniques, etablissementId]
    );
    if (elevesRows.length !== idsUniques.length) {
      return res.status(403).json({ message: "Certains élèves n'appartiennent pas à votre établissement." });
    }

    await connection.query(
      `UPDATE eleve SET statut = 'actif', date_depart = NULL WHERE id IN (${placeholders})`,
      idsUniques
    );

    res.json({ message: `${idsUniques.length} élève(s) remis en statut actif.` });
  } catch (error) {
    console.error("Erreur lors de l'annulation du départ :", error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/import-eleves', authenticateJWT, upload.single('file'), async (req, res) => {
  const file = req.file;
  const { classeId, etablissementId, anneeScolaireId } = req.body;

  if (!file) return res.status(400).json({ message: 'Aucun fichier reçu.' });

  try {
    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // On commence à lire les données après l'entête
    let data = XLSX.utils.sheet_to_json(worksheet, { range: 1 });

    // ON IGNORE L'EXEMPLE (La première ligne de données)
    if (data.length > 0) data.shift();

    if (data.length === 0) {
      return res.status(400).json({ message: "Le fichier est vide ou ne contient que l'exemple." });
    }

    const connection = await db.getConnection();

    let insertsReussis = 0;
    const erreurs = [];

    try {
    const params = await fetchClotureParams(connection, etablissementId);
    const [effectifRows] = await connection.query(
      'SELECT COUNT(*) AS total FROM eleve WHERE classe_id = ?',
      [classeId]
    );
    const effectifInitial = effectifRows[0].total;
    let effectifCourant = effectifInitial;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        const eleveNom = row['Nom Élève']?.toString().trim();
        const elevePrenom = row['Prénom Élève']?.toString().trim();
        const parentEmail = row['Email Parent']?.toString().trim().toLowerCase();
        const dateNaissance = normalizeDate(row['Date de naissance']);

        // VERIFICATION CRITIQUE
        if (!eleveNom || !elevePrenom || !dateNaissance || !parentEmail) {
          throw new Error(`Données manquantes à la ligne ${i + 3}`);
        }

        if (effectifCourant >= params.effectifMaxParClasse) {
          throw new Error(`Effectif maximum atteint pour cette classe (${params.effectifMaxParClasse}) : élève non inscrit.`);
        }

        // GESTION PARENT
        const [existingParent] = await connection.query(
          'SELECT id FROM parents WHERE email = ? AND etablissement_id = ?',
          [parentEmail, etablissementId]
        );

        let parentId;

        if (existingParent.length > 0) {
          parentId = existingParent[0].id;
        } else {
          // ✅ Demande: mot_de_passe et nom_utilisateur doivent être NULL à la création
          const [parentInsert] = await connection.query(
            `INSERT INTO parents 
              (nom, prenom, contact, email, mot_de_passe, nom_utilisateur, etablissement_id, Annee_scolaire_id) 
             VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)`,
            [
              row['Nom Parent'] ?? null,
              row['Prénom Parent'] ?? null,
              row['Téléphone'] ?? null,
              parentEmail,
              etablissementId,
              anneeScolaireId
            ]
          );

          parentId = parentInsert.insertId;
        }

        // INSCRIPTION ELEVE
        const matricule = `E-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await connection.query(
          `INSERT INTO eleve 
            (matricule, nom, prenom, date_naissance, classe_id, Parents_id, sexe, etablissement_id, Annee_scolaire_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            matricule,
            eleveNom,
            elevePrenom,
            dateNaissance,
            classeId,
            parentId,
            row['Sexe'] ?? null,
            etablissementId,
            anneeScolaireId
          ]
        );

        insertsReussis++;
        effectifCourant++;
      } catch (innerError) {
        console.error(`Erreur ligne ${i + 3}:`, innerError.message);
        erreurs.push({ ligne: i + 3, error: innerError.message });
      }
    }

    // Nettoyage du fichier uploadé
    fs.unlinkSync(file.path);

    const rapport = {
      totalLignes: data.length,
      insertionsReussies: insertsReussis,
      nombreErreurs: erreurs.length,
      effectifClasseAvant: effectifInitial,
      effectifClasseApres: effectifCourant,
      effectifMaxParClasse: params.effectifMaxParClasse,
      erreurs
    };

    // Si aucun élève n'a été inséré, on renvoie une erreur 422
    if (insertsReussis === 0) {
      return res.status(422).json({
        message: "L'importation a échoué pour toutes les lignes.",
        details: erreurs,
        rapport
      });
    }

    return res.status(200).json({
      message: `Importation terminée : ${insertsReussis}/${data.length} élève(s) inscrit(s).`,
      alertes: erreurs.length > 0 ? erreurs : null,
      rapport
    });
    } finally {
      connection.release();
    }

  } catch (globalError) {
    console.error("Erreur Import Globale:", globalError);

    // Essayer de supprimer le fichier même en cas d'erreur globale
    try {
      if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (e) {
      console.error("Erreur suppression fichier:", e.message);
    }

    return res.status(500).json({ message: "Erreur technique lors de la lecture du fichier." });
  }
});

// Route pour récupérer les détails d'un élève et le nom de sa classe par ID
router.get('/students/:eleveId', authenticateJWT, async (req, res) => {
  const { eleveId } = req.params;  // Récupérer l'ID de l'élève à partir des paramètres de la requête
  try {
    // Requête SQL avec jointure entre les tables Eleve et Classes
    const [rows] = await req.db.query(`
      SELECT 
        e.id AS eleveId, 
        e.nom AS eleveNom, 
        e.prenom AS elevePrenom, 
        c.nom AS classeNom 
      FROM eleve e 
      JOIN classes c ON e.classe_id = c.id
      WHERE e.id = ?
    `, [eleveId]);

    if (rows.length > 0) {
      res.json(rows[0]); // Renvoyer l'élève avec les infos de la classe
    } else {
      res.status(404).send('Élève non trouvé');
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'élève et de sa classe :', error);
    res.status(500).send('Erreur serveur');
  }
});

//pour presence,punition dans gestion eleve page administration
router.get('/eleves/:classId/:anneeScolaireId', async (req, res) => {
  const { classId, anneeScolaireId } = req.params;

  // Log des paramètres reçus
  console.log('Requête API /api/eleves/:classId/:anneeScolaireId');
  console.log('Param classId :', classId);
  console.log('Param anneeScolaireId :', anneeScolaireId);

  // Vérifie la présence des deux paramètres
  if (!classId || !anneeScolaireId) {
    console.warn('Paramètre manquant dans la requête');
    return res.status(400).send('Class ID and School Year ID are required');
  }

  const sql = `
    SELECT id, nom, prenom 
    FROM eleve 
    WHERE classe_id = ? AND Annee_scolaire_id = ?
  `;

  try {
    const [results] = await req.db.query(sql, [classId, anneeScolaireId]);
    console.log(`Résultats pour classe_id=${classId}, annee_scolaire_id=${anneeScolaireId} :`, results);
    res.json(results);
  } catch (err) {
    console.error('Erreur lors de l’exécution de la requête SQL :', err);
    res.status(500).send('Internal Server Error');
  }
});

//api a revoir particulierement
router.get('/eleves/:studentId', authenticateJWT, async (req, res) => {
  const studentId = parseInt(req.params.studentId);
  try {
    const [rows] = await req.db.query('SELECT * FROM eleve WHERE id = ?', [studentId]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).send('Élève non trouvé');
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des informations de l\'élève:', err);
    res.status(500).send('Erreur interne du serveur');
  }
});

/////////////////////////////Migration manulle  des eleves pour une crasse superieure dans reinscription 
router.post('/eleves/migrer', authenticateJWT, async (req, res) => {
  const { eleveIds, destinationClasseId } = req.body;

  console.log('[API][MIGRATION] body reçu =', req.body);

  if (!Array.isArray(eleveIds) || eleveIds.length === 0) {
    return res.status(400).json({
      message: "Aucun élève sélectionné pour la migration."
    });
  }

  if (!destinationClasseId) {
    return res.status(400).json({
      message: "La classe de destination est requise."
    });
  }

  const etablissementId = req.user.etablissementId;
  if (!etablissementId) {
    return res.status(403).json({ message: 'Accès non autorisé.' });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const idsUniques = [...new Set(eleveIds.map(id => Number(id)).filter(Boolean))];
    const classeId = Number(destinationClasseId);

    if (idsUniques.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        message: "Les identifiants des élèves sont invalides."
      });
    }

    if (!classeId) {
      await connection.rollback();
      return res.status(400).json({
        message: "L'identifiant de la classe de destination est invalide."
      });
    }

    const placeholders = idsUniques.map(() => '?').join(', ');

    const [classeRows] = await connection.query(
      'SELECT id, nom FROM classes WHERE id = ? AND etablissement_id = ? LIMIT 1',
      [classeId, etablissementId]
    );

    if (classeRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "La classe de destination est introuvable."
      });
    }

    const [elevesRows] = await connection.query(
      `SELECT id, nom, prenom, classe_id FROM eleve WHERE id IN (${placeholders}) AND etablissement_id = ?`,
      [...idsUniques, etablissementId]
    );

    if (elevesRows.length !== idsUniques.length) {
      await connection.rollback();
      return res.status(403).json({
        message: "Certains élèves sélectionnés n'appartiennent pas à votre établissement."
      });
    }

    const clotureParams = await fetchClotureParams(connection, etablissementId);
    const effectifMax = Math.max(1, Number(clotureParams.effectifMaxParClasse) || 50);

    const [effectifRows] = await connection.query(
      `SELECT COUNT(*) AS total FROM eleve WHERE classe_id = ? AND id NOT IN (${placeholders})`,
      [classeId, ...idsUniques]
    );
    const effectifActuel = Number(effectifRows[0]?.total || 0);
    const effectifFinal = effectifActuel + idsUniques.length;

    if (effectifFinal > effectifMax) {
      await connection.rollback();
      return res.status(409).json({
        message: `Cette migration porterait "${classeRows[0].nom}" à ${effectifFinal} élève(s), au-dessus de l'effectif maximum autorisé (${effectifMax}). Ajustez l'effectif dans les paramètres de clôture ou choisissez une autre classe.`,
        effectifActuel,
        effectifFinal,
        effectifMax
      });
    }

    await connection.query(
      `UPDATE eleve SET classe_id = ? WHERE id IN (${placeholders})`,
      [classeId, ...idsUniques]
    );

    await connection.commit();

    console.log('[API][MIGRATION] migration réussie vers classe =', classeRows[0]);

    return res.status(200).json({
      message: "Les élèves sélectionnés ont été migrés avec succès.",
      destinationClasse: classeRows[0],
      nombreElevesMigres: elevesRows.length
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('[API][MIGRATION] erreur rollback =', rollbackError);
      }
    }

    console.error('[API][MIGRATION] erreur =', error);
    return res.status(500).json({
      message: "Une erreur est survenue lors de la migration des élèves."
    });
  } finally {
    if (connection) connection.release();
  }
});

// Modification des informations d'un élève (nom, prénom, date de naissance, sexe, classe, parent)
router.put('/eleves/:id', authenticateJWT, async (req, res) => {
  const eleveId = Number(req.params.id);
  const { nom, prenom, dateNaissance, sexe, classeId, parentId } = req.body;
  const etablissementId = req.user.etablissementId;

  if (!etablissementId) {
    return res.status(403).json({ message: 'Accès non autorisé.' });
  }
  if (!eleveId) {
    return res.status(400).json({ message: "Identifiant de l'élève invalide." });
  }
  if (!nom || !prenom || !dateNaissance || !sexe || !classeId) {
    return res.status(400).json({ message: 'Tous les champs sont requis (nom, prénom, date de naissance, sexe, classe).' });
  }

  let connection;
  try {
    connection = await db.getConnection();

    const [eleveRows] = await connection.query(
      'SELECT id, classe_id FROM eleve WHERE id = ? AND etablissement_id = ?',
      [eleveId, etablissementId]
    );
    if (eleveRows.length === 0) {
      return res.status(404).json({ message: "Élève introuvable dans votre établissement." });
    }

    const [classeRows] = await connection.query(
      'SELECT id, nom FROM classes WHERE id = ? AND etablissement_id = ?',
      [classeId, etablissementId]
    );
    if (classeRows.length === 0) {
      return res.status(404).json({ message: "Classe introuvable dans votre établissement." });
    }

    // Contrôle d'effectif max uniquement si on déplace l'élève vers une autre classe
    if (Number(eleveRows[0].classe_id) !== Number(classeId)) {
      const params = await fetchClotureParams(connection, etablissementId);
      const [effectifRows] = await connection.query(
        'SELECT COUNT(*) AS total FROM eleve WHERE classe_id = ?',
        [classeId]
      );
      const effectifActuel = Number(effectifRows[0].total);
      if (effectifActuel >= params.effectifMaxParClasse) {
        return res.status(409).json({
          message: `Effectif maximum atteint pour "${classeRows[0].nom}" (${effectifActuel}/${params.effectifMaxParClasse}).`
        });
      }
    }

    if (parentId) {
      const [parentRows] = await connection.query(
        'SELECT id FROM parents WHERE id = ? AND etablissement_id = ?',
        [parentId, etablissementId]
      );
      if (parentRows.length === 0) {
        return res.status(404).json({ message: "Parent introuvable dans votre établissement." });
      }
    }

    await connection.query(
      `UPDATE eleve
       SET nom = ?, prenom = ?, date_naissance = ?, sexe = ?, classe_id = ?${parentId ? ', Parents_id = ?' : ''}
       WHERE id = ?`,
      parentId
        ? [nom, prenom, dateNaissance, sexe, classeId, parentId, eleveId]
        : [nom, prenom, dateNaissance, sexe, classeId, eleveId]
    );

    res.json({ message: "Élève modifié avec succès." });
  } catch (error) {
    console.error("Erreur lors de la modification de l'élève:", error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  } finally {
    if (connection) connection.release();
  }
});

// Suppression d'un élève : autorisée uniquement s'il n'a encore aucun historique
// (notes, présences, punitions, scolarité, permissions) — sinon on préserve les données
// et on redirige vers la migration pour corriger une classe erronée.
router.delete('/eleves/:id', authenticateJWT, async (req, res) => {
  const eleveId = Number(req.params.id);
  const etablissementId = req.user.etablissementId;

  if (!etablissementId) {
    return res.status(403).json({ message: 'Accès non autorisé.' });
  }
  if (!eleveId) {
    return res.status(400).json({ message: "Identifiant de l'élève invalide." });
  }

  let connection;
  try {
    connection = await db.getConnection();

    const [eleveRows] = await connection.query(
      'SELECT id, nom, prenom FROM eleve WHERE id = ? AND etablissement_id = ?',
      [eleveId, etablissementId]
    );
    if (eleveRows.length === 0) {
      return res.status(404).json({ message: "Élève introuvable dans votre établissement." });
    }

    const [[notesRow]] = await connection.query('SELECT COUNT(*) AS total FROM note WHERE Eleves_id = ?', [eleveId]);
    const [[presencesRow]] = await connection.query('SELECT COUNT(*) AS total FROM presence WHERE eleve_id = ?', [eleveId]);
    const [[punitionsRow]] = await connection.query('SELECT COUNT(*) AS total FROM punitions WHERE eleve_id = ?', [eleveId]);
    const [[scolariteRow]] = await connection.query('SELECT COUNT(*) AS total FROM scolarite WHERE eleve_id = ?', [eleveId]);
    const [[permissionsRow]] = await connection.query('SELECT COUNT(*) AS total FROM permission WHERE eleve_id = ?', [eleveId]);

    const historique = {
      notes: notesRow.total,
      presences: presencesRow.total,
      punitions: punitionsRow.total,
      scolarite: scolariteRow.total,
      permissions: permissionsRow.total
    };

    if (Object.values(historique).some(total => total > 0)) {
      return res.status(409).json({
        message: "Impossible de supprimer cet élève : des données lui sont déjà associées (notes, présences, punitions, scolarité ou permissions de sortie). Utilisez la migration pour corriger sa classe si besoin.",
        historique
      });
    }

    await connection.query('DELETE FROM eleve WHERE id = ?', [eleveId]);

    res.json({ message: `${eleveRows[0].nom} ${eleveRows[0].prenom} a été supprimé avec succès.` });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'élève:", error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  } finally {
    if (connection) connection.release();
  }
});

//api pour notification administration dashbord
router.get('/eleve/:studentId', authenticateJWT, async (req, res) => {
  const studentId = parseInt(req.params.studentId);
  try {
    const [rows] = await req.db.query('SELECT * FROM eleve WHERE id = ?', [studentId]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).send('Élève non trouvé');
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des informations de l\'élève:', err);
    res.status(500).send('Erreur interne du serveur');
  }
});

module.exports = router;
