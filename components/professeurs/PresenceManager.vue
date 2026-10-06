<template>
  <v-container class="pm-page">
    <!-- TOP BAR -->
    <div class="pm-topbar">

      <div class="pm-topbar-title">
        <div class="pm-topbar-h1">
          <v-icon class="mr-2" color="white">mdi-calendar-check-outline</v-icon>
          Gestion des absences
        </div>
        <div class="pm-topbar-sub hide-sm">
          Choisissez la date, marquez les absents, puis « Enregistrer l'appel ».
        </div>
      </div>
    </div>

    <!-- SEMESTERS CARD -->
    <v-card class="pm-card pm-card--semester" elevation="0">
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
            :color="'primary'"
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
    <v-card class="pm-card pm-card--tools" elevation="0">
      <div class="pm-tools">
        <v-text-field
          v-model="search"
          variant="outlined"
          density="compact"
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

    <!-- APPEL : une date, tout le monde présent, un toucher par absent -->
    <v-card class="pm-card pm-card--table" elevation="0">
      <div class="appel-head">
        <v-text-field
          v-model="dateAppel"
          type="date"
          label="Date de l'appel"
          :max="aujourdhui"
          variant="outlined"
          density="compact"
          hide-details
          class="appel-date"
        />
        <div class="appel-compteur">
          <span class="text-success">{{ students.length - nbAbsents }} présent(s)</span>
          · <span class="text-error">{{ nbAbsents }} absent(s)</span>
        </div>
        <!-- Un seul bouton, à côté de la date et du compteur ; la barre reste
             en haut quand on fait défiler la liste. -->
        <v-btn
          color="primary"
          class="appel-enregistrer"
          :loading="saving"
          :disabled="saving || !students.length"
          prepend-icon="mdi-content-save"
          @click="save"
        >Enregistrer l'appel</v-btn>
      </div>
      <p class="appel-aide">Touchez le bouton d'un élève pour le marquer absent (puis permissionnaire).</p>
      <p v-if="nbPermissions" class="appel-permissions">
        <v-icon size="16" color="orange-darken-2">mdi-account-arrow-right</v-icon>
        {{ nbPermissions }} élève(s) ont une permission d'absence ce jour : marqué(s) « Permissionnaire ». Touchez pour changer s'il est là.
      </p>

      <div v-if="filteredStudents.length === 0" class="pm-empty-mobile">
        <v-icon size="22" color="primary" class="mr-2">mdi-information-outline</v-icon>
        Aucun élève trouvé.
      </div>
      <div v-for="st in filteredStudents" :key="st.id" class="appel-ligne">
        <span class="appel-nom">
          {{ st.name }}
          <span v-if="st.permission" class="appel-badge-perm">{{ st.permission.sousReserve ? 'permission sous réserve' : 'permission' }}<template v-if="st.permission.duree"> · {{ st.permission.duree }}</template></span>
        </span>
        <button
          type="button"
          class="appel-statut"
          :class="statutClasse(st.status)"
          @click="basculer(st)"
        >{{ st.status || 'Présent' }}</button>
      </div>
    </v-card>


    <!-- Snackbars -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3200" location="top">
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
  setup() {
    // Période (semestre) affichée : conservée dans l'URL (?periode=).
    const currentSemester = useUrlState("periode", "");
    return { currentSemester };
  },
  data() {
    return {
      semesters: [],
      headers: [
        { title: "Nom / Prénom", value: "name", sortable: true },
        { title: "Date", value: "date", sortable: false },
        { title: "Statut", value: "status", sortable: false },
      ],
      statuses: ["Absent", "Permissionnaire"],
      // Date locale (et non UTC) : juste après minuit, l'appel restait sur la veille.
      dateAppel: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10),
      aujourdhui: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10),
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
    nbPermissions() {
      return this.students.filter((s) => s.permission).length;
    },
    nbAbsents() {
      return this.students.filter((s) => s.status).length;
    },
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
    dateAppel() {
      this.appliquerPermissions();
    },
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
    // Présent → Absent → Permissionnaire → Présent
    basculer(st) {
      st.autoPermission = false;
      st.status = st.status === "" ? "Absent" : st.status === "Absent" ? "Permissionnaire" : "";
    },
    statutClasse(status) {
      return status === "Absent" ? "is-absent" : status === "Permissionnaire" ? "is-permission" : "is-present";
    },
    setSnack(message, color = "info") {
      this.snackbar = { show: true, color, message };
    },

    changeSemester(semesterNom) {
      this.currentSemester = semesterNom;
    },

    // Élèves ayant une permission d'absence accordée ce jour-là : marqués
    // « Permissionnaire » d'office (l'enseignant peut toujours changer).
    async appliquerPermissions() {
      const date = this.dateAppel;
      this.students.forEach((s) => {
        if (s.permission && s.status === "Permissionnaire" && s.autoPermission) s.status = "";
        s.permission = null;
        s.autoPermission = false;
      });
      if (!date || !this.students.length) return;
      try {
        const { data } = await axios.get(`${this.API_BASE}/api/enseignant/permissions`, { params: { classeId: this.classeId, matiereId: this.subjectId, date } });
        if (date !== this.dateAppel) return;
        (Array.isArray(data) ? data : []).forEach((p) => {
          const st = this.students.find((s) => s.id === p.eleveId);
          if (!st) return;
          st.permission = p;
          if (!st.status) { st.status = "Permissionnaire"; st.autoPermission = true; }
        });
      } catch (error) {
        // Sans cette information, l'appel reste utilisable normalement.
      }
    },

    async getStudents() {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${this.API_BASE}/api/classes/${this.classeId}/eleves`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        this.students = (response.data || []).map((student) => ({
          ...student,
          name: `${student.nom} ${student.prenom}`,
          date: "",
          status: "",
          permission: null,
          autoPermission: false,
        }));
        await this.appliquerPermissions();
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
        if (this.semesters.length > 0 && !this.semesters.some((s) => s.nom === this.currentSemester)) {
          this.currentSemester = this.semesters[0].nom;
        }
      } catch (error) {
        console.error("Erreur semestres:", error);
        this.setSnack("Impossible de charger les semestres.", "error");
      }
    },

    // Tout l'appel est envoyé : un élève remis « Présent » efface une absence
    // notée par erreur ce jour-là.
    async save() {
      if (!this.dateAppel) {
        this.setSnack("Choisissez la date de l'appel.", "warning");
        return;
      }
      this.saving = true;
      try {
        const dataToSave = this.students.map((s) => ({
          eleveId: s.id,
          date: this.dateAppel,
          status: s.status || "Présent",
          subjectId: this.subjectId,
          classeId: this.classeId,
          semesterName: this.currentSemester,
          etablissementId: this.etablissementId,
          anneeScolaireId: this.anneeScolaireId,
        }));
        const { data } = await axios.post(`${this.API_BASE}/api/presence`, dataToSave);
        this.setSnack(data.message || "Appel enregistré.", "success");
      } catch (error) {
        this.setSnack(error?.response?.data?.error || "L'appel n'a pas pu être enregistré.", "error");
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
.appel-permissions { margin: 0 10px 6px; font-size: 0.8rem; color: #8a4b00; background: #fff3e0; border-radius: 8px; padding: 5px 8px; }
.appel-badge-perm { display: inline-block; margin-left: 6px; font-size: 0.7rem; font-weight: 700; color: #e65100; background: #fff3e0; border-radius: 6px; padding: 0 6px; }
.appel-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px; position: sticky; top: -16px; z-index: 5; background: #fff; border-bottom: 1px solid #e3e9f1; }
/* La barre d'appel reste visible en haut : la carte ne doit pas couper le défilement. */
.pm-card--table { overflow: visible !important; }
.appel-enregistrer { margin-left: auto; text-transform: none; font-weight: 700; }
@media (max-width: 600px) { .appel-enregistrer { width: 100%; margin-left: 0; } }
.appel-date { max-width: 190px; }
.appel-compteur { font-size: 0.85rem; font-weight: 700; }
.appel-aide { font-size: 0.75rem; color: #5f6b7a; margin: 6px 10px; }
.appel-ligne { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 10px; border-top: 1px solid #edf1f6; }
.appel-nom { font-size: 0.9rem; font-weight: 600; }
.appel-statut { min-width: 118px; padding: 6px 10px; border-radius: 16px; font-size: 0.8rem; font-weight: 700; border: 1px solid; cursor: pointer; }
.appel-statut.is-present { color: #2e7d32; border-color: #a5d6a7; background: #f1f8e9; }
.appel-statut.is-absent { color: #fff; border-color: #c62828; background: #d32f2f; }
.appel-statut.is-permission { color: #e65100; border-color: #ffb74d; background: #fff3e0; }
/* Base */
.pm-page {
  max-width: 1200px;
  padding-top: 14px;
  padding-bottom: 92px;
  background: radial-gradient(900px 500px at 20% 10%, rgba(25,118,210,.14), transparent 55%),
              radial-gradient(800px 500px at 85% 0%, rgba(11,46,74,.10), transparent 55%),
              linear-gradient(180deg, #eef6ff 0%, #f7fbff 45%, #ffffff 100%);
  border-radius: 10px;
}

/* Topbar */
.pm-topbar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 10px;
  background: linear-gradient(90deg, #1976d2 0%, #0b2e4a 100%);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
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
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

/* Cards */
.pm-card {
  border-radius: 10px!important;
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
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
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
  border-radius: 10px!important;
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
  border-radius: 10px!important;
}

/* Visibility helpers */
.hide-xs { display: inline-flex; }
.show-xs { display: none; }
.hide-sm { display: inline-flex; }

@media (max-width: 600px) {
  .pm-page {
    padding-top: 10px;
    border-radius: 10px;
    padding-bottom: 92px;
  }

  .pm-topbar {
    padding: 12px;
    border-radius: 10px;
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

/* =====================================================================
   Interface fine : en-têtes dégradés bas (≤ 40 px), cartes et marges
   réduites, polices raisonnables. Placé en fin de fichier pour
   l'emporter sur les règles plus haut.
   ===================================================================== */
.pm-page {
  padding: 0 !important;
  background: transparent !important;
  border-radius: 0;
}

.pm-topbar {
  gap: 8px;
  min-height: 40px;
  padding: 4px 10px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.pm-back-btn,
.pm-save-btn {
  height: 30px !important;
  font-weight: 700;
}

.pm-back-btn {
  border-radius: 8px !important;
}

.pm-topbar-h1 {
  font-size: 16px;
  font-weight: 800;
}

.pm-topbar-sub {
  margin-top: 0;
  font-size: 12.5px;
  font-weight: 600;
}

.pm-card {
  border-radius: 8px !important;
  backdrop-filter: none;
  margin-bottom: 10px;
}

.pm-card-header {
  height: 36px;
  min-height: 36px;
  padding: 0 10px;
}

.pm-card-title {
  font-size: 14px;
  font-weight: 700;
}

.pm-card-body,
.pm-tools {
  padding: 8px 10px !important;
  gap: 8px;
}

.pm-chip,
.pm-info-chip {
  font-weight: 700;
}

.pm-student-name,
.pm-mobile-name {
  font-weight: 700;
}

.pm-empty,
.pm-empty-mobile {
  padding: 10px 8px;
  font-weight: 700;
}

.pm-mobile-list {
  padding: 8px 0 !important;
}

.pm-mobile-card {
  padding: 8px 10px;
  margin-bottom: 8px;
}

.pm-mobile-head {
  gap: 8px;
  margin-bottom: 6px;
}

.pm-mobile-page-indicator {
  font-size: 13px;
  font-weight: 700;
}

.pm-bottom-bar {
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.94);
}

.pm-bottom-btn {
  font-weight: 700;
}

.pm-mobile-fields {
  gap: 8px;
}

.pm-mobile-field :deep(.v-field) {
  border-radius: 8px;
}

@media (max-width: 600px) {
  /* Barre de boutons fixe en bas : place réservée sous le contenu. */
  .pm-page {
    padding: 0 0 52px !important;
  }

  .pm-topbar {
    min-height: 36px;
    padding: 4px 8px;
    gap: 6px;
  }

  .pm-topbar-h1 {
    font-size: 15px;
  }

  /* Pas de grand cadre autour des blocs : contenu posé sur la page. */
  .pm-card {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    overflow: visible;
    margin-bottom: 8px;
  }

  .pm-card-header {
    height: 32px;
    min-height: 32px;
    border-radius: 8px;
  }

  .pm-card-body,
.pm-tools {
    padding: 6px 0 !important;
  }

  /* Champs deux par ligne ; la zone de texte garde toute la ligne. */
  .pm-mobile-fields {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
