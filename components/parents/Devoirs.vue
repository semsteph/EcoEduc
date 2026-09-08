<template>
  <div class="devoirs-page">
    <!-- Topbar -->
    <div class="topbar">
      <v-btn icon class="back-btn" @click="$emit('back')" aria-label="Retour">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>

      <div class="topbar-title">
        <div class="title">Devoirs</div>
        <div class="subtitle">
          Exercices à faire à la maison, <span class="sub-strong">{{ childName }}</span>
        </div>
      </div>

      <v-btn icon class="refresh-btn" @click="fetchDevoirs" :loading="loading" aria-label="Rafraîchir">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </div>

    <v-container fluid class="content">
      <!-- Error -->
      <v-alert v-if="error" type="error" variant="tonal" class="mb-3" density="compact" border="start">
        {{ error }}
      </v-alert>

      <!-- Loading -->
      <div v-if="loading" class="skeleton-wrap">
        <v-skeleton-loader type="list-item-two-line, list-item-two-line, list-item-two-line" />
      </div>

      <!-- Empty -->
      <v-card v-else-if="!error && devoirs.length === 0" class="empty-card" variant="outlined">
        <v-card-text class="empty-content">
          <div class="empty-icon">
            <v-icon size="42">mdi-notebook-outline</v-icon>
          </div>
          <div class="empty-title">Aucun devoir pour le moment</div>
          <div class="empty-subtitle">
            Les devoirs donnés par les enseignants apparaîtront ici.
          </div>

          <v-btn class="btn-primary mt-4" @click="fetchDevoirs">
            <v-icon left>mdi-refresh</v-icon>
            Rafraîchir
          </v-btn>
        </v-card-text>
      </v-card>

      <!-- Devoirs list -->
      <div v-else class="devoirs-wrap">
        <div v-for="d in devoirs" :key="d.id" class="devoir-card" :class="{ 'devoir-card--warn': d.nonFait }">
          <div class="devoir-icon">
            <v-icon size="22">mdi-notebook-edit-outline</v-icon>
          </div>

          <div class="devoir-info">
            <div class="devoir-top">
              <div class="devoir-title">{{ d.titre }}</div>
              <v-chip v-if="d.nonFait" size="small" color="error" variant="flat" class="chip-warn">
                <v-icon start size="14">mdi-alert-circle-outline</v-icon>
                Non fait
              </v-chip>
            </div>

            <div v-if="d.description" class="devoir-desc">{{ d.description }}</div>

            <div class="devoir-sub">
              <v-icon size="14" class="mr-1">mdi-book-outline</v-icon>
              {{ d.matiereNom || "Matière" }}
              <span class="dot">•</span>
              <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
              Donné le {{ formatDate(d.created_at) }}
              <template v-if="d.date_limite">
                <span class="dot">•</span>
                <v-icon size="14" class="mr-1">mdi-flag-checkered</v-icon>
                À rendre pour le {{ formatDate(d.date_limite) }}
              </template>
            </div>
          </div>
        </div>
      </div>
    </v-container>
  </div>
</template>

<script>
import axios from "axios";

const API = "/api/devoirs";

export default {
  props: {
    childId: { type: Number, required: true },
    childName: { type: String, required: true },
  },
  data() {
    return {
      devoirs: [],
      loading: false,
      error: null,
    };
  },
  created() {
    this.fetchDevoirs();
  },
  methods: {
    getToken() {
      return typeof window !== "undefined" ? localStorage.getItem("token") : null;
    },

    async fetchDevoirs() {
      const token = this.getToken();
      if (!token) {
        this.error = "Session expirée. Veuillez vous reconnecter.";
        return;
      }

      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(`${API}/eleve/${this.childId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.devoirs = Array.isArray(response.data) ? response.data : [];
      } catch (err) {
        console.error("Erreur lors de la récupération des devoirs :", err);
        this.error = err.response?.data?.message || "Erreur lors du chargement des devoirs.";
      } finally {
        this.loading = false;
      }
    },

    formatDate(value) {
      if (!value) return "—";
      return new Date(value).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    },
  },
};
</script>

<style scoped>
/* ===== Page (charte bleue, cohérente avec Assistances.vue / Presence.vue) ===== */
.devoirs-page {
  --primary: #2563eb;
  --primary-600: #1d4ed8;
  --primary-50: #eff6ff;
  --text: #0f172a;
  --muted: #64748b;
  --border: rgba(15, 23, 42, 0.1);
  --card: #ffffff;
  --bg: #f6f8fc;

  min-height: 100vh;
  background: radial-gradient(1200px 480px at 50% -20%, var(--primary-50), transparent 60%),
    linear-gradient(to bottom, var(--bg), #ffffff 55%);
}

/* ===== Topbar ===== */
.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  backdrop-filter: blur(10px);
  background: rgba(246, 248, 252, 0.82);
  border-bottom: 1px solid var(--border);
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
}
.back-btn,
.refresh-btn {
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
  text-align: center;
}
.title {
  font-size: 1.05rem;
  font-weight: 900;
  color: var(--text);
}
.subtitle {
  font-size: 0.85rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sub-strong {
  color: var(--text);
  font-weight: 900;
}

/* ===== Content ===== */
.content {
  padding: 14px 10px 24px;
}
.skeleton-wrap {
  padding: 6px 6px 0;
}

/* ===== Empty ===== */
.empty-card {
  max-width: 640px;
  margin: 18px auto 0;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--card);
}
.empty-content {
  padding: 22px 18px;
  text-align: center;
}
.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  margin: 0 auto 10px;
  display: grid;
  place-items: center;
  background: rgba(37, 99, 235, 0.1);
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

/* ===== Devoir cards ===== */
.devoirs-wrap {
  max-width: 780px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.devoir-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 18px;
  box-shadow: 0 10px 40px rgba(11, 46, 74, 0.08);
  padding: 14px 14px;
}
.devoir-card--warn {
  border: 1px solid rgba(220, 38, 38, 0.28);
  background: rgba(254, 242, 242, 0.7);
}
.devoir-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(37, 99, 235, 0.1);
  color: var(--primary-600);
  border: 1px solid rgba(37, 99, 235, 0.22);
  flex: 0 0 auto;
}
.devoir-info {
  min-width: 0;
  flex: 1;
}
.devoir-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.devoir-title {
  font-weight: 950;
  color: var(--text);
  letter-spacing: -0.2px;
}
.chip-warn {
  font-weight: 900;
}
.devoir-desc {
  margin-top: 4px;
  color: rgba(15, 23, 42, 0.78);
  font-size: 0.9rem;
  line-height: 1.35rem;
  white-space: pre-wrap;
}
.devoir-sub {
  margin-top: 6px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
}
.dot {
  opacity: 0.5;
  margin: 0 2px;
}

/* ===== Responsive ===== */
@media (max-width: 600px) {
  .content {
    padding: 12px 8px 18px;
  }
  .devoir-card {
    padding: 12px 12px;
  }
}
</style>
