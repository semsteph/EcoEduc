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
          { name: 'Gestion Cahier de texte', route: 'CahierDeTexte', color: 'primary' },
          { name: 'Mes Enseignants', route: 'MesEnseignants', color: 'success' },
        
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
  