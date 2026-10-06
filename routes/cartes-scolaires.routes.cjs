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
const db = require('../server-lib/db.cjs');
const { savePhoto, imageType } = require('../server-lib/photo.cjs');

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
      "SELECT id, nom, prenom FROM eleve WHERE classe_id = ? AND etablissement_id = ? AND statut = 'actif'",
      [classeId, req.user.etablissementId]
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

      // Même enregistrement que la photo prise à l'inscription : vrai
      // fichier image, nom aléatoire, dans le dossier servi par le serveur
      // (avant : écrit dans routes/uploads, donc jamais affiché).
      const data = entry.getData();
      if (!imageType(data)) { ignored++; continue; }
      await savePhoto(db, foundId, data);

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
    // 1. Établissement et année ouverte (avant : statut « active », qui
    //    n'existe pas, et un tableau lu comme un objet → nom et année vides).
    const [[infos]] = await req.db.query(`
      SELECT e.nom AS etablissementNom,
             (SELECT a.nom_annee FROM annee_scolaire a WHERE a.etablissement_id = e.id AND a.statut = 'ouverte' ORDER BY a.id DESC LIMIT 1) AS anneeNom
      FROM etablissement e WHERE e.id = ?
    `, [req.user.etablissementId]);
    const [[classe]] = await req.db.query('SELECT nom FROM classes WHERE id = ? AND etablissement_id = ?', [classeId, req.user.etablissementId]);

    // 2. Élèves présents de la classe
    const [eleves] = await req.db.query(`
      SELECT id, matricule, nom, prenom, sexe, date_naissance, photo_url
      FROM eleve
      WHERE classe_id = ? AND etablissement_id = ? AND statut = 'actif'
      ORDER BY nom ASC, prenom ASC
    `, [classeId, req.user.etablissementId]);

    // 3. Logique de vérification : est-ce que TOUT LE MONDE a une photo ?
    // On considère que si au moins un élève n'a pas de photo, on doit proposer l'import.
    const tousOntUnePhoto = eleves.length > 0 && eleves.every(el => el.photo_url !== null && el.photo_url !== '');

    res.json({
      tousOntUnePhoto,
      etablissement: infos ? infos.etablissementNom : "Établissement",
      anneeScolaire: infos && infos.anneeNom ? infos.anneeNom : "",
      classe: classe ? classe.nom : "",
      eleves: eleves
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de la vérification des données" });
  }
});

// État des photos de chaque classe (tableau de suivi des cartes scolaires).
router.get('/cartes-scolaires/etat', authenticateJWT, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.id AS classeId, COUNT(e.id) AS effectif, SUM(e.photo_url IS NOT NULL AND e.photo_url <> '') AS avecPhoto
       FROM classes c
       LEFT JOIN eleve e ON e.classe_id = c.id AND e.statut = 'actif'
       WHERE c.etablissement_id = ?
       GROUP BY c.id`,
      [req.user.etablissementId]
    );
    res.json(rows.map((r) => ({ classeId: r.classeId, effectif: Number(r.effectif), avecPhoto: Number(r.avecPhoto || 0) })));
  } catch (error) {
    console.error('Erreur état des cartes :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
