<template>
  <v-container fluid class="pa-0 pa-sm-4 bg-grey-lighten-4 fill-height align-start">
    <v-row justify="center" class="ma-0 w-100">
      <v-col cols="12" md="10" lg="8" class="pa-2">
        
        <v-card class="mb-4 rounded-xl elevation-2 overflow-hidden" border>
          <v-toolbar color="error-darken-1" flat>
            <v-icon start class="ms-4">mdi-gavel</v-icon>
            <v-toolbar-title class="font-weight-bold text-body-1 text-sm-h6">
              {{ studentPrenom }} {{ studentNom }}
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn
              color="white"
              variant="elevated"
              size="small"
              rounded="pill"
              class="me-4 text-error font-weight-black"
              @click="showAddPunishmentForm = true"
            >
              <v-icon start>mdi-plus</v-icon>
              {{ $vuetify.display.smAndUp ? 'Nouvelle Punition' : 'Ajouter' }}
            </v-btn>
          </v-toolbar>

          <v-card-text class="pa-4 bg-white">
            <div class="text-caption text-grey-darken-1 mb-2 text-uppercase font-weight-bold">
              Sélectionnez la période :
            </div>
            <v-tabs
              v-model="currentSemestre"
              color="error"
              align-tabs="start"
              density="comfortable"
            >
              <v-tab
                v-for="semestre in semestres"
                :key="semestre.nom"
                :value="semestre.nom"
                class="text-none font-weight-bold"
              >
                {{ semestre.nom }}
              </v-tab>
            </v-tabs>
          </v-card-text>
        </v-card>

        <v-card v-if="loadingData" class="rounded-xl pa-10 text-center" border>
          <v-progress-circular indeterminate color="error"></v-progress-circular>
          <div class="mt-2 text-grey">Chargement des punitions...</div>
        </v-card>

        <template v-else>
          <v-card v-if="$vuetify.display.mdAndUp" class="rounded-xl elevation-2" border>
            <v-data-table
              :headers="headers"
              :items="punishmentData"
              class="bg-white"
              hover
              no-data-text="Aucune punition enregistrée pour ce semestre"
            >
              <template v-slot:item.punition="{ item }">
                <v-chip color="error" size="small" variant="flat" class="font-weight-bold">
                  {{ item.punition }}
                </v-chip>
              </template>
              <template v-slot:item.total_hours="{ item }">
                <span class="text-primary font-weight-black">{{ item.total_hours || '0' }}h</span>
              </template>
            </v-data-table>
          </v-card>

          <v-row v-else dense>
            <v-col v-for="(item, i) in punishmentData" :key="i" cols="12">
              <v-card class="rounded-lg mb-2 border-sm" variant="flat" color="white">
                <v-card-text class="pa-3">
                  <div class="d-flex justify-space-between align-center mb-2">
                    <div class="d-flex align-center">
                      <v-icon color="error" size="small" class="me-2">mdi-account-edit</v-icon>
                      <span class="text-subtitle-2 font-weight-black">{{ item.auteur }}</span>
                    </div>
                    <v-chip color="error" size="x-small" variant="tonal" class="font-weight-bold">
                      {{ item.punition }}
                    </v-chip>
                  </div>
                  <div class="bg-grey-lighten-4 rounded pa-2 mb-2">
                    <div class="text-caption text-grey-darken-2 font-weight-bold">Motif :</div>
                    <div class="text-body-2">{{ item.motif }}</div>
                  </div>
                  <div class="d-flex justify-space-between text-caption text-grey-darken-1">
                    <span><v-icon size="14">mdi-calendar</v-icon> {{ item.date }}</span>
                    <span><v-icon size="14">mdi-clock-outline</v-icon> {{ item.heure }}</span>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col v-if="punishmentData.length === 0" cols="12" class="text-center pa-10">
              <v-icon size="64" color="grey-lighten-2">mdi-shield-check</v-icon>
              <div class="text-grey mt-2">Aucun incident enregistré</div>
            </v-col>
          </v-row>
        </template>
      </v-col>
    </v-row>

    <v-dialog v-model="showAddPunishmentForm" max-width="500px" persistent>
      <v-card class="rounded-xl overflow-hidden">
        <v-toolbar color="error" flat>
          <v-btn icon @click="showAddPunishmentForm = false"><v-icon>mdi-close</v-icon></v-btn>
          <v-toolbar-title class="font-weight-bold">Saisie d'un incident</v-toolbar-title>
        </v-toolbar>

        <v-card-text class="pa-6">
          <v-form ref="form" v-model="isFormValid">
            <v-text-field v-model="newPunishment.auteur" label="Auteur" variant="outlined" density="comfortable" required />
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field v-model="newPunishment.date" label="Date" type="date" variant="outlined" density="comfortable" required />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="newPunishment.heure" label="Heure" type="time" variant="outlined" density="comfortable" required />
              </v-col>
            </v-row>
            <v-select v-model="newPunishment.punition" :items="punishmentOptions" label="Type" variant="outlined" density="comfortable" required />
            <v-textarea v-model="newPunishment.motif" label="Motif" variant="outlined" density="comfortable" rows="3" required />
          </v-form>
          <v-alert v-if="errorMessage" type="error" variant="tonal" class="mt-4 rounded-lg" density="compact">{{ errorMessage }}</v-alert>
        </v-card-text>

        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showAddPunishmentForm = false">Annuler</v-btn>
          <v-btn color="error" variant="elevated" rounded="pill" :disabled="!isFormValid" @click="addPunishment">Enregistrer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from 'axios'
import moment from 'moment'

export default {
  props: {
    studentId: { type: Number, required: true },
    studentNom: { type: String, required: true }, // Nouvelle prop
    studentPrenom: { type: String, required: true }, // Nouvelle prop
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true }
  },
  data() {
    return {
      currentSemestre: null,
      semestres: [],
      punishmentData: [],
      loadingData: false,
      showAddPunishmentForm: false,
      isFormValid: false,
      errorMessage: '',
      newPunishment: {
        auteur: '',
        date: new Date().toISOString().substr(0, 10),
        punition: '',
        heure: moment().format('HH:mm'),
        motif: '',
      },
      punishmentOptions: ['2h', '4h', '8h', 'Avertissement', 'Exclusion'],
      headers: [
        { title: 'Auteur', key: 'auteur' },
        { title: 'Punition', key: 'punition', align: 'center' },
        { title: 'Date', key: 'date' },
        { title: 'Heure', key: 'heure' },
        { title: 'Motif', key: 'motif' },
        { title: 'Cumul', key: 'total_hours', align: 'center' },
      ]
    }
  },
  watch: {
    currentSemestre(newVal) {
      if (newVal) this.fetchSemestreData();
    }
  },
  methods: {
    async fetchSemesters() {
      try {
        const response = await axios.get(`http://localhost:8080/api/semesters/${this.etablissementId}`);
        this.semestres = response.data.map(sem => ({ nom: sem.nom }));
        if (this.semestres.length > 0) {
          this.currentSemestre = this.semestres[0].nom;
        }
      } catch (error) {
        console.error('Erreur semestres:', error);
      }
    },
    async fetchSemestreData() {
      if (!this.studentId || !this.currentSemestre || !this.anneeScolaireId) return;

      this.loadingData = true;
      try {
        const response = await axios.get(`http://localhost:8080/api/incident`, {
          params: {
            studentId: this.studentId, 
            semestre: this.currentSemestre,
            anneeScolaireId: this.anneeScolaireId
          }
        });
        this.punishmentData = response.data.map(item => ({
          ...item,
          date: moment(item.date).format('DD-MM-YYYY')
        }));
      } catch (error) {
        console.error('Erreur lors de la récupération:', error);
      } finally {
        this.loadingData = false;
      }
    },
    async addPunishment() {
      try {
        await axios.post(`http://localhost:8080/api/incidents`, {
          eleveId: this.studentId,
          semestre: this.currentSemestre,
          auteur: this.newPunishment.auteur,
          date: this.newPunishment.date,
          punition: this.newPunishment.punition,
          heure: this.newPunishment.heure,
          motif: this.newPunishment.motif,
          etablissementId: this.etablissementId,
          anneeScolaireId: this.anneeScolaireId
        });

        this.showAddPunishmentForm = false;
        this.resetForm();
        await this.fetchSemestreData(); 
      } catch (error) {
        this.errorMessage = error.response?.data?.error || 'Erreur lors de l\'enregistrement.';
      }
    },
    resetForm() {
      this.newPunishment = {
        auteur: '',
        date: new Date().toISOString().substr(0, 10),
        punition: '',
        heure: moment().format('HH:mm'),
        motif: '',
      };
      if (this.$refs.form) this.$refs.form.resetValidation();
    }
  },
  mounted() {
    this.fetchSemesters();
  }
}
</script>