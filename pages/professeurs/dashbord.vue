<template>
  <v-app class="app-shell">
    <!-- Background -->
    <div class="app-bg"></div>
    <div class="app-overlay"></div>

    <!-- Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      :temporary="smAndDown"
      :permanent="!smAndDown"
      :width="drawerWidth"
      class="app-drawer"
      color="primary"
      dark
      app
      elevation="0"
    >
      <!-- Drawer header -->
      <div class="drawer-header">
        <div class="drawer-user">
          <v-avatar size="32" class="drawer-avatar">
            <v-icon size="20">mdi-account</v-icon>
          </v-avatar>

          <div class="drawer-user-info">
            <div class="drawer-etab">
              {{ nomEtablissement || "Établissement" }}
            </div>
            <div class="drawer-name">
              {{ enseignantPrenom }} {{ enseignantNom }}
            </div>
          </div>
        </div>

        <div class="drawer-badges">
          <v-chip size="small" variant="tonal" class="mr-2" color="white">
            <v-icon start size="16">mdi-calendar</v-icon>
            {{ anneeScolaire || "Année non définie" }}
          </v-chip>

          <v-chip
            size="small"
            variant="tonal"
            color="white"
            v-if="unreadCount > 0"
          >
            <v-icon start size="16">mdi-bell</v-icon>
            {{ unreadCount }}
          </v-chip>
        </div>
      </div>

      <v-divider class="drawer-divider" />

      <!-- Drawer content -->
      <v-list density="compact" nav class="px-2">
        <!-- Enseignant de plusieurs établissements : un seul compte -->
        <v-list-item v-if="mesEcoles.length > 1" class="drawer-item" @click="choixEcole = true">
          <template #prepend>
            <v-icon>mdi-swap-horizontal</v-icon>
          </template>
          <v-list-item-title class="drawer-item-title">Changer d'établissement ({{ mesEcoles.length }})</v-list-item-title>
        </v-list-item>

        <v-list-item class="drawer-item" :active="route.path === `${DASHBOARD_PATH}/guide`" @click="goTo('/guide'); if (smAndDown) drawer = false">
          <template #prepend>
            <v-icon>mdi-help-circle-outline</v-icon>
          </template>
          <v-list-item-title class="drawer-item-title">Guide d'utilisation</v-list-item-title>
        </v-list-item>

        <v-list-item class="drawer-item" @click="ouvrirMotDePasse(false)">
          <template #prepend>
            <v-icon>mdi-lock-reset</v-icon>
          </template>
          <v-list-item-title class="drawer-item-title">Mon mot de passe</v-list-item-title>
        </v-list-item>

        <v-list-item
          class="drawer-item"
          :active="isEmploiRoute"
          @click="ouvrirEmploi"
        >
          <template #prepend>
            <v-icon>mdi-calendar-clock</v-icon>
          </template>
          <v-list-item-title class="drawer-item-title">Emploi du temps</v-list-item-title>
        </v-list-item>

        <div class="drawer-section-title">
          <v-icon size="18" class="mr-2">mdi-book-open-page-variant</v-icon>
          Matières
        </div>

        <v-list-item
          v-for="subject in uniqueSubjects"
          :key="subject.matiere_id"
          class="drawer-item"
          :active="!isNotificationsRoute && !isEmploiRoute && selectedSubjectId === subject.matiere_id"
          @click="selectSubject(subject.matiere_id)"
        >
          <template #prepend>
            <v-icon>mdi-book</v-icon>
          </template>
          <v-list-item-title class="drawer-item-title">
            {{ subject.matiere }}
          </v-list-item-title>
        </v-list-item>

        <v-divider class="my-3" />

        <v-list-item class="drawer-item logout-item" @click="showLogoutDialog">
          <template #prepend>
            <v-icon color="red">mdi-logout</v-icon>
          </template>
          <v-list-item-title class="logout-title">Déconnexion</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Top toolbar -->
    <div class="topbar">
      <div class="topbar-inner">
        <ToolbarComponents
          :notifications="notifications"
          @toggleDrawer="toggleDrawer"
          @showNotifications="showNotifications"
        />
      </div>
    </div>

    <!-- ✅ SCROLL UNIQUEMENT ICI -->
    <v-main class="main main-scroll">
      <v-container class="content-wrap">
        <v-alert
          v-if="!anneeScolaireId"
          type="warning"
          class="mb-4"
          variant="tonal"
        >
          L'année scolaire n'est pas encore définie.
        </v-alert>

        <!-- Fil d'Ariane et flèche de retour, en haut et en bas de chaque écran -->
        <PageNav :crumbs="crumbs" position="top" />

        <!-- Notifications : /professeurs/dashbord/notifications -->
        <v-row v-if="isNotificationsRoute" class="mb-2">
          <v-col cols="12">
            <div class="section-card">
              <div class="section-title">
                <v-icon class="mr-2" color="primary">mdi-bell</v-icon>
                Notifications
              </div>

              <NuxtPage v-if="ready" />
            </div>
          </v-col>
        </v-row>

        <template v-else>
          <!-- Classes : liste, fiche de la classe et outils (routes enfants) -->
          <v-row class="mb-2">
            <v-col cols="12">
              <div class="section-card">
                <div class="section-title">
                  <v-icon class="mr-2" color="primary">mdi-google-classroom</v-icon>
                  Classes
                </div>

                <NuxtPage v-if="ready" />
                <v-progress-linear v-else indeterminate color="primary" class="mt-3" />
              </div>
            </v-col>
          </v-row>

          <!-- Détails Classe -->
          <v-row>
            <v-col cols="12">
              <div v-if="selectedClassId && selectedClassName" class="section-card">
                <div class="section-title">
                  <v-icon class="mr-2" color="primary">mdi-account-group</v-icon>
                  Détails de la classe — {{ selectedClassName }}
                </div>

                <ClassDetails
                  :class-id="selectedClassId"
                  :class-name="selectedClassName"
                  :etablissement-id="etablissementId"
                  :annee-scolaire="anneeScolaire"
                  :annee-scolaire-id="anneeScolaireId"
                />
              </div>
            </v-col>
          </v-row>
        </template>

        <PageNav :crumbs="crumbs" position="bottom" />
      </v-container>
    </v-main>

    <!-- Déconnexion -->
    <v-dialog v-model="logoutDialog" max-width="420">
      <v-card class="dialog-card">
        <v-card-title class="text-h6 font-weight-bold">
          Confirmer la déconnexion
        </v-card-title>
        <v-card-text class="text-body-2">
          Êtes-vous sûr de vouloir vous déconnecter ?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="tonal" color="black" @click="logoutDialog = false">
            Annuler
          </v-btn>
          <v-btn variant="flat" color="red" @click="logout">
            Oui, se déconnecter
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Changer d'établissement -->
    <v-dialog v-model="choixEcole" max-width="440">
      <v-card>
        <v-card-title class="d-flex align-center"><v-icon class="mr-2" color="primary">mdi-swap-horizontal</v-icon>Changer d'établissement</v-card-title>
        <v-card-text>
          <v-btn
            v-for="e in mesEcoles"
            :key="e.etablissementId"
            block
            :variant="e.actuel ? 'flat' : 'outlined'"
            :color="e.actuel ? 'primary' : undefined"
            class="mb-2 ecole-btn"
            prepend-icon="mdi-school-outline"
            :loading="changementEnCours === e.etablissementId"
            :disabled="e.actuel"
            @click="changerEcole(e.etablissementId)"
          >{{ e.nom }}<span v-if="e.actuel" class="ml-2">(ouvert)</span></v-btn>
          <v-alert v-if="erreurEcole" type="error" variant="tonal" density="compact">{{ erreurEcole }}</v-alert>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="choixEcole = false">Fermer</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Mot de passe : obligatoire après un mot de passe provisoire -->
    <v-dialog v-model="mdp.ouvert" max-width="440" :persistent="mdp.obligatoire">
      <v-card>
        <v-card-title class="d-flex align-center text-wrap"><v-icon class="mr-2" color="primary">mdi-lock-reset</v-icon>{{ mdp.obligatoire ? 'Choisissez votre mot de passe' : 'Changer mon mot de passe' }}</v-card-title>
        <v-card-text>
          <p v-if="mdp.obligatoire" class="mb-3">
            Votre établissement vous a donné un mot de passe provisoire. Choisissez le vôtre : il servira pour tous les
            établissements où vous enseignez.
          </p>
          <v-text-field v-if="!mdp.obligatoire" v-model="mdp.actuel" type="password" label="Mot de passe actuel" variant="outlined" density="compact" />
          <v-text-field v-model="mdp.nouveau" type="password" label="Nouveau mot de passe" hint="6 caractères minimum" variant="outlined" density="compact" />
          <v-text-field v-model="mdp.confirmation" type="password" label="Confirmer" variant="outlined" density="compact" />
          <v-alert v-if="mdp.erreur" type="error" variant="tonal" density="compact">{{ mdp.erreur }}</v-alert>
          <v-alert v-if="mdp.ok" type="success" variant="tonal" density="compact">Mot de passe modifié.</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn v-if="!mdp.obligatoire" variant="text" @click="mdp.ouvert = false">Fermer</v-btn>
          <v-btn color="primary" variant="flat" :loading="mdp.envoi" :disabled="mdp.nouveau.length < 6 || mdp.nouveau !== mdp.confirmation" @click="enregistrerMotDePasse">Enregistrer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, computed, provide, onMounted, onUnmounted } from "vue";
import axios from "axios";
import { useRouter, useRoute } from "nuxt/app";
import { useDisplay } from "vuetify";

import ToolbarComponents from "@/components/professeurs/ToolbarComponents.vue";
import PageNav from "@/components/PageNav.vue";
import { providePageNav, buildCrumbs } from "@/composables/usePageNav";

// Responsive
const drawer = ref(false);
const { smAndDown } = useDisplay();
const drawerWidth = computed(() => (smAndDown.value ? 260 : 320));

const router = useRouter();
const route = useRoute();

// Chaque écran a sa propre adresse (routes enfants de pages/professeurs/dashbord/) :
//   /professeurs/dashbord/matieres/:matiereId                       liste des classes
//   /professeurs/dashbord/matieres/:matiereId/classes/:classeId     fiche de la classe
//   .../classes/:classeId/notes | presences | absences | conduite | cahier-de-texte | devoirs
//   /professeurs/dashbord/notifications
// La matière et la classe choisies se déduisent donc de la route.
const DASHBOARD_PATH = "/professeurs/dashbord";

const routeNumber = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const selectedSubjectId = computed(() => routeNumber(route.params.matiereId));
const selectedClassId = computed(() => routeNumber(route.params.classeId));
const isNotificationsRoute = computed(() => route.path === `${DASHBOARD_PATH}/notifications`);
const isEmploiRoute = computed(() => route.path === `${DASHBOARD_PATH}/emploi-du-temps`);

const subjects = ref([]); // [{matiere_id, matiere, classe_id, classe}, ...]
// Classes de la matière choisie
const classes = computed(() =>
  subjects.value.filter((s) => s.matiere_id === selectedSubjectId.value)
);
const selectedClassName = computed(
  () => classes.value.find((cl) => cl.classe_id === selectedClassId.value)?.classe || ""
);

// Les écrans enfants ne s'affichent qu'une fois l'année scolaire et les
// matières chargées (ils en ont besoin dès leur montage).
const ready = ref(false);

const etablissementId = ref(null);
const nomEtablissement = ref("");

const enseignantNom = ref("");
const enseignantPrenom = ref("");
const enseignantId = ref(null);

const logoutDialog = ref(false);

// Un seul compte pour tous ses établissements.
const mesEcoles = ref([]);
const choixEcole = ref(false);
const changementEnCours = ref(null);
const erreurEcole = ref("");
const chargerMesEcoles = async () => {
  try {
    const { data } = await axios.get("/api/enseignant/etablissements", { headers: authHeaders() });
    mesEcoles.value = Array.isArray(data) ? data : [];
  } catch (e) { mesEcoles.value = []; }
};
const changerEcole = async (etablissementId) => {
  erreurEcole.value = "";
  changementEnCours.value = etablissementId;
  try {
    const { data } = await axios.post("/api/enseignant/changer-etablissement", { vers: etablissementId }, { headers: authHeaders() });
    localStorage.setItem("token", data.token);
    const p = decodeJwtPayload(data.token);
    // Rechargement complet : chaque écran repart avec la nouvelle école.
    window.location.href = `/professeurs/dashbord?id=${p.id}&etablissement=${p.etablissement}`;
  } catch (e) {
    erreurEcole.value = e?.response?.data?.message || "Changement impossible.";
    changementEnCours.value = null;
  }
};

const mdp = ref({ ouvert: false, obligatoire: false, actuel: "", nouveau: "", confirmation: "", erreur: "", ok: false, envoi: false });
const ouvrirMotDePasse = (obligatoire) => {
  mdp.value = { ouvert: true, obligatoire, actuel: "", nouveau: "", confirmation: "", erreur: "", ok: false, envoi: false };
};
const enregistrerMotDePasse = async () => {
  mdp.value.erreur = "";
  mdp.value.envoi = true;
  try {
    await axios.post("/api/enseignant/mot-de-passe", { actuel: mdp.value.actuel, nouveau: mdp.value.nouveau }, { headers: authHeaders() });
    try { sessionStorage.removeItem("ens-mdp-provisoire"); } catch (e) { /* stockage indisponible */ }
    mdp.value.ok = true;
    mdp.value.obligatoire = false;
    setTimeout(() => { mdp.value.ouvert = false; }, 1200);
  } catch (e) {
    mdp.value.erreur = e?.response?.data?.message || "Le mot de passe n'a pas pu être modifié.";
  } finally {
    mdp.value.envoi = false;
  }
};

const anneeScolaire = ref("");
const anneeScolaireId = ref(null);

const notifications = ref([]);

// Matières uniques
const uniqueSubjects = computed(() => {
  const map = new Map();
  return subjects.value.filter((subject) => {
    if (!map.has(subject.matiere_id)) {
      map.set(subject.matiere_id, true);
      return true;
    }
    return false;
  });
});

// API
const API_BASE = "";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchAnneeScolaire = async () => {
  try {
    const response = await axios.get(
      `${API_BASE}/api/annees-scolaires/${etablissementId.value}`
    );

    if (response.data?.id) {
      anneeScolaire.value = response.data.nom_annee ?? response.data.nom ?? "";
      anneeScolaireId.value = response.data.id;
    } else {
      anneeScolaire.value = "";
      anneeScolaireId.value = null;
      console.warn("Aucune année scolaire active.");
    }
  } catch (error) {
    console.error("Erreur année scolaire :", error);
    anneeScolaire.value = "";
    anneeScolaireId.value = null;
  }
};

// Nombre de notifications non lues — la seule source de vérité pour tous les badges
// (drawer + cloche), pour éviter d'afficher deux chiffres différents pour la même notion.
const unreadCount = computed(() => notifications.value.filter((n) => !n?.lu).length);
const notificationsChargement = ref(false);

// Sync + fetch notifications
// Permissions d'absence de ses élèves + réponses à ses demandes de
// modification de notes (identité lue dans le jeton).
const syncAndFetchNotifications = async () => {
  notificationsChargement.value = true;
  try {
    const { data } = await axios.get(`${API_BASE}/api/enseignant/notifications`, { headers: authHeaders() });
    notifications.value = Array.isArray(data?.items) ? data.items : [];
  } catch (error) {
    console.error("❌ Erreur récupération notifications :", error);
  } finally {
    notificationsChargement.value = false;
  }
};

// Navigation entre écrans du tableau de bord. Les paramètres du login (id,
// etablissement, enseignantNom...) restent dans la query : CahierDeTexteManager
// et DevoirsManager lisent l'id de l'enseignant dans $route.query.id.
// La période choisie dans un écran (?periode=) ne suit pas vers l'écran suivant.
// Fil d'Ariane : Mathematique › 6ème 1 › Notes. L'accueil du tableau de bord
// ouvre la première matière : la matière est donc le premier niveau.
const pageNav = providePageNav();
const TOOL_LABELS = {
  notes: "Notes",
  presences: "Présences",
  absences: "Derniers absents",
  conduite: "Conduite",
  "cahier-de-texte": "Cahier de texte",
  devoirs: "Devoirs",
};
const crumbs = computed(() => {
  const { periode, ...query } = route.query;
  const all = buildCrumbs(route.path, DASHBOARD_PATH, "Tableau de bord", (segment, previous) => {
    const parent = previous[previous.length - 1];
    if (segment === "matieres" || segment === "classes") return null;
    if (parent === "matieres") {
      return subjects.value.find((s) => String(s.matiere_id) === segment)?.matiere || "Matière";
    }
    if (parent === "classes") {
      return subjects.value.find((s) => String(s.classe_id) === segment)?.classe || "Classe";
    }
    if (segment === "notifications") return "Notifications";
    if (segment === "emploi-du-temps") return "Emploi du temps";
    if (segment === "guide") return "Guide d'utilisation";
    return TOOL_LABELS[segment] || null;
  }, { query, labels: pageNav.labels });
  return route.path.startsWith(`${DASHBOARD_PATH}/matieres`) ? all.slice(1) : all;
});

const goTo = (path, { replace = false } = {}) => {
  const { periode, ...query } = route.query;
  return router[replace ? "replace" : "push"]({ path: `${DASHBOARD_PATH}${path}`, query });
};

const ouvrirEmploi = () => {
  goTo('/emploi-du-temps');
  if (smAndDown.value) drawer.value = false;
};

const selectSubject = (matiereId) => {
  goTo(`/matieres/${matiereId}`);

  // UX: fermer le drawer sur mobile après sélection
  if (smAndDown.value) drawer.value = false;
};

// Marque tout comme vu (le badge s'efface) ; l'écran des notifications garde
// lui-même la trace de ce qui était nouveau à l'ouverture.
const markNotificationsRead = async () => {
  try {
    await axios.put(`${API_BASE}/api/enseignant/notifications/lues`, {}, { headers: authHeaders() });
    notifications.value = notifications.value.map((n) => ({ ...n, lu: true }));
  } catch (error) {
    console.error("❌ Erreur marquage comme lues :", error);
  }
};

// La cloche ouvre /notifications ; un second clic ramène à l'écran précédent.
let lastScreenPath = "";
const showNotifications = () => {
  if (isNotificationsRoute.value) {
    goTo(lastScreenPath);
  } else {
    lastScreenPath = route.path.slice(DASHBOARD_PATH.length);
    goTo("/notifications");
  }
};

// Contexte partagé avec les écrans enfants (pages/professeurs/dashbord/...).
provide("profDashboard", {
  goTo,
  subjects,
  classes,
  etablissementId,
  enseignantId,
  anneeScolaire,
  anneeScolaireId,
  notifications,
  notificationsChargement,
  markNotificationsRead,
  syncAndFetchNotifications,
});

const showLogoutDialog = () => {
  logoutDialog.value = true;
};

const toggleDrawer = () => {
  drawer.value = !drawer.value;
};

const logout = () => {
  localStorage.removeItem("token");
  router.push("/professeurs/connexion");
};

// Init
let notificationsPollId = null;
onMounted(async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    ready.value = true;
    return;
  }

  try {
    const decodedToken = decodeJwtPayload(token);
    enseignantId.value = decodedToken.id;
    etablissementId.value = decodedToken.etablissement;
    nomEtablissement.value = decodedToken.etablissement_nom;
    enseignantNom.value = decodedToken.enseignant_nom;
    enseignantPrenom.value = decodedToken.enseignant_prenom;

    await fetchAnneeScolaire();

    // ✅ FIX 403 : on n’envoie PLUS l’id dans l’URL
    const response = await axios.get(
      `${API_BASE}/api/enseignant/matieres-classes`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    subjects.value = Array.isArray(response.data) ? response.data : [];

    ready.value = true;

    chargerMesEcoles();
    try { if (sessionStorage.getItem("ens-mdp-provisoire") === "1") ouvrirMotDePasse(true); } catch (e) { /* stockage indisponible */ }

    if (anneeScolaireId.value) {
      await syncAndFetchNotifications();
      // Rafraîchit les notifications périodiquement : sans ça, un enseignant qui
      // reste sur le dashboard ne voit jamais une nouvelle permission autorisée
      // sans recharger toute la page.
      notificationsPollId = setInterval(syncAndFetchNotifications, 60000);
    }
  } catch (error) {
    console.error("Erreur récupération données enseignant :", error);
  } finally {
    ready.value = true;
  }
});

onUnmounted(() => {
  if (notificationsPollId) clearInterval(notificationsPollId);
});
</script>

<style scoped>
.ecole-btn { justify-content: flex-start; text-transform: none; }
/* ✅ IMPORTANT: bloquer le scroll global (page) */
:global(html, body, #__nuxt) {
  height: 100%;
  overflow: hidden;
}

/* Charte: bleu/blanc + petit noir */
:root {
  --blue: #1976d2;
  --blue-dark: #0b2e4a;
  --black-soft: rgba(0, 0, 0, 0.55);
}

/* Background */
.app-bg {
  position: fixed;
  inset: 0;
  background-image: url("/assets/professeurs/istockphoto-1328488607-1024x1024.jpg");
  background-size: cover;
  background-position: center;
  filter: blur(10px);
  transform: scale(1.05);
  z-index: -2;
}

.app-overlay {
  position: fixed;
  inset: 0;
  background: radial-gradient(900px 500px at 20% 10%, rgba(25, 118, 210, 0.22), transparent 55%),
    radial-gradient(800px 500px at 80% 0%, rgba(25, 118, 210, 0.16), transparent 55%),
    linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.88));
  z-index: -1;
}

/* Drawer */
.app-drawer {
  border-right: 1px solid rgba(255, 255, 255, 0.12);
}

/* ✅ Drawer fixe + pas de scroll interne */
:global(.app-drawer) {
  height: 100vh !important;
}
:global(.app-drawer .v-navigation-drawer__content) {
  height: 100%;
  overflow: hidden !important;
}

.drawer-header {
  padding: 10px 12px 8px;
}

.drawer-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drawer-avatar {
  background: rgba(255, 255, 255, 0.16);
}

.drawer-user-info {
  min-width: 0;
}

.drawer-etab {
  font-weight: 900;
  font-size: 0.95rem;
  line-height: 1.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-name {
  margin-top: 2px;
  font-weight: 700;
  opacity: 0.95;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-badges {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.drawer-divider {
  opacity: 0.25;
}

.drawer-section-title {
  margin: 10px 10px 6px;
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  opacity: 0.95;
  display: flex;
  align-items: center;
}

.drawer-item {
  border-radius: 8px;
  margin: 2px 4px;
  min-height: 36px !important;
}

.drawer-item-title {
  font-weight: 700;
  font-size: 14px;
}

.logout-item {
  background: rgba(0, 0, 0, 0.08);
}

.logout-title {
  font-weight: 900;
  color: #ffd6d6;
}

/* Topbar */
.topbar {
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 30;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.88);
  border-bottom: 1px solid rgba(25, 118, 210, 0.12);
}

.topbar-inner {
  max-width: 1400px;
  margin: 0 auto;
}

/* ✅ v-main devient la zone scrollable */
.main-scroll {
  padding-top: 64px;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Content */
.content-wrap {
  padding-top: 10px;
  padding-bottom: 20px;
  max-width: 1400px;
}

/* Sections */
/* Section « Classes » / « Notifications » : simple titre posé sur la page,
   sans cadre autour de tout l'écran (les écrans enfants ont déjà leurs
   propres cartes fines). */
.section-card {
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: 0;
  padding: 0;
}

.section-title {
  display: flex;
  align-items: center;
  font-weight: 950;
  color: var(--blue-dark);
  margin-bottom: 8px;
  font-size: 16px;
}

/* Dialog */
.dialog-card {
  border-radius: 10px!important;
}

/* Mobile tweaks */
@media (max-width: 600px) {
  .content-wrap {
    padding-left: 10px;
    padding-right: 10px;
  }
  .section-title {
    font-size: 15px;
    margin-bottom: 6px;
  }
  /* Pas de marges négatives de v-row qui dépasseraient du bord. */
  .content-wrap > .v-row {
    margin-left: 0;
    margin-right: 0;
  }
  .content-wrap > .v-row > .v-col {
    padding-left: 0;
    padding-right: 0;
  }
}
</style>
