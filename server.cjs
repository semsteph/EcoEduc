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
      'SELECT * FROM Annee_scolaire WHERE nom_annee = ? AND etablissement_id = ?',
      [annee, etablissementId]
    );

    if (existingYear.length > 0) {
      console.warn("Année scolaire déjà existante :", existingYear);
      return res.status(409).json({ message: "Cette année scolaire existe déjà pour cet établissement." });
    }

    // Insérer la nouvelle année scolaire dans la base de données
    console.log("Insertion de la nouvelle année scolaire dans la base de données...");
    await db.query(
      'INSERT INTO Annee_scolaire (nom_annee, etablissement_id) VALUES (?, ?)',
      [annee, etablissementId]
    );

    console.log("Nouvelle année scolaire ajoutée avec succès :", { annee, etablissementId });
    res.status(201).json({ message: "Année scolaire ajoutée avec succès." });
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'année scolaire :", error);
    res.status(500).json({ message: "Une erreur est survenue lors de l'ajout de l'année scolaire." });
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
       FROM Annee_scolaire 
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
// API pour clôturer une année scolaire
// API pour clôturer une année scolaire
app.post('/api/cloture-annee-scolaire', async (req, res) => {
  const { etablissementId, anneeScolaireId } = req.body;

  if (!etablissementId || !anneeScolaireId) {
    return res.status(400).json({ message: 'Les IDs de l’établissement et de l’année scolaire sont requis.' });
  }

  try {
    const connection = await db.getConnection();
    console.log(`Étape 1 : Connexion à la base de données réussie.`);

    console.log("Récupération des bulletins, élèves et classes...");
    const [bulletins] = await connection.execute(
      `SELECT b.moyAn, b.decision, e.id AS eleveId, e.nom AS eleveNom, e.prenom AS elevePrenom, 
              c.id AS classeId, c.nom AS classeNom
       FROM Bulletin b
       JOIN Eleve e ON b.eleve_id = e.id
       JOIN Classes c ON e.classe_id = c.id
       WHERE b.etablissement_id = ? AND b.Annee_scolaire_id = ?`,
      [etablissementId, anneeScolaireId]
    );

    console.log(`Étape 2 : Bulletins récupérés, nombre d'élèves : ${bulletins.length}.`);

    const [classes] = await connection.execute(
      `SELECT id, nom FROM Classes WHERE etablissement_id = ?`,
      [etablissementId]
    );

    console.log(`Étape 3 : Classes récupérées, nombre de classes : ${classes.length}.`);
    console.log("Classes récupérées:", classes);

    const ordreClasses = ['6eme', '5eme', '4eme', '3eme', '2nd', '1ere', 'Tle'];
    console.log("Étape 4 : Classement des classes par ordre...");
 
    const regexClasse = /^(\d*\D+?)\s*(\d*)$/;

    const classesTriees = classes.sort((a, b) => {
      const matchA = a.nom.match(regexClasse);
      const matchB = b.nom.match(regexClasse);

      if (!matchA || !matchB) {
        console.log(`Nom de classe incorrect pour tri: ${a.nom}, ${b.nom}`);
        return 0;
      }

      const [_, radicaleA, prefixeA] = matchA;
      const [__, radicaleB, prefixeB] = matchB;

      return ordreClasses.indexOf(radicaleA) - ordreClasses.indexOf(radicaleB) ||
             (prefixeA || '0').localeCompare(prefixeB || '0');
    });

    console.log("Étape 5 : Classes triées.");
    console.log("Classes triées:", classesTriees);

    const classesMap = {};
    classesTriees.forEach(classe => {
      const match = classe.nom.match(regexClasse);
      if (match) {
        const [_, radicale, prefixe] = match;
        if (!classesMap[radicale]) classesMap[radicale] = {};
        classesMap[radicale][prefixe || ''] = classe;
      }
    });

    console.log("Étape 6 : Mapping des classes par radical et préfixe.");
    console.log("Mapping des classes par radicale et préfixe:", classesMap);

    console.log("Début de la réorganisation des élèves...");
    for (const bulletin of bulletins) {
      const decision = bulletin.decision;
      const matchClasse = bulletin.classeNom.match(regexClasse);
      if (!matchClasse) continue;

      const [_, radicaleActuelle, prefixeActuel] = matchClasse;
      const indexClasse = ordreClasses.indexOf(radicaleActuelle);

      if (decision === 'Admis' && indexClasse < ordreClasses.length - 1) {
        const nouvelleRadicale = ordreClasses[indexClasse + 1];
        const nouvelleClasse = classesMap[nouvelleRadicale]?.[prefixeActuel || ''];

        if (nouvelleClasse) {
          console.log(`Élève ${bulletin.eleveNom} ${bulletin.elevePrenom} passe de ${bulletin.classeNom} à ${nouvelleClasse.nom}.`);
          await connection.execute(
            `UPDATE Eleve SET classe_id = ? WHERE id = ?`,
            [nouvelleClasse.id, bulletin.eleveId]
          );
        } else {
          console.log(`Aucune classe supérieure trouvée pour l'élève ${bulletin.eleveNom} ${bulletin.elevePrenom}, classe actuelle: ${bulletin.classeNom}.`);
        }
      } else {
        console.log(`Élève ${bulletin.eleveNom} ${bulletin.elevePrenom} reste dans sa classe actuelle.`);
      }
    }

    console.log("Étape 8 : Clôture de l'année scolaire...");
    await connection.execute(
      `UPDATE Annee_scolaire SET statut = 'Clôturée' WHERE id = ?`,
      [anneeScolaireId]
    );

    console.log("Étape 9 : Suppression des données de la table Enseigner...");
    await connection.execute(
      `DELETE FROM Enseigner WHERE etablissement_id = ?`,
      [etablissementId]
    );
    console.log("Suppression effectuée avec succès.");

    connection.release();
    console.log("Étape 10 : Année scolaire clôturée avec succès.");
    res.status(200).json({ message: "Année scolaire clôturée avec succès." });
  } catch (error) {
    console.error("Erreur lors de la clôture de l'année scolaire :", error);
    res.status(500).json({ message: "Une erreur s'est produite lors de la clôture de l'année scolaire." });
  }
});



// Route pour ajouter une nouvelle classe
app.post('/api/Classes', async (req, res) => {
  const { nom, promotion_id, etablissement_id } = req.body; // Récupérer le nom de la classe, l'ID de la promotion et de l'établissement
  if (nom && promotion_id && etablissement_id) {
    try {
      const [result] = await req.db.query(
        'INSERT INTO Classes (nom, Promotion_id, etablissement_id) VALUES (?, ?, ?)', // Insertion avec l'ID de la promotion et de l'établissement
        [nom, promotion_id, etablissement_id]
      );
      const newClass = { id: result.insertId, nom };
      res.status(201).json(newClass);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la classe', error);
      res.status(500).json({ error: 'Une erreur est survenue lors de l\'ajout de la classe.' });
    }
  } else {
    res.status(400).json({ error: 'Le nom de la classe, l\'ID de la promotion et l\'ID de l\'établissement sont requis.' });
  }
});

app.get('/api/Promotions', async (req, res) => {
  try {
    const [promotions] = await req.db.query('SELECT id, nom FROM Promotion');
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
    const result = await req.db.query('INSERT INTO Semestre (nom, etablissement_id) VALUES (?, ?)', [nom, etablissement_id]);
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
    const [rows] = await req.db.query('SELECT * FROM Classes WHERE id = ?', [id]);
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
  const etablissementId = req.params.etablissementId; // Récupérer l'ID de l'établissement depuis les paramètres de requête

  // Vérifier si l'ID de l'établissement est défini et est un nombre
  if (!etablissementId || isNaN(etablissementId)) {
    return res.status(400).json({ error: 'L\'ID de l\'établissement est requis et doit être un nombre.' });
  }

  try {
    const [results] = await req.db.query(`
      SELECT c.id, c.nom AS class_name, p.nom AS promotion_name, 
             (SELECT COUNT(*) FROM Eleve e WHERE e.classe_id = c.id) AS studentCount
      FROM Classes c
      JOIN Promotion p ON c.Promotion_id = p.id
      WHERE c.etablissement_id = ?  -- Filtrer par ID d'établissement
      ORDER BY p.nom, c.nom
    `, [etablissementId]); // Passer l'ID de l'établissement dans la requête

    console.log('Données récupérées:', results); // Vérifiez les données récupérées

    // Vérifiez que results est un tableau
    if (Array.isArray(results)) {
      // Regrouper les classes par promotion
      const classesByPromotion = results.reduce((acc, classe) => {
        const { promotion_name, class_name, studentCount } = classe;
        if (!acc[promotion_name]) {
          acc[promotion_name] = [];
        }
        acc[promotion_name].push({
          id: classe.id,
          name: class_name,
          studentCount: studentCount
        });
        return acc;
      }, {});

      // Retourner les données au format JSON
      res.json(classesByPromotion);
    } else {
      throw new Error('Les données récupérées ne sont pas un tableau.');
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des classes :', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des classes' });
  }
});


// Route pour mettre à jour une classe par ID
app.put('/api/Classes/:id', async (req, res) => {
  const { id } = req.params;
  const { nom, promotion_id, } = req.body;

  if (nom && promotion_id) {
    try {
      const [result] = await req.db.query(
        'UPDATE Classes SET nom = ?, Promotion_id = ? WHERE id = ?',
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
app.delete('/api/Classes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Vérifier le nombre d'élèves associés à la classe
    const [countRows] = await req.db.query(
      'SELECT COUNT(*) AS studentCount FROM Eleve WHERE classe_id = ?',
      [id]
    );

    const studentCount = countRows[0].studentCount;

    if (studentCount > 0) {
      return res.status(400).json({ error: 'Impossible de supprimer cette classe car elle contient des élèves.' });
    }

    // Supprimer la classe si elle est vide
    const [result] = await req.db.query('DELETE FROM Classes WHERE id = ?', [id]);

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
      FROM Conduite co
      JOIN Classes c ON co.classe_id = c.id
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
    const insertQuery = 'INSERT INTO Conduite (note_conduite, classe_id, semestre_id, Annee_scolaire_id) VALUES (?, ?, ?, ?)';
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
app.get('/api/permissions/:etablissementId/:anneeScolaireId?', async (req, res) => {
  const { etablissementId, anneeScolaireId } = req.params;

  // Si anneeScolaireId n'est pas défini, on retourne un tableau vide
  if (!anneeScolaireId) {
    return res.json([]);
  }

  try {
    // Requête SQL pour récupérer les permissions filtrées par établissement et année scolaire
    const [rows] = await req.db.query(
      'SELECT * FROM Permission WHERE etablissement_id = ? AND annee_scolaire_id = ?',
      [etablissementId, anneeScolaireId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({ message: 'Erreur serveur' });
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
      'INSERT INTO Parents (nom, prenom, contact, email, nom_utilisateur, mot_de_passe, etablissement_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
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
      'SELECT id, nom AS name, prenom AS firstName, email, contact, nom_utilisateur AS username FROM Parents WHERE etablissement_id = ?',
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
      'UPDATE Parents SET nom = ?, prenom = ?, email = ?, contact = ?, nom_utilisateur = ?, mot_de_passe = ? WHERE id = ?',
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
app.delete('/api/Parents/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Vérifier si des élèves sont associés à ce parent
    const [eleves] = await req.db.query('SELECT nom, prenom FROM Eleve WHERE Parents_id = ?', [id]);

    if (eleves.length > 0) {
      // Si des élèves sont associés, renvoyer un message d'erreur avec les noms des élèves
      const eleveNames = eleves.map(eleve => `${eleve.prenom} ${eleve.nom}`).join(', ');
      return res.status(400).json({
        error: `Impossible de supprimer ce parent car il a au moins un élève associé : ${eleveNames}. Veuillez modifier cet élève avant de supprimer ce parent.`
      });
    }

    // Si aucun élève n'est associé, supprimer le parent
    const [result] = await req.db.query('DELETE FROM Parents WHERE id = ?', [id]);

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
      'INSERT INTO Eleve (nom, prenom, date_naissance, sexe, classe_id, Parents_id, etablissement_id, Annee_scolaire_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nom, prenom, dateNaissance, sexe, classe, parentId, etablissementId, anneeScolaireId]
    );

    // Récupération des informations de l'élève ajouté
    const [rows] = await req.db.query(
      'SELECT id, nom, prenom, date_naissance AS dateNaissance, sexe, classe_id AS classe, Parents_id AS parentId FROM Eleve WHERE id = ?',
      [result.insertId] // Utilisez l'ID de l'insertion pour récupérer les données
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erreur lors de l\'inscription de l\'élève:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});


// Route pour l'inscription d'un enseignant
app.post('/api/Enseignants', async (req, res) => {
  const { name, firstName, email, phone, username, password, etablissementId } = req.body;

  try {
    // Insérer les données dans la base de données
    const [result] = await req.db.query(
      'INSERT INTO Enseignants (nom, prenom, email, telephone, mot_de_passe, nom_utilisateur, etablissement_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, firstName, email, phone, password, username, etablissementId]
    );

    // Répondre avec les informations de l'enseignant (sans le mot de passe)
    res.status(201).json({
      id: result.insertId,
      name,
      firstName,
      email,
      phone,
      username
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ error: 'Erreur interne lors de la création de l\'enseignant' });
  }
});

// Route pour ajouter un enseignant avec une seule classe et une seule matière
app.post('/api/Enseignants/add', async (req, res) => {
  const { teacherId, class: classId, subject: subjectId, coefficient:coefficientId, etablissement:etablissementId, anneeScolaireId} = req.body;

  // Vérifier que classId et subjectId ne sont pas null et sont des nombres
  if (!classId || !subjectId || !coefficientId || isNaN(classId) || isNaN(subjectId) || isNaN(coefficientId) || isNaN(etablissementId) || isNaN(anneeScolaireId)) {
    return res.status(400).json({ error: 'Class and subject and coefficient must be selected and valid' });
  }

  try {
    // Ajouter la relation dans la table Enseigner
    await req.db.query(
      'INSERT INTO Enseigner (Enseignants_id, Classes_id, matiere_id, coefficient_id, etablissement_id, Annee_scolaire_id) VALUES (?, ?, ?, ?, ?, ?)',
      [teacherId, classId, subjectId, coefficientId, etablissementId, anneeScolaireId]
    );
    
    res.status(200).json({ message: 'Teacher added successfully with class and subject' });
  } catch (error) {
    console.error('Error adding teacher:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    const result = await req.db.query('INSERT INTO Matieres (nom, etablissement_id) VALUES (?, ?)', [name,etablissementId]);
    res.status(201).json({ message: 'Matière ajoutée avec succès', id: result.insertId });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la matière:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'ajout de la matiere'});
    }
  });

// Route pour récupérer les enseignants (ID, nom, prénom)
app.get('/api/Enseignants/:etablissementId', async (req, res) => {
   const{etablissementId} = req.params
  try {
    const [teachers] = await req.db.query('SELECT id, nom, prenom FROM Enseignants where etablissement_id = ?', [etablissementId]);
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
    const [coefficient] = await req.db.query('SELECT id, valeur FROM Coefficient');
    res.status(200).json(coefficient);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route pour récupérer les matières (ID, nom)
app.get('/api/Matieres/:etablissementId', async (req, res) => {
  const{etablissementId} = req.params
  try {
    const [subjects] = await req.db.query('SELECT id, nom FROM Matieres where etablissement_id = ?', [etablissementId]);
    res.status(200).json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/api/Enseignant', async (req, res) => {
  try {
    console.log("Début de la récupération des enseignants...");

    const [enseignants] = await req.db.query('SELECT * FROM Enseignants');
    console.log("Enseignants récupérés :", enseignants);

    // Récupérer les classes et matières enseignées par chaque enseignant
    const enseignantsWithDetails = await Promise.all(
      enseignants.map(async (enseignant) => {
        console.log(`Traitement des détails pour l'enseignant ID: ${enseignant.id}...`);

        const [classes] = await req.db.query(
          `SELECT Classes.nom AS classe
           FROM Enseigner
           JOIN Classes ON Classes.id = Enseigner.classes_id
           WHERE Enseigner.Enseignants_id = ?`,
          [enseignant.id]
        );
        console.log(`Classes enseignées pour l'enseignant ID: ${enseignant.id} -`, classes);

        const [matieres] = await req.db.query(
          `SELECT Matieres.nom AS matiere
           FROM Enseigner
           JOIN Matieres ON Matieres.id = Enseigner.matiere_id
           WHERE Enseigner.Enseignants_id = ?`,
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
    const sql = `UPDATE Enseignants SET ${updates.join(', ')} WHERE id = ?`;
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
  console.log('Données reçues:', { username, password, etablissement });

  try {
    const [rows] = await db.query(
      `SELECT 
        Enseignants.id AS enseignant_id, 
        Enseignants.nom AS enseignant_nom, 
        Enseignants.prenom AS enseignant_prenom, 
        Enseignants.telephone AS enseignant_telephone, 
        Enseignants.email AS enseignant_email, 
        Enseignants.mot_de_passe AS enseignant_mot_de_passe, 
        Enseignants.nom_utilisateur AS enseignant_nom_utilisateur, 
        Enseignants.etablissement_id AS enseignant_etablissement_id,
        Etablissement.id AS etablissement_id, 
        Etablissement.nom AS etablissement_nom, 
        Etablissement.departement_id, 
        Etablissement.commune_id, 
        Etablissement.statut, 
        Etablissement.telephone AS etablissement_telephone, 
        Etablissement.mail AS etablissement_mail
      FROM Enseignants 
      INNER JOIN Etablissement ON Enseignants.etablissement_id = Etablissement.id 
      WHERE Enseignants.nom_utilisateur = ? AND Etablissement.nom = ?`, 
      [username, etablissement]
    );
    console.log('Résultat de la requête SQL:', rows);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Nom d’utilisateur ou établissement incorrect' });
    }

    const enseignant = rows[0];

    if (password.trim() !== enseignant.enseignant_mot_de_passe.trim()) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    // Génération du token JWT avec les informations supplémentaires
    const token = jwt.sign(
      { 
        id: enseignant.enseignant_id, 
        username: enseignant.enseignant_nom_utilisateur, 
        etablissement: enseignant.etablissement_id,
        enseignant_nom: enseignant.enseignant_nom,
        enseignant_prenom: enseignant.enseignant_prenom,
        etablissement_nom: enseignant.etablissement_nom
      }, 
      secretKey, 
      { expiresIn: '1h' }
    );

    res.json({ message: 'Connexion réussie', token });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});
// Middleware pour authentifier les requêtes
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Token manquant' });
  }
  
  const token = authHeader.split(' ')[1];
  
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// API pour récupérer les matières et les classes
app.get('/api/enseignant/matieres-classes/:id', authenticateJWT, async (req, res) => {
  const enseignantId = req.params.id;

  try {
    const query = `
      SELECT 
        m.id AS matiere_id, m.nom AS matiere,
        c.id AS classe_id, c.nom AS classe
      FROM 
        Enseigner e
      JOIN 
        Matieres m ON e.matiere_id = m.id
      JOIN 
        Classes c ON e.Classes_id = c.id
      WHERE 
        e.Enseignants_id = ?
    `;

    const [rows] = await db.query(query, [enseignantId]);
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});
app.get('/api/classes/:classId/eleves', async (req, res) => {
  try {
    const classId = req.params.classId;

    // Requête SQL pour récupérer les id, noms et prénoms des élèves
    const [rows] = await req.db.execute(
      'SELECT id, nom, prenom FROM Eleve WHERE classe_id = ?',
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
    await req.db.query('DELETE FROM Enseignants WHERE id = ?', [id]);
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



app.post('/api/Enseignants', (req, res) => {
  const { name, firstName, email, phone, username, password } = req.body;
  const sql = 'INSERT INTO Enseignants (nom, prenom, email, phone, nom_utilisateur, mot_de_passe) VALUES (?, ?, ?, ?, ?, ?)';
  
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
      'SELECT nom, prenom FROM Eleve WHERE classe_id = ? ORDER BY nom ASC, prenom ASC',
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
      return res.status(400).send('Aucun fichier uploadé.');
    }

    const { typeNote, semestreId, matiereId, classeId, etablissementId, anneeScolaireId } = req.body;
    const updateField = mapTypeNoteToField(typeNote);
    if (!updateField) {
      return res.status(400).send('Type de note non valide.');
    }

    const workbook = XLSX.readFile(file.path);
    const sheetNameList = workbook.SheetNames;
    if (sheetNameList.length === 0) {
      return res.status(400).send('Le fichier Excel ne contient aucune feuille.');
    }

    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]]);
    
    console.log('Nom du fichier:', file.path);
    console.log('Données Excel:', data);

    for (const row of data) {
      const { Nom, Prénom } = row;
      const Note = row.Note !== undefined ? row.Note : null; // Gérer les notes absentes

      if (!Nom || !Prénom) {
        console.warn(`⚠️ Élève ignoré (Nom ou Prénom manquant):`, row);
        continue; // Ignorer cette ligne et passer à la suivante
      }

      // Vérifier si l'élève existe en base de données
      const [eleve] = await db.query('SELECT id FROM Eleve WHERE nom = ? AND prenom = ?', [Nom, Prénom]);
      if (eleve.length > 0) {
        const eleveId = eleve[0].id;
        const noteValue = isNaN(Note) || Note === "" ? null : Note;

        console.log(`✅ Traitement de ${Nom} ${Prénom}, Note: ${noteValue !== null ? noteValue : 'ABS'}`);

        await db.query(
          `INSERT INTO Note (${updateField}, Eleves_id, Semestre_id, matieres_id, classe_id, etablissement_id, Annee_scolaire_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE ${updateField} = VALUES(${updateField})`,
          [noteValue, eleveId, semestreId, matiereId, classeId, etablissementId, anneeScolaireId]
        );
      } else {
        console.warn(`⚠️ Élève non trouvé en base: ${Nom} ${Prénom}`);
      }
    }

    fs.unlinkSync(file.path);
    res.send('Données importées avec succès');

  } catch (error) {
    console.error('❌ Erreur lors de l\'importation des données Excel', error);
    res.status(500).send('Erreur lors de l\'importation');
  }
});


// API pour l'upload du fichier Excel et mise à jour des notes
app.post('/api/upload/excel22', upload.single('file'), async (req, res) => {
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
          `INSERT INTO ToutesNotes (${updateField}, Eleves_id, Semestre_id, matieres_id, classe_id, etablissement_id, Annee_scolaire_id)
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
});

app.get('/api/absents', async (req, res) => {
  const { classeId, etablissementId, anneeScolaireId } = req.query;

  if (!classeId || !etablissementId || !anneeScolaireId) {
    return res.status(400).json({ error: 'Les paramètres classeId et etablissementId sont requis.' });
  }

  try {
    // Obtenir la date la plus récente avec des absences dans cette classe et cet établissement
    const [dateRows] = await db.query(
      `SELECT MAX(date) AS derniere_date 
       FROM Presence 
       WHERE classe_id = ? AND etablissement_id = ? AND statut = 'Absent' AND Annee_scolaire_id = ?`,
      [classeId, etablissementId, anneeScolaireId]
    );

    const derniereDate = dateRows[0]?.derniere_date;

    if (!derniereDate) {
      return res.status(404).json({ error: 'Aucune absence trouvée pour cette classe.' });
    }

    // Récupérer les informations des élèves absents pour cette date
    const [absents] = await db.query(
      `SELECT Eleve.nom, Eleve.prenom, Presence.motif
       FROM Presence
       INNER JOIN Eleve ON Presence.eleve_id = Eleve.id
       WHERE Presence.classe_id = ? AND Presence.etablissement_id = ? 
       AND Presence.statut = 'Absent' AND Presence.date = ?`,
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
FROM Eleve e 
LEFT JOIN Note n 
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
      FROM Coefficient c 
      JOIN Enseigner e ON e.coefficient_id = c.id 
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
          UPDATE Note
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
      const studentQuery = `SELECT nom, prenom FROM Eleve WHERE id = ?`;
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
        SELECT id FROM Eleve 
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
        UPDATE Note 
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
    const [rows] = await db.query('SELECT id, nom FROM Semestre WHERE etablissement_id = ?', [etablissementId]);
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
    // Obtenir une connexion du pool
    connection = await req.db.getConnection();

    // Ouvrir une transaction pour garantir l'intégrité des données
    await connection.beginTransaction();

    // Rechercher l'ID du semestre pour chaque enregistrement
    for (let presence of presences) {
      const { date, time, status, eleveId, subjectId, classeId, semesterName, etablissementId, anneeScolaireId } = presence;

      // Rechercher l'ID du semestre en fonction du nom
      const [semesterResult] = await connection.query(
        `SELECT id FROM Semestre WHERE nom = ? AND etablissement_id = ?`,
        [semesterName, etablissementId]
      );

      if (!semesterResult.length) {
        throw new Error(`Semestre non trouvé pour le nom: ${semesterName}`);
      }

      const semesterId = semesterResult[0].id;

      // Insérer les données dans la table `Presence`
      await connection.query(
        `INSERT INTO Presence (date, heures, statut, eleve_id, matieres_id, classe_id, semestre_id, etablissement_id, Annee_scolaire_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [date, time, status, eleveId, subjectId, classeId, semesterId, etablissementId, anneeScolaireId]
      );
    }

    // Commit de la transaction
    await connection.commit();

    res.status(201).json({ message: 'Présences enregistrées avec succès.' });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des présences :', error);

    // Rollback en cas d'erreur
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'enregistrement des présences.' });
  } finally {
    // Toujours libérer la connexion
    if (connection) {
      connection.release();
    }
  }
});

// Route pour sauvegarder les enregistrements de conduite dans la table Punitions
app.post('/api/save/conduct', async (req, res) => {
  const { semester, records, etablissementId, anneeScolaireId } = req.body;

  let connection;

  try {
    // Obtenir une connexion à partir du pool
    connection = await req.db.getConnection();
    await connection.beginTransaction();

    // Récupérer l'ID du semestre à partir du nom du semestre
    const [rows] = await connection.query(
      'SELECT id FROM Semestre WHERE nom = ? AND etablissement_id = ?',
      [semester, etablissementId]
    );

    if (rows.length === 0) {
      throw new Error(`Semestre avec le nom "${semester}" introuvable.`);
    }

    const semesterId = rows[0].id;

    for (const record of records) {
      const { auteur, punition, date, hour, motif, studentId } = record;

      // Insertion des données dans la table Punitions sans la somme des heures pour l'instant
      const [insertResult] = await connection.query(
        'INSERT INTO Punitions (auteur, punition, date, heure, motif, eleve_id, semestre_id, etablissement_id, Annee_scolaire_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [auteur, punition, date, hour, motif, studentId, semesterId, etablissementId, anneeScolaireId]
      );

      const punitionId = insertResult.insertId;

      // Calculer la somme des heures de punition pour cet élève dans ce semestre
      const [sumResult] = await connection.query(
        'SELECT SUM(punition) AS totalHours FROM Punitions WHERE eleve_id = ? AND semestre_id = ? AND etablissement_id = ?',
        [studentId, semesterId, etablissementId]
      );

      const totalHours = sumResult[0].totalHours;

      // Mettre à jour la ligne insérée avec la somme des heures calculée
      await connection.query(
        'UPDATE Punitions SET total_hours = ? WHERE id = ?',
        [totalHours, punitionId]
      );
    }

    await connection.commit();

    res.status(200).json({ message: 'Données de conduite sauvegardées avec succès.' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Erreur lors de la sauvegarde des données de conduite :', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde des données de conduite.' });
  } finally {
    if (connection) connection.release(); // Assurez-vous de libérer la connexion
  }
});


// Exemple d'une route adaptée
app.get('/api/punitions/somme-heures/:studentId/:anneeScolaireId', async (req, res) => {
  try {
    const { studentId, anneeScolaireId } = req.params;

    // Calculer la somme des heures de punition pour l'élève et l'année scolaire spécifiques
    const [result] = await db.query(
      'SELECT SUM(punition) AS totalHours FROM Punitions WHERE eleve_id = ? AND annee_scolaire_id = ?',
      [studentId, anneeScolaireId]
    );

    // Si aucun résultat, retourner 0 heures
    const totalHours = (result[0] && result[0].totalHours) || 0;

    res.json({ totalHours });
  } catch (error) {
    console.error('Erreur lors de la récupération des heures de punition :', error);
    res.status(500).send('Erreur serveur');
  }
});

app.post('/api/parent/login', async (req, res) => {
  const { username, password, etablissement } = req.body; // Récupérer le nom de l'établissement

  try {
    // Effectuer une jointure entre la table Parents et Etablissement
    const [rows] = await db.query(
      `SELECT 
        Parents.id AS parent_id, 
        Parents.nom AS parent_nom, 
        Parents.prenom AS parent_prenom, 
        Parents.contact AS parent_contact, 
        Parents.email AS parent_email, 
        Parents.mot_de_passe AS parent_mot_de_passe, 
        Parents.nom_utilisateur AS parent_nom_utilisateur, 
        Parents.etablissement_id AS parent_etablissement_id,
        Etablissement.id AS etablissement_id, 
        Etablissement.nom AS etablissement_nom, 
        Etablissement.telephone AS etablissement_telephone, 
        Etablissement.mail AS etablissement_mail
      FROM Parents 
      INNER JOIN Etablissement ON Parents.etablissement_id = Etablissement.id 
      WHERE Parents.nom_utilisateur = ? AND Etablissement.nom = ?`, 
      [username, etablissement]
    );

    // Vérifier si les informations du parent et de l'établissement existent
    if (rows.length === 0) {
      return res.status(401).json({ message: "Nom d’utilisateur ou établissement incorrect" });
    }

    const parent = rows[0];

    // Vérifier le mot de passe crypté
    const passwordMatch = await bcrypt.compare(password, parent.parent_mot_de_passe);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    // Génération du token JWT avec l'ID de l'établissement
    const token = jwt.sign({ 
      id: parent.parent_id, 
      username: parent.parent_nom_utilisateur, 
      etablissementId: parent.parent_etablissement_id // Inclure l'ID de l'établissement
    }, secretKey, { expiresIn: '1h' });

    res.json({ message: 'Connexion réussie', token });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});



app.get('/api/parent/children', authenticateJWT, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        e.id, 
        e.prenom, 
        e.nom, 
        c.nom AS class
      FROM 
        Eleve e
      JOIN 
        Classes c ON e.Classe_id = c.id
      WHERE 
        e.Parents_id = ?
    `, [req.user.id]);

    res.json({ children: rows });
  } catch (error) {
    console.error('Erreur lors de la récupération des enfants:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});


// Route pour obtenir les données de présence en fonction de l'élève et du semestre
app.get('/api/presence', async (req, res) => {
  try {
    const { childId } = req.query;

    // Requête SQL pour récupérer les présences en fonction de l'ID de l'élève et du semestre
    const query = `
      SELECT p.id, p.date, p.heures AS heure, p.statut AS presence, m.nom AS matiere,s.nom AS semestreNom
      FROM Presence p
      JOIN Matieres m ON p.matieres_id = m.id
      JOIN Semestre s ON p.semestre_id = s.id
      WHERE p.eleve_id = ? 
    `;

    const [results] = await db.query(query, [childId]);
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
    const query = 'UPDATE Presence SET motif = ? WHERE id = ?';
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
      FROM Punitions p
      JOIN Semestre s ON p.semestre_id = s.id
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
  const { date, motif, duree, contact, childId, etablissementId } = req.body;

  if (!date || !motif || !duree || !contact || !etablissementId) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
  }

  try {
    const [result] = await req.db.query(
      'INSERT INTO Permission (date, motif, duree, contact, eleve_id, etablissement_id) VALUES (?, ?, ?, ?, ?, ?)',
      [date, motif, duree, contact, childId, etablissementId]
    );
    res.status(201).json({ message: 'Permission ajoutée avec succès', id: result.insertId });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/// Route pour récupérer les permissions par enfant et établissement
app.get('/api/permissions/:childId/:etablissementId', async (req, res) => {
  const { childId, etablissementId } = req.params; // Récupération des IDs de l'enfant et de l'établissement depuis les paramètres d'URL

  try {
    // Requête SQL pour récupérer les permissions d'un enfant spécifique dans un établissement donné
    const [rows] = await req.db.query(
      'SELECT * FROM Permission WHERE eleve_id = ? AND etablissement_id = ?',
      [childId, etablissementId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});



// Route pour supprimer une permission
app.delete('/api/permissions/:permissionId', async (req, res) => {
  const { permissionId } = req.params;

  try {
    const [result] = await db.query('DELETE FROM Permission WHERE id = ?', [permissionId]);

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
      'UPDATE Permission SET statut = ? WHERE id = ?',
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
      FROM Eleve e 
      JOIN Classes c ON e.classe_id = c.id
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
app.get('/api/eleves/:classId', async (req, res) => {
  const classId = req.params.classId; // Récupère le classId directement

  // Assurez-vous que classId est bien une chaîne de caractères ou un nombre
  if (!classId) {
    return res.status(400).send('Class ID is required');
  }

  const sql = 'SELECT id, nom, prenom FROM Eleve WHERE classe_id = ?';

  try {
    const [results] = await req.db.query(sql, [classId]);
    res.json(results);
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/classes/:classId/eleves', async (req, res) => {
  const classId = req.params.classId; // Récupère le classId directement

  // Assurez-vous que classId est bien une chaîne de caractères ou un nombre
  if (!classId) {
    return res.status(400).send('Class ID is required');
  }

  const sql = 'SELECT id, nom, prenom FROM Eleve WHERE classe_id = ?';

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
      FROM Presence p 
      JOIN Matieres m ON p.matieres_id = m.id 
      JOIN Semestre s ON p.semestre_id = s.id
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

// API pour récupérer les incidents basés sur l'élève et le semestre
app.get('/api/incident', async (req, res) => {
  const { studentId, semestre, anneeScolaireId } = req.query;

  try {
    // Requête SQL pour récupérer les incidents basés sur l'élève et le semestre
    const [rows] = await req.db.execute(
      `SELECT p.id, p.auteur, p.date, p.heure, p.punition, p.motif, 
      p.total_hours,
      s.nom
      FROM Punitions p
      JOIN Semestre s ON p.semestre_id = s.id
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
      'SELECT id FROM Semestre WHERE nom = ? AND etablissement_id = ?',
      [semestre, etablissementId]
    );

    if (semestreRows.length === 0) {
      throw new Error(`Semestre avec le nom "${semestre}" introuvable.`);
    }

    const semestreId = semestreRows[0].id;

    // Récupérer le dernier total_hours pour cet élève et ce semestre
    const [lastPunitionRows] = await connection.query(
      'SELECT total_hours FROM Punitions WHERE eleve_id = ? AND semestre_id = ? AND Annee_scolaire_id = ? ORDER BY id DESC LIMIT 1',
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
      `INSERT INTO Punitions (eleve_id, semestre_id, auteur, date, punition, heure, motif, total_hours, etablissement_id, Annee_scolaire_id)
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
app.get('/api/presenceid/:etablissementId/:anneeScolaireId?', async (req, res) => {
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
      'SELECT * FROM Presence WHERE etablissement_id = ? AND annee_scolaire_id = ?', 
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
    const [rows] = await req.db.query('SELECT * FROM Eleve WHERE id = ?', [studentId]);
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
    const [rows] = await req.db.query('SELECT * FROM Classes WHERE id = ?', [classId]);
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
    const [results] = await req.db.query('SELECT * FROM Parents WHERE id = ?', [parentId]);
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
    const [rows] = await db.query('SELECT id, nom FROM Classes WHERE etablissement_id = ?', [etablissementId]);
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
    const [rows] = await req.db.query('SELECT * FROM Eleve WHERE id = ?', [studentId]);
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
      FROM Matieres m
      JOIN Enseigner e ON m.id = e.matiere_id
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

  if (!classId || !jour || !horaire || !matiereId || !etablissementId ||   anneeScolaireId) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }

  try {
    const query = `
      INSERT INTO Programmes (classe_id, jour, horaire, matière_id, etablissement_id, Annee_scolaire_id)
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
      'SELECT jour, horaire, matière_id FROM Programmes WHERE classe_id = ?',
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
      DELETE FROM Programmes 
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
      `SELECT id FROM Semestre WHERE nom = ? AND etablissement_id = ?`,
      [semesterName, etablissementId]
    );

    if (termResult.length === 0) {
      return res.status(404).json({ error: "Semestre non trouvé." });
    }

    const termId = termResult[0].id;

    // Insertion de l'activité dans la base de données
    const [result] = await req.db.query(
      `INSERT INTO Tests (enseignant_id, matière_id, activite, date, horaire, classe_id, semestre_id, etablissement_id, Annee_scolaire_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [teacherId, subjectId, activity, date, hours, classId, termId, etablissementId, anneeScolaireId]
    );

    // Vérification si l'insertion a réussi
    if (result.affectedRows === 1) {
      const [newActivity] = await req.db.query(
        `SELECT * FROM Tests WHERE id = ?`,
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


// Route pour récupérer les notifications d'un établissement et d'un enseignant spécifiques
app.get('/api/notifications/:etablissementId/:anneeScolaireId', async (req, res) => {
  try {
    const etablissementId = req.params.etablissementId;
    const anneeScolaireId = req.params.anneeScolaireId;
    const enseignantId = req.query.enseignantId;

    if (!enseignantId) {
      return res.status(400).json({ error: 'enseignantId est requis' });
    }

    const [classes] = await req.db.query(
      `SELECT Classes_id 
       FROM Enseigner 
       WHERE Enseignants_id = ? AND etablissement_id = ? AND Annee_scolaire_id = ?`,
      [enseignantId, etablissementId, anneeScolaireId]
    );

    if (classes.length === 0) {
      return res.status(404).json({ message: 'Aucune classe trouvée pour cet enseignant dans cet établissement.' });
    }

    const classeIds = classes.map(classe => classe.Classes_id);

    const [permissions] = await req.db.query(
      `SELECT 
         Eleve.nom AS nom,
         Eleve.prenom AS prenom,
         Classes.nom AS classeNom,
         Permission.date,
         Permission.duree
       FROM Permission
       JOIN Eleve ON Eleve.id = Permission.eleve_id
       JOIN Classes ON Classes.id = Eleve.classe_id
       WHERE 
         Eleve.classe_id IN (?)
         AND Permission.statut IN ('autoriser', 'sous reserve de justification')`,
      [classeIds]
    );

    if (permissions.length === 0) {
      return res.status(404).json({ message: 'Aucune permission trouvée.' });
    }

    return res.json(permissions);
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});


app.get('/api/getActivities/:classeId/:subjectId/:anneeScolaireId', async (req, res) => {
  try {
    const { classeId, subjectId, anneeScolaireId } = req.params;

    const [activities] = await req.db.query(
      `SELECT * FROM Tests WHERE classe_id = ? AND matière_id = ? AND Annee_scolaire_id = ?`,
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
      'SELECT classe_id FROM Eleve WHERE id = ?',
      [childId]
    );

    if (rowsEleve.length === 0) {
      return res.status(404).json({ message: 'Élève non trouvé' });
    }

    const classeId = rowsEleve[0].classe_id;

    // Récupérer le programme basé sur l'ID de la classe (sans filtre sur le semestre)
    const [rowsProgramme] = await req.db.query(
      `SELECT p.jour, p.horaire, m.nom AS matiere 
       FROM Programmes p 
       JOIN Matieres m ON p.matière_id = m.id
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


app.get('/api/notificationed/:parentId', async (req, res) => {
  const parentId = req.params.parentId; // Récupération du parentId

  if (!parentId) {
    return res.status(400).json({ message: 'ID du parent manquant.' });
  }

  try {
    // Requête pour récupérer les élèves associés au parent
    const [students] = await req.db.execute(
      `SELECT id, nom, prenom FROM Eleve WHERE Parents_id = ?`,
      [parentId]
    );
    
    if (students.length === 0) {
      return res.status(404).json({ message: 'Aucun élève trouvé pour ce parent.' });
    }

    // Liste pour stocker les notifications de présence des élèves
    let notifications = [];

    // Pour chaque élève, récupérer toutes ses présences
    for (let student of students) {
      const [rows] = await req.db.execute(
        `SELECT p.date, p.heures, p.statut, e.nom AS studentName, e.prenom AS studentPrenom
         FROM Presence p
         JOIN Eleve e ON p.eleve_id = e.id
         WHERE p.eleve_id = ?
         ORDER BY p.date DESC, p.heures DESC`, // Suppression de LIMIT 1
        [student.id]
      );

      // Ajouter les résultats à la liste des notifications
      if (rows.length > 0) {
        notifications = notifications.concat(rows);
      }
    }

    // Format des dates pour comparaison
    const today = moment().format('YYYY-MM-DD');
    const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
    const dayBeforeYesterday = moment().subtract(2, 'days').format('YYYY-MM-DD');

    // Liste pour stocker les messages d'alerte séparés
    let alertMessages = [];

    // Filtrer les absences d'aujourd'hui, hier, avant-hier et les autres dates
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

    // Retourner les notifications et les alertes individuelles
    res.json({ notifications, alertMessages });

  } catch (error) {
    console.error('Erreur lors de la récupération des notifications :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des données.' });
  }
});


app.get('/api/tests/:childId', async (req, res) => {
  const { childId } = req.params;

  try {
    // 1. Récupérer l'ID de la classe de l'élève
    const [rows] = await req.db.query('SELECT classe_id FROM Eleve WHERE id = ?', [childId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Élève non trouvé' });
    }

    const classId = rows[0].classe_id;

    // 2. Récupérer les tests associés à cette classe
    const [tests] = await req.db.query(`
      SELECT t.date, t.activite, m.nom AS matiere
      FROM Tests t
      JOIN Matieres m ON t.matière_id = m.id
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
    FROM Tests t
    JOIN Matieres m ON t.matière_id = m.id
    JOIN Semestre s ON t.semestre_id = s.id
    JOIN Enseignants e ON t.enseignant_id = e.id
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
      // Récupération des notes, des matières et des semestres en une seule requête
      const [results] = await req.db.query(
        `SELECT e.id AS eleve_id, e.nom AS eleve_nom, e.prenom AS eleve_prenom, 
                m.id AS matiere_id, m.nom AS matiere_nom, 
                s.id AS semestre_id, s.nom AS semestre_nom, 
                n.inter1, n.inter2, n.inter3, n.inter4, n.moyInter, 
                n.Dev1, n.Dev2, n.moy, n.moycoef 
         FROM Eleve e
         JOIN Note n ON e.id = n.Eleves_id
         JOIN Matieres m ON m.id = n.matieres_id
         JOIN Semestre s ON s.id = n.semestre_id
         JOIN Enseigner en ON en.matiere_id = m.id
         WHERE n.classe_id = ? AND n.Annee_scolaire_id = ?` ,
        [classeId,   anneeScolaireId]
      );
  
      // Vérification si des résultats ont été récupérés
      if (results.length === 0) {
        return res.json({ semestres: [], matieres: [], notes: {}, message: "Aucune note trouvée pour cette classe." });
      }
  
      // Structuration des données
      const semestres = [];
      const matieres = [];
      let notes = {};
  
      results.forEach(row => {
        // Ajout des semestres uniques
        if (!semestres.find(sem => sem.id === row.semestre_id)) {
          semestres.push({ id: row.semestre_id, nom: row.semestre_nom });
        }
  
        // Ajout des matières uniques
        if (!matieres.find(mat => mat.id === row.matiere_id)) {
          matieres.push({ id: row.matiere_id, nom: row.matiere_nom });
        }
  
        // Structuration des notes par semestre et matière
        if (!notes[row.semestre_id]) {
          notes[row.semestre_id] = [];
        }
  
        notes[row.semestre_id].push({
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
        });
      });
  
      // Envoi de la réponse structurée
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
        `UPDATE Note
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
    const { classeId, etablissementId, anneeScolaireId} = req.query;

    try {
        // Première requête : récupération des notes, des matières, des semestres et du nom de la classe
        const [results] = await req.db.query(
            `SELECT e.id AS eleve_id,
                    e.nom AS eleve_nom,
                    e.prenom AS eleve_prenom,
                    c.nom AS classe_nom,
                    m.id AS matiere_id,
                    m.nom AS matiere_nom, 
                    s.id AS semestre_id, 
                    s.nom AS semestre_nom,
                    n.moy, n.moycoef,
                    MAX(p.total_hours) AS total_hours
            FROM Eleve e 
            JOIN Note n ON e.id = n.Eleves_id 
            JOIN Matieres m ON m.id = n.matieres_id 
            JOIN Semestre s ON s.id = n.semestre_id 
            JOIN Classes c ON c.id = n.classe_id 
            LEFT JOIN Punitions p ON e.id = p.eleve_id AND s.id = p.semestre_id
            WHERE n.classe_id = ? AND n.Annee_scolaire_id = ?
            GROUP BY e.id, m.id, s.id`,
            [classeId, anneeScolaireId]
        );

        if (results.length === 0) {
            return res.json({ semestres: [], matieres: [], notes: {}, classeNom: null, message: "Aucune note trouvée pour cette classe." });
        }

        // Structuration des données
        const semestres = [];
        const matieres = [];
        let notes = {};
        const classeNom = results[0]?.classe_nom || null;

        results.forEach(row => {
            if (!semestres.find(sem => sem.id === row.semestre_id)) {
                semestres.push({ id: row.semestre_id, nom: row.semestre_nom });
            }

            if (!matieres.find(mat => mat.id === row.matiere_id)) {
                matieres.push({ id: row.matiere_id, nom: row.matiere_nom });
            }

            if (!notes[row.semestre_id]) {
                notes[row.semestre_id] = [];
            }

            notes[row.semestre_id].push({
                matiereId: row.matiere_id,
                eleveId: row.eleve_id,
                nom: row.eleve_nom,
                prenom: row.eleve_prenom,
                moy: row.moy || null,
                moycoef: row.moycoef || null,
                total_hours: row.total_hours || 0, // Valeur maximale des heures
                coefficient: null
            });
        });

        // Deuxième requête : récupération des coefficients
        const [coefficients] = await req.db.query(
            `SELECT c.id As coefficient_id, c.valeur AS coefficient, en.matiere_id
             FROM Coefficient c
             JOIN Enseigner en ON en.coefficient_id = c.id
             WHERE en.Classes_id = ?`,
            [classeId]
        );

        coefficients.forEach(coef => {
            Object.keys(notes).forEach(semestreId => {
                notes[semestreId].forEach(note => {
                    if (note.matiereId === coef.matiere_id) {
                        note.coefficient = coef.coefficient || null;
                        note.coefficientId = coef.coefficient_id;
                    }
                });
            });
        });

        // Troisième requête : récupération des notes de conduite et des semestres
        const [conduiteResults] = await req.db.query(
            `SELECT c.note_conduite AS note_conduite, s.id AS semestre_id, s.nom AS semestre_nom
             FROM Conduite c
             JOIN Semestre s ON s.id = c.semestre_id
             WHERE c.classe_id = ?`,
            [classeId]
        );

        conduiteResults.forEach(conduite => {
            if (!notes[conduite.semestre_id]) {
                notes[conduite.semestre_id] = [];
            }
            notes[conduite.semestre_id].forEach(note => {
                note.conduite = conduite.note_conduite || null;
            });
        });

        res.json({ semestres, matieres, notes, classeNom });
    } catch (error) {
        console.error("Erreur lors de la récupération des détails de la classe et des coefficients :", error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération des détails de la classe et des coefficients" });
    }
});

// Route pour récupérer le statut de l'établissement
app.get('/api/etablissementStatut', async (req, res) => {
  const { etablissementId } = req.query;

  try {
    // Récupérer le statut de l'établissement
    const [rows] = await req.db.query(
      'SELECT statut FROM Etablissement WHERE id = ?',
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

// API : Sauvegarder les bulletins
app.post('/api/save-bulletin', async (req, res) => {
  const { bulletin } = req.body;

  // Log des données reçues
  console.log('Données reçues :', req.body);

  // Validation des données d'entrée
  if (!bulletin || !Array.isArray(bulletin) || bulletin.length === 0) {
    console.error('Données manquantes ou invalides:', { bulletin });
    return res.status(400).json({ message: 'Données manquantes ou invalides.' });
  }

  let connection; // Déclaration de la connexion en dehors du bloc try

  try {
    connection = await db.getConnection(); // Initialisation de la connexion
    await connection.beginTransaction(); // Démarrer une transaction

    for (const bulletinData of bulletin) {
      const {
        eleve_id,
        semestre_id,
        matiere_id,
        coef_id,
        moy,
        moycoef,
        total,
        moySem,
        rang,
        mention,
        conduite,
        moyAn,
        decision,
        etablissement_id,
        Annee_scolaire_id,
      } = bulletinData;

      // Validation des champs obligatoires
      if (!eleve_id || !semestre_id || !matiere_id || !Annee_scolaire_id) {
        console.error('Données manquantes dans un bulletin:', bulletinData);
        throw new Error('Données manquantes dans un bulletin.');
      }

      // Vérification de l'existence du bulletin
      const [existingBulletin] = await connection.query(
        `SELECT bulletin_id FROM Bulletin WHERE eleve_id = ? AND semestre_id = ? AND Annee_scolaire_id = ?`,
        [eleve_id, semestre_id, Annee_scolaire_id]
      );

      if (existingBulletin.length > 0) {
        const [eleve] = await connection.query(
          `SELECT nom, prenom FROM Eleve WHERE id = ?`,
          [eleve_id]
        );
        const [semestre] = await connection.query(
          `SELECT nom FROM Semestre WHERE id = ?`,
          [semestre_id]
        );
        const [Annee_scolaire] = await connection.query(
          `SELECT nom_annee FROM Annee_scolaire WHERE id = ?`,
          [Annee_scolaire_id]
        );

        if (eleve.length > 0 && semestre.length > 0 && Annee_scolaire.length > 0) {
          const { nom: eleveNom, prenom: elevePrenom } = eleve[0];
          const { nom: semestreNom } = semestre[0];
          const { nom_annee: AnneeNom } = Annee_scolaire[0];

          console.warn(
            `Bulletin existant : ${eleveNom} ${elevePrenom}, ${semestreNom}, ${AnneeNom}`
          );
          continue; // Passez au bulletin suivant au lieu d'interrompre la boucle
        }
      }

      // Insérer le nouveau bulletin
      await connection.query(
        `
        INSERT INTO Bulletin (
          eleve_id, semestre_id, matiere_id, coef_id, moy, moycoef,
          total, moySem, rang, mention, conduite, moyAn, decision,
          etablissement_id, Annee_scolaire_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          eleve_id,
          semestre_id,
          matiere_id,
          coef_id,
          moy,
          moycoef,
          total,
          moySem,
          rang,
          mention,
          conduite,
          moyAn,
          decision,
          etablissement_id,
          Annee_scolaire_id,
        ]
      );
    }

    await connection.commit(); // Valider la transaction
    res.status(200).json({ message: 'Tous les bulletins ont été sauvegardés avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des bulletins :', error.message);

    if (connection) await connection.rollback(); // Annuler la transaction en cas d'erreur

    res.status(500).json({
      message: 'Erreur lors de la sauvegarde des bulletins.',
      error: error.message,
    });
  } finally {
    if (connection) connection.release(); // Libérer la connexion si elle est définie
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
        Semestre.id AS semestreId,
        Semestre.nom AS semestreNom,
        Matieres.nom AS matiereNom,
        Note.inter1,
        Note.inter2,
        Note.inter3,
        Note.inter4,
        Note.moyInter,
        Note.Dev1,
        Note.Dev2,
        Note.moy,
        Note.moycoef
      FROM Note
      INNER JOIN Matieres ON Note.matieres_id = Matieres.id
      INNER JOIN Semestre ON Note.Semestre_id = Semestre.id
      WHERE Note.Eleves_id = ? AND Note.Annee_scolaire_id = ?
      ORDER BY Semestre.id ASC, Matieres.nom ASC`,
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
        b.total,
        b.moySem,
        b.moyAn,
        b.rang,
        b.mention,
        b.conduite,
        b.decision
      FROM Bulletin b
      JOIN Eleve e ON e.id = b.eleve_id
      JOIN Classes c ON c.id = e.classe_id
      JOIN Semestre s ON s.id = b.semestre_id
      JOIN Matieres m ON m.id = b.matiere_id
      JOIN Coefficient coef ON coef.id = b.coef_id
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
      const { semestre_id, semestreNom, matiereNom, coef, moy, moycoef, total, moySem, moyAn, rang, mention, conduite, decision } = row;

      if (!semestres[semestre_id]) {
        semestres[semestre_id] = {
          semestre_id,
          nom: semestreNom,
          bulletins: [],
          moySem,
          total,
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




app.get('/api/departements', async (req, res) => {
  try {
    const [departements] = await db.query('SELECT departement_id, nom FROM Departement');
    res.json(departements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des départements.' });
  }
});
app.get('/api/communes', async (req, res) => {
  try {
    const [communes] = await db.query('SELECT commune_id, nom FROM Commune');
    res.json(communes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des communes.' });
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
      'INSERT INTO Etablissement (nom, departement_id, commune_id, statut, telephone, mail, nom_utilisateur, mot_de_passe) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nom, departement_id, commune_id, statut, telephone, mail, nom_utilisateur, mot_de_passe]
    );

    const idEtablissement = result.insertId;

    // Récupération du statut pour vérifier s'il est "public" ou "privé"
    if (statut === 'public') {
      // Ajout des semestres pour un établissement public
      await db.query(
        'INSERT INTO Semestre (nom, etablissement_id) VALUES (?, ?), (?, ?)',
        ['Semestre 1', idEtablissement, 'Semestre 2', idEtablissement]
      );
    } else if (statut === 'prive') {
      // Ajout des trimestres pour un établissement privé
      await db.query(
        'INSERT INTO Semestre (nom, etablissement_id) VALUES (?, ?), (?, ?), (?, ?)',
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
    const [rows] = await db.query('SELECT * FROM Etablissement WHERE nom_utilisateur = ?', [nom_utilisateur]);

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
      { expiresIn: '1h' } // Durée de validité du token
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
      'SELECT classe_id FROM Eleve WHERE id = ?',
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
       FROM Tests t
       JOIN Matieres m ON t.matière_id = m.id
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


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
