<template>
  <v-container fluid>
    <!-- Bouton retour -->
    <v-btn
      icon
      class="ma-2"
      @click="$emit('back')"
      :size="$vuetify.display.smAndDown ? 'x-small' : 'default'"
    >
      <v-icon :size="$vuetify.display.smAndDown ? 16 : 24">mdi-arrow-left</v-icon>
    </v-btn>

    <!-- Liste des classes -->
    <v-card :elevation="1" color="blue lighten-5" class="pa-4" v-if="!selectedClassId">
      <v-card-title
        class="font-weight-bold"
        :class="$vuetify.display.smAndDown ? 'text-subtitle-2' : 'text-h6'"
      >
        Gestion de Présence
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
            >
              <v-card
                class="ma-2"
                outlined
                @click="goToClass(classe.id, classe.nom)"
                :ripple="true"
              >
                <v-card-title
                  class="text-center"
                  :class="$vuetify.display.smAndDown ? 'text-body-2' : 'text-body-1'"
                >
                  {{ classe.nom }}
                </v-card-title>
              </v-card>
            </v-col>
          </template>

          <template v-else>
            <v-col cols="12">
              <v-alert type="info" color="info" border="left" dense>
                Aucune classe n'est disponible dans votre établissement.<br>
                Veuillez ajouter des classes dans la gestion des classes.
              </v-alert>
            </v-col>
          </template>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Composant enfant : détails de la classe sélectionnée -->
    <ClassDetail
      v-else
      :class-id="selectedClassId"
      :class-name="selectedClassName"
      :annee-scolaire="anneeScolaire"
      :annee-scolaire-id="anneeScolaireId"
      :etablissement-id="etablissementId"
      @back="clearSelection"
    />
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
    }
  },
  methods: {
    fetchClasses() {
      axios.get(`http://localhost:8080/api/classe/${this.etablissementId}`)
        .then(response => {
          this.classes = response.data
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des classes:', error)
        })
    },
    goToClass(classId, className) {
      this.selectedClassId = classId
      this.selectedClassName = className
    },
    clearSelection() {
      this.selectedClassId = null
      this.selectedClassName = ''
    }
  },
  created() {
    this.fetchClasses()
  }
}
</script>

<style scoped>
.v-card {
  cursor: pointer;
  transition: transform 0.2s ease;
}
.v-card:hover {
  transform: scale(1.02);
}
</style>
