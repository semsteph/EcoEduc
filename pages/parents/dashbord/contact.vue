<template>
  <v-container class="py-6">
    <v-alert type="info" variant="tonal" border="start" class="mb-4">
      Le formulaire « Contacter l’administration » n’est pas encore disponible.
    </v-alert>
  </v-container>
</template>

<script setup>
// /parents/dashbord/contact : aucun composant « ContactAdmin » n'existe encore
// (l'ancien tableau de bord affichait une zone vide) ; on affiche un message clair.
defineEmits(["showComponent"]);
</script>
