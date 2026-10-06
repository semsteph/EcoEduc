<template>
  <MessageComponent @back="retourPrecedent" />
</template>

<script setup>
// /administration/dashbord/messages : messages (demandes de permission).
import { inject } from "vue";
import MessageComponent from "@/components/administration/MessageComponent.vue";

const { retourPrecedent } = inject("adminNav");
</script>
