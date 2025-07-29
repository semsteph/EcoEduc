<template>
  <v-app>
    <!-- Sidebar -->
    <v-navigation-drawer
      app
      color="primary"
      v-model="drawer"
      dark
      permanent
      class="elevation-2"
    >
      <v-toolbar flat color="primary">
        <v-img
          src="@/assets/administration/logooff.png"
          max-width="140"
          class="mx-auto mt-3"
        />
      </v-toolbar>

      <v-divider></v-divider>

      <v-list dense nav class="mt-4">
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title class="text-caption grey--text text--lighten-3">
              Etablissement
            </v-list-item-title>
            <v-list-item-subtitle class="white--text font-weight-bold">
              {{ etablissementNom }}
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>

        <v-list-item>
          <v-list-item-content>
            <v-list-item-title class="text-caption grey--text text--lighten-3">
              Année scolaire
            </v-list-item-title>
            <v-list-item-subtitle class="white--text font-weight-bold">
              {{ anneeScolaireNom }}
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>

        <v-divider class="my-3"></v-divider>

        <v-list-item
          v-for="item in menuItems"
          :key="item.title"
          @click="changeComponent(item.component)"
          :class="{ 'active-item': currentComponent === item.component }"
        >
          <v-list-item-icon>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Top Bar -->
    <v-app-bar app color="white" class="elevation-1">
      <v-app-bar-nav-icon @click="drawer = !drawer" class="text-primary" />
      <v-toolbar-title class="font-weight-bold text-primary">
        EchoEducation
      </v-toolbar-title>

      <v-spacer />

      <v-btn icon @click="showMessages">
        <v-badge
          :content="permissionCount"
          color="deep-orange"
          v-if="permissionCount > 0"
          overlap
        >
          <v-icon>mdi-email</v-icon>
        </v-badge>
        <template v-else>
          <v-icon>mdi-email-outline</v-icon>
        </template>
      </v-btn>

      <v-btn icon @click="showNotifications">
        <v-badge
          :content="notificationCount"
          :color="notificationBadgeColor"
          overlap
        >
          <v-icon>mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>

      <v-btn icon @click="showLogoutDialog">
        <v-icon color="red darken-1">mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Main Content -->
    <v-main>
      <v-container
        fluid
        class="pa-6 main-content"
      >
        <component
          :is="currentComponent"
          :etablissement-id="etablissementId"
          :annee-scolaire="anneeScolaire"
          :annee-scolaire-id="anneeScolaireId"
          @component-selected="selectComponent"
          @back="currentComponent = previousComponent"
          @update-notification-count="updateNotificationCount"
        />
      </v-container>
    </v-main>

    <!-- Logout Dialog -->
    <logout-dialog ref="logoutDialog" @confirm-logout="logout" />
  </v-app>
</template>

<script>
import axios from 'axios';
// Composants
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
import Parametre from '~/components/administration/Parametre.vue';
import Reinscription from '~/components/administration/Reinscription.vue';
import MesEleves from '~/components/administration/MesEleves.vue';

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
    Reinscription,
    Parametre,
    MesEleves,
  },
  data() {
    return {
      drawer: true,
      currentComponent: 'ClassManagement',
      previousComponent: null,
      notificationCount: 0,
      notificationBadgeColor: 'deep-orange accent-3',
      permissionCount: 0,
      etablissementId: null,
      etablissementNom: '',
      anneeScolaire: '',
      anneeScolaireId: null,
      permissionInterval: null,
      menuItems: [
        { title: 'Classes', component: 'ClassManagement', icon: 'mdi-school-outline' },
        { title: 'Elèves', component: 'StudentManagement', icon: 'mdi-account-group-outline' },
        { title: 'Enseignants', component: 'TeacherManagement', icon: 'mdi-teach' },
        { title: 'Parents', component: 'ParentManagement', icon: 'mdi-account-child-outline' },
        { title: 'Paramètres', component: 'Parametre', icon: 'mdi-cog-outline' },
      ],
    };
  },
  created() {
    this.etablissementId = parseInt(this.$route.query.etablissement_id, 10);
    this.etablissementNom = this.$route.query.etablissement_nom;
    this.fetchAnneeScolaire().then(() => {
      this.fetchPermissionCount();
      this.startPermissionPolling();
    });
  },
  beforeDestroy() {
    clearInterval(this.permissionInterval);
  },
  methods: {
    async fetchAnneeScolaire() {
      try {
        const res = await axios.get(`http://localhost:8080/api/annees-scolaires/${this.etablissementId}`);
        if (res.data) {
          const { id, nom } = res.data;
          this.anneeScolaireNom = nom || 'Non spécifiée';
          this.anneeScolaireId = id || null;
        }
      } catch (error) {
        console.error(error);
        this.anneeScolaireNom = 'Erreur de chargement';
        this.anneeScolaireId = null;
      }
    },
    async fetchPermissionCount() {
      if (!this.etablissementId || !this.anneeScolaireId) return;
      try {
        const response = await axios.get(`http://localhost:8080/api/permissions/${this.etablissementId}/${this.anneeScolaireId}`);
        const now = new Date();
        const filtered = response.data.filter(p => {
          const date = new Date(p.date);
          return (
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear() &&
            !p.is_read
          );
        });
        this.permissionCount = filtered.length;
      } catch (error) {
        console.error('Erreur permissions:', error);
        this.permissionCount = 0;
      }
    },
    startPermissionPolling() {
      this.permissionInterval = setInterval(() => {
        this.fetchPermissionCount();
      }, 30000);
    },
    changeComponent(component) {
      this.previousComponent = this.currentComponent;
      this.currentComponent = component;
    },
    showMessages() {
      this.permissionCount = 0;
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
.v-list-item.active-item {
  background-color: rgba(255, 255, 255, 0.15);
  border-left: 4px solid #FFC107;
}

.main-content {
  background-color: #F4F7FA;
  height: calc(100vh - 64px); /* Adjust if your app-bar height differs */
  overflow-y: auto;
}

.v-toolbar-title {
  font-weight: 600;
  font-size: 18px;
}

.v-list-item-title {
  font-size: 15px;
  font-weight: 500;
}

.v-icon {
  font-size: 22px;
}

@media (max-width: 768px) {
  .v-toolbar-title {
    font-size: 16px;
  }

  .v-list-item-title {
    font-size: 13px;
  }

  .v-icon {
    font-size: 18px !important;
  }
}
</style>
