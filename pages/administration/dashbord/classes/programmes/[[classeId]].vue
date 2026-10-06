<template>
  <ClassManagement
    :ecran="ECRAN"
    :classe-id="classeId"
    @changer-ecran="(ecran) => aller(ecran ? `/classes/${ecran}` : '/classes')"
    @ouvrir-classe="(id) => aller(id ? `/classes/programmes/${id}` : '/classes/programmes')"
  />
</template>

<script setup>
// /administration/dashbord/classes/programmes[/<classeId>] : programmes, puis programme d'une classe.
import { inject } from "vue";
import ClassManagement from "@/components/administration/ClassManagement.vue";

const { aller, idRoute } = inject("adminNav");
const ECRAN = "programmes";
const classeId = idRoute("classeId");
</script>
