<template>
  <v-container class="button-group">
    <v-card>
      <v-card-title>
        <span class="headline">Gestion des Parents</span>
      </v-card-title>
      <v-card-subtitle>
        <v-btn @click="openForm">Inscrire un Parent</v-btn>
      </v-card-subtitle>
      <v-card-text>
        <!-- Afficher le formulaire d'inscription si showForm est vrai -->
        <v-form v-if="showForm">
          <v-text-field v-model="newParent.name" label="Nom" required></v-text-field>
          <v-text-field v-model="newParent.firstName" label="Prénom" required></v-text-field>
          <v-text-field v-model="newParent.contact" label="Contact" required></v-text-field>
          <v-text-field v-model="newParent.email" label="Email" required></v-text-field>
          <v-text-field v-model="newParent.username" label="Nom d'utilisateur" required></v-text-field>
          <v-text-field v-model="newParent.password" label="Mot de passe" type="password" required></v-text-field>
          <v-text-field v-model="confirmPassword" label="Confirmer Mot de passe" type="password" required></v-text-field>
          <v-btn @click="registerParent">Enregistrer</v-btn>
          <v-btn @click="showForm = false">Annuler</v-btn>
        </v-form>

        <!-- Tableau affiché si showForm est faux -->
        <v-data-table
          v-else
          :headers="headers"
          :items="parents"
          item-key="id"
          class="elevation-1"
        >
          <template v-slot:top>
            <v-toolbar flat>
              <v-toolbar-title>Liste des Parents</v-toolbar-title>
              <v-spacer></v-spacer>
              <v-text-field
                v-model="search"
                append-icon="mdi-magnify"
                label="Rechercher"
                single-line
                hide-details
              ></v-text-field>
            </v-toolbar>
          </template>
          <template v-slot:item.action="{ item }">
            <v-icon small @click="editParent(item)">mdi-pencil</v-icon>
            <v-icon small @click="promptDeleteParent(item)">mdi-delete</v-icon>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Dialog pour confirmation de suppression -->
    <v-dialog v-model="confirmDeleteDialog" max-width="500px">
      <v-card>
        <v-card-title class="headline">Confirmation de suppression</v-card-title>
        <v-card-text>
          Êtes-vous sûr de vouloir supprimer ce parent ?
        </v-card-text>
        <v-card-actions>
          <v-btn color="red" text @click="confirmDelete">Oui, supprimer</v-btn>
          <v-btn text @click="confirmDeleteDialog = false">Annuler</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog pour succès/erreur avec gestion des longs messages -->
    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title class="headline">Message</v-card-title>
        <v-card-text class="dialog-content">
          {{ dialogMessage }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="dialog = false">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
    }
  },
  data() {
    return {
      showForm: false,
      confirmDeleteDialog: false,
      dialog: false,
      dialogMessage: '',
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
        axios.delete(`http://localhost:8080/api/Parents/${this.parentToDelete.id}`)
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
.button-group {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin: 20% 10%;
  height: 100px;
  padding-block: 100px;
}

.dialog-content {
  max-height: 200px; /* Limite la hauteur du message */
  overflow-y: auto;  /* Permet le défilement si le contenu dépasse la hauteur */
  word-wrap: break-word; /* Coupe les mots trop longs */
}
</style>
