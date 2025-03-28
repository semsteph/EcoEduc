<template>
  <v-app>
    <!-- Barre latérale de navigation -->
    <v-navigation-drawer app color="indigo darken-4" v-model="drawer" dark>
      <v-list dense>
        <v-list-item>
          <v-list-item-content>
            <h1 class="etablissement-title"><strong>Etablissement: </strong> {{ etablissementNom }}</h1>
          </v-list-item-content>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item v-for="item in menuItems" :key="item.title" @click="changeComponent(item.component)">
          <v-list-item-icon>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Barre d'applications -->
    <v-app-bar app color="indigo darken-4" dark>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title class="app-title">EchoEducation</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="showMessages">
        <v-badge color="red" content="5" overlap>
          <v-icon>mdi-message</v-icon>
        </v-badge>
      </v-btn>
      <v-btn icon @click="showNotifications">
        <v-badge :color="notificationBadgeColor" :content="notificationCount" overlap>
          <v-icon>mdi-bell</v-icon>
        </v-badge>
      </v-btn>
      <v-btn icon @click="showLogoutDialog">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Conteneur principal avec l'image de fond -->
    <div class="background-container">
      <div class="background-image"></div>
      <v-main class="foreground">
        <v-container class="py-5">
          <component :is="currentComponent"
                     :etablissement-id="etablissementId"
                     :annee-scolaire="anneeScolaire"
                     :annee-scolaire-id="anneeScolaireId"
                     @component-selected="selectComponent"
                     @back="currentComponent = previousComponent"
                     @update-notification-count="updateNotificationCount" />
        </v-container>
      </v-main>
    </div>

    <!-- Boîte de dialogue de déconnexion -->
    <logout-dialog ref="logoutDialog" @confirm-logout="logout"></logout-dialog>
  </v-app>
</template>

<script>
import axios from 'axios';
// Importation des composants (inchangée)
import ParentManagement from '@/components/administration/ParentManagement.vue';
import MessageComponent from '@/components/administration/MessageComponent.vue';
import NotificationComponent from '@/components/administration/NotificationComponent.vue';
import LogoutDialog from '@/components/administration/LogoutDialog.vue';
import ClassManagement from '@/components/administration/ClassManagement.vue';
import StudentManagement from '@/components/administration/StudentManagement.vue';
import TeacherManagement from '@/components/administration/TeacherManagement.vue';
import Inscription from '@/components/administration/Inscription.vue';
import PresenceManagement from '@/components/administration/PresenceManagement.vue';
import PunishmentManagement from '@/components/administration/PunishmentManagement.vue';
import NoteConsultation from '@/components/administration/NoteConsultation.vue';
import BulletinManagement from '@/components/administration/BulletinManagement.vue';
import ScolariteManagement from '@/components/administration/ScolariteManagement.vue';
import Parametre from '~/components/administration/Parametre.vue';

export default {
  components: {
    MessageComponent,
    ParentManagement,
    NotificationComponent,
    LogoutDialog,
    ClassManagement,
    StudentManagement,
    TeacherManagement,
    Inscription,
    PresenceManagement,
    PunishmentManagement,
    NoteConsultation,
    BulletinManagement,
    ScolariteManagement,
    Parametre,
  },
  data() {
    return {
      drawer: false,
      currentComponent: 'ClassManagement',
      previousComponent: null,
      notificationCount: 0,
      notificationBadgeColor: 'red',
      etablissementId: null,
      etablissementNom: '',
      anneeScolaire: '', // Année scolaire en cours
      anneeScolaireId: null, // ID de l'année scolaire
      menuItems: [
        { title: 'Gestion Classe', component: 'ClassManagement', icon: 'mdi-school' },
        { title: 'Gestion Élève', component: 'StudentManagement', icon: 'mdi-account-group' },
        { title: 'Gestion Enseignant', component: 'TeacherManagement', icon: 'mdi-teach' },
        { title: 'Gestion Parent', component: 'ParentManagement', icon: 'mdi-account-child' },
        { title: 'Paramètres', component: 'Parametre',  icon: 'mdi-cog' },
      ],
    };
  },
  created() {
    this.etablissementId = parseInt(this.$route.query.etablissement_id, 10);
    this.etablissementNom = this.$route.query.etablissement_nom;
    this.fetchAnneeScolaire(); // Récupérer l'année scolaire en cours
  },
  methods: {
    async fetchAnneeScolaire() {
    try {
      const response = await axios.get(`http://localhost:8080/api/annees-scolaires/${this.etablissementId}`);
      if (response.data) {
        const { id, nom } = response.data;
        this.anneeScolaire = nom || 'Année scolaire non spécifiée';
        this.anneeScolaireId = id || null;
      } else {
        this.anneeScolaire = 'Aucune année scolaire trouvée.';
        this.anneeScolaireId = null;
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'année scolaire :", error);
      this.anneeScolaire = 'Impossible de charger les données.';
      this.anneeScolaireId = null;
    }
    console.log("Année scolaire :", this.anneeScolaire, "ID :", this.anneeScolaireId);
  },
    changeComponent(component) {
      this.previousComponent = this.currentComponent;
      this.currentComponent = component;
    },
    showMessages() {
      this.currentComponent = 'MessageComponent';
    },
    showNotifications() {
      this.notificationCount = 0;
      this.currentComponent = 'NotificationComponent';
    },
    showLogoutDialog() {
      this.$refs.logoutDialog.dialog = true;
    },
    logout() {
      this.$router.push('/administration/connexion');
    },
    selectComponent(component) {
      this.previousComponent = this.currentComponent;
      this.currentComponent = component;
    },
    updateNotificationCount(newCount) {
      this.notificationCount = newCount;
    },
  },
};
</script>

<style scoped>
/* Arrière-plan avec image floue */
.background-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.background-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('assets/administration/Image collée.png');
  background-size: cover;
  background-position: center;
  filter: blur(10px); /* Flou appliqué à l'image */
  z-index: 1;
}

.foreground {
  position: relative;
  z-index: 2;
  background-color: rgba(255, 255, 255, 0.1); /* Fond semi-transparent */
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  height: 100%;
  overflow-y: auto; /* Permet le défilement vertical */
}

.app-title {
  font-size: 24px;
  font-weight: 700;
  text-transform: capitalize;
}

.etablissement-title {
  font-size: 20px;
  font-weight: 600;
  color: white;
  text-align: center;
  margin: 16px 0;
}

.v-list-item {
  color: white;
  font-weight: 500;
}

.v-list-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  border-radius: 8px;
}
</style>
