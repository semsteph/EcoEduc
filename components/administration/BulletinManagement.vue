<template>
  <v-container fluid class="pa-3 bg-grey-lighten-4">
    <v-row align="center" class="mb-3">
      <v-col cols="auto">
      </v-col>

      <v-col>
        <h1 class="text-h6 font-weight-bold text-blue-darken-4 d-flex align-center">
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

    <!-- Année consultée : l'année en cours par défaut, ou une année passée
         (historique des bulletins). -->
    <div class="year-bar mb-3">
      <v-icon size="small" color="indigo-darken-3">mdi-calendar-search</v-icon>
      <span class="year-bar-label">Année :</span>
      <v-select
        v-model="selectedAnneeScolaireId"
        :items="anneesScolairesOptions"
        item-title="title"
        item-value="value"
        :placeholder="effectiveAnneeScolaire || 'Année en cours'"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        class="year-bar-select"
        :loading="loadingAnnees"
        @update:modelValue="handleSelectedAnneeChange"
        @click:clear="resetSelectedAnnee"
      />
      <span v-if="selectedAnneeScolaireId" class="year-bar-hint">Historique</span>
    </div>

    <!-- CLASSES -->
    <v-row>
      <v-col cols="12">
        <v-window v-model="activeView" disabled>
          <v-window-item value="list">
            <v-card border flat class="rounded-lg overflow-hidden elevation-1 w-100">
              <v-toolbar height="40" color="blue-lighten-5" flat px-3>
                <v-icon start color="blue-darken-3" class="ml-4">mdi-layers-outline</v-icon>
                <span class="text-subtitle-1 font-weight-bold text-blue-darken-3">
                  Choisissez une classe
                </span>
              </v-toolbar>

              <v-card-text class="pa-3 pa-md-3">
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
                          <v-card-text class="text-center pa-2 pa-sm-3">
                            <v-avatar color="blue-lighten-4" size="32" class="mb-2">
                              <v-icon size="18" color="blue-darken-4">mdi-google-classroom</v-icon>
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
                              Bulletins
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
                              Ouvrir
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
                v-if="selectedClassId && (!selectedAnneeScolaireId || selectedAnneeScolaireNom)"
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
    anneeScolaireId: { type: Number, required: true },
    classeId: { type: Number, default: null }
  },
  emits: ['back', 'ouvrir-classe'],
  setup() {
    // Année scolaire choisie (historique des bulletins), gardée dans l'adresse (?annee=...).
    const selectedAnneeScolaireId = useUrlState('annee', null, { type: 'number' })
    return { selectedAnneeScolaireId }
  },
  data: () => ({
    classes: [],
    anneesScolaires: [],
    selectedAnneeScolaireNom: '',
    selectedAnneeScolaireStatut: '',
    loading: false,
    loadingAnnees: false,
    activeView: 'list'
  }),
  watch: {
    classeId: {
      handler(id) {
        this.activeView = id ? 'detail' : 'list'
      },
      immediate: true
    }
  },
  computed: {
    // Classe ouverte : donnée par la route (…/<classeId>). La changer émet
    // « ouvrir-classe » et la page va vers la nouvelle adresse.
    selectedClassId: {
      get() { return this.classeId },
      set(id) { this.$emit('ouvrir-classe', id) }
    },
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
        const token = localStorage.getItem('token')
        const response = await axios.get(`/api/classe/${this.etablissementId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        console.log('[FRONT] classes récupérées =', response.data)
        this.classes = response.data
        // Classe inconnue dans l'adresse : retour à la liste des classes.
        if (this.classeId && !this.classes.some((c) => Number(c.id) === this.classeId)) {
          this.selectedClassId = null
        }
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
        // Année relue dans l'adresse : on retrouve son nom et son statut.
        if (this.selectedAnneeScolaireId) {
          this.handleSelectedAnneeChange(this.selectedAnneeScolaireId)
        }
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
    },

    clearSelection() {
      this.selectedClassId = null
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
.year-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.year-bar-label { font-weight: 700; font-size: 0.85rem; color: #283593; }
.year-bar-select { max-width: 220px; min-width: 160px; }
.year-bar-hint { font-size: 0.75rem; color: #6d4c41; background: #fff3e0; padding: 2px 8px; border-radius: 10px; }
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
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08)!important;
}

.transition-swing {
  transition: 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.selected-year-card {
  background: linear-gradient(180deg, #ffffff 0%, #f5f7ff 100%);
  border: 1px solid #dbe3ff !important;
}

.custom-select :deep(.v-input__slot) {
  border-radius: 10px!important;
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