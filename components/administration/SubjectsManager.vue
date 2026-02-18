<template>
  <v-card class="rounded-xl shadow-soft">
    <v-toolbar :color="toolbarColor" dark flat>
      <v-toolbar-title class="font-weight-bold">{{ title }}</v-toolbar-title>
      <v-spacer />
      <v-btn icon @click="$emit('close')">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-toolbar>

    <v-card-text class="pa-6">
      <v-row dense class="mb-4">
        <v-col cols="12" md="6">
          <v-text-field
            v-model="inlineSubjectName"
            label="Nouvelle matière"
            placeholder="Ex: Lecture"
            outlined
            dense
            @keyup.enter="addSubjectInline"
          />
        </v-col>

        <v-col cols="12" md="3">
          <v-btn
            block
            :color="toolbarColor"
            dark
            class="rounded-lg"
            :disabled="!inlineSubjectName || loadingAddSubject"
            :loading="loadingAddSubject"
            @click="addSubjectInline"
          >
            <v-icon start>mdi-plus</v-icon>
            Ajouter
          </v-btn>
        </v-col>

        <v-col cols="12" md="3">
          <v-btn
            block
            outlined
            :color="toolbarColor"
            class="rounded-lg"
            :loading="loadingSubjects"
            @click="fetchSubjectsList"
          >
            <v-icon start>mdi-refresh</v-icon>
            Actualiser
          </v-btn>
        </v-col>
      </v-row>

      <v-divider class="my-4" />

      <v-text-field
        v-model="subjectSearch"
        label="Rechercher"
        outlined
        dense
        prepend-inner-icon="mdi-magnify"
        class="mb-4"
      />

      <v-data-table
        :headers="subjectHeaders"
        :items="filteredSubjects"
        :loading="loadingSubjects"
        loading-text="Chargement..."
        class="elevation-0"
      >
        <template v-slot:item.actions="{ item }">
          <v-btn
            icon
            color="red"
            :loading="deletingSubjectId === item.id"
            @click="openDeleteSubjectDialog(item)"
          >
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>

        <template v-slot:no-data>
          <v-alert type="info" outlined>Aucune matière trouvée.</v-alert>
        </template>
      </v-data-table>
    </v-card-text>

    <!-- ✅ Dialog suppression matière -->
    <v-dialog v-model="deleteSubjectDialog" max-width="480px">
      <v-card class="rounded-xl overflow-hidden">
        <v-toolbar color="red" dark flat>
          <v-toolbar-title class="font-weight-bold">Supprimer la matière</v-toolbar-title>
        </v-toolbar>

        <v-card-text class="pa-6">
          <v-alert type="warning" outlined class="mb-4">Cette action est irréversible.</v-alert>
          <p class="mb-0">
            Confirmer la suppression de : <strong>{{ subjectToDelete?.nom }}</strong> ?
          </p>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn text @click="deleteSubjectDialog = false">Annuler</v-btn>
          <v-spacer />
          <v-btn
            color="red"
            dark
            class="rounded-lg px-6"
            :loading="loadingDeleteSubject"
            @click="deleteSubjectInline"
          >
            Supprimer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ✅ Dialog SUCCÈS -->
    <v-dialog v-model="successDialog" max-width="520px" persistent>
      <v-card class="rounded-xl overflow-hidden">
        <v-toolbar :color="toolbarColor" dark flat>
          <v-toolbar-title class="font-weight-bold">Succès</v-toolbar-title>
          <v-spacer />
          <v-btn icon @click="successDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>

        <v-card-text class="pa-6">
          <div class="d-flex align-start">
            <v-avatar color="success" size="44" class="mr-4">
              <v-icon color="white">mdi-check</v-icon>
            </v-avatar>

            <div style="flex: 1;">
              <div class="text-subtitle-1 font-weight-bold mb-1">{{ successTitle }}</div>
              <div class="text-body-2" style="white-space: pre-line;">{{ successMessage }}</div>
            </div>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn :color="toolbarColor" dark class="rounded-lg px-6" @click="successDialog = false">
            OK
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ✅ Dialog ERREUR (messages clairs + détails localhost optionnels) -->
    <v-dialog v-model="errorDialog" max-width="560px">
      <v-card class="rounded-xl overflow-hidden">
        <v-toolbar color="red" dark flat>
          <v-toolbar-title class="font-weight-bold">Erreur</v-toolbar-title>
          <v-spacer />
          <v-btn icon @click="errorDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>

        <v-card-text class="pa-6">
          <div class="d-flex align-start">
            <v-avatar color="red" size="44" class="mr-4">
              <v-icon color="white">mdi-alert-circle</v-icon>
            </v-avatar>

            <div style="flex: 1;">
              <div class="text-subtitle-1 font-weight-bold mb-1">{{ errorTitle }}</div>
              <div class="text-body-2" style="white-space: pre-line;">{{ errorMessage }}</div>

              <v-divider class="my-4" />

              <!-- ✅ Détails techniques (localhost) -->
              <v-expansion-panels flat>
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <v-icon start>mdi-information-outline</v-icon>
                    Détails techniques (localhost)
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-chip class="mr-2 mb-2" label>
                      Status: {{ errorDetails.status ?? '—' }}
                    </v-chip>
                    <v-chip class="mr-2 mb-2" label>
                      Code: {{ errorDetails.code ?? '—' }}
                    </v-chip>
                    <v-chip class="mr-2 mb-2" label>
                      URL: {{ errorDetails.url ?? '—' }}
                    </v-chip>

                    <v-alert v-if="errorDetails.raw" type="info" outlined class="mt-3">
                      <div style="white-space: pre-line;">{{ errorDetails.raw }}</div>
                    </v-alert>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </div>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn color="red" dark class="rounded-lg px-6" @click="errorDialog = false">
            Fermer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script>
import axios from "axios";

export default {
  name: "SubjectsManager",
  props: {
    etablissementId: { type: Number, required: true },
    apiBaseUrl: { type: String, default: "http://localhost:8080" },
    title: { type: String, default: "Répartition — Matières" },
    toolbarColor: { type: String, default: "#3949AB" },
    autoLoad: { type: Boolean, default: true },
  },

  data() {
    return {
      inlineSubjects: [],
      loadingSubjects: false,

      inlineSubjectName: "",
      loadingAddSubject: false,

      subjectSearch: "",

      deletingSubjectId: null,
      deleteSubjectDialog: false,
      subjectToDelete: null,
      loadingDeleteSubject: false,

      // ✅ dialogs messages
      successDialog: false,
      successTitle: "Opération réussie",
      successMessage: "",

      errorDialog: false,
      errorTitle: "Une erreur est survenue",
      errorMessage: "",
      errorDetails: { status: null, code: null, url: null, raw: "" },

      subjectHeaders: [
        { text: "ID", value: "id", width: 80 },
        { text: "Matière", value: "nom" },
        { text: "Actions", value: "actions", sortable: false, align: "end", width: 120 },
      ],
    };
  },

  computed: {
    filteredSubjects() {
      const q = (this.subjectSearch || "").toLowerCase().trim();
      if (!q) return this.inlineSubjects || [];
      return (this.inlineSubjects || []).filter((s) => (s.nom || "").toLowerCase().includes(q));
    },
  },

  mounted() {
    if (this.autoLoad) this.fetchSubjectsList();
  },

  methods: {
    subjectsUrl() {
      return `${this.apiBaseUrl}/api/Matieres/${this.etablissementId}`;
    },

    // ✅ construit un message d'erreur clair + détails techniques
    buildClearError(contextLabel, e) {
      const status = e?.response?.status ?? null;
      const url = e?.config?.url ?? null;

      // message backend prioritaire
      const backendMsg = e?.response?.data?.message || e?.response?.data?.error || "";
      const axiosMsg = e?.message || "";

      // cas réseau / CORS / serveur off
      const isNetworkError =
        axiosMsg.toLowerCase().includes("network error") ||
        status === null ||
        status === undefined;

      let userMsg = "";
      if (isNetworkError) {
        userMsg =
          `${contextLabel} : impossible de joindre le serveur.\n` +
          `• Vérifie que ton API tourne sur ${this.apiBaseUrl}\n` +
          `• Vérifie CORS / proxy / port\n` +
          `• Vérifie ta connexion réseau`;
      } else if (status === 409) {
        userMsg =
          `${contextLabel} : action refusée.\n` +
          (backendMsg ? `• Détail : ${backendMsg}` : "• Conflit détecté côté serveur (409).");
      } else if (status === 404) {
        userMsg =
          `${contextLabel} : élément introuvable (404).\n` +
          (backendMsg ? `• Détail : ${backendMsg}` : "");
      } else if (status === 400) {
        userMsg =
          `${contextLabel} : données invalides (400).\n` +
          (backendMsg ? `• Détail : ${backendMsg}` : "");
      } else {
        userMsg =
          `${contextLabel} : échec de l’opération.\n` +
          (backendMsg ? `• Détail : ${backendMsg}` : "• Erreur serveur, réessaye.");
      }

      const raw =
        backendMsg ||
        axiosMsg ||
        "Aucun détail fourni.";

      return {
        title: "Une erreur est survenue",
        message: userMsg.trim(),
        details: {
          status,
          code: e?.code ?? null,
          url,
          raw,
        },
      };
    },

    showSuccess(title, message) {
      this.successTitle = title || "Succès";
      this.successMessage = message || "";
      this.successDialog = true;
    },

    showErrorDialog(contextLabel, eOrMsg) {
      // Si on passe un string simple
      if (typeof eOrMsg === "string") {
        this.errorTitle = "Une erreur est survenue";
        this.errorMessage = eOrMsg;
        this.errorDetails = { status: null, code: null, url: null, raw: eOrMsg };
        this.errorDialog = true;
        this.$emit("error", eOrMsg);
        return;
      }

      const built = this.buildClearError(contextLabel, eOrMsg);
      this.errorTitle = built.title;
      this.errorMessage = built.message;
      this.errorDetails = built.details;
      this.errorDialog = true;
      this.$emit("error", built.message);
    },

    async fetchSubjectsList() {
      this.loadingSubjects = true;
      try {
        const res = await axios.get(this.subjectsUrl());
        this.inlineSubjects = res.data || [];
        this.showSuccess("Liste mise à jour", `✅ ${this.inlineSubjects.length} matière(s) chargée(s).`);
      } catch (e) {
        this.showErrorDialog("Chargement des matières", e);
      } finally {
        this.loadingSubjects = false;
      }
    },

    async addSubjectInline() {
      const name = (this.inlineSubjectName || "").trim();
      if (!name) {
        this.showErrorDialog("Ajout de matière", "Veuillez saisir un nom de matière.");
        return;
      }

      this.loadingAddSubject = true;
      try {
        await axios.post(`${this.apiBaseUrl}/api/Matieres`, {
          name,
          etablissementId: this.etablissementId,
        });

        this.inlineSubjectName = "";
        await this.fetchSubjectsList();

        this.showSuccess("Matière ajoutée", `✅ La matière "${name}" a été ajoutée avec succès.`);
        this.$emit("changed");
      } catch (e) {
        this.showErrorDialog("Ajout de matière", e);
      } finally {
        this.loadingAddSubject = false;
      }
    },

    openDeleteSubjectDialog(subject) {
      this.subjectToDelete = subject;
      this.deleteSubjectDialog = true;
    },

    async deleteSubjectInline() {
      if (!this.subjectToDelete?.id) return;

      this.loadingDeleteSubject = true;
      this.deletingSubjectId = this.subjectToDelete.id;

      const subjectName = this.subjectToDelete?.nom || "la matière";

      try {
        await axios.delete(`${this.apiBaseUrl}/api/Matieres/${this.subjectToDelete.id}`);

        this.deleteSubjectDialog = false;
        this.subjectToDelete = null;

        await this.fetchSubjectsList();

        this.showSuccess("Matière supprimée", `🗑️ "${subjectName}" a été supprimée avec succès.`);
        this.$emit("changed");
      } catch (e) {
        // cas 409 : matière utilisée dans enseigner -> message clair
        this.deleteSubjectDialog = false;
        this.showErrorDialog("Suppression de matière", e);
      } finally {
        this.loadingDeleteSubject = false;
        this.deletingSubjectId = null;
      }
    },
  },
};
</script>

<style scoped>
.shadow-soft {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
}
</style>
