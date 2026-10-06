<template>
  <OrientationSeconde @back="aller('/eleves')" />
</template>

<script setup>
// /administration/dashbord/eleves/orientation : série de 2nde des admis de 3ème.
import { inject } from "vue";
import OrientationSeconde from "@/components/administration/OrientationSeconde.vue";

const { aller } = inject("adminNav");
</script>
