// =====================================================================
//  Notes
//  Monté dans server.cjs avec : app.use('/api', require('./routes/notes.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, requireAdminStaff, getEleveDuParentOr403 } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const notesService = require('../server-lib/notes-service.cjs');

// Endpoint pour récupérer les notes d'une classe et d'une matière spécifiques
router.get('/notes/:classeId/:subjectId/:semesterId/:anneeScolaireId', authenticateJWT, async (req, res) => {
  const { classeId, subjectId, semesterId, anneeScolaireId } = req.params;

  // Vérifier si les paramètres sont fournis
  if (!classeId || !subjectId || !semesterId || !anneeScolaireId) {
    return res.status(400).json({ error: 'Classe ID, semestre ID et Matière ID sont requis' });
  }

  try {
    // Exécution de la requête SQL pour récupérer les notes des élèves
    const [results] = await req.db.query(`
     SELECT 
    e.id AS eleveId, 
    e.nom, 
    e.prenom, 
    MAX(n.inter1) AS inter1, 
    MAX(n.inter2) AS inter2, 
    MAX(n.inter3) AS inter3, 
    MAX(n.inter4) AS inter4, 
    MAX(n.Dev1) AS Dev1,
    MAX(n.Dev2) AS Dev2,
    MAX(n.moy) AS moySauvegardee,
    MAX(n.notes_validees) AS notesValidees
FROM eleve e
LEFT JOIN note n 
    ON e.id = n.Eleves_id 
    AND n.classe_id = ? 
    AND n.matieres_id = ?
    AND n.semestre_id = ? 
    AND n.Annee_scolaire_id = ?
WHERE e.classe_id = ? AND e.statut = 'actif'
GROUP BY e.id, e.nom, e.prenom
ORDER BY e.nom, e.prenom;

    `, [classeId, subjectId, semesterId, anneeScolaireId, classeId ]);

    // Si aucun résultat, retourner un message vide
    if (results.length === 0) {
      return res.status(404).json({ message: 'Aucune donnée trouvée pour cette classe, cette matière et ce semestre.' });
    }

    // Récupération du coefficient associé à la classe et à la matière
    const [[coefficient]] = await req.db.query(`
      SELECT c.valeur 
      FROM coefficient c 
      JOIN enseigner e ON e.coefficient_id = c.id 
      WHERE e.Classes_id = ? AND e.matiere_id = ? AND e.Annee_scolaire_id = ?;
    `, [classeId, subjectId, anneeScolaireId]);

    const coeffValue = coefficient ? coefficient.valeur : 0; // Utilisez 'valeur' au lieu de 'coefficient'

    // Calcul des moyennes et ajout au résultat
    const updatedResults = results.map(student => {
      const { inter1, inter2, inter3, inter4, Dev1, Dev2, moySauvegardee, notesValidees, ...reste } = student;

      // Convertir les notes en nombres
      const notes = [parseFloat(inter1), parseFloat(inter2), parseFloat(inter3), parseFloat(inter4)].filter(note => !isNaN(note));
      const moyInter = notes.length > 0 ? (notes.reduce((sum, note) => sum + note, 0) / notes.length) : 0;

      // Calculer moy en incluant Dev1 et Dev2
      const totalNotes = [moyInter, parseFloat(Dev1), parseFloat(Dev2)].filter(note => !isNaN(note));
      const moy = totalNotes.length > 0 ? (totalNotes.reduce((sum, note) => sum + note, 0) / totalNotes.length) : 0;

      // Calcul de coeff
      const coeff = moy * coeffValue;

      // Retourner l'objet mis à jour
      const verrouillees = [...notesService.notesValidees({ inter1, inter2, inter3, inter4, Dev1, Dev2, moy: moySauvegardee, notes_validees: notesValidees })];
      return {
        ...reste,
        inter1, inter2, inter3, inter4, Dev1, Dev2, moySauvegardee,
        // Notes validées (non modifiables par l'enseignant) ; une case vide
        // reste saisissable même après validation.
        verrouillees,
        // Notes ajoutées depuis la dernière validation : à revalider.
        aRevalider: moySauvegardee !== null && moySauvegardee !== undefined
          && [['inter1', inter1], ['inter2', inter2], ['inter3', inter3], ['inter4', inter4], ['Dev1', Dev1], ['Dev2', Dev2]]
            .some(([f, v]) => v !== null && v !== undefined && !verrouillees.includes(f)),
        moyInter: Number(moyInter.toFixed(2)), // Arrondir à 2 décimales
        moy: Number(moy.toFixed(2)),           // Arrondir à 2 décimales
        coeff: Number(coeff.toFixed(2)),       // Arrondir à 2 décimales
        // true seulement si le bouton « Sauvegarder » a déjà été cliqué pour
        // cet élève (moyenne réellement persistée en base, pas juste calculée
        // à la volée pour l'affichage) — sert au circuit de validation admin.
        estDejaSauvegardee: moySauvegardee !== null && moySauvegardee !== undefined,
      };
    });

    // Retourner les résultats mis à jour au client
    res.json(updatedResults);
  } catch (error) {
    console.error('Erreur lors de la récupération des notes', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// code pour supprimer une ou plusieur note
// ⚠️ Règle métier : tant que l'enseignant n'a pas cliqué sur « Sauvegarder »
// (POST /notes/save, qui calcule et persiste moyInter/moy/moycoef dans la
// table `note`), il reste libre de supprimer/corriger une note comme il veut.
// Mais dès que la moyenne a été sauvegardée pour cet élève, la note est
// considérée comme officiellement enregistrée : toute suppression doit
// désormais passer par une demande soumise via
// POST /api/notes/modification-requests, validée par l'administration via
// PUT /api/notes/modification-requests/:id/approve (voir
// routes/note-modification-requests.routes.cjs). L'administration, elle,
// garde un accès direct dans tous les cas.
router.post('/deleteNote', authenticateJWT, async (req, res) => {
  const { eleveId, semestreId, anneeScolaireId, classeId, matiereId, noteType } = req.body;
  const field = notesService.noteField(noteType);

  // La matière est obligatoire : sans elle, la note était effacée dans
  // TOUTES les matières de l'élève.
  if (!eleveId || !semestreId || !anneeScolaireId || !classeId || !matiereId || !field) {
    return res.status(400).json({ message: 'Données manquantes pour la suppression de la note.' });
  }

  const k = { eleveId, semestreId, anneeScolaireId, classeId, matiereId, etablissementId: req.user.etablissementId };
  try {
    if (!(await notesService.canWriteNotes(db, req.user, k))) {
      return res.status(403).json({ message: "Vous n'enseignez pas cette matière dans cette classe." });
    }
    const row = await notesService.noteRow(db, k);
    if (!row || row[field] === null) {
      return res.status(404).json({ message: 'Note non trouvée.' });
    }
    // Moyenne déjà sauvegardée : l'enseignant passe par une demande validée
    // par l'administration (voir note-modification-requests).
    if (!notesService.isStaff(req.user) && notesService.estVerrouillee(row, field)) {
      return res.status(409).json({
        code: 'ADMIN_APPROVAL_REQUIRED',
        message: "Les moyennes ont déjà été sauvegardées pour cet élève. Toute suppression doit désormais passer par une demande validée par l'administration.",
      });
    }
    await notesService.setNote(db, k, field, null, { recompute: notesService.isStaff(req.user) });

    const [[eleve]] = await db.query('SELECT nom, prenom FROM eleve WHERE id = ?', [eleveId]);
    return res.status(200).json({
      message: `Note supprimée avec succès pour ${eleve.prenom} ${eleve.nom}.`,
      nom: eleve.nom,
      prenom: eleve.prenom,
    });
  } catch (error) {
    if (error.code === 'ANNEE_CLOTUREE') return res.status(409).json({ message: error.message });
    console.error('❌ Erreur lors de la suppression de la note:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Saisie directe des notes à l'écran (sans passer par un fichier Excel).
// Corps : { classeId, subjectId, semesterId, anneeScolaireId,
//           valeurs: [{ eleveId, champ: 'inter1'|...|'Dev2', valeur }] }
// Une note dont la moyenne est déjà sauvegardée ne peut plus être changée
// par l'enseignant (demande à l'administration).
// ---------------------------------------------------------------------
// Notes par photo : lecture des fiches photographiées (IA) puis
// rapprochement avec les élèves de la classe. Rien n'est enregistré ici :
// l'enseignant vérifie, puis les notes passent par la saisie habituelle.
// ---------------------------------------------------------------------
const photosNotes = require('multer')({ storage: require('multer').memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 10 } });
const notesPhoto = require('../server-lib/notes-photo.cjs');

router.post('/notes/photo/lire', authenticateJWT, photosNotes.array('photos', 10), async (req, res) => {
  const { classeId, subjectId, semesterId, anneeScolaireId } = req.body || {};
  const colonne = Math.min(4, Math.max(1, Number(req.body?.colonneFiche) || 1));
  if (!classeId || !subjectId || !semesterId || !anneeScolaireId || !req.files?.length) {
    return res.status(400).json({ message: 'Ajoutez au moins une photo de la fiche.' });
  }
  const base = { classeId, matiereId: subjectId, semestreId: semesterId, anneeScolaireId, etablissementId: req.user.etablissementId };
  const conn = await db.getConnection();
  try {
    if (!(await notesService.canWriteNotes(conn, req.user, base))) {
      return res.status(403).json({ message: "Vous n'enseignez pas cette matière dans cette classe." });
    }
    const images = req.files.filter((f) => /^image\/(jpeg|png|webp)$/.test(f.mimetype)).map((f) => ({ buffer: f.buffer, type: f.mimetype }));
    if (!images.length) return res.status(400).json({ message: 'Les photos doivent être des images (JPEG ou PNG).' });
    const [eleves] = await conn.query(
      'SELECT id, nom, prenom FROM eleve WHERE classe_id = ? AND Annee_scolaire_id = ? AND etablissement_id = ? ORDER BY nom, prenom',
      [classeId, anneeScolaireId, req.user.etablissementId]
    );
    let lignes;
    try {
      lignes = await notesPhoto.lireFiches(images, { colonne });
    } catch (e) {
      console.error('Lecture des fiches (IA) :', e.message);
      return res.status(503).json({ message: "La lecture des photos est momentanément indisponible. Réessayez plus tard ou tapez les notes." });
    }
    const resultat = notesPhoto.rapprocher(lignes, eleves);
    res.json({ eleves, ...resultat });
  } catch (error) {
    console.error('POST /notes/photo/lire :', error);
    res.status(500).json({ message: 'Erreur lors de la lecture des fiches.' });
  } finally {
    conn.release();
  }
});

router.post('/notes/saisie', authenticateJWT, async (req, res) => {
  const { classeId, subjectId, semesterId, anneeScolaireId, valeurs } = req.body;
  if (!classeId || !subjectId || !semesterId || !anneeScolaireId || !Array.isArray(valeurs) || valeurs.length === 0) {
    return res.status(400).json({ message: 'Données manquantes.' });
  }
  if (valeurs.length > 2000) return res.status(400).json({ message: 'Trop de notes en une fois.' });

  const base = { classeId, matiereId: subjectId, semestreId: semesterId, anneeScolaireId, etablissementId: req.user.etablissementId };
  const conn = await db.getConnection();
  try {
    if (!(await notesService.canWriteNotes(conn, req.user, base))) {
      return res.status(403).json({ message: "Vous n'enseignez pas cette matière dans cette classe." });
    }
    const [annee] = await conn.query("SELECT statut FROM annee_scolaire WHERE id = ?", [anneeScolaireId]);
    if (!annee.length || annee[0].statut === 'cloturee') {
      return res.status(409).json({ message: 'Cette année scolaire est clôturée : les notes ne peuvent plus être modifiées.' });
    }
    const [eleves] = await conn.query(
      "SELECT id FROM eleve WHERE classe_id = ? AND statut = 'actif' AND id IN (?)",
      [classeId, [...new Set(valeurs.map((v) => Number(v.eleveId)))]]
    );
    const enClasse = new Set(eleves.map((e) => e.id));

    const refus = [];
    let enregistrees = 0;
    await conn.beginTransaction();
    for (const v of valeurs) {
      const field = notesService.noteField(v.champ);
      const parsed = notesService.parseNoteValue(v.valeur);
      if (!field || !enClasse.has(Number(v.eleveId))) { refus.push({ eleveId: v.eleveId, champ: v.champ, raison: 'élève ou note inconnu' }); continue; }
      if (!parsed.ok) { refus.push({ eleveId: v.eleveId, champ: v.champ, raison: 'la note doit être entre 0 et 20' }); continue; }
      const k = { ...base, eleveId: Number(v.eleveId) };
      const row = await notesService.noteRow(conn, k);
      // Seule une note déjà validée est verrouillée ; une case vide reste
      // saisissable après validation (2e interrogation, devoir...).
      if (!notesService.isStaff(req.user) && notesService.estVerrouillee(row, field) && Number(row[field]) !== Number(parsed.value)) {
        refus.push({ eleveId: v.eleveId, champ: v.champ, raison: 'note déjà validée : faites une demande à l\'administration' });
        continue;
      }
      await notesService.setNote(conn, k, field, parsed.value, { recompute: notesService.isStaff(req.user) });
      enregistrees += 1;
    }
    await conn.commit();
    return res.json({ message: `${enregistrees} note(s) enregistrée(s).`, enregistrees, refus });
  } catch (error) {
    try { await conn.rollback(); } catch (_) {}
    if (error.code === 'ANNEE_CLOTUREE') return res.status(409).json({ message: error.message });
    console.error('Erreur saisie des notes :', error);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement des notes.' });
  } finally {
    conn.release();
  }
});

// « Sauvegarder » : le serveur calcule lui-même les moyennes à partir des
// notes enregistrées (les valeurs envoyées par le navigateur et la
// recherche des élèves par nom/prénom — homonymes — ne sont plus utilisées).
router.post('/notes/save', authenticateJWT, async (req, res) => {
  const { classeId, subjectId, semesterId, anneeScolaireId, confirmerPeuDeNotes } = req.body;

  if (!classeId || !subjectId || !semesterId || !anneeScolaireId) {
    return res.status(400).json({ message: 'Données manquantes ou invalides' });
  }

  const k = { classeId, matiereId: subjectId, semestreId: semesterId, anneeScolaireId };
  const conn = await db.getConnection();
  try {
    if (!(await notesService.canWriteNotes(conn, req.user, k))) {
      return res.status(403).json({ message: "Vous n'enseignez pas cette matière dans cette classe." });
    }
    const [annee] = await conn.query('SELECT statut FROM annee_scolaire WHERE id = ?', [anneeScolaireId]);
    if (!annee.length || annee[0].statut === 'cloturee') {
      return res.status(409).json({ message: 'Cette année scolaire est clôturée : les moyennes ne peuvent plus être modifiées.' });
    }
    await conn.beginTransaction();
    let resultat;
    try {
      resultat = await notesService.saveAverages(conn, k, { confirmerPeuDeNotes: confirmerPeuDeNotes === true });
    } catch (err) {
      await conn.rollback();
      if (['AUCUNE_NOTE', 'NOTES_MANQUANTES', 'PEU_DE_NOTES'].includes(err.code)) {
        const c = err.controle;
        return res.status(409).json({
          code: err.code,
          message: err.message,
          manquants: c ? c.manquants : [],
          nbInter: c ? c.nbInter : 0,
          nbDev: c ? c.nbDev : 0,
        });
      }
      throw err;
    }
    await conn.commit();
    const { saved, coefficient } = resultat;
    if (!coefficient) {
      return res.status(200).json({ message: `Moyennes sauvegardées (${saved} élève(s)). Attention : aucun coefficient n'est défini pour cette matière dans cette classe.`, saved });
    }
    res.status(200).json({ message: `Moyennes sauvegardées pour ${saved} élève(s).`, saved });
  } catch (error) {
    try { await conn.rollback(); } catch (_) {}
    console.error('Erreur lors de la mise à jour des notes :', error);
    res.status(500).json({ message: 'Erreur serveur lors de la sauvegarde des notes' });
  } finally {
    conn.release();
  }
});

// ⚠️ Réservé à l'administration — voir la note au-dessus de POST /deleteNote.
router.delete("/delete-note", authenticateJWT, requireAdminStaff, async (req, res) => {
  const { eleveId, matiereId, semestreId, classeId, anneeScolaireId, noteType } = req.body;
  const field = notesService.noteField(noteType);

  if (!eleveId || !matiereId || !semestreId || !classeId || !anneeScolaireId || !field) {
    return res.status(400).json({
      message: "Les informations nécessaires pour supprimer la note sont manquantes.",
    });
  }

  try {
    await notesService.setNote(db, { eleveId, matiereId, semestreId, classeId, anneeScolaireId }, field, null);
    res.json({ message: "Note supprimée avec succès." });
  } catch (error) {
    if (error.code === 'ANNEE_CLOTUREE') return res.status(409).json({ message: error.message });
    console.error("Erreur lors de la suppression de la note :", error);
    res.status(500).json({ message: "Erreur serveur lors de la suppression de la note." });
  }
});

// Endpoint pour récupérer les semestres et les notes d'un élève en une seule requête
router.get('/eleve-notes', authenticateJWT, async (req, res) => {
  const { childId, anneeScolaireId } = req.query;

  if (!childId) {
    return res.status(400).json({ error: 'childId est requis.' });
  }

  if (!(await getEleveDuParentOr403(req, res, childId))) return;

  if (!anneeScolaireId) {
    return res.json({});
  }

  try {
    const [rows] = await db.query(
      `SELECT 
        semestre.id AS semestreId,
        semestre.nom AS semestreNom,
        matieres.nom AS matiereNom,
        note.inter1,
        note.inter2,
        note.inter3,
        note.inter4,
        note.moyInter,
        note.Dev1,
        note.Dev2,
        note.moy,
        note.moycoef
      FROM note
      INNER JOIN matieres ON note.matieres_id = matieres.id
      INNER JOIN semestre ON note.Semestre_id = semestre.id
      WHERE note.eleves_id = ? AND note.Annee_scolaire_id = ?
      ORDER BY semestre.id ASC, matieres.nom ASC`,
      [childId, anneeScolaireId]
    );

    // Structurer les données pour correspondre à fetchNotes
    const processedData = {};
    
    rows.forEach(row => {
      if (!processedData[row.semestreId]) {
        processedData[row.semestreId] = {
          semestre: row.semestreNom,
          notes: {}
        };
      }
      
      if (!processedData[row.semestreId].notes[row.matiereNom]) {
        processedData[row.semestreId].notes[row.matiereNom] = {
          matiere: row.matiereNom,
          inter1: row.inter1,
          inter2: row.inter2,
          inter3: row.inter3,
          inter4: row.inter4,
          moyInter: row.moyInter,
          dev1: row.Dev1,
          dev2: row.Dev2,
          moy: row.moy,
          moycoef: row.moycoef,
        };
      } else {
        const note = processedData[row.semestreId].notes[row.matiereNom];
        note.inter1 = note.inter1 || row.inter1;
        note.inter2 = note.inter2 || row.inter2;
        note.inter3 = note.inter3 || row.inter3;
        note.inter4 = note.inter4 || row.inter4;
        note.moyInter = note.moyInter || row.moyInter;
        note.dev1 = note.dev1 || row.Dev1;
        note.dev2 = note.dev2 || row.Dev2;
        note.moy = note.moy || row.moy;
        note.moycoef = note.moycoef || row.moycoef;
      }
    });

    // Convertir les objets de notes en tableau
    Object.keys(processedData).forEach(semestreId => {
      processedData[semestreId].notes = Object.values(processedData[semestreId].notes);
    });

    res.json(processedData);
  } catch (error) {
    console.error('Erreur lors de la récupération des notes et des semestres:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des notes et des semestres.' });
  }
});

module.exports = router;
