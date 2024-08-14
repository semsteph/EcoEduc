<template>
    <v-dialog v-model="dialog" max-width="290">
      <v-card>
        <v-card-title class="headline">Déconnexion</v-card-title>
        <v-card-text>Êtes-vous sûr de vouloir vous déconnecter ?</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green darken-1" text @click="confirmLogout">Oui</v-btn>
          <v-btn color="green darken-1" text @click="dialog = false">Non</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>
  
  <script>
  export default {
    name: 'LogoutDialog',
    data() {
      return {
        dialog: false,
      }
    },
    methods: {
      confirmLogout() {
        // Logique de déconnexion ici
        this.dialog = false;
      }
    }
  }
  </script>
  