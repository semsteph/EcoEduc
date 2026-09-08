<template>
  <v-app-bar dark app elevation="4" density="compact" class="app-toolbar">
    <v-btn icon @click="$emit('toggleDrawer')" class="toolbar-btn" aria-label="Menu">
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <v-toolbar-title class="toolbar-title font-weight-bold ml-1">
      EchoEducation
    </v-toolbar-title>

    <v-spacer></v-spacer>

    <v-btn icon @click="showMessages" class="toolbar-btn" aria-label="Messages">
      <v-icon>mdi-message</v-icon>
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
import { EventBus } from "@/event-bus";

export default {
  props: {
    initialBadgeCount: { type: Number, default: 0 },
  },
  data() {
    return {
      badgeCount: 0,
    };
  },
  mounted() {
    this.badgeCount = Number(this.initialBadgeCount || 0);

    // ✅ On reçoit un nombre "sticky" déjà calculé côté parent
    EventBus.on("badge:set", this.setBadgeCount);
  },
  beforeUnmount() {
    EventBus.off("badge:set", this.setBadgeCount);
  },
  watch: {
    initialBadgeCount(newVal) {
      // ✅ ne jamais descendre automatiquement
      const current = Number(this.badgeCount || 0);
      const n = Number(newVal || 0);
      this.badgeCount = Math.max(current, n);
    },
  },
  methods: {
    setBadgeCount(value) {
      // ✅ ne jamais descendre automatiquement
      const current = Number(this.badgeCount || 0);
      const n = Number(value || 0);
      this.badgeCount = Math.max(current, n);
    },
    showMessages() {
      this.$emit("showComponent", "MessagesComponent");
    },
    handleNotificationClick() {
      // ✅ ici seulement on efface
      this.badgeCount = 0;

      // ✅ dit au parent : "j’ai ouvert les notifications"
      this.$emit("notificationsOpened");

      // ✅ navigue vers le composant notifications
      this.$emit("showComponent", "NotificationsComponent");
    },
  },
};
</script>

<style scoped>
.app-toolbar { background-color: #0d9488; }

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
