<template>
  <div class="notes-page">
    <!-- Top bar -->
    <div class="topbar">
      <v-btn icon class="back-btn" @click="$emit('back')" aria-label="Retour">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>

      <div class="topbar-title">
        <div class="title">Notes</div>
        <div class="subtitle">
          Cliquez sur un semestre pour afficher/masquer les notes.
        </div>
      </div>

      <v-btn icon class="refresh-btn" @click="fetchNotes" :loading="loading" aria-label="Rafraîchir">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </div>

    <!-- Content -->
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
      <v-card v-else-if="!semestres.length" class="empty-card" variant="outlined">
        <v-card-text class="empty-content">
          <div class="empty-icon">
            <v-icon size="42">mdi-calendar-remove-outline</v-icon>
          </div>
          <div class="empty-title">Aucun semestre disponible</div>
          <div class="empty-subtitle">Vérifiez l’année scolaire ou réessayez.</div>

          <v-btn class="btn-primary mt-4" @click="fetchNotes">
            <v-icon left>mdi-refresh</v-icon>
            Rafraîchir
          </v-btn>
        </v-card-text>
      </v-card>

      <!-- Semesters -->
      <div v-else class="semestres-wrap">
        <div class="semestres-head">
          <div class="meta">
            <v-icon size="18">mdi-calendar</v-icon>
            <span>
              {{ semestres.length }} semestre{{ semestres.length > 1 ? "s" : "" }}
            </span>
          </div>

          <v-chip class="chip-year" size="small" label v-if="anneeScolaire">
            <v-icon start size="16">mdi-school</v-icon>
            {{ anneeScolaire }}
          </v-chip>
        </div>

        <div
          v-for="semestre in semestres"
          :key="semestre.id"
          class="semestre-card"
          :class="{ open: selectedSemestre === semestre.id }"
        >
          <!-- Header semestre -->
          <button class="semestre-header" @click="toggleSemestre(semestre.id)">
            <div class="semestre-left">
              <div class="semestre-icon">
                <v-icon size="20">mdi-calendar-outline</v-icon>
              </div>

              <div class="semestre-info">
                <div class="semestre-name">{{ semestre.nom }}</div>
                <div class="semestre-sub">
                  <span class="dot">•</span>
                  <span>
                    {{
                      (notesBySemestre?.[semestre.id]?.notes?.length || 0) +
                      " matière" +
                      ((notesBySemestre?.[semestre.id]?.notes?.length || 0) > 1 ? "s" : "")
                    }}
                  </span>
                </div>
              </div>
            </div>

            <div class="semestre-right">
              <v-chip
                v-if="selectedSemestre === semestre.id"
                class="chip-open"
                size="small"
                label
              >
                OUVERT
              </v-chip>
              <v-icon class="chev" :class="{ rot: selectedSemestre === semestre.id }">
                mdi-chevron-down
              </v-icon>
            </div>
          </button>

          <!-- Table -->
          <div
            v-if="selectedSemestre === semestre.id && notesBySemestre[semestre.id]"
            class="table-shell"
          >
            <div class="table-scroll">
              <table class="notes-table">
                <thead>
                  <tr>
                    <th class="th-sticky-left">Matière</th>
                    <th>Inter1</th>
                    <th>Inter2</th>
                    <th>Inter3</th>
                    <th>Inter4</th>
                    <th>Moy Inter</th>
                    <th>Dev1</th>
                    <th>Dev2</th>
                    <th>Moy</th>
                    <th>Moy Coef</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="note in notesBySemestre[semestre.id].notes"
                    :key="note.matiere"
                  >
                    <td class="td-sticky-left">
                      <span class="matiere">{{ note.matiere }}</span>
                    </td>

                    <td>{{ safe(note.inter1) }}</td>
                    <td>{{ safe(note.inter2) }}</td>
                    <td>{{ safe(note.inter3) }}</td>
                    <td>{{ safe(note.inter4) }}</td>
                    <td class="cell-strong">{{ safe(note.moyInter) }}</td>
                    <td>{{ safe(note.dev1) }}</td>
                    <td>{{ safe(note.dev2) }}</td>
                    <td class="cell-strong">{{ safe(note.moy) }}</td>
                    <td class="cell-strong">{{ safe(note.moycoef) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="table-hint">
              <v-icon size="16">mdi-swap-horizontal</v-icon>
              Faites glisser horizontalement pour voir toutes les colonnes.
            </div>
          </div>
        </div>
      </div>
    </v-container>
  </div>
</template>

<script>
import axios from "axios";

export default {
  props: {
    childId: { type: Number, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
  },
  data() {
    return {
      notesBySemestre: {},
      semestres: [],
      selectedSemestre: null,
      loading: true,
      error: null,
    };
  },
  async created() {
    await this.fetchNotes();
  },
  methods: {
    safe(v) {
      return v === null || v === undefined || v === "" ? "—" : v;
    },

    async fetchNotes() {
      try {
        this.error = null;
        this.loading = true;

        const response = await axios.get("http://localhost:8080/api/eleve-notes", {
          params: {
            childId: this.childId,
            anneeScolaireId: this.anneeScolaireId,
          },
        });

        const rawData = response.data || {};
        const processedData = {};

        for (const [semestreId, semestreData] of Object.entries(rawData)) {
          const notesArr = Array.isArray(semestreData?.notes) ? semestreData.notes : [];

          processedData[semestreId] = {
            semestre: semestreData?.semestre ?? `Semestre ${semestreId}`,
            notes: notesArr.reduce((acc, note) => {
              const mat = note?.matiere ?? "Matière";
              if (!acc[mat]) {
                acc[mat] = {
                  matiere: mat,
                  inter1: note?.inter1,
                  inter2: note?.inter2,
                  inter3: note?.inter3,
                  inter4: note?.inter4,
                  moyInter: note?.moyInter,
                  dev1: note?.dev1,
                  dev2: note?.dev2,
                  moy: note?.moy,
                  moycoef: note?.moycoef,
                };
              } else {
                // fusion si doublons
                acc[mat].inter1 = acc[mat].inter1 ?? note?.inter1;
                acc[mat].inter2 = acc[mat].inter2 ?? note?.inter2;
                acc[mat].inter3 = acc[mat].inter3 ?? note?.inter3;
                acc[mat].inter4 = acc[mat].inter4 ?? note?.inter4;
                acc[mat].moyInter = acc[mat].moyInter ?? note?.moyInter;
                acc[mat].dev1 = acc[mat].dev1 ?? note?.dev1;
                acc[mat].dev2 = acc[mat].dev2 ?? note?.dev2;
                acc[mat].moy = acc[mat].moy ?? note?.moy;
                acc[mat].moycoef = acc[mat].moycoef ?? note?.moycoef;
              }
              return acc;
            }, {}),
          };

          processedData[semestreId].notes = Object.values(processedData[semestreId].notes);
        }

        this.notesBySemestre = processedData;

        // ordre stable
        this.semestres = Object.keys(this.notesBySemestre).map((key) => ({
          id: key,
          nom: this.notesBySemestre[key].semestre,
        }));

        // si aucun
        if (!this.semestres.length) this.selectedSemestre = null;
      } catch (err) {
        this.error = "Erreur lors de la récupération des données. Veuillez réessayer plus tard.";
        console.error("Erreur lors de la récupération des données:", err);
      } finally {
        this.loading = false;
      }
    },

    toggleSemestre(semestreId) {
      this.selectedSemestre = this.selectedSemestre === semestreId ? null : semestreId;
    },
  },
};
</script>

<style scoped>
/* ===== Page (charte bleue) ===== */
.notes-page {
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
  line-height: 1.1rem;
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

/* ===== Semestres ===== */
.semestres-wrap {
  max-width: 980px;
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
  font-weight: 700;
  font-size: 0.9rem;
}

.chip-year {
  border-radius: 999px;
  font-weight: 800;
  background: rgba(37, 99, 235, 0.08);
  color: var(--primary-600);
  border: 1px solid rgba(37, 99, 235, 0.18);
}

/* Card semestre */
.semestre-card {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 18px;
  box-shadow: 0 10px 40px rgba(11, 46, 74, 0.08);
  overflow: hidden;
  margin: 10px 0;
}

.semestre-header {
  width: 100%;
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 14px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
}

.semestre-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
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

.semestre-info {
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
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 0.84rem;
  font-weight: 700;
}

.dot {
  opacity: 0.5;
}

.semestre-right {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.chip-open {
  border-radius: 999px;
  font-weight: 900;
  background: rgba(22, 163, 74, 0.10);
  color: #166534;
  border: 1px solid rgba(22, 163, 74, 0.22);
}

.chev {
  transition: transform 0.18s ease;
  color: var(--primary-600);
}
.chev.rot {
  transform: rotate(180deg);
}

/* ===== Table ===== */
.table-shell {
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  padding: 0 0 10px;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding: 10px 10px 0;
}

.notes-table {
  width: 100%;
  min-width: 860px; /* important pour scroll sur mobile */
  border-collapse: separate;
  border-spacing: 0;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  overflow: hidden;
}

.notes-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.14), rgba(37, 99, 235, 0.08));
  color: var(--text);
  font-weight: 900;
  font-size: 0.86rem;
  padding: 10px 10px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.10);
  white-space: nowrap;
}

.notes-table tbody td {
  padding: 10px 10px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  color: var(--text);
  font-weight: 700;
  font-size: 0.9rem;
  text-align: center;
  white-space: nowrap;
}

.notes-table tbody tr:last-child td {
  border-bottom: 0;
}

.matiere {
  font-weight: 950;
}

.cell-strong {
  font-weight: 950;
}

/* sticky first column on scroll */
.th-sticky-left,
.td-sticky-left {
  position: sticky;
  left: 0;
  z-index: 3;
  text-align: left !important;
  background: #fff;
}
.th-sticky-left {
  z-index: 4;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.14), rgba(37, 99, 235, 0.08));
}
.td-sticky-left {
  border-right: 1px solid rgba(15, 23, 42, 0.06);
}

.table-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-weight: 700;
  font-size: 0.82rem;
  padding: 8px 14px 0;
}

/* ===== Mobile tweaks ===== */
@media (max-width: 600px) {
  .content {
    padding: 12px 8px 16px;
  }

  .semestres-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .semestre-header {
    padding: 12px 12px;
  }

  .semestre-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
  }

  .semestre-name {
    font-size: 0.95rem;
  }

  .semestre-sub {
    font-size: 0.8rem;
  }

  .notes-table {
    min-width: 820px;
  }

  .notes-table thead th,
  .notes-table tbody td {
    padding: 9px 9px;
    font-size: 0.86rem;
  }
}

@media (max-width: 360px) {
  .title {
    font-size: 1rem;
  }
  .subtitle {
    font-size: 0.82rem;
  }
  .notes-table thead th,
  .notes-table tbody td {
    font-size: 0.84rem;
    padding: 8px 8px;
  }
}
</style>
