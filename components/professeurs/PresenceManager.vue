<template>
  <v-app>
    <v-container class="px-2 sm:px-4">
      <h1 class="text-xl sm:text-2xl font-bold mb-4 text-center">
        Veuillez Informez que les absences
      </h1>

      <!-- Semester Buttons -->
      <v-row class="flex flex-wrap justify-center gap-2 mb-4">
        <v-col
          v-for="semester in semesters"
          :key="semester.id"
          cols="auto"
          class="p-1"
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

      <!-- Responsive Data Table Wrapper -->
      <div class="overflow-x-auto">
        <div class="inline-block min-w-full align-middle transition-transform duration-300 
                    scale-100 sm:scale-95 md:scale-90 lg:scale-90 xl:scale-90 2xl:scale-100">

          <v-data-table
            :headers="headers"
            :items="students"
            item-key="id"
            class="elevation-1 rounded-lg shadow-md border border-gray-200"
            hide-default-footer
          >
            <template v-slot:top>
              <v-toolbar flat class="flex flex-wrap justify-between items-center px-2 sm:px-4">
                <v-toolbar-title class="text-base sm:text-lg">Gérer Présence</v-toolbar-title>
                <v-btn color="primary" @click="save">Sauvegarder</v-btn>
              </v-toolbar>
            </template>

            <!-- Table Columns -->
            <template v-slot:item.name="{ item }">
              <div class="text-sm sm:text-base">{{ item.name }}</div>
            </template>
            <template v-slot:item.date="{ item }">
              <v-text-field
                v-model="item.date"
                label="Date"
                type="date"
                dense
                class="w-full"
              ></v-text-field>
            </template>
            <template v-slot:item.status="{ item }">
              <v-select
                v-model="item.status"
                :items="statuses"
                label="Statut"
                dense
                class="w-full"
              ></v-select>
            </template>

            <!-- Bottom Slot -->
            <template v-slot:bottom>
              <v-row class="mt-4">
                <v-col class="text-center">
                  <v-btn color="primary" @click="$emit('back')">Retour</v-btn>
                </v-col>
              </v-row>
            </template>
          </v-data-table>
        </div>
      </div>

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
    classeId: Number,
    subjectId: Number,
    etablissementId: Number,
    anneeScolaire: String,
    anneeScolaireId: Number,
  },
  data() {
    return {
      currentSemester: '',
      semesters: [],
      headers: [
        { title: 'Nom/Prenom', value: 'name' },
        { title: 'Date', value: 'date' },
        { title: 'Statut', value: 'status' },
      ],
      statuses: ['Absent', 'Permissionaire'],
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
          .filter(student => student.date && student.status)
          .map(student => ({
            eleveId: student.id,
            date: student.date,
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
        this.students = this.students.map(student => ({
          ...student,
          date: '',
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
