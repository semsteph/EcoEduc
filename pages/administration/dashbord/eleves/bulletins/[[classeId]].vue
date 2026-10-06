<template>
  <BulletinManagement
    :classe-id="classeId"
    @ouvrir-classe="(id) => aller(id ? `${BASE}/${id}` : BASE, { annee: route.query.annee })"
    @back="aller('/eleves')"
  />
</template>

<script setup>
// /administration/dashbord/eleves/bulletins[/<classeId>] : classes, puis bulletins d'une classe (?annee= : année choisie).
import { inject } from "vue";
import { useRoute } from "vue-router";
import BulletinManagement from "@/components/administration/BulletinManagement.vue";

const route = useRoute();
const { aller, idRoute } = inject("adminNav");
const BASE = "/eleves/bulletins";
const classeId = idRoute("classeId");
</script>
