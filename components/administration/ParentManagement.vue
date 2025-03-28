<template>
  <v-container class="button-group">
    <v-card class="mx-auto" max-width="600">
      <v-card-title class="text-h5 text-center">
        Gestion des Parents
      </v-card-title>
      <v-card-subtitle class="text-center">
        <v-btn color="primary" @click="openForm">Inscrire un Parent</v-btn>
      </v-card-subtitle>
      <v-card-text>
        <v-form v-if="showForm" class="px-3">
          <v-text-field v-model="newParent.name" label="Nom" required></v-text-field>
          <v-text-field v-model="newParent.firstName" label="Prénom" required></v-text-field>
          <v-text-field v-model="newParent.contact" label="Contact" required></v-text-field>
          <v-text-field v-model="newParent.email" label="Email" required></v-text-field>
          <v-text-field v-model="newParent.username" label="Nom d'utilisateur" required></v-text-field>
          
          <v-text-field 
            v-model="newParent.password" 
            :type="showPassword ? 'text' : 'password'" 
            label="Mot de passe" required>
            <template v-slot:append-inner>
              <v-icon @click="showPassword = !showPassword">{{ showPassword ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
            </template>
          </v-text-field>
          
          <v-text-field 
            v-model="confirmPassword" 
            :type="showConfirmPassword ? 'text' : 'password'" 
            label="Confirmer Mot de passe" required>
            <template v-slot:append-inner>
              <v-icon @click="showConfirmPassword = !showConfirmPassword">{{ showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
            </template>
          </v-text-field>
          
          <v-btn color="success" class="mr-2" @click="registerParent">Enregistrer</v-btn>
          <v-btn color="error" @click="showForm = false">Annuler</v-btn>
        </v-form>

        <v-data-table v-else :headers="headers" :items="parents" item-key="id" class="elevation-1 mt-4">
          <template v-slot:top>
            <v-toolbar flat>
              <v-toolbar-title>Liste des Parents</v-toolbar-title>
              <v-spacer></v-spacer>
              <v-text-field v-model="search" append-icon="mdi-magnify" label="Rechercher" single-line hide-details></v-text-field>
            </v-toolbar>
          </template>
          <template v-slot:item.action="{ item }">
            <v-icon small class="mr-2" color="blue" @click="editParent(item)">mdi-pencil</v-icon>
            <v-icon small color="red" @click="promptDeleteParent(item)">mdi-delete</v-icon>
          </template>
        </v-data-table>
      </v-card-text>
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
.content-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.main-card {
  width: 100%;
  max-width: 900px;
  padding: 20px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
}

.form-card {
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 10px;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
}

.dialog-content {
  max-height: 200px;
  overflow-y: auto;
}

.edit-icon {
  color: #1976D2;
  cursor: pointer;
  margin-right: 10px;
}

.delete-icon {
  color: #D32F2F;
  cursor: pointer;
}
.button-group {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 20px;
}
</style>

