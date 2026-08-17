<template>
  <!-- Dialogue de confirmation de déconnexion -->
  <v-dialog v-model="dialog" max-width="290">
    <v-card>
      <!-- Titre du dialogue -->
      <v-card-title>Déconnexion</v-card-title>
      
      <!-- Message du dialogue -->
      <v-card-text>Voulez-vous vraiment vous déconnecter ?</v-card-text>
      
      <!-- Actions avec boutons Oui et Non -->
      <v-card-actions>
        <v-spacer></v-spacer>
        <!-- Bouton Oui pour confirmer la déconnexion -->
        <v-btn color="red" text @click="confirmLogout">Oui</v-btn>
        
        <!-- Bouton Non pour fermer le dialogue -->
        <v-btn text @click="closeDialog">Non</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'logout'],
  computed: {
    // Synchroniser directement la valeur avec le modèle local
    dialog: {
      get() {
        return this.modelValue;
      },
      set(val) {
        this.$emit('update:modelValue', val);
      },
    },
  },
  methods: {
    confirmLogout() {
      this.$emit('logout'); // Émettre l'événement de déconnexion
      this.dialog = false; // Fermer le dialogue après la confirmation
    },
    closeDialog() {
      this.dialog = false; // Fermer le dialogue lorsque "Non" est cliqué
    },
  },
};
</script>
