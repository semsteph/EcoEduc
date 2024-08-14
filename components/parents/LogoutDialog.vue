<template>
    <v-dialog v-model="dialog" max-width="290">
      <v-card>
        <v-card-title>Déconnexion</v-card-title>
        <v-card-text>Voulez-vous vraiment vous déconnecter?</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="red" text @click="logout">Oui</v-btn>
          <v-btn text @click="dialog = false">Non</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>
  
  <script>
  export default {
    data() {
      return {
        dialog: false
      };
    },
    methods: {
      logout() {
        // Logique de déconnexion
        this.dialog = false;
      }
    }
  }
  </script>
  