<template>
  <PunishmentManagement
    :classe-id="classeId"
    @ouvrir-classe="(id) => aller(id ? `${BASE}/${id}` : BASE)"
    :eleve-id="eleveId"
    @ouvrir-eleve="(id) => aller(id ? `${BASE}/${classeId}/${id}` : `${BASE}/${classeId}`)"
    @back="aller('/eleves')"
  />
</template>

<script setup>
// /administration/dashbord/eleves/punitions[/<classeId>[/<eleveId>]] : classes, élèves d'une classe, punitions d'un élève.
import { inject } from "vue";
import PunishmentManagement from "@/components/administration/PunishmentManagement.vue";

const { aller, idRoute } = inject("adminNav");
const BASE = "/eleves/punitions";
const classeId = idRoute("classeId");
const eleveId = idRoute("eleveId");
</script>
