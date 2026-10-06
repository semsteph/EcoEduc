<template>
  <CarteScolaire
    :classe-id="classeId"
    @ouvrir-classe="(id) => aller(id ? `${BASE}/${id}` : BASE)"
    @back="aller('/eleves')"
  />
</template>

<script setup>
// /administration/dashbord/eleves/cartes-scolaires[/<classeId>] : classes, puis cartes scolaires d'une classe.
import { inject } from "vue";
import CarteScolaire from "@/components/administration/CarteScolaire.vue";

const { aller, idRoute } = inject("adminNav");
const BASE = "/eleves/cartes-scolaires";
const classeId = idRoute("classeId");
</script>
