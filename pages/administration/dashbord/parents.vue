<template>
  <ParentManagement @back="aller()" />
</template>

<script setup>
// /administration/dashbord/parents : gestion des parents.
import { inject } from "vue";
import ParentManagement from "@/components/administration/ParentManagement.vue";

const { aller } = inject("adminNav");
</script>
