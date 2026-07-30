<template>
  <v-container class="pm-page">
    <!-- TOP BAR -->
    <div class="pm-topbar">
      <v-btn
        class="pm-back-btn"
        variant="flat"
        color="black"
        @click="$emit('back')"
        aria-label="Retour"
      >
        <v-icon start>mdi-arrow-left</v-icon>
        <span class="hide-xs">Retour</span>
      </v-btn>

      <div class="pm-topbar-title">
        <div class="pm-topbar-h1">
          <v-icon class="mr-2" color="white">mdi-calendar-check-outline</v-icon>
          Gestion des absences
        </div>
        <div class="pm-topbar-sub hide-sm">
          Renseignez la date et le statut, puis sauvegardez.
        </div>
      </div>

      <v-spacer />

      <!-- Desktop save button -->
      <v-btn
        class="pm-save-btn hide-sm"
        color="primary"
        size="large"
        :loading="saving"
        :disabled="saving"
        @click="save"
      >
        <v-icon start>mdi-content-save</v-icon>
        Sauvegarder
      </v-btn>
    </div>

    <!-- SEMESTERS CARD -->
    <v-card class="pm-card pm-card--semester" elevation="8">
      <div class="pm-card-header">
        <div class="pm-card-title">
          <v-icon class="mr-2" color="white">mdi-timeline-clock-outline</v-icon>
          Semestre
        </div>
      </div>

      <v-card-text class="pm-card-body">
        <div class="pm-semesters-row">
          <v-chip
            v-for="semester in semesters"
            :key="semester.id"
            class="pm-chip"
            :class="{ 'pm-chip--active': currentSemester === semester.nom }"
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

    <!-- SEARCH + INFO BAR -->
    <v-card class="pm-card pm-card--tools" elevation="8">
      <div class="pm-tools">
        <v-text-field
          v-model="search"
          variant="outlined"
          density="comfortable"
          color="primary"
          prepend-inner-icon="mdi-magnify"
          label="Rechercher un élève"
          hide-details
          class="pm-search"
        />

        <div class="pm-tools-right">
          <v-chip class="pm-info-chip" color="blue-lighten-5" variant="flat">
            <v-icon start size="16" color="primary">mdi-account-group</v-icon>
            {{ students.length }}
          </v-chip>
          <v-chip class="pm-info-chip" color="blue-lighten-5" variant="flat">
            <v-icon start size="16" color="primary">mdi-calendar</v-icon>
            <span class="chip-truncate">{{ currentSemester || "—" }}</span>
          </v-chip>
        </div>
      </div>
    </v-card>

    <!-- TABLE CARD -->
    <v-card class="pm-card pm-card--table" elevation="10">
      <div class="pm-card-header pm-card-header--table">
        <div class="pm-card-title">
          <v-icon class="mr-2" color="white">mdi-table</v-icon>
          Liste des élèves
        </div>
      </div>

      <!-- Desktop / Tablet table -->
      <div class="hide-xs">
        <v-data-table
          :headers="headers"
          :items="students"
          item-key="id"
          :search="search"
          :items-per-page="itemsPerPage"
          class="pm-table"
          density="comfortable"
        >
          <template #item.name="{ item }">
            <div class="pm-student">
              <div class="pm-student-name">{{ item.name }}</div>
            </div>
          </template>

          <template #item.date="{ item }">
            <v-text-field
              v-model="item.date"
              type="date"
              variant="outlined"
              density="compact"
              color="primary"
              hide-details
              class="pm-field"
            />
          </template>

          <template #item.status="{ item }">
            <v-select
              v-model="item.status"
              :items="statuses"
              variant="outlined"
              density="compact"
              color="primary"
              hide-details
              class="pm-field"
            />
          </template>

          <template #no-data>
            <div class="pm-empty">
              <v-icon size="22" color="primary" class="mr-2">mdi-information-outline</v-icon>
              Aucun élève trouvé.
            </div>
          </template>
        </v-data-table>
      </div>

      <!-- Mobile cards (true responsive) -->
      <div class="pm-mobile-list show-xs">
        <div v-if="filteredStudents.length === 0" class="pm-empty-mobile">
          <v-icon size="22" color="primary" class="mr-2">mdi-information-outline</v-icon>
          Aucun élève trouvé.
        </div>

        <v-card
          v-for="st in pagedMobileStudents"
          :key="st.id"
          class="pm-mobile-card"
          elevation="0"
        >
          <div class="pm-mobile-head">
            <div class="pm-mobile-name">{{ st.name }}</div>
          </div>

          <div class="pm-mobile-fields">
            <v-text-field
              v-model="st.date"
              type="date"
              variant="outlined"
              density="compact"
              color="primary"
              hide-details
              class="pm-mobile-field"
              label="Date"
            />
            <v-select
              v-model="st.status"
              :items="statuses"
              variant="outlined"
              density="compact"
              color="primary"
              hide-details
              class="pm-mobile-field"
              label="Statut"
            />
          </div>
        </v-card>

        <!-- Simple mobile pagination -->
        <div v-if="mobileTotalPages > 1" class="pm-mobile-pager">
          <v-btn
            variant="tonal"
            color="primary"
            :disabled="mobilePage === 1"
            @click="mobilePage--"
          >
            <v-icon start>mdi-chevron-left</v-icon>
            Préc.
          </v-btn>

          <div class="pm-mobile-page-indicator">
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
      </div>
    </v-card>

    <!-- BOTTOM BAR (mobile) -->
    <div class="pm-bottom-bar show-xs">
      <v-btn variant="tonal" color="black" class="pm-bottom-btn" @click="$emit('back')">
        <v-icon start>mdi-arrow-left</v-icon>
        Retour
      </v-btn>

      <v-spacer />

      <v-btn
        color="primary"
        class="pm-bottom-btn"
        :loading="saving"
        :disabled="saving"
        @click="save"
      >
        <v-icon start>mdi-content-save</v-icon>
        Sauvegarder
      </v-btn>
    </div>

    <!-- Snackbars -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3200">
      {{ snackbar.message }}
    </v-snackbar>

    <!-- Success Dialog -->
    <v-dialog v-model="successDialog" max-width="520">
      <v-card class="pm-dialog">
        <v-card-title class="font-weight-bold">
          <v-icon class="mr-2" color="success">mdi-check-circle</v-icon>
          Succès
        </v-card-title>
        <v-card-text>Les données ont été sauvegardées avec succès !</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="successDialog = false">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Error Dialog -->
    <v-dialog v-model="errorDialog" max-width="520">
      <v-card class="pm-dialog">
        <v-card-title class="font-weight-bold">
          <v-icon class="mr-2" color="error">mdi-alert</v-icon>
          Erreur
        </v-card-title>
        <v-card-text>Une erreur est survenue lors de la sauvegarde des données.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="errorDialog = false">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from "axios";

export default {
  props: {
    classeId: Number,
    subjectId: Number,
    etablissementId: Number,
    anneeScolaire: String,
    anneeScolaireId: Number,
  },
  data() {
    return {
      currentSemester: "",
      semesters: [],
      headers: [
        { title: "Nom / Prénom", value: "name", sortable: true },
        { title: "Date", value: "date", sortable: false },
        { title: "Statut", value: "status", sortable: false },
      ],
      statuses: ["Absent", "Permissionaire"],
      students: [],
      successDialog: false,
      errorDialog: false,

      search: "",
      itemsPerPage: 10,
      saving: false,
      snackbar: { show: false, color: "info", message: "" },

      // Mobile pagination
      mobilePage: 1,
      mobilePerPage: 6,

      API_BASE: "",
    };
  },
  computed: {
    filteredStudents() {
      const q = (this.search || "").trim().toLowerCase();
      if (!q) return this.students;

      return this.students.filter((s) => {
        const name = (s.name || "").toLowerCase();
        const nom = (s.nom || "").toLowerCase();
        const prenom = (s.prenom || "").toLowerCase();
        return name.includes(q) || nom.includes(q) || prenom.includes(q);
      });
    },
    mobileTotalPages() {
      return Math.max(1, Math.ceil(this.filteredStudents.length / this.mobilePerPage));
    },
    pagedMobileStudents() {
      const start = (this.mobilePage - 1) * this.mobilePerPage;
      return this.filteredStudents.slice(start, start + this.mobilePerPage);
    },
  },
  watch: {
    // Quand on recherche, on revient à la page 1 mobile
    search() {
      this.mobilePage = 1;
    },
    // Si la liste change, recaler la pagination
    filteredStudents() {
      if (this.mobilePage > this.mobileTotalPages) {
        this.mobilePage = this.mobileTotalPages;
      }
    },
  },
  methods: {
    setSnack(message, color = "info") {
      this.snackbar = { show: true, color, message };
    },

    changeSemester(semesterNom) {
      this.currentSemester = semesterNom;
    },

    async getStudents() {
      try {
        const response = await axios.get(
          `${this.API_BASE}/api/classes/${this.classeId}/eleves`
        );

        this.students = (response.data || []).map((student) => ({
          ...student,
          name: `${student.nom} ${student.prenom}`,
          date: "",
          status: "",
        }));
      } catch (error) {
        console.error("Erreur élèves:", error);
        this.setSnack("Impossible de charger la liste des élèves.", "error");
      }
    },

    async fetchSemesters() {
      try {
        const response = await axios.get(
          `${this.API_BASE}/api/semesters/${this.etablissementId}`
        );

        this.semesters = response.data || [];
        if (this.semesters.length > 0 && !this.currentSemester) {
          this.currentSemester = this.semesters[0].nom;
        }
      } catch (error) {
        console.error("Erreur semestres:", error);
        this.setSnack("Impossible de charger les semestres.", "error");
      }
    },

    async save() {
      try {
        this.saving = true;

        const dataToSave = this.students
          .filter((s) => s.date && s.status)
          .map((s) => ({
            eleveId: s.id,
            date: s.date,
            status: s.status,
            subjectId: this.subjectId,
            classeId: this.classeId,
            semesterName: this.currentSemester,
            etablissementId: this.etablissementId,
            anneeScolaireId: this.anneeScolaireId,
          }));

        if (dataToSave.length === 0) {
          this.setSnack(
            "Renseignez la date et le statut pour au moins un élève.",
            "warning"
          );
          return;
        }

        await axios.post(`${this.API_BASE}/api/presence`, dataToSave);

        this.students = this.students.map((s) => ({ ...s, date: "", status: "" }));
        this.successDialog = true;
      } catch (error) {
        console.error("Erreur sauvegarde:", error);
        this.errorDialog = true;
      } finally {
        this.saving = false;
      }
    },
  },
  created() {
    // Mobile per page adaptatif (petits téléphones)
    if (typeof window !== "undefined") {
      const w = window.innerWidth;
      if (w <= 360) this.mobilePerPage = 4;
      else if (w <= 420) this.mobilePerPage = 5;
      else this.mobilePerPage = 6;

      if (w < 600) this.itemsPerPage = 7;
    }

    this.getStudents();
    this.fetchSemesters();
  },
};
</script>

<style scoped>
/* Base */
.pm-page {
  max-width: 1200px;
  padding-top: 14px;
  padding-bottom: 92px;
  background: radial-gradient(900px 500px at 20% 10%, rgba(25,118,210,.14), transparent 55%),
              radial-gradient(800px 500px at 85% 0%, rgba(11,46,74,.10), transparent 55%),
              linear-gradient(180deg, #eef6ff 0%, #f7fbff 45%, #ffffff 100%);
  border-radius: 18px;
}

/* Topbar */
.pm-topbar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(90deg, #1976d2 0%, #0b2e4a 100%);
  box-shadow: 0 16px 50px rgba(11, 46, 74, 0.18);
  border: 1px solid rgba(255,255,255,.12);
  margin-bottom: 14px;
}

.pm-back-btn {
  border-radius: 12px !important;
  font-weight: 900;
  background: rgba(0,0,0,.45) !important;
  color: #fff !important;
  white-space: nowrap;
}

.pm-topbar-title {
  min-width: 0;
}

.pm-topbar-h1 {
  color: #fff;
  font-weight: 950;
  font-size: 1.12rem;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pm-topbar-sub {
  margin-top: 4px;
  color: rgba(255,255,255,.88);
  font-weight: 650;
  font-size: .92rem;
}

.pm-save-btn {
  border-radius: 999px !important;
  font-weight: 950;
  box-shadow: 0 10px 28px rgba(0,0,0,.18);
}

/* Cards */
.pm-card {
  border-radius: 18px !important;
  overflow: hidden;
  border: 1px solid rgba(25,118,210,.16);
  background: rgba(255,255,255,.88);
  backdrop-filter: blur(10px);
  margin-bottom: 14px;
}

.pm-card-header {
  height: 46px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  background: linear-gradient(90deg, #1976d2, #0b2e4a);
}

.pm-card-header--table {
  background: linear-gradient(90deg, #0b2e4a, #1976d2);
}

.pm-card-title {
  color: #fff;
  font-weight: 950;
  display: flex;
  align-items: center;
  letter-spacing: .2px;
}

.pm-card-body {
  padding: 12px 14px 14px;
}

/* Semesters chips */
.pm-semesters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.pm-chip {
  font-weight: 950;
}

.pm-chip--active {
  box-shadow: 0 10px 22px rgba(25,118,210,.25);
}

/* Tools */
.pm-tools {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  padding: 12px 14px;
}

.pm-search {
  flex: 1;
  min-width: 220px;
}

.pm-tools-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pm-info-chip {
  font-weight: 900;
  border: 1px solid rgba(25,118,210,.16);
}

.chip-truncate {
  max-width: 140px;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Table */
.pm-table {
  border-top: 1px solid rgba(0,0,0,.06);
}

.pm-student-name {
  font-weight: 950;
  color: #0b2e4a;
}

.pm-field {
  min-width: 150px;
}

.pm-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  color: #546e7a;
  font-weight: 900;
}

/* Mobile list */
.pm-mobile-list {
  padding: 12px;
}

.pm-mobile-card {
  border-radius: 16px !important;
  border: 1px solid rgba(25,118,210,.16);
  background: rgba(255,255,255,.92);
  padding: 12px;
  margin-bottom: 10px;
}

.pm-mobile-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.pm-mobile-name {
  font-weight: 950;
  color: #0b2e4a;
  line-height: 1.2;
}

.pm-mobile-fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.pm-mobile-field :deep(.v-field) {
  border-radius: 12px;
}

.pm-empty-mobile {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 8px;
  color: #546e7a;
  font-weight: 900;
  text-align: center;
}

/* Mobile pager */
.pm-mobile-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0 0;
}

.pm-mobile-page-indicator {
  font-weight: 900;
  color: rgba(0,0,0,.65);
  font-size: 0.92rem;
  white-space: nowrap;
}

/* Bottom bar */
.pm-bottom-bar {
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

.pm-bottom-btn {
  border-radius: 999px !important;
  font-weight: 950;
}

/* Dialog */
.pm-dialog {
  border-radius: 16px !important;
}

/* Visibility helpers */
.hide-xs { display: inline-flex; }
.show-xs { display: none; }
.hide-sm { display: inline-flex; }

@media (max-width: 600px) {
  .pm-page {
    padding-top: 10px;
    border-radius: 14px;
    padding-bottom: 92px;
  }

  .pm-topbar {
    padding: 12px;
    border-radius: 14px;
    gap: 10px;
  }

  .pm-topbar-h1 {
    font-size: 1.02rem;
  }

  .hide-sm { display: none !important; }
  .hide-xs { display: none !important; }
  .show-xs { display: block !important; }

  .pm-search {
    min-width: 100%;
  }

  .pm-tools-right {
    width: 100%;
    justify-content: space-between;
  }

  .chip-truncate {
    max-width: 110px;
  }
}

@media (max-width: 360px) {
  .pm-topbar-h1 {
    font-size: 0.98rem;
  }
  .pm-mobile-page-indicator {
    font-size: 0.86rem;
  }
  .pm-bottom-btn {
    padding-inline: 12px;
  }
}
</style>
