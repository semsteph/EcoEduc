<template>
  <v-container class="mt-16">
    <template v-if="selectedChild && currentView === 'details'">
      <InfoDetails :child="selectedChild" @back="goBack" @navigate="navigateTo"/>
    </template>
    <template v-else-if="currentView === 'notes'">
      <Notes :child="selectedChild" @back="goBack"/>
    </template>
    <template v-else-if="currentView === 'presence'">
      <Presence :child="selectedChild" @back="goBack"/>
    </template>
    <template v-else-if="currentView === 'conduite'">
      <Conduite :child="selectedChild" @back="goBack"/>
    </template>
    <template v-else-if="currentView === 'scolarite'">
      <Scolarite :child="selectedChild" @back="goBack"/>
    </template>
    <template v-else-if="currentView === 'programme'">
      <Programme :child="selectedChild" @back="goBack"/>
    </template>
    <template v-else>
      <h1 class="d-flex justify-center">Veuillez cliquer sur l'élève pour afficher ses informations</h1>
      <v-row class="mt-15 d-flex justify-center">
        <v-col v-for="child in children" :key="child.id" cols="12" md="4">
          <v-card @click="selectChild(child)">
            <v-img :src="child.photo" height="200px"></v-img>
            <v-card-title>{{ child.name }}</v-card-title>
            <v-card-subtitle>{{ child.class }}</v-card-subtitle>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script>
import InfoDetails from './InfoDetails.vue'
import Notes from './Notes.vue'
import Presence from './Presence.vue'
import Conduite from './Conduite.vue'
import Scolarite from './Scolarite.vue'
import Programme from './Programme.vue'

export default {
  components: {
    InfoDetails,
    Notes,
    Presence,
    Conduite,
    Scolarite,
    Programme
  },
  data() {
    return {
      children: [
        { id: 1, name: 'John Doe', photo: 'photo_url', class: '4eme', notes: [], conduite: [] },
        { id: 2, name: 'Jane Smith', photo: 'photo_url', class: '6eme', notes: [], conduite: [] }
        // Autres enfants
      ],
      selectedChild: null,
      currentView: 'details'
    };
  },
  methods: {
    selectChild(child) {
      this.selectedChild = child;
      this.currentView = 'details';
    },
    goBack() {
      this.currentView = 'details';
      this.selectedChild = null;
      this.currentView = 'default'; // Assurez-vous de définir ce qui est 'default' ou retour à la vue principale.

    },
    navigateTo(view) {
      this.currentView = view;
    }
  }
}
</script>
