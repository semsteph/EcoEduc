<template>
  <TeacherManagement
    :ecran="ECRAN"
    @changer-ecran="(ecran) => aller(ecran ? `/enseignants/${ecran}` : '/enseignants')"
    @ouvrir-classe="(id) => aller(id ? `/enseignants/${ECRAN}/${id}` : `/enseignants/${ECRAN}`)"
  />
</template>

<script setup>
// /administration/dashbord/enseignants/programmes-matieres : programmes des matières par niveau.
import { inject } from "vue";
import TeacherManagement from "@/components/administration/TeacherManagement.vue";

const { aller } = inject("adminNav");
const ECRAN = "programmes-matieres";
</script>
