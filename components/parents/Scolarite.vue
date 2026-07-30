<template>
  <div class="scolarite-page">
    <!-- Topbar -->
    <div class="topbar">
      <v-btn icon class="back-btn" @click="$emit('back')" aria-label="Retour">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>

      <div class="topbar-title">
        <div class="title">Scolarité</div>
        <div class="subtitle">
          <span class="sub-strong">{{ childName }}</span>
        </div>
      </div>



      

      
      <v-btn
        icon
        class="refresh-btn"
        @click="fetchSummary"
        :loading="loading"
        aria-label="Rafraîchir"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </div>

    <v-container fluid class="content">
      <!-- Error -->
      <v-alert v-if="error" type="error" variant="tonal" class="mb-3" density="compact" border="start">
        {{ error }}
      </v-alert>

      <!-- Loading -->
      <div v-if="loading" class="skeleton-wrap">
        <v-skeleton-loader type="card, list-item-two-line, list-item-two-line" />
      </div>

      <template v-else>
        <!-- Scolarité non définie -->
        <v-card v-if="!summary.defini" class="empty-card" variant="outlined">
          <v-card-text class="empty-content">
            <div class="empty-icon">
              <v-icon size="42">mdi-cash-remove</v-icon>
            </div>
            <div class="empty-title">Scolarité non encore définie</div>
            <div class="empty-subtitle">
              L'administration n'a pas encore renseigné le montant de la scolarité pour cet enfant.
            </div>
          </v-card-text>
        </v-card>

        <div v-else class="wrap">
          <!-- Résumé -->
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-label">Montant total</div>
              <div class="summary-value">{{ formatMoney(summary.montantTotal) }}</div>
            </div>
            <div class="summary-card ok">
              <div class="summary-label">Payé</div>
              <div class="summary-value">{{ formatMoney(summary.montantPaye) }}</div>
            </div>
            <div class="summary-card" :class="Number(summary.reste) > 0 ? 'bad' : 'ok'">
              <div class="summary-label">Reste à payer</div>
              <div class="summary-value">{{ formatMoney(summary.reste) }}</div>
            </div>
          </div>

          <!-- Bouton déclarer paiement -->
          <div class="declare-cta">
            <v-btn
              class="btn-primary"
              prepend-icon="mdi-cash-plus"
              :disabled="Number(summary.reste) <= 0"
              @click="openDeclareForm"
            >
              Déclarer un paiement
            </v-btn>
            <div v-if="Number(summary.reste) <= 0" class="cta-hint">
              La scolarité de cet enfant est entièrement réglée.
            </div>
          </div>

          <!-- Échéances -->
          <div class="section" v-if="summary.echeances.length > 0">
            <div class="section-title">
              <v-icon size="18">mdi-calendar-clock</v-icon>
              Échéances
            </div>

            <div class="echeance-list">
              <div v-for="e in summary.echeances" :key="e.id" class="echeance-item">
                <div class="echeance-main">
                  <div class="echeance-libelle">{{ e.libelle }}</div>
                  <div class="echeance-date">Limite : {{ formatDate(e.dateLimite) }}</div>
                </div>
                <div class="echeance-right">
                  <div class="echeance-montant">{{ formatMoney(e.montant) }}</div>
                  <v-chip size="small" label class="chip-status" :class="echeanceStatusClass(e.statut)">
                    {{ echeanceStatusLabel(e.statut) }}
                  </v-chip>
                </div>
              </div>
            </div>
          </div>

          <!-- Historique -->
          <div class="section">
            <div class="section-title">
              <v-icon size="18">mdi-history</v-icon>
              Historique des paiements
            </div>

            <v-alert
              v-if="summary.historique.length === 0"
              type="info"
              variant="tonal"
              density="compact"
              rounded="lg"
              text="Aucun paiement enregistré pour le moment."
            />

            <div v-else class="histo-list">
              <div v-for="p in summary.historique" :key="p.id" class="histo-item">
                <div class="histo-main">
                  <div class="histo-montant">{{ formatMoney(p.montant) }}</div>
                  <div class="histo-meta">
                    {{ p.modePaiement }} • {{ formatDate(p.datePaiement) }}
                    <span v-if="p.reference"> • Réf: {{ p.reference }}</span>
                  </div>
                  <div v-if="p.statut === 'rejete' && p.motifRejet" class="histo-motif">
                    Motif du rejet : {{ p.motifRejet }}
                  </div>
                </div>
                <v-chip size="small" label class="chip-status" :class="paiementStatusClass(p.statut)">
                  {{ paiementStatusLabel(p.statut) }}
                </v-chip>
              </div>
            </div>
          </div>
        </div>
      </template>
    </v-container>

    <!-- ============================================================= -->
    <!-- MODALE : Déclarer un paiement                                  -->
    <!-- ============================================================= -->
    <ClientOnly>
      <Teleport to="body">
        <div v-if="declareDialog" class="ov" @click.self="closeDeclareForm">
          <div class="modal">
            <div class="modal__head">
              <h3>Déclarer un paiement</h3>
              <button class="modal__close" @click="closeDeclareForm" aria-label="Fermer">✕</button>
            </div>

            <p class="modal__sub">
              Payez par Mobile Money, virement ou en espèces au bureau, puis déclarez ce paiement ici
              avec une preuve. Il sera pris en compte après validation par l'administration.
            </p>

            <div v-if="declareError" class="err">{{ declareError }}</div>

            <label class="lbl">Montant payé (FCFA)</label>
            <input v-model.number="declareForm.montant" type="number" min="0" class="f-input" placeholder="0" />

            <label class="lbl">Mode de paiement</label>
            <select v-model="declareForm.modePaiement" class="f-input">
              <option v-for="m in modesPaiement" :key="m" :value="m">{{ m }}</option>
            </select>

            <label class="lbl">Date du paiement</label>
            <input v-model="declareForm.datePaiement" type="date" class="f-input" />

            <label class="lbl">Référence / N° de transaction (optionnel)</label>
            <input v-model="declareForm.reference" type="text" class="f-input" placeholder="—" />

            <label class="lbl">Preuve de paiement (capture d'écran ou reçu)</label>
            <input type="file" accept="image/*" class="f-input f-file" @change="onCaptureChange" />
            <div v-if="declareForm.captureName" class="capture-name">
              <v-icon size="16">mdi-paperclip</v-icon> {{ declareForm.captureName }}
            </div>

            <div class="modal__actions">
              <button class="btn btn--ghost" @click="closeDeclareForm">Annuler</button>
              <button class="btn btn--primary" :disabled="declareLoading" @click="submitDeclaration">
                {{ declareLoading ? 'Envoi…' : 'Déclarer' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500" location="top end">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script>
import axios from "axios";
import dayjs from "dayjs";

const API = "/api";

export default {
  props: {
    child: { type: Object, default: null },
    childId: { type: [Number, String], required: true },
    etablissementId: { type: [Number, String], required: false },
    anneeScolaireId: { type: [Number, String], required: true },
  },

  data() {
    return {
      loading: false,
      error: null,

      summary: {
        defini: false,
        montantTotal: 0,
        montantPaye: 0,
        reste: 0,
        echeances: [],
        historique: [],
      },

      declareDialog: false,
      declareLoading: false,
      declareError: "",
      modesPaiement: ["Mobile Money", "Espèces", "Virement", "Chèque"],
      declareForm: {
        montant: null,
        modePaiement: "Mobile Money",
        datePaiement: "",
        reference: "",
        captureFile: null,
        captureName: "",
      },

      snackbar: { show: false, message: "", color: "success" },
    };
  },

  computed: {
    childName() {
      if (this.child) return `${this.child.prenom || ""} ${this.child.nom || ""}`.trim();
      return "";
    },
  },

  mounted() {
    this.fetchSummary();
  },

  methods: {
    getToken() {
      return typeof window !== "undefined" ? localStorage.getItem("token") : null;
    },

    async fetchSummary() {
      const token = this.getToken();
      if (!token) {
        this.error = "Session expirée. Veuillez vous reconnecter.";
        return;
      }

      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(
          `${API}/scolarite/enfant/${this.childId}/${this.anneeScolaireId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        this.summary = response.data;
      } catch (err) {
        console.error("Erreur lors du chargement de la scolarité :", err);
        this.error =
          err.response?.data?.message || "Erreur lors du chargement de la scolarité.";
      } finally {
        this.loading = false;
      }
    },

    // ----- Déclaration de paiement -----
    openDeclareForm() {
      this.declareError = "";
      this.declareForm = {
        montant: null,
        modePaiement: "Mobile Money",
        datePaiement: dayjs().format("YYYY-MM-DD"),
        reference: "",
        captureFile: null,
        captureName: "",
      };
      this.declareDialog = true;
    },

    closeDeclareForm() {
      this.declareDialog = false;
    },

    onCaptureChange(event) {
      const file = event.target.files && event.target.files[0];
      this.declareForm.captureFile = file || null;
      this.declareForm.captureName = file ? file.name : "";
    },

    async submitDeclaration() {
      this.declareError = "";

      const montant = Number(this.declareForm.montant);
      const reste = Number(this.summary.reste) || 0;

      if (!montant || montant <= 0) {
        this.declareError = "Veuillez saisir un montant valide.";
        return;
      }
      if (montant > reste) {
        this.declareError = `Le montant dépasse le reste à payer (${this.formatMoney(reste)}).`;
        return;
      }
      if (!this.declareForm.datePaiement) {
        this.declareError = "Veuillez choisir une date.";
        return;
      }
      if (!this.declareForm.captureFile) {
        this.declareError = "Merci de joindre une preuve de paiement (capture ou reçu).";
        return;
      }

      const token = this.getToken();
      if (!token) {
        this.declareError = "Session expirée. Veuillez vous reconnecter.";
        return;
      }

      const formData = new FormData();
      formData.append("eleveId", this.childId);
      formData.append("anneeScolaireId", this.anneeScolaireId);
      formData.append("montant", montant);
      formData.append("modePaiement", this.declareForm.modePaiement);
      formData.append("datePaiement", this.declareForm.datePaiement);
      formData.append("reference", this.declareForm.reference || "");
      formData.append("capture", this.declareForm.captureFile);

      this.declareLoading = true;
      try {
        await axios.post(`${API}/scolarite/paiement/declarer`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        this.declareDialog = false;
        this.showSnackbar("Paiement déclaré. En attente de validation par l'administration.", "success");
        this.fetchSummary();
      } catch (err) {
        console.error("Erreur lors de la déclaration du paiement :", err);
        this.declareError =
          err.response?.data?.message || "Échec de la déclaration du paiement.";
      } finally {
        this.declareLoading = false;
      }
    },

    // ----- Utilitaires -----
    formatMoney(value) {
      const montant = Number(value) || 0;
      return new Intl.NumberFormat("fr-FR").format(montant) + " FCFA";
    },

    formatDate(value) {
      if (!value) return "—";
      const d = dayjs(value);
      return d.isValid() ? d.format("DD/MM/YYYY") : value;
    },

    echeanceStatusLabel(statut) {
      return { payee: "Payée", en_retard: "En retard", a_venir: "À venir" }[statut] || statut;
    },
    echeanceStatusClass(statut) {
      return { payee: "ok", en_retard: "bad", a_venir: "neutral" }[statut] || "neutral";
    },

    paiementStatusLabel(statut) {
      return { valide: "Validé", en_attente: "En attente", rejete: "Rejeté" }[statut] || statut;
    },
    paiementStatusClass(statut) {
      return { valide: "ok", en_attente: "warn", rejete: "bad" }[statut] || "neutral";
    },

    showSnackbar(message, color) {
      this.snackbar = { show: true, message, color };
    },
  },
};
</script>

<style scoped>
/* ===== Page (charte bleue, cohérente avec Presence.vue) ===== */
.scolarite-page {
  --primary: #2563eb;
  --primary-600: #1d4ed8;
  --primary-50: #eff6ff;
  --text: #0f172a;
  --muted: #64748b;
  --border: rgba(15, 23, 42, 0.1);
  --card: #ffffff;
  --bg: #f6f8fc;

  min-height: 100vh;
  background: radial-gradient(1200px 480px at 50% -20%, var(--primary-50), transparent 60%),
    linear-gradient(to bottom, var(--bg), #ffffff 55%);
}

/* ===== Topbar ===== */
.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  backdrop-filter: blur(10px);
  background: rgba(246, 248, 252, 0.82);
  border-bottom: 1px solid var(--border);
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
}
.back-btn,
.refresh-btn {
  border-radius: 12px;
}
.topbar :deep(.v-btn) {
  color: var(--primary-600);
}
.topbar-title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: center;
}
.title {
  font-size: 1.05rem;
  font-weight: 900;
  color: var(--text);
}
.subtitle {
  font-size: 0.85rem;
  color: var(--muted);
}
.sub-strong {
  color: var(--text);
  font-weight: 900;
}

/* ===== Content ===== */
.content {
  padding: 14px 10px 24px;
}
.skeleton-wrap {
  padding: 6px 6px 0;
}
.wrap {
  max-width: 900px;
  margin: 0 auto;
}

/* ===== Empty ===== */
.empty-card {
  max-width: 640px;
  margin: 18px auto 0;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--card);
}
.empty-content {
  padding: 22px 18px;
  text-align: center;
}
.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  margin: 0 auto 10px;
  display: grid;
  place-items: center;
  background: rgba(37, 99, 235, 0.1);
  color: var(--primary-600);
  border: 1px solid rgba(37, 99, 235, 0.22);
}
.empty-title {
  font-size: 1.05rem;
  font-weight: 900;
  color: var(--text);
}
.empty-subtitle {
  margin-top: 4px;
  font-size: 0.9rem;
  color: var(--muted);
}

/* ===== Résumé ===== */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
.summary-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px 12px;
  text-align: center;
}
.summary-label {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.summary-value {
  margin-top: 4px;
  font-size: 1.05rem;
  font-weight: 950;
  color: var(--text);
}
.summary-card.ok .summary-value {
  color: #166534;
}
.summary-card.bad .summary-value {
  color: #991b1b;
}

/* ===== CTA déclarer ===== */
.declare-cta {
  text-align: center;
  margin-bottom: 22px;
}
.btn-primary {
  border-radius: 14px;
  background: var(--primary);
  color: #fff;
  font-weight: 950;
  text-transform: none;
  padding: 0 22px;
}
.btn-primary:hover {
  background: var(--primary-600);
}
.cta-hint {
  margin-top: 8px;
  font-size: 0.85rem;
  color: var(--muted);
}

/* ===== Sections ===== */
.section {
  margin-bottom: 22px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 900;
  color: var(--text);
  margin-bottom: 10px;
  font-size: 0.98rem;
}

/* ===== Échéances ===== */
.echeance-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.echeance-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px 14px;
}
.echeance-libelle {
  font-weight: 800;
  color: var(--text);
}
.echeance-date {
  font-size: 0.82rem;
  color: var(--muted);
  margin-top: 2px;
}
.echeance-right {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.echeance-montant {
  font-weight: 900;
  color: var(--text);
}

/* ===== Historique ===== */
.histo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.histo-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px 14px;
  gap: 10px;
}
.histo-montant {
  font-weight: 900;
  color: var(--text);
}
.histo-meta {
  font-size: 0.82rem;
  color: var(--muted);
  margin-top: 2px;
}
.histo-motif {
  font-size: 0.8rem;
  color: #991b1b;
  margin-top: 4px;
}

/* ===== Chip statut (partagé) ===== */
.chip-status {
  border-radius: 999px;
  font-weight: 900;
  flex: 0 0 auto;
}
.chip-status.ok {
  background: rgba(22, 163, 74, 0.1);
  color: #166534;
  border: 1px solid rgba(22, 163, 74, 0.22);
}
.chip-status.bad {
  background: rgba(239, 68, 68, 0.1);
  color: #991b1b;
  border: 1px solid rgba(239, 68, 68, 0.22);
}
.chip-status.warn {
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
  border: 1px solid rgba(245, 158, 11, 0.24);
}
.chip-status.neutral {
  background: rgba(100, 116, 139, 0.1);
  color: #334155;
  border: 1px solid rgba(100, 116, 139, 0.2);
}

/* ===== Modale déclaration (même style que ScolariteDetail admin) ===== */
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
  font-family: "Roboto", system-ui, sans-serif;
}
.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.modal__head h3 {
  font-size: 19px;
  font-weight: 800;
  color: #1d4ed8;
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
.modal__close:hover {
  background: #f1f1f1;
  color: #333;
}
.modal__sub {
  color: #666;
  font-size: 13.5px;
  line-height: 1.4;
  margin: 0 0 16px;
}
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
  font-weight: 700;
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
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  background: #fff;
}
.f-file {
  padding: 8px 10px;
}
.capture-name {
  margin-top: 6px;
  font-size: 12.5px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}
.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}
.btn {
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 9px;
  border: 1px solid transparent;
  cursor: pointer;
}
.btn--ghost {
  background: #fff;
  color: #555;
  border-color: #d4dae2;
}
.btn--ghost:hover {
  background: #f4f6f9;
}
.btn--primary {
  background: #2563eb;
  color: #fff;
}
.btn--primary:hover {
  background: #1d4ed8;
}
.btn--primary:disabled {
  background: #93b4f5;
  cursor: not-allowed;
}

/* ===== Responsive ===== */
@media (max-width: 600px) {
  .content {
    padding: 12px 8px 18px;
  }
  .summary-grid {
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
  }
  .summary-card {
    padding: 10px 6px;
  }
  .summary-value {
    font-size: 0.92rem;
  }
}
</style>
