<template>
  <div>
    <v-btn icon  @click="$emit('back')">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>
    <h1 class="No">Veuillez cliquer sur un semestre pour afficher/masquer les notes de l'élève.</h1>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div v-if="loading">
      Chargement des données...
    </div>

    <div v-else>
      <div v-if="semestres.length">
        <div class="semestre-list">
          <div 
            v-for="semestre in semestres" 
            :key="semestre.id" 
            class="semestre-item"
          >
            <button 
              @click="toggleSemestre(semestre.id)" 
              :class="{ active: selectedSemestre === semestre.id }"
            >
              {{ semestre.nom }}
            </button>
            <table 
              v-if="selectedSemestre === semestre.id && notesBySemestre[semestre.id]" 
              class="notes-table"
            >
              <thead>
                <tr>
                  <th>Matière</th>
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
                <tr 
                  v-for="note in notesBySemestre[semestre.id].notes" 
                  :key="note.matiere"
                >
                  <td>{{ note.matiere }}</td>
                  <td>{{ note.inter1 || '' }}</td>
                  <td>{{ note.inter2 || '' }}</td>
                  <td>{{ note.inter3 || '' }}</td>
                  <td>{{ note.inter4 || '' }}</td>
                  <td>{{ note.moyInter || '' }}</td>
                  <td>{{ note.dev1 || '' }}</td>
                  <td>{{ note.dev2 || '' }}</td>
                  <td>{{ note.moy || '' }}</td>
                  <td>{{ note.moycoef || '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div v-else>
        <p>Aucun semestre disponible.</p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  props: {
    childId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      notesBySemestre: {},
      semestres: [],
      selectedSemestre: null,
      loading: true,
      error: null,
    };
  },
  async created() {
    await this.fetchNotes();
  },
  methods: {
    async fetchNotes() {
      try {
        this.loading = true;
        const response = await axios.get('http://localhost:8080/api/eleve-notes', {
          params: {
            childId: this.childId,
          },
        });

        const rawData = response.data;
        const processedData = {};
        
        for (const [semestreId, semestreData] of Object.entries(rawData)) {
          processedData[semestreId] = {
            semestre: semestreData.semestre,
            notes: semestreData.notes.reduce((acc, note) => {
              if (!acc[note.matiere]) {
                acc[note.matiere] = {
                  matiere: note.matiere,
                  inter1: note.inter1,
                  inter2: note.inter2,
                  inter3: note.inter3,
                  inter4: note.inter4,
                  moyInter: note.moyInter,
                  dev1: note.dev1,
                  dev2: note.dev2,
                  moy: note.moy,
                  moycoef: note.moycoef,
                };
              } else {
                acc[note.matiere].inter1 = acc[note.matiere].inter1 || note.inter1;
                acc[note.matiere].inter2 = acc[note.matiere].inter2 || note.inter2;
                acc[note.matiere].inter3 = acc[note.matiere].inter3 || note.inter3;
                acc[note.matiere].inter4 = acc[note.matiere].inter4 || note.inter4;
                acc[note.matiere].moyInter = acc[note.matiere].moyInter || note.moyInter;
                acc[note.matiere].dev1 = acc[note.matiere].dev1 || note.dev1;
                acc[note.matiere].dev2 = acc[note.matiere].dev2 || note.dev2;
                acc[note.matiere].moy = acc[note.matiere].moy || note.moy;
                acc[note.matiere].moycoef = acc[note.matiere].moycoef || note.moycoef;
              }
              return acc;
            }, {}),
          };

          processedData[semestreId].notes = Object.values(processedData[semestreId].notes);
        }

        this.notesBySemestre = processedData;
        this.semestres = Object.keys(this.notesBySemestre).map((key) => ({
          id: key,
          nom: this.notesBySemestre[key].semestre,
        }));
      } catch (error) {
        this.error = 'Erreur lors de la récupération des données. Veuillez réessayer plus tard.';
        console.error('Erreur lors de la récupération des données:', error);
      } finally {
        this.loading = false;
      }
    },
    toggleSemestre(semestreId) {
      this.selectedSemestre = this.selectedSemestre === semestreId ? null : semestreId;
    },
  },
};
</script>

<style>
.error {
  color: red;
}
.back-button {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f0f0f0;
  border: none;
  cursor: pointer;
}
.back-button:hover {
  background-color: #ddd;
}
.semestre-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.semestre-item button {
  width: 100%;
  padding: 10px;
  text-align: left;
  cursor: pointer;
  background-color: #f4f4f4;
  border: 1px solid #ddd;
}
.semestre-item button.active {
  background-color: #007bff;
  color: #fff;
}
.notes-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}
.notes-table th,
.notes-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
.notes-table tr {
  background-color: #f4f4f4;
}
.No {
  color: #555;
  margin-bottom: 20px;
}
</style>
