<template>
  <v-container class="ct-page">
    <!-- TOP BAR -->
    <div class="ct-topbar">
      <v-btn class="ct-back" variant="tonal" color="black" @click="$emit('back')">
        <v-icon start>mdi-arrow-left</v-icon>
        <span class="ct-hide-xs">Retour</span>
      </v-btn>

      <div class="ct-title">
        <div class="ct-h1">
          <v-icon class="mr-2" color="white">mdi-notebook-outline</v-icon>
          Cahier de Texte
        </div>
        <div class="ct-sub ct-hide-sm">
          Gérez vos activités par semestre (ajout, consultation, masquage).
        </div>
      </div>

      <div class="ct-spacer" />

      <!-- Desktop add -->
      <v-btn class="ct-add ct-hide-sm" color="primary" @click="openAddActivityDialog">
        <v-icon start>mdi-plus</v-icon>
        Ajouter
      </v-btn>
    </div>

    <!-- SEMESTERS -->
    <v-card class="ct-card" elevation="8">
      <div class="ct-card-head">
        <div class="ct-card-head-title">
          <v-icon class="mr-2" color="white">mdi-timeline-clock-outline</v-icon>
          Semestre
        </div>

        <v-chip class="ct-chip-year" variant="tonal" color="white">
          <v-icon start size="16">mdi-calendar</v-icon>
          {{ anneeScolaire }}
        </v-chip>
      </div>

      <v-card-text class="ct-card-body">
        <div class="ct-sem-row">
          <v-chip
            v-for="semester in semesters"
            :key="semester.id"
            class="ct-sem-chip"
            :class="{ 'ct-sem-chip--active': currentSemester === semester.nom }"
            :color="currentSemester === semester.nom ? 'primary' : 'blue-lighten-5'"
            :variant="currentSemester === semester.nom ? 'flat' : 'tonal'"
            @click="changeSemester(semester.nom)"
          >
            <v-icon start size="16" v-if="currentSemester === semester.nom">mdi-check</v-icon>
            {{ semester.nom }}
          </v-chip>
        </div>

        <v-alert v-if="!semesters.length" type="warning" variant="tonal" class="mt-3">
          Aucun semestre trouvé.
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- TOOLS -->
    <v-card class="ct-card" elevation="8">
      <v-card-text class="ct-tools">
        <v-text-field
          v-model="search"
          variant="outlined"
          density="comfortable"
          color="primary"
          prepend-inner-icon="mdi-magnify"
          label="Rechercher (activité / horaire / date)"
          hide-details
          class="ct-search"
        />

        <div class="ct-tools-right">
          <v-chip class="ct-info-chip" color="blue-lighten-5" variant="flat">
            <v-icon start size="16" color="primary">mdi-format-list-bulleted</v-icon>
            {{ currentActivities.length }} activité(s)
          </v-chip>

          <v-chip class="ct-info-chip" color="blue-lighten-5" variant="flat">
            <v-icon start size="16" color="primary">mdi-timeline-clock-outline</v-icon>
            <span class="ct-truncate">{{ currentSemester || "—" }}</span>
          </v-chip>

          <!-- Mobile add -->
          <v-btn class="ct-add-mobile ct-show-xs" color="primary" @click="openAddActivityDialog">
            <v-icon start>mdi-plus</v-icon>
            Ajouter
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- DESKTOP TABLE -->
    <v-card class="ct-card ct-table-wrap ct-hide-xs" elevation="10">
      <div class="ct-card-head ct-card-head--alt">
        <div class="ct-card-head-title">
          <v-icon class="mr-2" color="white">mdi-table</v-icon>
          Activités
        </div>
      </div>

      <v-data-table
        :headers="tableHeaders"
        :items="filteredActivities"
        item-key="id"
        class="ct-table"
        density="comfortable"
        :items-per-page="itemsPerPage"
      >
        <template #item.dateFormatted="{ item }">
          <div class="ct-date">
            <v-icon size="16" color="primary" class="mr-1">mdi-calendar</v-icon>
            {{ item.dateFormatted }}
          </div>
        </template>

        <template #item.horaire="{ item }">
          <v-chip variant="tonal" color="primary" class="ct-hours-chip" label>
            <v-icon start size="16">mdi-clock-outline</v-icon>
            {{ item.horaire || item.hours || "—" }}
          </v-chip>
        </template>

        <template #item.activite="{ item }">
          <div class="ct-activity">
            {{ item.activite || item.activity || "—" }}
          </div>
        </template>

        <template #item.actions="{ item }">
          <v-btn color="error" variant="tonal" @click="openHideActivityDialog(item)">
            <v-icon start>mdi-eye-off</v-icon>
            Masquer
          </v-btn>
        </template>

        <template #no-data>
          <div class="ct-empty">
            <v-icon size="22" color="primary" class="mr-2">mdi-information-outline</v-icon>
            Aucune activité trouvée.
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- MOBILE CARDS -->
    <v-card class="ct-card ct-show-xs" elevation="10">
      <div class="ct-card-head ct-card-head--alt">
        <div class="ct-card-head-title">
          <v-icon class="mr-2" color="white">mdi-format-list-bulleted</v-icon>
          Activités
        </div>
      </div>

      <v-card-text class="ct-mobile-list">
        <div v-if="filteredActivities.length === 0" class="ct-empty-mobile">
          <v-icon size="22" color="primary" class="mr-2">mdi-information-outline</v-icon>
          Aucune activité trouvée.
        </div>

        <v-card
          v-for="act in pagedMobileActivities"
          :key="act.id"
          class="ct-mobile-card"
          elevation="0"
        >
          <div class="ct-mobile-head">
            <div class="ct-mobile-date">
              <v-icon size="16" color="primary" class="mr-1">mdi-calendar</v-icon>
              {{ act.dateFormatted }}
            </div>

            <v-chip variant="tonal" color="primary" class="ct-hours-chip" label>
              <v-icon start size="16">mdi-clock-outline</v-icon>
              {{ act.horaire || act.hours || "—" }}
            </v-chip>
          </div>

          <div class="ct-mobile-activity">
            {{ act.activite || act.activity || "—" }}
          </div>

          <div class="ct-mobile-actions">
            <v-btn color="error" variant="tonal" block @click="openHideActivityDialog(act)">
              <v-icon start>mdi-eye-off</v-icon>
              Masquer
            </v-btn>
          </div>
        </v-card>

        <!-- Mobile pagination -->
        <div v-if="mobileTotalPages > 1" class="ct-mobile-pager">
          <v-btn variant="tonal" color="primary" :disabled="mobilePage === 1" @click="mobilePage--">
            <v-icon start>mdi-chevron-left</v-icon>
            Préc.
          </v-btn>

          <div class="ct-page-indicator">
            Page {{ mobilePage }} / {{ mobileTotalPages }}
          </div>

          <v-btn
            variant="tonal"
            color="primary"
            :disabled="mobilePage === mobileTotalPages"
            @click="mobilePage++"
          >
            Suiv.
            <v-icon end>mdi-chevron-right</v-icon>
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- BOTTOM BAR (mobile) -->
    <div class="ct-bottom-bar ct-show-xs">
      <v-btn variant="tonal" color="black" class="ct-bottom-btn" @click="$emit('back')">
        <v-icon start>mdi-arrow-left</v-icon>
        Retour
      </v-btn>

      <div class="ct-spacer" />

      <v-btn color="primary" class="ct-bottom-btn" @click="openAddActivityDialog">
        <v-icon start>mdi-plus</v-icon>
        Ajouter
      </v-btn>
    </div>

    <!-- Dialog: ajouter activité (SANS ids visibles) -->
    <v-dialog v-model="dialog" max-width="620" persistent>
      <v-card class="ct-dialog">
        <div class="ct-dialog-head">
          <div class="ct-dialog-title">
            <v-icon class="mr-2" color="white">mdi-plus-circle-outline</v-icon>
            Ajouter une activité
          </div>
          <v-btn icon variant="text" color="white" @click="closeDialog" aria-label="Fermer">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>

        <v-card-text class="ct-dialog-body">
          <v-form ref="form">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newActivity.date"
                  type="date"
                  label="Date"
                  variant="outlined"
                  density="comfortable"
                  color="primary"
                  hide-details="auto"
                  :rules="[v => !!v || 'Date obligatoire']"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newActivity.horaire"
                  label="Horaire"
                  placeholder="Ex: 08:00 - 10:00"
                  variant="outlined"
                  density="comfortable"
                  color="primary"
                  hide-details="auto"
                  :rules="[v => !!v || 'Horaire obligatoire']"
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="newActivity.activite"
                  label="Activité"
                  placeholder="Décrivez l'activité réalisée..."
                  variant="outlined"
                  density="comfortable"
                  color="primary"
                  auto-grow
                  rows="3"
                  hide-details="auto"
                  :rules="[v => !!v || 'Activité obligatoire']"
                />
              </v-col>
            </v-row>

            <v-alert
              v-if="!classeId || !subjectId || !teacherId || !etablissementId || !anneeScolaireId"
              type="warning"
              variant="tonal"
              class="mt-3"
            >
              Paramètres manquants (classe/matière/enseignant/établissement/année scolaire).
              Vérifiez la navigation (query params).
            </v-alert>
          </v-form>
        </v-card-text>

        <v-card-actions class="ct-dialog-actions">
          <v-spacer />
          <v-btn variant="tonal" color="black" @click="closeDialog">
            Annuler
          </v-btn>
          <v-btn color="primary" :loading="adding" :disabled="adding" @click="addActivity">
            <v-icon start>mdi-content-save</v-icon>
            Ajouter
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: confirmation masquage -->
    <v-dialog v-model="hideDialog" max-width="420">
      <v-card class="ct-dialog">
        <v-card-title class="font-weight-bold">
          <v-icon class="mr-2" color="warning">mdi-alert</v-icon>
          Confirmer le masquage
        </v-card-title>
        <v-card-text>
          Êtes-vous sûr de vouloir masquer cette activité ?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="tonal" color="black" @click="closeHideDialog">Non</v-btn>
          <v-btn color="primary" @click="hideActivity">Oui</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbars -->
    <v-snackbar v-model="successMessage" color="success" timeout="2800" location="top end">
      Action réalisée avec succès !
    </v-snackbar>
    <v-snackbar v-model="errorMessage" color="error" timeout="3200" location="top end">
      Erreur lors de l'action.
    </v-snackbar>
  </v-container>
</template>

<script>
import axios from "axios";

export default {
  name: "CahierDeTexteManager",
  props: {
    classeId: String,
    subjectId: String,
    etablissementId: Number,
    anneeScolaire: String,
    anneeScolaireId: Number,
  },
  data() {
    return {
      dialog: false,
      hideDialog: false,
      successMessage: false,
      errorMessage: false,

      adding: false,

      currentSemester: "",
      semesters: [],
      activities: {},
      activityToHide: null,

      search: "",
      itemsPerPage: 8,

      // Mobile pagination
      mobilePage: 1,
      mobilePerPage: 5,

      newActivity: {
        // ids invisibles dans le formulaire (mais envoyés à l'API)
        date: "",
        horaire: "",
        activite: "",
      },

      tableHeaders: [
        { title: "Date", value: "dateFormatted" },
        { title: "Horaire", value: "horaire" },
        { title: "Activité", value: "activite" },
        { title: "Actions", value: "actions", sortable: false },
      ],

      API_BASE: "",
    };
  },
  computed: {
    teacherId() {
      return this.$route.query.id;
    },
    currentActivities() {
      return (this.activities[this.currentSemester] || []).filter((a) => !a.hidden);
    },
    filteredActivities() {
      const q = (this.search || "").trim().toLowerCase();
      if (!q) return this.currentActivities;

      return this.currentActivities.filter((a) => {
        const date = (a.dateFormatted || "").toLowerCase();
        const horaire = (a.horaire || a.hours || "").toLowerCase();
        const act = (a.activite || a.activity || "").toLowerCase();
        return date.includes(q) || horaire.includes(q) || act.includes(q);
      });
    },
    mobileTotalPages() {
      return Math.max(1, Math.ceil(this.filteredActivities.length / this.mobilePerPage));
    },
    pagedMobileActivities() {
      const start = (this.mobilePage - 1) * this.mobilePerPage;
      return this.filteredActivities.slice(start, start + this.mobilePerPage);
    },
  },
  watch: {
    search() {
      this.mobilePage = 1;
    },
    filteredActivities() {
      if (this.mobilePage > this.mobileTotalPages) this.mobilePage = this.mobileTotalPages;
    },
  },
  methods: {
    getButtonColor(nom) {
      return this.currentSemester === nom ? "primary" : "blue-lighten-5";
    },
    changeSemester(nom) {
      this.currentSemester = nom;
      this.fetchNotesData();
    },

    openAddActivityDialog() {
      if (!this.classeId || !this.subjectId || !this.teacherId || !this.etablissementId || !this.anneeScolaireId) {
        this.errorMessage = true;
        return;
      }
      this.dialog = true;
    },
    closeDialog() {
      this.dialog = false;
      this.resetForm();
    },
    resetForm() {
      this.newActivity = { date: "", horaire: "", activite: "" };
    },

    openHideActivityDialog(activity) {
      this.activityToHide = activity;
      this.hideDialog = true;
    },
    closeHideDialog() {
      this.hideDialog = false;
      this.activityToHide = null;
    },

    async fetchSemesters() {
      try {
        const response = await axios.get(`${this.API_BASE}/api/semesters/${this.etablissementId}`);
        this.semesters = response.data || [];

        if (this.semesters.length > 0) {
          this.currentSemester = this.semesters[0].nom;
          await this.fetchNotesData();
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des semestres :", error);
      }
    },

    async fetchNotesData() {
      try {
        const response = await axios.get(
          `${this.API_BASE}/api/getActivities/${this.classeId}/${this.subjectId}/${this.anneeScolaireId}`
        );

        this.activities = {};

        if (response.data) {
          response.data.forEach((activity) => {
            const semesterName = this.semesters.find((s) => s.id === activity.semestre_id)?.nom || "—";

            if (!this.activities[semesterName]) this.activities[semesterName] = [];

            activity.originalDate = new Date(activity.date);
            activity.dateFormatted = this.formatDate(activity.date);

            // Normalisation de champs (selon backend)
            activity.horaire = activity.horaire || activity.hours || "";
            activity.activite = activity.activite || activity.activity || "";

            activity.hidden = false;

            this.activities[semesterName].push(activity);
          });

          for (const sem in this.activities) {
            this.activities[sem].sort((a, b) => new Date(b.originalDate) - new Date(a.originalDate));
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des activités :", error);
      }
    },

    async addActivity() {
      const form = this.$refs.form;
      const ok = form?.validate ? form.validate() : true;
      if (!ok) return;

      const payload = {
        teacherId: this.teacherId,
        subjectId: this.subjectId,
        activity: this.newActivity.activite,
        date: this.newActivity.date,
        hours: this.newActivity.horaire,
        classId: this.classeId,
        semesterName: this.currentSemester,
        etablissementId: this.etablissementId,
        anneeScolaireId: this.anneeScolaireId,
      };

      try {
        this.adding = true;
        await axios.post(`${this.API_BASE}/api/addActivity`, payload);
        this.successMessage = true;
        this.closeDialog();
        await this.fetchNotesData();
      } catch (error) {
        this.errorMessage = true;
        console.error("Erreur lors de l'ajout de l'activité :", error.response?.data || error);
      } finally {
        this.adding = false;
      }
    },

    hideActivity() {
      if (this.activityToHide) {
        this.activityToHide.hidden = true;
        this.successMessage = true;
        this.closeHideDialog();
      }
    },

    formatDate(date) {
      if (!date) return "";
      return new Date(date).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
  },
  mounted() {
    // Ajustement mobile (petits écrans)
    if (typeof window !== "undefined") {
      const w = window.innerWidth;
      if (w <= 360) this.mobilePerPage = 4;
      else if (w <= 420) this.mobilePerPage = 5;
      else this.mobilePerPage = 6;

      if (w < 600) this.itemsPerPage = 6;
    }

    this.fetchSemesters();
  },
};
</script>

<style scoped>
/* Charte: bleu / blanc / un peu de noir */
.ct-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px;
  padding-bottom: 86px;
  background: radial-gradient(900px 500px at 20% 10%, rgba(25,118,210,.14), transparent 55%),
              radial-gradient(800px 500px at 85% 0%, rgba(11,46,74,.10), transparent 55%),
              linear-gradient(180deg, #eef6ff 0%, #f7fbff 45%, #ffffff 100%);
  border-radius: 18px;
}

/* Topbar */
.ct-topbar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(90deg, #1976d2 0%, #0b2e4a 100%);
  box-shadow: 0 16px 50px rgba(11, 46, 74, 0.18);
  border: 1px solid rgba(255,255,255,.12);
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.ct-back {
  border-radius: 12px !important;
  font-weight: 900;
  background: rgba(0,0,0,.45) !important;
  color: #fff !important;
  white-space: nowrap;
}

.ct-title {
  min-width: 200px;
}

.ct-h1 {
  color: #fff;
  font-weight: 950;
  font-size: 1.10rem;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ct-sub {
  margin-top: 4px;
  color: rgba(255,255,255,.88);
  font-weight: 650;
  font-size: .92rem;
}

.ct-spacer {
  flex: 1;
}

.ct-add {
  border-radius: 999px !important;
  font-weight: 950;
  box-shadow: 0 10px 28px rgba(0,0,0,.18);
}

.ct-add-mobile {
  border-radius: 999px !important;
  font-weight: 950;
}

/* Cards */
.ct-card {
  border-radius: 18px !important;
  overflow: hidden;
  border: 1px solid rgba(25,118,210,.16);
  background: rgba(255,255,255,.90);
  backdrop-filter: blur(10px);
  margin-bottom: 14px;
}

.ct-card-head {
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: linear-gradient(90deg, #1976d2, #0b2e4a);
}

.ct-card-head--alt {
  background: linear-gradient(90deg, #0b2e4a, #1976d2);
}

.ct-card-head-title {
  color: #fff;
  font-weight: 950;
  display: flex;
  align-items: center;
  letter-spacing: .2px;
}

.ct-chip-year {
  border-radius: 999px !important;
  font-weight: 900;
}

.ct-card-body {
  padding: 12px 14px 14px;
}

/* Semesters */
.ct-sem-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.ct-sem-chip {
  font-weight: 950;
}

.ct-sem-chip--active {
  box-shadow: 0 10px 22px rgba(25,118,210,.25);
}

/* Tools */
.ct-tools {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  padding: 12px 14px;
}

.ct-search {
  flex: 1;
  min-width: 220px;
}

.ct-tools-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.ct-info-chip {
  font-weight: 900;
  border: 1px solid rgba(25,118,210,.16);
}

.ct-truncate {
  max-width: 140px;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Table */
.ct-table {
  border-top: 1px solid rgba(0,0,0,.06);
}

.ct-date {
  display: inline-flex;
  align-items: center;
  font-weight: 800;
  color: #0b2e4a;
}

.ct-activity {
  max-width: 560px;
  white-space: normal;
  line-height: 1.35rem;
  color: rgba(0,0,0,.78);
  font-weight: 650;
}

.ct-hours-chip {
  font-weight: 900;
  border-radius: 999px !important;
}

.ct-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  color: #546e7a;
  font-weight: 900;
}

/* Mobile cards */
.ct-mobile-list {
  padding: 12px;
}

.ct-mobile-card {
  border-radius: 16px !important;
  border: 1px solid rgba(25,118,210,.16);
  background: rgba(255,255,255,.94);
  padding: 12px;
  margin-bottom: 10px;
}

.ct-mobile-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.ct-mobile-date {
  font-weight: 950;
  color: #0b2e4a;
  display: inline-flex;
  align-items: center;
  line-height: 1.2;
}

.ct-mobile-activity {
  color: rgba(0,0,0,.78);
  font-weight: 650;
  line-height: 1.35rem;
  white-space: pre-wrap;
}

.ct-mobile-actions {
  margin-top: 10px;
}

.ct-empty-mobile {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 8px;
  color: #546e7a;
  font-weight: 900;
  text-align: center;
}

/* Mobile pagination */
.ct-mobile-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0 0;
}

.ct-page-indicator {
  font-weight: 900;
  color: rgba(0,0,0,.65);
  font-size: 0.92rem;
  white-space: nowrap;
}

/* Bottom bar */
.ct-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  padding: 10px 12px;
  background: rgba(255,255,255,.88);
  border-top: 1px solid rgba(25,118,210,.16);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
}

.ct-bottom-btn {
  border-radius: 999px !important;
  font-weight: 950;
}

/* Dialog */
.ct-dialog {
  border-radius: 16px !important;
  overflow: hidden;
}

.ct-dialog-head {
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 14px;
  background: linear-gradient(90deg, #1976d2, #0b2e4a);
}

.ct-dialog-title {
  color: #fff;
  font-weight: 950;
  display: flex;
  align-items: center;
}

.ct-dialog-body {
  padding-top: 14px;
}

.ct-dialog-actions {
  padding: 12px 14px 14px;
}

/* Visibility helpers */
.ct-hide-xs { display: block; }
.ct-show-xs { display: none; }
.ct-hide-sm { display: inline-flex; }

@media (max-width: 600px) {
  .ct-page {
    padding: 10px;
    border-radius: 14px;
    padding-bottom: 86px;
  }

  .ct-topbar {
    padding: 12px;
    border-radius: 14px;
    gap: 10px;
  }

  .ct-h1 {
    font-size: 1.02rem;
  }

  .ct-hide-sm { display: none !important; }
  .ct-hide-xs { display: none !important; }
  .ct-show-xs { display: block !important; }

  .ct-search {
    min-width: 100%;
  }

  .ct-tools-right {
    width: 100%;
    justify-content: space-between;
  }

  .ct-truncate {
    max-width: 110px;
  }

  .ct-activity {
    max-width: 100%;
  }
}

@media (max-width: 360px) {
  .ct-h1 {
    font-size: 0.98rem;
  }

  .ct-page-indicator {
    font-size: 0.86rem;
  }

  .ct-bottom-btn {
    padding-inline: 12px;
  }
}
</style>
