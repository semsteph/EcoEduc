<template>
  <div>
    <!-- Card contenant les messages -->
    <v-card color="blue lighten-4" class="message-card">
      <v-card-title class="title">Messages</v-card-title>
      <v-card-text>
        <div
          v-for="message in filteredPermissions"
          :key="message.id"
          class="message-item"
        >
          <!-- Vérification de l'existence de message.eleve et message.classe avant d'afficher -->
          <p class="message-text">
            Une permission est demandée pour l'élève
            <strong>{{ message.eleve ? message.eleve.nom : 'Nom Inconnu' }}</strong>
            <strong>{{ message.eleve ? message.eleve.prenom : '' }}</strong>
            de la classe
            <strong>{{ message.classe ? message.classe.nom : 'Classe Inconnue' }}</strong>.
          </p>
          <v-btn color="primary" class="consult-btn" @click="openDialog(message)">
            Consulter
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Dialog pour consulter les détails de la permission -->
    <v-dialog v-model="dialog" max-width="800px">
      <v-card>
        <v-card-title>
          Détails de la permission
          <v-btn color="green darken-1" text @click="openStatusDialog">Valider</v-btn>
        </v-card-title>
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
                  <td>{{ selectedMessage?.statut || 'En attente' }}</td> <!-- Statut en lecture seule -->
                </tr>
              </tbody>
            </v-simple-table>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn color="red darken-1" text @click="dialog = false">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog pour mettre à jour le statut -->
    <v-dialog v-model="statusDialog" max-width="400px">
      <v-card>
        <v-card-title>Mettre à jour le statut</v-card-title>
        <v-card-text>
          <v-select
            v-model="selectedStatus"
            :items="['autoriser', 'non autoriser', 'sous reserve de justification']"
            label="Sélectionnez le statut"
          ></v-select>
        </v-card-text>
        <v-card-actions>
          <v-btn color="green darken-1" text @click="validatePermission">Ajouter</v-btn>
          <v-btn color="red darken-1" text @click="statusDialog = false">Fermer</v-btn>
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
  data() {
    return {
      permissions: [],
      filteredPermissions: [],
      dialog: false,
      statusDialog: false, // Nouveau dialogue pour mettre à jour le statut
      selectedMessage: null,
      selectedStatus: '', // Statut sélectionné
    };
  },
  methods: {
    async fetchPermissions() {
      try {
        const response = await axios.get('http://localhost:8080/api/permissions');
        this.permissions = response.data;

        console.log('Permissions récupérées :', this.permissions);

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

      console.log('Permissions filtrées pour le mois actuel :', this.filteredPermissions);
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
            console.error(`Erreur lors de la récupération des détails pour l'élève ${permission.eleve_id} :`, error);
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
      console.log('Permissions avec les détails des élèves et classes :', this.filteredPermissions);
    },
    openDialog(message) {
      this.selectedMessage = message;
      this.dialog = true;
    },
    openStatusDialog() {
      this.statusDialog = true; // Ouvre le dialogue pour la mise à jour du statut
    },
    async validatePermission() {
      try {
        await axios.put(`http://localhost:8080/api/permissions/${this.selectedMessage.id}`, {
          statut: this.selectedStatus, // Utiliser le statut sélectionné
        });
        this.statusDialog = false; // Fermer le dialogue après validation
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
.message-card {
  margin-bottom: 20px;
  padding: 15px;
  font-size: 1.2rem; /* Agrandir la police */
}

.message-item {
  margin-bottom: 20px; /* Séparation entre les messages */
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: white;
}

.message-text {
  font-size: 1.1rem;
  margin-bottom: 10px;
  color: black;
}

.consult-btn {
  font-size: 1rem;
  padding: 5px 15px;
}

.table-container {
  max-width: 100%;
  overflow-x: auto;
}

.styled-table {
  width: 100%;
  border-collapse: collapse;
  margin: 25px 0;
}

.styled-table th,
.styled-table td {
  padding: 12px 15px;
  border: 1px solid #ddd;
  text-align: left;
}

.styled-table th {
  background-color: #f3f3f3;
}

.styled-table tr {
  border-bottom: 1px solid #ddd;
}

.styled-table tr:last-of-type {
  border-bottom: 2px solid #009879;
}

.title {
  font-size: 1.5rem;
  font-weight: bold;
}
</style>
