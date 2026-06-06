<template>
  <v-container class="scrollable-container px-4 py-6" fluid>
    <v-row justify="center">
      <v-col
        v-for="(label, index) in labels"
        :key="index"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card
          class="menu-card"
          :style="{ background: label.gradient }"
          @click="navigateTo(label.route)"
        >
          <div class="card-overlay">
            <v-icon size="48" class="mb-3">
              {{ label.icon }}
            </v-icon>

            <div class="text-h6 font-weight-bold text-center">
              {{ label.name }}
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row justify="center" class="mt-8">
      <v-col cols="12" sm="6" md="4">
        <v-btn
          block
          color="primary"
          size="large"
          rounded="pill"
          variant="elevated"
          @click="$emit('back')"
        >
          <v-icon start>mdi-arrow-left</v-icon>
          Retour
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const props = defineProps({
  etablissementId: Number,
  etablissementNom: String,
  anneeScolaire: String,
  anneeScolaireId: Number
});

const emit = defineEmits(['component-selected', 'back']);

const labels = [
  {
    name: 'Inscription',
    route: 'Inscription',
    icon: 'mdi-account-plus',
    gradient: 'linear-gradient(135deg, #00BCD4, #0097A7)'
  },
  {
    name: 'Nos Élèves',
    route: 'MesEleves',
    icon: 'mdi-account-group',
    gradient: 'linear-gradient(135deg, #3F51B5, #283593)'
  },
  {
    name: 'Gestion Présence',
    route: 'PresenceManagement',
    icon: 'mdi-calendar-check',
    gradient: 'linear-gradient(135deg, #E91E63, #AD1457)'
  },
  {
    name: 'Gestion Punition',
    route: 'PunishmentManagement',
    icon: 'mdi-gavel',
    gradient: 'linear-gradient(135deg, #8BC34A, #558B2F)'
  },
  {
    name: 'Consulter Note',
    route: 'NoteConsultation',
    icon: 'mdi-book-open-variant',
    gradient: 'linear-gradient(135deg, #FFC107, #FF8F00)'
  },
  {
    name: 'Gestion Bulletin',
    route: 'BulletinManagement',
    icon: 'mdi-file-document-outline',
    gradient: 'linear-gradient(135deg, #009688, #00695C)'
  },
  {
    name: 'Réinscription',
    route: 'Reinscription',
    icon: 'mdi-cached',
    gradient: 'linear-gradient(135deg, #9C27B0, #6A1B9A)'
  },
  {
    name: 'Carte Scolaire',
    route: 'CarteScolaire',
    icon: 'mdi-card-account-details',
    gradient: 'linear-gradient(135deg, #607D8B, #37474F)'
  },
  {
    name: 'Scolarité',
    route: 'Scolarite',
    icon: 'mdi-cash-multiple',
    gradient: 'linear-gradient(135deg, #4CAF50, #1B5E20)'
  }
];

const navigateTo = (route) => {
  emit('component-selected', route);
};
</script>

<style scoped>
.scrollable-container {
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}

/* Carte moderne */
.menu-card {
  height: 150px;
  border-radius: 20px;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: all 0.35s ease;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* Contenu */
.card-overlay {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  padding: 20px;
}

/* Hover */
.menu-card:hover {
  transform: translateY(-8px) scale(1.03);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25);
}

.menu-card:active {
  transform: scale(0.98);
}

/* Scroll personnalisé */
.scrollable-container::-webkit-scrollbar {
  width: 8px;
}

.scrollable-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 10px;
}

.scrollable-container::-webkit-scrollbar-track {
  background: transparent;
}

/* Mobile */
@media (max-width: 600px) {
  .menu-card {
    height: 130px;
  }

  .text-h6 {
    font-size: 1rem !important;
  }
}
</style>