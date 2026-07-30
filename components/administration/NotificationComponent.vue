<template>
  <div class="notification-wrapper">
    <v-card :elevation="4" class="pa-4 card-style">
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="text-h6 text-md-h5 text-primary d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-bell-alert</v-icon>
          Notifications
        </span>
      </v-card-title>
      <v-divider class="my-2"></v-divider>

      <v-card-text>
        <div v-if="loading" class="text-center">
          <v-progress-circular indeterminate color="primary" size="40" />
        </div>

        <div v-else-if="notifications.length > 0">
          <v-row dense justify="center">
            <v-col
              v-for="(notif, index) in notifications"
              :key="index"
              cols="12"
              md="10"
              lg="8"
            >
              <v-alert
                :type="notif.isRead ? 'info' : 'warning'"
                class="pa-4 alert-card"
                border="start"
                :border-color="notif.isRead ? 'blue' : 'red'"
                colored-border
              >
                <div>
                  L'élève <strong>{{ notif.studentName }}</strong> de la classe
                  <strong>{{ notif.className }}</strong> a été absent  trois  fois  successivement à des dates consecutives du
              <strong>{{ formatDate(notif.startDate) }}</strong> au
                  <strong>{{ formatDate(notif.endDate) }}</strong>.
                </div>
                <div class="d-flex justify-end mt-2">
                  <v-btn
                    color="primary"
                    variant="elevated"
                    @click="contactParent(notif.studentId)"
                  >
                    <v-icon left class="mr-1">mdi-account-voice</v-icon>
                    Contacter le Parent
                  </v-btn>
                </div>
              </v-alert>
            </v-col>
          </v-row>
        </div>

        <div v-else class="text-caption text-center mt-4 text-grey">
          <v-icon class="mb-2" size="32">mdi-check-circle-outline</v-icon>
          <div>Aucune alerte pour le moment</div>
        </div>
      </v-card-text>
    </v-card>

    <!-- DIALOG PARENT -->
    <v-dialog v-model="dialog" max-width="500px">
      <v-card class="elevation-10 rounded-dialog">
        <v-card-title class="dialog-title">
          <v-icon class="mr-2" color="primary">mdi-account-details</v-icon>
          Informations du Parent
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pt-4">
          <div v-if="parentInfo">
            <p><v-icon class="mr-2">mdi-account</v-icon><strong>Nom :</strong> {{ parentInfo.nom }}</p>
            <p><v-icon class="mr-2">mdi-account-outline</v-icon><strong>Prénom :</strong> {{ parentInfo.prenom }}</p>
            <p><v-icon class="mr-2">mdi-phone</v-icon><strong>Contact :</strong> {{ parentInfo.contact }}</p>
            <p><v-icon class="mr-2">mdi-email</v-icon><strong>Email :</strong> {{ parentInfo.email }}</p>
          </div>
          <div v-else class="d-flex align-center">
            <v-progress-circular indeterminate color="primary" class="mr-2" />
            <span>Chargement des informations...</span>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="dialog = false">
            <v-icon left small>mdi-close-circle</v-icon>
            Fermer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'NotificationComponent',
  props: {
    etablissementId: Number,
    anneeScolaireId: Number
  },
  data() {
    return {
      notifications: [],
      dialog: false,
      parentInfo: null,
      loading: true,
    };
  },
  mounted() {
    this.initNotifications();
  },
  watch: {
    etablissementId() {
      this.initNotifications();
    },
    anneeScolaireId() {
      this.initNotifications();
    },
  },
  methods: {
    formatDate(dateString) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('fr-FR', options);
    },

    async initNotifications() {
      if (!this.etablissementId || !this.anneeScolaireId) return;

      this.loading = true;

      await this.fetchNotifications();
      await this.markNotificationsAsRead();

      this.loading = false;
    },

    async fetchNotifications() {
      try {
        const url = `/api/notifications/${this.etablissementId}/${this.anneeScolaireId}`;
        const res = await axios.get(url);

        const rawData = res.data || [];

        // Émettre le nombre de notifications non lues
        const nonLuesCount = rawData.filter(n => n.is_read === 0 || n.is_read === false).length;
        this.$emit('update-notification-count', nonLuesCount);

        // Formater chaque notification
        const formatted = await Promise.all(rawData.map(async notif => {
          const studentRes = await axios.get(`/api/eleve/${notif.eleve_id}`);
          const studentData = studentRes.data;

          const classRes = await axios.get(`/api/classes/${studentData.classe_id}`);
          const classData = classRes.data;

          return {
            studentId: notif.eleve_id,
            studentName: `${studentData.prenom} ${studentData.nom}`,
            className: classData.nom,
            startDate: notif.periode_debut_absence,
            endDate: notif.periode_fin_absence,
            isRead: notif.is_read === 1,
          };
        }));

        // Trier : non lus en haut
        this.notifications = formatted.sort((a, b) => {
          if (a.isRead === b.isRead) return 0;
          return a.isRead ? 1 : -1;
        });

      } catch (error) {
        console.error('❌ Erreur lors de la récupération des notifications:', error);
      }
    },

    async markNotificationsAsRead() {
      try {
        const url = `/api/notifications/mark-read/${this.etablissementId}/${this.anneeScolaireId}`;
        await axios.put(url);
      } catch (err) {
        console.error('❌ Erreur lors du marquage des notifications comme lues:', err);
      }
    },

    async contactParent(studentId) {
      try {
        const studentRes = await axios.get(`/api/eleve/${studentId}`);
        const parentId = studentRes.data.Parents_id;
        const parentRes = await axios.get(`/api/parentid/${parentId}`);
        this.parentInfo = parentRes.data;
        this.dialog = true;
      } catch (error) {
        console.error("❌ Erreur lors de la récupération des infos du parent:", error);
      }
    }
  }
};
</script>


<style scoped>
.notification-wrapper {
  max-width: 100%;
  padding: 8px;
  display: flex;
  justify-content: center;
}

.card-style {
  width: 100%;
  max-width: 1000px;
  border-radius: 16px;
  background-color: #f9fbff;
}

.alert-text {
  font-size: 16px;
  line-height: 1.6;
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
}

.alert-card {
  background-color: #fff8e1;
  border-left: 5px solid red;
  border-radius: 12px;
}

.rounded-dialog {
  border-radius: 20px;
  background-color: #ffffff;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e88e5;
  display: flex;
  align-items: center;
}

.dialog-actions {
  padding-right: 16px;
  padding-bottom: 12px;
}

.text-sm-body {
  font-size: 14px;
}

.text-sm-button {
  font-size: 13px;
  padding: 6px 16px;
  min-width: auto;
}

.notification-icon {
  font-size: 28px;
}

@media (max-width: 600px) {
  .card-style {
    padding: 12px !important;
    margin: 0 auto;
  }
  .alert-text {
    font-size: 11px;
    display: block;
  }
  .dialog-title {
    font-size: 12px;
  }
  .text-sm-body {
    font-size: 10px;
  }
  .text-sm-button {
    font-size: 7px;
    padding: 6px 10px;
  }
  .pp {
    display: block;
  }
  .notification-icon {
    font-size: 18px;
  }
}
</style>
