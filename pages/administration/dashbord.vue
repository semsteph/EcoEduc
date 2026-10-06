<template>
  <v-app class="no-scroll-x admin-space">
    <v-navigation-drawer
      v-model="drawer"
      :permanent="mdAndUp"
      app
      fixed
      color="primary"
      dark
      elevation="0"
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
          @click="ouvrirSection(item.chemin)"
          :class="{ 'active-item': section === item.chemin }"
        >
          <template #prepend>
            <v-icon :icon="item.icon" color="white"></v-icon>
          </template>
          <v-list-item-title class="white--text">{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>

      <template #append>
        <div class="pa-3">
          <v-btn block color="rgba(255,255,255,0.1)" depressed @click="showLogoutDialog">
            <v-icon left color="red lighten-1">mdi-logout</v-icon>
            Déconnexion
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar app fixed color="white" elevation="0" height="52" class="admin-bar">
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
          :model-value="permissionCount > 0 && section !== '/messages'"
          color="deep-orange"
          overlap
        >
          <v-icon color="primary">mdi-email</v-icon>
        </v-badge>
      </v-btn>

      <v-btn icon @click="showNotifications">
        <v-badge
          :content="notificationCount"
          :model-value="notificationCount > 0 && section !== '/notifications'"
          color="deep-orange accent-3"
          overlap
        >
          <v-icon color="primary">mdi-bell</v-icon>
        </v-badge>
      </v-btn>

      <v-btn
        icon
        @click="showNoteRequests"
        :class="{ 'note-alert-shake': noteRequestCount > 0 && section !== '/demandes-notes' }"
      >
        <v-badge
          :content="noteRequestCount"
          :model-value="noteRequestCount > 0 && section !== '/demandes-notes'"
          color="red-darken-2"
          overlap
          class="note-alert-badge"
        >
          <v-icon :color="noteRequestCount > 0 && section !== '/demandes-notes' ? 'red-darken-2' : 'primary'">
            mdi-shield-alert-outline
          </v-icon>
        </v-badge>
      </v-btn>

      <v-btn icon @click="showLogoutDialog">
        <v-icon color="red darken-1">mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main class="main-scroll-area bg-grey-lighten-4">
      <v-container fluid class="pa-2 pa-sm-3 main-content">
        <!-- Écran courant : une route enfant de /administration/dashbord
             (pages/administration/dashbord/...), créée une fois l'établissement
             et l'année scolaire connus. -->
        <!-- Fil d'Ariane et flèche de retour, en haut et en bas de chaque écran -->
        <PageNav :crumbs="crumbs" position="top" />

        <NuxtPage
          v-if="pret"
          :etablissement-id="etablissementId"
          :etablissement-nom="etablissementNom"
          :annee-scolaire-id="anneeScolaireId"
          :annee-scolaire="anneeScolaireNom"
          :permissions="filteredPermissions"
          :modules-autorises="modulesAutorises"
          @update-notification-count="fetchNotificationCount"
          @update-permission-count="fetchPermissions"
          @update-request-count="setNoteRequestCount"
          @annee-ajoutee="fetchAnneeScolaire"
          @annee-cloturee="fetchAnneeScolaire"
        />

        <PageNav :crumbs="crumbs" position="bottom" />
      </v-container>
    </v-main>

    <logout-dialog ref="logoutDialogComp" @confirm-logout="logout" />
  </v-app>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, provide } from "vue";
import { useDisplay } from "vuetify";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";

import LogoutDialog from "@/components/administration/LogoutDialog.vue";
import PageNav from "@/components/PageNav.vue";
import { providePageNav, buildCrumbs } from "@/composables/usePageNav";

const API_BASE = "";

const { mdAndUp } = useDisplay();
const drawer = ref(null);
const route = useRoute();
const router = useRouter();

// Vrai une fois l'année scolaire chargée : l'écran courant n'est créé
// qu'avec l'établissement et l'année connus (sinon, ouvert directement ou
// rechargé, il chargerait ses données avec des identifiants vides).
const pret = ref(false);
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

// Chaque entrée du menu est une route enfant : /administration/dashbord<chemin>.
const menuItems = [
  { title: "Tableau de bord", component: "Dashboard", chemin: "", icon: "mdi-view-dashboard" },
  { title: "Classes", component: "ClassManagement", chemin: "/classes", icon: "mdi-school-outline" },
  { title: "Elèves", component: "StudentManagement", chemin: "/eleves", icon: "mdi-account-group-outline" },
  { title: "Enseignants", component: "TeacherManagement", chemin: "/enseignants", icon: "mdi-teach" },
  { title: "Parents", component: "ParentManagement", chemin: "/parents", icon: "mdi-account-child-outline" },
  { title: "Paramètres", component: "Parametre", chemin: "/parametres", icon: "mdi-cog-outline" },
  { title: "Guide d'utilisation", component: "Guide", chemin: "/guide", icon: "mdi-help-circle-outline" },
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
    (item) => item.component === "Dashboard" || item.component === "Guide" || modulesAutorises.value.includes(item.component)
  );
  filtered.push({ title: "Mon profil", component: "MonProfil", chemin: "/profil", icon: "mdi-account-cog-outline" });
  return filtered;
});

// ===== NAVIGATION PAR ROUTES =====
const BASE = "/administration/dashbord";

// Section active (« /eleves », « /messages »... ou « » pour l'accueil),
// déduite de la route courante.
const section = computed(() => {
  const reste = route.path.startsWith(BASE) ? route.path.slice(BASE.length) : "";
  const premier = reste.split("/").filter(Boolean)[0];
  return premier ? `/${premier}` : "";
});

// Identifiants de connexion gardés dans l'adresse de toutes les routes enfants.
const queryConnexion = () => {
  const query = {};
  if (route.query.etablissement_id) query.etablissement_id = route.query.etablissement_id;
  if (route.query.etablissement_nom) query.etablissement_nom = route.query.etablissement_nom;
  return query;
};

// Va vers /administration/dashbord<chemin> (chemin : « /eleves/presences/12 »).
// `extra` : petits états internes à garder (ex. l'année choisie des bulletins).
const aller = (chemin = "", extra = {}) => {
  const query = { ...queryConnexion() };
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query[key] = value;
  });
  return router.push({ path: `${BASE}${chemin}`, query });
};
// Identifiant lu dans la route (« classeId », « eleveId »...) : null s'il est
// absent, -1 s'il n'est pas un nombre valide (l'écran le traite alors comme un
// élément inconnu et revient à sa liste).
const idRoute = (nom) =>
  computed(() => {
    const brut = route.params[nom];
    if (!brut) return null;
    const id = Number(brut);
    return Number.isInteger(id) && id > 0 ? id : -1;
  });
// « Retour » des écrans ouverts depuis la barre du haut (messages,
// notifications, demandes de notes) : l'écran précédent du tableau de bord
// s'il y en a un dans l'historique, sinon l'accueil.
const retourPrecedent = () => {
  const precedent = window.history.state?.back;
  if (typeof precedent === "string" && precedent.startsWith(BASE)) router.back();
  else aller();
};
provide("adminNav", { aller, idRoute, retourPrecedent });

// ===== FIL D'ARIANE =====
const pageNav = providePageNav();
const CRUMB_LABELS = {
  classes: "Classes",
  conduite: "Conduite",
  programmes: "Programmes",
  eleves: "Élèves",
  inscription: "Inscription",
  presences: "Présences",
  punitions: "Punitions",
  notes: "Notes",
  bulletins: "Bulletins",
  reinscriptions: "Réinscriptions",
  "cartes-scolaires": "Cartes scolaires",
  educmaster: "EducMaster",
  orientation: "Orientation en 2nde",
  scolarite: "Scolarité",
  enseignants: "Enseignants",
  "cahiers-de-texte": "Cahiers de texte",
  repartition: "Répartition",
  matieres: "Matières",
  "programmes-matieres": "Programmes des matières",
  parents: "Parents",
  parametres: "Paramètres",
  guide: "Guide d'utilisation",
  messages: "Messages",
  notifications: "Notifications",
  "demandes-notes": "Demandes de notes",
  profil: "Mon profil",
};
// « liste » dépend de la section : Mes classes, Nos élèves, Mes enseignants.
const LIST_LABELS = { classes: "Mes classes", eleves: "Nos élèves", enseignants: "Mes enseignants" };

// Noms des classes (le fil d'Ariane affiche « 6ème 1 », pas l'identifiant).
const classNames = ref({});
const chargerNomsClasses = async () => {
  if (!etablissementId.value) return;
  try {
    const res = await axios.get(`${API_BASE}/api/classe/${etablissementId.value}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    classNames.value = Object.fromEntries((Array.isArray(res.data) ? res.data : []).map((c) => [String(c.id), c.nom]));
  } catch (_) {
    classNames.value = {};
  }
};
watch(etablissementId, chargerNomsClasses);

const crumbs = computed(() =>
  buildCrumbs(route.path, BASE, "Tableau de bord", (segment, previous) => {
    if (segment === "liste") return LIST_LABELS[previous[0]] || "Liste";
    if (/^\d+$/.test(segment)) {
      // Premier identifiant après l'écran : une classe ; le second : un élève.
      const ids = previous.filter((p) => /^\d+$/.test(p)).length;
      return ids === 0 ? classNames.value[segment] || "Classe" : "Élève";
    }
    return CRUMB_LABELS[segment] || null;
  }, { query: queryConnexion(), labels: pageNav.labels })
);

const ouvrirSection = (chemin) => {
  aller(chemin);
  if (!mdAndUp.value) drawer.value = false;
};

// Un collaborateur (compte « administration ») ne voit que les modules que le
// fondateur lui a attribués : une adresse d'un autre module le ramène à l'accueil.
const MODULE_PAR_CHEMIN = {
  "/classes": "ClassManagement",
  "/eleves": "StudentManagement",
  "/eleves/inscription": "Inscription",
  "/eleves/liste": "MesEleves",
  "/eleves/presences": "PresenceManagement",
  "/eleves/punitions": "PunishmentManagement",
  "/eleves/notes": "NoteConsultation",
  "/eleves/bulletins": "BulletinManagement",
  "/eleves/reinscriptions": "Reinscription",
  "/eleves/cartes-scolaires": "CarteScolaire",
  "/eleves/scolarite": "ScolariteManager",
  "/eleves/educmaster": "NoteConsultation",
  "/eleves/orientation": "Reinscription",
  "/enseignants": "TeacherManagement",
  "/enseignants/cahiers-de-texte": "CahierDeTexte",
  "/enseignants/liste": "MesEnseignants",
  "/enseignants/repartition": "EnseignantParclasse",
  "/enseignants/matieres": "subjectsManager",
  "/enseignants/programmes-matieres": "ProgrammesMatieres",
  "/parents": "ParentManagement",
  "/parametres": "Parametre",
};

const routeAutorisee = () => {
  if (userType.value !== "administration" || !Array.isArray(modulesAutorises.value)) return true;
  const segments = route.path.slice(BASE.length).split("/").filter(Boolean);
  const modules = [1, 2]
    .map((n) => MODULE_PAR_CHEMIN[`/${segments.slice(0, n).join("/")}`])
    .filter(Boolean);
  return modules.every((key) => modulesAutorises.value.includes(key));
};

watch(
  () => route.path,
  () => {
    if (pret.value && !routeAutorisee()) router.replace({ path: BASE, query: queryConnexion() });
  }
);

const showMessages = () => ouvrirSection("/messages");
const showNotifications = () => ouvrirSection("/notifications");
const showNoteRequests = () => ouvrirSection("/demandes-notes");
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
  // Adresse ouverte sans les paramètres de connexion : on les relit dans la
  // session (posés par la page de connexion).
  etablissementId.value = parseInt(route.query.etablissement_id || localStorage.getItem("etablissement_id"), 10);
  etablissementNom.value = route.query.etablissement_nom || localStorage.getItem("etablissement_nom") || "";

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
  if (!routeAutorisee()) router.replace({ path: BASE, query: queryConnexion() });
  pret.value = true;

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

/* Fixation pour s'assurer que Header et Sidebar ne bougent pas */
header.v-app-bar.v-app-bar--fixed,
nav.v-navigation-drawer--fixed {
  z-index: 1000 !important;
}

/* Alerte "demande de modification de note" : doit être impossible à manquer */
.admin-bar {
  border-bottom: 1px solid rgba(15, 23, 42, 0.1) !important;
}

.admin-bar :deep(.v-toolbar-title) {
  font-size: 17px;
}

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

<style>
/* =====================================================================
   Espace administration — interface fine.
   Règles non « scoped » mais limitées à .admin-space (racine de ce
   gabarit) : titres des écrans plafonnés (20 px ordinateur, 18 px
   téléphone), quel que soit le composant enfant qui les dessine.
   ===================================================================== */
.admin-space .main-content :is(.text-h1, .text-h2, .text-h3, .text-h4, .text-h5, .text-h6) {
  font-size: 20px !important;
  line-height: 1.3 !important;
  letter-spacing: 0 !important;
}

@media (max-width: 600px) {
  .admin-space .main-content :is(.text-h1, .text-h2, .text-h3, .text-h4, .text-h5, .text-h6) {
    font-size: 18px !important;
  }
}
</style>
