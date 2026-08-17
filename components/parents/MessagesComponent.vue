<template>
  <div class="messages-page">
    <div class="topbar">
      <v-btn icon class="back-btn" @click="goBack" aria-label="Retour">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>

      <div class="topbar-title">
        <div class="title">Messages</div>
        <div class="subtitle">Échanges avec l'établissement</div>
      </div>

      <div class="topbar-spacer" />
    </div>

    <v-container fluid class="content">
      <v-card class="empty-card" variant="outlined">
        <v-card-text class="empty-content">
          <div class="empty-icon">
            <v-icon size="42">mdi-message-outline</v-icon>
          </div>
          <div class="empty-title">Aucun message pour le moment</div>
          <div class="empty-subtitle">
            Cette fonctionnalité arrive bientôt. En attendant, utilisez
            « Contacter l'administration » depuis le menu.
          </div>
        </v-card-text>
      </v-card>
    </v-container>
  </div>
</template>

<script>
export default {
  name: 'MessagesComponent',
  methods: {
    goBack() {
      this.$emit('showComponent', 'DashboardHome');
    },
  },
};
</script>

<style scoped>
.messages-page {
  min-height: 100vh;
  background: #f6f8fc;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.back-btn {
  min-width: 44px;
  min-height: 44px;
  background: rgba(0, 0, 0, 0.03);
}
.topbar-title {
  text-align: center;
}
.title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #111827;
  line-height: 1.2;
}
.subtitle {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}
.topbar-spacer {
  width: 44px;
  height: 44px;
}

.content {
  padding: 16px;
}

.empty-card {
  border-radius: 18px !important;
  background: rgba(255, 255, 255, 0.9);
}
.empty-content {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 40px 16px;
  text-align: center;
}
.empty-icon {
  color: #90a4ae;
}
.empty-title {
  font-weight: 800;
  color: #111827;
}
.empty-subtitle {
  color: #6b7280;
  font-size: 13px;
  max-width: 320px;
}
</style>
