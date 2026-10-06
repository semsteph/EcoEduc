<template>
  <Parametre @back="aller()" />
</template>

<script setup>
// /administration/dashbord/parametres : paramètres (?onglet= : section affichée).
import { inject } from "vue";
import Parametre from "@/components/administration/Parametre.vue";

const { aller } = inject("adminNav");
</script>
