<template>
  <div>
    <v-card>
      <v-card-title>Notifications</v-card-title>
      <v-card-text>
        <div v-if="loading">Chargement des notifications...</div>
        <div v-else>
          <ul>
            <li v-for="(notification, index) in notifications" :key="index">
              Une permission a été autorisée pour l'élève {{ notification.nom }} {{ notification.prenom }} 
              de la classe {{ notification.nomClasse }} le {{ notification.date }} pour une durée de {{ notification.duree }}.
            </li>
          </ul>
          <div v-if="notifications.length === 0">Aucune notification disponible.</div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

export default {
  name: 'NotificationComponent',
  props: {
    etablissementId: { // Ajout de la prop pour recevoir l'ID de l'établissement
      type: Number,
      required: true,
    },
  },
  setup() {
    const notifications = ref([]);
    const loading = ref(true);
    const route = useRoute();

    const fetchNotifications = async () => {
      try {
        const enseignantId = route.params.enseignantId;

        const response = await axios.get(`/api/notifications/${this.etablissementId}`, {
          params: { enseignantId },
        });

        notifications.value = response.data.map((item) => ({
          nom: item.nom,
          prenom: item.prenom,
          nomClasse: item.nomClasse,
          date: item.date,
          duree: item.duree,
        }));
      } catch (error) {
        console.error('Erreur lors de la récupération des notifications:', error);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchNotifications();
    });

    return {
      notifications,
      loading,
    };
  },
};
</script>
