<template>
  <v-app-bar
    app
    elevation="6"
    class="topbar"
    color="primary"
    density="comfortable"
  >
    <!-- Drawer -->
    <v-btn
      icon
      variant="text"
      class="icon-btn"
      @click="$emit('toggleDrawer')"
      aria-label="Ouvrir le menu"
    >
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <!-- Logo -->
    <div class="logo-wrap">
      <v-img
        src="/assets/administration/logooff.png"
        alt="Logo"
        contain
        class="logo"
      />
    </div>

    <v-spacer />

    <!-- Notifications -->
    <v-tooltip text="Notifications" location="bottom">
      <template #activator="{ props: tip }">
        <v-btn
          v-bind="tip"
          icon
          variant="text"
          class="icon-btn"
          @click="$emit('showNotifications')"
          aria-label="Afficher les notifications"
        >
          <v-badge
            v-if="unreadCount > 0"
            :content="unreadCount"
            color="red"
            floating
            offset-x="2"
            offset-y="2"
          >
            <v-icon>mdi-bell</v-icon>
          </v-badge>

          <v-icon v-else>mdi-bell</v-icon>
        </v-btn>
      </template>
    </v-tooltip>
  </v-app-bar>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  notifications: {
    type: Array,
    default: () => [],
  },
});

const unreadCount = computed(() => {
  return (props.notifications || []).filter(
    (n) => n?.isRead === 0 || n?.isRead === false || n?.isRead === null || n?.isRead === undefined
  ).length;
});
</script>

<style scoped>
/* Charte: bleu/blanc + petit noir */
.topbar {
  color: #ffffff !important;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

/* Boutons icônes */
.icon-btn {
  color: #fff !important;
}

/* Logo */
.logo-wrap {
  display: flex;
  align-items: center;
  margin-left: 8px;
}

.logo {
  width: 180px;
  height: 44px;
}

/* Responsive: logo plus petit sur mobile */
@media (max-width: 600px) {
  .logo {
    width: 130px;
    height: 40px;
  }
}
</style>
