<template>
  <DashboardHome
    v-if="etablissementId"
    :etablissement-id="etablissementId"
    :etablissement-nom="etablissementNom"
    :annee-scolaire-id="anneeScolaireId"
  />
</template>

<script setup>
// /administration/dashbord : accueil du tableau de bord.
import DashboardHome from "@/components/administration/DashboardHome.vue";

defineOptions({ inheritAttrs: false });
defineProps({
  etablissementId: { type: Number, default: null },
  etablissementNom: { type: String, default: "" },
  anneeScolaireId: { type: Number, default: null },
});
</script>
