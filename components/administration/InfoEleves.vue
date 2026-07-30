<template>
  <v-container fluid class="full-height">
    <v-row class="mt-5" justify="center">
      <v-col cols="12" sm="6" md="4" v-for="(label, index) in labels" :key="index">
        <v-card :color="label.color" dark class="mb-4 text-center" @click="navigateTo(label.route)">
          <v-card-title>{{ label.name }}</v-card-title>
        </v-card>
      </v-col>
    </v-row>
    <v-btn block color="primary" @click="$emit('back')">Retour</v-btn>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      labels: [
        { name: 'Inscription', route: 'NoteManager', color: 'cyan' },
        { name: 'Gestion de Présence', route: 'PresenceManager', color: 'pink' },
        { name: 'Gestion de Punition', route: 'PunitionManager', color: 'yellow' },
        { name: 'Consulter Note', route: 'CahierDeTexteManager', color: 'blue' },
        { name: 'Gestion Bulletin', route: 'BulletinManager', color: 'green' },
        { name: 'Scolarité', route: 'ScolariteManager', color: 'purple' }
      ]
    }
  },
  methods: {
    navigateTo(route) {
       console.log("MENU ACTUEL", route)
      this.$emit('navigate', route);
    }
  }
}
</script>

<style scoped>
.full-height {
  height: 100vh; /* Prend toute la hauteur de l'écran */
  overflow-y: auto; /* Active le scroll si nécessaire */
}

.v-card {
  cursor: pointer;
  min-height: 80px; /* S'assurer que les cartes sont visibles et accessibles */
}

.v-btn {
  position: sticky;
  bottom: 10px;
  width: 100%;
}
</style>
