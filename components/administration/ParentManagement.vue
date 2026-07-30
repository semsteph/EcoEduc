<!-- ParentManagement.vue (COMPLET CORRIGÉ - HEADERS VISIBLES) -->
<template>
  <v-container class="pa-2 pa-sm-4 pa-md-8" fluid>
    <v-card class="mx-auto rounded-xl elevation-2 overflow-hidden" max-width="1200">
      <v-toolbar flat color="primary" dark class="px-2">
        <v-icon large left>mdi-account-group-outline</v-icon>
        <v-toolbar-title class="font-weight-bold text-h6 text-md-h5">
          Gestion des Parents
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-chip color="white" text-color="primary" class="font-weight-bold d-none d-sm-flex" small>
          {{ etablissementNom }}
        </v-chip>
      </v-toolbar>

      <v-card-text class="pt-6 px-4 px-sm-8">
        <v-row align="center" class="mb-6">
          <v-col cols="12" sm="auto">
            <v-btn
              :color="showForm ? 'secondary' : 'primary'"
              @click="showForm ? (showForm = false) : openForm()"
              block
              elevation="2"
              class="rounded-lg px-2 px-sm-6"
            >
              <v-icon left>{{ showForm ? 'mdi-view-list' : 'mdi-account-plus' }}</v-icon>
              {{ showForm ? 'Voir la liste' : 'Inscrire un Parent' }}
            </v-btn>
          </v-col>

          <v-spacer></v-spacer>

          <v-col v-if="!showForm" cols="12" sm="4" md="3">
            <v-text-field
              v-model="search"
              append-icon="mdi-magnify"
              label="Rechercher un parent..."
              single-line
              hide-details
              density="compact"
              variant="filled"
              rounded
              class="search-bar"
            />
          </v-col>
        </v-row>

        <v-divider class="mb-6"></v-divider>

        <v-expand-transition mode="out-in">
          <!-- FORM -->
          <div v-if="showForm" key="form">
            <v-form class="form-container" @submit.prevent="registerParent">
              <v-sheet elevation="0" color="grey-lighten-4" class="pa-4 pa-md-6 rounded-lg border">
                <h3 class="text-subtitle-1 font-weight-bold mb-4 primary--text">
                  Informations du compte parent
                </h3>

                <v-row dense>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="newParent.name"
                      label="Nom"
                      prepend-inner-icon="mdi-account"
                      variant="outlined"
                      density="compact"
                      bg-color="white"
                      required
                    />
                  </v-col>

                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="newParent.firstName"
                      label="Prénom"
                      prepend-inner-icon="mdi-account-outline"
                      variant="outlined"
                      density="compact"
                      bg-color="white"
                      required
                    />
                  </v-col>

                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="newParent.contact"
                      label="Téléphone"
                      prepend-inner-icon="mdi-phone"
                      variant="outlined"
                      density="compact"
                      bg-color="white"
                    />
                  </v-col>

                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="newParent.email"
                      label="Email"
                      prepend-inner-icon="mdi-email-outline"
                      variant="outlined"
                      density="compact"
                      bg-color="white"
                    />
                  </v-col>

                  <v-col cols="12"><v-divider class="my-2"></v-divider></v-col>

                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="newParent.username"
                      label="Nom d'utilisateur"
                      prepend-inner-icon="mdi-account-circle"
                      variant="outlined"
                      density="compact"
                      bg-color="white"
                      required
                    />
                  </v-col>

                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="newParent.password"
                      :type="showPassword ? 'text' : 'password'"
                      label="Mot de passe"
                      prepend-inner-icon="mdi-lock-outline"
                      variant="outlined"
                      density="compact"
                      bg-color="white"
                      :required="!newParent.id"
                    >
                      <template #append-inner>
                        <v-icon @click="showPassword = !showPassword" size="18">
                          {{ showPassword ? 'mdi-eye-off' : 'mdi-eye' }}
                        </v-icon>
                      </template>
                    </v-text-field>
                  </v-col>

                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="confirmPassword"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      label="Confirmer Mot de passe"
                      prepend-inner-icon="mdi-lock-check-outline"
                      variant="outlined"
                      density="compact"
                      bg-color="white"
                      :required="!newParent.id"
                    >
                      <template #append-inner>
                        <v-icon @click="showConfirmPassword = !showConfirmPassword" size="18">
                          {{ showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye' }}
                        </v-icon>
                      </template>
                    </v-text-field>
                  </v-col>
                </v-row>

                <v-row class="mt-4 px-2" justify="end">
                  <v-btn color="grey-lighten-1" class="mr-3 rounded-lg" @click="cancelForm" variant="flat">
                    Annuler
                  </v-btn>

                  <v-btn
                    color="success"
                    type="submit"
                    class="rounded-lg px-2 px-sm-8"
                    elevation="2"
                    :loading="saving"
                  >
                    <v-icon left>mdi-check-circle</v-icon>
                    {{ newParent.id ? 'Modifier' : 'Enregistrer' }}
                  </v-btn>
                </v-row>
              </v-sheet>
            </v-form>
          </div>

          <!-- TABLE -->
          <div v-else key="table">
            <v-data-table
              :headers="headers"
              :items="parents"
              :search="search"
              item-value="id"
              class="custom-table elevation-0 rounded-lg border"
              fixed-header
              height="520"
            >
              <!-- Nom -->
              <template #item.name="{ item }">
                <span class="font-weight-medium">{{ item?.name || '-' }}</span>
              </template>

              <!-- Prénoms -->
              <template #item.firstName="{ item }">
                <span>{{ item?.firstName || '-' }}</span>
              </template>

              <!-- Email -->
              <template #item.email="{ item }">
                <span>{{ item?.email || '-' }}</span>
              </template>

              <!-- Téléphone -->
              <template #item.contact="{ item }">
                <span>{{ item?.contact || '-' }}</span>
              </template>

              <!-- Actions -->
              <template #item.action="{ item }">
                <div class="d-flex justify-center">
                  <v-tooltip location="bottom" color="primary">
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon
                        color="primary"
                        size="small"
                        @click="editParent(item)"
                        class="mr-1"
                      >
                        <v-icon size="18">mdi-pencil</v-icon>
                      </v-btn>
                    </template>
                    <span>Modifier</span>
                  </v-tooltip>

                  <v-tooltip location="bottom" color="error">
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon
                        color="error"
                        size="small"
                        @click="promptDeleteParent(item)"
                      >
                        <v-icon size="18">mdi-delete</v-icon>
                      </v-btn>
                    </template>
                    <span>Supprimer</span>
                  </v-tooltip>
                </div>
              </template>
            </v-data-table>
          </div>
        </v-expand-transition>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="grey-lighten-4 pa-3">
        <span class="text-caption text-grey-darken-1">
          Année Scolaire : <strong>{{ anneeScolaire }}</strong>
        </span>
      </v-card-actions>
    </v-card>

    <!-- CONFIRM DELETE -->
    <v-dialog v-model="confirmDeleteDialog" max-width="450">
      <v-card class="rounded-lg">
        <v-card-title class="headline text-error">
          <v-icon color="error" left>mdi-alert-circle</v-icon> Attention
        </v-card-title>
        <v-card-text class="py-4 text-body-1">
          Voulez-vous vraiment supprimer le parent
          <strong>{{ parentToDelete ? `${parentToDelete.name} ${parentToDelete.firstName || ''}` : '' }}</strong> ?
          Cette action peut être irréversible.
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="confirmDeleteDialog = false">Annuler</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDelete" class="px-2 px-sm-6 rounded-md" :loading="deleting">
            Supprimer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- NOTIF -->
    <v-dialog v-model="dialog" max-width="400">
      <v-card class="rounded-lg">
        <v-card-title class="text-h6 grey-lighten-4">Notification</v-card-title>
        <v-card-text class="text-body-1 pt-6 text-center">
          {{ dialogMessage }}
        </v-card-text>
        <v-card-actions class="justify-center pb-4">
          <v-btn color="primary" variant="flat" class="px-2 px-sm-8 rounded-lg" @click="dialog = false">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from "axios";

export default {
  name: "ParentManagement",
  emits: ["parent-created", "parent-updated", "parent-deleted"],
  props: {
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
  },
  data() {
    return {
      showForm: false,
      confirmDeleteDialog: false,
      dialog: false,
      dialogMessage: "",
      showPassword: false,
      showConfirmPassword: false,
      saving: false,
      deleting: false,
      parentToDelete: null,
      newParent: {
        id: null,
        name: "",
        firstName: "",
        contact: "",
        email: "",
        username: "",
        password: "",
      },
      confirmPassword: "",
      search: "",

      // ✅✅✅ Vuetify 3: headers = title/key (sinon titres invisibles)
      headers: [
        { title: "Nom", key: "name", align: "start" },
        { title: "Prénoms", key: "firstName" },
        { title: "Email", key: "email" },
        { title: "Téléphone", key: "contact" },
        { title: "Actions", key: "action", sortable: false, align: "center" },
      ],

      parents: [],
    };
  },
  methods: {
    openForm() {
      this.resetForm(true);
    },

    fetchParents() {
      axios
        .get(`/api/Parents/${this.etablissementId}`)
        .then((response) => {
          this.parents = response.data || [];
        })
        .catch((error) => {
          this.showError("Erreur lors de la récupération des parents");
          console.error("Erreur:", error);
        });
    },

    cancelForm() {
      this.showForm = false;
      this.resetForm(false);
    },

    registerParent() {
      if (!this.newParent.id) {
        if (!this.newParent.password || !this.confirmPassword) {
          this.showError("Veuillez renseigner le mot de passe et la confirmation");
          return;
        }
        if (this.newParent.password !== this.confirmPassword) {
          this.showError("Les mots de passe ne sont pas conformes");
          return;
        }
      }

      this.saving = true;

      const isUpdate = !!this.newParent.id;
      const apiMethod = isUpdate ? "put" : "post";
      const apiUrl = isUpdate
        ? `/api/Parents/${this.newParent.id}`
        : "/api/Parents";

      const payload = {
        name: this.newParent.name,
        firstName: this.newParent.firstName,
        email: this.newParent.email,
        contact: this.newParent.contact,
        username: this.newParent.username,
        etablissementId: this.etablissementId,
        anneeScolaireId: this.anneeScolaireId,
      };

      if (!isUpdate) payload.password = this.newParent.password;

      axios[apiMethod](apiUrl, payload)
        .then((response) => {
          const savedParent = response.data;

          if (isUpdate) {
            const index = this.parents.findIndex((p) => p.id === this.newParent.id);
            if (index !== -1) this.parents.splice(index, 1, savedParent);

            this.showSuccess("Parent modifié avec succès");
            this.$emit("parent-updated", savedParent);
          } else {
            this.parents.push(savedParent);
            this.showSuccess("Parent enregistré avec succès");
            this.$emit("parent-created", savedParent);
          }

          this.showForm = false;
          this.resetForm(false);
        })
        .catch((error) => {
          this.showError("Erreur lors de l'enregistrement du parent");
          console.error("Erreur:", error);
        })
        .finally(() => {
          this.saving = false;
        });
    },

    promptDeleteParent(parent) {
      this.parentToDelete = parent;
      this.confirmDeleteDialog = true;
    },

    confirmDelete() {
      if (!this.parentToDelete) return;

      this.deleting = true;

      axios
        .delete(`/api/Parents/${this.parentToDelete.id}`)
        .then(() => {
          const deleted = this.parentToDelete;
          this.parents = this.parents.filter((p) => p.id !== deleted.id);

          this.showSuccess("Parent supprimé avec succès");
          this.$emit("parent-deleted", deleted);
        })
        .catch((error) => {
          if (error.response?.data?.error) this.showError(error.response.data.error);
          else this.showError("Erreur lors de la suppression du parent");
          console.error("Erreur:", error);
        })
        .finally(() => {
          this.confirmDeleteDialog = false;
          this.deleting = false;
          this.parentToDelete = null;
        });
    },

    editParent(parent) {
      this.newParent = { ...parent, password: "" };
      this.confirmPassword = "";
      this.showForm = true;
    },

    resetForm(open = false) {
      this.newParent = {
        id: null,
        name: "",
        firstName: "",
        contact: "",
        email: "",
        username: "",
        password: "",
      };
      this.confirmPassword = "";
      this.showPassword = false;
      this.showConfirmPassword = false;

      if (open) this.showForm = true;
    },

    showSuccess(message) {
      this.dialogMessage = message;
      this.dialog = true;
    },
    showError(message) {
      this.dialogMessage = message;
      this.dialog = true;
    },
  },
  mounted() {
    this.fetchParents();
  },
};
</script>

<style scoped>
.border {
  border: 1px solid #e0e0e0 !important;
}

/* ✅ En-têtes BIEN visibles (Vuetify 3) */
.custom-table :deep(th),
.custom-table :deep(.v-data-table__th) {
  background: #f2f4f7 !important;
  color: #111827 !important;
  font-weight: 800 !important;
  text-transform: uppercase;
  font-size: 0.78rem !important;
  letter-spacing: 0.6px;
  height: 52px !important;
}

/* ✅ cellules */
.custom-table :deep(td) {
  font-size: 0.92rem;
}

.search-bar :deep(.v-field__input) {
  min-height: 40px !important;
}

.custom-table :deep(tr:hover) {
  background-color: #f8f9fa !important;
  transition: background-color 0.2s;
}

@media (max-width: 600px) {
  .v-toolbar-title {
    font-size: 1.1rem !important;
  }
  .custom-table :deep(td) {
    font-size: 13px !important;
    padding: 8px !important;
  }
}
</style>
