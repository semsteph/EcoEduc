// =====================================================================
//  Authentification (enseignants, parents, établissement) et mots de passe
//  Monté dans server.cjs avec : app.use('/api', require('./routes/auth.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/loginEns', async (req, res) => {
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
    const storedPassword = (enseignant.enseignant_mot_de_passe || '').trim();
    const inputPassword = password.trim();
    const isBcryptHash = /^\$2[aby]\$/.test(storedPassword);

    let passwordOk;
    if (isBcryptHash) {
      passwordOk = await bcrypt.compare(inputPassword, storedPassword);
    } else {
      // Compte hérité créé avant le passage au hachage : on accepte encore une
      // comparaison en clair une seule fois, puis on migre immédiatement le
      // mot de passe vers un hash bcrypt pour cette ligne.
      passwordOk = inputPassword === storedPassword;
      if (passwordOk) {
        const migratedHash = await bcrypt.hash(inputPassword, 10);
        await db.query('UPDATE enseignants SET mot_de_passe = ? WHERE id = ?', [migratedHash, enseignant.enseignant_id]);
      }
    }

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

// Génère un code à 6 chiffres
function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Route pour envoyer le code par email
router.post('/send-reset-code', async (req, res) => {
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
router.post('/verify-reset-code', async (req, res) => {
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

    // Jeton de réinitialisation signé et à courte durée de vie : prouve que le code
    // OTP a bien été vérifié pour CE compte, sans laisser le client choisir l'id cible.
    const resetToken = jwt.sign(
      { purpose: 'teacher-password-reset', enseignantId: enseignant[0].id },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.status(200).json({ message: 'Code valide.', resetToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la vérification du code.' });
  }
});

// Mise à jour du mot de passe
router.post('/update-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return res.status(400).json({ message: 'Jeton de réinitialisation et nouveau mot de passe requis.' });
  }

  let payload;
  try {
    payload = jwt.verify(resetToken, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Jeton de réinitialisation invalide ou expiré.' });
  }

  if (payload.purpose !== 'teacher-password-reset' || !payload.enseignantId) {
    return res.status(401).json({ message: 'Jeton de réinitialisation invalide.' });
  }

  const enseignantId = payload.enseignantId;

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

router.post("/parent/login", async (req, res) => {
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

router.post('/send', async (req, res) => {
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

router.post('/parent-verify-reset-code', async (req, res) => {
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

    // Jeton de réinitialisation signé et à courte durée de vie : prouve que le code
    // OTP a bien été vérifié pour CE compte, sans laisser le client choisir l'id cible.
    const resetToken = jwt.sign(
      { purpose: 'parent-password-reset', parentId, etablissementId: etablissement },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.json({ success: true, message: 'Code valide.', resetToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

router.post('/parent-update-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return res.status(400).json({ success: false, message: 'Champs manquants.' });
  }

  let payload;
  try {
    payload = jwt.verify(resetToken, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Jeton de réinitialisation invalide ou expiré.' });
  }

  if (payload.purpose !== 'parent-password-reset' || !payload.parentId) {
    return res.status(401).json({ success: false, message: 'Jeton de réinitialisation invalide.' });
  }

  const { parentId, etablissementId } = payload;

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [result] = await db.query(
      'UPDATE parents SET mot_de_passe = ? WHERE id = ? AND etablissement_id = ?',
      [hashedPassword, parentId, etablissementId]
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
router.post("/parents/check-email", async (req, res) => {
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
router.post("/parents/verify-code", async (req, res) => {
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
router.post("/parents/set-password", async (req, res) => {
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

router.post('/loginEtablissement', async (req, res) => {
  const { nom_utilisateur, mot_de_passe } = req.body;

  // Vérifier si les champs requis sont fournis
  if (!nom_utilisateur || !mot_de_passe) {
    return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis.' });
  }

  try {
    // Connexion à la base de données
    if (!db) {
      console.error('Pas de connexion à la base de données');
      return res.status(500).json({ message: 'Erreur de connexion à la base de données.' });
    }

    // Requête SQL pour trouver l'utilisateur
    const [rows] = await db.query('SELECT * FROM etablissement WHERE nom_utilisateur = ?', [nom_utilisateur]);

    // Vérification si l'utilisateur existe
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Nom d’utilisateur incorrect' });
    }

    const etablissement = rows[0];
    const storedPassword = etablissement.mot_de_passe || '';
    const isBcryptHash = /^\$2[aby]\$/.test(storedPassword);

    let passwordOk;
    if (isBcryptHash) {
      passwordOk = await bcrypt.compare(mot_de_passe, storedPassword);
    } else {
      // Compte hérité créé avant le passage au hachage : on accepte encore une
      // comparaison en clair une seule fois, puis on migre immédiatement le
      // mot de passe vers un hash bcrypt pour cette ligne.
      passwordOk = mot_de_passe === storedPassword;
      if (passwordOk) {
        const migratedHash = await bcrypt.hash(mot_de_passe, 10);
        await db.query('UPDATE etablissement SET mot_de_passe = ? WHERE id = ?', [migratedHash, etablissement.id]);
      }
    }

    if (!passwordOk) {
      return res.status(401).json({ message: 'Mot de passe incorrect.' });
    }

    // Générer un token JWT
    const token = jwt.sign(
      {
        type: 'etablissement',
        etablissementId: etablissement.id,
        nom: etablissement.nom,
      },
      JWT_SECRET,
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

module.exports = router;
