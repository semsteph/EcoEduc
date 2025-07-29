<template>
  <v-container fluid class="pa-2">
    <!-- Bouton retour -->
    <v-btn
      icon
      class="ma-2"
      color="indigo darken-3"
      variant="text"
      @click="$emit('back')"
      :size="$vuetify.display.smAndDown ? 'x-small' : 'default'"
    >
      <v-icon :size="$vuetify.display.smAndDown ? 16 : 24" color="white">mdi-arrow-left</v-icon>
    </v-btn>

    <!-- Liste des élèves -->
    <v-card
      color="grey lighten-4"
      class="elevation-1 rounded-lg pa-2"
      v-if="!selectedStudentId"
    >
      <v-card-title
        class="d-flex justify-space-between align-center flex-wrap"
        :class="$vuetify.display.smAndDown ? 'text-body-2' : 'text-subtitle-1'"
      >
        <div class="d-flex align-center">
          <v-icon color="indigo darken-2" class="mr-2">mdi-account-group</v-icon>
          <span class="font-weight-medium text-indigo-darken-3">Liste des Élèves</span>
        </div>

        <div class="d-flex flex-wrap">
          <v-btn
            class="ma-1"
            color="indigo lighten-2"
            variant="flat"
            :size="$vuetify.display.smAndDown ? 'x-small' : 'small'"
            @click="toggleSelectAll"
            prepend-icon="mdi-checkbox-multiple-marked-outline"
          >
            {{ allSelected ? 'Désélectionner' : 'Tout sélectionner' }}
          </v-btn>
          <v-btn
            class="ma-1"
            color="green darken-1"
            variant="flat"
            :size="$vuetify.display.smAndDown ? 'x-small' : 'small'"
            :disabled="selectedIds.length === 0"
            @click="reinscrireEleves"
            prepend-icon="mdi-check-circle"
          >
            Réinscription
          </v-btn>
        </div>
      </v-card-title>

      <v-card-text>
        <v-row dense>
          <v-col
            v-for="eleve in eleves"
            :key="eleve.id"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card
              class="ma-1 pa-2 hoverable"
              outlined
              @click="selectStudent(eleve.id)"
              :elevation="$vuetify.display.smAndDown ? 1 : 2"
            >
              <v-card-title
                class="d-flex align-center justify-space-between pa-2"
                :class="$vuetify.display.smAndDown ? 'text-body-2' : 'text-subtitle-2'"
              >
                <div class="text-truncate d-flex align-center">
                  <v-icon small class="mr-1" color="indigo">mdi-account</v-icon>
                  {{ eleve.prenom }} {{ eleve.nom }}
                </div>
                <v-checkbox
                  v-model="selectedIds"
                  :value="eleve.id"
                  @click.stop
                  hide-details
                  density="compact"
                  class="ma-0 pa-0"
                  color="indigo"
                  :ripple="false"
                  :style="{ transform: $vuetify.display.smAndDown ? 'scale(0.75)' : 'scale(1)' }"
                />
              </v-card-title>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Détail élève -->
    <scolarite-detail-eleve
      v-else
      :studentId="selectedStudentId"
      :annee-scolaire="anneeScolaire"
      :annee-scolaire-id="anneeScolaireId"
      @back="clearSelection"
    />

    <!-- Dialogue de succès -->
    <v-dialog v-model="dialog" max-width="400">
      <v-card>
        <v-card-title class="text-success">
          <v-icon class="mr-2" color="green">mdi-check-circle-outline</v-icon>
          Réinscription réussie
        </v-card-title>
        <v-card-text>
          Les élèves sélectionnés ont été réinscrits avec succès.
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn color="green darken-1" variant="text" @click="dialog = false">
            Fermer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from 'axios';
import ScolariteDetailEleve from './ScolariteDetailEleve.vue';

export default {
  name: 'ScolariteDetail',
  components: { ScolariteDetailEleve },
  props: {
    classId: { type: Number, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true }
  },
  data() {
    return {
      eleves: [],
      selectedStudentId: null,
      selectedIds: [],
      dialog: false,
    };
  },
  computed: {
    allSelected() {
      return this.selectedIds.length === this.eleves.length && this.eleves.length > 0;
    },
  },
  methods: {
    fetchStudents() {
      axios.get(`http://localhost:8080/api/classes/${this.classId}/eleves`)
        .then(response => {
          this.eleves = response.data;
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des élèves:', error);
        });
    },
    selectStudent(studentId) {
      this.selectedStudentId = studentId;
    },
    clearSelection() {
      this.selectedStudentId = null;
    },
    toggleSelectAll() {
      this.selectedIds = this.allSelected ? [] : this.eleves.map(e => e.id);
    },
    reinscrireEleves() {
      if (this.selectedIds.length === 0) return;
      axios.post('http://localhost:8080/api/eleves/reinscription', {
        eleveIds: this.selectedIds,
        anneeScolaireId: this.anneeScolaireId,
      })
        .then(() => {
          this.dialog = true;
          this.selectedIds = [];
          this.fetchStudents();
        })
        .catch(error => {
          console.error("Erreur lors de la réinscription :", error);
        });
    },
  },
  created() {
    this.fetchStudents();
  }
};
</script>

<style scoped>
/* Responsive Mobile Optimisation */
@media (max-width: 600px) {
  .v-card-title {
    font-size: 0.75rem !important;
    padding: 4px 6px !important;
  }

  .v-btn {
    font-size: 0.7rem !important;
    padding: 4px 8px !important;
    min-height: 28px !important;
    border-radius: 6px !important;
  }

  .v-icon {
    font-size: 16px !important;
  }

  .v-col {
    padding: 4px !important;
  }

  .v-card {
    padding: 4px !important;
  }

  .text-truncate {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
