<template>
  <PresenceManagement
    :classe-id="classeId"
    @ouvrir-classe="(id) => aller(id ? `${BASE}/${id}` : BASE)"
    :eleve-id="eleveId"
    @ouvrir-eleve="(id) => aller(id ? `${BASE}/${classeId}/${id}` : `${BASE}/${classeId}`)"
    @back="aller('/eleves')"
  />
</template>

<script setup>
// /administration/dashbord/eleves/presences[/<classeId>[/<eleveId>]] : classes, élèves d'une classe, présences d'un élève.
import { inject } from "vue";
import PresenceManagement from "@/components/administration/PresenceManagement.vue";

const { aller, idRoute } = inject("adminNav");
const BASE = "/eleves/presences";
const classeId = idRoute("classeId");
const eleveId = idRoute("eleveId");
</script>
