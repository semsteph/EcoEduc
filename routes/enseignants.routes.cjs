// =====================================================================
//  Enseignants et affectations (enseigner)
//  Monté dans server.cjs avec : app.use('/api', require('./routes/enseignants.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const bcrypt = require('bcrypt');

router.get('/enseignements', async (req, res) => {
  const { etablissementId, classeId, anneeScolaireId } = req.query;

  console.log('📥 Reçu dans API :', req.query);

  if (!etablissementId || !classeId || !anneeScolaireId) {
    console.warn('⚠️ Paramètres manquants :', {
      etablissementId,
      classeId,
      anneeScolaireId
    });
    return res.status(400).json({
      error: 'ID établissement, classe ou année scolaire manquant'
    });
  }

  try {
    const etabId = Number(etablissementId);
    const classId = Number(classeId);
    const anneeId = Number(anneeScolaireId);

    console.log('🔎 Requête SQL avec :', {
      etabId,
      classId,
      anneeId
    });

    const [rows] = await db.query(`
      SELECT 
        e.Enseignants_id,
        e.Classes_id,
        e.matiere_id,
        e.coefficient_id,
        e.Annee_scolaire_id,
        ens.nom AS nom,
        ens.prenom AS prenom,
        mat.nom AS matiere,
        coef.valeur AS coefficient
      FROM enseigner AS e
      JOIN enseignants AS ens ON ens.id = e.Enseignants_id
      JOIN matieres AS mat ON mat.id = e.matiere_id
      JOIN coefficient AS coef ON coef.id = e.coefficient_id
      WHERE e.etablissement_id = ?
        AND e.Classes_id = ?
        AND e.Annee_scolaire_id = ?
    `, [etabId, classId, anneeId]);

    console.log('📤 Résultat SQL :', rows);

    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur SQL :', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

router.post('/enseignements/delete', (req, res) => {
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

// Route pour l'inscription d'un enseignant
router.post('/Enseignants', authenticateJWT, async (req, res) => {
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

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer les données
    const [result] = await req.db.query(
      'INSERT INTO enseignants (nom, prenom, email, telephone, mot_de_passe, nom_utilisateur, etablissement_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, firstName, email, phone, hashedPassword, username, etablissementId]
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

router.post('/Enseignants/add', authenticateJWT, async (req, res) => {
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

// Route pour récupérer les enseignants (ID, nom, prénom)
router.get('/Enseignants/:etablissementId', authenticateJWT, async (req, res) => {
   const{etablissementId} = req.params
  if (Number(etablissementId) !== Number(req.user.etablissementId)) {
    return res.status(403).json({ error: "Vous n'avez pas accès à cet établissement." });
  }
  try {
    const [teachers] = await req.db.query('SELECT id, nom, prenom FROM enseignants where etablissement_id = ?', [etablissementId]);
    res.status(200).json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/EnseignantAdmin/:etablissementId', authenticateJWT, async (req, res) => {
  try {
    const etablissementId = req.params.etablissementId;
    if (Number(etablissementId) !== Number(req.user.etablissementId)) {
      return res.status(403).json({ message: "Vous n'avez pas accès à cet établissement." });
    }
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

router.put('/Enseignants/:id', authenticateJWT, async (req, res) => {
  const id = req.params.id;
  const { name, firstName, email, phone, username, password } = req.body;

  const [target] = await req.db.query('SELECT etablissement_id FROM enseignants WHERE id = ?', [id]);
  if (target.length === 0) {
    return res.status(404).json({ message: 'Enseignant non trouvé' });
  }
  if (Number(target[0].etablissement_id) !== Number(req.user.etablissementId)) {
    return res.status(403).json({ message: "Cet enseignant n'appartient pas à votre établissement." });
  }

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
    values.push(await bcrypt.hash(password, 10));
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

// API pour récupérer les matières et les classes
router.get('/enseignant/matieres-classes', authenticateJWT, async (req, res) => {
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

router.delete('/Enseignants/:id', authenticateJWT, async (req, res) => {
  const id = req.params.id;
  try {
    const [target] = await req.db.query('SELECT etablissement_id FROM enseignants WHERE id = ?', [id]);
    if (target.length === 0) {
      return res.status(404).json({ message: 'Enseignant non trouvé' });
    }
    if (Number(target[0].etablissement_id) !== Number(req.user.etablissementId)) {
      return res.status(403).json({ message: "Cet enseignant n'appartient pas à votre établissement." });
    }

    await req.db.query('DELETE FROM enseignants WHERE id = ?', [id]);
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
