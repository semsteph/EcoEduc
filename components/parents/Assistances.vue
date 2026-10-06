<template>
  <div class="assist-page">
    <!-- 1. Un assistant par matière -->
    <template v-if="matiereId == null">
      <div class="topbar">
        <div class="topbar-title">
          <div class="title">Assistants IA</div>
          <div class="subtitle">
            Un assistant par matière, au courant de tout ce qui a été fait en classe, <span class="sub-strong">{{ childName }}</span>
          </div>
        </div>
        <v-btn icon class="refresh-btn" @click="charger" :loading="loading" aria-label="Rafraîchir">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </div>

      <v-container fluid class="content">
        <v-alert v-if="error" type="error" variant="tonal" class="mb-3" density="compact" border="start">{{ error }}</v-alert>
        <div v-if="loading" class="skeleton-wrap">
          <v-skeleton-loader type="list-item-two-line, list-item-two-line, list-item-two-line" />
        </div>
        <v-card v-else-if="!error && matieres.length === 0" class="empty-card" variant="outlined">
          <v-card-text class="empty-content">
            <div class="empty-icon"><v-icon size="24">mdi-account-question-outline</v-icon></div>
            <div class="empty-title">Aucun assistant disponible</div>
            <div class="empty-subtitle">Les assistants apparaissent dès que les professeurs remplissent leur cahier de texte.</div>
            <v-btn class="btn-primary mt-4" @click="charger"><v-icon left>mdi-refresh</v-icon>Rafraîchir</v-btn>
          </v-card-text>
        </v-card>
        <div v-else class="subjects-wrap">
          <div v-for="m in matieres" :key="m.matiereId" class="subject-card" @click="$emit('selectMatiere', m.matiereId)">
            <div class="assistant-avatar"><v-icon size="22">mdi-account</v-icon></div>
            <div class="subject-info">
              <div class="subject-name">Assistant {{ m.nom }}</div>
              <div class="subject-sub">
                <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
                {{ formatDate(m.derniereDate) }}
                <span class="dot">•</span>
                <span class="subject-activity">{{ resumeMatiere(m) }}</span>
              </div>
            </div>
            <v-icon class="chev">mdi-chevron-right</v-icon>
          </div>
        </div>
      </v-container>
    </template>

    <!-- 2. Une matière : parties vues en classe (une discussion chacune) -->
    <template v-else-if="!filChoisi">
      <div class="topbar">
        <div class="topbar-title">
          <div class="title">Assistant {{ matiere?.nom || "" }}</div>
          <div class="subtitle">Choisis la partie du cours sur laquelle tu veux poser tes questions.</div>
        </div>
      </div>
      <v-container fluid class="content">
        <div v-if="loading" class="skeleton-wrap"><v-skeleton-loader type="list-item-two-line, list-item-two-line" /></div>
        <template v-else-if="matiere">
          <div v-for="g in groupesSA" :key="g.sa" class="sa-groupe">
            <div class="sa-titre">{{ g.sa }}</div>
            <div v-for="p in g.parties" :key="p.elementId" class="partie-card" @click="ouvrir({ partie: p.elementId })">
              <div class="partie-info">
                <div v-if="p.parents && p.parents !== g.sa" class="partie-parents">{{ p.parents.replace(g.sa + ' › ', '') }}</div>
                <div class="partie-titre">{{ p.titre }}</div>
                <div class="partie-sub">
                  <v-chip size="x-small" :color="p.termine ? 'success' : 'primary'" variant="flat" class="mr-2">
                    {{ p.termine ? "Terminée en classe" : "En cours en classe" }}
                  </v-chip>
                  {{ p.seances }} séance(s) · {{ formatDate(p.derniereDate) }}
                </div>
              </div>
              <v-icon class="chev">mdi-chevron-right</v-icon>
            </div>
          </div>
          <div v-if="matiere.horsProgramme.length" class="sa-groupe">
            <div class="sa-titre">{{ matiere.parties.length ? "Autres séances" : "Séances" }}</div>
            <div v-for="h in matiere.horsProgramme" :key="h.testId" class="partie-card" @click="ouvrir({ seance: h.testId })">
              <div class="partie-info">
                <div class="partie-titre">{{ h.activite }}</div>
                <div class="partie-sub"><v-icon size="14" class="mr-1">mdi-calendar</v-icon>{{ formatDate(h.date) }}</div>
              </div>
              <v-icon class="chev">mdi-chevron-right</v-icon>
            </div>
          </div>
        </template>
      </v-container>
    </template>

    <!-- 3. Discussion d'une partie -->
    <ChatWithAssistant
      v-else
      :key="filChoisi.cle"
      :eleveId="childId"
      :testId="filChoisi.testId"
      :subjectName="matiere.nom"
      :activity="filChoisi.titre"
      :date="filChoisi.date"
      :childName="childName"
      @back="fermerFil"
    />
  </div>
</template>

<script>
import axios from "axios";
import dayjs from "dayjs";
import ChatWithAssistant from "./ChatWithAssistant.vue";
import { useCrumbLabel } from "@/composables/usePageNav";

const API = "/api/parent/assistant";

export default {
  components: { ChatWithAssistant },
  props: {
    childId: { type: Number, required: true },
    childName: { type: String, required: true },
    childClass: { type: String, required: false, default: "" },
    // Matière ouverte, fournie par la route
    // /parents/dashbord/enfants/:enfant/assistances/:matiereId ; la partie
    // ouverte est dans l'adresse (?partie= ou ?seance=).
    matiereId: { type: Number, default: null },
  },
  emits: ["back", "selectMatiere"],
  setup() {
    return { setCrumbLabel: useCrumbLabel() };
  },
  data() {
    return {
      matieres: [],
      loading: false,
      error: null,
    };
  },
  computed: {
    matiere() {
      if (this.matiereId == null) return null;
      return this.matieres.find((m) => Number(m.matiereId) === this.matiereId) || null;
    },
    // Parties regroupées par SA, dans l'ordre du programme.
    groupesSA() {
      const groupes = [];
      (this.matiere?.parties || []).forEach((p) => {
        let g = groupes.find((x) => x.sa === p.sa);
        if (!g) groupes.push((g = { sa: p.sa, parties: [] }));
        g.parties.push(p);
      });
      return groupes;
    },
    filChoisi() {
      if (!this.matiere) return null;
      const { partie, seance } = this.$route.query;
      if (partie) {
        const p = this.matiere.parties.find((x) => String(x.elementId) === String(partie));
        return p ? { cle: `p${p.elementId}`, testId: p.testId, titre: p.titre, date: p.derniereDate } : null;
      }
      if (seance) {
        const h = this.matiere.horsProgramme.find((x) => String(x.testId) === String(seance));
        return h ? { cle: `s${h.testId}`, testId: h.testId, titre: h.activite, date: h.date } : null;
      }
      return null;
    },
  },
  watch: {
    matiere(m) {
      if (m) this.setCrumbLabel(this.$route.path, m.nom);
    },
  },
  created() {
    this.charger();
  },
  methods: {
    async charger() {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        this.error = "Session expirée. Veuillez vous reconnecter.";
        return;
      }
      this.loading = true;
      this.error = null;
      try {
        const { data } = await axios.get(`${API}/matieres/${this.childId}`, { headers: { Authorization: `Bearer ${token}` } });
        this.matieres = Array.isArray(data?.matieres) ? data.matieres : [];
        // Matière de l'adresse introuvable : retour à la liste des assistants.
        if (this.matiereId != null && !this.matiere) this.$emit("selectMatiere", null);
      } catch (err) {
        console.error("Erreur lors de la récupération des assistants :", err);
        this.error = err.response?.data?.message || "Erreur lors du chargement des assistants.";
      } finally {
        this.loading = false;
      }
    },
    resumeMatiere(m) {
      const enCours = [...m.parties].reverse().find((p) => !p.termine) || m.parties[m.parties.length - 1];
      if (enCours) return enCours.titre;
      return m.horsProgramme[0]?.activite || "";
    },
    ouvrir(choix) {
      this.$router.push({ path: this.$route.path, query: { ...this.$route.query, partie: undefined, seance: undefined, ...choix } });
    },
    fermerFil() {
      const { partie, seance, ...reste } = this.$route.query;
      this.$router.push({ path: this.$route.path, query: reste });
    },
    formatDate(value) {
      const d = dayjs(value);
      return d.isValid() ? d.format("DD/MM/YYYY") : "—";
    },
  },
};
</script>

<style scoped>
/* Page d'une matière : parties vues en classe */
.sa-groupe { margin-bottom: 18px; }
.sa-titre { font-weight: 800; color: #1d4ed8; margin: 4px 2px 8px; }
.partie-card { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid rgba(15, 23, 42, 0.1); border-radius: 14px; padding: 12px 14px; margin-bottom: 8px; cursor: pointer; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06); }
.partie-card:hover { border-color: #93c5fd; }
.partie-info { flex: 1; min-width: 0; }
.partie-parents { font-size: 0.78rem; color: #64748b; }
.partie-titre { font-weight: 800; color: #0f172a; }
.partie-sub { display: flex; align-items: center; flex-wrap: wrap; font-size: 0.82rem; color: #64748b; margin-top: 4px; }

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
  grid-template-columns: minmax(0, 1fr) 44px; /* la flèche retour est dans le cadre (PageNav) */
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
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card);
}
.empty-content {
  padding: 14px 12px;
  text-align: center;
}
.empty-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  margin: 0 auto 10px;
  display: grid;
  place-items: center;
  background: rgba(37, 99, 235, 0.1);
  color: var(--primary-600);
  border: 1px solid rgba(37, 99, 235, 0.22);
}
.empty-title {
  font-size: 0.95rem;
  font-weight: 900;
  color: var(--text);
}
.empty-subtitle {
  margin-top: 4px;
  font-size: 0.84rem;
  color: var(--muted);
}
.btn-primary {
  border-radius: 10px;
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
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  padding: 14px 14px;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.subject-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}
/* Silhouette de personne : chaque assistant représente un tuteur, pas un robot. */
.assistant-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--primary), var(--primary-600));
  color: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
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
