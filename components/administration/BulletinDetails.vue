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
                <td>{{ calculateConduite() }}</td>
                <td>{{ calculateConduite() }}</td>
              </tr>
              <tr class="total-row">
                <td><strong>Total</strong></td>
                <td>{{ calculateTotalCoefficient(filteredNotes[eleve.id]) }}</td>
                <td></td>
                <td>{{ calculateTotalMoyCoef(filteredNotes[eleve.id]) }}</td>
              </tr>
              <tr>
                <td colspan="2">Moyenne Semestrielle:</td>
                <td colspan="2">{{ calculateMoySem(filteredNotes[eleve.id], eleve.id) }}</td>
              </tr>
              <tr>
                <td colspan="2">Rang:</td>
                <td colspan="2">{{ calculateRang(eleve.id) }}</td>
              </tr>
              <tr>
                <td colspan="2">Mention:</td>
                <td colspan="2">{{ calculateMention(calculateMoySem(filteredNotes[eleve.id], eleve.id)) }}</td>
              </tr>
              <tr v-if="isLastSemestre(selectedSemestre)">
                <td colspan="2">Moyenne Annuelle:</td>
                <td colspan="2">{{ calculateMoyAnnuelle(eleve.id) }}</td>
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
      coefConduite: 1,
      classeNom: '',
      noteConduiteIn: {},
      heuresParEleve: {},   // Pour stocker la somme d'heures de chaque élève
      notesConduite: {},    // Initialisation de notesConduite comme un objet vide
      seenEleves: new Set() // Pour suivre les élèves déjà vus pour le semestre sélectionné
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
          this.classeNom = data.classeNom;
          this.eleves = this.extractEleves(data.notes);
          this.notes = data.notes;
          this.heuresParEleve = data.notes.total_hours || {};
          this.notesConduite = data.notes.Conduite || {};
          this.etablissementStatut = data.etablissementStatut || "Inconnu";
          this.eleves.forEach(eleve => {
            this.filterNotesBySemestre(eleve.id);
            this.calculateMoySem(filteredNotes[eleve.id], eleve.id);
          });
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
      }
    },
    toggleEleve(eleveId) {
      this.activeEleve = this.activeEleve === eleveId ? null : eleveId;
      this.seenEleves.add(eleveId); // Marquer cet élève comme vu pour le semestre en cours
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
        this.heuresParEleve = note.total_hours;
        this.notesConduite = note.conduite;
        if (!groupedNotes[note.matiereId]) {
          groupedNotes[note.matiereId] = {
            matiere_id: note.matiereId,
            matiere_nom: matiere ? matiere.nom : 'Matière inconnue',
            coef_id: note.coefficientId,
            conduite_note: note.conduite,
            total_hours : note.total_hours,
            totalCoefficient: parseFloat(note.coefficient),
            totalMoy: parseFloat(note.moy) * parseFloat(note.coefficient),
            moycoef: 0,
          };
        }
      });

      this.filteredNotes[eleveId] = Object.values(groupedNotes).map(item => ({
        ...item,
        averageMoy: (item.totalMoy / item.totalCoefficient).toFixed(2),
        moycoef: item.totalMoy.toFixed(2),
      }));
    },
    calculateMoyAnnuelle(eleveId) {
      const moyennes = Object.values(this.moyennesSemestrielles).filter(m => m);
      return moyennes.reduce((sum, moy) => sum + parseFloat(moy), 0) / moyennes.length;
    },

    isLastSemestre(semestreId) {
      return this.semestres.length && semestreId === this.semestres[this.semestres.length - 1].id;
    },

    decision(eleveId) {
      const moyenneAnnuelle = this.calculateMoyAnnuelle(eleveId);
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
      const notesEleve = this.filteredNotes[eleveId];

      // Vérification des conditions avant la sauvegarde
      if (!this.selectedSemestre) {
        this.message = "Veuillez sélectionner un semestre.";
        this.dialogTitle = 'Erreur';
        this.dialog = true;
        return;
      }

      if (!notesEleve || notesEleve.length === 0) {
        this.message = "Veuillez bien vouloir cliquer sur le semestre dont le bulletin veut être sauvegardé et parcourir tous les élèves de la classe pour ce même semestre avant de commencer la sauvegarde.";
        this.dialogTitle = 'Erreur';
        this.dialog = true;
        return;
      }

      // Vérification si tous les élèves ont été parcourus pour le semestre sélectionné
      if (this.seenEleves.size !== this.eleves.length) {
        this.message = "Veuillez parcourir tous les élèves pour le même semestre sélectionné avant de sauvegarder.";
        this.dialogTitle = 'Erreur';
        this.dialog = true;
        return;
      }

      const bulletinData = notesEleve.map(note => ({
        eleve_id: eleveId,
        semestre_id: this.selectedSemestre,
        matiere_id: note.matiere_id,
        coef_id: note.coef_id,
        moy: note.averageMoy,
        moycoef: note.moycoef,
        total: this.calculateTotalMoyCoef(notesEleve),
        moySem: this.calculateMoySem(notesEleve),
        rang: this.calculateRang(eleveId),
        mention: this.calculateMention(this.calculateMoySem(notesEleve)),
        conduite: this.calculateConduite()
      }));

      try {
        const response = await axios.post('http://localhost:8080/api/save-bulletin', bulletinData);
        this.message = 'Bulletin sauvegardé avec succès !';
        this.dialogTitle = 'Succès';
        this.dialog = true;
      } catch (error) {
        if (error.response && error.response.status === 409) {
          this.message = `Un bulletin a déjà été sauvegardé pour l'élève ${this.eleves.find(e => e.id === eleveId).nom} ${this.eleves.find(e => e.id === eleveId).prenom} pour le ${this.semestres.find(s => s.id === this.selectedSemestre).nom}.`;
          this.dialogTitle = 'Erreur';
        } else {
          this.message = 'Erreur lors de la sauvegarde du bulletin.';
          this.dialogTitle = 'Erreur';
        }
        this.dialog = true;
      }
    },
    closeDialog() {
      this.dialog = false;
      this.message = '';
    },
    calculateConduite() {
      const totalHours = this.heuresParEleve;
      const conduite = this.notesConduite;
      if (!conduite) return 0;
      this.noteConduiteIn = conduite - totalHours / 2;
      return (this.noteConduiteIn).toFixed(2);
    },
    calculateTotalCoefficient(notes) {
      return (notes.reduce((sum, note) => sum + parseFloat(note.totalCoefficient), 0) + this.coefConduite).toFixed(2);
    },
    calculateTotalMoyCoef(notes, eleveId) {
      const totalMoyCoef = notes.reduce((sum, note) => sum + parseFloat(note.moycoef), 0);
      const conduite = parseFloat(this.calculateConduite(eleveId));
      return (totalMoyCoef + conduite).toFixed(2);
    },
    calculateMoySem(notes, eleveId) {
      const totalMoyCoef = parseFloat(this.calculateTotalMoyCoef(notes, eleveId));
      const totalCoef = parseFloat(this.calculateTotalCoefficient(notes));
      return (totalMoyCoef / totalCoef).toFixed(2);
    },
    calculateRang(eleveId) {
      const sortedMoyennes = Object.entries(this.moyennesSemestrielles)
        .sort(([, moyA], [, moyB]) => moyB - moyA);
      const rang = sortedMoyennes.findIndex(([id]) => parseInt(id) === eleveId) + 1;

      if (rang === 1) return '1er';
      if (rang === 2) return '2e';
      if (rang === 3) return '3e';
      return `${rang}e`;
    },
    calculateMention(moyenne) {
      if (moyenne >= 16) return 'Très Bien';
      if (moyenne >= 14) return 'Bien';
      if (moyenne >= 12) return 'Assez Bien';
      if (moyenne >= 10) return 'Passable';
      return 'Insuffisant';
    },
    calculateAllMoyennesSem() {
      this.eleves.forEach(eleve => {
        this.moyennesSemestrielles[eleve.id] = parseFloat(
          this.calculateMoySem(this.filteredNotes[eleve.id])
        );
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
  