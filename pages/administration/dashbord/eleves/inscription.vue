<template>
  <Inscription @back="aller('/eleves')" />
</template>

<script setup>
// /administration/dashbord/eleves/inscription : inscription des élèves.
import { inject } from "vue";
import Inscription from "@/components/administration/Inscription.vue";

const { aller } = inject("adminNav");
</script>
