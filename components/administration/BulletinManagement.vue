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

    <!-- Liste des classes -->
    <v-card
      color="blue lighten-5"
      class="elevation-1 pa-2 rounded-lg"
      v-if="!selectedClassId"
    >
      <v-card-title
        class="text-blue-darken-3 font-weight-bold"
        :class="$vuetify.display.smAndDown ? 'text-body-2' : 'text-subtitle-1'"
      >
        Bulletin de notes
      </v-card-title>

      <v-card-text>
        <v-row dense>
          <!-- Classes disponibles -->
          <template v-if="classes.length > 0">
            <v-col
              v-for="classe in classes"
              :key="classe.id"
              cols="12"
              sm="6"
              md="4"
            >
              <v-card
                class="ma-1 pa-2 text-center hoverable card-classe"
                outlined
                @click="goToClass(classe.id)"
              >
                <v-card-title
                  class="justify-center font-weight-medium"
                  :class="$vuetify.display.smAndDown ? 'text-body-2' : 'text-subtitle-1'"
                >
                  {{ classe.nom }}
                </v-card-title>
              </v-card>
            </v-col>
          </template>

          <!-- Aucune classe -->
          <template v-else>
            <v-col cols="12">
              <v-alert
                type="info"
                color="blue lighten-4"
                border="start"
                dense
              >
                Aucune classe n'est disponible dans votre établissement.<br />
                Veuillez ajouter des classes dans la gestion des classes.
              </v-alert>
            </v-col>
          </template>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Composant enfant -->
    <bulletin-details
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
import BulletinDetails from './BulletinDetails.vue'

export default {
  name: 'BulletinManagement',
  components: {
    BulletinDetails
  },
  props: {
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true }
  },
  data() {
    return {
      classes: [],
      selectedClassId: null
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
.card-classe {
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.card-classe:hover {
  background-color: #e3f2fd;
}

/* Responsive mobile */
@media (max-width: 600px) {
  .v-card-title {
    font-size: 0.85rem !important;
    padding: 4px 8px !important;
  }

  .v-btn {
    min-height: 32px !important;
    font-size: 0.75rem !important;
  }

  .v-icon {
    font-size: 16px !important;
  }

  .v-card {
    padding: 8px !important;
  }

  .v-alert {
    font-size: 0.75rem !important;
  }

  .v-col {
    padding: 4px !important;
  }
}
</style>
