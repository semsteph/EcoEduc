<template>
  <v-card class="rounded-xl elevation-2 border-light mt-4" min-height="500">
    <v-toolbar flat color="white" class="border-b">
      <v-btn icon variant="tonal" color="primary" @click="$emit('back')" class="me-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <v-toolbar-title class="font-weight-bold text-primary">
        Registre des Présences
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-chip color="primary" variant="flat" size="small" class="font-weight-bold">
        {{ anneeScolaire }}
      </v-chip>
    </v-toolbar>

    <v-card-text class="pa-0">
      <v-tabs
        v-model="tabIndex"
        bg-color="grey-lighten-4"
        color="primary"
        align-tabs="start"
        @update:model-value="onTabChange"
      >
        <v-tab
          v-for="s in semestre"
          :key="s.nom"
          :value="s.nom"
          class="text-none font-weight-bold"
        >
          <v-icon start>mdi-calendar-range</v-icon>
          {{ s.nom }}
        </v-tab>
      </v-tabs>

      <v-window v-model="tabIndex">
        <v-window-item v-for="s in semestre" :key="s.nom" :value="s.nom">
          <div v-if="loading" class="text-center pa-3 pa-sm-10">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <div class="mt-2 text-caption font-weight-bold text-grey">Récupération des données...</div>
          </div>

          <v-data-table
            v-else
            :headers="headers"
            :items="s.data"
            density="comfortable"
            hover
            class="attendance-table"
          >
            <template v-slot:item.date="{ item }">
              <span class="font-weight-medium">{{ formatDate(item.date) }}</span>
            </template>

            <template v-slot:item.statut="{ item }">
              <v-chip
                :color="getStatusColor(item.statut)"
                size="x-small"
                variant="flat"
                class="text-uppercase font-weight-black"
              >
                {{ item.statut }}
              </v-chip>
            </template>

            <template v-slot:no-data>
              <div class="pa-3 pa-sm-10 text-center">
                <v-icon size="64" color="grey-lighten-2">mdi-account-check-outline</v-icon>
                <div class="text-grey mt-2">Aucune donnée de présence pour ce semestre</div>
              </div>
            </template>
          </v-data-table>
        </v-window-item>
      </v-window>
    </v-card-text>
  </v-card>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ChildComponent',
  props: {
    studentId: { type: Number, required: true },
    etablissementId: { type: Number, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true }
  },
  data() {
    return {
      tabIndex: null,
      loading: false,
      headers: [
        { title: 'Date', key: 'date', align: 'start' },
        { title: 'Matière', key: 'matiere' },
        { title: 'Heures', key: 'heures' },
        { title: 'Statut', key: 'statut', align: 'center' },
        { title: 'Motif', key: 'motif' },
      ],
      semestre: [],
    };
  },
  methods: {
    async fetchSemesters() {
      try {
        const response = await axios.get(`/api/semesters/${this.etablissementId}`);
        this.semestre = response.data.map(sem => ({
          nom: sem.nom,
          data: []
        }));

        if (this.semestre.length > 0) {
          this.tabIndex = this.semestre[0].nom;
          this.fetchSemestreData(this.tabIndex);
        }
      } catch (error) {
        console.error('Erreur semestres:', error);
      }
    },
    onTabChange(nom) {
      this.fetchSemestreData(nom);
    },
    async fetchSemestreData(semestreNom) {
      this.loading = true;
      try {
        const response = await axios.get(`/api/presence/${this.studentId}/${semestreNom}/${this.anneeScolaireId}`);
        const sem = this.semestre.find(s => s.nom === semestreNom);
        if (sem) {
          sem.data = response.data;
        }
      } catch (error) {
        console.error('Erreur données:', error);
      } finally {
        this.loading = false;
      }
    },
    getStatusColor(statut) {
      const s = statut.toLowerCase();
      if (s === 'présent' || s === 'present') return 'success';
      if (s === 'absent') return 'error';
      if (s === 'retard') return 'warning';
      return 'grey';
    },
    formatDate(dateStr) {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  },
  created() {
    this.fetchSemesters();
  },
};
</script>

<style scoped>
.border-light {
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
}

.attendance-table {
  border-radius: 0 !important;
}

/* Effet de survol sur les lignes du tableau */
:deep(.attendance-table tr:hover) {
  background-color: #f8fbff !important;
}

/* Personnalisation des onglets actifs */
.v-tab--selected {
  background-color: white !important;
}
</style>