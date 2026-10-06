// =====================================================================
//  Programmes de matière : quel programme s'applique à une classe, son
//  arbre, la progression de la classe (séances du cahier de texte) et la
//  partie à proposer pour la prochaine séance.
//
//  Règle : pour une classe et une matière, on prend la version adaptée par
//  l'enseignant qui y enseigne (s'il en a une pour ce niveau), sinon le
//  programme du niveau. Les programmes ne dépendent pas de l'année : ils
//  restent après la clôture et servent les années suivantes.
// =====================================================================
const { intitule } = require('./programme-texte.cjs');

// Classe, son niveau et l'année en cours (les classes durent d'une année
// à l'autre : c'est l'année ouverte de l'école qui compte).
async function classeInfo(conn, classeId) {
  const [[c]] = await conn.query(
    `SELECT c.id, c.nom, c.Promotion_id AS promotionId, c.etablissement_id AS etab, p.nom AS promotion,
            COALESCE((SELECT a.id FROM annee_scolaire a WHERE a.etablissement_id = c.etablissement_id AND a.statut = 'ouverte' ORDER BY a.id DESC LIMIT 1), c.Annee_scolaire_id) AS anneeId
       FROM classes c LEFT JOIN promotion p ON p.id = c.Promotion_id WHERE c.id = ?`,
    [classeId]
  );
  return c || null;
}

// Enseignant(s) de la classe pour la matière (année de la classe).
async function enseignantsDe(conn, classe, matiereId) {
  const [rows] = await conn.query(
    'SELECT DISTINCT Enseignants_id AS id FROM enseigner WHERE Classes_id = ? AND matiere_id = ? AND Annee_scolaire_id = ?',
    [classe.id, matiereId, classe.anneeId]
  );
  return rows.map((r) => r.id);
}

async function programmeNiveau(conn, etab, matiereId, promotionId) {
  const [[p]] = await conn.query(
    'SELECT * FROM programme_matiere WHERE etablissement_id = ? AND matiere_id = ? AND promotion_id = ? AND enseignant_id IS NULL ORDER BY id LIMIT 1',
    [etab, matiereId, promotionId]
  );
  return p || null;
}

async function programmeEnseignant(conn, etab, matiereId, promotionId, enseignantId) {
  const [[p]] = await conn.query(
    'SELECT * FROM programme_matiere WHERE etablissement_id = ? AND matiere_id = ? AND promotion_id = ? AND enseignant_id = ? ORDER BY id LIMIT 1',
    [etab, matiereId, promotionId, enseignantId]
  );
  return p || null;
}

// Programme applicable à une classe pour une matière (ou null).
// enseignantId : l'enseignant qui consulte (sa version passe en premier).
async function programmeDeClasse(conn, classe, matiereId, enseignantId = null) {
  if (!classe || !classe.promotionId) return null;
  const candidats = enseignantId ? [enseignantId] : await enseignantsDe(conn, classe, matiereId);
  for (const id of candidats) {
    const p = await programmeEnseignant(conn, classe.etab, matiereId, classe.promotionId, id);
    if (p) return { ...p, portee: 'enseignant' };
  }
  const n = await programmeNiveau(conn, classe.etab, matiereId, classe.promotionId);
  return n ? { ...n, portee: 'niveau' } : null;
}

// Arbre d'un programme : [{ id, libelle, numero, titre, details, enfants }]
async function arbre(conn, programmeId, { avecRetires = false } = {}) {
  const [rows] = await conn.query(
    `SELECT id, parent_id AS parentId, ordre, libelle, numero, titre, details, retire
       FROM programme_element WHERE programme_id = ? ${avecRetires ? '' : 'AND retire = 0'} ORDER BY ordre, id`,
    [programmeId]
  );
  const parId = new Map(rows.map((r) => [r.id, { id: r.id, libelle: r.libelle, numero: r.numero, titre: r.titre, details: r.details, retire: !!r.retire, enfants: [] }]));
  const racine = [];
  rows.forEach((r) => {
    const n = parId.get(r.id);
    const parent = r.parentId ? parId.get(r.parentId) : null;
    (parent ? parent.enfants : racine).push(n);
  });
  return racine;
}

// Parcours dans l'ordre du programme : [{ element, chemin: [ancêtres..., element] }]
function aplatir(noeuds, chemin = [], sortie = []) {
  noeuds.forEach((n) => {
    const c = [...chemin, n];
    sortie.push({ element: n, chemin: c, feuille: !n.enfants.length });
    aplatir(n.enfants, c, sortie);
  });
  return sortie;
}

const cheminTexte = (chemin) => chemin.map(intitule).join(' › ');

// Séances de la classe dans cette matière (année de la classe), par élément.
async function progression(conn, classe, matiereId) {
  const [rows] = await conn.query(
    `SELECT id, date, horaire, activite, contenu, programme_element_id AS elementId, element_termine AS termine
       FROM tests WHERE classe_id = ? AND \`matière_id\` = ? AND Annee_scolaire_id = ? ORDER BY date, id`,
    [classe.id, matiereId, classe.anneeId]
  );
  const parElement = {};
  rows.forEach((r) => {
    if (!r.elementId) return;
    const p = parElement[r.elementId] || (parElement[r.elementId] = { seances: [], termine: false });
    p.seances.push({ id: r.id, date: r.date, contenu: r.contenu || null });
    if (r.termine) p.termine = true;
  });
  return { seances: rows, parElement };
}

// Partie à proposer pour la prochaine séance : la dernière partie travaillée
// si elle n'est pas terminée, sinon la partie suivante du programme.
function suggestion(arbreProgramme, prog) {
  const feuilles = aplatir(arbreProgramme).filter((x) => x.feuille);
  if (!feuilles.length) return null;
  const derniere = [...prog.seances].reverse().find((s) => s.elementId);
  if (!derniere) return feuilles[0].element.id;
  const i = feuilles.findIndex((f) => f.element.id === derniere.elementId);
  if (i === -1) return feuilles[0].element.id;
  const terminee = prog.parElement[derniere.elementId]?.termine;
  if (!terminee) return feuilles[i].element.id;
  return (feuilles[i + 1] || feuilles[i]).element.id;
}

// Enregistre un arbre dans un programme. Les éléments existants (id connu)
// sont mis à jour, les nouveaux créés ; ceux qui disparaissent sont
// supprimés, ou seulement retirés s'ils sont déjà cités dans un cahier de texte.
async function enregistrerArbre(conn, programmeId, noeuds) {
  const [existants] = await conn.query('SELECT id FROM programme_element WHERE programme_id = ?', [programmeId]);
  const connus = new Set(existants.map((r) => r.id));
  const gardes = new Set();
  let ordre = 0;
  const ecrire = async (liste, parentId) => {
    for (const n of liste || []) {
      const titre = String(n.titre || '').trim().slice(0, 255);
      if (!titre) continue;
      const valeurs = [parentId, (ordre += 1), String(n.libelle || 'Activité').slice(0, 40), n.numero ? String(n.numero).slice(0, 20) : null, titre, n.details ? String(n.details).slice(0, 5000) : null];
      let id = Number(n.id) || null;
      if (id && connus.has(id)) {
        await conn.query('UPDATE programme_element SET parent_id = ?, ordre = ?, libelle = ?, numero = ?, titre = ?, details = ?, retire = 0 WHERE id = ?', [...valeurs, id]);
      } else {
        const [r] = await conn.query('INSERT INTO programme_element (programme_id, parent_id, ordre, libelle, numero, titre, details) VALUES (?, ?, ?, ?, ?, ?, ?)', [programmeId, ...valeurs]);
        id = r.insertId;
      }
      gardes.add(id);
      await ecrire(n.enfants, id);
    }
  };
  await ecrire(noeuds, null);
  const partis = [...connus].filter((id) => !gardes.has(id));
  if (partis.length) {
    const [cites] = await conn.query('SELECT DISTINCT programme_element_id AS id FROM tests WHERE programme_element_id IN (?)', [partis]);
    const citesSet = new Set(cites.map((r) => r.id));
    const aRetirer = partis.filter((id) => citesSet.has(id));
    const aSupprimer = partis.filter((id) => !citesSet.has(id));
    if (aRetirer.length) await conn.query('UPDATE programme_element SET retire = 1 WHERE id IN (?)', [aRetirer]);
    if (aSupprimer.length) await conn.query('DELETE FROM programme_element WHERE id IN (?)', [aSupprimer]);
  }
}

// Copie d'un programme (version propre à un enseignant à partir de celui du
// niveau). Renvoie la correspondance ancien id → nouvel id.
async function copierElements(conn, depuisId, versId) {
  const [rows] = await conn.query('SELECT * FROM programme_element WHERE programme_id = ? ORDER BY parent_id IS NOT NULL, ordre, id', [depuisId]);
  const map = new Map();
  // Les parents d'abord : on répète tant que des éléments attendent leur parent.
  let reste = rows;
  while (reste.length) {
    const attente = [];
    for (const r of reste) {
      if (r.parent_id && !map.has(r.parent_id)) { attente.push(r); continue; }
      const [ins] = await conn.query(
        'INSERT INTO programme_element (programme_id, parent_id, ordre, libelle, numero, titre, details, retire) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [versId, r.parent_id ? map.get(r.parent_id) : null, r.ordre, r.libelle, r.numero, r.titre, r.details, r.retire]
      );
      map.set(r.id, ins.insertId);
    }
    if (attente.length === reste.length) break;
    reste = attente;
  }
  return map;
}

// ---------------------------------------------------------------------
// Discussion de l'assistant sur une partie du programme : tout le programme
// avec l'avancement de la classe, et les séances de cette partie.
// test : séance du cahier de texte (id, classe_id, matière, enseignant,
// programme_element_id). Renvoie null pour une séance hors programme.
// ---------------------------------------------------------------------
const jourMois = (d) => {
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '' : `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}`;
};

async function filDePartie(conn, test) {
  if (!test || !test.elementId) return null;
  const [[el]] = await conn.query('SELECT id, programme_id AS programmeId FROM programme_element WHERE id = ?', [test.elementId]);
  if (!el) return null;
  const classe = await classeInfo(conn, test.classeId);
  if (!classe) return null;
  const arbreProgramme = await arbre(conn, el.programmeId, { avecRetires: true });
  const prog = await progression(conn, classe, test.matiereId);
  const lignes = aplatir(arbreProgramme);
  const cible = lignes.find((x) => x.element.id === el.id);
  if (!cible) return null;

  const seances = (prog.parElement[el.id]?.seances || []).map((s) => ({ id: s.id, date: s.date, contenu: s.contenu }));
  const derniere = seances[seances.length - 1];
  const etat = (id) => {
    const p = prog.parElement[id];
    if (!p) return 'pas encore vue en classe';
    const dates = p.seances.map((s) => jourMois(s.date)).join(', ');
    return p.termine ? `vue en classe (${dates}), terminée` : `en cours en classe (${dates})`;
  };
  const programmeTexte = lignes
    .filter((x) => !x.element.retire || prog.parElement[x.element.id])
    .map((x) => {
      const retrait = '  '.repeat(x.chemin.length - 1);
      const base = `${retrait}${intitule(x.element)}`;
      if (!x.feuille) return base;
      return `${base} — ${etat(x.element.id)}${x.element.id === el.id ? '   ← PARTIE DE CETTE DISCUSSION' : ''}`;
    })
    .join('\n');

  return {
    elementId: el.id,
    titre: intitule(cible.element),
    chemin: cheminTexte(cible.chemin),
    details: cible.element.details || null,
    seances,
    premiereSeanceId: seances[0]?.id || test.id,
    derniereDate: derniere?.date || test.date,
    terminee: !!prog.parElement[el.id]?.termine,
    niveau: classe.promotion,
    programmeTexte,
  };
}

// Texte ajouté au contexte de l'assistant pour une discussion de partie.
function contexteFilTexte(fil) {
  if (!fil) return '';
  const seances = fil.seances.length
    ? fil.seances.map((s) => `- ${jourMois(s.date)} : ${s.contenu || 'contenu de la séance non précisé par l’enseignant'}`).join('\n')
    : '- Aucune séance enregistrée pour le moment.';
  return `PROGRAMME DE LA MATIÈRE (${fil.niveau || 'niveau de la classe'}) ET AVANCEMENT DE LA CLASSE — données fiables :
${fil.programmeTexte}

PARTIE TRAVAILLÉE DANS CETTE DISCUSSION : ${fil.chemin}${fil.details ? `\nDescription dans le programme : ${fil.details}` : ''}
Séances de cette partie (dans l'ordre), avec ce que l'enseignant a noté :
${seances}
État : ${fil.terminee ? 'partie terminée en classe.' : `partie en cours en classe ; la dernière séance date du ${jourMois(fil.derniereDate)}.`}

RÈGLES LIÉES AU PROGRAMME :
- Tu connais tout le programme et l'avancement de la classe. Reste centré sur la partie de cette discussion, en t'appuyant sur ce qui a été fait à chaque séance.
- Si l'élève dit ne pas avoir compris « le dernier cours », il s'agit de la dernière séance listée ci-dessus : commence par ce qui y a été fait.
- Tu peux faire le lien avec les parties déjà vues en classe (rappel bref).
- Si l'élève demande une partie marquée « pas encore vue en classe », dis-lui gentiment que la classe ne l'a pas encore abordée ; tu peux en donner un aperçu simple s'il insiste, sans faire de cours complet.`;
}

module.exports = {
  filDePartie,
  contexteFilTexte,
  classeInfo,
  enseignantsDe,
  programmeNiveau,
  programmeEnseignant,
  programmeDeClasse,
  arbre,
  aplatir,
  cheminTexte,
  progression,
  suggestion,
  enregistrerArbre,
  copierElements,
};
