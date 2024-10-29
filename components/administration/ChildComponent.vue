<template>
  <div>
    <v-btn icon @click="$emit('back')">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>
    <v-row justify="center">
      <v-expansion-panels>
        <v-expansion-panel
          v-for="semestre in semestre" :key="semestre.nom">
          <v-expansion-panel-header>
            <v-btn
              :title="semestre.nom"
              @click="selectSemestre(semestre.nom)">
              {{ semestre.nom }}
            </v-btn>
          </v-expansion-panel-header>
          <v-expansion-panel-content v-if="currentSemestre === semestre.nom">
            <v-data-table
              :headers="headers"
              :items="semestre.data"
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
    etablissementId: {
      type: Number,
      required: true
    },
    etablissementNom: {
      type: String,
      required: true
    }
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
      semestre: [], // Liste des semestres
      currentSemestre: '', // Semestre actuel sélectionné
    };
  },
  methods: {
    async fetchSemesters() {
      console.log(this.etablissementId);
      try {
        const response = await axios.get(`http://localhost:8080/api/semesters/${this.etablissementId}`);
        console.log(response.data);
        this.semestre = response.data.map(sem => ({
          nom: sem.nom,
          data: [] // Initialiser un tableau pour les données de chaque semestre
        }));

        // Vérifier s'il y a des semestres récupérés
        if (this.semestre.length > 0) {
          this.currentSemestre = this.semestre[0].nom; // Sélectionner le premier semestre par défaut
          this.fetchSemestreData(this.currentSemestre); // Récupérer les données du premier semestre
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des semestres', error);
      }
    },
    selectSemestre(semestreNom) {
      this.currentSemestre = semestreNom; // Mettre à jour le semestre actuel
      this.fetchSemestreData(semestreNom); // Récupérer les données pour le semestre sélectionné
    },
    fetchSemestreData(semestreNom) {
      axios.get(`http://localhost:8080/api/presence/${this.studentId}/${semestreNom}`)
        .then(response => {
          console.log(response.data); // Pour vérifier les données reçues
          
          // Mettre à jour les données du semestre courant
          const semestreData = this.semestre.find(sem => sem.nom === semestreNom);
          if (semestreData) {
            semestreData.data = response.data; // Affecter les données au semestre
          }
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des données:', error);
        });
    },
  },
  created() {
    this.fetchSemesters(); // Charger les semestres lors de la création du composant
  },
};
</script>
