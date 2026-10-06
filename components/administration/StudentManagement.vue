<template>
  <v-container class="scrollable-container px-1 px-sm-3 py-2" fluid>
    <v-row dense>
      <v-col
        v-for="(label, index) in visibleLabels"
        :key="index"
        cols="6"
        sm="4"
        lg="3"
      >
        <v-card
          class="menu-card"
          :style="{ '--tile-bg': label.gradient }"
          @click="navigateTo(label.route)"
        >
          <div class="card-overlay">
            <v-icon size="22" class="mb-1">
              {{ label.icon }}
            </v-icon>

            <div class="menu-card__label font-weight-bold text-center">
              {{ label.name }}
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row justify="center" dense class="mt-2">
      <v-col cols="12" sm="6" md="4">
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  etablissementId: Number,
  etablissementNom: String,
  anneeScolaire: String,
  anneeScolaireId: Number,
  modulesAutorises: { type: Array, default: null }
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
  },
  {
    name: 'Orientation en 2nde',
    route: 'Orientation',
    icon: 'mdi-sign-direction',
    gradient: 'linear-gradient(135deg, #FF7043, #D84315)'
  },
  {
    name: 'EducMaster',
    route: 'EducMaster',
    icon: 'mdi-transfer-up',
    gradient: 'linear-gradient(135deg, #00897B, #004D40)'
  }
];

// Le dashboard remappe la route 'Scolarite' vers le composant 'ScolariteManager' :
// on filtre sur la même clé pour que les droits accordés correspondent aux tuiles affichées.
// EducMaster : accessible à qui peut consulter les notes.
// Orientation en 2nde : avec la réinscription.
const permissionKeyForRoute = (route) => (route === 'Scolarite' ? 'ScolariteManager' : route === 'EducMaster' ? 'NoteConsultation' : route === 'Orientation' ? 'Reinscription' : route);

const visibleLabels = computed(() => {
  if (!props.modulesAutorises) return labels;
  return labels.filter((label) => props.modulesAutorises.includes(permissionKeyForRoute(label.route)));
});

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
  height: 72px;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: all 0.35s ease;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

/* Fond dégradé posé par variable : reste visible sur téléphone (la règle
   globale rend transparents les conteneurs « card » qui en contiennent). */
.menu-card.menu-card.menu-card {
  background: var(--tile-bg) !important;
  border: none !important;
}

/* Contenu */
.card-overlay {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  padding: 8px;
}

.menu-card__label {
  font-size: 14px;
  line-height: 1.25;
}

/* Hover */
.menu-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
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
    height: 64px;
  }
}
</style>