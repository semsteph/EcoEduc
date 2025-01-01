<template>
  <div class="container">
    <h1>Liste des élèves</h1>

    <div v-if="eleves.length === 0">
      <p class="no-data">
        Aucune donnée n'est encore disponible pour cette classe ou aucun élève n'est encore inscrit.
      </p>
    </div>

    <div v-else>
      <div>
        <h2>Classe : {{ classeNom }}</h2>
      </div>

      <div v-for="eleve in eleves" :key="eleve.id" class="eleve-item">
        <div class="eleve-header" @click="toggleEleve(eleve.id)">
          {{ eleve.nom }} {{ eleve.prenom }}
          <span class="icon">{{ activeEleve === eleve.id ? '-' : '+' }}</span>
        </div>

        <div v-if="activeEleve === eleve.id" class="eleve-details">
          <div class="eleve-info">
            <button @click="saveBulletin(eleve.id)" class="save-btn">Sauvegarder</button>
            <h3>Détails de l'élève</h3>
            <p><strong>Nom :</strong> {{ eleve.nom }}</p>
            <p><strong>Prénom :</strong> {{ eleve.prenom }}</p>
            <p><strong>Classe :</strong> {{ classeNom }}</p>
          </div>

          <div>
            <label for="semestre">Semestres :</label>
            <div class="semestres">
              <button
                v-for="semestre in semestres"
                :key="semestre.id"
                @click="selectSemestre(semestre.id, eleve.id)"
                :class="{ active: selectedSemestre === semestre.id }"
                class="semestre-btn"
              >
                {{ semestre.nom }}
              </button>
            </div>
          </div>

          <table v-if="filteredNotes[eleve.id] && filteredNotes[eleve.id].length" class="notes-table">
            <thead>
              <tr>
                <th>Matières</th>
                <th>Coef</th>
                <th>Moy</th>
                <th>Moy Coef</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="note in filteredNotes[eleve.id]" :key="note.matiere_id">
                <td>{{ note.matiere_nom }}</td>
                <td>{{ note.totalCoefficient }}</td>
                <td>{{ note.averageMoy }}</td>
                <td>{{ note.moycoef }}</td>
              </tr>
              <tr>
                <td><strong>Conduite</strong></td>
                <td>{{ coefConduite }}</td>
                <td>{{ calculateConduite(eleve.id) }}</td>
                <td>{{ calculateConduite(eleve.id) }}</td>
              </tr>
              <tr class="total-row">
                <td><strong>Total</strong></td>
                <td>{{ calculateTotalCoefficient(filteredNotes[eleve.id]) }}</td>
                <td></td>
                <td>{{ calculateTotalMoyCoef(filteredNotes[eleve.id], eleve.id) }}</td>
              </tr>
              <tr>
                <td colspan="2">Moyenne Semestrielle:</td>
                <td colspan="2">{{ calculateMoySem(filteredNotes[eleve.id], eleve.id) }}</td>
              </tr>
              <tr>
                <td colspan="2">Rang:</td>
                <td colspan="2">{{ calculateRang(eleve.id, selectedSemestre) }}</td>
              </tr>
              <tr>
                <td colspan="2">Mention:</td>
                <td colspan="2">{{ calculateMention(calculateMoySem(filteredNotes[eleve.id], eleve.id)) }}</td>
              </tr>
              <tr v-if="isLastSemestre(selectedSemestre)">
                <td colspan="2">Moyenne Annuelle:</td>
                <td colspan="2">{{ moyennesAnnuelles[eleve.id] !== undefined ? moyennesAnnuelles[eleve.id] : 'Non calculée' }}</td>

              </tr>
              <tr v-if="isLastSemestre(selectedSemestre)">
                <td colspan="2">Décision:</td>
                <td colspan="2">{{ decision(eleve.id) }}</td>
              </tr>
            </tbody>
          </table>

          <p v-else class="no-data">
            Aucune note disponible pour cet élève dans le semestre sélectionné.
          </p>
        </div>
      </div>
    </div>

    <v-dialog v-model="dialog" max-width="400" class="custom-dialog">
      <v-card>
        <v-card-title>
          <span class="headline">{{ dialogTitle }}</span>
        </v-card-title>
        <v-card-text>
          <p>{{ message }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="closeDialog">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import axios from 'axios';
export default {
  props: {
    classId: {
      type: Number,
      required: true,
    },
    classeNom: {
      type: String,
      required: true,
    },
    etablissementId: {
      type: Number,
      required: true
    },
    etablissementNom: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      eleves: [],
      semestres: [],
      matieres: [],
      notes: {},
      filteredNotes: {}, // Initialisation correcte ici
      moyennesSemestrielles: {},
      selectedSemestre: null,
      activeEleve: null,
      message: '',           // État pour le message de succès ou d'erreur
      dialog: false,         // État pour contrôler l'affichage du dialog
      dialogTitle: '',       // Titre du dialog
      coefConduite: 1,
      classeNom: '',
      noteConduiteIn: {},
      heuresParEleve: {},    // Pour stocker la somme d'heures de chaque élève
      notesConduite: {},     // Initialisation de notesConduite comme un objet vide
      moyennesAnnuelles: {},
      seenEleves: new Set(), // Pour suivre les élèves déjà vus pour le semestre sélectionné     etablissementStatut: '' // Pour stocker le statut de l'établissement
    };
  },
  methods: {
    async fetchBulletin() {
      try {
        const response = await axios.get('http://localhost:8080/api/bulletin', {
          params: { classeId: this.classId },
        });
        const data = response.data;

        // Affichage de la structure complète de la réponse pour le débogage
        console.log('Données brutes récupérées :', JSON.stringify(data, null, 2));

        // Correction : Vérification de l'existence de `notes`
        if (!data.notes || Object.keys(data.notes).length === 0) {
          console.error("Erreur : 'notes' est manquant ou vide dans les données reçues.");
          this.notes = {}; // Sécurisation
          return;
        }

        // Correction : Vérification si les tableaux attendus sont valides
        if (!data.semestres || !Array.isArray(data.semestres)) {
          console.warn("Attention : 'semestres' est manquant ou n'est pas un tableau.");
          this.semestres = [];
        } else {
          this.semestres = data.semestres;
        }

        if (!data.matieres || !Array.isArray(data.matieres)) {
          console.warn("Attention : 'matieres' est manquant ou n'est pas un tableau.");
          this.matieres = [];
        } else {
          this.matieres = data.matieres;
        }

        this.classeNom = data.classeNom || '';
        this.eleves = this.extractEleves(data.notes);
        this.notes = data.notes;

        // Initialisation des objets de calcul
        this.heuresParEleve = {};
        this.notesConduite = {};
        this.moyennesSemestrielles = {};
        this.moyennesAnnuelles = {};

        if (this.semestres.length > 0) {
          this.selectedSemestre = this.semestres[0].id;
          console.log('Semestre par défaut sélectionné :', this.selectedSemestre);
        } else {
          console.warn('Aucun semestre trouvé dans les données récupérées.');
          return;
        }

        this.eleves.forEach((eleve) => {
          this.moyennesSemestrielles[eleve.id] = {};
          this.heuresParEleve[eleve.id] = {};
          this.notesConduite[eleve.id] = {};

          this.semestres.forEach((semestre) => {
            // Correction : Vérification sécurisée des données avant calcul
            if (!this.notes[semestre.id]) {
              this.notes[semestre.id] = []; // Sécurisation
            }

            const moyenne = this.calculateMoySem(this.filteredNotes[eleve.id] || [], eleve.id);
            console.log(
              `Moyenne calculée pour élève ${eleve.id} semestre ${semestre.id} : ${moyenne}`
            );
            this.moyennesSemestrielles[eleve.id][semestre.id] = moyenne || 'Non calculée';
          });
        });

        this.eleves.forEach((eleve) => {
          this.filterNotesBySemestre(eleve.id, this.selectedSemestre);
        });

        this.eleves.forEach((eleve) => {
          this.calculateMoyenneAnnuelle(eleve.id);
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des données :', error);
      }
    },



    toggleEleve(eleveId) {
      this.activeEleve = this.activeEleve === eleveId ? null : eleveId;
      this.seenEleves.add(eleveId); // Marquer cet élève comme vu pour le semestre en cours
    },
   

    filterNotesBySemestre(eleveId, semestreId) {
      if (!eleveId || !semestreId) {
        return;
      }

      // Correction : Vérification de l'existence de notes pour le semestre
      if (!this.notes[semestreId]) {
        console.warn(`Notes non disponibles pour le semestre ${semestreId}`);
        this.filteredNotes[eleveId] = [];
        this.heuresParEleve[eleveId][semestreId] = 0;
        this.notesConduite[eleveId][semestreId] = 0;
        return;
      }

      const semestreNotes = this.notes[semestreId].filter((note) => note.eleveId === eleveId);

      this.heuresParEleve[eleveId][semestreId] = 0;
      this.notesConduite[eleveId][semestreId] = 0;

      if (semestreNotes.length === 0) {
        return;
      }

      const groupedNotes = {};
      semestreNotes.forEach((note) => {
        const noteHours = parseFloat(note.total_hours) || 0;
        this.heuresParEleve[eleveId][semestreId] += noteHours;
        this.notesConduite[eleveId][semestreId] = parseFloat(note.conduite) || 0;

        const matiere = this.matieres.find((m) => m.id === note.matiereId);
        if (!groupedNotes[note.matiereId]) {
          groupedNotes[note.matiereId] = {
            matiere_id: note.matiereId,
            matiere_nom: matiere ? matiere.nom : 'Matière inconnue',
            coef_id: note.coefficientId,
            total_hours: 0,
            conduite_note: 0,
            totalCoefficient: 0,
            totalMoy: 0,
          };
        }

        groupedNotes[note.matiereId].total_hours += noteHours;
        groupedNotes[note.matiereId].conduite_note = this.notesConduite[eleveId][semestreId];
        groupedNotes[note.matiereId].totalCoefficient += parseFloat(note.coefficient || 1);
        groupedNotes[note.matiereId].totalMoy += parseFloat(note.moy || 0) * parseFloat(note.coefficient || 1);
      });

      this.filteredNotes[eleveId] = Object.values(groupedNotes).map((item) => {
        const averageMoy = (item.totalMoy / item.totalCoefficient).toFixed(2);
        return {
          ...item,
          averageMoy: averageMoy,
          moycoef: item.totalMoy.toFixed(2),
        };
      });
    },
calculateConduite(eleveId) {
    // Récupère les valeurs pour le semestre sélectionné
    const totalHours = (this.heuresParEleve[eleveId] && this.heuresParEleve[eleveId][this.selectedSemestre]) || 0;
    const conduite = (this.notesConduite[eleveId] && this.notesConduite[eleveId][this.selectedSemestre]) || 0;

    console.log(`Heures pour l'élève ${eleveId}, semestre ${this.selectedSemestre} : ${totalHours}`);
    console.log(`Conduite pour l'élève ${eleveId}, semestre ${this.selectedSemestre} : ${conduite}`);

    if (conduite === 0) return 0;  // Si la conduite est à zéro, retourne 0

    // Calcule la note de conduite avec une formule personnalisée
    const noteFinale = conduite - totalHours / 2;
    console.log(`Note finale de conduite calculée : ${noteFinale}`);
    this.noteConduiteIn[eleveId] = noteFinale;
    return noteFinale.toFixed(2);
},


selectSemestre(semestreId, eleveId) {
      this.selectedSemestre = semestreId;
      this.filterNotesBySemestre(eleveId, semestreId);

      // Calcul de la moyenne semestrielle pour cet élève et ce semestre
      const moyenneSem = this.calculateMoySem(this.filteredNotes[eleveId], eleveId);
      this.moyennesSemestrielles[eleveId][semestreId] = moyenneSem;
      console.log(`Moyenne semestrielle stockée pour l'élève ${eleveId}, semestre ${semestreId}: ${moyenneSem}`);

      // Si tous les semestres ont été parcourus, calculer la moyenne annuelle
      if (Object.keys(this.moyennesSemestrielles[eleveId]).length === this.semestres.length) {
        this.calculateMoyenneAnnuelle(eleveId);
      }
    },


    isLastSemestre(semestreId) {
      return this.semestres.length && semestreId === this.semestres[this.semestres.length - 1].id;
    },

    decision(eleveId) {
      const moyenneAnnuelle = this.moyennesAnnuelles[eleveId];
      return moyenneAnnuelle >= 10 ? 'Passage' : 'Redoublement';
    },
    extractEleves(notes) {
    const elevesMap = new Map();
    Object.keys(notes).forEach(semestreId => {
        notes[semestreId].forEach(note => {
            if (!elevesMap.has(note.eleveId)) {
                elevesMap.set(note.eleveId, {
                    id: note.eleveId,
                    nom: note.nom,
                    prenom: note.prenom,
                });
            }
        });
    });
    return Array.from(elevesMap.values());
},

async saveBulletin(eleveId) {
  // Vérification du semestre sélectionné
  if (!this.selectedSemestre) {
    this.message = "Veuillez sélectionner un semestre.";
    this.dialogTitle = "Erreur";
    this.dialog = true;
    return;
  }

  const notesEleve = this.filteredNotes[eleveId];
  if (!notesEleve || notesEleve.length === 0) {
    this.message = "Aucune note trouvée pour cet élève.";
    this.dialogTitle = "Erreur";
    this.dialog = true;
    return;
  }

  // Vérification si tous les élèves ont été parcourus pour le semestre sélectionné
  if (this.seenEleves.size !== this.eleves.length) {
    this.message =
      "Veuillez parcourir tous les élèves pour le même semestre sélectionné avant de sauvegarder.";
    this.dialogTitle = "Erreur";
    this.dialog = true;
    return;
  }

  try {
    // Préparation des données pour l'élève
    const isLastSemestre = this.isLastSemestre(this.selectedSemestre);
    const moyenneSem = this.moyennesSemestrielles[eleveId][this.selectedSemestre] || "Non calculée";
    const conduite = this.noteConduiteIn[eleveId] || 0;
    const totalMoyCoef = this.calculateTotalMoyCoef(notesEleve, eleveId);
    const moyenneAnnuelle = isLastSemestre ? this.moyennesAnnuelles[eleveId] : null;
    const mention = this.calculateMention(moyenneSem);
    const rang = this.calculateRang(eleveId, this.selectedSemestre);

    const bulletinData = notesEleve.map(note => ({
      eleve_id: eleveId,
      semestre_id: this.selectedSemestre,
      matiere_id: note.matiere_id,
      coef_id: note.coef_id || null,
      moy: note.averageMoy || 0,
      moycoef: note.moycoef || 0,
      total: totalMoyCoef,
      moySem: moyenneSem,
      rang: rang || "Non classé",
      mention: mention || "Non défini",
      conduite: conduite,
      moyAn: moyenneAnnuelle,
      decision: isLastSemestre 
        ? (moyenneAnnuelle >= 10 ? "Admis" : "Redoublant") 
        : null,
      etablissement_id: this.etablissementId,
    }));

    // Envoi des données au backend
    const response = await axios.post("http://localhost:8080/api/save-bulletin", {
      bulletin: bulletinData,
    });

    // Gestion des réponses du backend
    if (response.data && response.data.message) {
      this.message = response.data.message;
      this.dialogTitle = "Succès";
    } else {
      this.message = "Bulletin sauvegardé avec succès !";
      this.dialogTitle = "Succès";
    }

    this.dialog = true;
  } catch (error) {
    // Gestion des erreurs spécifiques renvoyées par le backend
    if (
      error.response &&
      error.response.data &&
      error.response.data.message
    ) {
      // Vérifie si le message d'erreur correspond à un bulletin existant
      if (error.response.data.type === "BULLETIN_EXISTS") {
        const { eleveNom, elevePrenom, semestreNom } = error.response.data.details;
        this.message = `Un bulletin a déjà été enregistré pour l'élève ${eleveNom} ${elevePrenom} pour le semestre ${semestreNom}.`;
      } else {
        this.message = error.response.data.message;
      }
    } else {
      this.message = "Erreur lors de la sauvegarde du bulletin.";
    }

    console.error("Erreur lors de la sauvegarde du bulletin :", error);
    this.dialogTitle = "Erreur";
    this.dialog = true;
  }
},


    closeDialog() {
      this.dialog = false;
      this.message = '';
    },
  
    calculateTotalCoefficient(notes) {
      return (notes.reduce((sum, note) => sum + parseFloat(note.totalCoefficient), 0) + this.coefConduite).toFixed(2);
    },
    calculateTotalMoyCoef(notes, eleveId) {
      const totalMoyCoef = notes.reduce((sum, note) => sum + parseFloat(note.moycoef), 0);
      console.log(totalMoyCoef);
      const conduite = parseFloat(this.calculateConduite(eleveId));
      console.log(conduite);
      const totalMoyCoefge = (totalMoyCoef + conduite).toFixed(2);
      console.log(totalMoyCoefge);
      return totalMoyCoefge ;
    },
    calculateMoySem(notes, eleveId) {
  const totalMoyCoef = parseFloat(this.calculateTotalMoyCoef(notes, eleveId));
  const totalCoef = parseFloat(this.calculateTotalCoefficient(notes));
  
  if (totalCoef === 0) {
    console.warn(`Coefficient total nul pour l'élève ${eleveId}.`);
    return 0; // Pour éviter la division par zéro
  }
  
  const moyenneSemestrielle = (totalMoyCoef / totalCoef).toFixed(2);
  console.log(`Moyenne semestrielle calculée pour l'élève ${eleveId}: ${moyenneSemestrielle}`);
  return parseFloat(moyenneSemestrielle); // S'assure qu'une valeur numérique est retournée
},
async calculateMoyenneAnnuelle(eleveId) {
      try {
        const response = await axios.get('http://localhost:8080/api/etablissementStatut', {
          params: { etablissementId: this.etablissementId },
        });
        let statutEtablissement = response.data.statut?.toLowerCase();
        if (statutEtablissement === 'public') statutEtablissement = 'publique';
        if (statutEtablissement === 'prive') statutEtablissement = 'prive';

        const moyennes = Object.values(this.moyennesSemestrielles[eleveId]).filter((m) => !isNaN(m));

        if (moyennes.length === 0) {
          this.moyennesAnnuelles[eleveId] = 'Non calculée';
          return;
        }

        const totalSemestres = moyennes.length;
        const dernierSemestre = moyennes[totalSemestres - 1];
        const autresSemestres = moyennes.slice(0, -1).reduce((sum, moy) => sum + moy, 0);

        let moyenneAnnuelle;
        if (statutEtablissement === 'publique') {
          moyenneAnnuelle = (((dernierSemestre * 2) + autresSemestres) / 3).toFixed(2);
        } else if (statutEtablissement === 'prive') {
          moyenneAnnuelle = (((dernierSemestre * 2) + autresSemestres) / 4).toFixed(2);
        }

        this.moyennesAnnuelles[eleveId] = parseFloat(moyenneAnnuelle);
        console.log(`Moyenne annuelle pour l'élève ${eleveId} : ${moyenneAnnuelle}`);
      } catch (error) {
        console.error('Erreur lors du calcul de la moyenne annuelle :', error);
        this.moyennesAnnuelles[eleveId] = 'Erreur de calcul';
      }
    },

    calculateRang(eleveId, semestre) {
  // Vérification des moyennes semestrielles
  if (!this.moyennesSemestrielles || Object.keys(this.moyennesSemestrielles).length === 0) {
    console.warn("Les moyennes semestrielles ne sont pas définies.");
    return "Non classé";
  }

  // Création d'une liste des moyennes pour le semestre spécifié
  const moyennesSemestre = Object.entries(this.moyennesSemestrielles)
    .map(([id, semestres]) => ({ 
      id: parseInt(id), 
      moyenne: semestres[semestre] 
    }))
    .filter(({ moyenne }) => !isNaN(moyenne)) // Exclure les moyennes non valides
    .sort((a, b) => b.moyenne - a.moyenne); // Trier par ordre décroissant des moyennes

  console.log(`Moyennes triées pour le semestre ${semestre}:`, moyennesSemestre);

  // Trouver l'index de l'élève dans la liste triée
  const rang = moyennesSemestre.findIndex(({ id }) => id === eleveId) + 1;

  // Vérification du rang trouvé
  if (rang === 0) {
    console.warn(`Élève avec l'ID ${eleveId} non trouvé dans les moyennes pour le semestre ${semestre}.`);
    return "Non classé";
  }

  // Retourner le rang avec le suffixe correct
  if (rang === 1) return "1er";
  if (rang === 2) return "2e";
  if (rang === 3) return "3e";
  return `${rang}e`;
},

    
    calculateMention(moyenne) {
      if (moyenne >= 16) return 'Très Bien';
      if (moyenne >= 14) return 'Bien';
      if (moyenne >= 12) return 'Assez Bien';
      if (moyenne >= 10) return 'Passable';
      return 'Insuffisant';
    },
    
  },
  mounted() {
    this.fetchBulletin();
  }
};


</script>
  
  <style scoped>
  .container {
    font-family: 'Arial', sans-serif;
    padding: 20px;
    max-width: 1000px;
    margin: auto;
  }
  
  .eleve-item {
    border: 1px solid #007BFF;
    margin-bottom: 20px;
    border-radius: 10px;
    background-color: #E3F2FD;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .eleve-header {
    padding: 15px;
    cursor: pointer;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    align-items: center;

  }
  
  .eleve-details {
    padding: 20px;
  }
  
  .eleve-info {
    margin-bottom: 20px;
  }
  
  .semestres {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .semestre-btn {
    background-color: #007BFF;
    color: #fff;
    border: none;
    border-radius: 5px;
    padding: 10px;
    cursor: pointer;
  }
  
  .semestre-btn.active {
    background-color: #0056b3;
  }
  
  .notes-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .notes-table th, .notes-table td {
    border: 1px solid #007BFF;
    padding: 10px;
    text-align: center;
  }
  
  .total-row {
    font-weight: bold;
  }
  .save-btn {
  margin-top: 10px;
  padding: 10px 20px;
  background-color: #28a745;
  color: white;
  border: none;
  cursor: pointer;
}

.save-btn:hover {
  background-color: #218838;
}
  
  .no-data {
    color: red;
    font-weight: bold;
  }
  .message {
  margin-top: 20px;
  padding: 10px;
  border-radius: 5px;
}

.success-message {
  background-color: #d4edda;
  color: #155724;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
}
/* Styles pour le v-dialog */
.custom-dialog .v-card {
  background-color: #f9f9f9; /* Couleur de fond du dialog */
  border-radius: 8px; /* Coins arrondis */
}

.custom-dialog .v-card-title {
  font-weight: bold; /* Titre en gras */
  color: #333; /* Couleur du texte */
}

.custom-dialog .v-card-text {
  color: #555; /* Couleur du texte */
}

.custom-dialog .v-btn {
  background-color: #007bff; /* Couleur du bouton */
  color: white; /* Couleur du texte du bouton */
}

.custom-dialog .v-btn:hover {
  background-color: #0056b3; /* Couleur du bouton au survol */
}
  </style>
  