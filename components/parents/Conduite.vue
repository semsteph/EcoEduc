<template>
  <v-container>
    <h1>Conduite de l'élève - {{ trimestre }}</h1>

    <!-- Boutons pour sélectionner les trimestres -->
    <div class="trimestre-buttons">
      <v-btn @click="trimestre = 'trimestre1'" :class="{'active': trimestre === 'trimestre1'}" class="trimestre1">Trimestre 1</v-btn>
      <v-btn @click="trimestre = 'trimestre2'" :class="{'active': trimestre === 'trimestre2'}" class="trimestre2">Trimestre 2</v-btn>
      <v-btn @click="trimestre = 'trimestre3'" :class="{'active': trimestre === 'trimestre3'}" class="trimestre3">Trimestre 3</v-btn>
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
        </tr>
      </thead>
      <tbody>
        <tr v-for="incident in incidentsParTrimestre" :key="incident.id">
          <td>{{ incident.auteur }}</td>
          <td>{{ incident.date }}</td>
          <td>{{ incident.heure }}</td>
          <td>{{ incident.punition }}</td>
          <td>{{ incident.motif }}</td>
        </tr>
      </tbody>
    </v-simple-table>

    <!-- Bouton de retour -->
    <v-btn color="primary" @click="$emit('back')" class="back-button">Retour</v-btn>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      trimestre: 'trimestre1', // Trimestre par défaut
      incidentsParTrimestre: {
        trimestre1: [
          // Exemple de données pour le Trimestre 1
          {
            id: 1,
            auteur: 'Professeur Dupont',
            date: '2024-08-01',
            heure: '14:00',
            punition: '2h de colle',
            motif: 'Retard répété'
          },
          // Ajoutez plus de données
        ],
        trimestre2: [
          // Exemple de données pour le Trimestre 2
          {
            id: 2,
            auteur: 'Professeur Martin',
            date: '2024-08-02',
            heure: '09:00',
            punition: '4h de colle',
            motif: 'Absence injustifiée'
          },
          // Ajoutez plus de données
        ],
        trimestre3: [
          // Exemple de données pour le Trimestre 3
          {
            id: 3,
            auteur: 'Professeur Dupont',
            date: '2024-09-15',
            heure: '11:00',
            punition: '1h de colle',
            motif: 'Comportement inapproprié'
          },
          // Ajoutez plus de données
        ]
      }
    };
  },
  computed: {
    incidentsParTrimestre() {
      return this.incidentsParTrimestre[this.trimestre] || [];
    }
  }
};
</script>

<style scoped>
.trimestre-buttons {
  margin-bottom: 20px;
}
.trimestre-buttons .v-btn {
  margin-right: 10px;
}
.trimestre-buttons .v-btn.active {
  color: white;
  font-weight: bold;
}
.trimestre1.active {
  background-color: #007bff; /* Bleu pour Trimestre 1 */
}
.trimestre2.active {
  background-color: #28a745; /* Vert pour Trimestre 2 */
}
.trimestre3.active {
  background-color: #dc3545; /* Rouge pour Trimestre 3 */
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
