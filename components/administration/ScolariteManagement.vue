<template>
    <div>
      <v-btn icon @click="$emit('back')">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <v-card color="purple lighten-4">
        <v-card-title>Gestion Scolarité</v-card-title>
        <v-card-text>
          <!-- Contenu pour la gestion de la scolarité -->
        </v-card-text>
      </v-card>
    </div>
  </template>
  
  <script>
  export default {
    name: 'ScolariteManagement',
  }
  </script>
  