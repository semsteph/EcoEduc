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
          <v-icon color="indigo-darken-2">mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>
      <v-col>
        <h1 class="text-h5 font-weight-bold text-indigo-darken-3 d-flex align-center">
          <v-icon start size="32" color="indigo">mdi-notebook-check</v-icon>
          {{ selectedClassId ? 'Relevés de notes' : 'Consultation des Notes' }}
        </h1>
        <div class="text-caption text-grey-darken-1">
          {{ etablissementNom }} • <v-chip size="x-small" color="indigo" variant="flat">{{ anneeScolaire }}</v-chip>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-window v-model="activeView" disabled>
          
          <v-window-item value="list">
            <v-card border flat class="rounded-xl overflow-hidden elevation-1 w-100">
              <v-toolbar color="indigo-lighten-5" flat px-4>
                <v-icon start color="indigo" class="ml-4">mdi-filter-variant</v-icon>
                <span class="text-subtitle-1 font-weight-bold text-indigo-darken-2">
                  Choisir une classe pour voir les résultats
                </span>
              </v-toolbar>

              <v-card-text class="pa-4 pa-md-6">
                <v-row v-if="loading" justify="center" class="py-12">
                  <v-progress-circular indeterminate color="indigo" size="48"></v-progress-circular>
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
                        class="class-note-card rounded-lg transition-swing"
                        @click="goToClass(classe.id)"
                        ripple
                      >
                        <v-card-text class="d-flex align-center pa-4">
                          <v-avatar color="indigo-lighten-4" rounded="lg" size="48" class="me-4">
                            <v-icon color="indigo-darken-2">mdi-google-classroom</v-icon>
                          </v-avatar>
                          
                          <div class="overflow-hidden">
                            <div class="text-h6 font-weight-black text-indigo-darken-4 text-truncate">
                              {{ classe.nom }}
                            </div>
                            <div class="text-caption text-grey-darken-1 d-flex align-center">
                              <v-icon size="12" class="me-1">mdi-account-group</v-icon>
                              Consulter les moyennes
                            </div>
                          </div>
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
                        class="indigo-lighten-5"
                      >
                        <div class="text-subtitle-2 font-weight-bold">Aucune classe disponible</div>
                        <div class="text-caption">Veuillez d'abord enregistrer des classes dans le menu de configuration.</div>
                      </v-alert>
                    </v-col>
                  </template>
                </v-row>
              </v-card-text>
            </v-card>
          </v-window-item>

          <v-window-item value="detail">
            <div class="w-100">
              <note-details
                v-if="selectedClassId"
                :class-id="selectedClassId"
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
import NoteDetails from './NoteDetails.vue'

export default {
  name: 'NoteConsultation',
  components: { NoteDetails },
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
        const token = localStorage.getItem('token')
        const res = await axios.get(`/api/classe/${this.etablissementId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        this.classes = res.data
      } catch (err) {
        console.error('Erreur classes:', err)
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
.w-100 {
  width: 100% !important;
}

.class-note-card {
  border: 1px solid #E0E0E0 !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  background-color: white !important;
}

.class-note-card:hover {
  border-color: #3F51B5 !important;
  background-color: #F5F7FF !important;
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(63, 81, 181, 0.1) !important;
}

@media (max-width: 600px) {
  h1 {
    font-size: 1.1rem !important;
  }
}
</style>