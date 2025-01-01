<template>
  <v-container class="py-5">
    <!-- Bouton de retour -->
    <v-btn icon @click="$emit('back')" class="mb-4">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>
    <h1 class="text-center mb-5">Conduite de l'élève</h1>

    <!-- Liste dynamique des semestres avec v-expansion-panels -->
    <v-expansion-panels v-model="selectedPanel" multiple>
      <v-expansion-panel
        v-for="(semestre, index) in semestres"
        :key="index"
        class="expanded-panel"
      >
        <v-expansion-panel-title class="expanded-title">
          {{ semestre }}
        </v-expansion-panel-title>
        <v-expansion-panel-text class="expanded-text">
          <!-- Conteneur défilable pour le tableau -->
          <div class="table-responsive">
            <v-simple-table class="tableau-conduite">
              <thead>
                <tr>
                  <th>Auteur</th>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Punition</th>
                  <th>Motif</th>
                  <th>Somme d'heures</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="incident in filteredIncidents(semestre)"
                  :key="incident.id"
                >
                  <td>{{ incident.auteur }}</td>
                  <td>{{ formaterDate(incident.date) }}</td>
                  <td>{{ incident.heure }}</td>
                  <td>{{ incident.punition }}</td>
                  <td>{{ incident.motif }}</td>
                  <td>{{ incident.total_hours }}</td>
                </tr>
              </tbody>
            </v-simple-table>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- Bouton de retour -->
    <div class="d-flex justify-center mt-4">
      <v-btn color="primary" @click="$emit('back')" large>Retour</v-btn>
    </div>
  </v-container>
</template>

<script>
import axios from "axios";
import dayjs from "dayjs";

export default {
  props: {
    childId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      semestres: [], // Les noms des semestres récupérés
      incidents: [], // Les incidents récupérés de l'API
      selectedPanel: null, // Panel de semestre sélectionné
    };
  },
  methods: {
    async fetchIncidents(idEleve) {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          this.$router.push("/login");
          return;
        }

        const response = await axios.get("http://localhost:8080/api/incidents", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            eleveId: idEleve,
          },
        });

        this.incidents = response.data;
        // Extraire les noms des semestres de manière unique
        this.semestres = [...new Set(this.incidents.map((item) => item.semestreNom))];
      } catch (error) {
        console.error("Erreur lors de la récupération des incidents :", error);
        this.$router.push("/login");
      }
    },
    filteredIncidents(semestre) {
      // Filtrer les incidents selon le semestre sélectionné
      return this.incidents.filter((item) => item.semestreNom === semestre);
    },
    formaterDate(date) {
      return dayjs(date).format("DD/MM/YYYY");
    },
  },
  mounted() {
    this.fetchIncidents(this.childId); // Appel initial pour récupérer les incidents
  },
};
</script>

<style scoped>
/* Conteneur principal */
.v-container {
  max-width: 900px;
  margin: auto;
}

/* Titre principal */
h1 {
  font-size: 1.8rem;
  font-weight: bold;
}

/* Agrandir les panneaux */
.expanded-panel {
  margin-bottom: 20px; /* Espacement entre les panneaux */
  border: 1px solid #007bff; /* Bordure pour accentuer */
  border-radius: 8px; /* Arrondir les coins */
  overflow: hidden;
  width: 100px;
  
}

.expanded-title {
  font-size: 3rem;
  font-weight: bold;
  padding: 32px; /* Augmente la zone cliquable */
  background-color: #f5f5f5; /* Fond plus visible */
}

.expanded-text {
  padding: 0px; /* Plus d'espace à l'intérieur */
  background-color: #ffffff;
  border-top: 1px solid #ddd; /* Séparation entre le titre et le texte */
}

/* Tableau */
.table-responsive {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; /* Améliore le défilement sur iOS */
}

.tableau-conduite {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.tableau-conduite th,
.tableau-conduite td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: center;
}

.tableau-conduite th {
  background-color: #007bff;
  color: white;
}

.tableau-conduite tr:nth-child(even) {
  background-color: #f9f9f9;
}

.tableau-conduite tr:hover {
  background-color: #e6f7ff;
}

/* Responsive */
@media screen and (max-width: 600px) {
  h1 {
    font-size: 1.4rem;
    text-align: center;
  }

  .expanded-title {
    font-size: 1.2rem;
  }

  .tableau-conduite th,
  .tableau-conduite td {
    font-size: 0.9rem;
    padding: 6px;
  }

  .v-btn {
    width: 100%;
  }
}
</style>
