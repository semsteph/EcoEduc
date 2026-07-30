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
            <component
              :is="currentComponent"
              v-if="currentComponent"
              :etablissementId="etablissementId"
              :anneeScolaireId="anneeScolaireId"
              :initialBadgeCount="initialBadgeCount"
              @showComponent="showComponent"
            />
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
import ChildrenList from "@/components/parents/ChildrenList.vue";
import Acceuil from "@/components/parents/Acceuil.vue";
import DashboardHome from "@/components/parents/DashboardHome.vue";
import LogoutDialog from "@/components/parents/LogoutDialog.vue";
import NotificationsComponent from "@/components/parents/NotificationsComponent.vue";

export default {
  components: {
    ToolbarComponent,
    ChildrenList,
    Acceuil,
    DashboardHome,
    LogoutDialog,
    NotificationsComponent,
  },
  setup() {
    const router = useRouter();
    const route = useRoute();

    const API_BASE = "";

    const drawer = ref(false);
    const logoutDialogVisible = ref(false);
    const currentComponent = ref("DashboardHome");

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

    const decodeJwtPayload = (token) => {
      try {
        return JSON.parse(atob(token.split(".")[1]));
      } catch {
        return null;
      }
    };

    const getParentIdFromToken = () => {
      const token = getToken();
      if (!token) return null;
      const decoded = decodeJwtPayload(token);
      return decoded?.id || null;
    };

    const toBool = (v) => v === true || v === 1 || v === "1";

    // ✅ IMPORTANT: on n'écrase JAMAIS le badge vers 0 automatiquement
    const applyStickyBadge = (serverUnread) => {
      const current = Number(initialBadgeCount.value || 0);
      const n = Number(serverUnread || 0);

      // on ne descend jamais automatiquement
      const next = Math.max(current, n);
      initialBadgeCount.value = next;

      // push vers toolbar
      EventBus.emit("badge:set", next);
    };

    const fetchNotificationCount = async () => {
      const token = getToken();
      const parentId = getParentIdFromToken();

      if (!token || !parentId || !etablissementId.value || !anneeScolaireId.value) return;

      try {
        const res = await axios.get(
          `${API_BASE}/api/notificationed/${parentId}/${etablissementId.value}/${anneeScolaireId.value}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const notifs = Array.isArray(res.data?.notifications) ? res.data.notifications : [];
        const unread = notifs.filter((n) => !toBool(n.is_read)).length;

        // ✅ sticky update (ne descend pas)
        applyStickyBadge(unread);

      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          if (typeof window !== "undefined") localStorage.removeItem("token");
          router.push({ name: "parents-connexion" });
          return;
        }
        console.error("Erreur notifications :", err?.response?.data || err);
        // ⚠️ on ne met PAS à 0 ici sinon ça ferait disparaître le badge
      }
    };

    const startPolling = () => {
      stopPolling();
      fetchNotificationCount();
      pollingTimer.value = setInterval(fetchNotificationCount, 10000);
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

      etablissementId.value = Number(route.query.etablissement) || null;

      if (etablissementId.value) {
        await fetchAnneeScolaire();
      }

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
      currentComponent.value = comp;
      if (isMobile.value) drawer.value = false;

      if (comp === "NotificationsComponent") {
        // refresh direct mais sticky
        fetchNotificationCount();
      }
    };

    const openLogoutDialog = () => (logoutDialogVisible.value = true);

    // ✅ Quand l’utilisateur clique sur la cloche, la toolbar va demander d’effacer.
    // Ici on accepte : le badge tombe à 0 UNIQUEMENT sur action utilisateur.
    const onNotificationsOpened = () => {
      initialBadgeCount.value = 0;
      EventBus.emit("badge:set", 0);
    };

    const logout = () => {
      logoutDialogVisible.value = false;
      stopPolling();
      if (typeof window !== "undefined") localStorage.removeItem("token");
      router.push({ name: "parents-connexion" });
    };

    return {
      drawer,
      logoutDialogVisible,
      currentComponent,
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
  padding: 18px 16px 12px;
}

.drawer-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.drawer-logo {
  width: 40px;
  height: 40px;
  border-radius: 14px;
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
  margin-top: 12px;
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
  padding: 10px 12px 12px;
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
  margin: 6px 4px;
  border-radius: 14px !important;
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
  padding: 12px 16px 16px;
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
  padding: 26px 18px;
}

.content-container {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(25, 118, 210, 0.12);
  border-radius: 22px;
  padding: 28px;
  max-width: 1200px;
  margin: 0 auto;
  box-shadow: 0 16px 60px rgba(11, 46, 74, 0.12);
  backdrop-filter: blur(8px);
}

.white-toolbar {
  background-color: #ffffff !important;
  color: #0b2e4a !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

@media (max-width: 600px) {
  .page-shell { padding: 16px 10px; }
  .content-container { padding: 16px; border-radius: 18px; }
}

@media (max-width: 360px) {
  .content-container { padding: 14px; }
  .drawer-title { font-size: 0.98rem; }
}
</style>
