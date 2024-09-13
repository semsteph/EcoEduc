<template>
  <v-app>
    <v-navigation-drawer app>
      <v-list dense>
  <v-list-item @click="currentComponent = 'ClassManagement'">
    <v-list-item-content>Gestion Classe</v-list-item-content>
  </v-list-item>
  <v-list-item @click="currentComponent = 'StudentManagement'">
    <v-list-item-content>Gestion Élève</v-list-item-content>
  </v-list-item>
  <v-list-item @click="currentComponent = 'TeacherManagement'">
    <v-list-item-content>Gestion Enseignant</v-list-item-content>
  </v-list-item>
  <v-list-item @click="currentComponent = 'ParentManagement'">
    <v-list-item-content>Gestion Parent</v-list-item-content>
  </v-list-item>
</v-list>

      
    </v-navigation-drawer>
  
    <v-app-bar app>
      <v-toolbar-title>Mon Projet Nuxt</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="showMessages">
        <v-badge color="red" content="5" overlap>
          <v-icon>mdi-message</v-icon>
        </v-badge>
      </v-btn>
        <!-- Bouton Notifications -->
        <v-btn icon @click="showNotifications">
        <v-badge :color="notificationBadgeColor" :content="notificationCount" overlap>
          <v-icon>mdi-bell</v-icon>
        </v-badge>
      </v-btn>
      
      <v-btn icon @click="showLogoutDialog">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>
  
    <v-main>
      <v-container>
        <component :is="currentComponent" 
                   @component-selected="selectComponent" 
                   @back="currentComponent = previousComponent"
                   @update-notification-count="updateNotificationCount"
        />
      </v-container>
    </v-main>
  
    <logout-dialog ref="logoutDialog"></logout-dialog>
  </v-app>
</template>

<script>
import ParentManagement from '@/components/administration/ParentManagement.vue';
import MessageComponent from '@/components/administration/MessageComponent.vue';
import NotificationComponent from '@/components/administration/NotificationComponent.vue';
import LogoutDialog from '@/components/administration/LogoutDialog.vue';
import ClassManagement from '@/components/administration/ClassManagement.vue';
import StudentManagement from '@/components/administration/StudentManagement.vue';
import TeacherManagement from '@/components/administration/TeacherManagement.vue';  // Importation ajoutée
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
    TeacherManagement,  // Ajout du composant TeacherManagement
    Inscription,
    PresenceManagement,
    PunishmentManagement,
    NoteConsultation,
    BulletinManagement,
    ScolariteManagement
  },
  data() {
    return {
      currentComponent: 'ClassManagement',
      previousComponent: null,
      notificationCount: 0, // Initialiser le nombre de notifications à zéro
      notificationBadgeColor: 'red'
    }
  },
  methods: {
    showMessages() {
      this.currentComponent = 'MessageComponent'
    },
    showNotifications() {
      this.notificationCount = 0; // Réinitialiser le badge à zéro quand on consulte les notifications
      this.currentComponent = 'NotificationComponent'
    },
    showLogoutDialog() {
      this.$refs.logoutDialog.dialog = true
    },
    selectComponent(component) {
      this.previousComponent = this.currentComponent
      this.currentComponent = component
    },
    updateNotificationCount(newCount) {
      this.notificationCount = newCount;
    }
  }
}
</script>
