<template>
  <v-container fluid class="pa-4 bg-grey-lighten-4">

    <!-- En-tête -->
    <v-row align="center" class="mb-6 px-2">
      <v-col cols="auto">
        <v-btn icon variant="elevated" color="white" elevation="2" @click="$emit('back')">
          <v-icon color="success">mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>

      <v-col>
        <h1 class="text-h5 font-weight-bold text-success d-flex align-center">
          <v-icon start size="32">mdi-cash-multiple</v-icon>
          Scolarité - {{ className }}
        </h1>
        <div class="text-caption text-grey-darken-1">
          {{ etablissementNom }} • {{ anneeScolaire }}
        </div>
      </v-col>

      <v-col cols="12" sm="auto" class="d-flex ga-2 flex-wrap">
        <v-btn
          color="primary"
          variant="tonal"
          prepend-icon="mdi-calendar-clock"
          rounded="pill"
          @click="openEcheanceDialog"
        >
          Échéances
        </v-btn>

        <v-btn
          color="success"
          prepend-icon="mdi-file-pdf-box"
          rounded="pill"
          :disabled="loading || eleves.length === 0"
          @click="downloadPDF"
        >
          Exporter PDF
        </v-btn>
      </v-col>
    </v-row>

    <!-- Tableau -->
    <v-card flat class="rounded-xl">
      <v-toolbar color="white" flat>
        <v-toolbar-title>Situation des scolarités</v-toolbar-title>
        <v-spacer />
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Rechercher un élève"
          density="compact"
          hide-details
          variant="solo-filled"
          rounded="pill"
          class="mr-2"
          style="max-width: 280px;"
        />
      </v-toolbar>

      <v-data-table
        :headers="headers"
        :items="filteredEleves"
        :loading="loading"
        item-value="id"
        loading-text="Chargement des élèves…"
        no-data-text="Aucun élève trouvé pour cette classe."
      >
        <template #item.nomComplet="{ item }">
          {{ item.nom }} {{ item.prenom }}
        </template>

        <template #item.montantTotal="{ item }">
          {{ formatMoney(item.montantTotal) }}
        </template>

        <template #item.montantPaye="{ item }">
          <span class="text-success font-weight-bold">{{ formatMoney(item.montantPaye) }}</span>
        </template>

        <template #item.reste="{ item }">
          <span :class="Number(item.reste) > 0 ? 'text-error font-weight-bold' : 'text-success font-weight-bold'">
            {{ formatMoney(item.reste) }}
          </span>
        </template>

        <template #item.actions="{ item }">
          <v-btn
            size="small"
            color="success"
            class="mr-2"
            prepend-icon="mdi-cash-plus"
            :disabled="Number(item.reste) <= 0"
            @click="effectuerPaiement(item)"
          >
            Paiement
          </v-btn>
          <v-btn
            size="small"
            color="primary"
            prepend-icon="mdi-history"
            @click="voirHistorique(item)"
          >
            Historique
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- ============================================================= -->
    <!-- MODALE PAIEMENT (maison, téléportée dans le body)             -->
    <!-- ============================================================= -->
    <ClientOnly>
      <Teleport to="body">
        <div v-if="paymentDialog" class="ov" @click.self="closePayment">
          <div class="modal">
            <div class="modal__head">
              <h3>Nouveau paiement</h3>
              <button class="modal__close" @click="closePayment" aria-label="Fermer">✕</button>
            </div>

            <p v-if="selectedEleve" class="modal__sub">
              {{ selectedEleve.nom }} {{ selectedEleve.prenom }}
            </p>

            <div v-if="selectedEleve" class="recap">
              <div>
                <span class="recap__lbl">Total</span>
                <span class="recap__val">{{ formatMoney(selectedEleve.montantTotal) }}</span>
              </div>
              <div class="recap__right">
                <span class="recap__lbl">Reste à payer</span>
                <span class="recap__val recap__val--danger">{{ formatMoney(selectedEleve.reste) }}</span>
              </div>
            </div>

            <div v-if="paymentError" class="err">{{ paymentError }}</div>

            <label class="lbl">Montant du paiement (FCFA)</label>
            <input v-model.number="paymentForm.montant" type="number" min="0" class="f-input" placeholder="0" />

            <label class="lbl">Mode de paiement</label>
            <select v-model="paymentForm.modePaiement" class="f-input">
              <option v-for="m in modesPaiement" :key="m" :value="m">{{ m }}</option>
            </select>

            <label class="lbl">Date du paiement</label>
            <input v-model="paymentForm.datePaiement" type="date" class="f-input" />

            <label class="lbl">Référence / N° reçu (optionnel)</label>
            <input v-model="paymentForm.reference" type="text" class="f-input" placeholder="—" />

            <div class="modal__actions">
              <button class="btn btn--ghost" @click="closePayment">Annuler</button>
              <button class="btn btn--primary" :disabled="paymentLoading" @click="submitPaiement">
                {{ paymentLoading ? 'Enregistrement…' : 'Enregistrer' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- ============================================================= -->
    <!-- MODALE ÉCHÉANCES (calendrier des tranches de la classe)        -->
    <!-- ============================================================= -->
    <ClientOnly>
      <Teleport to="body">
        <div v-if="echeanceDialog" class="ov" @click.self="closeEcheanceDialog">
          <div class="modal modal--lg">
            <div class="modal__head">
              <h3>Calendrier des échéances — {{ className }}</h3>
              <button class="modal__close" @click="closeEcheanceDialog" aria-label="Fermer">✕</button>
            </div>

            <p class="modal__sub">
              Définissez les tranches (dates limites) applicables à toute la classe.
            </p>

            <div v-if="echeanceError" class="err">{{ echeanceError }}</div>

            <div v-if="echeanceLoading" class="loading">Chargement…</div>

            <template v-else>
              <div v-for="(e, idx) in echeanceRows" :key="idx" class="echeance-row">
                <input v-model="e.libelle" type="text" class="f-input" placeholder="Libellé (ex: Tranche 1)" />
                <input v-model.number="e.montant" type="number" min="0" class="f-input" placeholder="Montant" />
                <input v-model="e.dateLimite" type="date" class="f-input" />
                <button class="row-remove" @click="removeEcheanceRow(idx)" aria-label="Supprimer">✕</button>
              </div>

              <button class="btn btn--ghost btn--add" @click="addEcheanceRow">
                + Ajouter une tranche
              </button>

              <div class="recap mt-2">
                <span class="recap__lbl">Total des tranches</span>
                <span class="recap__val">{{ formatMoney(totalEcheances) }}</span>
              </div>
            </template>

            <div class="modal__actions">
              <button class="btn btn--ghost" @click="closeEcheanceDialog">Annuler</button>
              <button class="btn btn--primary" :disabled="echeanceSaving || echeanceLoading" @click="saveEcheances">
                {{ echeanceSaving ? 'Enregistrement…' : 'Enregistrer' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- ============================================================= -->
    <!-- MODALE HISTORIQUE                                              -->
    <!-- ============================================================= -->
    <ClientOnly>
      <Teleport to="body">
        <div v-if="historyDialog" class="ov" @click.self="historyDialog = false">
          <div class="modal modal--lg">
            <div class="modal__head">
              <h3>Historique des paiements</h3>
              <button class="modal__close" @click="historyDialog = false" aria-label="Fermer">✕</button>
            </div>

            <p v-if="selectedEleve" class="modal__sub">
              {{ selectedEleve.nom }} {{ selectedEleve.prenom }}
            </p>

            <div v-if="historyLoading" class="loading">Chargement…</div>

            <div v-else-if="historique.length > 0" class="table-scroll-wrap">
              <table class="histo">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Mode</th>
                    <th>Référence</th>
                    <th class="ta-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in historique" :key="p.id">
                    <td>{{ formatDate(p.datePaiement) }}</td>
                    <td>{{ p.modePaiement }}</td>
                    <td>{{ p.reference || '—' }}</td>
                    <td class="ta-right val-ok">{{ formatMoney(p.montant) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="info">Aucun paiement enregistré pour cet élève.</div>

            <div class="modal__actions">
              <button class="btn btn--ghost" @click="historyDialog = false">Fermer</button>
            </div>
          </div>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- Toast -->
    <ClientOnly>
      <Teleport to="body">
        <div v-if="toast.show" class="toast" :class="`toast--${toast.type}`">{{ toast.text }}</div>
      </Teleport>
    </ClientOnly>

  </v-container>
</template>

<script>
import axios from 'axios'

const API = '/api'

export default {
  name: 'ScolariteDetail',

  emits: ['back'],

  props: {
    classId: { type: [Number, String], required: true },
    className: { type: String, default: '' },
    anneeScolaire: { type: String, default: '' },
    anneeScolaireId: { type: [Number, String], required: true },
    etablissementId: { type: [Number, String], required: true },
    etablissementNom: { type: String, default: '' }
  },

  data() {
    return {
      eleves: [],
      search: '',
      loading: false,

      headers: [
        { title: 'Nom complet', key: 'nomComplet', align: 'start', sortable: false },
        { title: 'Montant total', key: 'montantTotal', align: 'end' },
        { title: 'Payé', key: 'montantPaye', align: 'end' },
        { title: 'Reste', key: 'reste', align: 'end' },
        { title: 'Actions', key: 'actions', align: 'center', sortable: false }
      ],

      // Paiement
      paymentDialog: false,
      paymentLoading: false,
      paymentError: '',
      selectedEleve: null,
      modesPaiement: ['Espèces', 'Mobile Money', 'Virement', 'Chèque'],
      paymentForm: {
        montant: null,
        modePaiement: 'Espèces',
        datePaiement: '',
        reference: ''
      },

      // Historique
      historyDialog: false,
      historyLoading: false,
      historique: [],

      // Échéances
      echeanceDialog: false,
      echeanceLoading: false,
      echeanceSaving: false,
      echeanceError: '',
      echeanceRows: [],

      // Toast
      toast: { show: false, text: '', type: 'success' },
      _toastTimer: null
    }
  },

  computed: {
    filteredEleves() {
      const q = this.search.trim().toLowerCase()
      if (!q) return this.eleves
      return this.eleves.filter((e) => {
        const nomComplet = `${e.nom || ''} ${e.prenom || ''}`.toLowerCase()
        return nomComplet.includes(q)
      })
    },
    totalEcheances() {
      return this.echeanceRows.reduce((sum, e) => sum + (Number(e.montant) || 0), 0)
    }
  },

  watch: {
    classId() {
      this.fetchStudents()
    }
  },

  created() {
    this.fetchStudents()
  },

  methods: {

    authHeaders() {
      const token = localStorage.getItem('token')
      return token ? { Authorization: `Bearer ${token}` } : {}
    },

    today() {
      return new Date().toISOString().slice(0, 10)
    },

    // ----- Chargement des élèves -----
    fetchStudents() {
      this.loading = true
      axios
        .get(`${API}/scolarite/eleves/${this.classId}/${this.anneeScolaireId}`, {
          headers: this.authHeaders()
        })
        .then((response) => { this.eleves = response.data })
        .catch((error) => {
          console.error('Erreur lors de la récupération des élèves:', error)
          this.eleves = []
        })
        .finally(() => { this.loading = false })
    },

    // ----- Paiement -----
    effectuerPaiement(eleve) {
      this.selectedEleve = eleve
      this.paymentError = ''
      this.paymentForm = {
        montant: null,
        modePaiement: 'Espèces',
        datePaiement: this.today(),
        reference: ''
      }
      this.paymentDialog = true
    },

    closePayment() {
      this.paymentDialog = false
    },

    submitPaiement() {
      this.paymentError = ''

      const montant = Number(this.paymentForm.montant)
      const reste = Number(this.selectedEleve.reste) || 0

      if (!montant || montant <= 0) {
        this.paymentError = 'Veuillez saisir un montant valide.'
        return
      }
      if (montant > reste) {
        this.paymentError = `Le montant dépasse le reste à payer (${this.formatMoney(reste)}).`
        return
      }
      if (!this.paymentForm.datePaiement) {
        this.paymentError = 'Veuillez choisir une date.'
        return
      }

      const payload = {
        eleveId: this.selectedEleve.id,
        classeId: this.classId,
        anneeScolaireId: this.anneeScolaireId,
        etablissementId: this.etablissementId,
        montant,
        modePaiement: this.paymentForm.modePaiement,
        datePaiement: this.paymentForm.datePaiement,
        reference: this.paymentForm.reference
      }

      this.paymentLoading = true
      axios
        .post(`${API}/scolarite/paiement`, payload, { headers: this.authHeaders() })
        .then(() => {
          this.paymentDialog = false
          this.showToast('Paiement enregistré avec succès.', 'success')
          this.fetchStudents()
        })
        .catch((error) => {
          console.error('Erreur lors du paiement:', error)
          const msg =
            error.response && error.response.data && error.response.data.message
              ? error.response.data.message
              : "Échec de l'enregistrement du paiement."
          this.paymentError = msg
        })
        .finally(() => { this.paymentLoading = false })
    },

    // ----- Historique -----
    voirHistorique(eleve) {
      this.selectedEleve = eleve
      this.historique = []
      this.historyDialog = true
      this.fetchHistorique(eleve.id)
    },

    fetchHistorique(eleveId) {
      this.historyLoading = true
      axios
        .get(`${API}/scolarite/paiements/${eleveId}/${this.anneeScolaireId}`, {
          headers: this.authHeaders()
        })
        .then((response) => { this.historique = response.data })
        .catch((error) => {
          console.error("Erreur lors du chargement de l'historique:", error)
          this.historique = []
        })
        .finally(() => { this.historyLoading = false })
    },

    // ----- Échéances -----
    openEcheanceDialog() {
      this.echeanceDialog = true
      this.echeanceError = ''
      this.echeanceLoading = true
      axios
        .get(`${API}/scolarite/echeances/${this.classId}/${this.anneeScolaireId}`, {
          headers: this.authHeaders()
        })
        .then((response) => {
          this.echeanceRows = response.data.length > 0
            ? response.data.map((e) => ({
                libelle: e.libelle,
                montant: Number(e.montant),
                dateLimite: e.date_limite,
                ordre: e.ordre
              }))
            : [{ libelle: '', montant: null, dateLimite: '', ordre: 1 }]
        })
        .catch((error) => {
          console.error('Erreur lors du chargement des échéances:', error)
          this.echeanceRows = [{ libelle: '', montant: null, dateLimite: '', ordre: 1 }]
        })
        .finally(() => { this.echeanceLoading = false })
    },

    closeEcheanceDialog() {
      this.echeanceDialog = false
    },

    addEcheanceRow() {
      this.echeanceRows.push({ libelle: '', montant: null, dateLimite: '', ordre: this.echeanceRows.length + 1 })
    },

    removeEcheanceRow(idx) {
      this.echeanceRows.splice(idx, 1)
    },

    saveEcheances() {
      this.echeanceError = ''

      for (const e of this.echeanceRows) {
        if (!e.libelle || !e.montant || Number(e.montant) <= 0 || !e.dateLimite) {
          this.echeanceError = 'Chaque tranche doit avoir un libellé, un montant > 0 et une date limite.'
          return
        }
      }

      const payload = {
        classeId: this.classId,
        anneeScolaireId: this.anneeScolaireId,
        etablissementId: this.etablissementId,
        echeances: this.echeanceRows.map((e, idx) => ({
          libelle: e.libelle,
          montant: Number(e.montant),
          dateLimite: e.dateLimite,
          ordre: idx + 1
        }))
      }

      this.echeanceSaving = true
      axios
        .post(`${API}/scolarite/echeances`, payload, { headers: this.authHeaders() })
        .then(() => {
          this.showToast('Calendrier des échéances enregistré.', 'success')
          this.echeanceDialog = false
        })
        .catch((error) => {
          console.error('Erreur lors de l\'enregistrement des échéances:', error)
          const msg =
            error.response && error.response.data && error.response.data.message
              ? error.response.data.message
              : "Échec de l'enregistrement du calendrier."
          this.echeanceError = msg
        })
        .finally(() => { this.echeanceSaving = false })
    },

    // ----- Export PDF -----
    async downloadPDF() {
      try {
        const { default: jsPDF } = await import('jspdf')
        const autoTable = (await import('jspdf-autotable')).default

        const doc = new jsPDF()
        doc.setFontSize(14)
        doc.text(`Scolarité - ${this.className}`, 14, 18)
        doc.setFontSize(10)
        doc.text(`${this.etablissementNom} • ${this.anneeScolaire}`, 14, 25)

        autoTable(doc, {
          startY: 32,
          head: [['Nom complet', 'Total', 'Payé', 'Reste']],
          body: this.eleves.map((e) => [
            `${e.nom} ${e.prenom}`,
            this.formatMoney(e.montantTotal),
            this.formatMoney(e.montantPaye),
            this.formatMoney(e.reste)
          ]),
          headStyles: { fillColor: [76, 175, 80] },
          styles: { fontSize: 9 }
        })

        doc.save(`scolarite_${this.className}_${this.anneeScolaire}.pdf`)
      } catch (error) {
        console.error('Erreur export PDF:', error)
        this.showToast("Pour le PDF : npm install jspdf jspdf-autotable", 'error')
      }
    },

    // ----- Utilitaires -----
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

    showToast(text, type = 'success') {
      this.toast = { show: true, text, type }
      clearTimeout(this._toastTimer)
      this._toastTimer = setTimeout(() => { this.toast.show = false }, 3500)
    }

  }
}
</script>

<style scoped>
.v-data-table { border-radius: 0 0 12px 12px; }

/* ---------- Overlay & modale maison ---------- */
.ov {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 16px;
}

.modal {
  background: #fff;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  font-family: 'Roboto', system-ui, sans-serif;
}
.modal--lg { max-width: 640px; }

.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.modal__head h3 {
  font-size: 20px;
  font-weight: 700;
  color: #2e7d32;
  margin: 0;
}
.modal__close {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  color: #888;
  width: 32px;
  height: 32px;
  border-radius: 8px;
}
.modal__close:hover { background: #f1f1f1; color: #333; }

.modal__sub {
  color: #666;
  font-size: 14px;
  margin: 0 0 16px;
}

.recap {
  display: flex;
  justify-content: space-between;
  background: #f5f6f8;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
}
.recap__right { text-align: right; }
.recap__lbl { display: block; font-size: 12px; color: #888; }
.recap__val { display: block; font-size: 16px; font-weight: 700; color: #222; }
.recap__val--danger { color: #e53935; }

.err {
  background: #fdecea;
  color: #c62828;
  border: 1px solid #f5c6c0;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13.5px;
  margin-bottom: 14px;
}

.lbl {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #444;
  margin: 12px 0 6px;
}
.f-input {
  width: 100%;
  padding: 11px 12px;
  font-size: 15px;
  border: 1px solid #cfd6e0;
  border-radius: 9px;
  background: #fbfcfe;
  color: #222;
  box-sizing: border-box;
}
.f-input:focus {
  outline: none;
  border-color: #43a047;
  box-shadow: 0 0 0 3px rgba(67, 160, 71, 0.15);
  background: #fff;
}

.echeance-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.echeance-row .f-input { margin: 0; }

.row-remove {
  border: none;
  background: #fdecea;
  color: #c62828;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}
.row-remove:hover { background: #f5c6c0; }

.btn--add {
  width: 100%;
  margin-top: 6px;
  background: #eef2f7;
  color: #444;
  border-color: #d4dae2;
}
.btn--add:hover { background: #e3e8ee; }

.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}
.btn {
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 9px;
  border: 1px solid transparent;
  cursor: pointer;
}
.btn--ghost { background: #fff; color: #555; border-color: #d4dae2; }
.btn--ghost:hover { background: #f4f6f9; }
.btn--primary { background: #43a047; color: #fff; }
.btn--primary:hover { background: #388e3c; }
.btn--primary:disabled { background: #a5d6a7; cursor: not-allowed; }

/* ---------- Tableau historique ---------- */
.table-scroll-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.histo { width: 100%; border-collapse: collapse; }
.histo th, .histo td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}
.histo th { color: #777; font-weight: 600; }
.ta-right { text-align: right; }
.val-ok { color: #2e7d32; font-weight: 700; }

.loading, .info {
  text-align: center;
  color: #777;
  padding: 24px;
  font-size: 14px;
}
.info {
  background: #e8f4fd;
  color: #1565c0;
  border-radius: 8px;
}

/* ---------- Toast ---------- */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  padding: 13px 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  z-index: 4000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}
.toast--success { background: #43a047; }
.toast--error { background: #e53935; }
</style>