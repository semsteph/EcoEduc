<template>
  <div class="cm-page">
    <!-- TOP BAR -->
    <div class="cm-topbar">
      <v-btn class="cm-back" variant="tonal" color="black" @click="$emit('back')">
        <v-icon start>mdi-arrow-left</v-icon>
        <span class="hide-xs">Retour</span>
      </v-btn>

      <div class="cm-title">
        <div class="cm-h1">
          <v-icon class="mr-2" color="white">mdi-account-tie</v-icon>
          Gérer la conduite
        </div>
        <div class="cm-sub hide-sm">
          Saisissez la punition, le motif et l’auteur, puis sauvegardez.
        </div>
      </div>

      <div class="cm-spacer" />

      <!-- Desktop save -->
      <v-btn class="cm-save hide-sm" color="primary" :loading="saving" :disabled="saving" @click="save">
        <v-icon start>mdi-content-save</v-icon>
        Sauvegarder
      </v-btn>
    </div>

    <!-- SEMESTERS -->
    <v-card class="cm-card" elevation="8">
      <div class="cm-card-head">
        <div class="cm-card-head-title">
          <v-icon class="mr-2" color="white">mdi-timeline-clock-outline</v-icon>
          Semestre
        </div>

        <v-chip class="cm-chip-year" variant="tonal" color="white">
          <v-icon start size="16">mdi-calendar</v-icon>
          {{ anneeScolaire }}
        </v-chip>
      </div>

      <v-card-text class="cm-card-body">
        <div class="cm-sem-row">
          <v-chip
            v-for="semester in semesters"
            :key="semester.id"
            class="cm-sem-chip"
            :class="{ 'cm-sem-chip--active': currentSemester === semester.nom }"
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
    <v-card class="cm-card" elevation="8">
      <v-card-text class="cm-tools">
        <v-text-field
          v-model="search"
          variant="outlined"
          density="comfortable"
          color="primary"
          prepend-inner-icon="mdi-magnify"
          label="Rechercher un élève"
          hide-details
          class="cm-search"
        />

        <div class="cm-tools-right">
          <v-chip class="cm-info-chip" color="blue-lighten-5" variant="flat">
            <v-icon start size="16" color="primary">mdi-account-group</v-icon>
            {{ students.length }} élève(s)
          </v-chip>

          <v-chip class="cm-info-chip" color="blue-lighten-5" variant="flat">
            <v-icon start size="16" color="primary">mdi-timeline-clock-outline</v-icon>
            <span class="cm-truncate">{{ currentSemester || "—" }}</span>
          </v-chip>
        </div>
      </v-card-text>
    </v-card>

    <!-- DESKTOP TABLE -->
    <v-card class="cm-card cm-table-wrap hide-xs" elevation="10">
      <div class="cm-card-head cm-card-head--alt">
        <div class="cm-card-head-title">
          <v-icon class="mr-2" color="white">mdi-table</v-icon>
          Saisie conduite
        </div>
      </div>

      <v-data-table
        :headers="headers"
        :items="filteredRecords"
        item-key="studentId"
        :items-per-page="itemsPerPage"
        class="cm-table"
        density="comfortable"
      >
        <template #item.studentId="{ item }">
          <div class="cm-student-cell">
            <div class="cm-student-name">{{ item.studentName }}</div>
            <div class="cm-student-sub">ID: {{ item.studentId }}</div>
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
            class="cm-field"
          />
        </template>

        <template #item.punition="{ item }">
          <v-combobox
            v-model="item.punition"
            :items="punitionOptions"
            variant="outlined"
            density="compact"
            color="primary"
            hide-details
            placeholder="Ex: 2"
            class="cm-field"
          />
        </template>

        <template #item.motif="{ item }">
          <v-textarea
            v-model="item.motif"
            variant="outlined"
            density="compact"
            color="primary"
            hide-details
            auto-grow
            rows="1"
            placeholder="Motif"
            class="cm-field cm-textarea"
          />
        </template>

        <template #item.totalHours="{ item }">
          <v-chip color="primary" variant="tonal" class="cm-hours-chip" label>
            <v-icon start size="16">mdi-clock-outline</v-icon>
            {{ item.totalHours }} h
          </v-chip>
        </template>

        <template #item.auteur="{ item }">
          <v-text-field
            v-model="item.auteur"
            variant="outlined"
            density="compact"
            color="primary"
            hide-details
            placeholder="Nom & Prénom"
            class="cm-field"
          />
        </template>

        <template #no-data>
          <div class="cm-empty">
            <v-icon size="22" color="primary" class="mr-2">mdi-information-outline</v-icon>
            Aucun élève trouvé.
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- MOBILE CARDS -->
    <v-card class="cm-card show-xs" elevation="10">
      <div class="cm-card-head cm-card-head--alt">
        <div class="cm-card-head-title">
          <v-icon class="mr-2" color="white">mdi-format-list-bulleted</v-icon>
          Saisie conduite
        </div>
      </div>

      <v-card-text class="cm-mobile-list">
        <div v-if="filteredRecords.length === 0" class="cm-empty-mobile">
          <v-icon size="22" color="primary" class="mr-2">mdi-information-outline</v-icon>
          Aucun élève trouvé.
        </div>

        <v-card
          v-for="rec in pagedMobileRecords"
          :key="rec.studentId"
          class="cm-mobile-card"
          elevation="0"
        >
          <div class="cm-mobile-head">
            <div class="cm-mobile-name">{{ rec.studentName }}</div>
            <v-chip color="primary" variant="tonal" label class="cm-hours-chip">
              <v-icon start size="16">mdi-clock-outline</v-icon>
              {{ rec.totalHours }} h
            </v-chip>
          </div>

          <div class="cm-mobile-grid">
            <v-text-field
              v-model="rec.date"
              type="date"
              variant="outlined"
              density="compact"
              color="primary"
              hide-details
              label="Date"
              class="cm-mobile-field"
            />

            <v-combobox
              v-model="rec.punition"
              :items="punitionOptions"
              variant="outlined"
              density="compact"
              color="primary"
              hide-details
              label="Punition (heures)"
              placeholder="Ex: 2"
              class="cm-mobile-field"
            />

            <v-text-field
              v-model="rec.auteur"
              variant="outlined"
              density="compact"
              color="primary"
              hide-details
              label="Auteur"
              placeholder="Nom & Prénom"
              class="cm-mobile-field"
            />

            <v-textarea
              v-model="rec.motif"
              variant="outlined"
              density="compact"
              color="primary"
              hide-details
              auto-grow
              rows="1"
              label="Motif"
              class="cm-mobile-field cm-textarea"
            />
          </div>
        </v-card>

        <!-- Mobile pagination -->
        <div v-if="mobileTotalPages > 1" class="cm-mobile-pager">
          <v-btn variant="tonal" color="primary" :disabled="mobilePage === 1" @click="mobilePage--">
            <v-icon start>mdi-chevron-left</v-icon>
            Préc.
          </v-btn>

          <div class="cm-page-indicator">
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
    <div class="cm-bottom-bar show-xs">
      <v-btn variant="tonal" color="black" class="cm-bottom-btn" @click="$emit('back')">
        <v-icon start>mdi-arrow-left</v-icon>
        Retour
      </v-btn>

      <div class="cm-spacer" />

      <v-btn color="primary" class="cm-bottom-btn" :loading="saving" :disabled="saving" @click="save">
        <v-icon start>mdi-content-save</v-icon>
        Sauvegarder
      </v-btn>
    </div>

    <!-- SNACKBAR -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3200">
      {{ snackbar.message }}
    </v-snackbar>

    <!-- DIALOG OK -->
    <v-dialog v-model="successDialog" max-width="520">
      <v-card class="cm-dialog">
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

    <!-- DIALOG ERROR -->
    <v-dialog v-model="errorDialog" max-width="520">
      <v-card class="cm-dialog">
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
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "ConductManager",
  props: {
    classeId: { type: Number, required: true },
    etablissementId: { type: Number, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
  },
  data() {
    return {
      currentSemester: "",
      semesters: [],
      headers: [
        { title: "Élève", value: "studentId", sortable: true },
        { title: "Date", value: "date", sortable: false },
        { title: "Punition (h)", value: "punition", sortable: false },
        { title: "Motif", value: "motif", sortable: false },
        { title: "Total heures", value: "totalHours", sortable: true },
        { title: "Auteur", value: "auteur", sortable: false },
      ],
      punitionOptions: ["2", "4", "8"], // heures (numérique)
      students: [],
      conductRecords: [],

      search: "",
      itemsPerPage: 8,
      saving: false,

      // Mobile pagination
      mobilePage: 1,
      mobilePerPage: 5,

      snackbar: { show: false, color: "info", message: "" },
      successDialog: false,
      errorDialog: false,

      API_BASE: "",
    };
  },
  computed: {
    filteredRecords() {
      const q = (this.search || "").trim().toLowerCase();
      if (!q) return this.conductRecords;

      return this.conductRecords.filter((r) => {
        const name = (r.studentName || "").toLowerCase();
        return name.includes(q);
      });
    },
    mobileTotalPages() {
      return Math.max(1, Math.ceil(this.filteredRecords.length / this.mobilePerPage));
    },
    pagedMobileRecords() {
      const start = (this.mobilePage - 1) * this.mobilePerPage;
      return this.filteredRecords.slice(start, start + this.mobilePerPage);
    },
  },
  watch: {
    search() {
      this.mobilePage = 1;
    },
    filteredRecords() {
      if (this.mobilePage > this.mobileTotalPages) this.mobilePage = this.mobileTotalPages;
    },
  },
  methods: {
    setSnack(message, color = "info") {
      this.snackbar = { show: true, color, message };
    },

    changeSemester(semester) {
      this.currentSemester = semester;
      this.fetchConductRecords();
    },

    async fetchStudents() {
      try {
        const response = await axios.get(`${this.API_BASE}/api/classes/${this.classeId}/eleves`);
        this.students = (response.data || []).map((student) => ({
          id: student.id,
          fullName: `${student.nom} ${student.prenom}`,
        }));
        await this.fetchConductRecords();
      } catch (error) {
        console.error("Erreur lors de la récupération des élèves :", error);
        this.setSnack("Impossible de charger la liste des élèves.", "error");
      }
    },

    async fetchConductRecords() {
      try {
        this.conductRecords = await Promise.all(
          this.students.map(async (student) => {
            const totalHours = await this.fetchTotalHours(student.id);
            return {
              studentId: student.id,
              studentName: student.fullName,
              date: "",
              punition: "",
              motif: "",
              totalHours: totalHours || 0,
              auteur: "",
            };
          })
        );
      } catch (error) {
        console.error("Erreur enregistrements conduite :", error);
        this.setSnack("Impossible de préparer les enregistrements.", "error");
      }
    },

    async fetchTotalHours(studentId) {
      try {
        const response = await axios.get(
          `${this.API_BASE}/api/punitions/somme-heures/${studentId}/${this.anneeScolaireId}`
        );
        return response.data.totalHours;
      } catch (error) {
        console.error("Erreur récupération heures punition :", error);
        return 0;
      }
    },

    async fetchSemesters() {
      try {
        const response = await axios.get(`${this.API_BASE}/api/semesters/${this.etablissementId}`);
        this.semesters = response.data || [];
        if (this.semesters.length > 0) this.currentSemester = this.semesters[0].nom;
      } catch (error) {
        console.error("Erreur récupération semestres", error);
        this.setSnack("Impossible de charger les semestres.", "error");
      }
    },

    toNumberPunition(value) {
      // accepte "2", "2h", 2
      if (value === null || value === undefined) return null;
      const v = String(value).toLowerCase().replace("h", "").trim();
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    },

    async save() {
      try {
        this.saving = true;

        const validRecords = this.conductRecords
          .map((r) => ({ ...r, punitionNum: this.toNumberPunition(r.punition) }))
          .filter((r) => r.date && r.punitionNum !== null && r.motif && r.auteur);

        if (validRecords.length === 0) {
          this.setSnack("Complétez au moins un élève (date/punition/motif/auteur).", "warning");
          return;
        }

        const payload = {
          semester: this.currentSemester,
          etablissementId: this.etablissementId,
          anneeScolaireId: this.anneeScolaireId,
          records: validRecords.map((r) => ({
            studentId: r.studentId,
            date: r.date,
            punition: r.punitionNum,
            motif: r.motif,
            auteur: r.auteur,
          })),
        };

        await axios.post(`${this.API_BASE}/api/save/conduct`, payload);

        validRecords.forEach((r) => {
          const target = this.conductRecords.find((x) => x.studentId === r.studentId);
          if (target) {
            target.punition = "";
            target.motif = "";
            target.date = "";
            target.auteur = "";
          }
        });

        // rafraîchir les totaux
        await this.fetchConductRecords();

        this.successDialog = true;
      } catch (error) {
        console.error("Erreur sauvegarde conduite :", error);
        this.errorDialog = true;
      } finally {
        this.saving = false;
      }
    },
  },
  created() {
    // Ajustement mobile (petits écrans)
    if (typeof window !== "undefined") {
      const w = window.innerWidth;
      if (w <= 360) this.mobilePerPage = 4;
      else if (w <= 420) this.mobilePerPage = 5;
      else this.mobilePerPage = 6;

      if (w < 600) this.itemsPerPage = 6;
    }

    this.fetchStudents();
    this.fetchSemesters();
  },
};
</script>

<style scoped>
/* Charte: bleu / blanc / un peu de noir */
.cm-page {
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
.cm-topbar {
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

.cm-back {
  border-radius: 12px !important;
  font-weight: 900;
  background: rgba(0,0,0,.45) !important;
  color: #fff !important;
  white-space: nowrap;
}

.cm-title {
  min-width: 200px;
}

.cm-h1 {
  color: #fff;
  font-weight: 950;
  font-size: 1.10rem;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cm-sub {
  margin-top: 4px;
  color: rgba(255,255,255,.88);
  font-weight: 650;
  font-size: .92rem;
}

.cm-spacer {
  flex: 1;
}

.cm-save {
  border-radius: 999px !important;
  font-weight: 950;
  box-shadow: 0 10px 28px rgba(0,0,0,.18);
}

/* Cards */
.cm-card {
  border-radius: 18px !important;
  overflow: hidden;
  border: 1px solid rgba(25,118,210,.16);
  background: rgba(255,255,255,.90);
  backdrop-filter: blur(10px);
  margin-bottom: 14px;
}

.cm-card-head {
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: linear-gradient(90deg, #1976d2, #0b2e4a);
}

.cm-card-head--alt {
  background: linear-gradient(90deg, #0b2e4a, #1976d2);
}

.cm-card-head-title {
  color: #fff;
  font-weight: 950;
  display: flex;
  align-items: center;
  letter-spacing: .2px;
}

.cm-chip-year {
  border-radius: 999px !important;
  font-weight: 900;
}

/* Semesters */
.cm-card-body {
  padding: 12px 14px 14px;
}

.cm-sem-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cm-sem-chip {
  font-weight: 950;
}

.cm-sem-chip--active {
  box-shadow: 0 10px 22px rgba(25,118,210,.25);
}

/* Tools */
.cm-tools {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  padding: 12px 14px;
}

.cm-search {
  flex: 1;
  min-width: 220px;
}

.cm-tools-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cm-info-chip {
  font-weight: 900;
  border: 1px solid rgba(25,118,210,.16);
}

.cm-truncate {
  max-width: 140px;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Table */
.cm-table {
  border-top: 1px solid rgba(0,0,0,.06);
}

.cm-student-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cm-student-name {
  font-weight: 950;
  color: #0b2e4a;
  line-height: 1.2;
}

.cm-student-sub {
  font-size: 0.78rem;
  color: rgba(0,0,0,.55);
  font-weight: 700;
}

.cm-field {
  min-width: 150px;
}

.cm-textarea :deep(textarea) {
  line-height: 1.25rem;
}

.cm-hours-chip {
  font-weight: 900;
  border-radius: 999px !important;
}

/* Empty */
.cm-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  color: #546e7a;
  font-weight: 900;
}

/* Mobile cards */
.cm-mobile-list {
  padding: 12px;
}

.cm-mobile-card {
  border-radius: 16px !important;
  border: 1px solid rgba(25,118,210,.16);
  background: rgba(255,255,255,.94);
  padding: 12px;
  margin-bottom: 10px;
}

.cm-mobile-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.cm-mobile-name {
  font-weight: 950;
  color: #0b2e4a;
  line-height: 1.2;
}

.cm-mobile-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.cm-mobile-field :deep(.v-field) {
  border-radius: 12px;
}

.cm-empty-mobile {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 8px;
  color: #546e7a;
  font-weight: 900;
  text-align: center;
}

/* Mobile pagination */
.cm-mobile-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0 0;
}

.cm-page-indicator {
  font-weight: 900;
  color: rgba(0,0,0,.65);
  font-size: 0.92rem;
  white-space: nowrap;
}

/* Bottom bar */
.cm-bottom-bar {
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

.cm-bottom-btn {
  border-radius: 999px !important;
  font-weight: 950;
}

/* Dialog */
.cm-dialog {
  border-radius: 16px !important;
}

/* Visibility helpers */
.hide-xs { display: block; }
.show-xs { display: none; }
.hide-sm { display: inline-flex; }

@media (max-width: 600px) {
  .cm-page {
    padding: 10px;
    border-radius: 14px;
    padding-bottom: 86px;
  }

  .cm-topbar {
    padding: 12px;
    border-radius: 14px;
    gap: 10px;
  }

  .cm-h1 {
    font-size: 1.02rem;
  }

  .hide-sm { display: none !important; }
  .hide-xs { display: none !important; }
  .show-xs { display: block !important; }

  .cm-search {
    min-width: 100%;
  }

  .cm-tools-right {
    width: 100%;
    justify-content: space-between;
  }

  .cm-truncate {
    max-width: 110px;
  }
}

@media (max-width: 360px) {
  .cm-h1 {
    font-size: 0.98rem;
  }

  .cm-page-indicator {
    font-size: 0.86rem;
  }

  .cm-bottom-btn {
    padding-inline: 12px;
  }
}
</style>
