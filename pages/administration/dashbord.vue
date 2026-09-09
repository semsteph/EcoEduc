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

      <v-btn
        icon
        @click="showNoteRequests"
        :class="{ 'note-alert-shake': noteRequestCount > 0 && currentComponent !== 'NoteModificationRequests' }"
      >
        <v-badge
          :content="noteRequestCount"
          :model-value="noteRequestCount > 0 && currentComponent !== 'NoteModificationRequests'"
          color="red-darken-2"
          overlap
          class="note-alert-badge"
        >
          <v-icon :color="noteRequestCount > 0 && currentComponent !== 'NoteModificationRequests' ? 'red-darken-2' : 'primary'">
            mdi-shield-alert-outline
          </v-icon>
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
            @update-request-count="setNoteRequestCount"
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
import NoteModificationRequests from "@/components/administration/NoteModificationRequests.vue";
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
const noteRequestCount = ref(0);
const filteredPermissions = ref([]);
const logoutDialogComp = ref(null);

// ===== ALERTE FORTE "demande de modification de note" =====
// Le but : qu'une nouvelle demande (potentiellement une note supprimée/modifiée
// sans validation si l'admin ne réagit pas) soit IMPOSSIBLE à manquer :
// bip sonore, icône qui pulse/tremble, titre d'onglet clignotant, notification
// système du navigateur. Tout s'arrête dès que l'admin ouvre la liste des
// demandes (setNoteRequestCount(0) est appelé à ce moment-là).
const ORIGINAL_TITLE = "EchoEducation";
let audioCtx = null;
let audioUnlocked = false;
let titleBlinkInterval = null;
let titleBlinkOn = false;
let lastKnownNoteRequestCount = 0;

const unlockAudio = () => {
  if (audioUnlocked) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioUnlocked = true;
  } catch (e) {
    // Web Audio indisponible : tant pis, les autres alertes (visuelles) restent actives.
  }
};

// Bip d'alarme synthétisé (aucun fichier audio à charger) : trois tonalités
// courtes et montantes, façon "sonnerie" — volontairement difficile à ignorer.
const playAlertSound = () => {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const notes = [880, 1046, 1318]; // La5, Do6, Mi6 : sonnerie ascendante
    notes.forEach((freq, i) => {
      const start = audioCtx.currentTime + i * 0.16;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  } catch (e) {
    // silencieux : la sonnerie n'est qu'un renfort, pas critique si elle échoue
  }
};

const startTitleBlink = () => {
  if (titleBlinkInterval) return;
  titleBlinkInterval = setInterval(() => {
    titleBlinkOn = !titleBlinkOn;
    document.title = titleBlinkOn
      ? `🔴 (${noteRequestCount.value}) Demande de note à valider !`
      : ORIGINAL_TITLE;
  }, 900);
};

const stopTitleBlink = () => {
  if (titleBlinkInterval) {
    clearInterval(titleBlinkInterval);
    titleBlinkInterval = null;
  }
  document.title = ORIGINAL_TITLE;
};

const notifyBrowser = (count) => {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const notif = new Notification("⚠️ Demande de modification de note", {
      body: `${count} demande${count > 1 ? "s" : ""} en attente de votre validation.`,
      icon: "/favicon.ico",
      tag: "note-modification-request", // remplace la précédente au lieu d'empiler
      requireInteraction: true, // reste affichée tant que l'admin ne l'a pas fermée
    });
    notif.onclick = () => {
      window.focus();
      showNoteRequests();
      notif.close();
    };
  } catch (e) {
    // API Notification non disponible/refusée : les autres alertes suffisent
  }
};

// Déclenche toute la chaîne d'alerte quand le nombre de demandes en attente augmente.
const handleNoteRequestCountChange = (newCount) => {
  const increased = newCount > lastKnownNoteRequestCount;
  lastKnownNoteRequestCount = newCount;
  noteRequestCount.value = newCount;

  if (newCount > 0) {
    startTitleBlink();
    if (increased) {
      playAlertSound();
      notifyBrowser(newCount);
    }
  } else {
    stopTitleBlink();
  }
};

// MAP DE TOUS LES COMPOSANTS POUR LE RENDU DYNAMIQUE
const componentsMap = {
  ParentManagement,
  MessageComponent,
  NotificationComponent,
  NoteModificationRequests,
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
const showNoteRequests = () => changeComponent("NoteModificationRequests");
// Appelé par NoteModificationRequests quand l'admin ouvre/traite la liste :
// on coupe immédiatement toute l'alerte (son, clignotement, badge).
const setNoteRequestCount = (count) => { handleNoteRequestCountChange(count); };
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

const fetchNoteRequestCount = async () => {
  if (!etablissementId.value || !anneeScolaireId.value) return;
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(
      `${API_BASE}/api/notes/modification-requests/count/${etablissementId.value}/${anneeScolaireId.value}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    handleNoteRequestCountChange(res.data.count || 0);
  } catch (err) {
    // erreur réseau ponctuelle : on ne remet pas le compteur à zéro pour ne
    // pas couper une alerte en cours pour une simple requête ratée
  }
};

let permissionInterval, notificationInterval, noteRequestInterval;

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

  // Prépare la sonnerie d'alerte dès la première interaction (les navigateurs
  // bloquent le son tant qu'il n'y a pas eu de clic sur la page).
  document.addEventListener("click", unlockAudio, { once: true });
  // Demande la permission d'afficher des notifications système : la plus
  // forte des alertes, elle marche même si l'onglet n'est pas au premier plan.
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission();
  }

  // 1) Charger l'année scolaire
  await fetchAnneeScolaire();

  // 2) Permissions + notif init
  fetchPermissions();
  await syncNotifications();
  await fetchNoteRequestCount();

  // 3) Polling régulier — les demandes de modification de notes sont
  // vérifiées bien plus souvent (10s) : c'est l'alerte la plus urgente,
  // elle doit remonter très vite à l'administrateur.
  permissionInterval = setInterval(fetchPermissions, 30000);
  notificationInterval = setInterval(syncNotifications, 30000);
  noteRequestInterval = setInterval(fetchNoteRequestCount, 10000);
});

onBeforeUnmount(() => {
  clearInterval(permissionInterval);
  clearInterval(notificationInterval);
  clearInterval(noteRequestInterval);
  stopTitleBlink();
  document.removeEventListener("click", unlockAudio);
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

/* Alerte "demande de modification de note" : doit être impossible à manquer */
.note-alert-shake {
  animation: note-alert-shake 0.6s ease-in-out infinite;
}

@keyframes note-alert-shake {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-12deg); }
  40% { transform: rotate(10deg); }
  60% { transform: rotate(-8deg); }
  80% { transform: rotate(6deg); }
}

.note-alert-badge :deep(.v-badge__badge) {
  animation: note-alert-pulse 1s ease-in-out infinite;
  box-shadow: 0 0 0 rgba(211, 47, 47, 0.6);
}

@keyframes note-alert-pulse {
  0% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.7); }
  70% { box-shadow: 0 0 0 8px rgba(211, 47, 47, 0); }
  100% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0); }
}
</style>
