<template>
  <div class="dashboard-home">
    <div class="d-flex align-center justify-space-between mb-3 flex-wrap ga-2">
      <div>
        <h2 class="dash-title font-weight-bold text-primary">Tableau de bord</h2>
        <div class="text-body-2 text-medium-emphasis">
          {{ etablissementNom }} · Année scolaire en cours
        </div>
      </div>
      <v-btn
        variant="tonal"
        color="primary"
        prepend-icon="mdi-refresh"
        :loading="loading"
        @click="fetchStats"
      >
        Actualiser
      </v-btn>
    </div>

    <!-- Admis de 3ème en attente de leur série de 2nde -->
    <v-alert v-if="aOrienter > 0" type="warning" variant="tonal" class="mb-3" prepend-icon="mdi-sign-direction">
      <div class="d-flex align-center flex-wrap ga-2">
        <span class="flex-grow-1"><strong>{{ aOrienter }} élève(s) de 2nde</strong> attendent le choix de leur série : ils ne peuvent pas encore recevoir de notes.</span>
        <v-btn size="small" color="warning" variant="flat" to="/administration/dashbord/eleves/orientation">Orienter</v-btn>
      </div>
    </v-alert>

    <!-- Premiers pas : visible tant que la mise en place n'est pas terminée -->
    <v-card v-if="demarrage && !demarrage.termine" class="rounded-lg pa-3 mb-3 demarrage" elevation="0">
      <div class="demarrage-titre">
        <v-icon color="primary" class="mr-2">mdi-rocket-launch-outline</v-icon>
        Premiers pas : {{ etapesFaites }}/{{ demarrage.etapes.length }} étapes
      </div>
      <v-progress-linear :model-value="(etapesFaites / demarrage.etapes.length) * 100" color="primary" rounded height="6" class="my-2" />
      <div v-for="(e, i) in demarrage.etapes" :key="e.cle" class="demarrage-etape" :class="{ 'is-fait': e.fait, 'is-suivante': e.cle === prochaineEtape }">
        <v-icon size="20" :color="e.fait ? 'success' : 'grey'">{{ e.fait ? 'mdi-check-circle' : 'mdi-numeric-' + (i + 1) + '-circle-outline' }}</v-icon>
        <div class="demarrage-texte">
          <div class="demarrage-nom">{{ e.titre }}</div>
          <div class="demarrage-aide">{{ e.fait ? `${e.nombre} enregistré(s)` : e.aide }}</div>
        </div>
        <v-btn v-if="!e.fait" size="small" :variant="e.cle === prochaineEtape ? 'flat' : 'text'" color="primary" :to="e.lien">
          {{ e.cle === prochaineEtape ? 'Commencer' : 'Ouvrir' }}
        </v-btn>
      </div>
    </v-card>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-3" density="compact">
      {{ error }}
    </v-alert>

    <div v-if="anneeScolaireId">
    <!-- KPI -->
    <v-row dense>
      <v-col cols="6" md="3" v-for="(kpi, i) in kpis" :key="i">
        <v-card class="rounded-lg pa-3 kpi-card" elevation="0">
          <div class="d-flex align-center">
            <v-avatar :color="kpi.color" variant="tonal" size="32" class="mr-2 flex-shrink-0">
              <v-icon :color="kpi.color" size="18">{{ kpi.icon }}</v-icon>
            </v-avatar>
            <div class="kpi-body">
              <div class="kpi-label text-medium-emphasis font-weight-medium text-uppercase">
                {{ kpi.title }}
              </div>
              <div class="kpi-value font-weight-bold">
                <v-skeleton-loader v-if="loading" type="text" width="60" />
                <span v-else>{{ kpi.value }}</span>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Finances -->
    <v-row dense class="mt-1">
      <v-col cols="12" md="5">
        <v-card class="rounded-lg pa-3 fill-height dash-card" elevation="0">
          <div class="d-flex align-center justify-space-between flex-wrap ga-1 mb-2">
            <span class="text-subtitle-2 font-weight-bold">Situation financière</span>
            <v-chip
              v-if="stats.finances.paiementsEnAttente > 0"
              color="warning"
              variant="flat"
              size="small"
              prepend-icon="mdi-clock-alert-outline"
            >
              {{ stats.finances.paiementsEnAttente }} en attente
            </v-chip>
          </div>

          <div class="money-value font-weight-bold mb-1">{{ formatMoney(stats.finances.montantPaye) }}</div>
          <div class="text-caption text-medium-emphasis mb-3">
            collectés sur {{ formatMoney(stats.finances.montantTotal) }} attendus
          </div>

          <v-progress-linear
            :model-value="stats.finances.tauxRecouvrement"
            height="6"
            rounded
            :color="recouvrementColor"
            bg-color="grey-lighten-3"
            class="mb-2"
          />
          <div class="d-flex justify-space-between flex-wrap ga-1 text-caption text-medium-emphasis mb-3">
            <span>{{ stats.finances.tauxRecouvrement }}% recouvré</span>
            <span>Reste : {{ formatMoney(stats.finances.reste) }}</span>
          </div>

          <div class="text-subtitle-2 font-weight-bold mb-2">Encaissements (12 derniers mois)</div>
          <ClientOnly>
            <apexchart
              type="area"
              height="160"
              :options="paiementsChartOptions"
              :series="paiementsChartSeries"
            />
          </ClientOnly>
        </v-card>
      </v-col>

      <v-col cols="12" md="7">
        <v-card class="rounded-lg pa-3 fill-height dash-card" elevation="0">
          <div class="text-subtitle-2 font-weight-bold mb-2">Effectifs par classe</div>
          <ClientOnly>
            <apexchart
              type="bar"
              :height="effectifsHeight"
              :options="effectifsChartOptions"
              :series="effectifsChartSeries"
            />
          </ClientOnly>
        </v-card>
      </v-col>
    </v-row>

    <!-- Répartition + moyennes -->
    <v-row dense class="mt-1">
      <v-col cols="12" md="4">
        <v-card class="rounded-lg pa-3 fill-height dash-card" elevation="0">
          <div class="text-subtitle-2 font-weight-bold mb-2">Répartition par genre</div>
          <ClientOnly>
            <apexchart
              type="donut"
              height="220"
              :options="genreChartOptions"
              :series="genreChartSeries"
            />
          </ClientOnly>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card class="rounded-lg pa-3 fill-height dash-card" elevation="0">
          <div class="d-flex align-center justify-space-between flex-wrap ga-1 mb-2">
            <span class="text-subtitle-2 font-weight-bold">Moyenne générale par classe</span>
            <div class="d-flex align-center ga-2">
              <span class="legend-dot" style="background:#0ca30c"></span>
              <span class="text-caption text-medium-emphasis mr-3">≥ 10/20</span>
              <span class="legend-dot" style="background:#d03b3b"></span>
              <span class="text-caption text-medium-emphasis">&lt; 10/20</span>
            </div>
          </div>
          <ClientOnly>
            <apexchart
              v-if="moyenneChartSeries[0].data.length"
              type="bar"
              height="220"
              :options="moyenneChartOptions"
              :series="moyenneChartSeries"
            />
            <div v-else class="text-center text-body-2 text-medium-emphasis py-4">
              Aucune note enregistrée pour cette année scolaire.
            </div>
          </ClientOnly>
        </v-card>
      </v-col>
    </v-row>

    <!-- Absences -->
    <v-row dense class="mt-1 mb-2">
      <v-col cols="12">
        <v-card class="rounded-lg pa-3 dash-card" elevation="0">
          <div class="text-subtitle-2 font-weight-bold mb-2">Absences déclarées par mois</div>
          <ClientOnly>
            <apexchart
              type="bar"
              height="190"
              :options="absencesChartOptions"
              :series="absencesChartSeries"
            />
          </ClientOnly>
        </v-card>
      </v-col>
    </v-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'

const props = defineProps({
  etablissementId: { type: Number, required: true },
  etablissementNom: { type: String, default: '' },
  anneeScolaireId: { type: Number, default: null },
})

const API_BASE = ''

// Palette validée (voir skill dataviz) — ordre catégoriel fixe, jamais recyclé.
const PALETTE = {
  blue: '#2a78d6',
  orange: '#eb6834',
  aqua: '#1baf7a',
  yellow: '#eda100',
  textSecondary: '#52514e',
  textMuted: '#898781',
  grid: '#e1e0d9',
  good: '#0ca30c',
  warning: '#fab219',
  critical: '#d03b3b',
}

const loading = ref(false)
const error = ref('')

const stats = ref({
  totaux: { eleves: 0, enseignants: 0, classes: 0, parents: 0 },
  repartitionGenre: { garcons: 0, filles: 0 },
  effectifsParClasse: [],
  finances: { montantTotal: 0, montantPaye: 0, reste: 0, tauxRecouvrement: 0, paiementsEnAttente: 0 },
  paiementsParMois: [],
  moyenneParClasse: [],
  absencesParMois: [],
})

const authHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {}
}

// Mise en place de l'établissement (carte « Premiers pas »).
const demarrage = ref(null)
const fetchDemarrage = async () => {
  try {
    const res = await axios.get(`${API_BASE}/api/dashboard/demarrage`, authHeaders())
    demarrage.value = res.data
  } catch (e) {
    demarrage.value = null
  }
}
const etapesFaites = computed(() => (demarrage.value?.etapes || []).filter((e) => e.fait).length)
const prochaineEtape = computed(() => (demarrage.value?.etapes || []).find((e) => !e.fait)?.cle)
onMounted(fetchDemarrage)

// Élèves admis en 2nde dont la série reste à choisir.
const aOrienter = ref(0)
onMounted(async () => {
  try {
    const { data } = await axios.get(`${API_BASE}/api/orientation-2nde/compte`, authHeaders())
    aOrienter.value = Number(data?.n || 0)
  } catch (e) { aOrienter.value = 0 }
})

const fetchStats = async () => {
  if (!props.etablissementId || !props.anneeScolaireId) return
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get(
      `${API_BASE}/api/dashboard/stats/${props.etablissementId}/${props.anneeScolaireId}`,
      authHeaders()
    )
    stats.value = res.data
  } catch (err) {
    error.value = err.response?.data?.message || "Impossible de charger les statistiques du tableau de bord."
  } finally {
    loading.value = false
  }
}

onMounted(fetchStats)
watch(() => [props.etablissementId, props.anneeScolaireId], fetchStats)

const formatMoney = (v) => new Intl.NumberFormat('fr-FR').format(Number(v) || 0) + ' FCFA'

const recouvrementColor = computed(() => {
  const t = stats.value.finances.tauxRecouvrement
  if (t >= 75) return 'success'
  if (t >= 40) return 'warning'
  return 'error'
})

const kpis = computed(() => [
  { title: 'Élèves', value: stats.value.totaux.eleves, icon: 'mdi-account-group', color: 'primary' },
  { title: 'Enseignants', value: stats.value.totaux.enseignants, icon: 'mdi-teach', color: 'purple' },
  { title: 'Classes', value: stats.value.totaux.classes, icon: 'mdi-school-outline', color: 'blue' },
  { title: 'Taux de recouvrement', value: `${stats.value.finances.tauxRecouvrement}%`, icon: 'mdi-cash-check', color: 'success' },
])

// ---- Base commune des options apexcharts (chrome discret, sans axe secondaire) ----
const baseOptions = {
  chart: { toolbar: { show: false }, fontFamily: 'inherit', animations: { speed: 350 } },
  grid: { borderColor: PALETTE.grid, strokeDashArray: 0 },
  dataLabels: { enabled: false },
  tooltip: { theme: 'light' },
  xaxis: {
    labels: { style: { colors: PALETTE.textMuted, fontSize: '12px' } },
    axisBorder: { color: PALETTE.grid },
    axisTicks: { color: PALETTE.grid },
  },
  yaxis: { labels: { style: { colors: PALETTE.textMuted, fontSize: '12px' } } },
}

// ---- Effectifs par classe (bar horizontal, une seule série) ----
const effectifsHeight = computed(() => Math.max(200, stats.value.effectifsParClasse.length * 28))
const effectifsChartSeries = computed(() => [
  { name: 'Élèves', data: stats.value.effectifsParClasse.map((c) => c.effectif) },
])
const effectifsChartOptions = computed(() => ({
  ...baseOptions,
  colors: [PALETTE.blue],
  plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%' } },
  xaxis: { ...baseOptions.xaxis, categories: stats.value.effectifsParClasse.map((c) => c.classe) },
  tooltip: { theme: 'light', y: { formatter: (v) => `${v} élève${v > 1 ? 's' : ''}` } },
}))

// ---- Répartition par genre (donut) ----
const genreChartSeries = computed(() => [stats.value.repartitionGenre.garcons, stats.value.repartitionGenre.filles])
const genreChartOptions = computed(() => ({
  chart: { fontFamily: 'inherit' },
  labels: ['Garçons', 'Filles'],
  colors: [PALETTE.blue, PALETTE.orange],
  legend: { position: 'bottom', labels: { colors: PALETTE.textSecondary } },
  dataLabels: { enabled: true, style: { colors: ['#fff'] } },
  stroke: { width: 2, colors: ['#fcfcfb'] },
  plotOptions: {
    pie: {
      donut: {
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total',
            color: PALETTE.textSecondary,
            formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0),
          },
        },
      },
    },
  },
}))

// ---- Évolution des paiements (area, 12 mois) ----
const paiementsChartSeries = computed(() => [
  { name: 'Encaissements', data: stats.value.paiementsParMois.map((m) => m.montant) },
])
const paiementsChartOptions = computed(() => ({
  ...baseOptions,
  colors: [PALETTE.blue],
  stroke: { width: 2, curve: 'smooth' },
  fill: { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
  markers: { size: 0 },
  xaxis: { ...baseOptions.xaxis, categories: stats.value.paiementsParMois.map((m) => m.mois) },
  tooltip: { theme: 'light', y: { formatter: (v) => formatMoney(v) } },
}))

// ---- Moyenne par classe (bar, coloré par seuil de passage 10/20) ----
const moyenneChartSeries = computed(() => [
  { name: 'Moyenne', data: stats.value.moyenneParClasse.map((c) => c.moyenne) },
])
const moyenneChartOptions = computed(() => ({
  ...baseOptions,
  plotOptions: {
    bar: {
      borderRadius: 4,
      columnWidth: '45%',
      colors: {
        ranges: [
          { from: 0, to: 9.99, color: PALETTE.critical },
          { from: 10, to: 20, color: PALETTE.good },
        ],
      },
    },
  },
  annotations: {
    yaxis: [
      {
        y: 10,
        borderColor: PALETTE.textMuted,
        strokeDashArray: 4,
        label: {
          text: 'Moyenne de passage',
          style: { color: PALETTE.textSecondary, background: 'transparent', fontSize: '11px' },
        },
      },
    ],
  },
  xaxis: { ...baseOptions.xaxis, categories: stats.value.moyenneParClasse.map((c) => c.classe) },
  yaxis: { ...baseOptions.yaxis, max: 20, title: { text: '/ 20', style: { color: PALETTE.textMuted } } },
  tooltip: { theme: 'light', y: { formatter: (v) => `${v} / 20` } },
}))

// ---- Absences par mois (bar, 12 mois) ----
const absencesChartSeries = computed(() => [
  { name: 'Absences', data: stats.value.absencesParMois.map((m) => m.total) },
])
const absencesChartOptions = computed(() => ({
  ...baseOptions,
  colors: [PALETTE.orange],
  plotOptions: { bar: { borderRadius: 4, columnWidth: '45%' } },
  xaxis: { ...baseOptions.xaxis, categories: stats.value.absencesParMois.map((m) => m.mois) },
  tooltip: { theme: 'light', y: { formatter: (v) => `${v} absence${v > 1 ? 's' : ''}` } },
}))
</script>

<style scoped>
.demarrage { border: 1px solid #c5d8f5; background: #f5f9ff; }
.demarrage-titre { display: flex; align-items: center; font-weight: 800; color: #0d47a1; }
.demarrage-etape { display: flex; align-items: center; gap: 10px; padding: 6px 4px; border-top: 1px solid #e3ecf8; }
.demarrage-etape.is-fait .demarrage-nom { color: #6b7a8c; text-decoration: line-through; }
.demarrage-etape.is-suivante { background: #e8f1ff; border-radius: 8px; }
.demarrage-texte { flex: 1; min-width: 0; }
.demarrage-nom { font-weight: 700; font-size: 0.9rem; }
.demarrage-aide { font-size: 0.75rem; color: #5f6b7a; }
.dashboard-home {
  animation: fadeIn 0.4s ease-in-out;
}
.dash-title {
  font-size: 20px;
  line-height: 1.3;
  margin: 0;
}
.kpi-card {
  border: 1px solid rgba(11, 11, 11, 0.08);
}
.kpi-body {
  min-width: 0;
}
.kpi-label {
  font-size: 11.5px;
  letter-spacing: 0.02em;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kpi-value {
  font-size: 20px;
  line-height: 1.25;
}
/* Montant collecté : lisible mais plus « énorme » (22 px max, retour à la
   ligne autorisé pour les très grands montants). */
.money-value {
  font-size: 22px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
@media (max-width: 600px) {
  .dash-title { font-size: 18px; }
  .kpi-value { font-size: 18px; }
  .money-value { font-size: 20px; }
  .kpi-label { font-size: 11px; }
}
.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
