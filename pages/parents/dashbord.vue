<template>
  <v-app class="app-root">
    <ToolbarComponent
      class="white-toolbar"
      :initialBadgeCount="initialBadgeCount"
      @toggleDrawer="toggleDrawer"
      @showComponent="showComponent"
      @notificationsOpened="onNotificationsOpened"
    />

    <v-navigation-drawer
      v-model="drawer"
      app
      :temporary="isMobile"
      :width="drawerWidth"
      class="app-drawer"
      color="primary"
      dark
    >
      <div class="drawer-shell">
        <div class="drawer-header">
          <div class="drawer-brand">
            <div class="drawer-logo">
              <v-icon size="20">mdi-school-outline</v-icon>
            </div>
            <div class="drawer-brand-text">
              <div class="drawer-title">EchoEducation</div>
              <div class="drawer-subtitle">Espace Parent</div>
            </div>
          </div>

          <div class="drawer-meta">
            <v-chip size="small" class="drawer-chip" variant="tonal" label>
              <v-icon start size="16">mdi-calendar</v-icon>
              {{ anneeScolaireNom || "Année non définie" }}
            </v-chip>
          </div>
        </div>

        <v-divider class="drawer-divider" />

        <div class="drawer-scroll">
          <v-list density="compact" nav class="drawer-list">
            <div class="drawer-section">Menu principal</div>

            <v-list-item
              :active="currentComponent === 'DashboardHome'"
              @click="showComponent('DashboardHome')"
              class="drawer-item"
              rounded="lg"
            >
              <template #prepend><v-icon>mdi-view-dashboard-outline</v-icon></template>
              <v-list-item-title>Tableau de bord</v-list-item-title>
            </v-list-item>

            <v-list-item
              :active="currentComponent === 'Acceuil'"
              @click="showComponent('Acceuil')"
              class="drawer-item"
              rounded="lg"
            >
              <template #prepend><v-icon>mdi-home</v-icon></template>
              <v-list-item-title>Accueil</v-list-item-title>
            </v-list-item>

            <v-list-item
              :active="currentComponent === 'ChildrenList'"
              @click="showComponent('ChildrenList')"
              class="drawer-item"
              rounded="lg"
            >
              <template #prepend><v-icon>mdi-account-child</v-icon></template>
              <v-list-item-title>Mes enfants</v-list-item-title>
            </v-list-item>

            <v-list-item
              :active="currentComponent === 'NotificationsComponent'"
              @click="showComponent('NotificationsComponent')"
              class="drawer-item"
              rounded="lg"
            >
              <template #prepend><v-icon>mdi-bell-outline</v-icon></template>
              <v-list-item-title>Notifications</v-list-item-title>
            </v-list-item>

            <v-list-item
              :active="currentComponent === 'ContactAdmin'"
              @click="showComponent('ContactAdmin')"
              class="drawer-item"
              rounded="lg"
            >
              <template #prepend><v-icon>mdi-email</v-icon></template>
              <v-list-item-title>Contacter l’administration</v-list-item-title>
            </v-list-item>

            <v-list-item
              :active="currentComponent === 'GuideUtilisateur'"
              @click="showComponent('GuideUtilisateur')"
              class="drawer-item"
              rounded="lg"
            >
              <template #prepend><v-icon>mdi-help-circle-outline</v-icon></template>
              <v-list-item-title>Guide d’utilisation</v-list-item-title>
            </v-list-item>

            <v-divider class="my-3 drawer-divider" />

            <div class="drawer-section">Compte</div>

            <v-list-item
              @click="openLogoutDialog"
              class="drawer-item drawer-logout"
              rounded="lg"
            >
              <template #prepend><v-icon>mdi-logout</v-icon></template>
              <v-list-item-title>Déconnexion</v-list-item-title>
            </v-list-item>
          </v-list>
        </div>

        <div class="drawer-footer">
          <div class="drawer-footer-text">© {{ currentYear }} — EchoEducation</div>
        </div>
      </div>
    </v-navigation-drawer>

    <v-main class="main-background main-scroll">
      <div class="page-shell">
        <div class="content-container">
          <client-only>
            <!-- Fil d'Ariane et flèche de retour, en haut et en bas de chaque écran -->
            <PageNav :crumbs="crumbs" position="top" />

            <!-- Écran courant = route enfant (pages/parents/dashbord/...) -->
            <NuxtPage
              v-if="ready"
              :etablissementId="etablissementId"
              :anneeScolaireId="anneeScolaireId"
              :initialBadgeCount="initialBadgeCount"
              @showComponent="showComponent"
            />

            <PageNav :crumbs="crumbs" position="bottom" />
          </client-only>
        </div>
      </div>
    </v-main>

    <LogoutDialog v-model="logoutDialogVisible" @logout="logout" />
  </v-app>
</template>

<script>
import { ref, onMounted, computed, onBeforeUnmount } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";
import { EventBus } from "@/event-bus";

import ToolbarComponent from "@/components/parents/ToolbarComponent.vue";
import LogoutDialog from "@/components/parents/LogoutDialog.vue";
import PageNav from "@/components/PageNav.vue";
import { providePageNav, buildCrumbs, slugToName } from "@/composables/usePageNav";

// Chaque section du tableau de bord a sa propre route (pages/parents/dashbord/...).
// Les composants émettent encore « showComponent » avec le nom de la section :
// on le traduit en route.
const BASE_PATH = "/parents/dashbord";

// Libellés du fil d'Ariane de l'espace parents.
const CRUMB_LABELS = {
  accueil: "Accueil",
  enfants: "Mes enfants",
  notifications: "Notifications",
  messages: "Messages",
  contact: "Contacter l'administration",
  guide: "Guide d'utilisation",
  notes: "Notes",
  bulletin: "Bulletin",
  presence: "Présence",
  conduite: "Conduite",
  scolarite: "Scolarité",
  programme: "Emploi du temps",
  permission: "Demande de permission",
  activite: "Activité",
  devoirs: "Devoirs",
  assistances: "Assistants IA",
};

function parentCrumbLabel(segment, previous) {
  // /enfants/:enfant → prénom de l'enfant ; /assistances/:matiereId → conversation.
  if (previous[previous.length - 1] === "enfants") return slugToName(segment);
  if (previous[previous.length - 1] === "assistances") return "Conversation";
  return CRUMB_LABELS[segment] || null;
}
const SECTION_PATHS = {
  DashboardHome: BASE_PATH,
  Acceuil: `${BASE_PATH}/accueil`,
  ChildrenList: `${BASE_PATH}/enfants`,
  NotificationsComponent: `${BASE_PATH}/notifications`,
  MessagesComponent: `${BASE_PATH}/messages`,
  ContactAdmin: `${BASE_PATH}/contact`,
  GuideUtilisateur: `${BASE_PATH}/guide`,
};

export default {
  components: {
    ToolbarComponent,
    LogoutDialog,
    PageNav,
  },

  setup() {
    const router = useRouter();
    const route = useRoute();
    const pageNav = providePageNav();
    const crumbs = computed(() =>
      buildCrumbs(route.path, BASE_PATH, "Tableau de bord", parentCrumbLabel, { labels: pageNav.labels })
    );

    const API_BASE = "";

    const drawer = ref(false);
    const logoutDialogVisible = ref(false);
    // Section active du menu, déduite de la route courante.
    const currentComponent = computed(() => {
      const path = route.path.replace(/\/+$/, "");
      const found = Object.entries(SECTION_PATHS)
        .filter(([name]) => name !== "DashboardHome")
        .find(([, p]) => path === p || path.startsWith(`${p}/`));
      return found ? found[0] : "DashboardHome";
    });
    // Les écrans ont besoin de l'année scolaire : on attend qu'elle soit chargée
    // (au rechargement, l'écran est affiché d'emblée, sans passer par un clic).
    const ready = ref(false);

    const etablissementId = ref(null);
    const anneeScolaireId = ref(null);
    const anneeScolaireNom = ref(null);

    // ✅ Badge sticky
    const initialBadgeCount = ref(0);

    const width = ref(1024);
    const currentYear = computed(() => new Date().getFullYear());

    const onResize = () => {
      if (typeof window !== "undefined") width.value = window.innerWidth;
    };

    const isMobile = computed(() => width.value <= 600);
    const drawerWidth = computed(() => (isMobile.value ? 280 : 320));

    const pollingTimer = ref(null);

    const getToken = () =>
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const getParentIdFromToken = () => {
      const token = getToken();
      if (!token) return null;
      const decoded = decodeJwtPayload(token);
      return decoded?.id || null;
    };

    const toBool = (v) => v === true || v === 1 || v === "1";

    // Badge de la cloche : nombre exact de notifications non lues (alertes
    // et messages). Il ne baisse que quand le parent les a vraiment lues.
    const applyStickyBadge = (serverUnread) => {
      initialBadgeCount.value = Number(serverUnread || 0);
      EventBus.emit("badge:set", initialBadgeCount.value);
    };

    const fetchNotificationCount = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const res = await axios.get(`${API_BASE}/api/parent/notifications/non-lues`, { headers: { Authorization: `Bearer ${token}` } });
        applyStickyBadge(res.data?.nonLues);
      } catch (err) {
        // Session réellement invalide : plugins/axios-auth.client.ts renvoie déjà à la connexion.
        console.error("Erreur notifications :", err?.response?.data || err);
      }
    };

    const startPolling = () => {
      stopPolling();
      fetchNotificationCount();
      pollingTimer.value = setInterval(fetchNotificationCount, 30000);
    };

    const stopPolling = () => {
      if (pollingTimer.value) {
        clearInterval(pollingTimer.value);
        pollingTimer.value = null;
      }
    };

    const fetchAnneeScolaire = async () => {
      if (!etablissementId.value) return;

      try {
        const res = await axios.get(`${API_BASE}/api/annees-scolaires/${etablissementId.value}`);
        const data = Array.isArray(res.data) ? res.data[0] : res.data;

        if (data) {
          anneeScolaireId.value = Number(data.id) || null;
          anneeScolaireNom.value = data.nom_annee ?? data.nom ?? null;
          startPolling();
        }
      } catch (err) {
        console.error("Erreur année scolaire :", err?.response?.data || err);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchNotificationCount();
    };

    onMounted(async () => {
      onResize();
      window.addEventListener("resize", onResize);

      const token = getToken();
      if (!token) {
        router.push({ name: "parents-connexion" });
        return;
      }

      // Adresse ouverte sans les paramètres du login : l'établissement est relu dans le token.
      etablissementId.value =
        Number(route.query.etablissement) ||
        Number(decodeJwtPayload(token)?.etablissementId) ||
        null;

      if (etablissementId.value) {
        await fetchAnneeScolaire();
      }
      ready.value = true;

      drawer.value = !isMobile.value;

      document.addEventListener("visibilitychange", onVisibilityChange);
      window.addEventListener("focus", fetchNotificationCount);
    });

    onBeforeUnmount(() => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("focus", fetchNotificationCount);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stopPolling();
    });

    const toggleDrawer = () => (drawer.value = !drawer.value);


    const showComponent = (comp) => {
      const path = SECTION_PATHS[comp] || BASE_PATH;
      if (route.path.replace(/\/+$/, "") !== path) {
        router.push({ path });
      }
      if (isMobile.value) drawer.value = false;

      if (comp === "NotificationsComponent") {
        // refresh direct mais sticky
        fetchNotificationCount();
      }
    };

    const openLogoutDialog = () => (logoutDialogVisible.value = true);

    // ✅ Quand l’utilisateur clique sur la cloche, la toolbar va demander d’effacer.
    // Ici on accepte : le badge tombe à 0 UNIQUEMENT sur action utilisateur.
    // Le badge se met à jour quand le parent a lu (l'écran le signale).
    const onNotificationsOpened = () => {
      fetchNotificationCount();
    };

    const logout = () => {
      logoutDialogVisible.value = false;
      stopPolling();
      if (typeof window !== "undefined") localStorage.removeItem("token");
      router.push({ name: "parents-connexion" });
    };

    return {
      crumbs,
      drawer,
      logoutDialogVisible,
      currentComponent,
      ready,
      toggleDrawer,
      showComponent,
      openLogoutDialog,
      logout,
      onNotificationsOpened,
      etablissementId,
      anneeScolaireId,
      anneeScolaireNom,
      initialBadgeCount,
      isMobile,
      drawerWidth,
      currentYear,
    };
  },
};
</script>

<style scoped>
.app-root {
  height: 100vh;
  overflow: hidden;
}

.main-scroll {
  height: 100vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.app-drawer {
  height: 100vh;
}
.app-drawer :deep(.v-navigation-drawer__content) {
  height: 100%;
  overflow: hidden;
}

.drawer-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.drawer-header {
  padding: 12px 12px 10px;
}

.drawer-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.drawer-logo {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.20);
}

.drawer-brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.drawer-title {
  font-weight: 900;
  letter-spacing: 0.2px;
}

.drawer-subtitle {
  opacity: 0.9;
  font-size: 0.86rem;
}

.drawer-meta {
  margin-top: 8px;
}

.drawer-chip {
  font-weight: 800;
  border-radius: 999px;
}

.drawer-divider {
  opacity: 0.35;
}

.drawer-scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 8px;
}

.drawer-list {
  padding: 6px 8px 8px;
}

.drawer-section {
  padding: 8px 10px;
  font-weight: 900;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  font-size: 0.75rem;
  opacity: 0.9;
}

.drawer-item {
  margin: 2px 4px;
  border-radius: 10px!important;
  transition: background-color 0.2s ease, transform 0.12s ease;
}

.drawer-item:hover {
  background-color: rgba(255, 255, 255, 0.14);
  transform: translateY(-1px);
}

.drawer-item:deep(.v-list-item-title) {
  font-weight: 800;
}

.drawer-logout {
  background: rgba(0, 0, 0, 0.10);
}
.drawer-logout:hover {
  background: rgba(0, 0, 0, 0.16);
}

.drawer-footer {
  padding: 8px 12px 10px;
  opacity: 0.9;
}
.drawer-footer-text {
  font-size: 0.8rem;
  opacity: 0.85;
}

.main-background {
  min-height: 100vh;
  background:
    radial-gradient(900px 500px at 20% 15%, rgba(25, 118, 210, 0.16), transparent 60%),
    radial-gradient(700px 500px at 80% 10%, rgba(11, 46, 74, 0.10), transparent 55%),
    linear-gradient(180deg, #eaf2ff 0%, #ffffff 45%, #f6f9ff 100%);
}

.page-shell {
  padding: 14px 12px;
}

.content-container {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(25, 118, 210, 0.12);
  border-radius: 10px;
  padding: 12px;
  max-width: 1200px;
  margin: 0 auto;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(8px);
}

.white-toolbar {
  background-color: #ffffff !important;
  color: #0b2e4a !important;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

@media (max-width: 600px) {
  /* Sur mobile, chaque sous-page gère déjà son propre fond, sa carte et son
     en-tête (topbar avec bouton retour) : la carte flottante du shell ne fait
     que doubler ce chrome et gaspiller de l'espace vertical. On la neutralise
     pour laisser les sous-pages s'afficher en plein écran, bord à bord. */
  .page-shell { padding: 0; }
  .content-container {
    padding: 0;
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
    backdrop-filter: none;
    max-width: none;
  }
}

@media (max-width: 360px) {
  .drawer-title { font-size: 0.98rem; }
}
</style>
