<template>
  <DashboardHome />
</template>

<script setup>
// /parents/dashbord : tableau de bord (écran par défaut).
// Les props du cadre (etablissementId, anneeScolaireId...) et l'événement
// « showComponent » sont transmis automatiquement au composant.
import DashboardHome from "@/components/parents/DashboardHome.vue";
</script>
