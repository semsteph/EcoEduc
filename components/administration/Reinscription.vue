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
          <v-icon color="teal-darken-3">mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>
      <v-col>
        <h1 class="text-h5 font-weight-bold text-teal-darken-4 d-flex align-center">
          <v-icon start size="32" color="teal-darken-2">mdi-account-convert</v-icon>
          {{ selectedClassId ? 'Réinscription : Liste des élèves' : 'Gestion des Réinscriptions' }}
        </h1>
        <div class="text-caption text-grey-darken-1">
          {{ etablissementNom }} • <v-chip size="x-small" color="teal-darken-2" variant="flat" class="font-weight-bold">{{ anneeScolaire }}</v-chip>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-window v-model="activeView" disabled>
          
          <v-window-item value="list">
            <v-card border flat class="rounded-xl overflow-hidden elevation-1 w-100">
              <v-toolbar color="teal-lighten-5" flat px-4>
                <v-icon start color="teal-darken-3" class="ml-4">mdi-filter-variant</v-icon>
                <span class="text-subtitle-1 font-weight-bold text-teal-darken-3">
                  Sélectionnez une classe pour réinscrire les élèves
                </span>
              </v-toolbar>

              <v-card-text class="pa-4 pa-md-6">
                <v-row v-if="loading" justify="center" class="py-12">
                  <v-progress-circular indeterminate color="teal-darken-2" size="48"></v-progress-circular>
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
                      <v-card
                        variant="outlined"
                        class="class-reins-card rounded-lg transition-swing"
                        @click="goToClass(classe.id)"
                        ripple
                      >
                        <v-card-text class="d-flex align-center pa-4">
                          <v-avatar color="teal-lighten-4" rounded="lg" size="52" class="me-4">
                            <v-icon color="teal-darken-3">mdi-google-classroom</v-icon>
                          </v-avatar>
                          
                          <div class="overflow-hidden">
                            <div class="text-h6 font-weight-black text-teal-darken-4 text-truncate">
                              {{ classe.nom }}
                            </div>
                            <div class="text-caption text-teal-darken-1 font-weight-bold">
                              Réinscrire l'effectif
                            </div>
                          </div>
                        </v-card-text>
                        
                        <v-divider opacity="0.1"></v-divider>
                        
                        <v-card-actions class="bg-teal-lighten-5 justify-end pa-1">
                          <v-btn variant="text" size="x-small" color="teal-darken-4" icon="mdi-chevron-right"></v-btn>
                        </v-card-actions>
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
                        class="teal-lighten-5 text-teal-darken-4"
                      >
                        Aucune classe disponible pour le moment.
                      </v-alert>
                    </v-col>
                  </template>
                </v-row>
              </v-card-text>
            </v-card>
          </v-window-item>

          <v-window-item value="detail">
            <div class="w-100">
              <scolarite-detail
                v-if="selectedClassId"
                :class-id="selectedClassId"
                :annee-scolaire="anneeScolaire"
                :annee-scolaire-id="anneeScolaireId"
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
  name: 'Reinscription',
  components: { ScolariteDetail },
  props: {
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
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
        console.error('Erreur API réinscription:', error)
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

.class-reins-card {
  border: 1px solid #B2DFDB !important;
  background-color: white !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.class-reins-card:hover {
  border-color: #00796B !important;
  background-color: #F0F9F8 !important;
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 121, 107, 0.1) !important;
}

.transition-swing {
  transition: 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

@media (max-width: 600px) {
  .text-h6 {
    font-size: 0.95rem !important;
  }
  h1 {
    font-size: 1.15rem !important;
  }
}
</style>