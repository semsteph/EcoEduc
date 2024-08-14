<template>
    <div>
      <v-btn icon @click="$emit('back')">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <v-card color="teal lighten-4">
        <v-card-title>Gestion Bulletin</v-card-title>
        <v-card-text>
          <!-- Contenu pour la gestion des bulletins -->
        </v-card-text>
      </v-card>
    </div>
  </template>
  
  <script>
  export default {
    name: 'BulletinManagement',
  }
  </script>
  