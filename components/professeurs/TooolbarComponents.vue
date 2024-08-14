<template>
    <v-app-bar app>
      <v-toolbar-title>Mon Projet Nuxt</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon>
        <v-badge
          color="red"
          content="5"
          overlap
        >
          <v-icon>mdi-message</v-icon>
        </v-badge>
      </v-btn>
      <v-btn icon>
        <v-badge
          color="red"
          content="3"
          overlap
        >
          <v-icon>mdi-bell</v-icon>
        </v-badge>
      </v-btn>
      <v-btn icon @click="showLogoutDialog">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
      <logout-dialog ref="logoutDialog"></logout-dialog>
    </v-app-bar>
    
   
</template>

<script>

import LogoutDialog from './LogoutDialog.vue'
import MessageComponent from './MessageComponent.vue'
import NotificationComponent from './NotificationComponent.vue'
export default {
  components:{
    LogoutDialog,
    MessageComponent,
    NotificationComponent
  } , 

    data() {
    return {
      currentComponent: null,
      selectedSubjectId: null,
      selectedClassId: null,
      subjects: [
        { id: 1, name: 'Mathématiques' },
        { id: 2, name: 'Physique' },
        { id: 3, name: 'Chimie' },
        // Ajouter d'autres matières ici
      ]
    }
  },
    
    showMessages() {
      this.currentComponent = 'MessageComponent'
    },
    showNotifications() {
      this.currentComponent = 'NotificationComponent'
    },
    showLogoutDialog() {
      this.$refs.logoutDialog.dialog = true
    },

   
}
</script>

<style>

</style>