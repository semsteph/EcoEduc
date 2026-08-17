<template>
  <v-container fluid class="pa-2 pa-sm-4 bg-grey-lighten-4">
    
    <div v-if="!selectedClassId" class="mb-4">
      <v-row align="center" no-gutters>
        <v-col cols="auto" class="mr-3">
          <v-btn
            icon="mdi-arrow-left"
            variant="tonal"
            color="indigo-darken-3"
            @click="$emit('back')"
            size="small"
          ></v-btn>
        </v-col>
        <v-col>
          <h1 class="text-h5 font-weight-bold text-indigo-darken-3 d-flex align-center flex-wrap">
            <v-icon start size="28" class="mr-2">mdi-book-open-page-variant</v-icon>
            Gestion des Programmes
          </h1>
          <div class="text-caption text-grey-darken-1">
            {{ etablissementNom }} <span class="mx-1">•</span> {{ anneeScolaire }}
          </div>
        </v-col>
      </v-row>
    </div>

    <div v-if="!selectedClassId">
      <v-card border flat class="rounded-xl shadow-card overflow-hidden">
        <v-toolbar color="white" flat class="border-b">
          <v-toolbar-title class="text-body-1 font-weight-bold text-grey-darken-3">
            Sélectionner une classe
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-chip color="indigo-darken-3" variant="flat" size="small" class="mr-4">
            {{ classes.length }} Classes
          </v-chip>
        </v-toolbar>

        <v-card-text class="pa-4 bg-grey-lighten-5">
          <v-row v-if="classes.length > 0">
            <v-col
              v-for="classe in classes"
              :key="classe.id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
            >
              <v-card
                elevation="1"
                class="class-item-card rounded-lg transition-swing cursor-pointer"
                @click="goToClass(classe.id, classe.nom)"
              >
                <div class="pa-4 d-flex align-center">
                  <v-avatar color="indigo-lighten-4" size="40" class="mr-3">
                    <v-icon color="indigo-darken-3" size="20">mdi-school</v-icon>
                  </v-avatar>
                  <div class="flex-grow-1 overflow-hidden">
                    <div class="text-subtitle-1 font-weight-bold text-indigo-darken-3 text-truncate">
                      {{ classe.nom }}
                    </div>
                    <div class="text-caption text-grey text-truncate">Configurer le programme</div>
                  </div>
                  <v-icon color="grey-lighten-1" size="18">mdi-chevron-right</v-icon>
                </div>
              </v-card>
            </v-col>
          </v-row>

          <div v-else class="py-10 text-center">
            <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-database-off-outline</v-icon>
            <h3 class="text-h6 text-grey-darken-1">Aucune classe disponible</h3>
            <p class="text-body-2 text-grey-darken-1 px-4 mx-auto" style="max-width: 400px;">
              Veuillez ajouter des classes dans le module "Administration" avant de définir les programmes de cours.
            </p>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <div v-else class="w-100">
      <ProgrammeDetail 
        :class-id="selectedClassId" 
        :class-name="selectedClassName" 
        :etablissement-id="etablissementId" 
        :annee-scolaire="anneeScolaire"
        :annee-scolaire-id="anneeScolaireId"
        @back="clearSelection" 
      />
    </div>

  </v-container>
</template>

<script>
import ProgrammeDetail from './ProgrammeDetail.vue';
import axios from 'axios';

export default {
  name: 'ProgrammeCours',
  components: { ProgrammeDetail },
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
      selectedClassName: null,
    };
  },
  methods: {
    async fetchClasses() {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`/api/classe/${this.etablissementId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.classes = response.data || [];
      } catch (error) {
        console.error('Erreur récupération classes:', error);
      }
    },
    goToClass(classId, className) {
      this.selectedClassId = classId;
      this.selectedClassName = className;
    },
    clearSelection() {
      this.selectedClassId = null;
      this.selectedClassName = null;
    }
  },
  created() {
    this.fetchClasses();
  },
};
</script>

<style scoped>
/* Suppression des hauteurs fixes pour le responsive total */
.shadow-card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important;
}

.class-item-card {
  border: 1px solid #e0e2e6;
  background: white;
  transition: all 0.2s ease-in-out;
}

.class-item-card:hover {
  transform: translateY(-2px);
  border-color: #3949ab;
  box-shadow: 0 6px 12px rgba(57, 73, 171, 0.15) !important;
}

.cursor-pointer {
  cursor: pointer;
}

/* Ajustements typographiques pour mobile */
@media (max-width: 600px) {
  .text-h5 {
    font-size: 1.15rem !important;
    line-height: 1.4;
  }
  .v-toolbar-title {
    font-size: 0.95rem !important;
  }
}
</style>