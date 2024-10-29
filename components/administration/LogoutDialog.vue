<template>
  <v-dialog v-model="dialog" max-width="400">
    <v-card>
      <v-card-title class="headline">Déconnexion</v-card-title>
      <v-card-text>Êtes-vous sûr de vouloir vous déconnecter ?</v-card-text>
      <v-card-actions>
        <v-btn color="primary" text @click="confirmLogout">Oui</v-btn>
        <v-btn color="secondary" text @click="dialog = false">Annuler</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  data() {
    return {
      dialog: false,
    };
  },
  methods: {
    confirmLogout() {
      this.$emit('confirm-logout');
      this.dialog = false;
    },
  },
};
</script>

<style scoped>
.v-dialog {
  z-index: 9999;
}
</style>
