<template>
  <v-alert type="info" variant="tonal" class="mt-3">
    Cette page n'existe pas. Retour au tableau de bord…
  </v-alert>
</template>

<script setup>
import { inject, onMounted } from "vue";

// Adresse inconnue sous /professeurs/dashbord : retour à l'accueil du tableau de bord.
const { goTo } = inject("profDashboard");
onMounted(() => goTo("", { replace: true }));
</script>
