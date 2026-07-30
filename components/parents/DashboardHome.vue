<template>
  <div class="pdash">
    <!-- Header -->
    <div class="pdash-header">
      <div>
        <div class="pdash-title">
          <v-icon color="primary" size="22" class="mr-2">mdi-view-dashboard-outline</v-icon>
          Tableau de bord
        </div>
        <div class="pdash-subtitle">
          Vue d'ensemble du suivi scolaire de vos enfants
        </div>
      </div>

      <v-btn
        variant="tonal"
        color="primary"
        class="pill"
        prepend-icon="mdi-refresh"
        :loading="loading"
        @click="fetchDashboard"
      >
        Actualiser
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-6" border="start" density="comfortable">
      {{ error }}
    </v-alert>

    <!-- Loading skeleton -->
    <div v-if="loading && !hasData" class="skeleton-wrap">
      <v-skeleton-loader type="card, article, article" />
    </div>

    <!-- Empty state -->
    <v-card
      v-else-if="!error && totaux.nombreEnfants === 0"
      class="empty-card"
      elevation="10"
    >
      <v-card-text class="empty-content">
        <div class="empty-icon">
          <v-icon size="40">mdi-account-child-outline</v-icon>
        </div>
        <div class="empty-title">Aucun enfant rattaché à ce compte</div>
        <div class="empty-subtitle">
          Contactez l'administration de l'établissement si cela vous semble anormal.
        </div>
      </v-card-text>
    </v-card>

    <template v-else>
      <!-- KPI -->
      <v-row>
        <v-col cols="12" sm="6" md="3" v-for="(kpi, i) in kpis" :key="i">
          <v-card class="kpi-card" elevation="8">
            <div class="kpi-inner">
              <v-avatar :color="kpi.color" variant="tonal" size="46" class="mr-3">
                <v-icon :color="kpi.color">{{ kpi.icon }}</v-icon>
              </v-avatar>
              <div class="kpi-text">
                <div class="kpi-label">{{ kpi.title }}</div>
                <div class="kpi-value">{{ kpi.value }}</div>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Enfants recap -->
      <div class="section-title">
        <v-icon size="18" color="primary" class="mr-1">mdi-account-multiple-outline</v-icon>
        Mes enfants
      </div>

      <v-row>
        <v-col cols="12" sm="6" md="4" v-for="enfant in enfants" :key="enfant.id">
          <v-card class="child-card" elevation="8">
            <div class="child-card-accent" aria-hidden="true"></div>
            <v-card-text class="child-card-body">
              <div class="child-card-head">
                <div class="child-avatar">
                  <v-icon color="primary">mdi-account</v-icon>
                </div>
                <div class="child-name-wrap">
                  <div class="child-name">{{ enfant.prenom }} {{ enfant.nom }}</div>
                  <div class="child-classe">{{ enfant.classe || "Classe" }}</div>
                </div>
              </div>

              <div class="child-stats">
                <div class="child-stat">
                  <div class="stat-label">Moyenne</div>
                  <div
                    class="stat-value"
                    :class="moyenneColorClass(enfant.moyenneGenerale)"
                  >
                    {{ enfant.moyenneGenerale != null ? enfant.moyenneGenerale + "/20" : "—" }}
                  </div>
                </div>
                <div class="child-stat">
                  <div class="stat-label">Présence</div>
                  <div class="stat-value" :class="presenceColorClass(enfant.tauxPresence)">
                    {{ enfant.tauxPresence != null ? enfant.tauxPresence + "%" : "—" }}
                  </div>
                </div>
                <div class="child-stat">
                  <div class="stat-label">Conduite</div>
                  <div class="stat-value" :class="enfant.heuresPunition > 0 ? 'v-bad' : 'v-ok'">
                    {{ enfant.heuresPunition }} h
                  </div>
                </div>
              </div>

              <div class="child-finance">
                <div class="finance-row">
                  <span>Scolarité</span>
                  <span class="finance-amount">
                    {{ formatMoney(enfant.scolarite.montantPaye) }} / {{ formatMoney(enfant.scolarite.montantTotal) }}
                  </span>
                </div>
                <v-progress-linear
                  :model-value="enfant.scolarite.tauxRecouvrement"
                  height="8"
                  rounded
                  :color="recouvrementColor(enfant.scolarite.tauxRecouvrement)"
                  bg-color="grey-lighten-3"
                />
                <div class="finance-hint" v-if="enfant.paiementsEnAttente > 0">
                  <v-icon size="14" color="warning">mdi-clock-alert-outline</v-icon>
                  {{ enfant.paiementsEnAttente }} paiement{{ enfant.paiementsEnAttente > 1 ? "s" : "" }} en attente de validation
                </div>
              </div>

              <v-btn
                variant="text"
                color="primary"
                class="pill-btn mt-2"
                block
                @click="$emit('showComponent', 'ChildrenList')"
              >
                Voir le détail
                <v-icon end size="18">mdi-arrow-right</v-icon>
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Charts row 1 -->
      <v-row class="mt-2">
        <v-col cols="12" md="6">
          <v-card class="chart-card" elevation="8">
            <div class="chart-title">Moyenne générale par enfant</div>
            <ClientOnly>
              <apexchart
                v-if="hasNotes"
                type="bar"
                height="240"
                :options="moyenneChartOptions"
                :series="moyenneChartSeries"
              />
              <div v-else class="chart-empty">Aucune note enregistrée pour le moment.</div>
            </ClientOnly>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card class="chart-card" elevation="8">
            <div class="chart-title">Taux de présence par enfant</div>
            <ClientOnly>
              <apexchart
                v-if="hasPresence"
                type="bar"
                height="240"
                :options="presenceChartOptions"
                :series="presenceChartSeries"
              />
              <div v-else class="chart-empty">Aucune séance enregistrée pour le moment.</div>
            </ClientOnly>
          </v-card>
        </v-col>
      </v-row>

      <!-- Charts row 2 -->
      <v-row class="mt-2">
        <v-col cols="12" md="6">
          <v-card class="chart-card" elevation="8">
            <div class="chart-title">Situation financière par enfant</div>
            <ClientOnly>
              <apexchart
                v-if="hasFinance"
                type="bar"
                height="240"
                :options="financeChartOptions"
                :series="financeChartSeries"
              />
              <div v-else class="chart-empty">Aucune scolarité définie pour le moment.</div>
            </ClientOnly>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card class="chart-card" elevation="8">
            <div class="chart-title">Absences déclarées par mois</div>
            <ClientOnly>
              <apexchart
                type="bar"
                height="240"
                :options="absencesChartOptions"
                :series="absencesChartSeries"
              />
            </ClientOnly>
          </v-card>
        </v-col>
      </v-row>

      <!-- Chart row 3 : moyennes par semestre -->
      <v-row class="mt-2 mb-4" v-if="moyennesParSemestre.length > 1">
        <v-col cols="12">
          <v-card class="chart-card" elevation="8">
            <div class="chart-title">Évolution de la moyenne par semestre</div>
            <ClientOnly>
              <apexchart
                type="line"
                height="260"
                :options="semestreChartOptions"
                :series="semestreChartSeries"
              />
            </ClientOnly>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import axios from "axios";

const props = defineProps({
  etablissementId: { type: [Number, String], default: null },
  anneeScolaireId: { type: [Number, String], default: null },
});

defineEmits(["showComponent"]);

const API_BASE = "";

// Palette validée (cohérente avec le tableau de bord administration)
const PALETTE = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  yellow: "#eda100",
  textSecondary: "#52514e",
  textMuted: "#898781",
  grid: "#e1e0d9",
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
};

const loading = ref(false);
const error = ref("");
const hasData = ref(false);

const enfants = ref([]);
const totaux = ref({
  nombreEnfants: 0,
  moyenneGlobale: null,
  totalAbsences: 0,
  totalHeuresPunition: 0,
  montantTotalScolarite: 0,
  montantPayeScolarite: 0,
  resteScolarite: 0,
  tauxRecouvrement: 0,
  paiementsEnAttente: 0,
});
const absencesParMois = ref([]);
const moyennesParSemestre = ref([]);

const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);

const fetchDashboard = async () => {
  if (!props.anneeScolaireId) return;

  const token = getToken();
  if (!token) {
    error.value = "Session expirée. Veuillez vous reconnecter.";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const res = await axios.get(
      `${API_BASE}/api/parent/dashboard/${props.anneeScolaireId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = res.data || {};
    enfants.value = Array.isArray(data.enfants) ? data.enfants : [];
    totaux.value = { ...totaux.value, ...(data.totaux || {}) };
    absencesParMois.value = Array.isArray(data.absencesParMois) ? data.absencesParMois : [];
    moyennesParSemestre.value = Array.isArray(data.moyennesParSemestre) ? data.moyennesParSemestre : [];
    hasData.value = true;
  } catch (err) {
    error.value =
      err.response?.data?.message || "Impossible de charger le tableau de bord.";
  } finally {
    loading.value = false;
  }
};

onMounted(fetchDashboard);
watch(() => props.anneeScolaireId, fetchDashboard);

// ----- Utilitaires -----
const formatMoney = (v) => new Intl.NumberFormat("fr-FR").format(Number(v) || 0) + " FCFA";

const moyenneColorClass = (v) => {
  if (v == null) return "v-neutral";
  return v >= 10 ? "v-ok" : "v-bad";
};
const presenceColorClass = (v) => {
  if (v == null) return "v-neutral";
  if (v >= 90) return "v-ok";
  if (v >= 75) return "v-warn";
  return "v-bad";
};
const recouvrementColor = (t) => {
  if (t >= 75) return "success";
  if (t >= 40) return "warning";
  return "error";
};

// ----- KPI -----
const tauxPresenceGlobal = computed(() => {
  const totalSeances = enfants.value.reduce((a, e) => a + (e.totalSeances || 0), 0);
  if (totalSeances === 0) return null;
  const totalAbsences = totaux.value.totalAbsences || 0;
  return Math.round(((totalSeances - totalAbsences) / totalSeances) * 1000) / 10;
});

const kpis = computed(() => [
  {
    title: "Enfants suivis",
    value: totaux.value.nombreEnfants,
    icon: "mdi-account-child",
    color: "primary",
  },
  {
    title: "Moyenne générale",
    value: totaux.value.moyenneGlobale != null ? `${totaux.value.moyenneGlobale}/20` : "—",
    icon: "mdi-chart-line",
    color: "blue",
  },
  {
    title: "Taux de présence",
    value: tauxPresenceGlobal.value != null ? `${tauxPresenceGlobal.value}%` : "—",
    icon: "mdi-calendar-check-outline",
    color: "success",
  },
  {
    title: "Reste à payer",
    value: formatMoney(totaux.value.resteScolarite),
    icon: "mdi-cash-clock",
    color: totaux.value.resteScolarite > 0 ? "warning" : "success",
  },
]);

// ----- Base options -----
const baseOptions = {
  chart: { toolbar: { show: false }, fontFamily: "inherit", animations: { speed: 350 } },
  grid: { borderColor: PALETTE.grid, strokeDashArray: 0 },
  dataLabels: { enabled: false },
  tooltip: { theme: "light" },
  xaxis: {
    labels: { style: { colors: PALETTE.textMuted, fontSize: "12px" } },
    axisBorder: { color: PALETTE.grid },
    axisTicks: { color: PALETTE.grid },
  },
  yaxis: { labels: { style: { colors: PALETTE.textMuted, fontSize: "12px" } } },
};

const childLabel = (e) => `${e.prenom} ${e.nom}`.trim();

// ----- Moyenne par enfant -----
const hasNotes = computed(() => enfants.value.some((e) => e.moyenneGenerale != null));
const moyenneChartSeries = computed(() => [
  { name: "Moyenne", data: enfants.value.map((e) => e.moyenneGenerale) },
]);
const moyenneChartOptions = computed(() => ({
  ...baseOptions,
  plotOptions: {
    bar: {
      borderRadius: 4,
      columnWidth: "45%",
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
          text: "Moyenne de passage",
          style: { color: PALETTE.textSecondary, background: "transparent", fontSize: "11px" },
        },
      },
    ],
  },
  xaxis: { ...baseOptions.xaxis, categories: enfants.value.map(childLabel) },
  yaxis: { ...baseOptions.yaxis, max: 20, title: { text: "/ 20", style: { color: PALETTE.textMuted } } },
  tooltip: { theme: "light", y: { formatter: (v) => (v == null ? "—" : `${v} / 20`) } },
}));

// ----- Taux de présence par enfant -----
const hasPresence = computed(() => enfants.value.some((e) => e.tauxPresence != null));
const presenceChartSeries = computed(() => [
  { name: "Présence", data: enfants.value.map((e) => e.tauxPresence) },
]);
const presenceChartOptions = computed(() => ({
  ...baseOptions,
  colors: [PALETTE.blue],
  plotOptions: {
    bar: {
      borderRadius: 4,
      columnWidth: "45%",
      colors: {
        ranges: [
          { from: 0, to: 74.99, color: PALETTE.critical },
          { from: 75, to: 89.99, color: PALETTE.warning },
          { from: 90, to: 100, color: PALETTE.good },
        ],
      },
    },
  },
  xaxis: { ...baseOptions.xaxis, categories: enfants.value.map(childLabel) },
  yaxis: { ...baseOptions.yaxis, max: 100, title: { text: "%", style: { color: PALETTE.textMuted } } },
  tooltip: { theme: "light", y: { formatter: (v) => (v == null ? "—" : `${v}%`) } },
}));

// ----- Finance par enfant (stacked) -----
const hasFinance = computed(() => enfants.value.some((e) => e.scolarite.defini));
const financeChartSeries = computed(() => [
  { name: "Payé", data: enfants.value.map((e) => e.scolarite.montantPaye) },
  { name: "Reste", data: enfants.value.map((e) => e.scolarite.reste) },
]);
const financeChartOptions = computed(() => ({
  ...baseOptions,
  colors: [PALETTE.good, PALETTE.orange],
  chart: { ...baseOptions.chart, stacked: true },
  plotOptions: { bar: { borderRadius: 4, columnWidth: "45%" } },
  legend: { position: "bottom", labels: { colors: PALETTE.textSecondary } },
  xaxis: { ...baseOptions.xaxis, categories: enfants.value.map(childLabel) },
  tooltip: { theme: "light", y: { formatter: (v) => formatMoney(v) } },
}));

// ----- Absences par mois -----
const absencesChartSeries = computed(() => [
  { name: "Absences", data: absencesParMois.value.map((m) => m.total) },
]);
const absencesChartOptions = computed(() => ({
  ...baseOptions,
  colors: [PALETTE.orange],
  plotOptions: { bar: { borderRadius: 4, columnWidth: "45%" } },
  xaxis: { ...baseOptions.xaxis, categories: absencesParMois.value.map((m) => m.mois) },
  tooltip: { theme: "light", y: { formatter: (v) => `${v} absence${v > 1 ? "s" : ""}` } },
}));

// ----- Moyenne par semestre (multi-séries : une par enfant) -----
const semestreChartSeries = computed(() =>
  enfants.value.map((e) => ({
    name: childLabel(e),
    data: moyennesParSemestre.value.map((s) => (s.valeurs?.[e.id] ?? null)),
  }))
);
const semestreChartOptions = computed(() => ({
  ...baseOptions,
  colors: [PALETTE.blue, PALETTE.orange, PALETTE.aqua, PALETTE.yellow],
  stroke: { width: 2, curve: "smooth" },
  markers: { size: 4 },
  legend: { position: "bottom", labels: { colors: PALETTE.textSecondary } },
  xaxis: { ...baseOptions.xaxis, categories: moyennesParSemestre.value.map((s) => s.semestre) },
  yaxis: { ...baseOptions.yaxis, max: 20, title: { text: "/ 20", style: { color: PALETTE.textMuted } } },
  tooltip: { theme: "light", y: { formatter: (v) => (v == null ? "—" : `${v} / 20`) } },
}));
</script>

<style scoped>
.pdash {
  animation: fadeIn 0.35s ease-in-out;
}

.pdash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.pdash-title {
  display: flex;
  align-items: center;
  font-weight: 900;
  color: #0b2e4a;
  font-size: clamp(1.1rem, 2vw, 1.35rem);
}

.pdash-subtitle {
  margin-top: 6px;
  color: #455a64;
  font-size: 0.92rem;
}

.pill {
  border-radius: 999px !important;
  font-weight: 900;
}

.skeleton-wrap {
  padding: 4px;
}

/* Empty state */
.empty-card {
  border-radius: 20px !important;
  border: 1px solid rgba(25, 118, 210, 0.12);
  background: rgba(255, 255, 255, 0.9);
  max-width: 560px;
  margin: 24px auto;
}
.empty-content {
  text-align: center;
  padding: 26px 18px;
}
.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  margin: 0 auto 10px;
  display: grid;
  place-items: center;
  background: rgba(25, 118, 210, 0.1);
  color: #1976d2;
  border: 1px solid rgba(25, 118, 210, 0.2);
}
.empty-title {
  font-weight: 900;
  color: #0b2e4a;
  font-size: 1.05rem;
}
.empty-subtitle {
  margin-top: 4px;
  color: #607d8b;
  font-size: 0.92rem;
}

/* KPI */
.kpi-card {
  border-radius: 18px !important;
  border: 1px solid rgba(25, 118, 210, 0.12);
  background: rgba(255, 255, 255, 0.92);
  padding: 16px;
}
.kpi-inner {
  display: flex;
  align-items: center;
}
.kpi-text {
  min-width: 0;
}
.kpi-label {
  font-size: 0.76rem;
  font-weight: 800;
  color: #607d8b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.kpi-value {
  font-weight: 950;
  color: #0b2e4a;
  font-size: 1.25rem;
  margin-top: 2px;
}

/* Section title */
.section-title {
  display: flex;
  align-items: center;
  font-weight: 900;
  color: #0b2e4a;
  margin: 20px 4px 12px;
  font-size: 1.02rem;
}

/* Child card */
.child-card {
  border-radius: 18px !important;
  overflow: hidden;
  border: 1px solid rgba(25, 118, 210, 0.12);
  background: rgba(255, 255, 255, 0.92);
  height: 100%;
}
.child-card-accent {
  height: 5px;
  width: 100%;
  background: linear-gradient(90deg, #1976d2, rgba(25, 118, 210, 0.22), #1976d2);
}
.child-card-body {
  padding: 16px !important;
}
.child-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.child-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(25, 118, 210, 0.1);
  border: 1px solid rgba(25, 118, 210, 0.16);
  flex: 0 0 auto;
}
.child-name-wrap {
  min-width: 0;
}
.child-name {
  font-weight: 900;
  color: #0b2e4a;
  font-size: 1rem;
  line-height: 1.2rem;
}
.child-classe {
  color: #607d8b;
  font-size: 0.85rem;
  font-weight: 700;
}

.child-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 14px 0 12px;
}
.child-stat {
  text-align: center;
  background: rgba(25, 118, 210, 0.05);
  border: 1px solid rgba(25, 118, 210, 0.1);
  border-radius: 12px;
  padding: 8px 4px;
}
.stat-label {
  font-size: 0.7rem;
  font-weight: 800;
  color: #607d8b;
  text-transform: uppercase;
}
.stat-value {
  margin-top: 2px;
  font-weight: 950;
  font-size: 0.98rem;
}
.v-ok { color: #166534; }
.v-bad { color: #991b1b; }
.v-warn { color: #92400e; }
.v-neutral { color: #455a64; }

.child-finance {
  margin-top: 4px;
}
.finance-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: #455a64;
  font-weight: 700;
  margin-bottom: 6px;
}
.finance-amount {
  font-weight: 900;
  color: #0b2e4a;
}
.finance-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 0.76rem;
  color: #92400e;
  font-weight: 700;
}

.pill-btn {
  border-radius: 999px !important;
  font-weight: 900;
  text-transform: none;
}

/* Chart card */
.chart-card {
  border-radius: 18px !important;
  border: 1px solid rgba(25, 118, 210, 0.12);
  background: rgba(255, 255, 255, 0.92);
  padding: 18px;
  height: 100%;
}
.chart-title {
  font-weight: 900;
  color: #0b2e4a;
  margin-bottom: 12px;
  font-size: 0.98rem;
}
.chart-empty {
  text-align: center;
  color: #607d8b;
  padding: 40px 10px;
  font-weight: 700;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 600px) {
  .child-stats { grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .chart-card { padding: 14px; }
}
</style>
