<template>
  <div class="page">
    <!-- ✅ Topbar pro + responsive -->
    <div class="topbar">
      <v-btn icon class="icon-btn" @click="$emit('back')" aria-label="Retour">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>

      <div class="topbar-title">
        <div class="t1">Enseignants / Classes</div>
        <div class="t2">
          {{ etablissementNom }} • {{ anneeScolaire }}
        </div>
      </div>

      <v-btn
        icon
        class="icon-btn"
        @click="fetchClasses(true)"
        :loading="loading"
        aria-label="Rafraîchir"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </div>

    <!-- ✅ Liste des classes si aucune classe sélectionnée -->
    <v-container fluid class="content" v-if="!selectedClassId">
      <!-- Loading skeleton -->
      <div v-if="loading && !classes.length" class="skeleton-wrap">
        <v-skeleton-loader
          type="card, card, card"
          class="skeleton"
        />
      </div>

      <!-- Empty state -->
      <v-card v-else-if="!classes.length" class="empty-card" outlined>
        <v-card-text class="empty-content">
          <div class="empty-icon">
            <v-icon size="42">mdi-school-outline</v-icon>
          </div>
          <div class="empty-title">Aucune classe disponible</div>
          <div class="empty-subtitle">
            Veuillez ajouter des classes dans la gestion des classes, puis revenez ici.
          </div>

          <v-btn class="btn-primary mt-4" @click="fetchClasses(true)" :loading="loading">
            <v-icon start>mdi-refresh</v-icon>
            Rafraîchir
          </v-btn>
        </v-card-text>
      </v-card>

      <!-- Grid -->
      <div v-else class="list-wrap">
        <div class="list-head">
          <div class="list-meta">
            <span class="meta-text">
              {{ classes.length }} classe{{ classes.length > 1 ? "s" : "" }}
            </span>
            <span class="dot">•</span>
            <span class="meta-text">Sélectionnez une classe</span>
          </div>

          <v-text-field
            v-model="search"
            class="search"
            density="comfortable"
            variant="outlined"
            hide-details
            placeholder="Rechercher une classe..."
            prepend-inner-icon="mdi-magnify"
          />
        </div>

        <v-row dense>
          <v-col
            v-for="classe in filteredClasses"
            :key="classe.id"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card
              class="class-card"
              outlined
              @click="goToClass(classe.id, classe.nom)"
              role="button"
              tabindex="0"
              @keydown.enter.prevent="goToClass(classe.id, classe.nom)"
            >
              <div class="class-card-inner">
                <div class="class-avatar">
                  <v-icon size="22">mdi-google-classroom</v-icon>
                </div>

                <div class="class-body">
                  <div class="class-name">
                    {{ classe.nom }}
                  </div>
                  <div class="class-sub">
                    Voir les enseignants affectés
                  </div>
                </div>

                <div class="class-action">
                  <v-icon size="20">mdi-chevron-right</v-icon>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </v-container>

    <!-- ✅ Détails -->
    <EnseignantclasseDetail
      v-else
      :class-id="selectedClassId"
      :class-name="selectedClassName"
      :annee-scolaire="anneeScolaire"
      :annee-scolaire-id="anneeScolaireId"
      :etablissement-id="etablissementId"
      @back="clearSelection"
    />

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :timeout="2500">
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">OK</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script>
import axios from "axios";
import EnseignantclasseDetail from "./EnseignantclasseDetail.vue";

export default {
  name: "EnseignantParclasse",
  components: { EnseignantclasseDetail },
  props: {
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
  },
  data() {
    return {
      classes: [],
      selectedClassId: null,
      selectedClassName: "",

      loading: false,
      search: "",
      snackbar: { show: false, text: "" },
    };
  },
  computed: {
    filteredClasses() {
      const q = String(this.search || "").trim().toLowerCase();
      if (!q) return this.classes;
      return this.classes.filter((c) => String(c?.nom || "").toLowerCase().includes(q));
    },
  },
  methods: {
    async fetchClasses(showToast = false) {
      this.loading = true;
      try {
        const res = await axios.get(`/api/classe/${this.etablissementId}`);
        this.classes = Array.isArray(res.data) ? res.data : [];
        if (showToast) this.snackbar = { show: true, text: "Classes mises à jour." };
      } catch (error) {
        console.error("Erreur lors de la récupération des classes:", error);
        this.classes = [];
        this.snackbar = { show: true, text: "Erreur de chargement des classes." };
      } finally {
        this.loading = false;
      }
    },
    goToClass(classId, className) {
      this.selectedClassId = classId;
      this.selectedClassName = className;
    },
    clearSelection() {
      this.selectedClassId = null;
      this.selectedClassName = "";
    },
  },
  created() {
    this.fetchClasses(false);
  },
};
</script>

<style scoped>
/* =========================
   Charte "bleu" + neutres
========================= */
.page {
  --primary: #2563eb;
  --primary-600: #1d4ed8;
  --primary-50: #eff6ff;
  --text: #0f172a;
  --muted: #64748b;
  --border: rgba(15, 23, 42, 0.10);
  --card: #ffffff;
  --bg: #f6f8fc;

  min-height: 100vh;
  background: radial-gradient(1200px 500px at 50% -20%, var(--primary-50), transparent 60%),
    linear-gradient(to bottom, var(--bg), #ffffff 55%);
}

/* Topbar */
.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  backdrop-filter: blur(10px);
  background: rgba(246, 248, 252, 0.75);
  border-bottom: 1px solid var(--border);

  display: grid;
  grid-template-columns: 44px 1fr 44px;
  gap: 10px;
  align-items: center;

  padding: 12px 14px;
}

.icon-btn {
  border-radius: 12px;
}

.topbar :deep(.v-btn) {
  color: var(--primary-600);
}

.topbar-title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.t1 {
  font-weight: 900;
  color: var(--text);
  letter-spacing: -0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.t2 {
  font-size: 0.85rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Content */
.content {
  padding: 14px 10px 24px;
}

.skeleton-wrap {
  padding: 6px 6px 0;
}
.skeleton {
  max-width: 1100px;
  margin: 0 auto;
}

/* List header */
.list-wrap {
  max-width: 1100px;
  margin: 0 auto;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 10px 6px 12px;
  flex-wrap: wrap;
}

.list-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 0.82rem;
  flex-wrap: wrap;
}

.dot {
  opacity: 0.6;
}

.search {
  min-width: 240px;
  max-width: 360px;
  flex: 1 1 280px;
}

/* Cards */
.class-card {
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--card);
  overflow: hidden;
  cursor: pointer;
}

.class-card-inner {
  display: grid;
  grid-template-columns: 46px 1fr 24px;
  gap: 12px;
  padding: 14px;
  align-items: center;
}

.class-avatar {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  background: rgba(37, 99, 235, 0.10);
  border: 1px solid rgba(37, 99, 235, 0.22);
  color: var(--primary-600);
  display: flex;
  align-items: center;
  justify-content: center;
}

.class-body {
  min-width: 0;
}

.class-name {
  font-weight: 900;
  color: var(--text);
  letter-spacing: -0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.class-sub {
  margin-top: 2px;
  font-size: 0.85rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.class-action {
  color: rgba(15, 23, 42, 0.45);
}

@media (hover: hover) and (pointer: fine) {
  .class-card:hover {
    transform: translateY(-1px);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    box-shadow: 0 10px 28px rgba(37, 99, 235, 0.10);
  }
}

/* Empty */
.empty-card {
  max-width: 560px;
  margin: 18px auto 0;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--card);
}

.empty-content {
  padding: 20px 18px;
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  margin: 0 auto 10px;
  display: flex;
  align-items: center;
  justify-content: center;

  background: rgba(37, 99, 235, 0.10);
  color: var(--primary-600);
  border: 1px solid rgba(37, 99, 235, 0.22);
}

.empty-title {
  font-size: 1.05rem;
  font-weight: 900;
  color: var(--text);
}

.empty-subtitle {
  margin-top: 4px;
  font-size: 0.9rem;
  color: var(--muted);
}

/* Buttons */
.btn-primary {
  border-radius: 14px;
  background: var(--primary);
  color: #fff;
  font-weight: 900;
  text-transform: none;
}
.btn-primary:hover {
  background: var(--primary-600);
}

.btn-soft {
  border-radius: 12px;
  border: 1px solid rgba(37, 99, 235, 0.18);
  background: rgba(37, 99, 235, 0.08);
  color: var(--primary-600);
  font-weight: 800;
  text-transform: none;
}

/* Mobile tweaks */
@media (max-width: 600px) {
  .content {
    padding: 12px 8px 20px;
  }
  .class-card-inner {
    grid-template-columns: 44px 1fr 24px;
    padding: 12px;
    gap: 10px;
  }
  .class-avatar {
    width: 44px;
    height: 44px;
    border-radius: 14px;
  }
  .search {
    min-width: 100%;
    max-width: none;
  }
}
</style>
