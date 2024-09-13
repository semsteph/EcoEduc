<template>
  <v-app class="background">
    <ToolbarComponent @showComponent="showComponent" />
    <component :is="currentComponent"></component>
  </v-app>
</template>

<script>
import ToolbarComponent from '@/components/parents/ToolbarComponent.vue';
import MessagesComponent from '@/components/parents/MessagesComponent.vue';
import NotificationsComponent from '@/components/parents/NotificationsComponent.vue';
import LogoutDialog from '@/components/parents/LogoutDialog.vue';
import ChildrenList from '@/components/parents/ChildrenList.vue';

export default {
  components: {
    ToolbarComponent,
    MessagesComponent,
    NotificationsComponent,
    LogoutDialog,
    ChildrenList
  },
  data() {
    return {
      currentComponent: ChildrenList // Le composant par défaut affiché
    };
  },
  methods: {
    showComponent(component) {
      // Mise à jour du composant actuel affiché
      this.currentComponent = component;
    }
  }
}
</script>

<style scoped>
.background {
  background-image: url('/assets/parents/ecolier-fait-ses-devoirs-ses-parents_1290988-1159.jpg'); /* Chemin vers votre image de fond */
  background-size: cover;  /* L'image couvre tout l'écran */
  background-position: center; /* Centrer l'image */
  background-repeat: no-repeat; /* Empêche la répétition de l'image */
  min-height: 100vh; /* S'assure que la page couvre au moins toute la hauteur de l'écran */
}
</style>
