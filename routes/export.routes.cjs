// =====================================================================
//  Export / import Excel des notes
//  Monté dans server.cjs avec : app.use('/api', require('./routes/export.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT } = require('../server-lib/auth.cjs');
const { upload } = require('../server-lib/upload.cjs');
const db = require('../server-lib/db.cjs');
const notesService = require('../server-lib/notes-service.cjs');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Fonction pour mapper le type de note sélectionné au champ de la table Note
function mapTypeNoteToField(typeNote) {
  const noteFields = {
    'Inter1': 'inter1',
    'Inter2': 'inter2',
    'Inter3': 'inter3',
    'Inter4': 'inter4',
    'TP1': 'TP1',
    'TP2': 'TP2',
    'Devoir1': 'Dev1',
    'Devoir2': 'Dev2',
  };

  return noteFields[typeNote] || null; // Renvoie le champ correspondant ou null si le type de note n'existe pas
}

// Endpoint pour générer le fichier Excel
router.post('/export/excel/:classeId', authenticateJWT, async (req, res) => {
  const classeId = req.params.classeId;

  try {
    // Récupération des données des élèves et tri par ordre alphabétique
    const [students] = await req.db.query(
      "SELECT e.nom, e.prenom FROM eleve e JOIN classes c ON c.id = e.classe_id WHERE e.classe_id = ? AND c.etablissement_id = ? AND e.statut = 'actif' ORDER BY e.nom ASC, e.prenom ASC",
      [classeId, req.user.etablissementId]
    );

    // Création d'un nouveau workbook
    const workbook = XLSX.utils.book_new();
    const worksheetData = [
      ['Nom', 'Prénom', 'Note']  // En-têtes de colonnes
    ];

    // Ajout des données des élèves triées
    students.forEach(student => {
      worksheetData.push([student.nom, student.prenom, '']); // Colonne pour entrer les notes manuellement
    });

    // Création de la feuille de calcul
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Ajout de la feuille de calcul au workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, `Classe_${classeId}`);

    // Définir le chemin du fichier temporaire
    const filePath = path.join(require('os').tmpdir(), `Classe_${classeId}_${Date.now()}_${Math.random().toString(36).slice(2)}.xlsx`);

    // Écrire le fichier Excel dans le système de fichiers
    XLSX.writeFile(workbook, filePath);

    // Configuration des en-têtes HTTP pour le téléchargement du fichier Excel
    res.setHeader('Content-Disposition', `attachment; filename=Classe_${classeId}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Envoyer le fichier via un flux
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Supprimer le fichier temporaire après envoi
    fileStream.on('end', () => {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Erreur lors de la suppression du fichier temporaire', err);
        }
      });
    });

  } catch (error) {
    console.error('Erreur lors de la génération du fichier Excel:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

router.post('/upload/excel', authenticateJWT, upload.single('file'), async (req, res) => {
  const file = req.file;
  const cleanup = () => { if (file) fs.unlink(file.path, () => {}); };
  try {
    if (!file) {
      return res.status(400).send({ message: 'Aucun fichier uploadé.' });
    }

    const { typeNote, semestreId, matiereId, classeId, anneeScolaireId } = req.body;
    // L'école vient du jeton, jamais du formulaire (multipart : le garde
    // central ne lit pas ce corps).
    const etablissementId = Number(req.user.etablissementId);
    const field = notesService.noteField(mapTypeNoteToField(typeNote) || typeNote);
    if (!field) {
      cleanup();
      return res.status(400).send({ message: 'Type de note non valide.' });
    }

    const k = { classeId, matiereId, semestreId, anneeScolaireId, etablissementId };
    const [owned] = await db.query(
      `SELECT (SELECT COUNT(*) FROM classes WHERE id = ? AND etablissement_id = ?)
            + (SELECT COUNT(*) FROM matieres WHERE id = ? AND etablissement_id = ?)
            + (SELECT COUNT(*) FROM semestre WHERE id = ? AND etablissement_id = ?)
            + (SELECT COUNT(*) FROM annee_scolaire WHERE id = ? AND etablissement_id = ? AND statut = 'ouverte') AS n`,
      [classeId, etablissementId, matiereId, etablissementId, semestreId, etablissementId, anneeScolaireId, etablissementId]
    );
    if (Number(owned[0].n) !== 4) {
      cleanup();
      return res.status(403).send({ message: 'Classe, matière, période ou année invalide (ou année clôturée).' });
    }
    if (!(await notesService.canWriteNotes(db, req.user, k))) {
      cleanup();
      return res.status(403).send({ message: "Vous n'enseignez pas cette matière dans cette classe." });
    }

    const workbook = XLSX.readFile(file.path);
    const sheetNameList = workbook.SheetNames;
    if (sheetNameList.length === 0) {
      cleanup();
      return res.status(400).send({ message: 'Le fichier Excel ne contient aucune feuille.' });
    }

    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]]);
    const elevesNonTrouves = [];
    const elevesDejaNote = [];
    const elevesAjoutes = [];
    const notesInvalides = [];

    for (const row of data) {
      const Nom = String(row.Nom ?? '').trim();
      const Prenom = String(row['Prénom'] ?? row.Prenom ?? '').trim();
      if (!Nom || !Prenom) continue;
      if (row.Note === undefined || row.Note === null || String(row.Note).trim() === '') continue;

      const parsed = notesService.parseNoteValue(row.Note);
      if (!parsed.ok) {
        notesInvalides.push(`${Nom} ${Prenom} (${row.Note})`);
        continue;
      }

      const [eleves] = await db.query(
        "SELECT id FROM eleve WHERE nom = ? AND prenom = ? AND classe_id = ? AND etablissement_id = ? AND statut = 'actif'",
        [Nom, Prenom, classeId, etablissementId]
      );
      // Homonymes dans la classe : impossible de savoir à qui est la note.
      if (eleves.length !== 1) {
        elevesNonTrouves.push(`${Nom} ${Prenom}${eleves.length > 1 ? ' (homonymes : saisir à l\'écran)' : ''}`);
        continue;
      }

      const ek = { ...k, eleveId: eleves[0].id };
      const existing = await notesService.noteRow(db, ek);
      if (existing && existing[field] !== null) {
        elevesDejaNote.push(`${Nom} ${Prenom}`);
        continue;
      }
      // Case vide seulement (une note existante n'est jamais écrasée) ; après
      // validation, la moyenne attend la prochaine validation.
      await notesService.setNote(db, ek, field, parsed.value, { recompute: false });
      elevesAjoutes.push(`${Nom} ${Prenom}`);
    }

    cleanup();

    // Élèves de la classe toujours sans cette note après l'import (absents
    // du fichier ou case vide) : à compléter avant de valider.
    const [sansNoteRows] = await db.query(
      `SELECT e.nom, e.prenom FROM eleve e
       LEFT JOIN note n ON n.Eleves_id = e.id AND n.classe_id = ? AND n.matieres_id = ? AND n.Semestre_id = ? AND n.Annee_scolaire_id = ?
       WHERE e.classe_id = ? AND e.statut = 'actif'
       GROUP BY e.id, e.nom, e.prenom
       HAVING MAX(n.${field}) IS NULL
       ORDER BY e.nom, e.prenom`,
      [classeId, matiereId, semestreId, anneeScolaireId, classeId]
    );
    const sansNote = sansNoteRows.map((e) => `${e.nom} ${e.prenom}`);

    const messageParts = [`✅ Import terminé.`];
    if (elevesAjoutes.length > 0) messageParts.push(`${elevesAjoutes.length} note(s) ajoutée(s).`);
    if (elevesDejaNote.length > 0) messageParts.push(`Ignorés (déjà notés) : ${elevesDejaNote.join(', ')}.`);
    if (elevesNonTrouves.length > 0) messageParts.push(`Non trouvés : ${elevesNonTrouves.join(', ')}.`);
    if (notesInvalides.length > 0) messageParts.push(`Notes invalides (0 à 20) : ${notesInvalides.join(', ')}.`);
    if (sansNote.length > 0) messageParts.push(`${sansNote.length} élève(s) toujours sans note : donnez-leur une note ou 00 avant de valider.`);

    return res.send({
      message: messageParts.join(' '),
      details: { ajoutes: elevesAjoutes, dejaNote: elevesDejaNote, nonTrouves: elevesNonTrouves, invalides: notesInvalides, sansNote },
    });
  } catch (error) {
    cleanup();
    if (error.code === 'ANNEE_CLOTUREE') return res.status(409).json({ message: error.message });
    console.error('❌ Erreur lors de l\'importation des données Excel', error);
    res.status(500).send({ message: 'Erreur lors de l\'importation' });
  }
});

module.exports = router;
