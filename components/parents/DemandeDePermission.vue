<template>
  <v-container class="custom-table-container">
    <v-btn icon @click="$emit('back')" class="back-button">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>
    <v-toolbar flat class="toolbar">
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="dialog = true" class="add-button">
        Ajouter une permission
      </v-btn>
    </v-toolbar>
    
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
          <td class="custom-cell action-cell">
            <v-icon @click="deletePermission(permission.id)" color="red" class="clickable-icon">mdi-delete</v-icon>
          </td>
        </tr>
      </tbody>
    </v-simple-table>

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

    <v-snackbar v-model="snackbarVisible" :color="snackbarColor" top>
      {{ snackbarMessage }}
      <v-btn color="white" text @click="snackbarVisible = false">Fermer</v-btn>
    </v-snackbar>

    <v-btn block color="secondary" @click="$emit('back')" class="mt-4">Retour</v-btn>
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
    etablissementId: {
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
      axios.get(`http://localhost:8080/api/permissions/${this.childId}/${this.etablissementId}`)
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
      axios.post(`http://localhost:8080/api/permissions/${this.childId}`, {
        date: this.newPermission.date,
        motif: this.newPermission.motif,
        duree: this.newPermission.duree,
        contact: this.newPermission.contact,
        statut: 'En attente',
        childId: this.childId,
        etablissementId: this.etablissementId
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
      this.newPermission = {
        date: '',
        motif: '',
        duree: '',
        contact: ''
      };
      this.$refs.form.resetValidation();
    },
    goBack() {
      this.$emit("default", "InfoDetails");
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
.custom-table-container {
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 10px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
  max-width: 100%;
  margin: 0 auto;
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 10px;
  overflow-x: auto;
}

.custom-header {
  background-color: #3f51b5;
  color: white;
  font-weight: bold;
  text-align: left;
  padding: 12px;
  border-bottom: 2px solid #e0e0e0;
}

.custom-cell {
  padding: 10px 12px;
  border-bottom: 1px solid #e0e0e0;
  color: #333;
  word-wrap: break-word;
}

.custom-row:nth-child(even) {
  background-color: #f5f5f5;
}

.custom-row:hover {
  background-color: #ececec;
  transition: background-color 0.3s ease;
}

.action-cell {
  text-align: center;
  white-space: nowrap;
}

.clickable-icon {
  cursor: pointer;
}

.back-button {
  margin-bottom: 16px;
}

.add-button {
  display: block;
  margin: 10px auto;
}

@media screen and (max-width: 600px) {
  .custom-header,
  .custom-cell {
    font-size: 14px;
    padding: 8px;
  }
  .custom-table-container {
    padding: 10px;
  }
  .custom-table {
    display: block;
    overflow-x: auto;
  }
  .v-btn {
    font-size: 14px;
    padding: 8px;
  }
  .v-card-title {
    font-size: 18px;
  }
  .toolbar {
    display: flex;
    justify-content: center;
  }
  .add-button {
    width: 100%;
    max-width: 250px;
    display: flex;
    justify-content: center;
  }
}
</style>
