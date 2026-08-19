<template>
  <v-app class="no-scroll-x">
    <v-navigation-drawer
      v-model="drawer"
      :permanent="mdAndUp"
      app
      fixed
      color="primary"
      dark
      elevation="2"
      width="260"
    >
      <v-toolbar flat color="primary" class="d-flex justify-center pt-4">
        <v-img src="@/assets/administration/logooff.png" max-width="140" contain />
      </v-toolbar>

      <v-divider class="mt-2"></v-divider>

      <v-list density="compact" nav class="mt-4">
        <v-list-item class="mb-2">
          <v-list-item-title class="text-caption grey--text text-lighten-3">
            Etablissement
          </v-list-item-title>
          <v-list-item-subtitle class="white--text font-weight-bold">
            {{ etablissementNom }}
          </v-list-item-subtitle>
        </v-list-item>

        <v-list-item class="mb-4">
          <v-list-item-title class="text-caption grey--text text-lighten-3">
            Année scolaire
          </v-list-item-title>
          <v-list-item-subtitle class="white--text font-weight-bold">
            {{ anneeScolaireNom }}
          </v-list-item-subtitle>
        </v-list-item>

        <v-divider class="my-3"></v-divider>

        <v-list-item
          v-for="item in visibleMenuItems"
          :key="item.title"
          @click="changeComponent(item.component)"
          :class="{ 'active-item': currentComponent === item.component }"
        >
          <template #prepend>
            <v-icon :icon="item.icon" color="white"></v-icon>
          </template>
          <v-list-item-title class="white--text">{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>

      <template #append>
        <div class="pa-4">
          <v-btn block color="rgba(255,255,255,0.1)" depressed @click="showLogoutDialog">
            <v-icon left color="red lighten-1">mdi-logout</v-icon>
            Déconnexion
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar app fixed color="white" elevation="1" height="64">
      <v-app-bar-nav-icon
        v-if="!mdAndUp"
        @click.stop="drawer = !drawer"
        class="text-primary"
      />
      <v-toolbar-title class="font-weight-bold text-primary">
        EchoEducation
      </v-toolbar-title>
      <v-spacer />

      <v-btn icon @click="showMessages">
        <v-badge
          :content="permissionCount"
          :model-value="permissionCount > 0 && currentComponent !== 'MessageComponent'"
          color="deep-orange"
          overlap
        >
          <v-icon color="primary">mdi-email</v-icon>
        </v-badge>
      </v-btn>

      <v-btn icon @click="showNotifications">
        <v-badge
          :content="notificationCount"
          :model-value="notificationCount > 0 && currentComponent !== 'NotificationComponent'"
          color="deep-orange accent-3"
          overlap
        >
          <v-icon color="primary">mdi-bell</v-icon>
        </v-badge>
      </v-btn>

      <v-btn icon @click="showLogoutDialog">
        <v-icon color="red darken-1">mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main class="main-scroll-area bg-grey-lighten-4">
      <v-container fluid class="pa-2 pa-sm-6 main-content">
        <div v-if="currentComponent === 'Dashboard'">
          <DashboardHome
            v-if="etablissementId && anneeScolaireId"
            :etablissement-id="etablissementId"
            :etablissement-nom="etablissementNom"
            :annee-scolaire-id="anneeScolaireId"
          />
        </div>

        <div v-else>
          <component
            :is="componentsMap[currentComponent]"
            :etablissement-id="etablissementId"
            :etablissement-nom="etablissementNom"
            :annee-scolaire-id="anneeScolaireId"
            :annee-scolaire="anneeScolaireNom"
            :permissions="filteredPermissions"
            :modules-autorises="modulesAutorises"
            @component-selected="selectComponent"
            @back="currentComponent = previousComponent || 'Dashboard'"
            @update-notification-count="fetchNotificationCount"
            @update-permission-count="fetchPermissions"
          />
        </div>
      </v-container>
    </v-main>

    <logout-dialog ref="logoutDialogComp" @confirm-logout="logout" />
  </v-app>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { useDisplay } from "vuetify";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";

// IMPORTATION DE TOUS LES COMPOSANTS
import ParentManagement from "@/components/administration/ParentManagement.vue";
import MessageComponent from "@/components/administration/MessageComponent.vue";
import NotificationComponent from "@/components/administration/NotificationComponent.vue";
import LogoutDialog from "@/components/administration/LogoutDialog.vue";
import ClassManagement from "@/components/administration/ClassManagement.vue";
import StudentManagement from "@/components/administration/StudentManagement.vue";
import TeacherManagement from "@/components/administration/TeacherManagement.vue";
import Inscription from "@/components/administration/Inscription.vue";
import PresenceManagement from "@/components/administration/PresenceManagement.vue";
import PunishmentManagement from "@/components/administration/PunishmentManagement.vue";
import NoteConsultation from "@/components/administration/NoteConsultation.vue";
import BulletinManagement from "@/components/administration/BulletinManagement.vue";
import Parametre from "@/components/administration/Parametre.vue";
import Reinscription from "@/components/administration/Reinscription.vue";
import MesEleves from "@/components/administration/MesEleves.vue";
import CarteScolaire from "~/components/administration/CarteScolaire.vue";
import ScolariteManager from "~/components/administration/ScolariteManager.vue";
import MonProfil from "@/components/administration/MonProfil.vue";
import DashboardHome from "@/components/administration/DashboardHome.vue";

const API_BASE = "";

const { mdAndUp } = useDisplay();
const drawer = ref(null);
const route = useRoute();
const router = useRouter();

const currentComponent = ref("Dashboard");
const previousComponent = ref(null);
const etablissementId = ref(null);
const etablissementNom = ref("");
const anneeScolaireNom = ref("");
const anneeScolaireId = ref(null);

const permissionCount = ref(0);
const notificationCount = ref(0);
const filteredPermissions = ref([]);
const logoutDialogComp = ref(null);

// MAP DE TOUS LES COMPOSANTS POUR LE RENDU DYNAMIQUE
const componentsMap = {
  ParentManagement,
  MessageComponent,
  NotificationComponent,
  ClassManagement,
  StudentManagement,
  TeacherManagement,
  Inscription,
  PresenceManagement,
  PunishmentManagement,
  NoteConsultation,
  BulletinManagement,
  Reinscription,
  Parametre,
  MesEleves,
  CarteScolaire,
  ScolariteManager,
  MonProfil,
};

const menuItems = [
  { title: "Tableau de bord", component: "Dashboard", icon: "mdi-view-dashboard" },
  { title: "Classes", component: "ClassManagement", icon: "mdi-school-outline" },
  { title: "Elèves", component: "StudentManagement", icon: "mdi-account-group-outline" },
  { title: "Enseignants", component: "TeacherManagement", icon: "mdi-teach" },
  { title: "Parents", component: "ParentManagement", icon: "mdi-account-child-outline" },
  { title: "Paramètres", component: "Parametre", icon: "mdi-cog-outline" },
];

// ✅ Contrôle d'accès collaborateurs : un compte "administration" (comptable, secrétaire...)
// ne voit que les modules qui lui ont été attribués par le fondateur/directeur.
const userType = ref("etablissement");
const modulesAutorises = ref(null);

const visibleMenuItems = computed(() => {
  if (userType.value !== "administration" || !Array.isArray(modulesAutorises.value)) {
    return menuItems;
  }
  const filtered = menuItems.filter(
    (item) => item.component === "Dashboard" || modulesAutorises.value.includes(item.component)
  );
  filtered.push({ title: "Mon profil", component: "MonProfil", icon: "mdi-account-cog-outline" });
  return filtered;
});

const changeComponent = (component) => {
  previousComponent.value = currentComponent.value;
  currentComponent.value = component;
  if (!mdAndUp.value) drawer.value = false;
};

const selectComponent = (component) => {
        console.log("Reçu :", component)

  if (component === "Scolarite") {
    component = "ScolariteManager"
  }


  previousComponent.value = currentComponent.value;
  currentComponent.value = component;

  console.log("Component trouvé :", componentsMap[component])
};

const showMessages = () => changeComponent("MessageComponent");
const showNotifications = () => changeComponent("NotificationComponent");
const showLogoutDialog = () => {
  logoutDialogComp.value.dialog = true;
};
const logout = () => router.push("/administration/connexion");

// --- LOGIQUE NOTIFICATIONS : GEN + COUNT ---
const generateNotifications = async () => {
  if (!etablissementId.value || !anneeScolaireId.value) return;

  try {
    await axios.post(`${API_BASE}/api/notifications/generate`, {
      etablissement_id: etablissementId.value,
      annee_scolaire_id: anneeScolaireId.value,
    });
  } catch (err) {
    console.error("❌ Erreur generate notifications:", err);
  }
};

const fetchAnneeScolaire = async () => {
  try {
    const res = await axios.get(`${API_BASE}/api/annees-scolaires/${etablissementId.value}`);
    if (res.data) {
      anneeScolaireNom.value = res.data.nom || "Non spécifiée";
      anneeScolaireId.value = res.data.id || null;
    }
  } catch (error) {
    anneeScolaireNom.value = "Année clôturée";
    anneeScolaireId.value = null;
  }
};

const fetchPermissions = async () => {
  if (!etablissementId.value || !anneeScolaireId.value) return;
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(
      `${API_BASE}/api/permissions/${etablissementId.value}/${anneeScolaireId.value}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const now = new Date();
    const filtered = (response.data || []).filter((p) => {
      const date = new Date(p.Date || p.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    filteredPermissions.value = filtered;
    permissionCount.value = filtered.filter((p) => Number(p.is_read) === 0).length;
  } catch (error) {
    console.error(error);
  }
};

const fetchNotificationCount = async () => {
  if (!etablissementId.value || !anneeScolaireId.value) return;
  try {
    const res = await axios.get(
      `${API_BASE}/api/notifications/unread/${etablissementId.value}/${anneeScolaireId.value}`
    );
    notificationCount.value = res.data.count || 0;
  } catch (err) {
    notificationCount.value = 0;
  }
};

// ✅ SYNC COMPLET : generate puis compter
const syncNotifications = async () => {
  await generateNotifications();
  await fetchNotificationCount();
};

let permissionInterval, notificationInterval;

onMounted(async () => {
  etablissementId.value = parseInt(route.query.etablissement_id, 10);
  etablissementNom.value = route.query.etablissement_nom || "";

  userType.value = localStorage.getItem("user_type") || "etablissement";
  if (userType.value === "administration") {
    try {
      modulesAutorises.value = JSON.parse(localStorage.getItem("modules_autorises") || "[]");
    } catch {
      modulesAutorises.value = [];
    }
  }

  // 1) Charger l'année scolaire
  await fetchAnneeScolaire();

  // 2) Permissions + notif init
  fetchPermissions();
  await syncNotifications();

  // 3) Polling régulier
  permissionInterval = setInterval(fetchPermissions, 30000);
  notificationInterval = setInterval(syncNotifications, 30000);
});

onBeforeUnmount(() => {
  clearInterval(permissionInterval);
  clearInterval(notificationInterval);
});
</script>

<style scoped>
.no-scroll-x {
  max-width: 100vw !important;
  overflow-x: hidden !important;
}

.main-scroll-area {
  height: 100vh;
  overflow-y: auto !important;
  background-color: #f4f7fa !important;
}

.active-item {
  background-color: rgba(255, 255, 255, 0.15) !important;
  border-left: 4px solid #ffc107;
}

.border-card {
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
}

/* Fixation pour s'assurer que Header et Sidebar ne bougent pas */m,
header.v-app-bar.v-app-bar--fixed,
nav.v-navigation-drawer--fixed {
  z-index: 1000 !important;
}
</style>
