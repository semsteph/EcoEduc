<template>
  <v-container fluid class="programme-page pa-0">
    <!-- Top bar -->
    <v-sheet class="topbar" elevation="0">
      <div class="topbar__inner">
        <v-btn icon @click="$emit('back')" class="icon-btn" aria-label="Retour">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>

        <div class="titles">
          <h1 class="title">Programme de l'élève</h1>
          <div class="subtitle">Emploi du temps par jour et matière</div>
        </div>

        <!-- spacer right to keep title centered-ish -->
        <div class="topbar__right" />
      </div>
    </v-sheet>

    <v-container fluid class="content pa-3 pa-sm-4">
      <!-- Loading / Error -->
      <v-alert
        v-if="error"
        type="error"
        border="start"
        class="mb-4"
        dense
        prominent
      >
        {{ error }}
      </v-alert>

      <v-skeleton-loader
        v-if="loading"
        type="table"
        class="mb-4"
      />

      <!-- Desktop / tablet table -->
      <v-card
        v-if="!loading && !isMobile"
        class="card"
        elevation="10"
      >
        <v-card-title class="card__title">
          <v-icon class="mr-2" color="primary">mdi-calendar-clock</v-icon>
          <span>Vue tableau</span>
        </v-card-title>

        <v-divider />

        <div class="table-wrap">
          <v-simple-table class="tableau-programme">
            <thead>
              <tr>
                <th class="sticky-col head-col">Jours</th>
                <th v-for="matiere in matieres" :key="matiere" class="head-cell">
                  {{ matiere }}
                </th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="jour in jours" :key="jour">
                <td class="sticky-col day-cell">
                  <div class="day-pill">
                    <v-icon small class="mr-1" color="primary">mdi-calendar</v-icon>
                    <span>{{ jour }}</span>
                  </div>
                </td>

                <td v-for="matiere in matieres" :key="matiere" class="cell">
                  <div class="slots">
                    <template v-if="getHoraires(jour, matiere).length">
                      <div
                        v-for="horaire in getHoraires(jour, matiere)"
                        :key="horaire"
                        class="slot"
                      >
                        <v-icon x-small class="mr-1" color="primary">mdi-clock-outline</v-icon>
                        <span>{{ horaire }}</span>
                      </div>
                    </template>
                    <div v-else class="empty">—</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </v-simple-table>
        </div>

        <v-divider />

        <v-card-actions class="pa-3">
          <v-spacer />
          <v-btn color="primary" class="btn" @click="$emit('back')">
            <v-icon left>mdi-arrow-left</v-icon>
            Retour
          </v-btn>
        </v-card-actions>
      </v-card>

      <!-- Mobile cards -->
      <div v-if="!loading && isMobile" class="mobile">
        <v-card class="card mb-3" elevation="10">
          <v-card-title class="card__title">
            <v-icon class="mr-2" color="primary">mdi-view-agenda</v-icon>
            <span>Vue mobile</span>
          </v-card-title>
          <v-card-subtitle class="pb-0">
            Chaque jour est affiché sous forme de carte.
          </v-card-subtitle>
        </v-card>

        <v-card
          v-for="jour in jours"
          :key="jour"
          class="card mb-3"
          elevation="10"
        >
          <v-card-title class="day-header">
            <div class="day-pill">
              <v-icon small class="mr-1" color="primary">mdi-calendar</v-icon>
              <span>{{ jour }}</span>
            </div>
          </v-card-title>

          <v-divider />

          <v-card-text class="pt-3">
            <div
              v-for="matiere in matieres"
              :key="matiere"
              class="row"
            >
              <div class="row__label">
                <v-icon small class="mr-1" color="primary">mdi-book-open-page-variant</v-icon>
                <span class="matiere">{{ matiere }}</span>
              </div>

              <div class="row__value">
                <template v-if="getHoraires(jour, matiere).length">
                  <div
                    v-for="horaire in getHoraires(jour, matiere)"
                    :key="horaire"
                    class="slot"
                  >
                    <v-icon x-small class="mr-1" color="primary">mdi-clock-outline</v-icon>
                    <span>{{ horaire }}</span>
                  </div>
                </template>
                <div v-else class="empty">Aucun horaire</div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-btn block color="primary" class="btn" @click="$emit('back')">
          <v-icon left>mdi-arrow-left</v-icon>
          Retour
        </v-btn>
      </div>

      <!-- Empty state -->
      <v-card
        v-if="!loading && !error && isEmpty"
        class="card mt-4"
        elevation="10"
      >
        <v-card-text class="text-center py-8">
          <v-icon size="40" color="primary" class="mb-2">mdi-calendar-remove</v-icon>
          <div class="empty-title">Aucun programme trouvé</div>
          <div class="empty-subtitle">Vérifie que l’élève a bien un emploi du temps.</div>

          <v-btn color="primary" class="btn mt-4" @click="$emit('back')">
            <v-icon left>mdi-arrow-left</v-icon>
            Retour
          </v-btn>
        </v-card-text>
      </v-card>
    </v-container>
  </v-container>
</template>

<script>
export default {
  name: "ProgrammeEleve",
  props: {
    childId: { type: Number, required: true },
  },
  data() {
    return {
      jours: [],
      matieres: [],
      programme: {},
      loading: false,
      error: null,
    };
  },
  computed: {
    isMobile() {
      // Vuetify 2: $vuetify.breakpoint
      return this.$vuetify && this.$vuetify.breakpoint
        ? this.$vuetify.breakpoint.smAndDown
        : false;
    },
    isEmpty() {
      return (
        Array.isArray(this.jours) &&
        Array.isArray(this.matieres) &&
        this.jours.length === 0 &&
        this.matieres.length === 0
      );
    },
  },
  mounted() {
    this.recupererProgramme();
  },
  methods: {
    async recupererProgramme() {
      this.loading = true;
      this.error = null;

      try {
        const res = await fetch(`http://localhost:8080/api/programme/${this.childId}`);
        if (!res.ok) throw new Error(`Erreur API (${res.status})`);
        const data = await res.json();

        // Sécurisation (au cas où l'API renvoie null/undefined)
        this.jours = Array.isArray(data?.jours) ? data.jours : [];
        this.matieres = Array.isArray(data?.matieres) ? data.matieres : [];
        this.programme = data?.programme && typeof data.programme === "object" ? data.programme : {};
      } catch (e) {
        console.error("Erreur lors de la récupération du programme:", e);
        this.error = "Impossible de charger le programme. Réessaie plus tard.";
      } finally {
        this.loading = false;
      }
    },
    getHoraires(jour, matiere) {
      const slots = this.programme?.[jour]?.[matiere];
      return Array.isArray(slots) ? slots : [];
    },
  },
};
</script>

<style scoped>
/* Respect charte: on s'appuie sur primary de Vuetify + surfaces propres */
.programme-page {
  min-height: 100vh;
  background: #f6f8fc;
}

/* Topbar */
.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.topbar__inner {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
}
.icon-btn {
  background: rgba(0, 0, 0, 0.03);
}
.titles {
  text-align: center;
}
.title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #111827;
  line-height: 1.2;
}
.subtitle {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}
.topbar__right {
  width: 44px;
  height: 44px;
}

/* Cards */
.card {
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
}
.card__title {
  font-weight: 800;
  color: #111827;
}

/* Table wrapper: responsive + scroll horizontal */
.table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Table */
.tableau-programme {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 720px; /* force un scroll horizontal sur petits écrans (en mode table) */
}
.tableau-programme thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f3f6ff;
  color: #111827;
  font-weight: 800;
  font-size: 13px;
  padding: 12px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.tableau-programme td {
  padding: 12px 10px;
  vertical-align: top;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;
}

/* Sticky first column */
.sticky-col {
  position: sticky;
  left: 0;
  z-index: 3;
  background: #fff;
}
.head-col {
  z-index: 4;
  background: #f3f6ff !important;
}
.day-cell {
  min-width: 160px;
}

/* Day pill */
.day-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.035);
  font-weight: 800;
  color: #111827;
  font-size: 13px;
}

/* Slots */
.slots {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.slot {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(25, 118, 210, 0.08); /* proche du primary (Vuetify) */
  color: #111827;
  font-weight: 700;
  font-size: 12px;
  line-height: 1.1;
}
.empty {
  color: #9ca3af;
  font-weight: 700;
  font-size: 12px;
}

/* Mobile layout */
.mobile .day-header {
  padding-top: 14px;
  padding-bottom: 10px;
}
.row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.08);
}
.row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}
.row__label {
  display: inline-flex;
  align-items: center;
  font-weight: 900;
  color: #111827;
}
.matiere {
  font-size: 13px;
}
.row__value {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Buttons */
.btn {
  border-radius: 14px;
  font-weight: 800;
  text-transform: none;
}

/* Empty state */
.empty-title {
  font-weight: 900;
  color: #111827;
  font-size: 16px;
}
.empty-subtitle {
  color: #6b7280;
  font-size: 13px;
  margin-top: 4px;
}

/* Small screens tweaks */
@media (max-width: 360px) {
  .title {
    font-size: 16px;
  }
  .subtitle {
    font-size: 11px;
  }
}
</style>
