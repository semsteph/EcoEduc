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
          :initialBadgeCount="initialBadgeCount"
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
import { EventBus } from "@/event-bus";
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
const initialBadgeCount = ref(0);

    const drawer = ref(false);
    const logoutDialogVisible = ref(false);
    const currentComponent = ref("Acceuil");

    const etablissementId = ref(null);
    const anneeScolaireId = ref(null);
    const anneeScolaireNom = ref(null);

   const fetchNotificationCount = async () => {
  const parentId = route.query.id;
  const token = localStorage.getItem("token");

  if (!parentId || !etablissementId.value || !anneeScolaireId.value) return;

  try {
    const res = await axios.get(
      `http://localhost:8080/api/notificationed/${parentId}/${etablissementId.value}/${anneeScolaireId.value}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const notifs = res.data.alertMessages || [];

    // ✅ Nombre de notifications contenant [NOUVELLE]
    const currentTotal = notifs.filter((msg) => msg.includes("[NOUVELLE]")).length;

    const previousTotal = parseInt(localStorage.getItem("notifications_total") || "0");
    const read = parseInt(localStorage.getItem("notifications_read_count") || "0");

    // ✅ Mets à jour le total si on détecte plus de notifications
    if (currentTotal > previousTotal) {
      localStorage.setItem("notifications_total", currentTotal);
    }

    // ✅ Calcule le nombre de notifications non lues
    const unread = currentTotal - read;

    // ✅ Met à jour la valeur du badge
    initialBadgeCount.value = unread > 0 ? unread : 0;

    // ✅ Émet l'événement pour le composant Toolbar
    EventBus.emit("updateBadgeCount", unread);
  } catch (error) {
    console.error("❌ Erreur lors du chargement des notifications :", error);
    EventBus.emit("updateBadgeCount", 0);
  }
};


    const fetchAnneeScolaire = async () => {
      try {
        const res = await axios.get(`http://localhost:8080/api/annees-scolaires/${etablissementId.value}`);
        let data = res.data;

        if (Array.isArray(data)) {
          data = data.length > 0 ? data[0] : null;
        }

        if (data) {
          anneeScolaireId.value = data.id;
          anneeScolaireNom.value = data.nom;

          await fetchNotificationCount(); // ✅ Charger les notifs après chargement année
        } else {
          console.warn("Aucune année scolaire trouvée.");
        }
      } catch (error) {
        console.error("Erreur de récupération année scolaire :", error);
      }
    };

    onMounted(async () => {
      etablissementId.value = Number(route.query.etablissement) || null;

      if (etablissementId.value) {
        await fetchAnneeScolaire();
      }
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
      anneeScolaireId,
      anneeScolaireNom,
      initialBadgeCount,
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
