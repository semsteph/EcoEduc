<template>
  <TeacherManagement
    :ecran="ECRAN"
    @changer-ecran="(ecran) => aller(ecran ? `/enseignants/${ecran}` : '/enseignants')"
    @ouvrir-classe="(id) => aller(id ? `/enseignants/${ECRAN}/${id}` : `/enseignants/${ECRAN}`)"
  />
</template>

<script setup>
// /administration/dashbord/enseignants/liste : « Mes enseignants ».
import { inject } from "vue";
import TeacherManagement from "@/components/administration/TeacherManagement.vue";

const { aller } = inject("adminNav");
const ECRAN = "liste";
</script>
