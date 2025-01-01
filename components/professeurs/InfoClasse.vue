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
    <v-btn color="primary" @click="$emit('back')">Retour</v-btn>
  </v-container>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  classe: Object,
  etablissementId: Number
});

const emit = defineEmits(['back', 'navigate']);

const labels = [
  { name: 'Gérer Notes', route: 'NoteManager', color: 'primary' },
  { name: 'Gérer Présence', route: 'PresenceManager', color: 'success' },
  { name: 'Derniers Absents', route: 'PresencesPrecedantes', color: 'info' },
  { name: 'Gérer Conduite', route: 'ConductManager', color: 'warning' },
  { name: 'Cahier de texte', route: 'CahierDeTexteManager', color: 'info' }
];

function navigateTo(view) {
  emit('navigate', view);
}
</script>

<style scoped>
.v-card {
  cursor: pointer;
}
</style>
