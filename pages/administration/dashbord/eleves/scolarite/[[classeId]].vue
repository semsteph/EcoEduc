<template>
  <ScolariteManager
    :classe-id="classeId"
    @ouvrir-classe="(id) => aller(id ? `${BASE}/${id}` : BASE)"
    @back="aller('/eleves')"
  />
</template>

<script setup>
// /administration/dashbord/eleves/scolarite[/<classeId>] : classes, puis scolarité d'une classe.
import { inject } from "vue";
import ScolariteManager from "@/components/administration/ScolariteManager.vue";

const { aller, idRoute } = inject("adminNav");
const BASE = "/eleves/scolarite";
const classeId = idRoute("classeId");
</script>
