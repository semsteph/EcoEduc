
// =====================================================================
//  ROUTES TABLEAU DE BORD (statistiques agrégées pour l'administration)
//  Montées dans server.cjs avec :
//     const dashboardRoutes = require('./routes/dashboard.routes.cjs');
//     app.use('/api/dashboard', dashboardRoutes);
// =====================================================================

const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');
const db = require('../server-lib/db.cjs');

// Auth établissement / collaborateur (mêmes tokens que le reste de l'admin)
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

// Génère les N derniers mois (format 'YYYY-MM' + libellé court FR) jusqu'au mois courant
function derniersMois(n) {
  const mois = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = dayjs().subtract(i, 'month');
    
    mois.push({ cle: d.format('YYYY-MM'), libelle: d.format('MMM YY') });
  }
  return mois;
}

// ---------------------------------------------------------------------
// GET /api/dashboard/stats/:etablissementId/:anneeScolaireId
// Statistiques agrégées pour le tableau de bord de l'établissement.
// ---------------------------------------------------------------------
router.get('/stats/:etablissementId/:anneeScolaireId', authenticateStaff, async (req, res) => {
  const { etablissementId, anneeScolaireId } = req.params;

  if (Number(etablissementId) !== Number(req.user.etablissementId)) {
    return res.status(403).json({ message: "Vous n'avez pas accès à cet établissement." });
  }

  try {
    const db = req.db;

    const [
      [elevesTotal],
      [enseignantsTotal],
      [classesTotal],
      [parentsTotal],
      genreRows,
      effectifsRows,
      financeRows,
      [enAttenteRow],
      paiementsRows,
      moyennesRows,
      absencesRows,
    ] = await Promise.all([
      db.query('SELECT COUNT(*) AS n FROM eleve WHERE etablissement_id = ? AND Annee_scolaire_id = ?', [etablissementId, anneeScolaireId]).then(([r]) => r),
      db.query('SELECT COUNT(*) AS n FROM enseignants WHERE etablissement_id = ? AND actif = 1', [etablissementId]).then(([r]) => r),
      db.query('SELECT COUNT(*) AS n FROM classes WHERE etablissement_id = ?', [etablissementId]).then(([r]) => r),
      db.query('SELECT COUNT(*) AS n FROM parents WHERE etablissement_id = ? AND Annee_scolaire_id = ?', [etablissementId, anneeScolaireId]).then(([r]) => r),

      db.query(
        'SELECT sexe, COUNT(*) AS n FROM eleve WHERE etablissement_id = ? AND Annee_scolaire_id = ? GROUP BY sexe',
        [etablissementId, anneeScolaireId]
      ).then(([r]) => r),

      db.query(
        `SELECT c.nom AS classe, COUNT(e.id) AS effectif
         FROM classes c
         LEFT JOIN eleve e ON e.classe_id = c.id AND e.Annee_scolaire_id = ?
         WHERE c.etablissement_id = ?
         GROUP BY c.id, c.nom
         ORDER BY c.nom`,
        [anneeScolaireId, etablissementId]
      ).then(([r]) => r),

      db.query(
        `SELECT COALESCE(SUM(montant_total), 0) AS montantTotal,
                COALESCE(SUM(montant_paye), 0)  AS montantPaye
         FROM scolarite
         WHERE etablissement_id = ? AND annee_scolaire_id = ?`,
        [etablissementId, anneeScolaireId]
      ).then(([r]) => r),

      db.query(
        `SELECT COUNT(*) AS n
         FROM paiement p
         JOIN scolarite s ON s.id = p.scolarite_id
         WHERE s.etablissement_id = ? AND s.annee_scolaire_id = ? AND p.statut = 'en_attente'`,
        [etablissementId, anneeScolaireId]
      ).then(([r]) => r),

      db.query(
        `SELECT DATE_FORMAT(p.date_paiement, '%Y-%m') AS mois, SUM(p.montant) AS montant
         FROM paiement p
         JOIN scolarite s ON s.id = p.scolarite_id
         WHERE s.etablissement_id = ? AND s.annee_scolaire_id = ? AND p.statut = 'valide'
           AND p.date_paiement >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
         GROUP BY mois`,
        [etablissementId, anneeScolaireId]
      ).then(([r]) => r),

      db.query(
        `SELECT c.nom AS classe, ROUND(AVG(n.moy), 2) AS moyenne
         FROM note n
         JOIN classes c ON c.id = n.classe_id
         WHERE n.etablissement_id = ? AND n.Annee_scolaire_id = ? AND n.moy IS NOT NULL
         GROUP BY c.id, c.nom
         ORDER BY c.nom`,
        [etablissementId, anneeScolaireId]
      ).then(([r]) => r),

      db.query(
        `SELECT DATE_FORMAT(date, '%Y-%m') AS mois, COUNT(*) AS total
         FROM presence
         WHERE etablissement_id = ? AND Annee_scolaire_id = ? AND statut = 'Absent'
           AND date >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
         GROUP BY mois`,
        [etablissementId, anneeScolaireId]
      ).then(([r]) => r),
    ]);

    const montantTotal = Number(financeRows[0]?.montantTotal || 0);
    const montantPaye = Number(financeRows[0]?.montantPaye || 0);
    const reste = Math.max(montantTotal - montantPaye, 0);
    const tauxRecouvrement = montantTotal > 0 ? Math.round((montantPaye / montantTotal) * 1000) / 10 : 0;

    const garcons = Number(genreRows.find((r) => r.sexe === 'M')?.n || 0);
    const filles = Number(genreRows.find((r) => r.sexe === 'F')?.n || 0);

    // Complète les 12 derniers mois avec des zéros là où il n'y a pas de données
    const mois12 = derniersMois(12);
    const paiementsParCle = new Map(paiementsRows.map((r) => [r.mois, Number(r.montant)]));
    const absencesParCle = new Map(absencesRows.map((r) => [r.mois, Number(r.total)]));

    res.json({
      totaux: {
        eleves: Number(elevesTotal.n),
        enseignants: Number(enseignantsTotal.n),
        classes: Number(classesTotal.n),
        parents: Number(parentsTotal.n),
      },
      repartitionGenre: { garcons, filles },
      effectifsParClasse: effectifsRows.map((r) => ({ classe: r.classe, effectif: Number(r.effectif) })),
      finances: {
        montantTotal,
        montantPaye,
        reste,
        tauxRecouvrement,
        paiementsEnAttente: Number(enAttenteRow.n),
      },
      paiementsParMois: mois12.map((m) => ({ mois: m.libelle, montant: paiementsParCle.get(m.cle) || 0 })),
      moyenneParClasse: moyennesRows.map((r) => ({ classe: r.classe, moyenne: Number(r.moyenne) })),
      absencesParMois: mois12.map((m) => ({ mois: m.libelle, total: absencesParCle.get(m.cle) || 0 })),
    });
  } catch (err) {
    console.error('Erreur GET /dashboard/stats :', err);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques.' });
  }
});

// Mise en place de l'établissement : étapes faites / à faire (carte
// « Premiers pas » du tableau de bord, visible tant que tout n'est pas fait).
router.get('/demarrage', authenticateStaff, async (req, res) => {
  const etab = Number(req.user.etablissementId);
  if (!etab) return res.status(403).json({ message: 'Accès refusé.' });
  try {
    const one = async (sql, params) => Number((await db.query(sql, params))[0][0].n);
    const [[annee]] = await db.query("SELECT id, nom_annee FROM annee_scolaire WHERE etablissement_id = ? AND statut = 'ouverte' ORDER BY id DESC LIMIT 1", [etab]);
    const anneeId = annee ? annee.id : 0;
    const counts = {
      annee: annee ? 1 : 0,
      classes: await one('SELECT COUNT(*) n FROM classes WHERE etablissement_id = ?', [etab]),
      matieres: await one('SELECT COUNT(*) n FROM matieres WHERE etablissement_id = ?', [etab]),
      enseignants: await one('SELECT COUNT(*) n FROM enseignants WHERE etablissement_id = ? AND actif = 1', [etab]),
      repartition: await one('SELECT COUNT(*) n FROM enseigner WHERE etablissement_id = ? AND Annee_scolaire_id = ?', [etab, anneeId]),
      eleves: await one("SELECT COUNT(*) n FROM eleve WHERE etablissement_id = ? AND statut = 'actif'", [etab]),
      frais: await one('SELECT COUNT(*) n FROM echeance WHERE etablissement_id = ? AND annee_scolaire_id = ?', [etab, anneeId]),
      photos: await one("SELECT COUNT(*) n FROM eleve WHERE etablissement_id = ? AND statut = 'actif' AND photo_url IS NOT NULL AND photo_url <> ''", [etab]),
    };
    const D = '/administration/dashbord';
    const etapes = [
      { cle: 'annee', titre: "Créer l'année scolaire", aide: 'Ex. 2025-2026', lien: `${D}/parametres?onglet=annee` },
      { cle: 'classes', titre: 'Créer les classes', aide: 'De la 6ème à la Terminale', lien: `${D}/classes` },
      { cle: 'matieres', titre: 'Ajouter les matières', aide: 'Français, Mathématiques…', lien: `${D}/enseignants/matieres` },
      { cle: 'enseignants', titre: 'Ajouter les enseignants', aide: 'Leurs identifiants de connexion', lien: `${D}/enseignants/liste` },
      { cle: 'repartition', titre: 'Répartir enseignants et matières', aide: 'Qui enseigne quoi, dans quelle classe, avec quel coefficient', lien: `${D}/enseignants` },
      { cle: 'eleves', titre: 'Inscrire les élèves', aide: 'Avec le compte de leurs parents', lien: `${D}/eleves/inscription` },
      { cle: 'frais', titre: 'Fixer les frais de scolarité', aide: 'Facultatif', lien: `${D}/parametres?onglet=frais`, facultatif: true },
      { cle: 'photos', titre: 'Photos et cartes scolaires', aide: 'Facultatif : photos de la classe en une fois, puis impression des cartes', lien: `${D}/eleves/cartes-scolaires`, facultatif: true },
    ].map((e) => ({ ...e, fait: counts[e.cle] > 0, nombre: counts[e.cle] }));
    res.json({ annee: annee ? annee.nom_annee : null, etapes, termine: etapes.every((e) => e.fait || e.facultatif) });
  } catch (error) {
    console.error('Erreur démarrage :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
