<template>
  <v-container>
    <h1>Conduite de l'élève - {{ semestre }}</h1>

    <!-- Boutons pour sélectionner les semestres -->
    <div class="semestre-buttons">
      <v-btn @click="changerSemestre('semestre1')" :class="{'active': semestre === 'semestre1'}" class="semestre1">Semestre 1</v-btn>
      <v-btn @click="changerSemestre('semestre2')" :class="{'active': semestre === 'semestre2'}" class="semestre2">Semestre 2</v-btn>
    </div>

    <!-- Tableau à double entrée -->
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
        <tr v-for="incident in incidents" :key="incident.id">
          <td>{{ incident.auteur }}</td>
          <td>{{ incident.date }}</td>
          <td>{{ incident.heure }}</td>
          <td>{{ incident.punition }}</td>
          <td>{{ incident.motif }}</td>
          <td>{{ incident.total_hours }}</td> <!-- Utilisation de total_hours -->
        </tr>
      </tbody>
    </v-simple-table>

    <!-- Bouton de retour -->
    <v-btn color="primary" @click="$emit('back')" class="back-button">Retour</v-btn>
  </v-container>
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
      semestre: 'semestre1', // Semestre par défaut
      incidents: [], // Les incidents récupérés de l'API
    };
  },
  methods: {
    changerSemestre(semestreSelectionne) {
      this.semestre = semestreSelectionne;
      this.fetchIncidents(this.childId); // Re-fetch incidents for the selected semester
    },
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
            semestre: this.semestre,
          },
        });

        console.log(idEleve); // Pour déboguer
        console.log(this.semestre); // Pour déboguer

        this.incidents = response.data;
      } catch (error) {
        console.error('Erreur lors de la récupération des incidents :', error);
        this.$router.push('/login');
      }
    },
  },
  mounted() {
    this.fetchIncidents(this.childId); // Appel initial pour récupérer les incidents
  },
};
</script>

<style scoped>
.semestre-buttons {
  margin-bottom: 20px;
}
.semestre-buttons .v-btn {
  margin-right: 10px;
}
.semestre-buttons .v-btn.active {
  color: white;
  font-weight: bold;
}
.semestre1.active {
  background-color: #007bff; /* Bleu pour Semestre 1 */
}
.semestre2.active {
  background-color: #28a745; /* Vert pour Semestre 2 */
}
.tableau-conduite th, .tableau-conduite td {
  border: 1px solid #ddd; /* Bordures entre les cellules */
  padding: 8px; /* Espacement interne des cellules */
  text-align: center; /* Alignement du texte au centre */
}
.tableau-conduite th {
  background-color: #f4f4f4; /* Couleur de fond pour les en-têtes */
}
.back-button {
  display: block;
  margin: 20px auto 0; /* Centrer le bouton et le placer en bas */
}
</style>
