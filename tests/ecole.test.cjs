// Tests de non-régression de la logique scolaire (test A→Z du 2026-10-03).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-de-test';
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const notes = require('../server-lib/notes-service.cjs');
const { rankEntries, mentionFor } = require('../server-lib/bulletin-service.cjs');
const guard = require('../server-lib/access-guard.cjs');
const cloture = require('../routes/cloture.routes.cjs').__test;

// Notes : champs, valeurs, moyennes.
assert.equal(notes.noteField('Inter1'), 'inter1');
assert.equal(notes.noteField('Devoir2'), 'Dev2');
assert.equal(notes.noteField('moy; DROP TABLE note'), null);
assert.deepEqual(notes.parseNoteValue('14,5'), { ok: true, value: 14.5 });
assert.equal(notes.parseNoteValue('25').ok, false);
assert.equal(notes.parseNoteValue('-1').ok, false);
assert.deepEqual(notes.computeAverages({ inter1: 12, inter2: 14, inter3: null, inter4: null, Dev1: 10, Dev2: 16 }, 3), { moyInter: 13, moy: 13, moycoef: 39 });
assert.deepEqual(notes.computeAverages({ inter1: null, inter2: null, inter3: null, inter4: null, Dev1: null, Dev2: null }, 2), { moyInter: null, moy: null, moycoef: null });

// Validation : toutes les colonnes utilisées doivent être remplies pour
// chaque élève ; verrou note par note.
{
  const vide = { inter1: null, inter2: null, inter3: null, inter4: null, Dev1: null, Dev2: null };
  const c = notes.controleCompletude([
    { id: 1, nom: 'A', prenom: 'a', row: { ...vide, inter1: 12, inter2: 0, Dev1: 10 } },
    { id: 2, nom: 'B', prenom: 'b', row: { ...vide, inter1: 9, Dev1: 11 } },
    { id: 3, nom: 'C', prenom: 'c', row: null },
  ]);
  assert.deepEqual(c.champsUtilises, ['inter1', 'inter2', 'Dev1']);
  assert.equal(c.nbInter, 2); assert.equal(c.nbDev, 1);
  assert.deepEqual(c.manquants.map((m) => [m.eleveId, m.champs]), [[2, ['inter2']], [3, ['inter1', 'inter2', 'Dev1']]]);
  // 0 est une vraie note (absent noté 00), pas une case vide.
  assert.equal(notes.controleCompletude([{ id: 1, row: { ...vide, inter1: 0 } }]).manquants.length, 0);
  // Verrou : seulement les notes présentes à la validation.
  assert.equal(notes.estVerrouillee({ ...vide, inter1: 12, inter2: 14, moy: 12, notes_validees: 'inter1' }, 'inter1'), true);
  assert.equal(notes.estVerrouillee({ ...vide, inter1: 12, inter2: 14, moy: 12, notes_validees: 'inter1' }, 'inter2'), false);
  assert.equal(notes.estVerrouillee({ ...vide, inter1: 12, moy: 12, notes_validees: 'inter1' }, 'Dev1'), false);
  assert.equal(notes.estVerrouillee({ ...vide, inter1: 12, moy: null, notes_validees: null }, 'inter1'), false);
  // Anciennes lignes validées sans liste : toutes les notes présentes.
  assert.equal(notes.estVerrouillee({ ...vide, inter1: 12, Dev1: 9, moy: 10.5, notes_validees: null }, 'Dev1'), true);
  assert.equal(notes.estVerrouillee({ ...vide, inter1: 12, moy: 12, notes_validees: null }, 'inter2'), false);
}

// Rangs ex æquo et mentions.
const e = [{ m: 12.5 }, { m: 11 }, { m: 12.5 }, { m: 9 }];
rankEntries(e, 'm');
assert.deepEqual(e.map((x) => x.rang), ['1er ex', '3e', '1er ex', '4e']);
assert.equal(mentionFor(14), 'Bien');
assert.equal(mentionFor(9.99), 'Insuffisant');

// Garde d'accès : type de compte et droits.
const sign = (p) => ({ headers: { authorization: `Bearer ${jwt.sign(p, process.env.JWT_SECRET)}` } });
assert.equal(guard.identify(sign({ type: 'etablissement', etablissementId: 5 })).kind, 'staff');
assert.equal(guard.identify(sign({ id: 3, etablissement: 5 })).kind, 'enseignant');
assert.equal(guard.identify(sign({ id: 3, etablissementId: 5, role: 'parent' })).kind, 'parent');
assert.equal(guard.identify(sign({ purpose: 'parent-password-reset', parentId: 3 })).kind, 'reset');
assert.equal(guard.allowedFor('parent', 'POST', '/inscription'), false);
assert.equal(guard.allowedFor('parent', 'DELETE', '/Classes/4'), false);
assert.equal(guard.allowedFor('parent', 'GET', '/bulletined/4/8'), true);
assert.equal(guard.allowedFor('enseignant', 'POST', '/notes/saisie'), true);
assert.equal(guard.allowedFor('enseignant', 'POST', '/sauvegarde-bulletin'), false);
assert.equal(guard.allowedFor('enseignant', 'POST', '/cloture-annee-scolaire'), false);
assert.equal(guard.allowedFor('staff', 'POST', '/cloture-annee-scolaire'), true);

// Clôture : toutes les séries reconnues, passage et sorties.
assert.deepEqual(cloture.parseClasseNom('2nd A1 1'), { niveau: '2nd', prefix: 'A1', suffix: 1, raw: '2nd A1 1' });
assert.equal(cloture.parseClasseNom('Tle G2 3').prefix, 'G2');
assert.equal(cloture.parseClasseNom('1ère D 2').niveau, '1ere');
assert.equal(cloture.anneeSuivante('2025-2026'), '2026-2027');
assert.equal(cloture.getNextClassName('5eme', '', [{ nom: '5ème 1' }, { nom: '5ème 2' }]), '5ème 3');
const classes = [{ id: 1, nom: '3ème 1' }, { id: 2, nom: '2nd C 1' }, { id: 3, nom: '2nd A1 1' }, { id: 4, nom: 'Tle D 1' }, { id: 5, nom: '1ere D 1' }];
const plan = cloture.construirePlanPromotion(classes, [
  { eleveId: 10, eleveNom: 'A', elevePrenom: 'a', classeId: 1, classeNom: '3ème 1', decision: 'Admis' },
  { eleveId: 11, eleveNom: 'B', elevePrenom: 'b', classeId: 4, classeNom: 'Tle D 1', decision: 'Admis' },
  { eleveId: 12, eleveNom: 'C', elevePrenom: 'c', classeId: 4, classeNom: 'Tle D 1', decision: 'Redouble' },
  { eleveId: 13, eleveNom: 'D', elevePrenom: 'd', classeId: 3, classeNom: '2nd A1 1', decision: 'Admis' },
], { effectifMaxParClasse: 50, effectifMinNouvelleClasse: 5, activerCreationAutoClasse: true });
assert.equal(plan.anomaliesPromotion.length, 0);
assert.deepEqual(plan.sortants.map((s) => s.eleveId), [11]);
// Admis de 3ème : pas de série devinée, groupe « orientation à faire ».
assert.deepEqual(plan.aOrienter.map((o) => o.eleveId), [10]);
assert.equal(plan.affectationsParClasse[2], undefined);
assert.equal(plan.creationsDeClasses.length, 1); // 1ere A1 n'existe pas : créée
assert.equal(plan.creationsDeClasses[0].nom, '1ere A1 1');
// Noms des classes : seule → « 2nd D », plusieurs → « 2nd D 1 », « 2nd D 2 ».
{
  const N = require('../server-lib/nomsClasses.cjs');
  assert.equal(N.nomDeBase('2nd D 2'), '2nd D');
  assert.equal(N.nomDeBase('2nd A1'), '2nd A1');
  assert.equal(N.numeroDe('2nd A1'), 0);
  assert.equal(N.numeroDe('6ème 10'), 10);
  assert.equal(cloture.parseClasseNom('2nd D').suffix, 0);
  assert.equal(cloture.getNextClassName('2nd', 'D', [{ nom: '2nd D' }]), '2nd D 2');
}
console.log('ecole: notes, bulletins, garde d\'accès et clôture vérifiés');


// Lecture des listes d'élèves (inscription en masse).
{
  const esbuild = require('esbuild');
  const src = require('fs').readFileSync(require('path').join(__dirname, '../composables/useListeEleves.ts'), 'utf8');
  const { code } = esbuild.transformSync(src, { loader: 'ts', format: 'cjs' });
  const m = { exports: {} };
  new Function('module', 'exports', code)(m, m.exports);
  const L = m.exports;
  assert.equal(L.normaliserDate('12/05/2014'), '2014-05-12');
  assert.equal(L.normaliserDate('3-7-13'), '2013-07-03');
  assert.equal(L.normaliserDate(41771), '2014-05-12');
  assert.equal(L.normaliserDate('31/02/2014'), '');
  assert.equal(L.normaliserSexe('Garçon'), 'M');
  assert.equal(L.normaliserSexe('féminin'), 'F');
  // Avec titres, dans le désordre, collé depuis Excel (tabulations).
  let r = L.analyserListe(L.lireTexteColle('Prénom\tNOM\tSexe\tNé le\tTél parent\nLarissa\tDossou\tF\t05/08/2012\t97 00 11 22\nCodjo\tDagba\tgarçon\t7/6/2012\t'));
  assert.deepEqual(r.eleves.map((e) => [e.nom, e.prenom, e.sexe, e.dateNaissance, e.telephone]), [['DOSSOU', 'Larissa', 'F', '2012-08-05', '97 00 11 22'], ['DAGBA', 'Codjo', 'M', '2012-06-07', '']]);
  // Sans titres, nom complet dans une seule colonne.
  r = L.analyserListe(L.lireTexteColle('HOUNGBO Aminatou;12/03/2012;F;0197112233\nZINSOU Koffi Ezéchiel;01/01/2012;M;0196000000'));
  assert.deepEqual(r.eleves.map((e) => [e.nom, e.prenom, e.sexe, e.telephone]), [['HOUNGBO', 'Aminatou', 'F', '0197112233'], ['ZINSOU', 'Koffi Ezéchiel', 'M', '0196000000']]);
  // Ancien canevas : la ligne d'exemple est ignorée, pas le 1er élève.
  r = L.analyserListe([['NOTE:', 'NE PAS SUPPRIMER'], ['Nom Élève', 'Prénom Élève', 'Date de naissance', 'Sexe', 'Nom Parent', 'Prénom Parent', 'Email Parent', 'Téléphone'], ['KOUADIO', 'Jean', '12/05/2011', 'M', 'KOUADIO', 'Claudine', 'c@x.com', '07'], ['TOSSOU', 'Gloria', '02/02/2012', 'F', 'TOSSOU', 'Paul', '', '0197000001']]);
  assert.deepEqual(r.eleves.map((e) => [e.nom, e.prenom, e.parentNom, e.parentPrenom, e.telephone]), [['TOSSOU', 'Gloria', 'TOSSOU', 'Paul', '0197000001']]);
  r = L.analyserListe(L.lireTexteColle('N°\tNom et prénoms\tSexe\n1\tAGBANGLA Prince Junior\tM'));
  assert.deepEqual(r.eleves.map((e) => [e.nom, e.prenom]), [['AGBANGLA', 'Prince Junior']]);
  // Liste simple, sans tableau ni colonnes.
  r = L.analyserListe(L.lireTexteColle('1. DOSSOU Larissa - 05/08/2014 - F\n2. DAGBA Codjo, né le 7/6/2014, garçon, 97 00 11 22\nHOUNGBO Aminatou Grâce F 12/03/2012 parent@mail.com'));
  assert.deepEqual(r.eleves.map((e) => [e.nom, e.prenom, e.dateNaissance, e.sexe, e.telephone, e.email]), [
    ['DOSSOU', 'Larissa', '2014-08-05', 'F', '', ''],
    ['DAGBA', 'Codjo', '2014-06-07', 'M', '97 00 11 22', ''],
    ['HOUNGBO', 'Aminatou Grâce', '2012-03-12', 'F', '', 'parent@mail.com'],
  ]);
  r = L.analyserListe(L.lireTexteColle('Liste de la classe de 5ème 1\nDOSSOU Larissa\nDAGBA Codjo'));
  assert.deepEqual(r.eleves.map((e) => [e.nom, e.prenom]), [['DOSSOU', 'Larissa'], ['DAGBA', 'Codjo']]);
  console.log('ecole: lecture des listes d\'élèves vérifiée');
}

// EducMaster : lecture du modèle, remplissage de la seule colonne Note.
(async () => {
  const fs = require('fs');
  const path = require('path');
  const JSZip = require('jszip');
  const E = require('../server-lib/educmaster.cjs');
  const { associer } = require('../routes/educmaster.routes.cjs').__test;
  const modele = fs.readFileSync(path.join(__dirname, '../EducMaster_Model_Importation_notes_Eleve.xlsx'));
  const info = await E.lireModele(modele);
  assert.equal(info.feuille, '5e M1');
  assert.deepEqual(info.entete, { r: 1, matricule: 'A', nom: 'B', prenom: 'C', note: 'D' });
  assert.equal(info.eleves.length, 7);
  assert.equal(info.eleves[0].matricule, '199020060895');

  // Modèle « vide » : cellules de note absentes ou vides.
  const zip = await JSZip.loadAsync(modele);
  let xml = await zip.file('xl/worksheets/sheet1.xml').async('string');
  xml = xml.replace(/<c r="D2"[^>]*>[\s\S]*?<\/c>/, '').replace(/<c r="D3"([^>]*)t="n"><v>15<\/v><\/c>/, '<c r="D3"$1/>');
  zip.file('xl/worksheets/sheet1.xml', xml);
  const vide = await zip.generateAsync({ type: 'nodebuffer' });
  const rempli = await E.remplirModele(vide, { 2: 12.5, 3: 8, 4: null });
  const XLSX = require('xlsx');
  const rows = XLSX.utils.sheet_to_json(XLSX.read(rempli).Sheets['5e M1'], { header: 1 });
  assert.deepEqual(rows[1], ['199020060895', 'DJOSSOU', 'Albert', 12.5]);
  assert.deepEqual(rows[2], ['297020060896', 'DJOSSOU', 'Ruth', 8]);
  assert.equal(rows[3][3], 17); // null : cellule laissée telle quelle
  const a = await JSZip.loadAsync(vide);
  const b = await JSZip.loadAsync(rempli);
  for (const f of Object.keys(a.files)) {
    if (a.files[f].dir || f === 'xl/worksheets/sheet1.xml') continue;
    assert.equal(await b.file(f).async('string'), await a.file(f).async('string'), `fichier modifié : ${f}`);
  }
  await assert.rejects(E.lireModele(fs.readFileSync(path.join(__dirname, '../package.json'))));

  // Association : matricule, puis nom exact, homonymes, inversion.
  const eleves = [
    { id: 1, nom: 'DOSSOU', prenom: 'Sèna', matricule_national: null, classe_id: 5 },
    { id: 2, nom: 'DOSSOU', prenom: 'Sèna', matricule_national: null, classe_id: 6 },
    { id: 3, nom: 'AGBLA', prenom: 'Mamadou', matricule_national: '170020060898', classe_id: 5 },
    { id: 4, nom: 'NOUDOFININ', prenom: 'Gloria', matricule_national: null, classe_id: 5 },
  ];
  assert.deepEqual([associer({ matricule: '170020060898', nom: 'X', prenom: 'Y' }, eleves).statut, associer({ matricule: '170020060898', nom: 'X', prenom: 'Y' }, eleves).eleveId], ['matricule', 3]);
  assert.equal(associer({ matricule: '1', nom: 'Dossou', prenom: 'Sena' }, eleves).statut, 'ambigu');
  assert.equal(associer({ matricule: '1', nom: 'Gloria', prenom: 'NOUDOFININ' }, eleves).eleveId, 4);
  assert.equal(associer({ matricule: '1', nom: 'INCONNU', prenom: 'Z' }, eleves).statut, 'absent');
  // Un élève qui a déjà un autre matricule n'est pas proposé.
  assert.equal(associer({ matricule: '999', nom: 'AGBLA', prenom: 'Mamadou' }, eleves).statut, 'absent');
  console.log('ecole: EducMaster (modèle, remplissage, association) vérifié');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });

