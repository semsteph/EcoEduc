<template>
  <v-container class="custom-table-container">
    <v-toolbar flat class="toolbar">
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="dialog = true" class="add-button">
        Ajouter une permission
      </v-btn>
    </v-toolbar>
    
    <div class="table-wrap">
      <v-table class="custom-table">
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
            <td class="custom-cell">{{ periode(permission) }}</td>
            <td class="custom-cell">{{ permission.Motif }}</td>
            <td class="custom-cell">{{ permission.Duree }}</td>
            <td class="custom-cell">{{ permission.Contact }}</td>
            <td class="custom-cell">{{ permission.Statut ? permission.Statut : 'En attente' }}</td>
            <td class="custom-cell action-cell">
              <v-btn
                icon
                variant="text"
                color="red"
                class="delete-btn"
                @click="deletePermission(permission.id)"
                aria-label="Supprimer la permission"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span class="text-h5">Ajouter une permission</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="formValid">
            <div class="perm-label">Absence de</div>
            <v-btn-toggle v-model="newPermission.type" mandatory color="primary" variant="outlined" density="compact" class="perm-types mb-3">
              <v-btn value="journee">Une journée</v-btn>
              <v-btn value="jours">Plusieurs jours</v-btn>
              <v-btn value="heures">Quelques heures</v-btn>
            </v-btn-toggle>
            <v-text-field v-model="newPermission.date" :label="newPermission.type === 'jours' ? 'Du' : 'Le'" type="date" :min="aujourdhui" variant="outlined" density="compact" />
            <v-text-field v-if="newPermission.type === 'jours'" v-model="newPermission.dateFin" label="Au (inclus)" type="date" :min="newPermission.date || aujourdhui" variant="outlined" density="compact" />
            <div v-if="newPermission.type === 'heures'" class="d-flex ga-2">
              <v-text-field v-model="newPermission.heureDebut" label="De" type="time" variant="outlined" density="compact" />
              <v-text-field v-model="newPermission.heureFin" label="À" type="time" variant="outlined" density="compact" />
            </div>
            <v-text-field v-model="newPermission.motif" label="Motif" variant="outlined" density="compact" />
            <v-text-field v-model="newPermission.contact" label="Téléphone pour vous joindre" type="tel" variant="outlined" density="compact" />
            <v-alert v-if="erreurForm" type="error" variant="tonal" density="compact">{{ erreurForm }}</v-alert>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="dialog = false">Annuler</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!formulaireComplet" :loading="envoi" @click="addPermission">Envoyer la demande</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
    etablissementId: {
      type: Number,
      required: true,
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
      dialog: false, // Contrôle de l'affichage du dialogue
      formValid: false, // Validation du formulaire
      permissions: [], // Tableau qui va contenir les données récupérées
      newPermission: { type: 'journee', date: '', dateFin: '', heureDebut: '', heureFin: '', motif: '', contact: '' },
      erreurForm: '',
      envoi: false,
      aujourdhui: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10),
      snackbarVisible: false, // Contrôle de la visibilité du snackbar
      snackbarMessage: '', // Message du snackbar
      snackbarColor: '', // Couleur du snackbar
    };
  
  },

  computed: {
    formulaireComplet() {
      const p = this.newPermission;
      if (!p.date || !p.motif.trim() || !p.contact.trim()) return false;
      if (p.type === 'jours') return Boolean(p.dateFin);
      if (p.type === 'heures') return Boolean(p.heureDebut && p.heureFin);
      return true;
    },
  },
  mounted() {
    this.fetchPermissions();
  },
  methods: {
    fetchPermissions() {
      const token = localStorage.getItem('token');
      axios.get(`/api/permissions/${this.childId}/${this.etablissementId}/${this.anneeScolaireId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(response => {
          this.permissions = response.data;
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des permissions:', error);
        });
        
    },
    formatDate(date) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(date).toLocaleDateString('fr-FR', options);
    },
    // « 12 octobre 2026 », « du 12 au 14 octobre 2026 », « 12 octobre 2026, 8h00-10h00 ».
    periode(p) {
      if (p.date_fin && String(p.date_fin).slice(0, 10) !== String(p.Date).slice(0, 10)) return `du ${this.formatDate(p.Date)} au ${this.formatDate(p.date_fin)}`;
      if (p.heure_debut && p.heure_fin) return `${this.formatDate(p.Date)}, ${String(p.heure_debut).slice(0, 5).replace(':', 'h')}-${String(p.heure_fin).slice(0, 5).replace(':', 'h')}`;
      return this.formatDate(p.Date);
    },
  
    async addPermission() {
      const p = this.newPermission;
      this.erreurForm = '';
      this.envoi = true;
      try {
        const token = localStorage.getItem('token');
        await axios.post(`/api/permissions/${this.childId}`, {
          type: p.type,
          date: p.date,
          dateFin: p.type === 'jours' ? p.dateFin : null,
          heureDebut: p.type === 'heures' ? p.heureDebut : null,
          heureFin: p.type === 'heures' ? p.heureFin : null,
          motif: p.motif,
          contact: p.contact,
          childId: this.childId,
          etablissementId: this.etablissementId,
          anneeScolaireId: this.anneeScolaireId,
        }, { headers: { Authorization: `Bearer ${token}` } });
        this.dialog = false;
        this.showSnackbar('Demande envoyée à l\'établissement.', 'success');
        this.resetForm();
        this.fetchPermissions();
      } catch (error) {
        this.erreurForm = error?.response?.data?.message || 'La demande n\'a pas pu être envoyée.';
      } finally {
        this.envoi = false;
      }
    },
    deletePermission(permissionId) {
      const token = localStorage.getItem('token');
      axios.delete(`/api/permissions/${permissionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(() => {
          this.permissions = this.permissions.filter(permission => permission.id !== permissionId);
          this.showSnackbar('Permission supprimée avec succès', 'error');
        })
        .catch(error => {
          console.error('Erreur lors de la suppression de la permission:', error);
        });
    },
    resetForm() {
      this.newPermission = { type: 'journee', date: '', dateFin: '', heureDebut: '', heureFin: '', motif: '', contact: '' };
      this.erreurForm = '';
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
.perm-label { font-size: 0.85rem; font-weight: 600; margin-bottom: 4px; }
.perm-types { width: 100%; }
.perm-types .v-btn { flex: 1; text-transform: none; font-size: 0.78rem; }
.custom-table-container {
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  max-width: 100%;
  margin: 0 auto;
}

.table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.custom-table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  background-color: white;
  border-radius: 10px;
}

.custom-header,
.custom-cell {
  white-space: nowrap;
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

.delete-btn {
  min-width: 44px;
  min-height: 44px;
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
