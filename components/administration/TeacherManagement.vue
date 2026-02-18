<template>
  <v-container
    fluid
    class="pa-4 pa-md-8 bg-grey-lighten-4"
    style="min-height: 100vh; background-color: #f5f7fa;"
  >
    <!-- ✅ MENU PRINCIPAL -->
    <div v-if="currentComponent === 'default'">
      <div class="mb-8">
        <h1 class="text-h4 font-weight-bold primary-dark--text mb-2">Gestion Pédagogique</h1>
        <p class="text-subtitle-1 grey--text text--darken-1">
          Administrez vos enseignants, matières et classes pour l'année {{ anneeScolaire }}
        </p>
      </div>

      <v-row class="mb-10">
        <v-col cols="12" sm="4">
          <v-btn
            @click="showAddSubjectForm = true"
            color="primary"
            x-large
            block
            elevation="2"
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
            x-large
            block
            elevation="2"
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
            x-large
            block
            elevation="2"
            class="rounded-lg text-none shadow-btn"
          >
            <v-icon start>mdi-link-variant-plus</v-icon>
            Affecter Enseignant
          </v-btn>
        </v-col>
      </v-row>

      <v-divider class="mb-10"></v-divider>

      <v-row>
        <v-col v-for="(card, index) in navCards" :key="index" cols="12" md="4">
          <v-card
            @click="navigateTo(card.component)"
            class="nav-card pa-6 rounded-xl border-l-blue shadow-soft"
            hover
          >
            <div class="d-flex align-center flex-column text-center">
              <v-avatar size="64" :color="card.color" class="mb-4 elevation-2">
                <v-icon size="32" color="white">{{ card.icon }}</v-icon>
              </v-avatar>
              <v-card-title class="text-h6 font-weight-bold pb-1">{{ card.title }}</v-card-title>
              <v-card-subtitle>{{ card.subtitle }}</v-card-subtitle>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- ✅ SOUS-INTERFACES -->
    <div v-else>
      <v-sheet class="pa-4 mb-6 rounded-lg d-flex align-center bg-white shadow-soft">
        <v-btn icon @click="currentComponent = 'default'" color="primary" class="mr-4">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <span class="text-h6 font-weight-bold primary-dark--text">Retour au menu principal</span>
      </v-sheet>

      <v-fade-transition mode="out-in">
        <!-- ✅ Composant séparé pour les matières -->
        <SubjectsManager
          v-if="currentComponent === 'subjectsManager'"
          :etablissement-id="etablissementId"
          api-base-url="http://localhost:8080"
          @close="currentComponent = 'default'"
          @changed="fetchData"
          @error="showError"
        />

        <!-- ✅ Tes composants existants -->
        <component
          v-else
          :is="currentComponent"
          :annee-scolaire="anneeScolaire"
          :annee-scolaire-id="anneeScolaireId"
          :etablissement-id="etablissementId"
          @component-selected="currentComponent = $event"
        />
      </v-fade-transition>
    </div>

    <!-- Ajouter Matière (dialog existant) -->
    <v-dialog v-model="showAddSubjectForm" max-width="400px">
      <v-card class="rounded-xl overflow-hidden">
        <v-toolbar color="primary" dark flat>
          <v-toolbar-title class="font-weight-bold">Ajouter une Matière</v-toolbar-title>
        </v-toolbar>
        <v-card-text class="pa-6">
          <v-form @submit.prevent="handleAddSubject">
            <v-text-field
              v-model="newSubject.name"
              label="Nom de la matière"
              placeholder="Ex: Mathématiques"
              outlined
              dense
              required
            />
            <v-btn type="submit" color="primary" block large class="rounded-lg mt-2 shadow-btn">
              Enregistrer la matière
            </v-btn>
            <v-btn @click="showAddSubjectForm = false" text block class="mt-2">Annuler</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Inscription Enseignant -->
    <v-dialog v-model="showInscriptionForm" max-width="500px">
      <v-card class="rounded-xl overflow-hidden">
        <v-toolbar color="#1A237E" dark flat>
          <v-toolbar-title class="font-weight-bold">Inscription Enseignant</v-toolbar-title>
        </v-toolbar>
        <v-card-text class="pa-6">
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
            <v-btn type="submit" color="#1A237E" dark block large class="rounded-lg mt-4 shadow-btn">
              Finaliser l'inscription
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Affectation -->
    <v-dialog v-model="showAddForm" max-width="700px" content-class="affect-dialog">
      <v-card class="affect-card">
        <v-toolbar color="secondary" dark flat>
          <v-toolbar-title class="font-weight-bold text-h6">Affectation de Cours</v-toolbar-title>
        </v-toolbar>

        <v-card-text class="pa-6 affect-body">
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
            ✅ Les coefficients doivent être choisis <strong>un par classe</strong> (même nombre que les classes), appliqués par ordre.
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

          <v-select
            v-model="selectedCoefficients"
            :items="coefficient"
            item-title="valeur"
            item-value="id"
            label="Coefficients (doit = nombre de classes)"
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
        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <v-btn @click="showAddForm = false" text>Annuler</v-btn>
          <v-spacer></v-spacer>
          <v-btn
            @click="handleAdd"
            color="secondary"
            depressed
            class="px-8 rounded-lg"
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
      <v-card class="rounded-xl overflow-hidden">
        <v-toolbar color="warning" dark flat>
          <v-toolbar-title class="font-weight-bold">Avertissement</v-toolbar-title>
        </v-toolbar>

        <v-card-text class="pa-6">
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
        <v-card-actions class="pa-4">
          <v-btn text @click="cancelTeacherHasSubject">Annuler</v-btn>
          <v-spacer />
          <v-btn color="warning" outlined class="rounded-lg px-6" @click="confirmAllowMultiple">
            Autoriser
          </v-btn>
          <v-btn color="warning" dark class="rounded-lg px-6" @click="confirmReplaceTeacherSubject">
            Remplacer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ✅ Dialog: matière déjà affectée à un autre enseignant -> remplacer -->
    <v-dialog v-model="confirmReplaceDialog" max-width="520px">
      <v-card class="rounded-xl overflow-hidden">
        <v-toolbar color="deep-orange" dark flat>
          <v-toolbar-title class="font-weight-bold">Affectation existante</v-toolbar-title>
        </v-toolbar>

        <v-card-text class="pa-6">
          <v-alert type="warning" outlined class="mb-4">
            {{ conflictMessage || "Cette matière est déjà affectée dans cette classe pour cette année." }}
          </v-alert>

          <p class="mb-0">
            Voulez-vous <strong>remplacer</strong> l’enseignant existant pour la même <strong>matière/classe</strong> ?
          </p>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn text @click="cancelConfirmReplace">Annuler</v-btn>
          <v-spacer />
          <v-btn color="deep-orange" dark class="rounded-lg px-6" @click="confirmReplaceOtherTeacher">
            Oui, remplacer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Identifiants -->
    <v-dialog v-model="showGeneratedInfo" max-width="400px">
      <v-card class="rounded-xl text-center pa-4">
        <v-avatar color="success" size="64" class="mb-4">
          <v-icon size="32" color="white">mdi-check-all</v-icon>
        </v-avatar>
        <v-card-title class="justify-center font-weight-bold">Identifiants Créés !</v-card-title>
        <v-card-text>
          <v-sheet color="#f8f9fa" class="pa-4 rounded-lg text-left mb-4 border">
            <div class="mb-2">
              <strong>Utilisateur :</strong>
              <span class="primary--text font-weight-bold">{{ generatedInfo?.username }}</span>
            </div>
            <div>
              <strong>Mot de passe :</strong>
              <span class="primary--text font-weight-bold">{{ generatedInfo?.password }}</span>
            </div>
          </v-sheet>
          <p class="text-caption grey--text">Veuillez copier ces accès pour l'enseignant.</p>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" block large @click="showGeneratedInfo = false" class="rounded-pill shadow-btn">
            C'est noté
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Erreurs -->
    <v-snackbar v-model="errorDialog" color="red darken-2" rounded="pill" elevation="10">
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
import axios from "axios";

export default {
  components: { MesEnseignants, CahierDeTexte, EnseignantParclasse, SubjectsManager },
  props: {
    etablissementId: Number,
    etablissementNom: String,
    anneeScolaire: String,
    anneeScolaireId: Number,
  },
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

      currentComponent: "default",
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
    canSubmitAffectation() {
      const c = this.selectedClasses.length;
      const s = this.selectedSubjects.length;
      const k = this.selectedCoefficients.length;

      if (!this.selectedTeacher) return false;
      if (c === 0) return false;
      if (s === 0) return false;

      const subjectsOk = s === 1 || s === c;
      const coefOk = k === c;

      return subjectsOk && coefOk;
    },

    selectionHint() {
      const c = this.selectedClasses.length;
      const s = this.selectedSubjects.length;
      const k = this.selectedCoefficients.length;

      if (!this.selectedTeacher) return "Sélectionne un enseignant.";
      if (c === 0) return "Sélectionne au moins une classe.";
      if (s === 0) return "Sélectionne au moins une matière.";

      if (k !== c) return "Coefficients invalides : tu dois choisir exactement un coefficient par classe.";

      if (s === 1) return "✅ 1 matière sera appliquée à toutes les classes. Coefficients par ordre.";
      if (s === c) return "✅ Matières et coefficients appliqués par ordre.";
      return "Matières invalides : choisis 1 matière (pour toutes) ou une matière par classe.";
    },
  },

  mounted() {
    this.fetchData();
  },

  methods: {
    async fetchData() {
      try {
        const [teachersRes, classesRes, subjectsRes, coefficientRes] = await Promise.all([
          axios.get(`http://localhost:8080/api/Enseignants/${this.etablissementId}`),
          axios.get(`http://localhost:8080/api/classe/${this.etablissementId}`),
          axios.get(`http://localhost:8080/api/Matieres/${this.etablissementId}`),
          axios.get("http://localhost:8080/api/Coefficient"),
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
        await axios.post("http://localhost:8080/api/Matieres", {
          name: this.newSubject.name,
          etablissementId: this.etablissementId,
        });
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

        await axios.post("http://localhost:8080/api/Enseignants", {
          ...this.newTeacher,
          username,
          password,
          etablissementId: this.etablissementId,
        });

        this.generatedInfo = { username, password };
        this.showGeneratedInfo = true;
        this.showInscriptionForm = false;
        this.newTeacher = { name: "", firstName: "", email: "", phone: "" };

        await this.fetchData();
      } catch (error) {
        this.showError(error.response?.data?.error || "Échec de l'inscription.");
      }
    },

    // payload (affectation)
    buildAffectationPayload(flags = {}) {
      const classes = [...this.selectedClasses];
      const subjects =
        this.selectedSubjects.length === 1
          ? Array(classes.length).fill(this.selectedSubjects[0])
          : [...this.selectedSubjects];
      const coefficients = [...this.selectedCoefficients];

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
        await axios.post("http://localhost:8080/api/Enseignants/add", payload);
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
.primary-dark--text { color: #1A237E !important; }
.shadow-soft { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important; }
.shadow-btn { box-shadow: 0 4px 10px rgba(26, 35, 126, 0.2) !important; }

.nav-card {
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;
  cursor: pointer;
}
.nav-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1) !important;
}
.border-l-blue { border-left: 6px solid #1A237E !important; }

@media (max-width: 600px) {
  .text-h4 { font-size: 1.5rem !important; }
  .nav-card { padding: 16px !important; }
}

.affect-dialog { max-height: 80vh !important; }
.affect-card { display: flex !important; flex-direction: column !important; max-height: 80vh !important; }
.affect-body { flex: 1 1 auto !important; overflow-y: auto !important; }
</style>
