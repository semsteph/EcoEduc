<template>
  <v-container fluid class="pa-2 pa-sm-4 bg-white">
    <v-row align="center" class="mb-4 mx-0" no-gutters>
      <v-col cols="auto">
        <v-btn
          icon
          variant="flat"
          color="indigo-darken-4"
          @click="$emit('back')"
          class="rounded-lg elevation-1"
          :size="$vuetify.display.smAndDown ? 'small' : 'default'"
        >
          <v-icon color="white">mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>
      <v-col class="ml-4">
        <h2 class="text-subtitle-1 text-sm-h6 font-weight-black text-indigo-darken-4">
          {{ selectedStudentId ? 'Profil Élève' : 'Liste des Élèves' }}
        </h2>
        <div class="text-caption grey--text text--darken-2">Réinscription • {{ anneeScolaire }}</div>
      </v-col>
    </v-row>

    <v-card
      variant="flat"
      border
      class="rounded-xl overflow-hidden shadow-sm"
      v-if="!selectedStudentId"
    >
      <v-toolbar color="indigo-darken-4" dark flat height="auto" class="pa-2">
        <v-icon start class="d-none d-sm-flex">mdi-account-group</v-icon>
        <span class="text-body-2 font-weight-bold ml-2">Sélectionner les élèves à réinscrire</span>
        
        <v-spacer></v-spacer>

        <div class="d-flex align-center flex-wrap">
          <v-btn
            variant="text"
            color="white"
            class="text-caption font-weight-bold"
            @click="toggleSelectAll"
          >
            <v-icon start size="18">{{ allSelected ? 'mdi-checkbox-multiple-blank-outline' : 'mdi-checkbox-multiple-marked-outline' }}</v-icon>
            {{ $vuetify.display.smAndDown ? (allSelected ? 'Aucun' : 'Tous') : (allSelected ? 'Désélectionner' : 'Tout sélectionner') }}
          </v-btn>
        </div>
      </v-toolbar>

      <v-card-text class="pa-2 pa-sm-4">
        <v-row dense>
          <v-col
            v-for="eleve in eleves"
            :key="eleve.id"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card
              flat
              border
              class="student-card rounded-lg transition-swing mb-1"
              :class="{'selected-student': selectedIds.includes(eleve.id)}"
              @click="selectStudent(eleve.id)"
            >
              <v-card-text class="pa-3 d-flex align-center">
                <v-avatar color="indigo-lighten-5" rounded="lg" size="40" class="mr-3">
                  <v-icon color="indigo-darken-4">mdi-account-circle</v-icon>
                </v-avatar>
                
                <div class="flex-grow-1 overflow-hidden">
                  <div class="text-body-2 font-weight-bold text-black text-truncate">
                    {{ eleve.prenom }} {{ eleve.nom }}
                  </div>
                </div>

                <v-checkbox
                  v-model="selectedIds"
                  :value="eleve.id"
                  @click.stop
                  hide-details
                  density="compact"
                  color="indigo-darken-4"
                  class="ma-0 pa-0"
                ></v-checkbox>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions class="bg-grey-lighten-5 pa-4 sticky-footer">
        <div class="text-caption font-weight-bold text-indigo-darken-4">
          {{ selectedIds.length }} élève(s) sélectionné(s)
        </div>
        <v-spacer></v-spacer>
        <v-btn
          color="black"
          class="px-6 rounded-lg text-white"
          elevation="4"
          :disabled="selectedIds.length === 0"
          @click="reinscrireEleves"
        >
          <v-icon start>mdi-check-circle</v-icon>
          Réinscrire
        </v-btn>
      </v-card-actions>
    </v-card>

    <scolarite-detail-eleve
      v-else
      :studentId="selectedStudentId"
      :annee-scolaire="anneeScolaire"
      :annee-scolaire-id="anneeScolaireId"
      @back="clearSelection"
    />

    <v-dialog v-model="dialog" max-width="400" transition="dialog-bottom-transition">
      <v-card class="rounded-xl overflow-hidden">
        <v-sheet class="pa-6 text-center" color="white">
          <v-icon size="64" color="green-darken-1" class="mb-4">mdi-check-circle</v-icon>
          <h3 class="text-h6 font-weight-black text-indigo-darken-4 mb-2">Réinscription Réussie</h3>
          <p class="text-body-2 text-grey-darken-1">
            Les élèves sélectionnés ont été réinscrits avec succès dans le système.
          </p>
          <v-btn
            block
            color="black"
            class="mt-6 rounded-lg text-white"
            variant="flat"
            @click="dialog = false"
          >
            Fermer
          </v-btn>
        </v-sheet>
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
.shadow-sm {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
}

.student-card {
  border: 1px solid #E0E0E0 !important;
  background-color: white !important;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.student-card:hover {
  border-color: #303F9F !important;
  transform: translateY(-2px);
}

.selected-student {
  border-color: #303F9F !important;
  background-color: #F5F7FF !important;
}

.sticky-footer {
  border-top: 1px solid #EEE !important;
}

.transition-swing {
  transition: 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

/* Optimisation tactile mobile */
@media (max-width: 600px) {
  .v-btn {
    letter-spacing: 0.5px;
  }
  
  .sticky-footer {
    position: sticky;
    bottom: 0;
    z-index: 2;
    background-color: #FAFAFA !important;
  }

  .text-truncate {
    max-width: 150px;
  }
}
</style>