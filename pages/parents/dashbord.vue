<template>
  <v-app>
    <!-- Barre d'outils avec bouton pour ouvrir le menu latéral -->
    <ToolbarComponent @toggleDrawer="toggleDrawer" @showComponent="showComponent" />
    
    <!-- Menu latéral de navigation -->
    <v-navigation-drawer v-model="drawer" app color="primary" dark>
      <v-list dense>
        <v-subheader class="white--text">Menu Principal</v-subheader>

        <!-- Option pour afficher l'accueil -->
        <v-list-item @click="showComponent('Acceuil')">
          <v-list-item-icon>
            <v-icon class="white--text">mdi-home</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title class="white--text">Accueil</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <!-- Option pour afficher la liste des enfants -->
        <v-list-item @click="showComponent('ChildrenList')">
          <v-list-item-icon>
            <v-icon class="white--text">mdi-account-child</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title class="white--text">Mes enfants</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <!-- Option pour afficher le formulaire de contact de l'administration -->
        <v-list-item @click="showComponent('ContactAdmin')">
          <v-list-item-icon>
            <v-icon class="white--text">mdi-email</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title class="white--text">Contacter administration</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-divider></v-divider>

        <!-- Option pour se déconnecter -->
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

    <!-- Contenu principal qui affiche dynamiquement les composants -->
    <v-main class="background">
      <!-- Superposition pour rendre le fond flou -->
      <div class="background-overlay"></div>

      <!-- Contenu principal -->
      <div class="content-overlay">
        <component
          :is="currentComponent"
          v-if="currentComponent"
          :etablissementId="etablissementId"
          @showComponent="showComponent"
        ></component>
      </div>
    </v-main>

    <!-- Composant de dialogue pour la déconnexion -->
    <LogoutDialog v-model="logoutDialogVisible" @logout="logout" />
  </v-app>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

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

    onMounted(() => {
      etablissementId.value = Number(route.query.etablissement) || null;
    });

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
    };
  },
};
</script>

<style scoped>
/* Contexte général */
.background {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

/* Superposition pour rendre le fond flou */
.background-overlay {
  background-image: url('/assets/parents/ecolier-fait-ses-devoirs-ses-parents_1290988-1159.jpg');
  background-size: cover;
  background-position: center;
  filter: blur(8px); /* Applique un flou uniquement à l'image de fond */
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* Superposition pour le contenu principal */
.content-overlay {
  position: relative;
  z-index: 2;
  background-color: rgba(255, 255, 255, 0.3); /* Transparence légère pour une esthétique moderne */
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  margin: 24px auto;
  max-width: 1200px;
}

/* Amélioration des listes */
.v-list-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transition: background-color 0.3s ease;
}

/* Texte */
.v-subheader {
  font-weight: bold;
  letter-spacing: 1px;
}

.v-list-item-title {
  font-size: 16px;
  font-weight: 500;
}
</style>
