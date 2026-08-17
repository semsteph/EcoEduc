// =====================================================================
//  Tableau de bord parent (liste enfants + agrégat dashboard)
//  Monté dans server.cjs avec : app.use('/api', require('./routes/parent-dashboard.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const dayjs = require('dayjs');

// ✅ Route : récupérer les enfants du parent connecté
router.get("/parent/children", authenticateJWT, async (req, res) => {
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

// ✅ Tableau de bord parent : statistiques agrégées sur tous les enfants du parent connecté
// (moyennes, présence, conduite, scolarité) pour une année scolaire donnée.
router.get("/parent/dashboard/:anneeScolaireId", authenticateJWT, async (req, res) => {
  const parentId = req.user.id;
  const { anneeScolaireId } = req.params;

  const dashboardVide = () => ({
    enfants: [],
    totaux: {
      nombreEnfants: 0,
      moyenneGlobale: null,
      totalAbsences: 0,
      totalHeuresPunition: 0,
      montantTotalScolarite: 0,
      montantPayeScolarite: 0,
      resteScolarite: 0,
      tauxRecouvrement: 0,
      paiementsEnAttente: 0,
    },
    absencesParMois: [],
    moyennesParSemestre: [],
  });

  try {
    const [children] = await db.query(
      `SELECT e.id, e.prenom, e.nom, c.nom AS classe
       FROM eleve e
       JOIN classes c ON e.Classe_id = c.id
       WHERE e.Parents_id = ?`,
      [parentId]
    );

    if (children.length === 0) {
      return res.json(dashboardVide());
    }

    const childIds = children.map((c) => c.id);

    const [
      moyennesRows,
      moyennesSemestreRows,
      presenceRows,
      absencesMoisRows,
      punitionsRows,
      scolariteRows,
      paiementsEnAttenteRows,
    ] = await Promise.all([
      db
        .query(
          `SELECT eleves_id AS childId, ROUND(AVG(moy), 2) AS moyenne, COUNT(moy) AS nbNotes
           FROM note
           WHERE eleves_id IN (?) AND Annee_scolaire_id = ? AND moy IS NOT NULL
           GROUP BY eleves_id`,
          [childIds, anneeScolaireId]
        )
        .then(([r]) => r),

      db
        .query(
          `SELECT n.eleves_id AS childId, s.nom AS semestre, ROUND(AVG(n.moy), 2) AS moyenne
           FROM note n
           JOIN semestre s ON n.Semestre_id = s.id
           WHERE n.eleves_id IN (?) AND n.Annee_scolaire_id = ? AND n.moy IS NOT NULL
           GROUP BY n.eleves_id, s.id, s.nom
           ORDER BY s.id`,
          [childIds, anneeScolaireId]
        )
        .then(([r]) => r),

      db
        .query(
          `SELECT eleve_id AS childId,
                  SUM(CASE WHEN statut = 'Absent' THEN 1 ELSE 0 END) AS absences,
                  COUNT(*) AS total
           FROM presence
           WHERE eleve_id IN (?) AND Annee_scolaire_id = ?
           GROUP BY eleve_id`,
          [childIds, anneeScolaireId]
        )
        .then(([r]) => r),

      db
        .query(
          `SELECT DATE_FORMAT(date, '%Y-%m') AS mois, COUNT(*) AS total
           FROM presence
           WHERE eleve_id IN (?) AND Annee_scolaire_id = ? AND statut = 'Absent'
             AND date >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
           GROUP BY mois`,
          [childIds, anneeScolaireId]
        )
        .then(([r]) => r),

      db
        .query(
          `SELECT eleve_id AS childId, COALESCE(SUM(total_hours), 0) AS heures
           FROM punitions
           WHERE eleve_id IN (?) AND Annee_scolaire_id = ?
           GROUP BY eleve_id`,
          [childIds, anneeScolaireId]
        )
        .then(([r]) => r),

      db
        .query(
          `SELECT eleve_id AS childId, montant_total AS montantTotal, montant_paye AS montantPaye, reste
           FROM scolarite
           WHERE eleve_id IN (?) AND annee_scolaire_id = ?`,
          [childIds, anneeScolaireId]
        )
        .then(([r]) => r),

      db
        .query(
          `SELECT s.eleve_id AS childId, COUNT(*) AS n
           FROM paiement p
           JOIN scolarite s ON s.id = p.scolarite_id
           WHERE s.eleve_id IN (?) AND s.annee_scolaire_id = ? AND p.statut = 'en_attente'
           GROUP BY s.eleve_id`,
          [childIds, anneeScolaireId]
        )
        .then(([r]) => r),
    ]);

    const byChild = (rows) => new Map(rows.map((r) => [Number(r.childId), r]));
    const moyMap = byChild(moyennesRows);
    const presMap = byChild(presenceRows);
    const punMap = byChild(punitionsRows);
    const scolMap = byChild(scolariteRows);
    const attenteMap = byChild(paiementsEnAttenteRows);

    const semestreMap = new Map();
    moyennesSemestreRows.forEach((r) => {
      if (!semestreMap.has(r.semestre)) semestreMap.set(r.semestre, {});
      semestreMap.get(r.semestre)[r.childId] = Number(r.moyenne);
    });

    const enfants = children.map((c) => {
      const moy = moyMap.get(c.id);
      const pres = presMap.get(c.id);
      const pun = punMap.get(c.id);
      const scol = scolMap.get(c.id);
      const attente = attenteMap.get(c.id);

      const totalSeances = Number(pres?.total || 0);
      const absences = Number(pres?.absences || 0);
      const tauxPresence =
        totalSeances > 0
          ? Math.round(((totalSeances - absences) / totalSeances) * 1000) / 10
          : null;

      const montantTotal = Number(scol?.montantTotal || 0);
      const montantPaye = Number(scol?.montantPaye || 0);
      const reste = Number(scol?.reste ?? Math.max(montantTotal - montantPaye, 0));

      return {
        id: c.id,
        nom: c.nom,
        prenom: c.prenom,
        classe: c.classe,
        moyenneGenerale: moy ? Number(moy.moyenne) : null,
        nbNotes: Number(moy?.nbNotes || 0),
        totalSeances,
        absences,
        tauxPresence,
        heuresPunition: Number(pun?.heures || 0),
        scolarite: {
          defini: !!scol,
          montantTotal,
          montantPaye,
          reste,
          tauxRecouvrement:
            montantTotal > 0 ? Math.round((montantPaye / montantTotal) * 1000) / 10 : 0,
        },
        paiementsEnAttente: Number(attente?.n || 0),
      };
    });

    const withMoyenne = enfants.filter((e) => e.moyenneGenerale !== null);
    const moyenneGlobale = withMoyenne.length
      ? Math.round(
          (withMoyenne.reduce((a, e) => a + e.moyenneGenerale, 0) / withMoyenne.length) * 100
        ) / 100
      : null;

    const totalAbsences = enfants.reduce((a, e) => a + e.absences, 0);
    const totalHeuresPunition =
      Math.round(enfants.reduce((a, e) => a + e.heuresPunition, 0) * 100) / 100;
    const montantTotalScolarite = enfants.reduce((a, e) => a + e.scolarite.montantTotal, 0);
    const montantPayeScolarite = enfants.reduce((a, e) => a + e.scolarite.montantPaye, 0);
    const resteScolarite = enfants.reduce((a, e) => a + e.scolarite.reste, 0);
    const paiementsEnAttente = enfants.reduce((a, e) => a + e.paiementsEnAttente, 0);

    const mois6 = [];
    for (let i = 5; i >= 0; i--) {
      const d = dayjs().subtract(i, "month");
      mois6.push({ cle: d.format("YYYY-MM"), libelle: d.format("MMM YY") });
    }
    const absencesParCle = new Map(absencesMoisRows.map((r) => [r.mois, Number(r.total)]));

    res.json({
      enfants,
      totaux: {
        nombreEnfants: enfants.length,
        moyenneGlobale,
        totalAbsences,
        totalHeuresPunition,
        montantTotalScolarite,
        montantPayeScolarite,
        resteScolarite,
        tauxRecouvrement:
          montantTotalScolarite > 0
            ? Math.round((montantPayeScolarite / montantTotalScolarite) * 1000) / 10
            : 0,
        paiementsEnAttente,
      },
      absencesParMois: mois6.map((m) => ({
        mois: m.libelle,
        total: absencesParCle.get(m.cle) || 0,
      })),
      moyennesParSemestre: Array.from(semestreMap.entries()).map(([semestre, valeurs]) => ({
        semestre,
        valeurs,
      })),
    });
  } catch (error) {
    console.error("❌ Erreur GET /api/parent/dashboard :", error);
    res.status(500).json({ message: "Erreur lors du chargement du tableau de bord." });
  }
});

module.exports = router;
