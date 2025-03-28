<template>
  <div>
    <!-- Navigation entre les semestres -->
    <v-btn-toggle v-model="currentSemestre" mandatory class="mb-4">
      <v-btn 
        v-for="semestre in semestres" 
        :key="semestre.nom" 
        :value="semestre.nom" 
        @click="selectSemestre(semestre.nom)">
        {{ semestre.nom }}
      </v-btn>
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
            <v-text-field 
              v-model="newPunishment.date" 
              label="Date (DD-MM-YYYY)" 
              required 
              :rules="[rules.date]"
            ></v-text-field>
            <v-combobox 
              v-model="newPunishment.punition"
              :items="punishmentOptions"
              label="Punition"
              required
              clearable
              allow-overflow
            ></v-combobox>
            <v-text-field v-model="newPunishment.heure" label="Heure" required></v-text-field>
            <v-text-field v-model="newPunishment.motif" label="Motif" required></v-text-field>
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
import moment from 'moment';

export default {
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
    },
    anneeScolaire: {
      type: String,
      required: true
    },
    anneeScolaireId: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      currentSemestre: '',
      semestres: [],
      punishmentData: [],
      allPunishmentData: {},
      showAddPunishmentForm: false,
      errorMessage: '',
      newPunishment: {
        auteur: '',
        date: '',
        punition: '',
        heure: '',
        motif: '',
      },
      punishmentOptions: ['2h', '4h', '8h'],
      headers: [
        { title: 'Auteur', value: 'auteur' },
        { title: 'Punition', value: 'punition' },
        { title: 'Date', value: 'date' },
        { title: 'Heure', value: 'heure' },
        { title: 'Motif', value: 'motif' },
        { title: 'Somme d\'heures', value: 'total_hours' },
      ],
      rules: {
        date: value => {
          return moment(value, 'DD-MM-YYYY', true).isValid() || 'Date invalide. Le format attendu est DD-MM-YYYY.';
        }
      }
    };
  },
  methods: {
    async fetchSemesters() {
      try {
        const response = await axios.get(`http://localhost:8080/api/semesters/${this.etablissementId}`);
        this.semestres = response.data.map(sem => ({
          nom: sem.nom,
        }));

        if (this.semestres.length > 0) {
          this.currentSemestre = this.semestres[0].nom;
          this.fetchSemestreData();
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des semestres', error);
      }
    },
    selectSemestre(semestreNom) {
      this.currentSemestre = semestreNom;
      this.fetchSemestreData();
    },
    fetchSemestreData() {
      axios.get(`http://localhost:8080/api/incident`, {
        params: {
          eleveId: this.studentId,
          semestre: this.currentSemestre,
          anneeScolaireId: this.anneeScolaireId
        },
      })
      .then(response => {
        this.allPunishmentData[this.currentSemestre] = response.data.map(item => ({
          ...item,
          date: moment(item.date, 'YYYY-MM-DD').format('DD-MM-YYYY'), // Formater la date pour l'affichage
        }));

        this.punishmentData = this.allPunishmentData[this.currentSemestre] || [];
      })
      .catch(error => {
        console.error("Erreur lors de la récupération des données:", error);
      });
    },
    addPunishment() {
      // Formater la date au format YYYY-MM-DD avant l'envoi
      const formattedDate = moment(this.newPunishment.date, 'DD-MM-YYYY').format('YYYY-MM-DD');
      // Formater l'heure
      const formattedHeure = moment(this.newPunishment.heure, ['HH:mm', 'H:mm']).format('HH:mm');

      axios.post(`http://localhost:8080/api/incidents`, {
        eleveId: this.studentId,
        semestre: this.currentSemestre,
        auteur: this.newPunishment.auteur,
        date: formattedDate,
        punition: this.newPunishment.punition,
        heure: formattedHeure, // Envoi de l'heure formatée
        motif: this.newPunishment.motif,
        etablissementId: this.etablissementId,
        anneeScolaireId: this.anneeScolaireId
      })
      .then(response => {
        if (!this.allPunishmentData[this.currentSemestre]) {
          this.allPunishmentData[this.currentSemestre] = [];
        }

        this.allPunishmentData[this.currentSemestre].push({
          ...response.data,
          date: moment(response.data.date, 'YYYY-MM-DD').format('DD-MM-YYYY'), // Formater la date à l'affichage
        });

        this.punishmentData = this.allPunishmentData[this.currentSemestre];
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
    this.fetchSemesters();
  },
};
</script>
