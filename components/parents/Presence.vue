<template>
  <div class="presence-page">
    <!-- Topbar -->
    <div class="topbar">
      <v-btn icon class="back-btn" @click="$emit('back')" aria-label="Retour">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>

      <div class="topbar-title">
        <div class="title">Présences</div>
        <div class="subtitle">
          Année : <span class="sub-strong">{{ anneeScolaire }}</span>
        </div>
      </div>

      <v-btn
        icon
        class="refresh-btn"
        @click="fetchIncidentsData"
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

      <!-- Empty state -->
      <v-card v-else-if="presenceData.length === 0" class="empty-card" variant="outlined">
        <v-card-text class="empty-content">
          <div class="empty-icon">
            <v-icon size="42">mdi-calendar-remove-outline</v-icon>
          </div>
          <div class="empty-title">Aucune présence disponible</div>
          <div class="empty-subtitle">Les présences ne sont pas encore disponibles cette année.</div>

          <v-btn class="btn-primary mt-4" @click="fetchIncidentsData">
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
              <v-icon start size="16">mdi-alert-circle-outline</v-icon>
              {{ totalAbsences }} absence{{ totalAbsences > 1 ? "s" : "" }}
            </v-chip>

            <v-chip class="chip-soft" size="small" label>
              <v-icon start size="16">mdi-text-box-edit-outline</v-icon>
              {{ modifiedCount }} modification{{ modifiedCount > 1 ? "s" : "" }}
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
                  <v-icon size="20">mdi-calendar-outline</v-icon>
                </div>

                <div class="semestre-text">
                  <div class="semestre-name">{{ semestre }}</div>
                  <div class="semestre-sub">
                    {{ filteredPresence(semestre).length }} séance{{
                      filteredPresence(semestre).length > 1 ? "s" : ""
                    }}
                    <span class="dot">•</span>
                    {{ absencesBySemestre(semestre) }} absence{{
                      absencesBySemestre(semestre) > 1 ? "s" : ""
                    }}
                  </div>
                </div>
              </div>
            </v-expansion-panel-title>

            <v-expansion-panel-text class="semestre-body">
              <!-- Table -->
              <div class="table-shell">
                <div class="table-scroll">
                  <v-data-table
                    :headers="headers"
                    :items="filteredPresence(semestre)"
                    item-key="id"
                    class="presence-table"
                    density="compact"
                    :mobile-breakpoint="0"
                    :items-per-page="10"
                  >
                    <template #item.date="{ item }">
                      <span class="cell">
                        {{ formaterDate(item.date) }}
                      </span>
                    </template>

                    <template #item.matiere="{ item }">
                      <span class="cell cell-left">
                        {{ item.matiere || "—" }}
                      </span>
                    </template>

                    <template #item.heure="{ item }">
                      <span class="cell">
                        {{ item.heure || "—" }}
                      </span>
                    </template>

                    <template #item.presence="{ item }">
                      <v-chip
                        size="small"
                        label
                        class="chip-status"
                        :class="statusClass(item.presence)"
                      >
                        {{ item.presence || "—" }}
                      </v-chip>
                    </template>

                    <template #item.motif="{ item }">
                      <div class="motif-wrap">
                        <v-textarea
                          v-model="motifDraft[item.id]"
                          label="Motif"
                          rows="1"
                          auto-grow
                          variant="outlined"
                          density="compact"
                          class="motif-textarea"
                          hide-details
                          @update:modelValue="handleMotifChange(item.id, motifDraft[item.id])"
                        />
                        <div v-if="modifiedMotifs[item.id] !== undefined" class="edited-badge">
                          Modifié
                        </div>
                      </div>
                    </template>
                  </v-data-table>
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

    <!-- Actions (sticky bottom on mobile) -->
    <div class="actions-bar">
      <v-btn
        class="btn-primary"
        :disabled="modifiedCount === 0 || sending"
        :loading="sending"
        @click="submitMotifs"
      >
        <v-icon left>mdi-content-save</v-icon>
        Enregistrer
      </v-btn>

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
      selectedPanel: [],
      headers: [
        { title: "Date", value: "date", align: "start", width: "140px" },
        { title: "Matière", value: "matiere", width: "180px" },
        { title: "Heure", value: "heure", width: "110px" },
        { title: "Présence", value: "presence", width: "140px" },
        { title: "Motif", value: "motif", width: "360px" },
      ],
      presenceData: [],
      loading: false,
      sending: false,
      error: null,

      // motifs
      modifiedMotifs: {}, // { [id]: motif }
      motifDraft: {},     // texte affiché dans textarea (pour ne pas muter item direct)

      snackbar: { show: false, message: "", color: "success" },
    };
  },
  computed: {
    modifiedCount() {
      return Object.keys(this.modifiedMotifs).length;
    },
    totalAbsences() {
      const isAbsent = (p) => String(p || "").toLowerCase().includes("abs");
      return this.presenceData.filter((x) => isAbsent(x.presence)).length;
    },
  },
  methods: {
    async fetchIncidentsData() {
      try {
        this.error = null;
        this.loading = true;

        const response = await axios.get("http://localhost:8080/api/presence", {
          params: {
            childId: this.childId,
            anneeScolaireId: this.anneeScolaireId,
          },
        });

        this.presenceData = Array.isArray(response.data) ? response.data : [];

        // Semestres uniques
        const uniqueSemestres = [
          ...new Set(this.presenceData.map((item) => item.semestreNom).filter(Boolean)),
        ];
        this.semestres = uniqueSemestres;

        // init draft motifs (sans casser ton data)
        const nextDraft = {};
        this.presenceData.forEach((item) => {
          if (item?.id != null) nextDraft[item.id] = item.motif ?? "";
        });
        this.motifDraft = nextDraft;

        // reset modifications si reload
        this.modifiedMotifs = {};
      } catch (error) {
        console.error("Erreur lors de la récupération des données de présence :", error);
        this.error = "Erreur lors du chargement des données de présence.";
        this.showSnackbar("Erreur lors du chargement des données de présence", "error");
      } finally {
        this.loading = false;
      }
    },

    filteredPresence(semestre) {
      return this.presenceData.filter((item) => item.semestreNom === semestre);
    },

    absencesBySemestre(semestre) {
      const isAbsent = (p) => String(p || "").toLowerCase().includes("abs");
      return this.filteredPresence(semestre).filter((x) => isAbsent(x.presence)).length;
    },

    formaterDate(date) {
      try {
        return dayjs(date).format("DD/MM/YYYY");
      } catch {
        return "—";
      }
    },

    statusClass(presence) {
      const p = String(presence || "").toLowerCase();
      if (p.includes("present") || p.includes("présent")) return "ok";
      if (p.includes("abs")) return "bad";
      if (p.includes("retard")) return "warn";
      return "neutral";
    },

    handleMotifChange(id, motif) {
      // on garde juste la modif si ça change réellement
      const currentInData =
        this.presenceData.find((x) => x.id === id)?.motif ?? "";

      if (String(motif ?? "") !== String(currentInData ?? "")) {
        this.modifiedMotifs[id] = motif ?? "";
      } else {
        delete this.modifiedMotifs[id];
      }
    },

    async submitMotifs() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          this.$router.push("/login");
          return;
        }

        if (this.modifiedCount === 0) {
          this.showSnackbar("Aucune modification à enregistrer.", "info");
          return;
        }

        this.sending = true;

        const updatePromises = Object.keys(this.modifiedMotifs).map((id) => {
          return axios.post(
            `http://localhost:8080/api/presence/${id}/motif`,
            { motif: this.modifiedMotifs[id] },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        });

        await Promise.all(updatePromises);

        // sync dans presenceData (pour que handleMotifChange recalcul soit cohérent)
        Object.keys(this.modifiedMotifs).forEach((idStr) => {
          const id = Number(idStr);
          const row = this.presenceData.find((x) => x.id === id);
          if (row) row.motif = this.modifiedMotifs[idStr];
        });

        this.showSnackbar("Motifs enregistrés avec succès", "success");
        this.modifiedMotifs = {};
      } catch (error) {
        console.error("Erreur lors de la mise à jour des motifs :", error);
        this.showSnackbar("Erreur lors de la mise à jour des motifs", "error");
      } finally {
        this.sending = false;
      }
    },

    showSnackbar(message, color) {
      this.snackbar.message = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },
  },
  mounted() {
    this.fetchIncidentsData();
  },
};
</script>

<style scoped>
/* ===== Page (charte bleue) ===== */
.presence-page {
  --primary: #2563eb;
  --primary-600: #1d4ed8;
  --primary-50: #eff6ff;
  --text: #0f172a;
  --muted: #64748b;
  --border: rgba(15, 23, 42, 0.10);
  --card: #ffffff;
  --bg: #f6f8fc;

  min-height: 100vh;
  background:
    radial-gradient(1200px 480px at 50% -20%, var(--primary-50), transparent 60%),
    linear-gradient(to bottom, var(--bg), #ffffff 55%);
  padding-bottom: 84px; /* place pour actions-bar */
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
  background: rgba(37, 99, 235, 0.08);
  color: var(--primary-600);
  border: 1px solid rgba(37, 99, 235, 0.18);
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
  border: 1px solid rgba(37, 99, 235, 0.14);
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
  background: rgba(37, 99, 235, 0.10);
  color: var(--primary-600);
  border: 1px solid rgba(37, 99, 235, 0.22);
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

/* ===== Table shell ===== */
.table-shell {
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  padding: 12px 12px 10px;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.presence-table {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  min-width: 980px; /* pour scroll mobile */
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

.cell {
  font-weight: 800;
  color: var(--text);
}
.cell-left {
  text-align: left;
}

/* ===== Motif ===== */
.motif-wrap {
  min-width: 260px;
}
.motif-textarea :deep(textarea) {
  font-size: 0.88rem;
  font-weight: 700;
}
.edited-badge {
  margin-top: 6px;
  display: inline-flex;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 900;
  background: rgba(37, 99, 235, 0.10);
  color: var(--primary-600);
  border: 1px solid rgba(37, 99, 235, 0.20);
}

/* ===== Status chip ===== */
.chip-status {
  border-radius: 999px;
  font-weight: 900;
}
.chip-status.ok {
  background: rgba(22, 163, 74, 0.10);
  color: #166534;
  border: 1px solid rgba(22, 163, 74, 0.22);
}
.chip-status.bad {
  background: rgba(239, 68, 68, 0.10);
  color: #991b1b;
  border: 1px solid rgba(239, 68, 68, 0.22);
}
.chip-status.warn {
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
  border: 1px solid rgba(245, 158, 11, 0.24);
}
.chip-status.neutral {
  background: rgba(100, 116, 139, 0.10);
  color: #334155;
  border: 1px solid rgba(100, 116, 139, 0.20);
}

/* ===== Actions bar ===== */
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

.btn-primary {
  flex: 1;
  border-radius: 14px;
  background: var(--primary);
  color: #fff;
  font-weight: 950;
  text-transform: none;
}
.btn-primary:hover {
  background: var(--primary-600);
}

.btn-secondary {
  flex: 1;
  border-radius: 14px;
  background: rgba(37, 99, 235, 0.08);
  color: var(--primary-600);
  border: 1px solid rgba(37, 99, 235, 0.18);
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

  .presence-table {
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
