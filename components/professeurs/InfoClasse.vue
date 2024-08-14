<template>
  <v-container>
    <h1 class="d-flex justify-center">Gestion de la classe: {{ classe.name }}</h1>
    <v-row class="mt-15 d-flex justify-center">
      <v-col cols="12" md="4" v-for="(label, index) in labels" :key="index">
        <v-card :color="label.color" dark class="mb-5" @click="navigateTo(label.route)">
          <v-card-title>{{ label.name }}</v-card-title>
        </v-card>
      </v-col>
    </v-row>
    <v-btn color="primary" @click="$emit('goBack')">Retour</v-btn>
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
        { name: 'Gérer Notes', route: 'NoteManager', color: 'primary' },
        { name: 'Gérer Présence', route: 'PresenceManager', color: 'success' },
        { name: 'Gérer Conduite', route: 'ConductManager', color: 'warning' },
        { name: 'Cahier de texte', route: 'CahierDeTexteManager', color: 'info' }
      ]
    }
  },
  methods: {
    navigateTo(route) {
      this.$emit('navigate', route);
    },
    goBack() {
      this.currentView = 'details';
      this.selectedClass = null;
    
    }
  }
}
</script>

<style scoped>
.v-card {
  cursor: pointer;
}
</style>
