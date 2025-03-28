<template>
  <v-app>
    <ToolbarComponent @toggleDrawer="toggleDrawer" @showComponent="showComponent" />

    <v-navigation-drawer v-model="drawer" app color="primary" dark>
      <v-list dense>
        <v-subheader class="white--text">Menu Principal</v-subheader>
        <v-list-item>
          <v-list-item-content class="white--text text-center">
            Année scolaire: {{ anneeScolaireNom || 'Non définie' }}
          </v-list-item-content>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item @click="showComponent('Acceuil')">
          <v-list-item-icon>
            <v-icon class="white--text">mdi-home</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title class="white--text">Accueil</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item @click="showComponent('ChildrenList')">
          <v-list-item-icon>
            <v-icon class="white--text">mdi-account-child</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title class="white--text">Mes enfants</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-list-item @click="showComponent('ContactAdmin')">
          <v-list-item-icon>
            <v-icon class="white--text">mdi-email</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title class="white--text">Contacter administration</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item @click="openLogoutDialog">
          <v-list-item-icon>
            <v-icon class="white--text">mdi-logout</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title class="white--text">Déconnexion</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-main class="background">
      <div class="background-overlay"></div>
      <div class="content-overlay">
        <component
          :is="currentComponent"
          v-if="currentComponent"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @showComponent="showComponent"
        ></component>
      </div>
    </v-main>
    <LogoutDialog v-model="logoutDialogVisible" @logout="logout" />
  </v-app>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
import ToolbarComponent from '@/components/parents/ToolbarComponent.vue';
import ChildrenList from '@/components/parents/ChildrenList.vue';
import Acceuil from '@/components/parents/Acceuil.vue';
import LogoutDialog from '@/components/parents/LogoutDialog.vue';
import NotificationsComponent from '@/components/parents/NotificationsComponent.vue';

export default {
  components: {
    ToolbarComponent,
    ChildrenList,
    Acceuil,
    LogoutDialog,
    NotificationsComponent,
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const currentComponent = ref("Acceuil");
    const drawer = ref(false);
    const logoutDialogVisible = ref(false);
    const etablissementId = ref(null);
    const anneeScolaireId = ref(null);
    const anneeScolaireNom = ref(null); 

    onMounted(async () => {
      etablissementId.value = Number(route.query.etablissement) || null;
      if (etablissementId.value) {
        await fetchAnneeScolaire();
      }
    });

    const fetchAnneeScolaire = async () => {
      try {
        const response = await axios.get(`http://localhost:8080/api/annees-scolaires/${etablissementId.value}`);
        console.log("API response:", response.data);

        let data = response.data;
        // Adapte l'extraction en fonction de la structure de la réponse :
        if (Array.isArray(data)) {
          if (data.length > 0) {
            data = data[0]; // Extraction du premier élément du tableau
          } else {
            data = null;
          }
        }
        // Si la réponse est un objet contenant une propriété "data", adapte ici :
        // if(data && data.data) {
        //   data = data.data;
        // }

        if (data) {
          anneeScolaireId.value = data.id || null;
          anneeScolaireNom.value = data.nom || null;
          console.log("Année scolaire récupérée :", anneeScolaireNom.value);
        } else {
          console.warn("Aucune donnée d'année scolaire trouvée.");
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'année scolaire :", error);
      }
    };

    const toggleDrawer = () => {
      drawer.value = !drawer.value;
    };

    const showComponent = (component) => {
      currentComponent.value = component;
      drawer.value = false;
    };

    const openLogoutDialog = () => {
      logoutDialogVisible.value = true;
    };

    const logout = () => {
      logoutDialogVisible.value = false;
      router.push({ name: 'parents-connexion' });
    };

    return {
      currentComponent,
      drawer,
      logoutDialogVisible,
      toggleDrawer,
      showComponent,
      openLogoutDialog,
      logout,
      etablissementId,
      anneeScolaireId,
      anneeScolaireNom,
    };
  },
};
</script>

<style scoped>
.background {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.background-overlay {
  background-image: url('/assets/parents/ecolier-fait-ses-devoirs-ses-parents_1290988-1159.jpg');
  background-size: cover;
  background-position: center;
  filter: blur(8px);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.content-overlay {
  position: relative;
  z-index: 2;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  margin: 24px auto;
  max-width: 1200px;
}

.v-list-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transition: background-color 0.3s ease;
}

.v-subheader {
  font-weight: bold;
  letter-spacing: 1px;
}

.v-list-item-title {
  font-size: 16px;
  font-weight: 500;
}
</style>
