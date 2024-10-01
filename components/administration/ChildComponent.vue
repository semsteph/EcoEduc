<template>
  <div>
    <v-btn icon @click="$emit('back')">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>
    <v-row justify="center">
      <v-expansion-panels>
        <!-- Semestre 1 -->
        <v-expansion-panel>
          <v-expansion-panel-header>
            <v-btn title="Semestre1" @click="currentSemestre = 'Semestre1'; fetchSemestreData()">Semestre1</v-btn>
          </v-expansion-panel-header>
          <v-expansion-panel-content v-if="currentSemestre === 'Semestre1'">
            <v-data-table
              :headers="headers"
              :items="semestre1Data"
            >
            </v-data-table>
          </v-expansion-panel-content>
        </v-expansion-panel>

        <!-- Semestre 2 -->
        <v-expansion-panel>
          <v-expansion-panel-header>
            <v-btn title="Semestre2" @click="currentSemestre = 'Semestre2'; fetchSemestreData()">Semestre2</v-btn>
          </v-expansion-panel-header>
          <v-expansion-panel-content v-if="currentSemestre === 'Semestre2'">
            <v-data-table
              :headers="headers"
              :items="semestre2Data"
            >
            </v-data-table>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-row>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ChildComponent',
  props: {
    studentId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      headers: [
        { title: 'Date', value: 'date' },
        { title: 'Heures', value: 'heures' },
        { title: 'Statut', value: 'statut' },
        { title: 'Motif', value: 'motif' },
        { title: 'Matière', value: 'matiere' },
      ],
      semestre1Data: [],
      semestre2Data: [],
      currentSemestre: 'Semestre1', // Initialisation à 'Semestre 1'
    };
  },
  methods: {
    fetchSemestreData() {
      axios.get(`http://localhost:8080/api/presence/${this.studentId}/${this.currentSemestre}`)
        .then(response => {
          console.log(response.data); // Pour vérifier les données reçues
          if (this.currentSemestre === 'Semestre1') {
            this.semestre1Data = response.data;
          } else if (this.currentSemestre === 'Semestre2') {
            this.semestre2Data = response.data;
          }
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des données:', error);
        });
    },
  },
  created() {
    // Chargement initial des données pour Semestre 1
    this.fetchSemestreData();
  },
};
</script>
