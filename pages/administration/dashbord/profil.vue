<template>
  <MonProfil @back="retourPrecedent" />
</template>

<script setup>
// /administration/dashbord/profil : profil du collaborateur connecté.
import { inject } from "vue";
import MonProfil from "@/components/administration/MonProfil.vue";

const { retourPrecedent } = inject("adminNav");
</script>
