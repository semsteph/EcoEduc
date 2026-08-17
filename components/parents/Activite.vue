<template>
  <div class="container">
    <!-- Top bar -->
    <div class="topbar">
      <v-btn icon class="back-btn" @click="$emit('back')" aria-label="Retour">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>

      <div class="topbar-title">
        <div class="title">Ce qui a été fait ce mois-ci</div>
        <div class="subtitle">{{ currentMonth }}</div>
      </div>

      <div class="topbar-spacer" />
    </div>

    <!-- Tableau affichant les matières, dates et activités -->
    <div class="table-wrap">
      <v-simple-table class="custom-table">
        <thead>
          <tr>
            <th class="header-cell">Matière</th>
            <th class="header-cell">Date</th>
            <th class="header-cell">Activité</th>
          </tr>
        </thead>

        <tbody>
          <!-- Boucle sur les matières regroupées -->
          <template v-for="(test, index) in groupedTests" :key="index">
            <tr>
              <!-- Première ligne de chaque matière -->
              <td :rowspan="test.dates.length" class="data-cell">
                {{ test.matiere }}
              </td>
              <td class="data-cell">
                {{ formatDate(test.dates[0]) }}
              </td>
              <td class="data-cell">
                1 - {{ test.activites[0] }}
              </td>
            </tr>
            <!-- Lignes suivantes pour les dates et activités restantes -->
            <tr v-for="(date, i) in test.dates.slice(1)" :key="i">
              <td class="data-cell">
                {{ formatDate(date) }}
              </td>
              <td class="data-cell">
                {{ i + 2 }} - {{ test.activites[i + 1] }}
              </td>
            </tr>
          </template>
        </tbody>
      </v-simple-table>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  props: {
    childId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      tests: [], // Contient toutes les données reçues de l'API
      currentMonth: new Date().toLocaleString("default", { month: "long" }), // Mois actuel
    };
  },
  computed: {
    // Regrouper les tests par matière, et les dates/activités associées
    groupedTests() {
      const grouped = {};

      this.tests.forEach((test) => {
        if (!grouped[test.matiere]) {
          grouped[test.matiere] = { dates: [], activites: [] };
        }
        grouped[test.matiere].dates.push(test.date);
        grouped[test.matiere].activites.push(test.activite);
      });

      return Object.keys(grouped).map((matiere) => ({
        matiere,
        dates: grouped[matiere].dates,
        activites: grouped[matiere].activites,
      }));
    },
  },
  methods: {
    // Récupère les données depuis l'API en envoyant l'ID de l'élève
    async fetchTestsForStudent() {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `/api/tests/${this.childId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        this.tests = response.data;
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
      }
    },
    // Formate la date en un format plus lisible
    formatDate(date) {
      const options = { year: "numeric", month: "long", day: "numeric" };
      return new Date(date).toLocaleDateString(undefined, options);
    },
    goBack() {
      this.$emit("default", "InfoDetails"); // Émet un événement pour indiquer le retour
    },
  },
  mounted() {
    // Récupère les tests pour l'élève quand le composant est monté
    this.fetchTestsForStudent();
  },
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #f6f8fc;
}

/* Top bar (cohérent avec les autres écrans du portail parent) */
.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.back-btn {
  min-width: 44px;
  min-height: 44px;
  background: rgba(0, 0, 0, 0.03);
}
.topbar-title {
  text-align: center;
}
.title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #111827;
  line-height: 1.2;
}
.subtitle {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
  text-transform: capitalize;
}
.topbar-spacer {
  width: 44px;
  height: 44px;
}

/* Tableau : wrapper avec vrai scroll horizontal sur mobile */
.table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px;
}

.custom-table {
  width: 100%;
  min-width: 480px;
  border-collapse: collapse;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.header-cell {
  background-color: #3f51b5;
  color: white;
  font-weight: bold;
  text-align: left;
  padding: 12px;
  border-bottom: 2px solid #e0e0e0;
  white-space: nowrap;
}

.data-cell {
  padding: 10px;
  border-bottom: 1px solid #e0e0e0;
  color: #333;
}

/* Alternance de couleur pour les lignes */
tbody tr:nth-child(odd) {
  background-color: #f5f5f5;
}

tbody tr:nth-child(even) {
  background-color: white;
}

@media (max-width: 600px) {
  .table-wrap { padding: 12px; }
  .header-cell, .data-cell { padding: 10px 8px; font-size: 13px; }
}
</style>
