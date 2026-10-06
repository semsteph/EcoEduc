// Préparation d'une photo d'identité dans le navigateur : recadrage au
// format portrait 3:4 (centré, un peu vers le haut pour garder le visage)
// et réduction à 450 × 600 en JPEG (~100 Ko). Commun à l'inscription, à la
// fiche d'un élève et à l'association des photos d'une classe.
const LARGEUR = 450
const HAUTEUR = 600

async function lireImage(file: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' } as any)
  } catch {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }
}

export async function recadrerPhoto(file: Blob): Promise<Blob> {
  const source = await lireImage(file)
  const w = source.width
  const h = source.height
  const ratio = LARGEUR / HAUTEUR
  let sw = w
  let sh = w / ratio
  if (sh > h) { sh = h; sw = h * ratio }
  const sx = (w - sw) / 2
  const sy = Math.max(0, Math.min(h - sh, (h - sh) * 0.3))
  const canvas = document.createElement('canvas')
  canvas.width = LARGEUR
  canvas.height = HAUTEUR
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR)
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, LARGEUR, HAUTEUR)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas'))), 'image/jpeg', 0.85))
}

// Texte comparable : sans accents, minuscules, mots séparés par un espace.
export function normaliserNom(s: string): string {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Tri « naturel » des noms de fichiers : IMG_2 avant IMG_10.
export function triNaturel(a: string, b: string): number {
  return a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' })
}
