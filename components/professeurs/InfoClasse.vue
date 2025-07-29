<template>
  <v-container class="px-4 py-6">
    <h1 class="text-center text-xl md:text-2xl font-semibold mb-6">
      Gestion de la classe : {{ classe.classe }}
    </h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <v-card
        v-for="(label, index) in labels"
        :key="index"
        :color="label.color"
        dark
        class="cursor-pointer transition-transform hover:scale-105 min-h-[80px] flex items-center justify-center text-center"
        @click="navigateTo(label.route)"
      >
        <v-card-title
          class="w-full px-2 text-sm sm:text-base md:text-lg truncate"
        >
          {{ label.name }}
        </v-card-title>
      </v-card>
    </div>

    <div class="text-center mt-8">
      <v-btn color="primary" @click="$emit('back')">Retour</v-btn>
    </div>
  </v-container>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  classe: {
    type: Object,
    required: true,
  },
  etablissementId: {
    type: Number,
    required: true,
  },
  anneeScolaire: {
    type: String,
    required: true,
  },
  anneeScolaireId: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(['back', 'navigate']);

const labels = [
  { name: 'Gérer Notes', route: 'NoteManager', color: 'primary' },
  { name: 'Gérer Présence', route: 'PresenceManager', color: 'success' },
  { name: 'Derniers Absents', route: 'PresencesPrecedantes', color: 'info' },
  { name: 'Gérer Conduite', route: 'ConductManager', color: 'warning' },
  { name: 'Cahier de texte', route: 'CahierDeTexteManager', color: 'info' },
];

function navigateTo(view) {
  emit('navigate', view);
}
</script>

<style scoped>
/* Supprimé : plus besoin si on utilise Tailwind pour la responsivité */
/* .v-card { min-height: 80px; } */
</style>
