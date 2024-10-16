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
            <p><strong>Classe :</strong> {{ eleve.classeNom }}</p>
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
              <!-- Ligne Total -->
              <tr class="total-row">
                <td><strong>Total</strong></td>
                <td>{{ calculateTotalCoefficient(filteredNotes[eleve.id]) }}</td>
                <td></td>
                <td>{{ calculateTotalMoyCoef(filteredNotes[eleve.id]) }}</td>
              </tr>
              <!-- Ligne Conduite -->
              <tr>
                <td><strong>Conduite</strong></td>
                <td>1</td> <!-- Coefficient de la conduite -->
                <td>{{ calculateConduite(eleve.id) }}</td> <!-- Note de conduite calculée -->
                <td>{{ calculateConduite(eleve.id) }}</td> <!-- Moy Coef pour la conduite = note de conduite * 1 -->
              </tr>
              <!-- Moyenne Semestrielle -->
              <tr>
                <td colspan="2">Moyenne Semestrielle:</td>
                <td colspan="2">{{ calculateMoySem(filteredNotes[eleve.id], eleve.id) }}</td>
              </tr>
              <!-- Rang -->
              <tr>
                <td colspan="2">Rang:</td>
                <td colspan="2">{{ calculateRang(eleve.id) }}</td>
              </tr>
              <!-- Mention -->
              <tr>
                <td colspan="2">Mention:</td>
                <td colspan="2">{{ calculateMention(calculateMoySem(filteredNotes[eleve.id], eleve.id)) }}</td>
              </tr>
            </tbody>
          </table>

          <p v-else class="no-data">
            Aucune note disponible pour cet élève dans le semestre sélectionné.
          </p>
        </div>
      </div>
    </div>
    
    <!-- Dialog de succès ou d'erreur -->
    <v-dialog v-model="dialog" max-width="400">
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
  },
  data() {
    return {
      eleves: [],
      semestres: [],
      matieres: [],
      notes: {},
      filteredNotes: {},
      moyennesSemestrielles: {},
      selectedSemestre: null,
      activeEleve: null,
      message: '',           // État pour le message de succès ou d'erreur
      dialog: false,        // État pour contrôler l'affichage du dialog
      dialogTitle: '',      // Titre du dialog
      heuresParEleve: {},   // Pour stocker la somme d'heures de chaque élève
      notesConduite: {},    // Initialisation de notesConduite comme un objet vide
    };
  },
  methods: {
    async fetchBulletin() {
      try {
        const response = await axios.get('http://localhost:8080/api/bulletin', {
          params: { classeId: this.classId }
        });
        const data = response.data;
        console.log(response.data);

        if (data && data.notes) {
          this.semestres = data.semestres;
          this.matieres = data.matieres;
          this.eleves = this.extractEleves(data.notes);
          this.notes = data.notes;
          this.heuresParEleve = data.notes.total_hours || {}; // Initialiser si non défini
          this.notesConduite = data.notes.Conduite || {};   // Initialiser si non défini
          this.eleves.forEach(eleve => {
            this.filterNotesBySemestre(eleve.id);
          });
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
      }
    },
    toggleEleve(eleveId) {
      this.activeEleve = this.activeEleve === eleveId ? null : eleveId;
    },
    selectSemestre(semestreId, eleveId) {
      this.selectedSemestre = semestreId;
      this.filterNotesBySemestre(eleveId);
      this.calculateAllMoyennesSem();
    },
    filterNotesBySemestre(eleveId) {
      if (!this.selectedSemestre || !this.notes[this.selectedSemestre]) {
        this.filteredNotes[eleveId] = [];
        return;
      }

      const semestreNotes = this.notes[this.selectedSemestre].filter(note => note.eleveId === eleveId);
      const groupedNotes = {};

      semestreNotes.forEach(note => {
        const matiere = this.matieres.find(m => m.id === note.matiereId);
        if (!groupedNotes[note.matiereId]) {
          groupedNotes[note.matiereId] = {
            matiere_id: note.matiereId,
            matiere_nom: matiere ? matiere.nom : 'Matière inconnue',
            coef_id: note.coefficientId,
            conduite: note.conduite,
            total_hours: note.total_hours,
            totalCoefficient: parseFloat(note.coefficient),
            totalMoy: parseFloat(note.moy) * parseFloat(note.coefficient),
            moycoef: 0,
          };
          console.log(note.conduite);
        }
        console.log(note.conduite);
      });

      this.filteredNotes[eleveId] = Object.values(groupedNotes).map(item => ({
        ...item,
        averageMoy: (item.totalMoy / item.totalCoefficient).toFixed(2),
        moycoef: item.totalMoy.toFixed(2),
      }));
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
    calculateConduite(eleveId) {
      // Vérifier si la note de conduite existe pour le semestre et l'élève donné
      const conduite = this.notesConduite[this.selectedSemestre]?.find(
        item => item.eleveId === eleveId
      );

      // Vérifier si la somme des heures existe pour l'élève
      const totalHours = this.heuresParEleve[eleveId] || 0;

      // Si aucune note de conduite n'est trouvée, retourner 0
      if (!conduite) return 0;

      // Calcul : (conduite - total_hours) / 2
      const noteConduite = conduite.note - totalHours;
      return (noteConduite / 2).toFixed(2); // Formater la note à deux décimales
    },
    calculateTotalCoefficient(notes) {
      return notes.reduce((sum, note) => sum + parseFloat(note.totalCoefficient), 0).toFixed(2);
    },
    calculateTotalMoyCoef(notes) {
      return notes.reduce((sum, note) => sum + parseFloat(note.moycoef), 0).toFixed(2);
    },
    calculateMoySem(notes, eleveId) {
      const totalMoyCoef = this.calculateTotalMoyCoef(notes);
      const totalCoef = parseFloat(this.calculateTotalCoefficient(notes)) + 1; // Ajout du coefficient pour la conduite
      const conduite = this.calculateConduite(eleveId);
      return ((parseFloat(totalMoyCoef) + parseFloat(conduite)) / totalCoef).toFixed(2);
    },
    calculateRang(eleveId) {
      // Placeholder pour le calcul du rang de l'élève
      return "1er";
    },
    calculateMention(moyenneSemestrielle) {
      if (moyenneSemestrielle >= 16) {
        return "Très bien";
      } else if (moyenneSemestrielle >= 14) {
        return "Bien";
      } else if (moyenneSemestrielle >= 12) {
        return "Assez bien";
      } else {
        return "Passable";
      }
    },
    saveBulletin(eleveId) {
      // Implémentation pour sauvegarder les notes du bulletin de l'élève
      console.log(`Sauvegarde des données du bulletin pour l'élève avec ID : ${eleveId}`);
    },
    closeDialog() {
      this.dialog = false;
    },
    calculateAllMoyennesSem() {
      this.eleves.forEach(eleve => {
        this.moyennesSemestrielles[eleve.id] = this.calculateMoySem(this.filteredNotes[eleve.id], eleve.id);
      });
    }
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
  