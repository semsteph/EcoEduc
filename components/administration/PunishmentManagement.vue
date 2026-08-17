<template>
  <v-container fluid class="pa-4 bg-grey-lighten-4 fill-height align-start">
    <v-row align="center" class="mb-6">
      <v-col cols="auto">
        <v-btn
          icon
          variant="elevated"
          color="white"
          @click="selectedClassId ? clearSelection() : $emit('back')"
          elevation="2"
        >
          <v-icon color="error">mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>
      <v-col>
        <h1 class="text-h5 font-weight-bold text-error d-flex align-center">
          <v-icon start size="32" color="error">mdi-gavel</v-icon>
          {{ selectedClassId ? 'Détails des Sanctions' : 'Cahiers de Punition' }}
        </h1>
        <div class="text-caption text-grey-darken-1">
          {{ etablissementNom }} • {{ anneeScolaire }}
        </div>
      </v-col>
    </v-row>

    <v-window v-model="activeTab" disabled>
      <v-window-item value="list">
        <v-card border flat class="rounded-xl overflow-hidden">
          <v-toolbar color="error-lighten-5" flat px-4>
            <v-icon start color="error" class="ml-4">mdi-filter-variant</v-icon>
            <span class="text-subtitle-1 font-weight-bold text-error">
              Sélectionnez une classe pour gérer les punitions
            </span>
          </v-toolbar>

          <v-card-text class="pa-4 pa-md-6">
            <v-row v-if="loading" justify="center" class="py-12">
              <v-progress-circular indeterminate color="error" size="50"></v-progress-circular>
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
                    variant="tonal"
                    color="error"
                    class="punishment-card rounded-lg border-sm py-4"
                    @click="goToClass(classe.id)"
                    ripple
                  >
                    <v-card-text class="text-center">
                      <v-avatar color="error" variant="elevated" size="52" class="mb-3">
                        <v-icon color="white">mdi-google-classroom</v-icon>
                      </v-avatar>
                      
                      <div class="text-h6 font-weight-black mb-1">{{ classe.nom }}</div>
                      <div class="text-caption font-weight-medium">Accéder au cahier</div>
                    </v-card-text>
                    
                    <v-divider class="mx-4 mb-2" opacity="0.1"></v-divider>
                    
                    <v-card-actions class="justify-center">
                      <v-icon size="small">mdi-chevron-right</v-icon>
                    </v-card-actions>
                  </v-card>
                </v-col>
              </template>

              <template v-else>
                <v-col cols="12">
                  <v-alert
                    type="warning"
                    variant="tonal"
                    rounded="lg"
                    icon="mdi-alert-circle-outline"
                    title="Aucune donnée"
                    text="Aucune classe n'est disponible pour cet établissement."
                  ></v-alert>
                </v-col>
              </template>
            </v-row>
          </v-card-text>
        </v-card>
      </v-window-item>

      <v-window-item value="detail">
        <punishment-detail
          v-if="selectedClassId"
          :class-id="selectedClassId"
          :annee-scolaire="anneeScolaire"
          :annee-scolaire-id="anneeScolaireId"
          :etablissement-id="etablissementId"
          @back="clearSelection"
        />
      </v-window-item>
    </v-window>
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
      loading: false,
      activeTab: 'list'
    }
  },
  methods: {
    async fetchClasses() {
      this.loading = true
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`/api/classe/${this.etablissementId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        this.classes = response.data
      } catch (error) {
        console.error('Erreur API:', error)
      } finally {
        this.loading = false
      }
    },
    goToClass(classId) {
      this.selectedClassId = classId
      this.activeTab = 'detail'
    },
    clearSelection() {
      this.selectedClassId = null
      this.activeTab = 'list'
    }
  },
  created() {
    this.fetchClasses()
  }
}
</script>

<style scoped>
/* Code couleur spécifique pour la discipline (souvent associé au rouge/error) */
.punishment-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: white !important;
}

.punishment-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(var(--v-theme-error), 0.15) !important;
  background-color: rgb(var(--v-theme-error-lighten-5)) !important;
}

.text-error {
  color: #D32F2F !important;
}

/* Animations de transition */
.v-window {
  width: 100%;
}

@media (max-width: 600px) {
  h1 {
    font-size: 1.25rem !important;
  }
}
</style>