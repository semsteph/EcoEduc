<template>
  <v-app-bar
    color="blue darken-3"
    dark
    app
    elevation="4"
  >
    <!-- Titre de l'application -->
    <v-toolbar-title class="white--text font-weight-bold text-h5">
      EchoEducation
    </v-toolbar-title>

    <!-- Espacer les éléments de droite -->
    <v-spacer></v-spacer>

    <!-- Bouton pour afficher les messages -->
    <v-btn icon @click="showMessages" class="white--text">
      <v-icon>mdi-message</v-icon>
    </v-btn>

    <!-- Bouton pour afficher les notifications avec un badge dynamique -->
    <v-btn icon @click="showNotifications" class="white--text">
      <v-badge :content="badgeCount" :value="badgeCount" color="red" overlap>
        <v-icon>mdi-bell</v-icon>
      </v-badge>
    </v-btn>

    <!-- Bouton pour afficher la déconnexion -->
    <v-btn icon @click="showLogoutDialog" class="white--text">
      <v-icon>mdi-logout"></v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script>
export default {
  data() {
    return {
      badgeCount: 0, // Initialiser le compteur de badge
    };
  },
  methods: {
    showMessages() {
      this.$emit('showComponent', 'MessagesComponent');
    },
    showNotifications() {
      this.$emit('showComponent', 'NotificationsComponent');
      this.badgeCount = 0; // Réinitialiser le badge à 0 quand on clique sur notifications
    },
    showLogoutDialog() {
      this.$emit('showComponent', 'LogoutDialog');
    },
    updateBadgeCount(count) {
      this.badgeCount = count; // Mettre à jour le compteur du badge
    }
  }
};
</script>

<style scoped>
.v-app-bar {
  background-color: #1976d2; /* Bleu personnalisé pour un style plus prononcé */
}

.v-toolbar-title {
  font-family: 'Roboto', sans-serif;
  font-size: 1.25rem;
  letter-spacing: 0.05em;
}

.v-btn {
  transition: background-color 0.3s ease;
}

.v-btn:hover {
  background-color: rgba(255, 255, 255, 0.1); /* Légère surbrillance au survol */
}
</style>
