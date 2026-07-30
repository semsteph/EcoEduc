<template>
  <div class="page">
    <!-- Top bar -->
    <div class="topbar">
      <v-btn
        variant="tonal"
        color="primary"
        class="back-btn"
        @click="$emit('back')"
      >
        <v-icon start>mdi-arrow-left</v-icon>
        Retour
      </v-btn>

      <div class="titles">
        <div class="title">
          <v-icon class="mr-2" color="primary">mdi-account-alert</v-icon>
          Liste des absents
        </div>
        <div class="subtitle">
          Dernier cours enregistré
          <span v-if="classeId" class="dot">•</span>
          <span v-if="classeId">Classe #{{ classeId }}</span>
          <span v-if="subjectId" class="dot">•</span>
          <span v-if="subjectId">Matière #{{ subjectId }}</span>
        </div>
      </div>

      <div class="spacer" />

      <v-chip
        v-if="anneeScolaire"
        class="chip"
        color="primary"
        variant="tonal"
        label
      >
        <v-icon start size="18">mdi-calendar</v-icon>
        {{ anneeScolaire }}
      </v-chip>
    </div>

    <!-- Content -->
    <v-card class="card" elevation="10">
      <v-card-text class="card-body">
        <!-- Loading -->
        <div v-if="loading" class="state">
          <v-progress-circular indeterminate color="primary" size="42" />
          <div class="state-text">Chargement des données…</div>
        </div>

        <!-- Error -->
        <v-alert
          v-else-if="error"
          type="error"
          variant="tonal"
          border="start"
          class="mb-0"
        >
          <div class="d-flex align-center justify-space-between flex-wrap ga-3">
            <div>{{ error }}</div>
            <v-btn color="primary" variant="flat" @click="fetchAbsents">
              <v-icon start>mdi-refresh</v-icon>
              Réessayer
            </v-btn>
          </div>
        </v-alert>

        <!-- Empty -->
        <v-alert
          v-else-if="absents.length === 0"
          type="info"
          variant="tonal"
          border="start"
          class="mb-0"
        >
          <div class="d-flex align-center ga-2">
            <v-icon>mdi-check-circle-outline</v-icon>
            <span>Aucun élève absent à la dernière date renseignée.</span>
          </div>
        </v-alert>

        <!-- Table -->
        <div v-else>
          <div class="meta">
            <v-chip color="primary" variant="tonal" label>
              <v-icon start size="18">mdi-account-multiple</v-icon>
              {{ absents.length }} absent{{ absents.length > 1 ? "s" : "" }}
            </v-chip>

            <div class="search-wrap">
              <v-text-field
                v-model="search"
                density="compact"
                variant="outlined"
                hide-details
                clearable
                class="search"
                color="primary"
                prepend-inner-icon="mdi-magnify"
                label="Rechercher (nom, prénom, motif)"
              />
            </div>
          </div>

          <v-data-table
            :headers="headers"
            :items="filteredAbsents"
            :items-per-page="10"
            class="table"
            density="compact"
            hover
          >
            <template #item.nom="{ item }">
              <div class="cell-strong">{{ item.nom }}</div>
            </template>

            <template #item.prenom="{ item }">
              <div class="cell">{{ item.prenom }}</div>
            </template>

            <template #item.motif="{ item }">
              <div class="motif">
                <v-icon
                  size="18"
                  class="mr-2"
                  color="primary"
                  v-if="item.motif"
                >
                  mdi-text
                </v-icon>
                <span class="cell">
                  {{ item.motif || "—" }}
                </span>
              </div>
            </template>

            <template #bottom>
              <!-- pagination native -->
            </template>
          </v-data-table>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "PresencesPrecedantes",
  props: {
    subjectId: { type: Number, required: true },
    classeId: { type: Number, required: true },
    etablissementId: { type: Number, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
  },
  data() {
    return {
      absents: [],
      loading: false,
      error: null,
      search: "",
      headers: [
        { title: "Nom", key: "nom", sortable: true },
        { title: "Prénom", key: "prenom", sortable: true },
        { title: "Motif", key: "motif", sortable: false },
      ],
    };
  },
  computed: {
    filteredAbsents() {
      const q = (this.search || "").trim().toLowerCase();
      if (!q) return this.absents;

      return this.absents.filter((e) => {
        const nom = (e.nom || "").toLowerCase();
        const prenom = (e.prenom || "").toLowerCase();
        const motif = (e.motif || "").toLowerCase();
        return nom.includes(q) || prenom.includes(q) || motif.includes(q);
      });
    },
  },
  methods: {
    async fetchAbsents() {
      this.loading = true;
      this.error = null;

      try {
        const response = await axios.get(`/api/absents`, {
          params: {
            classeId: this.classeId,
            etablissementId: this.etablissementId,
            anneeScolaireId: this.anneeScolaireId,
          },
        });

        this.absents = Array.isArray(response.data) ? response.data : [];
      } catch (err) {
        console.error("Erreur lors du chargement des absents :", err);
        this.error = "Impossible de récupérer les données. Veuillez réessayer.";
      } finally {
        this.loading = false;
      }
    },
  },
  mounted() {
    this.fetchAbsents();
  },
};
</script>

<style scoped>
/* Charte: bleu / blanc / petit noir */
:root {
  --blue: #1976d2;
  --blue-dark: #0b2e4a;
  --black-soft: rgba(0, 0, 0, 0.55);
  --border: rgba(25, 118, 210, 0.15);
  --bg: rgba(255, 255, 255, 0.92);
}

/* Page layout */
.page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px;
}

/* Top bar */
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.back-btn {
  border-radius: 14px !important;
  font-weight: 800;
}

.titles {
  min-width: 220px;
}

.title {
  display: flex;
  align-items: center;
  font-weight: 950;
  color: var(--blue-dark);
  font-size: 1.15rem;
  line-height: 1.2;
}

.subtitle {
  margin-top: 2px;
  color: var(--black-soft);
  font-weight: 600;
  font-size: 0.92rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.dot {
  opacity: 0.6;
}

.spacer {
  flex: 1;
}

.chip {
  border-radius: 999px !important;
  font-weight: 800;
}

/* Card */
.card {
  border-radius: 18px !important;
  background: var(--bg);
  border: 1px solid var(--border);
  box-shadow: 0 18px 60px rgba(11, 46, 74, 0.10) !important;
}

.card-body {
  padding: 16px !important;
}

/* States */
.state {
  display: grid;
  place-items: center;
  padding: 28px 10px;
  gap: 10px;
}

.state-text {
  color: var(--black-soft);
  font-weight: 700;
}

/* Meta row */
.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.search-wrap {
  flex: 1;
  min-width: 240px;
  display: flex;
  justify-content: flex-end;
}

.search {
  width: min(420px, 100%);
}

/* Table */
.table {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

/* Cells */
.cell-strong {
  font-weight: 900;
  color: #0b2e4a;
}

.cell {
  font-weight: 650;
  color: rgba(0, 0, 0, 0.72);
}

.motif {
  display: flex;
  align-items: center;
}

/* Mobile tweaks */
@media (max-width: 600px) {
  .page {
    padding: 10px;
  }
  .card-body {
    padding: 12px !important;
  }
  .title {
    font-size: 1.02rem;
  }
  .subtitle {
    font-size: 0.82rem;
  }
  .search-wrap {
    justify-content: stretch;
  }
}
</style>
