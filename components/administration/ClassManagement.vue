<template>
  <v-container class="management-wrapper py-8 px-4" fluid>
    <v-row align="center" class="mb-6 px-4">
      <v-col cols="12" md="8">
        <h1 class="text-h4 font-weight-black text-indigo-darken-3 d-flex align-center">
          <v-icon color="indigo-darken-3" class="mr-3" size="large">mdi-shield-check</v-icon>
          Administration des Classes
        </h1>
        <p class="text-subtitle-1 text-grey-darken-1">{{ etablissementNom }} • {{ anneeScolaire }}</p>
      </v-col>
      <v-col cols="12" md="4" class="text-md-right text-left">
        <v-btn
          v-if="activeForm || showClasses"
          variant="tonal"
          color="indigo-darken-3"
          prepend-icon="mdi-arrow-left"
          rounded="pill"
          @click="cancelForm"
        >
          Retour au menu
        </v-btn>
      </v-col>
    </v-row>

    <v-fade-transition mode="out-in">
      <v-row v-if="!activeForm && !showClasses" justify="center">
        <v-col v-for="(item, i) in menuItems" :key="i" cols="12" sm="6" lg="3">
          <v-hover v-slot:default="{ isHovering, props }">
            <v-card
              v-bind="props"
              :elevation="isHovering ? 8 : 2"
              class="mx-auto rounded-xl text-center pa-2 pa-sm-6 transition-swing cursor-pointer border"
              @click="item.action"
            >
              <v-avatar :color="item.color + '-lighten-4'" size="80" class="mb-4">
                <v-icon :color="item.color + '-darken-2'" size="40">{{ item.icon }}</v-icon>
              </v-avatar>
              <div class="text-h6 font-weight-bold text-grey-darken-3">{{ item.title }}</div>
              <div class="text-caption text-grey">{{ item.subtitle }}</div>
            </v-card>
          </v-hover>
        </v-col>
      </v-row>
    </v-fade-transition>

    <v-dialog v-model="classDialog" max-width="600px" persistent>
      <v-card class="rounded-xl border shadow-lg overflow-hidden">
        <v-toolbar color="primary" flat>
          <v-icon start class="ml-4">mdi-plus-box</v-icon>
          <v-toolbar-title class="font-weight-bold">Création de nouvelles sections</v-toolbar-title>
          <v-btn icon @click="closeClassDialog"><v-icon>mdi-close</v-icon></v-btn>
        </v-toolbar>

        <v-card-text class="pa-2 pa-sm-6">
          <v-form @submit.prevent="submitForm">
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  v-model.number="numberOfClasses"
                  label="Combien de classes voulez-vous créer ?"
                  type="number"
                  min="1"
                  variant="outlined"
                  color="primary"
                  prepend-inner-icon="mdi-numeric-positive-1"
                  hint="Le système générera automatiquement les numéros (ex: 6ème 1, 6ème 2)"
                  persistent-hint
                  class="mb-4"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="selectedCycle"
                  :items="['Cycle 1', 'Cycle 2']"
                  label="Cycle d'enseignement"
                  variant="outlined"
                  color="primary"
                  prepend-inner-icon="mdi-layers-triple"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="selectedPromotionId"
                  :items="promotions"
                  item-title="nom"
                  item-value="id"
                  label="Niveau / Promotion"
                  variant="outlined"
                  color="primary"
                  prepend-inner-icon="mdi-account-group-outline"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4"></v-divider>

            <div class="d-flex flex-column flex-sm-row gap-3">
              <v-btn
                size="large"
                color="indigo-darken-3"
                block
                class="rounded-lg font-weight-bold flex-grow-1"
                type="submit"
              >
                Lancer la création
              </v-btn>
              <v-btn
                size="large"
                variant="text"
                color="grey-darken-1"
                block
                class="rounded-lg"
                @click="closeClassDialog"
              >
                Annuler
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-row justify="center" v-if="activeForm === 'conduct'">
      <v-col cols="12" md="8" lg="6">
        <v-card class="rounded-xl border shadow-lg pa-4">
          <v-card-title class="text-h5 font-weight-bold px-4 pt-4 text-indigo">
            Note de conduite globale
          </v-card-title>
          <v-card-text>
            <v-form @submit.prevent="submitConductForm">
              <v-text-field
                v-model="conductNote"
                label="Note de base (ex: 20/20)"
                variant="outlined"
                color="indigo"
                prepend-inner-icon="mdi-star-check"
              />

              <v-select
                v-model="selectedSemestreId"
                :items="semestresOptions"
                item-title="name"
                item-value="id"
                label="Période scolaire"
                variant="outlined"
                prepend-inner-icon="mdi-calendar-clock"
              />

              <v-select
                v-model="selectedClassIds"
                :items="classesOptions"
                item-title="name"
                item-value="id"
                label="Sélectionnez les classes"
                multiple
                variant="outlined"
                chips
                closable-chips
                prepend-inner-icon="mdi-school-outline"
              />

              <v-btn
                size="large"
                color="indigo"
                block
                class="rounded-lg font-weight-bold mt-4"
                type="submit"
              >
                Attribuer les notes
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-fade-transition>
      <div v-if="activeForm === 'program'">
        <v-card class="rounded-xl border pa-4 shadow-sm">
          <Programme-cours
            :etablissement-id="etablissementId"
            :annee-scolaire="anneeScolaire"
            :annee-scolaire-id="anneeScolaireId"
          />
        </v-card>
      </div>
    </v-fade-transition>

    <v-fade-transition>
      <div v-if="showClasses">
        <v-row v-for="(classes, promotion) in classesByPromotion" :key="promotion" class="mb-8">
          <v-col cols="12">
            <div class="d-flex align-center px-2">
              <h3 class="text-h5 font-weight-bold text-indigo-darken-1">{{ promotion }}</h3>
              <v-divider class="ml-4"></v-divider>
              <v-chip class="ml-4" variant="tonal" color="indigo" size="small">
                {{ classes.length }} sections
              </v-chip>
            </div>
          </v-col>

          <v-col v-for="classe in classes" :key="classe.id" cols="12" sm="6" lg="4">
            <v-card class="rounded-xl border h-100 d-flex flex-column shadow-card overflow-hidden">
              <v-card-item class="bg-white">
                <template v-slot:prepend>
                  <v-avatar color="indigo-lighten-5" rounded="lg">
                    <v-icon color="indigo">mdi-door-open</v-icon>
                  </v-avatar>
                </template>
                <v-card-title class="font-weight-bold text-indigo-darken-4">
                  {{ classe.name }}
                </v-card-title>
                <v-card-subtitle>{{ classe.studentCount }} élèves inscrits</v-card-subtitle>
              </v-card-item>

              <v-divider opacity="0.05"></v-divider>

              <v-card-actions class="pa-4 bg-grey-lighten-5 justify-end">
                <v-btn
                  variant="elevated"
                  color="red-darken-1"
                  prepend-icon="mdi-delete-outline"
                  class="font-weight-bold px-2 px-sm-6"
                  @click="confirmDeleteClass(classe)"
                  rounded="lg"
                >
                  Supprimer
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </v-fade-transition>

    <v-dialog v-model="notifyDialog.show" max-width="450" persistent>
      <v-card class="rounded-xl pa-2">
        <v-card-text class="text-center pa-2 pa-sm-6">
          <v-avatar :color="notifyDialog.color" size="70" class="mb-4">
            <v-icon color="white" size="40">{{ notifyDialog.icon }}</v-icon>
          </v-avatar>
          <h2 class="text-h5 font-weight-bold mb-2">{{ notifyDialog.title }}</h2>
          <p class="text-body-1 text-grey-darken-1">{{ notifyDialog.message }}</p>
        </v-card-text>

        <v-card-actions class="pb-4 px-4 d-flex justify-center">
          <v-btn
            v-if="notifyDialog.isConfirm"
            color="grey-darken-1"
            variant="text"
            class="font-weight-bold px-2 px-sm-6"
            @click="notifyDialog.show = false"
          >
            Annuler
          </v-btn>
          <v-btn
            :color="notifyDialog.color"
            variant="elevated"
            rounded="pill"
            class="font-weight-bold px-2 px-sm-8 text-white"
            @click="handleDialogAction"
          >
            {{ notifyDialog.confirmText }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from 'axios';
import ProgrammeCours from './ProgrammeCours.vue';

export default {
  name: 'ClassManagement',
  components: { ProgrammeCours },
  props: {
    etablissementId: Number,
    etablissementNom: String,
    anneeScolaire: String,
    anneeScolaireId: Number
  },

  computed: {
    menuItems() {
      return [
        {
          title: 'Ajouter Classe',
          subtitle: 'Générer des sections par niveau',
          icon: 'mdi-plus-box-outline',
          color: 'indigo',
          action: () => {
            this.activeForm = 'addClass';
            this.classDialog = true;
          }
        },
        {
          title: 'Mes Classes',
          subtitle: 'Visualiser et supprimer',
          icon: 'mdi-google-classroom',
          color: 'blue',
          action: () => this.toggleClasses()
        },
        {
          title: 'Programme',
          subtitle: 'Configurer le curriculum',
          icon: 'mdi-book-open-page-variant-outline',
          color: 'teal',
          action: () => this.activateForm('program')
        },
        {
          title: 'Conduite',
          subtitle: 'Attribuer notes de comportement',
          icon: 'mdi-clipboard-text-clock-outline',
          color: 'orange',
          action: () => this.activateForm('conduct')
        }
      ];
    }
  },

  data() {
    return {
      activeForm: null,
      showClasses: false,
      classDialog: false,
      numberOfClasses: 1,
      selectedPromotionId: null,
      selectedCycle: '',
      conductNote: '',
      selectedSemestreId: null,
      selectedClassIds: [],
      promotions: [],
      semestresOptions: [],
      classesOptions: [],
      classesByPromotion: {},
      notifyDialog: {
        show: false,
        title: '',
        message: '',
        color: 'success',
        icon: 'mdi-check-circle',
        isConfirm: false,
        confirmText: "D'accord",
        actionType: null,
        targetId: null
      }
    };
  },

  methods: {
    triggerNotify(title, message, type = 'success', isConfirm = false, actionType = null, targetId = null) {
      const config = {
        success: { color: 'green-darken-1', icon: 'mdi-check-circle' },
        error: { color: 'red-darken-1', icon: 'mdi-alert-circle' },
        warning: { color: 'orange-darken-1', icon: 'mdi-alert' }
      };

      this.notifyDialog = {
        show: true,
        title,
        message,
        color: config[type].color,
        icon: config[type].icon,
        isConfirm,
        confirmText: isConfirm ? 'Confirmer' : "D'accord",
        actionType,
        targetId
      };
    },

    handleDialogAction() {
      if (this.notifyDialog.actionType === 'delete') {
        this.deleteClass(this.notifyDialog.targetId);
      }
      this.notifyDialog.show = false;
    },

    activateForm(formName) {
      this.activeForm = formName;
      this.showClasses = false;

      if (formName === 'conduct') {
        this.selectedClassIds = [];
        this.fetchClasses();
        console.log('[Conduite] Ouverture du formulaire de conduite');
      }
    },

    cancelForm() {
      this.activeForm = null;
      this.showClasses = false;
    },

    closeClassDialog() {
      this.classDialog = false;
      this.selectedPromotionId = null;
      this.selectedCycle = '';
      this.numberOfClasses = 1;
      this.activeForm = null;
    },

    toggleClasses() {
      this.showClasses = true;
      this.fetchClasses();
      this.activeForm = null;
    },

    submitForm() {
      if (!this.selectedPromotionId || !this.selectedCycle || !this.numberOfClasses) {
        this.triggerNotify('Champs requis', 'Veuillez remplir toutes les informations.', 'warning');
        return;
      }

      axios.post('/api/Classes/multiple', {
        promotion_id: this.selectedPromotionId,
        cycle: this.selectedCycle,
        nombre: this.numberOfClasses,
        etablissement_id: this.etablissementId
      })
      .then(() => {
        this.fetchClasses();
        this.closeClassDialog();
        this.triggerNotify('Succès', 'Les classes ont été créées avec succès.', 'success');
      })
      .catch((error) => {
        console.error('[Ajout classes] Erreur lors de la création :', error);
        this.triggerNotify('Erreur', 'Impossible de créer les classes.', 'error');
      });
    },

    submitConductForm() {
      if (!this.conductNote || this.selectedClassIds.length === 0 || !this.selectedSemestreId) {
        this.triggerNotify('Données manquantes', 'Saisie incomplète.', 'warning');
        return;
      }

      console.log('[Conduite] Classes sélectionnées pour attribution :', this.selectedClassIds);
      console.log('[Conduite] Données envoyées :', {
        note_conduite: this.conductNote,
        classe_ids: this.selectedClassIds,
        semestre_id: this.selectedSemestreId,
        etablissement_id: this.etablissementId,
        anneeScolaireId: this.anneeScolaireId
      });

      axios.post('/api/conduite', {
        note_conduite: this.conductNote,
        classe_ids: this.selectedClassIds,
        semestre_id: this.selectedSemestreId,
        etablissement_id: this.etablissementId,
        anneeScolaireId: this.anneeScolaireId
      })
      .then(() => {
        this.activeForm = null;
        this.triggerNotify('Réussite', 'Notes de conduite attribuées.', 'success');
      })
      .catch((error) => {
        console.error("[Conduite] Erreur lors de l'enregistrement :", error);
        this.triggerNotify('Erreur', "L'enregistrement a échoué.", 'error');
      });
    },

    fetchPromotions() {
      axios.get('/api/Promotions')
        .then((res) => {
          this.promotions = res.data;
        })
        .catch((error) => {
          console.error('[Promotions] Erreur de récupération :', error);
        });
    },

    fetchSemestre() {
      if (!this.etablissementId) return;

      axios.get(`/api/semesters/${this.etablissementId}`)
        .then((res) => {
          this.semestresOptions = res.data.map((s) => ({
            id: s.id,
            name: s.nom
          }));
        })
        .catch((error) => {
          console.error('[Semestres] Erreur de récupération :', error);
        });
    },

    fetchClasses() {
      axios.get(`/api/classetablissement/${this.etablissementId}`)
        .then((res) => {
          console.log('[Classes] Réponse brute API classetablissement :', res.data);

          this.classesByPromotion = res.data;

          this.classesOptions = Object.values(res.data)
            .flat()
            .map((cl) => ({
              id: cl.id,
              name: cl.name
            }));

          console.log('[Classes] Classes transformées pour le formulaire de conduite :', this.classesOptions);
        })
        .catch((error) => {
          console.error('[Classes] Erreur de récupération :', error);
          this.classesByPromotion = {};
          this.classesOptions = [];
        });
    },

    confirmDeleteClass(classe) {
      this.triggerNotify(
        'Confirmation',
        `Supprimer "${classe.name}" ?`,
        'warning',
        true,
        'delete',
        classe.id
      );
    },

    deleteClass(id) {
      axios.delete(`/api/Classes/${id}`, {
        data: { etablissement_id: this.etablissementId }
      })
      .then(() => {
        this.fetchClasses();
        this.triggerNotify('Supprimé', 'La classe a été retirée.', 'success');
      })
      .catch((error) => {
        console.error('[Suppression classe] Erreur :', error);
        this.triggerNotify('Action impossible', 'La classe contient encore des élèves.', 'error');
      });
    }
  },

  mounted() {
    this.fetchSemestre();
    this.fetchPromotions();
    this.fetchClasses();
  }
};
</script>

<style scoped>
.management-wrapper {
  background-color: #f8faff;
  min-height: 90vh;
}

.shadow-card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
  transition: all 0.3s ease;
}

.shadow-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.1) !important;
}

.cursor-pointer {
  cursor: pointer;
}

.gap-3 {
  gap: 12px;
}

@media (max-width: 600px) {
  .text-h4 {
    font-size: 1.5rem !important;
  }
}
</style>