<template>
  <v-app-bar dark app elevation="0" density="compact" class="app-toolbar">
    <v-btn icon @click="$emit('toggleDrawer')" class="toolbar-btn" aria-label="Menu">
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <v-toolbar-title class="toolbar-title font-weight-bold ml-1">
      EchoEducation
    </v-toolbar-title>

    <v-spacer></v-spacer>

    <v-btn icon @click="showMessages" class="toolbar-btn" aria-label="Messages">
      <v-badge v-if="messagesNonLus > 0" :content="messagesNonLus" color="red" overlap>
        <v-icon>mdi-message</v-icon>
      </v-badge>
      <v-icon v-else>mdi-message</v-icon>
    </v-btn>

    <v-btn icon @click="handleNotificationClick" class="toolbar-btn" aria-label="Notifications">
      <v-badge
        v-if="badgeCount > 0"
        :content="badgeCount"
        color="red"
        overlap
      >
        <v-icon>mdi-bell</v-icon>
      </v-badge>
      <v-icon v-else>mdi-bell</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script>
import axios from "axios";
import { EventBus } from "@/event-bus";

export default {
  props: {
    initialBadgeCount: { type: Number, default: 0 },
  },
  data() {
    return {
      badgeCount: 0,
      messagesNonLus: 0,
      pollMessages: null,
    };
  },
  mounted() {
    this.badgeCount = Number(this.initialBadgeCount || 0);

    // ✅ On reçoit un nombre "sticky" déjà calculé côté parent
    EventBus.on("badge:set", this.setBadgeCount);
    EventBus.on("messages:lus", this.messagesLus);
    // Messagerie : nouvelles notes, changements d'emploi du temps.
    this.compterMessages();
    this.pollMessages = setInterval(this.compterMessages, 60000);
  },
  beforeUnmount() {
    EventBus.off("badge:set", this.setBadgeCount);
    EventBus.off("messages:lus", this.messagesLus);
    clearInterval(this.pollMessages);
  },
  watch: {
    initialBadgeCount(newVal) {
      this.badgeCount = Number(newVal || 0);
    },
  },
  methods: {
    setBadgeCount(value) {
      this.badgeCount = Number(value || 0);
    },
    async compterMessages() {
      try {
        const token = localStorage.getItem("token");
        const { data } = await axios.get("/api/parent/messages/non-lus", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        this.messagesNonLus = Number(data?.nonLus || 0);
      } catch (e) { /* compteur indisponible : pas de badge */ }
    },
    messagesLus() {
      this.messagesNonLus = 0;
    },
    showMessages() {
      this.$emit("showComponent", "MessagesComponent");
    },
    handleNotificationClick() {
      this.$emit("showComponent", "NotificationsComponent");
    },
  },
};
</script>

<style scoped>
.app-toolbar { background-color: #1976d2; }

.toolbar-title {
  font-family: "Roboto", sans-serif;
  font-size: 1.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar-btn {
  min-width: 44px;
  min-height: 44px;
}
.toolbar-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

@media (max-width: 400px) {
  .toolbar-title {
    font-size: 1rem;
  }
}
</style>
