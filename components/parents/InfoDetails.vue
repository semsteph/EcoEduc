<template>
  <v-container>
    <h1>Informations de l'eleve </h1>
    <v-card class="mb-5">
      <v-img :src="child.photo" height="200px"></v-img>
      <v-card-title>{{ child.name }}</v-card-title>
      <v-card-subtitle>{{ child.class }}</v-card-subtitle>
    </v-card>
    <v-row>
      <v-col cols="12" md="4" v-for="(label, index) in labels" :key="index">
        <v-card :color="label.color" dark class="mb-5" @click="navigateTo(label.route)">
          <v-card-title>{{ label.name }}</v-card-title>
        </v-card>
      </v-col>
    </v-row>
    <v-btn color="primary" @click="$emit('back')">Retour</v-btn>
  </v-container>
</template>

<script>
export default {
  props: {
    child: Object
  },
  data() {
    return {
      labels: [
        { name: 'Notes', route: 'notes', color: 'primary' },
        { name: 'Présence', route: 'presence', color: 'success' },
        { name: 'Conduite', route: 'conduite', color: 'warning' },
        { name: 'Scolarité', route: 'scolarite', color: 'info' },
        { name: 'Programme', route: 'programme', color: 'purple' }
      ]
    }
  },
  methods: {
    goBack() {
      this.$emit('back');
    },
   
    navigateTo(route) {
      this.$emit('navigate', route);
    }
  }
}
</script>

<style scoped>
.v-card {
  cursor: pointer;
}
</style>
