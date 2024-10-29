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

        <!-- Bouton de déconnexion -->
        <v-list-item @click="showLogoutDialog" class="white--text">
          <v-list-item-content>Déconnexion</v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main class="main-background">
      <v-container>
        <v-row>
          <v-col>
            <ToolbarComponent @showNotifications="showNotifications" />
            <!-- Affichage dynamique du composant -->
            <component :is="currentComponent" :etablissement-id="etablissementId"></component>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <ClassManager 
              v-if="selectedSubjectId" 
              :subject-id="selectedSubjectId" 
              :etablissement-id="etablissementId"
              :classes="classes" 
              :selected-class-id="selectedClassId" 
              @class-selected="showClassDetails"
            />
          </v-col>
        </v-row>
        <ClassDetails 
          v-if="selectedClassId" 
          :class-id="selectedClassId" 
          :etablissement-id="etablissementId"
        />
      </v-container>
    </v-main>

    <!-- Dialogue de confirmation de déconnexion -->
    <v-dialog v-model="logoutDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h5">Confirmer la déconnexion</v-card-title>
        <v-card-text>Êtes-vous sûr de vouloir vous déconnecter ?</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="logoutDialog = false">Annuler</v-btn>
          <v-btn color="red darken-1" text @click="logout">Oui</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script>
import axios from 'axios';
import { useRouter } from 'nuxt/app';
import ToolbarComponent from '@/components/parents/ToolbarComponent.vue';
import ClassManager from '@/components/professeurs/ClassManager.vue';
import NotificationComponent from '@/components/professeurs/NotificationComponent.vue';

export default {
  components: {
    ClassManager,
    ToolbarComponent,
    NotificationComponent,
  },
  data() {
    return {
      currentComponent: null, // Composant actif
      selectedSubjectId: null,
      selectedClassId: null,
      subjects: [],
      classes: [], // Pour stocker les classes après la sélection d'une matière
      etablissementId: null, // Stockage de l'ID de l'établissement
      logoutDialog: false, // Contrôle de l'affichage du dialogue de déconnexion
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
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        const enseignantId = decodedToken.id;
        this.etablissementId = decodedToken.etablissement; // Récupération de l'ID de l'établissement depuis le token

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
    selectSubject(id) {
      this.selectedSubjectId = id;
      this.selectedClassId = null;
      console.log('Matière sélectionnée ID:', id);

      this.classes = this.subjects.filter(subject => subject.matiere_id === id);
    },
    showClassDetails(id) {
      this.selectedClassId = id;
    },
    showNotifications() {
      this.currentComponent = 'NotificationComponent'; // Affiche le composant NotificationComponent
    },
    showLogoutDialog() {
      this.logoutDialog = true; // Affiche le dialogue de confirmation
    },
    logout() {
      localStorage.removeItem('token'); // Suppression du token
      const router = useRouter();
      router.push('/professeurs/connexion'); // Redirection vers la page de connexion
    },
  },
};
</script>

<style scoped>
.main-background {
  background-image: url('/assets/professeurs/istockphoto-1328488607-1024x1024.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  min-height: 100vh;
}

.v-card {
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
}

.v-btn {
  font-weight: bold;
  font-size: 16px;
}

.v-alert {
  border-radius: 8px;
  font-size: 14px;
}

.v-text-field .v-input__control {
  border-radius: 8px;
}

.v-text-field .v-input__prepend-inner > .v-icon {
  color: #9e9e9e;
}

.v-card-title {
  font-family: 'Poppins', sans-serif;
  color: #1976d2;
}
</style>
