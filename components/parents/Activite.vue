<template>
  <div class="container">
    <!-- Bouton de retour -->
    <v-btn icon  @click="$emit('back')" class="back-button">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>

    <!-- Titre avec le mois actuel -->
    <h1>A été fait en ce mois : {{ currentMonth }}</h1>

    <!-- Tableau affichant les matières, dates et activités -->
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
        const response = await axios.get(
          `http://localhost:8080/api/tests/${this.childId}`
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
  padding: 20px;
  background-color:gg ;
  border-radius: 10px;
}

h1 {
  text-align: center;
  margin-bottom: 20px;
  color: black;
}

.back-button {
  margin-bottom: 20px;
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white; /* Fond uniforme pour le tableau */
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
</style>
