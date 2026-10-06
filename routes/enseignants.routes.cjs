// =====================================================================
//  Enseignants et affectations (enseigner)
//  Monté dans server.cjs avec : app.use('/api', require('./routes/enseignants.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, requireAdminStaff } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const bcrypt = require('bcrypt');
const comptesEns = require('../server-lib/comptes-enseignants.cjs');
const { oublierEnseignant } = require('../server-lib/access-guard.cjs');

router.get('/enseignements', authenticateJWT, async (req, res) => {
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

// Retire un enseignant d'une matière dans une classe (année en cours).
// L'écran envoyait DELETE alors que seule la route POST existait, et
// l'ancienne requête (style « callback ») ne répondait jamais.
async function supprimerEnseignement(req, res) {
  const { Enseignants_id, Classes_id, matiere_id, anneeScolaireId } = req.body || {};
  if (!Enseignants_id || !Classes_id || !matiere_id) {
    return res.status(400).json({ error: 'Champs manquants' });
  }
  try {
    const params = [Enseignants_id, Classes_id, matiere_id, req.user.etablissementId];
    let sql = 'DELETE FROM enseigner WHERE Enseignants_id = ? AND Classes_id = ? AND matiere_id = ? AND etablissement_id = ?';
    if (anneeScolaireId) {
      sql += ' AND Annee_scolaire_id = ?';
      params.push(anneeScolaireId);
    }
    const [result] = await db.query(sql, params);
    if (!result.affectedRows) return res.status(404).json({ error: 'Enseignement introuvable' });
    return res.json({ success: true, message: 'Enseignement supprimé' });
  } catch (err) {
    console.error('Erreur suppression enseignement :', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
router.post('/enseignements/delete', authenticateJWT, requireAdminStaff, supprimerEnseignement);
router.delete('/enseignements/delete', authenticateJWT, requireAdminStaff, supprimerEnseignement);

// Route pour l'inscription d'un enseignant
// Ajout d'un enseignant par l'école. S'il a déjà un compte (même
// téléphone ou e-mail, créé par une autre école), sa nouvelle fiche est
// simplement rattachée à ce compte : il garde son identifiant et son mot de
// passe. Sinon un compte est créé avec un mot de passe provisoire, qu'il
// remplace à sa première connexion.
router.post('/Enseignants', authenticateJWT, requireAdminStaff, async (req, res) => {
  const { name, firstName, email, phone, username, password } = req.body || {};
  const etablissementId = Number(req.user.etablissementId);
  const nom = String(name || '').trim();
  const prenom = String(firstName || '').trim();
  const mail = comptesEns.emailNorm(email);
  const tel = comptesEns.chiffres(phone);
  if (!nom || !prenom) return res.status(400).json({ error: 'Nom et prénom obligatoires.' });
  if (!mail && tel.length < 8) return res.status(400).json({ error: 'Téléphone ou e-mail obligatoire : il sert à reconnaître le professeur.' });
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return res.status(400).json({ error: 'E-mail invalide.' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const compte = await comptesEns.compteConnu(conn, { email: mail, telephone: tel });
    if (compte) {
      const [[fiche]] = await conn.query('SELECT id, actif FROM enseignants WHERE compte_id = ? AND etablissement_id = ?', [compte.id, etablissementId]);
      if (fiche && fiche.actif) {
        await conn.rollback();
        return res.status(409).json({ error: 'Ce professeur fait déjà partie de votre établissement.' });
      }
      if (fiche) {
        await conn.query('UPDATE enseignants SET actif = 1, nom = ?, prenom = ? WHERE id = ?', [nom, prenom, fiche.id]);
      } else {
        await conn.query(
          `INSERT INTO enseignants (compte_id, nom, prenom, email, telephone, mot_de_passe, nom_utilisateur, etablissement_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [compte.id, nom, prenom, mail || compte.email || '', phone || compte.telephone || null, compte.mot_de_passe, compte.nom_utilisateur, etablissementId]
        );
      }
      await conn.commit();
      return res.status(201).json({
        lie: true,
        username: compte.nom_utilisateur,
        message: `${prenom} ${nom} avait déjà un compte EchoEducation : votre établissement a été ajouté à son compte. Il/elle se connecte avec ses identifiants habituels (identifiant : ${compte.nom_utilisateur}).`,
      });
    }

    if (String(password || '').length < 6) {
      await conn.rollback();
      return res.status(400).json({ error: 'Mot de passe provisoire trop court.' });
    }
    const identifiant = await comptesEns.identifiantLibre(conn, username || `${prenom}.${nom}`);
    const hash = await bcrypt.hash(String(password), 10);
    const [c] = await conn.query(
      'INSERT INTO compte_enseignant (nom_utilisateur, email, telephone, mot_de_passe, mdp_provisoire) VALUES (?, ?, ?, ?, 1)',
      [identifiant, mail || null, tel || null, hash]
    );
    const [r] = await conn.query(
      `INSERT INTO enseignants (compte_id, nom, prenom, email, telephone, mot_de_passe, nom_utilisateur, etablissement_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.insertId, nom, prenom, mail || '', phone || null, hash, identifiant, etablissementId]
    );
    await conn.commit();
    res.status(201).json({ id: r.insertId, lie: false, username: identifiant, name: nom, firstName: prenom, email: mail, phone });
  } catch (error) {
    try { await conn.rollback(); } catch (_) {}
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Un enseignant de votre établissement utilise déjà cet e-mail ou cet identifiant.' });
    }
    console.error('Erreur lors de la création de l’enseignant :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création de l’enseignant.' });
  } finally {
    conn.release();
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

  if (etablissementId !== Number(req.user.etablissementId)) {
    return res.status(403).json({ message: "Vous n'avez pas accès à cet établissement." });
  }

  // Une vraie connexion unique : « START TRANSACTION » envoyé au pool
  // partait sur une connexion quelconque, et une erreur à la 3e ligne
  // laissait les deux premières enregistrées.
  const conn = await db.getConnection();

  try {
    // Enseignant, classes, matières, coefficients et année : tous de
    // l'établissement connecté.
    const owned = async (sql, ids) => {
      const unique = [...new Set(ids)];
      const [rows] = await conn.query(sql, [unique, etablissementId]);
      return rows.length === unique.length;
    };
    const checks = await Promise.all([
      owned('SELECT id FROM enseignants WHERE id IN (?) AND etablissement_id = ? AND actif = 1', [teacherId]),
      owned('SELECT id FROM classes WHERE id IN (?) AND etablissement_id = ?', classIds),
      owned('SELECT id FROM matieres WHERE id IN (?) AND etablissement_id = ?', subjectIds),
      owned('SELECT id FROM annee_scolaire WHERE id IN (?) AND etablissement_id = ?', [anneeScolaireId]),
    ]);
    if (checks.includes(false)) {
      return res.status(403).json({ message: "Enseignant, classe, matière ou année hors de votre établissement." });
    }
    const [coefRows] = await conn.query('SELECT id FROM coefficient WHERE id IN (?)', [[...new Set(coefficientIds)]]);
    if (coefRows.length !== new Set(coefficientIds).size) {
      return res.status(400).json({ message: 'Coefficient invalide.' });
    }

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
                     ` .`
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
  } finally {
    conn.release();
  }
});

// Route pour récupérer les enseignants (ID, nom, prénom)
router.get('/Enseignants/:etablissementId', authenticateJWT, async (req, res) => {
   const{etablissementId} = req.params
  if (Number(etablissementId) !== Number(req.user.etablissementId)) {
    return res.status(403).json({ error: "Vous n'avez pas accès à cet établissement." });
  }
  try {
    const [teachers] = await req.db.query('SELECT id, nom, prenom FROM enseignants WHERE etablissement_id = ? AND actif = 1 ORDER BY nom, prenom', [etablissementId]);
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
    // Jamais le mot de passe (même chiffré) vers le navigateur.
    const [enseignants] = await req.db.query(
      `SELECT id, nom, prenom, telephone, email, nom_utilisateur, etablissement_id,
              (SELECT COUNT(*) FROM enseignants x WHERE x.compte_id = e.compte_id AND x.actif = 1) > 1 AS plusieursEcoles
       FROM enseignants e WHERE etablissement_id = ? AND actif = 1 ORDER BY nom, prenom`,
      [etablissementId]
    );

    // Classes et matières de l'année en cours, chacune une seule fois
    // (une ligne par affectation faisait répéter « Mathématiques » autant
    // de fois que de classes, et les classes des années passées s'ajoutaient).
    const [affectations] = await req.db.query(
      `SELECT e.Enseignants_id AS enseignantId, c.nom AS classe, c.Promotion_id AS promo, m.nom AS matiere
       FROM enseigner e
       JOIN classes c ON c.id = e.Classes_id
       JOIN matieres m ON m.id = e.matiere_id
       JOIN annee_scolaire a ON a.id = e.Annee_scolaire_id AND a.statut = 'ouverte'
       WHERE e.etablissement_id = ?
       ORDER BY c.Promotion_id IS NULL, c.Promotion_id, LENGTH(c.nom), c.nom, m.nom`,
      [etablissementId]
    );
    const enseignantsWithDetails = enseignants.map((enseignant) => {
      const siennes = affectations.filter((a) => a.enseignantId === enseignant.id);
      return {
        ...enseignant,
        classes: [...new Set(siennes.map((a) => a.classe))],
        matieres: [...new Set(siennes.map((a) => a.matiere))].sort((a, b) => a.localeCompare(b, 'fr')),
      };
    });

    res.json(enseignantsWithDetails);
  } catch (error) {
    console.error("Erreur lors de la récupération des enseignants :", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Modification par l'école. Nom, prénom, téléphone et e-mail de la fiche :
// toujours. Identifiant et mot de passe appartiennent au compte : l'école ne
// les change que si le professeur n'enseigne que chez elle (sinon elle
// pourrait le bloquer, ou entrer sur son compte, dans ses autres écoles).
router.put('/Enseignants/:id', authenticateJWT, requireAdminStaff, async (req, res) => {
  const id = req.params.id;
  const { name, firstName, email, phone, username, password } = req.body || {};
  try {
    const [[fiche]] = await req.db.query('SELECT id, compte_id, etablissement_id, nom_utilisateur FROM enseignants WHERE id = ? AND actif = 1', [id]);
    if (!fiche) return res.status(404).json({ message: 'Enseignant non trouvé' });
    if (Number(fiche.etablissement_id) !== Number(req.user.etablissementId)) {
      return res.status(403).json({ message: "Cet enseignant n'appartient pas à votre établissement." });
    }
    const [[{ n }]] = await req.db.query('SELECT COUNT(*) AS n FROM enseignants WHERE compte_id = ? AND actif = 1', [fiche.compte_id]);
    const seulementIci = Number(n) <= 1;
    const changeIdentifiant = username && String(username).trim().toLowerCase() !== String(fiche.nom_utilisateur || '').toLowerCase();
    if (!seulementIci && (changeIdentifiant || password)) {
      return res.status(409).json({
        code: 'COMPTE_PARTAGE',
        message: "Ce professeur enseigne aussi dans un autre établissement : c'est lui qui gère son identifiant et son mot de passe (« Mot de passe oublié » sur la page de connexion). Les autres informations peuvent être modifiées.",
      });
    }

    const fichier = [];
    const valeurs = [];
    if (name) { fichier.push('nom = ?'); valeurs.push(String(name).trim()); }
    if (firstName) { fichier.push('prenom = ?'); valeurs.push(String(firstName).trim()); }
    if (email) { fichier.push('email = ?'); valeurs.push(comptesEns.emailNorm(email)); }
    if (phone) { fichier.push('telephone = ?'); valeurs.push(phone); }

    const compte = [];
    const valeursCompte = [];
    if (seulementIci) {
      if (email) { compte.push('email = ?'); valeursCompte.push(comptesEns.emailNorm(email)); }
      if (phone) { compte.push('telephone = ?'); valeursCompte.push(comptesEns.chiffres(phone) || null); }
      if (changeIdentifiant) {
        const ident = String(username).trim().toLowerCase();
        const [pris] = await req.db.query('SELECT id FROM compte_enseignant WHERE LOWER(nom_utilisateur) = ? AND id <> ?', [ident, fiche.compte_id]);
        if (pris.length) return res.status(409).json({ message: 'Cet identifiant est déjà utilisé : choisissez-en un autre.' });
        compte.push('nom_utilisateur = ?'); valeursCompte.push(ident);
        fichier.push('nom_utilisateur = ?'); valeurs.push(ident);
      }
      if (password) {
        if (String(password).length < 6) return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
        const hash = await bcrypt.hash(String(password), 10);
        compte.push('mot_de_passe = ?', 'mdp_provisoire = 1'); valeursCompte.push(hash);
        fichier.push('mot_de_passe = ?'); valeurs.push(hash);
      }
    }
    if (!fichier.length && !compte.length) return res.status(400).json({ message: 'Aucune modification.' });
    if (fichier.length) await req.db.query(`UPDATE enseignants SET ${fichier.join(', ')} WHERE id = ?`, [...valeurs, id]);
    if (compte.length) await req.db.query(`UPDATE compte_enseignant SET ${compte.join(', ')} WHERE id = ?`, [...valeursCompte, fiche.compte_id]);
    res.json({ message: 'Enseignant modifié.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Un enseignant de votre établissement utilise déjà cet e-mail ou cet identifiant.' });
    console.error('Erreur modification enseignant :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
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
      JOIN annee_scolaire a ON a.id = e.Annee_scolaire_id AND a.statut = 'ouverte'
      WHERE e.Enseignants_id = ? AND e.etablissement_id = ?
      GROUP BY m.id, m.nom, c.id, c.nom, c.Promotion_id
      ORDER BY c.Promotion_id IS NULL, c.Promotion_id, LENGTH(c.nom), c.nom, m.nom
    `;

    // Année en cours seulement : après une clôture, les classes de l'année
    // passée apparaissaient en double.
    const [rows] = await db.query(query, [enseignantId, req.user.etablissementId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur du serveur" });
  }
});

// Emploi du temps d'un enseignant dans l'établissement : créneaux des
// classes et matières qu'il enseigne cette année (saisis dans les
// programmes des classes), conflits (deux classes au même moment) et
// classes dont l'horaire n'est pas encore saisi.
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
function minutes(t) {
  const m = String(t || '').trim().match(/^(\d{1,2})\s*(?:h|:)\s*(\d{0,2})/i);
  return m ? Number(m[1]) * 60 + Number(m[2] || 0) : null;
}
function plage(horaire) {
  const [a, b] = String(horaire || '').split(/\s*[-–à]\s*/);
  return { debut: minutes(a), fin: minutes(b) };
}

async function emploiDuTemps(enseignantId, etablissementId) {
    const [[enseignant]] = await db.query('SELECT id, nom, prenom FROM enseignants WHERE id = ? AND etablissement_id = ?', [enseignantId, etablissementId]);
    if (!enseignant) return null;

    const [affectations] = await db.query(
      `SELECT e.Classes_id AS classeId, c.nom AS classe, e.matiere_id AS matiereId, m.nom AS matiere
       FROM enseigner e
       JOIN classes c ON c.id = e.Classes_id
       JOIN matieres m ON m.id = e.matiere_id
       JOIN annee_scolaire a ON a.id = e.Annee_scolaire_id AND a.statut = 'ouverte'
       WHERE e.Enseignants_id = ? AND e.etablissement_id = ?
       ORDER BY c.Promotion_id IS NULL, c.Promotion_id, LENGTH(c.nom), c.nom`,
      [enseignant.id, etablissementId]
    );
    const creneaux = [];
    if (affectations.length) {
      const [rows] = await db.query(
        `SELECT p.classe_id, p.\`matière_id\` AS matiere_id, p.jour, p.horaire FROM programmes p
         WHERE p.etablissement_id = ? AND p.classe_id IN (?) AND p.Annee_scolaire_id = (SELECT a.id FROM annee_scolaire a WHERE a.etablissement_id = p.etablissement_id AND a.statut = 'ouverte' ORDER BY a.id DESC LIMIT 1)`,
        [etablissementId, [...new Set(affectations.map((a) => a.classeId))]]
      );
      for (const r of rows) {
        const a = affectations.find((x) => x.classeId === r.classe_id && x.matiereId === r.matiere_id);
        if (!a) continue;
        const jour = JOURS.find((x) => x.toLowerCase() === String(r.jour || '').trim().toLowerCase()) || String(r.jour || '').trim();
        creneaux.push({ jour, horaire: r.horaire, ...plage(r.horaire), classe: a.classe, matiere: a.matiere });
      }
    }
    creneaux.sort((x, y) => (JOURS.indexOf(x.jour) - JOURS.indexOf(y.jour)) || ((x.debut ?? 0) - (y.debut ?? 0)));

    // Conflits : même jour, horaires qui se chevauchent, classes différentes.
    const conflits = [];
    for (let i = 0; i < creneaux.length; i += 1) {
      for (let j = i + 1; j < creneaux.length; j += 1) {
        const a = creneaux[i]; const b = creneaux[j];
        if (a.jour !== b.jour || a.debut === null || b.debut === null) continue;
        if (a.debut < (b.fin ?? b.debut + 60) && b.debut < (a.fin ?? a.debut + 60)) {
          a.conflit = true; b.conflit = true;
          conflits.push(`${a.jour} ${a.horaire} : ${a.classe} (${a.matiere}) et ${b.classe} (${b.matiere})`);
        }
      }
    }
    const avecHoraire = new Set(creneaux.map((c) => `${c.classe}|${c.matiere}`));
    const sansHoraire = affectations.filter((a) => !avecHoraire.has(`${a.classe}|${a.matiere}`)).map((a) => ({ classe: a.classe, matiere: a.matiere }));
    const heures = creneaux.reduce((t, c) => t + (c.fin !== null && c.debut !== null ? (c.fin - c.debut) / 60 : 0), 0);

    return { enseignant, creneaux, conflits, sansHoraire, heuresParSemaine: Math.round(heures * 10) / 10, jours: JOURS.slice(0, 6) };
}

// Administration : emploi du temps d'un enseignant de l'établissement.
router.get('/enseignants/:id/emploi-du-temps', authenticateJWT, requireAdminStaff, async (req, res) => {
  try {
    const edt = await emploiDuTemps(req.params.id, Number(req.user.etablissementId));
    if (!edt) return res.status(404).json({ message: 'Enseignant introuvable.' });
    res.json(edt);
  } catch (error) {
    console.error('Erreur emploi du temps enseignant :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Enseignant connecté : son emploi du temps — dans TOUS ses établissements
// s'il en a plusieurs (un cours à 8h dans deux écoles est signalé). Chaque
// école, elle, ne voit que ses propres cours.
router.get('/enseignant/emploi-du-temps', authenticateJWT, async (req, res) => {
  if (req.user.role !== 'enseignant') return res.status(403).json({ message: 'Réservé aux enseignants.' });
  try {
    const edt = await emploiDuTemps(req.user.id, Number(req.user.etablissementId));
    if (!edt) return res.status(404).json({ message: 'Enseignant introuvable.' });
    const [[moi]] = await db.query('SELECT compte_id FROM enseignants WHERE id = ?', [req.user.id]);
    const fiches = moi && moi.compte_id ? await comptesEns.fichesActives(db, [moi.compte_id]) : [];
    if (fiches.length > 1) {
      const tous = { ...edt, creneaux: [], sansHoraire: [], conflits: [], plusieursEtablissements: true, etablissements: fiches.map((f) => f.etablissement_nom) };
      for (const f of fiches) {
        const e = f.id === Number(req.user.id) ? edt : await emploiDuTemps(f.id, f.etablissement_id);
        if (!e) continue;
        const ecole = f.etablissement_nom;
        tous.creneaux.push(...e.creneaux.map((c) => ({ ...c, conflit: false, classe: `${c.classe} · ${ecole}`, etablissement: ecole })));
        tous.sansHoraire.push(...e.sansHoraire.map((x) => ({ ...x, classe: `${x.classe} · ${ecole}` })));
      }
      tous.creneaux.sort((x, y) => (JOURS.indexOf(x.jour) - JOURS.indexOf(y.jour)) || ((x.debut ?? 0) - (y.debut ?? 0)));
      for (let i = 0; i < tous.creneaux.length; i += 1) {
        for (let j = i + 1; j < tous.creneaux.length; j += 1) {
          const x = tous.creneaux[i]; const y = tous.creneaux[j];
          if (x.jour !== y.jour || x.debut === null || y.debut === null) continue;
          if (x.debut < (y.fin ?? y.debut + 60) && y.debut < (x.fin ?? x.debut + 60)) {
            x.conflit = true; y.conflit = true;
            tous.conflits.push(`${x.jour} ${x.horaire} : ${x.classe} (${x.matiere}) et ${y.classe} (${y.matiere})`);
          }
        }
      }
      tous.heuresParSemaine = Math.round(tous.creneaux.reduce((t, c) => t + (c.fin !== null && c.debut !== null ? (c.fin - c.debut) / 60 : 0), 0) * 10) / 10;
      return res.json(tous);
    }
    res.json(edt);
  } catch (error) {
    console.error('Erreur emploi du temps enseignant :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Suppression d'un enseignant : refusée tant qu'il est affecté à une
// classe ou une matière (il faut d'abord retirer ses affectations dans la
// Répartition), ou s'il a un historique à conserver (années passées,
// cahier de texte, devoirs) — sinon les bulletins passés seraient abîmés.
router.delete('/Enseignants/:id', authenticateJWT, requireAdminStaff, async (req, res) => {
  const id = req.params.id;
  try {
    const [target] = await req.db.query('SELECT etablissement_id, nom, prenom FROM enseignants WHERE id = ? AND actif = 1', [id]);
    if (target.length === 0) {
      return res.status(404).json({ message: 'Enseignant non trouvé.' });
    }
    if (Number(target[0].etablissement_id) !== Number(req.user.etablissementId)) {
      return res.status(403).json({ message: "Cet enseignant n'appartient pas à votre établissement." });
    }
    const nom = `${target[0].prenom} ${target[0].nom}`;

    const [affectations] = await req.db.query(
      `SELECT c.nom AS classe, m.nom AS matiere
       FROM enseigner e
       JOIN classes c ON c.id = e.Classes_id
       JOIN matieres m ON m.id = e.matiere_id
       JOIN annee_scolaire a ON a.id = e.Annee_scolaire_id AND a.statut = 'ouverte'
       WHERE e.Enseignants_id = ?
       ORDER BY c.Promotion_id IS NULL, c.Promotion_id, LENGTH(c.nom), c.nom, m.nom`,
      [id]
    );
    if (affectations.length) {
      return res.status(409).json({
        code: 'AFFECTE',
        message: `${nom} est encore affecté(e) à ${affectations.length} classe(s). Retirez d'abord ses affectations (Enseignants → Répartition), puis revenez le/la retirer.`,
        affectations,
      });
    }

    const [[historique]] = await req.db.query(
      `SELECT (SELECT COUNT(*) FROM enseigner WHERE Enseignants_id = ?)
            + (SELECT COUNT(*) FROM tests WHERE enseignant_id = ?)
            + (SELECT COUNT(*) FROM devoirs WHERE enseignant_id = ?) AS n`,
      [id, id, id]
    );
    // Avec un historique (notes, cahier de texte, devoirs) : la fiche est
    // gardée mais désactivée — il n'a plus accès à l'établissement, ses
    // autres écoles et son compte ne sont pas touchés.
    if (Number(historique.n) > 0) {
      await req.db.query('UPDATE enseignants SET actif = 0 WHERE id = ?', [id]);
      oublierEnseignant(id);
      return res.json({ retire: true, message: `${nom} a été retiré(e) de l'établissement. Son historique (notes, cahier de texte, devoirs) est conservé.` });
    }

    await req.db.query('DELETE FROM enseignants WHERE id = ?', [id]);
    oublierEnseignant(id);
    res.json({ message: `${nom} a été retiré(e) de l'établissement.` });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      // Lié à d'autres données (demandes de modification de notes...) : retiré sans effacer.
      await req.db.query('UPDATE enseignants SET actif = 0 WHERE id = ?', [id]);
      oublierEnseignant(id);
      return res.json({ retire: true, message: "L'enseignant a été retiré de l'établissement. Son historique est conservé." });
    }
    console.error('Erreur suppression enseignant :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression.' });
  }
});

module.exports = router;
