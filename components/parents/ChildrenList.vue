<template>
  <v-container class="mt-16">
    <template v-if="selectedChild && currentView === 'details'">
      <InfoDetails :child="selectedChild" @back="goBack" @navigate="navigateTo"/>
    </template>
    <template v-else-if="currentView === 'notes'">
      <Notes :child="selectedChild" :childId="selectedChild.id"  @back="goBack"/>
    </template>
    <template v-else-if="currentView === 'presence'">
      <Presence :child="selectedChild" :childId="selectedChild.id"  @back="goBack"/>
    </template>
    <template v-else-if="currentView === 'conduite'">
      <Conduite :child="selectedChild" :childId="selectedChild.id"  @back="goBack"/>
    </template>
    <template v-else-if="currentView === 'scolarite'">
      <Scolarite :child="selectedChild" :childId="selectedChild.id" :classId="selectedChild.class"  @back="goBack"/>
    </template>
    <template v-else-if="currentView === 'programme'">
      <Programme :child="selectedChild" :childId="selectedChild.id"  @back="goBack"/>
    </template>
    <template v-else-if="currentView === 'permission'">
      <DemandeDePermission :child="selectedChild" :childId="selectedChild.id"  @back="goBack"/>
    </template>
    <template v-else-if="currentView === 'activite'">
      <Activite :child="selectedChild" :childId="selectedChild.id"  @back="goBack"/>
    </template>
    <template v-else>
      <h1 class="text-center font-weight-bold mb-4">Veuillez cliquer sur l'élève pour afficher ses informations</h1>
      <v-row class="mt-15">
        <v-col v-for="child in children" :key="child.id" cols="12" md="4">
          <v-card 
            @click="selectChild(child)"
            class="elevation-2 rounded-lg cursor-pointer "
          >
            <!-- Affichage de l'image (photo de l'enfant ou image par défaut) -->
            <v-img 
              :src="child.photo || defaultPhoto" 
              height="200px"
              contain
              class="rounded-t-lg"
            ></v-img>
            <!-- Titre avec prénom et nom de l'enfant -->
            <v-card-title class="font-weight-bold text-h6">{{ child.prenom }} {{ child.nom }}</v-card-title>
            <!-- Sous-titre avec la classe de l'enfant -->
            <v-card-subtitle class="text-muted">{{ child.class }}</v-card-subtitle>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script>
import InfoDetails from './InfoDetails.vue';
import Notes from './Notes.vue';
import Presence from './Presence.vue';
import Conduite from './Conduite.vue';
import Scolarite from './Scolarite.vue';
import Programme from './Programme.vue';
import DemandeDePermission from './DemandeDePermission.vue';
import Activite from './Activite.vue';
import axios from 'axios';

export default {
  components: {
    InfoDetails,
    Notes,
    Presence,
    Conduite,
    Scolarite,
    Programme,
    DemandeDePermission,
    Activite
  },
  data() {
    return {
      children: [],  // Liste des enfants récupérés
      selectedChild: null,  // Enfant sélectionné pour afficher les détails
      currentView: 'default',  // Vue actuelle (par défaut sur la liste)
      defaultPhoto: '/_nuxt/assets/parents/istockphoto-1495088043-612x612.jpg',  // Chemin vers l'image par défaut
    };
  },
  created() {
    this.fetchChildren();  // Récupération des enfants lors de la création du composant
  },
  methods: {
    async fetchChildren() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.$router.push('parents/connexion');
          return;
        }

        const response = await axios.get('http://localhost:8080/api/parent/children', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        // Vérification que la réponse contient bien les enfants
        if (response.data && Array.isArray(response.data.children)) {
          this.children = response.data.children;
        } else {
          console.error('Les données des enfants ne sont pas disponibles.');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des enfants:', error);
        this.$router.push('/parents/connexion');
      }
    },
    selectChild(child) {
      this.selectedChild = child;
      this.currentView = 'details';
    },
    goBack() {
      this.currentView = 'default';
      this.selectedChild = null;
    },
    navigateTo(view) {
      this.currentView = view;
    }
  }
};
</script>

<style scoped>
.v-container {
  padding: 20px;
}

h1 {
  color: #F7F9FC;
}

.v-card {
  transition: transform 0.3s ease;
}

.v-card:hover {
  transform: scale(1.05);
}

.v-card-title {
  background-color: #F7F9FC;
}

.v-card-subtitle {
  color: #7F8C8D;
}

.text-center {
  text-align: center;
}

.font-weight-bold {
  font-weight: bold;
}

.mb-4 {
  margin-bottom: 1.5rem;
}

.rounded-lg {
  border-radius: 10px;
}

.cursor-pointer {
  cursor: pointer;
}
.mt-15{
  display: flex;
  justify-content: center;
}
</style>
