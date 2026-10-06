// =====================================================================
//  Crée la conversation « équations chimiques et équilibrage » (2nde D,
//  physique-chimie) avec le VRAI assistant, pour la vidéo marketing :
//   1. la leçon est ajoutée au cahier de texte de la classe (école de test) ;
//   2. l'élève pose ses questions à l'assistant, une par une ;
//   3. ensuite : node scripts/marketing/videos.cjs equilibrage
//  Nécessite du crédit Anthropic et le serveur lancé (port 8080).
// =====================================================================
process.chdir(require('path').join(__dirname, '..', '..'));
require('dotenv').config();
const jwt = require('jsonwebtoken');
const API = process.env.GUIDE_API || 'http://localhost:8080/api';

const QUESTIONS = [
  "je n'ai pas compris le cours sur les équations chimiques",
  "c'est quoi équilibrer une équation ? pourquoi on doit le faire ?",
  'comment on équilibre H2 + O2 → H2O ?',
  'et pour CH4 + O2 → CO2 + H2O ?',
  "j'ai essayé Fe + O2 → Fe2O3, j'ai trouvé 4 Fe + 3 O2 → 2 Fe2O3, c'est juste ?",
  "merci, j'ai compris !",
];

(async () => {
  const cle = process.env.ANTHROPIC_API_KEY;
  const essai = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': cle, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, messages: [{ role: 'user', content: 'ok' }] }),
  });
  if (!essai.ok) { console.log('Crédit Anthropic indisponible : rechargez-le puis relancez.'); process.exit(1); }

  const db = require('../../server-lib/db.cjs');
  const comptesEns = require('../../server-lib/comptes-enseignants.cjs');
  const [[fiche]] = await db.query('SELECT e.id, e.compte_id, e.nom, e.prenom, e.nom_utilisateur, e.etablissement_id, et.nom AS etablissement_nom FROM enseignants e JOIN etablissement et ON et.id = e.etablissement_id WHERE e.id = 23');
  const prof = comptesEns.signerJeton(fiche);
  const parent = jwt.sign({ id: 18, etablissementId: 72, role: 'parent' }, process.env.JWT_SECRET, { expiresIn: '2h' });
  const [[annee]] = await db.query("SELECT id FROM annee_scolaire WHERE etablissement_id = 72 AND statut = 'ouverte'");
  const aujourdhui = new Date().toISOString().slice(0, 10);

  // 1. Leçon dans le cahier de texte de la 2nde D 1 (classe 47).
  let [[test]] = await db.query("SELECT id FROM tests WHERE classe_id = 47 AND `matière_id` = 18 AND activite LIKE '%quilibrage%' LIMIT 1");
  if (!test) {
    const r = await fetch(`${API}/addActivity`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${prof}` },
      body: JSON.stringify({ teacherId: 23, subjectId: 18, activity: 'Les équations chimiques et leur équilibrage', date: aujourdhui, hours: '10h00-12h00', classId: 47, semesterName: 'Semestre 1', etablissementId: 72, anneeScolaireId: annee.id }),
    });
    test = await r.json();
    console.log('Leçon ajoutée au cahier de texte :', r.status, test.id);
  }

  // 2. Questions de l'élève (Rachidi, élève 31) à l'assistant.
  for (const q of QUESTIONS) {
    const r = await fetch(`${API}/parent/assistant/message`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${parent}` },
      body: JSON.stringify({ eleveId: 31, testId: test.id, userMessage: q }),
    });
    const d = await r.json().catch(() => ({}));
    console.log(`« ${q} » → ${r.status} ${String(d.reply || d.message || d.content || '').slice(0, 80).replace(/\n/g, ' ')}…`);
    if (!r.ok) break;
  }
  console.log('Terminé. Filmez maintenant : node scripts/marketing/videos.cjs equilibrage');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
