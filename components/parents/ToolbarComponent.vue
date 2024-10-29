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

    <v-btn icon @click="showNotifications" class="white--text">
      <v-badge :content="badgeCount" :value="badgeCount" color="red" overlap>
        <v-icon>mdi-bell</v-icon>
      </v-badge>
    </v-btn>

    <v-btn icon @click="showLogoutDialog" class="white--text">
      <v-icon>mdi-logout"></v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script>
export default {
  data() {
    return {
      badgeCount: 0,
    };
  },
  methods: {
    showMessages() {
      this.$emit('showComponent', 'MessagesComponent');
    },
    showNotifications() {
      this.$emit('showComponent', 'NotificationsComponent');
      this.badgeCount = 0; // Reset badge count when clicking notifications
    },
    showLogoutDialog() {
      this.$emit('showComponent', 'LogoutDialog');
    },
    updateBadgeCount(count) {
      this.badgeCount = count;
    }
  }
};
</script>

<style scoped>
.v-app-bar {
  background-color: #1976d2;
}

.v-toolbar-title {
  font-family: 'Roboto', sans-serif;
  font-size: 1.25rem;
  letter-spacing: 0.05em;
  margin-left: 8px;
}

.v-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
