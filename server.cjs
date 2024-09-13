const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const moment = require('moment');

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

// Ajout de la connexion à la base de données dans `req` pour l'utiliser dans les API
app.use((req, res, next) => {
  req.db = db;
  next();
});


// Route pour ajouter une nouvelle classe
app.post('/api/Classes', async (req, res) => {
  const { nom, promotion_id } = req.body; // Récupérer le nom de la classe et l'ID de la promotion
  if (nom && promotion_id) {
    try {
      const [result] = await req.db.query(
        'INSERT INTO Classes (nom, Promotion_id) VALUES (?, ?)', // Insertion avec l'ID de la promotion
        [nom, promotion_id]
      );
      const newClass = { id: result.insertId, nom };
      res.status(201).json(newClass);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la classe', error);
      res.status(500).json({ error: 'Une erreur est survenue lors de l\'ajout de la classe.' });
    }
  } else {
    res.status(400).json({ error: 'Le nom de la classe et l\'ID de la promotion sont requis.' });
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
// API pour récupérer les classes groupées par promotion avec le nombre d'élèves dans chaque classe
app.get('/api/Classes', async (req, res) => {
  try {
    const [results] = await req.db.query(`
      SELECT c.id, c.nom AS class_name, p.nom AS promotion_name, 
             (SELECT COUNT(*) FROM Eleve e WHERE e.classe_id = c.id) AS studentCount
      FROM Classes c
      JOIN Promotion p ON c.Promotion_id = p.id
      ORDER BY p.nom, c.nom
    `);

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
  const { nom, promotion_id } = req.body;

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


app.post('/api/Parents', async (req, res) => {
  const { name, firstName, contact, email, username, password } = req.body;

  if (!name || !firstName || !contact || !email || !username || !password) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertion du parent dans la base de données
    const [result] = await req.db.query(
      'INSERT INTO Parents (nom, prenom, contact, email, nom_utilisateur, mot_de_passe) VALUES (?, ?, ?, ?, ?, ?)',
      [name, firstName, contact, email, username, hashedPassword]
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

// Route pour récupérer les parents
app.get('/api/Parents', async (req, res) => {
  try {
    const [rows] = await req.db.query('SELECT id, nom, prenom FROM Parents');
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des parents:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});


// Route pour ajouter un élève
app.post('/api/inscription', async (req, res) => {
  const { nom, prenom, dateNaissance, sexe, classe, parentId } = req.body;

  if (!nom || !prenom || !dateNaissance || !sexe || !classe || !parentId) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    // Insertion de l'élève dans la base de données
    const [result] = await req.db.query(
      'INSERT INTO Eleve (nom, prenom, date_naissance, sexe, classe_id, Parents_id) VALUES (?, ?, ?, ?, ?, ?)',
      [nom, prenom, dateNaissance, sexe, classe, parentId]
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
  const { name, firstName, email, phone } = req.body;

  // Générer le nom d'utilisateur et le mot de passe
  const username = `${name.toLowerCase()}.${firstName.toLowerCase()}`;
  const password = Math.random().toString(36).slice(-8); // Générer un mot de passe aléatoire

  try {
    // Insérer les données dans la base de données
    const [result] = await req.db.query(
      'INSERT INTO Enseignants (nom, prenom, email, telephone, mot_de_passe, nom_utilisateur) VALUES (?, ?, ?, ?, ?, ?)',
      [name, firstName, email, phone, password, username]
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route pour ajouter un enseignant avec une seule classe et une seule matière
app.post('/api/Enseignants/add', async (req, res) => {
  const { teacherId, class: classId, subject: subjectId, coefficient:coefficientId } = req.body;

  // Vérifier que classId et subjectId ne sont pas null et sont des nombres
  if (!classId || !subjectId || !coefficientId || isNaN(classId) || isNaN(subjectId) || isNaN(coefficientId)) {
    return res.status(400).json({ error: 'Class and subject and coefficient must be selected and valid' });
  }

  try {
    // Ajouter la relation dans la table Enseigner
    await req.db.query(
      'INSERT INTO Enseigner (Enseignants_id, Classes_id, matiere_id, coefficient_id) VALUES (?, ?, ?, ?)',
      [teacherId, classId, subjectId, coefficientId]
    );

    res.status(200).json({ message: 'Teacher added successfully with class and subject' });
  } catch (error) {
    console.error('Error adding teacher:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Route pour récupérer les enseignants (ID, nom, prénom)
app.get('/api/Enseignants', async (req, res) => {
  try {
    const [teachers] = await req.db.query('SELECT id, nom, prenom FROM Enseignants');
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
app.get('/api/Matieres', async (req, res) => {
  try {
    const [subjects] = await req.db.query('SELECT id, nom FROM Matieres');
    res.status(200).json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// API pour obtenir tous les enseignants
app.get('/api/Enseignant', async (req, res) => {
  try {
    const [results] = await req.db.query('SELECT * FROM Enseignants');
    res.json(results);
  } catch (error) {
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

// API pour la connexion
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM Enseignants WHERE nom_utilisateur = ?', [username]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Nom d’utilisateur incorrect' });
    }

    const enseignant = rows[0];

    if (password !== enseignant.mot_de_passe) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    // Génération du token JWT
    const token = jwt.sign({ id: enseignant.id, username: enseignant.nom_utilisateur }, secretKey, { expiresIn: '1h' });
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
  const  classeId  = req.params.classeId;

  try {
    // Récupération des données des élèves
    const [students] = await req.db.query(
      'SELECT nom, prenom FROM Eleve WHERE classe_id = ?',
      [classeId]
    );

    // Création d'un nouveau workbook
    const workbook = XLSX.utils.book_new();
    const worksheetData = [
      ['Nom', 'Prénom', 'Note']  // En-têtes de colonnes
    ];

    // Ajout des données des élèves
    students.forEach(student => {
      worksheetData.push([student.nom, student.prenom, '']); // Colonne pour entrer les notes manuellement
    });

    // Création de la feuille de calcul
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Ajout de la feuille de calcul au workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, `Classe_${classeId}`);

    // Génération du fichier Excel en binaire
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Configuration des en-têtes HTTP pour le téléchargement du fichier Excel
    res.setHeader('Content-Disposition', `attachment; filename=Classe_${classeId}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Envoi du fichier Excel au client
    res.send(excelBuffer);
  } catch (error) {
    console.error('Erreur lors de la génération du fichier Excel:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});


app.get('/api/semesters', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, nom FROM Semestre');
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des semestres:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

app.post('/api/notes', async (req, res) => {
  const { matiereId, semesterId, noteType, notes } = req.body;

  // Mapper le type de note avec la colonne correspondante dans la table Note
  const noteColumnMap = {
    'inter1': 'inter1',
    'inter2': 'inter2',
    'inter3': 'inter3',
    'inter4': 'inter4',
    'Dev1': 'Dev1',
    'Dev2': 'Dev2',
  };

  const column = noteColumnMap[noteType];
  
  if (!column) {
    return res.status(400).json({ error: 'Type de note invalide' });
  }

  try {
    for (const note of notes) {
      const { studentId, noteValue } = note;

      const query = `
        INSERT INTO Notes (eleves_id, matiere_id, semestre_id, ${column})
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE ${column} = VALUES(${column})
      `;

      await db.query(query, [studentId, matiereId, semesterId, noteValue]);
    }

    res.json({ message: 'Notes enregistrées avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des notes:', error);
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
      const { date, time, status, eleveId, subjectId, classeId, semesterName } = presence;

      // Rechercher l'ID du semestre en fonction du nom
      const [semesterResult] = await connection.query(
        `SELECT id FROM Semestre WHERE nom = ?`,
        [semesterName]
      );

      if (!semesterResult.length) {
        throw new Error(`Semestre non trouvé pour le nom: ${semesterName}`);
      }

      const semesterId = semesterResult[0].id;

      // Insérer les données dans la table `Presence`
      await connection.query(
        `INSERT INTO Presence (date, heures, statut, eleve_id, matieres_id, classe_id, semestre_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [date, time, status, eleveId, subjectId, classeId, semesterId]
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
  const { semester, records } = req.body;

  let connection;

  try {
    // Obtenir une connexion à partir du pool
    connection = await req.db.getConnection();
    await connection.beginTransaction();

    // Récupérer l'ID du semestre à partir du nom du semestre
    const [rows] = await connection.query(
      'SELECT id FROM Semestre WHERE nom = ?',
      [semester]
    );

    if (rows.length === 0) {
      throw new Error(`Semestre avec le nom "${semester}" introuvable.`);
    }

    const semesterId = rows[0].id;

    for (const record of records) {
      const { auteur, punition, date, hour, motif, studentId } = record;

      // Insertion des données dans la table Punitions sans la somme des heures pour l'instant
      const [insertResult] = await connection.query(
        'INSERT INTO Punitions (auteur, punition, date, heure, motif, eleve_id, semestre_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [auteur, punition, date, hour, motif, studentId, semesterId]
      );

      const punitionId = insertResult.insertId;

      // Calculer la somme des heures de punition pour cet élève dans ce semestre
      const [sumResult] = await connection.query(
        'SELECT SUM(punition) AS totalHours FROM Punitions WHERE eleve_id = ? AND semestre_id = ?',
        [studentId, semesterId]
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


// Exemple d'une route Express
app.get('/api/punitions/somme-heures/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Calculer la somme des heures de punition pour l'élève spécifique
    const [result] = await db.query(
      'SELECT SUM(punition) AS totalHours FROM Punitions WHERE eleve_id = ?',
      [studentId]
    );

    // Si aucun résultat, retourner 0 heures
    const totalHours = result[0].totalHours || 0;

    res.json({ totalHours });
  } catch (error) {
    console.error('Erreur lors de la récupération des heures de punition :', error);
    res.status(500).send('Erreur serveur');
  }
});


app.post('/api/parent/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM Parents WHERE nom_utilisateur = ?', [username]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Nom d’utilisateur incorrect' });
    }

    const parent = rows[0];

    // Vérifier le mot de passe crypté
    const passwordMatch = await bcrypt.compare(password, parent.mot_de_passe);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    // Génération du token JWT
    const token = jwt.sign({ id: parent.id, username: parent.nom_utilisateur }, secretKey, { expiresIn: '1h' });
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
    const { childId, semestre } = req.query;

    // Requête SQL pour récupérer les présences en fonction de l'ID de l'élève et du semestre
    const query = `
      SELECT p.id, p.date, p.heures AS heure, p.statut AS presence, m.nom AS matiere
      FROM Presence p
      JOIN Matieres m ON p.matieres_id = m.id
      JOIN Semestre s ON p.semestre_id = s.id
      WHERE p.eleve_id = ? AND s.nom = ?
    `;

    const [results] = await db.query(query, [childId, semestre]);
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
  const { eleveId, semestre } = req.query;

  try {
    // Requête SQL pour récupérer les incidents basés sur l'élève et le semestre
    const [rows] = await req.db.execute(
      `SELECT p.id, p.auteur, p.date, p.heure, p.punition, p.motif, 
      p.total_hours
      FROM Punitions p
      JOIN Semestre s ON p.semestre_id = s.id
      WHERE p.eleve_id = ? AND s.nom = ?`,
      [eleveId, semestre]
    );

    // Renvoyer les incidents au format JSON
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des incidents :', error);
    res.status(500).send('Erreur serveur');
  }
});


// Route pour ajouter une nouvelle permission
app.post('/api/permissions/:childId', async (req, res) => {
  const { date, motif, duree, contact, childId } = req.body;

  if (!date || !motif || !duree || !contact) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
  }

  try {
    const [result] = await req.db.query(
      'INSERT INTO Permission (date, motif, duree, contact, eleve_id) VALUES (?, ?, ?, ?, ?)',
      [date, motif, duree, contact, childId]
    );
    res.status(201).json({ message: 'Permission ajoutée avec succès', id: result.insertId });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la permission:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour récupérer toutes les permissions
app.get('/api/permissions', async (req, res) => {
  try {
    const [rows] = await req.db.query('SELECT * FROM Permission');
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

// Route pour récupérer toutes les classes par nom et par id
app.get('/api/classes', (req, res) => {
  const sql = 'SELECT id, nom FROM Classe';
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(results);
  });
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

app.get('/api/presence/:studentId/:semestre', async (req, res) => {
  const { studentId, semestre } = req.params;

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
      WHERE p.eleve_id = ? AND s.nom = ?
    `, [studentId, semestre]);

    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des données' });
  }
});
// API pour récupérer les incidents basés sur l'élève et le semestre
app.get('/api/incidents', async (req, res) => {
  const { studentId, semestre } = req.query;

  try {
    // Requête SQL pour récupérer les incidents basés sur l'élève et le semestre
    const [rows] = await req.db.execute(
      `SELECT p.id, p.auteur, p.date, p.heure, p.punition, p.motif, 
      p.total_hours
      FROM Punitions p
      JOIN Semestre s ON p.semestre_id = s.id
      WHERE p.eleve_id = ? AND s.nom = ?`,
      [studentId, semestre]
    );

    // Renvoyer les incidents au format JSON
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des incidents :', error);
    res.status(500).send('Erreur serveur');
  }
});

app.post('/api/incidents', async (req, res) => {
  const { eleveId, semestre, auteur, date, punition, heure, motif, total_hours } = req.body;

  let connection;

  try {
    // Vérifier et formater la date
    const formattedDate = moment(date, 'YYYY-MM-DD', true);
    if (!formattedDate.isValid()) {
      return res.status(400).json({ error: 'La date est invalide. Le format attendu est YYYY-MM-DD.' });
    }

    // Vérifier le format de l'heure (HH:mm)
    const formattedHeure = moment(heure, 'HH:mm', true);
    if (!formattedHeure.isValid()) {
      return res.status(400).json({ error: 'L\'heure est invalide. Le format attendu est HH:mm.' });
    }

    // Obtenir une connexion à partir du pool
    connection = await req.db.getConnection();
    await connection.beginTransaction();

    // Récupérer l'ID du semestre à partir du nom du semestre
    const [rows] = await connection.query(
      'SELECT id FROM Semestre WHERE nom = ?',
      [semestre]
    );

    if (rows.length === 0) {
      throw new Error(`Semestre avec le nom "${semestre}" introuvable.`);
    }

    const semestreId = rows[0].id;

    // Insertion des données dans la table Punitions
    const [result] = await connection.query(
      `INSERT INTO Punitions (eleve_id, semestre_id, auteur, date, punition, heure, motif, total_hours)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [eleveId, semestreId, auteur, formattedDate.format('YYYY-MM-DD'), punition, formattedHeure.format('HH:mm'), motif, total_hours]
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
      total_hours,
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
app.get('/api/presenceid', async (req, res) => {
  try {
    const [results] = await req.db.query('SELECT * FROM Presence');
    res.json(results);
  } catch (err) {
    console.error('Erreur lors de la récupération des IDs de présence:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Endpoint pour les informations de l'élève pour notification
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

app.get('/api/classe', async (req, res) => {
 try {
    const [rows] = await db.query('SELECT id, nom FROM Classes');
    res.json(rows);
  } catch (err) {
    console.error('Erreur lors de la récupération des classes:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des classes' });
  }
});

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
app.get('/api/matieres/:classId', async (req, res) => {
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
  const { classId, jour, horaire, matiereId } = req.body;

  if (!classId || !jour || !horaire || !matiereId) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }

  try {
    const query = `
      INSERT INTO Programmes (classe_id, jour, horaire, matière_id)
      VALUES (?, ?, ?, ?)
    `;

    await req.db.query(query, [classId, jour, horaire, matiereId]);

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
    const { teacherId, subjectId, activity, date, hours, classId, termName } = req.body;

    // Vérification des champs obligatoires
    if (!teacherId || !subjectId || !classId || !termName || !date || !hours || !activity) {
      return res.status(400).json({ error: "Tous les champs sont obligatoires." });
    }

    // Récupération de l'ID du semestre en fonction du nom du semestre
    const [termResult] = await req.db.query(
      `SELECT id FROM Semestre WHERE nom = ?`,
      [termName]
    );

    if (termResult.length === 0) {
      return res.status(404).json({ error: "Semestre non trouvé." });
    }

    const termId = termResult[0].id;

    // Insertion de l'activité dans la base de données
    const [result] = await req.db.query(
      `INSERT INTO Tests (enseignant_id, matière_id, activite, date, horaire, classe_id, semestre_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [teacherId, subjectId, activity, date, hours, classId, termId]
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

app.get('/api/getActivities/:classeId/:subjectId', async (req, res) => {
  try {
    const { classeId, subjectId } = req.params;

    const [activities] = await req.db.query(
      `SELECT * FROM Tests WHERE classe_id = ? AND matière_id = ?`,
      [classeId, subjectId]
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


app.get('/api/notifications/:parentId', async (req, res) => {
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


// API pour récupérer les tests (matières, dates, activités) pour un élève
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

    // Filtrer les tests pour ne garder que ceux du mois actuel
    const currentMonth = moment().month();  // Mois actuel (0 pour janvier, 11 pour décembre)
    const filteredTests = tests.filter(test => {
      const testMonth = moment(test.date).month();  // Mois du test
      return testMonth === currentMonth;
    });

    // 3. Envoyer les données filtrées au frontend
    res.json(filteredTests);

  } catch (error) {
    console.error('Erreur lors de la récupération des tests :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
app.get('/api/classes/:classId/details', async (req, res) => {
  const classeId = req.params.classId;

  const query = `
    SELECT t.date, t.horaire, t.activite, 
           m.id as matiere_id, m.nom as matiere, 
           s.id as semestre_id, s.nom as semestre, 
           e.nom as enseignantNom, e.prenom as enseignantPrenom
    FROM Tests t
    JOIN Matieres m ON t.matière_id = m.id
    JOIN Semestre s ON t.semestre_id = s.id
    JOIN Enseignants e ON t.enseignant_id = e.id
    WHERE t.classe_id = ?
    ORDER BY m.id, s.id, t.date`;

  try {
    const [results] = await req.db.query(query, [classeId]);

    if (results.length === 0) {
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
            prenom: row.enseignantPrenom
          },
          semestres: {},
          tests: []
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

    const data = {
      matieres: Object.values(matieresData),
    };

    res.json(data);

  } catch (error) {
    console.error('Erreur lors de la récupération des détails de la classe:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des détails de la classe.' });
  }
});

// Dans ton fichier d'API backend (Express avec MySQL)

app.post('/api/Matieres', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Le nom de la matière est requis" });
  }

  try {
    // Insertion dans la table 'Matieres'
    const result = await req.db.query('INSERT INTO Matieres (nom) VALUES (?)', [name]);
    res.status(201).json({ message: 'Matière ajoutée avec succès', id: result.insertId });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la matière:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'ajout de la matiere'});
    }
  });


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
