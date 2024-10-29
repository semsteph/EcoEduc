<template>
  <v-app>
    <ToolbarComponent @toggleDrawer="toggleDrawer" @showComponent="showComponent" />
    <v-navigation-drawer v-model="drawer" app color="blue darken-3" dark>
      <v-list dense>
        <v-list-item @click="showComponent('Acceuil')">
          <v-list-item-icon>
            <v-icon>mdi-home</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Accueil</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item @click="showComponent('ChildrenList')">
          <v-list-item-icon>
            <v-icon>mdi-account-child</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Mes enfants</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item @click="showComponent('ContactAdmin')">
          <v-list-item-icon>
            <v-icon>mdi-email</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Contacter administration</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <!-- Déconnexion -->
        <v-list-item @click="openLogoutDialog">
          <v-list-item-icon>
            <v-icon>mdi-logout</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Déconnexion</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Contenu principal qui affiche dynamiquement les composants -->
    <v-main class="background">
      <component
        :is="currentComponent"
        v-if="currentComponent"
        :etablissementId="etablissementId" 
      ></component>
    </v-main>

    <!-- Composant de déconnexion avec un dialogue -->
    <LogoutDialog v-model="logoutDialogVisible" @logout="logout" />
  </v-app>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

// Importation des composants nécessaires
import ToolbarComponent from '@/components/parents/ToolbarComponent.vue';
import ChildrenList from '@/components/parents/ChildrenList.vue';
import Acceuil from '@/components/parents/Acceuil.vue';
import LogoutDialog from '@/components/parents/LogoutDialog.vue';

export default {
  components: {
    ToolbarComponent,
    ChildrenList,
    Acceuil,
    LogoutDialog,
  },
  setup() {
    const router = useRouter();
    const route = useRoute();

    const currentComponent = ref(null);
    const drawer = ref(false);
    const logoutDialogVisible = ref(false);

    // ID de l'établissement à partir des paramètres d'URL
    const etablissementId = ref(null);

    // Récupérer l'ID de l'établissement depuis les paramètres d'URL
    onMounted(() => {
      etablissementId.value = Number(route.query.etablissement) || null; // Convertir en nombre
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
.background {
  background-image: url('/assets/parents/ecolier-fait-ses-devoirs-ses-parents_1290988-1159.jpg');
  background-size: cover;
  background-position: center;
  min-height: 100vh;
  position: relative;
}
</style>
