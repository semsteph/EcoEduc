<template>
  <v-container class="custom-table-container">
    <!-- Barre d'outils avec le bouton "Ajouter une permission" -->
    <v-toolbar flat>
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="dialog = true">
        Ajouter une permission
      </v-btn>
    </v-toolbar>

    <!-- Tableau des permissions -->
    <v-simple-table class="custom-table">
      <thead>
        <tr>
          <th class="custom-header">Date</th>
          <th class="custom-header">Motif</th>
          <th class="custom-header">Durée</th>
          <th class="custom-header">Contact</th>
          <th class="custom-header">Statut</th>
          <th class="custom-header">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="permission in permissions" :key="permission.id" class="custom-row">
          <td class="custom-cell">{{ formatDate(permission.Date) }}</td>
          <td class="custom-cell">{{ permission.Motif }}</td>
          <td class="custom-cell">{{ permission.Duree }}</td>
          <td class="custom-cell">{{ permission.Contact }}</td>
          <td class="custom-cell">{{ permission.Statut ? permission.Statut : 'En attente' }}</td>
          <td class="custom-cell">
            <v-icon @click="deletePermission(permission.id)" color="red" class="clickable-icon">mdi-delete</v-icon>
          </td>
        </tr>
      </tbody>
    </v-simple-table>

   
    <!-- Dialog pour ajouter une nouvelle permission -->
    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span class="text-h5">Ajouter une permission</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="formValid">
            <v-text-field v-model="newPermission.date" label="Date" type="date" required></v-text-field>
            <v-text-field v-model="newPermission.motif" label="Motif" required></v-text-field>
            <v-text-field v-model="newPermission.duree" label="Durée" required></v-text-field>
            <v-text-field v-model="newPermission.contact" label="Contact" required></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="dialog = false">Annuler</v-btn>
          <v-btn color="blue darken-1" text :disabled="!formValid" @click="addPermission">Ajouter</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Snackbar pour les messages de succès -->
    <v-snackbar v-model="snackbarVisible" :color="snackbarColor" top>
      {{ snackbarMessage }}
      <v-btn color="white" text @click="snackbarVisible = false">Fermer</v-btn>
    </v-snackbar>
   
  </v-container>
</template>
<script>
import axios from 'axios';

export default {
  props: {
    childId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      dialog: false, // Contrôle de l'affichage du dialogue
      formValid: false, // Validation du formulaire
      permissions: [], // Tableau qui va contenir les données récupérées
      newPermission: {
        date: '',
        motif: '',
        duree: '',
        contact: ''
      },
      snackbarVisible: false, // Contrôle de la visibilité du snackbar
      snackbarMessage: '', // Message du snackbar
      snackbarColor: '', // Couleur du snackbar
    };
  },
  mounted() {
    this.fetchPermissions();
  },
  methods: {
    fetchPermissions() {
      axios.get('http://localhost:8080/api/permissions')
        .then(response => {
          this.permissions = response.data;
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des permissions:', error);
        });
    },
    formatDate(date) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(date).toLocaleDateString(undefined, options);
    },
    addPermission() {
      // Requête POST pour ajouter une nouvelle permission
      axios.post(`http://localhost:8080/api/permissions/${this.childId}`, {
        date: this.newPermission.date,
        motif: this.newPermission.motif,
        duree: this.newPermission.duree,
        contact: this.newPermission.contact,
        statut: 'En attente', // Statut par défaut
        childId: this.childId  // Ajout de l'ID de l'enfant dans la requête
      
      })
      .then(response => {
        this.permissions.push({
          id: response.data.id,
          Date: this.newPermission.date,
          Motif: this.newPermission.motif,
          Duree: this.newPermission.duree,
          Contact: this.newPermission.contact,
          Statut: 'En attente'
        });
        this.dialog = false;
        this.showSnackbar('Permission ajoutée avec succès', 'success');
        this.resetForm();
      })
      .catch(error => {
        console.error('Erreur lors de l\'ajout de la permission:', error);
      });
    },
    deletePermission(permissionId) {
      // Requête DELETE pour supprimer la permission
      axios.delete(`http://localhost:8080/api/permissions/${permissionId}`)
        .then(() => {
          this.permissions = this.permissions.filter(permission => permission.id !== permissionId);
          this.showSnackbar('Permission supprimée avec succès', 'error');
        })
        .catch(error => {
          console.error('Erreur lors de la suppression de la permission:', error);
        });
    },
    resetForm() {
      // Réinitialisation du formulaire après l'ajout
      this.newPermission = {
        date: '',
        motif: '',
        duree: '',
        contact: ''
      };
      this.$refs.form.resetValidation();
    },
    goBack() {
      this.currentView = 'default';
      this.selectedChild = null
    },
    showSnackbar(message, color) {
      this.snackbarMessage = message;
      this.snackbarColor = color;
      this.snackbarVisible = true;
    },
    
  }
};
</script>
<style>
/* Conteneur général du tableau avec largeur réduite et centrage */
.custom-table-container {
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 10px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto;
}

/* Style du tableau */
.custom-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 10px;
  overflow: hidden;
}

/* Style des en-têtes */
.custom-header {
  background-color: #3f51b5;
  color: white;
  font-weight: bold;
  text-align: left;
  padding: 12px;
  border-bottom: 2px solid #e0e0e0;
}

/* Style des cellules */
.custom-cell {
  padding: 10px 12px;
  border-bottom: 1px solid #e0e0e0;
  color: #333;
}

/* Alternance de couleur pour les lignes */
.custom-row:nth-child(even) {
  background-color: #f5f5f5;
}

/* Effet survol pour les lignes */
.custom-row:hover {
  background-color: #ececec;
  transition: background-color 0.3s ease;
}

/* Alignement pour la dernière colonne */
.custom-cell:last-child {
  text-align: center;
  border-right: none;
}

/* Style des icônes cliquables */
.clickable-icon {
  cursor: pointer;
}
</style>

