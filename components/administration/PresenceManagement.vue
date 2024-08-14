<template>
    <div>
      <v-btn icon @click="$emit('back')">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <v-card color="pink lighten-4">
        <v-card-title>Gestion de Présence</v-card-title>
        <v-card-text>
          <!-- Contenu pour la gestion de présence -->
        </v-card-text>
      </v-card>
    </div>
  </template>
  
  <script>
  export default {
    name: 'PresenceManagement',
  }
  </script>
  