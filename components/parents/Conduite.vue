<template>
  <div class="conduite-page">
    <!-- Topbar -->
    <div class="topbar">
      <v-btn icon class="back-btn" @click="$emit('back')" aria-label="Retour">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>

      <div class="topbar-title">
        <div class="title">Conduite</div>
        <div class="subtitle">
          Année : <span class="sub-strong">{{ anneeScolaire }}</span>
        </div>
      </div>

      <v-btn
        icon
        class="refresh-btn"
        @click="fetchIncidents"
        :loading="loading"
        aria-label="Rafraîchir"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </div>

    <v-container fluid class="content">
      <!-- Error -->
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mb-3"
        density="compact"
        border="start"
      >
        {{ error }}
      </v-alert>

      <!-- Loading -->
      <div v-if="loading" class="skeleton-wrap">
        <v-skeleton-loader type="list-item-two-line, list-item-two-line, list-item-two-line" />
      </div>

      <!-- Empty -->
      <v-card v-else-if="incidents.length === 0" class="empty-card" variant="outlined">
        <v-card-text class="empty-content">
          <div class="empty-icon">
            <v-icon size="42">mdi-alert-circle-outline</v-icon>
          </div>
          <div class="empty-title">Aucun incident enregistré</div>
          <div class="empty-subtitle">
            La conduite de l’élève n’a pas encore été renseignée cette année.
          </div>

          <v-btn class="btn-primary mt-4" @click="fetchIncidents">
            <v-icon left>mdi-refresh</v-icon>
            Rafraîchir
          </v-btn>
        </v-card-text>
      </v-card>

      <!-- Semestres -->
      <div v-else class="semestres-wrap">
        <div class="semestres-head">
          <div class="meta">
            <v-icon size="18">mdi-calendar</v-icon>
            <span>{{ semestres.length }} semestre{{ semestres.length > 1 ? "s" : "" }}</span>
          </div>

          <div class="meta-right">
            <v-chip class="chip-soft" size="small" label>
              <v-icon start size="16">mdi-file-document-outline</v-icon>
              {{ incidents.length }} incident{{ incidents.length > 1 ? "s" : "" }}
            </v-chip>

            <v-chip class="chip-soft" size="small" label>
              <v-icon start size="16">mdi-clock-outline</v-icon>
              {{ totalHours }} h
            </v-chip>
          </div>
        </div>

        <v-expansion-panels
          v-model="selectedPanel"
          multiple
          class="semesters-panel"
          elevation="0"
        >
          <v-expansion-panel
            v-for="(semestre, index) in semestres"
            :key="index"
            class="semestre-panel"
          >
            <v-expansion-panel-title class="semestre-title">
              <div class="semestre-title-inner">
                <div class="semestre-icon">
                  <v-icon size="20">mdi-shield-account-outline</v-icon>
                </div>

                <div class="semestre-text">
                  <div class="semestre-name">{{ semestre }}</div>
                  <div class="semestre-sub">
                    {{ filteredIncidents(semestre).length }} incident{{
                      filteredIncidents(semestre).length > 1 ? "s" : ""
                    }}
                    <span class="dot">•</span>
                    {{ hoursBySemestre(semestre) }} h
                  </div>
                </div>
              </div>
            </v-expansion-panel-title>

            <v-expansion-panel-text class="semestre-body">
              <!-- Table -->
              <div class="table-shell">
                <div class="table-scroll">
                  <table class="tableau-conduite">
                    <thead>
                      <tr>
                        <th class="th-sticky-left">Auteur</th>
                        <th>Date</th>
                        <th>Punition</th>
                        <th>Motif</th>
                        <th>Somme d'heures</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr
                        v-for="incident in filteredIncidents(semestre)"
                        :key="incident.id"
                      >
                        <td class="td-sticky-left">
                          <span class="cell-left cell-strong">{{ incident.auteur || "—" }}</span>
                        </td>
                        <td>{{ formaterDate(incident.date) }}</td>
        
                        <td>
                          <span class="pill">
                            {{ incident.punition || "—" }}
                          h</span>
                        </td>
                        <td class="cell-left">
                          {{ incident.motif || "—" }}
                        </td>
                        <td class="cell-strong">
                          {{ safeHours(incident.total_hours) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="table-hint">
                  <v-icon size="16">mdi-swap-horizontal</v-icon>
                  Faites glisser horizontalement pour voir toutes les colonnes.
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </v-container>

    <!-- Actions -->
    <div class="actions-bar">
      <v-btn class="btn-secondary" @click="$emit('back')">
        <v-icon left>mdi-arrow-left</v-icon>
        Retour
      </v-btn>
    </div>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top end">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script>
import axios from "axios";
import dayjs from "dayjs";

export default {
  props: {
    childId: { type: Number, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
  },
  data() {
    return {
      semestres: [],
      incidents: [],
      selectedPanel: [],
      loading: false,
      error: null,
      snackbar: { show: false, message: "", color: "success" },
    };
  },
  computed: {
    totalHours() {
      const sum = this.incidents.reduce((acc, it) => {
        const n = Number(it?.total_hours);
        return acc + (Number.isFinite(n) ? n : 0);
      }, 0);
      return Math.round(sum * 100) / 100;
    },
  },
  methods: {
    safeHours(v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return "—";
      return Math.round(n * 100) / 100;
    },

    showSnackbar(message, color) {
      this.snackbar.message = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },

    async fetchIncidents() {
      try {
        this.error = null;
        this.loading = true;

        const token = localStorage.getItem("token");
        if (!token) {
          this.$router.push("/login");
          return;
        }

        const response = await axios.get("/api/incidents", {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            eleveId: this.childId,
            anneeScolaireId: this.anneeScolaireId,
          },
        });

        this.incidents = Array.isArray(response.data) ? response.data : [];

        // Semestres uniques (filtrer null/undefined)
        this.semestres = [
          ...new Set(this.incidents.map((item) => item.semestreNom).filter(Boolean)),
        ];

        // reset panels
        if (!this.semestres.length) this.selectedPanel = [];

      } catch (error) {
        console.error("Erreur lors de la récupération des incidents :", error);
        this.error = "Erreur lors du chargement des incidents. Veuillez réessayer.";
        this.showSnackbar("Erreur lors du chargement des incidents", "error");
      } finally {
        this.loading = false;
      }
    },

    filteredIncidents(semestre) {
      return this.incidents.filter((item) => item.semestreNom === semestre);
    },

    hoursBySemestre(semestre) {
      const sum = this.filteredIncidents(semestre).reduce((acc, it) => {
        const n = Number(it?.total_hours);
        return acc + (Number.isFinite(n) ? n : 0);
      }, 0);
      return Math.round(sum * 100) / 100;
    },

    formaterDate(date) {
      try {
        return dayjs(date).format("DD/MM/YYYY");
      } catch {
        return "—";
      }
    },
  },
  mounted() {
    this.fetchIncidents();
  },
};
</script>

<style scoped>
/* ===== Page (charte bleue) ===== */
.conduite-page {
  --primary: #0d9488;
  --primary-600: #0b7a70;
  --primary-50: #f0faf9;
  --text: #0f172a;
  --muted: #64748b;
  --border: rgba(15, 23, 42, 0.10);
  --card: #ffffff;
  --bg: #f7f7f5;

  min-height: 100vh;
  background:
    radial-gradient(1200px 480px at 50% -20%, var(--primary-50), transparent 60%),
    linear-gradient(to bottom, var(--bg), #ffffff 55%);
  padding-bottom: 84px; /* place actions */
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
}

.title {
  font-size: 1.05rem;
  font-weight: 900;
  color: var(--text);
  letter-spacing: -0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subtitle {
  font-size: 0.85rem;
  color: var(--muted);
}
.sub-strong {
  color: var(--text);
  font-weight: 900;
}

/* ===== Content ===== */
.content {
  padding: 14px 10px 18px;
}
.skeleton-wrap {
  padding: 6px 6px 0;
}

/* ===== Empty ===== */
.empty-card {
  max-width: 680px;
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
  background: rgba(13, 148, 136, 0.10);
  color: var(--primary-600);
  border: 1px solid rgba(13, 148, 136, 0.22);
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
  font-weight: 950;
  text-transform: none;
}
.btn-primary:hover {
  background: var(--primary-600);
}

/* ===== Semestres header ===== */
.semestres-wrap {
  max-width: 1100px;
  margin: 0 auto;
}

.semestres-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 8px 4px 14px;
}

.meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-weight: 800;
  font-size: 0.9rem;
}

.meta-right {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.chip-soft {
  border-radius: 999px;
  font-weight: 900;
  background: rgba(13, 148, 136, 0.08);
  color: var(--primary-600);
  border: 1px solid rgba(13, 148, 136, 0.18);
}

/* ===== Panels ===== */
.semesters-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.semestre-panel {
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(13, 148, 136, 0.14);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 10px 40px rgba(11, 46, 74, 0.08);
}

.semestre-title {
  padding: 0;
}

.semestre-title-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 14px;
}

.semestre-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(13, 148, 136, 0.10);
  color: var(--primary-600);
  border: 1px solid rgba(13, 148, 136, 0.22);
  flex: 0 0 auto;
}

.semestre-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.semestre-name {
  font-weight: 950;
  color: var(--text);
  letter-spacing: -0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.semestre-sub {
  color: var(--muted);
  font-size: 0.84rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.dot {
  opacity: 0.55;
}

.semestre-body {
  padding-top: 0;
}

/* ===== Table ===== */
.table-shell {
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  padding: 12px 12px 10px;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tableau-conduite {
  width: 100%;
  min-width: 980px; /* scroll sur mobile */
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  overflow: hidden;
}

.tableau-conduite thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: linear-gradient(180deg, rgba(13, 148, 136, 0.14), rgba(13, 148, 136, 0.08));
  color: var(--text);
  font-weight: 950;
  font-size: 0.86rem;
  padding: 10px 10px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.10);
  white-space: nowrap;
  text-align: center;
}

.tableau-conduite tbody td {
  padding: 10px 10px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  color: var(--text);
  font-weight: 800;
  font-size: 0.9rem;
  text-align: center;
  white-space: nowrap;
}

.tableau-conduite tbody tr:last-child td {
  border-bottom: 0;
}

.cell-left {
  text-align: left !important;
  white-space: normal;
}

.cell-strong {
  font-weight: 950;
}

/* sticky first column */
.th-sticky-left,
.td-sticky-left {
  position: sticky;
  left: 0;
  z-index: 3;
  background: #fff;
}
.th-sticky-left {
  z-index: 4;
  background: linear-gradient(180deg, rgba(13, 148, 136, 0.14), rgba(13, 148, 136, 0.08));
}
.td-sticky-left {
  border-right: 1px solid rgba(15, 23, 42, 0.06);
}

/* Punition pill */
.pill {
  display: inline-flex;
  padding: 5px 10px;
  border-radius: 999px;
  font-weight: 900;
  font-size: 0.82rem;
  background: rgba(13, 148, 136, 0.10);
  color: var(--primary-600);
  border: 1px solid rgba(13, 148, 136, 0.22);
}

.table-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-weight: 800;
  font-size: 0.82rem;
  padding: 8px 2px 0;
}

/* ===== Actions ===== */
.actions-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;

  display: flex;
  gap: 10px;
  padding: 12px 12px;
  background: rgba(246, 248, 252, 0.92);
  border-top: 1px solid var(--border);
  backdrop-filter: blur(10px);
}

.btn-secondary {
  flex: 1;
  border-radius: 14px;
  background: rgba(13, 148, 136, 0.08);
  color: var(--primary-600);
  border: 1px solid rgba(13, 148, 136, 0.18);
  font-weight: 950;
  text-transform: none;
}

/* ===== Responsive ===== */
@media (max-width: 600px) {
  .content {
    padding: 12px 8px 16px;
  }

  .semestres-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .semestre-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
  }

  .tableau-conduite {
    min-width: 960px;
  }

  .actions-bar {
    padding: 10px 10px;
  }
}

@media (max-width: 360px) {
  .title {
    font-size: 1rem;
  }
  .subtitle {
    font-size: 0.82rem;
  }
}
</style>
