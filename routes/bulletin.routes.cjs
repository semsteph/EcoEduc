// =====================================================================
//  Bulletins scolaires
//  Monté dans server.cjs avec : app.use('/api', require('./routes/bulletin.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, requireAdminStaff, getEleveDuParentOr403 } = require('../server-lib/auth.cjs');
const bulletinService = require('../server-lib/bulletin-service.cjs');
const evenements = require('../server-lib/alertes-evenements.cjs');
const db = require('../server-lib/db.cjs');

// Format attendu par l'écran (BulletinDetails) : { semestres, matieres,
// notes: { [semestreId]: { [eleveId]: {...} } }, classeNom, problemes }.
function toScreenFormat(ctx) {
  const matieres = [...ctx.matieres.map((m) => ({ id: m.id, nom: m.nom })), { id: 'conduite', nom: 'Conduite' }];
  const notes = {};
  for (const s of ctx.semestres) {
    notes[s.id] = {};
    for (const e of ctx.eleves) {
      const b = ctx.parSemestre[s.id][e.id];
      if (!b || !b.moyennes.some((m) => m.moy !== null)) continue;
      notes[s.id][e.id] = {
        ...b,
        moyennes: [
          ...b.moyennes.map((m) => ({ matiereId: m.matiereId, moy: m.moy, moycoef: m.moycoef, coefficient: m.coefficient })),
          { matiereId: 'conduite', moy: b.conduite, moycoef: b.conduite, coefficient: 1 },
        ],
      };
    }
  }
  const eleves = Object.fromEntries(ctx.eleves.map((e) => [e.id, {
    matricule: e.matricule, sexe: e.sexe, date_naissance: e.date_naissance, photo: e.photo_url,
  }]));
  return {
    semestres: ctx.semestres, matieres, notes, classeNom: ctx.classe.nom, problemes: ctx.problemes,
    eleves, stats: ctx.statsSemestre, anneeNom: ctx.annee.nom_annee,
  };
}

router.get('/bulletin', authenticateJWT, requireAdminStaff, async (req, res) => {
  const { classeId, anneeScolaireId } = req.query;
  const etablissementId = Number(req.user.etablissementId);
  try {
    const ctx = await bulletinService.computeClassBulletins(db, { classeId, etablissementId, anneeScolaireId });
    if (!ctx) return res.status(404).json({ message: 'Classe ou année introuvable.' });
    res.json(toScreenFormat(ctx));
  } catch (error) {
    console.error("Erreur serveur:", error);
    res.status(500).json({ message: "Erreur serveur lors du traitement des bulletins." });
  }
});

// Enregistre en une fois les bulletins de toute la classe (calculés par le
// serveur) et renvoie ce qui empêche d'en éditer certains.
router.post('/bulletins/generer', authenticateJWT, requireAdminStaff, async (req, res) => {
  const { classeId, anneeScolaireId } = req.body;
  const etablissementId = Number(req.user.etablissementId);
  const conn = await db.getConnection();
  try {
    const ctx = await bulletinService.computeClassBulletins(conn, { classeId, etablissementId, anneeScolaireId });
    if (!ctx) return res.status(404).json({ message: 'Classe ou année introuvable.' });
    if (ctx.annee.statut === 'cloturee') return res.status(409).json({ message: 'Cette année est clôturée : ses bulletins ne peuvent plus être modifiés.' });
    await conn.beginTransaction();
    const enregistres = await bulletinService.saveClassBulletins(conn, ctx, { etablissementId, anneeScolaireId });
    await conn.commit();
    // « Le bulletin du Semestre 1 est disponible » (une fois par période).
    evenements.plusTard(evenements.bulletinsDisponibles, ctx);
    res.json({ enregistres, problemes: ctx.problemes, classeNom: ctx.classe.nom });
  } catch (error) {
    try { await conn.rollback(); } catch (_) {}
    console.error('Erreur génération des bulletins :', error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement des bulletins.' });
  } finally {
    conn.release();
  }
});

// Ancienne route (un élève) : les valeurs envoyées par le navigateur sont
// ignorées, le bulletin est recalculé par le serveur.
router.post('/sauvegarde-bulletin', authenticateJWT, requireAdminStaff, async (req, res) => {
  const { eleveId, classeId, anneeScolaireId } = req.body;
  const etablissementId = Number(req.user.etablissementId);
  const conn = await db.getConnection();
  try {
    const ctx = await bulletinService.computeClassBulletins(conn, { classeId, etablissementId, anneeScolaireId });
    if (!ctx) return res.status(404).json({ error: 'Classe ou année introuvable.' });
    if (ctx.problemes.conduiteManquante.length) {
      return res.status(400).json({ error: `La note de conduite n'est pas encore attribuée à cette classe pour : ${ctx.problemes.conduiteManquante.join(', ')}.` });
    }
    const manque = ctx.problemes.incomplets.find((p) => p.eleveId === Number(eleveId));
    if (manque) {
      return res.status(400).json({
        error: "Impossible de sauvegarder le bulletin : certaines matières de la classe n'ont pas encore de moyenne validée.",
        matieresManquantes: manque.manquantes.map((nom) => ({ nom })),
      });
    }
    await conn.beginTransaction();
    await bulletinService.saveClassBulletins(conn, ctx, { etablissementId, anneeScolaireId, eleveId });
    await conn.commit();
    res.status(200).json({ message: 'Bulletin sauvegardé avec succès.' });
  } catch (error) {
    try { await conn.rollback(); } catch (_) {}
    console.error('🔥 Erreur lors de la sauvegarde du bulletin :', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde du bulletin.' });
  } finally {
    conn.release();
  }
});

// Années pour lesquelles l'enfant a des bulletins (la plus récente d'abord) :
// après une clôture, le parent doit pouvoir revoir l'année terminée.
router.get('/bulletined/:childId/annees', authenticateJWT, async (req, res) => {
  const { childId } = req.params;
  if (!(await getEleveDuParentOr403(req, res, childId))) return;
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT a.id, a.nom_annee AS nom, a.statut FROM bulletin b
       JOIN annee_scolaire a ON a.id = b.Annee_scolaire_id
       WHERE b.eleve_id = ? ORDER BY a.id DESC`,
      [childId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur années des bulletins :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// API pour récupérer les bulletins, semestres, matières, coefficients et informations d'un élève
// API pour récupérer les bulletins, semestres, matières, coefficients et informations d'un élève
router.get('/bulletined/:childId/:anneeScolaireId', authenticateJWT, async (req, res) => {
  const { childId, anneeScolaireId } = req.params;

  // Vérifier si childId est fourni
  if (!childId) {
    return res.status(400).json({ error: "childId est requis" });
  }

  const eleveParent = await getEleveDuParentOr403(req, res, childId);
  if (!eleveParent) return;

  // Si anneeScolaireId n'est pas défini, retourner un tableau vide
  if (!anneeScolaireId) {
    return res.json([]);
  }

  try {
    // La table bulletin ne stocke pas la classe de l'élève au moment de l'édition.
    // On la retrouve via la table note (qui, elle, garde classe_id par élève/semestre/
    // année) pour éviter d'afficher la classe ACTUELLE de l'élève sur un bulletin
    // d'une année antérieure. Repli sur la classe courante si aucune note historique
    // ne correspond (cas résiduel, ex. bulletin saisi sans passer par la saisie de notes).
    const [results] = await req.db.query(`
      SELECT
        e.nom AS eleveNom,
        e.prenom AS elevePrenom,
        e.matricule, e.sexe, e.date_naissance, e.photo_url,
        COALESCE(hc.nom, cLive.nom) AS classeNom,
        COALESCE(hc.id, cLive.id) AS classeId,
        s.id AS semestre_id,
        s.nom AS semestreNom,
        m.nom AS matiereNom,
        coef.valeur AS coef,
        b.moy,
        b.moycoef,
        b.moySem,
        b.moyAn,
        b.rang,
        b.mention,
        b.conduite,
        b.decision
      FROM bulletin b
      JOIN eleve e ON e.id = b.eleve_id
      JOIN semestre s ON s.id = b.semestre_id
      JOIN matieres m ON m.id = b.matiere_id
      JOIN coefficient coef ON coef.id = b.coef_id
      LEFT JOIN (
        SELECT Eleves_id, Semestre_id, Annee_scolaire_id, MAX(classe_id) AS classe_id
        FROM note
        GROUP BY Eleves_id, Semestre_id, Annee_scolaire_id
      ) hn ON hn.Eleves_id = b.eleve_id AND hn.Semestre_id = b.semestre_id AND hn.Annee_scolaire_id = b.Annee_scolaire_id
      LEFT JOIN classes hc ON hc.id = hn.classe_id
      LEFT JOIN classes cLive ON cLive.id = e.classe_id
      WHERE b.eleve_id = ? AND b.Annee_scolaire_id = ?
      ORDER BY s.id, m.nom
    `, [childId, anneeScolaireId]);

    // Si aucune donnée n'est trouvée, renvoyer un tableau vide
    if (results.length === 0) {
      return res.json([]);
    }

    const semestres = {};
    const bulletins = [];

    // Regrouper les données par semestre
    results.forEach(row => {
      const { semestre_id, semestreNom, matiereNom, coef, moy, moycoef, moySem, moyAn, rang, mention, conduite, decision } = row;

      if (!semestres[semestre_id]) {
        semestres[semestre_id] = {
          semestre_id,
          nom: semestreNom,
          bulletins: [],
          moySem,
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

    // Effectif et moyennes de la classe (même classe, même année), rang
    // annuel : comme sur un bulletin papier.
    const [classeRows] = await req.db.query(
      `SELECT b.semestre_id, b.eleve_id, MAX(b.moySem) AS moySem, MAX(b.moyAn) AS moyAn
       FROM bulletin b
       JOIN (SELECT DISTINCT Eleves_id FROM note WHERE classe_id = ? AND Annee_scolaire_id = ?) n ON n.Eleves_id = b.eleve_id
       WHERE b.Annee_scolaire_id = ?
       GROUP BY b.semestre_id, b.eleve_id`,
      [results[0].classeId, anneeScolaireId, anneeScolaireId]
    );
    const r2 = (v) => Math.round(v * 100) / 100;
    const rangDe = (valeur, liste) => {
      const rang = liste.filter((v) => v > valeur).length + 1;
      const exaequo = liste.filter((v) => v === valeur).length > 1;
      return `${rang === 1 ? '1er' : `${rang}e`}${exaequo ? ' ex' : ''}`;
    };
    bulletins.forEach((sem) => {
      const moys = classeRows.filter((r) => r.semestre_id === sem.semestre_id && r.moySem !== null).map((r) => Number(r.moySem));
      sem.stats = moys.length
        ? { effectif: moys.length, forte: Math.max(...moys), faible: Math.min(...moys), moyenne: r2(moys.reduce((a, b) => a + b, 0) / moys.length) }
        : null;
      if (sem.moyAn !== null && sem.moyAn !== undefined) {
        const annuels = classeRows.filter((r) => r.semestre_id === sem.semestre_id && r.moyAn !== null).map((r) => Number(r.moyAn));
        sem.rangAnnuel = rangDe(Number(sem.moyAn), annuels);
        sem.effectifAnnuel = annuels.length;
      }
    });

    const [[etab]] = await req.db.query(
      `SELECT e.nom, a.nom_annee FROM etablissement e LEFT JOIN annee_scolaire a ON a.id = ? WHERE e.id = ?`,
      [anneeScolaireId, eleveParent.etablissement_id]
    );

    res.json({
      etablissementNom: etab ? etab.nom : '',
      anneeNom: etab ? etab.nom_annee : '',
      eleveNom: results[0].eleveNom,
      elevePrenom: results[0].elevePrenom,
      classeNom: results[0].classeNom,
      matricule: results[0].matricule,
      sexe: results[0].sexe,
      dateNaissance: results[0].date_naissance,
      photo: results[0].photo_url,
      semestres: bulletins,
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des données.' });
  }
});

module.exports = router;
