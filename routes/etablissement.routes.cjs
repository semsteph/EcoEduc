// =====================================================================
//  Établissements, années scolaires, communes, semestres
//  Monté dans server.cjs avec : app.use('/api', require('./routes/etablissement.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, requireAdminStaff } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const bcrypt = require('bcrypt');

// API pour ajouter une nouvelle année scolaire.
// - réservée à l'administration de l'établissement connecté ;
// - une seule année ouverte à la fois (la suivante est créée par la
//   clôture) : deux années ouvertes faisaient lire l'une ou l'autre selon
//   l'écran ;
// - renvoie l'identifiant de l'année créée (l'écran l'attendait).
router.post('/annees-scolaires', authenticateJWT, requireAdminStaff, async (req, res) => {
  const etablissementId = Number(req.user.etablissementId);
  const annee = String(req.body?.annee || '').trim().replace(/\s+/g, '');

  const match = annee.match(/^(\d{4})[-/](\d{4})$/);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) {
    return res.status(400).json({ message: "Écrivez l'année sous la forme 2025-2026." });
  }
  const nomAnnee = `${match[1]}-${match[2]}`;

  try {
    const [open] = await db.query(
      "SELECT nom_annee FROM annee_scolaire WHERE etablissement_id = ? AND statut = 'ouverte'",
      [etablissementId]
    );
    if (open.length > 0) {
      return res.status(409).json({
        message: `L'année ${open[0].nom_annee} est encore ouverte. Clôturez-la : la nouvelle année sera créée automatiquement.`,
      });
    }
    const [existingYear] = await db.query(
      'SELECT id FROM annee_scolaire WHERE nom_annee = ? AND etablissement_id = ?',
      [nomAnnee, etablissementId]
    );
    if (existingYear.length > 0) {
      return res.status(409).json({ message: "Cette année scolaire existe déjà pour cet établissement." });
    }

    const [result] = await db.query(
      'INSERT INTO annee_scolaire (nom_annee, etablissement_id) VALUES (?, ?)',
      [nomAnnee, etablissementId]
    );
    await db.query('UPDATE etablissement SET Annee_scolaire_id = ? WHERE id = ?', [result.insertId, etablissementId]);

    res.status(201).json({
      message: "Année scolaire ajoutée avec succès.",
      id: result.insertId,
      anneeScolaireId: result.insertId,
      annee: nomAnnee,
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'année scolaire :", error);
    res.status(500).json({ message: "Une erreur est survenue lors de l'ajout de l'année scolaire." });
  }
});

router.get('/etablissements', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, nom FROM etablissement ORDER BY nom ASC');
    res.json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des établissements :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des établissements." });
  }
});

router.get('/annees-scolaires/:etablissementId', async (req, res) => {
  const { etablissementId } = req.params;

  console.log("Requête reçue pour récupérer l'année scolaire ouverte.");
  console.log("Identifiant de l'établissement :", etablissementId);

  if (!etablissementId) {
    console.error("Erreur : L'identifiant de l'établissement est manquant.");
    return res.status(400).json({ message: "L'identifiant de l'établissement est requis." });
  }

  try {
    console.log("Connexion à la base de données et exécution de la requête...");
    const [rows] = await db.query(
      `SELECT id, nom_annee 
       FROM annee_scolaire 
       WHERE etablissement_id = ? 
         AND statut = 'ouverte' 
       ORDER BY id DESC 
       LIMIT 1`,
      [etablissementId]
    );

    console.log("Résultat brut de la requête SQL :", rows);

    if (rows.length === 0) {
      console.warn("Aucune année scolaire ouverte trouvée pour l'établissement :", etablissementId);
      return res.status(404).json({ message: "Aucune année scolaire ouverte trouvée pour cet établissement." });
    }

    console.log("Année scolaire trouvée :", rows[0]);
    res.json({ id: rows[0].id, nom: rows[0].nom_annee });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'année scolaire :", error.message);
    console.error("Stack trace :", error.stack);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

router.get('/annees-scolaires/etablissement/:etablissementId', async (req, res) => {
  const etablissementId = Number(req.params.etablissementId);

  if (!etablissementId) {
    return res.status(400).json({
      message: "L'identifiant de l'établissement est requis."
    });
  }

  let connection;

  try {
    connection = await db.getConnection();

    const [rows] = await connection.execute(
      `
      SELECT
        id,
        nom_annee,
        statut
      FROM annee_scolaire
      WHERE etablissement_id = ?
      ORDER BY
        CASE
          WHEN statut = 'En cours' THEN 0
          ELSE 1
        END,
        id DESC
      `,
      [etablissementId]
    );

    return res.status(200).json({
      message: "Années scolaires récupérées avec succès.",
      anneesScolaires: rows
    });
  } catch (error) {
    console.error("Erreur récupération des années scolaires :", error);
    return res.status(500).json({
      message: "Une erreur est survenue lors de la récupération des années scolaires."
    });
  } finally {
    if (connection) connection.release();
  }
});

// Route pour ajouter un semestre/trimestre
router.post('/semestres', authenticateJWT, requireAdminStaff, async (req, res) => {
  const { nom, etablissement_id } = req.body;

  if (!nom || !etablissement_id) {
    return res.status(400).json({ message: 'Le nom et l\'ID de l\'établissement sont requis.' });
  }

  try {
    const result = await req.db.query('INSERT INTO semestre (nom, etablissement_id) VALUES (?, ?)', [nom, etablissement_id]);
    const newSemestre = { id: result[0].insertId, nom, etablissement_id };
    res.status(201).json({ message: 'Semestre/Trimestre ajouté avec succès.', semestre: newSemestre });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du semestre :', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout du semestre.' });
  }
});

router.get('/semesters/:etablissementId', async (req, res) => {
  const etablissementId = req.params.etablissementId; // Récupérer l'ID de l'établissement depuis les paramètres de requête

  if (!etablissementId) {
    return res.status(400).json({ error: 'L\'ID de l\'établissement est requis.' });
  }

  try {
    const [rows] = await db.query('SELECT id, nom FROM semestre WHERE etablissement_id = ?', [etablissementId]);
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des semestres:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour récupérer le statut de l'établissement
router.get('/etablissementStatut', async (req, res) => {
  const { etablissementId } = req.query;

  try {
    // Récupérer le statut de l'établissement
    const [rows] = await req.db.query(
      'SELECT statut FROM etablissement WHERE id = ?',
      [etablissementId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Établissement introuvable" });
    }

    const statut = rows[0].statut;
    res.json({ statut });
  } catch (error) {
    console.error("Erreur lors de la récupération du statut de l'établissement :", error);
    res.status(500).json({ message: "Erreur lors de la récupération du statut de l'établissement" });
  }
});

router.get('/communes', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        d.departement_id, 
        d.nom AS departement_nom, 
        c.commune_id, 
        c.nom AS commune_nom
      FROM commune c
      JOIN departement d ON c.departement_id = d.departement_id
      ORDER BY d.departement_id, c.nom
    `);

    // Regrouper les communes par département
    const result = [];
    const map = new Map();

    for (const row of rows) {
      if (!map.has(row.departement_id)) {
        const deptGroup = {
          departement_id: row.departement_id,
          departement_nom: row.departement_nom,
          communes: [],
        };
        map.set(row.departement_id, deptGroup);
        result.push(deptGroup);
      }
      map.get(row.departement_id).communes.push({
        commune_id: row.commune_id,
        nom: row.commune_nom,
      });
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des communes par département.' });
  }
});

router.post('/etablissements', async (req, res) => {
  const { nom, departement_id, commune_id, statut, telephone, mail, nom_utilisateur, mot_de_passe } = req.body;

  // Validation des données
  if (!nom || !nom_utilisateur || !mot_de_passe) {
    return res.status(400).json({ error: 'Nom, nom d\'utilisateur et mot de passe sont requis.' });
  }
  if (!['public', 'prive'].includes(statut)) {
    return res.status(400).json({ error: 'Choisissez le statut : public ou privé.' });
  }
  if (String(mot_de_passe).length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  try {
    // Nom d'utilisateur unique : la connexion lit le premier compte trouvé,
    // un doublon empêchait l'autre école de se connecter.
    const [taken] = await db.query('SELECT id FROM etablissement WHERE nom_utilisateur = ?', [nom_utilisateur]);
    if (taken.length) {
      return res.status(409).json({ error: 'Ce nom d\'utilisateur est déjà pris. Choisissez-en un autre.' });
    }

    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    // Ajout de l'établissement dans la table Etablissement
    const [result] = await db.query(
      'INSERT INTO etablissement (nom, departement_id, commune_id, statut, telephone, mail, nom_utilisateur, mot_de_passe) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nom, departement_id, commune_id, statut, telephone, mail, nom_utilisateur, hashedPassword]
    );

    const idEtablissement = result.insertId;

    // Récupération du statut pour vérifier s'il est "public" ou "privé"
    if (statut === 'public') {
      // Ajout des semestres pour un établissement public
      await db.query(
        'INSERT INTO semestre (nom, etablissement_id) VALUES (?, ?), (?, ?)',
        ['Semestre 1', idEtablissement, 'Semestre 2', idEtablissement]
      );
    } else if (statut === 'prive') {
      // Ajout des trimestres pour un établissement privé
      await db.query(
        'INSERT INTO semestre (nom, etablissement_id) VALUES (?, ?), (?, ?), (?, ?)',
        ['Trimestre 1', idEtablissement, 'Trimestre 2', idEtablissement, 'Trimestre 3', idEtablissement]
      );
    }

    res.status(201).json({ message: 'Établissement ajouté avec succès.', idEtablissement, statut });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'ajout de l\'établissement.' });
  }
});

module.exports = router;
