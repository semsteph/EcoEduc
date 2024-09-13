<template>
  <v-app>
    <v-container>
      <v-row>
        <v-col
          v-for="semester in semesters"
          :key="semester"
          cols="auto"
        >
          <v-btn
            :color="getButtonColor(semester.nom)"
            @click="changeSemester(semester.nom)"
            :class="{ 'v-btn--active': currentSemester === semester.nom }"
          >
            {{ semester.nom }}
          </v-btn>
        </v-col>
      </v-row>

      <v-row class="my-4">
        <v-col>
          <v-btn color="green darken-1" @click="generateExcelFile">
            Gestion avec fichier Excel
          </v-btn>
        </v-col>
      </v-row>

      <v-spacer class="my-4"></v-spacer>

      <v-data-table
        :headers="headers"
        :items="students"
        :search="search"
      >
        <template v-slot:top>
          <v-toolbar flat>
            <v-toolbar-title>Cahier de note</v-toolbar-title>
            <span>{{ matiereNom }}</span>
            <span class="ml-9">{{ currentSemester }}</span>
            <v-spacer></v-spacer>
            <v-btn color="blue darken-1" @click="validateNotes">Valider les notes</v-btn>
          </v-toolbar>
        </template>

        <template v-slot:item.name="{ item }">
          <span>{{ item.studentName }}</span>
        </template>
      </v-data-table>

      <v-row class="mt-4">
        <v-col class="text-center">
          <v-btn color="primary" @click="$emit('back')">Retour</v-btn>
        </v-col>
      </v-row>
    </v-container>
  </v-app>
</template>

<script>
import axios from 'axios';

export default {
  props: {
    subjectId: {
      type: Number,
      required: true,
    },
    classeId: {
      type: Number,
      required: true, 
    },
  },
  data: () => ({
    dialog: false,
    search: '',
    matiereNom: '',
    currentSemester: 'Semestre1',
    semesters: ['Semestre1', 'Semestre2'],
    headers: [
      { title: "Nom/Prénom", value: 'name', sortable: false },
      { title: 'Coef', value: 'coef' },
      { title: 'Inter 1', value: 'interro1' },
      { title: 'Inter 2', value: 'interro2' },
      { title: 'Inter 3', value: 'interro3' },
      { title: 'Inter 4', value: 'interro4' },
      { title: 'TP1', value: 'TP1' },
      { title: 'TP2', value: 'TP2' },
      { title: 'Moy Inter', value: 'averageInterro' },
      { title: 'Devoir 1', value: 'devoir1' },
      { title: 'Devoir 2', value: 'devoir2' },
      { title: 'Moy Devoir', value: 'averageDevoir' },
      { title: 'Rang Final', value: 'finalRank' },
      { title: 'Actions', value: 'actions', sortable: false },
    ],
    students: [],
  }),

  methods: {
    getButtonColor(semester) {
      return this.currentSemester === semester ? 'primary' : 'secondary';
    },
    
    changeSemester(semester) {
      this.currentSemester = semester;
      this.fetchNotesData();
    },

    async getStudents() {
      try {
        const response = await axios.get(`http://localhost:8080/api/classes/${this.classeId}/eleves`);
        this.students = response.data.map(student => ({
          ...student,
          studentName: `${student.nom} ${student.prenom}`,
        }));
      } catch (error) {
        console.error('Erreur lors de la récupération des élèves', error);
      }
    },
    
    async fetchSemesters() {
      try {
        const response = await axios.get('http://localhost:8080/api/semesters');
        this.semesters = response.data;
      } catch (error) {
        console.error('Erreur lors de la récupération des trimestres', error);
      }
    },

    validateNotes() {
      // Implémentez votre logique de validation ici
    },

    async generateExcelFile() {
      try {
        const response = await axios.post('http://localhost:8080/api/export/excel', {
          classeId: this.classeId,
          semester: this.currentSemester,
        });

        // Gérer la réponse et télécharger le fichier
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Classe_${this.classeId}_Semestre_${this.currentSemester}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();

      } catch (error) {
        console.error('Erreur lors de la génération du fichier Excel', error);
      }
    },
  },

  async created() {
    this.getStudents();
    this.fetchSemesters();
  },
  mounted() {
    this.getStudents();
  },
};
</script>

<style scoped>
.v-btn--active {
  background-color: #1976d2 !important;
  color: white !important;
}
</style>
