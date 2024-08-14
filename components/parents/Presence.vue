<template>
  <div>
    <h1>Présences pour le :</h1>
    
    <!-- Boutons pour sélectionner les trimestres -->
    <div class="trimestre-buttons">
      <v-btn @click="trimestre = 'trimestre1'" :class="{ 'active': trimestre === 'trimestre1', 'trimestre1': trimestre === 'trimestre1' }">Trimestre 1</v-btn>
      <v-btn @click="trimestre = 'trimestre2'" :class="{ 'active': trimestre === 'trimestre2', 'trimestre2': trimestre === 'trimestre2' }">Trimestre 2</v-btn>
      <v-btn @click="trimestre = 'trimestre3'" :class="{ 'active': trimestre === 'trimestre3', 'trimestre3': trimestre === 'trimestre3' }">Trimestre 3</v-btn>
    </div>

    <!-- Tableau des présences -->
    <v-data-table :headers="headers" :items="filteredPresence" item-key="id">
      <template v-slot:column.date="{ item }">
        <td>{{ item.date }}</td>
      </template>
      <template v-slot:column.matiere="{ item }">
        <td>{{ item.matiere }}</td>
      </template>
      <template v-slot:column.heure="{ item }">
        <td>{{ item.heure }}</td>
      </template>
      <template v-slot:column.presence="{ item }">
        <td>{{ item.presence }}</td>
      </template>
    </v-data-table>

    <!-- Bouton de retour -->
    <v-btn color="primary" @click="$emit('back')">Retour</v-btn>
  </div>
</template>
<script>
export default {
  data() {
    return {
      trimestre: 'trimestre1', // Trimestre par défaut
      headers: [
        { text: 'Date', value: 'date' },
        { text: 'Matière', value: 'matiere' },
        { text: 'Heure', value: 'heure' },
        { text: 'Présence', value: 'presence' }
      ],
      presenceData: [
        { id: 1, trimestre: 'trimestre1', date: '2024-01-10', matiere: 'Mathématiques', heure: '15h - 17h', presence: 'Présent' },
        { id: 2, trimestre: 'trimestre1', date: '2024-01-12', matiere: 'Français', heure: '10h - 12h', presence: 'Absent' },
        { id: 3, trimestre: 'trimestre2', date: '2024-03-05', matiere: 'Physique', heure: '13h - 15h', presence: 'Présent' },
        { id: 4, trimestre: 'trimestre3', date: '2024-06-20', matiere: 'Histoire', heure: '9h - 11h', presence: 'Présent' }
      ]
    };
  },
  computed: {
    filteredPresence() {
      return this.presenceData.filter(item => item.trimestre === this.trimestre);
    }
  },

};
</script>
<style scoped>
.table-container {
  margin: 20px;
}
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
.trimestre1 {
  background-color: #007bff; /* Bleu pour Trimestre 1 */
}
.trimestre2 {
  background-color: #28a745; /* Vert pour Trimestre 2 */
}
.trimestre3 {
  background-color: #dc3545; /* Rouge pour Trimestre 3 */
}
.trimestre-buttons .v-btn.active {
  background-color: #333; /* Couleur active neutre */
  color: white;
}
.back-button {
  margin-top: 20px;
}
</style>
