<template>
  <TeacherManagement
    :ecran="ECRAN"
    :classe-id="classeId"
    @changer-ecran="(ecran) => aller(ecran ? `/enseignants/${ecran}` : '/enseignants')"
    @ouvrir-classe="(id) => aller(id ? `/enseignants/${ECRAN}/${id}` : `/enseignants/${ECRAN}`)"
  />
</template>

<script setup>
// /administration/dashbord/enseignants/cahiers-de-texte[/<classeId>] : cahiers de texte par classe.
import { inject } from "vue";
import TeacherManagement from "@/components/administration/TeacherManagement.vue";

const { aller, idRoute } = inject("adminNav");
const ECRAN = "cahiers-de-texte";
const classeId = idRoute("classeId");
</script>
