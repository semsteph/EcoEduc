<template>
  <div class="button-group">
    <v-btn icon @click="$emit('back')">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>
    <v-card color="blue lighten-4" v-if="!selectedClassId">
      <v-card-title>Gestion de Programme</v-card-title>
      <v-card-text>
        <v-row>
          <template v-if="classes.length > 0">
            <v-col
              v-for="classe in classes"
              :key="classe.id"
              cols="12"
              md="4"
            >
              <v-card
                class="ma-2"
                outlined
                @click="goToClass(classe.id, classe.nom)"
              >
                <v-card-title>{{ classe.nom }}</v-card-title>
              </v-card>
            </v-col>
          </template>
          <template v-else>
            <v-col cols="12">
              <v-alert type="info" color="info" border="left">
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
