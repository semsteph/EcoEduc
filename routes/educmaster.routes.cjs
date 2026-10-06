// =====================================================================
//  Transfert des notes vers EducMaster (plateforme nationale).
//  1. POST /educmaster/analyser : le modèle téléchargé sur EducMaster est
//     lu, chaque ligne est associée à un de nos élèves (matricule national
//     déjà connu, sinon nom et prénom) ;
//  2. POST /educmaster/remplir : avec la classe, la matière, la période et
//     la note choisies, renvoie un aperçu (apercu=true) ou le fichier
//     rempli, identique au modèle sauf la colonne Note. Les matricules
//     nationaux confirmés sont enregistrés dans la fiche des élèves.
//  Corps multipart : le garde central ne le lit pas, tout est vérifié ici.
// =====================================================================
const express = require('express');
const multer = require('multer');
const router = express.Router();

const { authenticateJWT, requireAdminStaff } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const JSZip = require('jszip');
const { lireModele, remplirModele, nomComparable } = require('../server-lib/educmaster.cjs');
const notesService = require('../server-lib/notes-service.cjs');

const fichierExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, /\.xlsx$/i.test(file.originalname || '')),
});

const recevoir = (req, res, next) => fichierExcel.single('fichier')(req, res, (err) => {
  if (err) return res.status(400).json({ message: 'Fichier trop lourd ou illisible.' });
  if (!req.file) return res.status(400).json({ message: "Choisissez le fichier .xlsx téléchargé sur EducMaster." });
  next();
});

// Seules les notes d'évaluation partent : EducMaster calcule lui-même
// les moyennes.
const CHAMPS = {
  inter1: 'Interrogation 1', inter2: 'Interrogation 2', inter3: 'Interrogation 3', inter4: 'Interrogation 4',
  Dev1: 'Devoir 1', Dev2: 'Devoir 2',
};

// Association d'une ligne EducMaster à un élève de l'établissement.
function associer(ligne, eleves) {
  if (ligne.matricule) {
    const parMatricule = eleves.filter((e) => e.matricule_national && e.matricule_national === ligne.matricule);
    if (parMatricule.length === 1) return { statut: 'matricule', eleveId: parMatricule[0].id, candidats: parMatricule };
  }
  const nom = nomComparable(ligne.nom);
  const prenom = nomComparable(ligne.prenom);
  const exacts = eleves.filter((e) => nomComparable(e.nom) === nom && nomComparable(e.prenom) === prenom);
  // Un élève qui a déjà un AUTRE matricule national n'est pas proposé.
  const libres = exacts.filter((e) => !e.matricule_national || e.matricule_national === ligne.matricule);
  if (libres.length === 1) return { statut: 'nom', eleveId: libres[0].id, candidats: libres };
  if (libres.length > 1) return { statut: 'ambigu', eleveId: null, candidats: libres };
  // Approchant : nom identique et premier prénom identique, ou nom/prénom inversés.
  const premier = prenom.split(' ')[0];
  const proches = eleves.filter((e) => (!e.matricule_national || e.matricule_national === ligne.matricule) && (
    (nomComparable(e.nom) === nom && nomComparable(e.prenom).split(' ')[0] === premier)
    || (nomComparable(e.nom) === prenom && nomComparable(e.prenom) === nom)
  ));
  if (proches.length) return { statut: 'approchant', eleveId: proches.length === 1 ? proches[0].id : null, candidats: proches };
  return { statut: 'absent', eleveId: null, candidats: [] };
}

async function elevesDeLEcole(etablissementId) {
  const [rows] = await db.query(
    `SELECT e.id, e.nom, e.prenom, e.matricule, e.matricule_national, e.classe_id, c.nom AS classe
     FROM eleve e JOIN classes c ON c.id = e.classe_id
     WHERE e.etablissement_id = ? AND e.statut = 'actif'`,
    [etablissementId]
  );
  return rows;
}

router.post('/educmaster/analyser', authenticateJWT, requireAdminStaff, recevoir, async (req, res) => {
  const etablissementId = Number(req.user.etablissementId);
  try {
    const modele = await lireModele(req.file.buffer);
    const eleves = await elevesDeLEcole(etablissementId);
    const lignes = modele.eleves.map((l) => {
      const a = associer(l, eleves);
      return {
        r: l.r, matricule: l.matricule, nom: l.nom, prenom: l.prenom,
        statut: a.statut, eleveId: a.eleveId,
        candidats: a.candidats.map((e) => ({ id: e.id, nom: e.nom, prenom: e.prenom, classe: e.classe, classeId: e.classe_id })),
      };
    });
    // Classe la plus représentée parmi les élèves reconnus.
    const compte = {};
    lignes.forEach((l) => {
      const e = eleves.find((x) => x.id === l.eleveId);
      if (e) compte[e.classe_id] = (compte[e.classe_id] || 0) + 1;
    });
    const classeId = Number(Object.entries(compte).sort((a, b) => b[1] - a[1])[0]?.[0]) || null;
    // Homonymes dans d'autres classes : on garde celui de la classe du fichier.
    lignes.forEach((l) => {
      if (!classeId || l.eleveId || !['ambigu', 'approchant'].includes(l.statut)) return;
      const dansLaClasse = l.candidats.filter((c) => c.classeId === classeId);
      if (dansLaClasse.length === 1) {
        l.eleveId = dansLaClasse[0].id;
        if (l.statut === 'ambigu') l.statut = 'nom'; // même nom exact : sûr
      }
    });
    res.json({ feuille: modele.feuille, lignes, classeId, champs: CHAMPS });
  } catch (error) {
    if (error.code === 'MODELE') return res.status(400).json({ message: error.message });
    console.error('Erreur analyse EducMaster :', error);
    res.status(400).json({ message: "Ce fichier n'a pas pu être lu. Utilisez le fichier .xlsx téléchargé sur EducMaster, sans le modifier." });
  }
});

// ---------------------------------------------------------------------
// Briques communes au fichier unique et au lot.
// ---------------------------------------------------------------------
async function contexteValide(etablissementId, { classeId, semestreId, anneeScolaireId, matiereIds }) {
  const ids = [...new Set(matiereIds.map(Number))];
  const [[ok]] = await db.query(
    `SELECT (SELECT COUNT(*) FROM classes WHERE id = ? AND etablissement_id = ?)
          + (SELECT COUNT(*) FROM semestre WHERE id = ? AND etablissement_id = ?)
          + (SELECT COUNT(*) FROM annee_scolaire WHERE id = ? AND etablissement_id = ?) AS n`,
    [classeId, etablissementId, semestreId, etablissementId, anneeScolaireId, etablissementId]
  );
  if (Number(ok.n) !== 3 || !ids.length) return null;
  const [matieres] = await db.query('SELECT id, nom FROM matieres WHERE id IN (?) AND etablissement_id = ? ORDER BY nom', [ids, etablissementId]);
  if (matieres.length !== ids.length) return null;
  const [[classe]] = await db.query('SELECT nom FROM classes WHERE id = ?', [classeId]);
  const [[semestre]] = await db.query('SELECT nom FROM semestre WHERE id = ?', [semestreId]);
  return { matieres, classeNom: classe.nom, semestreNom: semestre.nom };
}

async function elevesAssocies(etablissementId, associations) {
  const ids = [...new Set(Object.values(associations).map(Number).filter(Boolean))];
  const eleves = ids.length
    ? (await db.query('SELECT id, nom, prenom, matricule_national FROM eleve WHERE id IN (?) AND etablissement_id = ?', [ids, etablissementId]))[0]
    : [];
  if (eleves.length !== ids.length) return null;
  return { ids, parId: Object.fromEntries(eleves.map((e) => [e.id, e])) };
}

async function notesDe(ids, { matiereId, semestreId, classeId, anneeScolaireId }) {
  if (!ids.length) return {};
  const [notes] = await db.query(
    `SELECT Eleves_id, inter1, inter2, inter3, inter4, moyInter, Dev1, Dev2, moy, notes_validees
     FROM note WHERE Eleves_id IN (?) AND matieres_id = ? AND Semestre_id = ? AND classe_id = ? AND Annee_scolaire_id = ?`,
    [ids, matiereId, semestreId, classeId, anneeScolaireId]
  );
  return Object.fromEntries(notes.map((n) => [n.Eleves_id, n]));
}

// Notes d'un champ pour chaque ligne du modèle.
function calculer(modele, associations, noteDe, champ) {
  const lignes = [];
  const valeurs = {};
  for (const l of modele.eleves) {
    const eleveId = Number(associations[l.r]) || null;
    const ligne = { r: l.r, matricule: l.matricule, nom: l.nom, prenom: l.prenom, eleveId, note: null, statut: '' };
    if (!eleveId) { ligne.statut = 'sans élève'; lignes.push(ligne); continue; }
    const n = noteDe[eleveId];
    const valeur = n ? n[champ] : null;
    if ((valeur === null || valeur === undefined) && n && n.moy === null && (champ === 'moy' || champ === 'moyInter')) ligne.statut = 'non validée';
    else if (valeur === null || valeur === undefined) ligne.statut = 'pas de note';
    // Note ajoutée après la dernière validation : pas encore validée.
    else if (n.moy === null || (notesService.NOTE_FIELDS.includes(champ) && !notesService.estVerrouillee(n, champ))) { ligne.statut = 'non validée'; ligne.note = Number(valeur); }
    else { ligne.statut = 'ok'; ligne.note = Number(valeur); valeurs[l.r] = Number(valeur); }
    lignes.push(ligne);
  }
  return {
    lignes,
    valeurs,
    remplies: Object.keys(valeurs).length,
    sansEleve: lignes.filter((l) => l.statut === 'sans élève').length,
    pasDeNote: lignes.filter((l) => l.statut === 'pas de note').length,
    nonValidees: lignes.filter((l) => l.statut === 'non validée').length,
  };
}

async function absentsDuFichier(etablissementId, classeId, ids) {
  const [classe] = await db.query("SELECT id, nom, prenom FROM eleve WHERE classe_id = ? AND etablissement_id = ? AND statut = 'actif'", [classeId, etablissementId]);
  const associes = new Set(ids);
  return classe.filter((e) => !associes.has(e.id)).map((e) => `${e.nom} ${e.prenom}`);
}

// Matricules nationaux confirmés : enregistrés (sans écraser un autre).
async function enregistrerMatricules(modele, associations, parId) {
  for (const l of modele.eleves) {
    const e = parId[Number(associations[l.r])];
    if (e && l.matricule && /^\d{6,20}$/.test(l.matricule) && !e.matricule_national) {
      await db.query('UPDATE eleve SET matricule_national = ? WHERE id = ? AND matricule_national IS NULL', [l.matricule, e.id]);
      e.matricule_national = l.matricule;
    }
  }
}

function lireOptions(req, res) {
  try { return JSON.parse(req.body.options || '{}'); } catch { res.status(400).json({ message: 'Options invalides.' }); return null; }
}

// Nom exact du modèle EducMaster (sans chemin éventuel).
const nomModele = (s) => String(s || 'EducMaster.xlsx').split(/[\\/]/).pop();

const nomDeFichier = (s) => String(s).normalize('NFC').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------
// Un fichier : une matière, une note.
// ---------------------------------------------------------------------
router.post('/educmaster/remplir', authenticateJWT, requireAdminStaff, recevoir, async (req, res) => {
  const etablissementId = Number(req.user.etablissementId);
  const options = lireOptions(req, res);
  if (!options) return;
  const { classeId, matiereId, semestreId, anneeScolaireId, champ, associations = {}, enregistrer = true, apercu = false } = options;
  if (!classeId || !matiereId || !semestreId || !anneeScolaireId || !CHAMPS[champ]) {
    return res.status(400).json({ message: 'Choisissez la classe, la matière, la période et la note à transférer.' });
  }
  try {
    const ctx = await contexteValide(etablissementId, { classeId, semestreId, anneeScolaireId, matiereIds: [matiereId] });
    if (!ctx) return res.status(403).json({ message: 'Classe, matière, période ou année invalide.' });
    const assoc = await elevesAssocies(etablissementId, associations);
    if (!assoc) return res.status(403).json({ message: "Certains élèves n'appartiennent pas à votre établissement." });

    const modele = await lireModele(req.file.buffer);
    const calcul = calculer(modele, associations, await notesDe(assoc.ids, { matiereId, semestreId, classeId, anneeScolaireId }), champ);
    const resume = {
      total: calcul.lignes.length, remplies: calcul.remplies, sansEleve: calcul.sansEleve,
      pasDeNote: calcul.pasDeNote, nonValidees: calcul.nonValidees,
      absentsDuFichier: await absentsDuFichier(etablissementId, classeId, assoc.ids),
    };
    if (apercu) return res.json({ lignes: calcul.lignes, resume, champ: CHAMPS[champ] });

    if (enregistrer) await enregistrerMatricules(modele, associations, assoc.parId);
    const fichier = await remplirModele(req.file.buffer, calcul.valeurs);
    // Même nom, exactement, que le modèle téléchargé sur EducMaster.
    const nom = nomModele(req.file.originalname);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(nom)}`);
    res.send(fichier);
  } catch (error) {
    if (error.code === 'MODELE') return res.status(400).json({ message: error.message });
    console.error('Erreur remplissage EducMaster :', error);
    res.status(500).json({ message: 'Le fichier n\'a pas pu être rempli.' });
  }
});

// ---------------------------------------------------------------------
// Lot : plusieurs matières × plusieurs notes, un fichier par combinaison,
// le tout dans un ZIP (avec un récapitulatif). apercu=true : tableau
// matière × note du nombre de notes prêtes.
// ---------------------------------------------------------------------
router.post('/educmaster/lot', authenticateJWT, requireAdminStaff, recevoir, async (req, res) => {
  const etablissementId = Number(req.user.etablissementId);
  const options = lireOptions(req, res);
  if (!options) return;
  // selection : couples précis { matiereId, champ } (chaque matière ses
  // propres notes) ; sinon toutes les combinaisons matiereIds × champs.
  const { classeId, semestreId, anneeScolaireId, associations = {}, enregistrer = true, apercu = false } = options;
  let selection = Array.isArray(options.selection) ? options.selection : null;
  if (!selection) {
    const champs = (options.champs || []).filter((c) => CHAMPS[c]);
    selection = (options.matiereIds || []).flatMap((m) => champs.map((champ) => ({ matiereId: m, champ })));
  }
  selection = selection.filter((x) => x && Number(x.matiereId) && CHAMPS[x.champ]).map((x) => ({ matiereId: Number(x.matiereId), champ: x.champ }));
  const matiereIds = [...new Set(selection.map((x) => x.matiereId))];
  if (!classeId || !semestreId || !anneeScolaireId || !selection.length) {
    return res.status(400).json({ message: 'Choisissez la classe, la période et au moins une note à transférer.' });
  }
  if (selection.length > 200) return res.status(400).json({ message: 'Trop de fichiers demandés en une fois.' });
  try {
    const ctx = await contexteValide(etablissementId, { classeId, semestreId, anneeScolaireId, matiereIds });
    if (!ctx) return res.status(403).json({ message: 'Classe, matière, période ou année invalide.' });
    const assoc = await elevesAssocies(etablissementId, associations);
    if (!assoc) return res.status(403).json({ message: "Certains élèves n'appartiennent pas à votre établissement." });
    const modele = await lireModele(req.file.buffer);

    const combinaisons = [];
    for (const m of ctx.matieres) {
      const noteDe = await notesDe(assoc.ids, { matiereId: m.id, semestreId, classeId, anneeScolaireId });
      for (const champ of Object.keys(CHAMPS)) {
        if (!selection.some((x) => x.matiereId === m.id && x.champ === champ)) continue;
        const calcul = calculer(modele, associations, noteDe, champ);
        combinaisons.push({ matiereId: m.id, matiere: m.nom, champ, note: CHAMPS[champ], calcul });
      }
    }
    const tableau = combinaisons.map(({ matiereId: id, matiere, champ, note, calcul }) => ({
      matiereId: id, matiere, champ, note, remplies: calcul.remplies, nonValidees: calcul.nonValidees,
    }));
    if (apercu) return res.json({ tableau, total: modele.eleves.length, absentsDuFichier: await absentsDuFichier(etablissementId, classeId, assoc.ids) });

    if (enregistrer) await enregistrerMatricules(modele, associations, assoc.parId);
    const zip = new JSZip();
    const modeleNom = nomModele(req.file.originalname);
    const recap = [
      `Notes pour EducMaster — ${ctx.classeNom} — ${ctx.semestreNom}`,
      `Fichier modèle : ${modeleNom}`,
      '',
      'Rangement : un dossier par matière, puis un dossier par note.',
      `Chaque dossier de note contient UN SEUL fichier, qui porte exactement le nom du modèle (${modeleNom}).`,
      'Sur EducMaster, choisissez la matière, la période et la note indiquées par les dossiers, puis importez ce fichier.',
      'Cochez chaque ligne ci-dessous une fois le fichier importé :',
      '',
    ];
    const vides = [];
    let n = 0;
    for (const c of combinaisons) {
      if (!c.calcul.remplies) { vides.push(`${c.matiere} — ${c.note}`); continue; }
      const contenu = await remplirModele(req.file.buffer, c.calcul.valeurs);
      // Rangement : Matière / N - Note / <nom exact du modèle>. Les notes
      // sont numérotées dans l'ordre habituel (interrogations puis devoirs).
      const rang = Object.keys(CHAMPS).indexOf(c.champ) + 1;
      const dossier = `${nomDeFichier(c.matiere)}/${rang} - ${nomDeFichier(c.note)}`;
      zip.file(`${dossier}/${modeleNom}`, contenu);
      n += 1;
      recap.push(`[ ] ${c.matiere} — ${c.note} (${ctx.semestreNom}) : dossier « ${dossier} » — ${c.calcul.remplies} note(s)${c.calcul.nonValidees ? `, ${c.calcul.nonValidees} non validée(s) laissée(s) vide(s)` : ''}`);
    }
    if (!n) return res.status(400).json({ message: 'Aucune note validée pour ces choix : rien à transférer.' });
    if (vides.length) recap.push('', 'Sans aucune note (pas de fichier) :', ...vides.map((v) => `- ${v}`));
    recap.push('', `Si un fichier a été renommé (par exemple « ${modeleNom.replace(/\.xlsx$/i, '')} (1).xlsx »), redonnez-lui exactement le nom « ${modeleNom} » avant de l'importer.`);
    zip.file('LISEZ-MOI.txt', recap.join('\r\n'));
    const contenu = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(nomDeFichier(`EducMaster - ${ctx.classeNom} - ${ctx.semestreNom}.zip`))}`);
    res.setHeader('X-Fichiers', String(n));
    res.send(contenu);
  } catch (error) {
    if (error.code === 'MODELE') return res.status(400).json({ message: error.message });
    console.error('Erreur lot EducMaster :', error);
    res.status(500).json({ message: 'Les fichiers n\'ont pas pu être préparés.' });
  }
});

module.exports = router;
module.exports.__test = { associer };
