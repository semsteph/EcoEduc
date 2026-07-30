<template>
  <div class="container">
    <div class="detail-topbar">
      <v-btn icon class="detail-back-btn" @click="$emit('back')" aria-label="Retour">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div class="detail-topbar-title">Cahier de texte</div>
    </div>

    <!-- Message si aucune matière -->
    <div v-if="matieres.length === 0" class="no-data-container">
      <v-icon color="error" class="mb-2">mdi-alert-circle-outline</v-icon>
      <p class="no-data">
        Aucune donnée disponible pour cette classe ou le cahier de texte est indisponible.
      </p>
    </div>

    <!-- Liste des matières -->
    <div v-else>
      <div v-for="matiere in matieres" :key="matiere.id" class="matiere-card">
        <div class="matiere-header" @click="toggleMatiere(matiere.id)">
          <v-icon class="mr-2">mdi-book-open-page-variant</v-icon>
          {{ matiere.nom }}
          <v-icon class="toggle-icon">
            {{ activeMatiere === matiere.id ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
          </v-icon>
        </div>

        <!-- Détails -->
        <div v-if="activeMatiere === matiere.id" class="matiere-details">
          <div v-if="matiere.tests.length === 0" class="no-data-container">
            <v-icon color="warning" class="mb-2">mdi-alert-outline</v-icon>
            <p class="no-data">Aucune donnée disponible pour cette matière.</p>
          </div>

          <p v-else class="enseignant">
            <v-icon class="mr-1" color="primary">mdi-account</v-icon>
            Enseignant :
            <strong>{{ matiere.enseignant.nom }} {{ matiere.enseignant.prenom }}</strong>
          </p>

          <!-- Semestres -->
          <div class="semestres">
            <v-btn
              v-for="semestre in getUniqueSemestres(matiere)"
              :key="semestre.id"
              @click="selectSemestre(semestre.id)"
              :color="activeSemestre === semestre.id ? 'primary' : 'blue-grey lighten-2'"
              class="semestre-btn"
              size="small"
              rounded
            >
              <v-icon start>mdi-calendar-range</v-icon>
              {{ semestre.nom }}
            </v-btn>
          </div>

          <!-- Tableau des tests -->
          <v-table v-if="activeSemestre && filteredTests.length" class="test-table" density="compact">
            <thead>
              <tr>
                <th><v-icon start>mdi-calendar</v-icon> Date</th>
                <th><v-icon start>mdi-clock-time-four-outline</v-icon> Horaire</th>
                <th><v-icon start>mdi-clipboard-text-outline</v-icon> Activité</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="test in filteredTests" :key="test.date">
                <td>{{ formatDate(test.date) }}</td>
                <td>{{ test.horaire }}</td>
                <td>{{ test.activite }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  emits: ['back'],
  props: {
    classId: {
      type: Number,
      required: true,
    },
    etablissementId: {
      type: Number,
      required: true
    },
    etablissementNom: {
      type: String,
      required: true
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
      axios.get(`/api/classes/${this.classId}/${this.anneeScolaireId}/details`)
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
    formatDate(date) {
      // Formater la date dans un format lisible par les utilisateurs
      try {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Intl.DateTimeFormat('fr-FR', options).format(new Date(date));
      } catch (e) {
        console.error("Erreur lors du formatage de la date :", e);
        return date; // Retourner la date brute en cas d'erreur
      }
    }
  },
  mounted() {
    this.fetchDetails();
  },
};
</script>

<style scoped>
.container {
  font-family: 'Segoe UI', Tahoma, sans-serif;
  padding: 24px;
  max-width: 900px;
  margin: auto;
}

.detail-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.detail-back-btn {
  background-color: #2196F3 !important;
  color: #ffffff !important;
}

.detail-topbar-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #1f2937;
}

.matiere-card {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  margin-bottom: 18px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.3s ease;
}

.matiere-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.matiere-header {
  background-color: #2196F3;
  color: white;
  padding: 14px 20px;
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 12px 12px 0 0;
  cursor: pointer;
}

.toggle-icon {
  font-size: 22px;
}

.matiere-details {
  padding: 16px;
  background-color: #fafafa;
  border-radius: 0 0 12px 12px;
}

.enseignant {
  font-size: 0.95rem;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}

.semestres {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.semestre-btn {
  text-transform: none;
  font-weight: 500;
  transition: 0.3s ease;
}

.test-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  font-size: 0.9rem;
}

.test-table th,
.test-table td {
  padding: 12px;
  border: 1px solid #e0e0e0;
  text-align: left;
}

.test-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.test-table tr:nth-child(even) {
  background-color: #fcfcfc;
}

.no-data-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 20px 0;
  text-align: center;
}

.no-data {
  color: #f44336;
  font-weight: 600;
  font-size: 0.9rem;
}

/* Responsive design */
@media (max-width: 600px) {
  .container {
    padding: 12px;
  }

  .matiere-header {
    font-size: 0.9rem;
    padding: 12px;
  }

  .enseignant {
    font-size: 0.85rem;
  }

  .semestre-btn {
    font-size: 0.75rem !important;
    padding: 4px 8px !important;
  }

  .test-table th,
  .test-table td {
    padding: 8px;
    font-size: 0.8rem;
  }

  .no-data {
    font-size: 0.8rem;
  }
}

@media (min-width: 961px) {
  .matiere-header {
    font-size: 1.2rem;
  }

  .enseignant {
    font-size: 1rem;
  }

  .semestre-btn {
    font-size: 0.9rem;
  }

  .test-table th,
  .test-table td {
    font-size: 0.95rem;
  }
}
</style>