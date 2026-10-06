<template>
  <ClassManagement
    :ecran="ECRAN"
    @changer-ecran="(ecran) => aller(ecran ? `/classes/${ecran}` : '/classes')"
    @ouvrir-classe="(id) => aller(id ? `/classes/programmes/${id}` : '/classes/programmes')"
  />
</template>

<script setup>
// /administration/dashbord/classes/liste : « Mes classes ».
import { inject } from "vue";
import ClassManagement from "@/components/administration/ClassManagement.vue";

const { aller } = inject("adminNav");
const ECRAN = "liste";
</script>
