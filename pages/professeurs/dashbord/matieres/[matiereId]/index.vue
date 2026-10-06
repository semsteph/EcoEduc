<template>
  <ClassManager
    :subject-id="matiereId"
    :etablissement-id="etablissementId"
    :classes="classes"
    :annee-scolaire="anneeScolaire"
    :annee-scolaire-id="anneeScolaireId"
    @class-selected="openClass"
  />
</template>

<script setup>
import { computed, inject } from "vue";
import { useRoute } from "nuxt/app";
import ClassManager from "@/components/professeurs/ClassManager.vue";

const route = useRoute();
const { classes, etablissementId, anneeScolaire, anneeScolaireId, goTo } = inject("profDashboard");

const matiereId = computed(() => Number(route.params.matiereId));

const openClass = (classeId) => goTo(`/matieres/${matiereId.value}/classes/${classeId}`);
</script>
