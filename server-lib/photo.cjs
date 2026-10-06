// =====================================================================
//  Photos d'identité des élèves (facultatives).
//  - Le navigateur recadre et compresse la photo (portrait 3:4, JPEG) ;
//    le serveur vérifie que c'est vraiment une image (signature du fichier).
//  - Nom de fichier aléatoire : avant, « eleve_37.jpg » permettait de
//    deviner l'adresse de la photo de n'importe quel enfant.
//  - Une seule photo par élève : l'ancienne est supprimée.
//  Utilisée à l'inscription, depuis la fiche de l'élève, et par l'import
//  ZIP des cartes scolaires.
// =====================================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const PHOTOS_DIR = path.join(__dirname, '..', 'uploads', 'photos');
const PUBLIC_PREFIX = '/uploads/photos';

// Type réel d'après les premiers octets (l'extension ne prouve rien).
function imageType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return '.jpg';
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') return '.webp';
  return null;
}

// Fichier local d'une photo publique (uniquement dans le dossier des photos).
function localPath(publicUrl) {
  if (!publicUrl || !String(publicUrl).startsWith(`${PUBLIC_PREFIX}/`)) return null;
  const full = path.normalize(path.join(PHOTOS_DIR, String(publicUrl).slice(PUBLIC_PREFIX.length)));
  return full.startsWith(PHOTOS_DIR) ? full : null;
}

function removeFile(publicUrl) {
  const file = localPath(publicUrl);
  if (file) fs.unlink(file, () => {});
}

// Enregistre la photo d'un élève et renvoie son adresse publique.
async function savePhoto(db, eleveId, buffer) {
  const ext = imageType(buffer);
  if (!ext) throw Object.assign(new Error('Le fichier n\'est pas une image (JPG, PNG ou WEBP).'), { code: 'IMAGE' });
  const dir = path.join(PHOTOS_DIR, 'eleves');
  fs.mkdirSync(dir, { recursive: true });
  const name = `${crypto.randomBytes(16).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(dir, name), buffer);
  const publicUrl = `${PUBLIC_PREFIX}/eleves/${name}`;
  const [[old]] = await db.query('SELECT photo_url FROM eleve WHERE id = ?', [eleveId]);
  await db.query('UPDATE eleve SET photo_url = ? WHERE id = ?', [publicUrl, eleveId]);
  if (old && old.photo_url) removeFile(old.photo_url);
  return publicUrl;
}

async function deletePhoto(db, eleveId) {
  const [[old]] = await db.query('SELECT photo_url FROM eleve WHERE id = ?', [eleveId]);
  await db.query('UPDATE eleve SET photo_url = NULL WHERE id = ?', [eleveId]);
  if (old && old.photo_url) removeFile(old.photo_url);
}

// Réception en mémoire, 5 Mo au plus (la photo compressée fait ~100 Ko).
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

module.exports = { savePhoto, deletePhoto, imageType, photoUpload, PHOTOS_DIR };
