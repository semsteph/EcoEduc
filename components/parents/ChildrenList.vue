<template>
  <v-container class="children-page">
    <!-- ✅ Header -->
    <div v-if="view === 'default'" class="page-header">
      <div class="page-title">
        <v-icon size="22" color="primary" class="mr-2">mdi-account-child</v-icon>
        Mes enfants
      </div>
      <div class="page-subtitle">
        L’essentiel de chaque enfant ; touchez un raccourci ou sa carte pour aller plus loin.
      </div>
    </div>

    <!-- ✅ LOADING -->
    <v-card v-if="loading" class="state-card" elevation="0">
      <v-card-text class="state-center">
        <v-progress-circular indeterminate size="34" />
        <div class="state-text">Chargement des élèves…</div>
      </v-card-text>
    </v-card>

    <!-- ✅ ERROR UI -->
    <v-card v-else-if="errorMessage" class="state-card error-card" elevation="0">
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
      <template v-if="view === 'details'">
        <InfoDetails
          :child="selectedChild"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="resetView"
          @navigate="navigateTo"
        />
      </template>

      <!-- NOTES -->
      <template v-else-if="view === 'notes'">
        <Notes
          :child="selectedChild"
          :childId="selectedChild.id"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="goToDetails"
        />
      </template>

      <!-- PRESENCE -->
      <template v-else-if="view === 'presence'">
        <Presence
          :child="selectedChild"
          :childId="selectedChild.id"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="goToDetails"
        />
      </template>

      <!-- CONDUITE -->
      <template v-else-if="view === 'conduite'">
        <Conduite
          :child="selectedChild"
          :childId="selectedChild.id"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="goToDetails"
        />
      </template>

      <!-- SCOLARITE -->
      <template v-else-if="view === 'scolarite'">
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
      <template v-else-if="view === 'programme'">
        <Programme
          :child="selectedChild"
          :childId="selectedChild.id"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="goToDetails"
        />
      </template>

      <!-- BULLETIN -->
      <template v-else-if="view === 'bulletin'">
        <Bulletin
          :child="selectedChild"
          :childId="selectedChild.id"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="goToDetails"
        />
      </template>

      <!-- PERMISSION -->
      <template v-else-if="view === 'permission'">
        <DemandeDePermission
          :child="selectedChild"
          :childId="selectedChild.id"
          :etablissementId="etablissementId"
          :anneeScolaireId="anneeScolaireId"
          @back="goToDetails"
        />
      </template>

      <!-- ASSISTANCES -->
      <template v-else-if="view === 'assistances'">
        <Assistances
          :child="selectedChild"
          :childId="selectedChild.id"
          :etablissementId="etablissementId"
          :childName="selectedChild.prenom + ' ' + selectedChild.nom"
          :childClass="selectedChild.class"
          :anneeScolaireId="anneeScolaireId"
          :matiereId="matiereId"
          @selectMatiere="selectMatiere"
          @back="goToDetails"
        />
      </template>

      <!-- DEVOIRS -->
      <template v-else-if="view === 'devoirs'">
        <Devoirs
          :child="selectedChild"
          :childId="selectedChild.id"
          :childName="selectedChild.prenom + ' ' + selectedChild.nom"
          @back="goToDetails"
        />
      </template>

      <!-- ACTIVITE -->
      <template v-else-if="view === 'activite'">
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
        <!-- Une carte par enfant : l'essentiel d'un coup d'œil et des
             raccourcis vers ce que les parents ouvrent le plus. -->
        <div class="enfants-grille">
          <div v-for="child in children" :key="child.id" class="enfant-carte">
            <button type="button" class="enfant-tete" @click="selectChild(child)">
              <EleveAvatar :photo="child.photo || ''" :prenom="child.prenom" :nom="child.nom" :size="58" />
              <span class="enfant-identite">
                <span class="enfant-nom">{{ child.prenom }} {{ child.nom }}</span>
                <span class="enfant-classe"><v-icon size="14">mdi-school-outline</v-icon> {{ child.class || 'Classe' }}</span>
              </span>
              <span v-if="nouveautes[child.id]" class="enfant-nouveau">{{ nouveautes[child.id] }} nouveau{{ nouveautes[child.id] > 1 ? 'x' : '' }}</span>
              <v-icon class="enfant-fleche" color="grey">mdi-chevron-right</v-icon>
            </button>

            <div class="enfant-stats">
              <div class="stat" :class="couleurMoyenne(stats[child.id]?.moyenneGenerale)">
                <span class="stat-valeur">{{ moyenneTexte(stats[child.id]?.moyenneGenerale) }}</span>
                <span class="stat-libelle">Moyenne</span>
              </div>
              <div class="stat" :class="couleurPresence(stats[child.id]?.tauxPresence)">
                <span class="stat-valeur">{{ stats[child.id]?.tauxPresence == null ? '—' : `${stats[child.id].tauxPresence} %` }}</span>
                <span class="stat-libelle">Présence</span>
              </div>
              <div class="stat" :class="stats[child.id]?.absences ? 'is-alerte' : ''">
                <span class="stat-valeur">{{ stats[child.id]?.absences ?? '—' }}</span>
                <span class="stat-libelle">Absence(s)</span>
              </div>
              <div class="stat" :class="stats[child.id]?.heuresPunition ? 'is-alerte' : ''">
                <span class="stat-valeur">{{ stats[child.id]?.heuresPunition ?? '—' }}<small v-if="stats[child.id]?.heuresPunition != null"> h</small></span>
                <span class="stat-libelle">Punition</span>
              </div>
            </div>

            <div class="enfant-raccourcis">
              <button v-for="r in raccourcis" :key="r.vue" type="button" class="raccourci" @click="ouvrirRubrique(child, r.vue)">
                <v-icon size="20">{{ r.icone }}</v-icon>
                <span>{{ r.titre }}</span>
              </button>
            </div>
            <button type="button" class="enfant-tout" @click="selectChild(child)">
              Toutes les rubriques de {{ child.prenom }} <v-icon size="16">mdi-arrow-right</v-icon>
            </button>
          </div>
        </div>

        <v-alert v-if="children.length === 0" type="info" variant="tonal" border="start" class="mt-4">
          Aucun enfant n’est rattaché à votre compte. Rapprochez-vous de l’établissement.
        </v-alert>
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
import Devoirs from "./Devoirs.vue";
import axios from "axios";

const API_URL = "/api/parent/children";

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
    Devoirs,
  },

  props: {
    etablissementId: { type: Number, required: true },
    anneeScolaireId: { type: Number, required: true },
    anneeScolaire: { type: String, required: false, default: "" },
    parentId: { type: [Number, String], required: false, default: null },
    // Fournis par la route (pages/parents/dashbord/enfants/...) :
    // /enfants → liste, /enfants/ben → fiche, /enfants/ben/notes → rubrique, etc.
    // L'enfant est désigné par son prénom (jamais par son identifiant).
    enfant: { type: String, default: "" },
    currentView: { type: String, default: "default" },
    matiereId: { type: Number, default: null },
  },

  data() {
    return {
      children: [],
      stats: {},
      nouveautes: {},
      raccourcis: [
        { vue: 'notes', titre: 'Notes', icone: 'mdi-notebook-outline' },
        { vue: 'bulletin', titre: 'Bulletin', icone: 'mdi-file-document-outline' },
        { vue: 'programme', titre: 'Emploi du temps', icone: 'mdi-calendar-clock' },
        { vue: 'presence', titre: 'Présence', icone: 'mdi-calendar-check-outline' },
      ],
      defaultPhoto: "/_nuxt/assets/parents/istockphoto-1495088043-612x612.jpg",

      loading: false,
      errorMessage: "",
    };
  },

  computed: {
    // Prénom de chaque enfant pour l'adresse (« ben ») ; deux enfants du même
    // prénom deviennent « ben » et « ben-2 ». L'identifiant n'apparaît jamais.
    childSlugs() {
      const seen = {};
      const slugs = new Map();
      this.children.forEach((child) => {
        const base = String(child.prenom || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "enfant";
        seen[base] = (seen[base] || 0) + 1;
        slugs.set(child, seen[base] > 1 ? `${base}-${seen[base]}` : base);
      });
      return slugs;
    },
    // L'enfant est retrouvé à partir du prénom lu dans l'URL.
    selectedChild() {
      if (!this.enfant) return null;
      return this.children.find((c) => this.childSlugs.get(c) === this.enfant) || null;
    },
    selectedSlug() {
      return this.selectedChild ? this.childSlugs.get(this.selectedChild) : this.enfant;
    },
    // Vue réellement affichée : la liste tant que l'enfant n'est pas disponible.
    view() {
      return this.selectedChild ? this.currentView : "default";
    },
    // Chemin de base des écrans « Mes enfants ».
    basePath() {
      return "/parents/dashbord/enfants";
    },
  },

  created() {
    this.fetchChildren();
    this.chargerResume();
  },

  methods: {
    // Chiffres de chaque enfant (moyenne, présence...) et nouveautés non lues.
    async chargerResume() {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [d, n] = await Promise.all([
          this.anneeScolaireId ? axios.get(`/api/parent/dashboard/${this.anneeScolaireId}`, { headers }) : Promise.resolve({ data: {} }),
          axios.get("/api/parent/notifications", { headers }),
        ]);
        const stats = {};
        (d.data?.enfants || []).forEach((e) => { stats[e.id] = e; });
        this.stats = stats;
        const nouv = {};
        (n.data?.items || []).filter((i) => !i.lu && i.eleveId).forEach((i) => { nouv[i.eleveId] = (nouv[i.eleveId] || 0) + 1; });
        this.nouveautes = nouv;
      } catch (e) {
        // Les cartes restent utilisables sans les chiffres.
      }
    },
    ouvrirRubrique(child, vue) {
      this.goTo(`${this.basePath}/${this.childSlugs.get(child)}/${vue}`);
    },
    moyenneTexte(m) {
      return m == null ? "—" : String(Math.round(m * 100) / 100).replace(".", ",");
    },
    couleurMoyenne(m) {
      if (m == null) return "";
      return m >= 12 ? "is-bien" : m >= 10 ? "is-moyen" : "is-alerte";
    },
    couleurPresence(t) {
      if (t == null) return "";
      return t >= 90 ? "is-bien" : t >= 75 ? "is-moyen" : "is-alerte";
    },
    goLogin(reason = "unknown") {
      console.warn("[ChildrenList] retour à la connexion :", reason);
      this.$router.push("/parents/connexion");
    },

    async fetchChildren() {

      this.loading = true;
      this.errorMessage = "";


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

        // Enfant de l'adresse introuvable (lien obsolète, autre compte) : retour à la liste.
        if (this.currentView !== "default" && !this.selectedChild) this.resetView(true);
      } catch (error) {
        const status = error.response?.status;
        const backendMessage = error.response?.data?.message;

        // Session réellement invalide (token expiré...) : plugins/axios-auth.client.ts
        // renvoie déjà à la connexion. Tout autre 401/403 est affiché ici, sans quitter l'écran
        // (le bouton « Connexion » reste disponible).
        if (status === 401 || status === 403) {
          this.errorMessage =
            backendMessage ||
            `Accès refusé (${status}).`;
          return;
        }

        this.errorMessage =
          backendMessage ||
          "Impossible de charger les enfants (problème réseau/serveur).";
      } finally {
        this.loading = false;
      }
    },

    // Navigation entre écrans = changement de route. Seuls les paramètres du login
    // (id, etablissement) sont gardés en query ; les états internes (semestre...) non.
    goTo(path, replace = false) {
      return this.$router[replace ? "replace" : "push"]({ path });
    },
    selectChild(child) {
      this.goTo(`${this.basePath}/${this.childSlugs.get(child)}`);
    },
    resetView(replace = false) {
      this.goTo(this.basePath, replace);
    },
    goToDetails() {
      this.goTo(`${this.basePath}/${this.selectedSlug}`);
    },
    navigateTo(view) {
      this.goTo(`${this.basePath}/${this.selectedSlug}/${view}`);
    },
    // Assistant choisi (ou fermé) dans la rubrique Assistances.
    selectMatiere(matiereId) {
      const path = `${this.basePath}/${this.selectedSlug}/assistances`;
      this.goTo(matiereId == null ? path : `${path}/${matiereId}`);
    },
  },
};
</script>

<style scoped>
/* Cartes des enfants */
.enfants-grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
.enfant-carte { background: #fff; border: 1px solid #e3e9f1; border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05); }
.enfant-tete { display: flex; align-items: center; gap: 12px; background: none; border: 0; padding: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; }
.enfant-identite { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.enfant-nom { font-weight: 800; font-size: 1.05rem; color: #1c2a3a; line-height: 1.2; }
.enfant-classe { font-size: 0.85rem; color: #546e7a; display: inline-flex; align-items: center; gap: 4px; margin-top: 2px; }
.enfant-nouveau { font-size: 0.72rem; font-weight: 800; color: #fff; background: #1976d2; border-radius: 999px; padding: 2px 8px; white-space: nowrap; }
.enfant-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.stat { display: flex; flex-direction: column; align-items: center; background: #f4f7fb; border-radius: 10px; padding: 7px 4px; }
.stat-valeur { font-weight: 800; font-size: 1.05rem; color: #263238; }
.stat-valeur small { font-size: 0.7rem; }
.stat-libelle { font-size: 0.7rem; color: #607d8b; }
.stat.is-bien { background: #e8f5e9; } .stat.is-bien .stat-valeur { color: #2e7d32; }
.stat.is-moyen { background: #fff8e1; } .stat.is-moyen .stat-valeur { color: #b26a00; }
.stat.is-alerte { background: #fdecea; } .stat.is-alerte .stat-valeur { color: #c62828; }
.enfant-raccourcis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.raccourci { display: flex; flex-direction: column; align-items: center; gap: 3px; background: #fff; border: 1px solid #d6e3f3; border-radius: 10px; padding: 8px 2px; font: inherit; font-size: 0.74rem; font-weight: 700; color: #1565c0; cursor: pointer; }
.raccourci:hover { background: #f1f7ff; }
.enfant-tout { align-self: flex-end; background: none; border: 0; font: inherit; font-size: 0.82rem; font-weight: 700; color: #1565c0; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 2px; }
@media (max-width: 420px) { .enfants-grille { grid-template-columns: 1fr; } }
.media-profil { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px 0; }
.media-profil .media-badge { position: static; }
/* ✅ Charte app: bleu/blanc + touche noir (pro) */
.children-page {
  padding-top: 8px;
  padding-bottom: 12px;
}

/* Header */
.page-header {
  margin-bottom: 10px;
  padding: 4px 4px 0;
}
.page-title {
  display: flex;
  align-items: center;
  font-weight: 900;
  color: #0b2e4a;
  letter-spacing: 0.2px;
  font-size: clamp(1.05rem, 2vw, 1.2rem);
}
.page-subtitle {
  margin-top: 2px;
  color: #455a64;
  line-height: 1.3;
  font-size: 0.86rem;
}

/* States */
.state-card {
  border-radius: 10px!important;
  border: 1px solid rgba(25, 118, 210, 0.12);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}
.state-center {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 12px;
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
  border-radius: 10px!important;
  overflow: hidden;
  border: 1px solid rgba(25, 118, 210, 0.12);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}
.list-accent {
  height: 3px;
  width: 100%;
  background: linear-gradient(90deg, #1976d2, rgba(25, 118, 210, 0.22), #1976d2);
  opacity: 0.95;
}
.list-content {
  padding: 12px !important;
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
  border-radius: 10px!important;
  overflow: hidden;
  border: 1px solid rgba(25, 118, 210, 0.12);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.child-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08)!important;
}

/* Media */
.media { position: relative; }
.media-img {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
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
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(25, 118, 210, 0.16);
  color: #0b2e4a;
  font-weight: 900;
  font-size: 0.8rem;
}

/* Body */
.child-body { padding: 8px 10px 2px !important; }
.child-name {
  font-weight: 900;
  color: #0b2e4a;
  font-size: 0.95rem;
  line-height: 1.25rem;
}
.child-classe-m { display: none; }
/* Actions */
.child-actions {
  padding: 0 6px 6px !important;
}
.pill-btn {
  border-radius: 999px !important;
  font-weight: 900;
  text-transform: none;
}

/* Carte enfant compacte (toutes tailles) */
/* Carte enfant en ligne : vignette 64 px à gauche, nom et bouton à droite. */
.child-card {
  display: grid !important;
  grid-template-columns: 64px 1fr auto;
  align-items: center;
  column-gap: 10px;
  padding: 6px;
}
.media-img {
  height: 64px !important;
  width: 64px;
  border-radius: 8px !important;
}
.media-img :deep(.v-responsive__sizer) { padding-bottom: 0 !important; }
.media-badge { display: none; }
.child-classe-m {
  display: block;
  color: #607d8b;
  font-size: 0.8rem;
  font-weight: 700;
}
.child-body { padding: 0 !important; }
.child-actions { padding: 0 !important; }

/* ✅ Mobile */
@media (max-width: 600px) {
  .children-page { padding: 8px !important; }
  .page-header { padding: 2px 2px 0; margin-bottom: 8px; }
  .page-title { font-size: 1.05rem; }
  /* Pas de grand cadre autour de la liste : les cartes sont posées sur la page. */
  .list-shell {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }
  .list-accent { display: none; }
  .list-content { padding: 0 !important; }
  .cards-row { max-width: 520px; }
}

/* ✅ Très petit écran */
@media (max-width: 360px) {
  .page-subtitle { font-size: 0.9rem; }
  .child-name { font-size: 0.98rem; }
}
</style>
