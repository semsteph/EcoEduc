<template>
  <v-responsive max-width="700" class="mx-auto">
    <v-card elevation="6" class="pa-3 rounded-xl">
      <!-- Header -->
      <v-card-title class="d-flex align-center">
        <v-icon color="primary" class="mr-2" :class="iconSizeClass">
          mdi-bell
        </v-icon>
        <span :class="[titleSizeClass, 'font-weight-bold']">
          Permissions autorisées ce mois
        </span>

        <v-spacer />

        <!-- Indicateur de chargement marquage -->
        <div v-if="marking" class="d-flex align-center">
          <v-progress-circular indeterminate width="3" size="20" />
          <small class="ml-2">Marquage…</small>
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text>
        <!-- Chargement -->
        <div v-if="loading" class="text-center pa-4">
          <v-progress-circular
            indeterminate
            color="primary"
            :size="spinnerSize"
          />
          <div :class="textSizeClass">Chargement des permissions...</div>
        </div>

        <!-- Erreur -->
        <div
          v-else-if="error"
          class="text-red text-center pa-2"
          :class="textSizeClass"
          role="alert"
        >
          {{ error }}
        </div>

        <!-- Liste -->
        <v-list v-else>
          <template v-if="filteredNotifications.length > 0">
            <v-list-item
              v-for="(notification, index) in filteredNotifications"
              :key="notification.notificationId || notification.permissionId || index"
              class="mb-4 rounded-xl shadow-sm"
              :class="[
                listItemClass,
                'notification-item',
                !notification.isRead ? 'unread' : ''
              ]"
            >
              <!-- Avatar / Icon -->
              <v-list-item-avatar>
                <v-avatar
                  size="40"
                  :color="notification.isRead ? 'grey lighten-3' : 'green lighten-4'"
                >
                  <v-icon
                    :color="notification.isRead ? 'grey' : 'green darken-2'"
                  >
                    {{ notification.isRead ? "mdi-bell-outline" : "mdi-bell-ring" }}
                  </v-icon>
                </v-avatar>
              </v-list-item-avatar>

              <!-- Contenu -->
              <v-list-item-content>
                <v-list-item-title
                  :class="[textSizeClass, !notification.isRead ? 'font-weight-bold' : '']"
                  class="notification-text"
                >
                  {{ getPermissionSentence(notification) }}
                </v-list-item-title>
                <v-list-item-subtitle
                  v-if="notification.notificationCreatedAt"
                  class="mt-1 grey--text"
                >
                  <small>{{ formatDate(notification.notificationCreatedAt) }}</small>
                </v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </template>

          <!-- Aucun résultat -->
          <div v-else class="text-center pa-4 grey--text" :class="textSizeClass">
            <v-icon large color="grey lighten-1">mdi-bell-off</v-icon>
            <div>Aucune permission autorisée ce mois-ci.</div>
          </div>
        </v-list>
      </v-card-text>
    </v-card>
  </v-responsive>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import axios from "axios";

export default {
  name: "NotificationComponent",
  props: {
    notifications: { type: Array, default: () => [] },
    etablissementId: { type: Number, required: false },
    enseignantId: { type: Number, required: false },
    anneeScolaireId: { type: Number, required: false },
  },
  setup(props) {
    const localNotifications = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const marking = ref(false);

    const mountedFlag = ref(false);
    const markedThisMount = ref(false);

    const formatDate = (dateString) => {
      if (!dateString) return "";
      const options = { year: "numeric", month: "long", day: "numeric" };
      return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const getPermissionSentence = (notif) => {
      return `L’élève ${notif.nom} ${notif.prenom} de la classe ${notif.classeNom} a obtenu une permission le ${formatDate(
        notif.date
      )} pour une durée de ${notif.duree}.`;
    };

    const syncLocalFromProp = (arr) => {
      localNotifications.value = (arr || []).map((item) => ({
        notificationId: item.notificationId ?? item.id ?? null,
        permissionId: item.permissionId ?? null,
        nom: item.nom_eleve || item.nom || "Nom inconnu",
        prenom: item.prenom_eleve || item.prenom || "Prénom inconnu",
        classeNom: item.classeNom || "Classe inconnue",
        date: item.permissionDate || item.date || null,
        duree: item.permissionDuree || item.duree || "Durée inconnue",
        isRead: item.isRead === 1 || item.isRead === true || false,
        notificationCreatedAt: item.notificationCreatedAt || item.created_at || null,
      }));
    };

    watch(
      () => props.notifications,
      (newVal) => {
        syncLocalFromProp(newVal);
        loading.value = false;
        if (mountedFlag.value && !markedThisMount.value) {
          markDisplayedAsRead();
        }
      },
      { immediate: true, deep: true }
    );

    const filteredNotifications = computed(() => {
      const now = new Date();
      const cm = now.getMonth();
      const cy = now.getFullYear();
      return localNotifications.value.filter((n) => {
        if (!n.date) return false;
        const d = new Date(n.date);
        return d.getMonth() === cm && d.getFullYear() === cy;
      });
    });

    const markDisplayedAsRead = async () => {
      if (markedThisMount.value) return;
      const toMark = filteredNotifications.value
        .filter((n) => !n.isRead)
        .map((n) => n.notificationId)
        .filter(Boolean);

      if (toMark.length === 0) {
        markedThisMount.value = true;
        return;
      }

      marking.value = true;
      error.value = null;

      try {
        const token = localStorage.getItem("token");
        await axios.put(
          "/api/notificationprof/mark-read-bulk",
          {
            notificationIds: toMark,
            enseignantId: props.enseignantId,
            etablissementId: props.etablissementId,
          },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );

        localNotifications.value = localNotifications.value.map((n) =>
          toMark.includes(n.notificationId) ? { ...n, isRead: true } : n
        );

        markedThisMount.value = true;
      } catch (err) {
        console.error("Erreur markDisplayedAsRead:", err);
        error.value =
          err.response?.data?.message ||
          err.message ||
          "Erreur lors du marquage des notifications.";
      } finally {
        marking.value = false;
      }
    };

    onMounted(() => {
      mountedFlag.value = true;
      if (localNotifications.value.length > 0 && !markedThisMount.value) {
        markDisplayedAsRead();
      }
    });

    onUnmounted(() => {
      mountedFlag.value = false;
      markedThisMount.value = false;
    });

    const windowWidth = ref(window.innerWidth);
    window.addEventListener("resize", () => {
      windowWidth.value = window.innerWidth;
    });

    const iconSizeClass = computed(() => {
      if (windowWidth.value < 360) return "text-sm";
      else if (windowWidth.value < 600) return "text-md";
      else return "text-lg";
    });

    const textSizeClass = computed(() => {
      if (windowWidth.value < 360) return "text-body-2";
      else if (windowWidth.value < 600) return "text-body-1";
      else return "text-subtitle-1";
    });

    const titleSizeClass = computed(() => {
      if (windowWidth.value < 360) return "text-subtitle-2";
      else if (windowWidth.value < 600) return "text-subtitle-1";
      else return "text-h6";
    });

    const listItemClass = computed(() =>
      windowWidth.value < 360 ? "pa-2" : "pa-4"
    );

    const spinnerSize = computed(() => {
      if (windowWidth.value < 360) return 24;
      else if (windowWidth.value < 600) return 30;
      else return 40;
    });

    return {
      localNotifications,
      loading,
      error,
      marking,
      filteredNotifications,
      getPermissionSentence,
      formatDate,
      iconSizeClass,
      textSizeClass,
      titleSizeClass,
      listItemClass,
      spinnerSize,
      markDisplayedAsRead,
    };
  },
};
</script>

<style scoped>
.text-red {
  color: red;
}

.notification-item {
  background-color: #ffffff;
  border: 1px solid #f1f1f1;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}
.notification-item:hover {
  background-color: #f9fcff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.unread {
  border-left: 4px solid #1976d2;
  background-color: #e3f2fd !important;
}

.notification-text {
  white-space: normal !important;
  word-break: break-word;
  line-height: 1.5;
}

/* Ajustements petits écrans */
@media (max-width: 360px) {
  .v-card {
    padding: 10px !important;
  }
  .notification-item {
    margin-bottom: 10px !important;
  }
}
</style>
