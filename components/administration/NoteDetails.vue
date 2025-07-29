<template>
  <div class="container">
    <h1 class="title">
      <v-icon class="icon-left" small>mdi-book-open-page-variant</v-icon>
      Cahier de Notes
    </h1>

    <div v-if="matieres.length === 0">
      <p class="no-data">
        <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
        Aucune donnée n'est encore disponible pour cette classe ou le cahier de notes n'est pas encore disponible pour cette classe.
      </p>
    </div>

    <div v-else>
      <div
        v-for="matiere in matieres"
        :key="matiere.id"
        class="matiere"
      >
        <div class="matiere-header" @click="toggleMatiere(matiere.id)">
          <div class="matiere-title">
            <v-icon left class="mr-2">mdi-book</v-icon>
            {{ matiere.nom }}
          </div>
          <v-icon>{{ activeMatiere === matiere.id ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </div>

        <div v-if="activeMatiere === matiere.id" class="matiere-details">
          <div class="semestres">
            <v-btn
              v-for="semestre in semestres"
              :key="semestre.id"
              @click="selectSemestre(semestre.id)"
              :color="selectedSemestre === semestre.id ? 'primary' : 'blue lighten-2'"
              class="semestre-btn"
              small
              elevation="1"
            >
              {{ semestre.nom }}
            </v-btn>
          </div>

          <v-table
            v-if="getUniqueElevesForMatiere(matiere.id).length"
            class="notes-table"
            dense
          >
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
              <tr
                v-for="eleve in getUniqueElevesForMatiere(matiere.id)"
                :key="eleve.eleveId"
              >
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
          </v-table>

          <p v-else class="no-data">
            <v-icon color="warning" class="mr-2">mdi-information</v-icon>
            Aucune note disponible pour cette matière dans le semestre sélectionné.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { VIcon, VBtn, VTable } from 'vuetify/components';

export default {
  props: {
    classId: Number,
    anneeScolaire: String,
    anneeScolaireId: Number
  },
  components: {
    VIcon,
    VBtn,
    VTable
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
          Object.assign(ex, { ...ex, ...n });
        } else {
          map.set(n.eleveId, n);
        }
      });
      return Array.from(map.values());
    },
  },
  mounted() {
    this.fetchData();
  }
};
</script>

<style scoped>
.container {
  padding: 20px;
  max-width: 1000px;
  margin: auto;
  font-family: 'Roboto', sans-serif;
}

.title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.5rem;
  margin-bottom: 20px;
  color: #1976D2;
  text-align: center;
}

.matiere {
  border: 1px solid #90CAF9;
  border-radius: 10px;
  background: #E3F2FD;
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.matiere-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #2196F3;
  color: white;
  padding: 12px 20px;
  font-weight: 500;
  cursor: pointer;
  font-size: 1.1rem;
}

.matiere-title {
  display: flex;
  align-items: center;
}

.matiere-details {
  padding: 15px;
  background-color: white;
}

.semestres {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.notes-table {
  width: 100%;
  font-size: 0.9rem;
}

.no-data {
  color: #e53935;
  font-size: 0.95rem;
  text-align: center;
  margin: 15px 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

@media (max-width: 768px) {
  .container {
    padding: 10px;
  }

  .title {
    font-size: 1.2rem;
  }

  .matiere-header {
    font-size: 1rem;
    padding: 10px;
  }

  .semestres {
    flex-direction: column;
  }

  .notes-table {
    font-size: 0.75rem;
  }

  .no-data {
    font-size: 0.85rem;
  }
}
</style>
