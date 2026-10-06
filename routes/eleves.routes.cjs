// =====================================================================
//  Élèves : CRUD, réinscription, migration, import Excel
//  Monté dans server.cjs avec : app.use('/api', require('./routes/eleves.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, requireAdminStaff } = require('../server-lib/auth.cjs');
const { savePhoto, deletePhoto, photoUpload } = require('../server-lib/photo.cjs');
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
         e.id, e.nom, e.prenom, e.date_naissance, e.sexe, e.classe_id, c.nom AS classe_nom, e.Parents_id AS parent_id,
         p.nom AS parent_nom, p.prenom AS parent_prenom, p.contact AS parent_contact, p.email AS parent_email
       FROM
         eleve e
       JOIN
         classes c ON e.classe_id = c.id
       LEFT JOIN
         parents p ON p.id = e.Parents_id AND p.etablissement_id = e.etablissement_id
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

router.post('/import-eleves', authenticateJWT, requireAdminStaff, upload.single('file'), async (req, res) => {
  const file = req.file;
  const { classeId, anneeScolaireId } = req.body;
  // École lue dans le jeton (corps multipart : le garde central ne le lit pas).
  const etablissementId = Number(req.user.etablissementId);

  if (!file) return res.status(400).json({ message: 'Aucun fichier reçu.' });
  const [[classeOk]] = await db.query('SELECT id FROM classes WHERE id = ? AND etablissement_id = ?', [classeId, etablissementId]);
  if (!classeOk) {
    fs.unlink(file.path, () => {});
    return res.status(403).json({ message: "Cette classe n'appartient pas à votre établissement." });
  }

  try {
    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // On commence à lire les données après l'entête
    let data = XLSX.utils.sheet_to_json(worksheet, { range: 1 });

    // Ligne d'exemple du canevas ignorée seulement si elle est restée telle
    // quelle (avant : la 1re ligne était toujours supprimée, même un vrai élève).
    if (data.length > 0 && String(data[0]['Nom Élève'] || '').trim().toUpperCase() === 'KOUADIO' && String(data[0]['Prénom Élève'] || '').trim() === 'Jean') data.shift();

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
        const matricule = `${new Date().getFullYear()}-T${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 100)}`;
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
router.get('/eleves/:classId/:anneeScolaireId', authenticateJWT, async (req, res) => {
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

// Inscription en masse d'une classe à partir d'une liste déjà lue et
// vérifiée par l'écran (copier-coller depuis Excel/Word ou fichier).
// Corps : { classeId, anneeScolaireId, eleves: [{ nom, prenom, dateNaissance
//   (AAAA-MM-JJ), sexe (M/F), parentNom, parentPrenom, telephone, email }] }
// - le parent peut n'avoir qu'un téléphone ; un parent déjà connu (même
//   téléphone ou même e-mail) est réutilisé : les frères et sœurs sont
//   rattachés au même compte ;
// - un élève déjà inscrit (même nom, prénom, date de naissance) est ignoré ;
// - réponse ligne par ligne (les lignes valides sont inscrites).
router.post('/eleves/import-liste', authenticateJWT, requireAdminStaff, async (req, res) => {
  const { classeId, anneeScolaireId, eleves } = req.body || {};
  const etablissementId = Number(req.user.etablissementId);
  if (!classeId || !anneeScolaireId || !Array.isArray(eleves) || eleves.length === 0) {
    return res.status(400).json({ message: 'Choisissez la classe et ajoutez au moins un élève.' });
  }
  if (eleves.length > 300) return res.status(400).json({ message: 'Au plus 300 élèves par envoi.' });

  const conn = await db.getConnection();
  try {
    const [[classe]] = await conn.query('SELECT id, nom FROM classes WHERE id = ? AND etablissement_id = ?', [classeId, etablissementId]);
    const [[annee]] = await conn.query("SELECT id, nom_annee FROM annee_scolaire WHERE id = ? AND etablissement_id = ? AND statut = 'ouverte'", [anneeScolaireId, etablissementId]);
    if (!classe || !annee) return res.status(403).json({ message: 'Classe ou année invalide.' });

    const params = await fetchClotureParams(conn, etablissementId);
    const [[{ total }]] = await conn.query("SELECT COUNT(*) AS total FROM eleve WHERE classe_id = ? AND statut = 'actif'", [classeId]);
    let effectif = Number(total);
    const debut = String(annee.nom_annee).slice(0, 4);
    const chiffres = (t) => String(t || '').replace(/\D/g, '');

    const inscrits = [];
    const erreurs = [];
    const ignores = [];
    for (const [index, row] of eleves.entries()) {
      const ligne = index + 1;
      const nom = String(row.nom || '').trim().replace(/\s+/g, ' ').toUpperCase();
      const prenom = String(row.prenom || '').trim().replace(/\s+/g, ' ');
      const date = String(row.dateNaissance || '').trim();
      const sexe = String(row.sexe || '').trim().toUpperCase();
      const telephone = chiffres(row.telephone);
      const email = String(row.email || '').trim().toLowerCase();
      try {
        if (!nom || !prenom) throw new Error('nom ou prénom manquant');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T12:00:00`).getTime())) throw new Error('date de naissance invalide');
        if (!['M', 'F'].includes(sexe)) throw new Error('sexe à préciser (M ou F)');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('e-mail du parent invalide');
        if (effectif >= params.effectifMaxParClasse) throw new Error(`effectif maximum atteint (${params.effectifMaxParClasse})`);

        const [doublon] = await conn.query(
          "SELECT id FROM eleve WHERE etablissement_id = ? AND nom = ? AND prenom = ? AND date_naissance = ? AND statut = 'actif'",
          [etablissementId, nom, prenom, date]
        );
        if (doublon.length) { ignores.push({ ligne, nom, prenom, raison: 'déjà inscrit(e)' }); continue; }

        let parentId = null;
        if (telephone || email) {
          const [parents] = await conn.query(
            `SELECT id FROM parents WHERE etablissement_id = ?
               AND ((? <> '' AND REPLACE(REPLACE(REPLACE(contact, ' ', ''), '-', ''), '.', '') = ?) OR (? <> '' AND LOWER(email) = ?))
             LIMIT 1`,
            [etablissementId, telephone, telephone, email, email]
          );
          if (parents.length) {
            parentId = parents[0].id;
          } else {
            const [ins] = await conn.query(
              `INSERT INTO parents (nom, prenom, contact, email, mot_de_passe, nom_utilisateur, etablissement_id, Annee_scolaire_id)
               VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)`,
              [String(row.parentNom || nom).trim().toUpperCase(), String(row.parentPrenom || '').trim(), telephone || null, email, etablissementId, anneeScolaireId]
            );
            parentId = ins.insertId;
          }
        }

        const [ins] = await conn.query(
          `INSERT INTO eleve (nom, prenom, date_naissance, sexe, classe_id, Parents_id, etablissement_id, Annee_scolaire_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [nom, prenom, date, sexe, classeId, parentId, etablissementId, anneeScolaireId]
        );
        const matricule = `${debut}-${String(ins.insertId).padStart(5, '0')}`;
        await conn.query('UPDATE eleve SET matricule = ? WHERE id = ?', [matricule, ins.insertId]);
        effectif += 1;
        inscrits.push({ ligne, id: ins.insertId, nom, prenom, matricule, sansParent: !parentId });
      } catch (error) {
        erreurs.push({ ligne, nom, prenom, message: error.message });
      }
    }
    res.json({ classe: classe.nom, inscrits, ignores, erreurs, effectif, effectifMax: params.effectifMaxParClasse });
  } catch (error) {
    console.error('Erreur inscription en masse :', error);
    res.status(500).json({ message: "Erreur lors de l'inscription." });
  } finally {
    conn.release();
  }
});

// Photo d'identité d'un élève (facultative) : ajout / remplacement /
// suppression, par l'administration de son établissement.
async function eleveDeLEcole(req, res) {
  const [[eleve]] = await db.query('SELECT id, etablissement_id FROM eleve WHERE id = ?', [req.params.id]);
  if (!eleve) { res.status(404).json({ message: 'Élève introuvable.' }); return null; }
  if (Number(eleve.etablissement_id) !== Number(req.user.etablissementId)) {
    res.status(403).json({ message: "Cet élève n'appartient pas à votre établissement." });
    return null;
  }
  return eleve;
}

// Rattacher un parent plus tard (élèves inscrits sans parent, ou erreur à
// corriger) : un parent existant, ou un nouveau parent créé à la volée —
// retrouvé s'il existe déjà avec le même téléphone ou e-mail. Plusieurs
// élèves d'un coup pour les frères et sœurs.
router.post('/eleves/parent', authenticateJWT, requireAdminStaff, async (req, res) => {
  const etablissementId = Number(req.user.etablissementId);
  const { eleveIds, parentId, parent, anneeScolaireId } = req.body || {};
  const ids = [...new Set((Array.isArray(eleveIds) ? eleveIds : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (!ids.length || ids.length > 20) return res.status(400).json({ message: 'Choisissez entre 1 et 20 élèves.' });

  const conn = await db.getConnection();
  try {
    const [eleves] = await conn.query('SELECT id FROM eleve WHERE id IN (?) AND etablissement_id = ?', [ids, etablissementId]);
    if (eleves.length !== ids.length) return res.status(403).json({ message: "Un des élèves n'appartient pas à votre établissement." });

    let idParent = Number(parentId) || null;
    let cree = false;
    if (idParent) {
      const [[p]] = await conn.query('SELECT id FROM parents WHERE id = ? AND etablissement_id = ?', [idParent, etablissementId]);
      if (!p) return res.status(404).json({ message: 'Parent introuvable dans votre établissement.' });
    } else {
      const nom = String(parent?.nom || '').trim().replace(/\s+/g, ' ').toUpperCase();
      const prenom = String(parent?.prenom || '').trim().replace(/\s+/g, ' ');
      const telephone = String(parent?.telephone || '').replace(/\D/g, '');
      const email = String(parent?.email || '').trim().toLowerCase();
      if (!nom) return res.status(400).json({ message: 'Indiquez au moins le nom du parent.' });
      if (!telephone && !email) return res.status(400).json({ message: 'Indiquez le téléphone ou l\'e-mail du parent.' });
      if (telephone && (telephone.length < 8 || telephone.length > 15)) return res.status(400).json({ message: 'Numéro de téléphone invalide.' });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'E-mail invalide.' });

      const [existant] = await conn.query(
        `SELECT id FROM parents WHERE etablissement_id = ?
           AND ((? <> '' AND REPLACE(REPLACE(REPLACE(contact, ' ', ''), '-', ''), '.', '') = ?) OR (? <> '' AND LOWER(email) = ?))
         LIMIT 1`,
        [etablissementId, telephone, telephone, email, email]
      );
      if (existant.length) {
        idParent = existant[0].id;
      } else {
        let annee = Number(anneeScolaireId) || null;
        if (!annee) {
          const [[a]] = await conn.query("SELECT id FROM annee_scolaire WHERE etablissement_id = ? AND statut = 'ouverte' ORDER BY id DESC LIMIT 1", [etablissementId]);
          annee = a?.id || null;
        }
        const [ins] = await conn.query(
          `INSERT INTO parents (nom, prenom, contact, email, mot_de_passe, nom_utilisateur, etablissement_id, Annee_scolaire_id)
           VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)`,
          [nom, prenom, telephone || null, email, etablissementId, annee]
        );
        idParent = ins.insertId;
        cree = true;
      }
    }

    await conn.query('UPDATE eleve SET Parents_id = ? WHERE id IN (?) AND etablissement_id = ?', [idParent, ids, etablissementId]);
    const [[p]] = await conn.query(
      'SELECT id, nom, prenom, contact, email, nom_utilisateur, (mot_de_passe IS NOT NULL) AS actif FROM parents WHERE id = ?',
      [idParent]
    );
    res.json({
      message: ids.length > 1 ? `Parent rattaché à ${ids.length} élèves.` : 'Parent rattaché.',
      cree,
      parent: { id: p.id, nom: p.nom, prenom: p.prenom, contact: p.contact, email: p.email, identifiant: p.nom_utilisateur, actif: Boolean(p.actif) },
    });
  } catch (error) {
    console.error('Erreur rattachement parent :', error);
    res.status(500).json({ message: 'Erreur lors du rattachement du parent.' });
  } finally {
    conn.release();
  }
});

// Détacher le parent d'un élève (mauvais parent rattaché).
router.delete('/eleves/:id/parent', authenticateJWT, requireAdminStaff, async (req, res) => {
  try {
    if (!(await eleveDeLEcole(req, res))) return;
    await db.query('UPDATE eleve SET Parents_id = NULL WHERE id = ?', [req.params.id]);
    res.json({ message: 'Parent détaché.' });
  } catch (error) {
    console.error('Erreur détachement parent :', error);
    res.status(500).json({ message: 'Erreur lors du détachement du parent.' });
  }
});

router.post('/eleves/:id/photo', authenticateJWT, requireAdminStaff, (req, res, next) => {
  photoUpload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Photo trop lourde (5 Mo au plus).' : 'Envoi de la photo impossible.' });
    next();
  });
}, async (req, res) => {
  try {
    if (!(await eleveDeLEcole(req, res))) return;
    if (!req.file) return res.status(400).json({ message: 'Aucune photo reçue.' });
    const photoUrl = await savePhoto(db, req.params.id, req.file.buffer);
    res.json({ message: 'Photo enregistrée.', photo_url: photoUrl });
  } catch (error) {
    if (error.code === 'IMAGE') return res.status(400).json({ message: error.message });
    console.error('Erreur photo élève :', error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement de la photo.' });
  }
});

router.delete('/eleves/:id/photo', authenticateJWT, requireAdminStaff, async (req, res) => {
  try {
    if (!(await eleveDeLEcole(req, res))) return;
    await deletePhoto(db, req.params.id);
    res.json({ message: 'Photo retirée.' });
  } catch (error) {
    console.error('Erreur suppression photo :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
