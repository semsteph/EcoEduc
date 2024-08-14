<template>
  <v-row>
    <v-col cols="12" md="4">
      <v-card @click="navigateTo('Inscription')" color="cyan lighten-4">
        <v-card-title>Inscription</v-card-title>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card @click="navigateTo('PresenceManagement')" color="pink lighten-4">
        <v-card-title>Gestion de Présence</v-card-title>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card @click="navigateTo('PunishmentManagement')" color="lime lighten-4">
        <v-card-title>Gestion de Punition</v-card-title>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card @click="navigateTo('NoteConsultation')" color="amber lighten-4">
        <v-card-title>Consulter Note</v-card-title>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card @click="navigateTo('BulletinManagement')" color="teal lighten-4">
        <v-card-title>Gestion Bulletin</v-card-title>
      </v-card>
    </v-col>
    <v-col cols="12" md="4">
      <v-card @click="navigateTo('ScolariteManagement')" color="purple lighten-4">
        <v-card-title>Gestion Scolarité</v-card-title>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>

export default {
  name: 'StudentManagement',
  methods: {
    navigateTo(component) {
      this.$emit('component-selected', component);
    }
  }
}
</script>
