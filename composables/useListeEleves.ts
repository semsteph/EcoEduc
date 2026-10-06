// Lecture d'une liste d'élèves collée depuis Excel/Word ou lue dans un
// fichier Excel, quel que soit son modèle : les colonnes sont reconnues par
// leur titre, ou à défaut par leur contenu. Utilisé par l'inscription en
// masse (testé dans tests/ecole.test.cjs).

export type EleveLu = {
  nom: string
  prenom: string
  dateNaissance: string // AAAA-MM-JJ ou '' si illisible
  dateBrute: string
  sexe: string // 'M' | 'F' | ''
  parentNom: string
  parentPrenom: string
  telephone: string
  email: string
}

type Champ = keyof Omit<EleveLu, 'dateNaissance' | 'dateBrute'> | 'date' | 'nomComplet'

const sansAccents = (s: string) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Texte collé → lignes de cellules (tabulations d'Excel, sinon ; ou ,).
export function lireTexteColle(texte: string): string[][] {
  const lignes = String(texte || '').replace(/\r/g, '').split('\n').filter((l) => l.trim())
  if (!lignes.length) return []
  const sep = lignes.some((l) => l.includes('\t')) ? '\t' : lignes.some((l) => l.includes(';')) ? ';' : lignes.every((l) => l.split(',').length >= 3) ? ',' : null
  return lignes.map((l) => (sep ? l.split(sep) : [l]).map((c) => c.trim()))
}

// Date en AAAA-MM-JJ : 12/05/2014, 12-5-14, 2014-05-12, nombre de série Excel.
export function normaliserDate(valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === '') return ''
  if (typeof valeur === 'number' || /^\d{5}(\.\d+)?$/.test(String(valeur))) {
    const d = new Date(Math.round((Number(valeur) - 25569) * 86400 * 1000))
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
  }
  if (valeur instanceof Date) return Number.isNaN(valeur.getTime()) ? '' : valeur.toISOString().slice(0, 10)
  const t = String(valeur).trim()
  let j: number, m: number, a: number
  let r = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (r) { a = +r[1]; m = +r[2]; j = +r[3] } else {
    r = t.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2}|\d{4})$/)
    if (!r) return ''
    j = +r[1]; m = +r[2]; a = +r[3]
    if (a < 100) a += a > new Date().getFullYear() % 100 ? 1900 : 2000
  }
  if (m < 1 || m > 12 || j < 1 || j > 31) return ''
  const d = new Date(Date.UTC(a, m - 1, j))
  if (d.getUTCMonth() !== m - 1) return ''
  return `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`
}

export function normaliserSexe(valeur: unknown): string {
  const t = sansAccents(String(valeur ?? ''))
  if (/^(m|masc.*|garcon|g|h|homme|male)$/.test(t)) return 'M'
  if (/^(f|fem.*|fille|femme|female)$/.test(t)) return 'F'
  return ''
}

// Titre de colonne → champ.
function champDuTitre(titre: string): Champ | null {
  const t = sansAccents(titre)
  if (!t) return null
  const parent = /parent|pere|mere|tuteur|responsable/.test(t)
  if (/mail/.test(t)) return 'email'
  if (/tel|phone|contact|portable|numero|cell/.test(t)) return 'telephone'
  if (/sexe|genre|^s$/.test(t)) return 'sexe'
  if (/naiss|date|^ne |^nee|^ne\(e\)/.test(t)) return 'date'
  if (/nom et prenom|nom & prenom|nom complet|^nom prenom|nom\/prenom|^eleves?$|^apprenants?$|^noms? et prenoms?/.test(t)) return parent ? 'parentNom' : 'nomComplet'
  if (/prenom/.test(t)) return parent ? 'parentPrenom' : 'prenom'
  if (/nom/.test(t)) return parent ? 'parentNom' : 'nom'
  if (parent) return 'parentNom'
  return null
}

const estDate = (v: string) => !!normaliserDate(v)
const estSexe = (v: string) => !!normaliserSexe(v)
const estTel = (v: string) => /^[+()\d\s.-]{8,}$/.test(v) && v.replace(/\D/g, '').length >= 8
const estMail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

// « DOSSOU Larissa » / « Larissa DOSSOU » → nom (MAJUSCULES) + prénom.
export function separerNomComplet(texte: string): { nom: string; prenom: string } {
  const mots = String(texte || '').trim().split(/\s+/).filter(Boolean)
  if (mots.length < 2) return { nom: mots[0] || '', prenom: '' }
  const majuscules = mots.filter((w) => w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(sansAccents(w).toUpperCase()))
  if (majuscules.length && majuscules.length < mots.length) {
    return { nom: majuscules.join(' '), prenom: mots.filter((w) => !majuscules.includes(w)).join(' ') }
  }
  return { nom: mots[0], prenom: mots.slice(1).join(' ') }
}

// Ligne de texte libre (liste Word, message…) :
// « 1. DOSSOU Larissa - 05/08/2014 - F - 97 00 11 22 »,
// « DAGBA Codjo, né le 7/6/2014, garçon ». On repère et retire le numéro,
// la date, le sexe, le téléphone et l'e-mail ; le reste donne nom et prénom.
export function lireLigneLibre(ligne: string): Partial<EleveLu> & { reste: string } {
  let t = ` ${String(ligne || '')} `
  const out: Partial<EleveLu> = {}
  const email = t.match(/[^\s,;]+@[^\s,;]+\.[a-z]{2,}/i)
  if (email) { out.email = email[0].toLowerCase(); t = t.replace(email[0], ' ') }
  const date = t.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/. ]\d{1,2}[-/. ](?:\d{4}|\d{2}))\b/)
  if (date && normaliserDate(date[1])) { out.dateBrute = date[1]; out.dateNaissance = normaliserDate(date[1]); t = t.replace(date[1], ' ') }
  const tel = t.match(/(\+?\d[\d .-]{7,}\d)/)
  if (tel && tel[1].replace(/\D/g, '').length >= 8) { out.telephone = tel[1].trim(); t = t.replace(tel[1], ' ') }
  t = t.replace(/^\s*(n[°o]\s*)?\d{1,3}\s*[.)\-:]?\s+/i, ' ') // numéro de ligne
  t = t.replace(/\b(nee?|né(e)?|née)\s+le\b/gi, ' ')
  const sexe = t.match(/(?:^|[\s,;:\-–|(])(masculin|feminin|féminin|garçon|garcon|fille|homme|femme|m|f|g)(?=$|[\s,;:\-–|)])/i)
  if (sexe && normaliserSexe(sexe[1])) { out.sexe = normaliserSexe(sexe[1]); t = t.replace(new RegExp(`(^|[\\s,;:\\-–|(])${sexe[1]}(?=$|[\\s,;:\\-–|)])`, 'i'), ' ') }
  const reste = t.replace(/[,;:|–()]+/g, ' ').replace(/\s-\s|^\s*-|-\s*$/g, ' ').replace(/\s+/g, ' ').trim()
  return { ...out, reste }
}

export function analyserListe(lignes: string[][]): { eleves: EleveLu[]; colonnes: Record<number, Champ> } {
  const propres = lignes.map((l) => l.map((c) => String(c ?? '').trim())).filter((l) => l.some((c) => c))
  if (!propres.length) return { eleves: [], colonnes: {} }

  // Ligne de titres : la première (parmi les 6 premières) dont ≥ 2 cellules
  // sont reconnues.
  let debut = 0
  let colonnes: Record<number, Champ> = {}
  for (let i = 0; i < Math.min(6, propres.length); i += 1) {
    const essai: Record<number, Champ> = {}
    propres[i].forEach((c, k) => { const ch = champDuTitre(c); if (ch && !Object.values(essai).includes(ch)) essai[k] = ch })
    if (Object.keys(essai).length >= 2) { colonnes = essai; debut = i + 1; break }
  }

  // Pas de titres : on devine d'après le contenu des colonnes.
  if (!Object.keys(colonnes).length) {
    const nbCol = Math.max(...propres.map((l) => l.length))
    const textes: number[] = []
    for (let k = 0; k < nbCol; k += 1) {
      const vals = propres.map((l) => l[k] || '').filter(Boolean)
      if (!vals.length) continue
      const part = (f: (v: string) => boolean) => vals.filter(f).length / vals.length
      if (part(estMail) > 0.6) colonnes[k] = 'email'
      else if (part(estDate) > 0.6) colonnes[k] = 'date'
      else if (part(estSexe) > 0.6) colonnes[k] = 'sexe'
      else if (part(estTel) > 0.6) colonnes[k] = 'telephone'
      else textes.push(k)
    }
    if (textes.length === 1) colonnes[textes[0]] = 'nomComplet'
    else {
      const ordre: Champ[] = ['nom', 'prenom', 'parentNom', 'parentPrenom']
      textes.slice(0, 4).forEach((k, i) => { colonnes[k] = ordre[i] })
    }
  }

  const eleves: EleveLu[] = []
  for (const l of propres.slice(debut)) {
    const v: Record<string, string> = {}
    Object.entries(colonnes).forEach(([k, ch]) => { v[ch] = l[Number(k)] || '' })
    let nom = v.nom || ''
    let prenom = v.prenom || ''
    if (v.nomComplet && (!nom || !prenom)) {
      // Une seule colonne de texte : elle peut contenir aussi la date, le
      // sexe, le téléphone… (liste simple sans tableau).
      const libre = lireLigneLibre(v.nomComplet)
      ;({ nom, prenom } = separerNomComplet(libre.reste))
      if (!v.date && libre.dateBrute) v.date = libre.dateBrute
      if (!v.sexe && libre.sexe) v.sexe = libre.sexe
      if (!v.telephone && libre.telephone) v.telephone = libre.telephone
      if (!v.email && libre.email) v.email = libre.email
    }
    // Ligne d'exemple du canevas ou ligne de commentaire : ignorée.
    if (sansAccents(nom) === 'kouadio' && sansAccents(prenom) === 'jean') continue
    if (!nom && !prenom) continue
    if (/^(note|exemple)/.test(sansAccents(nom))) continue
    // Lignes de titre d'un document (« Liste de la classe de 5ème… »).
    if (/^(liste|classe|annee|effectif|etablissement|ecole|college|lycee|complexe|total|rentree)\b/.test(sansAccents(`${nom} ${prenom}`)) && !v.date && !v.sexe) continue
    eleves.push({
      nom: nom.trim().toUpperCase(),
      prenom: prenom.trim(),
      dateNaissance: normaliserDate(v.date),
      dateBrute: v.date || '',
      sexe: normaliserSexe(v.sexe),
      parentNom: (v.parentNom || '').trim(),
      parentPrenom: (v.parentPrenom || '').trim(),
      telephone: (v.telephone || '').trim(),
      email: (v.email || '').trim().toLowerCase(),
    })
  }
  return { eleves, colonnes }
}
