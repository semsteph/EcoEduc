<template>
  <v-app>
    <!-- Barre latérale de navigation -->
    <v-navigation-drawer app color="blue darken-3" v-model="drawer">
      <v-list dense>
        <v-list-item>
          <v-list-item-content>
            <h1 class="etablissement-title">{{ etablissementNom }}</h1>
          </v-list-item-content>
        </v-list-item>
        <v-list-item @click="changeComponent('ClassManagement')">
          <v-list-item-content>Gestion Classe</v-list-item-content>
        </v-list-item>
        <v-list-item @click="changeComponent('StudentManagement')">
          <v-list-item-content>Gestion Élève</v-list-item-content>
        </v-list-item>
        <v-list-item @click="changeComponent('TeacherManagement')">
          <v-list-item-content>Gestion Enseignant</v-list-item-content>
        </v-list-item>
        <v-list-item @click="changeComponent('ParentManagement')">
          <v-list-item-content>Gestion Parent</v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Barre d'applications -->
    <v-app-bar app color="blue darken-3" dark>
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

    <!-- Composant principal affiché -->
    <v-main class="background ">
      <v-container>
        <component :is="currentComponent"
                   :etablissement-id="etablissementId"
                   @component-selected="selectComponent"
                   @back="currentComponent = previousComponent"
                   @update-notification-count="updateNotificationCount"
        />
      </v-container>
    </v-main>

    <!-- Boîte de dialogue de déconnexion -->
    <logout-dialog ref="logoutDialog" @confirm-logout="logout"></logout-dialog>
  </v-app>
</template>

<script>
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
    };
  },
  created() {
    this.etablissementId = parseInt(this.$route.query.etablissement_id, 10);
    this.etablissementNom = this.$route.query.etablissement_nom;
  },
  methods: {
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
      // Logique de déconnexion (ex. suppression du token, etc.)
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
.background {
  background-image: url('assets/administration/Image collée.png');
  background-size: cover;
  background-position: center;
  min-height: 100vh;
}

.app-title {
  font-size: 28px;
  font-weight: bold;
  text-transform: capitalize;
}

.etablissement-title {
  font-size: 22px;
  font-weight: bold;
  color: white;
  text-align: center;
  margin-top: 20px;
}

.v-list-item-content {
  color: white;
  font-weight: 500;
}

.v-list-item-content:hover {
  background-color: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  border-radius: 5px;
  padding: 8px;
}

.v-navigation-drawer {
  background-color: #0d47a1;
}

.v-app-bar {
  background-color: #0d47a1;
}

.v-btn .v-icon {
  color: white;
}

.v-main {
  background-color: rgba(255, 255, 255, 0.8);
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
}
</style>
