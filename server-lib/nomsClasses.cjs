// =====================================================================
//  Nom des classes d'une même promotion (ex. « 2nd D ») :
//  - une seule classe : le nom de la promotion, sans numéro (« 2nd D ») ;
//  - plusieurs : numérotées « 2nd D 1 », « 2nd D 2 »… Quand une 2e classe
//    arrive, l'ancienne « 2nd D » devient « 2nd D 1 ».
//  - s'il n'en reste qu'une (suppression), elle reprend le nom sans numéro.
//  Le numéro est séparé par une espace : « 2nd D1 » serait lu comme une
//  série « D1 » différente de « D » (la clôture ne ferait plus le lien).
// =====================================================================
const SUFFIXE = /^(.*\S)\s+(\d+)$/;

function nomDeBase(nom) {
  const m = String(nom || '').trim().match(SUFFIXE);
  return m ? m[1] : String(nom || '').trim();
}

function numeroDe(nom) {
  const m = String(nom || '').trim().match(SUFFIXE);
  return m ? Number(m[2]) : 0;
}

const echapperRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function classesDuGroupe(conn, etablissementId, base) {
  const [rows] = await conn.query(
    'SELECT id, nom FROM classes WHERE etablissement_id = ? AND (nom = ? OR nom REGEXP ?) ORDER BY id',
    [etablissementId, base, `^${echapperRegex(base)} [0-9]+$`]
  );
  return rows;
}

// Remet les noms d'un groupe en règle (numérote ou retire le numéro).
async function normaliserGroupe(conn, etablissementId, base) {
  const rows = await classesDuGroupe(conn, etablissementId, base);
  if (rows.length === 1) {
    if (rows[0].nom !== base) await conn.query('UPDATE classes SET nom = ? WHERE id = ?', [base, rows[0].id]);
    return;
  }
  const pris = new Set(rows.map((r) => numeroDe(r.nom)).filter(Boolean));
  for (const r of rows.filter((x) => numeroDe(x.nom) === 0)) {
    let n = 1;
    while (pris.has(n)) n += 1;
    pris.add(n);
    await conn.query('UPDATE classes SET nom = ? WHERE id = ?', [`${base} ${n}`, r.id]);
  }
}

// Crée `nombre` classes d'une promotion en respectant la règle ; renvoie
// les classes créées.
async function creerClasses(conn, { etablissementId, base, promotionId, cycle, nombre }) {
  const existantes = await classesDuGroupe(conn, etablissementId, base);
  const creees = [];
  if (existantes.length + nombre === 1) {
    const [r] = await conn.query('INSERT INTO classes (nom, Promotion_id, etablissement_id, cycle) VALUES (?, ?, ?, ?)', [base, promotionId, etablissementId, cycle]);
    return [{ id: r.insertId, nom: base }];
  }
  // Les anciennes classes sans numéro prennent d'abord les premiers
  // numéros libres (« 2nd D » → « 2nd D 1 »), puis viennent les nouvelles.
  const pris = new Set(existantes.map((r) => numeroDe(r.nom)).filter(Boolean));
  for (const r of existantes.filter((x) => numeroDe(x.nom) === 0)) {
    let n = 1;
    while (pris.has(n)) n += 1;
    pris.add(n);
    await conn.query('UPDATE classes SET nom = ? WHERE id = ?', [`${base} ${n}`, r.id]);
  }
  for (let i = 0; i < nombre; i += 1) {
    let n = 1;
    while (pris.has(n)) n += 1;
    pris.add(n);
    const nom = `${base} ${n}`;
    const [r] = await conn.query('INSERT INTO classes (nom, Promotion_id, etablissement_id, cycle) VALUES (?, ?, ?, ?)', [nom, promotionId, etablissementId, cycle]);
    creees.push({ id: r.insertId, nom });
  }
  return creees;
}

module.exports = { nomDeBase, numeroDe, normaliserGroupe, creerClasses };
