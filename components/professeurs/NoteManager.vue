<template>
  <v-app>
    <v-container fluid class="app-container pa-2">
      <!-- Bouton Retour -->
      <v-row class="justify-center mb-2">
        <v-col cols="12" class="d-flex justify-center">
          <v-btn color="primary" @click="$emit('back')" class="retour-btn" rounded size="small">
            <v-icon start size="small">mdi-arrow-left</v-icon>
            Retour
          </v-btn>
        </v-col>
      </v-row>

      <!-- Titre -->
      <v-row class="justify-center mb-1">
        <v-col cols="12" class="text-center">
          <h1 class="title d-inline-flex align-center">
            <v-icon start size="small" color="primary">mdi-book-open-page-variant</v-icon>
            Cahier de notes
          </h1>
        </v-col>
      </v-row>

      <!-- Les boutons de semestres -->
      <v-row class="semester-scroller-row mb-3" no-gutters>
        <v-col class="px-0" cols="12">
          <div class="semester-scroller">
            <v-btn
              v-for="semester in semesters"
              :key="semester.id"
              :color="getButtonColor(semester.nom)"
              @click="changeSemester(semester.nom)"
              :class="{ 'v-btn--active': currentSemester === semester.nom }"
              rounded
              size="small"
              class="semester-btn"
            >
              <v-icon start size="x-small">mdi-calendar</v-icon>
              <span class="semester-label">{{ semester.nom }}</span>
            </v-btn>
          </div>
        </v-col>
      </v-row>

      <!-- Boutons d'action principaux -->
      <v-row class="action-buttons mb-3" dense>
        <v-col cols="6" sm="4" md="3" class="px-1">
          <v-btn block color="green-darken-1" @click="generateExcelFile" size="small" rounded class="action-btn">
            <v-icon start size="x-small">mdi-file-excel</v-icon>
            Générer
          </v-btn>
        </v-col>
      </v-row>

      <!-- Toolbar -->
      <v-toolbar flat class="responsive-toolbar elevation-1 rounded-lg mb-3 px-2">
        <div class="toolbar-title-section">
          <v-toolbar-title class="pa-0 d-flex align-center">
            <v-icon start size="small" color="primary">mdi-book</v-icon>
            <span class="toolbar-title">Cahier de note</span>
          </v-toolbar-title>
          <div class="responsive-text">{{ matiereNom }} - {{ currentSemester }}</div>
        </div>

        <v-spacer></v-spacer>

        <div class="responsive-button-group">
          <v-btn color="blue-darken-1" class="toolbar-btn" @click="openImportForm1" size="small" rounded>
            <v-icon start size="x-small">mdi-check-decagram</v-icon>
            Valider
          </v-btn>

          <v-btn color="red-darken-1" class="toolbar-btn" @click="saveNotes" size="small" rounded>
            <v-icon start size="x-small">mdi-content-save</v-icon>
            Sauvegarder
          </v-btn>
        </div>
      </v-toolbar>

      <!-- Tableau -->
      <div class="responsive-table-wrapper">
        <v-data-table
          :headers="headers"
          :items="students"
          :search="search"
          class="elevation-1 responsive-table"
          :items-per-page="10"
          density="compact"
        >
          <template v-slot:item.studentName="{ item }">
            <span>{{ item.nom }} {{ item.prenom }}</span>
          </template>

          <template v-slot:[`item.inter1`]="{ item }">
            <div class="note-container">
              <span>{{ item.inter1 || '' }}</span>
              <v-icon
                v-if="item.inter1"
                class="delete-icon"
                color="red"
                size="small"
                @click="confirmDelete(item, 'Inter1')"
              >mdi-delete</v-icon>
            </div>
          </template>

          <template v-slot:[`item.inter2`]="{ item }">
            <div class="note-container">
              <span>{{ item.inter2 || '' }}</span>
              <v-icon
                v-if="item.inter2"
                class="delete-icon"
                color="red"
                size="small"
                @click="confirmDelete(item, 'Inter2')"
              >mdi-delete</v-icon>
            </div>
          </template>

          <template v-slot:[`item.inter3`]="{ item }">
            <div class="note-container">
              <span>{{ item.inter3 || '' }}</span>
              <v-icon v-if="item.inter3" class="delete-icon" color="red" size="small" @click="confirmDelete(item, 'Inter3')">
                mdi-delete
              </v-icon>
            </div>
          </template>

          <template v-slot:[`item.inter4`]="{ item }">
            <div class="note-container">
              <span>{{ item.inter4 || '' }}</span>
              <v-icon v-if="item.inter4" class="delete-icon" color="red" size="small" @click="confirmDelete(item, 'Inter4')">
                mdi-delete
              </v-icon>
            </div>
          </template>

          <template v-slot:[`item.MoyI`]="{ item }">
            <span>{{ item.MoyI || '' }}</span>
          </template>

          <template v-slot:[`item.Dev1`]="{ item }">
            <div class="note-container">
              <span>{{ item.Dev1 || '' }}</span>
              <v-icon v-if="item.Dev1" class="delete-icon" color="red" size="small" @click="confirmDelete(item, 'Devoir1')">
                mdi-delete
              </v-icon>
            </div>
          </template>

          <template v-slot:[`item.Dev2`]="{ item }">
            <div class="note-container">
              <span>{{ item.Dev2 || '' }}</span>
              <v-icon v-if="item.Dev2" class="delete-icon" color="red" size="small" @click="confirmDelete(item, 'Devoir2')">
                mdi-delete
              </v-icon>
            </div>
          </template>

          <template v-slot:[`item.Moy`]="{ item }">
            <span>{{ item.Moy || '' }}</span>
          </template>

          <template v-slot:[`item.Moycoef`]="{ item }">
            <span>{{ item.Moycoef || '' }}</span>
          </template>
        </v-data-table>
      </div>

      <!-- Snackbar (manuel, visible desktop/mobile) -->
      <v-snackbar
        v-model="snackbar"
        :color="snackbarColor"
        location="top end"
        :timeout="-1"
        class="snackbar-strong"
      >
        <div class="snackbar-content">
          <v-icon class="mr-2" size="small" color="white">{{ snackbarIcon }}</v-icon>
          <span class="snackbar-text">{{ snackbarMessage }}</span>
        </div>

        <template v-slot:actions>
          <v-btn variant="text" color="white" @click="snackbar = false">
            <v-icon start size="small">mdi-close</v-icon>
            Fermer
          </v-btn>
        </template>
      </v-snackbar>

      <!-- Dialogues -->
      <v-dialog v-model="dialog1" max-width="520" class="custom-dialog">
        <v-card>
          <v-card-title><span class="headline">Importer des notes</span></v-card-title>
          <v-card-text>
            <v-form ref="form1" v-model="valid1">
              <v-select v-model="selectedNoteType" :items="noteTypes" label="Type de note" required />
              <v-file-input
                v-model="selectedFile"
                label="Fichier Excel"
                accept=".xlsx, .xls"
                prepend-icon="mdi-upload"
                required
              />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue-darken-1" variant="text" @click="closeImportForm1">Annuler</v-btn>
            <v-btn color="green-darken-1" variant="text" @click="handleFileUpload">Importer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="dialog" max-width="420" class="custom-dialog">
        <v-card>
          <v-card-title>Confirmation</v-card-title>
          <v-card-text>Êtes-vous sûr de vouloir supprimer cette note ?</v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="grey" variant="text" @click="dialog = false">Annuler</v-btn>
            <v-btn color="red" variant="text" @click="deleteNote">Supprimer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showDeleteDialog" max-width="420" class="custom-dialog">
        <v-card>
          <v-card-title>Suppression réussie</v-card-title>
          <v-card-text>{{ deleteMessage }}</v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" variant="text" @click="showDeleteDialog = false">OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="dialogElevesNonTrouves" max-width="520" class="custom-dialog">
        <v-card>
          <v-card-title class="headline">Élèves introuvables</v-card-title>
          <v-card-text>
            <div>Les élèves suivants n’ont pas été trouvés dans la classe sélectionnée :</div>
            <v-list density="compact">
              <v-list-item v-for="(eleve, index) in nonFoundStudents" :key="index">
                <v-list-item-title>{{ eleve }}</v-list-item-title>
              </v-list-item>
            </v-list>
            <div class="gog">Veuillez vérifier si vous importez le bon fichier</div>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="text" @click="dialogElevesNonTrouves = false">Fermer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </v-app>
</template>

<script>
import axios from "axios";

export default {
  props: {
    subjectId: { type: Number, required: true },
    classeId: { type: Number, required: true },
    etablissementId: { type: Number, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
  },
  data: () => ({
    dialog1: false,
    dialog2: false,
    dialogElevesNonTrouves: false,

    snackbar: false,
    snackbarMessage: "",
    snackbarColor: "success",
    snackbarIcon: "mdi-check-circle",

    dialog: false,
    deleteMessage: "",
    showDeleteDialog: false,
    noteToDelete: null,

    search: "",
    valid1: false,
    valid2: false,

    matiereNom: "",
    currentSemester: "",
    semesters: [],

    headers: [
      { title: "Nom/Prénom", value: "studentName", sortable: false },
      { title: "Inter 1", value: "inter1" },
      { title: "Inter 2", value: "inter2" },
      { title: "Inter 3", value: "inter3" },
      { title: "Inter 4", value: "inter4" },
      { title: "MoyI", value: "MoyI" },
      { title: "Devoir 1", value: "Dev1" },
      { title: "Devoir 2", value: "Dev2" },
      { title: "Moy", value: "Moy" },
      { title: "Moycoef", value: "Moycoef" },
    ],
    students: [],

    noteTypes: ["Inter1", "Inter2", "Inter3", "Inter4", "Devoir1", "Devoir2"],
    noteTypes1: ["Inter1", "Inter2", "Inter3", "Inter4"],
    selectedNoteType: null,
    selectedFile: null,

    nonFoundStudents: [],
  }),

  methods: {
    showSnack(message, type = "success") {
      const map = {
        success: { color: "success", icon: "mdi-check-circle" },
        error: { color: "error", icon: "mdi-alert-circle" },
        warning: { color: "warning", icon: "mdi-alert" },
        info: { color: "info", icon: "mdi-information" },
      };

      const cfg = map[type] || map.info;
      this.snackbarMessage = message;
      this.snackbarColor = cfg.color;
      this.snackbarIcon = cfg.icon;
      this.snackbar = true; // timeout = -1 => reste affiché jusqu'à fermeture
    },

    getButtonColor(semester) {
      return this.currentSemester === semester ? "primary" : "secondary";
    },

    changeSemester(semester) {
      this.currentSemester = semester;
      this.fetchNotesData();
    },

    // Récupération des étudiants et tri par ordre alphabétique
    async getStudents() {
      try {
        const response = await axios.get(`http://localhost:8080/api/classes/${this.classeId}/eleves`);
        this.students = response.data || [];

        this.students.sort((a, b) => {
          const nomA = (a.nom || "").toUpperCase();
          const nomB = (b.nom || "").toUpperCase();
          return nomA < nomB ? -1 : nomA > nomB ? 1 : 0;
        });

        this.showSnack("✅ Élèves chargés.", "success");
      } catch (error) {
        console.error("Erreur lors de la récupération des élèves", error);
        this.showSnack("❌ Impossible de charger les élèves.", "error");
      }
    },

    async fetchSemesters() {
      try {
        const response = await axios.get(`http://localhost:8080/api/semesters/${this.etablissementId}`);
        this.semesters = response.data || [];

        if (this.semesters.length > 0) {
          this.currentSemester = this.semesters[0].nom;
          await this.fetchNotesData();
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des semestres", error);
        this.showSnack("❌ Impossible de charger les semestres.", "error");
      }
    },

    confirmDelete(student, noteTypes) {
      if (!noteTypes) return;

      const noteTypesMapping = {
        Inter1: "inter1",
        Inter2: "inter2",
        Inter3: "inter3",
        Inter4: "inter4",
        Devoir1: "Dev1",
        Devoir2: "Dev2",
      };

      const mappedNoteType = noteTypesMapping[noteTypes];
      if (!mappedNoteType) return;

      this.noteToDelete = { student, noteType: mappedNoteType };
      this.dialog = true;
    },

    async deleteNote() {
      if (!this.noteToDelete) return;

      const { student, noteType } = this.noteToDelete;
      const semesterId = this.getSemesterId(this.currentSemester);

      try {
        const response = await fetch("http://localhost:8080/api/deleteNote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eleveId: student.id,
            semestreId: semesterId,
            anneeScolaireId: this.anneeScolaireId,
            classeId: this.classeId,
            etablissementId: this.etablissementId,
            noteType,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Erreur suppression.");

        // Mise à jour locale
        this.students = this.students.map((s) => {
          if (s.id === student.id) s[noteType] = null;
          return s;
        });

        this.dialog = false;
        this.deleteMessage = `✅ La note "${noteType}" a été supprimée pour ${result.nom} ${result.prenom}.`;
        this.showDeleteDialog = true;

        this.showSnack("✅ Note supprimée avec succès.", "success");
      } catch (error) {
        console.error("Erreur lors de la suppression :", error);
        this.dialog = false;
        this.showSnack("❌ Une erreur s'est produite lors de la suppression.", "error");
      }
    },

    openImportForm1() {
      this.dialog1 = true;
    },
    closeImportForm1() {
      this.dialog1 = false;
    },

    async handleFileUpload() {
      if (!this.selectedNoteType || !this.selectedFile) {
        this.showSnack("⚠️ Veuillez remplir tous les champs requis.", "warning");
        return;
      }

      const formData = new FormData();
      formData.append("typeNote", this.selectedNoteType);
      formData.append("file", this.selectedFile);
      formData.append("semestreId", this.getSemesterId(this.currentSemester));
      formData.append("matiereId", this.subjectId);
      formData.append("classeId", this.classeId);
      formData.append("etablissementId", this.etablissementId);
      formData.append("anneeScolaireId", this.anneeScolaireId);

      try {
        const response = await axios.post(`http://localhost:8080/api/upload/excel`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        this.showSnack(response.data.message || "✅ Importation réussie !", "success");
        this.dialog1 = false;

        await this.fetchNotesData();

        setTimeout(() => {
          this.selectedNoteType = "";
          this.selectedFile = null;
        }, 50);

        if (this.$refs.form1) this.$refs.form1.resetValidation();
      } catch (error) {
        let message = "❌ Erreur lors de l'importation.";
        let details = [];

        if (error.response) {
          const status = error.response.status;
          const data = error.response.data || {};
          if (status === 409) {
            message = data.message || "⚠️ Certaines notes existent déjà.";
            if (Array.isArray(data.details)) details = data.details;
          } else if (status === 400) {
            message = data.message || "⚠️ Requête invalide.";
          } else if (status === 500) {
            message = "❌ Erreur serveur. Réessayez plus tard.";
          } else {
            message = data.message || message;
          }
        }

        this.showSnack(message, "error");

        if (details.length > 0) {
          this.nonFoundStudents = details;
          this.dialogElevesNonTrouves = true;
        }
      }
    },

    getSemesterId(semesterName) {
      const semester = this.semesters.find((sem) => sem.nom === semesterName);
      return semester ? semester.id : null;
    },

    // Récupération des notes selon le semestre
    async fetchNotesData() {
      try {
        const semesterId = this.getSemesterId(this.currentSemester);
        const response = await axios.get(
          `http://localhost:8080/api/notes/${this.classeId}/${this.subjectId}/${semesterId}/${this.anneeScolaireId}`
        );
        const notesData = response.data || [];

        this.students.forEach((student) => {
          const studentNotes = notesData.find((note) => note.eleveId === student.id);

          if (studentNotes) {
            student.notesId = studentNotes.notesId || null;
            student.inter1 = studentNotes.inter1 !== null ? Number(studentNotes.inter1) : null;
            student.inter2 = studentNotes.inter2 !== null ? Number(studentNotes.inter2) : null;
            student.inter3 = studentNotes.inter3 !== null ? Number(studentNotes.inter3) : null;
            student.inter4 = studentNotes.inter4 !== null ? Number(studentNotes.inter4) : null;
            student.MoyI = studentNotes.moyInter !== null ? Number(studentNotes.moyInter) : null;
            student.Dev1 = studentNotes.Dev1 !== null ? Number(studentNotes.Dev1) : null;
            student.Dev2 = studentNotes.Dev2 !== null ? Number(studentNotes.Dev2) : null;
            student.Moy = studentNotes.moy !== null ? Number(studentNotes.moy) : null;
            student.Moycoef = studentNotes.coeff !== null ? Number(studentNotes.coeff) : null;
          } else {
            student.notesId = null;
            student.inter1 = null;
            student.inter2 = null;
            student.inter3 = null;
            student.inter4 = null;
            student.MoyI = null;
            student.Dev1 = null;
            student.Dev2 = null;
            student.Moy = null;
            student.Moycoef = null;
          }
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des notes :", error);
        this.showSnack("❌ Impossible de récupérer les notes.", "error");
      }
    },

    async saveNotes() {
      try {
        const semestreId = this.getSemesterId(this.currentSemester);

        const payload = {
          classeId: this.classeId,
          subjectId: this.subjectId,
          semesterId: semestreId,
          etablissementId: this.etablissementId,
          anneeScolaireId: this.anneeScolaireId,
          notes: this.students.map((student) => ({
            nom: student.nom,
            prenom: student.prenom,
            MoyI: student.MoyI,
            Moy: student.Moy,
            Moycoef: student.Moycoef,
          })),
        };

        await axios.post(`http://localhost:8080/api/notes/save`, payload);

        this.showSnack("✅ Notes sauvegardées avec succès !", "success");
      } catch (error) {
        console.error("Erreur lors de la sauvegarde des notes", error);
        this.showSnack("❌ Échec de la sauvegarde des notes.", "error");
      }
    },

    async generateExcelFile() {
      try {
        const response = await axios({
          url: `http://localhost:8080/api/export/excel/${this.classeId}`,
          method: "POST",
          responseType: "blob",
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Classe_${this.classeId}_Semestre_${this.currentSemester}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();

        this.showSnack("✅ Fichier Excel généré avec succès.", "success");
      } catch (error) {
        console.error("Erreur lors de la génération du fichier Excel", error);
        this.showSnack("❌ Erreur lors de la génération du fichier Excel.", "error");
      }
    },
  },

  async mounted() {
    await this.getStudents();
    await this.fetchSemesters();
    await this.fetchNotesData();
  },
};
</script>

<style scoped>
/* Container */
.app-container {
  width: 100%;
  max-width: 100% !important;
  padding: 8px !important;
  box-sizing: border-box;
}

/* Retour */
.retour-btn {
  max-width: 240px;
}

/* Titre */
.title {
  font-weight: 800;
  font-size: 1.15rem;
  margin: 0;
}

/* Semestres */
.semester-scroller {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  align-items: center;
  padding: 4px 4px;
}
.semester-btn {
  flex: 0 0 auto;
  min-width: 72px;
  padding: 4px 10px !important;
  border-radius: 24px !important;
  font-size: 0.78rem;
  text-transform: uppercase;
  white-space: nowrap;
}

/* Actions */
.action-btn {
  font-size: 0.75rem;
  padding: 6px 8px !important;
}

/* Toolbar */
.responsive-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px !important;
}
.toolbar-title {
  font-size: 0.95rem;
  font-weight: 700;
}
.responsive-text {
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.6);
}

/* Boutons toolbar */
.responsive-button-group {
  display: flex;
  gap: 6px;
  align-items: center;
}
.toolbar-btn {
  min-width: 84px;
  font-size: 0.78rem;
  padding: 6px 8px !important;
}

/* Tableau */
.responsive-table-wrapper {
  overflow-x: auto;
  width: 100%;
  padding-bottom: 8px;
}
.responsive-table {
  min-width: 640px;
}

/* --- SNACKBAR: bien visible desktop & mobile --- */
.snackbar-strong :deep(.v-overlay__content),
.snackbar-strong :deep(.v-snackbar__wrapper),
.snackbar-strong :deep(.v-snackbar) {
  width: min(560px, calc(100vw - 24px)) !important;
}

.snackbar-strong :deep(.v-snackbar__wrapper) {
  border-radius: 14px !important;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22) !important;
  border: 1px solid rgba(255, 255, 255, 0.22) !important;
}

.snackbar-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
}

.snackbar-text {
  font-size: 0.95rem;
  line-height: 1.25rem;
  word-break: break-word;
}

/* Dialogues - responsive */
.custom-dialog .v-card {
  border-radius: 14px;
}

/* Petits écrans */
@media (max-width: 480px) {
  .retour-btn {
    max-width: 160px;
  }
  .title {
    font-size: 1rem;
  }
  .semester-btn {
    min-width: 56px;
    padding: 2px 6px !important;
    font-size: 0.65rem;
  }
  .action-btn {
    font-size: 0.68rem;
    padding: 4px 6px !important;
  }
  .toolbar-title {
    font-size: 0.85rem;
  }
  .responsive-text {
    font-size: 0.7rem;
  }
  .toolbar-btn {
    min-width: 68px;
    font-size: 0.68rem;
    padding: 4px 6px !important;
  }
  .responsive-table {
    min-width: 900px;
  }
  .responsive-button-group {
    flex-direction: column;
    align-items: stretch;
  }

  .snackbar-text {
    font-size: 0.88rem;
  }
}

/* Très petits écrans */
@media (max-width: 360px) {
  .semester-btn {
    min-width: 48px;
    padding: 2px 4px !important;
    font-size: 0.6rem;
    border-radius: 18px !important;
  }
  .toolbar-btn {
    min-width: 60px;
    font-size: 0.62rem;
    padding: 3px 5px !important;
  }
  .title {
    font-size: 0.95rem;
  }
  .responsive-table {
    min-width: 900px;
  }
  .snackbar-text {
    font-size: 0.82rem;
  }
}

/* Bouton actif */
.v-btn--active {
  background-color: #1976d2 !important;
  color: white !important;
}
</style>
