<template>
  <v-container fluid class="pa-4 bg-grey-lighten-4">
    
    <v-row align="center" class="mb-6">
      <v-col cols="auto">
        <v-btn
          icon
          variant="elevated"
          color="white"
          elevation="2"
          @click="selectedClassId ? clearSelection() : $emit('back')"
        >
          <v-icon color="blue-darken-3">mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>
      <v-col>
        <h1 class="text-h5 font-weight-bold text-blue-darken-4 d-flex align-center">
          <v-icon start size="32" color="blue-darken-3">mdi-file-certificate</v-icon>
          {{ selectedClassId ? 'Édition des Bulletins' : 'Gestion des Bulletins' }}
        </h1>
        <div class="text-caption text-grey-darken-1">
          {{ etablissementNom }} • <v-chip size="x-small" color="blue-darken-3" variant="flat">{{ anneeScolaire }}</v-chip>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-window v-model="activeView" disabled>
          
          <v-window-item value="list">
            <v-card border flat class="rounded-xl overflow-hidden elevation-1 w-100">
              <v-toolbar color="blue-lighten-5" flat px-4>
                <v-icon start color="blue-darken-3" class="ml-4">mdi-layers-outline</v-icon>
                <span class="text-subtitle-1 font-weight-bold text-blue-darken-3">
                  Sélectionnez une classe pour générer les bulletins
                </span>
              </v-toolbar>

              <v-card-text class="pa-4 pa-md-6">
                <v-row v-if="loading" justify="center" class="py-12">
                  <v-progress-circular indeterminate color="blue-darken-3" size="48"></v-progress-circular>
                </v-row>

                <v-row v-else dense>
                  <template v-if="classes.length > 0">
                    <v-col
                      v-for="classe in classes"
                      :key="classe.id"
                      cols="12"
                      sm="6"
                      md="4"
                      lg="3"
                    >
                      <v-hover v-slot:default="{ isHovering, props }">
                        <v-card
                          v-bind="props"
                          variant="outlined"
                          class="class-bulletin-card rounded-lg transition-swing"
                          :class="{ 'on-hover': isHovering }"
                          @click="goToClass(classe.id)"
                          ripple
                        >
                          <v-card-text class="text-center pa-6">
                            <v-avatar color="blue-lighten-4" size="64" class="mb-4">
                              <v-icon color="blue-darken-4" size="32">mdi-google-classroom</v-icon>
                            </v-avatar>
                            
                            <div class="text-h6 font-weight-black text-blue-darken-4 mb-1">
                              {{ classe.nom }}
                            </div>
                            
                            <v-chip
                              size="x-small"
                              variant="tonal"
                              color="blue-darken-2"
                              class="font-weight-bold"
                            >
                              PRÊT POUR ÉDITION
                            </v-chip>
                          </v-card-text>

                          <v-divider opacity="0.1"></v-divider>

                          <v-card-actions class="justify-center bg-blue-lighten-5 pa-1">
                            <v-btn
                              variant="text"
                              block
                              size="small"
                              color="blue-darken-4"
                              class="text-none font-weight-bold"
                            >
                              Générer les bulletins
                            </v-btn>
                          </v-card-actions>
                        </v-card>
                      </v-hover>
                    </v-col>
                  </template>

                  <template v-else>
                    <v-col cols="12">
                      <v-alert
                        type="info"
                        variant="tonal"
                        rounded="lg"
                        icon="mdi-information-outline"
                        class="blue-lighten-5 text-blue-darken-4"
                      >
                        <div class="text-subtitle-2 font-weight-bold">Aucune classe disponible</div>
                        <div class="text-caption">Configurez vos classes dans le menu "Gestion des classes" pour commencer l'édition des bulletins.</div>
                      </v-alert>
                    </v-col>
                  </template>
                </v-row>
              </v-card-text>
            </v-card>
          </v-window-item>

          <v-window-item value="detail">
            <div class="w-100">
              <bulletin-details
                v-if="selectedClassId"
                :class-id="selectedClassId"
                :annee-scolaire="anneeScolaire"
                :annee-scolaire-id="anneeScolaireId"
                :etablissement-id="etablissementId"
                :etablissement-nom="etablissementNom"
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
import BulletinDetails from './BulletinDetails.vue'

export default {
  name: 'BulletinManagement',
  components: {
    BulletinDetails
  },
  props: {
    etablissementId: { type: Number, required: true },
    etablissementNom: String,
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true }
  },
  data: () => ({
    classes: [],
    selectedClassId: null,
    loading: false,
    activeView: 'list'
  }),
  methods: {
    async fetchClasses() {
      this.loading = true
      try {
        const response = await axios.get(`http://localhost:8080/api/classe/${this.etablissementId}`)
        this.classes = response.data
      } catch (error) {
        console.error('Erreur lors de la récupération des classes:', error)
      } finally {
        this.loading = false
      }
    },
    goToClass(classId) {
      this.selectedClassId = classId
      this.activeView = 'detail'
    },
    clearSelection() {
      this.selectedClassId = null
      this.activeView = 'list'
    }
  },
  created() {
    this.fetchClasses()
  }
}
</script>

<style scoped>
/* Classe pour forcer la largeur maximale */
.w-100 {
  width: 100% !important;
}

.class-bulletin-card {
  border: 1px solid #E3F2FD !important;
  background-color: white !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.on-hover {
  border-color: #1565C0 !important;
  transform: translateY(-6px);
  box-shadow: 0 12px 20px rgba(21, 101, 192, 0.1) !important;
}

.transition-swing {
  transition: 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

@media (max-width: 600px) {
  .text-h6 {
    font-size: 1rem !important;
  }
  h1 {
    font-size: 1.15rem !important;
  }
}
</style>