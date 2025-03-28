<template>
  <v-app>
    <v-container>
      <h1>Veuillez Informez que les absences</h1>

      <!-- Semester Buttons -->
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

      <!-- Spacer for margin -->
      <v-spacer class="my-4"></v-spacer>

      <!-- Data Table -->
      <v-data-table
        :headers="headers"
        :items="students"
        item-key="id"
        class="elevation-1"
      >
        <template v-slot:top>
          <v-toolbar flat>
            <v-toolbar-title>Gérer Présence</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="save">Sauvegarder</v-btn>
          </v-toolbar>
        </template>

        <!-- Data Table Slots -->
        <template v-slot:item.name="{ item }">
          <span>{{ item.name }}</span>
        </template>
        <template v-slot:item.date="{ item }">
          <v-text-field
            v-model="item.date"
            label="Date"
            type="date"
          ></v-text-field>
        </template>
        <template v-slot:item.time="{ item }">
          <v-text-field
            v-model="item.time"
            label="Heure"
            placeholder="17h00-18h00"
          ></v-text-field>
        </template>
        <template v-slot:item.status="{ item }">
          <v-select
            v-model="item.status"
            :items="statuses"
            label="Statut"
          ></v-select>
        </template>

        <!-- Bottom Button -->
        <template v-slot:bottom>
          <v-row class="mt-4">
            <v-col class="text-center">
              <v-btn color="primary" @click="$emit('back')">Retour</v-btn>
            </v-col>
          </v-row>
        </template>
      </v-data-table>

      <!-- Success Dialog -->
      <v-dialog v-model="successDialog" max-width="500">
        <v-card>
          <v-card-title>Succès</v-card-title>
          <v-card-text>Les données ont été sauvegardées avec succès !</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="successDialog = false">OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Error Dialog -->
      <v-dialog v-model="errorDialog" max-width="500">
        <v-card>
          <v-card-title>Erreur</v-card-title>
          <v-card-text>Une erreur est survenue lors de la sauvegarde des données.</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="errorDialog = false">OK</v-btn>
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
    classeId: {
      type: Number,
      required: true,
    },
    subjectId: {
      type: Number,
      required: true,
    },
    etablissementId: {
      type: Number,
      required: true,
    },
    anneeScolaire: {
      type: String,
      required: true,
    },
    anneeScolaireId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      currentSemester: '',
      semesters: [],
      headers: [
        { title: 'Nom/Prenom', value: 'name' },
        { title: 'Date', value: 'date' },
        { title: 'Heure', value: 'time' },
        { title: 'Statut', value: 'status' },
      ],
      statuses: ['Présent', 'Absent', 'Permissionaire'],
      students: [],
      successDialog: false,
      errorDialog: false,
    };
  },
  methods: {
    getButtonColor(semester) {
      return this.currentSemester === semester ? 'primary' : 'secondary';
    },
    changeSemester(semester) {
      this.currentSemester = semester;
      this.fetchSemesters();
      this.getStudents();
    },
    async getStudents() {
      try {
        const response = await axios.get(`http://localhost:8080/api/classes/${this.classeId}/eleves`);
        this.students = response.data.map(student => ({
          ...student,
          name: `${student.nom} ${student.prenom}`,
          date: '',
          time: '17h00-18h00',
          status: '',
        }));
      } catch (error) {
        console.error('Erreur lors de la récupération des élèves:', error);
      }
    },
    async fetchSemesters() {
      try {
        const response = await axios.get(`http://localhost:8080/api/semesters/${this.etablissementId}`);
        this.semesters = response.data;
        if (this.semesters.length > 0) {
          this.currentSemester = this.semesters[0].nom;
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des semestres', error);
      }
    },
    async save() {
      try {
        const dataToSave = this.students
          .filter(student => student.date && student.time && student.status)
          .map(student => ({
            eleveId: student.id,
            date: student.date,
            time: student.time,
            status: student.status,
            subjectId: this.subjectId,
            classeId: this.classeId,
            semesterName: this.currentSemester,
            etablissementId: this.etablissementId,
            anneeScolaireId: this.anneeScolaireId,
          }));

        if (dataToSave.length === 0) {
          alert("Aucun élève sélectionné n'a tous ses champs remplis.");
          return;
        }

        await axios.post('http://localhost:8080/api/presence', dataToSave);
        console.log('Données sauvegardées:', dataToSave);
        this.students = this.students.map(student => ({
          ...student,
          date: '',
          time: '',
          status: '',
        }));
        this.successDialog = true;
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des données:', error);
        this.errorDialog = true;
      }
    },
  },
  created() {
    this.getStudents();
    this.fetchSemesters();
  },
};
</script>

<style>
.v-btn--active {
  font-weight: bold;
}
</style>
