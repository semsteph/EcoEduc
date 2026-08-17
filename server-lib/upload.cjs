// =====================================================================
//  Configuration multer partagée (import Excel, ZIP de photos, ...).
// =====================================================================

const multer = require('multer');
const path = require('path');

// Restreint aux types réellement attendus par ces routes (imports Excel et zip de photos).
const allowedUploadExt = new Set(['.xlsx', '.xls', '.csv', '.zip']);
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowedUploadExt.has(ext)) cb(null, true);
    else cb(new Error('Type de fichier non autorisé.'));
  }
});

module.exports = { upload, allowedUploadExt };
