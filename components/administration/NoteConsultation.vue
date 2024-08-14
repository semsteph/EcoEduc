<template>
    <div>
      <v-btn icon @click="$emit('back')">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <v-card color="amber lighten-4">
        <v-card-title>Consulter Note</v-card-title>
        <v-card-text>
          <!-- Contenu pour la consultation des notes -->
        </v-card-text>
      </v-card>
    </div>
  </template>
  
  <script>
  export default {
    name: 'NoteConsultation',
  }
  </script>
  