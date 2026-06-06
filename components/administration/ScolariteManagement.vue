<template>
  <v-container fluid class="pa-4 bg-grey-lighten-4">

    <v-row align="center" class="mb-6">
      <v-col cols="auto">
        <v-btn
          icon
          variant="elevated"
          color="white"
          @click="selectedClassId ? clearSelection() : $emit('back')"
          elevation="2"
        >
          <v-icon color="success">mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>

      <v-col>
        <h1 class="text-h5 font-weight-bold text-success d-flex align-center">
          <v-icon start size="32">mdi-cash-multiple</v-icon>

          {{
            selectedClassId
              ? 'Scolarité : ' + selectedClassName
              : 'Gestion de la Scolarité'
          }}
        </h1>

        <div class="text-caption text-grey-darken-1">
          Etablissement : {{ etablissementNom }}
          | {{ anneeScolaire }}
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">

        <v-window v-model="viewTransition" disabled>

          <!-- Liste des classes -->
          <v-window-item value="list">

            <v-card
              border
              flat
              class="rounded-xl pa-2 pa-md-6 w-100"
            >
              <v-card-title class="px-4 pt-4">

                <span
                  class="text-subtitle-1 font-weight-medium text-grey-darken-2"
                >
                  Sélectionnez une classe pour gérer les frais scolaires
                </span>

              </v-card-title>

              <v-card-text class="mt-4">

                <v-row
                  v-if="loading"
                  justify="center"
                  align="center"
                  class="py-10"
                >
                  <v-progress-circular
                    indeterminate
                    color="success"
                  />
                </v-row>

                <v-row v-else>

                  <template v-if="classes.length > 0">

                    <v-col
                      v-for="classe in classes"
                      :key="classe.id"
                      cols="12"
                      sm="6"
                      md="4"
                      lg="3"
                    >

                      <v-card
                        class="class-card rounded-xl text-center"
                        @click="goToClass(classe.id, classe.nom)"
                        ripple
                      >
                        <v-card-text>

                          <v-avatar
                            color="success"
                            size="65"
                            class="mb-4"
                          >
                            <v-icon
                              color="white"
                              size="34"
                            >
                              mdi-cash-register
                            </v-icon>
                          </v-avatar>

                          <div
                            class="text-h6 font-weight-bold"
                          >
                            {{ classe.nom }}
                          </div>

                          <div
                            class="text-caption text-grey mt-2"
                          >
                            {{ anneeScolaire }}
                          </div>

                          <v-divider
                            class="my-3"
                          />

                          <v-btn
                            color="success"
                            variant="tonal"
                            prepend-icon="mdi-currency-usd"
                          >
                            Ouvrir la scolarité
                          </v-btn>

                        </v-card-text>
                      </v-card>

                    </v-col>

                  </template>

                  <template v-else>

                    <v-col cols="12">

                      <v-alert
                        type="info"
                        variant="tonal"
                        rounded="lg"
                        icon="mdi-information-outline"
                        title="Aucune classe trouvée"
                        text="Veuillez d'abord créer des classes."
                      />

                    </v-col>

                  </template>

                </v-row>

              </v-card-text>

            </v-card>

          </v-window-item>

          <!-- Détail de la scolarité -->
          <v-window-item value="detail">

            <div class="w-100">

              <ScolariteDetail
                v-if="selectedClassId"
                :class-id="selectedClassId"
                :class-name="selectedClassName"
                :annee-scolaire="anneeScolaire"
                :annee-scolaire-id="anneeScolaireId"
                :etablissement-id="etablissementId"
                @back="clearSelection"
              />

            </div>

          </v-window-item>

        </v-window>

      </v-col>
    </v-row>

  </v-container>
</template>

<script>
import axios from 'axios'
import ScolariteDetail from './ScolariteDetail.vue'

export default {
  name: 'ScolariteManagement',

  components: {
    ScolariteDetail
  },

  props: {
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
      classes: [],
      selectedClassId: null,
      selectedClassName: '',
      loading: false,
      viewTransition: 'list'
    }
  },

  methods: {

    async fetchClasses() {
      this.loading = true

      try {

        const response = await axios.get(
          `http://localhost:8080/api/classe/${this.etablissementId}`
        )

        this.classes = response.data

      } catch (error) {

        console.error(
          'Erreur lors du chargement des classes :',
          error
        )

      } finally {

        this.loading = false

      }
    },

    goToClass(classId, className) {
      this.selectedClassId = classId
      this.selectedClassName = className
      this.viewTransition = 'detail'
    },

    clearSelection() {
      this.selectedClassId = null
      this.selectedClassName = ''
      this.viewTransition = 'list'
    }

  },

  created() {
    this.fetchClasses()
  }
}
</script>

<style scoped>

.w-100 {
  width: 100%;
}

.class-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(0,0,0,0.08);
}

.class-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 25px rgba(0,0,0,0.12);
  border-color: rgb(var(--v-theme-success));
}

@media (max-width: 600px) {

  .v-card-title {
    font-size: 1rem !important;
  }

  .v-avatar {
    width: 55px !important;
    height: 55px !important;
  }

}
</style>