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
        <div class="text-caption grey--text text--darken-2">
          Réinscription / Migration • {{ anneeScolaire }}
        </div>
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
        <span class="text-body-2 font-weight-bold ml-2">
          Sélectionner les élèves à réinscrire ou migrer
        </span>

        <v-spacer></v-spacer>

        <div class="d-flex align-center flex-wrap">
          <v-btn
            variant="text"
            color="white"
            class="text-caption font-weight-bold"
            @click="toggleAfficherPartis"
          >
            <v-icon start size="18">
              {{ afficherPartis ? 'mdi-eye-off-outline' : 'mdi-account-off-outline' }}
            </v-icon>
            {{ afficherPartis ? 'Masquer les partis' : 'Voir les élèves partis' }}
          </v-btn>

          <v-btn
            variant="text"
            color="white"
            class="text-caption font-weight-bold"
            @click="toggleSelectAll"
          >
            <v-icon start size="18">
              {{ allSelected ? 'mdi-checkbox-multiple-blank-outline' : 'mdi-checkbox-multiple-marked-outline' }}
            </v-icon>
            {{
              $vuetify.display.smAndDown
                ? (allSelected ? 'Aucun' : 'Tous')
                : (allSelected ? 'Désélectionner' : 'Tout sélectionner')
            }}
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
              :class="{ 'selected-student': selectedIds.includes(eleve.id), 'student-parti': eleve.statut === 'parti' }"
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
                  <v-chip v-if="eleve.statut === 'parti'" size="x-small" color="grey-darken-1" text-color="white" class="mt-1">
                    Parti
                  </v-chip>
                </div>

                <v-checkbox
                  v-model="selectedIds"
                  :value="eleve.id"
                  @click.stop
                  hide-details
                  density="compact"
                  color="indigo-darken-4"
                  class="ma-0 pa-0"
                />
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

        <div class="d-flex flex-wrap align-center ga-2 action-buttons-wrap">
          <v-btn
            v-if="!afficherPartis"
            class="px-2 px-sm-6 rounded-lg migrate-btn"
            elevation="3"
            :disabled="selectedIds.length === 0"
            @click="ouvrirDialogMigration"
          >
            <v-icon start>mdi-swap-horizontal-bold</v-icon>
            Migrer vers
          </v-btn>

          <v-btn
            v-if="!afficherPartis"
            class="px-2 px-sm-6 rounded-lg reinscription-btn"
            elevation="3"
            :disabled="selectedIds.length === 0"
            @click="reinscrireEleves"
          >
            <v-icon start>mdi-check-circle</v-icon>
            Réinscrire
          </v-btn>

          <v-btn
            v-if="!afficherPartis"
            class="px-2 px-sm-6 rounded-lg parti-btn"
            elevation="3"
            :disabled="selectedIds.length === 0"
            :loading="isMarquantParti"
            @click="marquerPartis"
          >
            <v-icon start>mdi-account-off</v-icon>
            Marquer comme parti
          </v-btn>

          <v-btn
            v-if="afficherPartis"
            class="px-2 px-sm-6 rounded-lg"
            color="grey-darken-1"
            variant="elevated"
            elevation="3"
            :disabled="selectedIds.length === 0"
            :loading="isMarquantParti"
            @click="annulerDeparts"
          >
            <v-icon start>mdi-account-reactivate</v-icon>
            Annuler le départ
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>

    <!-- Dialog succès réinscription -->
    <v-dialog v-model="dialog" max-width="400" transition="dialog-bottom-transition">
      <v-card class="rounded-xl overflow-hidden">
        <v-sheet class="pa-2 pa-sm-6 text-center" color="white">
          <v-icon size="64" color="green-darken-1" class="mb-4">mdi-check-circle</v-icon>
          <h3 class="text-h6 font-weight-black text-indigo-darken-4 mb-2">
            Réinscription réussie
          </h3>
          <p class="text-body-2 text-grey-darken-1">
            Les élèves sélectionnés ont été réinscrits avec succès dans le système.
          </p>
          <v-btn
            block
            color="indigo-darken-4"
            class="mt-6 rounded-lg dialog-btn-white-text"
            variant="flat"
            @click="dialog = false"
          >
            Fermer
          </v-btn>
        </v-sheet>
      </v-card>
    </v-dialog>

    <!-- Dialog migration -->
    <v-dialog v-model="migrationDialog" max-width="520" transition="dialog-bottom-transition">
      <v-card class="rounded-xl overflow-hidden">
        <v-toolbar color="deep-purple-darken-2" dark flat>
          <v-icon start class="ml-4">mdi-swap-horizontal-bold</v-icon>
          <span class="font-weight-bold">Migration des élèves</span>
        </v-toolbar>

        <v-card-text class="pa-2 pa-sm-5">
          <v-alert
            type="info"
            variant="tonal"
            rounded="lg"
            class="mb-4"
          >
            Sélectionnez la classe de destination pour migrer les élèves choisis.
          </v-alert>

          <div class="text-body-2 font-weight-medium text-indigo-darken-4 mb-3">
            {{ selectedIds.length }} élève(s) seront migré(s)
          </div>

          <v-alert
            v-if="migrationError"
            type="error"
            variant="tonal"
            rounded="lg"
            class="mb-4"
            closable
            @click:close="migrationError = ''"
          >
            {{ migrationError }}
          </v-alert>

          <v-select
            v-model="destinationClasseId"
            :items="classesEtablissement"
            item-title="nom"
            item-value="id"
            label="Classe de destination"
            placeholder="Choisir une classe"
            variant="outlined"
            density="comfortable"
            class="migration-select"
            :loading="loadingClassesEtablissement"
            :disabled="loadingClassesEtablissement || isMigrating"
            hide-details="auto"
          >
            <template #item="{ props, item }">
              <v-list-item
                :title="item.raw.nom"
                v-bind="{
                  onClick: props.onClick,
                  onMouseenter: props.onMouseenter,
                  onMouseleave: props.onMouseleave
                }"
              />
            </template>
          </v-select>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>

          <v-btn
            variant="text"
            :disabled="isMigrating"
            @click="fermerDialogMigration"
          >
            Annuler
          </v-btn>

          <v-btn
            class="rounded-lg migration-confirm-btn"
            :loading="isMigrating"
            :disabled="!destinationClasseId || isMigrating"
            @click="migrerEleves"
          >
            Valider la migration
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog succès migration -->
    <v-dialog v-model="migrationSuccessDialog" max-width="420" transition="dialog-bottom-transition">
      <v-card class="rounded-xl overflow-hidden">
        <v-sheet class="pa-2 pa-sm-6 text-center" color="white">
          <v-icon size="64" color="deep-purple-darken-2" class="mb-4">
            mdi-swap-horizontal-circle
          </v-icon>
          <h3 class="text-h6 font-weight-black text-indigo-darken-4 mb-2">
            Migration réussie
          </h3>
          <p class="text-body-2 text-grey-darken-1">
            Les élèves sélectionnés ont été migrés avec succès vers la nouvelle classe.
          </p>
          <v-btn
            block
            color="deep-purple-darken-2"
            class="mt-6 rounded-lg dialog-btn-white-text"
            variant="flat"
            @click="migrationSuccessDialog = false"
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


export default {
  name: 'ScolariteDetail',
  props: {
    classId: { type: Number, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
    etablissementId: { type: Number, required: true }
  },
  data() {
    return {
      eleves: [],
      selectedStudentId: null,
      selectedIds: [],
      dialog: false,

      migrationDialog: false,
      migrationSuccessDialog: false,
      destinationClasseId: null,
      classesEtablissement: [],
      loadingClassesEtablissement: false,
      isMigrating: false,
      migrationError: '',

      afficherPartis: false,
      isMarquantParti: false,
    };
  },
  computed: {
    allSelected() {
      return this.selectedIds.length === this.eleves.length && this.eleves.length > 0;
    },
  },
  methods: {
    authHeaders() {
      const token = localStorage.getItem('token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    },

    fetchStudents() {
      console.log('[FRONT] fetchStudents classId =', this.classId, 'afficherPartis =', this.afficherPartis);

      axios.get(`/api/classes/${this.classId}/eleves`, {
        params: this.afficherPartis ? { inclurePartis: true } : {}
      })
        .then(response => {
          console.log('[FRONT] élèves récupérés =', response.data);
          this.eleves = this.afficherPartis
            ? response.data.filter(e => e.statut === 'parti')
            : response.data;
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des élèves:', error);
        });
    },

    toggleAfficherPartis() {
      this.afficherPartis = !this.afficherPartis;
      this.selectedIds = [];
      this.fetchStudents();
    },

    marquerPartis() {
      if (this.selectedIds.length === 0) return;

      this.isMarquantParti = true;

      axios.post('/api/eleves/marquer-parti', {
        eleveIds: this.selectedIds
      }, { headers: this.authHeaders() })
        .then(() => {
          this.selectedIds = [];
          this.fetchStudents();
        })
        .catch(error => {
          console.error('Erreur lors du marquage des élèves partis :', error);
        })
        .finally(() => {
          this.isMarquantParti = false;
        });
    },

    annulerDeparts() {
      if (this.selectedIds.length === 0) return;

      this.isMarquantParti = true;

      axios.post('/api/eleves/annuler-depart', {
        eleveIds: this.selectedIds
      }, { headers: this.authHeaders() })
        .then(() => {
          this.selectedIds = [];
          this.fetchStudents();
        })
        .catch(error => {
          console.error("Erreur lors de l'annulation du départ :", error);
        })
        .finally(() => {
          this.isMarquantParti = false;
        });
    },

    fetchClassesEtablissement() {
      if (!this.etablissementId) {
        console.warn('[FRONT] etablissementId absent, impossible de charger les classes');
        return;
      }

      this.loadingClassesEtablissement = true;

      console.log('[FRONT] chargement classes établissement =', this.etablissementId);

      axios.get(`/api/classe/${this.etablissementId}`)
        .then(response => {
          console.log('[FRONT] classes établissement récupérées =', response.data);

          const classes = Array.isArray(response.data) ? response.data : [];

          const uniques = new Map();

          classes.forEach(item => {
            const id = Number(item.id);
            const nom = String(item.nom || '').trim();

            if (!id || !nom) return;
            if (Number(id) === Number(this.classId)) return;

            if (!uniques.has(id)) {
              uniques.set(id, { id, nom });
            }
          });

          this.classesEtablissement = Array.from(uniques.values());

          console.log('[FRONT] classes établissement normalisées sans doublons =', this.classesEtablissement);
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des classes établissement:', error);
          console.error('[FRONT] error.response =', error?.response);
          this.classesEtablissement = [];
        })
        .finally(() => {
          this.loadingClassesEtablissement = false;
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

      console.log('[FRONT] réinscription eleveIds =', this.selectedIds);
      console.log('[FRONT] anneeScolaireId =', this.anneeScolaireId);

      axios.post('/api/eleves/reinscription', {
        eleveIds: this.selectedIds,
        anneeScolaireId: this.anneeScolaireId,
      }, { headers: this.authHeaders() })
        .then(() => {
          this.dialog = true;
          this.selectedIds = [];
          this.fetchStudents();
        })
        .catch(error => {
          console.error("Erreur lors de la réinscription :", error);
        });
    },

    ouvrirDialogMigration() {
      if (this.selectedIds.length === 0) return;

      console.log('[FRONT] ouverture dialog migration, selectedIds =', this.selectedIds);

      this.destinationClasseId = null;
      this.migrationError = '';
      this.migrationDialog = true;
      this.fetchClassesEtablissement();
    },

    fermerDialogMigration() {
      this.migrationDialog = false;
      this.destinationClasseId = null;
      this.migrationError = '';
    },

    migrerEleves() {
      if (this.selectedIds.length === 0) return;
      if (!this.destinationClasseId) return;

      this.isMigrating = true;
      this.migrationError = '';

      const payload = {
        eleveIds: this.selectedIds,
        destinationClasseId: this.destinationClasseId
      };

      console.log('[FRONT] migration payload =', payload);

      axios.post('/api/eleves/migrer', payload, { headers: this.authHeaders() })
        .then((response) => {
          console.log('[FRONT] migration réussie =', response.data);

          this.migrationDialog = false;
          this.migrationSuccessDialog = true;
          this.selectedIds = [];
          this.destinationClasseId = null;
          this.fetchStudents();
        })
        .catch((error) => {
          console.error('Erreur lors de la migration :', error);
          console.error('[FRONT] error.response =', error?.response);
          this.migrationError =
            error?.response?.data?.message ||
            "Une erreur est survenue lors de la migration des élèves.";
        })
        .finally(() => {
          this.isMigrating = false;
        });
    },
  },
  created() {
    console.log('[FRONT] props reçues =', {
      classId: this.classId,
      anneeScolaire: this.anneeScolaire,
      anneeScolaireId: this.anneeScolaireId,
      etablissementId: this.etablissementId
    });

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

.student-parti {
  opacity: 0.6;
}

.sticky-footer {
  border-top: 1px solid #EEE !important;
}

.transition-swing {
  transition: 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

/* ===== BOUTONS ACTIONS ===== */
.reinscription-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  border: none !important;
}

.reinscription-btn .v-icon {
  color: #ffffff !important;
}

.migrate-btn {
  background: linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%) !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  border: none !important;
}

.migrate-btn .v-icon {
  color: #ffffff !important;
}

.parti-btn {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%) !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  border: none !important;
}

.parti-btn .v-icon {
  color: #ffffff !important;
}

.dialog-btn-white-text {
  color: #ffffff !important;
  font-weight: 700 !important;
}

.migration-confirm-btn {
  background: linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%) !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  border: none !important;
}

.migration-confirm-btn .v-icon {
  color: #ffffff !important;
}

/* ===== ETAT DISABLED VISIBLE ===== */
.reinscription-btn.v-btn--disabled,
.reinscription-btn:disabled {
  background: #fde68a !important;
  color: #92400e !important;
  opacity: 1 !important;
}

.reinscription-btn.v-btn--disabled .v-icon,
.reinscription-btn:disabled .v-icon {
  color: #92400e !important;
}

.migrate-btn.v-btn--disabled,
.migrate-btn:disabled {
  background: #ddd6fe !important;
  color: #5b21b6 !important;
  opacity: 1 !important;
}

.migrate-btn.v-btn--disabled .v-icon,
.migrate-btn:disabled .v-icon {
  color: #5b21b6 !important;
}

.migration-confirm-btn.v-btn--disabled,
.migration-confirm-btn:disabled {
  background: #ddd6fe !important;
  color: #5b21b6 !important;
  opacity: 1 !important;
}

.migration-confirm-btn.v-btn--disabled .v-icon,
.migration-confirm-btn:disabled .v-icon {
  color: #5b21b6 !important;
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

  .action-buttons-wrap {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>