<template>
  <v-container>
    <h1>Informations de l'élève</h1>
    <v-card class="mb-5">
      <v-img :src="child.photo || defaultPhoto" height="200px"></v-img>
      <v-card-title>{{ child.prenom }} {{ child.nom }}</v-card-title>
      <v-card-subtitle>{{ child.class }}</v-card-subtitle>
    </v-card>
    <v-row>
      <v-col cols="12" md="4" v-for="(label, index) in labels" :key="index">
        <v-card :color="label.color" dark class="mb-5" @click="navigateTo(label.route)">
          <v-card-title>{{ label.name }}</v-card-title>
        </v-card>
      </v-col>
    </v-row>
    <v-btn color="primary" @click="goBack">Retour</v-btn>
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
        { name: 'Programme', route: 'programme', color: 'purple' },
        { name: 'Demande de Permission', route: 'permission', color: 'purple' },
        { name: 'Activité', route: 'activite', color: 'warning' },
      ],
      currentView: 'default',  // Vue actuelle (par défaut sur la liste)
      defaultPhoto: '/_nuxt/assets/parents/istockphoto-1495088043-612x612.jpg',  // Chemin vers l'image par défaut
      

    };
  },
  mounted() {
    this.loadChildren();
  },
  methods: {
    goBack() {
      this.$emit('back');
    },
   
    navigateTo(route) {
      this.$emit('navigate', route);
    },

    loadChildren() {
      if (typeof window !== 'undefined') {
        let children = [];

        // Charger les enfants stockés
        const storedChildren = localStorage.getItem('children');
        
        if (storedChildren) {
          children = JSON.parse(storedChildren);
          console.log('Children data loaded:', children);
        } else {
          console.log('No children data found, initializing empty array.');
        }

        // Exemple d'ajout d'un nouvel enfant à `localStorage`
        const newChild = { id: 1, name: 'John Doe', age: 10 };
        children.push(newChild);
        localStorage.setItem('children', JSON.stringify(children));
        console.log('Children data saved:', children);
      } else {
        console.error('localStorage is not available');
      }
    }
  }
}
</script>

<style scoped>
.v-card {
  cursor: pointer;
}
</style>
