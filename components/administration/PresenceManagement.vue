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
          <v-icon color="primary">mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>
      <v-col>
        <h1 class="text-h5 font-weight-bold text-primary d-flex align-center">
          <v-icon start size="32">mdi-calendar-check</v-icon>
          {{ selectedClassId ? 'Détails : ' + selectedClassName : 'Gestion des Présences' }}
        </h1>
        <div class="text-caption text-grey-darken-1">
          Etablissement : {{ etablissementNom }} | {{ anneeScolaire }}
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-window v-model="viewTransition" disabled>
          
          <v-window-item value="list">
            <v-card border flat class="rounded-xl pa-2 pa-md-6 w-100">
              <v-card-title class="px-4 pt-4">
                <span class="text-subtitle-1 font-weight-medium text-grey-darken-2">
                  Sélectionnez une classe pour faire l'appel
                </span>
              </v-card-title>

              <v-card-text class="mt-4">
                <v-row v-if="loading" justify="center" align="center" class="py-10">
                  <v-progress-circular indeterminate color="primary"></v-progress-circular>
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
                        variant="tonal"
                        color="primary"
                        class="class-card rounded-lg py-4 text-center border"
                        @click="goToClass(classe.id, classe.nom)"
                        ripple
                      >
                        <v-avatar color="primary" size="56" class="mb-3">
                          <v-icon color="white" size="32">mdi-account-group</v-icon>
                        </v-avatar>
                        
                        <v-card-title class="justify-center font-weight-bold py-0">
                          {{ classe.nom }}
                        </v-card-title>
                        
                        <v-card-subtitle class="mt-1">
                          {{ anneeScolaire }}
                        </v-card-subtitle>

                        <v-divider class="mx-10 my-3" opacity="0.1"></v-divider>
                        
                        <v-btn
                          variant="text"
                          color="primary"
                          prepend-icon="mdi-eye-outline"
                          size="small"
                          class="text-none"
                        >
                          Ouvrir le registre
                        </v-btn>
                      </v-card>
                    </v-col>
                  </template>

                  <template v-else>
                    <v-col cols="12" class="text-center">
                      <v-alert
                        type="info"
                        variant="tonal"
                        rounded="lg"
                        icon="mdi-information-outline"
                        title="Aucune classe trouvée"
                        text="Veuillez d'abord configurer vos classes dans le menu Gestion des Classes."
                      ></v-alert>
                    </v-col>
                  </template>
                </v-row>
              </v-card-text>
            </v-card>
          </v-window-item>

          <v-window-item value="detail">
            <div class="w-100">
              <ClassDetail
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
import ClassDetail from './ClassDetail.vue'

export default {
  name: 'PresenceManagement',
  components: { ClassDetail },
  props: {
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
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
        const response = await axios.get(`http://localhost:8080/api/classe/${this.etablissementId}`)
        this.classes = response.data
      } catch (error) {
        console.error('Erreur lors de la récupération des classes:', error)
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
/* Ajout de w-100 pour forcer la largeur maximale */
.w-100 {
  width: 100% !important;
}

.class-card {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
}

.class-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
  background-color: white !important;
  border-color: rgb(var(--v-theme-primary)) !important;
}

@media (max-width: 600px) {
  .v-card-title {
    font-size: 1rem !important;
  }
  .v-avatar {
    width: 48px !important;
    height: 48px !important;
  }
}
</style>