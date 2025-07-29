<template>
  <v-app-bar color="blue darken-3" dark app elevation="4">
    <!-- Bouton du menu (drawer) -->
    <v-btn icon @click="$emit('toggleDrawer')" class="white--text">
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <!-- Logo agrandi à la place du titre -->
    <v-img
      src="/assets/administration/logooff.png"
      contain
      height="60"
      class="ml-3"
      style="max-width: 180px"
    ></v-img>

    <v-spacer></v-spacer>

    <!-- Bouton de notifications -->
    <v-btn icon @click="$emit('showNotifications')" class="white--text">
      <v-badge :content="badgeCount" :value="badgeCount" color="red" overlap>
        <v-icon>mdi-bell</v-icon>
      </v-badge>
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
