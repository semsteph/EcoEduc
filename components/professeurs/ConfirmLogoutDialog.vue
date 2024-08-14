<template>
    <v-dialog :value="localDialog" @input="updateDialog" persistent max-width="290">
      <v-card>
        <v-card-title class="headline">Déconnexion</v-card-title>
        <!-- Contenu du dialogue -->
      </v-card>
    </v-dialog>
  </template>
  
  <script>
  export default {
    props: {
      dialog: {
        type: Boolean,
        required: true
      }
    },
    data() {
      return {
        localDialog: this.dialog
      };
    },
    watch: {
      dialog(val) {
        this.localDialog = val;
      }
    },
    methods: {
      updateDialog(val) {
        this.localDialog = val;
        this.$emit('update:dialog', val);
      }
    }
  };
  </script>
  