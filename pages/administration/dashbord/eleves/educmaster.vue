<template>
  <EducMaster @back="aller('/eleves')" />
</template>

<script setup>
// /administration/dashbord/eleves/educmaster : transfert des notes vers EducMaster.
import { inject } from "vue";
import EducMaster from "@/components/administration/EducMaster.vue";

const { aller } = inject("adminNav");
</script>
