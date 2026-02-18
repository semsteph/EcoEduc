<template>
  <v-container class="scrollable-container px-4 py-6" fluid>
    <v-row justify="center">
      <v-col 
        cols="12" 
        sm="6" 
        md="4" 
        lg="3"
        v-for="(label, index) in labels" 
        :key="index"
      >
        <v-card 
          @click="navigateTo(label.route)" 
          :color="label.color" 
          theme="dark"
          class="mb-4 text-center d-flex align-center justify-center v-card-custom elevation-3 rounded-xl"
        >
          <v-card-text class="d-flex flex-column align-center">
            <v-icon size="32" class="mb-2">{{ label.icon }}</v-icon>
            <div class="text-subtitle-1 font-weight-bold">{{ label.name }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <v-row justify="center" class="mt-4">
      <v-col cols="12" sm="6" md="4">
        <v-btn block color="primary" variant="tonal" rounded="pill" @click="$emit('back')">
          <v-icon start>mdi-arrow-left</v-icon> Retour
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
  { name: 'Inscription', route: 'Inscription', color: 'cyan-darken-2', icon: 'mdi-account-plus' },
  { name: 'Nos Élèves', route: 'MesEleves', color: 'indigo-darken-2', icon: 'mdi-account-group' },
  { name: 'Gestion Présence', route: 'PresenceManagement', color: 'pink-darken-2', icon: 'mdi-calendar-check' },
  { name: 'Gestion Punition', route: 'PunishmentManagement', color: 'lime-darken-3', icon: 'mdi-gavel' },
  { name: 'Consulter Note', route: 'NoteConsultation', color: 'amber-darken-2', icon: 'mdi-book-open-variant' },
  { name: 'Gestion Bulletin', route: 'BulletinManagement', color: 'teal-darken-2', icon: 'mdi-file-document-outline' },
  { name: 'Réinscription', route: 'Reinscription', color: 'purple-darken-2', icon: 'mdi-cached' },
  { name: 'Carte Scolaire', route: 'CarteScolaire', color: 'blue-grey-darken-2', icon: 'mdi-card-account-details' },
];

const navigateTo = (route) => {
  emit('component-selected', route);
};
</script>

<style scoped>
.scrollable-container {
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}

.v-card-custom {
  cursor: pointer;
  min-height: 110px;
  transition: all 0.3s ease;
  border: 1px solid rgba(255,255,255,0.1);
}

.v-card-custom:hover {
  transform: translateY(-5px);
  filter: brightness(1.1);
}
</style>