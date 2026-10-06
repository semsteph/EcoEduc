// =====================================================================
//  Notes : règles communes à la saisie, l'import Excel, la suppression,
//  la validation des demandes et la sauvegarde des moyennes.
//
//  Avant, chaque route faisait à sa façon :
//  - l'import Excel créait une NOUVELLE ligne pour la 2e note d'un élève
//    (doublons, moyennes faussées) ;
//  - la suppression effaçait la note dans toutes les matières de l'élève ;
//  - les moyennes étaient calculées par le navigateur et acceptées telles
//    quelles ;
//  - une demande approuvée changeait la note sans recalculer la moyenne.
//  Ici : une seule ligne par (élève, matière, période, classe, année), des
//  moyennes toujours calculées par le serveur, et des droits vérifiés.
// =====================================================================

// Champ de la table note ← nom reçu (écran, Excel, demande).
const FIELD_ALIASES = {
  inter1: 'inter1', inter2: 'inter2', inter3: 'inter3', inter4: 'inter4',
  dev1: 'Dev1', dev2: 'Dev2', devoir1: 'Dev1', devoir2: 'Dev2',
};
const NOTE_FIELDS = ['inter1', 'inter2', 'inter3', 'inter4', 'Dev1', 'Dev2'];

function noteField(name) {
  return FIELD_ALIASES[String(name || '').trim().toLowerCase()] || null;
}

// Note valide : nombre de 0 à 20, au plus deux décimales (virgule acceptée).
function parseNoteValue(value) {
  if (value === null || value === undefined || value === '') return { ok: true, value: null };
  const n = Number(String(value).trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 20) return { ok: false };
  return { ok: true, value: Math.round(n * 100) / 100 };
}

const avg = (list) => {
  const values = list.map((v) => (v === null || v === undefined ? NaN : Number(v))).filter((v) => !Number.isNaN(v));
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
};
const round2 = (v) => (v === null ? null : Math.round(v * 100) / 100);

// Moyenne des interrogations, puis moyenne (MI + Dev1 + Dev2) / nombre de
// notes présentes — règle déjà affichée par l'écran enseignant.
function computeAverages(row, coefficient) {
  const moyInter = avg([row.inter1, row.inter2, row.inter3, row.inter4]);
  const moy = avg([moyInter, row.Dev1, row.Dev2]);
  return {
    moyInter: round2(moyInter),
    moy: round2(moy),
    moycoef: moy === null ? null : round2(moy * Number(coefficient || 0)),
  };
}

// Compte utilisé par les routes (jeton déjà vérifié par authenticateJWT).
function isStaff(user) {
  return !!user && (user.type === 'etablissement' || user.type === 'administration');
}
function teacherId(user) {
  return user && user.type === undefined && user.role !== 'parent' ? Number(user.id) : null;
}

// L'enseignant enseigne-t-il cette matière dans cette classe cette année ?
async function canWriteNotes(conn, user, { classeId, matiereId, anneeScolaireId }) {
  if (isStaff(user)) return true;
  const id = teacherId(user);
  if (!id) return false;
  const [rows] = await conn.query(
    `SELECT 1 FROM enseigner WHERE Enseignants_id = ? AND Classes_id = ? AND matiere_id = ? AND Annee_scolaire_id = ? LIMIT 1`,
    [id, classeId, matiereId, anneeScolaireId]
  );
  return rows.length > 0;
}

async function coefficientFor(conn, { classeId, matiereId, anneeScolaireId }) {
  const [[row]] = await conn.query(
    `SELECT c.valeur FROM enseigner e JOIN coefficient c ON c.id = e.coefficient_id
     WHERE e.Classes_id = ? AND e.matiere_id = ? AND e.Annee_scolaire_id = ? LIMIT 1`,
    [classeId, matiereId, anneeScolaireId]
  );
  return row ? Number(row.valeur) : 0;
}

// Ligne unique d'un élève (fusionne d'anciens doublons : on garde, pour
// chaque note, la valeur renseignée).
async function noteRow(conn, k, { create = false } = {}) {
  const [rows] = await conn.query(
    `SELECT * FROM note WHERE Eleves_id = ? AND matieres_id = ? AND Semestre_id = ? AND classe_id = ? AND Annee_scolaire_id = ? ORDER BY id`,
    [k.eleveId, k.matiereId, k.semestreId, k.classeId, k.anneeScolaireId]
  );
  if (rows.length > 1) {
    const merged = { ...rows[0] };
    for (const r of rows.slice(1)) {
      for (const f of [...NOTE_FIELDS, 'moyInter', 'moy', 'moycoef']) {
        if (merged[f] === null && r[f] !== null) merged[f] = r[f];
      }
    }
    await conn.query(
      `UPDATE note SET inter1 = ?, inter2 = ?, inter3 = ?, inter4 = ?, Dev1 = ?, Dev2 = ?, moyInter = ?, moy = ?, moycoef = ? WHERE id = ?`,
      [merged.inter1, merged.inter2, merged.inter3, merged.inter4, merged.Dev1, merged.Dev2, merged.moyInter, merged.moy, merged.moycoef, merged.id]
    );
    await conn.query('DELETE FROM note WHERE id IN (?)', [rows.slice(1).map((r) => r.id)]);
    return merged;
  }
  if (rows.length === 1) return rows[0];
  if (!create) return null;
  const [result] = await conn.query(
    `INSERT INTO note (Eleves_id, matieres_id, Semestre_id, classe_id, etablissement_id, Annee_scolaire_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [k.eleveId, k.matiereId, k.semestreId, k.classeId, k.etablissementId, k.anneeScolaireId]
  );
  return { id: result.insertId, inter1: null, inter2: null, inter3: null, inter4: null, Dev1: null, Dev2: null, moyInter: null, moy: null, moycoef: null };
}

// Notes verrouillées d'une ligne : celles présentes lors de la dernière
// validation. Anciennes lignes validées sans cette liste : toutes les notes
// présentes.
function notesValidees(row) {
  if (!row || row.moy === null || row.moy === undefined) return new Set();
  if (row.notes_validees === null || row.notes_validees === undefined) {
    return new Set(NOTE_FIELDS.filter((f) => row[f] !== null && row[f] !== undefined));
  }
  // Une note validée puis supprimée (demande approuvée) libère sa case.
  return new Set(String(row.notes_validees).split(',').filter((f) => NOTE_FIELDS.includes(f) && row[f] !== null && row[f] !== undefined));
}
function estVerrouillee(row, field) {
  return notesValidees(row).has(field);
}

// Écrit une note. Une note validée qui change (administration, demande
// approuvée) recalcule aussitôt la moyenne. Une note ajoutée dans une case
// vide après validation (recompute: false) attend la prochaine validation :
// le bulletin garde la moyenne validée jusque-là.
async function setNote(conn, k, field, value, { recompute = true } = {}) {
  // Année clôturée : ses notes sont figées (saisie, import, suppression,
  // demande approuvée — toutes passent par ici).
  const [[annee]] = await conn.query('SELECT statut FROM annee_scolaire WHERE id = ?', [k.anneeScolaireId]);
  if (annee && annee.statut === 'cloturee') {
    throw Object.assign(new Error('Cette année scolaire est clôturée : ses notes ne peuvent plus être modifiées.'), { code: 'ANNEE_CLOTUREE' });
  }
  const row = await noteRow(conn, k, { create: value !== null });
  if (!row) return null;
  const ancienne = row[field];
  row[field] = value;
  await conn.query(`UPDATE note SET ${field} = ? WHERE id = ?`, [value, row.id]);
  if (recompute && row.moy !== null) await recomputeRow(conn, k, row);
  // Les parents sont prévenus de chaque note (messagerie, regroupée par jour).
  await require('./messages-parents.cjs').noteEnregistree(conn, {
    eleveId: k.eleveId, matiereId: k.matiereId, semestreId: k.semestreId, classeId: k.classeId, champ: field, ancienne, valeur: value,
  });
  return row;
}

async function recomputeRow(conn, k, row) {
  const coefficient = await coefficientFor(conn, k);
  const avgs = computeAverages(row, coefficient);
  await conn.query('UPDATE note SET moyInter = ?, moy = ?, moycoef = ? WHERE id = ?', [avgs.moyInter, avgs.moy, avgs.moycoef, row.id]);
  return avgs;
}

const LIBELLES = { inter1: 'Inter 1', inter2: 'Inter 2', inter3: 'Inter 3', inter4: 'Inter 4', Dev1: 'Devoir 1', Dev2: 'Devoir 2' };

// Contrôle avant validation. Une colonne est « utilisée » dès qu'un élève y
// a une note : alors TOUS les élèves doivent en avoir une (un absent reçoit
// une note de rattrapage ou 00 — une case vide est le plus souvent un oubli).
// eleves : [{ id, nom, prenom, row }] (row = ligne de note ou null).
function controleCompletude(eleves) {
  const champsUtilises = NOTE_FIELDS.filter((f) => eleves.some((e) => e.row && e.row[f] !== null && e.row[f] !== undefined));
  const manquants = [];
  for (const e of eleves) {
    const champs = champsUtilises.filter((f) => !e.row || e.row[f] === null || e.row[f] === undefined);
    if (champs.length) manquants.push({ eleveId: e.id, nom: e.nom, prenom: e.prenom, champs, libelles: champs.map((f) => LIBELLES[f]) });
  }
  return {
    champsUtilises,
    manquants,
    nbInter: champsUtilises.filter((f) => f.startsWith('inter')).length,
    nbDev: champsUtilises.filter((f) => f.startsWith('Dev')).length,
  };
}

async function elevesEtNotes(conn, { classeId, matiereId, semestreId, anneeScolaireId }) {
  const [eleves] = await conn.query(
    "SELECT id, nom, prenom FROM eleve WHERE classe_id = ? AND statut = 'actif' ORDER BY nom, prenom",
    [classeId]
  );
  const out = [];
  for (const e of eleves) {
    const row = await noteRow(conn, { eleveId: e.id, classeId, matiereId, semestreId, anneeScolaireId });
    out.push({ ...e, row });
  }
  return out;
}

// « Valider les moyennes » : refuse s'il manque des notes ; demande une
// confirmation explicite si la période compte moins de 2 interrogations ou
// moins de 2 devoirs ; puis calcule, enregistre et verrouille les notes
// présentes de tous les élèves de la classe.
async function saveAverages(conn, k, { confirmerPeuDeNotes = false } = {}) {
  const { classeId, matiereId, semestreId, anneeScolaireId } = k;
  const eleves = await elevesEtNotes(conn, k);
  const controle = controleCompletude(eleves);
  if (!controle.champsUtilises.length) {
    throw Object.assign(new Error('Aucune note saisie pour cette période : rien à valider.'), { code: 'AUCUNE_NOTE' });
  }
  if (controle.manquants.length) {
    throw Object.assign(new Error(`${controle.manquants.length} élève(s) n'ont pas toutes leurs notes. Donnez-leur une note, ou 00, puis validez.`), { code: 'NOTES_MANQUANTES', controle });
  }
  if ((controle.nbInter < 2 || controle.nbDev < 2) && !confirmerPeuDeNotes) {
    throw Object.assign(new Error('Peu de notes pour une moyenne.'), { code: 'PEU_DE_NOTES', controle });
  }

  const coefficient = await coefficientFor(conn, { classeId, matiereId, anneeScolaireId });
  let saved = 0;
  for (const e of eleves) {
    const avgs = computeAverages(e.row, coefficient);
    const validees = NOTE_FIELDS.filter((f) => e.row[f] !== null && e.row[f] !== undefined).join(',');
    await conn.query(
      'UPDATE note SET moyInter = ?, moy = ?, moycoef = ?, notes_validees = ? WHERE id = ?',
      [avgs.moyInter, avgs.moy, avgs.moycoef, validees, e.row.id]
    );
    saved += 1;
  }
  return { saved, coefficient, controle };
}

module.exports = {
  NOTE_FIELDS, noteField, parseNoteValue, computeAverages, isStaff, teacherId,
  canWriteNotes, coefficientFor, noteRow, setNote, recomputeRow, saveAverages,
  notesValidees, estVerrouillee, controleCompletude, elevesEtNotes, LIBELLES,
};
