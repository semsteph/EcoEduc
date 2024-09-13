<template>
  <div>
    <!-- Bouton de retour avec flèche -->
    <v-btn icon @click="goBack" class="mb-4">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>

    <h2>Notifications</h2>
    
    <!-- Alerte en cas de message d'alerte -->
    <v-alert
      v-if="alertMessages.length"
      type="error"
      class="alert-space"
      v-for="(message, index) in alertMessages"
      :key="index"
    >
      {{ message }}
    </v-alert>

    <!-- Liste des notifications -->
    <v-list v-if="notifications.length">
      <v-list-item v-for="notification in notifications" :key="notification.id">
        <v-list-item-content>
          <v-list-item-title>{{ notification.message }}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-list>

    <!-- Message si aucune notification n'est trouvée -->
    <p v-else>Aucune notification disponible.</p>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "NotificationsComponent",
  data() {
    return {
      notifications: [],
      alertMessages: [], // Stocke tous les messages d'alerte séparés
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
          `http://localhost:8080/api/notifications/${this.parentId}`,
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

        const today = new Date();
        const yesterday = new Date(today);
        const dayBeforeYesterday = new Date(today);

        yesterday.setDate(today.getDate() - 1);
        dayBeforeYesterday.setDate(today.getDate() - 2);

        // Filtrer les absences d'aujourd'hui, d'hier et d'avant-hier
        const absencesToday = this.notifications.filter(
          (presence) =>
            this.isSameDate(new Date(presence.date), today) && presence.statut === "Absent"
        );
        const absencesYesterday = this.notifications.filter(
          (presence) =>
            this.isSameDate(new Date(presence.date), yesterday) && presence.statut === "Absent"
        );
        const absencesDayBeforeYesterday = this.notifications.filter(
          (presence) =>
            this.isSameDate(new Date(presence.date), dayBeforeYesterday) &&
            presence.statut === "Absent"
        );
        const otherAbsences = this.notifications.filter((presence) => {
          const presenceDate = new Date(presence.date);
          return (
            presence.statut === "Absent" &&
            !this.isSameDate(presenceDate, today) &&
            !this.isSameDate(presenceDate, yesterday) &&
            !this.isSameDate(presenceDate, dayBeforeYesterday)
          );
        });

        // Générer des messages d'alerte pour chaque enfant
        this.generateAlertMessages(absencesToday, "aujourd'hui");
        this.generateAlertMessages(absencesYesterday, "hier");
        this.generateAlertMessages(absencesDayBeforeYesterday, "avant-hier");
        this.generateAlertMessages(otherAbsences);

        // Mettre à jour le badge avec le nombre d'alertes d'aujourd'hui
        this.$emit("updateBadgeCount", absencesToday.length);
      } catch (error) {
        console.error("Erreur lors de la récupération des notifications :", error);
        this.alertMessages.push("Erreur lors de la récupération des notifications.");
      }
    },

    isSameDate(date1, date2) {
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    },

    generateAlertMessages(absences, label = null) {
      absences.forEach((absence) => {
        const formattedDate = new Date(absence.date).toLocaleDateString();
        const formattedTime = absence.heures;
        const message = label
          ? `Votre enfant ${absence.studentPrenom} ${absence.studentName} est absent ${label} (${formattedDate}) au cours de ${formattedTime}. Merci de bien vouloir notifier la raison de son absence.`
          : `Votre enfant ${absence.studentPrenom} ${absence.studentName} est absent le ${formattedDate} au cours de ${formattedTime}. Merci de bien vouloir notifier la raison de son absence.`;
        this.alertMessages.push(message);
      });
    },

    goBack() {
      this.$router.go(-1); // Retourner à la page précédente
    },
  },
  mounted() {
    this.fetchNotifications();
  },
};
</script>

<style scoped>
.alert-space {
  margin-top: 20px; /* Ajoute un espacement entre l'alerte et le haut de la page */
}
</style>
