<template>
  <v-container fluid class="pa-2">
    <!-- Boutons de sélection de semestre -->
    <v-btn-toggle
      v-model="currentSemestre"
      mandatory
      class="mb-4"
      density="compact"
    >
      <v-btn
        v-for="semestre in semestres"
        :key="semestre.nom"
        :value="semestre.nom"
        small
        @click="selectSemestre(semestre.nom)"
      >
        {{ semestre.nom }}
      </v-btn>
    </v-btn-toggle>

    <!-- Tableau scrollable sur mobile -->
    <v-card class="pa-2 elevation-2 rounded-lg">
      <div class="table-wrapper">
        <v-data-table
          :headers="headers"
          :items="punishmentData"
          :items-per-page="10"
          class="elevation-1 rounded"
          density="compact"
        >
          <template v-slot:top>
            <v-toolbar flat color="blue darken-1" density="compact">
              <v-toolbar-title class="white--text text-subtitle-2 text-truncate toolbar-title-mobile">
                Gestion des punitions
              </v-toolbar-title>
              <v-spacer></v-spacer>
              <v-btn
                color="white"
                small
                class="text-blue darken-3 font-weight-bold"
                @click="showAddPunishmentForm = true"
              >
                <v-icon left small>mdi-plus</v-icon>
                Ajouter
              </v-btn>
            </v-toolbar>
          </template>
        </v-data-table>
      </div>
    </v-card>

    <!-- Dialogue d'ajout -->
    <v-dialog v-model="showAddPunishmentForm" max-width="500px">
      <v-card class="pa-2 rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-medium">
          Ajouter une punition
        </v-card-title>

        <v-card-text>
          <v-form ref="form">
            <v-text-field
              v-model="newPunishment.auteur"
              label="Auteur"
              dense
              required
            />
            <v-text-field
              v-model="newPunishment.date"
              label="Date (JJ-MM-AAAA)"
              dense
              required
              :rules="[rules.date]"
            />
            <v-combobox
              v-model="newPunishment.punition"
              :items="punishmentOptions"
              label="Punition"
              dense
              clearable
              required
            />
            <v-text-field
              v-model="newPunishment.heure"
              label="Heure (HH:mm)"
              dense
              required
            />
            <v-text-field
              v-model="newPunishment.motif"
              label="Motif"
              dense
              required
            />
          </v-form>

          <v-alert
            v-if="errorMessage"
            type="error"
            dense
            class="mt-2"
            border="start"
            colored-border
          >
            {{ errorMessage }}
          </v-alert>
        </v-card-text>

        <v-card-actions class="pa-2">
          <v-spacer></v-spacer>
          <v-btn
            color="green darken-1"
            small
            dark
            @click="addPunishment"
          >
            Enregistrer
          </v-btn>
          <v-btn small text @click="showAddPunishmentForm = false">Annuler</v-btn>
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
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true }
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
        date: value =>
          moment(value, 'DD-MM-YYYY', true).isValid() ||
          'Date invalide. Format attendu : JJ-MM-AAAA.'
      }
    }
  },
  methods: {
    async fetchSemesters() {
      try {
        const response = await axios.get(
          `http://localhost:8080/api/semesters/${this.etablissementId}`
        )
        this.semestres = response.data.map((sem) => ({ nom: sem.nom }))
        if (this.semestres.length > 0) {
          this.currentSemestre = this.semestres[0].nom
          this.fetchSemestreData()
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des semestres', error)
      }
    },
    selectSemestre(semestreNom) {
      this.currentSemestre = semestreNom
      this.fetchSemestreData()
    },
    fetchSemestreData() {
      axios
        .get(`http://localhost:8080/api/incident`, {
          params: {
            eleveId: this.studentId,
            semestre: this.currentSemestre,
            anneeScolaireId: this.anneeScolaireId
          }
        })
        .then((response) => {
          this.allPunishmentData[this.currentSemestre] = response.data.map(
            (item) => ({
              ...item,
              date: moment(item.date, 'YYYY-MM-DD').format('DD-MM-YYYY')
            })
          )
          this.punishmentData = this.allPunishmentData[this.currentSemestre] || []
        })
        .catch((error) => {
          console.error('Erreur lors de la récupération des données:', error)
        })
    },
    addPunishment() {
      const formattedDate = moment(this.newPunishment.date, 'DD-MM-YYYY').format('YYYY-MM-DD')
      const formattedHeure = moment(this.newPunishment.heure, ['HH:mm', 'H:mm']).format('HH:mm')

      axios
        .post(`http://localhost:8080/api/incidents`, {
          eleveId: this.studentId,
          semestre: this.currentSemestre,
          auteur: this.newPunishment.auteur,
          date: formattedDate,
          punition: this.newPunishment.punition,
          heure: formattedHeure,
          motif: this.newPunishment.motif,
          etablissementId: this.etablissementId,
          anneeScolaireId: this.anneeScolaireId
        })
        .then((response) => {
          if (!this.allPunishmentData[this.currentSemestre]) {
            this.allPunishmentData[this.currentSemestre] = []
          }

          this.allPunishmentData[this.currentSemestre].push({
            ...response.data,
            date: moment(response.data.date, 'YYYY-MM-DD').format('DD-MM-YYYY')
          })

          this.punishmentData = this.allPunishmentData[this.currentSemestre]
          this.showAddPunishmentForm = false
          this.$refs.form.reset()
          this.errorMessage = ''
        })
        .catch((error) => {
          this.errorMessage =
            error.response?.data?.error || 'Une erreur est survenue lors de la soumission.'
        })
    }
  },
  mounted() {
    this.fetchSemesters()
  }
}
</script>

<style scoped>
.table-wrapper {
  overflow-x: auto;
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 600px) {
  .v-data-table-header th,
  .v-data-table td {
    font-size: 0.7rem !important;
    padding: 4px !important;
    white-space: nowrap;
  }

  .v-btn {
    font-size: 0.75rem !important;
    min-height: 30px !important;
  }

  .v-icon {
    font-size: 16px !important;
  }

  .toolbar-title-mobile {
    font-size: 0.8rem !important;
    max-width: 140px;
  }

  .v-card-title {
    font-size: 0.85rem !important;
  }
}
</style>
