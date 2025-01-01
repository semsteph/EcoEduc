<template>
  <div class="notifications-container">
    <!-- Bouton de retour avec flèche -->
    <v-btn icon @click="goBack" class="mb-4 back-button">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>

    <h2 class="title">Notifications</h2>

    <!-- Conteneur pour les alertes -->
    <div class="alerts-container">
      <v-alert
        v-for="(message, index) in alertMessages"
        :key="index"
        type="error"
        outlined
        class="alert-message"
      >
        {{ message }}
      </v-alert>
    </div>

    <!-- Message si aucune notification n'est disponible -->
    <v-alert v-if="!alertMessages.length" type="info" class="no-notifications" outlined>
      Aucune notification disponible.
    </v-alert>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "NotificationsComponent",
  data() {
    return {
      notifications: [],
      alertMessages: [], // Stocke tous les messages d'alerte
      parentId: null,
    };
  },
  methods: {
    async fetchNotifications() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        this.parentId = urlParams.get("id");

        if (!this.parentId) {
          this.alertMessages.push("Impossible de récupérer l'identifiant du parent.");
          return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
          this.alertMessages.push("Vous devez vous connecter pour voir les notifications.");
          this.$router.push("/login");
          return;
        }

        const response = await axios.get(
          `http://localhost:8080/api/notificationed/${this.parentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (
          response.status !== 200 ||
          !response.data ||
          !Array.isArray(response.data.notifications)
        ) {
          this.alertMessages.push("Erreur lors de la récupération des notifications.");
          return;
        }

        this.notifications = response.data.notifications;
        
        // Créer un message pour chaque notification d'absence
        this.notifications
          .filter(notification => notification.statut === "Absent")
          .forEach(absence => {
            const formattedDate = new Date(absence.date).toLocaleDateString();
            const formattedTime = absence.heures;
            const message = `Votre enfant ${absence.studentPrenom} ${absence.studentName} est absent le ${formattedDate} au cours de ${formattedTime}. Merci de bien vouloir notifier la raison de son absence.`;
            this.alertMessages.push(message);
          });

        // Mettre à jour le compteur de badge
        this.$emit("updateBadgeCount", this.alertMessages.length);
      } catch (error) {
        console.error("Erreur lors de la récupération des notifications :", error);
        this.alertMessages.push("Erreur lors de la récupération des notifications.");
      }
    },

    goBack() {
      this.$emit("showComponent", "Acceuil"); // Émet un événement pour indiquer le retour à l'accueil
    },
  },
  mounted() {
    this.fetchNotifications();
  },
};
</script>

<style scoped>
.notifications-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.back-button {
  color: #1976d2;
}

.title {
  font-size: 1.75rem;
  font-weight: bold;
  color: #1976d2;
  text-align: center;
  margin-bottom: 16px;
}

.alerts-container {
  margin-bottom: 16px;
  background-color: #e3f2fd;
}

.alert-message {
  margin-bottom: 10px;
  color: #fff;
  background-color: #ff5252;
  border-color: #ff5252;
}

.no-notifications {
  text-align: center;
  margin-top: 20px;
  color: #424242;
  font-weight: bold;
  background-color: #e3f2fd;
  padding: 16px;
  border-radius: 8px;
}
</style>
