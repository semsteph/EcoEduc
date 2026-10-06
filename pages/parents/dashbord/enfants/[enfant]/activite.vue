<template>
  <ChildrenList :enfant="enfant" currentView="activite" />
</template>

<script setup>
// /parents/dashbord/enfants/:enfant/activite
// ChildrenList charge les enfants du parent et retrouve l'élève à partir du prénom lu dans la route (aucun identifiant affiché).
import { computed } from "vue";
import ChildrenList from "@/components/parents/ChildrenList.vue";

const route = useRoute();
const enfant = computed(() => String(route.params.enfant || ""));
</script>
