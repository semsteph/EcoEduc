<template>
  <div class="details-menu">
    <!-- Header -->
    <div class="header">
      <div class="header-title">
        <v-icon size="20" color="primary" class="mr-2">mdi-view-grid-outline</v-icon>
        Actions
      </div>
      <div class="header-sub">
        Choisissez une rubrique pour continuer.
      </div>
    </div>

    <v-container class="pt-2">
      <!-- ✅ wrapper pour centrer le grid -->
      <div class="grid-center">
        <v-row class="cards-row" dense justify="center" align="stretch">
          <!-- xs: 2 colonnes | sm: 2 | md: 3 | lg: 3 (jamais 4) -->
          <v-col
            v-for="detail in details"
            :key="detail.label"
            cols="6"
            sm="6"
            md="4"
            lg="4"
            class="card-col"
          >
            <v-card
              class="label-card"
              elevation="10"
              @click="selectDetail(detail.label)"
              :class="{ active: selectedDetail === detail.label }"
            >
              <div class="card-accent" aria-hidden="true"></div>

              <div class="card-body">
                <div class="card-icon">
                  <v-icon size="20" color="primary">{{ detail.icon }}</v-icon>
                </div>

                <div class="card-title">
                  {{ detail.label }}
                </div>

                <div class="card-hint">
                  Ouvrir
                  <v-icon size="16" class="ml-1">mdi-arrow-right</v-icon>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </v-container>

    <!-- Bouton "Retour" (si un détail est sélectionné) -->
    <div class="text-center mt-4" v-if="selectedDetail">
      <v-btn class="pill" color="primary" variant="tonal" @click="goBack">
        <v-icon start>mdi-arrow-left</v-icon>
        Retour
      </v-btn>
    </div>
  </div>
</template>

<script>
export default {
  emits: ["selectDetail", "goBack"],
  data() {
    return {
      details: [
        { label: "Notes", icon: "mdi-notebook-outline" },
        { label: "Conduite", icon: "mdi-account-check-outline" },
        { label: "Présence", icon: "mdi-calendar-check-outline" },
        { label: "Programme", icon: "mdi-book-open-page-variant-outline" },
        { label: "Scolarité", icon: "mdi-school-outline" },
        { label: "Activité", icon: "mdi-run" },
        { label: "Bulletin", icon: "mdi-file-document-outline" },
        { label: "Demande de Permission", icon: "mdi-file-sign" },
        { label: "Assistances", icon: "mdi-account-voice" },
        { label: "Devoirs", icon: "mdi-notebook-edit-outline" },
      ],
      selectedDetail: null,
    };
  },
  methods: {
    selectDetail(label) {
      this.selectedDetail = label;
      this.$emit("selectDetail", label);
    },
    goBack() {
      this.selectedDetail = null;
      this.$emit("goBack");
    },
  },
};
</script>

<style scoped>
/* ✅ Charte: bleu/blanc + touche sombre */
.details-menu {
  padding-top: 6px;
}

/* Header */
.header {
  padding: 14px 14px 6px;
}
.header-title {
  display: flex;
  align-items: center;
  font-weight: 900;
  color: #0b2e4a;
  letter-spacing: 0.2px;
  font-size: 1.05rem;
}
.header-sub {
  margin-top: 6px;
  color: #455a64;
  font-size: 0.92rem;
  line-height: 1.25rem;
}

/* ✅ centrer le grid */
.grid-center {
  display: flex;
  justify-content: center;
}
.cards-row {
  width: 100%;
  max-width: 1100px;
}

/* Col: hauteur alignée */
.card-col {
  display: flex;
}

/* Card */
.label-card {
  width: 100%;
  border-radius: 18px !important;
  overflow: hidden;
  border: 1px solid rgba(25, 118, 210, 0.12);
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}

.card-accent {
  height: 6px;
  width: 100%;
  background: linear-gradient(90deg, #1976d2, rgba(25,118,210,0.22), #1976d2);
}

.card-body {
  min-height: 96px;
  padding: 14px 14px 12px;
  display: grid;
  gap: 8px;
  align-content: center;
  justify-items: center;
  text-align: center;
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(25, 118, 210, 0.08);
  border: 1px solid rgba(25, 118, 210, 0.12);
}

.card-title {
  font-weight: 900;
  color: #0b2e4a;
  font-size: 0.98rem;
  line-height: 1.2rem;
}

.card-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  color: #1976d2;
  opacity: 0.95;
  font-size: 0.9rem;
}

/* hover + active */
.label-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 55px rgba(11, 46, 74, 0.16) !important;
  border-color: rgba(25, 118, 210, 0.22);
}
.label-card.active {
  border-color: rgba(25, 118, 210, 0.45);
  box-shadow: 0 18px 60px rgba(25, 118, 210, 0.18) !important;
}

/* Bouton */
.pill {
  border-radius: 999px !important;
  font-weight: 900;
  text-transform: none;
}

/* ✅ petits téléphones */
@media (max-width: 420px) {
  .header {
    padding: 12px 10px 4px;
  }
  .card-body {
    min-height: 88px;
    padding: 12px 10px;
  }
  .card-title {
    font-size: 0.94rem;
  }
}
</style>
