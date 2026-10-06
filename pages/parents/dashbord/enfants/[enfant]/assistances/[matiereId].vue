<template>
  <ChildrenList :enfant="enfant" currentView="assistances" :matiereId="matiereId" />
</template>

<script setup>
// /parents/dashbord/enfants/:enfant/assistances/:matiereId : conversation avec l'assistant de la matière.
// ChildrenList charge les enfants du parent et retrouve l'élève à partir du prénom lu dans la route (aucun identifiant affiché).
import { computed } from "vue";
import ChildrenList from "@/components/parents/ChildrenList.vue";

const route = useRoute();
const enfant = computed(() => String(route.params.enfant || ""));
const matiereId = computed(() => Number(route.params.matiereId) || null);
</script>
