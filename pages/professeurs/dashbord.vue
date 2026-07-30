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
      elevation="12"
    >
      <!-- Drawer header -->
      <div class="drawer-header">
        <div class="drawer-user">
          <v-avatar size="44" class="drawer-avatar">
            <v-icon size="26">mdi-account</v-icon>
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
        <div class="drawer-section-title">
          <v-icon size="18" class="mr-2">mdi-book-open-page-variant</v-icon>
          Matières
        </div>

        <v-list-item
          v-for="subject in uniqueSubjects"
          :key="subject.matiere_id"
          class="drawer-item"
          :active="selectedSubjectId === subject.matiere_id"
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

        <!-- Notifications -->
        <v-row v-if="showNotificationsComponent" class="mb-4">
          <v-col cols="12">
            <div class="section-card">
              <div class="section-title">
                <v-icon class="mr-2" color="primary">mdi-bell</v-icon>
                Notifications
              </div>

              <NotificationComponent
                :notifications="notifications"
                :enseignant-id="enseignantId"
                :annee-scolaire="anneeScolaire"
                :annee-scolaire-id="anneeScolaireId"
                :etablissement-id="etablissementId"
              />
            </div>
          </v-col>
        </v-row>

        <!-- Classes -->
        <v-row class="mb-4">
          <v-col cols="12">
            <div class="section-card">
              <div class="section-title">
                <v-icon class="mr-2" color="primary">mdi-google-classroom</v-icon>
                Classes
              </div>

              <ClassManager
                v-if="selectedSubjectId"
                :subject-id="selectedSubjectId"
                :etablissement-id="etablissementId"
                :classes="classes"
                :annee-scolaire="anneeScolaire"
                :annee-scolaire-id="anneeScolaireId"
                :selected-class-id="selectedClassId"
                @class-selected="showClassDetails"
              />

              <v-alert v-else type="info" variant="tonal" class="mt-3">
                Sélectionnez une matière dans le menu pour afficher les classes.
              </v-alert>
            </div>
          </v-col>
        </v-row>

        <!-- Détails Classe -->
        <v-row>
          <v-col cols="12">
            <div v-if="selectedClassId" class="section-card">
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
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import axios from "axios";
import { useRouter } from "nuxt/app";
import { useDisplay } from "vuetify";

import ToolbarComponents from "@/components/professeurs/ToolbarComponents.vue";
import ClassManager from "@/components/professeurs/ClassManager.vue";
import NotificationComponent from "@/components/professeurs/NotificationComponent.vue";

// Responsive
const drawer = ref(false);
const { smAndDown } = useDisplay();
const drawerWidth = computed(() => (smAndDown.value ? 260 : 320));

// State
const selectedSubjectId = ref(null);
const selectedClassId = ref(null);
const selectedClassName = ref("");

const subjects = ref([]); // [{matiere_id, matiere, classe_id, classe}, ...]
const classes = ref([]);  // classes filtrées pour une matière

const etablissementId = ref(null);
const nomEtablissement = ref("");

const enseignantNom = ref("");
const enseignantPrenom = ref("");
const enseignantId = ref(null);

const logoutDialog = ref(false);

const anneeScolaire = ref("");
const anneeScolaireId = ref(null);

const showNotificationsComponent = ref(false);
const notifications = ref([]);

const router = useRouter();

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
const unreadCount = computed(() =>
  notifications.value.filter(
    (n) => n?.isRead === 0 || n?.isRead === false || n?.isRead === null || n?.isRead === undefined
  ).length
);

// Sync + fetch notifications
const syncAndFetchNotifications = async () => {
  try {
    await axios.post(
      `${API_BASE}/api/notificationprof/sync/${etablissementId.value}/${anneeScolaireId.value}/${enseignantId.value}`,
      {},
      { headers: authHeaders() }
    );

    const { data } = await axios.get(
      `${API_BASE}/api/notificationprof/${etablissementId.value}/${anneeScolaireId.value}/${enseignantId.value}`,
      { headers: authHeaders() }
    );

    notifications.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("❌ Erreur synchro/récup notifications :", error);
  }
};

const selectSubject = (matiereId) => {
  selectedSubjectId.value = matiereId;
  selectedClassId.value = null;
  selectedClassName.value = "";

  // ✅ classes filtrées depuis la liste complète subjects
  classes.value = subjects.value.filter((s) => s.matiere_id === matiereId);

  // UX: fermer le drawer sur mobile après sélection
  if (smAndDown.value) drawer.value = false;
};

const showClassDetails = (classeId) => {
  // ✅ l’API renvoie classe_id et classe
  const selected = classes.value.find((cl) => cl.classe_id === classeId);
  selectedClassId.value = classeId;
  selectedClassName.value = selected ? selected.classe : "";
};

// Show notifications + mark read
const showNotifications = async () => {
  showNotificationsComponent.value = !showNotificationsComponent.value;

  if (showNotificationsComponent.value && notifications.value.length > 0) {
    try {
      await axios.put(
        `${API_BASE}/api/notificationprof/mark-read/${etablissementId.value}/${anneeScolaireId.value}/${enseignantId.value}`,
        {},
        { headers: authHeaders() }
      );
      notifications.value = notifications.value.map((n) => ({ ...n, isRead: 1 }));
    } catch (error) {
      console.error("❌ Erreur marquage comme lues :", error);
    }
  }
};

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
  if (!token) return;

  try {
    const decodedToken = JSON.parse(atob(token.split(".")[1]));
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

    // Optionnel : sélectionner automatiquement la 1ère matière
    if (uniqueSubjects.value.length) {
      selectSubject(uniqueSubjects.value[0].matiere_id);
    }

    if (anneeScolaireId.value) {
      await syncAndFetchNotifications();
      // Rafraîchit les notifications périodiquement : sans ça, un enseignant qui
      // reste sur le dashboard ne voit jamais une nouvelle permission autorisée
      // sans recharger toute la page.
      notificationsPollId = setInterval(syncAndFetchNotifications, 60000);
    }
  } catch (error) {
    console.error("Erreur récupération données enseignant :", error);
  }
});

onUnmounted(() => {
  if (notificationsPollId) clearInterval(notificationsPollId);
});
</script>

<style scoped>
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
  padding: 16px 14px 10px;
}

.drawer-user {
  display: flex;
  align-items: center;
  gap: 12px;
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
  margin-top: 12px;
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
  border-radius: 12px;
  margin: 4px 6px;
}

.drawer-item-title {
  font-weight: 800;
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
  padding-top: 18px;
  padding-bottom: 28px;
  max-width: 1400px;
}

/* Sections */
.section-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(25, 118, 210, 0.12);
  box-shadow: 0 18px 60px rgba(11, 46, 74, 0.10);
  border-radius: 18px;
  padding: 14px;
}

.section-title {
  display: flex;
  align-items: center;
  font-weight: 950;
  color: var(--blue-dark);
  margin-bottom: 10px;
  font-size: 1.02rem;
}

/* Dialog */
.dialog-card {
  border-radius: 16px !important;
}

/* Mobile tweaks */
@media (max-width: 600px) {
  .content-wrap {
    padding-left: 10px;
    padding-right: 10px;
  }
  .section-card {
    border-radius: 16px;
    padding: 12px;
  }
}
</style>
