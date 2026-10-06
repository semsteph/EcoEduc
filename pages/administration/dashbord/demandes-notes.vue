<template>
  <NoteModificationRequests @back="retourPrecedent" />
</template>

<script setup>
// /administration/dashbord/demandes-notes : demandes de modification de notes (?statut= : filtre).
import { inject } from "vue";
import NoteModificationRequests from "@/components/administration/NoteModificationRequests.vue";

const { retourPrecedent } = inject("adminNav");
</script>
