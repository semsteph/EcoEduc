// =====================================================================
//  ROUTES SCOLARITÉ & PAIEMENTS
//  Fichier : routes/scolarite.routes.js
//
//  Monté dans server.js avec :
//     const scolariteRoutes = require('./routes/scolarite.routes');
//     app.use('/api/scolarite', scolariteRoutes);
//
//  Toutes les routes ci-dessous sont donc relatives à /api/scolarite
//  (ex : router.get('/eleves/...') => GET /api/scolarite/eleves/...)
//
//  NB : req.db provient du middleware déjà présent dans server.js
//  HYPOTHÈSE SCHÉMA : table des élèves "eleve" (id, nom, prenom, classe_id)
//  >>> Si ta table s'appelle "eleves", remplace-le aux 2 endroits (*).
// =====================================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');

// MySQL renvoie les colonnes DATE en objets Date locaux ; .toISOString() les décale
// en UTC (bug d'un jour selon le fuseau du serveur). On formate toujours en local.
function toISODate(value) {
  if (!value) return null;
  return dayjs(value).format('YYYY-MM-DD');
}

// ---------------------------------------------------------------------
// Upload des preuves de paiement (capture d'écran Mobile Money, etc.)
// ---------------------------------------------------------------------
const preuvesDir = path.join(__dirname, '..', 'uploads', 'preuves_paiement');
fs.mkdirSync(preuvesDir, { recursive: true });

const storagePreuve = multer.diskStorage({
  destination: (req, file, cb) => cb(null, preuvesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `preuve_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const uploadPreuve = multer({
  storage: storagePreuve,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Seules les images sont acceptées.'));
  }
});

// ---------------------------------------------------------------------
// Auth parent (même secret que server.cjs)
// ---------------------------------------------------------------------
function authenticateParent(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant.' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token invalide ou expiré.' });
    req.user = user;
    next();
  });
}

// ---------------------------------------------------------------------
// Auth établissement / collaborateur (mêmes tokens que le reste de l'admin,
// voir authenticateJWT dans server.cjs). Requis sur toutes les routes de
// gestion de la scolarité et des paiements : elles manipulent des données
// financières et ne doivent pas être accessibles sans session valide.
// ---------------------------------------------------------------------
function authenticateStaff(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant.' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token invalide ou expiré.' });
    req.user = user;
    next();
  });
}

// Vérifie que l'établissement demandé est bien celui de l'utilisateur authentifié
// (authenticateStaff n'est pas suffisant seul : ça vérifie une signature de token,
// pas que le token appartient à CET établissement).
function verifierEtablissementOr403(req, res, etablissementId) {
  if (Number(etablissementId) !== Number(req.user.etablissementId)) {
    res.status(403).json({ message: "Vous n'avez pas accès à cet établissement." });
    return false;
  }
  return true;
}

async function verifierClasseEtablissementOr403(req, res, classeId) {
  const [rows] = await req.db.query('SELECT etablissement_id FROM classes WHERE id = ?', [classeId]);
  if (rows.length === 0) {
    res.status(404).json({ message: 'Classe introuvable.' });
    return false;
  }
  return verifierEtablissementOr403(req, res, rows[0].etablissement_id);
}

async function verifierEleveEtablissementOr403(req, res, eleveId) {
  const [rows] = await req.db.query('SELECT etablissement_id FROM eleve WHERE id = ?', [eleveId]);
  if (rows.length === 0) {
    res.status(404).json({ message: 'Élève introuvable.' });
    return false;
  }
  return verifierEtablissementOr403(req, res, rows[0].etablissement_id);
}

async function verifierPaiementEtablissementOr403(req, res, paiementId) {
  const [rows] = await req.db.query(
    `SELECT s.etablissement_id FROM paiement p JOIN scolarite s ON s.id = p.scolarite_id WHERE p.id = ?`,
    [paiementId]
  );
  if (rows.length === 0) {
    res.status(404).json({ message: 'Paiement introuvable.' });
    return false;
  }
  return verifierEtablissementOr403(req, res, rows[0].etablissement_id);
}

// Vérifie que l'élève appartient bien au parent authentifié, renvoie l'élève (avec classe_id)
async function getEleveDuParentOr403(req, res, eleveId) {
  const [rows] = await req.db.query(
    `SELECT id, nom, prenom, classe_id, etablissement_id, Annee_scolaire_id, Parents_id
     FROM eleve WHERE id = ?`,
    [eleveId]
  );
  if (rows.length === 0) {
    res.status(404).json({ message: 'Élève introuvable.' });
    return null;
  }
  if (Number(rows[0].Parents_id) !== Number(req.user.id)) {
    res.status(403).json({ message: "Cet élève n'appartient pas à votre compte." });
    return null;
  }
  return rows[0];
}

// Calcule le statut de chaque échéance par répartition en cascade du montant payé
function calculerEcheances(echeances, montantPaye) {
  let reste = Number(montantPaye) || 0;
  const today = dayjs().format('YYYY-MM-DD');

  return echeances.map((e) => {
    const montant = Number(e.montant);
    const couvert = Math.min(reste, montant);
    reste -= couvert;
    const dateLimite = toISODate(e.date_limite);

    let statut;
    if (couvert >= montant) statut = 'payee';
    else if (dateLimite < today) statut = 'en_retard';
    else statut = 'a_venir';

    return {
      id: e.id,
      libelle: e.libelle,
      montant,
      dateLimite,
      ordre: e.ordre,
      montantCouvert: couvert,
      statut
    };
  });
}


// ---------------------------------------------------------------------
// GET /api/scolarite/eleves/:classId/:anneeScolaireId
// Liste des élèves d'une classe + situation (total, payé, reste)
// ---------------------------------------------------------------------
router.get('/eleves/:classId/:anneeScolaireId', authenticateStaff, async (req, res) => {
  const { classId, anneeScolaireId } = req.params;
  if (!(await verifierClasseEtablissementOr403(req, res, classId))) return;
  try {
    const [rows] = await req.db.query(
      `SELECT e.id, e.nom, e.prenom,
              COALESCE(s.montant_total, 0) AS montantTotal,
              COALESCE(s.montant_paye, 0)  AS montantPaye,
              COALESCE(s.reste, 0)         AS reste
       FROM eleve e                                   -- (*) eleve / eleves
       LEFT JOIN scolarite s
              ON s.eleve_id = e.id
             AND s.annee_scolaire_id = ?
       WHERE e.classe_id = ?
       ORDER BY e.nom, e.prenom`,
      [anneeScolaireId, classId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /eleves :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des élèves.' });
  }
});


// ---------------------------------------------------------------------
// GET /api/scolarite/paiements/:eleveId/:anneeScolaireId
// Historique des paiements d'un élève
// ---------------------------------------------------------------------
router.get('/paiements/:eleveId/:anneeScolaireId', authenticateStaff, async (req, res) => {
  const { eleveId, anneeScolaireId } = req.params;
  if (!(await verifierEleveEtablissementOr403(req, res, eleveId))) return;
  try {
    const [rows] = await req.db.query(
      `SELECT p.id, p.montant,
              p.mode_paiement AS modePaiement,
              p.date_paiement AS datePaiement,
              p.reference
       FROM paiement p
       JOIN scolarite s ON s.id = p.scolarite_id
       WHERE s.eleve_id = ? AND s.annee_scolaire_id = ?
       ORDER BY p.date_paiement DESC, p.id DESC`,
      [eleveId, anneeScolaireId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /paiements :', err);
    res.status(500).json({ message: "Erreur lors du chargement de l'historique." });
  }
});


// ---------------------------------------------------------------------
// POST /api/scolarite/paiement
// Enregistrer un paiement
// body : { eleveId, anneeScolaireId, montant, modePaiement, datePaiement, reference }
// ---------------------------------------------------------------------
router.post('/paiement', authenticateStaff, async (req, res) => {
  const {
    eleveId, anneeScolaireId,
    montant, modePaiement, datePaiement, reference
  } = req.body;

  const montantNum = Number(montant);
  if (!eleveId || !anneeScolaireId || !montantNum || montantNum <= 0) {
    return res.status(400).json({ message: 'Données de paiement invalides.' });
  }
  if (!(await verifierEleveEtablissementOr403(req, res, eleveId))) return;

  const conn = await req.db.getConnection();
  try {
    await conn.beginTransaction();

    const [scol] = await conn.query(
      `SELECT id, reste FROM scolarite
       WHERE eleve_id = ? AND annee_scolaire_id = ?`,
      [eleveId, anneeScolaireId]
    );

    if (scol.length === 0) {
      await conn.rollback();
      return res.status(400).json({
        message: "La scolarité de cet élève n'a pas été définie (montant total manquant)."
      });
    }

    const scolariteId = scol[0].id;
    const reste = Number(scol[0].reste);

    if (montantNum > reste) {
      await conn.rollback();
      return res.status(400).json({
        message: `Le montant dépasse le reste à payer (${reste}).`
      });
    }

    await conn.query(
      `INSERT INTO paiement (scolarite_id, montant, statut, mode_paiement, date_paiement, reference, traite_at)
       VALUES (?, ?, 'valide', ?, ?, ?, NOW())`,
      [scolariteId, montantNum, modePaiement || 'Espèces', datePaiement, reference || null]
    );

    await conn.commit();
    res.json({ message: 'Paiement enregistré avec succès.' });
  } catch (err) {
    await conn.rollback();
    console.error('Erreur POST /paiement :', err);
    res.status(500).json({ message: "Échec de l'enregistrement du paiement." });
  } finally {
    conn.release();
  }
});


// ---------------------------------------------------------------------
// POST /api/scolarite/montant
// Définir le montant total de scolarité d'UN élève
// body : { eleveId, classeId, anneeScolaireId, etablissementId, montantTotal }
// ---------------------------------------------------------------------
router.post('/montant', authenticateStaff, async (req, res) => {
  const { eleveId, classeId, anneeScolaireId, etablissementId, montantTotal } = req.body;

  if (!eleveId || !classeId || !anneeScolaireId || !etablissementId || montantTotal == null) {
    return res.status(400).json({ message: 'Champs manquants.' });
  }
  if (!verifierEtablissementOr403(req, res, etablissementId)) return;

  try {
    await req.db.query(
      `INSERT INTO scolarite (eleve_id, classe_id, annee_scolaire_id, etablissement_id, montant_total)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         montant_total    = VALUES(montant_total),
         classe_id        = VALUES(classe_id),
         etablissement_id = VALUES(etablissement_id)`,
      [eleveId, classeId, anneeScolaireId, etablissementId, montantTotal]
    );
    res.json({ message: 'Scolarité enregistrée.' });
  } catch (err) {
    console.error('Erreur POST /montant :', err);
    res.status(500).json({ message: "Échec de l'enregistrement de la scolarité." });
  }
});


// ---------------------------------------------------------------------
// POST /api/scolarite/classe
// Appliquer le même montant à TOUS les élèves d'une classe
// body : { classeId, anneeScolaireId, etablissementId, montantTotal }
// ---------------------------------------------------------------------
router.post('/classe', authenticateStaff, async (req, res) => {
  const { classeId, anneeScolaireId, etablissementId, montantTotal } = req.body;

  if (!classeId || !anneeScolaireId || !etablissementId || montantTotal == null) {
    return res.status(400).json({ message: 'Champs manquants.' });
  }
  if (!verifierEtablissementOr403(req, res, etablissementId)) return;

  try {
    const [result] = await req.db.query(
      `INSERT INTO scolarite (eleve_id, classe_id, annee_scolaire_id, etablissement_id, montant_total)
       SELECT e.id, ?, ?, ?, ?
       FROM eleve e                                   -- (*) eleve / eleves
       WHERE e.classe_id = ?
       ON DUPLICATE KEY UPDATE montant_total = VALUES(montant_total)`,
      [classeId, anneeScolaireId, etablissementId, montantTotal, classeId]
    );
    res.json({ message: `Frais appliqués à ${result.affectedRows} ligne(s).` });
  } catch (err) {
    console.error('Erreur POST /classe :', err);
    res.status(500).json({ message: "Échec de l'application des frais." });
  }
});

// ---------------------------------------------------------------------
// GET /api/scolarite/promotions/:etablissementId
// Liste des promotions (6ème, 5ème, ...) qui ont au moins une classe dans
// cet établissement — évite de proposer dans le select un niveau qui n'a
// aucune classe (et donc aucun élève à qui appliquer le montant).
// ---------------------------------------------------------------------
router.get('/promotions/:etablissementId', authenticateStaff, async (req, res) => {
  const { etablissementId } = req.params;
  if (!verifierEtablissementOr403(req, res, etablissementId)) return;

  try {
    const [rows] = await req.db.query(
      `SELECT DISTINCT pr.id, pr.nom
       FROM classes c
       JOIN promotion pr ON pr.id = c.Promotion_id
       WHERE c.etablissement_id = ?
       ORDER BY pr.id ASC`,
      [etablissementId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /promotions :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des promotions.' });
  }
});

// ---------------------------------------------------------------------
// POST /api/scolarite/promotion
// Appliquer le même montant à TOUS les élèves de TOUTES les classes
// d'une promotion (ex : toutes les classes de 6ème) pour cet établissement.
// body : { promotionId, anneeScolaireId, etablissementId, montantTotal }
// ---------------------------------------------------------------------
router.post('/promotion', authenticateStaff, async (req, res) => {
  const { promotionId, anneeScolaireId, etablissementId, montantTotal } = req.body;

  if (!promotionId || !anneeScolaireId || !etablissementId || montantTotal == null) {
    return res.status(400).json({ message: 'Champs manquants.' });
  }
  if (!verifierEtablissementOr403(req, res, etablissementId)) return;

  try {
    const [classesRows] = await req.db.query(
      `SELECT id FROM classes WHERE Promotion_id = ? AND etablissement_id = ?`,
      [promotionId, etablissementId]
    );

    if (classesRows.length === 0) {
      return res.status(404).json({ message: 'Aucune classe trouvée pour cette promotion.' });
    }

    const [result] = await req.db.query(
      `INSERT INTO scolarite (eleve_id, classe_id, annee_scolaire_id, etablissement_id, montant_total)
       SELECT e.id, e.classe_id, ?, ?, ?
       FROM eleve e
       JOIN classes c ON c.id = e.classe_id
       WHERE c.Promotion_id = ? AND c.etablissement_id = ?
       ON DUPLICATE KEY UPDATE montant_total = VALUES(montant_total)`,
      [anneeScolaireId, etablissementId, montantTotal, promotionId, etablissementId]
    );

    res.json({
      message: `Frais appliqués à ${result.affectedRows} élève(s) sur ${classesRows.length} classe(s).`,
      nombreClasses: classesRows.length,
      nombreEleves: result.affectedRows
    });
  } catch (err) {
    console.error('Erreur POST /promotion :', err);
    res.status(500).json({ message: "Échec de l'application des frais." });
  }
});


// =====================================================================
//  ÉCHÉANCES (calendrier de tranches, définies par l'administration)
// =====================================================================

// ---------------------------------------------------------------------
// GET /api/scolarite/echeances/:classeId/:anneeScolaireId
// ---------------------------------------------------------------------
router.get('/echeances/:classeId/:anneeScolaireId', authenticateStaff, async (req, res) => {
  const { classeId, anneeScolaireId } = req.params;
  if (!(await verifierClasseEtablissementOr403(req, res, classeId))) return;
  try {
    const [rows] = await req.db.query(
      `SELECT id, libelle, montant, date_limite, ordre
       FROM echeance
       WHERE classe_id = ? AND annee_scolaire_id = ?
       ORDER BY ordre ASC, date_limite ASC`,
      [classeId, anneeScolaireId]
    );
    res.json(rows.map((r) => ({ ...r, date_limite: toISODate(r.date_limite) })));
  } catch (err) {
    console.error('Erreur GET /echeances :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des échéances.' });
  }
});

// ---------------------------------------------------------------------
// POST /api/scolarite/echeances
// Remplace tout le calendrier d'une classe pour une année donnée.
// body : { classeId, anneeScolaireId, etablissementId, echeances: [{ libelle, montant, dateLimite, ordre }] }
// ---------------------------------------------------------------------
router.post('/echeances', authenticateStaff, async (req, res) => {
  const { classeId, anneeScolaireId, etablissementId, echeances } = req.body;

  if (!classeId || !anneeScolaireId || !etablissementId || !Array.isArray(echeances)) {
    return res.status(400).json({ message: 'Champs manquants.' });
  }
  for (const e of echeances) {
    if (!e.libelle || e.montant == null || Number(e.montant) <= 0 || !e.dateLimite) {
      return res.status(400).json({ message: 'Chaque échéance doit avoir un libellé, un montant > 0 et une date limite.' });
    }
  }
  if (!verifierEtablissementOr403(req, res, etablissementId)) return;

  const conn = await req.db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `DELETE FROM echeance WHERE classe_id = ? AND annee_scolaire_id = ?`,
      [classeId, anneeScolaireId]
    );

    for (let i = 0; i < echeances.length; i++) {
      const e = echeances[i];
      await conn.query(
        `INSERT INTO echeance (classe_id, annee_scolaire_id, etablissement_id, libelle, montant, date_limite, ordre)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [classeId, anneeScolaireId, etablissementId, e.libelle, Number(e.montant), e.dateLimite, e.ordre ?? i + 1]
      );
    }

    await conn.commit();
    res.json({ message: 'Calendrier des échéances enregistré.' });
  } catch (err) {
    await conn.rollback();
    console.error('Erreur POST /echeances :', err);
    res.status(500).json({ message: "Échec de l'enregistrement du calendrier." });
  } finally {
    conn.release();
  }
});

// =====================================================================
//  VALIDATION DES PAIEMENTS DÉCLARÉS (côté administration)
// =====================================================================

// ---------------------------------------------------------------------
// GET /api/scolarite/paiements-en-attente/:etablissementId/:anneeScolaireId
// ---------------------------------------------------------------------
router.get('/paiements-en-attente/:etablissementId/:anneeScolaireId', authenticateStaff, async (req, res) => {
  const { etablissementId, anneeScolaireId } = req.params;
  if (!verifierEtablissementOr403(req, res, etablissementId)) return;
  try {
    const [rows] = await req.db.query(
      `SELECT p.id, p.montant, p.mode_paiement AS modePaiement, p.date_paiement AS datePaiement,
              p.reference, p.preuve_url AS preuveUrl, p.created_at AS declareLe,
              e.id AS eleveId, e.nom, e.prenom,
              pa.nom AS parentNom, pa.prenom AS parentPrenom
       FROM paiement p
       JOIN scolarite s ON s.id = p.scolarite_id
       JOIN eleve e ON e.id = s.eleve_id
       LEFT JOIN parents pa ON pa.id = p.parent_id
       WHERE s.etablissement_id = ? AND s.annee_scolaire_id = ? AND p.statut = 'en_attente'
       ORDER BY p.created_at ASC`,
      [etablissementId, anneeScolaireId]
    );
    res.json(rows.map((r) => ({ ...r, datePaiement: toISODate(r.datePaiement) })));
  } catch (err) {
    console.error('Erreur GET /paiements-en-attente :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des paiements en attente.' });
  }
});

// ---------------------------------------------------------------------
// PUT /api/scolarite/paiement/:id/valider
// ---------------------------------------------------------------------
router.put('/paiement/:id/valider', authenticateStaff, async (req, res) => {
  const { id } = req.params;
  if (!(await verifierPaiementEtablissementOr403(req, res, id))) return;
  try {
    const [result] = await req.db.query(
      `UPDATE paiement SET statut = 'valide', traite_at = NOW()
       WHERE id = ? AND statut = 'en_attente'`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Paiement introuvable ou déjà traité.' });
    }
    res.json({ message: 'Paiement validé.' });
  } catch (err) {
    console.error('Erreur PUT /paiement/:id/valider :', err);
    res.status(500).json({ message: 'Échec de la validation.' });
  }
});

// ---------------------------------------------------------------------
// PUT /api/scolarite/paiement/:id/rejeter
// body : { motif }
// ---------------------------------------------------------------------
router.put('/paiement/:id/rejeter', authenticateStaff, async (req, res) => {
  const { id } = req.params;
  const { motif } = req.body;
  if (!(await verifierPaiementEtablissementOr403(req, res, id))) return;
  try {
    const [result] = await req.db.query(
      `UPDATE paiement SET statut = 'rejete', motif_rejet = ?, traite_at = NOW()
       WHERE id = ? AND statut = 'en_attente'`,
      [motif || null, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Paiement introuvable ou déjà traité.' });
    }
    res.json({ message: 'Paiement rejeté.' });
  } catch (err) {
    console.error('Erreur PUT /paiement/:id/rejeter :', err);
    res.status(500).json({ message: 'Échec du rejet.' });
  }
});

// =====================================================================
//  ESPACE PARENT
// =====================================================================

// ---------------------------------------------------------------------
// GET /api/scolarite/enfant/:eleveId/:anneeScolaireId
// Résumé complet pour un enfant : total/payé/reste, échéances calculées, historique
// ---------------------------------------------------------------------
router.get('/enfant/:eleveId/:anneeScolaireId', authenticateParent, async (req, res) => {
  const { eleveId, anneeScolaireId } = req.params;
  try {
    const eleve = await getEleveDuParentOr403(req, res, eleveId);
    if (!eleve) return;

    const [scolRows] = await req.db.query(
      `SELECT id, montant_total AS montantTotal, montant_paye AS montantPaye, reste
       FROM scolarite WHERE eleve_id = ? AND annee_scolaire_id = ?`,
      [eleveId, anneeScolaireId]
    );

    if (scolRows.length === 0) {
      return res.json({
        defini: false,
        montantTotal: 0,
        montantPaye: 0,
        reste: 0,
        echeances: [],
        historique: []
      });
    }

    const scol = scolRows[0];

    const [echeanceRows] = await req.db.query(
      `SELECT id, libelle, montant, date_limite, ordre
       FROM echeance
       WHERE classe_id = ? AND annee_scolaire_id = ?
       ORDER BY ordre ASC, date_limite ASC`,
      [eleve.classe_id, anneeScolaireId]
    );
    const echeances = calculerEcheances(echeanceRows, scol.montantPaye);

    const [historique] = await req.db.query(
      `SELECT id, montant, statut, mode_paiement AS modePaiement, date_paiement AS datePaiement,
              reference, preuve_url AS preuveUrl, motif_rejet AS motifRejet, created_at AS declareLe
       FROM paiement WHERE scolarite_id = ?
       ORDER BY created_at DESC`,
      [scol.id]
    );

    res.json({
      defini: true,
      montantTotal: scol.montantTotal,
      montantPaye: scol.montantPaye,
      reste: scol.reste,
      echeances,
      historique: historique.map((h) => ({ ...h, datePaiement: toISODate(h.datePaiement) }))
    });
  } catch (err) {
    console.error('Erreur GET /enfant :', err);
    res.status(500).json({ message: 'Erreur lors de la récupération de la scolarité.' });
  }
});

// ---------------------------------------------------------------------
// POST /api/scolarite/paiement/declarer
// Le parent déclare un paiement fait en dehors de l'app (Mobile Money, espèces au bureau...)
// avec une capture d'écran / reçu comme preuve. Reste 'en_attente' jusqu'à validation admin.
// form-data : eleveId, anneeScolaireId, montant, modePaiement, datePaiement, reference, capture (fichier)
// ---------------------------------------------------------------------
router.post('/paiement/declarer', authenticateParent, uploadPreuve.single('capture'), async (req, res) => {
  const { eleveId, anneeScolaireId, montant, modePaiement, datePaiement, reference } = req.body;
  const montantNum = Number(montant);

  if (!eleveId || !anneeScolaireId || !montantNum || montantNum <= 0 || !datePaiement) {
    return res.status(400).json({ message: 'Données de paiement invalides.' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'Une capture (preuve de paiement) est requise.' });
  }

  try {
    const eleve = await getEleveDuParentOr403(req, res, eleveId);
    if (!eleve) return;

    const [scol] = await req.db.query(
      `SELECT id FROM scolarite WHERE eleve_id = ? AND annee_scolaire_id = ?`,
      [eleveId, anneeScolaireId]
    );
    if (scol.length === 0) {
      return res.status(400).json({
        message: "La scolarité de cet élève n'a pas encore été définie par l'administration."
      });
    }

    const preuveUrl = `/uploads/preuves_paiement/${req.file.filename}`;

    await req.db.query(
      `INSERT INTO paiement (scolarite_id, montant, statut, mode_paiement, date_paiement, reference, preuve_url, parent_id)
       VALUES (?, ?, 'en_attente', ?, ?, ?, ?, ?)`,
      [scol[0].id, montantNum, modePaiement || 'Mobile Money', datePaiement, reference || null, preuveUrl, req.user.id]
    );

    res.json({ message: 'Paiement déclaré. En attente de validation par l\'administration.' });
  } catch (err) {
    console.error('Erreur POST /paiement/declarer :', err);
    res.status(500).json({ message: 'Échec de la déclaration du paiement.' });
  }
});

module.exports = router;