// =====================================================================
//  Messagerie parents : messages automatiques de l'école.
//
//  - Nouvelle note (ou note modifiée / supprimée) : un message par enfant,
//    matière, période et jour. Les notes saisies le même jour s'ajoutent au
//    même message (pas un message par note) ; une note corrigée le jour même
//    remplace simplement la précédente.
//  - Changement d'emploi du temps d'une classe : un message par enfant et par
//    jour, qui liste les cours ajoutés ou retirés.
//  Le texte est construit à la lecture (noms de matière, période, classe à
//  jour).
// =====================================================================

const LIBELLES = { inter1: 'Interrogation 1', inter2: 'Interrogation 2', inter3: 'Interrogation 3', inter4: 'Interrogation 4', Dev1: 'Devoir 1', Dev2: 'Devoir 2' };

const aujourdhui = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const num = (v) => (v === null || v === undefined || v === '' ? null : Math.round(Number(v) * 100) / 100);
const lireDetails = (d) => (typeof d === 'string' ? JSON.parse(d) : d || {});

async function enregistrer(conn, { parentId, eleveId, etablissementId, type, cle, details }) {
  const [r] = await conn.query(
    `INSERT INTO message_parent (parent_id, eleve_id, etablissement_id, type, cle, details)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE details = VALUES(details), lu = 0`,
    [parentId, eleveId, etablissementId, type, cle, JSON.stringify(details)]
  );
  // Nouveau message du jour : notification sur le téléphone du parent
  // (les mises à jour du même message dans la journée n'en renvoient pas).
  if (r.affectedRows === 1) {
    const [[e]] = await conn.query('SELECT prenom FROM eleve WHERE id = ?', [eleveId]);
    const prenom = e ? e.prenom : 'votre enfant';
    require('./alertes.cjs').pousserPlusTard(parentId, type === 'note'
      ? { titre: `Nouvelle note de ${prenom}`, texte: 'Une note vient d’être enregistrée : ouvrez la messagerie pour la voir.', lien: '/parents/dashbord/messages', tag: cle }
      : { titre: `Emploi du temps de ${prenom} modifié`, texte: 'Un cours a été ajouté ou retiré : ouvrez la messagerie pour le détail.', lien: '/parents/dashbord/messages', tag: cle });
  }
}

// Appelé à chaque écriture de note (saisie, import, demande approuvée,
// suppression). `ancienne` = valeur avant l'écriture.
async function noteEnregistree(conn, { eleveId, matiereId, semestreId, classeId, champ, ancienne, valeur }) {
  const avant = num(ancienne);
  const apres = num(valeur);
  if (avant === apres || !LIBELLES[champ]) return;
  const [[eleve]] = await conn.query('SELECT Parents_id, etablissement_id FROM eleve WHERE id = ?', [eleveId]);
  if (!eleve || !eleve.Parents_id) return;

  const cle = `note:${eleveId}:${matiereId}:${semestreId}:${aujourdhui()}`;
  const [[existant]] = await conn.query('SELECT id, details FROM message_parent WHERE parent_id = ? AND cle = ?', [eleve.Parents_id, cle]);
  const details = existant ? lireDetails(existant.details) : { classeId: Number(classeId), matiereId: Number(matiereId), semestreId: Number(semestreId), notes: {} };

  const deja = details.notes[champ];
  const origine = deja ? deja.ancienne : avant;
  if (origine === apres) delete details.notes[champ];       // revenue à la valeur d'avant : rien à dire
  else details.notes[champ] = { ancienne: origine, valeur: apres };

  if (!Object.keys(details.notes).length) {
    if (existant) await conn.query('DELETE FROM message_parent WHERE id = ?', [existant.id]);
    return;
  }
  await enregistrer(conn, { parentId: eleve.Parents_id, eleveId, etablissementId: eleve.etablissement_id, type: 'note', cle, details });
}

// Cours ajouté ou retiré de l'emploi du temps d'une classe.
async function programmeModifie(conn, { classeId, action, jour, horaire, matiereId }) {
  const [eleves] = await conn.query(
    "SELECT id, Parents_id, etablissement_id FROM eleve WHERE classe_id = ? AND statut = 'actif' AND Parents_id IS NOT NULL",
    [classeId]
  );
  const date = aujourdhui();
  for (const e of eleves) {
    const cle = `prog:${e.id}:${classeId}:${date}`;
    const [[existant]] = await conn.query('SELECT id, details FROM message_parent WHERE parent_id = ? AND cle = ?', [e.Parents_id, cle]);
    const details = existant ? lireDetails(existant.details) : { classeId: Number(classeId), changements: [] };
    // Ajout puis retrait du même cours le même jour : ils s'annulent.
    const inverse = details.changements.findIndex((c) => c.action !== action && c.jour === jour && c.matiereId === Number(matiereId)
      && (action === 'retrait' ? !horaire || c.horaire === horaire : c.horaire === horaire));
    if (inverse >= 0) details.changements.splice(inverse, 1);
    else details.changements.push({ action, jour, horaire: horaire || null, matiereId: Number(matiereId) });
    if (details.changements.length > 30) details.changements = details.changements.slice(-30);

    if (!details.changements.length) {
      if (existant) await conn.query('DELETE FROM message_parent WHERE id = ?', [existant.id]);
      continue;
    }
    await enregistrer(conn, { parentId: e.Parents_id, eleveId: e.id, etablissementId: e.etablissement_id, type: 'programme', cle, details });
  }
}

const virgule = (v) => String(v).replace('.', ',');

// Messages d'un parent, prêts à afficher.
async function messagesDuParent(conn, parentId, { limite = 100 } = {}) {
  const [rows] = await conn.query(
    `SELECT mp.id, mp.eleve_id, mp.type, mp.details, mp.lu, mp.created_at, mp.updated_at, e.prenom, e.nom
     FROM message_parent mp JOIN eleve e ON e.id = mp.eleve_id
     WHERE mp.parent_id = ? ORDER BY mp.updated_at DESC LIMIT ?`,
    [parentId, limite]
  );
  if (!rows.length) return [];
  const all = rows.map((r) => ({ ...r, details: lireDetails(r.details) }));
  const ids = (k) => [...new Set(all.flatMap((r) => (r.type === 'programme' ? (r.details.changements || []).map((c) => c[k]) : [r.details[k]])).filter(Boolean))];
  const nomsDe = async (table, liste) => {
    if (!liste.length) return {};
    const [x] = await conn.query(`SELECT id, nom FROM ${table} WHERE id IN (?)`, [liste]);
    return Object.fromEntries(x.map((y) => [y.id, y.nom]));
  };
  const matieres = await nomsDe('matieres', ids('matiereId'));
  const periodes = await nomsDe('semestre', [...new Set(all.map((r) => r.details.semestreId).filter(Boolean))]);
  const classes = await nomsDe('classes', [...new Set(all.map((r) => r.details.classeId).filter(Boolean))]);

  return all.map((r) => {
    const base = { id: r.id, type: r.type, lu: Boolean(r.lu), date: r.updated_at, eleveId: r.eleve_id, enfant: r.prenom };
    if (r.type === 'note') {
      const lignes = Object.entries(r.details.notes || {}).map(([champ, n]) => {
        if (n.valeur === null) return `${LIBELLES[champ]} : note retirée`;
        if (n.ancienne === null || n.ancienne === undefined) return `${LIBELLES[champ]} : ${virgule(n.valeur)}/20`;
        return `${LIBELLES[champ]} : ${virgule(n.valeur)}/20 (corrigée, avant ${virgule(n.ancienne)})`;
      });
      return { ...base, titre: `${matieres[r.details.matiereId] || 'Matière'} — ${periodes[r.details.semestreId] || ''}`.replace(/ — $/, ''), lignes };
    }
    const lignes = (r.details.changements || []).map((c) => {
      const cours = `${matieres[c.matiereId] || 'cours'} le ${c.jour}${c.horaire ? ` ${c.horaire.replace(/^0/, '')}` : ''}`;
      return c.action === 'ajout' ? `Ajouté : ${cours}` : `Retiré : ${cours}`;
    });
    return { ...base, titre: `Emploi du temps de la ${classes[r.details.classeId] || 'classe'} modifié`, lignes };
  });
}

module.exports = { noteEnregistree, programmeModifie, messagesDuParent, LIBELLES };
