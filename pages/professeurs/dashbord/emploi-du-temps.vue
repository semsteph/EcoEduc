<template>
  <!-- /professeurs/dashbord/emploi-du-temps : l'emploi du temps de l'enseignant connecté. -->
  <v-container fluid class="pa-2 pa-sm-3">
    <h2 class="text-h6 font-weight-bold text-primary mb-2 d-flex align-center ga-2">
      <v-icon color="primary">mdi-calendar-clock</v-icon>
      Mon emploi du temps
    </h2>
    <EmploiDuTemps url="/api/enseignant/emploi-du-temps" />
  </v-container>
</template>

<script setup>
import EmploiDuTemps from "@/components/EmploiDuTemps.vue";
</script>
