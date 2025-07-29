<template>
  <div class="message-wrapper">
    <!-- Card contenant les messages -->
    <v-card color="blue lighten-5" class="message-card elevation-2">
      <v-card-title class="title d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-message-alert</v-icon>
          Messages de permission
        </div>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <div
          v-for="message in filteredPermissions"
          :key="message.id"
          class="message-item"
        >
          <v-row align="center" justify="space-between">
            <v-col cols="12" md="9">
              <p class="message-text">
                <v-icon color="blue darken-1" class="mr-1">mdi-account-child</v-icon>
                Une permission est demandée pour l'élève
                <strong>{{ message.eleve ? message.eleve.nom : 'Nom Inconnu' }}</strong>
                <strong>{{ message.eleve ? message.eleve.prenom : '' }}</strong>
                de la classe
                <strong>{{ message.classe ? message.classe.nom : 'Classe Inconnue' }}</strong>.
              </p>
            </v-col>
            <v-col cols="12" md="3" class="text-right">
              <v-btn color="primary" class="consult-btn" @click="openDialog(message)" variant="elevated">
                <v-icon left class="mr-1">mdi-eye</v-icon>
                Consulter
              </v-btn>
            </v-col>
          </v-row>
        </div>
      </v-card-text>
    </v-card>

    <!-- Dialog pour consulter les détails de la permission -->
    <v-dialog v-model="dialog" max-width="800px">
      <v-card class="elevation-4">
        <v-card-title class="d-flex justify-space-between align-center">
          <div>
            <v-icon color="indigo" class="mr-2">mdi-information-outline</v-icon>
            Détails de la permission
          </div>
          <v-btn color="green" @click="openStatusDialog" variant="text">
            <v-icon left>mdi-pencil</v-icon>
            Répondre
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <div class="table-container">
            <v-simple-table class="styled-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Classe</th>
                  <th>Date</th>
                  <th>Motif</th>
                  <th>Durée</th>
                  <th>Contact</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{ selectedMessage?.eleve?.nom || 'Inconnu' }}</td>
                  <td>{{ selectedMessage?.eleve?.prenom || 'Inconnu' }}</td>
                  <td>{{ selectedMessage?.classe?.nom || 'Inconnue' }}</td>
                  <td>{{ formatDate(selectedMessage?.date) || 'Non spécifiée' }}</td>
                  <td>{{ selectedMessage?.motif || 'Non spécifié' }}</td>
                  <td>{{ selectedMessage?.duree || 'Non spécifiée' }}</td>
                  <td>{{ selectedMessage?.contact || 'Non spécifié' }}</td>
                  <td>{{ selectedMessage?.statut || 'En attente' }}</td>
                </tr>
              </tbody>
            </v-simple-table>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="red darken-1" variant="text" @click="dialog = false">
            <v-icon left small>mdi-close-circle</v-icon>
            Fermer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog pour mettre à jour le statut -->
    <v-dialog v-model="statusDialog" max-width="400px">
      <v-card class="elevation-4">
        <v-card-title class="text-subtitle-1 font-weight-bold">
          <v-icon left color="green darken-1" class="mr-1">mdi-check-decagram</v-icon>
          Mettre à jour le statut
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-select
            v-model="selectedStatus"
            :items="['autoriser', 'non autoriser', 'sous reserve de justification']"
            label="Sélectionnez le statut"
            dense
            outlined
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green" variant="elevated" @click="validatePermission">
            <v-icon left>mdi-content-save</v-icon>
            Enregistrer
          </v-btn>
          <v-btn color="red" variant="text" @click="statusDialog = false">
            <v-icon left small>mdi-close</v-icon>
            Fermer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import axios from 'axios';
import moment from 'moment';

export default {
  name: 'MessageComponent',
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
      permissions: [],
      filteredPermissions: [],
      dialog: false,
      statusDialog: false,
      selectedMessage: null,
      selectedStatus: '',
    };
  },
  methods: {
    async fetchPermissions() {
      try {
        const response = await axios.get(`http://localhost:8080/api/permissions/${this.etablissementId}/${this.anneeScolaireId}`);
        this.permissions = response.data;
        this.filterPermissionsByMonth();
        await this.fetchStudentsAndClasses();
      } catch (error) {
        console.error('Erreur lors de la récupération des permissions :', error);
      }
    },

    filterPermissionsByMonth() {
      const currentMonth = moment().month();
      this.filteredPermissions = this.permissions.filter(permission =>
        moment(permission.date).month() === currentMonth
      );
    },

    async fetchStudentsAndClasses() {
      const permissionsWithDetails = await Promise.all(
        this.filteredPermissions.map(async (permission) => {
          try {
            const response = await axios.get(`http://localhost:8080/api/students/${permission.eleve_id}`);
            const { eleveNom, elevePrenom, classeNom } = response.data;

            return {
              ...permission,
              eleve: { nom: eleveNom, prenom: elevePrenom },
              classe: { nom: classeNom },
              date: permission.Date,
              motif: permission.Motif,
              duree: permission.Duree,
              contact: permission.Contact,
              statut: permission.Statut,
            };
          } catch (error) {
            return {
              ...permission,
              eleve: { nom: 'Inconnu', prenom: '' },
              classe: { nom: 'Inconnue' },
              date: permission.Date || 'Non spécifiée',
              motif: permission.Motif || 'Non spécifié',
              duree: permission.Duree || 'Non spécifiée',
              contact: permission.Contact || 'Non spécifié',
              statut: permission.Statut || 'Non spécifié',
            };
          }
        })
      );

      this.filteredPermissions = permissionsWithDetails;
    },

    // ✅ VERSION FINALE de openDialog
    async openDialog(message) {
      this.selectedMessage = message;
      this.dialog = true;

      // ✅ Marquer comme lu si ce n'est pas déjà fait
      if (!message.is_read) {
        try {
          await axios.put(`http://localhost:8080/api/permissions/${message.id}`, {
            is_read: true,
          });
          message.is_read = true;
          // ✅ Notifier le parent pour actualiser le badge
          this.$emit('update-notification-count');
        } catch (error) {
          console.error('Erreur lors de la mise à jour du champ is_read :', error);
        }
      }
    },

    openStatusDialog() {
      this.statusDialog = true;
    },

    async validatePermission() {
      try {
        await axios.put(`http://localhost:8080/api/permissions/${this.selectedMessage.id}`, {
          statut: this.selectedStatus,
        });
        this.statusDialog = false;
        this.dialog = false;
      } catch (error) {
        console.error('Erreur lors de la mise à jour du statut de la permission :', error);
      }
    },

    formatDate(date) {
      return moment(date).format('DD-MM-YYYY');
    }
  },
  created() {
    this.fetchPermissions();
  },
};
</script>


<style scoped>
.message-wrapper {
  padding: 8px;
}

.message-card {
  padding: 16px;
  border-radius: 12px;
}

.message-item {
  margin-bottom: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #ffffff;
  padding: 12px;
}

.message-text {
  font-size: 1rem;
  color: #333;
}

.consult-btn {
  font-size: 0.875rem;
  padding: 6px 12px;
  text-transform: none;
}

.table-container {
  overflow-x: auto;
}

.styled-table th,
.styled-table td {
  padding: 8px;
  font-size: 0.875rem;
}

.title {
  font-size: 1.3rem;
  font-weight: bold;
}

@media (max-width: 600px) {
  .message-card {
    padding: 10px;
  }
  .message-text {
    font-size: 0.8rem;
  }
  .consult-btn {
    font-size: 0.7rem;
    padding: 4px 8px;
  }
  .styled-table th,
  .styled-table td {
    font-size: 0.7rem;
    padding: 6px 8px;
  }
  .title {
    font-size: 1rem;
  }
}
</style>
