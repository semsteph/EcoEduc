<template>
  <v-app>
    <v-navigation-drawer app color="blue darken-3">
      <v-list dense>
        <v-list-item
          v-for="subject in uniqueSubjects"
          :key="subject.matiere_id"
          @click="selectSubject(subject.matiere_id)"
          class="white--text"
        >
          <v-list-item-content>{{ subject.matiere }}</v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main class="main-background">
      <v-container>
        <v-row>
          <v-col>
            <ToolbarComponent @showComponent="showComponent" />
            <component :is="currentComponent"></component>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <!-- Passer l'ID de la matière et de la classe sélectionnée au composant ClassManager -->
            <ClassManager 
              v-if="selectedSubjectId" 
              :subject-id="selectedSubjectId" 
              :classes="classes" 
              :selected-class-id="selectedClassId" 
              @class-selected="showClassDetails"
            />
          </v-col>
        </v-row>
        <ClassDetails v-if="selectedClassId" :class-id="selectedClassId"></ClassDetails>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import axios from 'axios';
import ToolbarComponent from '@/components/parents/ToolbarComponent.vue';
import ClassManager from '@/components/professeurs/ClassManager.vue';

export default {
  components: {
    ClassManager,
    ToolbarComponent,
  },
  data() {
    return {
      currentComponent: null,
      selectedSubjectId: null,
      selectedClassId: null,
      subjects: [],
      classes: [], // Pour stocker les classes après la sélection d'une matière
    };
  },
  computed: {
    uniqueSubjects() {
      const unique = [];
      const map = new Map();
      for (const item of this.subjects) {
        if (!map.has(item.matiere_id)) {
          map.set(item.matiere_id, true);
          unique.push({
            matiere_id: item.matiere_id,
            matiere: item.matiere,
          });
        }
      }
      return unique;
    },
  },
  async mounted() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1])); // Décodage du token JWT pour obtenir l'ID de l'enseignant
        const enseignantId = decodedToken.id;

        const response = await axios.get(`http://localhost:8080/api/enseignant/matieres-classes/${enseignantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.subjects = response.data;
      } catch (error) {
        console.error('Erreur lors de la récupération des matières et des classes', error);
      }
    }
  },
  methods: {
    async selectSubject(id) {
      this.selectedSubjectId = id;
      this.selectedClassId = null;
      console.log('Matière sélectionnée ID:', id);

      this.classes = this.subjects.filter(subject => subject.matiere_id === id);
    },
    showClassDetails(id) {
      this.selectedClassId = id;
    },
  },
};
</script>

<style scoped>
.custom-drawer {
  /* Garde la couleur bleu foncé pour le drawer */
}

.main-background {
  background-image: url('/assets/professeurs/istockphoto-1328488607-1024x1024.jpg'); /* Remplace par le chemin de ton image */
  background-size: cover; /* L'image couvre tout le fond */
  background-position: center; /* L'image est centrée */
  background-repeat: no-repeat; /* Empêche la répétition de l'image */
  min-height: 100vh; /* Pour s'assurer que l'image couvre toute la hauteur de l'écran */
}
</style>
