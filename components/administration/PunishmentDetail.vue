<template>
  <v-container fluid class="pa-2">
    <!-- Bouton retour -->
    <v-btn
      icon
      class="ma-2"
      @click="$emit('back')"
      :size="$vuetify.display.smAndDown ? 'x-small' : 'default'"
    >
      <v-icon :size="$vuetify.display.smAndDown ? 16 : 24">mdi-arrow-left</v-icon>
    </v-btn>

    <!-- Liste des élèves -->
    <v-card
      color="light-blue lighten-4"
      elevation="2"
      class="pa-2 rounded-lg"
      v-if="!selectedStudentId"
    >
      <v-card-title class="text-subtitle-1 text-md-h6 font-weight-bold">
        Liste des élèves
      </v-card-title>

      <v-card-text>
        <v-row dense>
          <template v-if="eleves.length > 0">
            <v-col
              v-for="eleve in eleves"
              :key="eleve.id"
              cols="12"
              sm="6"
              md="4"
            >
              <v-card
                class="ma-1"
                outlined
                elevation="1"
                hover
                @click="selectStudent(eleve.id)"
              >
                <v-card-title
                  class="text-body-2 text-md-body-1 font-weight-medium justify-center text-center"
                >
                  {{ eleve.prenom }} {{ eleve.nom }}
                </v-card-title>
              </v-card>
            </v-col>
          </template>

          <template v-else>
            <v-col cols="12">
              <v-alert type="info" color="info" border="start" density="compact">
                Aucun élève n'est encore inscrit dans la classe sélectionnée.<br />
                Veuillez aller dans la Gestion des classes pour inscrire des élèves dans cette classe.
              </v-alert>
            </v-col>
          </template>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Cahier de punition de l'élève sélectionné -->
    <cahier-punition
      v-else
      :student-id="selectedStudentId"
      :annee-scolaire="anneeScolaire"
      :annee-scolaire-id="anneeScolaireId"
      :etablissement-id="etablissementId"
      @back="clearSelection"
    />
  </v-container>
</template>

<script>
import axios from 'axios'
import CahierPunition from './CahierPunition.vue'

export default {
  name: 'PunishmentDetail',
  components: { CahierPunition },
  props: {
    classId: { type: Number, required: true },
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true }
  },
  data() {
    return {
      eleves: [],
      selectedStudentId: null,
    }
  },
  methods: {
    fetchStudents() {
      axios
        .get(`http://localhost:8080/api/eleves/${this.classId}/${this.anneeScolaireId}`)
        .then((response) => {
          this.eleves = response.data
        })
        .catch((error) => {
          console.error('Erreur lors de la récupération des élèves:', error)
        })
    },
    selectStudent(studentId) {
      this.selectedStudentId = studentId
    },
    clearSelection() {
      this.selectedStudentId = null
    }
  },
  created() {
    this.fetchStudents()
  }
}
</script>

<style scoped>
@media (max-width: 600px) {
  .v-card-title {
    font-size: 0.8rem !important;
  }

  .v-btn {
    min-width: 32px !important;
    height: 32px !important;
  }

  .v-icon {
    font-size: 16px !important;
  }

  .v-card {
    padding: 4px !important;
  }
}
</style>
