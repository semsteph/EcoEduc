<template>
  <v-container class="scrollable-container">
    <v-row justify="center">
      <v-col cols="12" sm="6" md="4" v-for="(label, index) in labels" :key="index">
        <v-card 
          @click="navigateTo(label.route)" 
          :color="label.color" 
          dark 
          class="mb-4 text-center d-flex align-center justify-center v-card-custom"
        >
          <v-card-title class="text-h6 font-weight-bold">{{ label.name }}</v-card-title>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: 'StudentManagement',
  props: {
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true }
  },
  data() {
    return {
      labels: [
        { name: 'Inscription', route: 'Inscription', color: 'cyan darken-2' },
        { name: 'Gestion de Présence', route: 'PresenceManagement', color: 'pink darken-2' },
        { name: 'Gestion de Punition', route: 'PunishmentManagement', color: 'lime darken-2' },
        { name: 'Consulter Note', route: 'NoteConsultation', color: 'amber darken-2' },
        { name: 'Gestion Bulletin', route: 'BulletinManagement', color: 'teal darken-2' },
        { name: 'Gestion Scolarité', route: 'ScolariteManagement', color: 'purple darken-2' }
      ]
    };
  },
  methods: {
    navigateTo(route) {
      this.$emit('component-selected', route);
    }
  }
}
</script>

<style scoped>
/* Active le scroll sur mobile */
.scrollable-container {
  max-height: 100vh;
  overflow-y: auto;
  padding: 16px;
}

/* Assure une bonne disposition des cartes */
.v-card-custom {
  cursor: pointer;
  min-height: 100px; /* Taille uniforme */
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

/* Centrage du texte */
.v-card-title {
  width: 100%;
}
</style>
