<template>
  <v-container>
    <h1>Conduite de l'élève</h1>

    <!-- Liste dynamique des semestres avec v-expansion-panels -->
    <v-expansion-panels v-model="selectedPanel">
      <v-expansion-panel v-for="(semestre, index) in semestres" :key="index">
        <v-expansion-panel-title>
          {{ semestre }}
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <!-- Tableau à double entrée pour les incidents -->
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
              <tr v-for="incident in filteredIncidents(semestre)" :key="incident.id">
                <td>{{ incident.auteur }}</td>
                <td>{{ formaterDate(incident.date) }}</td>
                <td>{{ incident.heure }}</td>
                <td>{{ incident.punition }}</td>
                <td>{{ incident.motif }}</td>
                <td>{{ incident.total_hours }}</td>
              </tr>
            </tbody>
          </v-simple-table>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- Bouton de retour -->
    <v-btn color="primary" @click="$emit('back')" class="back-button">Retour</v-btn>
  </v-container>
</template>

<script>
import axios from 'axios';
import dayjs from 'dayjs';

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
        const token = localStorage.getItem('token');
        if (!token) {
          this.$router.push('/login');
          return;
        }

        const response = await axios.get('http://localhost:8080/api/incidents', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            eleveId: idEleve,
          },
        });

        this.incidents = response.data;
        // Extraire les noms des semestres de manière unique
        this.semestres = [...new Set(this.incidents.map(item => item.semestreNom))];
      } catch (error) {
        console.error('Erreur lors de la récupération des incidents :', error);
        this.$router.push('/login');
      }
    },
    filteredIncidents(semestre) {
      // Filtrer les incidents selon le semestre sélectionné
      return this.incidents.filter(item => item.semestreNom === semestre);
    },
    formaterDate(date) {
      return dayjs(date).format('DD/MM/YYYY');
    },
  },
  mounted() {
    this.fetchIncidents(this.childId); // Appel initial pour récupérer les incidents
  },
};
</script>

<style scoped>
.v-expansion-panels {
  margin-bottom: 20px;
}

.v-expansion-panel-title {
  font-weight: bold;
}

.tableau-conduite {
  width: 100%;
  border-collapse: collapse; /* Permet de fusionner les bordures pour un effet plus net */
  margin-top: 10px;
}

.tableau-conduite th, .tableau-conduite td {
  border: 1px solid #ddd; /* Bordures entre les cellules */
  padding: 12px; /* Espacement interne des cellules */
  text-align: center; /* Alignement du texte au centre */
  background-color: #fff; /* Couleur de fond des cellules */
}

.tableau-conduite th {
  background-color: #007bff; /* Couleur de fond pour les en-têtes */
  color: white; /* Couleur du texte pour les en-têtes */
  font-weight: bold; /* Texte en gras pour les en-têtes */
}

.tableau-conduite tr:nth-child(even) {
  background-color: #f9f9f9; /* Couleur de fond pour les lignes paires */
}

.tableau-conduite tr:hover {
  background-color: #e6f7ff; /* Couleur de fond lors du survol des lignes */
}

.back-button {
  display: block;
  margin: 20px auto 0; /* Centrer le bouton et le placer en bas */
}
</style>
