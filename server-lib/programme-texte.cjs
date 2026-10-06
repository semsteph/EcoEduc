// =====================================================================
//  Lecture d'un programme de matière (texte collé ou fichier Word) et
//  construction de son arbre : SA → séquence → activité... Le nom des
//  niveaux varie selon la matière : on reconnaît les intitulés usuels
//  (SA, séquence, activité, leçon, chapitre, partie...) et la hiérarchie
//  suit l'ordre d'apparition (le premier type rencontré est le niveau le
//  plus haut). Les lignes qui ne sont pas des titres deviennent le détail
//  de l'élément qui les précède.
// =====================================================================
const JSZip = require('jszip');

// Intitulés reconnus → nom affiché.
const FAMILLES = [
  [/^(?:sa|s\.\s?a\.?|situation\s+d['’]\s*apprentissage)/i, 'SA'],
  [/^(?:s[ée]quence|seq\.?)/i, 'Séquence'],
  [/^(?:activit[ée]|act\.)/i, 'Activité'],
  [/^(?:le[çc]on)/i, 'Leçon'],
  [/^(?:chapitre|chap\.)/i, 'Chapitre'],
  [/^(?:partie)/i, 'Partie'],
  [/^(?:th[èe]me)/i, 'Thème'],
  [/^(?:module)/i, 'Module'],
  [/^(?:unit[ée])/i, 'Unité'],
  [/^(?:s[ée]ance)/i, 'Séance'],
];

const NUMERO = String.raw`(?:n[°o]\s*)?((?:\d+(?:[.\-]\d+)*)|(?:[IVXLC]+)\b|(?:[A-Z])\b)?`;

function nettoyer(ligne) {
  return String(ligne || '')
    .replace(/ /g, ' ')
    .replace(/^[\s•●▪◦\-–—*]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// « SA 1 : Géométrie dans l'espace » → { libelle: 'SA', numero: '1', titre: '...' }
function lireTitre(ligne) {
  for (const [re, libelle] of FAMILLES) {
    const m = ligne.match(re);
    if (!m) continue;
    const reste = ligne.slice(m[0].length);
    // L'intitulé doit être un mot entier (« Activités de… » n'en est pas un).
    if (/^[a-zà-ÿ]/i.test(reste)) continue;
    const suite = reste.match(new RegExp(String.raw`^\s*${NUMERO}\s*[:.\-–—)]?\s*(.*)$`));
    if (!suite) continue;
    const numero = suite[1] || null;
    const titre = (suite[2] || '').trim();
    // « Activités de la semaine » n'est pas un titre : il faut un numéro ou un séparateur.
    if (!numero && !/^\s*[:.\-–—]/.test(reste)) continue;
    return { libelle, numero, titre: titre || `${libelle}${numero ? ` ${numero}` : ''}` };
  }
  return null;
}

// Texte → arbre [{ libelle, numero, titre, details, enfants: [...] }]
function analyserTexte(texte) {
  const lignes = String(texte || '').split(/\r?\n/).map(nettoyer).filter(Boolean);
  const rangs = []; // familles dans l'ordre d'apparition = profondeur
  const racine = { enfants: [] };
  const pile = [{ rang: -1, noeud: racine }];
  let dernier = null;
  let titres = 0;

  for (const ligne of lignes) {
    const t = lireTitre(ligne);
    if (!t) {
      if (dernier) dernier.details = dernier.details ? `${dernier.details}\n${ligne}` : ligne;
      continue;
    }
    titres += 1;
    if (!rangs.includes(t.libelle)) rangs.push(t.libelle);
    const rang = rangs.indexOf(t.libelle);
    while (pile.length > 1 && pile[pile.length - 1].rang >= rang) pile.pop();
    const noeud = { libelle: t.libelle, numero: t.numero, titre: t.titre.slice(0, 255), details: null, enfants: [] };
    pile[pile.length - 1].noeud.enfants.push(noeud);
    pile.push({ rang, noeud });
    dernier = noeud;
  }

  // Aucun intitulé reconnu : lignes numérotées « 1. ... » = parties simples.
  if (!titres) {
    const parties = [];
    for (const ligne of lignes) {
      const m = ligne.match(/^(\d+(?:\.\d+)*)\s*[.)\-–:]\s*(.+)$/);
      if (m) parties.push({ libelle: 'Partie', numero: m[1], titre: m[2].slice(0, 255), details: null, enfants: [] });
      else if (parties.length) {
        const p = parties[parties.length - 1];
        p.details = p.details ? `${p.details}\n${ligne}` : ligne;
      }
    }
    return parties;
  }
  return racine.enfants;
}

// Fichier Word (.docx) → texte, un paragraphe par ligne.
async function texteDocx(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const doc = zip.file('word/document.xml');
  if (!doc) throw new Error('Fichier Word illisible.');
  const xml = await doc.async('string');
  return xml
    .split(/<\/w:p>/)
    .map((p) => {
      const morceaux = [...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>/g)].map((m) => (m[1] === undefined ? ' ' : m[1]));
      return morceaux.join('')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    })
    .join('\n');
}

// PDF « texte » → texte, ligne par ligne (les morceaux de texte d'une même
// hauteur sur la page forment une ligne). Un PDF scanné (images) ne contient
// pas de texte : il renvoie une chaîne vide.
async function textePdf(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, useSystemFonts: true, verbosity: 0 }).promise;
  const lignes = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const { items } = await page.getTextContent();
    const parHauteur = new Map();
    items.forEach((it) => {
      if (!it.str) return;
      const y = Math.round(it.transform[5] / 3) * 3;
      if (!parHauteur.has(y)) parHauteur.set(y, []);
      parHauteur.get(y).push({ x: it.transform[4], s: it.str });
    });
    [...parHauteur.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, morceaux]) => lignes.push(morceaux.sort((a, b) => a.x - b.x).map((m) => m.s).join(' ').replace(/\s+/g, ' ').trim()));
  }
  await doc.destroy();
  return lignes.filter(Boolean).join('\n');
}

// Nombre d'éléments d'un arbre (pour les comptes rendus).
function compter(arbre) {
  return (arbre || []).reduce((n, e) => n + 1 + compter(e.enfants), 0);
}

// Chemin lisible d'un élément : « SA 1 : Géométrie… › Activité 2 : Vecteurs… »
function intitule(e) {
  return `${e.libelle}${e.numero ? ` ${e.numero}` : ''} : ${e.titre}`;
}

module.exports = { analyserTexte, texteDocx, textePdf, compter, intitule, lireTitre };
