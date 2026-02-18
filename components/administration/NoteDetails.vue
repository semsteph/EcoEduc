<template>
  <v-container class="notes-container pa-4 pa-sm-6">
    <v-row align="center" class="mb-6">
      <v-col cols="auto">
        <v-btn icon variant="tonal" color="primary" @click="$emit('back')">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>
      <v-col>
        <h1 class="text-h5 font-weight-bold text-primary d-flex align-center">
          <v-icon start color="primary">mdi-book-open-variant</v-icon>
          Cahier de Notes
        </h1>
        <p class="text-caption text-grey-darken-1 mb-0">
          Année scolaire : {{ anneeScolaire }}
        </p>
      </v-col>
    </v-row>

    <v-alert
      v-if="matieres.length === 0"
      type="info"
      variant="tonal"
      rounded="lg"
      icon="mdi-information"
      class="mt-6"
    >
      Aucune donnée n'est disponible pour cette classe actuellement.
    </v-alert>

    <div v-else class="matieres-list">
      <v-card
        v-for="matiere in matieres"
        :key="matiere.id"
        class="mb-6 rounded-xl elevation-2 overflow-hidden border"
      >
        <div
          class="matiere-header d-flex align-center justify-space-between pa-4 cursor-pointer"
          :class="activeMatiere === matiere.id ? 'bg-primary' : 'bg-grey-lighten-4'"
          @click="toggleMatiere(matiere.id)"
        >
          <div class="d-flex align-center">
            <v-avatar
              size="40"
              :color="activeMatiere === matiere.id ? 'white' : 'primary'"
              variant="flat"
              class="mr-4"
            >
              <v-icon :color="activeMatiere === matiere.id ? 'primary' : 'white'">mdi-book-open</v-icon>
            </v-avatar>
            <span :class="['text-h6', activeMatiere === matiere.id ? 'text-white' : 'text-grey-darken-3']">
              {{ matiere.nom }}
            </span>
          </div>
          <v-icon :color="activeMatiere === matiere.id ? 'white' : 'grey'">
            {{ activeMatiere === matiere.id ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
          </v-icon>
        </div>

        <v-expand-transition>
          <div v-if="activeMatiere === matiere.id" class="pa-4 pa-sm-6 bg-white">
            <div class="semestres-container mb-6">
              <span class="text-caption font-weight-bold text-uppercase text-grey mb-3 d-block">
                Choisir un Semestre
              </span>
              <v-btn-toggle
                v-model="selectedSemestre"
                mandatory
                color="primary"
                variant="outlined"
                class="rounded-lg flex-wrap"
                divided
              >
                <v-btn
                  v-for="semestre in semestres"
                  :key="semestre.id"
                  :value="semestre.id"
                  @click="selectSemestre(semestre.id)"
                  class="text-none"
                >
                  {{ semestre.nom }}
                </v-btn>
              </v-btn-toggle>
            </div>

            <v-responsive v-if="getUniqueElevesForMatiere(matiere.id).length" class="border rounded-lg">
              <v-table density="comfortable" hover striped class="custom-table">
                <thead class="bg-grey-lighten-4">
                  <tr>
                    <th class="text-left font-weight-bold">Nom & Prénoms</th>
                    <th class="text-center">Int 1</th>
                    <th class="text-center">Int 2</th>
                    <th class="text-center">Int 3</th>
                    <th class="text-center">Int 4</th>
                    <th class="text-center bg-blue-lighten-5">Moy Int</th>
                    <th class="text-center">Dev 1</th>
                    <th class="text-center">Dev 2</th>
                    <th class="text-center bg-indigo-lighten-5">Moy Gen</th>
                    <th class="text-center font-weight-black bg-primary-lighten-5">Moy Coef</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="eleve in getUniqueElevesForMatiere(matiere.id)"
                    :key="eleve.eleveId"
                  >
                    <td class="font-weight-medium">{{ eleve.nom }} {{ eleve.prenom }}</td>
                    <td class="text-center">{{ formatNote(eleve.inter1) }}</td>
                    <td class="text-center">{{ formatNote(eleve.inter2) }}</td>
                    <td class="text-center">{{ formatNote(eleve.inter3) }}</td>
                    <td class="text-center">{{ formatNote(eleve.inter4) }}</td>
                    <td class="text-center font-weight-bold text-blue-darken-2 bg-blue-lighten-5">
                      {{ formatNote(eleve.moyInter) }}
                    </td>
                    <td class="text-center">{{ formatNote(eleve.dev1) }}</td>
                    <td class="text-center">{{ formatNote(eleve.dev2) }}</td>
                    <td class="text-center font-weight-bold text-indigo-darken-2 bg-indigo-lighten-5">
                      {{ formatNote(eleve.moy) }}
                    </td>
                    <td class="text-center font-weight-black text-primary bg-primary-lighten-5">
                      {{ formatNote(eleve.moycoef) }}
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-responsive>

            <div v-else class="text-center pa-8 border-dashed rounded-lg grey--text">
              <v-icon size="40" color="grey-lighten-1" class="mb-2">mdi-database-off</v-icon>
              <p>Aucune note enregistrée pour cette période.</p>
            </div>
          </div>
        </v-expand-transition>
      </v-card>
    </div>
  </v-container>
</template>

<script>
import axios from 'axios';

export default {
  props: {
    classId: Number,
    anneeScolaire: String,
    anneeScolaireId: Number
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
        console.error('Erreur API :', error);
      }
    },
    toggleMatiere(id) {
      this.activeMatiere = this.activeMatiere === id ? null : id;
    },
    selectSemestre(id) {
      this.selectedSemestre = id;
      this.filterNotes();
    },
    filterNotes() {
      this.filteredNotes = this.allNotes[this.selectedSemestre] || [];
    },
    getUniqueElevesForMatiere(matiereId) {
      const notes = this.filteredNotes.filter(n => n.matiereId === matiereId);
      const map = new Map();
      notes.forEach(n => {
        if (map.has(n.eleveId)) {
          const ex = map.get(n.eleveId);
          // On fusionne les données si l'élève existe déjà
          map.set(n.eleveId, { ...ex, ...n });
        } else {
          map.set(n.eleveId, { ...n });
        }
      });
      return Array.from(map.values());
    },
    formatNote(note) {
      return note !== null && note !== undefined ? note : '-';
    }
  },
  mounted() {
    this.fetchData();
  }
};
</script>

<style scoped>
.notes-container {
  max-width: 1200px;
  margin: 0 auto;
}

.matiere-header {
  user-select: none;
  transition: background-color 0.3s ease;
}

.matiere-header:hover {
  filter: brightness(0.95);
}

.custom-table :deep(th) {
  text-transform: uppercase;
  font-size: 0.75rem !important;
  letter-spacing: 0.05em;
  color: #616161 !important;
}

.custom-table :deep(td) {
  font-size: 0.875rem !important;
  border-right: 1px solid #f5f5f5;
}

.border-dashed {
  border: 2px dashed #e0e0e0;
}

.cursor-pointer {
  cursor: pointer;
}

/* Backgrounds spécifiques pour les moyennes */
.bg-blue-lighten-5 { background-color: #E3F2FD !important; }
.bg-indigo-lighten-5 { background-color: #E8EAF6 !important; }
.bg-primary-lighten-5 { background-color: #EEF2FF !important; }

@media (max-width: 600px) {
  .v-btn-toggle {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  .v-btn-toggle .v-btn {
    border-radius: 0 !important;
    width: 100%;
  }
}
</style>