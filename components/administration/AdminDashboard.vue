<template>
  <div class="dashboard-container">
    <v-row>
      <v-col cols="12" sm="6" md="3" v-for="(stat, i) in stats" :key="i">
        <v-card class="rounded-xl pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-avatar :color="stat.color + ' lighten-4'" size="48" class="mr-4">
              <v-icon :color="stat.color">{{ stat.icon }}</v-icon>
            </v-avatar>
            <div>
              <div class="text-caption grey--text font-weight-bold text-uppercase">{{ stat.title }}</div>
              <div class="text-h5 font-weight-black">{{ stat.value }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-6">
      <v-col cols="12" md="8">
        <v-card class="rounded-xl pa-6" height="400" elevation="2">
          <v-card-title class="pa-0 mb-4 font-weight-bold">
            Aperçu des Présences
            <v-spacer></v-spacer>
            <v-btn icon small><v-icon>mdi-dots-vertical</v-icon></v-btn>
          </v-card-title>
          <div class="d-flex align-center justify-center grey lighten-4 rounded-lg" style="height: 300px;">
            <div class="text-center">
              <v-icon size="64" color="grey lighten-1">mdi-chart-areaspline</v-icon>
              <div class="grey--text">Graphique d'assiduité mensuelle</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="rounded-xl pa-6" height="400" elevation="2">
          <v-card-title class="pa-0 mb-4 font-weight-bold">Dernières Actions</v-card-title>
          <v-timeline dense align-top>
            <v-timeline-item color="primary" small>
              <div class="text-caption font-weight-bold">Inscription</div>
              <div class="text-body-2">Nouvel élève : Jean Dupont</div>
            </v-timeline-item>
            <v-timeline-item color="orange" small>
              <div class="text-caption font-weight-bold">Note</div>
              <div class="text-body-2">Bulletins générés - 3ème A</div>
            </v-timeline-item>
            <v-timeline-item color="green" small>
              <div class="text-caption font-weight-bold">Paiement</div>
              <div class="text-body-2">Frais scolaires reçus</div>
            </v-timeline-item>
          </v-timeline>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  etablissementId: Number,
  etablissementNom: String,
  anneeScolaireId: Number
});

// Données statiques pour l'exemple (à lier à votre API plus tard)
const stats = ref([
  { title: 'Élèves', value: '1,240', icon: 'mdi-account-group', color: 'primary' },
  { title: 'Enseignants', value: '45', icon: 'mdi-teach', color: 'success' },

]);
</script>

<style scoped>
.dashboard-container {
  animation: fadeIn 0.5s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>