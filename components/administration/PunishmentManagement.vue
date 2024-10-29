<template>
  <div class="button-group">
    <v-btn icon @click="$emit('back')">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>
    <v-card color="blue lighten-4" v-if="!selectedClassId">
      <v-card-title>Gestion des cahiers de  Punition</v-card-title>
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
                @click="goToClass(classe.id)"
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
    <punishment-detail v-else :class-id="selectedClassId" :etablissement-id="etablissementId" @back="clearSelection" />
  </div>
</template>

<script>
import axios from 'axios';
import PunishmentDetail from './PunishmentDetail.vue';

export default {
  name: 'PunishmentManagement',
  components: {
    PunishmentDetail,
  },
  props: {
    etablissementId: {
      type: Number,
      required: true
    },
    etablissementNom: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      classes: [],
      selectedClassId: null,
    };
  },
  methods: {
    fetchClasses() {
      axios.get(`http://localhost:8080/api/classe/${this.etablissementId}`)
        .then(response => {
          this.classes = response.data;
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des classes:', error);
        });
    },
    goToClass(classId) {
      this.selectedClassId = classId;
    },
    clearSelection() {
      this.selectedClassId = null;
    }
  },
  created() {
    this.fetchClasses();
  }
}
</script>
