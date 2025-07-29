<template>
  <div class="notifications-container">
    <v-btn icon @click="goBack" class="mb-4">
      <v-icon color="grey darken-2">mdi-arrow-left</v-icon>
    </v-btn>

    <h2 class="title">Centre de notifications</h2>

    <v-container fluid>
      <v-row>
        <v-col
          cols="12"
          v-for="(notif, index) in notifications"
          :key="index"
        >
          <v-card
            class="notification-card"
            outlined
            :elevation="notif.includes('[NOUVELLE]') ? 3 : 1"
            :class="notif.includes('[NOUVELLE]') ? 'new-notif' : 'read-notif'"
          >
            <v-card-title class="notification-title">
              <v-icon class="mr-3" size="28" :color="notif.includes('[NOUVELLE]') ? 'red darken-2' : 'grey'">
                {{ notif.includes('[NOUVELLE]') ? 'mdi-bell-alert' : 'mdi-bell' }}
              </v-icon>
              {{ cleanNotification(notif) }}
            </v-card-title>

            <v-card-subtitle class="notification-time">
              Reçue à {{ fakeTime(index) }}
            </v-card-subtitle>
          </v-card>
        </v-col>
      </v-row>

      <v-alert v-if="!notifications.length" type="info" outlined class="mt-5">
        Aucune notification disponible.
      </v-alert>
    </v-container>
  </div>
</template>


<script>
import axios from "axios";
import { EventBus } from "../../event-bus";

export default {
  props: {
    etablissementId: Number,
    anneeScolaireId: Number,
  },
  data() {
    return {
      notifications: [],
      parentId: null,
    };
  },
  methods: {
    async fetchNotifications() {
      const urlParams = new URLSearchParams(window.location.search);
      this.parentId = urlParams.get("id");
      const token = localStorage.getItem("token");

      try {
        const res = await axios.get(
          `http://localhost:8080/api/notificationed/${this.parentId}/${this.etablissementId}/${this.anneeScolaireId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        this.notifications = res.data.alertMessages || [];

        const total = this.notifications.filter((msg) =>
          msg.includes("[NOUVELLE]")
        ).length;

        localStorage.setItem("notifications_total", total);
        localStorage.setItem("notifications_read_count", total);

        EventBus.emit("updateBadgeCount", 0);
      } catch (error) {
        console.error("❌ Erreur lors du chargement des notifications :", error);
        this.notifications = [];
        EventBus.emit("updateBadgeCount", 0);
      }
    },
    goBack() {
      this.$emit("showComponent", "Acceuil");
    },
    cleanNotification(msg) {
      return msg.replace("[NOUVELLE]", "").trim();
    },
    fakeTime(index) {
      const now = new Date();
      const past = new Date(now.getTime() - index * 15 * 60000);
      return past.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    },
  },
  mounted() {
    this.fetchNotifications();
  },
};
</script>

<style scoped>
.notifications-container {
  padding: 20px;
  max-width: 100%;
}

.title {
  font-size: 1.8rem;
  font-weight: bold;
  color: #e53935;
  text-align: center;
  margin-bottom: 25px;
}

.notification-card {
  border-radius: 12px;
  transition: box-shadow 0.3s ease;
  margin-bottom: 16px;
}

.notification-title {
  font-size: 1.1rem;
  font-weight: 500;
  color: #333;
  display: flex;
  align-items: center;
}

.notification-time {
  font-size: 0.85rem;
  text-align: right;
  color: #888;
}

.new-notif {
  background-color: #ffebee;
  border-left: 5px solid #e53935;
}

.read-notif {
  background-color: #f5f5f5;
  border-left: 5px solid #9e9e9e;
}

.notification-card:hover {
  box-shadow: 0 4px 12px rgba(229, 57, 53, 0.2);
}

@media (max-width: 600px) {
  .title {
    font-size: 1.5rem;
  }
  .notification-title {
    font-size: 1rem;
  }
}
</style>
