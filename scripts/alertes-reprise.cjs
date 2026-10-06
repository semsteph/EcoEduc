// Reprise dans le centre de notifications des parents des absences et des
// devoirs des 30 derniers jours (déjà « vus » d'après l'ancien suivi,
// sinon non lus). Sans envoi de notification ni de SMS. Peut être relancé.
require('dotenv').config();
const db = require('../server-lib/db.cjs');

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const iso = (d) => new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const lisible = (d) => { const x = new Date(`${iso(d)}T12:00:00`); return `le ${x.getDate()} ${MOIS[x.getMonth()]}`; };

(async () => {
  const [abs] = await db.query(
    `SELECT p.eleve_id, p.date, e.prenom, e.sexe, e.Parents_id, e.etablissement_id, GROUP_CONCAT(DISTINCT m.nom ORDER BY m.nom SEPARATOR ', ') AS cours,
            MAX(avp.id IS NOT NULL) AS vu
     FROM presence p JOIN eleve e ON e.id = p.eleve_id JOIN matieres m ON m.id = p.matieres_id
     LEFT JOIN absenceVueParents avp ON avp.presence_id = p.id AND avp.parent_id = e.Parents_id
     WHERE p.statut = 'Absent' AND e.Parents_id IS NOT NULL AND p.date >= CURDATE() - INTERVAL 30 DAY
     GROUP BY p.eleve_id, p.date, e.prenom, e.sexe, e.Parents_id, e.etablissement_id`
  );
  let n = 0;
  for (const a of abs) {
    const [r] = await db.query(
      `INSERT IGNORE INTO alerte_parent (parent_id, eleve_id, etablissement_id, type, cle, titre, texte, lien, details, urgent, lu, created_at)
       VALUES (?, ?, ?, 'absence', ?, ?, ?, '/parents/dashbord/notifications', ?, 1, ?, ?)`,
      [a.Parents_id, a.eleve_id, a.etablissement_id, `abs:${a.eleve_id}:${iso(a.date)}`, `Absence de ${a.prenom}`,
        `${a.prenom} a été ${a.sexe === 'F' ? 'absente' : 'absent(e)'} ${lisible(a.date)} (${a.cours}). Si l'absence est justifiée, indiquez-en la raison.`,
        JSON.stringify({ date: iso(a.date), cours: String(a.cours).split(', ') }), a.vu ? 1 : 0, `${iso(a.date)} 08:00:00`]
    );
    n += r.affectedRows;
  }
  const [dev] = await db.query(
    `SELECT d.id, d.titre, d.date_limite, d.created_at, m.nom AS matiere, e.id AS eleve_id, e.prenom, e.Parents_id, e.etablissement_id,
            (dvp.id IS NOT NULL) AS vu
     FROM devoirs d JOIN eleve e ON e.classe_id = d.classe_id AND e.statut = 'actif' AND e.Parents_id IS NOT NULL
     LEFT JOIN matieres m ON m.id = d.matiere_id
     LEFT JOIN devoir_vue_parent dvp ON dvp.devoir_id = d.id AND dvp.parent_id = e.Parents_id
     WHERE d.created_at >= NOW() - INTERVAL 30 DAY`
  );
  for (const d of dev) {
    const [r] = await db.query(
      `INSERT IGNORE INTO alerte_parent (parent_id, eleve_id, etablissement_id, type, cle, titre, texte, lien, lu, created_at)
       VALUES (?, ?, ?, 'devoir', ?, ?, ?, NULL, ?, ?)`,
      [d.Parents_id, d.eleve_id, d.etablissement_id, `dev:${d.id}:${d.eleve_id}`, `Nouveau devoir${d.matiere ? ` : ${d.matiere}` : ''}`,
        `${d.prenom} a un devoir « ${d.titre} »${d.date_limite ? ` à rendre ${lisible(d.date_limite)}` : ''}.`, d.vu ? 1 : 0, d.created_at]
    );
    n += r.affectedRows;
  }
  console.log(`${n} notification(s) reprise(s) (absences et devoirs des 30 derniers jours).`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
