<template>
  <v-app-bar>
    <v-spacer></v-spacer>
    <v-btn icon @click="showMessages">
      <v-icon>mdi-message</v-icon>
    </v-btn>
    <v-btn icon @click="showNotifications">
      <v-icon>mdi-bell</v-icon>
    </v-btn>
    <v-btn icon @click="showLogoutDialog">
      <v-icon>mdi-logout</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script>
export default {
  methods: {
    showMessages() {
      this.$emit('showComponent', 'MessagesComponent');
    },
    showNotifications() {
      this.$emit('showComponent', 'NotificationsComponent');
    },
    showLogoutDialog() {
      this.$emit('showComponent', 'LogoutDialog');
    }
  }
}
</script>
