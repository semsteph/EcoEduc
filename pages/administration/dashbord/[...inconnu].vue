<template>
  <v-card class="rounded-lg pa-3 text-center" border flat>
    <v-icon size="56" color="grey">mdi-map-marker-question-outline</v-icon>
    <div class="text-h6 font-weight-bold mt-3">Cette page n'existe pas</div>
    <div class="text-body-2 text-grey-darken-1 mt-1">
      L'adresse ouverte ne correspond à aucun écran du tableau de bord.
    </div>
    <v-btn
      icon="mdi-arrow-left"
      color="primary"
      variant="tonal"
      class="mt-4"
      aria-label="Retour au tableau de bord"
      title="Retour au tableau de bord"
      @click="aller()"
    />
  </v-card>
</template>

<script setup>
// Adresse inconnue sous /administration/dashbord/... : message clair et
// retour à l'accueil du tableau de bord.
import { inject } from "vue";

defineOptions({ inheritAttrs: false });
const { aller } = inject("adminNav");
</script>
