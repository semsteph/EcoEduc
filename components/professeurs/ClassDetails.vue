<template>
  <v-container class="dc-wrap">
    <div class="dc-header">
      <div class="dc-title">
        <v-icon class="mr-2" color="primary">mdi-view-grid-outline</v-icon>
        Actions disponibles
      </div>
      <div class="dc-subtitle">
        Choisissez une action à effectuer pour cette classe.
      </div>
    </div>

    <v-row dense>
      <v-col v-for="detail in details" :key="detail.key" cols="12" sm="6" md="4">
        <v-card class="dc-card" elevation="0" @click="selectDetail(detail.key)">
          <div class="dc-card-top">
            <v-icon color="white">{{ detail.icon }}</v-icon>
          </div>

          <v-card-text class="dc-card-body">
            <div class="dc-label">{{ detail.label }}</div>
            <div class="dc-hint">Cliquez pour ouvrir</div>
          </v-card-text>

          <div class="dc-arrow">
            <v-icon color="primary">mdi-chevron-right</v-icon>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  emits: ["selectDetail"],
  data() {
    return {
      details: [
        { key: "NoteManager", label: "Gérer Notes", icon: "mdi-clipboard-text-outline" },
        { key: "ConductManager", label: "Gérer Conduite", icon: "mdi-account-tie-outline" },
        { key: "PresenceManager", label: "Gérer Présence", icon: "mdi-calendar-check-outline" },
        { key: "PresencesPrecedantes", label: "Les derniers absents", icon: "mdi-account-off-outline" },
        { key: "CahierDeTexteManager", label: "Cahier de texte", icon: "mdi-book-open-variant" },
        { key: "DevoirsManager", label: "Devoirs", icon: "mdi-notebook-edit-outline" },
      ],
    };
  },
  methods: {
    selectDetail(key) {
      this.$emit("selectDetail", key);
    },
  },
};
</script>

<style scoped>
.dc-wrap {
  padding-top: 12px;
  padding-bottom: 18px;
}

.dc-header {
  margin-bottom: 14px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(25, 118, 210, 0.12);
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.dc-title {
  display: flex;
  align-items: center;
  font-weight: 950;
  color: #0b2e4a;
  font-size: 1.05rem;
}

.dc-subtitle {
  margin-top: 6px;
  color: #546e7a;
  font-size: 0.92rem;
  line-height: 1.2rem;
}

.dc-card {
  border-radius: 10px!important;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(25, 118, 210, 0.12);
  background: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.dc-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.dc-card-top {
  height: 44px;
  background: linear-gradient(90deg, #1976d2, #0b2e4a);
  display: flex;
  align-items: center;
  padding: 0 14px;
}

.dc-card-body {
  padding: 14px;
  padding-right: 56px;
}

.dc-label {
  font-weight: 950;
  color: #0b2e4a;
  font-size: 1.02rem;
  margin-bottom: 6px;
}

.dc-hint {
  color: #607d8b;
  font-weight: 700;
  font-size: 0.85rem;
}

.dc-arrow {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(25, 118, 210, 0.10);
  border: 1px solid rgba(25, 118, 210, 0.14);
}

@media (max-width: 600px) {
  .dc-header {
    padding: 12px;
    border-radius: 10px;
  }
  .dc-card {
    border-radius: 10px!important;
  }
}

/* Interface fine : carte d'action en une ligne (pastille 32 px). */
.dc-wrap {
  padding: 0 !important;
}

.dc-header {
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: 8px;
}

.dc-title {
  font-size: 15px;
  font-weight: 800;
}

.dc-subtitle {
  margin-top: 2px;
  font-size: 13px;
}

.dc-card {
  display: flex !important;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 8px 10px !important;
  border-radius: 8px !important;
}

.dc-card:hover {
  transform: none;
}

.dc-card-top {
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  justify-content: center;
  padding: 0;
  background: linear-gradient(135deg, #1976d2, #0b2e4a);
}

.dc-card-top :deep(.v-icon) {
  font-size: 18px !important;
}

.dc-card-body {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0 !important;
}

.dc-label {
  font-size: 14px;
  font-weight: 800;
  margin-bottom: 0;
}

.dc-hint {
  font-size: 12.5px;
  font-weight: 600;
}

.dc-arrow {
  position: static;
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
}

@media (max-width: 600px) {
  .dc-header {
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
    margin-bottom: 8px;
  }
}
</style>
