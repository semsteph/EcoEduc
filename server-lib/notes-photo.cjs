// =====================================================================
//  Notes par photo : rapprochement des lignes lues sur les fiches
//  (nom écrit, numéro éventuel, note) avec les élèves de la classe.
//
//  Sécurités :
//  - on ne cherche que parmi les élèves de la classe ;
//  - une ligne n'est acceptée d'office (« sur ») que si le nom ressemble
//    nettement à un seul élève ; sinon elle est « à confirmer », avec les
//    élèves possibles ;
//  - un élève ne reçoit jamais deux notes : deux lignes pour le même élève
//    passent toutes les deux « à confirmer » (sauf si la note est la même) ;
//  - le numéro d'ordre écrit, s'il concorde avec le nom, renforce le choix ;
//  - les élèves sans ligne sont signalés « non trouvés ».
//  La lecture des photos elle-même est faite par l'IA (lireFiches).
// =====================================================================

const sansAccents = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const normaliser = (t) => sansAccents(t).toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prec = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    const cour = [i];
    for (let j = 1; j <= n; j += 1) {
      cour[j] = Math.min(prec[j] + 1, cour[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prec = cour;
  }
  return prec[n];
}

const ressemblance = (a, b) => {
  if (!a || !b) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
};

// Ressemblance entre un nom écrit et un élève (nom + prénoms), qui tolère
// l'ordre inversé, un prénom abrégé (« Sylv. », « S. ») ou oublié.
function score(ecrit, eleve) {
  const lu = normaliser(ecrit);
  if (!lu) return 0;
  const nom = normaliser(eleve.nom);
  const prenoms = normaliser(eleve.prenom);
  const complet = `${nom} ${prenoms}`.trim();
  const inverse = `${prenoms} ${nom}`.trim();
  let s = Math.max(ressemblance(lu, complet), ressemblance(lu, inverse));

  // Mot à mot : chaque mot écrit cherche le meilleur mot de l'élève ; un
  // mot court (initiale, abréviation) compte s'il commence pareil.
  const motsLus = lu.split(' ');
  const motsEleve = complet.split(' ');
  const parMot = motsLus.map((w) => Math.max(...motsEleve.map((e) => {
    if (w.length <= 4 && e.startsWith(w)) return 0.9;
    return ressemblance(w, e);
  })));
  const moyenne = parMot.reduce((a, b) => a + b, 0) / parMot.length;
  // Le nom de famille doit être présent pour un score élevé.
  const nomPresent = Math.max(...motsLus.map((w) => ressemblance(w, nom.split(' ')[0] || nom)));
  s = Math.max(s, moyenne * (0.6 + 0.4 * nomPresent));
  return Math.round(s * 1000) / 1000;
}

function lireNote(brut) {
  const t = String(brut ?? '').trim().toLowerCase().replace(',', '.');
  if (!t) return { type: 'vide' };
  if (/^(abs|absent|absente|a)$/.test(t)) return { type: 'absent' };
  const n = Number(t.replace(/\s*\/\s*20$/, ''));
  if (Number.isFinite(n) && n >= 0 && n <= 20) return { type: 'note', valeur: Math.round(n * 100) / 100 };
  return { type: 'illisible' };
}

const SEUIL_SUR = 0.82;
const ECART_SUR = 0.12;
const SEUIL_POSSIBLE = 0.5;

// lignes : [{ photo, nom, numero, note, confiance, y }] lues sur les photos
// eleves : élèves de la classe dans l'ordre de la liste [{ id, nom, prenom }]
function rapprocher(lignes, eleves) {
  const resultats = lignes.map((l, i) => {
    const note = lireNote(l.note);
    const classement = eleves
      .map((e, rang) => {
        let s = score(l.nom, e);
        // Numéro d'ordre écrit et concordant avec le nom : renfort.
        const num = Number(l.numero);
        if (Number.isInteger(num) && num === rang + 1 && s >= 0.4) s = Math.min(1, s + 0.15);
        return { eleveId: e.id, score: s };
      })
      .sort((a, b) => b.score - a.score);
    const [premier, second] = classement;
    const sur = premier && premier.score >= SEUIL_SUR && (!second || premier.score - second.score >= ECART_SUR);
    // Ligne qui peut désigner deux élèves (« Mensah », « Agossou E. ») :
    // rattachée à personne, l'enseignant choisit parmi les élèves possibles.
    const ambigu = !!(premier && second && second.score >= SEUIL_POSSIBLE && premier.score - second.score < ECART_SUR);
    return {
      ligne: i,
      photo: l.photo,
      y: typeof l.y === 'number' ? l.y : null,
      ecrit: l.nom,
      noteLue: l.note,
      note,
      confianceLecture: l.confiance || 'bonne',
      eleveId: premier && premier.score >= SEUIL_POSSIBLE && !ambigu ? premier.eleveId : null,
      ambigu,
      sur: !!sur,
      candidats: classement.filter((c) => c.score >= SEUIL_POSSIBLE).slice(0, 3),
    };
  });

  // Un élève, une seule note : lignes en double pour le même élève.
  const parEleve = new Map();
  resultats.forEach((r) => {
    if (!r.eleveId) return;
    if (!parEleve.has(r.eleveId)) parEleve.set(r.eleveId, []);
    parEleve.get(r.eleveId).push(r);
  });
  parEleve.forEach((liste) => {
    if (liste.length < 2) return;
    const memesNotes = liste.every((r) => JSON.stringify(r.note) === JSON.stringify(liste[0].note));
    if (memesNotes) {
      // Même élève photographié deux fois (bas d'une page, haut de la suivante).
      liste.slice(1).forEach((r) => { r.doublon = true; });
    } else {
      liste.forEach((r) => { r.sur = false; r.conflit = true; });
    }
  });

  // État par élève de la classe, dans l'ordre de la liste.
  const parEleveFinal = eleves.map((e) => {
    const lignesEleve = resultats.filter((r) => r.eleveId === e.id && !r.doublon);
    if (!lignesEleve.length) return { eleveId: e.id, statut: 'non_trouve' };
    if (lignesEleve.length > 1) return { eleveId: e.id, statut: 'a_confirmer', raison: 'plusieurs lignes avec des notes différentes', lignes: lignesEleve.map((r) => r.ligne) };
    const r = lignesEleve[0];
    const noteDouteuse = r.note.type === 'illisible' || r.confianceLecture === 'faible';
    const statut = r.sur && !noteDouteuse ? 'sur' : 'a_confirmer';
    let raison = null;
    if (!r.sur) raison = 'nom à confirmer';
    else if (noteDouteuse) raison = 'chiffre douteux';
    return { eleveId: e.id, statut, raison, lignes: [r.ligne] };
  });

  // Lignes à attribuer par l'enseignant : ambiguës (plusieurs élèves
  // possibles) ou non reconnues (aucun élève ne ressemble).
  const aAttribuer = resultats.filter((r) => !r.eleveId).map((r) => r.ligne);
  // Élèves non trouvés qui figurent parmi les possibles d'une ligne ambiguë.
  parEleveFinal.forEach((e) => {
    if (e.statut !== 'non_trouve') return;
    const possibles = resultats.filter((r) => r.ambigu && r.candidats.some((c) => c.eleveId === e.eleveId));
    if (possibles.length) Object.assign(e, { statut: 'a_confirmer', raison: 'une ligne ambiguë peut être cet élève', lignes: possibles.map((r) => r.ligne) });
  });
  return { lignes: resultats, eleves: parEleveFinal, aAttribuer };
}

// ---------------------------------------------------------------------
// Lecture des photos de fiches par l'IA : pour chaque photo, les lignes
// « numéro, nom tel qu'écrit, note telle qu'écrite », sans rien corriger.
// images : [{ buffer, type }] ; colonne : n° de la colonne de notes sur la
// fiche (1 si une seule). Renvoie [{ photo, numero, nom, note, confiance, y }].
// ---------------------------------------------------------------------
async function lireFiches(images, { colonne = 1 } = {}) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new (Anthropic.default || Anthropic)();
  const contenu = [];
  images.forEach((im, i) => {
    contenu.push({ type: 'text', text: `Photo ${i + 1} :` });
    contenu.push({ type: 'image', source: { type: 'base64', media_type: im.type, data: im.buffer.toString('base64') } });
  });
  contenu.push({
    type: 'text',
    text: `Ces photos sont les pages d'une fiche de notes d'une classe (une ligne par élève : numéro éventuel, nom, prénom(s), puis une ou plusieurs colonnes de notes sur 20, écrites à la main).
Lis TOUTES les lignes d'élèves de TOUTES les photos.
Pour chaque ligne, recopie EXACTEMENT ce qui est écrit, sans corriger l'orthographe :
- "numero" : le numéro d'ordre s'il est écrit, sinon null ;
- "nom" : le nom et le(s) prénom(s) tels qu'ils sont écrits ;
- "note" : ce qui est écrit dans la colonne de notes n° ${colonne} (en partant de la gauche) : "14", "12,5", "Abs", ou "" si la case est vide ;
- "confiance" : "faible" si un chiffre de la note est difficile à lire, sinon "bonne" ;
- "y" : la position verticale approximative de la ligne sur la photo, de 0 (haut) à 1 (bas).
Ignore les lignes d'en-tête et de titre. Si une ligne apparaît sur deux photos, recopie-la deux fois.
Réponds UNIQUEMENT avec ce JSON : {"photos":[{"photo":1,"code":"code imprimé en bas de page ou null","lignes":[{"numero":1,"nom":"...","note":"...","confiance":"bonne","y":0.12}]}]}`,
  });
  const reponse = await client.messages.create({
    model: process.env.NOTES_PHOTO_MODEL || 'claude-sonnet-5-5',
    max_tokens: 8000,
    messages: [{ role: 'user', content: contenu }],
  });
  const texte = (reponse.content || []).map((c) => c.text || '').join('');
  const json = JSON.parse(texte.slice(texte.indexOf('{'), texte.lastIndexOf('}') + 1));
  const lignes = [];
  (json.photos || []).forEach((p) => {
    (p.lignes || []).forEach((l) => lignes.push({
      photo: Number(p.photo) - 1,
      code: p.code || null,
      numero: l.numero ?? null,
      nom: String(l.nom || '').slice(0, 120),
      note: String(l.note ?? '').slice(0, 10),
      confiance: l.confiance === 'faible' ? 'faible' : 'bonne',
      y: typeof l.y === 'number' ? Math.max(0, Math.min(1, l.y)) : null,
    }));
  });
  return lignes;
}

module.exports = { rapprocher, score, lireNote, normaliser, lireFiches };
