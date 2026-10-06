<template>
  <v-alert v-if="!firstSubjectId" type="info" variant="tonal" class="mt-3">
    Aucune classe ne vous est encore attribuée dans cet établissement. Dès que l'administration vous affecte une
    classe et une matière, elles apparaîtront ici.
  </v-alert>
</template>

<script setup>
import { computed, inject, onMounted } from "vue";

// Accueil du tableau de bord : ouvre directement la 1ère matière de l'enseignant.
const { subjects, goTo } = inject("profDashboard");
const firstSubjectId = computed(() => subjects.value[0]?.matiere_id ?? null);

onMounted(() => {
  if (firstSubjectId.value) goTo(`/matieres/${firstSubjectId.value}`, { replace: true });
});
</script>
