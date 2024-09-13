<template>
  <div>
    <!-- Titre avec le mois actuel -->
    <h1>A été fait en ce mois : {{ currentMonth }}</h1>

    <!-- Tableau affichant les matières, dates et activités, bien espacées et séparées -->
    <v-simple-table>
      <thead>
        <tr>
          <th style="padding: 10px; border-bottom: 1px solid black;">Matière</th>
          <th style="padding: 10px; border-bottom: 1px solid black;">Date</th>
          <th style="padding: 10px; border-bottom: 1px solid black;">Activité</th>
        </tr>
      </thead>
      <tbody>
        <!-- Boucle sur les matières regroupées -->
        <template v-for="(test, index) in groupedTests" :key="index">
          <tr>
            <!-- Première ligne de chaque matière -->
            <td :rowspan="test.dates.length" style="padding: 10px; border-right: 1px solid black;">
              {{ test.matiere }}
            </td>
            <td style="padding: 10px; border-right: 1px solid black;">
              {{ formatDate(test.dates[0]) }}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid black;">
              1 - {{ test.activites[0] }}
            </td>
          </tr>
          <!-- Lignes suivantes pour les dates et activités restantes -->
          <tr v-for="(date, i) in test.dates.slice(1)" :key="i">
            <td style="padding: 10px; border-right: 1px solid black;">
              {{ formatDate(date) }}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid black;">
              {{ i + 2 }} - {{ test.activites[i + 1] }}
            </td>
          </tr>
        </template>
      </tbody>
    </v-simple-table>
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
      tests: [], // Contient toutes les données reçues de l'API
      currentMonth: new Date().toLocaleString('default', { month: 'long' }), // Mois actuel
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
        // Envoyer une requête à l'API pour récupérer les données basées sur l'ID de l'élève
        const response = await axios.get(`http://localhost:8080/api/tests/${this.childId}`);
        this.tests = response.data;
      } catch (error) {
        console.error('Erreur lors de la récupération des données :', error);
      }
    },
    // Formate la date en un format plus lisible (optionnel)
    formatDate(date) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(date).toLocaleDateString(undefined, options);
    },
  },
  mounted() {
    // Récupère les tests pour l'élève quand le composant est monté
    this.fetchTestsForStudent();
  },
};
</script>

<style scoped>
h1 {
  text-align: center;
  margin-bottom: 20px;
  color: #f9f9f9;
}

v-simple-table {
  margin: 0 auto;
  width: 80%;
  border-collapse: collapse;
}

th, td {
  text-align: left;
  padding: 15px;
  border-bottom: 1px solid #ddd;
}

td {
  padding: 10px;
}

tbody tr:nth-child(odd) {
  background-color: #f9f9f9;
}
</style>
