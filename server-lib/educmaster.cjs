// =====================================================================
//  Fichier d'importation des notes d'EducMaster (plateforme nationale).
//
//  Le directeur télécharge sur EducMaster le modèle d'une classe
//  (colonnes matricule, Nom, Prenom, Note), l'envoie ici, et récupère le
//  MÊME fichier avec la colonne Note remplie par nos notes : il n'a plus
//  qu'à le renvoyer sur EducMaster.
//
//  Le fichier est modifié directement (XML de la feuille) : seules les
//  cellules de note changent, tout le reste (nom de feuille, mise en forme,
//  autres colonnes, propriétés) est conservé tel quel — EducMaster refuse
//  un fichier qui s'écarte de son modèle.
// =====================================================================
const JSZip = require('jszip');

const sansAccents = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const decodeXml = (s) => String(s)
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

function colIndex(lettres) {
  return String(lettres).toUpperCase().split('').reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0);
}

// Chemin de la première feuille (via workbook.xml et ses relations).
async function premiereFeuille(zip) {
  const workbook = await zip.file('xl/workbook.xml').async('string');
  const sheet = workbook.match(/<sheet\b[^>]*>/);
  if (!sheet) throw new Error('Aucune feuille dans le fichier.');
  const nom = decodeXml((sheet[0].match(/\bname="([^"]*)"/) || [])[1] || '');
  const rid = (sheet[0].match(/\br:id="([^"]*)"/) || [])[1];
  const rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const rel = rels.match(new RegExp(`<Relationship\\b[^>]*\\bId="${rid}"[^>]*>`));
  let cible = rel ? (rel[0].match(/\bTarget="([^"]*)"/) || [])[1] : 'worksheets/sheet1.xml';
  cible = cible.replace(/^\//, '');
  const chemin = cible.startsWith('xl/') ? cible : `xl/${cible}`;
  return { nom, chemin };
}

async function chainesPartagees(zip) {
  const f = zip.file('xl/sharedStrings.xml');
  if (!f) return [];
  const xml = await f.async('string');
  return (xml.match(/<si>[\s\S]*?<\/si>/g) || []).map((si) => decodeXml((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [])
    .map((t) => t.replace(/<t[^>]*>|<\/t>/g, '')).join('')));
}

// Valeur affichée d'une cellule.
function valeurCellule(c, partagees) {
  const type = (c.match(/\bt="([^"]*)"/) || [])[1];
  if (type === 'inlineStr') return decodeXml(((c.match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1]) || '');
  const v = (c.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
  if (v === undefined) return '';
  if (type === 's') return partagees[Number(v)] ?? '';
  return decodeXml(v);
}

function lignesDe(sheetXml, partagees) {
  const lignes = [];
  const reRow = /<row\b[^>]*\br="(\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g;
  let m;
  while ((m = reRow.exec(sheetXml))) {
    const cellules = {};
    const reCell = /<c\b[^>]*\br="([A-Z]+)\d+"[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g;
    let c;
    while ((c = reCell.exec(m[2] || ''))) cellules[c[1]] = valeurCellule(c[0], partagees).trim();
    lignes.push({ r: Number(m[1]), cellules });
  }
  return lignes;
}

// Lecture du modèle : titres (matricule, nom, prénom, note) et élèves.
async function lireModele(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const feuille = await premiereFeuille(zip);
  const sheetXml = await zip.file(feuille.chemin).async('string');
  const partagees = await chainesPartagees(zip);
  const lignes = lignesDe(sheetXml, partagees);

  let entete = null;
  for (const l of lignes.slice(0, 15)) {
    const cols = {};
    for (const [col, val] of Object.entries(l.cellules)) {
      const t = sansAccents(val);
      if (/matricule/.test(t)) cols.matricule = col;
      else if (/^prenoms?$|^prenom/.test(t)) cols.prenom = col;
      else if (/^noms?$|^nom\b/.test(t) && !cols.nom) cols.nom = col;
      else if (/^note|^moyenne|^moy\b/.test(t)) cols.note = col;
    }
    if (cols.matricule && cols.note && (cols.nom || cols.prenom)) { entete = { r: l.r, ...cols }; break; }
  }
  if (!entete) {
    throw Object.assign(new Error("Ce fichier ne ressemble pas au modèle d'importation de notes d'EducMaster (colonnes matricule, Nom, Prenom, Note introuvables)."), { code: 'MODELE' });
  }

  const eleves = lignes
    .filter((l) => l.r > entete.r)
    .map((l) => ({
      r: l.r,
      matricule: (l.cellules[entete.matricule] || '').replace(/\s+/g, ''),
      nom: l.cellules[entete.nom] || '',
      prenom: l.cellules[entete.prenom] || '',
      noteActuelle: l.cellules[entete.note] || '',
    }))
    .filter((e) => e.matricule || e.nom || e.prenom);

  return { feuille: feuille.nom, chemin: feuille.chemin, entete, eleves };
}

// Écrit les notes dans la colonne Note ; { [ligne]: nombre | null } —
// null laisse la cellule telle quelle.
async function remplirModele(buffer, notes) {
  const zip = await JSZip.loadAsync(buffer);
  const info = await lireModele(buffer);
  const col = info.entete.note;
  let xml = await zip.file(info.chemin).async('string');

  for (const [ligne, valeur] of Object.entries(notes)) {
    if (valeur === null || valeur === undefined || Number.isNaN(Number(valeur))) continue;
    const r = Number(ligne);
    const ref = `${col}${r}`;
    const v = String(Math.round(Number(valeur) * 100) / 100);
    const reRow = new RegExp(`<row\\b[^>]*\\br="${r}"[^>]*?(?:/>|>[\\s\\S]*?</row>)`);
    const row = xml.match(reRow);
    if (!row) continue;
    let rowXml = row[0];
    if (rowXml.endsWith('/>')) rowXml = `${rowXml.slice(0, -2)}></row>`;
    const reCell = new RegExp(`<c\\b[^>]*\\br="${ref}"[^>]*?(?:/>|>[\\s\\S]*?</c>)`);
    const ancienne = rowXml.match(reCell);
    const style = ancienne ? (ancienne[0].match(/\bs="(\d+)"/) || [])[1] : null;
    const nouvelle = `<c r="${ref}"${style ? ` s="${style}"` : ''} t="n"><v>${v}</v></c>`;
    if (ancienne) {
      rowXml = rowXml.replace(reCell, nouvelle);
    } else {
      // Insertion à sa place (cellules rangées par colonne).
      const cible = colIndex(col);
      const cellules = [...rowXml.matchAll(/<c\b[^>]*\br="([A-Z]+)\d+"[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)];
      const apres = cellules.filter((c) => colIndex(c[1]) < cible).pop();
      if (apres) {
        const fin = apres.index + apres[0].length;
        rowXml = rowXml.slice(0, fin) + nouvelle + rowXml.slice(fin);
      } else {
        rowXml = rowXml.replace(/^(<row\b[^>]*>)/, `$1${nouvelle}`);
      }
    }
    xml = xml.replace(reRow, rowXml);
  }

  zip.file(info.chemin, xml);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// Nom comparable : sans accents, minuscules, tirets et espaces unifiés.
function nomComparable(s) {
  return sansAccents(s).replace(/[-'’.]/g, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = { lireModele, remplirModele, nomComparable, colIndex };
