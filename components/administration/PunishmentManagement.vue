<template>
    <div>
      <v-btn icon @click="$emit('back')">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <v-card color="lime lighten-4">
        <v-card-title>Gestion de Punition</v-card-title>
        <v-card-text>
          <!-- Contenu pour la gestion de punition -->
        </v-card-text>
      </v-card>
    </div>
  </template>
  
  <script>
  export default {
    name: 'PunishmentManagement',
  }
  </script>
  