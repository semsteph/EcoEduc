// =====================================================================
//  Orientation en 2nde
//
//  À la clôture, les admis de 3ème passent dans le groupe d'attente
//  « 2nde — orientation à faire ». L'administration choisit ensuite la série
//  de chacun selon son vœu (choix personnel : aucune série n'est devinée).
//  Les moyennes de l'an passé sont affichées pour information seulement.
//  Monté dans server.cjs avec : app.use('/api', require('./routes/orientation.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, requireAdminStaff } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const { fetchClotureParams } = require('../server-lib/clotureParams.cjs');
const { creerClasses, normaliserGroupe } = require('../server-lib/nomsClasses.cjs');
const { parseClasseNom } = require('./cloture.routes.cjs').__test;

// Séries de 2nde courantes au Bénin (en plus de celles déjà ouvertes).
const SERIES_COURANTES = ['A1', 'A2', 'B', 'C', 'D', 'E', 'F1', 'F2', 'F3', 'F4', 'G1', 'G2', 'G3'];
const simplifier = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

async function anneeOuverte(conn, etab) {
  const [[a]] = await conn.query("SELECT id, nom_annee FROM annee_scolaire WHERE etablissement_id = ? AND statut = 'ouverte' ORDER BY id DESC LIMIT 1", [etab]);
  return a || null;
}

// Classes de 2nde de l'établissement, avec leur série et leur effectif.
async function classesDeSeconde(conn, etab, anneeId) {
  const [classes] = await conn.query(
    `SELECT c.id, c.nom, (SELECT COUNT(*) FROM eleve e WHERE e.classe_id = c.id AND e.statut = 'actif' AND e.Annee_scolaire_id = ?) AS effectif
     FROM classes c WHERE c.etablissement_id = ? AND c.orientation = 0`,
    [anneeId, etab]
  );
  return classes
    .map((c) => ({ ...c, effectif: Number(c.effectif), p: parseClasseNom(c.nom) }))
    .filter((c) => c.p && c.p.niveau === '2nd')
    .map((c) => ({ id: c.id, nom: c.nom, serie: c.p.prefix, effectif: c.effectif }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }));
}

router.get('/orientation-2nde/compte', authenticateJWT, requireAdminStaff, async (req, res) => {
  try {
    const [[r]] = await db.query(
      `SELECT COUNT(*) AS n FROM eleve e JOIN classes c ON c.id = e.classe_id
       WHERE c.etablissement_id = ? AND c.orientation = 1 AND e.statut = 'actif'`,
      [req.user.etablissementId]
    );
    res.json({ n: Number(r.n) });
  } catch (error) {
    console.error('Erreur compte orientation :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.get('/orientation-2nde', authenticateJWT, requireAdminStaff, async (req, res) => {
  const etab = Number(req.user.etablissementId);
  try {
    const annee = await anneeOuverte(db, etab);
    if (!annee) return res.status(404).json({ message: 'Aucune année scolaire en cours.' });
    const [eleves] = await db.query(
      `SELECT e.id, e.nom, e.prenom, e.sexe FROM eleve e JOIN classes c ON c.id = e.classe_id
       WHERE c.etablissement_id = ? AND c.orientation = 1 AND e.statut = 'actif'
       ORDER BY e.nom, e.prenom`,
      [etab]
    );
    // Pour information : classe de 3ème, moyenne annuelle et moyennes par
    // matière de l'année précédente.
    const ids = eleves.map((e) => e.id);
    const infos = {};
    if (ids.length) {
      const [moyAn] = await db.query(
        `SELECT b.eleve_id, b.Annee_scolaire_id, MAX(b.moyAn) AS moyAn, MAX(b.decision) AS decision
         FROM bulletin b WHERE b.eleve_id IN (?) AND b.Annee_scolaire_id <> ? AND b.moyAn IS NOT NULL
         GROUP BY b.eleve_id, b.Annee_scolaire_id`,
        [ids, annee.id]
      );
      moyAn.forEach((m) => {
        const x = infos[m.eleve_id];
        if (!x || m.Annee_scolaire_id > x.anneeId) infos[m.eleve_id] = { anneeId: m.Annee_scolaire_id, moyenneAnnuelle: Number(m.moyAn), matieres: {} };
      });
      const [notes] = await db.query(
        `SELECT n.Eleves_id, n.Annee_scolaire_id, m.nom AS matiere, c.nom AS classe, AVG(n.moy) AS moy
         FROM note n JOIN matieres m ON m.id = n.matieres_id JOIN classes c ON c.id = n.classe_id
         WHERE n.Eleves_id IN (?) AND n.Annee_scolaire_id <> ? AND n.moy IS NOT NULL
         GROUP BY n.Eleves_id, n.Annee_scolaire_id, m.nom, c.nom`,
        [ids, annee.id]
      );
      notes.forEach((n) => {
        const x = infos[n.Eleves_id];
        if (!x || x.anneeId !== n.Annee_scolaire_id) return;
        x.classe = n.classe;
        x.matieres[n.matiere] = Math.round(Number(n.moy) * 100) / 100;
      });
    }
    const classes = await classesDeSeconde(db, etab, annee.id);
    const params = await fetchClotureParams(db, etab);
    const ouvertes = [...new Set(classes.map((c) => c.serie))];
    res.json({
      annee: annee.nom_annee,
      eleves: eleves.map((e) => ({
        id: e.id, nom: e.nom, prenom: e.prenom, sexe: e.sexe,
        classeAncienne: infos[e.id]?.classe || null,
        moyenneAnnuelle: infos[e.id]?.moyenneAnnuelle ?? null,
        matieres: infos[e.id]?.matieres || {},
      })),
      classes,
      seriesOuvertes: ouvertes.filter(Boolean).sort(),
      seriesCourantes: SERIES_COURANTES,
      effectifMax: params.effectifMaxParClasse,
    });
  } catch (error) {
    console.error('Erreur orientation :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Place des élèves dans une série : dans la classe indiquée, ou répartis
// dans les classes de cette série les moins remplies (une classe est créée
// si la série n'existe pas encore ou si toutes sont pleines).
router.post('/orientation-2nde', authenticateJWT, requireAdminStaff, async (req, res) => {
  const etab = Number(req.user.etablissementId);
  const serie = String(req.body?.serie || '').trim().toUpperCase();
  const ids = [...new Set((Array.isArray(req.body?.eleveIds) ? req.body.eleveIds : []).map(Number).filter((n) => n > 0))];
  const classeChoisie = Number(req.body?.classeCible) || null;
  if (!/^[A-Z]{1,3}[0-9]?$/.test(serie)) return res.status(400).json({ message: 'Choisissez une série (ex. A1, C, D).' });
  if (!ids.length) return res.status(400).json({ message: 'Cochez au moins un élève.' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const annee = await anneeOuverte(conn, etab);
    if (!annee) { await conn.rollback(); return res.status(409).json({ message: 'Aucune année scolaire en cours.' }); }
    const [eleves] = await conn.query(
      `SELECT e.id FROM eleve e JOIN classes c ON c.id = e.classe_id
       WHERE e.id IN (?) AND c.etablissement_id = ? AND c.orientation = 1 AND e.statut = 'actif' FOR UPDATE`,
      [ids, etab]
    );
    if (eleves.length !== ids.length) { await conn.rollback(); return res.status(409).json({ message: 'Certains élèves ne sont plus en attente d’orientation : rechargez la page.' }); }

    const params = await fetchClotureParams(conn, etab);
    const max = params.effectifMaxParClasse;
    let classes = (await classesDeSeconde(conn, etab, annee.id)).filter((c) => c.serie === serie);
    const placements = new Map();

    if (classeChoisie) {
      const cible = classes.find((c) => c.id === classeChoisie);
      if (!cible) { await conn.rollback(); return res.status(400).json({ message: `Cette classe n'est pas une 2nde ${serie}.` }); }
      if (cible.effectif + ids.length > max) {
        await conn.rollback();
        return res.status(409).json({ message: `${cible.nom} dépasserait l'effectif maximum (${cible.effectif + ids.length}/${max}). Laissez le logiciel répartir, ou choisissez moins d'élèves.` });
      }
      placements.set(cible.id, { nom: cible.nom, ids });
    } else {
      const places = classes.reduce((t, c) => t + Math.max(0, max - c.effectif), 0);
      let manque = ids.length - places;
      const creees = [];
      if (manque > 0) {
        const [promotions] = await conn.query('SELECT id, nom FROM promotion');
        const promo = promotions.find((p) => simplifier(p.nom) === simplifier(`2nd ${serie}`) || simplifier(p.nom) === simplifier(`2nde ${serie}`));
        const nombre = Math.ceil(manque / max);
        creees.push(...await creerClasses(conn, { etablissementId: etab, base: `2nd ${serie}`, promotionId: promo ? promo.id : null, cycle: 'Cycle 2', nombre }));
        // Rattachées à la dernière clôture : son annulation les retirera aussi.
        const [[journal]] = await conn.query('SELECT id, etat_avant FROM cloture_journal WHERE etablissement_id = ? AND annulee_at IS NULL ORDER BY id DESC LIMIT 1', [etab]);
        if (journal) {
          const etat = JSON.parse(journal.etat_avant);
          etat.classesCreees = [...(etat.classesCreees || []), ...creees.map((c) => c.id)];
          await conn.query('UPDATE cloture_journal SET etat_avant = ? WHERE id = ?', [JSON.stringify(etat), journal.id]);
        }
        classes = (await classesDeSeconde(conn, etab, annee.id)).filter((c) => c.serie === serie);
      }
      // Une à une dans la classe la moins remplie.
      const effectifs = new Map(classes.map((c) => [c.id, c.effectif]));
      for (const id of ids) {
        const cible = classes.filter((c) => effectifs.get(c.id) < max).sort((a, b) => effectifs.get(a.id) - effectifs.get(b.id))[0] || classes[0];
        effectifs.set(cible.id, effectifs.get(cible.id) + 1);
        if (!placements.has(cible.id)) placements.set(cible.id, { nom: cible.nom, ids: [] });
        placements.get(cible.id).ids.push(id);
      }
    }

    for (const [classeId, p] of placements) {
      await conn.query('UPDATE eleve SET classe_id = ? WHERE id IN (?)', [classeId, p.ids]);
    }
    await normaliserGroupe(conn, etab, `2nd ${serie}`);
    // Groupe d'attente vide : retiré.
    await conn.query(
      `DELETE c FROM classes c WHERE c.etablissement_id = ? AND c.orientation = 1
       AND NOT EXISTS (SELECT 1 FROM eleve e WHERE e.classe_id = c.id)`,
      [etab]
    );
    await conn.commit();

    const [noms] = await db.query('SELECT id, nom FROM classes WHERE id IN (?)', [[...placements.keys()]]);
    const nomDe = Object.fromEntries(noms.map((c) => [c.id, c.nom]));
    const resume = [...placements].map(([id, p]) => `${nomDe[id] || p.nom} (+${p.ids.length})`).join(', ');
    res.json({ message: `${ids.length} élève(s) orienté(s) en 2nde ${serie} : ${resume}.` });
  } catch (error) {
    try { await conn.rollback(); } catch (_) {}
    console.error('Erreur orientation (placement) :', error);
    res.status(500).json({ message: "Erreur : l'orientation n'a pas été enregistrée." });
  } finally {
    conn.release();
  }
});

module.exports = router;
