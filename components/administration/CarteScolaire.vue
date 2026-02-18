<template>
  <v-container fluid class="pa-4">
    <v-btn
      icon
      variant="tonal"
      class="mb-4"
      @click="selectedClassId ? clearSelection() : $emit('back')"
    >
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>

    <v-card elevation="2" class="rounded-xl overflow-hidden" v-if="!selectedClassId">
      <v-toolbar color="primary" dark flat>
        <v-toolbar-title class="text-h6 font-weight-bold">
          <v-icon start>mdi-card-account-details</v-icon>
          Gestion des Cartes Scolaires
        </v-toolbar-title>
      </v-toolbar>

      <v-card-text class="bg-grey-lighten-4 pa-6">
        <p class="mb-6 text-subtitle-1 grey--text text--darken-2">
          Sélectionnez une classe pour générer les cartes scolaires.
        </p>
        
        <v-row>
          <template v-if="classes.length > 0">
            <v-col v-for="classe in classes" :key="classe.id" cols="12" sm="6" md="4">
              <v-card
                class="class-card pa-4 text-center rounded-lg"
                variant="outlined"
                color="primary"
                @click="goToClass(classe.id, classe.nom)"
              >
                <v-icon size="40" class="mb-2" color="primary">mdi-google-classroom</v-icon>
                <div class="text-h6 font-weight-bold text-primary">{{ classe.nom }}</div>
                <div class="text-caption text-grey">Cliquer pour voir les cartes</div>
              </v-card>
            </v-col>
          </template>
          <v-col cols="12" v-else>
            <v-alert type="info" variant="tonal" class="rounded-lg">
              Aucune classe disponible.
            </v-alert>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <CarteScolaireUpload
      v-else
      :class-id="selectedClassId"
      :class-name="selectedClassName"
      :etablissement-id="etablissementId"
      :etablissement-nom="etablissementNom"
      :annee-scolaire-nom="anneeScolaire"
      @back="clearSelection"
    />
  </v-container>
</template>

<script>
import axios from 'axios'
import CarteScolaireUpload from './CarteScolaireUpload.vue'

export default {
  name: 'CarteScolaire',
  components: { CarteScolaireUpload },
  props: {
    etablissementId: { type: Number, required: true },
    anneeScolaireId: { type: Number, required: true },
    etablissementNom: String,
    anneeScolaire: String, // Prop à vérifier
  },
  data: () => ({
    classes: [],
    selectedClassId: null,
    selectedClassName: '',
  }),
  methods: {
    async fetchClasses() {
      try {
        const response = await axios.get(`http://localhost:8080/api/classe/${this.etablissementId}`)
        this.classes = response.data
      } catch (error) {
        console.error('Erreur classes:', error)
      }
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
    // Vérification des données reçues via les props
    console.log("--- VÉRIFICATION DES PROPS ---");
    console.log("Établissement:", this.etablissementNom);
    console.log("Année Scolaire:", this.anneeScolaire);
    console.log("------------------------------");
    
    this.fetchClasses()
  }
}
</script>

<style scoped>
.class-card {
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: white !important;
}
.class-card:hover {
  transform: translateY(-5px);
  border-color: #1976D2;
}
</style>