<template>
  <NuxtPage v-if="classe" />
</template>

<script setup>
import { computed, inject, watch } from "vue";
import { useRoute } from "nuxt/app";

const route = useRoute();
const { classes, goTo } = inject("profDashboard");

const classe = computed(() =>
  classes.value.find((cl) => cl.classe_id === Number(route.params.classeId))
);

// Classe inconnue pour cette matière : retour à la liste des classes.
watch(
  classe,
  (value) => {
    if (!value) goTo(`/matieres/${route.params.matiereId}`, { replace: true });
  },
  { immediate: true }
);
</script>
