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
              class="rounded-lg px-6"
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
              dense
              filled
              rounded
              class="search-bar"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-divider class="mb-6"></v-divider>

        <v-expand-transition mode="out-in">
          <div v-if="showForm" key="form">
            <v-form class="form-container">
              <v-sheet elevation="0" color="grey lighten-5" class="pa-4 pa-md-6 rounded-lg border">
                <h3 class="text-subtitle-1 font-weight-bold mb-4 primary--text">
                  Informations du compte parent
                </h3>
                <v-row dense>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="newParent.name"
                      label="Nom"
                      prepend-inner-icon="mdi-account"
                      outlined dense
                      background-color="white"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="newParent.firstName"
                      label="Prénom"
                      prepend-inner-icon="mdi-account-outline"
                      outlined dense
                      background-color="white"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="newParent.contact"
                      label="Contact"
                      prepend-inner-icon="mdi-phone"
                      outlined dense
                      background-color="white"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="newParent.email"
                      label="Email"
                      prepend-inner-icon="mdi-email-outline"
                      outlined dense
                      background-color="white"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12"><v-divider class="my-2"></v-divider></v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="newParent.username"
                      label="Nom d'utilisateur"
                      prepend-inner-icon="mdi-account-circle"
                      outlined dense
                      background-color="white"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="newParent.password"
                      :type="showPassword ? 'text' : 'password'"
                      label="Mot de passe"
                      prepend-inner-icon="mdi-lock-outline"
                      outlined dense
                      background-color="white"
                    >
                      <template v-slot:append-inner>
                        <v-icon @click="showPassword = !showPassword" small>
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
                      outlined dense
                      background-color="white"
                    >
                      <template v-slot:append-inner>
                        <v-icon @click="showConfirmPassword = !showConfirmPassword" small>
                          {{ showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye' }}
                        </v-icon>
                      </template>
                    </v-text-field>
                  </v-col>
                </v-row>

                <v-row class="mt-4 px-2" justify="end">
                  <v-btn color="grey lighten-1" class="mr-3 rounded-lg" @click="showForm = false" depressed>
                    Annuler
                  </v-btn>
                  <v-btn color="success" @click="registerParent" class="rounded-lg px-8" elevation="2">
                    <v-icon left>mdi-check-circle</v-icon> {{ newParent.id ? 'Modifier' : 'Enregistrer' }}
                  </v-btn>
                </v-row>
              </v-sheet>
            </v-form>
          </div>

          <div v-else key="table">
            <v-data-table
              :headers="headers"
              :items="parents"
              :search="search"
              item-key="id"
              class="custom-table elevation-0 rounded-lg border"
              :header-props="{ class: 'grey lighten-4' }"
            >
              <template v-slot:item.action="{ item }">
                <div class="d-flex justify-center">
                  <v-tooltip bottom color="primary">
                    <template v-slot:activator="{ on, attrs }">
                      <v-btn icon color="primary" small v-bind="attrs" v-on="on" @click="editParent(item)" class="mr-1">
                        <v-icon small>mdi-pencil</v-icon>
                      </v-btn>
                    </template>
                    <span>Modifier</span>
                  </v-tooltip>
                  
                  <v-tooltip bottom color="error">
                    <template v-slot:activator="{ on, attrs }">
                      <v-btn icon color="error" small v-bind="attrs" v-on="on" @click="promptDeleteParent(item)">
                        <v-icon small>mdi-delete</v-icon>
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
      <v-card-actions class="grey lighten-5 pa-3">
        <span class="text-caption grey--text text--darken-1">
          Année Scolaire : <strong>{{ anneeScolaire }}</strong>
        </span>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="confirmDeleteDialog" max-width="450">
      <v-card class="rounded-lg">
        <v-card-title class="headline error--text">
          <v-icon color="error" left>mdi-alert-circle</v-icon> Attention
        </v-card-title>
        <v-card-text class="py-4 text-body-1">
          Voulez-vous vraiment supprimer le parent <strong>{{ parentToDelete ? parentToDelete.name : '' }}</strong> ? Cette action peut être irréversible.
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn text @click="confirmDeleteDialog = false">Annuler</v-btn>
          <v-btn color="error" depressed @click="confirmDelete" class="px-6 rounded-md">Supprimer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialog" max-width="400">
      <v-card class="rounded-lg">
        <v-card-title class="text-h6 grey lighten-4">Notification</v-card-title>
        <v-card-text class="text-body-1 pt-6 text-center">
          {{ dialogMessage }}
        </v-card-text>
        <v-card-actions class="justify-center pb-4">
          <v-btn color="primary" depressed class="px-8 rounded-lg" @click="dialog = false">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from 'axios';

export default {
  props: {
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true }
  },
  data() {
    return {
      showForm: false,
      confirmDeleteDialog: false,
      dialog: false,
      dialogMessage: '',
      showPassword: false,
      showConfirmPassword: false,
      parentToDelete: null,
      newParent: {
        id: null,
        name: '',
        firstName: '',
        contact: '',
        email: '',
        username: '',
        password: ''
      },
      confirmPassword: '',
      search: '',
      headers: [
        { text: 'Nom complet', value: 'name', align: 'start' },
        { text: 'Prénom', value: 'firstName' },
        { text: 'Email', value: 'email' },
        { text: 'Téléphone', value: 'contact' },
        { text: 'Actions', value: 'action', sortable: false, align: 'center' }
      ],
      parents: []
    };
  },
  methods: {
    fetchParents() {
      axios.get(`http://localhost:8080/api/Parents/${this.etablissementId}`)
        .then(response => {
          this.parents = response.data;
        })
        .catch(error => {
          this.showError('Erreur lors de la récupération des parents');
          console.error('Erreur:', error);
        });
    },
    openForm() {
      this.resetForm();
      this.showForm = true;
    },
    registerParent() {
      if (this.newParent.password !== this.confirmPassword) {
        this.showError('Les mots de passe ne sont pas conformes');
        return;
      }

      const apiMethod = this.newParent.id ? 'put' : 'post';
      const apiUrl = this.newParent.id
        ? `http://localhost:8080/api/Parents/${this.newParent.id}`
        : 'http://localhost:8080/api/Parents';

      axios[apiMethod](apiUrl, {
        name: this.newParent.name,
        firstName: this.newParent.firstName,
        email: this.newParent.email,
        contact: this.newParent.contact,
        username: this.newParent.username,
        password: this.newParent.password,
        etablissementId: this.etablissementId
      })
        .then(response => {
          if (this.newParent.id) {
            const index = this.parents.findIndex(p => p.id === this.newParent.id);
            if (index !== -1) {
              this.parents.splice(index, 1, response.data);
            }
          } else {
            this.parents.push(response.data);
          }
          this.showSuccess('Parent enregistré avec succès');
          this.resetForm();
        })
        .catch(error => {
          this.showError('Erreur lors de l\'enregistrement du parent');
          console.error('Erreur:', error);
        });
    },
    promptDeleteParent(parent) {
      this.parentToDelete = parent;
      this.confirmDeleteDialog = true;
    },
    confirmDelete() {
      if (this.parentToDelete) {
        axios.delete(`http://localhost:8080/api/Parentss/${this.parentToDelete.id}`)
          .then(() => {
            this.parents = this.parents.filter(p => p.id !== this.parentToDelete.id);
            this.showSuccess('Parent supprimé avec succès');
          })
          .catch(error => {
            if (error.response && error.response.data && error.response.data.error) {
              this.showError(error.response.data.error);
            } else {
              this.showError('Erreur lors de la suppression du parent');
            }
            console.error('Erreur:', error);
          })
          .finally(() => {
            this.confirmDeleteDialog = false;
          });
      }
    },
    editParent(parent) {
      this.newParent = { ...parent };
      this.showForm = true;
    },
    resetForm() {
      this.newParent = {
        id: null, name: '', firstName: '', contact: '', email: '', username: '', password: ''
      };
      this.confirmPassword = '';
      this.showForm = false;
    },
    showSuccess(message) {
      this.dialogMessage = message;
      this.dialog = true;
    },
    showError(message) {
      this.dialogMessage = message;
      this.dialog = true;
    }
  },
  mounted() {
    this.fetchParents();
  }
};
</script>

<style scoped>
.border {
  border: 1px solid #e0e0e0 !important;
}

.search-bar ::v-deep .v-input__control {
  min-height: 40px !important;
}

.custom-table ::v-deep th {
  text-transform: uppercase;
  font-size: 0.75rem !important;
  font-weight: 700 !important;
  color: #555 !important;
  letter-spacing: 0.5px;
}

.custom-table ::v-deep tr:hover {
  background-color: #f8f9fa !important;
  transition: background-color 0.2s;
}

@media (max-width: 600px) {
  .v-toolbar-title {
    font-size: 1.1rem !important;
  }
  .v-data-table ::v-deep td {
    font-size: 13px !important;
    padding: 8px !important;
  }
}
</style>