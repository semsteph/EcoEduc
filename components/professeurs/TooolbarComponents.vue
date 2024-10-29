<template>
  <v-app-bar app>
    <v-toolbar-title>Mon Projet Nuxt</v-toolbar-title>
    <v-spacer></v-spacer>
    
    <!-- Icône de messages -->
    <v-btn icon @click="$emit('showMessages')">
      <v-badge color="red" content="5" overlap>
        <v-icon>mdi-message</v-icon>
      </v-badge>
    </v-btn>

    <!-- Icône de notifications -->
    <v-btn icon @click="handleClick">
      <v-badge color="red" content="3" overlap>
        <v-icon>mdi-bell</v-icon>
      </v-badge>
    </v-btn>

    <!-- Bouton de déconnexion -->
    <v-btn icon @click="showLogoutDialog">
      <v-icon>mdi-logout</v-icon>
    </v-btn>
    
    <logout-dialog ref="logoutDialog"></logout-dialog>
  </v-app-bar>
</template>

<script>
import LogoutDialog from './LogoutDialog.vue';

export default {
  components: {
    LogoutDialog,
  },
  methods: {
    showLogoutDialog() {
      this.$refs.logoutDialog.dialog = true;
    },
    handleClick() {
      // Émet l'événement pour afficher les notifications
      this.$emit('showNotifications');
    },
  },
};
</script>
