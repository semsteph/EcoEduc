<template>
  <v-app>
    <v-container fluid>
      <!-- Sélection des semestres -->
      <v-row>
        <v-col
          v-for="semester in semesters"
          :key="semester.id"
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

      <!-- Bouton de génération et téléchargement des fichiers Excel -->
      <v-row class="my-4" justify="center">
        <v-col cols="12" md="6">
          <v-btn block color="green darken-1" @click="generateExcelFile">
            Generer  un fichier Excel
          </v-btn>
        </v-col>
      </v-row>

      <v-spacer class="my-4"></v-spacer>

      <!-- Tableau de données des étudiants -->
      <v-data-table
        :headers="headers"
        :items="students"
        :search="search"
        class="elevation-1"
        :items-per-page="10"
        dense
      >
        <template v-slot:top>
          <v-toolbar flat>
            <v-toolbar-title>Cahier de note</v-toolbar-title>
            <span>{{ matiereNom }}</span>
            <span class="ml-9">{{ currentSemester }}</span>
            <v-spacer></v-spacer>
            <v-btn color="blue darken-1" @click="openImportForm">Valider les notes</v-btn>
            <v-btn color="red darken-1" @click="saveNotes">Sauvegarder</v-btn>
          </v-toolbar>
        </template>

        <!-- Affichage des noms des étudiants -->
        <template v-slot:item.studentName="{ item }">
          <span>{{ item.nom }} {{ item.prenom }}</span>
        </template>

        <!-- Affichage des notes récupérées -->
        <template v-slot:item.inter1="{ item }">
          <span>{{ item.inter1 ? item.inter1 : '' }}</span>
        </template>
        <template v-slot:item.inter2="{ item }">
          <span>{{ item.inter2 ? item.inter2 : '' }}</span>
        </template>
        <template v-slot:item.inter3="{ item }">
          <span>{{ item.inter3 ? item.inter3 : '' }}</span>
        </template>
        <template v-slot:item.inter4="{ item }">
          <span>{{ item.inter4 ? item.inter4 : '' }}</span>
        </template>
        <template v-slot:item.MoyI="{ item }">
          <span>{{ item.MoyI ? item.MoyI : '' }}</span>
        </template>
        <template v-slot:item.Dev1="{ item }">
          <span>{{ item.Dev1 ? item.Dev1 : '' }}</span>
        </template>
        <template v-slot:item.Dev2="{ item }">
          <span>{{ item.Dev2 ? item.Dev2 : '' }}</span>
        </template>
        <template v-slot:item.Moy="{ item }">
          <span>{{ item.Moy ? item.Moy : '' }}</span>
        </template>
        <template v-slot:item.Moycoef="{ item }">
          <span>{{ item.Moycoef ? item.Moycoef : '' }}</span>
        </template>
      </v-data-table>

      <!-- Message de succès -->
      <v-snackbar v-model="snackbar" color="green" timeout="3000">
        {{ snackbarMessage }}
        <v-btn text @click="snackbar = false">Fermer</v-btn>
      </v-snackbar>

      <!-- Bouton retour -->
      <v-row class="mt-4" justify="center">
        <v-col cols="12" md="6" class="text-center">
          <v-btn block color="primary" @click="$emit('back')">Retour</v-btn>
        </v-col>
      </v-row>

      <!-- Formulaire modal pour l'importation des notes -->
      <v-dialog v-model="dialog" max-width="500px">
        <v-card>
          <v-card-title>
            <span class="headline">Importer des notes</span>
          </v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <!-- Select pour le type de note -->
              <v-select
                v-model="selectedNoteType"
                :items="noteTypes"
                label="Type de note"
                required
              ></v-select>

              <!-- Input pour le fichier Excel -->
              <v-file-input
                v-model="selectedFile"
                label="Fichier Excel"
                accept=".xlsx, .xls"
                prepend-icon="mdi-upload"
                required
              ></v-file-input>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue darken-1" text @click="closeImportForm">Annuler</v-btn>
            <v-btn color="green darken-1" text @click="handleFileUpload">Importer</v-btn>
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
    snackbar: false,
    snackbarMessage: '',
    search: '',
    matiereNom: '',
    currentSemester: 'Semestre1',
    semesters: ['Semestre1', 'Semestre2'],
    headers: [
      { title: "Nom/Prénom", value: 'studentName', sortable: false },
      { title: 'Inter 1', value: 'inter1' },
      { title: 'Inter 2', value: 'inter2' },
      { title: 'Inter 3', value: 'inter3' },
      { title: 'Inter 4', value: 'inter4' },
      { title: 'MoyI', value: 'MoyI' },
      { title: 'Devoir 1', value: 'Dev1' },
      { title: 'Devoir 2', value: 'Dev2' },
      { title: 'Moy', value: 'Moy' },
      { title: 'Moycoef', value: 'Moycoef' },
    ],
    students: [],
    noteTypes: ['Inter1', 'Inter2', 'Inter3', 'Inter4',  'Devoir1', 'Devoir2'],
    selectedNoteType: null,
    selectedFile: null,
    valid: false,
  }),

  methods: {
    getButtonColor(semester) {
      return this.currentSemester === semester ? 'primary' : 'secondary';
    },
    
    changeSemester(semester) {
      this.currentSemester = semester;
      this.fetchNotesData();
    },

    // Récupération des étudiants et tri par ordre alphabétique
    async getStudents() {
      try {
        const response = await axios.get(`http://localhost:8080/api/classes/${this.classeId}/eleves`);
        this.students = response.data;

        // Trier les étudiants par ordre alphabétique
        this.students.sort((a, b) => {
          const nomA = a.nom.toUpperCase();
          const nomB = b.nom.toUpperCase();
          return nomA < nomB ? -1 : nomA > nomB ? 1 : 0;
        });

        await this.fetchNotesData(); // Récupérer les notes après avoir récupéré et trié les étudiants
      } catch (error) {
        console.error('Erreur lors de la récupération des élèves', error);
      }
    },

    async fetchSemesters() {
      try {
        const response = await axios.get('http://localhost:8080/api/semesters');
        this.semesters = response.data;
      } catch (error) {
        console.error('Erreur lors de la récupération des semestres', error);
      }
    },

    openImportForm() {
      this.dialog = true;
    },

    closeImportForm() {
      this.dialog = false;
    },

    async handleFileUpload() {
      if (!this.selectedNoteType || !this.selectedFile) {
        return; // Valide les champs avant d'envoyer
      }

      const formData = new FormData();
      formData.append('typeNote', this.selectedNoteType);
      formData.append('file', this.selectedFile);
      formData.append('semestreId', this.getSemesterId(this.currentSemester));
      formData.append('matiereId', this.subjectId);
      formData.append('classeId', this.classeId);

      try {
        await axios.post(`http://localhost:8080/api/upload/excel`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        this.snackbarMessage = 'Importation réussie!';
        this.snackbar = true;
        this.dialog = false;
        this.fetchNotesData();
        this.$refs.form.reset();
      } catch (error) {
        console.error('Erreur lors de l\'importation du fichier Excel', error);
      }
    },

    getSemesterId(semesterName) {
      const semester = this.semesters.find(sem => sem.nom === semesterName);
      return semester ? semester.id : null;
    },

    // Récupération des notes selon le semestre
    async fetchNotesData() {
      try {
        const semesterId = this.getSemesterId(this.currentSemester);
        const response = await axios.get(`http://localhost:8080/api/notes/${this.classeId}/${this.subjectId}/${semesterId}`);
        const notesData = response.data;

        // Associer les notes aux étudiants
        this.students.forEach(student => {
          const studentNotes = notesData.find(note => note.nom === student.nom && note.prenom === student.prenom);
          if (studentNotes) {
            student.inter1 = studentNotes.inter1 !== null ? Number(studentNotes.inter1) : null;
            student.inter2 = studentNotes.inter2 !== null ? Number(studentNotes.inter2) : null;
            student.inter3 = studentNotes.inter3 !== null ? Number(studentNotes.inter3) : null;
            student.inter4 = studentNotes.inter4 !== null ? Number(studentNotes.inter4) : null;
            student.MoyI = studentNotes.moyInter !== null ? Number(studentNotes.moyInter) : null;
            student.Dev1 = studentNotes.Dev1 !== null ? Number(studentNotes.Dev1) : null;
            student.Dev2 = studentNotes.Dev2 !== null ? Number(studentNotes.Dev2) : null;
            student.Moy = studentNotes.moy !== null ? Number(studentNotes.moy) : null;
            student.Moycoef = studentNotes.coeff !== null ? Number(studentNotes.coeff) : null;
          }
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des notes', error);
      }
    },

    async saveNotes() {
      try {
        const semestreId = this.getSemesterId(this.currentSemester);

        // Structurer les données envoyées
        const payload = {
          classeId: this.classeId,
          subjectId: this.subjectId,
          semesterId: semestreId,
          notes: this.students.map((student) => ({
            nom:student.nom,
            prenom:student.prenom,
            MoyI: student.MoyI ,
            Moy: student.Moy ,
            Moycoef: student.Moycoef
          })),
        };

        // Envoyer les données au backend
        await axios.post(`http://localhost:8080/api/notes/save`, payload);
        
        this.snackbarMessage = 'Notes sauvegardées avec succès !';
        this.snackbar = true;
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des notes', error);
        this.snackbarMessage = 'Échec de la sauvegarde des notes.';
        this.snackbar = true;
      }
    },
    async generateExcelFile() {
      try {
        const response = await axios({
          url: `http://localhost:8080/api/export/excel/${this.classeId}`,
          method: 'POST',
          responseType: 'blob',
        });

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

  async mounted() {
    await this.fetchSemesters();
    await this.getStudents();
  },
};
</script>
<style scoped>
.v-btn--active {
  background-color: #1976d2;
  color: white;
}
</style>