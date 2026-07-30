<template>
  <v-container fluid class="pa-4 bg-grey-lighten-4">

    <v-row align="center" class="mb-6">
      <v-col cols="auto">
        <v-btn
          icon
          variant="elevated"
          color="white"
          @click="selectedClassId ? clearSelection() : $emit('back')"
          elevation="2"
        >
          <v-icon color="success">mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>

      <v-col>
        <h1 class="text-h5 font-weight-bold text-success d-flex align-center">
          <v-icon start size="32">mdi-cash-multiple</v-icon>

          {{
            selectedClassId
              ? 'Scolarité : ' + selectedClassName
              : 'Gestion de la Scolarité'
          }}
        </h1>

        <div class="text-caption text-grey-darken-1">
          Etablissement : {{ etablissementNom }}
          | {{ anneeScolaire }}
        </div>
      </v-col>

      <v-col cols="auto">
        <v-btn
          color="warning"
          variant="tonal"
          prepend-icon="mdi-clock-alert-outline"
          rounded="pill"
          @click="openPendingDialog"
        >
          Paiements à valider
          <v-badge
            v-if="pendingPayments.length > 0"
            :content="pendingPayments.length"
            color="error"
            inline
          />
        </v-btn>
      </v-col>
    </v-row>

    <!-- Dialogue : paiements déclarés par les parents, en attente de validation -->
    <v-dialog v-model="pendingDialog" max-width="720">
      <v-card class="rounded-xl">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Paiements déclarés par les parents</span>
          <v-btn icon variant="text" @click="pendingDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <v-row v-if="pendingLoading" justify="center" class="py-6">
            <v-progress-circular indeterminate color="warning" />
          </v-row>

          <v-alert
            v-else-if="pendingPayments.length === 0"
            type="success"
            variant="tonal"
            rounded="lg"
            text="Aucun paiement en attente de validation."
          />

          <v-list v-else lines="three">
            <v-list-item
              v-for="p in pendingPayments"
              :key="p.id"
              class="mb-3 rounded-lg"
              style="border: 1px solid rgba(0,0,0,0.08);"
            >
              <template #prepend>
                <a :href="'' + p.preuveUrl" target="_blank" rel="noopener">
                  <v-avatar size="56" rounded="lg" class="mr-2">
                    <v-img :src="'' + p.preuveUrl" cover />
                  </v-avatar>
                </a>
              </template>

              <v-list-item-title class="font-weight-bold">
                {{ p.nom }} {{ p.prenom }} — {{ formatMoney(p.montant) }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ p.modePaiement }} • {{ formatDate(p.datePaiement) }}
                <span v-if="p.reference"> • Réf: {{ p.reference }}</span>
              </v-list-item-subtitle>
              <v-list-item-subtitle v-if="p.parentNom">
                Déclaré par {{ p.parentNom }} {{ p.parentPrenom }}
              </v-list-item-subtitle>

              <template #append>
                <v-btn
                  size="small"
                  color="success"
                  class="mr-2"
                  :loading="processingId === p.id"
                  @click="validerPaiement(p)"
                >
                  Valider
                </v-btn>
                <v-btn
                  size="small"
                  color="error"
                  variant="tonal"
                  :loading="processingId === p.id"
                  @click="rejeterPaiement(p)"
                >
                  Rejeter
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-row>
      <v-col cols="12">

        <v-window v-model="viewTransition" disabled>

          <!-- Liste des classes -->
          <v-window-item value="list">

            <v-card
              border
              flat
              class="rounded-xl pa-2 pa-md-6 w-100"
            >
              <v-card-title class="px-4 pt-4">
                <span class="text-subtitle-1 font-weight-medium text-grey-darken-2">
                  Sélectionnez une classe pour gérer les frais scolaires
                </span>
              </v-card-title>

              <v-card-text class="mt-4">

                <v-row
                  v-if="loading"
                  justify="center"
                  align="center"
                  class="py-10"
                >
                  <v-progress-circular indeterminate color="success" />
                </v-row>

                <v-row v-else>

                  <template v-if="classes.length > 0">

                    <v-col
                      v-for="classe in classes"
                      :key="classe.id"
                      cols="12"
                      sm="6"
                      md="4"
                      lg="3"
                    >
                      <v-card
                        class="class-card rounded-xl text-center"
                        @click="goToClass(classe.id, classe.nom)"
                        ripple
                      >
                        <v-card-text>
                          <v-avatar color="success" size="65" class="mb-4">
                            <v-icon color="white" size="34">mdi-cash-register</v-icon>
                          </v-avatar>

                          <div class="text-h6 font-weight-bold">
                            {{ classe.nom }}
                          </div>

                          <div class="text-caption text-grey mt-2">
                            {{ anneeScolaire }}
                          </div>

                          <v-divider class="my-3" />

                          <v-btn
                            color="success"
                            variant="tonal"
                            prepend-icon="mdi-currency-usd"
                          >
                            Ouvrir la scolarité
                          </v-btn>
                        </v-card-text>
                      </v-card>
                    </v-col>

                  </template>

                  <template v-else>
                    <v-col cols="12">
                      <v-alert
                        type="info"
                        variant="tonal"
                        rounded="lg"
                        icon="mdi-information-outline"
                        title="Aucune classe trouvée"
                        text="Veuillez d'abord créer des classes."
                      />
                    </v-col>
                  </template>

                </v-row>

              </v-card-text>
            </v-card>

          </v-window-item>

          <!-- Détail de la scolarité -->
          <v-window-item value="detail">

            <div class="w-100">
              <ScolariteDetail
                v-if="selectedClassId"
                ref="scolariteDetailRef"
                :class-id="selectedClassId"
                :class-name="selectedClassName"
                :annee-scolaire="anneeScolaire"
                :annee-scolaire-id="anneeScolaireId"
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
import ScolariteDetail from './ScolariteDetail.vue'

export default {
  name: 'ScolariteManager',

  components: {
    ScolariteDetail
  },

  props: {
    etablissementId: {
      type: Number,
      required: true
    },
    etablissementNom: {
      type: String,
      required: true
    },
    anneeScolaire: {
      type: String,
      required: true
    },
    anneeScolaireId: {
      type: Number,
      required: true
    }
  },

  data() {
    return {
      classes: [],
      selectedClassId: null,
      selectedClassName: '',
      loading: false,
      viewTransition: 'list',

      pendingPayments: [],
      pendingDialog: false,
      pendingLoading: false,
      processingId: null
    }
  },

  methods: {

    authHeaders() {
      const token = localStorage.getItem('token')
      return token ? { headers: { Authorization: `Bearer ${token}` } } : {}
    },

    async fetchPendingPayments() {
      try {
        const response = await axios.get(
          `/api/scolarite/paiements-en-attente/${this.etablissementId}/${this.anneeScolaireId}`,
          this.authHeaders()
        )
        this.pendingPayments = response.data
      } catch (error) {
        console.error('Erreur lors du chargement des paiements en attente :', error)
      }
    },

    openPendingDialog() {
      this.pendingDialog = true
      this.pendingLoading = true
      this.fetchPendingPayments().finally(() => { this.pendingLoading = false })
    },

    async validerPaiement(p) {
      this.processingId = p.id
      try {
        await axios.put(`/api/scolarite/paiement/${p.id}/valider`, {}, this.authHeaders())
        await this.fetchPendingPayments()
        this.$refs.scolariteDetailRef?.fetchStudents()
      } catch (error) {
        console.error('Erreur lors de la validation :', error)
      } finally {
        this.processingId = null
      }
    },

    async rejeterPaiement(p) {
      const motif = window.prompt('Motif du rejet (optionnel) :', '') || ''
      this.processingId = p.id
      try {
        await axios.put(`/api/scolarite/paiement/${p.id}/rejeter`, { motif }, this.authHeaders())
        await this.fetchPendingPayments()
      } catch (error) {
        console.error('Erreur lors du rejet :', error)
      } finally {
        this.processingId = null
      }
    },

    formatMoney(value) {
      const montant = Number(value) || 0
      return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA'
    },

    formatDate(value) {
      if (!value) return '—'
      const d = new Date(value)
      if (isNaN(d)) return value
      return d.toLocaleDateString('fr-FR')
    },

    async fetchClasses() {
      this.loading = true

      try {
        const response = await axios.get(
          `/api/classe/${this.etablissementId}`
        )
        this.classes = response.data
      } catch (error) {
        console.error('Erreur lors du chargement des classes :', error)
      } finally {
        this.loading = false
      }
    },

    goToClass(classId, className) {
      this.selectedClassId = classId
      this.selectedClassName = className
      this.viewTransition = 'detail'
    },

    clearSelection() {
      this.selectedClassId = null
      this.selectedClassName = ''
      this.viewTransition = 'list'
    }

  },

  created() {
    this.fetchClasses()
    this.fetchPendingPayments()
  }
}
</script>

<style scoped>
.w-100 {
  width: 100%;
}

.class-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.class-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.12);
  border-color: rgb(var(--v-theme-success));
}

@media (max-width: 600px) {
  .v-card-title {
    font-size: 1rem !important;
  }

  .v-avatar {
    width: 55px !important;
    height: 55px !important;
  }
}
</style>