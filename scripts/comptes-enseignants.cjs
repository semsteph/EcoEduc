// Crée un compte pour chaque fiche enseignant qui n'en a pas encore (une
// fiche = un compte : aucune fusion automatique — deux fiches de la même
// personne ne sont reliées que par l'école qui l'ajoute avec le même
// téléphone ou e-mail). Peut être relancé sans risque.
require('dotenv').config();
const db = require('../server-lib/db.cjs');

(async () => {
  const [fiches] = await db.query('SELECT id, nom_utilisateur, email, telephone, mot_de_passe FROM enseignants WHERE compte_id IS NULL');
  let crees = 0;
  for (const f of fiches) {
    const tel = String(f.telephone || '').replace(/\D/g, '') || null;
    const [r] = await db.query(
      'INSERT INTO compte_enseignant (nom_utilisateur, email, telephone, mot_de_passe) VALUES (?, ?, ?, ?)',
      [f.nom_utilisateur, String(f.email || '').trim().toLowerCase() || null, tel, f.mot_de_passe]
    );
    await db.query('UPDATE enseignants SET compte_id = ? WHERE id = ?', [r.insertId, f.id]);
    crees += 1;
  }
  console.log(`${crees} compte(s) enseignant créé(s).`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
