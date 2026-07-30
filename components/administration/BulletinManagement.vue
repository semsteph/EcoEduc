<template>
  <v-container fluid class="pa-4 bg-grey-lighten-4">
    <v-row align="center" class="mb-6">
      <v-col cols="auto">
        <v-btn
          icon
          variant="elevated"
          color="white"
          elevation="2"
          @click="selectedClassId ? clearSelection() : $emit('back')"
        >
          <v-icon color="blue-darken-3">mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>

      <v-col>
        <h1 class="text-h5 font-weight-bold text-blue-darken-4 d-flex align-center">
          <v-icon start size="32" color="blue-darken-3">mdi-file-certificate</v-icon>
          {{ selectedClassId ? 'Édition des Bulletins' : 'Gestion des Bulletins' }}
        </h1>

        <div class="text-caption text-grey-darken-1 d-flex align-center flex-wrap ga-2">
          <span>{{ etablissementNom }}</span>
          <span>•</span>
          <v-chip size="x-small" color="blue-darken-3" variant="flat">
            {{ effectiveAnneeScolaire }}
          </v-chip>
          <v-chip
            size="x-small"
            :color="effectiveAnneeStatutColor"
            variant="flat"
          >
            {{ effectiveAnneeStatut }}
          </v-chip>
        </div>
      </v-col>
    </v-row>

    <!-- FORMULAIRE CHOIX ANNEE -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-card border flat class="rounded-xl overflow-hidden elevation-1">
          <v-toolbar color="indigo-lighten-5" flat>
            <v-icon start color="indigo-darken-3" class="ml-4">mdi-calendar-search</v-icon>
            <span class="text-subtitle-1 font-weight-bold text-indigo-darken-3">
              Historique des bulletins par année scolaire
            </span>
          </v-toolbar>

          <v-card-text class="pa-4 pa-md-5">
            <v-row dense align="center">
              <v-col cols="12" md="8" lg="7">
                <v-alert
                  type="info"
                  variant="tonal"
                  rounded="lg"
                  class="mb-4"
                  icon="mdi-information-outline"
                >
                  Choisissez une année scolaire si vous voulez accéder à l’historique des bulletins d’une année précise.
                  Si vous ne choisissez rien, l’année scolaire transmise par le composant parent sera utilisée automatiquement.
                </v-alert>

                <v-select
                  v-model="selectedAnneeScolaireId"
                  :items="anneesScolairesOptions"
                  item-title="title"
                  item-value="value"
                  label="Choisir une année scolaire"
                  placeholder="Sélectionnez une année scolaire"
                  outlined
                  dense
                  clearable
                  hide-details="auto"
                  class="custom-select"
                  :loading="loadingAnnees"
                  :disabled="loadingAnnees"
                  @update:modelValue="handleSelectedAnneeChange"
                  @click:clear="resetSelectedAnnee"
                >
                  <template v-slot:item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-avatar size="36" color="indigo-lighten-4">
                          <v-icon color="indigo-darken-4">mdi-calendar-range</v-icon>
                        </v-avatar>
                      </template>

                      <v-list-item-title class="font-weight-bold">
                        {{ item.raw.title }}
                      </v-list-item-title>

                      <v-list-item-subtitle>
                        <v-chip
                          x-small
                          :color="getStatutColor(item.raw.statut)"
                          variant="flat"
                          class="mt-1"
                        >
                          {{ item.raw.statut || 'Statut inconnu' }}
                        </v-chip>
                      </v-list-item-subtitle>
                    </v-list-item>
                  </template>

                  <template v-slot:selection="{ item }">
                    <div class="d-flex align-center ga-2">
                      <span class="font-weight-medium">{{ item.raw.title }}</span>
                      <v-chip
                        x-small
                        :color="getStatutColor(item.raw.statut)"
                        variant="flat"
                      >
                        {{ item.raw.statut || 'Statut inconnu' }}
                      </v-chip>
                    </div>
                  </template>

                  <template v-slot:no-data>
                    <v-list-item>
                      <v-list-item-title>Aucune année scolaire trouvée</v-list-item-title>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>

              <v-col cols="12" md="4" lg="5">
                <v-card variant="outlined" class="rounded-lg selected-year-card">
                  <v-card-text>
                    <div class="text-overline text-grey-darken-1 mb-2">
                      Année scolaire utilisée
                    </div>

                    <div class="text-h6 font-weight-bold text-indigo-darken-4 mb-2">
                      {{ effectiveAnneeScolaire || 'Aucune année scolaire' }}
                    </div>

                    <v-chip
                      size="small"
                      :color="effectiveAnneeStatutColor"
                      variant="flat"
                      class="mb-3"
                    >
                      {{ effectiveAnneeStatut }}
                    </v-chip>

                    <div class="text-caption text-grey-darken-1">
                      {{
                        selectedAnneeScolaireId
                          ? "Vous consultez l’historique des bulletins de l’année scolaire sélectionnée."
                          : "Aucune année sélectionnée : l’année scolaire reçue du composant parent est utilisée."
                      }}
                    </div>

                    <div class="mt-4 d-flex flex-wrap ga-2">
                      <v-btn
                        color="indigo-darken-2"
                        variant="flat"
                        class="text-none"
                        :loading="loadingAnnees"
                        @click="fetchAnneesScolaires"
                      >
                        Actualiser
                      </v-btn>

                      <v-btn
                        v-if="selectedAnneeScolaireId"
                        color="grey-darken-1"
                        variant="outlined"
                        class="text-none"
                        @click="resetSelectedAnnee"
                      >
                        Utiliser l’année par défaut
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- CLASSES -->
    <v-row>
      <v-col cols="12">
        <v-window v-model="activeView" disabled>
          <v-window-item value="list">
            <v-card border flat class="rounded-xl overflow-hidden elevation-1 w-100">
              <v-toolbar color="blue-lighten-5" flat px-4>
                <v-icon start color="blue-darken-3" class="ml-4">mdi-layers-outline</v-icon>
                <span class="text-subtitle-1 font-weight-bold text-blue-darken-3">
                  Sélectionnez une classe pour générer les bulletins
                </span>
              </v-toolbar>

              <v-card-text class="pa-4 pa-md-6">
                <v-row v-if="loading" justify="center" class="py-12">
                  <v-progress-circular indeterminate color="blue-darken-3" size="48"></v-progress-circular>
                </v-row>

                <v-row v-else dense>
                  <template v-if="classes.length > 0">
                    <v-col
                      v-for="classe in classes"
                      :key="classe.id"
                      cols="12"
                      sm="6"
                      md="4"
                      lg="3"
                    >
                      <v-hover v-slot:default="{ isHovering, props }">
                        <v-card
                          v-bind="props"
                          variant="outlined"
                          class="class-bulletin-card rounded-lg transition-swing"
                          :class="{ 'on-hover': isHovering }"
                          @click="goToClass(classe.id)"
                          ripple
                        >
                          <v-card-text class="text-center pa-2 pa-sm-6">
                            <v-avatar color="blue-lighten-4" size="64" class="mb-4">
                              <v-icon color="blue-darken-4" size="32">mdi-google-classroom</v-icon>
                            </v-avatar>

                            <div class="text-h6 font-weight-black text-blue-darken-4 mb-1">
                              {{ classe.nom }}
                            </div>

                            <v-chip
                              size="x-small"
                              variant="tonal"
                              color="blue-darken-2"
                              class="font-weight-bold"
                            >
                              PRÊT POUR ÉDITION
                            </v-chip>
                          </v-card-text>

                          <v-divider opacity="0.1"></v-divider>

                          <v-card-actions class="justify-center bg-blue-lighten-5 pa-1">
                            <v-btn
                              variant="text"
                              block
                              size="small"
                              color="blue-darken-4"
                              class="text-none font-weight-bold"
                            >
                              Générer les bulletins
                            </v-btn>
                          </v-card-actions>
                        </v-card>
                      </v-hover>
                    </v-col>
                  </template>

                  <template v-else>
                    <v-col cols="12">
                      <v-alert
                        type="info"
                        variant="tonal"
                        rounded="lg"
                        icon="mdi-information-outline"
                        class="blue-lighten-5 text-blue-darken-4"
                      >
                        <div class="text-subtitle-2 font-weight-bold">Aucune classe disponible</div>
                        <div class="text-caption">
                          Configurez vos classes dans le menu "Gestion des classes" pour commencer l'édition des bulletins.
                        </div>
                      </v-alert>
                    </v-col>
                  </template>
                </v-row>
              </v-card-text>
            </v-card>
          </v-window-item>

          <v-window-item value="detail">
            <div class="w-100">
              <bulletin-details
                v-if="selectedClassId"
                :class-id="selectedClassId"
                :annee-scolaire="effectiveAnneeScolaire"
                :annee-scolaire-id="effectiveAnneeScolaireId"
                :etablissement-id="etablissementId"
                :etablissement-nom="etablissementNom"
                @back="clearSelection"
              />
            </div>
          </v-window-item>
        </v-window>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import axios from 'axios'
import BulletinDetails from './BulletinDetails.vue'

export default {
  name: 'BulletinManagement',
  components: {
    BulletinDetails
  },
  props: {
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, default: '' },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true }
  },
  data: () => ({
    classes: [],
    anneesScolaires: [],
    selectedAnneeScolaireId: null,
    selectedAnneeScolaireNom: '',
    selectedAnneeScolaireStatut: '',
    selectedClassId: null,
    loading: false,
    loadingAnnees: false,
    activeView: 'list'
  }),
  computed: {
    anneesScolairesOptions() {
      const options = this.anneesScolaires.map((annee) => ({
        title: annee.nom_annee || 'Année sans nom',
        value: Number(annee.id),
        statut: annee.statut || 'Statut inconnu',
        raw: annee
      }))

      console.log('[FRONT][computed] anneesScolairesOptions =', options)
      return options
    },

    effectiveAnneeScolaireId() {
      return this.selectedAnneeScolaireId || this.anneeScolaireId
    },

    effectiveAnneeScolaire() {
      return this.selectedAnneeScolaireNom || this.anneeScolaire
    },

    effectiveAnneeStatut() {
      if (this.selectedAnneeScolaireId) {
        return this.selectedAnneeScolaireStatut || 'Statut inconnu'
      }

      const parentYear = this.anneesScolaires.find(
        (item) => Number(item.id) === Number(this.anneeScolaireId)
      )

      console.log('[FRONT][computed] parentYear trouvé =', parentYear)

      return parentYear?.statut || 'Statut inconnu'
    },

    effectiveAnneeStatutColor() {
      return this.getStatutColor(this.effectiveAnneeStatut)
    }
  },
  methods: {
    async fetchClasses() {
      this.loading = true
      try {
        const response = await axios.get(`/api/classe/${this.etablissementId}`)
        console.log('[FRONT] classes récupérées =', response.data)
        this.classes = response.data
      } catch (error) {
        console.error('Erreur lors de la récupération des classes:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchAnneesScolaires() {
      if (!this.etablissementId) {
        console.warn('[FRONT] etablissementId absent, impossible de charger les années scolaires')
        return
      }

      this.loadingAnnees = true

      try {
        console.log('[FRONT] chargement années scolaires pour etablissementId =', this.etablissementId)

        const response = await axios.get(
          `/api/annees-scolaires/etablissement/${this.etablissementId}`
        )

        console.log('[FRONT] réponse brute API années scolaires =', response)
        console.log('[FRONT] response.data =', response.data)
        console.log('[FRONT] response.data.anneesScolaires =', response?.data?.anneesScolaires)

        const annees = Array.isArray(response?.data?.anneesScolaires)
          ? response.data.anneesScolaires
          : []

        this.anneesScolaires = annees.map((item) => ({
          id: Number(item.id),
          nom_annee: item.nom_annee || '',
          statut: item.statut || 'Statut inconnu'
        }))

        console.log('[FRONT] anneesScolaires normalisées =', this.anneesScolaires)
      } catch (error) {
        console.error('Erreur lors de la récupération des années scolaires :', error)
        console.error('[FRONT] error.response =', error?.response)
        console.error('[FRONT] error.response.data =', error?.response?.data)
        this.anneesScolaires = []
      } finally {
        this.loadingAnnees = false
      }
    },

    handleSelectedAnneeChange(value) {
      console.log('[FRONT] valeur sélectionnée dans le v-select =', value)
      console.log('[FRONT] anneesScolaires disponibles =', this.anneesScolaires)

      if (!value) {
        this.resetSelectedAnnee()
        return
      }

      const anneeChoisie = this.anneesScolaires.find(
        (item) => Number(item.id) === Number(value)
      )

      console.log('[FRONT] année choisie trouvée =', anneeChoisie)

      if (anneeChoisie) {
        this.selectedAnneeScolaireId = Number(anneeChoisie.id)
        this.selectedAnneeScolaireNom = anneeChoisie.nom_annee || ''
        this.selectedAnneeScolaireStatut = anneeChoisie.statut || 'Statut inconnu'
      } else {
        console.warn('[FRONT] aucune année trouvée pour la valeur =', value)
        this.resetSelectedAnnee()
      }

      console.log('[FRONT] selectedAnneeScolaireId =', this.selectedAnneeScolaireId)
      console.log('[FRONT] selectedAnneeScolaireNom =', this.selectedAnneeScolaireNom)
      console.log('[FRONT] selectedAnneeScolaireStatut =', this.selectedAnneeScolaireStatut)
    },

    resetSelectedAnnee() {
      console.log('[FRONT] resetSelectedAnnee() appelé')
      this.selectedAnneeScolaireId = null
      this.selectedAnneeScolaireNom = ''
      this.selectedAnneeScolaireStatut = ''
    },

    getStatutColor(statut) {
      const value = String(statut || '').toLowerCase()

      if (value.includes('en cours')) return 'success'
      if (value.includes('clôturée') || value.includes('cloturee')) return 'error'
      if (value.includes('ouverte')) return 'primary'
      return 'grey-darken-1'
    },

    goToClass(classId) {
      console.log('[FRONT] classe sélectionnée =', classId)
      console.log('[FRONT] année utilisée pour enfant =', {
        anneeScolaireId: this.effectiveAnneeScolaireId,
        anneeScolaire: this.effectiveAnneeScolaire,
        statut: this.effectiveAnneeStatut
      })

      this.selectedClassId = classId
      this.activeView = 'detail'
    },

    clearSelection() {
      this.selectedClassId = null
      this.activeView = 'list'
    }
  },
  created() {
    console.log('[FRONT] props reçues =', {
      etablissementId: this.etablissementId,
      etablissementNom: this.etablissementNom,
      anneeScolaire: this.anneeScolaire,
      anneeScolaireId: this.anneeScolaireId
    })

    this.fetchClasses()
    this.fetchAnneesScolaires()
  }
}
</script>

<style scoped>
.w-100 {
  width: 100% !important;
}

.class-bulletin-card {
  border: 1px solid #E3F2FD !important;
  background-color: white !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.on-hover {
  border-color: #1565C0 !important;
  transform: translateY(-6px);
  box-shadow: 0 12px 20px rgba(21, 101, 192, 0.1) !important;
}

.transition-swing {
  transition: 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.selected-year-card {
  background: linear-gradient(180deg, #ffffff 0%, #f5f7ff 100%);
  border: 1px solid #dbe3ff !important;
}

.custom-select :deep(.v-input__slot) {
  border-radius: 14px !important;
}

@media (max-width: 600px) {
  .text-h6 {
    font-size: 1rem !important;
  }

  h1 {
    font-size: 1.15rem !important;
  }
}
</style>