<template>
  <InfoClasse
    :classe="classe"
    :etablissement-id="etablissementId"
    :annee-scolaire="anneeScolaire"
    :annee-scolaire-id="anneeScolaireId"
    :subject-id="matiereId"
    @back="goTo(`/matieres/${matiereId}`)"
    @navigate="openTool"
  />
</template>

<script setup>
import { computed, inject } from "vue";
import { useRoute } from "nuxt/app";
import InfoClasse from "@/components/professeurs/InfoClasse.vue";
import { TOOL_SLUGS } from "./[outil].vue";

const route = useRoute();
const { classes, etablissementId, anneeScolaire, anneeScolaireId, goTo } = inject("profDashboard");

const matiereId = computed(() => Number(route.params.matiereId));
const classeId = computed(() => Number(route.params.classeId));
const classe = computed(() => classes.value.find((cl) => cl.classe_id === classeId.value));

// InfoClasse émet le nom du composant ("NoteManager"...) : on ouvre sa route.
const openTool = (view) => {
  const slug = TOOL_SLUGS[view];
  if (slug) goTo(`/matieres/${matiereId.value}/classes/${classeId.value}/${slug}`);
};
</script>
