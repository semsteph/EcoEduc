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

          <v-btn color="orange-darken-2" class="toolbar-btn" @click="openMesDemandes" size="small" rounded>
            <v-badge
              :content="demandesNonVuesCount"
              :model-value="demandesNonVuesCount > 0"
              color="deep-orange accent-3"
              overlap
            >
              <v-icon start size="x-small">mdi-shield-alert-outline</v-icon>
            </v-badge>
            Mes demandes
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
              <v-tooltip v-if="isPending(item.id, 'inter1')" text="En attente de validation par l'administration" location="top">
                <template v-slot:activator="{ props }">
                  <v-icon v-bind="props" class="pending-icon" color="orange-darken-2" size="small">mdi-clock-alert-outline</v-icon>
                </template>
              </v-tooltip>
              <v-icon
                v-else-if="item.inter1"
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
              <v-tooltip v-if="isPending(item.id, 'inter2')" text="En attente de validation par l'administration" location="top">
                <template v-slot:activator="{ props }">
                  <v-icon v-bind="props" class="pending-icon" color="orange-darken-2" size="small">mdi-clock-alert-outline</v-icon>
                </template>
              </v-tooltip>
              <v-icon
                v-else-if="item.inter2"
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
              <v-tooltip v-if="isPending(item.id, 'inter3')" text="En attente de validation par l'administration" location="top">
                <template v-slot:activator="{ props }">
                  <v-icon v-bind="props" class="pending-icon" color="orange-darken-2" size="small">mdi-clock-alert-outline</v-icon>
                </template>
              </v-tooltip>
              <v-icon v-else-if="item.inter3" class="delete-icon" color="red" size="small" @click="confirmDelete(item, 'Inter3')">
                mdi-delete
              </v-icon>
            </div>
          </template>

          <template v-slot:[`item.inter4`]="{ item }">
            <div class="note-container">
              <span>{{ item.inter4 || '' }}</span>
              <v-tooltip v-if="isPending(item.id, 'inter4')" text="En attente de validation par l'administration" location="top">
                <template v-slot:activator="{ props }">
                  <v-icon v-bind="props" class="pending-icon" color="orange-darken-2" size="small">mdi-clock-alert-outline</v-icon>
                </template>
              </v-tooltip>
              <v-icon v-else-if="item.inter4" class="delete-icon" color="red" size="small" @click="confirmDelete(item, 'Inter4')">
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
              <v-tooltip v-if="isPending(item.id, 'Dev1')" text="En attente de validation par l'administration" location="top">
                <template v-slot:activator="{ props }">
                  <v-icon v-bind="props" class="pending-icon" color="orange-darken-2" size="small">mdi-clock-alert-outline</v-icon>
                </template>
              </v-tooltip>
              <v-icon v-else-if="item.Dev1" class="delete-icon" color="red" size="small" @click="confirmDelete(item, 'Devoir1')">
                mdi-delete
              </v-icon>
            </div>
          </template>

          <template v-slot:[`item.Dev2`]="{ item }">
            <div class="note-container">
              <span>{{ item.Dev2 || '' }}</span>
              <v-tooltip v-if="isPending(item.id, 'Dev2')" text="En attente de validation par l'administration" location="top">
                <template v-slot:activator="{ props }">
                  <v-icon v-bind="props" class="pending-icon" color="orange-darken-2" size="small">mdi-clock-alert-outline</v-icon>
                </template>
              </v-tooltip>
              <v-icon v-else-if="item.Dev2" class="delete-icon" color="red" size="small" @click="confirmDelete(item, 'Devoir2')">
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

      <!-- Note pas encore sauvegardée (moyenne pas encore calculée/persistée) :
           l'enseignant reste libre de la supprimer sans validation. -->
      <v-dialog v-model="confirmDirectDialog" max-width="420" class="custom-dialog">
        <v-card>
          <v-card-title>Confirmation</v-card-title>
          <v-card-text>
            Cette note n'a pas encore été sauvegardée (le bouton « Sauvegarder » n'a pas encore été validé pour cet élève). Voulez-vous vraiment la supprimer ?
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="grey" variant="text" :disabled="sendingRequest" @click="confirmDirectDialog = false">Annuler</v-btn>
            <v-btn color="red" variant="text" :loading="sendingRequest" @click="deleteNoteDirect">Supprimer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Note déjà sauvegardée : la suppression devient une demande, rien
           n'est supprimé ici tant que l'administration n'a pas validé. -->
      <v-dialog v-model="dialog" max-width="480" class="custom-dialog" persistent>
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon color="warning" class="mr-2">mdi-shield-alert-outline</v-icon>
            Validation de l'administration requise
          </v-card-title>
          <v-card-text>
            <p>
              Cette note est <strong>déjà enregistrée</strong>. Pour des raisons de contrôle,
              toute modification ou suppression d'une note déjà sauvegardée doit être
              <strong>validée par l'administration</strong> avant d'être appliquée.
            </p>
            <p class="text-caption mb-3">
              Votre demande sera envoyée immédiatement à l'administration, qui pourra
              l'approuver ou la refuser. La note actuelle reste visible et inchangée jusqu'à sa décision.
            </p>
            <v-textarea
              v-model="motifDemande"
              label="Motif de la demande (optionnel)"
              rows="2"
              auto-grow
              density="comfortable"
              variant="outlined"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="grey" variant="text" :disabled="sendingRequest" @click="closeRequestDialog">Annuler</v-btn>
            <v-btn color="warning" variant="elevated" :loading="sendingRequest" @click="deleteNote">
              <v-icon start size="small">mdi-send</v-icon>
              Envoyer la demande
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showDeleteDialog" max-width="420" class="custom-dialog">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon color="orange-darken-2" class="mr-2">mdi-clock-alert-outline</v-icon>
            Demande envoyée
          </v-card-title>
          <v-card-text>{{ deleteMessage }}</v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" variant="text" @click="showDeleteDialog = false">OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Suivi des demandes envoyées par l'enseignant -->
      <v-dialog v-model="mesDemandesDialog" max-width="640" class="custom-dialog">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon color="orange-darken-2" class="mr-2">mdi-shield-alert-outline</v-icon>
            Mes demandes de modification de notes
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div v-if="mesDemandes.length === 0" class="text-center text-grey py-4">
              <v-icon size="32" class="mb-2">mdi-check-circle-outline</v-icon>
              <div>Aucune demande envoyée pour le moment.</div>
            </div>
            <v-list v-else density="comfortable">
              <v-list-item v-for="demande in mesDemandes" :key="demande.id" class="mb-2 demande-item">
                <div class="d-flex justify-space-between align-center flex-wrap">
                  <div>
                    <strong>{{ demande.eleve_prenom }} {{ demande.eleve_nom }}</strong>
                    — {{ demande.matiere_nom }} · {{ noteTypeLabel(demande.note_type) }}
                  </div>
                  <v-chip
                    size="small"
                    :color="statutColor(demande.statut)"
                    variant="elevated"
                    class="ml-2"
                  >
                    {{ statutLabel(demande.statut) }}
                  </v-chip>
                </div>
                <div class="text-caption text-grey mt-1">
                  Ancienne valeur : {{ demande.ancienne_valeur ?? '—' }}
                  <span v-if="demande.type_demande === 'modification'"> → Nouvelle valeur : {{ demande.nouvelle_valeur }}</span>
                  <span v-else> (demande de suppression)</span>
                </div>
                <div v-if="demande.commentaire_admin" class="text-caption mt-1">
                  <v-icon size="14">mdi-comment-quote-outline</v-icon>
                  Réponse de l'administration : {{ demande.commentaire_admin }}
                </div>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" variant="text" @click="mesDemandesDialog = false">Fermer</v-btn>
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
    confirmDirectDialog: false,
    deleteMessage: "",
    showDeleteDialog: false,
    noteToDelete: null,
    motifDemande: "",
    sendingRequest: false,

    // Demandes de modification/suppression de notes (circuit de validation admin)
    mesDemandes: [],
    mesDemandesDialog: false,
    demandesNonVuesCount: 0,

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
        const token = localStorage.getItem("token");
        const response = await axios.get(`/api/classes/${this.classeId}/eleves`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
        const response = await axios.get(`/api/semesters/${this.etablissementId}`);
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

      if (this.isPending(student.id, mappedNoteType)) {
        this.showSnack("⏳ Une demande est déjà en attente de validation pour cette note.", "warning");
        return;
      }

      this.noteToDelete = { student, noteType: mappedNoteType };

      // Tant que "Sauvegarder" n'a pas été cliqué pour cet élève (moyenne pas
      // encore calculée/persistée), la note n'est pas "officiellement"
      // enregistrée : suppression libre, sans validation administrative.
      if (this.isAlreadySaved(student)) {
        this.motifDemande = "";
        this.dialog = true;
      } else {
        this.confirmDirectDialog = true;
      }
    },

    // Une note est considérée "déjà enregistrée" dès que la moyenne a été
    // calculée et persistée via le bouton Sauvegarder (POST /notes/save).
    // (student.Moy est toujours recalculé pour l'affichage, y compris avant
    // toute sauvegarde : ce n'est pas un indicateur fiable, contrairement à
    // estDejaSauvegardee qui reflète l'état réel en base.)
    isAlreadySaved(student) {
      return !!student.estDejaSauvegardee;
    },

    closeRequestDialog() {
      this.dialog = false;
      this.noteToDelete = null;
      this.motifDemande = "";
    },

    // Suppression LIBRE : n'est appelée que pour une note dont la moyenne n'a
    // jamais été sauvegardée. Le serveur revérifie cette condition (défense
    // en profondeur) et bascule vers le circuit de demande si elle a changé
    // entre-temps (ex: un autre onglet a sauvegardé entre-temps).
    async deleteNoteDirect() {
      if (!this.noteToDelete || this.sendingRequest) return;

      const { student, noteType } = this.noteToDelete;
      const semestreId = this.getSemesterId(this.currentSemester);

      this.sendingRequest = true;
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/deleteNote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            eleveId: student.id,
            semestreId,
            anneeScolaireId: this.anneeScolaireId,
            classeId: this.classeId,
            etablissementId: this.etablissementId,
            noteType,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          if (result.code === "ADMIN_APPROVAL_REQUIRED") {
            // La moyenne a été sauvegardée entre-temps : on bascule vers le
            // circuit de demande au lieu d'échouer silencieusement.
            this.confirmDirectDialog = false;
            this.motifDemande = "";
            this.dialog = true;
            this.showSnack("⏳ Cette note a déjà été sauvegardée : une validation de l'administration est requise.", "warning");
            return;
          }
          throw new Error(result.message || "Erreur suppression.");
        }

        this.students = this.students.map((s) => {
          if (s.id === student.id) s[noteType] = null;
          return s;
        });

        this.confirmDirectDialog = false;
        this.noteToDelete = null;
        this.showSnack(`✅ Note supprimée pour ${result.nom} ${result.prenom}.`, "success");
      } catch (error) {
        console.error("Erreur lors de la suppression :", error);
        this.confirmDirectDialog = false;
        this.showSnack("❌ Une erreur s'est produite lors de la suppression.", "error");
      } finally {
        this.sendingRequest = false;
      }
    },

    // Envoie une DEMANDE de suppression à l'administration (note déjà
    // sauvegardée) : la note n'est jamais modifiée directement par
    // l'enseignant. Elle ne sera effacée que lorsque l'administration
    // approuvera la demande.
    async deleteNote() {
      if (!this.noteToDelete || this.sendingRequest) return;

      const { student, noteType } = this.noteToDelete;
      const semestreId = this.getSemesterId(this.currentSemester);

      this.sendingRequest = true;
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/notes/modification-requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            eleveId: student.id,
            classeId: this.classeId,
            matiereId: this.subjectId,
            semestreId,
            anneeScolaireId: this.anneeScolaireId,
            etablissementId: this.etablissementId,
            noteType,
            ancienneValeur: student[noteType],
            motif: this.motifDemande || null,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Erreur lors de l'envoi de la demande.");

        this.dialog = false;
        this.deleteMessage = `⏳ Demande envoyée pour ${student.prenom} ${student.nom}. La note reste inchangée jusqu'à la validation de l'administration.`;
        this.showDeleteDialog = true;

        this.showSnack("✅ Demande envoyée à l'administration.", "success");
        this.noteToDelete = null;
        this.motifDemande = "";
        await this.fetchMesDemandes();
      } catch (error) {
        console.error("Erreur lors de l'envoi de la demande :", error);
        const message = error.message && error.message.includes("attente")
          ? `⏳ ${error.message}`
          : "❌ Une erreur s'est produite lors de l'envoi de la demande.";
        this.showSnack(message, error.message && error.message.includes("attente") ? "warning" : "error");
      } finally {
        this.sendingRequest = false;
      }
    },

    // --- Demandes de modification/suppression : suivi côté enseignant ---
    noteKey(eleveId, noteType) {
      return `${eleveId}_${noteType}`;
    },

    isPending(eleveId, noteType) {
      return this.mesDemandes.some((d) =>
        d.statut === "en_attente" &&
        Number(d.eleve_id) === Number(eleveId) &&
        d.note_type === noteType &&
        Number(d.matieres_id) === Number(this.subjectId) &&
        Number(d.classe_id) === Number(this.classeId) &&
        Number(d.semestre_id) === Number(this.getSemesterId(this.currentSemester))
      );
    },

    noteTypeLabel(noteType) {
      const labels = {
        inter1: "Inter 1", inter2: "Inter 2", inter3: "Inter 3", inter4: "Inter 4",
        TP1: "TP 1", TP2: "TP 2", Dev1: "Devoir 1", Dev2: "Devoir 2",
      };
      return labels[noteType] || noteType;
    },

    statutLabel(statut) {
      const labels = { en_attente: "En attente", approuvee: "Approuvée", rejetee: "Refusée" };
      return labels[statut] || statut;
    },

    statutColor(statut) {
      const colors = { en_attente: "orange-darken-2", approuvee: "green-darken-1", rejetee: "red-darken-1" };
      return colors[statut] || "grey";
    },

    async fetchMesDemandes() {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/notes/modification-requests/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.mesDemandes = response.data || [];
      } catch (error) {
        console.error("Erreur lors de la récupération des demandes :", error);
      }
      await this.fetchDemandesNonVuesCount();
    },

    async fetchDemandesNonVuesCount() {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("/api/notes/modification-requests/mine/count", {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.demandesNonVuesCount = response.data.count || 0;
      } catch (error) {
        console.error("Erreur lors du comptage des demandes :", error);
      }
    },

    async openMesDemandes() {
      await this.fetchMesDemandes();
      this.mesDemandesDialog = true;

      if (this.demandesNonVuesCount > 0) {
        try {
          const token = localStorage.getItem("token");
          await axios.put("/api/notes/modification-requests/mine/mark-seen", {}, {
            headers: { Authorization: `Bearer ${token}` },
          });
          this.demandesNonVuesCount = 0;
        } catch (error) {
          console.error("Erreur lors du marquage des demandes comme vues :", error);
        }
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
        const response = await axios.post(`/api/upload/excel`, formData, {
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
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `/api/notes/${this.classeId}/${this.subjectId}/${semesterId}/${this.anneeScolaireId}`,
          { headers: { Authorization: `Bearer ${token}` } }
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
            // Reflète l'état réel en base : true seulement après un clic sur
            // "Sauvegarder" pour cet élève (Moy ci-dessus est toujours
            // recalculé à l'affichage, même avant toute sauvegarde).
            student.estDejaSauvegardee = !!studentNotes.estDejaSauvegardee;
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
            student.estDejaSauvegardee = false;
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

        const saveToken = localStorage.getItem("token");
        await axios.post(`/api/notes/save`, payload, {
          headers: { Authorization: `Bearer ${saveToken}` },
        });

        // Recharge l'état "déjà sauvegardée" : à partir de maintenant, toute
        // suppression pour ces élèves devra passer par une validation admin.
        await this.fetchNotesData();

        this.showSnack("✅ Notes sauvegardées avec succès !", "success");
      } catch (error) {
        console.error("Erreur lors de la sauvegarde des notes", error);
        this.showSnack("❌ Échec de la sauvegarde des notes.", "error");
      }
    },

    async generateExcelFile() {
      try {
        const response = await axios({
          url: `/api/export/excel/${this.classeId}`,
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
    await this.fetchMesDemandes();
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

/* Note en attente de validation administrative */
.pending-icon {
  cursor: help;
}

.demande-item {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 10px 12px !important;
}
</style>
