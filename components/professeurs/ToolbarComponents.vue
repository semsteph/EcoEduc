<template>
  <v-app-bar color="blue darken-3" dark app elevation="4">
    <v-btn icon @click="$emit('toggleDrawer')" class="white--text">
      <v-icon>mdi-menu</v-icon>
    </v-btn>
    <v-toolbar-title class="white--text font-weight-bold text-h5 ml-2">
      EchoEducation
    </v-toolbar-title>
    <v-spacer></v-spacer>

    <v-btn icon @click="$emit('showNotifications')" class="white--text">
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
    showLogoutDialog() {
      this.$emit('showLogoutDialog');
    },
  },
};
</script>

<style scoped>
.v-toolbar-title {
  font-family: 'Poppins', sans-serif;
}
</style>
