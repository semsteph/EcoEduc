<template>
  <div>
    <!-- Navigation entre les semestres -->
    <v-btn-toggle v-model="selectedSemester" mandatory class="mb-4">
      <v-btn value="Semestre1" @click="fetchSemestreData">Semestre 1</v-btn>
      <v-btn value="Semestre2" @click="fetchSemestreData">Semestre 2</v-btn>
    </v-btn-toggle>

    <!-- Tableau des punitions -->
    <v-card class="pa-4 elevation-2">
      <v-data-table
        :headers="headers"
        :items="punishmentData"
        class="elevation-1"
        :items-per-page="10"
      >
        <template v-slot:top>
          <v-toolbar flat color="blue darken-1">
            <v-toolbar-title class="white--text">Gestion des Punitions</v-toolbar-title>
            <v-divider class="mx-4" inset vertical></v-divider>
            <v-spacer></v-spacer>
            <v-btn color="white--text" dark @click="showAddPunishmentForm = true">Ajouter une Punition</v-btn>
          </v-toolbar>
        </template>
      </v-data-table>
    </v-card>

    <!-- Formulaire d'ajout de punition -->
    <v-dialog v-model="showAddPunishmentForm" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="white--text">Ajouter une Punition</span>
        </v-card-title>

        <v-card-text>
          <v-form ref="form">
            <v-text-field v-model="newPunishment.auteur" label="Auteur" required></v-text-field>
            <v-text-field v-model="newPunishment.date" label="Date (YYYY-MM-DD)" required></v-text-field>
            <v-text-field v-model="newPunishment.punition" label="Punition" required></v-text-field>
            <v-text-field v-model="newPunishment.heure" label="Heure (HH:mm)" required></v-text-field>
            <v-text-field v-model="newPunishment.motif" label="Motif" required></v-text-field>
            <v-text-field v-model="newPunishment.total_hours" label="Somme d'heures" required></v-text-field>
          </v-form>
        </v-card-text>

        <v-card>
          <v-alert
            v-if="errorMessage"
            :value="true"
            type="error"
            outlined
            border="left"
            colored-border
            color="red darken-2"
            class="my-5"
          >
            {{ errorMessage }}
          </v-alert>
        </v-card>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green darken-1" dark @click="addPunishment">Ajouter</v-btn>
          <v-btn text @click="showAddPunishmentForm = false">Annuler</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  props: {
    studentId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      selectedSemester: 'Semestre1',
      punishmentData: [],
      showAddPunishmentForm: false,
      errorMessage: '',
      newPunishment: {
        auteur: '',
        date: '',
        punition: '',
        heure: '',
        motif: '',
        total_hours: '',
      },
      headers: [
        { title: 'Auteur', value: 'auteur' },
        { title: 'Punition', value: 'punition' },
        { title: 'Date', value: 'date' },
        { title: 'Heure', value: 'heure' },
        { title: 'Motif', value: 'motif' },
        { title: 'Somme d\'heures', value: 'total_hours' },
      ],
    };
  },
  methods: {
    fetchSemestreData() {
      axios.get(`http://localhost:8080/api/incidents`, {
        params: {
          eleveId: this.studentId,
          semestre: this.selectedSemester,
        },
      })
      .then(response => {
        this.punishmentData = response.data.map(item => {
          return {
            ...item,
            formattedDate: new Date(item.date).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            }),
          };
        });
      })
      .catch(error => {
        console.error("Erreur lors de la récupération des données:", error);
      });
    },
    addPunishment() {
      axios.post(`http://localhost:8080/api/incidents`, {
        eleveId: this.studentId,
        semestre: this.selectedSemester,
        auteur: this.newPunishment.auteur,
        date: this.newPunishment.date,
        punition: this.newPunishment.punition,
        heure: this.newPunishment.heure,
        motif: this.newPunishment.motif,
        total_hours: this.newPunishment.total_hours,
      })
      .then(response => {
        this.punishmentData.push(response.data);
        this.showAddPunishmentForm = false;
        this.$refs.form.reset();
        this.errorMessage = '';
      })
      .catch(error => {
        if (error.response && error.response.data) {
          this.errorMessage = error.response.data.error;
        } else {
          this.errorMessage = 'Une erreur est survenue lors de la soumission.';
        }
      });
    },
  },
  mounted() {
    this.fetchSemestreData();
  },
};
</script>

<style scoped>
.v-btn-toggle {
  margin-bottom: 16px;
}

.v-card-title {
  font-weight: bold;
}

.v-toolbar-title {
  font-size: 20px;
  font-weight: bold;
}

.elevation-1 {
  box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.24);
}

.v-dialog {
  max-width: 600px;
}

.v-btn {
  margin: 5px;
}
</style>
