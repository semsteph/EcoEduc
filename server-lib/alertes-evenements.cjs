// =====================================================================
//  Événements qui créent une alerte pour les parents (appelés après
//  l'enregistrement, hors transaction). Textes courts et clairs : ils sont
//  aussi le contenu des notifications sur le téléphone et des SMS.
// =====================================================================
const db = require('./db.cjs');
const alertes = require('./alertes.cjs');

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const iso = (d) => (typeof d === 'string' ? d.slice(0, 10) : new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 10));
const jourLisible = (d) => { const x = new Date(`${iso(d)}T12:00:00`); return `${JOURS[x.getDay()]} ${x.getDate()} ${MOIS[x.getMonth()]}`; };
const aujourdhui = () => iso(new Date());

async function eleve(id) {
  const [[e]] = await db.query('SELECT e.id, e.nom, e.prenom, e.sexe, e.Parents_id, e.etablissement_id, c.nom AS classe FROM eleve e LEFT JOIN classes c ON c.id = e.classe_id WHERE e.id = ?', [id]);
  return e || null;
}
// Adresse de l'enfant côté parent (même règle que l'écran « Mes enfants »).
const slug = (prenom) => String(prenom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'enfant';
const lien = (e, page = '') => `/parents/dashbord/enfants/${slug(e.prenom)}${page ? `/${page}` : ''}`;

// Absences d'une journée : une seule alerte par enfant et par jour, qui
// liste les cours manqués (mise à jour à chaque appel ; retirée si
// l'enseignant corrige et que l'élève n'est plus absent ce jour-là).
async function absencesDuJour(eleveIds, date) {
  for (const id of [...new Set(eleveIds)]) {
    const e = await eleve(id);
    if (!e || !e.Parents_id) continue;
    const [abs] = await db.query(
      `SELECT DISTINCT m.nom FROM presence p JOIN matieres m ON m.id = p.matieres_id
       WHERE p.eleve_id = ? AND p.date = ? AND p.statut = 'Absent' ORDER BY m.nom`,
      [id, iso(date)]
    );
    const cle = `abs:${id}:${iso(date)}`;
    if (!abs.length) {
      await db.query('DELETE FROM alerte_parent WHERE parent_id = ? AND cle = ? AND lu = 0', [e.Parents_id, cle]);
      continue;
    }
    const quand = iso(date) === aujourdhui() ? "aujourd'hui" : `le ${jourLisible(date)}`;
    const cours = abs.map((a) => a.nom).join(', ');
    const absent = e.sexe === 'F' ? 'absente' : 'absent(e)';
    await alertes.enregistrer(db, {
      parentId: e.Parents_id, eleveId: id, etablissementId: e.etablissement_id, type: 'absence', cle, urgent: true,
      titre: `Absence de ${e.prenom}`,
      texte: `${e.prenom} a été ${absent} ${quand} (${cours}). Si l'absence est justifiée, indiquez-en la raison.`,
      texteSms: `${e.prenom} ${e.nom} a ete ${e.sexe === 'F' ? 'absente' : 'absent'} ${iso(date) === aujourdhui() ? "aujourd'hui" : `le ${iso(date).split('-').reverse().join('/')}`} (${cours}). Justifiez dans l'application.`,
      lien: '/parents/dashbord/notifications',
      details: { date: iso(date), cours: abs.map((a) => a.nom) },
    });
  }
}

const LIBELLE_PERMISSION = {
  autoriser: { titre: 'accordée', sms: 'accordee' },
  'non autoriser': { titre: 'refusée', sms: 'refusee' },
  'sous reserve de justification': { titre: 'accordée sous réserve de justification', sms: 'accordee sous reserve de justificatif' },
};

// Réponse de l'école à une demande de permission.
async function permissionDecidee(permissionId) {
  const [[p]] = await db.query('SELECT id, eleve_id, Date, date_fin, Duree, Statut FROM permission WHERE id = ?', [permissionId]);
  const l = p && LIBELLE_PERMISSION[p.Statut];
  if (!l) return;
  const e = await eleve(p.eleve_id);
  if (!e || !e.Parents_id) return;
  const periode = p.date_fin && iso(p.date_fin) !== iso(p.Date) ? `du ${jourLisible(p.Date)} au ${jourLisible(p.date_fin)}` : `le ${jourLisible(p.Date)}`;
  await alertes.enregistrer(db, {
    parentId: e.Parents_id, eleveId: e.id, etablissementId: e.etablissement_id, type: 'permission', cle: `perm:${p.id}:${p.Statut}`, urgent: true,
    titre: `Permission ${l.titre}`,
    texte: `La demande de permission de ${e.prenom} ${periode} (${p.Duree || ''}) a été ${l.titre} par l'établissement.`,
    texteSms: `Permission de ${e.prenom} ${l.sms} pour ${iso(p.Date).split('-').reverse().join('/')}.`,
    lien: lien(e, 'permission'),
  });
}

// Bulletins enregistrés : « le bulletin du Semestre 1 est disponible »
// (une fois par élève et par période).
async function bulletinsDisponibles(ctx) {
  for (const s of ctx.semestres) {
    for (const el of ctx.eleves) {
      const b = ctx.parSemestre[s.id] && ctx.parSemestre[s.id][el.id];
      if (!b || b.moyenne_semestrielle === null) continue;
      const e = await eleve(el.id);
      if (!e || !e.Parents_id) continue;
      await alertes.enregistrer(db, {
        parentId: e.Parents_id, eleveId: e.id, etablissementId: e.etablissement_id, type: 'bulletin', cle: `bull:${e.id}:${s.id}:${ctx.annee.id}`, urgent: true,
        titre: `Bulletin disponible : ${s.nom}`,
        texte: `Le bulletin du ${s.nom} de ${e.prenom} est disponible.`,
        texteSms: `Le bulletin du ${s.nom} de ${e.prenom} ${e.nom} est disponible dans l'application.`,
        lien: lien(e, 'bulletin'),
      });
    }
  }
}

// Punition enregistrée.
async function punitionDonnee(punitionId) {
  const [[p]] = await db.query('SELECT id, eleve_id, punition, motif, date FROM punitions WHERE id = ?', [punitionId]);
  if (!p) return;
  const e = await eleve(p.eleve_id);
  if (!e || !e.Parents_id) return;
  const heures = Number(p.punition) || 0;
  await alertes.enregistrer(db, {
    parentId: e.Parents_id, eleveId: e.id, etablissementId: e.etablissement_id, type: 'punition', cle: `pun:${p.id}`,
    titre: `Punition de ${e.prenom}`,
    texte: `${e.prenom} a reçu ${heures ? `${heures} heure(s) de punition` : 'une punition'}${p.motif ? ` : ${p.motif}` : ''}${p.date ? ` (${jourLisible(p.date)})` : ''}.`,
    lien: lien(e, 'conduite'),
  });
}

// Devoir donné à la classe d'un enfant.
async function devoirDonne(devoirId) {
  const [[d]] = await db.query(
    'SELECT d.id, d.titre, d.date_limite, d.classe_id, m.nom AS matiere FROM devoirs d LEFT JOIN matieres m ON m.id = d.matiere_id WHERE d.id = ?',
    [devoirId]
  );
  if (!d) return;
  const [eleves] = await db.query("SELECT id FROM eleve WHERE classe_id = ? AND statut = 'actif' AND Parents_id IS NOT NULL", [d.classe_id]);
  for (const { id } of eleves) {
    const e = await eleve(id);
    await alertes.enregistrer(db, {
      parentId: e.Parents_id, eleveId: e.id, etablissementId: e.etablissement_id, type: 'devoir', cle: `dev:${d.id}:${e.id}`,
      titre: `Nouveau devoir${d.matiere ? ` : ${d.matiere}` : ''}`,
      texte: `${e.prenom} a un devoir « ${d.titre} »${d.date_limite ? ` à rendre le ${jourLisible(d.date_limite)}` : ''}.`,
      lien: lien(e, 'devoirs'),
    });
  }
}

// Lancement sans bloquer la réponse ; une erreur ne casse jamais l'action.
function plusTard(fn, ...args) {
  setTimeout(() => { fn(...args).catch((err) => console.error('Alerte parent :', err.message)); }, 300);
}

module.exports = { absencesDuJour, permissionDecidee, bulletinsDisponibles, punitionDonnee, devoirDonne, plusTard };
