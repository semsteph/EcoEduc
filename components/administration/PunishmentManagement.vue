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

    <!-- Vue des classes -->
    <v-card
      color="blue lighten-4"
      elevation="2"
      class="pa-2 rounded-lg"
      v-if="!selectedClassId"
    >
      <v-card-title class="text-subtitle-1 text-md-h6 font-weight-bold">
        Gestion des cahiers de punition
      </v-card-title>

      <v-card-text>
        <v-row dense>
          <template v-if="classes.length > 0">
            <v-col
              v-for="classe in classes"
              :key="classe.id"
              cols="12"
              sm="6"
              md="4"
            >
              <v-card
                class="ma-1"
                outlined
                elevation="1"
                hover
                @click="goToClass(classe.id)"
              >
                <v-card-title
                  class="text-body-2 text-md-body-1 font-weight-medium justify-center text-center"
                >
                  {{ classe.nom }}
                </v-card-title>
              </v-card>
            </v-col>
          </template>

          <template v-else>
            <v-col cols="12">
              <v-alert type="info" color="info" border="start" density="compact">
                Aucune classe n'est disponible dans votre établissement.<br />
                Veuillez ajouter des classes dans la gestion des classes.
              </v-alert>
            </v-col>
          </template>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Composant enfant -->
    <punishment-detail
      v-else
      :class-id="selectedClassId"
      :annee-scolaire="anneeScolaire"
      :annee-scolaire-id="anneeScolaireId"
      :etablissement-id="etablissementId"
      @back="clearSelection"
    />
  </v-container>
</template>

<script>
import axios from 'axios'
import PunishmentDetail from './PunishmentDetail.vue'

export default {
  name: 'PunishmentManagement',
  components: { PunishmentDetail },
  props: {
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true }
  },
  data() {
    return {
      classes: [],
      selectedClassId: null,
    }
  },
  methods: {
    fetchClasses() {
      axios
        .get(`http://localhost:8080/api/classe/${this.etablissementId}`)
        .then((response) => {
          this.classes = response.data
        })
        .catch((error) => {
          console.error('Erreur lors de la récupération des classes:', error)
        })
    },
    goToClass(classId) {
      this.selectedClassId = classId
    },
    clearSelection() {
      this.selectedClassId = null
    }
  },
  created() {
    this.fetchClasses()
  }
}
</script>

<style scoped>
/* Améliore la lisibilité sur petits écrans */
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
}
</style>
