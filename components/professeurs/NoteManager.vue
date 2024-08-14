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
          <v-btn color="green darken-1" @click="openExcelForm">
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

      <!-- Formulaire de gestion avec fichier Excel -->
      <v-dialog v-model="showExcelForm" max-width="600px">
        <v-card>
          <v-card-title>
            <span>Générer un fichier Excel</span>
          </v-card-title>

          <v-card-text>
            <v-form>
              <v-select
                v-model="selectedClasse"
                :items="classes"
                label="Classe"
                item-text="nom"
                item-value="id"
                disabled
              ></v-select>
              <v-select
                v-model="selectedSubject"
                :items="subjects"
                label="Matière"
                item-text="nom"
                item-value="id"
                disabled
              ></v-select>
              <v-select
                v-model="selectedSemester"
                :items="semesters"
                label="Semestre"
                item-title="nom"
                item-value="id"
              ></v-select>
              <v-select
                v-model="selectedNoteType"
                :items="noteTypes"
                label="Type de note"
              ></v-select>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue darken-1" @click="generateExcelFile">
              Générer le fichier Excel
            </v-btn>
            <v-btn color="grey" @click="closeExcelForm">Annuler</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
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
    snackbar: {
      show: false,
      message: '',
      color: 'success'
    },
    students: [],
    editedIndex: -1,
    editedField: '',
    editedItem: {
      studentName: '',
      coef: 0,
      interro1: null,
      interro2: null,
      interro3: null,
      interro4: null,
      TP1: null,
      TP2: null,
      devoir1: null,
      devoir2: null,
      averageInterro: 0,
      averageDevoir: 0,
      finalRank: 0,
    },
    defaultItem: {
      studentName: '',
      coef: 0,
      interro1: null,
      interro2: null,
      interro3: null,
      interro4: null,
      TP1: null,
      TP2: null,
      devoir1: null,
      devoir2: null,
      averageInterro: 0,
      averageDevoir: 0,
      finalRank: 0,
    },
    showExcelForm: false,
    selectedClasse: null,
    selectedSubject: null,
    selectedSemester: null,
    selectedNoteType: null,
    classes: [],  // Remplir avec les classes disponibles
    subjects: [], // Remplir avec les matières disponibles
    noteTypes: ['Interro', 'Devoir', 'TP'], // Types de notes possibles
  }),

  computed: {
    formTitle() {
      return this.editedIndex === -1 ? 'Nouvel Élève' : 'Modifier Élève';
    },
  },
  watch: {
    subjectId(newVal) {
      console.log('L\'ID de la matière a été mis à jour:', newVal);
      // Logique pour mettre à jour les classes en fonction de la nouvelle matière sélectionnée
    }
  },

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

    openExcelForm() {
      this.selectedClasse = this.classeId;
      this.selectedSubject = this.subjectId;
      this.showExcelForm = true;
    },
    closeExcelForm() {
      this.showExcelForm = false;
    },

    async generateExcelFile() {
  try {
    const response = await axios.post('http://localhost:8080/api/export/excel', {
      classeId: this.selectedClasse,
      subjectId: this.subjectId,  // Utilisation de subjectId ici
      semester: this.selectedSemester,
      noteType: this.selectedNoteType,
    });

    // Gérer la réponse et télécharger le fichier
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Classe_${this.selectedClasse}_Semestre_${this.selectedSemester}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    this.showExcelForm = false;
  } catch (error) {
    console.error('Erreur lors de la génération du fichier Excel', error);
  }
},


    editField(item, field) {
      this.editedItem = { ...item };
      this.editedField = field;
      this.dialog = true;
    },

    save() {
      this.dialog = false;
    },

    close() {
      this.dialog = false;
    },

    calculateAverageInterro(item) {
      const values = [
        item.interro1,
        item.interro2,
        item.interro3,
        item.interro4,
        item.TP1,
        item.TP2
      ].filter(v => v !== null && v !== undefined);
      return values.length > 0
        ? values.reduce((acc, val) => acc + val, 0) / values.length
        : 0;
    },

    calculateAverageDevoir(item) {
      const values = [
        item.devoir1,
        item.devoir2
      ].filter(v => v !== null && v !== undefined);
      return values.length > 0
        ? values.reduce((acc, val) => acc + val, 0) / values.length
        : 0;
    }
  },

  async created() {
    this.getStudents();
    this.fetchSemesters();
    console.log('ID de la matière reçu:', this.subjectId);
  },
  mounted() {
    console.log('ID de la matière:', this.subjectId);  // Vérifie que l'ID est bien reçu
    console.log('ID de la classe:', this.classeId);     // Vérifie que l'ID de la classe est bien reçu
    this.getStudents();  // Appelle la méthode pour récupérer les étudiants
  },
};
</script>

<style scoped>
.v-btn--active {
  background-color: #1976d2 !important;
  color: white !important;
}
</style>
