<template>
  <v-container class="ct-page">
    <!-- TOP BAR -->
    <div class="ct-topbar">

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

    <!-- PROGRAMME DE LA MATIÈRE (dépôt une fois, puis partie du jour proposée) -->
    <ProgrammeMatiere
      v-if="classeId && subjectId"
      ref="programme"
      :classe-id="classeId"
      :subject-id="subjectId"
      @charge="programmeCharge"
    />

    <!-- SEMESTERS -->
    <v-card class="ct-card" elevation="0">
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

    <!-- TOOLS -->
    <v-card class="ct-card" elevation="0">
      <v-card-text class="ct-tools">
        <v-text-field
          v-model="search"
          variant="outlined"
          density="compact"
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
    <v-card class="ct-card ct-table-wrap ct-hide-xs" elevation="0">
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
        density="compact"
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
            <v-chip v-if="item.element_termine" size="x-small" color="success" variant="tonal" class="ml-1">terminée</v-chip>
          </div>
          <div v-if="item.contenu" class="ct-contenu">{{ item.contenu }}</div>
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
    <v-card class="ct-card ct-show-xs" elevation="0">
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
            <v-chip v-if="act.element_termine" size="x-small" color="success" variant="tonal" class="ml-1">terminée</v-chip>
          </div>
          <div v-if="act.contenu" class="ct-contenu">{{ act.contenu }}</div>

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
            Ajouter une séance
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
                  density="compact"
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
                  density="compact"
                  color="primary"
                  hide-details="auto"
                  :rules="[v => !!v || 'Horaire obligatoire']"
                />
              </v-col>

              <!-- Partie du programme : déjà proposée, un toucher pour en changer -->
              <v-col v-if="avecProgramme" cols="12">
                <div class="ct-partie-label">Partie du programme</div>
                <div v-if="partieChoisie" class="ct-partie" @click="choixPartie = !choixPartie">
                  <div class="ct-partie-chemin">{{ partieChoisie.parents }}</div>
                  <div class="ct-partie-titre">{{ partieChoisie.titre }}</div>
                  <div class="ct-partie-bas">
                    <v-chip size="x-small" :color="partieChoisie.dejaCommencee ? 'primary' : 'success'" variant="flat">
                      {{ partieChoisie.dejaCommencee ? "Suite" : "Nouvelle partie" }}
                    </v-chip>
                    <span class="ct-partie-changer">
                      <v-icon size="16">mdi-swap-horizontal</v-icon>
                      {{ choixPartie ? "Fermer la liste" : "Changer" }}
                    </span>
                  </div>
                </div>
                <div v-if="choixPartie || !partieChoisie" class="ct-partie-liste">
                  <template v-for="x in lignesProgramme" :key="x.element.id">
                    <div v-if="!x.feuille" class="ct-liste-titre" :style="{ paddingLeft: `${x.chemin.length * 10 - 10}px` }">{{ x.texte }}</div>
                    <div
                      v-else
                      class="ct-liste-feuille"
                      :class="{ 'ct-liste-feuille--active': x.element.id === newActivity.elementId }"
                      :style="{ paddingLeft: `${x.chemin.length * 10}px` }"
                      @click="choisirPartie(x.element.id)"
                    >
                      <v-icon size="16" class="mr-1" :color="etatPartie(x.element.id).couleur">{{ etatPartie(x.element.id).icone }}</v-icon>
                      {{ x.texte }}
                    </div>
                  </template>
                </div>
                <div class="ct-hors-programme" @click="horsProgramme = true">Séance hors programme (révision, évaluation…) ?</div>
              </v-col>

              <v-col v-if="avecProgramme" cols="12">
                <v-textarea
                  v-model="newActivity.contenu"
                  label="Ce qui a été fait aujourd'hui (facultatif)"
                  placeholder="Ex. : définition et exemples, exercice 3 p. 87"
                  variant="outlined"
                  density="compact"
                  color="primary"
                  auto-grow
                  rows="2"
                  hide-details
                />
                <v-checkbox v-model="newActivity.termine" label="Cette partie est terminée" color="success" density="compact" hide-details />
                <v-checkbox
                  v-if="newActivity.termine && partieSuivante"
                  v-model="newActivity.aussiSuivante"
                  :label="`J'ai aussi commencé : ${partieSuivante.texte}`"
                  color="primary"
                  density="compact"
                  hide-details
                />
              </v-col>

              <v-col v-else cols="12">
                <v-alert v-if="programmeData.programme && horsProgramme" type="info" variant="tonal" density="compact" class="mb-2">
                  Séance hors programme.
                  <a href="#" @click.prevent="horsProgramme = false">Revenir au programme</a>
                </v-alert>
                <v-textarea
                  v-model="newActivity.activite"
                  label="Activité"
                  placeholder="Décrivez l'activité réalisée..."
                  variant="outlined"
                  density="compact"
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
import ProgrammeMatiere from "@/components/professeurs/ProgrammeMatiere.vue";

const intitulePartie = (e) => `${e.libelle}${e.numero ? ` ${e.numero}` : ""} : ${e.titre}`;
function aplatirProgramme(noeuds, chemin = [], sortie = []) {
  (noeuds || []).forEach((n) => {
    const c = [...chemin, n];
    sortie.push({ element: n, chemin: c, feuille: !(n.enfants || []).length, texte: intitulePartie(n) });
    aplatirProgramme(n.enfants, c, sortie);
  });
  return sortie;
}

export default {
  name: "CahierDeTexteManager",
  components: { ProgrammeMatiere },
  props: {
    classeId: String,
    subjectId: String,
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
      dialog: false,
      hideDialog: false,
      successMessage: false,
      errorMessage: false,

      adding: false,

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
        elementId: null,
        contenu: "",
        termine: false,
        aussiSuivante: false,
      },

      // Programme de la matière (chargé par la carte du programme)
      programmeData: { programme: null, arbre: [], progression: {}, suggestion: null },
      choixPartie: false,
      horsProgramme: false,
      // Créneaux de l'emploi du temps de la classe (pour pré-remplir l'horaire)
      creneaux: [],

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
    avecProgramme() {
      return !!this.programmeData.programme && this.programmeData.arbre.length > 0 && !this.horsProgramme;
    },
    lignesProgramme() {
      return aplatirProgramme(this.programmeData.arbre);
    },
    feuillesProgramme() {
      return this.lignesProgramme.filter((x) => x.feuille);
    },
    partieChoisie() {
      const x = this.feuillesProgramme.find((f) => f.element.id === this.newActivity.elementId);
      if (!x) return null;
      return {
        parents: x.chemin.slice(0, -1).map(intitulePartie).join(" › "),
        titre: x.texte,
        dejaCommencee: !!this.programmeData.progression[x.element.id],
      };
    },
    partieSuivante() {
      const i = this.feuillesProgramme.findIndex((f) => f.element.id === this.newActivity.elementId);
      return i >= 0 ? this.feuillesProgramme[i + 1] || null : null;
    },
    teacherId() {
      // Adresse ouverte sans « ?id= » : l'identifiant de l'enseignant est relu dans le token.
      if (this.$route.query.id) return this.$route.query.id;
      try {
        return decodeJwtPayload(localStorage.getItem("token"))?.id ?? null;
      } catch {
        return null;
      }
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
    // Changement de date : horaire du créneau de ce jour-là, s'il existe.
    "newActivity.date"(date) {
      const h = this.horaireDuJour(date);
      if (h) this.newActivity.horaire = h;
    },
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

    horaireDuJour(date) {
      if (!date) return "";
      const jours = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      const jour = jours[new Date(`${date}T12:00:00`).getDay()];
      const c = this.creneaux.find((x) => String(x["matière_id"]) === String(this.subjectId) && x.jour === jour);
      return c ? c.horaire : "";
    },
    async chargerCreneaux() {
      try {
        const { data } = await axios.get(`${this.API_BASE}/api/programmes/${this.classeId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        this.creneaux = Array.isArray(data) ? data : [];
      } catch {
        this.creneaux = [];
      }
    },
    programmeCharge(donnees) {
      this.programmeData = donnees;
    },
    etatPartie(id) {
      const p = this.programmeData.progression[id];
      if (!p) return { icone: "mdi-checkbox-blank-circle-outline", couleur: "grey" };
      if (p.termine) return { icone: "mdi-check-circle", couleur: "success" };
      return { icone: "mdi-progress-clock", couleur: "primary" };
    },
    choisirPartie(id) {
      this.newActivity.elementId = id;
      this.newActivity.aussiSuivante = false;
      this.choixPartie = false;
    },
    openAddActivityDialog() {
      if (!this.classeId || !this.subjectId || !this.teacherId || !this.etablissementId || !this.anneeScolaireId) {
        this.errorMessage = true;
        return;
      }
      // Pré-remplissage : date du jour, horaire de la dernière séance, partie proposée.
      const aujourdHui = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const toutes = Object.values(this.activities).flat().sort((a, b) => b.originalDate - a.originalDate);
      this.newActivity = {
        date: `${aujourdHui.getFullYear()}-${pad(aujourdHui.getMonth() + 1)}-${pad(aujourdHui.getDate())}`,
        horaire: "",
        activite: "",
        elementId: this.programmeData.suggestion,
        contenu: "",
        termine: false,
        aussiSuivante: false,
      };
      this.newActivity.horaire = this.horaireDuJour(this.newActivity.date) || toutes[0]?.horaire || "";
      this.horsProgramme = false;
      this.choixPartie = !this.programmeData.suggestion;
      this.dialog = true;
    },
    closeDialog() {
      this.dialog = false;
      this.resetForm();
    },
    resetForm() {
      this.newActivity = { date: "", horaire: "", activite: "", elementId: null, contenu: "", termine: false, aussiSuivante: false };
      this.choixPartie = false;
      this.horsProgramme = false;
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
          // Garde la période lue dans l'URL si elle existe, sinon la 1ère.
          if (!this.semesters.some((s) => s.nom === this.currentSemester)) {
            this.currentSemester = this.semesters[0].nom;
          }
          await this.fetchNotesData();
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des semestres :", error);
      }
    },

    async fetchNotesData() {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${this.API_BASE}/api/getActivities/${this.classeId}/${this.subjectId}/${this.anneeScolaireId}`,
          { headers: { Authorization: `Bearer ${token}` } }
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
      const verification = form?.validate ? await form.validate() : { valid: true };
      if (!verification.valid) return;
      if (this.avecProgramme && !this.newActivity.elementId) {
        this.choixPartie = true;
        return;
      }

      const base = {
        teacherId: this.teacherId,
        subjectId: this.subjectId,
        date: this.newActivity.date,
        hours: this.newActivity.horaire,
        classId: this.classeId,
        semesterName: this.currentSemester,
        etablissementId: this.etablissementId,
        anneeScolaireId: this.anneeScolaireId,
      };
      // Avec le programme : la partie choisie (l'intitulé est construit par le
      // serveur) ; sinon le texte libre comme avant.
      const seances = this.avecProgramme
        ? [
            { ...base, programmeElementId: this.newActivity.elementId, contenu: this.newActivity.contenu, termine: this.newActivity.termine },
            ...(this.newActivity.termine && this.newActivity.aussiSuivante && this.partieSuivante
              ? [{ ...base, programmeElementId: this.partieSuivante.element.id, contenu: "", termine: false }]
              : []),
          ]
        : [{ ...base, activity: this.newActivity.activite }];

      try {
        this.adding = true;
        const addActivityToken = localStorage.getItem("token");
        for (const payload of seances) {
          await axios.post(`${this.API_BASE}/api/addActivity`, payload, {
            headers: { Authorization: `Bearer ${addActivityToken}` },
          });
        }
        this.successMessage = true;
        this.closeDialog();
        await this.fetchNotesData();
        this.$refs.programme?.charger();
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
    this.chargerCreneaux();
  },
};
</script>

<style scoped>
/* Séance rattachée au programme */
.ct-contenu { color: #607d8b; font-size: 0.85rem; margin-top: 2px; white-space: pre-line; }
.ct-partie-label { font-size: 0.8rem; font-weight: 700; color: #546e7a; margin-bottom: 4px; }
.ct-partie { border: 2px solid #1976d2; border-radius: 12px; padding: 10px 12px; background: #f3f8ff; cursor: pointer; }
.ct-partie-chemin { font-size: 0.8rem; color: #607d8b; }
.ct-partie-titre { font-weight: 800; color: #0d47a1; margin: 2px 0 6px; }
.ct-partie-bas { display: flex; align-items: center; justify-content: space-between; }
.ct-partie-changer { font-size: 0.85rem; color: #1976d2; font-weight: 700; }
.ct-partie-liste { margin-top: 8px; max-height: 280px; overflow-y: auto; border: 1px solid #e3e8ef; border-radius: 10px; padding: 6px; }
.ct-liste-titre { font-weight: 800; color: #37474f; font-size: 0.85rem; padding-top: 6px; }
.ct-liste-feuille { display: flex; align-items: center; padding: 8px 6px; border-radius: 8px; cursor: pointer; font-size: 0.92rem; }
.ct-liste-feuille:hover { background: #f1f6fd; }
.ct-liste-feuille--active { background: #e3f0ff; font-weight: 700; }
.ct-hors-programme { margin-top: 8px; font-size: 0.82rem; color: #78909c; text-decoration: underline; cursor: pointer; }

/* Charte: bleu / blanc / un peu de noir */
.ct-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
  background: transparent;
}

/* Topbar */
.ct-topbar {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 40px;
  padding: 4px 10px;
  border-radius: 8px;
  background: linear-gradient(90deg, #1976d2 0%, #0b2e4a 100%);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(255,255,255,.12);
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.ct-back {
  height: 30px !important;
  border-radius: 8px !important;
  font-weight: 700;
  background: rgba(0,0,0,.45) !important;
  color: #fff !important;
  white-space: nowrap;
}

.ct-title {
  min-width: 200px;
}

.ct-h1 {
  color: #fff;
  font-weight: 800;
  font-size: 16px;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ct-sub {
  margin-top: 0;
  color: rgba(255,255,255,.88);
  font-weight: 600;
  font-size: 12.5px;
}

.ct-spacer {
  flex: 1;
}

.ct-add {
  height: 30px !important;
  border-radius: 999px !important;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.ct-add-mobile {
  border-radius: 999px !important;
  font-weight: 700;
}

/* Cards */
.ct-card {
  border-radius: 10px!important;
  overflow: hidden;
  border: 1px solid rgba(25,118,210,.16);
  background: rgba(255,255,255,.90);
  margin-bottom: 10px;
}

.ct-card-head {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  background: linear-gradient(90deg, #1976d2, #0b2e4a);
}

.ct-card-head--alt {
  background: linear-gradient(90deg, #0b2e4a, #1976d2);
}

.ct-card-head-title {
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  letter-spacing: .2px;
}

.ct-chip-year {
  border-radius: 999px !important;
  font-weight: 700;
}

.ct-card-body {
  padding: 8px 10px !important;
}

/* Semesters */
.ct-sem-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ct-sem-chip {
  font-weight: 700;
}

.ct-sem-chip--active {
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

/* Tools */
.ct-tools {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  padding: 8px 10px !important;
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
  font-weight: 700;
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
  font-weight: 700;
  color: #0b2e4a;
}

.ct-activity {
  max-width: 560px;
  white-space: normal;
  line-height: 1.35rem;
  color: rgba(0,0,0,.78);
  font-weight: 500;
}

.ct-hours-chip {
  font-weight: 700;
  border-radius: 999px !important;
}

.ct-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  color: #546e7a;
  font-weight: 700;
}

/* Mobile cards */
.ct-mobile-list {
  padding: 8px 0 !important;
}

.ct-mobile-card {
  border-radius: 10px!important;
  border: 1px solid rgba(25,118,210,.16);
  background: rgba(255,255,255,.94);
  padding: 8px 10px;
  margin-bottom: 8px;
}

.ct-mobile-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.ct-mobile-date {
  font-weight: 700;
  color: #0b2e4a;
  display: inline-flex;
  align-items: center;
  line-height: 1.2;
}

.ct-mobile-activity {
  color: rgba(0,0,0,.78);
  font-weight: 500;
  font-size: 13.5px;
  line-height: 1.35;
  white-space: pre-wrap;
}

.ct-mobile-actions {
  margin-top: 6px;
}

.ct-empty-mobile {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 8px;
  color: #546e7a;
  font-weight: 700;
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
  font-weight: 700;
  color: rgba(0,0,0,.65);
  font-size: 13px;
  white-space: nowrap;
}

/* Bottom bar */
.ct-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  padding: 6px 10px;
  background: rgba(255,255,255,.94);
  border-top: 1px solid rgba(25,118,210,.16);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
}

.ct-bottom-btn {
  border-radius: 999px !important;
  font-weight: 700;
}

/* Dialog */
.ct-dialog {
  border-radius: 10px!important;
  overflow: hidden;
}

.ct-dialog-head {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 0 12px;
  background: linear-gradient(90deg, #1976d2, #0b2e4a);
}

.ct-dialog-title {
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
}

.ct-dialog-body {
  padding-top: 10px !important;
}

.ct-dialog-actions {
  padding: 6px 12px 10px !important;
}

/* Visibility helpers */
.ct-hide-xs { display: block; }
.ct-show-xs { display: none; }
.ct-hide-sm { display: inline-flex; }

@media (max-width: 600px) {
  /* Téléphone : barre de boutons fixe en bas → place réservée. */
  .ct-page {
    padding: 0 0 52px;
  }

  .ct-topbar {
    min-height: 36px;
    padding: 4px 8px;
    gap: 6px;
  }

  .ct-h1 {
    font-size: 15px;
  }

  /* Pas de grand cadre autour des blocs : contenu posé sur la page. */
  .ct-card {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    overflow: visible;
    margin-bottom: 8px;
  }

  .ct-card-head {
    height: 32px;
    border-radius: 8px;
  }

  .ct-card-body,
  .ct-tools {
    padding: 6px 0 !important;
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
    font-size: 14px;
  }

  .ct-page-indicator {
    font-size: 12.5px;
  }

  .ct-bottom-btn {
    padding-inline: 12px;
  }
}
</style>
