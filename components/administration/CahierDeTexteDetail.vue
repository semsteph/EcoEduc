<template>
  <div class="container">
    <!-- Vérification si les matières sont disponibles -->
    <div v-if="matieres.length === 0">
      <p class="no-data">
        Aucune donnée n'est encore disponible pour cette classe ou le cahier de texte n'est pas encore disponible pour cette classe.
      </p>
    </div>

    <!-- Affichage des matières -->
    <div v-else>
      <div v-for="matiere in matieres" :key="matiere.id" class="matiere">
        <div class="matiere-header" @click="toggleMatiere(matiere.id)">
          {{ matiere.nom }}
          <span class="icon">{{ activeMatiere === matiere.id ? '-' : '+' }}</span>
        </div>

        <!-- Détails de la matière (semestres et tests) -->
        <div v-if="activeMatiere === matiere.id" class="matiere-details">
          <p v-if="matiere.tests.length === 0" class="no-data">
            Aucune donnée n'est encore disponible pour cette matière.
          </p>

          <p v-else class="enseignant">
            Enseignant : <strong>{{ matiere.enseignant.nom }} {{ matiere.enseignant.prenom }}</strong>
          </p>

          <!-- Boutons des semestres -->
          <div class="semestres" v-if="matiere.tests.length">
            <button
              v-for="semestre in getUniqueSemestres(matiere)"
              :key="semestre.id"
              @click="selectSemestre(semestre.id)"
              :class="{ active: activeSemestre === semestre.id }"
              class="semestre-btn"
            >
              {{ semestre.nom }}
            </button>
          </div>

          <!-- Tableau des tests filtrés par semestre -->
          <table v-if="activeSemestre && filteredTests.length" class="test-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Horaire</th>
                <th>Activité</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="test in filteredTests" :key="test.date">
                <td>{{ test.date }}</td>
                <td>{{ test.horaire }}</td>
                <td>{{ test.activite }}</td>
              </tr>
            </tbody>
          </table>
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
  },
  data() {
    return {
      matieres: [],
      activeMatiere: null,
      activeSemestre: null,
    };
  },
  computed: {
    filteredTests() {
      // Filtrer les tests pour le semestre actif
      if (this.activeMatiere && this.activeSemestre) {
        const matiere = this.matieres.find(m => m.id === this.activeMatiere);
        return matiere.tests.filter(test => test.semestre_id === this.activeSemestre);
      }
      return [];
    },
  },
  methods: {
    fetchDetails() {
      axios.get(`http://localhost:8080/api/classes/${this.classId}/details`)
        .then(response => {
          this.matieres = response.data.matieres;
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des données:', error);
        });
    },
    toggleMatiere(matiereId) {
      this.activeMatiere = this.activeMatiere === matiereId ? null : matiereId;
    },
    selectSemestre(semestreId) {
      this.activeSemestre = semestreId;
    },
    getUniqueSemestres(matiere) {
      // Extraire les semestres uniques
      const semestresMap = {};
      matiere.tests.forEach(test => {
        if (!semestresMap[test.semestre_id]) {
          semestresMap[test.semestre_id] = { id: test.semestre_id, nom: matiere.semestres[test.semestre_id].nom };
        }
      });
      return Object.values(semestresMap);
    },
  },
  mounted() {
    this.fetchDetails();
  },
};
</script>

<style scoped>
/* Stylisation générale */
.container {
  font-family: 'Arial', sans-serif;
  padding: 20px;
  max-width: 800px;
  margin: auto;
}

.matiere {
  border: 1px solid #ddd;
  margin-bottom: 15px;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.matiere-header {
  background-color: #007BFF; /* Bleu pour les matières */
  color: white;
  padding: 10px;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px 8px 0 0;
}

.matiere-header:hover {
  background-color: #0056b3;
}

.icon {
  font-size: 20px;
}

.matiere-details {
  padding: 15px;
  background-color: white;
  border-top: 1px solid #ddd;
  border-radius: 0 0 8px 8px;
}

.enseignant {
  font-size: 16px;
  margin-bottom: 10px;
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
  padding: 10px 15px;
  cursor: pointer;
  border-radius: 5px;
  font-size: 14px;
  transition: background-color 0.3s;
}

.semestre-btn.active {
  background-color: #0d8bf2;
}

.semestre-btn:hover {
  background-color: #1e88e5;
}

.test-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.test-table th, .test-table td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
}

.test-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.test-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.no-data {
  color: #ff0000;
  font-weight: bold;
  font-size: 14px;
  margin-top: 20px;
}
</style>
