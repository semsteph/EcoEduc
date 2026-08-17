// =====================================================================
//  Export / import Excel des notes
//  Monté dans server.cjs avec : app.use('/api', require('./routes/export.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { upload } = require('../server-lib/upload.cjs');
const db = require('../server-lib/db.cjs');
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
router.post('/export/excel/:classeId', async (req, res) => {
  const classeId = req.params.classeId;

  try {
    // Récupération des données des élèves et tri par ordre alphabétique
    const [students] = await req.db.query(
      'SELECT nom, prenom FROM eleve WHERE classe_id = ? ORDER BY nom ASC, prenom ASC',
      [classeId]
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
    const filePath = path.join(__dirname, `Classe_${classeId}.xlsx`);

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

router.post('/upload/excel', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).send({ message: 'Aucun fichier uploadé.' });
    }

    const { typeNote, semestreId, matiereId, classeId, etablissementId, anneeScolaireId } = req.body;
    const updateField = mapTypeNoteToField(typeNote);
    if (!updateField) {
      return res.status(400).send({ message: 'Type de note non valide.' });
    }

    const workbook = XLSX.readFile(file.path);
    const sheetNameList = workbook.SheetNames;
    if (sheetNameList.length === 0) {
      return res.status(400).send({ message: 'Le fichier Excel ne contient aucune feuille.' });
    }

    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]]);
    const elevesNonTrouves = [];
    const elevesDejaNote = [];
    const elevesAjoutes = [];

    for (const row of data) {
      const Nom = row.Nom?.trim();
      const Prenom = row['Prénom']?.trim();
      const Note = row.Note !== undefined ? row.Note : null;

      if (!Nom || !Prenom) {
        console.warn(`⚠️ Élève ignoré (Nom ou Prénom manquant):`, row);
        continue;
      }

      const [eleves] = await db.query(
        'SELECT id FROM eleve WHERE nom = ? AND prenom = ? AND classe_id = ? AND etablissement_id = ?',
        [Nom, Prenom, classeId, etablissementId]
      );

      if (eleves.length === 0) {
        elevesNonTrouves.push(`${Nom} ${Prenom}`);
        continue;
      }

      const eleveId = eleves[0].id;

      // Vérifie si l'élève a déjà une note pour ce typeNote
      const [notesExistantes] = await db.query(
        `SELECT id FROM note 
         WHERE Eleves_id = ? AND ${updateField} IS NOT NULL
         AND Semestre_id = ? AND matieres_id = ? 
         AND classe_id = ? AND etablissement_id = ? 
         AND Annee_scolaire_id = ?`,
        [eleveId, semestreId, matiereId, classeId, etablissementId, anneeScolaireId]
      );

      if (notesExistantes.length > 0) {
        elevesDejaNote.push(`${Nom} ${Prenom}`);
        continue;
      }

      const noteValue = isNaN(Note) || Note === "" ? null : parseFloat(Note);

      await db.query(
        `INSERT INTO note (${updateField}, Eleves_id, Semestre_id, matieres_id, classe_id, etablissement_id, Annee_scolaire_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE ${updateField} = VALUES(${updateField})`,
        [noteValue, eleveId, semestreId, matiereId, classeId, etablissementId, anneeScolaireId]
      );

      elevesAjoutes.push(`${Nom} ${Prenom}`);
    }

    fs.unlinkSync(file.path);

    const messageParts = [`✅ Import terminé.`];

    if (elevesAjoutes.length > 0) {
      messageParts.push(`Notes ajoutées pour : ${elevesAjoutes.join(', ')}.`);
    }
    if (elevesDejaNote.length > 0) {
      messageParts.push(`Ignorés (déjà notés) : ${elevesDejaNote.join(', ')}.`);
    }
    if (elevesNonTrouves.length > 0) {
      messageParts.push(`Non trouvés : ${elevesNonTrouves.join(', ')}.`);
    }

    return res.send({
      message: messageParts.join(' '),
      details: {
        ajoutes: elevesAjoutes,
        dejaNote: elevesDejaNote,
        nonTrouves: elevesNonTrouves
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'importation des données Excel', error);
    res.status(500).send({ message: 'Erreur lors de l\'importation' });
  }
});

module.exports = router;
