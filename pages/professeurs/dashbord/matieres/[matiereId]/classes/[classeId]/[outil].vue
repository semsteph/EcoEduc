<template>
  <component
    :is="tool"
    v-if="tool"
    :key="outil"
    :classe="classe"
    :classe-id="classeId"
    :subject-id="matiereId"
    :etablissement-id="etablissementId"
    :annee-scolaire="anneeScolaire"
    :annee-scolaire-id="anneeScolaireId"
    @back="goTo(classPath)"
  />
</template>

<script>
// Outils d'une classe : /professeurs/dashbord/matieres/:matiereId/classes/:classeId/:outil
export const TOOL_SLUGS = {
  NoteManager: "notes",
  PresenceManager: "presences",
  PresencesPrecedantes: "absences",
  ConductManager: "conduite",
  CahierDeTexteManager: "cahier-de-texte",
  DevoirsManager: "devoirs",
};
</script>

<script setup>
import { computed, inject, watch } from "vue";
import { useRoute } from "nuxt/app";
import NoteManager from "@/components/professeurs/NoteManager.vue";
import PresenceManager from "@/components/professeurs/PresenceManager.vue";
import PresencesPrecedantes from "@/components/professeurs/PresencesPrecedantes.vue";
import ConductManager from "@/components/professeurs/ConductManager.vue";
import CahierDeTexteManager from "@/components/professeurs/CahierDeTexteManager.vue";
import DevoirsManager from "@/components/professeurs/DevoirsManager.vue";

const TOOLS = {
  notes: NoteManager,
  presences: PresenceManager,
  absences: PresencesPrecedantes,
  conduite: ConductManager,
  "cahier-de-texte": CahierDeTexteManager,
  devoirs: DevoirsManager,
};

const route = useRoute();
const { classes, etablissementId, anneeScolaire, anneeScolaireId, goTo } = inject("profDashboard");

const matiereId = computed(() => Number(route.params.matiereId));
const classeId = computed(() => Number(route.params.classeId));
const outil = computed(() => String(route.params.outil));
const classe = computed(() => classes.value.find((cl) => cl.classe_id === classeId.value));
const tool = computed(() => TOOLS[outil.value] || null);
const classPath = computed(() => `/matieres/${matiereId.value}/classes/${classeId.value}`);

// Outil inconnu : retour à la fiche de la classe.
watch(
  tool,
  (value) => {
    if (!value) goTo(classPath.value, { replace: true });
  },
  { immediate: true }
);
</script>
