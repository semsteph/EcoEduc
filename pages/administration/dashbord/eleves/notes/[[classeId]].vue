<template>
  <NoteConsultation
    :classe-id="classeId"
    @ouvrir-classe="(id) => aller(id ? `${BASE}/${id}` : BASE)"
    @back="aller('/eleves')"
  />
</template>

<script setup>
// /administration/dashbord/eleves/notes[/<classeId>] : classes, puis cahier de notes d'une classe.
import { inject } from "vue";
import NoteConsultation from "@/components/administration/NoteConsultation.vue";

const { aller, idRoute } = inject("adminNav");
const BASE = "/eleves/notes";
const classeId = idRoute("classeId");
</script>
