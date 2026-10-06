<template>
  <MesEleves @back="aller('/eleves')" />
</template>

<script setup>
// /administration/dashbord/eleves/liste : « Nos élèves ».
import { inject } from "vue";
import MesEleves from "@/components/administration/MesEleves.vue";

const { aller } = inject("adminNav");
</script>
