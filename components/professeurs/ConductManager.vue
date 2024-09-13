<template>
  <v-card>
    <!-- Expansion Panel for Semester Selection -->
    <v-expansion-panels>
      <v-expansion-panel v-model="currentSemester">
        <v-expansion-panel-header>
          <span class="font-weight-bold">Choisir Semestre</span>
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-btn-toggle v-model="currentSemester" mandatory>
            <v-btn value="Semestre1">Semestre 1</v-btn>
            <v-btn value="Semestre2">Semestre 2</v-btn>
          </v-btn-toggle>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>

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
          item-key="id"
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
              <!-- Total hours calculated -->
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
    }
  },
  data() {
    return {
      currentSemester: 'Semestre1',
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
        this.students = response.data.map((student) => ({
          id: student.id,
          fullName: `${student.nom} ${student.prenom}`
        }));
        await this.fetchConductRecords();
      } catch (error) {
        console.error("Erreur lors de la récupération des élèves :", error);
      }
    },
    changeSemester(semester) {
      this.currentSemester = semester;
      this.fetchConductRecords();
    },
    async fetchConductRecords() {
      try {
        this.conductRecords = await Promise.all(this.students.map(async (student) => {
          const totalHours = await this.fetchTotalHours(student.id);
          return {
            studentId: student.id,
            studentName: student.fullName,
            date: '',
            hour: '',
            punition: '',
            motif: '',
            totalHours: totalHours || 0, // Calcul des heures de punition
            auteur: ''
          };
        }));
      } catch (error) {
        console.error('Erreur lors de la récupération des enregistrements de conduite :', error);
      }
    },
    async fetchTotalHours(studentId) {
      try {
        const response = await axios.get(`http://localhost:8080/api/punitions/somme-heures/${studentId}`);
        return response.data.totalHours; // API retourne la somme des heures
      } catch (error) {
        console.error('Erreur lors de la récupération des heures de punition :', error);
        return 0;
      }
    },
    async save() {
      try {
        // Filtrer les enregistrements avec les champs requis remplis
        const validRecords = this.conductRecords.filter((record) => {
          return record.date && record.hour && record.punition && record.motif && record.auteur;
        });

        if (validRecords.length === 0) {
          console.warn('Aucun enregistrement valide à sauvegarder.');
          return;
        }

        const payload = {
          semester: this.currentSemester,
          records: validRecords, // Seuls les enregistrements valides seront envoyés
        };

        await axios.post('http://localhost:8080/api/save/conduct', payload);

        // Réinitialiser les champs après la sauvegarde pour les enregistrements valides uniquement
        validRecords.forEach((record) => {
          record.punition = '';
          record.motif = '';
          record.date = '';
          record.hour = '';
          record.auteur = ''; // Ne pas réinitialiser l'auteur
        });
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des données :', error);
      }
    }
  },
  created() {
    this.fetchStudents();
  },
};
</script>

<style scoped>
.v-card {
  border-radius: 16px;
  padding: 16px;
  background-color: #f5f5f5;
}

.v-expansion-panel-header {
  background-color: #2196f3;
  color: white;
}

.v-btn-toggle .v-btn {
  color: white;
  background-color: #ffca28;
}

.v-btn-toggle .v-btn--active {
  background-color: #ffc107 !important;
}

.v-toolbar {
  background-color: #2196f3;
}

.v-toolbar-title {
  font-size: 24px;
  color: white;
}

.v-card-text {
  background-color: white;
  border-radius: 12px;
  padding: 20px;
}

.v-data-table tr td {
  padding: 8px;
}
</style>
