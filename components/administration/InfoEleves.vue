<template>
 
    <v-container>
      <v-row class="mt-15 d-flex justify-center">
        <v-col cols="12" md="4" v-for="(label, index) in labels" :key="index">
          <v-card :color="label.color" dark class="mb-5" @click="navigateTo(label.route)">
            <v-card-title>{{ label.name }}</v-card-title>
          </v-card>
        </v-col>
      </v-row>
      <v-btn color="primary" @click="$emit('back')">Retour</v-btn>
    </v-container>
  </template>
  
  <script>
  export default {
    props: {
      classe: Object
    },
    data() {
      return {
        labels: [
          { name: 'Inscription', route: 'NoteManager', color: 'primary' },
          { name: 'Consulter Présence', route: 'PresenceManager', color: 'success' },
          { name: 'Gestion de conduite', route: 'ConductManager', color: 'warning' },
          { name: 'Consulter Note', route: 'CahierDeTexteManager', color: 'info' },
          { name: 'Gestion Bullettin', route: 'CahierDeTexteManager', color: 'info' },
          { name: 'Gestion Scolarité', route: 'CahierDeTexteManager', color: 'info' }
        
        ]
      }
    },
    methods: {
      goBack() {
        this.$emit('back');
      },
      navigateTo(route) {
        this.$emit('navigate', route);
      }
    }
  }
  </script>
  
  <style scoped>
  .v-card {
    cursor: pointer;
  }
  </style>
  