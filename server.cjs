require('dotenv').config(); 
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const multer = require('multer');
const moment = require('moment');
const fs = require('fs');  // Ajout de fs
const path = require('path');  // Ajout de path
const axios = require('axios'); // Importation d'Axios
const nodemailer = require('nodemailer');
const admZip = require('adm-zip');

const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);


const app = express();
const port = 8080;
const secretKey = 'your_jwt_secret';


// Configuration de la connexion à la base de données avec un pool
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'projetoff',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware
// Middleware CORS
const corsOptions = {
  origin: 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());
// Rendre le dossier des photos public
app.use('/uploads/photos', express.static(path.join(__dirname, 'uploads/photos')));
// Configurer le stockage des fichiers pour `multer`
const upload = multer({ dest: 'uploads/' });

// Fonction pour mapper le type de note sélectionné au champ de la table Note
function mapTypeNoteToField(typeNote) {
  const noteFields = {
    'Inter1': 'inter1',
    'Inter2': 'inter2',
    'Inter3': 'inter3',
    'Inter4': 'inter4',
    'TP1': 'TP1',
    'TP2': 'TP2',
    'Devoir1': 'Dev1',
    'Devoir2': 'Dev2',
  };

  return noteFields[typeNote] || null; // Renvoie le champ correspondant ou null si le type de note n'existe pas
}

// Ajout de la connexion à la base de données dans `req` pour l'utiliser dans les API
app.use((req, res, next) => {
  req.db = db;
  next();
});

// API pour ajouter une nouvelle année scolaire
app.post('/api/annees-scolaires', async (req, res) => {
  const { annee, etablissementId } = req.body;

  console.log("Données reçues dans le corps de la requête :", req.body);

  // Vérifier si tous les champs nécessaires sont présents
  if (!annee || !etablissementId) {
    console.error("Champs manquants : année ou ID établissement non fourni.");
    return res.status(400).json({ message: "L'année scolaire et l'ID de l'établissement sont requis." });
  }

  try {
    // Vérifier si l'année scolaire existe déjà pour cet établissement
    console.log("Vérification de l'existence de l'année scolaire pour cet établissement...");
    const [existingYear] = await db.query(
      'SELECT * FROM annee_scolaire WHERE nom_annee = ? AND etablissement_id = ?',
      [annee, etablissementId]
    );

    if (existingYear.length > 0) {
      console.warn("Année scolaire déjà existante :", existingYear);
      return res.status(409).json({ message: "Cette année scolaire existe déjà pour cet établissement." });
    }

    // Insérer la nouvelle année scolaire dans la base de données
    console.log("Insertion de la nouvelle année scolaire dans la base de données...");
    await db.query(
      'INSERT INTO annee_scolaire (nom_annee, etablissement_id) VALUES (?, ?)',
      [annee, etablissementId]
    );

    console.log("Nouvelle année scolaire ajoutée avec succès :", { annee, etablissementId });
    res.status(201).json({ message: "Année scolaire ajoutée avec succès." });
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'année scolaire :", error);
    res.status(500).json({ message: "Une erreur est survenue lors de l'ajout de l'année scolaire." });
  }
});
app.get('/api/etablissements', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, nom FROM etablissement ORDER BY nom ASC');
    res.json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des établissements :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des établissements." });
  }
});

app.get('/api/annees-scolaires/:etablissementId', async (req, res) => {
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

app.get('/api/enseignements', async (req, res) => {
  const { etablissementId, classeId } = req.query;

  console.log('📥 Reçu dans API :', req.query);

  if (!etablissementId || !classeId) {
    console.warn('⚠️ Paramètres manquants :', { etablissementId, classeId });
    return res.status(400).json({ error: 'ID établissement ou classe manquant' });
  }

  try {
    const etabId = Number(etablissementId);
    const classId = Number(classeId);

    console.log('🔎 Requête SQL avec :', { etabId, classId });

    const [rows] = await db.query(`
      SELECT 
        ens.nom AS nom,
        ens.prenom AS prenom,
        mat.nom AS matiere,
        coef.valeur AS coefficient
      FROM enseigner AS e
      JOIN enseignants AS ens ON ens.id = e.Enseignants_id
      JOIN matieres AS mat ON mat.id = e.matiere_id
      JOIN coefficient AS coef ON coef.id = e.coefficient_id
      WHERE e.etablissement_id = ? AND e.Classes_id = ?
    `, [etabId, classId]);

    console.log('📤 Résultat SQL :', rows);

    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur SQL :', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

app.post('/api/enseignements/delete', (req, res) => {
  const { Enseignants_id, Classes_id, matiere_id } = req.body;

  console.log('Requête reçue pour suppression :', req.body);

  if (!Enseignants_id || !Classes_id || !matiere_id) {
    console.log('Champs manquants');
    return res.status(400).json({ error: 'Champs manquants' });
  }

  const sql = `
    DELETE FROM enseigner
    WHERE Enseignants_id = ? AND Classes_id = ? AND matiere_id = ?
  `;

  db.query(sql, [Enseignants_id, Classes_id, matiere_id], (err, result) => {
    if (err) {
      console.error('Erreur suppression enseignement :', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    console.log('Suppression réussie :', result);
    return res.json({ success: true, message: 'Enseignement supprimé' });
  });
});


""// ✅ API : Clôture d'année scolaire avec regroupement intelligent des classes
app.post('/api/cloture-annee-scolaire', async (req, res) => {
  const { etablissementId, anneeScolaireId } = req.body;

  if (!etablissementId || !anneeScolaireId) {
    return res.status(400).json({ message: "Les IDs de l’établissement et de l’année scolaire sont requis." });
  }

  try {
    const connection = await db.getConnection();
    const ordreClasses = ['6eme', '5eme', '4eme', '3eme', '2nd', '1ere', 'Tle'];
    const regexClasse = /^([0-9]{1,2}(?:eme|nd|ere|Tle))\s*([A-Z]*)\s*([0-9]*)$/;

    const [bulletins] = await connection.execute(
      `SELECT b.moyAn, b.decision, e.id AS eleveId, e.nom AS eleveNom, e.prenom AS elevePrenom, 
              c.id AS classeId, c.nom AS classeNom
       FROM bulletin b
       JOIN eleve e ON b.eleve_id = e.id
       JOIN classes c ON e.classe_id = c.id
       WHERE b.etablissement_id = ? AND b.Annee_scolaire_id = ?`,
      [etablissementId, anneeScolaireId]
    );

    const [classes] = await connection.execute(
      `SELECT id, nom FROM Classes WHERE etablissement_id = ?`,
      [etablissementId]
    );

    const classesTriees = classes.sort((a, b) => {
      const matchA = a.nom.match(regexClasse);
      const matchB = b.nom.match(regexClasse);
      if (!matchA || !matchB) return 0;

      const [_, radA, prefixA, sufA] = matchA;
      const [__, radB, prefixB, sufB] = matchB;

      const indexA = ordreClasses.indexOf(radA);
      const indexB = ordreClasses.indexOf(radB);
      if (indexA !== indexB) return indexA - indexB;

      if ((prefixA || '') !== (prefixB || '')) return (prefixA || '').localeCompare(prefixB || '');
      return (sufA || '0').localeCompare(sufB || '0');
    });

    const elevesParNiveau = {};

    for (const bulletin of bulletins) {
      const { decision, classeNom, eleveId } = bulletin;

      const matchClasse = classeNom.match(regexClasse);
      if (!matchClasse) continue;

      const [_, rad, prefix] = matchClasse;
      const index = ordreClasses.indexOf(rad);
      if (index === -1 || rad === 'Tle' || index >= ordreClasses.length - 1) continue;

      if (decision === 'Admis') {
        const nextRad = ordreClasses[index + 1];
        const cle = `${nextRad}-${prefix}`;
        if (!elevesParNiveau[cle]) elevesParNiveau[cle] = [];
        elevesParNiveau[cle].push(eleveId);
      }
    }

    for (const key in elevesParNiveau) {
      const [nextRad, prefix] = key.split('-');
      const eleves = elevesParNiveau[key];
      const count = eleves.length;

      const classesSuperieures = classes.filter(c => {
        const match = c.nom.match(regexClasse);
        return match && match[1] === nextRad && (match[2] || '') === (prefix || '');
      });

      if (classesSuperieures.length === 0) continue;

      const minimum = 20;

      if (count < minimum) {
        // Cas 1 : Moins de 20 élèves → tous dans la première classe
        for (const eleveId of eleves) {
          await connection.execute(`UPDATE eleve SET classe_id = ? WHERE id = ?`, [classesSuperieures[0].id, eleveId]);
        }
      } else if (classesSuperieures.length === 1) {
        if (count >= 60) {
          // Cas 4 : Une seule classe et ≥60 élèves → on crée une nouvelle classe
          const half = Math.floor(count / 2);
          const elevesClasse1 = eleves.slice(0, half);
          const elevesClasse2 = eleves.slice(half);

          const nouveauNom = `${nextRad} ${prefix} ${classesSuperieures.length + 1}`;
          const [result] = await connection.execute(
            `INSERT INTO classes (nom, etablissement_id) VALUES (?, ?)`,
            [nouveauNom, etablissementId]
          );
          const newClasseId = result.insertId;

          for (const eleveId of elevesClasse1) {
            await connection.execute(`UPDATE eleve SET classe_id = ? WHERE id = ?`, [classesSuperieures[0].id, eleveId]);
          }
          for (const eleveId of elevesClasse2) {
            await connection.execute(`UPDATE eleve SET classe_id = ? WHERE id = ?`, [newClasseId, eleveId]);
          }
        } else {
          // Cas 2 : Une seule classe et moins de 60 élèves
          for (const eleveId of eleves) {
            await connection.execute(`UPDATE eleve SET classe_id = ? WHERE id = ?`, [classesSuperieures[0].id, eleveId]);
          }
        }
      } else {
        // Cas 3 : Répartition dans plusieurs classes existantes par tranche de 20
        const nombreClasses = Math.floor(count / minimum);
        const classesAUtiliser = classesSuperieures.slice(0, nombreClasses);
        for (let i = 0; i < eleves.length; i++) {
          const classe = classesAUtiliser[i % classesAUtiliser.length];
          await connection.execute(`UPDATE eleve SET classe_id = ? WHERE id = ?`, [classe.id, eleves[i]]);
        }
      }
    }

    await connection.execute(`UPDATE annee_scolaire SET statut = 'Clôturée' WHERE id = ?`, [anneeScolaireId]);
    await connection.execute(`DELETE FROM enseigner WHERE etablissement_id = ?`, [etablissementId]);

    connection.release();
    res.status(200).json({ message: "Année scolaire clôturée avec succès." });
  } catch (error) {
    console.error("Erreur de clôture :", error);
    res.status(500).json({ message: "Une erreur est survenue." });
  }
});

///////////////////////////////////////////////////////notification vrai
app.get('/api/notifications/unread/:etablissementId/:anneeScolaireId', async (req, res) => {
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

app.put('/api/notifications/mark-read/:etabId/:anneeId', async (req, res) => {
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
app.get('/api/notifications/check/:eleveId/:startDate/:endDate/:etabId/:anneeId', async (req, res) => {
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


// Assure-toi que ta connexion db est en place, ici on suppose db.query disponible en Promise

app.post('/api/notifications/generate', async (req, res) => {
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

app.get('/api/notifications/:etabId/:anneeId', async (req, res) => {
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


/////////////////////////

app.post('/api/eleves', async (req, res) => {
  const { etablissement_id, annee_scolaire_id } = req.body;

  if (!etablissement_id || !annee_scolaire_id) {
    return res.status(400).json({ error: "Champs manquants." });
  }

  try {
    const [rows] = await db.execute(
      `SELECT 
         e.id, e.nom, e.prenom, e.classe_id, c.nom AS classe_nom
       FROM 
         eleve e
       JOIN 
         classes c ON e.classe_id = c.id
       WHERE 
         e.etablissement_id = ? AND e.Annee_scolaire_id = ?`,
      [etablissement_id, annee_scolaire_id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des élèves :", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

/*API pour récupérer le nom de la classe
app.get("/api/classse/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query("SELECT nom FROM Classe WHERE id = ?", [id]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: "Classe non trouvée" });
    }
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});*/

app.post('/api/Classes/multiple', async (req, res) => {
  const { promotion_id, etablissement_id, cycle, nombre } = req.body;

  if (!promotion_id || !etablissement_id || !cycle || !nombre || isNaN(nombre)) {
    return res.status(400).json({ error: 'Champs requis manquants ou invalides.' });
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



app.get('/api/Promotions', async (req, res) => {
  try {
    const [promotions] = await req.db.query('SELECT id, nom FROM promotion');
    res.status(200).json(promotions);
  } catch (error) {
    console.error('Erreur lors de la récupération des promotions', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des promotions.' });
  }
});

// Route pour ajouter un semestre/trimestre
app.post('/api/semestres', async (req, res) => {
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

// Route pour obtenir une classe par ID
app.get('/api/Classes/:id', async (req, res) => {
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
app.get('/api/classetablissement/:etablissementId', async (req, res) => {
  const etablissementId = req.params.etablissementId;

  if (!etablissementId || isNaN(etablissementId)) {
    return res.status(400).json({ error: 'L\'ID de l\'établissement est invalide.' });
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
app.put('/api/Classes/:id', async (req, res) => {
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

app.post('/api/eleves/reinscription', async (req, res) => {
  const { eleveIds, anneeScolaireId } = req.body;

  if (!Array.isArray(eleveIds) || !anneeScolaireId) {
    return res.status(400).json({ message: 'Données manquantes' });
  }

  try {
    for (const id of eleveIds) {
      await db.query('UPDATE eleve SET Annee_scolaire_id = ? WHERE id = ?', [anneeScolaireId, id]);
    }
    res.json({ message: 'Réinscription réussie' });
  } catch (error) {
    console.error('Erreur API réinscription:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour supprimer une classe par id
// Route pour obtenir le nombre d'élèves dans une classe par ID et la supprimer si elle est vide
app.delete('/api/Classes/:id', async (req, res) => {
  const { id } = req.params;

  try {
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


app.post('/api/conduite', async (req, res) => {
  try {
    const { note_conduite, classe_ids, semestre_id, anneeScolaireId } = req.body;

    // Vérifiez les données reçues
    if (!note_conduite || !classe_ids || classe_ids.length === 0 || !semestre_id || !anneeScolaireId) {
      return res.status(400).json({ error: 'Veuillez fournir une note de conduite, des identifiants de classe et un identifiant de semestre.' });
    }

    // Vérifiez si des notes de conduite existent déjà pour les classes sélectionnées dans le semestre donné
    const placeholders = classe_ids.map(() => '?').join(',');
    const checkQuery = `
      SELECT c.id, c.nom AS className
      FROM conduite co
      JOIN classes c ON co.classe_id = c.id
      WHERE co.classe_id IN (${placeholders}) AND co.semestre_id = ? AND co.Annee_scolaire_id = ?
    `;
    const [rows] = await req.db.execute(checkQuery, [...classe_ids, semestre_id, anneeScolaireId]);

    if (rows.length > 0) {
      // Récupération des noms des classes pour lesquelles une note existe déjà
      const existingClasses = rows.map(row => row.className);
      return res.status(400).json({
        error: `Une note de conduite a déjà été ajoutée pour cette/ces classe(s) : ${existingClasses.join(', ')}.`
      });
    }

    // Insertion des notes de conduite pour chaque classe
    const insertQuery = 'INSERT INTO conduite (note_conduite, classe_id, semestre_id, Annee_scolaire_id) VALUES (?, ?, ?, ?)';
    const insertPromises = classe_ids.map(classe_id => 
      req.db.execute(insertQuery, [note_conduite, classe_id, semestre_id, anneeScolaireId])
    );

    await Promise.all(insertPromises);

    res.status(200).json({ message: 'Notes de conduite ajoutées avec succès.' });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la note de conduite :', error);
    res.status(500).json({ error: 'Erreur du serveur.' });
  }
});

// pour administration
// ✅ Nouvelle version sans permissions_vues
app.get('/api/permissions/:etablissementId/:anneeScolaireId', async (req, res) => {
  const { etablissementId, anneeScolaireId } = req.params;

  try {
    const [permissions] = await req.db.query(
      `SELECT * FROM permission 
       WHERE etablissement_id = ? 
         AND Annee_scolaire_id = ? 
         AND MONTH(Date) = MONTH(CURDATE())`,
      [etablissementId, anneeScolaireId]
    );

    res.status(200).json(permissions);
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
app.put('/api/permissions/:id', async (req, res) => {
  const { id } = req.params;
  const { is_read, statut } = req.body;

  try {
    if (is_read !== undefined) {
      await req.db.query(
        `UPDATE permission SET is_read = ? WHERE id = ?`,
        [is_read ? 1 : 0, id]
      );
    }

    if (statut !== undefined) {
      await req.db.query(
        `UPDATE permission SET Statut = ? WHERE id = ?`,
        [statut, id]
      );
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

//////////////////////////////////////////////////
//Enseignant
// Enseignant - récupérer notifications et s'assurer qu'elles existent dans notificationProf (non lues par défaut)
// 🔹 Synchronisation des notifications (pas de retour de données)
app.post('/api/notificationprof/sync/:etablissementId/:anneeScolaireId/:enseignantId', async (req, res) => {
  const { etablissementId, anneeScolaireId, enseignantId } = req.params;

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
app.get('/api/notificationprof/:etablissementId/:anneeScolaireId/:enseignantId', async (req, res) => {
  const { etablissementId, anneeScolaireId, enseignantId } = req.params;

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

app.put('/api/notificationprof/mark-read-bulk', async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'notificationIds must be a non-empty array.',
      });
    }

    // Construire placeholders dynamiques
    const placeholders = notificationIds.map(() => '?').join(',');
    const sql = `
      UPDATE notificationProf
      SET is_read = 1
      WHERE id IN (${placeholders})
    `;

    const [result] = await db.query(sql, notificationIds);

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


app.post('/api/Parents', async (req, res) => {
  const { name, firstName, contact, email, username, password,etablissementId } = req.body;

  if (!name || !firstName || !contact || !email || !username || !password || !etablissementId) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertion du parent dans la base de données
    const [result] = await req.db.query(
      'INSERT INTO parents (nom, prenom, contact, email, nom_utilisateur, mot_de_passe, etablissement_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, firstName, contact, email, username, hashedPassword, etablissementId]
    );

    // Récupération des informations du parent ajouté
    const [rows] = await req.db.query(
      'SELECT id, nom AS name, prenom AS firstName, contact AS phone, email FROM Parents WHERE id = ?',
      [result.insertId] // Utilisez l'ID de l'insertion pour récupérer les données
    );

    // Renvoyer les données du parent sauf le nom d'utilisateur et le mot de passe
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erreur lors de l\'ajout du parent:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour récupérer les parents d'un établissement
app.get('/api/Parents/:etablissementId', async (req, res) => {
  const { etablissementId } = req.params;
  try {
    const [rows] = await req.db.query(
      'SELECT id, nom AS name, prenom AS firstName, email, contact, nom_utilisateur AS username FROM parents WHERE etablissement_id = ?',
      [etablissementId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des parents:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});


// Route pour modifier un parent
app.put('/api/Parents/:id', async (req, res) => {
  const { id } = req.params;
  const { name, firstName, email, contact, username, password } = req.body;
  try {
    const [result] = await req.db.query(
      'UPDATE parents SET nom = ?, prenom = ?, email = ?, contact = ?, nom_utilisateur = ?, mot_de_passe = ? WHERE id = ?',
      [name, firstName, email, contact, username, password, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Parent non trouvé' });
    }

    const updatedParent = {
      id,
      name,
      firstName,
      email,
      contact,
      username,
    };

    res.json(updatedParent);
  } catch (error) {
    console.error('Erreur lors de la modification du parent:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});


// Route pour supprimer un parent
app.delete('/api/Parentss/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Vérifier si des élèves sont associés à ce parent
    const [eleves] = await req.db.query('SELECT nom, prenom FROM eleve WHERE Parents_id = ?', [id]);

    if (eleves.length > 0) {
      // Si des élèves sont associés, renvoyer un message d'erreur avec les noms des élèves
      const eleveNames = eleves.map(eleve => `${eleve.prenom} ${eleve.nom}`).join(', ');
      return res.status(400).json({
        error: `Impossible de supprimer ce parent car il a au moins un élève associé : ${eleveNames}. Veuillez supprimer cet élève avant de supprimer ce parent.`
      });
    }

    // Si aucun élève n'est associé, supprimer le parent
    const [result] = await req.db.query('DELETE FROM parents WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Parent non trouvé' });
    }

    res.status(204).send(); // Réponse sans contenu
  } catch (error) {
    console.error('Erreur lors de la suppression du parent:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});




// Route pour ajouter un élève
app.post('/api/inscription', async (req, res) => {
  const { nom, prenom, dateNaissance, sexe, classe, parentId, etablissementId, anneeScolaireId } = req.body;

  if (!nom || !prenom || !dateNaissance || !sexe || !classe || !parentId || !etablissementId || !anneeScolaireId) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    // Insertion de l'élève dans la base de données
    const [result] = await req.db.query(
      'INSERT INTO eleve (nom, prenom, date_naissance, sexe, classe_id, Parents_id, etablissement_id, Annee_scolaire_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nom, prenom, dateNaissance, sexe, classe, parentId, etablissementId, anneeScolaireId]
    );

    // Récupération des informations de l'élève ajouté
    const [rows] = await req.db.query(
      'SELECT id, nom, prenom, date_naissance AS dateNaissance, sexe, classe_id AS classe, Parents_id AS parentId FROM eleve WHERE id = ?',
      [result.insertId] // Utilisez l'ID de l'insertion pour récupérer les données
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erreur lors de l\'inscription de l\'élève:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}); 

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

app.post('/api/import-eleves', upload.single('file'), async (req, res) => {
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
      } catch (innerError) {
        console.error(`Erreur ligne ${i + 3}:`, innerError.message);
        erreurs.push({ ligne: i + 3, error: innerError.message });
      }
    }

    // Nettoyage du fichier uploadé
    fs.unlinkSync(file.path);

    // Si aucun élève n'a été inséré, on renvoie une erreur 422
    if (insertsReussis === 0) {
      return res.status(422).json({
        message: "L'importation a échoué pour toutes les lignes.",
        details: erreurs
      });
    }

    return res.status(200).json({
      message: `Importation réussie : ${insertsReussis} élèves inscrits.`,
      alertes: erreurs.length > 0 ? erreurs : null
    });

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

// Route pour l'inscription d'un enseignant
app.post('/api/Enseignants', async (req, res) => {
  const { name, firstName, email, phone, username, password, etablissementId } = req.body;

  try {
    // Vérifie s'il existe déjà un enseignant avec le même email dans le même établissement
    const [existingEmail] = await req.db.query(
      'SELECT id FROM enseignants WHERE email = ? AND etablissement_id = ?',
      [email, etablissementId]
    );
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'Un enseignant avec cet e-mail existe déjà dans cet établissement.' });
    }

    // Vérifie s'il existe déjà un enseignant avec le même nom d'utilisateur dans le même établissement
    const [existingUsername] = await req.db.query(
      'SELECT id FROM enseignants WHERE nom_utilisateur = ? AND etablissement_id = ?',
      [username, etablissementId]
    );
    if (existingUsername.length > 0) {
      return res.status(409).json({ error: 'Ce nom d’utilisateur est déjà utilisé dans cet établissement.' });
    }

    // Insérer les données
    const [result] = await req.db.query(
      'INSERT INTO enseignants (nom, prenom, email, telephone, mot_de_passe, nom_utilisateur, etablissement_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, firstName, email, phone, password, username, etablissementId]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      firstName,
      email,
      phone,
      username
    });
  } catch (error) {
    console.error('Erreur lors de la création de l’enseignant :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création de l’enseignant.' });
  }
});
app.post('/api/Enseignants/add', async (req, res) => {
  let {
    teacherId,
    class: classId,              // compat ancien format
    subject: subjectId,          // compat ancien format
    coefficient: coefficientId,  // compat ancien format

    classes,                     // ✅ nouveau
    subjects,                    // ✅ nouveau
    coefficients,                // ✅ nouveau

    etablissement: etablissementId,
    anneeScolaireId,

    // ✅ flags
    force,                 // autoriser plusieurs matières au même prof dans une même classe
    forceReplace,          // remplacer autre enseignant sur même matière/classe
    replaceTeacherSubject  // ✅ remplacer l'ancienne matière du PROF dans la classe par la nouvelle
  } = req.body;

  const toArray = (v) => Array.isArray(v) ? v : (v == null ? [] : [v]);
  const toInt = (v) => Number(v);

  teacherId = toInt(teacherId);
  etablissementId = toInt(etablissementId);
  anneeScolaireId = toInt(anneeScolaireId);

  force = !!force;
  forceReplace = !!forceReplace;
  replaceTeacherSubject = !!replaceTeacherSubject;

  // compat ancien format (single)
  if (classes == null && classId != null) classes = [classId];
  if (subjects == null && subjectId != null) subjects = [subjectId];
  if (coefficients == null && coefficientId != null) coefficients = [coefficientId];

  let classIds = toArray(classes).map(toInt);
  let subjectIds = toArray(subjects).map(toInt);
  let coefficientIds = toArray(coefficients).map(toInt);

  const isValidId = (x) => Number.isInteger(x) && x > 0;

  if (!isValidId(teacherId) || !isValidId(etablissementId) || !isValidId(anneeScolaireId)) {
    return res.status(400).json({ message: "teacherId, etablissementId et anneeScolaireId doivent être valides." });
  }

  if (classIds.length === 0 || subjectIds.length === 0 || coefficientIds.length === 0) {
    return res.status(400).json({ message: "Classes, matières et coefficients sont obligatoires." });
  }

  if (
    classIds.some(x => !isValidId(x)) ||
    subjectIds.some(x => !isValidId(x)) ||
    coefficientIds.some(x => !isValidId(x))
  ) {
    return res.status(400).json({ message: "Valeurs invalides (classe/matière/coefficient)." });
  }

  // ✅ Broadcast matière (si 1 matière pour plusieurs classes)
  if (subjectIds.length === 1 && classIds.length > 1) {
    subjectIds = Array(classIds.length).fill(subjectIds[0]);
  }

  // ✅ Coefficient : doit être exactement 1 par classe
  if (coefficientIds.length !== classIds.length) {
    return res.status(400).json({ message: "Tu dois choisir exactement un coefficient par classe." });
  }

  // Validation finale : matières doit être = classes
  if (subjectIds.length !== classIds.length) {
    return res.status(400).json({
      message: "Matières : choisis 1 matière (pour toutes les classes) ou une matière par classe."
    });
  }

  const conn = req.db;

  try {
    await conn.query("START TRANSACTION");

    for (let i = 0; i < classIds.length; i++) {
      const cId = classIds[i];
      const sId = subjectIds[i];
      const coefId = coefficientIds[i];

      // 1) même enseignant déjà sur même matière+classe+année (+ établissement)
      const [existingSameSubject] = await conn.query(
        `SELECT 1 FROM enseigner 
         WHERE Enseignants_id = ? AND Classes_id = ? AND matiere_id = ? AND Annee_scolaire_id = ? AND etablissement_id = ?
         LIMIT 1`,
        [teacherId, cId, sId, anneeScolaireId, etablissementId]
      );

      if (existingSameSubject.length > 0) {
        await conn.query("ROLLBACK");
        return res.status(409).json({
          type: "SAME_TEACHER_SAME_SUBJECT",
          message: `Ligne ${i + 1} : cet enseignant est déjà affecté à cette matière dans cette classe pour l'année scolaire sélectionnée.`
        });
      }

      // 2) même enseignant a déjà une AUTRE matière dans la classe+année (+ établissement)
      const [existingOtherSubjectRows] = await conn.query(
        `SELECT matiere_id FROM enseigner 
         WHERE Enseignants_id = ? AND Classes_id = ? AND Annee_scolaire_id = ? AND etablissement_id = ?
           AND matiere_id != ?
         LIMIT 1`,
        [teacherId, cId, anneeScolaireId, etablissementId, sId]
      );

      const teacherHasOtherSubject = existingOtherSubjectRows.length > 0;
      const oldSubjectId = teacherHasOtherSubject ? existingOtherSubjectRows[0].matiere_id : null;

      if (teacherHasOtherSubject) {
        // Si l'utilisateur veut remplacer l'ancienne matière du prof par la nouvelle
        if (replaceTeacherSubject) {
          // On supprime l'ancienne matière du prof dans cette classe/année/établissement
          await conn.query(
            `DELETE FROM enseigner 
             WHERE Enseignants_id = ? AND Classes_id = ? AND Annee_scolaire_id = ? AND etablissement_id = ?
               AND matiere_id = ?`,
            [teacherId, cId, anneeScolaireId, etablissementId, oldSubjectId]
          );
          // puis on continue (on va insérer la nouvelle plus bas)
        } else if (!force) {
          // sinon : avertissement => 409 et front propose "Autoriser" ou "Remplacer"
          await conn.query("ROLLBACK");
          return res.status(409).json({
            type: "TEACHER_ALREADY_HAS_SUBJECT_IN_CLASS",
            message: `Ligne ${i + 1} : cet enseignant a déjà une matière dans cette classe pour cette année. ` +
                     `(force=true pour autoriser plusieurs matières OU replaceTeacherSubject=true pour remplacer l'ancienne).`
          });
        }
        // si force=true => autoriser plusieurs matières, on continue sans supprimer
      }

      // 3) autre enseignant déjà sur cette matière dans cette classe+année (+ établissement)
      const [otherTeacherSameSubject] = await conn.query(
        `SELECT Enseignants_id FROM enseigner 
         WHERE Classes_id = ? AND matiere_id = ? AND Annee_scolaire_id = ? AND etablissement_id = ?
           AND Enseignants_id != ?
         LIMIT 1`,
        [cId, sId, anneeScolaireId, etablissementId, teacherId]
      );

      if (otherTeacherSameSubject.length > 0 && !forceReplace) {
        await conn.query("ROLLBACK");
        return res.status(409).json({
          type: "SUBJECT_ALREADY_ASSIGNED_TO_OTHER_TEACHER",
          message: `Ligne ${i + 1} : cette matière est déjà affectée à un autre enseignant dans cette classe. (forceReplace=true pour remplacer)`
        });
      }

      if (otherTeacherSameSubject.length > 0 && forceReplace) {
        await conn.query(
          `UPDATE enseigner
           SET Enseignants_id = ?, coefficient_id = ?
           WHERE Classes_id = ? AND matiere_id = ? AND Annee_scolaire_id = ? AND etablissement_id = ?`,
          [teacherId, coefId, cId, sId, anneeScolaireId, etablissementId]
        );
        continue;
      }

      // 4) insertion
      await conn.query(
        `INSERT INTO enseigner (Enseignants_id, Classes_id, matiere_id, coefficient_id, etablissement_id, Annee_scolaire_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [teacherId, cId, sId, coefId, etablissementId, anneeScolaireId]
      );
    }

    await conn.query("COMMIT");
    return res.status(200).json({ message: "Affectations enregistrées avec succès." });

  } catch (error) {
    try { await conn.query("ROLLBACK"); } catch (_) {}
    console.error("Erreur lors de l'ajout (multi) :", error);

    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        type: "DUPLICATE_DB",
        message: "Conflit: cette matière est déjà affectée dans cette classe pour cette année (doublon)."
      });
    }

    return res.status(500).json({ message: "Erreur interne du serveur. Veuillez réessayer plus tard." });
  }
});



// Dans ton fichier d'API backend (Express avec MySQL)

app.post('/api/Matieres', async (req, res) => {
  const { name , etablissementId} = req.body;

  if (!name || !etablissementId) {
    return res.status(400).json({ error: "Le nom de la matière est requis" });
  }

  try {
    // Insertion dans la table 'Matieres'
    const result = await req.db.query('INSERT INTO matieres (nom, etablissement_id) VALUES (?, ?)', [name,etablissementId]);
    res.status(201).json({ message: 'Matière ajoutée avec succès', id: result.insertId });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la matière:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'ajout de la matiere'});
    }
  });
// ✅ DELETE : supprimer une matière par son id (avec vérif table enseigner)
app.delete('/api/Matieres/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;

    // 1) Vérifier si la matière est déjà utilisée dans la table enseigner
    const [usedRows] = await conn.execute(
      `SELECT Enseignants_id, Classes_id, Annee_scolaire_id, etablissement_id
       FROM enseigner
       WHERE matiere_id = ?
       LIMIT 1`,
      [id]
    );

    if (usedRows.length > 0) {
      // ✅ matière déjà affectée -> on refuse la suppression
      return res.status(409).json({
        message: "Suppression refusée : cette matière est déjà affectée à une classe et un enseignant (table enseigner).",
        details: usedRows[0], // optionnel: utile pour debug
      });
    }

    // 2) Supprimer la matière (si pas utilisée)
    const [result] = await conn.execute(
      `DELETE FROM matieres WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Matière introuvable." });
    }

    res.json({ message: "Matière supprimée avec succès." });
  } catch (err) {
    console.error(err);

    // ✅ Cas fréquent : contrainte FK (matière utilisée ailleurs)
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      return res.status(409).json({
        message: "Impossible de supprimer : cette matière est déjà utilisée (affectations, notes, etc.).",
      });
    }

    res.status(500).json({ message: "Erreur lors de la suppression de la matière." });
  } finally {
    conn.release();
  }
});


// Route pour récupérer les enseignants (ID, nom, prénom)
app.get('/api/Enseignants/:etablissementId', async (req, res) => {
   const{etablissementId} = req.params
  try {
    const [teachers] = await req.db.query('SELECT id, nom, prenom FROM enseignants where etablissement_id = ?', [etablissementId]);
    res.status(200).json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route pour récupérer les classes (ID, nom)
//app.get('/api/classe', async (req, res) => {
  //try {
   // const [classes] = await req.db.query('SELECT id, nom FROM Classes');
    //res.status(200).json(classes);
  //} catch (error) {
   // console.error('Error fetching classes:', error);
   // res.status(500).json({ error: 'Internal server error' });
  //}
//});

// Route pour récupérer les classes (ID, nom)
app.get('/api/Coefficient', async (req, res) => {
  try {
    const [coefficient] = await req.db.query('SELECT id, valeur FROM coefficient');
    res.status(200).json(coefficient)
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route pour récupérer les matières (ID, nom)
app.get('/api/Matieres/:etablissementId', async (req, res) => {
  const{etablissementId} = req.params
  try {
    const [subjects] = await req.db.query('SELECT id, nom FROM matieres where etablissement_id = ?', [etablissementId]);
    res.status(200).json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/api/EnseignantAdmin/:etablissementId', async (req, res) => {
  try {
    const etablissementId = req.params.etablissementId;
    console.log("Début de la récupération des enseignants pour l'établissement ID:", etablissementId);

    // Récupérer uniquement les enseignants de l'établissement concerné
    const [enseignants] = await req.db.query(
      'SELECT * FROM enseignants WHERE etablissement_id = ?',
      [etablissementId]
    );
    console.log("Enseignants récupérés :", enseignants);

    // Récupérer les classes et matières enseignées par chaque enseignant
    const enseignantsWithDetails = await Promise.all(
      enseignants.map(async (enseignant) => {
        console.log(`Traitement des détails pour l'enseignant ID: ${enseignant.id}...`);

        const [classes] = await req.db.query(
          `SELECT classes.nom AS classe
           FROM enseigner
           JOIN classes ON classes.id = enseigner.classes_id
           WHERE enseigner.Enseignants_id = ?`,
          [enseignant.id]
        );
        console.log(`Classes enseignées pour l'enseignant ID: ${enseignant.id} -`, classes);

        const [matieres] = await req.db.query(
          `SELECT matieres.nom AS matiere
           FROM enseigner
           JOIN matieres ON matieres.id = enseigner.matiere_id
           WHERE enseigner.Enseignants_id = ?`,
          [enseignant.id]
        );
        console.log(`Matières enseignées pour l'enseignant ID: ${enseignant.id} -`, matieres);

        return {
          ...enseignant,
          classes: classes.map(c => c.classe),
          matieres: matieres.map(m => m.matiere),
        };
      })
    );

    console.log("Détails complets des enseignants :", enseignantsWithDetails);

    res.json(enseignantsWithDetails);
  } catch (error) {
    console.error("Erreur lors de la récupération des enseignants :", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/Enseignants/:id', async (req, res) => {
  const id = req.params.id;
  const { name, firstName, email, phone, username, password } = req.body;

  const updates = [];
  const values = [];

  if (name) {
    updates.push('nom = ?');
    values.push(name);
  }
  if (firstName) {
    updates.push('prenom = ?');
    values.push(firstName);
  }
  if (email) {
    updates.push('email = ?');
    values.push(email);
  }
  if (phone) {
    updates.push('telephone = ?');
    values.push(phone);
  }
  if (username) {
    updates.push('nom_utilisateur = ?');
    values.push(username);
  }
  if (password) {
    updates.push('mot_de_passe = ?');
    values.push(password);
  }

  if (updates.length > 0) {
    values.push(id);
    const sql = `UPDATE enseignants SET ${updates.join(', ')} WHERE id = ?`;
    try {
      await req.db.query(sql, values);
      res.json({ message: 'Teacher updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(400).json({ message: 'No data provided for update' });
  }
});

app.post('/api/loginEns', async (req, res) => {
  const { username, password, etablissement } = req.body;

  try {
    const [rows] = await db.query(
      `SELECT 
        enseignants.id AS enseignant_id, 
        enseignants.nom AS enseignant_nom, 
        enseignants.prenom AS enseignant_prenom, 
        enseignants.telephone AS enseignant_telephone, 
        enseignants.email AS enseignant_email, 
        enseignants.mot_de_passe AS enseignant_mot_de_passe, 
        enseignants.nom_utilisateur AS enseignant_nom_utilisateur, 
        enseignants.etablissement_id AS enseignant_etablissement_id,
        etablissement.id AS etablissement_id, 
        etablissement.nom AS etablissement_nom, 
        etablissement.departement_id, 
        etablissement.commune_id, 
        etablissement.statut, 
        etablissement.telephone AS etablissement_telephone, 
        etablissement.mail AS etablissement_mail
      FROM enseignants 
      INNER JOIN etablissement ON enseignants.etablissement_id = etablissement.id 
      WHERE (enseignants.nom_utilisateur = ? OR enseignants.email = ?) AND etablissement.id = ?`,
      [username, username, etablissement]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Identifiants ou établissement incorrect' });
    }

    const enseignant = rows[0];
    const storedPassword = enseignant.enseignant_mot_de_passe;

    const passwordOk =
      password.trim() === storedPassword.trim() ||
      (await bcrypt.compare(password.trim(), storedPassword));

    if (!passwordOk) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    // ✅ IMPORTANT : même secret que authenticateJWT
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET manquant côté serveur" });
    }

    const token = jwt.sign(
      {
        id: enseignant.enseignant_id,
        username: enseignant.enseignant_nom_utilisateur,
        etablissement: enseignant.enseignant_etablissement_id, // ✅ cohérent
        enseignant_nom: enseignant.enseignant_nom,
        enseignant_prenom: enseignant.enseignant_prenom,
        etablissement_nom: enseignant.etablissement_nom
      },
      JWT_SECRET, // ✅ FIX ICI (plus secretKey)
      { expiresIn: '1h' }
    );

    return res.json({ message: 'Connexion réussie', token });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});



// ✅ secret unique, pris depuis .env
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET manquant dans .env");
  process.exit(1);
}

// ✅ Middleware pour authentifier les requêtes
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  console.log("🔐 [AUTH] header =", authHeader);

  // 1) header manquant
  if (!authHeader) {
    return res.status(401).json({ message: "Token manquant" });
  }

  // 2) format attendu : Bearer <token>
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Format token invalide (Bearer requis)" });
  }

  const token = authHeader.split(" ")[1];

  // 3) token vide
  if (!token) {
    return res.status(401).json({ message: "Token manquant" });
  }

  // 4) vérification token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    console.log("🔍 [AUTH] verify err =", err?.name, err?.message);
    console.log("👤 [AUTH] decoded =", decoded);

    if (err) {
      const msg = err.name === "TokenExpiredError" ? "Token expiré" : "Token invalide";
      return res.status(403).json({ message: msg });
    }

    // decoded contient { id, etablissementId, role, iat, exp }
    req.user = decoded;
    next();
  });
};

// Génère un code à 6 chiffres
function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Route pour envoyer le code par email
app.post('/api/send-reset-code', async (req, res) => {
  const { email, etablissement } = req.body;

  try {
    const [rows] = await db.query(
      'SELECT * FROM enseignants WHERE email = ? AND etablissement_id = ?',
      [email, etablissement]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Aucun compte trouvé avec cet e-mail et établissement.' });
    }

    const resetCode = generateResetCode();

    // Supprime les anciens codes
    await db.query('DELETE FROM reset_codes WHERE email = ? ', [email]);

    // Insère le nouveau code
    await db.query('INSERT INTO reset_codes (email, code) VALUES (?, ?)', [email, resetCode]);

    // Envoie le mail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Code de réinitialisation de mot de passe',
      text: `Votre code de réinitialisation est : ${resetCode} (valable 10 minutes)`
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Code envoyé avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de l\'envoi du code.' });
  }
});


// Vérifier le code avec expiration de 10 minutes
app.post('/api/verify-reset-code', async (req, res) => {
  const { email, code, etablissement } = req.body;

  try {
    const [rows] = await db.query(
      `SELECT * FROM reset_codes 
       WHERE email = ? AND code = ? 
       AND created_at >= NOW() - INTERVAL 10 MINUTE`,
      [email, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Code invalide ou expiré.' });
    }

    const [enseignant] = await db.query(
      'SELECT id FROM enseignants WHERE email = ? AND etablissement_id = ?',
      [email, etablissement]
    );

    if (enseignant.length === 0) {
      return res.status(404).json({ message: 'Compte enseignant introuvable.' });
    }

    res.status(200).json({ message: 'Code valide.', enseignantId: enseignant[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la vérification du code.' });
  }
});

// Mise à jour du mot de passe
app.post('/api/update-password', async (req, res) => {
  const { enseignantId, newPassword } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      'UPDATE enseignants SET mot_de_passe = ? WHERE id = ?',
      [hashedPassword, enseignantId]
    );

    // Supprime les codes associés à l'email de cet enseignant
    await db.query(`
      DELETE FROM reset_codes 
      WHERE email = (SELECT email FROM enseignants WHERE id = ?)
    `,
      [enseignantId]
    );

    res.status(200).json({ message: 'Mot de passe mis à jour avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du mot de passe.' });
  }
});

// API pour récupérer les matières et les classes
app.get('/api/enseignant/matieres-classes', authenticateJWT, async (req, res) => {
  const enseignantId = req.user.id; // 🔥 depuis le JWT

  try {
    const query = `
      SELECT 
        m.id AS matiere_id, m.nom AS matiere,
        c.id AS classe_id, c.nom AS classe
      FROM enseigner e
      JOIN matieres m ON e.matiere_id = m.id
      JOIN classes c ON e.Classes_id = c.id
      WHERE e.Enseignants_id = ?
    `;

    const [rows] = await db.query(query, [enseignantId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur du serveur" });
  }
});

app.get('/api/classes/:classeId/eleves', async (req, res) => {
  try {
    const classId = req.params.classeId;

    // Requête SQL pour récupérer les id, noms et prénoms des élèves
    const [rows] = await req.db.execute(
      'SELECT id, nom, prenom FROM eleve WHERE classe_id = ?',
      [classId]
    );

    // Vérification si des élèves ont été trouvés
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Aucun élève trouvé pour cette classe.' });
    }

    // Retourner les résultats
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des élèves:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des élèves.' });
  }
});



app.delete('/api/Enseignants/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await req.db.query('DELETE FROM enseignants WHERE id = ?', [id]);
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



app.post('/api/Enseignants', (req, res) => {
  const { name, firstName, email, phone, username, password } = req.body;
  const sql = 'INSERT INTO enseignants (nom, prenom, email, phone, nom_utilisateur, mot_de_passe) VALUES (?, ?, ?, ?, ?, ?)';
  
  pool.query(sql, [name, firstName, email, phone, username, password], (error, results) => {
    if (error) return res.status(500).json({ error });
    res.json({ message: 'Teacher created successfully', id: results.insertId });
  });
});


// Endpoint pour générer le fichier Excel
app.post('/api/export/excel/:classeId', async (req, res) => {
  const classeId = req.params.classeId;

  try {
    // Récupération des données des élèves et tri par ordre alphabétique
    const [students] = await req.db.query(
      'SELECT nom, prenom FROM eleve WHERE classe_id = ? ORDER BY nom ASC, prenom ASC',
      [classeId]
    );

    // Création d'un nouveau workbook
    const workbook = XLSX.utils.book_new();
    const worksheetData = [
      ['Nom', 'Prénom', 'Note']  // En-têtes de colonnes
    ];

    // Ajout des données des élèves triées
    students.forEach(student => {
      worksheetData.push([student.nom, student.prenom, '']); // Colonne pour entrer les notes manuellement
    });

    // Création de la feuille de calcul
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Ajout de la feuille de calcul au workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, `Classe_${classeId}`);

    // Définir le chemin du fichier temporaire
    const filePath = path.join(__dirname, `Classe_${classeId}.xlsx`);

    // Écrire le fichier Excel dans le système de fichiers
    XLSX.writeFile(workbook, filePath);

    // Configuration des en-têtes HTTP pour le téléchargement du fichier Excel
    res.setHeader('Content-Disposition', `attachment; filename=Classe_${classeId}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Envoyer le fichier via un flux
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Supprimer le fichier temporaire après envoi
    fileStream.on('end', () => {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Erreur lors de la suppression du fichier temporaire', err);
        }
      });
    });

  } catch (error) {
    console.error('Erreur lors de la génération du fichier Excel:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

app.post('/api/upload/excel', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).send({ message: 'Aucun fichier uploadé.' });
    }

    const { typeNote, semestreId, matiereId, classeId, etablissementId, anneeScolaireId } = req.body;
    const updateField = mapTypeNoteToField(typeNote);
    if (!updateField) {
      return res.status(400).send({ message: 'Type de note non valide.' });
    }

    const workbook = XLSX.readFile(file.path);
    const sheetNameList = workbook.SheetNames;
    if (sheetNameList.length === 0) {
      return res.status(400).send({ message: 'Le fichier Excel ne contient aucune feuille.' });
    }

    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]]);
    const elevesNonTrouves = [];
    const elevesDejaNote = [];
    const elevesAjoutes = [];

    for (const row of data) {
      const Nom = row.Nom?.trim();
      const Prenom = row['Prénom']?.trim();
      const Note = row.Note !== undefined ? row.Note : null;

      if (!Nom || !Prenom) {
        console.warn(`⚠️ Élève ignoré (Nom ou Prénom manquant):`, row);
        continue;
      }

      const [eleves] = await db.query(
        'SELECT id FROM eleve WHERE nom = ? AND prenom = ? AND classe_id = ? AND etablissement_id = ?',
        [Nom, Prenom, classeId, etablissementId]
      );

      if (eleves.length === 0) {
        elevesNonTrouves.push(`${Nom} ${Prenom}`);
        continue;
      }

      const eleveId = eleves[0].id;

      // Vérifie si l'élève a déjà une note pour ce typeNote
      const [notesExistantes] = await db.query(
        `SELECT id FROM note 
         WHERE Eleves_id = ? AND ${updateField} IS NOT NULL
         AND Semestre_id = ? AND matieres_id = ? 
         AND classe_id = ? AND etablissement_id = ? 
         AND Annee_scolaire_id = ?`,
        [eleveId, semestreId, matiereId, classeId, etablissementId, anneeScolaireId]
      );

      if (notesExistantes.length > 0) {
        elevesDejaNote.push(`${Nom} ${Prenom}`);
        continue;
      }

      const noteValue = isNaN(Note) || Note === "" ? null : parseFloat(Note);

      await db.query(
        `INSERT INTO note (${updateField}, Eleves_id, Semestre_id, matieres_id, classe_id, etablissement_id, Annee_scolaire_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE ${updateField} = VALUES(${updateField})`,
        [noteValue, eleveId, semestreId, matiereId, classeId, etablissementId, anneeScolaireId]
      );

      elevesAjoutes.push(`${Nom} ${Prenom}`);
    }

    fs.unlinkSync(file.path);

    const messageParts = [`✅ Import terminé.`];

    if (elevesAjoutes.length > 0) {
      messageParts.push(`Notes ajoutées pour : ${elevesAjoutes.join(', ')}.`);
    }
    if (elevesDejaNote.length > 0) {
      messageParts.push(`Ignorés (déjà notés) : ${elevesDejaNote.join(', ')}.`);
    }
    if (elevesNonTrouves.length > 0) {
      messageParts.push(`Non trouvés : ${elevesNonTrouves.join(', ')}.`);
    }

    return res.send({
      message: messageParts.join(' '),
      details: {
        ajoutes: elevesAjoutes,
        dejaNote: elevesDejaNote,
        nonTrouves: elevesNonTrouves
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'importation des données Excel', error);
    res.status(500).send({ message: 'Erreur lors de l\'importation' });
  }
});


// API pour l'upload du fichier Excel et mise à jour des notes
/*app.post('/api/upload/excel22', upload.single('file'), async (req, res) => {
  try {
    const file = req.file; // Fichier uploadé
    if (!file) {
      return res.status(400).send('Aucun fichier uploadé.');
    }

    const { typeNote, semestreId, matiereId, classeId, etablissementId, anneeScolaireId } = req.body; // Récupérer les paramètres envoyés par le formulaire

    // Valider le type de note
    const updateField = mapTypeNoteToField(typeNote);
    if (!updateField) {
      return res.status(400).send('Type de note non valide.');
    }

    // Lire le fichier Excel
    const workbook = XLSX.readFile(file.path);
    const sheetNameList = workbook.SheetNames;

    if (sheetNameList.length === 0) {
      return res.status(400).send('Le fichier Excel ne contient aucune feuille.');
    }

    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]]);
    
    // Vérifiez que les colonnes nécessaires existent
    if (!data.every(row => row.Nom && row.Prénom && 'Note' in row)) {
      return res.status(400).send('Le fichier Excel doit contenir des colonnes "Nom", "Prénom" et "Note".');
    }

    // Parcourir chaque ligne (chaque étudiant) du fichier Excel
    for (const row of data) {
      const { Nom, Prénom, Note } = row; // Ajustement des noms de colonnes

      // Vérifiez que les champs sont valides et que la note est un nombre
      if (!Nom || !Prénom || !Note || isNaN(Note)) {
        console.warn(`Données invalides ignorées : ${JSON.stringify(row)}`);
        continue; // Ignorer la ligne si les données sont invalides
      }

      // 1. Récupérer l'ID de l'élève à partir de son nom et prénom
      const [eleve] = await db.query('SELECT id FROM Eleve WHERE nom = ? AND prenom = ?', [Nom, Prénom]);

      if (eleve.length > 0) {
        const eleveId = eleve[0].id;

        // 2. Insérer ou mettre à jour la note dans la table Note pour l'élève
        await db.query(
          `INSERT INTO toutesNotes (${updateField}, Eleves_id, Semestre_id, matieres_id, classe_id, etablissement_id, Annee_scolaire_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE ${updateField} = VALUES(${updateField})`,
          [Note, eleveId, semestreId, matiereId, classeId, etablissementId, anneeScolaireId]
        );
      } else {
        console.error(`Élève non trouvé : ${Nom} ${Prénom}`);
      }
    }

    // Supprimer le fichier uploadé après traitement
    fs.unlinkSync(file.path);

    res.send('Données importées avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'importation des données Excel', error);
    res.status(500).send('Erreur lors de l\'importation');
  }
});*/

app.get('/api/absents', async (req, res) => {
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


// Endpoint pour récupérer les notes d'une classe et d'une matière spécifiques
app.get('/api/notes/:classeId/:subjectId/:semesterId/:anneeScolaireId', async (req, res) => {
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
app.post('/api/deleteNote', async (req, res) => {
  const { eleveId, semestreId, anneeScolaireId, classeId, etablissementId, noteType } = req.body;

  console.log('📤 Requête reçue pour suppression de note :', req.body);

  if (!eleveId || !semestreId || !anneeScolaireId || !classeId || !etablissementId || !noteType) {
      console.error('❌ Données manquantes:', { eleveId, semestreId, anneeScolaireId, classeId, etablissementId, noteType });
      return res.status(400).json({ message: 'Données manquantes pour la suppression de la note.' });
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
app.post('/api/notes/save', async (req, res) => {
  const { classeId, subjectId, semesterId, notes, etablissementId, anneeScolaireId } = req.body;

  // Valider que les données nécessaires sont présentes
  if (!classeId || !subjectId || !semesterId || !notes || !etablissementId || !Array.isArray(notes) || !anneeScolaireId) {
    return res.status(400).json({ message: 'Données manquantes ou invalides' });
  }

  try {
    const connection = await req.db.getConnection(); // Récupérer une connexion à partir du pool

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
  }
});

app.get('/api/semesters/:etablissementId', async (req, res) => {
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


app.post('/api/presence', async (req, res) => {
  const presences = req.body;

  let connection;

  try {
    connection = await req.db.getConnection();
    await connection.beginTransaction();

    for (let presence of presences) {
      const { date, status, eleveId, subjectId, classeId, semesterName, etablissementId, anneeScolaireId } = presence;

      const [semesterResult] = await connection.query(
        `SELECT id FROM semestre WHERE nom = ? AND etablissement_id = ?`,
        [semesterName, etablissementId]
      );

      if (!semesterResult.length) {
        throw new Error(`Semestre non trouvé pour le nom: ${semesterName}`);
      }

      const semesterId = semesterResult[0].id;

      await connection.query(
        `INSERT INTO presence (date, statut, eleve_id, matieres_id, classe_id, semestre_id, etablissement_id, Annee_scolaire_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [date, status, eleveId, subjectId, classeId, semesterId, etablissementId, anneeScolaireId]
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'Présences enregistrées avec succès.' });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des présences :', error);
    if (connection) await connection.rollback();
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'enregistrement des présences.' });
  } finally {
    if (connection) connection.release();
  }
});

// ✅ Route sauvegarde conduite SANS heure
app.post('/api/save/conduct', async (req, res) => {
  const { semester, records, etablissementId, anneeScolaireId } = req.body;

  let connection;

  try {
    connection = await req.db.getConnection();
    await connection.beginTransaction();

    // 1) Trouver semestre_id à partir du nom + établissement
    const [rows] = await connection.query(
      'SELECT id FROM semestre WHERE nom = ? AND etablissement_id = ?',
      [semester, etablissementId]
    );

    if (rows.length === 0) {
      throw new Error(`Semestre avec le nom "${semester}" introuvable.`);
    }

    const semesterId = rows[0].id;

    // 2) Insert + update total_hours
    for (const record of records) {
      const { auteur, punition, date, motif, studentId } = record;

      // Insertion (SANS heure)
      const [insertResult] = await connection.query(
        `INSERT INTO punitions
         (auteur, punition, date, motif, eleve_id, semestre_id, etablissement_id, Annee_scolaire_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [auteur, punition, date, motif, studentId, semesterId, etablissementId, anneeScolaireId]
      );

      const punitionId = insertResult.insertId;

      // Somme des heures pour cet élève dans ce semestre (et année si tu veux)
      const [sumResult] = await connection.query(
        `SELECT COALESCE(SUM(punition), 0) AS totalHours
         FROM punitions
         WHERE eleve_id = ?
           AND semestre_id = ?
           AND etablissement_id = ?
           AND Annee_scolaire_id = ?`,
        [studentId, semesterId, etablissementId, anneeScolaireId]
      );

      const totalHours = sumResult[0].totalHours;

      await connection.query(
        'UPDATE punitions SET total_hours = ? WHERE id = ?',
        [totalHours, punitionId]
      );
    }

    await connection.commit();
    res.status(200).json({ message: 'Données de conduite sauvegardées avec succès.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erreur lors de la sauvegarde des données de conduite :', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde des données de conduite.' });
  } finally {
    if (connection) connection.release();
  }
});


// ✅ Somme des heures SANS heure
app.get('/api/punitions/somme-heures/:studentId/:anneeScolaireId', async (req, res) => {
  try {
    const { studentId, anneeScolaireId } = req.params;

    const [result] = await db.query(
      `SELECT COALESCE(SUM(punition), 0) AS totalHours
       FROM punitions
       WHERE eleve_id = ? AND Annee_scolaire_id = ?`,
      [studentId, anneeScolaireId]
    );

    res.json({ totalHours: result[0].totalHours });
  } catch (error) {
    console.error('Erreur lors de la récupération des heures de punition :', error);
    res.status(500).send('Erreur serveur');
  }
});

app.post("/api/parent/login", async (req, res) => {
  const { username, password, etablissement } = req.body;

  if (!username || !etablissement) {
    return res.status(400).json({ message: "Champs requis manquants." });
  }

  const ident = String(username).trim().toLowerCase();
  const etabId = Number(etablissement);

  let connection;
  try {
    connection = await db.getConnection();

    const [rows] = await connection.query(
      `SELECT id, email, nom_utilisateur, mot_de_passe, etablissement_id
       FROM parents
       WHERE etablissement_id = ?
         AND (
           LOWER(email) = ?
           OR LOWER(nom_utilisateur) = ?
         )
       LIMIT 1`,
      [etabId, ident, ident]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    const parent = rows[0];

    // ✅ CAS DEMANDÉ : compte non activé (mot_de_passe NULL)
    if (parent.mot_de_passe === null) {
      return res.status(403).json({
        message: "Votre compte n'est pas activé. Veuillez l'activer pour continuer.",
        code: "ACCOUNT_NOT_ACTIVATED",
        parentId: parent.id,
        etablissementId: parent.etablissement_id,
      });
    }

    // ✅ Compte activé => mot de passe obligatoire
    if (!password) {
      return res.status(400).json({ message: "Mot de passe requis." });
    }

    const ok = await bcrypt.compare(String(password), parent.mot_de_passe);
    if (!ok) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    const token = jwt.sign(
      {
        id: parent.id,
        etablissementId: parent.etablissement_id,
        role: "parent",
      },
      process.env.JWT_SECRET || "SECRET_DEV_A_CHANGER",
      { expiresIn: "7d" }
    );

    return res.status(200).json({ token });
  } catch (err) {
    console.error("Erreur login parent:", err);
    return res.status(500).json({ message: "Erreur serveur." });
  } finally {
    try {
      if (connection) connection.release();
    } catch (e) {}
  }
});




app.post('/api/send', async (req, res) => {
  const { email, etablissement } = req.body;

  if (!email || !etablissement) {
    return res.status(400).json({ success: false, message: 'Email et établissement requis.' });
  }

  try {
    // Vérifie si le parent existe avec email et établissement (par ID)
    const [rows] = await db.query(
      'SELECT id FROM parents WHERE LOWER(email) = LOWER(?) AND etablissement_id = ?',
      [email, etablissement]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Aucun parent trouvé avec cet email et établissement.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000); // Code à 6 chiffres

    // Enregistre le code
    await db.query(
      'INSERT INTO reset_codes (email, code, created_at) VALUES (?, ?, NOW())',
      [email, code]
    );

    // Envoie l'email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Code de réinitialisation EchoEducation',
      text: `Votre code de réinitialisation est : ${code}`
    });

    res.json({ success: true, message: 'Code envoyé avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de l’envoi du code.' });
  }
});
app.post('/api/parent-verify-reset-code', async (req, res) => {
  const { email, code, etablissement } = req.body;

  if (!email || !code || !etablissement) {
    return res.status(400).json({ success: false, message: 'Email, code et établissement requis.' });
  }

  try {
    const [rows] = await db.query(
      `SELECT P.id FROM reset_codes R
       JOIN parents P ON LOWER(P.email) = LOWER(R.email)
       JOIN etablissement E ON P.etablissement_id = E.id
       WHERE LOWER(R.email) = LOWER(?)
       AND R.code = ?
       AND E.id = ?
       AND R.created_at >= (NOW() - INTERVAL 10 MINUTE)
       ORDER BY R.created_at DESC
       LIMIT 1`,
      [email, code, etablissement]  // etablissement est bien un ID ici
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Code invalide ou expiré.' });
    }

    const parentId = rows[0].id;
    res.json({ success: true, message: 'Code valide.', parentId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});
app.post('/api/parent-update-password', async (req, res) => {
  const { parentId, newPassword, etablissement } = req.body;
  console.log("🔧 Reçu dans /api/update-password :", { parentId, newPassword, etablissement });
  if (!parentId || !newPassword || !etablissement) {
    return res.status(400).json({ success: false, message: 'Champs manquants.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log("🔐 Mot de passe hashé :", hashedPassword);

    const [result] = await db.query(
      'UPDATE parents SET mot_de_passe = ? WHERE id = ? AND etablissement_id = ?',
      [hashedPassword, parentId, etablissement]
    );
  
    console.log("📊 Résultat de la requête UPDATE :", result);

    if (result.affectedRows === 0) {
       console.log("⚠️ Aucun mot de passe mis à jour. Mauvais ID ou établissement.");
      return res.status(400).json({
        success: false,
        message: 'Échec de la mise à jour du mot de passe. ID parent ou établissement invalide.'
      });
    }
   console.log("✅ Mot de passe mis à jour !");
    return res.status(200).json({
      success: true,
      message: 'Mot de passe mis à jour avec succès.'
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur.'
    });
  }
});

// ✅ Route : récupérer les enfants du parent connecté
app.get("/api/parent/children", authenticateJWT, async (req, res) => {
  try {
    console.log("✅ [children] req.user.id =", req.user?.id);

    const [rows] = await db.query(
      `SELECT 
        e.id, 
        e.prenom, 
        e.nom, 
        c.nom AS class
       FROM eleve e
       JOIN classes c ON e.Classe_id = c.id
       WHERE e.Parents_id = ?`,
      [req.user.id]
    );

    return res.json({ children: rows });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des enfants:", error);
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

// Route pour obtenir les données de présence en fonction de l'élève et de l'année scolaire
app.get('/api/presence', async (req, res) => {
  try {
    const { childId, anneeScolaireId } = req.query;

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
app.post('/api/presence/:id/motif', async (req, res) => {
  const { id } = req.params;
  const { motif } = req.body;

  if (!motif) {
    return res.status(400).send('Le motif est requis');
  }

  try {
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
app.get('/api/incidents', async (req, res) => {
  const { eleveId, anneeScolaireId } = req.query;

  // Vérifier que eleveId est fourni
  if (!eleveId) {
    return res.status(400).json({ error: "eleveId est requis" });
  }

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



// Route pour ajouter une nouvelle permission
app.post('/api/permissions/:childId', async (req, res) => {
  const { date, motif, duree, contact, childId, etablissementId, anneeScolaireId } = req.body;

  if (!date || !motif || !duree || !contact || !etablissementId || !anneeScolaireId) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
  }

  try {
    const [result] = await req.db.query(
      'INSERT INTO permission (date, motif, duree, contact, eleve_id, etablissement_id, Annee_scolaire_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [date, motif, duree, contact, childId, etablissementId, anneeScolaireId]
    );
    res.status(201).json({ message: 'Permission ajoutée avec succès', id: result.insertId });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/// Route pour récupérer les permissions par enfant et établissement
app.get('/api/permissions/:childId/:etablissementId/:anneeScolaireId', async (req, res) => {
  const { childId, etablissementId, anneeScolaireId } = req.params; // Récupération des IDs de l'enfant et de l'établissement depuis les paramètres d'URL

  try {
    // Requête SQL pour récupérer les permissions d'un enfant spécifique dans un établissement donné
    const [rows] = await req.db.query(
      'SELECT * FROM permission WHERE eleve_id = ? AND etablissement_id = ? AND  Annee_scolaire_id = ?',
      [childId, etablissementId, anneeScolaireId ]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
// --- Mailer ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
function generate6DigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 chiffres
}

async function sendActivationEmail(toEmail, code) {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const mailOptions = {
    from,
    to: toEmail,
    subject: "EchoEducation - Code d'activation",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0b2e4a;">
        <h2 style="margin:0 0 10px;">Activation de votre compte</h2>
        <p>Voici votre code de vérification :</p>
        <div style="font-size:22px; font-weight:800; letter-spacing:3px; padding:12px 16px; background:#eaf2ff; border:1px solid rgba(25,118,210,.2); border-radius:10px; display:inline-block;">
          ${code}
        </div>
        <p style="margin-top:14px;">Ce code expire dans <b>10 minutes</b>.</p>
        <p style="color:#607d8b; font-size:12px;">Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

// =====================================================
// 1) CHECK EMAIL => si trouvé => envoi code
// =====================================================
app.post("/api/parents/check-email", async (req, res) => {
  const { email, etablissementId } = req.body;

  if (!email || !etablissementId) {
    return res.status(400).json({ success: false, message: "Email et établissement requis." });
  }

  try {
    const cleanEmail = String(email).trim().toLowerCase();
    const etabId = Number(etablissementId);

    const [rows] = await db.query(
      `SELECT id, mot_de_passe
       FROM parents
       WHERE LOWER(email) = ? AND etablissement_id = ?
       LIMIT 1`,
      [cleanEmail, etabId]
    );

    if (!rows || rows.length === 0) {
      return res.json({ success: true, exists: false, message: "Email ou établissement non trouvé." });
    }

    const parent = rows[0];

    // Optionnel : si déjà activé
    if (parent.mot_de_passe !== null) {
      return res.json({
        success: true,
        exists: true,
        alreadyActive: true,
        message: "Ce compte est déjà activé. Connectez-vous.",
      });
    }

    // Générer code + hash + expiration
    const code = generate6DigitCode();
    const codeHash = await bcrypt.hash(code, 10);

    // Expire dans 10 minutes
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      `UPDATE parents
       SET activation_code_hash = ?, activation_code_expires = ?
       WHERE id = ?`,
      [codeHash, expires, parent.id]
    );

    // Envoyer mail
    await sendActivationEmail(cleanEmail, code);

    return res.json({
      success: true,
      exists: true,
      codeSent: true,
      message: "Code envoyé par e-mail.",
    });
  } catch (error) {
    console.error("Erreur check-email:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

// =====================================================
// 2) VERIFY CODE
// =====================================================
app.post("/api/parents/verify-code", async (req, res) => {
  const { email, etablissementId, code } = req.body;

  if (!email || !etablissementId || !code) {
    return res.status(400).json({ success: false, message: "Champs requis manquants." });
  }

  try {
    const cleanEmail = String(email).trim().toLowerCase();
    const etabId = Number(etablissementId);
    const cleanCode = String(code).trim();

    const [rows] = await db.query(
      `SELECT id, activation_code_hash, activation_code_expires
       FROM parents
       WHERE LOWER(email) = ? AND etablissement_id = ?
       LIMIT 1`,
      [cleanEmail, etabId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "Compte introuvable." });
    }

    const parent = rows[0];

    if (!parent.activation_code_hash || !parent.activation_code_expires) {
      return res.status(400).json({ success: false, message: "Aucun code actif. Demandez un nouveau code." });
    }

    const now = new Date();
    if (now > new Date(parent.activation_code_expires)) {
      return res.status(400).json({ success: false, message: "Code expiré. Demandez un nouveau code." });
    }

    const ok = await bcrypt.compare(cleanCode, parent.activation_code_hash);
    if (!ok) {
      return res.status(400).json({ success: false, message: "Code invalide." });
    }

    return res.json({ success: true, verified: true, parentId: parent.id });
  } catch (error) {
    console.error("Erreur verify-code:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

// =====================================================
// 3) SET PASSWORD (activation finale) => nécessite code
// =====================================================
app.post("/api/parents/set-password", async (req, res) => {
  const { email, password, etablissementId, code } = req.body;

  if (!email || !password || !etablissementId || !code) {
    return res.status(400).json({ success: false, message: "Champs requis manquants." });
  }

  try {
    const cleanEmail = String(email).trim().toLowerCase();
    const etabId = Number(etablissementId);
    const cleanCode = String(code).trim();

    const [rows] = await db.query(
      `SELECT id, activation_code_hash, activation_code_expires
       FROM parents
       WHERE LOWER(email) = ? AND etablissement_id = ?
       LIMIT 1`,
      [cleanEmail, etabId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "Email ou établissement introuvable." });
    }

    const parent = rows[0];

    if (!parent.activation_code_hash || !parent.activation_code_expires) {
      return res.status(400).json({ success: false, message: "Aucun code actif. Demandez un nouveau code." });
    }

    const now = new Date();
    if (now > new Date(parent.activation_code_expires)) {
      return res.status(400).json({ success: false, message: "Code expiré. Demandez un nouveau code." });
    }

    const ok = await bcrypt.compare(cleanCode, parent.activation_code_hash);
    if (!ok) {
      return res.status(400).json({ success: false, message: "Code invalide." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `UPDATE parents
       SET mot_de_passe = ?,
           activation_code_hash = NULL,
           activation_code_expires = NULL
       WHERE id = ?`,
      [hashedPassword, parent.id]
    );

    if (result.affectedRows > 0) {
      return res.json({ success: true, message: "Compte activé avec succès." });
    }

    return res.status(500).json({ success: false, message: "Activation échouée." });
  } catch (error) {
    console.error("Erreur set-password:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});


// Route pour supprimer une permission
app.delete('/api/permissions/:permissionId', async (req, res) => {
  const { permissionId } = req.params;

  try {
    const [result] = await db.query('DELETE FROM permission WHERE id = ?', [permissionId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Permission non trouvée' });
    }

    res.json({ message: 'Permission supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


// Route pour mettre à jour le statut d'une permission
app.put('/api/permissions/:id', async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;

  try {
    const [result] = await req.db.query(
      'UPDATE permission SET statut = ? WHERE id = ?',
      [statut, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).send('Permission non trouvée');
    }

    res.send('Statut de la permission mis à jour avec succès');
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la permission:', error);
    res.status(500).send('Erreur serveur');
  }
});

// Route pour récupérer les détails d'un élève et le nom de sa classe par ID
app.get('/api/students/:eleveId', async (req, res) => {
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
app.get('/api/eleves/:classId/:anneeScolaireId', async (req, res) => {
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


app.get('/api/classes/:classId/eleves', async (req, res) => {
  const classId = req.params.classId; // Récupère le classId directement

  // Assurez-vous que classId est bien une chaîne de caractères ou un nombre
  if (!classId) {
    return res.status(400).send('Class ID is required');
  }

  const sql = 'SELECT id, nom, prenom FROM eleve WHERE classe_id = ?';

  try {
    const [results] = await req.db.query(sql, [classId]);
    res.json(results);
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/presence/:studentId/:semestre/:anneeScolaireId', async (req, res) => {
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
app.get('/api/incident', async (req, res) => {
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

app.post('/api/incidents', async (req, res) => {
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
app.get('/api/presenceidd/:etablissementId/:anneeScolaireId?', async (req, res) => {
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



//api a revoir particulierement
app.get('/api/eleves/:studentId', async (req, res) => {
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
//api pour notification administration dashbord
// Endpoint pour le nom de la classe
// Endpoint pour récupérer les informations d'une classe par son ID
app.get('/api/classes/:classId', async (req, res) => {
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
//api pour notification administration dashbord
app.get('/api/parentid/:parentId', async (req, res) => {
  const  parentId  = req.params.parentId;
  try {
    const [results] = await req.db.query('SELECT * FROM parents WHERE id = ?', [parentId]);
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ message: "Le parent n'existe pas" });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des informations du parent:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
//api a revoir
app.get('/api/classe/:etablissementId', async (req, res) => {
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

//api pour notification administration dashbord
app.get('/api/eleve/:studentId', async (req, res) => {
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

// Route pour récupérer les matières par ID de classe
app.get('/api/matiere/:classId', async (req, res) => {
  const classId = req.params.classId;

  if (!classId) {
    return res.status(400).json({ error: 'L\'ID de la classe est requis.' });
  }

  try {
    const [results] = await req.db.query(`
      SELECT m.id, m.nom 
      FROM matieres m
      JOIN enseigner e ON m.id = e.matiere_id
      WHERE e.Classes_id = ?
    `, [classId]);

    res.json(results);
  } catch (error) {
    console.error('Erreur lors de la récupération des matières:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des matières.' });
  }
});

// Route pour ajouter un programme
app.post('/api/programme', async (req, res) => {
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
app.get('/api/programmes/:classId', async (req, res) => {
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
app.delete('/api/programme', async (req, res) => {
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


app.post('/api/addActivity', async (req, res) => {
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


// Route pour récupérer les notifications d'un établissement et d'un parent spécifiques
app.get("/api/notificationed/:parentId/:etablissementId/:anneeScolaireId", async (req, res) => {
  const { parentId, etablissementId, anneeScolaireId } = req.params;

  console.log("[1] ➡ Requête reçue pour récupérer les notifications");
  console.log("[1] 🔹 Parent ID :", parentId);
  console.log("[1] 🔹 Établissement ID :", etablissementId);
  console.log("[1] 🔹 Année scolaire ID :", anneeScolaireId);

  if (!parentId || !etablissementId || !anneeScolaireId) {
    return res.status(400).json({ message: "Paramètres requis manquants." });
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

    // Si aucun élève ou aucune absence, on renvoie vide sans 404 (UX mieux)
    if (!rows.length) {
      return res.json({ notifications: [], alertMessages: [] });
    }

    // ✅ Enregistrer automatiquement comme "vu" les absences non lues
    const toInsert = rows
      .filter((n) => Number(n.is_read) === 0)
      .map((n) => [parentId, n.presence_id]);

    if (toInsert.length > 0) {
      await req.db.query(
        `INSERT IGNORE INTO absenceVueParents (parent_id, presence_id) VALUES ?`,
        [toInsert]
      );
    }

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

    // ✅ Réponse finale
    return res.json({
      notifications: rows.map((r) => ({
        presence_id: r.presence_id,
        date: r.date,
        statut: r.statut,
        motif: r.motif,
        eleve_id: r.eleve_id,
        studentName: r.studentName,
        studentPrenom: r.studentPrenom,
        is_read: Boolean(Number(r.is_read)),
        viewed_at: r.viewed_at,
      })),
      alertMessages,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des notifications :", error);
    return res.status(500).json({ message: "Erreur serveur lors de la récupération des données." });
  }
});

app.get('/api/getActivities/:classeId/:subjectId/:anneeScolaireId', async (req, res) => {
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
app.get('/api/programme/:childId', async (req, res) => {
  const { childId } = req.params;

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


/*app.get('/api/notificationed/:parentId/:etablissementId/:anneeScolaireId', async (req, res) => {
  const { parentId, etablissementId, anneeScolaireId } = req.params;

  if (!parentId || !etablissementId || !anneeScolaireId) {
    return res.status(400).json({ message: 'Paramètres requis manquants.' });
  }

  try {
    // Récupérer les élèves du parent dans cet établissement et cette année scolaire
    const [students] = await req.db.execute(
      `SELECT id, nom, prenom 
       FROM Eleve 
       WHERE Parents_id = ? AND etablissement_id = ? `,
      [parentId, etablissementId]
    );

    if (students.length === 0) {
      return res.status(404).json({ message: 'Aucun élève trouvé pour ce parent dans cet établissement et cette année scolaire.' });
    }

    let notifications = [];

    for (let student of students) {
      const [rows] = await req.db.execute(
        `SELECT p.date, p.heures, p.statut, p.motif, e.nom AS studentName, e.prenom AS studentPrenom
         FROM Presence p
         JOIN Eleve e ON p.eleve_id = e.id
         WHERE p.eleve_id = ? 
           AND p.etablissement_id = ?
           AND p.Annee_scolaire_id = ?
         ORDER BY p.date DESC, p.heures DESC`,
        [student.id, etablissementId, anneeScolaireId]
      );

      if (rows.length > 0) {
        notifications = notifications.concat(rows);
      }
    }

    const today = moment().format('YYYY-MM-DD');
    const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
    const dayBeforeYesterday = moment().subtract(2, 'days').format('YYYY-MM-DD');

    let alertMessages = [];

    notifications.forEach(n => {
      if (n.statut === 'absent') {
        const notificationDate = moment(n.date).format('YYYY-MM-DD');

        if (notificationDate === today) {
          alertMessages.push(`Votre enfant ${n.studentName} ${n.studentPrenom} est absent aujourd'hui à ${n.heures}.`);
        } else if (notificationDate === yesterday) {
          alertMessages.push(`Votre enfant ${n.studentName} ${n.studentPrenom} était absent hier à ${n.heures}.`);
        } else if (notificationDate === dayBeforeYesterday) {
          alertMessages.push(`Votre enfant ${n.studentName} ${n.studentPrenom} était absent avant-hier à ${n.heures}.`);
        } else {
          alertMessages.push(`Votre enfant ${n.studentName} ${n.studentPrenom} était absent le ${n.date} à ${n.heures}.`);
        }
      }
    });

    res.json({ notifications, alertMessages });

  } catch (error) {
    console.error('Erreur lors de la récupération des notifications :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des données.' });
  }
});*/


app.get('/api/tests/:childId', async (req, res) => {
  const { childId } = req.params;

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

app.get('/api/classes/:classId/:anneeScolaireId/details', async (req, res) => {
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


  app.get('/api/classe-details', async (req, res) => {
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

  app.delete("/api/delete-note", async (req, res) => {
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
  app.get('/api/bulletin', async (req, res) => {
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

// Route pour récupérer le statut de l'établissement
app.get('/api/etablissementStatut', async (req, res) => {
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
app.post('/api/sauvegarde-bulletin', async (req, res) => {
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

  const connection = await db.getConnection();

  try {
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
    await connection.rollback();
    console.error('🔥 Erreur lors de la sauvegarde du bulletin :', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde du bulletin.' });
  } finally {
    connection.release();
    console.log('🔚 Connexion à la base de données libérée.');
  }
});

// Endpoint pour récupérer les semestres et les notes d'un élève en une seule requête
app.get('/api/eleve-notes', async (req, res) => {
  const { childId, anneeScolaireId } = req.query;

  if (!childId) {
    return res.status(400).json({ error: 'childId est requis.' });
  }

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


// API pour récupérer les bulletins, semestres, matières, coefficients et informations d'un élève
// API pour récupérer les bulletins, semestres, matières, coefficients et informations d'un élève
app.get('/api/bulletined/:childId/:anneeScolaireId', async (req, res) => {
  const { childId, anneeScolaireId } = req.params;

  // Vérifier si childId est fourni
  if (!childId) {
    return res.status(400).json({ error: "childId est requis" });
  }

  // Si anneeScolaireId n'est pas défini, retourner un tableau vide
  if (!anneeScolaireId) {
    return res.json([]);
  }

  try {
    const [results] = await req.db.query(`
      SELECT 
        e.nom AS eleveNom, 
        e.prenom AS elevePrenom,
        c.nom AS classeNom,
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
      JOIN classes c ON c.id = e.classe_id
      JOIN semestre s ON s.id = b.semestre_id
      JOIN matieres m ON m.id = b.matiere_id
      JOIN coefficient coef ON coef.id = b.coef_id
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




app.get('/api/communes', async (req, res) => {
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



app.post('/api/etablissements', async (req, res) => {
  const { nom, departement_id, commune_id, statut, telephone, mail, nom_utilisateur, mot_de_passe } = req.body;

  // Validation des données
  if (!nom || !nom_utilisateur || !mot_de_passe) {
    return res.status(400).json({ error: 'Nom, nom d\'utilisateur et mot de passe sont requis.' });
  }

  try {
    // Ajout de l'établissement dans la table Etablissement
    const [result] = await db.query(
      'INSERT INTO etablissement (nom, departement_id, commune_id, statut, telephone, mail, nom_utilisateur, mot_de_passe) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nom, departement_id, commune_id, statut, telephone, mail, nom_utilisateur, mot_de_passe]
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

app.post('/api/loginEtablissement', async (req, res) => {
  const { nom_utilisateur, mot_de_passe } = req.body;

  // Log des données reçues
  console.log('Données reçues pour la connexion :', req.body);

  // Vérifier si les champs requis sont fournis
  if (!nom_utilisateur || !mot_de_passe) {
    console.log('Champs manquants :', { nom_utilisateur, mot_de_passe });
    return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis.' });
  }

  try {
    // Connexion à la base de données
    if (!db) {
      console.error('Pas de connexion à la base de données');
      return res.status(500).json({ message: 'Erreur de connexion à la base de données.' });
    }

    // Log avant la requête SQL
    console.log('Exécution de la requête SQL pour trouver l\'utilisateur :', nom_utilisateur);

    // Requête SQL pour trouver l'utilisateur
    const [rows] = await db.query('SELECT * FROM etablissement WHERE nom_utilisateur = ?', [nom_utilisateur]);

    // Log du résultat de la requête SQL
    console.log('Résultat de la requête SQL :', rows);

    // Vérification si l'utilisateur existe
    if (rows.length === 0) {
      console.log('Nom d’utilisateur incorrect :', nom_utilisateur);
      return res.status(404).json({ message: 'Nom d’utilisateur incorrect' });
    }

    const etablissement = rows[0];

    // Log de l'établissement trouvé
    console.log('Établissement trouvé :', etablissement);

    // Comparaison des mots de passe
    console.log('Mot de passe fourni :', mot_de_passe);
    console.log('Mot de passe stocké :', etablissement.mot_de_passe);

    if (mot_de_passe !== etablissement.mot_de_passe) {
      console.log('Mot de passe incorrect.');
      return res.status(401).json({ message: 'Mot de passe incorrect.' });
    }

    // Générer un token JWT
    const token = jwt.sign(
      {
        etablissementId: etablissement.id,
        nom: etablissement.nom,
      },
      secretKey,
      { expiresIn: '24h' } // Durée de validité du token
    );

    // Log avant l'envoi de la réponse
    console.log('Connexion réussie, envoi de la réponse avec le token.');

    // Envoyer le token et les informations de l'établissement
    res.json({
      message: 'Connexion réussie.',
      token,
      etablissement: {
        id: etablissement.id,
        nom: etablissement.nom,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la connexion :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// API OpenAI: Exemple d'utilisation pour une activité éducative
app.post('/api/assistant', async (req, res) => {
  const { studentFirstName, studentLastName, subjectName, className, activity, activityDate, userMessage } = req.body;

  const apiKey = process.env.OPENAI_API_KEY;

  if (!studentFirstName || !studentLastName || !subjectName || !className || !activity || !activityDate || !userMessage) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }

  const prompt = `
    Élève: ${studentFirstName} ${studentLastName}
    Matière: ${subjectName}
    Classe: ${className}
    Activité réalisée: ${activity}
    Date de l'activité: ${activityDate}
    Question: ${userMessage}

    Bonjour GPT, veuillez aider cet élève à mieux comprendre l'activité ou répondre à sa question.
  `;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({ reply: response.data.choices[0].message.content });
  } catch (error) {
    console.error('Erreur avec OpenAI:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Erreur avec le service OpenAI.',
    });
  }
});


app.get('/api/assistants/:childId', async (req, res) => {
  const { childId } = req.params;
  
  try {
    console.log("Requête API reçue pour l'élève ID :", childId);

    // Vérification 1 : Récupération de l'ID de la classe pour l'élève
    const [eleveRows] = await db.query(
      'SELECT classe_id FROM eleve WHERE id = ?',
      [childId]
    );

    if (eleveRows.length === 0) {
      console.log("Aucune classe trouvée pour l'élève ID :", childId);
      return res.status(404).json({ message: "Classe introuvable pour cet élève." });
    }

    const classId = eleveRows[0].classe_id;
    console.log("Classe ID récupéré :", classId);

    // Vérification 2 : Récupération des matières, activités et dates pour la classe
    const [testsRows] = await db.query(
      `SELECT t.date, t.activite, m.nom AS matiereNom
       FROM tests t
       JOIN matieres m ON t.matière_id = m.id
       WHERE t.classe_id = ?`,
      [classId]
    );

    if (testsRows.length === 0) {
      console.log("Aucun test trouvé pour la classe ID :", classId);
      return res.status(404).json({ message: "Aucun test trouvé pour cette classe." });
    }

    console.log("Données des tests récupérées :", testsRows);

    // Transformation des données pour l'interface
    const assistants = testsRows.map(test => ({
      date: test.date,
      activity: test.activite,
      subject: test.matiereNom,
    }));

    console.log("Données finales des assistants envoyées :", assistants);

    // Envoi des données à l'interface
    res.status(200).json(assistants);
  } catch (error) {
    console.error("Erreur lors de la récupération des données pour l'élève :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});


app.post("/api/upload-photos-zip", upload.single("zipFile"), async (req, res) => {
  const { classeId, etablissementId } = req.body;

  if (!classeId || !etablissementId) {
    return res.status(400).json({ error: "classeId et etablissementId sont requis" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier ZIP fourni" });
  }

  const zipFilePath = req.file.path;

  // extensions autorisées
  const allowedExt = new Set([".jpg", ".jpeg", ".png", ".webp"]);

  // normalisation robuste (accents + séparateurs)
  const normalize = (s) => {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // retire accents
      .trim()
      .replace(/[\s-]+/g, "_") // espaces/tirets -> underscore
      .replace(/_+/g, "_"); // underscores multiples
  };

  // récupère le "base name" du fichier zip (sans dossiers)
  const getBaseNameNoExt = (entryName) => {
    // entryName peut être "folder/a/b/KOUADIO_Jean.jpg"
    const base = path.basename(entryName);
    const parsed = path.parse(base);
    return normalize(parsed.name);
  };

  try {
    const zip = new admZip(zipFilePath);
    const zipEntries = zip.getEntries();

    // Récupération des élèves
    const [eleves] = await req.db.query(
      "SELECT id, nom, prenom FROM eleve WHERE classe_id = ? AND etablissement_id = ?",
      [classeId, etablissementId]
    );

    if (!eleves || eleves.length === 0) {
      if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);
      return res.status(404).json({ error: "Aucun élève trouvé pour cette classe/établissement" });
    }

    // Construire une map { pattern -> eleveId }
    // patterns acceptés : nom_prenom et prenom_nom
    const patternToEleveId = new Map();
    for (const e of eleves) {
      const nom = normalize(e.nom);
      const prenom = normalize(e.prenom);

      const p1 = `${nom}_${prenom}`;
      const p2 = `${prenom}_${nom}`;

      patternToEleveId.set(p1, e.id);
      patternToEleveId.set(p2, e.id);

      // bonus: si DB contient double prénom/nom, on garde aussi versions sans underscores multiples
      patternToEleveId.set(p1.replace(/_/g, ""), e.id);
      patternToEleveId.set(p2.replace(/_/g, ""), e.id);
    }

    const targetDir = path.join(__dirname, "uploads", "photos", String(classeId));
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    let matchCount = 0;
    let ignored = 0;
    const unmatched = [];
    const updatedIds = new Set();

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const ext = path.extname(entry.entryName).toLowerCase();
      if (!allowedExt.has(ext)) {
        ignored++;
        continue;
      }

      const baseName = getBaseNameNoExt(entry.entryName);
      if (!baseName) {
        ignored++;
        continue;
      }

      // stratégie matching :
      // 1) match direct map (nom_prenom)
      // 2) match "contient" pour tolérer extra texte
      let foundId = patternToEleveId.get(baseName);

      if (!foundId) {
        // enlever underscores pour matcher "kouadiojean"
        const compact = baseName.replace(/_/g, "");
        foundId = patternToEleveId.get(compact);
      }

      if (!foundId) {
        // fallback : contains sur patterns
        // (moins performant mais acceptable si zip pas énorme)
        for (const [pattern, id] of patternToEleveId.entries()) {
          if (baseName.includes(pattern) || baseName.replace(/_/g, "").includes(pattern.replace(/_/g, ""))) {
            foundId = id;
            break;
          }
        }
      }

      if (!foundId) {
        // on garde un échantillon des fichiers non reconnus
        if (unmatched.length < 100) unmatched.push(path.basename(entry.entryName));
        continue;
      }

      // Nom final standardisé
      const newFileName = `eleve_${foundId}${ext}`;
      const fullPath = path.join(targetDir, newFileName);

      // Écriture fichier
      fs.writeFileSync(fullPath, entry.getData());

      // URL publique (selon ton static)
      const publicUrl = `/uploads/photos/${classeId}/${newFileName}`;

      await req.db.query("UPDATE eleve SET photo_url = ? WHERE id = ?", [publicUrl, foundId]);

      matchCount++;
      updatedIds.add(foundId);
    }

    // nettoyage
    if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);

    return res.json({
      success: true,
      message: "Traitement terminé",
      totalZip: zipEntries.length,
      identifies: matchCount,
      ignored,
      unmatched,
      updatedIds: Array.from(updatedIds),
    });
  } catch (error) {
    console.error("Erreur ZIP:", error);
    if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);
    return res.status(500).json({ error: "Erreur lors du traitement du ZIP" });
  }
});

// API de vérification et récupération des données pour Cartes Scolaires
app.get('/api/cartes-scolaires/verification/:classeId/:etablissementId', async (req, res) => {
  const { classeId, etablissementId } = req.params;

  try {
    // 1. Récupérer les infos de l'établissement et de l'année scolaire active
    const [infosGenerales] = await req.db.query(`
      SELECT e.nom as etablissementNom, a.nom_annee as anneeNom
      FROM etablissement e
      LEFT JOIN annee_scolaire a ON e.id = a.etablissement_id
      WHERE e.id = ? AND a.statut = 'active' LIMIT 1
    `, [etablissementId]);

    // 2. Récupérer les élèves de la classe
    const [eleves] = await req.db.query(`
      SELECT id, nom,date_naissance, prenom, photo_url 
      FROM eleve 
      WHERE classe_id = ? AND etablissement_id = ?
      ORDER BY nom ASC, prenom ASC
    `, [classeId, etablissementId]);

    // 3. Logique de vérification : est-ce que TOUT LE MONDE a une photo ?
    // On considère que si au moins un élève n'a pas de photo, on doit proposer l'import.
    const tousOntUnePhoto = eleves.length > 0 && eleves.every(el => el.photo_url !== null && el.photo_url !== '');

    res.json({
      tousOntUnePhoto,
      etablissement: infosGenerales ? infosGenerales.etablissementNom : "Établissement",
      anneeScolaire: infosGenerales ? infosGenerales.anneeNom : "N/A",
      eleves: eleves
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de la vérification des données" });
  }
});
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
