<template>
  <v-container class="children-page">
    <!-- ✅ Header -->
    <div class="page-header">
      <div class="page-title">
        <v-icon size="22" color="primary" class="mr-2">mdi-account-child</v-icon>
        Mes enfants
      </div>
      <div class="page-subtitle">
        Cliquez sur un élève pour afficher ses informations (notes, présence, conduite, etc.).
      </div>
    </div>

    <!-- ✅ LOADING -->
    <v-card v-if="loading" class="state-card" elevation="10">
      <v-card-text class="state-center">
        <v-progress-circular indeterminate size="34" />
        <div class="state-text">Chargement des élèves…</div>
      </v-card-text>
    </v-card>

    <!-- ✅ ERROR UI -->
    <v-card v-else-if="errorMessage" class="state-card error-card" elevation="10">
      <v-card-text>
        <v-alert type="error" variant="tonal" border="start" class="mb-3">
          <div class="alert-title">
            <v-icon class="mr-2" color="error">mdi-alert-circle-outline</v-icon>
            Une erreur est survenue
          </div>
          <div class="alert-msg">{{ errorMessage }}</div>
        </v-alert>

        <div class="actions">
          <v-btn color="primary" class="pill" @click="fetchChildren" :loading="loading">
            <v-icon start>mdi-refresh</v-icon>
            Réessayer
          </v-btn>

          <v-btn variant="tonal" color="black" class="pill" @click="goLogin('manual_button')">
            <v-icon start>mdi-login</v-icon>
            Connexion
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- ✅ CONTENT -->
    <template v-else>
      <!-- DETAILS -->
      <template v-if="selectedChild && currentView === 'details'">
        <InfoDetails
          :child="selectedChild"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="resetView"
          @navigate="navigateTo"
        />
      </template>

      <!-- NOTES -->
      <template v-else-if="currentView === 'notes'">
        <Notes
          :child="selectedChild"
          :childId="selectedChild.id"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="goToDetails"
        />
      </template>

      <!-- PRESENCE -->
      <template v-else-if="currentView === 'presence'">
        <Presence
          :child="selectedChild"
          :childId="selectedChild.id"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="goToDetails"
        />
      </template>

      <!-- CONDUITE -->
      <template v-else-if="currentView === 'conduite'">
        <Conduite
          :child="selectedChild"
          :childId="selectedChild.id"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="goToDetails"
        />
      </template>

      <!-- SCOLARITE -->
      <template v-else-if="currentView === 'scolarite'">
        <Scolarite
          :child="selectedChild"
          :childId="selectedChild.id"
          :classId="selectedChild.class"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="goToDetails"
        />
      </template>

      <!-- PROGRAMME -->
      <template v-else-if="currentView === 'programme'">
        <Programme
          :child="selectedChild"
          :childId="selectedChild.id"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="goToDetails"
        />
      </template>

      <!-- BULLETIN -->
      <template v-else-if="currentView === 'bulletin'">
        <Bulletin
          :child="selectedChild"
          :childId="selectedChild.id"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="goToDetails"
        />
      </template>

      <!-- PERMISSION -->
      <template v-else-if="currentView === 'permission'">
        <DemandeDePermission
          :child="selectedChild"
          :childId="selectedChild.id"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="goToDetails"
        />
      </template>

      <!-- ASSISTANCES -->
      <template v-else-if="currentView === 'assistances'">
        <Assistances
          :child="selectedChild"
          :childId="selectedChild.id"
          :etablissementId="etablissementId"
          :childName="selectedChild.prenom + ' ' + selectedChild.nom"
          :childClass="selectedChild.class"
          :anneeScolaireId="anneeScolaireId"
          @back="goToDetails"
        />
      </template>

      <!-- ACTIVITE -->
      <template v-else-if="currentView === 'activite'">
        <Activite
          :child="selectedChild"
          :childId="selectedChild.id"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="goToDetails"
        />
      </template>

      <!-- ✅ DEFAULT LIST -->
      <template v-else>
        <v-card class="list-shell" elevation="12">
          <div class="list-accent" aria-hidden="true"></div>

          <v-card-text class="list-content">
            <div class="list-top">
              <div class="list-title">
                <v-icon color="primary" size="20" class="mr-2">mdi-account-multiple-outline</v-icon>
                Liste des élèves
              </div>

              <v-chip
                v-if="children.length > 0"
                size="small"
                label
                variant="tonal"
                class="count-chip"
              >
                <v-icon start size="16">mdi-format-list-bulleted</v-icon>
                {{ children.length }} élève{{ children.length > 1 ? "s" : "" }}
              </v-chip>
            </div>

            <v-divider class="my-4" />

            <!-- ✅ Wrapper qui centre le grid -->
            <div class="grid-center">
              <v-row class="cards-row" dense justify="center" align="stretch">
                <v-col
                  v-for="child in children"
                  :key="child.id"
                  cols="12"
                  sm="6"
                  md="4"
                  lg="3"
                  class="card-col"
                >
                  <v-card
                    class="child-card"
                    elevation="10"
                    @click="selectChild(child)"
                  >
                    <div class="media">
                      <v-img
                        :src="child.photo || defaultPhoto"
                        height="190"
                        cover
                        class="media-img"
                      >
                        <div class="media-overlay"></div>

                        <div class="media-badge">
                          <v-icon size="16">mdi-school</v-icon>
                          <span class="ml-1">{{ child.class || "Classe" }}</span>
                        </div>
                      </v-img>
                    </div>

                    <v-card-text class="child-body">
                      <div class="child-name">
                        {{ child.prenom }} {{ child.nom }}
                      </div>
                      <div class="child-sub">
                        <v-icon size="16" class="mr-1">mdi-identifier</v-icon>
                        ID : {{ child.id }}
                      </div>
                    </v-card-text>

                    <v-card-actions class="child-actions">
                      <v-btn variant="text" color="primary" class="pill-btn">
                        Ouvrir
                        <v-icon end>mdi-arrow-right</v-icon>
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-col>
              </v-row>
            </div>

            <v-alert
              v-if="children.length === 0"
              type="info"
              variant="tonal"
              border="start"
              class="mt-4"
            >
              Aucun enfant trouvé pour ce compte.
            </v-alert>
          </v-card-text>
        </v-card>
      </template>
    </template>
  </v-container>
</template>

<script>
import InfoDetails from "./InfoDetails.vue";
import Notes from "./Notes.vue";
import Presence from "./Presence.vue";
import Conduite from "./Conduite.vue";
import Scolarite from "./Scolarite.vue";
import Programme from "./Programme.vue";
import DemandeDePermission from "./DemandeDePermission.vue";
import Activite from "./Activite.vue";
import Bulletin from "./Bulletin.vue";
import Assistances from "./Assistances.vue";
import axios from "axios";

const API_URL = "http://localhost:8080/api/parent/children";

export default {
  components: {
    InfoDetails,
    Notes,
    Presence,
    Conduite,
    Scolarite,
    Programme,
    DemandeDePermission,
    Activite,
    Bulletin,
    Assistances,
  },

  props: {
    etablissementId: { type: Number, required: true },
    anneeScolaireId: { type: Number, required: true },
    anneeScolaire: { type: String, required: false, default: "" },
    parentId: { type: [Number, String], required: false, default: null },
  },

  data() {
    return {
      children: [],
      selectedChild: null,
      currentView: "default",
      defaultPhoto: "/_nuxt/assets/parents/istockphoto-1495088043-612x612.jpg",

      loading: false,
      errorMessage: "",
    };
  },

  created() {
    this.fetchChildren();
  },

  methods: {
    goLogin(reason = "unknown") {
      console.groupCollapsed("🚨 [ChildrenList] redirect -> /parents/connexion");
      console.warn("reason =", reason);
      console.warn("route =", this.$route?.fullPath);
      console.warn("token =", localStorage.getItem("token"));
      console.trace("STACK TRACE redirect");
      console.groupEnd();

      this.$router.push("/parents/connexion");
    },

    async fetchChildren() {
      const requestId = `REQ_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      this.loading = true;
      this.errorMessage = "";

      console.groupCollapsed(`📡 [ChildrenList] fetchChildren() | ${requestId}`);
      console.log("➡ URL =", API_URL);
      console.log("➡ props =", {
        etablissementId: this.etablissementId,
        anneeScolaireId: this.anneeScolaireId,
      });
      console.log("➡ token before =", localStorage.getItem("token"));
      console.groupEnd();

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          this.errorMessage = "Session expirée : token introuvable.";
          this.goLogin("token_missing");
          return;
        }

        const response = await axios.get(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            etablissementId: this.etablissementId,
            anneeScolaireId: this.anneeScolaireId,
          },
        });

        const rawChildren = Array.isArray(response.data?.children)
          ? response.data.children
          : Array.isArray(response.data)
            ? response.data
            : null;

        if (!rawChildren) {
          this.children = [];
          this.errorMessage =
            "Format réponse inattendu (attendu {children: []}). Vérifie la réponse backend.";
          return;
        }

        this.children = rawChildren;
      } catch (error) {
        const status = error.response?.status;
        const backendMessage = error.response?.data?.message;

        if (status === 401 || status === 403) {
          this.errorMessage =
            backendMessage ||
            `Accès refusé (${status}). Token invalide/expiré ou problème côté authenticateJWT.`;
          this.goLogin(`auth_${status}`);
          return;
        }

        this.errorMessage =
          backendMessage ||
          "Impossible de charger les enfants (problème réseau/serveur).";
      } finally {
        this.loading = false;
      }
    },

    selectChild(child) {
      this.selectedChild = child;
      this.currentView = "details";
    },
    resetView() {
      this.selectedChild = null;
      this.currentView = "default";
    },
    goToDetails() {
      this.currentView = "details";
    },
    navigateTo(view) {
      this.currentView = view;
    },
  },
};
</script>

<style scoped>
/* ✅ Charte app: bleu/blanc + touche noir (pro) */
.children-page {
  padding-top: 18px;
  padding-bottom: 22px;
}

/* Header */
.page-header {
  margin-bottom: 14px;
  padding: 14px 14px 0;
}
.page-title {
  display: flex;
  align-items: center;
  font-weight: 900;
  color: #0b2e4a;
  letter-spacing: 0.2px;
  font-size: clamp(1.1rem, 2vw, 1.35rem);
}
.page-subtitle {
  margin-top: 6px;
  color: #455a64;
  line-height: 1.35rem;
  font-size: 0.95rem;
}

/* States */
.state-card {
  border-radius: 20px !important;
  border: 1px solid rgba(25, 118, 210, 0.12);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 60px rgba(11, 46, 74, 0.12);
}
.state-center {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 22px 16px;
}
.state-text {
  font-weight: 800;
  color: #0b2e4a;
  opacity: 0.9;
}

/* Error card */
.error-card .alert-title {
  display: flex;
  align-items: center;
  font-weight: 900;
  margin-bottom: 4px;
}
.alert-msg {
  color: #455a64;
}

/* Actions */
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.pill {
  border-radius: 999px !important;
  font-weight: 900;
}

/* List shell */
.list-shell {
  border-radius: 22px !important;
  overflow: hidden;
  border: 1px solid rgba(25, 118, 210, 0.12);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 70px rgba(11, 46, 74, 0.12);
}
.list-accent {
  height: 6px;
  width: 100%;
  background: linear-gradient(90deg, #1976d2, rgba(25, 118, 210, 0.22), #1976d2);
  opacity: 0.95;
}
.list-content {
  padding: 18px !important;
}

.list-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.list-title {
  display: flex;
  align-items: center;
  font-weight: 900;
  color: #0b2e4a;
}
.count-chip {
  border-radius: 999px !important;
  font-weight: 900;
}

/* ✅ CENTRAGE GLOBAL DU GRID */
.grid-center {
  display: flex;
  justify-content: center;
}
.cards-row {
  width: 100%;
  max-width: 1120px; /* ✅ centre le bloc de cartes, même si peu d'enfants */
  margin: 0 auto;
}

/* Cards */
.card-col {
  display: flex;          /* ✅ permet d'égaliser la hauteur */
}
.child-card {
  width: 100%;
  border-radius: 18px !important;
  overflow: hidden;
  border: 1px solid rgba(25, 118, 210, 0.12);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.child-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 55px rgba(11, 46, 74, 0.18) !important;
}

/* Media */
.media { position: relative; }
.media-img {
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
}
.media-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.26) 100%);
}
.media-badge {
  position: absolute;
  left: 10px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(25, 118, 210, 0.16);
  color: #0b2e4a;
  font-weight: 900;
  font-size: 0.85rem;
}

/* Body */
.child-body { padding: 14px 14px 6px !important; }
.child-name {
  font-weight: 900;
  color: #0b2e4a;
  font-size: 1.02rem;
  line-height: 1.25rem;
}
.child-sub {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  color: #607d8b;
  font-weight: 700;
  font-size: 0.88rem;
}

/* Actions */
.child-actions {
  padding: 2px 10px 12px !important;
}
.pill-btn {
  border-radius: 999px !important;
  font-weight: 900;
  text-transform: none;
}

/* ✅ Mobile */
@media (max-width: 600px) {
  .children-page { padding-top: 10px; }
  .page-header { padding: 12px 10px 0; }
  .list-content { padding: 14px !important; }
  .cards-row { max-width: 520px; } /* ✅ centre joliment sur mobile */
  .media-badge {
    left: 8px;
    bottom: 8px;
    padding: 6px 9px;
    font-size: 0.82rem;
  }
}

/* ✅ Très petit écran */
@media (max-width: 360px) {
  .page-subtitle { font-size: 0.9rem; }
  .child-name { font-size: 0.98rem; }
}
</style>
