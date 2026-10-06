<template>
  <NuxtPage v-if="subject" />
</template>

<script setup>
import { computed, inject, watch } from "vue";
import { useRoute } from "nuxt/app";

const route = useRoute();
const { subjects, goTo } = inject("profDashboard");

const subject = computed(() =>
  subjects.value.find((s) => s.matiere_id === Number(route.params.matiereId))
);

// Matière inconnue (ou non enseignée) : retour à l'accueil du tableau de bord.
watch(
  subject,
  (value) => {
    if (!value) goTo("", { replace: true });
  },
  { immediate: true }
);
</script>
