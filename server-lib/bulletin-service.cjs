// =====================================================================
//  Bulletins : calcul unique, fait par le serveur.
//
//  Avant, le navigateur calculait moyennes, rangs et décisions puis les
//  envoyait élève par élève (valeurs acceptées telles quelles) ; la note
//  de conduite était prise sans tenir compte du semestre, deux élèves à
//  égalité avaient des rangs différents, les coefficients d'une autre
//  année pouvaient être utilisés et les élèves partis étaient comptés.
//
//  Règles (inchangées sur le fond) :
//  - moyenne de période = Σ(moyenne × coef) + conduite (coef 1), divisé
//    par Σ coef + 1 ; seules les moyennes VALIDÉES par l'enseignant
//    comptent ;
//  - conduite = note de conduite de la classe pour la période
//    − (heures de punition ÷ 2), jamais négative ;
//  - moyenne annuelle = (périodes précédentes + 2 × dernière période) /
//    (nombre de périodes précédentes + 2) ;
//  - décision : « Admis » si moyenne annuelle ≥ 10, sinon « Redouble ».
// =====================================================================

const round2 = (v) => Math.round(v * 100) / 100;

function mentionFor(moyenne) {
  if (moyenne >= 16) return 'Très Bien';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez Bien';
  if (moyenne >= 10) return 'Passable';
  return 'Insuffisant';
}

// Rangs avec ex æquo : 12,5 / 12,5 / 11 → 1er ex, 1er ex, 3e.
function rankEntries(entries, key) {
  const sorted = [...entries].sort((a, b) => b[key] - a[key]);
  const counts = {};
  sorted.forEach((e) => { counts[e[key]] = (counts[e[key]] || 0) + 1; });
  let previous = null; let rank = 0;
  sorted.forEach((e, index) => {
    if (e[key] !== previous) { rank = index + 1; previous = e[key]; }
    const label = rank === 1 ? '1er' : `${rank}e`;
    e.rangNum = rank;
    e.rang = counts[e[key]] > 1 ? `${label} ex` : label;
  });
}

async function computeClassBulletins(conn, { classeId, etablissementId, anneeScolaireId }) {
  const [[classe]] = await conn.query('SELECT id, nom FROM classes WHERE id = ? AND etablissement_id = ?', [classeId, etablissementId]);
  if (!classe) return null;
  const [[annee]] = await conn.query('SELECT id, nom_annee, statut FROM annee_scolaire WHERE id = ? AND etablissement_id = ?', [anneeScolaireId, etablissementId]);
  if (!annee) return null;

  const [semestres] = await conn.query('SELECT id, nom FROM semestre WHERE etablissement_id = ? ORDER BY id', [etablissementId]);
  const [matieres] = await conn.query(
    `SELECT m.id, m.nom, MAX(c.valeur) AS coefficient
     FROM enseigner e JOIN matieres m ON m.id = e.matiere_id JOIN coefficient c ON c.id = e.coefficient_id
     WHERE e.Classes_id = ? AND e.Annee_scolaire_id = ?
     GROUP BY m.id, m.nom ORDER BY m.nom`,
    [classeId, anneeScolaireId]
  );

  // Élèves : ceux qui ont des notes dans cette classe cette année, plus,
  // pour l'année en cours, les élèves présents dans la classe.
  const [eleves] = await conn.query(
    `SELECT e.id, e.nom, e.prenom, e.matricule, e.sexe, e.date_naissance, e.photo_url FROM eleve e
     WHERE e.id IN (SELECT Eleves_id FROM note WHERE classe_id = ? AND Annee_scolaire_id = ?)
        OR (? = 'ouverte' AND e.classe_id = ? AND e.statut = 'actif' AND e.Annee_scolaire_id = ?)
     ORDER BY e.nom, e.prenom`,
    [classeId, anneeScolaireId, annee.statut, classeId, anneeScolaireId]
  );

  const [notes] = await conn.query(
    `SELECT Eleves_id, matieres_id, Semestre_id, MAX(moy) AS moy
     FROM note WHERE classe_id = ? AND Annee_scolaire_id = ? AND moy IS NOT NULL
     GROUP BY Eleves_id, matieres_id, Semestre_id`,
    [classeId, anneeScolaireId]
  );
  const moyOf = {};
  notes.forEach((n) => { moyOf[`${n.Eleves_id}:${n.matieres_id}:${n.Semestre_id}`] = Number(n.moy); });

  const [conduites] = await conn.query(
    'SELECT semestre_id, MAX(note_conduite) AS note FROM conduite WHERE classe_id = ? AND Annee_scolaire_id = ? GROUP BY semestre_id',
    [classeId, anneeScolaireId]
  );
  const conduiteOf = Object.fromEntries(conduites.map((c) => [c.semestre_id, Number(c.note)]));

  const [punitions] = await conn.query(
    'SELECT eleve_id, semestre_id, MAX(total_hours) AS heures FROM punitions WHERE Annee_scolaire_id = ? GROUP BY eleve_id, semestre_id',
    [anneeScolaireId]
  );
  const heuresOf = {};
  punitions.forEach((p) => { heuresOf[`${p.eleve_id}:${p.semestre_id}`] = Number(p.heures || 0); });

  const problemes = { conduiteManquante: [], sansCoefficient: matieres.length === 0, incomplets: [] };
  const parSemestre = {};
  const statsSemestre = {};

  for (const s of semestres) {
    parSemestre[s.id] = {};
    const conduiteClasse = conduiteOf[s.id];
    if (conduiteClasse === undefined) problemes.conduiteManquante.push(s.nom);
    const complets = [];
    for (const e of eleves) {
      const moyennes = matieres.map((m) => ({
        matiereId: m.id,
        matiere: m.nom,
        coefficient: Number(m.coefficient),
        moy: moyOf[`${e.id}:${m.id}:${s.id}`] ?? null,
      })).map((m) => ({ ...m, moycoef: m.moy === null ? null : round2(m.moy * m.coefficient) }));
      const manquantes = moyennes.filter((m) => m.moy === null).map((m) => m.matiere);
      const conduite = conduiteClasse === undefined ? null : Math.max(0, round2(conduiteClasse - (heuresOf[`${e.id}:${s.id}`] || 0) / 2));
      const entry = {
        eleveId: e.id, nom: e.nom, prenom: e.prenom,
        moyennes, conduite, manquantes,
        moyenne_semestrielle: null, rang: null, mention: null, moyenne_annuelle: null, decision: null,
      };
      // Toutes les moyennes de matière sont nécessaires, sauf si l'élève
      // n'a aucune note de la période (période non commencée : rien à faire).
      const aDesNotes = moyennes.some((m) => m.moy !== null);
      if (aDesNotes && manquantes.length === 0 && conduite !== null) {
        const somme = moyennes.reduce((t, m) => t + m.moy * m.coefficient, 0) + conduite;
        const coefs = moyennes.reduce((t, m) => t + m.coefficient, 0) + 1;
        entry.moyenne_semestrielle = round2(somme / coefs);
        entry.mention = mentionFor(entry.moyenne_semestrielle);
        complets.push(entry);
      } else if (aDesNotes && manquantes.length) {
        problemes.incomplets.push({ eleveId: e.id, eleve: `${e.nom} ${e.prenom}`, semestre: s.nom, manquantes });
      }
      parSemestre[s.id][e.id] = entry;
    }
    rankEntries(complets, 'moyenne_semestrielle');
    const moys = complets.map((c) => c.moyenne_semestrielle);
    statsSemestre[s.id] = moys.length
      ? { effectif: moys.length, forte: Math.max(...moys), faible: Math.min(...moys), moyenne: round2(moys.reduce((a, b) => a + b, 0) / moys.length) }
      : { effectif: 0, forte: null, faible: null, moyenne: null };
  }

  // Moyenne annuelle et décision : toutes les périodes complètes.
  const dernier = semestres[semestres.length - 1];
  const annuels = [];
  if (dernier) {
    for (const e of eleves) {
      const periodes = semestres.map((s) => parSemestre[s.id][e.id]?.moyenne_semestrielle);
      if (periodes.some((v) => v === null || v === undefined)) continue;
      const precedentes = periodes.slice(0, -1);
      const total = precedentes.reduce((t, v) => t + v, 0) + 2 * periodes[periodes.length - 1];
      const moyAn = round2(total / (precedentes.length + 2));
      const entry = parSemestre[dernier.id][e.id];
      entry.moyenne_annuelle = moyAn;
      entry.decision = moyAn >= 10 ? 'Admis' : 'Redouble';
      annuels.push({ eleveId: e.id, moyAn, entry });
    }
    rankEntries(annuels, 'moyAn');
    annuels.forEach((a) => { a.entry.rang_annuel = a.rang; a.entry.effectif_annuel = annuels.length; });
  }

  problemes.aRelancer = await moyennesARelancer(conn, { classeId, anneeScolaireId, semestres, parSemestre, eleves });
  return { classe, annee, semestres, matieres, eleves, parSemestre, statsSemestre, problemes };
}

// Moyennes manquantes regroupées par enseignant et par matière/période,
// avec ce qu'il doit faire : « aucune note saisie » ou « notes saisies,
// moyennes pas validées ». Sert au message de l'écran des bulletins.
async function moyennesARelancer(conn, { classeId, anneeScolaireId, semestres, parSemestre, eleves }) {
  const manques = new Map();
  for (const s of semestres) {
    for (const e of eleves) {
      const b = parSemestre[s.id][e.id];
      if (!b || !b.moyennes.some((m) => m.moy !== null)) continue; // période pas commencée pour lui
      b.moyennes.filter((m) => m.moy === null).forEach((m) => {
        const cle = `${m.matiereId}:${s.id}`;
        const x = manques.get(cle) || { matiereId: m.matiereId, matiere: m.matiere, semestreId: s.id, periode: s.nom, eleves: 0 };
        x.eleves += 1;
        manques.set(cle, x);
      });
    }
  }
  if (!manques.size) return [];
  const [profs] = await conn.query(
    `SELECT g.matiere_id, MIN(CONCAT(en.prenom, ' ', en.nom)) AS prof FROM enseigner g JOIN enseignants en ON en.id = g.Enseignants_id
     WHERE g.Classes_id = ? AND g.Annee_scolaire_id = ? GROUP BY g.matiere_id`,
    [classeId, anneeScolaireId]
  );
  const profDe = Object.fromEntries(profs.map((p) => [p.matiere_id, p.prof]));
  const [saisies] = await conn.query(
    `SELECT matieres_id, Semestre_id FROM note WHERE classe_id = ? AND Annee_scolaire_id = ?
       AND COALESCE(inter1, inter2, inter3, inter4, Dev1, Dev2) IS NOT NULL GROUP BY matieres_id, Semestre_id`,
    [classeId, anneeScolaireId]
  );
  const saisi = new Set(saisies.map((x) => `${x.matieres_id}:${x.Semestre_id}`));
  return [...manques.values()]
    .map((m) => ({
      enseignant: profDe[m.matiereId] || 'Aucun enseignant affecté',
      matiere: m.matiere,
      periode: m.periode,
      eleves: m.eleves,
      etat: saisi.has(`${m.matiereId}:${m.semestreId}`) ? 'notes saisies mais moyennes pas validées' : 'aucune note saisie',
    }))
    .sort((x, y) => x.enseignant.localeCompare(y.enseignant, 'fr') || x.periode.localeCompare(y.periode, 'fr'));
}

// Enregistre les bulletins complets (une ligne par matière, comme avant).
async function saveClassBulletins(conn, ctx, { etablissementId, anneeScolaireId, eleveId = null }) {
  let enregistres = 0;
  for (const s of ctx.semestres) {
    for (const e of ctx.eleves) {
      if (eleveId && Number(eleveId) !== e.id) continue;
      const b = ctx.parSemestre[s.id][e.id];
      if (!b || b.moyenne_semestrielle === null) continue;
      await conn.query(
        'DELETE FROM bulletin WHERE eleve_id = ? AND semestre_id = ? AND etablissement_id = ? AND Annee_scolaire_id = ?',
        [e.id, s.id, etablissementId, anneeScolaireId]
      );
      for (const m of b.moyennes) {
        await conn.query(
          `INSERT INTO bulletin (eleve_id, semestre_id, matiere_id, coef_id, moy, moycoef, moySem, rang, mention, etablissement_id, moyAn, decision, Annee_scolaire_id, conduite)
           VALUES (?, ?, ?, (SELECT id FROM coefficient WHERE valeur = ? ORDER BY id LIMIT 1), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [e.id, s.id, m.matiereId, m.coefficient, m.moy, m.moycoef, b.moyenne_semestrielle, b.rang, b.mention,
            etablissementId, b.moyenne_annuelle, b.decision, anneeScolaireId, b.conduite]
        );
      }
      enregistres += 1;
    }
  }
  return enregistres;
}

module.exports = { computeClassBulletins, saveClassBulletins, rankEntries, mentionFor };
