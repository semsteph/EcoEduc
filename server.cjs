const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');

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
app.use(cors());
app.use(express.json());

// Ajout de la connexion à la base de données dans `req` pour l'utiliser dans les API
app.use((req, res, next) => {
  req.db = db;
  next();
});
// Exemple d'utilisation dans une route pour récupérer les classes
app.get('/api/classes', async (req, res) => {
  try {
    const [rows] = await req.db.query('SELECT * FROM Classes');
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des classes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des classes' });
  }
});


// Route pour obtenir toutes les classes
app.get('/api/Classes', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT * FROM Classes');
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des classes', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
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


// Route pour supprimer une classe par ID
app.delete('/api/Classes/:id', async (req, res) => {
  const { id } = req.params;

  try {
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
    const [rows] = await db.promise().query(
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
  const { teacherId, class: classId, subject: subjectId } = req.body;

  // Vérifier que classId et subjectId ne sont pas null et sont des nombres
  if (!classId || !subjectId || isNaN(classId) || isNaN(subjectId)) {
    return res.status(400).json({ error: 'Class and subject must be selected and valid' });
  }

  try {
    // Ajouter la relation dans la table Enseigner
    await req.db.query(
      'INSERT INTO Enseigner (Enseignants_id, Classes_id, matiere_id) VALUES (?, ?, ?)',
      [teacherId, classId, subjectId]
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
app.get('/api/Classes', async (req, res) => {
  try {
    const [classes] = await req.db.query('SELECT id, nom FROM Classes');
    res.status(200).json(classes);
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

app.get('/api/Enseignants', (req, res) => {
  pool.query('SELECT * FROM Enseignants', (error, results) => {
    if (error) return res.status(500).json({ error });
    res.json(results);
  });
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


app.post('/api/export/excel', async (req, res) => {
  const { classeId, matiereId, semester, noteType } = req.body;

  try {
    const [students] = await db.query(
      'SELECT nom, prenom FROM Eleve WHERE classe_id = ?',
      [classeId]
    );

    // Création d'un nouveau workbook
    const workbook = XLSX.utils.book_new();
    const worksheetData = [
      ['Nom', 'Prénom', 'Note']
    ];

    // Ajout des données des élèves
    students.forEach(student => {
      worksheetData.push([student.nom, student.prenom, '']); // Colonne pour entrer les notes manuellement
    });

    // Création de la feuille de calcul
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Ajout de la feuille de calcul au workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, `Classe_${classeId}_Semestre_${semester}`);

    // Génération du fichier Excel
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Envoi du fichier Excel au client
    res.setHeader('Content-Disposition', `attachment; filename=Classe_${classeId}_Semestre_${semester}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

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

    for (let presence of presences) {
      const { date, time, status, eleveId, subjectId, classeId } = presence;

      // Insérer les données dans la table `Presence`
      await connection.query(
        `INSERT INTO Presence (date, heures, statut, eleve_id, matieres_id, classe_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [date, time, status, eleveId, subjectId, classeId]
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



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
