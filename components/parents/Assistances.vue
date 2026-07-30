<template>
  <div class="assist-page">
    <template v-if="!selectedAssistant">
      <!-- Topbar -->
      <div class="topbar">
        <v-btn icon class="back-btn" @click="$emit('back')" aria-label="Retour">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>

        <div class="topbar-title">
          <div class="title">Assistants IA</div>
          <div class="subtitle">
            Pose tes questions sur ce que vous avez fait en classe, <span class="sub-strong">{{ childName }}</span>
          </div>
        </div>

        <v-btn icon class="refresh-btn" @click="fetchSubjects" :loading="loading" aria-label="Rafraîchir">
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
        <v-card v-else-if="!error && subjects.length === 0" class="empty-card" variant="outlined">
          <v-card-text class="empty-content">
            <div class="empty-icon">
              <v-icon size="42">mdi-robot-confused-outline</v-icon>
            </div>
            <div class="empty-title">Aucun assistant disponible</div>
            <div class="empty-subtitle">
              Ton professeur n'a pas encore renseigné d'activité de cours cette année.
            </div>

            <v-btn class="btn-primary mt-4" @click="fetchSubjects">
              <v-icon left>mdi-refresh</v-icon>
              Rafraîchir
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- Subject cards -->
        <div v-else class="subjects-wrap">
          <div v-for="subject in subjects" :key="subject.matiereId" class="subject-card" @click="selectSubject(subject)">
            <div class="subject-icon">
              <v-icon size="22">mdi-forum-outline</v-icon>
            </div>

            <div class="subject-info">
              <div class="subject-name">Assistant {{ subject.matiereNom }}</div>
              <div class="subject-sub">
                <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
                {{ formatDate(subject.date) }}
                <span class="dot">•</span>
                <span class="subject-activity">{{ subject.activite }}</span>
              </div>
            </div>

            <v-icon class="chev">mdi-chevron-right</v-icon>
          </div>
        </div>
      </v-container>
    </template>

    <ChatWithAssistant
      v-else
      :eleveId="childId"
      :testId="selectedAssistant.testId"
      :subjectName="selectedAssistant.matiereNom"
      :activity="selectedAssistant.activite"
      :date="selectedAssistant.date"
      :childName="childName"
      @back="selectedAssistant = null"
    />
  </div>
</template>

<script>
import axios from "axios";
import dayjs from "dayjs";
import ChatWithAssistant from "./ChatWithAssistant.vue";

const API = "/api/parent/assistant";

export default {
  components: { ChatWithAssistant },
  props: {
    childId: { type: Number, required: true },
    childName: { type: String, required: true },
    childClass: { type: String, required: false, default: "" },
  },
  data() {
    return {
      subjects: [],
      selectedAssistant: null,
      loading: false,
      error: null,
    };
  },
  created() {
    this.fetchSubjects();
  },
  methods: {
    getToken() {
      return typeof window !== "undefined" ? localStorage.getItem("token") : null;
    },

    async fetchSubjects() {
      const token = this.getToken();
      if (!token) {
        this.error = "Session expirée. Veuillez vous reconnecter.";
        return;
      }

      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(`${API}/subjects/${this.childId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const rows = Array.isArray(response.data?.assistants) ? response.data.assistants : [];

        // Une carte par matière : on garde l'entrée la plus récente (les lignes
        // arrivent déjà triées par date décroissante côté serveur).
        const recentByMatiere = new Map();
        rows.forEach((row) => {
          if (!recentByMatiere.has(row.matiereId)) recentByMatiere.set(row.matiereId, row);
        });
        this.subjects = Array.from(recentByMatiere.values());
      } catch (err) {
        console.error("Erreur lors de la récupération des assistants :", err);
        this.error =
          err.response?.data?.message || "Erreur lors du chargement des assistants.";
      } finally {
        this.loading = false;
      }
    },

    selectSubject(subject) {
      this.selectedAssistant = subject;
    },

    formatDate(value) {
      const d = dayjs(value);
      return d.isValid() ? d.format("DD/MM/YYYY") : "—";
    },
  },
};
</script>

<style scoped>
/* ===== Page (charte bleue, cohérente avec Presence.vue / Scolarite.vue) ===== */
.assist-page {
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

/* ===== Subject cards ===== */
.subjects-wrap {
  max-width: 780px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.subject-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 18px;
  box-shadow: 0 10px 40px rgba(11, 46, 74, 0.08);
  padding: 14px 14px;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.subject-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 55px rgba(11, 46, 74, 0.14);
}
.subject-icon {
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
.subject-info {
  min-width: 0;
  flex: 1;
}
.subject-name {
  font-weight: 950;
  color: var(--text);
  letter-spacing: -0.2px;
}
.subject-sub {
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: 0.84rem;
  font-weight: 700;
  min-width: 0;
}
.subject-activity {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dot {
  opacity: 0.5;
  margin: 0 2px;
}
.chev {
  color: var(--primary-600);
  flex: 0 0 auto;
}

/* ===== Responsive ===== */
@media (max-width: 600px) {
  .content {
    padding: 12px 8px 18px;
  }
  .subject-card {
    padding: 12px 12px;
  }
}
</style>
