<template>
  <Reinscription
    :classe-id="classeId"
    @ouvrir-classe="(id) => aller(id ? `${BASE}/${id}` : BASE)"
    @back="aller('/eleves')"
  />
</template>

<script setup>
// /administration/dashbord/eleves/reinscriptions[/<classeId>] : classes, puis élèves d'une classe à réinscrire.
import { inject } from "vue";
import Reinscription from "@/components/administration/Reinscription.vue";

const { aller, idRoute } = inject("adminNav");
const BASE = "/eleves/reinscriptions";
const classeId = idRoute("classeId");
</script>
