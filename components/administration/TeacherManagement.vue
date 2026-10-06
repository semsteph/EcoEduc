<template>
  <v-container
    fluid
    class="pa-1 pa-sm-3 tm-wrapper"
  >
    <!-- ✅ MENU PRINCIPAL -->
    <div v-if="currentComponent === 'default'">
      <div class="mb-3">
        <h1 class="text-h6 font-weight-bold primary-dark--text mb-1">Gestion Pédagogique</h1>
        <p class="text-body-2 text-grey-darken-1 mb-0">
          Administrez vos enseignants, matières et classes pour l'année {{ anneeScolaire }}
        </p>
      </div>

      <v-row dense class="mb-2">
        <v-col cols="12" sm="4">
          <v-btn
            @click="showAddSubjectForm = true"
            color="primary"
            block
            elevation="0"
            class="rounded-lg text-none shadow-btn"
          >
            <v-icon start>mdi-book-plus-outline</v-icon>
            Ajouter Matière
          </v-btn>
        </v-col>

        <v-col cols="12" sm="4">
          <v-btn
            @click="showInscriptionForm = true"
            color="#1A237E"
            dark
            block
            elevation="0"
            class="rounded-lg text-none shadow-btn"
          >
            <v-icon start>mdi-account-plus-outline</v-icon>
            Inscrire Enseignant
          </v-btn>
        </v-col>

        <v-col cols="12" sm="4">
          <v-btn
            @click="showAddForm = true"
            color="secondary"
            block
            elevation="0"
            class="rounded-lg text-none shadow-btn"
          >
            <v-icon start>mdi-link-variant-plus</v-icon>
            Affecter Enseignant
          </v-btn>
        </v-col>
      </v-row>

      <v-divider class="mb-3"></v-divider>

      <v-row dense>
        <v-col v-for="(card, index) in visibleNavCards" :key="index" cols="6" md="4">
          <v-card
            @click="navigateTo(card.component)"
            class="nav-card pa-2 pa-sm-3 rounded-lg border-l-blue shadow-soft h-100"
            hover
          >
            <div class="d-flex align-center flex-column text-center">
              <v-avatar size="32" :color="card.color" class="mb-2">
                <v-icon size="18" color="white">{{ card.icon }}</v-icon>
              </v-avatar>
              <div class="nav-card__title font-weight-bold">{{ card.title }}</div>
              <div class="nav-card__sub text-medium-emphasis">{{ card.subtitle }}</div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- ✅ SOUS-INTERFACES -->
    <div v-else>
      <v-fade-transition mode="out-in">
        <!-- ✅ Composant séparé pour les matières -->
        <SubjectsManager
          v-if="currentComponent === 'subjectsManager'"
          :etablissement-id="etablissementId"
          api-base-url=""
          @close="currentComponent = 'default'"
          @changed="fetchData"
          @error="showError"
        />

        <!-- ✅ Tes composants existants -->
        <component
          v-else
          :is="currentComponent"
          :classe-id="classeId"
          :etablissement-nom="etablissementNom"
          @ouvrir-classe="$emit('ouvrir-classe', $event)"
          :annee-scolaire="anneeScolaire"
          :annee-scolaire-id="anneeScolaireId"
          :etablissement-id="etablissementId"
          @component-selected="currentComponent = $event"
          @back="currentComponent = 'default'"
        />
      </v-fade-transition>
    </div>

    <!-- Ajouter Matière (dialog existant) -->
    <v-dialog v-model="showAddSubjectForm" max-width="400px">
      <v-card class="rounded-lg overflow-hidden">
        <v-toolbar height="40" color="primary" dark flat>
          <v-toolbar-title class="font-weight-bold text-subtitle-1">Ajouter une Matière</v-toolbar-title>
        </v-toolbar>
        <v-card-text class="pa-2 pa-sm-3">
          <v-form @submit.prevent="handleAddSubject">
            <v-text-field
              v-model="newSubject.name"
              label="Nom de la matière"
              placeholder="Ex: Mathématiques"
              outlined
              dense
              required
            />
            <v-btn type="submit" color="primary" block class="rounded-lg mt-2 shadow-btn">
              Enregistrer la matière
            </v-btn>
            <v-btn @click="showAddSubjectForm = false" text block class="mt-2">Annuler</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Inscription Enseignant -->
    <v-dialog v-model="showInscriptionForm" max-width="500px">
      <v-card class="rounded-lg overflow-hidden">
        <v-toolbar height="40" color="#1A237E" dark flat>
          <v-toolbar-title class="font-weight-bold text-subtitle-1">Inscription Enseignant</v-toolbar-title>
        </v-toolbar>
        <v-card-text class="pa-2 pa-sm-3">
          <v-form @submit.prevent="handleInscription">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field v-model="newTeacher.name" label="Nom" outlined dense required />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="newTeacher.firstName" label="Prénom" outlined dense required />
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="newTeacher.email" label="Email" type="email" outlined dense required />
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="newTeacher.phone" label="Téléphone" outlined dense required />
              </v-col>
            </v-row>
            <p class="text-caption mt-1">
              Le téléphone et l'e-mail servent à reconnaître le professeur : s'il enseigne déjà dans un autre établissement
              qui utilise l'application, il est simplement ajouté au vôtre et garde ses identifiants.
            </p>
            <v-btn type="submit" color="#1A237E" dark block class="rounded-lg mt-4 shadow-btn">
              Finaliser l'inscription
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Affectation -->
    <v-dialog v-model="showAddForm" max-width="700px" content-class="affect-dialog">
      <v-card class="affect-card">
        <v-toolbar height="40" color="secondary" dark flat>
          <v-toolbar-title class="font-weight-bold text-subtitle-1">Affectation de Cours</v-toolbar-title>
        </v-toolbar>

        <v-card-text class="pa-2 pa-sm-3 affect-body">
          <v-autocomplete
            v-model="selectedTeacher"
            :items="teachers"
            item-title="fullname"
            item-value="id"
            label="Enseignant"
            outlined
            class="mb-4"
          />

          <v-alert type="info" outlined class="mb-4">
            ✅ Plusieurs classes possibles.
            <br />
            ✅ Si tu choisis <strong>1 seule matière</strong>, elle sera appliquée à <strong>toutes</strong> les classes.
            <br />
            ✅ Les coefficients peuvent être :
            <strong>1 seul</strong> (appliqué à toutes les classes) <strong>OU</strong> <strong>un par classe</strong> (même nombre que les classes), appliqués par ordre.
          </v-alert>

          <v-autocomplete
            v-model="selectedClasses"
            :items="classes"
            item-title="nom"
            item-value="id"
            label="Classes (multiple)"
            outlined
            multiple
            chips
            closable-chips
            class="mb-3"
          />

          <v-autocomplete
            v-model="selectedSubjects"
            :items="subjects"
            item-title="nom"
            item-value="id"
            label="Matières (1 = pour toutes les classes, ou N = par ordre)"
            outlined
            multiple
            chips
            closable-chips
            class="mb-3"
          />

          <!-- ✅ ICI: coefficient accepte 1 OU N (=classes) -->
          <v-select
            v-model="selectedCoefficients"
            :items="coefficient"
            item-title="valeur"
            item-value="id"
            label="Coefficients (1 pour toutes, ou N = nombre de classes)"
            outlined
            multiple
            chips
            closable-chips
            class="mb-2"
          />

          <v-divider class="my-4"></v-divider>

          <v-alert v-if="selectionHint" type="warning" outlined class="mt-3">
            {{ selectionHint }}
          </v-alert>
        </v-card-text>

        <v-divider></v-divider>
        <v-card-actions class="pa-3 bg-grey-lighten-4">
          <v-btn @click="showAddForm = false" text>Annuler</v-btn>
          <v-spacer></v-spacer>
          <v-btn
            @click="handleAdd"
            color="secondary"
            depressed
            class="px-2 px-sm-3 rounded-lg"
            :disabled="!canSubmitAffectation || isSubmitting"
            :loading="isSubmitting"
          >
            Valider l'affectation
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ✅ Dialog: le prof a déjà une matière dans la classe -> autoriser OU remplacer -->
    <v-dialog v-model="confirmTeacherHasSubjectDialog" max-width="560px">
      <v-card class="rounded-lg overflow-hidden">
        <v-toolbar height="40" color="warning" dark flat>
          <v-toolbar-title class="font-weight-bold text-subtitle-1">Avertissement</v-toolbar-title>
        </v-toolbar>

        <v-card-text class="pa-2 pa-sm-3">
          <v-alert type="warning" outlined class="mb-4">
            {{ conflictMessage || "Cet enseignant a déjà une matière dans cette classe." }}
          </v-alert>

          <p class="mb-2">Que veux-tu faire ?</p>
          <ul class="mb-0">
            <li><strong>Autoriser</strong> : le prof aura plusieurs matières dans cette classe.</li>
            <li>
              <strong>Remplacer</strong> : l'ancienne matière du prof sera supprimée, et remplacée par la nouvelle.
            </li>
          </ul>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-3">
          <v-btn text @click="cancelTeacherHasSubject">Annuler</v-btn>
          <v-spacer />
          <v-btn color="warning" outlined class="rounded-lg px-2 px-sm-3" @click="confirmAllowMultiple">
            Autoriser
          </v-btn>
          <v-btn color="warning" dark class="rounded-lg px-2 px-sm-3" @click="confirmReplaceTeacherSubject">
            Remplacer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ✅ Dialog: matière déjà affectée à un autre enseignant -> remplacer -->
    <v-dialog v-model="confirmReplaceDialog" max-width="520px">
      <v-card class="rounded-lg overflow-hidden">
        <v-toolbar height="40" color="deep-orange" dark flat>
          <v-toolbar-title class="font-weight-bold text-subtitle-1">Affectation existante</v-toolbar-title>
        </v-toolbar>

        <v-card-text class="pa-2 pa-sm-3">
          <v-alert type="warning" outlined class="mb-4">
            {{ conflictMessage || "Cette matière est déjà affectée dans cette classe pour cette année." }}
          </v-alert>

          <p class="mb-0">
            Voulez-vous <strong>remplacer</strong> l’enseignant existant pour la même <strong>matière/classe</strong> ?
          </p>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-3">
          <v-btn text @click="cancelConfirmReplace">Annuler</v-btn>
          <v-spacer />
          <v-btn color="deep-orange" dark class="rounded-lg px-2 px-sm-3" @click="confirmReplaceOtherTeacher">
            Oui, remplacer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Identifiants -->
    <v-dialog v-model="showGeneratedInfo" max-width="400px">
      <v-card class="rounded-lg text-center pa-3">
        <v-avatar color="success" size="32" class="mb-2">
          <v-icon size="18" color="white">mdi-check-all</v-icon>
        </v-avatar>
        <v-card-title class="justify-center font-weight-bold text-wrap">{{ generatedInfo?.lie ? 'Professeur ajouté' : 'Identifiants créés' }}</v-card-title>
        <v-card-text v-if="generatedInfo?.lie">
          <p class="text-left">{{ generatedInfo.message }}</p>
          <p class="text-caption text-left mt-2">Aucun nouveau mot de passe : il garde le sien pour tous ses établissements.</p>
        </v-card-text>
        <v-card-text v-else>
          <v-sheet color="#f8f9fa" class="pa-3 rounded-lg text-left mb-4 border">
            <div class="mb-2">
              <strong>Utilisateur :</strong>
              <span class="primary--text font-weight-bold">{{ generatedInfo?.username }}</span>
            </div>
            <div>
              <strong>Mot de passe :</strong>
              <span class="primary--text font-weight-bold">{{ generatedInfo?.password }}</span>
            </div>
          </v-sheet>
          <p class="text-caption grey--text">Remettez ces accès à l'enseignant : il choisira son propre mot de passe à sa première connexion. Ce compte lui servira aussi si un autre établissement l'ajoute.</p>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" block @click="showGeneratedInfo = false" class="rounded-pill shadow-btn">
            C'est noté
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Erreurs -->
    <v-snackbar v-model="errorDialog" color="red darken-2" rounded="pill" elevation="0">
      <div style="white-space: pre-line;">{{ errorMessage }}</div>
      <template v-slot:actions>
        <v-btn text @click="errorDialog = false">Fermer</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import MesEnseignants from "./MesEnseignants.vue";
import CahierDeTexte from "./CahierDeTexte.vue";
import EnseignantParclasse from "./EnseignantParclasse.vue";
import SubjectsManager from "./SubjectsManager.vue";
import ProgrammesMatieres from "./ProgrammesMatieres.vue";
import axios from "axios";

// Segment d'adresse → sous-interface.
const COMPOSANT_PAR_ECRAN = {
  "cahiers-de-texte": "CahierDeTexte",
  liste: "MesEnseignants",
  repartition: "EnseignantParclasse",
  matieres: "subjectsManager",
  "programmes-matieres": "ProgrammesMatieres",
};

export default {
  components: { MesEnseignants, CahierDeTexte, EnseignantParclasse, SubjectsManager, ProgrammesMatieres },
  props: {
    etablissementId: Number,
    etablissementNom: String,
    anneeScolaire: String,
    anneeScolaireId: Number,
    modulesAutorises: { type: Array, default: null },
    // Sous-écran donné par la route (…/enseignants/<ecran>) : 'cahiers-de-texte',
    // 'liste', 'repartition', 'matieres' ; null = menu principal.
    ecran: { type: String, default: null },
    // Classe ouverte dans le sous-écran (…/enseignants/<ecran>/<classeId>).
    classeId: { type: Number, default: null },
  },
  emits: ['changer-ecran', 'ouvrir-classe'],
  data() {
    return {
      navCards: [
        {
          title: "Cahiers de Texte",
          subtitle: "Suivi par classe",
          icon: "mdi-book-open-page-variant",
          color: "#43A047",
          component: "CahierDeTexte",
        },
        {
          title: "Mes Enseignants",
          subtitle: "Liste et effectifs",
          icon: "mdi-account-group",
          color: "#1A237E",
          component: "MesEnseignants",
        },
        {
          title: "Répartition",
          subtitle: "Enseignants / Classes",
          icon: "mdi-google-classroom",
          color: "#FB8C00",
          component: "EnseignantParclasse",
        },
        {
          title: "Matières",
          subtitle: "Liste / Ajout / Suppression",
          icon: "mdi-book-multiple",
          color: "#3949AB",
          component: "subjectsManager",
        },
        {
          title: "Programmes des matières",
          subtitle: "SA, séquences, activités par niveau",
          icon: "mdi-book-open-page-variant-outline",
          color: "#00897B",
          component: "ProgrammesMatieres",
        },
      ],

      showInscriptionForm: false,
      showAddForm: false,
      showAddSubjectForm: false,
      showGeneratedInfo: false,

      errorDialog: false,
      errorMessage: "",
      generatedInfo: null,

      teachers: [],
      classes: [],
      subjects: [],
      coefficient: [],

      selectedTeacher: null,
      selectedClasses: [],
      selectedSubjects: [],
      selectedCoefficients: [],

      newTeacher: { name: "", firstName: "", email: "", phone: "" },
      newSubject: { name: "" },

      isSubmitting: false,

      // dialogs (conflits affectation)
      confirmTeacherHasSubjectDialog: false,
      confirmReplaceDialog: false,

      // state conflit
      lastPayload: null,
      conflictMessage: "",
    };
  },

  computed: {
    // Sous-interface affichée, déduite de la route. L'affecter émet
    // « changer-ecran » et la page va vers la nouvelle adresse.
    currentComponent: {
      get() {
        return COMPOSANT_PAR_ECRAN[this.ecran] || "default";
      },
      set(component) {
        const ecran = Object.keys(COMPOSANT_PAR_ECRAN).find((key) => COMPOSANT_PAR_ECRAN[key] === component);
        this.$emit("changer-ecran", ecran || null);
      },
    },
    visibleNavCards() {
      if (!this.modulesAutorises) return this.navCards;
      return this.navCards.filter((card) => this.modulesAutorises.includes(card.component));
    },

    // ✅ MODIF: coefficients acceptent 1 OU N (=classes)
    canSubmitAffectation() {
      const c = this.selectedClasses.length;
      const s = this.selectedSubjects.length;
      const k = this.selectedCoefficients.length;

      if (!this.selectedTeacher) return false;
      if (c === 0) return false;
      if (s === 0) return false;
      if (k === 0) return false;

      const subjectsOk = s === 1 || s === c;
      const coefOk = k === 1 || k === c;

      return subjectsOk && coefOk;
    },

    // ✅ MODIF: hint prend en compte 1 coeff pour toutes les classes
    selectionHint() {
      const c = this.selectedClasses.length;
      const s = this.selectedSubjects.length;
      const k = this.selectedCoefficients.length;

      if (!this.selectedTeacher) return "Sélectionne un enseignant.";
      if (c === 0) return "Sélectionne au moins une classe.";
      if (s === 0) return "Sélectionne au moins une matière.";
      if (k === 0) return "Sélectionne au moins un coefficient.";

      const subjectsOk = s === 1 || s === c;
      const coefOk = k === 1 || k === c;

      if (!subjectsOk) {
        return "Matières invalides : choisis 1 matière (pour toutes) ou une matière par classe.";
      }
      if (!coefOk) {
        return "Coefficients invalides : choisis 1 coefficient (pour toutes) ou un coefficient par classe.";
      }

      if (s === 1 && k === 1) return "✅ 1 matière + 1 coefficient seront appliqués à toutes les classes.";
      if (s === 1 && k === c) return "✅ 1 matière pour toutes les classes. Coefficients appliqués par ordre.";
      if (s === c && k === 1) return "✅ Matières appliquées par ordre. 1 coefficient pour toutes les classes.";
      return "✅ Matières et coefficients appliqués par ordre.";
    },
  },

  mounted() {
    this.fetchData();
  },

  methods: {
    async fetchData() {
      try {
        const token = localStorage.getItem("token");
        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
        const [teachersRes, classesRes, subjectsRes, coefficientRes] = await Promise.all([
          axios.get(`/api/Enseignants/${this.etablissementId}`, authHeaders),
          axios.get(`/api/classe/${this.etablissementId}`, authHeaders),
          axios.get(`/api/Matieres/${this.etablissementId}`, authHeaders),
          axios.get("/api/Coefficient"),
        ]);

        this.teachers = (teachersRes.data || []).map((t) => ({
          id: t.id,
          fullname: `${t.nom} ${t.prenom}`,
        }));
        this.classes = classesRes.data || [];
        this.subjects = subjectsRes.data || [];
        this.coefficient = coefficientRes.data || [];
      } catch (error) {
        this.showError("Erreur lors du chargement des données.");
      }
    },

    navigateTo(component) {
      this.currentComponent = component;
    },

    async handleAddSubject() {
      if (!this.newSubject.name) return;
      try {
        const token = localStorage.getItem("token");
        await axios.post("/api/Matieres", {
          name: this.newSubject.name,
          etablissementId: this.etablissementId,
        }, { headers: { Authorization: `Bearer ${token}` } });
        this.showAddSubjectForm = false;
        this.newSubject.name = "";
        await this.fetchData();
      } catch (error) {
        this.showError("Impossible d'ajouter la matière.");
      }
    },

    async handleInscription() {
      try {
        const username = this.generateUsername(this.newTeacher.name, this.newTeacher.firstName);
        const password = this.generatePassword();

        const token = localStorage.getItem("token");
        const { data } = await axios.post("/api/Enseignants", {
          ...this.newTeacher,
          username,
          password,
          etablissementId: this.etablissementId,
        }, token ? { headers: { Authorization: `Bearer ${token}` } } : {});

        // Professeur déjà connu (autre établissement) : rattaché à son compte.
        this.generatedInfo = data.lie
          ? { lie: true, message: data.message }
          : { username: data.username || username, password };
        this.showGeneratedInfo = true;
        this.showInscriptionForm = false;
        this.newTeacher = { name: "", firstName: "", email: "", phone: "" };

        await this.fetchData();
      } catch (error) {
        this.showError(error.response?.data?.error || "Échec de l'inscription.");
      }
    },

    // ✅ MODIF: si 1 coeff choisi => appliqué à toutes les classes (comme les matières)
    buildAffectationPayload(flags = {}) {
      const classes = [...this.selectedClasses];

      const subjects =
        this.selectedSubjects.length === 1
          ? Array(classes.length).fill(this.selectedSubjects[0])
          : [...this.selectedSubjects];

      const coefficients =
        this.selectedCoefficients.length === 1
          ? Array(classes.length).fill(this.selectedCoefficients[0])
          : [...this.selectedCoefficients];

      return {
        teacherId: this.selectedTeacher,
        classes,
        subjects,
        coefficients,
        etablissement: this.etablissementId,
        anneeScolaireId: this.anneeScolaireId,
        force: !!flags.force,
        forceReplace: !!flags.forceReplace,
        replaceTeacherSubject: !!flags.replaceTeacherSubject,
      };
    },

    detectConflictType(err) {
      const type = err?.response?.data?.type;
      if (type) return type;

      const msg = (err?.response?.data?.message || err?.message || "").toLowerCase();
      if (msg.includes("autre matière") || msg.includes("déjà une matière") || msg.includes("deja une matiere")) {
        return "TEACHER_ALREADY_HAS_SUBJECT_IN_CLASS";
      }
      if (msg.includes("déjà affectée") || msg.includes("deja affectee")) {
        return "SUBJECT_ALREADY_ASSIGNED_TO_OTHER_TEACHER";
      }
      return "OTHER";
    },

    async handleAdd() {
      if (!this.canSubmitAffectation) {
        return this.showError(this.selectionHint || "Formulaire invalide.");
      }

      const payload = this.buildAffectationPayload({
        force: false,
        forceReplace: false,
        replaceTeacherSubject: false,
      });
      this.lastPayload = payload;

      await this.trySubmitAffectation(payload);
    },

    async trySubmitAffectation(payload) {
      this.isSubmitting = true;
      try {
        const addToken = localStorage.getItem("token");
        await axios.post("/api/Enseignants/add", payload, {
          headers: { Authorization: `Bearer ${addToken}` },
        });
        this.resetAddForm();
      } catch (error) {
        const conflictType = this.detectConflictType(error);
        const backendMsg = error?.response?.data?.message || error?.response?.data?.error || "Erreur d'affectation.";

        this.conflictMessage = backendMsg;

        if (conflictType === "TEACHER_ALREADY_HAS_SUBJECT_IN_CLASS") {
          this.confirmTeacherHasSubjectDialog = true;
          return;
        }

        if (conflictType === "SUBJECT_ALREADY_ASSIGNED_TO_OTHER_TEACHER") {
          this.confirmReplaceDialog = true;
          return;
        }

        this.showError(backendMsg);
      } finally {
        this.isSubmitting = false;
      }
    },

    cancelTeacherHasSubject() {
      this.confirmTeacherHasSubjectDialog = false;
      if (this.conflictMessage) this.showError(this.conflictMessage);
      this.conflictMessage = "";
    },

    async confirmAllowMultiple() {
      this.confirmTeacherHasSubjectDialog = false;

      const payload = {
        ...(this.lastPayload || this.buildAffectationPayload()),
        force: true,
        replaceTeacherSubject: false,
      };

      this.lastPayload = payload;
      await this.trySubmitAffectation(payload);
    },

    async confirmReplaceTeacherSubject() {
      this.confirmTeacherHasSubjectDialog = false;

      const payload = {
        ...(this.lastPayload || this.buildAffectationPayload()),
        force: false,
        replaceTeacherSubject: true,
      };

      this.lastPayload = payload;
      await this.trySubmitAffectation(payload);
    },

    cancelConfirmReplace() {
      this.confirmReplaceDialog = false;
      if (this.conflictMessage) this.showError(this.conflictMessage);
      this.conflictMessage = "";
    },

    async confirmReplaceOtherTeacher() {
      this.confirmReplaceDialog = false;

      const payload = {
        ...(this.lastPayload || this.buildAffectationPayload()),
        forceReplace: true,
      };

      this.lastPayload = payload;
      await this.trySubmitAffectation(payload);
    },

    generateUsername(name, fName) {
      return `${(name || "").toLowerCase().replace(/\s/g, "")}.${(fName || "")
        .toLowerCase()
        .charAt(0)}${Math.floor(100 + Math.random() * 900)}`;
    },

    generatePassword() {
      return Math.random().toString(36).slice(-8).toUpperCase();
    },

    resetAddForm() {
      this.selectedTeacher = null;
      this.selectedClasses = [];
      this.selectedSubjects = [];
      this.selectedCoefficients = [];
      this.showAddForm = false;

      this.confirmTeacherHasSubjectDialog = false;
      this.confirmReplaceDialog = false;
      this.lastPayload = null;
      this.conflictMessage = "";
      this.errorMessage = "";
    },

    showError(msg) {
      this.errorMessage = msg;
      this.errorDialog = true;
    },
  },
};
</script>

<style scoped>
.primary-dark--text {
  color: #1a237e !important;
}
.shadow-soft {
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08)!important;
}
.shadow-btn {
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08)!important;
}

.nav-card {
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;
  cursor: pointer;
}
.nav-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08)!important;
}
.border-l-blue {
  border-left: 3px solid #1a237e !important;
}

/* Tuiles de menu : petit cadre fin conservé sur téléphone (ce ne sont pas
   de grands conteneurs, mais des boutons). */
.nav-card.nav-card.nav-card {
  background: #fff !important;
  border: 1px solid rgba(15, 23, 42, 0.1) !important;
  border-left: 3px solid #1a237e !important;
  box-shadow: none !important;
}
.nav-card__title {
  font-size: 14px;
  line-height: 1.3;
  color: #1a237e;
}
.nav-card__sub {
  font-size: 12px;
  line-height: 1.3;
  margin-top: 2px;
}
.back-bar {
  padding: 4px 10px 4px 4px;
  border: 1px solid rgba(15, 23, 42, 0.1);
}
.tm-wrapper {
  background-color: #f5f7fa;
}

@media (max-width: 600px) {
  .tm-wrapper {
    background-color: transparent;
  }
  .nav-card {
    padding: 8px !important;
  }
}

.affect-dialog {
  max-height: 80vh !important;
}
.affect-card {
  display: flex !important;
  flex-direction: column !important;
  max-height: 80vh !important;
}
.affect-body {
  flex: 1 1 auto !important;
  overflow-y: auto !important;
}
</style>
