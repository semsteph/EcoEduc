<template>
  <v-row class="button-group">
    <v-col cols="12" md="4">
      <v-card @click="navigateTo('Inscription')"  color="cyan lighten-4">
        <v-card-title>Inscription</v-card-title>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card @click="navigateTo('PresenceManagement')"  color="pink lighten-4">
        <v-card-title>Gestion de Présence</v-card-title>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card @click="navigateTo('PunishmentManagement')"  color="lime lighten-4">
        <v-card-title>Gestion de Punition</v-card-title>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card @click="navigateTo('NoteConsultation')"  color="amber lighten-4">
        <v-card-title>Consulter Note</v-card-title>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card @click="navigateTo('BulletinManagement')"  color="teal lighten-4">
        <v-card-title>Gestion Bulletin</v-card-title>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card @click="navigateTo('ScolariteManagement')"  color="purple lighten-4">
        <v-card-title>Gestion Scolarité</v-card-title>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>

export default {
  name: 'StudentManagement',
  props: {
    etablissementId: {
      type: Number,
      required: true
    },
    etablissementNom: {
      type: String,
      required: true
    }
  },
  methods: {
    navigateTo(component) {
      this.$emit('component-selected', component);
    }
  }
}
</script>
<style scoped>
.button-group {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px; /* Espace entre les boutons */
  margin: 20px 0; /* Espacement par rapport au haut et au bas */
  height: 200px; /* Ajustez la hauteur pour centrer verticalement */
  padding-block: 200px;
}
</style>