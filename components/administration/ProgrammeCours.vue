<template>
  <div class="button-group">
    <v-btn icon @click="$emit('back')" class="ma-2">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>

    <v-card
      color="blue lighten-5"
      elevation="2"
      class="pa-4 rounded-xl shadow-sm"
      v-if="!selectedClassId"
    >
      <v-card-title class="text-h6 text-primary d-flex align-center">
        <v-icon left class="mr-2">mdi-calendar-multiselect</v-icon>
        Gestion de Programme
      </v-card-title>

      <v-card-text>
        <v-row>
          <template v-if="classes.length > 0">
            <v-col
              v-for="classe in classes"
              :key="classe.id"
              cols="12"
              sm="6"
              md="4"
              class="d-flex"
            >
              <v-card
                class="pa-3 rounded-xl hoverable elevation-2 w-100"
                outlined
                @click="goToClass(classe.id, classe.nom)"
              >
                <v-card-title class="text-subtitle-1 text-center w-100">
                  <v-icon class="mr-2">mdi-school</v-icon>
                  {{ classe.nom }}
                </v-card-title>
              </v-card>
            </v-col>
          </template>

          <template v-else>
            <v-col cols="12">
              <v-alert type="info" color="info" border="left" class="ma-2 text-caption text-md-body-2">
                <v-icon left class="mr-1">mdi-information-outline</v-icon>
                Aucune classe n'est disponible dans votre établissement. Veuillez ajouter des classes dans la gestion des classes.
              </v-alert>
            </v-col>
          </template>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Affiche le composant enfant si une classe est sélectionnée -->
    <ProgrammeDetail 
      v-else 
      :class-id="selectedClassId" 
      :class-name="selectedClassName" 
      :etablissement-id="etablissementId" 
      :annee-scolaire="anneeScolaire"
      :annee-scolaire-id="anneeScolaireId"
      @back="clearSelection" 
    />
  </div>
</template>

<script>
import ProgrammeDetail from './ProgrammeDetail.vue';
import axios from 'axios';

export default {
  name: 'ProgrammeCours',
  components: {
    ProgrammeDetail,
  },
  props: {
    etablissementId: {
      type: Number,
      required: true,
    },
    etablissementNom: {
      type: String,
      required: true,
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
      selectedClassName: null, // Ajout pour stocker le nom de la classe sélectionnée
    };
  },
  methods: {
    fetchClasses() {
      console.log('ID envoyé:', this.etablissementId); // Log pour debug
      axios.get(`http://localhost:8080/api/classe/${this.etablissementId}`)
        .then(response => {
          this.classes = response.data;
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des classes:', error);
        });
    },
    goToClass(classId, className) {
      this.selectedClassId = classId;
      this.selectedClassName = className; // Met à jour le nom de la classe sélectionnée
    },
    clearSelection() {
      this.selectedClassId = null;
      this.selectedClassName = null; // Réinitialise le nom de la classe
    },
  },
  created() {
    this.fetchClasses();
  },
};
</script>
<style scoped>
.button-group {
  padding: 1rem;
}

@media (max-width: 600px) {
  .button-group {
    padding: 0.5rem;
  }
  .v-card-title {
    font-size: 0.9rem !important;
  }
  .v-btn {
    font-size: 0.7rem !important;
    min-height: 32px !important;
  }
  .v-icon {
    font-size: 18px !important;
  }
}

@media (min-width: 601px) and (max-width: 960px) {
  .v-card-title {
    font-size: 1rem;
  }
  .v-btn {
    font-size: 0.85rem;
  }
}

@media (min-width: 961px) {
  .v-card-title {
    font-size: 1.2rem;
  }
  .v-btn {
    font-size: 1rem;
  }
}
</style>
