<template>
  <div class="button-group">
    <v-btn icon @click="$emit('back')">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>

    <!-- Liste des classes si aucune classe sélectionnée -->
    <v-card color="blue lighten-4" v-if="!selectedClassId">
      <v-card-title>Enseignants / Classes</v-card-title>
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

    <!-- Affichage des détails de la classe -->
    <EnseignantclasseDetail
      v-else
      :class-id="selectedClassId"
      :class-name="selectedClassName"
      :annee-scolaire="anneeScolaire"
      :annee-scolaire-id="anneeScolaireId"
      :etablissement-id="etablissementId"
      @back="clearSelection"
    />
  </div>
</template>

<script>
import axios from 'axios';
import EnseignantclasseDetail from './EnseignantclasseDetail.vue'; // ✅ Nom correct ici

export default {
  name: 'EnseignantParclasse',
  components: {
    EnseignantclasseDetail, // ✅ Utilisé dans le template
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
      required: true,
    },
    anneeScolaireId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      classes: [],
      selectedClassId: null,
      selectedClassName: '',
    };
  },
  methods: {
    fetchClasses() {
      axios
        .get(`http://localhost:8080/api/classe/${this.etablissementId}`)
        .then((response) => {
          this.classes = response.data;
          console.log('Classes récupérées :', this.classes); // 👀 Affichage de debug
        })
        .catch((error) => {
          console.error('Erreur lors de la récupération des classes:', error);
        });
    },
    goToClass(classId, className) {
      this.selectedClassId = classId;
      this.selectedClassName = className;
    },
    clearSelection() {
      this.selectedClassId = null;
      this.selectedClassName = '';
    },
  },
  created() {
    this.fetchClasses();
  },
};
</script>

<style scoped>
.button-group {
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-block: 20px 0;
  height: auto;
}
</style>
