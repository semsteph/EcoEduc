<template>
  <v-app>
    <!-- Image de fond -->
    <div class="background-blur"></div>

    <!-- Drawer latéral -->
    <v-navigation-drawer
      app
      v-model="drawer"
      :width="drawerWidth"
      color="blue darken-3"
      dark
      class="navigate"
    >
      <v-list dense>
        <v-card class="pa-3 white--text text-center" flat>
          <v-list-item-content>
            <h3 class="mb-2"><strong>Etablissement:</strong> {{ nomEtablissement }}</h3>
            <p><strong>Enseignant:</strong> {{ enseignantPrenom }} {{ enseignantNom }}</p>
          </v-list-item-content>
        </v-card>

        <v-divider class="my-3"></v-divider>

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

        <v-list-item @click="showLogoutDialog" class="red--text">
          <v-list-item-icon>
            <v-icon color="red">mdi-logout</v-icon>
          </v-list-item-icon>
          <v-list-item-content>Déconnexion</v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Toolbar fixée en haut -->
    <div class="fixed-toolbar">
      <ToolbarComponents @toggleDrawer="toggleDrawer" @showNotifications="showNotifications" />
    </div>

    <v-main class="pt-16">
      <v-container class="py-5 content-container">
        <v-alert v-if="!anneeScolaireId" type="warning" class="mb-4">
          L'année scolaire n'est pas encore définie.
        </v-alert>

        <v-row v-if="showNotificationsComponent">
          <v-col>
            <NotificationComponent
              :enseignant-id="enseignantId"
              :annee-scolaire="anneeScolaire"
              :annee-scolaire-id="anneeScolaireId"
              :etablissement-id="etablissementId"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col>
            <ClassManager
              v-if="selectedSubjectId"
              :subject-id="selectedSubjectId"
              :etablissement-id="etablissementId"
              :classes="classes"
              :annee-scolaire="anneeScolaire"
              :annee-scolaire-id="anneeScolaireId"
              :selected-class-id="selectedClassId"
              @class-selected="showClassDetails"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col>
            <ClassDetails
              v-if="selectedClassId"
              :class-id="selectedClassId"
              :class-name="selectedClassName"
              :etablissement-id="etablissementId"
              :annee-scolaire="anneeScolaire"
              :annee-scolaire-id="anneeScolaireId"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-main>

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

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'nuxt/app';
import { useDisplay } from 'vuetify';
import ToolbarComponents from '@/components/professeurs/ToolbarComponents.vue';
import ClassManager from '@/components/professeurs/ClassManager.vue';
import NotificationComponent from '@/components/professeurs/NotificationComponent.vue';

// Gestion drawer et affichage responsive
const drawer = ref(false);
const { smAndDown } = useDisplay();
const drawerWidth = computed(() => (smAndDown.value ? 200 : 300));

// États de l'application
const selectedSubjectId = ref(null);
const selectedClassId = ref(null);
const selectedClassName = ref('');
const subjects = ref([]);
const classes = ref([]);
const etablissementId = ref(null);
const nomEtablissement = ref('');
const enseignantNom = ref('');
const enseignantPrenom = ref('');
const enseignantId = ref(null);
const logoutDialog = ref(false);
const anneeScolaire = ref('');
const anneeScolaireId = ref(null);
const showNotificationsComponent = ref(false);

// Récupérer les matières uniques
const uniqueSubjects = computed(() => {
  const map = new Map();
  return subjects.value.filter(subject => {
    if (!map.has(subject.matiere_id)) {
      map.set(subject.matiere_id, true);
      return true;
    }
    return false;
  });
});

// Router
const router = useRouter();

// Actions
const fetchAnneeScolaire = async () => {
  try {
    const response = await axios.get(`http://localhost:8080/api/annees-scolaires/${etablissementId.value}`);
    if (response.data?.id) {
      anneeScolaire.value = response.data.nom;
      anneeScolaireId.value = response.data.id;
    } else {
      anneeScolaire.value = null;
      anneeScolaireId.value = null;
      console.warn("Aucune année scolaire active.");
    }
  } catch (error) {
    console.error("Erreur année scolaire :", error);
  }
};

const selectSubject = (id) => {
  selectedSubjectId.value = id;
  selectedClassId.value = null;
  classes.value = subjects.value.filter(subject => subject.matiere_id === id);
};

const showClassDetails = (classId) => {
  const selectedClass = classes.value.find(cl => cl.class_id === classId);
  selectedClassId.value = classId;
  selectedClassName.value = selectedClass ? selectedClass.class_name : '';
};

const showNotifications = () => {
  showNotificationsComponent.value = !showNotificationsComponent.value;
};

const showLogoutDialog = () => {
  logoutDialog.value = true;
};

const toggleDrawer = () => {
  drawer.value = !drawer.value;
};

const logout = () => {
  localStorage.removeItem('token');
  router.push('/professeurs/connexion');
};

// Initialisation
onMounted(async () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      enseignantId.value = decodedToken.id;
      etablissementId.value = decodedToken.etablissement;
      nomEtablissement.value = decodedToken.etablissement_nom;
      enseignantNom.value = decodedToken.enseignant_nom;
      enseignantPrenom.value = decodedToken.enseignant_prenom;

      await fetchAnneeScolaire();

      const response = await axios.get(
        `http://localhost:8080/api/enseignant/matieres-classes/${enseignantId.value}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      subjects.value = response.data;
    } catch (error) {
      console.error('Erreur récupération données enseignant :', error);
    }
  }
});
</script>

<style scoped>
.background-blur {
  @apply fixed top-0 left-0 w-full h-full bg-cover bg-center filter blur-md;
  background-image: url('/assets/professeurs/istockphoto-1328488607-1024x1024.jpg');
  z-index: -1;
}

.fixed-toolbar {
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 20;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.v-main {
  padding-top: 64px; /* hauteur de la toolbar */
}

.content-container {
  @apply bg-white bg-opacity-95 rounded-2xl shadow-md relative z-10 px-4 py-6 sm:px-8 sm:py-8;
}
.navigate{
   position: fixed;
}
</style>
