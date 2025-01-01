<template>
  <div>
    <v-card>
      <v-card-title>Notifications</v-card-title>
      <v-card-text>
        <div v-if="loading">Chargement des notifications...</div>
        <div v-else-if="error">{{ error }}</div>
        <div v-else>
          <ul>
            <li v-for="(notification, index) in notifications" :key="index">
              Une permission a été autorisée pour l'élève {{ notification.nom }} {{ notification.prenom }} 
              de la classe {{ notification.classeNom }} le {{ formatDate(notification.date) }} pour une durée de {{ notification.duree }}.
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
import axios from 'axios';

export default {
  name: 'NotificationComponent',
  props: {
    etablissementId: {
      type: Number,
      required: true,
    },
    enseignantId: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const notifications = ref([]);
    const loading = ref(true);
    const error = ref(null);

    // Fonction pour formater la date
    const formatDate = (dateString) => {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const fetchNotifications = async () => {
      try {
        if (!props.etablissementId || !props.enseignantId) {
          throw new Error("Les identifiants de l'établissement et de l'enseignant sont requis.");
        }

        const response = await axios.get(`http://localhost:8080/api/notifications/${props.etablissementId}`, {
          params: { enseignantId: props.enseignantId },
        });

        notifications.value = response.data.map((item) => ({
          nom: item.nom,
          prenom: item.prenom,
          classeNom: item.classeNom,
          date: item.date,
          duree: item.duree,
        }));
      } catch (err) {
        console.error('Erreur lors de la récupération des notifications:', err);
        if (err.response && err.response.data && err.response.data.message) {
          error.value = err.response.data.message;
        } else {
          error.value = err.message || 'Erreur lors de la récupération des notifications';
        }
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
      error,
      formatDate,
    };
  },
};
</script>

<style scoped>
/* Ajoutez vos styles ici si nécessaire */
</style>
