<template>
  <v-app-bar color="blue darken-3" dark app elevation="4">
    <v-btn icon @click="$emit('toggleDrawer')" class="white--text">
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <v-toolbar-title class="white--text font-weight-bold text-h5 ml-2">
      EchoEducation
    </v-toolbar-title>

    <v-spacer></v-spacer>

    <v-btn icon @click="showMessages" class="white--text">
      <v-icon>mdi-message</v-icon>
    </v-btn>

    <v-btn icon @click="handleNotificationClick" class="white--text">
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
    initialBadgeCount: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      badgeCount: this.initialBadgeCount,
      totalNotifications: 0,
    };
  },
  mounted() {
    this.initBadgeCount();
    EventBus.on("updateBadgeCount", this.updateBadgeCount);
  },
  beforeUnmount() {
    EventBus.off("updateBadgeCount", this.updateBadgeCount);
  },
  methods: {
    initBadgeCount() {
      const total = parseInt(localStorage.getItem("notifications_total") || "0");
      const read = parseInt(localStorage.getItem("notifications_read_count") || "0");
      const unread = total - read;

      this.totalNotifications = total;

      if (this.initialBadgeCount > 0) {
        this.badgeCount = this.initialBadgeCount;
      } else {
        this.badgeCount = unread > 0 ? unread : 0;
      }
    },
    showMessages() {
      this.$emit("showComponent", "MessagesComponent");
    },
    handleNotificationClick() {
      this.badgeCount = 0;
      localStorage.setItem("notifications_read_count", this.totalNotifications);
      this.$emit("showComponent", "NotificationsComponent");
    },
    updateBadgeCount(newNotificationsCount) {
      const previousTotal = parseInt(localStorage.getItem("notifications_total") || "0");
      const read = parseInt(localStorage.getItem("notifications_read_count") || "0");

      const updatedTotal = previousTotal + parseInt(newNotificationsCount || "0");
      localStorage.setItem("notifications_total", updatedTotal);

      this.totalNotifications = updatedTotal;
      const unread = updatedTotal - read;

      this.badgeCount = unread > 0 ? unread : 0;
    },
  },
};
</script>

<style scoped>
.v-app-bar {
  background-color: #1976d2;
}
.v-toolbar-title {
  font-family: 'Roboto', sans-serif;
  font-size: 1.25rem;
}
.v-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
