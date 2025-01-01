<template>
  <v-app>
    <!-- Image de fond -->
    <div class="background-blur"></div>

    <!-- Drawer latéral -->
    <v-navigation-drawer app v-model="drawer" color="blue darken-3" dark>
      <v-list dense>
        <!-- Entête avec nom de l'établissement -->
        <v-card class="pa-3 white--text text-center" flat>
          <v-list-item-content>
            <h3 class="mb-2">{{ nomEtablissement }}</h3>
            <p>{{ enseignantPrenom }} {{ enseignantNom }}</p>
          </v-list-item-content>
        </v-card>

        <v-divider class="my-3"></v-divider>

        <!-- Liste des matières -->
        <v-list-item
          v-for="subject in uniqueSubjects"
          :key="subject.matiere_id"
          @click="selectSubject(subject.matiere_id)"
          class="white--text"
        >
          <v-list-item-icon>
            <v-icon>mdi-book</v-icon>
          </v-list-item-icon>
          <v-list-item-content>{{ subject.matiere }}</v-list-item-content>
        </v-list-item>

        <v-divider class="my-3"></v-divider>

        <!-- Bouton de déconnexion -->
        <v-list-item @click="showLogoutDialog" class="red--text">
          <v-list-item-icon>
            <v-icon color="red">mdi-logout</v-icon>
          </v-list-item-icon>
          <v-list-item-content>Déconnexion</v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Barre supérieure -->
    <ToolbarComponents @toggleDrawer="toggleDrawer" @showNotifications="showNotifications" />

    <!-- Contenu principal -->
    <v-main>
      <v-container class="py-5 content-container">
        <!-- Notifications -->
        <v-row v-if="showNotificationsComponent">
          <v-col>
            <NotificationComponent :enseignant-id="enseignantId" :etablissement-id="etablissementId" />
          </v-col>
        </v-row>

        <!-- Gestion des matières et des classes -->
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

        <!-- Détails de la classe -->
        <v-row>
          <v-col>
            <ClassDetails
              v-if="selectedClassId"
              :class-id="selectedClassId"
              :etablissement-id="etablissementId"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- Dialogue de déconnexion -->
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
import ToolbarComponents from '@/components/professeurs/ToolbarComponents.vue';
import ClassManager from '@/components/professeurs/ClassManager.vue';
import NotificationComponent from '@/components/professeurs/NotificationComponent.vue';

export default {
  components: {
    ClassManager,
    ToolbarComponents,
    NotificationComponent,
  },
  data() {
    return {
      currentComponent: null,
      selectedSubjectId: null,
      selectedClassId: null,
      subjects: [],
      classes: [],
      etablissementId: null,
      nomEtablissement: '',
      enseignantNom: '',
      enseignantPrenom: '',
      enseignantId: null,
      logoutDialog: false,
      drawer: false,
      showNotificationsComponent: false,
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
        this.enseignantId = decodedToken.id;
        this.etablissementId = decodedToken.etablissement;
        this.nomEtablissement = decodedToken.etablissement_nom;
        this.enseignantNom = decodedToken.enseignant_nom;
        this.enseignantPrenom = decodedToken.enseignant_prenom;

        const response = await axios.get(`http://localhost:8080/api/enseignant/matieres-classes/${this.enseignantId}`, {
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
      this.classes = this.subjects.filter(subject => subject.matiere_id === id);
    },
    showClassDetails(id) {
      this.selectedClassId = id;
    },
    showNotifications() {
      this.showNotificationsComponent = !this.showNotificationsComponent;
    },
    showLogoutDialog() {
      this.logoutDialog = true;
    },
    toggleDrawer() {
      this.drawer = !this.drawer;
    },
    logout() {
      localStorage.removeItem('token');
      const router = useRouter();
      router.push('/professeurs/connexion');
    },
  },
};
</script>

<style scoped>
/* Image de fond floutée */
.background-blur {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('/assets/professeurs/istockphoto-1328488607-1024x1024.jpg');
  background-size: cover;
  background-position: center;
  filter: blur(8px); /* Effet de flou */
}

/* Conteneur principal */
.content-container {
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

/* Couleurs et polices */
.v-card {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
}

.v-btn {
  font-family: 'Poppins', sans-serif;
  font-weight: bold;
}

h3 {
  font-family: 'Poppins', sans-serif;
  color: black;
}
</style>
