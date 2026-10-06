<template>
  <NotificationComponent @back="retourPrecedent" />
</template>

<script setup>
// /administration/dashbord/notifications : notifications.
import { inject } from "vue";
import NotificationComponent from "@/components/administration/NotificationComponent.vue";

const { retourPrecedent } = inject("adminNav");
</script>
