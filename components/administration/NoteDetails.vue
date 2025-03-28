<template>
  <div class="container">
    <h1>Cahier de Notes</h1>
    <!-- Vérification si les matières sont disponibles -->
    <div v-if="matieres.length === 0">
      <p class="no-data">
        Aucune donnée n'est encore disponible pour cette classe ou le cahier de notes n'est pas encore disponible pour cette classe.
      </p>
    </div>

    <!-- Affichage des matières -->
    <div v-else>
      <div v-for="matiere in matieres" :key="matiere.id" class="matiere">
        <div class="matiere-header" @click="toggleMatiere(matiere.id)">
          {{ matiere.nom }}
          <span class="icon">{{ activeMatiere === matiere.id ? '-' : '+' }}</span>
        </div>

        <!-- Affichage des détails de la matière lorsque celle-ci est active -->
        <div v-if="activeMatiere === matiere.id" class="matiere-details">
          <!-- Sélection des semestres -->
          <div class="semestres">
            <button
              v-for="semestre in semestres"
              :key="semestre.id"
              @click="selectSemestre(semestre.id)"
              :class="{ active: selectedSemestre === semestre.id }"
              class="semestre-btn"
            >
              {{ semestre.nom }}
            </button>
          </div>

          <!-- Tableau des notes pour chaque matière -->
          <table v-if="getUniqueElevesForMatiere(matiere.id).length" class="notes-table">
            <thead>
              <tr>
                <th>Nom/Prenom</th>
                <th>Inter1</th>
                <th>Inter2</th>
                <th>Inter3</th>
                <th>Inter4</th>
                <th>Moy Inter</th>
                <th>Dev1</th>
                <th>Dev2</th>
                <th>Moy</th>
                <th>Moy Coef</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="eleve in getUniqueElevesForMatiere(matiere.id)" :key="eleve.eleveId">
                <td>{{ eleve.nom }} {{ eleve.prenom }}</td>
                <td>{{ eleve.inter1 || '' }}</td>
                <td>{{ eleve.inter2 || '' }}</td>
                <td>{{ eleve.inter3 || '' }}</td>
                <td>{{ eleve.inter4 || '' }}</td>
                <td>{{ eleve.moyInter || '' }}</td>
                <td>{{ eleve.dev1 || '' }}</td>
                <td>{{ eleve.dev2 || '' }}</td>
                <td>{{ eleve.moy || '' }}</td>
                <td>{{ eleve.moycoef || '' }}</td>
              </tr>
            </tbody>
          </table>

          <!-- Message si aucune note n'est disponible -->
          <p v-else class="no-data">
            Aucune note disponible pour cette matière dans le semestre sélectionné.
          </p>
        </div>
      </div>
    </div>
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

    anneeScolaire: {
      type: String,
      required: true
    },
    anneeScolaireId: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      semestres: [],
      matieres: [],
      allNotes: {},
      filteredNotes: [],
      selectedSemestre: null,
      activeMatiere: null,
    };
  },
  methods: {
    async fetchData() {
      try {
        const response = await axios.get('http://localhost:8080/api/classe-details', {
          params: {
            classeId: this.classId,
            anneeScolaireId: this.anneeScolaireId,

          },
        });

        this.semestres = response.data.semestres || [];
        this.matieres = response.data.matieres || [];
        this.allNotes = response.data.notes || {};

        if (this.semestres.length) {
          this.selectedSemestre = this.semestres[0].id;
          this.filterNotes();
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données :', error);
      }
    },
    toggleMatiere(matiereId) {
      this.activeMatiere = this.activeMatiere === matiereId ? null : matiereId;
    },
    selectSemestre(semestreId) {
      this.selectedSemestre = semestreId;
      this.filterNotes();
    },
    filterNotes() {
      if (!this.selectedSemestre) return;
      this.filteredNotes = this.allNotes[this.selectedSemestre] || [];
    },
    getUniqueElevesForMatiere(matiereId) {
      const notes = this.filteredNotes.filter(note => note.matiereId === matiereId);
      const elevesMap = new Map();
      notes.forEach(note => {
        if (elevesMap.has(note.eleveId)) {
          const existingNote = elevesMap.get(note.eleveId);
          existingNote.inter1 = note.inter1 || existingNote.inter1;
          existingNote.inter2 = note.inter2 || existingNote.inter2;
          existingNote.inter3 = note.inter3 || existingNote.inter3;
          existingNote.inter4 = note.inter4 || existingNote.inter4;
          existingNote.moyInter = note.moyInter || existingNote.moyInter;
          existingNote.dev1 = note.dev1 || existingNote.dev1;
          existingNote.dev2 = note.dev2 || existingNote.dev2;
          existingNote.moy = note.moy || existingNote.moy;
          existingNote.moycoef = note.moycoef || existingNote.moycoef;
        } else {
          elevesMap.set(note.eleveId, note);
        }
      });
      return Array.from(elevesMap.values());
    },
  },
  mounted() {
    this.fetchData();
  },
};
</script>

<style scoped>
.container {
  font-family: 'Arial', sans-serif;
  padding: 20px;
  max-width: 1000px; /* Augmentation de la largeur de la conteneur */
  margin: auto;
}

.matiere {
  border: 1px solid #007BFF; /* Couleur de la bordure en bleu */
  margin-bottom: 20px;
  border-radius: 10px;
  background-color: #E3F2FD; /* Fond bleu clair pour chaque matière */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Ajout d'une ombre pour un effet de profondeur */
}

.matiere-header {
  background-color: #007BFF; /* Fond bleu */
  color: white;
  padding: 15px; /* Augmentation de l'espace de padding */
  font-size: 20px; /* Augmentation de la taille de la police */
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 10px 10px 0 0; /* Bordure arrondie en haut */
}

.matiere-header:hover {
  background-color: #0056b3; /* Bleu plus foncé au survol */
}

.icon {
  font-size: 22px; /* Légère augmentation de la taille de l'icône */
}

.matiere-details {
  padding: 20px; /* Plus d'espace pour les détails */
  background-color: white;
  border-radius: 0 0 10px 10px; /* Bordure arrondie en bas */
}

.semestres {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.semestre-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 10px 20px; /* Augmentation de la taille des boutons */
  cursor: pointer;
  border-radius: 5px;
  font-size: 15px; /* Légère augmentation de la taille de la police */
  transition: background-color 0.3s;
}

.semestre-btn.active {
  background-color: #0d8bf2;
}

.semestre-btn:hover {
  background-color: #1e88e5;
}

.notes-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

.notes-table th, .notes-table td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

.notes-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.notes-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.no-data {
  color: #ff0000;
  font-weight: bold;
  font-size: 15px;
  margin-top: 20px;
  text-align: center;
}
</style>
