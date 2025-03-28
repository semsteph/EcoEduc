<template>
  <v-card>
    <!-- Expansion Panel for Semester Selection -->
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

    <!-- Toolbar with Title and Save Button -->
    <v-toolbar color="blue lighten-1" dark>
      <v-toolbar-title class="font-weight-bold">Gérer Conduite</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn color="yellow darken-2" @click="save" elevation="2">Sauvegarder</v-btn>
    </v-toolbar>

    <!-- Data Table for Conduct Records -->
    <v-card-text>
      <v-container fluid>
        <v-data-table
          :headers="headers"
          :items="conductRecords"
          item-key="studentId"
          :items-per-page="5"
          class="elevation-2 rounded"
        >
          <template v-slot:item="{ item }">
            <tr>
              <td>
                <v-select
                  :items="students"
                  item-value="id"
                  item-title="fullName"
                  v-model="item.studentId"
                  dense
                  hide-details
                  readonly
                  style="width: 225px;"
                ></v-select>
              </td>
              <td>
                <v-text-field
                  v-model="item.date"
                  type="date"
                  dense
                  hide-details
                  style="width: 150px;"
                ></v-text-field>
              </td>
              <td>
                <v-text-field
                  v-model="item.hour"
                  type="time"
                  dense
                  hide-details
                  style="width: 90px;"
                ></v-text-field>
              </td>
              <td>
                <v-combobox
                  v-model="item.punition"
                  :items="punitionOptions"
                  dense
                  hide-details
                  placeholder="Choisir ou entrer la punition"
                  style="width: 150px;"
                ></v-combobox>
              </td>
              <td>
                <v-textarea
                  v-model="item.motif"
                  dense
                  hide-details
                  rows="1"
                  auto-grow
                  style="width: 200px;"
                ></v-textarea>
              </td>
              <td>
                <span class="font-weight-bold">{{ item.totalHours }} heures</span>
              </td>
              <td>
                <v-textarea
                  v-model="item.auteur"
                  dense
                  hide-details
                  rows="1"
                  auto-grow
                  placeholder="Nom et prénom de l'auteur"
                  style="width: 200px;"
                ></v-textarea>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-container>
    </v-card-text>

    <!-- Card Actions for Back Button -->
    <v-card-actions>
      <v-btn color="blue darken-2" dark @click="$emit('back')">Retour</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ConductManager',
  props: {
    classeId: {
      type: Number,
      required: true
    },
    etablissementId: { // Ajout de la prop pour recevoir l'ID de l'établissement
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
        { title: 'Élève', value: 'studentId' },
        { title: 'Date', value: 'date' },
        { title: 'Heure', value: 'hour' },
        { title: 'Punition', value: 'punition' },
        { title: 'Motif', value: 'motif' },
        { title: 'Somme des heures', value: 'totalHours' },
        { title: 'Auteur', value: 'auteur' },
      ],
      punitionOptions: ['2h', '4h', '8h'],
      students: [],
      conductRecords: [],
    };
  },
  methods: {
    async fetchStudents() {
      try {
        const response = await axios.get(`http://localhost:8080/api/classes/${this.classeId}/eleves`);
        this.students = response.data.map(student => ({
          id: student.id,
          fullName: `${student.nom} ${student.prenom}`
        }));
        await this.fetchConductRecords();
      } catch (error) {
        console.error("Erreur lors de la récupération des élèves :", error);
      }
    },
    getButtonColor(semester) {
      return this.currentSemester === semester ? 'primary' : 'secondary';
    },
    changeSemester(semester) {
      this.currentSemester = semester;
      this.fetchConductRecords();
    },
    async fetchConductRecords() {
      try {
        this.conductRecords = await Promise.all(this.students.map(async student => {
          const totalHours = await this.fetchTotalHours(student.id);
          return {
            studentId: student.id,
            studentName: student.fullName,
            date: '',
            hour: '',
            punition: '',
            motif: '',
            totalHours: totalHours || 0,
            auteur: ''
          };
        }));
      } catch (error) {
        console.error('Erreur lors de la récupération des enregistrements de conduite :', error);
      }
    },
    async fetchTotalHours(studentId) {
      try {
        const response = await axios.get(`http://localhost:8080/api/punitions/somme-heures/${studentId}/${this.anneeScolaireId}`);
        return response.data.totalHours;
      } catch (error) {
        console.error('Erreur lors de la récupération des heures de punition :', error);
        return 0;
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
        const validRecords = this.conductRecords.filter(record => {
          return record.date && record.hour && record.punition && record.motif && record.auteur;
        });

        if (validRecords.length === 0) {
          console.warn('Aucun enregistrement valide à sauvegarder.');
          return;
        }

        const payload = {
          semester: this.currentSemester,
          etablissementId:this.etablissementId,
          records: validRecords,
          anneeScolaireId: this.anneeScolaireId
        };

        await axios.post('http://localhost:8080/api/save/conduct', payload);

        validRecords.forEach(record => {
          record.punition = '';
          record.motif = '';
          record.date = '';
          record.hour = '';
          record.auteur = '';
        });
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des données :', error);
      }
    }
  },
  created() {
    this.fetchStudents();
    this.fetchSemesters();
  },
};
</script>

<style scoped>
.v-card {
  border-radius: 16px;
  padding: 16px;
  background-color: #f5f5f5;
}

.v-btn--active {
  background-color: #ffc107 !important;
}

.v-toolbar-title {
  font-size: 24px;
}

.v-data-table tr td {
  padding: 8px;
}
</style>
