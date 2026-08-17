// =====================================================================
//  Cartes scolaires (upload photos ZIP + vérification)
//  Monté dans server.cjs avec : app.use('/api', require('./routes/cartes-scolaires.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT } = require('../server-lib/auth.cjs');
const { upload } = require('../server-lib/upload.cjs');
const fs = require('fs');
const path = require('path');
const admZip = require('adm-zip');

router.post("/upload-photos-zip", authenticateJWT, upload.single("zipFile"), async (req, res) => {
  const { classeId, etablissementId } = req.body;

  if (!classeId || !etablissementId) {
    return res.status(400).json({ error: "classeId et etablissementId sont requis" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier ZIP fourni" });
  }

  const zipFilePath = req.file.path;

  // extensions autorisées
  const allowedExt = new Set([".jpg", ".jpeg", ".png", ".webp"]);

  // normalisation robuste (accents + séparateurs)
  const normalize = (s) => {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // retire accents
      .trim()
      .replace(/[\s-]+/g, "_") // espaces/tirets -> underscore
      .replace(/_+/g, "_"); // underscores multiples
  };

  // récupère le "base name" du fichier zip (sans dossiers)
  const getBaseNameNoExt = (entryName) => {
    // entryName peut être "folder/a/b/KOUADIO_Jean.jpg"
    const base = path.basename(entryName);
    const parsed = path.parse(base);
    return normalize(parsed.name);
  };

  try {
    const zip = new admZip(zipFilePath);
    const zipEntries = zip.getEntries();

    // Récupération des élèves
    const [eleves] = await req.db.query(
      "SELECT id, nom, prenom FROM eleve WHERE classe_id = ? AND etablissement_id = ?",
      [classeId, etablissementId]
    );

    if (!eleves || eleves.length === 0) {
      if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);
      return res.status(404).json({ error: "Aucun élève trouvé pour cette classe/établissement" });
    }

    // Construire une map { pattern -> eleveId }
    // patterns acceptés : nom_prenom et prenom_nom
    const patternToEleveId = new Map();
    for (const e of eleves) {
      const nom = normalize(e.nom);
      const prenom = normalize(e.prenom);

      const p1 = `${nom}_${prenom}`;
      const p2 = `${prenom}_${nom}`;

      patternToEleveId.set(p1, e.id);
      patternToEleveId.set(p2, e.id);

      // bonus: si DB contient double prénom/nom, on garde aussi versions sans underscores multiples
      patternToEleveId.set(p1.replace(/_/g, ""), e.id);
      patternToEleveId.set(p2.replace(/_/g, ""), e.id);
    }

    const targetDir = path.join(__dirname, "uploads", "photos", String(classeId));
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    let matchCount = 0;
    let ignored = 0;
    const unmatched = [];
    const updatedIds = new Set();

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const ext = path.extname(entry.entryName).toLowerCase();
      if (!allowedExt.has(ext)) {
        ignored++;
        continue;
      }

      const baseName = getBaseNameNoExt(entry.entryName);
      if (!baseName) {
        ignored++;
        continue;
      }

      // stratégie matching :
      // 1) match direct map (nom_prenom)
      // 2) match "contient" pour tolérer extra texte
      let foundId = patternToEleveId.get(baseName);

      if (!foundId) {
        // enlever underscores pour matcher "kouadiojean"
        const compact = baseName.replace(/_/g, "");
        foundId = patternToEleveId.get(compact);
      }

      if (!foundId) {
        // fallback : contains sur patterns
        // (moins performant mais acceptable si zip pas énorme)
        for (const [pattern, id] of patternToEleveId.entries()) {
          if (baseName.includes(pattern) || baseName.replace(/_/g, "").includes(pattern.replace(/_/g, ""))) {
            foundId = id;
            break;
          }
        }
      }

      if (!foundId) {
        // on garde un échantillon des fichiers non reconnus
        if (unmatched.length < 100) unmatched.push(path.basename(entry.entryName));
        continue;
      }

      // Nom final standardisé
      const newFileName = `eleve_${foundId}${ext}`;
      const fullPath = path.join(targetDir, newFileName);

      // Écriture fichier
      fs.writeFileSync(fullPath, entry.getData());

      // URL publique (selon ton static)
      const publicUrl = `/uploads/photos/${classeId}/${newFileName}`;

      await req.db.query("UPDATE eleve SET photo_url = ? WHERE id = ?", [publicUrl, foundId]);

      matchCount++;
      updatedIds.add(foundId);
    }

    // nettoyage
    if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);

    return res.json({
      success: true,
      message: "Traitement terminé",
      totalZip: zipEntries.length,
      identifies: matchCount,
      ignored,
      unmatched,
      updatedIds: Array.from(updatedIds),
    });
  } catch (error) {
    console.error("Erreur ZIP:", error);
    if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);
    return res.status(500).json({ error: "Erreur lors du traitement du ZIP" });
  }
});

// API de vérification et récupération des données pour Cartes Scolaires
router.get('/cartes-scolaires/verification/:classeId/:etablissementId', authenticateJWT, async (req, res) => {
  const { classeId, etablissementId } = req.params;

  try {
    // 1. Récupérer les infos de l'établissement et de l'année scolaire active
    const [infosGenerales] = await req.db.query(`
      SELECT e.nom as etablissementNom, a.nom_annee as anneeNom
      FROM etablissement e
      LEFT JOIN annee_scolaire a ON e.id = a.etablissement_id
      WHERE e.id = ? AND a.statut = 'active' LIMIT 1
    `, [etablissementId]);

    // 2. Récupérer les élèves de la classe
    const [eleves] = await req.db.query(`
      SELECT id, nom,date_naissance, prenom, photo_url 
      FROM eleve 
      WHERE classe_id = ? AND etablissement_id = ?
      ORDER BY nom ASC, prenom ASC
    `, [classeId, etablissementId]);

    // 3. Logique de vérification : est-ce que TOUT LE MONDE a une photo ?
    // On considère que si au moins un élève n'a pas de photo, on doit proposer l'import.
    const tousOntUnePhoto = eleves.length > 0 && eleves.every(el => el.photo_url !== null && el.photo_url !== '');

    res.json({
      tousOntUnePhoto,
      etablissement: infosGenerales ? infosGenerales.etablissementNom : "Établissement",
      anneeScolaire: infosGenerales ? infosGenerales.anneeNom : "N/A",
      eleves: eleves
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de la vérification des données" });
  }
});

module.exports = router;
