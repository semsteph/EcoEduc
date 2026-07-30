
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
      db.query('SELECT COUNT(*) AS n FROM enseignants WHERE etablissement_id = ?', [etablissementId]).then(([r]) => r),
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

module.exports = router;
