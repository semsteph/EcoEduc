// Lecture d'une liste d'élèves dans un fichier Word (.docx), dans le
// navigateur : on prend le plus grand tableau du document ; sans tableau,
// chaque paragraphe devient une ligne (cellules séparées par des tabulations).
import JSZip from 'jszip'

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

function texteDe(noeud: Element): string {
  // Plusieurs paragraphes dans une case : séparés par une espace.
  const paragraphes = noeud.localName === 'p' ? [] : Array.from(noeud.getElementsByTagNameNS(W, 'p'))
  if (paragraphes.length) return paragraphes.map((p) => texteDe(p)).filter(Boolean).join(' ').trim()
  let t = ''
  noeud.querySelectorAll('*').forEach((n) => {
    if (n.localName === 't') t += n.textContent || ''
    else if (n.localName === 'tab') t += '\t'
  })
  return t.trim()
}

export async function lireWord(fichier: Blob): Promise<string[][]> {
  const zip = await JSZip.loadAsync(fichier)
  const xml = await zip.file('word/document.xml')?.async('string')
  if (!xml) throw new Error('document Word illisible')
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const tableaux = Array.from(doc.getElementsByTagNameNS(W, 'tbl'))
  if (tableaux.length) {
    const lignesDe = (tbl: Element) => Array.from(tbl.getElementsByTagNameNS(W, 'tr'))
      .filter((tr) => tr.parentElement === tbl)
      .map((tr) => Array.from(tr.getElementsByTagNameNS(W, 'tc')).map((tc) => texteDe(tc)))
    const plusGrand = tableaux.map(lignesDe).sort((a, b) => b.length - a.length)[0]
    return plusGrand.filter((l) => l.some((c) => c))
  }
  return Array.from(doc.getElementsByTagNameNS(W, 'p'))
    .map((p) => texteDe(p))
    .filter(Boolean)
    .map((ligne) => ligne.split('\t').map((c) => c.trim()))
}
