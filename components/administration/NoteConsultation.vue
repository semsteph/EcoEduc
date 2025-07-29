<template>
  <v-container fluid class="pa-2">
    <!-- Bouton retour -->
    <v-btn
      icon
      class="ma-2"
      variant="text"
      color="primary"
      @click="$emit('back')"
    >
      <v-icon :size="$vuetify.display.smAndDown ? 20 : 28">mdi-arrow-left</v-icon>
    </v-btn>

    <!-- Liste des classes -->
    <v-card v-if="!selectedClassId" class="elevation-3 rounded-xl pa-4">
      <v-card-title class="d-flex justify-space-between align-center">
        <span
          class="font-weight-bold"
          :class="$vuetify.display.smAndDown ? 'text-body-2' : 'text-h6'"
        >
          Consulter les notes
        </span>
        <v-avatar size="32" color="blue lighten-4">
          <v-icon color="blue">mdi-school</v-icon>
        </v-avatar>
      </v-card-title>

      <v-divider class="my-2" />

      <v-card-text>
        <v-row dense>
          <!-- Si classes disponibles -->
          <template v-if="classes.length > 0">
            <v-col
              v-for="classe in classes"
              :key="classe.id"
              cols="12"
              sm="6"
              md="4"
            >
              <v-hover v-slot:default="{ isHovering, props }">
                <v-card
                  v-bind="props"
                  class="pa-3 transition-swing"
                  elevation="2"
                  @click="goToClass(classe.id)"
                  :color="isHovering ? 'blue lighten-5' : 'white'"
                  rounded="lg"
                  outlined
                  style="cursor: pointer"
                >
                  <v-row align="center" no-gutters>
                    <v-avatar class="me-3" size="36" color="indigo lighten-4">
                      <v-icon color="indigo">mdi-domain</v-icon>
                    </v-avatar>
                    <span
                      :class="$vuetify.display.smAndDown ? 'text-body-2' : 'text-subtitle-1'"
                      class="font-weight-medium"
                    >
                      {{ classe.nom }}
                    </span>
                  </v-row>
                </v-card>
              </v-hover>
            </v-col>
          </template>

          <!-- Aucune classe disponible -->
          <template v-else>
            <v-col cols="12">
              <v-alert type="info" border="start" color="blue lighten-5" icon="mdi-information">
                Aucune classe disponible dans votre établissement.<br />
                Veuillez en ajouter depuis la section « Gestion des classes ».
              </v-alert>
            </v-col>
          </template>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Composant enfant : consultation des notes -->
    <note-details
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
import NoteDetails from './NoteDetails.vue'

export default {
  name: 'NoteConsultation',
  components: {
    NoteDetails
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
/* Responsive et esthétique améliorée */
.v-card {
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.v-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

@media (max-width: 600px) {
  .v-card-title {
    font-size: 0.85rem !important;
    padding: 6px 8px !important;
  }

  .v-btn {
    min-height: 32px !important;
    font-size: 0.75rem !important;
  }

  .v-icon {
    font-size: 18px !important;
  }

  .v-card {
    padding: 10px !important;
  }

  .v-alert {
    font-size: 0.75rem !important;
  }

  .v-col {
    padding: 4px !important;
  }
}
</style>
