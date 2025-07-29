<template>
  <v-container class="pa-2 pa-sm-6">
    <v-card class="mx-auto card-responsive">
      <v-card-title class="text-center text-h6 text-md-h5 font-weight-bold">
        <v-icon class="mr-2" color="primary">mdi-account-group</v-icon>
        Gestion des Parents
      </v-card-title>

      <v-card-subtitle class="text-center mb-2">
        <v-btn color="primary" @click="openForm" class="text-caption text-sm-body-2">
          <v-icon left>mdi-account-plus</v-icon>
          Inscrire un Parent
        </v-btn>
      </v-card-subtitle>

      <v-card-text>
        <v-form v-if="showForm" class="px-2 px-md-6">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="newParent.name"
                label="Nom"
                prepend-inner-icon="mdi-account"
                dense outlined
                required
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="newParent.firstName"
                label="Prénom"
                prepend-inner-icon="mdi-account"
                dense outlined
                required
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="newParent.contact"
                label="Contact"
                prepend-inner-icon="mdi-phone"
                dense outlined
                required
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="newParent.email"
                label="Email"
                prepend-inner-icon="mdi-email"
                dense outlined
                required
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="newParent.username"
                label="Nom d'utilisateur"
                prepend-inner-icon="mdi-account-circle"
                dense outlined
                required
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="newParent.password"
                :type="showPassword ? 'text' : 'password'"
                label="Mot de passe"
                prepend-inner-icon="mdi-lock"
                dense outlined
                required
              >
                <template v-slot:append-inner>
                  <v-icon @click="showPassword = !showPassword" class="cursor-pointer">
                    {{ showPassword ? 'mdi-eye-off' : 'mdi-eye' }}
                  </v-icon>
                </template>
              </v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                label="Confirmer Mot de passe"
                prepend-inner-icon="mdi-lock-check"
                dense outlined
                required
              >
                <template v-slot:append-inner>
                  <v-icon @click="showConfirmPassword = !showConfirmPassword" class="cursor-pointer">
                    {{ showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye' }}
                  </v-icon>
                </template>
              </v-text-field>
            </v-col>
          </v-row>

          <v-row justify="center" class="mt-2">
            <v-btn color="success" class="mr-2" @click="registerParent" small>
              <v-icon left>mdi-content-save</v-icon> Enregistrer
            </v-btn>
            <v-btn color="error" @click="showForm = false" small>
              <v-icon left>mdi-close-circle</v-icon> Annuler
            </v-btn>
          </v-row>
        </v-form>

        <v-data-table
          v-else
          :headers="headers"
          :items="parents"
          :search="search"
          item-key="id"
          class="elevation-1 mt-4 data-table-responsive"
          dense
        >
          <template v-slot:top>
            <v-toolbar flat dense>
              <v-toolbar-title class="text-subtitle-1 text-md-h6">Liste des Parents</v-toolbar-title>
              <v-spacer></v-spacer>
              <v-text-field
                v-model="search"
                append-icon="mdi-magnify"
                label="Rechercher"
                single-line
                dense
                hide-details
                class="ma-2"
              ></v-text-field>
            </v-toolbar>
          </template>
          <template v-slot:item.action="{ item }">
            <v-icon small class="mr-2 edit-icon" @click="editParent(item)">mdi-pencil</v-icon>
            <v-icon small class="delete-icon" @click="promptDeleteParent(item)">mdi-delete</v-icon>
          </template>
        </v-data-table>
      </v-card-text>

      <!-- Dialog de confirmation suppression -->
      <v-dialog v-model="confirmDeleteDialog" max-width="400">
        <v-card>
          <v-card-title class="text-h6">Confirmer la suppression</v-card-title>
          <v-card-text>Êtes-vous sûr de vouloir supprimer ce parent ?</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="error" text @click="confirmDelete">Oui</v-btn>
            <v-btn color="primary" text @click="confirmDeleteDialog = false">Non</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Dialog de notification -->
      <v-dialog v-model="dialog" max-width="400">
        <v-card>
          <v-card-title class="text-h6">Notification</v-card-title>
          <v-card-text class="text-body-2">{{ dialogMessage }}</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="dialog = false">Fermer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </v-container>
</template>
<script>
import axios from 'axios';

export default {
  props: {
    etablissementId: {
      type: Number,
      required: true
    },
    etablissementNom: {
      type: String,
      required: true
    },
    anneeScolaire: {
      type: String,
      required: true
    },
    anneeScolaireId: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      showForm: false,
      confirmDeleteDialog: false,
      dialog: false,
      dialogMessage: '',
      showPassword: false,
      showConfirmPassword: false,
      parentToDelete: null, // Stocke le parent sélectionné pour suppression
      newParent: {
        id: null,
        name: '',
        firstName: '',
        contact: '',
        email: '',
        username: '',
        password: ''
      },
      confirmPassword: '', // Champ de confirmation de mot de passe
      search: '',
      headers: [
        { title: 'Nom', value: 'name' },
        { title: 'Prénom', value: 'firstName' },
        { title: 'Email', value: 'email' },
        { title: 'Téléphone', value: 'contact' },
        { title: 'Actions', value: 'action', sortable: false }
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
      this.resetForm();  // Réinitialise le formulaire
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
            // Update parent in list
            const index = this.parents.findIndex(p => p.id === this.newParent.id);
            if (index !== -1) {
              this.parents.splice(index, 1, response.data);
            }
          } else {
            // Add new parent to list
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
              this.showError(error.response.data.error); // Afficher l'erreur si des élèves sont associés
            } else {
              this.showError('Erreur lors de la suppression du parent');
            }
            console.error('Erreur:', error);
          })
          .finally(() => {
            this.confirmDeleteDialog = false; // Fermer la boîte de dialogue
          });
      }
    },
    editParent(parent) {
      this.newParent = { ...parent }; // Copier les données du parent sélectionné dans le formulaire
      this.showForm = true;
    },
    resetForm() {
      this.newParent = {
        id: null,
        name: '',
        firstName: '',
        contact: '',
        email: '',
        username: '',
        password: ''
      };
      this.confirmPassword = ''; // Réinitialiser la confirmation du mot de passe
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
.card-responsive {
  max-width: 100%;
  padding: 16px;
  border-radius: 16px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.08);
}

.edit-icon {
  color: #1976D2;
  cursor: pointer;
}

.delete-icon {
  color: #D32F2F;
  cursor: pointer;
}

@media (max-width: 600px) {
  .v-card-title,
  .v-card-subtitle,
  .v-btn,
  .v-toolbar-title,
  .v-text-field input,
  .v-icon,
  .v-card-text,
  .v-data-table {
    font-size: 12px !important;
  }

  .v-btn {
    min-height: 30px !important;
    padding: 4px 10px !important;
  }

  .v-text-field {
    margin-bottom: 10px !important;
  }

  .v-data-table .v-data-table__wrapper {
    font-size: 12px !important;
  }
}

@media (min-width: 601px) {
  .v-card-title,
  .v-card-subtitle,
  .v-btn,
  .v-toolbar-title,
  .v-text-field input,
  .v-icon,
  .v-card-text,
  .v-data-table {
    font-size: 15px;
  }
}
</style>