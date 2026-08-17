<template>
  <div class="perm-page">
    <!-- Header sticky -->
    <div class="perm-topbar">
      <div class="perm-topbar-left">
        <v-icon class="perm-topbar-icon">mdi-message-alert</v-icon>
        <div class="perm-topbar-title">
          <div class="t1">Messages de permission</div>
          <div class="t2">Demandes du mois en cours</div>
        </div>
      </div>

      <div class="perm-topbar-right">
        <v-chip v-if="unreadCount > 0" class="chip-unread" size="small" label>
          {{ unreadCount }} non lu{{ unreadCount > 1 ? "s" : "" }}
        </v-chip>

        <v-btn class="btn-soft" size="small" @click="fetchPermissions(true)" :loading="loading">
          <v-icon start size="18">mdi-refresh</v-icon>
          Rafraîchir
        </v-btn>
      </div>
    </div>

    <v-container fluid class="perm-content">
      <!-- Loading skeleton -->
      <div v-if="loading && !filteredPermissions.length" class="skeleton-wrap">
        <v-skeleton-loader type="list-item-two-line, list-item-two-line, list-item-two-line" />
      </div>

      <!-- Empty -->
      <v-card v-else-if="!filteredPermissions.length" class="empty-card" outlined>
        <v-card-text class="empty-content">
          <div class="empty-icon">
            <v-icon size="42">mdi-inbox-outline</v-icon>
          </div>
          <div class="empty-title">Aucune demande</div>
          <div class="empty-subtitle">
            Aucune demande de permission n’a été reçue pour le mois en cours.
          </div>

          <v-btn class="btn-primary mt-4" @click="fetchPermissions(true)" :loading="loading">
            <v-icon start>mdi-refresh</v-icon>
            Rafraîchir
          </v-btn>
        </v-card-text>
      </v-card>

      <!-- List -->
      <div v-else class="list-wrap">
        <div class="list-head">
          <div class="list-meta">
            <span class="meta-text">
              {{ filteredPermissions.length }} demande{{ filteredPermissions.length > 1 ? "s" : "" }}
            </span>
            <span class="dot">•</span>
            <span class="meta-text">Mois : {{ monthLabel }}</span>
          </div>

          <v-btn
            class="btn-soft"
            size="small"
            @click="markAllAsRead"
            :disabled="unreadCount === 0 || loading"
          >
            <v-icon start size="18">mdi-check-all</v-icon>
            Tout marquer lu
          </v-btn>
        </div>

        <v-row dense>
          <v-col cols="12" md="6" lg="4" v-for="message in filteredPermissions" :key="message.id">
            <v-card class="perm-card" outlined :class="{ 'is-unread': !message.is_read }">
              <div class="perm-card-inner">
                <div class="perm-avatar" :class="{ 'avatar-unread': !message.is_read }">
                  <v-icon size="22">mdi-account-child</v-icon>
                </div>

                <div class="perm-body">
                  <div class="perm-row-top">
                    <div class="perm-title">
                      <span class="student">
                        {{ message.eleve?.nom || "Nom inconnu" }}
                        {{ message.eleve?.prenom || "" }}
                      </span>
                      <span class="class-pill">
                        {{ message.classe?.nom || "Classe inconnue" }}
                      </span>
                    </div>

                    <span v-if="!message.is_read" class="pill-new">NOUVEAU</span>
                  </div>

                  <div class="perm-sub">
                    <span class="sub-item">
                      <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
                      {{ formatDate(message.date) }}
                    </span>

                    <span class="sub-item">
                      <v-icon size="14" class="mr-1">mdi-timer-outline</v-icon>
                      {{ message.duree || "—" }}
                    </span>
                  </div>

                  <div class="perm-desc">
                    Demande de permission pour l’élève indiqué.
                  </div>

                  <div class="perm-actions">
                    <v-chip class="status-chip" size="small" label :class="statusClass(message.statut)">
                      <v-icon start size="16">{{ statusIcon(message.statut) }}</v-icon>
                      {{ prettyStatus(message.statut) }}
                    </v-chip>

                    <v-btn class="btn-primary btn-view" size="small" @click="openDialog(message)">
                      <v-icon start size="18">mdi-eye</v-icon>
                      Consulter
                    </v-btn>
                  </div>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </v-container>

    <!-- Dialog détails permission -->
    <v-dialog v-model="dialog" max-width="920" scrollable>
      <v-card class="dialog-card" rounded="xl">
        <!-- Header sticky -->
        <div class="dialog-header">
          <div class="dialog-header-left">
            <div class="dialog-title">
              <v-icon class="mr-2" color="primary">mdi-information-outline</v-icon>
              Détails de la permission
            </div>
            <div class="dialog-subtitle">
              {{ selectedStudentLabel }} • {{ selectedClassLabel }}
            </div>
          </div>

          <div class="dialog-header-right">
            <v-btn class="btn-soft" size="small" @click="openStatusDialog">
              <v-icon start size="18">mdi-pencil</v-icon>
              Répondre
            </v-btn>

            <v-btn icon variant="text" class="close-x" @click="dialog = false" aria-label="Fermer">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </div>

        <v-divider />

        <!-- Content -->
        <v-card-text class="dialog-body">
          <v-row dense>
            <v-col cols="12" md="6">
              <div class="info-block">
                <div class="info-label">Élève</div>
                <div class="info-value">{{ selectedStudentLabel }}</div>
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <div class="info-block">
                <div class="info-label">Classe</div>
                <div class="info-value">{{ selectedClassLabel }}</div>
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <div class="info-block">
                <div class="info-label">Date</div>
                <div class="info-value">{{ formatDate(selectedMessage?.date) || "—" }}</div>
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <div class="info-block">
                <div class="info-label">Durée</div>
                <div class="info-value">{{ selectedMessage?.duree || "—" }}</div>
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <div class="info-block">
                <div class="info-label">Contact</div>
                <div class="info-value">{{ selectedMessage?.contact || "—" }}</div>
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <div class="info-block">
                <div class="info-label">Statut</div>
                <div class="info-value">
                  <v-chip class="status-chip" size="small" label :class="statusClass(selectedMessage?.statut)">
                    <v-icon start size="16">{{ statusIcon(selectedMessage?.statut) }}</v-icon>
                    {{ prettyStatus(selectedMessage?.statut) }}
                  </v-chip>
                </div>
              </div>
            </v-col>

            <v-col cols="12">
              <div class="info-block">
                <div class="info-label">Motif</div>
                <div class="info-value">
                  {{ selectedMessage?.motif || "Non spécifié" }}
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>

        <!-- Footer sticky -->
        <div class="dialog-footer">
          <v-btn variant="text" @click="dialog = false">
            Fermer
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- Dialog mise à jour statut -->
    <v-dialog v-model="statusDialog" max-width="520">
      <v-card class="status-card" rounded="xl">
        <div class="dialog-header">
          <div class="dialog-title">
            <v-icon class="mr-2" color="primary">mdi-check-decagram</v-icon>
            Mettre à jour le statut
          </div>

          <v-btn icon variant="text" class="close-x" @click="statusDialog = false" aria-label="Fermer">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>

        <v-divider />

        <v-card-text class="dialog-body">
          <v-select
            v-model="selectedStatus"
            :items="statusItems"
            label="Sélectionnez le statut"
            density="comfortable"
            variant="outlined"
          />
        </v-card-text>

        <div class="dialog-footer">
          <v-btn variant="text" @click="statusDialog = false" :disabled="savingStatus">
            Annuler
          </v-btn>
          <v-btn
            class="btn-primary"
            :loading="savingStatus"
            :disabled="savingStatus || !selectedStatus"
            @click="validatePermission"
          >
            Enregistrer
            <v-icon end>mdi-content-save</v-icon>
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :timeout="2500">
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">OK</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script>
import axios from "axios";
import moment from "moment";

export default {
  name: "MessageComponent",
  props: {
    etablissementId: Number,
    etablissementNom: String,
    anneeScolaire: String,
    anneeScolaireId: Number,
  },
  data() {
    return {
      permissions: [],
      filteredPermissions: [],
      dialog: false,
      statusDialog: false,
      selectedMessage: null,
      selectedStatus: "",

      loading: false,
      savingStatus: false,
      snackbar: { show: false, text: "" },

      statusItems: ["autoriser", "non autoriser", "sous reserve de justification"],
    };
  },
  computed: {
    unreadCount() {
      return this.filteredPermissions.filter((p) => !p.is_read).length;
    },
    monthLabel() {
      return moment().format("MMMM YYYY");
    },
    selectedStudentLabel() {
      const n = this.selectedMessage?.eleve?.nom || "Inconnu";
      const p = this.selectedMessage?.eleve?.prenom || "";
      return `${n} ${p}`.trim();
    },
    selectedClassLabel() {
      return this.selectedMessage?.classe?.nom || "Classe inconnue";
    },
  },
  methods: {
    authHeaders() {
      const token = localStorage.getItem("token");
      return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    },

    // ✅ Normalisation : API renvoie Date/Duree/Motif/Statut/Contact -> on force date/duree/motif/statut/contact
    normalizePermission(p) {
      return {
        ...p,
        date: p.date ?? p.Date ?? null,
        duree: p.duree ?? p.Duree ?? "",
        motif: p.motif ?? p.Motif ?? "",
        statut: p.statut ?? p.Statut ?? "",
        contact: p.contact ?? p.Contact ?? "",
        annee_scolaire_id: p.annee_scolaire_id ?? p.Annee_scolaire_id ?? null,
      };
    },

    async fetchPermissions(showToast = false) {
      this.loading = true;
      try {
        const response = await axios.get(
          `/api/permissions/${this.etablissementId}/${this.anneeScolaireId}`,
          this.authHeaders()
        );

        const raw = Array.isArray(response.data) ? response.data : [];
        this.permissions = raw.map((p) => this.normalizePermission(p));

        this.filterPermissionsByMonth();
        await this.fetchStudentsAndClasses();

        if (showToast) this.snackbar = { show: true, text: "Données mises à jour." };
      } catch (error) {
        console.error("Erreur lors de la récupération des permissions :", error);
        this.snackbar = { show: true, text: "Erreur lors du chargement." };
      } finally {
        this.loading = false;
      }
    },

    async markAllAsRead() {
      const unread = this.filteredPermissions.filter((p) => !p.is_read);

      await Promise.all(
        unread.map(async (message) => {
          try {
            await axios.put(`/api/permissions/${message.id}`, {
              is_read: true,
            }, this.authHeaders());
            message.is_read = true;

            // ✅ aussi dans permissions (cohérence)
            this.permissions = this.permissions.map((p) =>
              p.id === message.id ? { ...p, is_read: true } : p
            );
          } catch (error) {
            console.error(`Erreur update is_read pour permission ${message.id} :`, error);
          }
        })
      );
    },

    filterPermissionsByMonth() {
      const currentMonth = moment().month();
      const currentYear = moment().year();
      this.filteredPermissions = this.permissions.filter((permission) => {
        const d = moment(permission.date);
        return d.month() === currentMonth && d.year() === currentYear;
      });
    },

    async fetchStudentsAndClasses() {
      const permissionsWithDetails = await Promise.all(
        this.filteredPermissions.map(async (permission) => {
          try {
            const res = await axios.get(`/api/students/${permission.eleve_id}`, this.authHeaders());
            const { eleveNom, elevePrenom, classeNom } = res.data;

            return {
              ...permission,
              eleve: { nom: eleveNom, prenom: elevePrenom },
              classe: { nom: classeNom },
            };
          } catch (error) {
            return {
              ...permission,
              eleve: { nom: "Inconnu", prenom: "" },
              classe: { nom: "Inconnue" },
            };
          }
        })
      );

      this.filteredPermissions = permissionsWithDetails;
    },

    async openDialog(message) {
      this.selectedMessage = message;
      this.selectedStatus = message?.statut || "";
      this.dialog = true;

      if (!message.is_read) {
        try {
          await axios.put(`/api/permissions/${message.id}`, { is_read: true }, this.authHeaders());
          message.is_read = true;

          // ✅ cohérence de liste
          this.permissions = this.permissions.map((p) =>
            p.id === message.id ? { ...p, is_read: true } : p
          );
        } catch (error) {
          console.error("Erreur update is_read :", error);
        }
      }
    },

    openStatusDialog() {
      this.statusDialog = true;
    },

    async validatePermission() {
      if (!this.selectedMessage?.id) return;

      this.savingStatus = true;
      try {
        await axios.put(`/api/permissions/${this.selectedMessage.id}`, {
          statut: this.selectedStatus,
        }, this.authHeaders());

        this.selectedMessage.statut = this.selectedStatus;

        // ✅ mise à jour dans les listes
        this.permissions = this.permissions.map((p) =>
          p.id === this.selectedMessage.id ? { ...p, statut: this.selectedStatus } : p
        );
        this.filteredPermissions = this.filteredPermissions.map((p) =>
          p.id === this.selectedMessage.id ? { ...p, statut: this.selectedStatus } : p
        );

        this.statusDialog = false;
        this.dialog = false;

        this.snackbar = { show: true, text: "Statut mis à jour." };
      } catch (error) {
        console.error("Erreur lors de la mise à jour du statut :", error);
        this.snackbar = { show: true, text: "Erreur lors de la mise à jour." };
      } finally {
        this.savingStatus = false;
      }
    },

    formatDate(date) {
      if (!date) return "";
      return moment(date).format("DD/MM/YYYY");
    },

    prettyStatus(statut) {
      const s = String(statut || "").toLowerCase().trim();
      if (!s) return "En attente";
      if (s === "autoriser") return "Autorisé";
      if (s === "non autoriser") return "Non autorisé";
      if (s.includes("reserve")) return "Sous réserve";
      return statut;
    },

    statusIcon(statut) {
      const s = String(statut || "").toLowerCase().trim();
      if (!s) return "mdi-timer-sand";
      if (s === "autoriser") return "mdi-check-circle";
      if (s === "non autoriser") return "mdi-close-circle";
      if (s.includes("reserve")) return "mdi-alert-circle";
      return "mdi-information";
    },

    statusClass(statut) {
      const s = String(statut || "").toLowerCase().trim();
      if (!s) return "st-pending";
      if (s === "autoriser") return "st-ok";
      if (s === "non autoriser") return "st-no";
      if (s.includes("reserve")) return "st-warn";
      return "st-pending";
    },
  },
  created() {
    this.fetchPermissions(false);
  },
};
</script>

<style scoped>
/* =========================
   Charte "bleu" + neutres (proche de ton app)
========================= */
.perm-page {
  --primary: #2563eb;
  --primary-600: #1d4ed8;
  --primary-50: #eff6ff;
  --text: #0f172a;
  --muted: #64748b;
  --border: rgba(15, 23, 42, 0.10);
  --card: #ffffff;
  --bg: #f6f8fc;

  min-height: 100vh;
  background: radial-gradient(1200px 500px at 50% -20%, var(--primary-50), transparent 60%),
              linear-gradient(to bottom, var(--bg), #ffffff 55%);
}

/* Topbar */
.perm-topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  backdrop-filter: blur(10px);
  background: rgba(246, 248, 252, 0.75);
  border-bottom: 1px solid var(--border);

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  padding: 12px 14px;
}

.perm-topbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.perm-topbar-icon {
  color: var(--primary-600);
}

.perm-topbar-title .t1 {
  font-weight: 900;
  color: var(--text);
  letter-spacing: -0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.perm-topbar-title .t2 {
  font-size: 0.85rem;
  color: var(--muted);
}

.perm-topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Buttons */
.btn-soft {
  border-radius: 12px;
  border: 1px solid rgba(37, 99, 235, 0.18);
  background: rgba(37, 99, 235, 0.08);
  color: var(--primary-600);
  font-weight: 800;
  text-transform: none;
}

.btn-primary {
  border-radius: 14px;
  background: var(--primary);
  color: #fff;
  font-weight: 900;
  text-transform: none;
}

.btn-primary:hover {
  background: var(--primary-600);
}

.chip-unread {
  background: var(--primary-50);
  color: var(--primary-600);
  border: 1px solid rgba(37, 99, 235, 0.25);
  font-weight: 800;
}

/* Layout */
.perm-content {
  padding: 14px 10px 24px;
}

.skeleton-wrap {
  padding: 6px 6px 0;
}

.list-wrap {
  max-width: 1100px;
  margin: 0 auto;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 10px 6px 12px;
}

.list-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 0.82rem;
  flex-wrap: wrap;
}

.dot {
  opacity: 0.6;
}

/* Card */
.perm-card {
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--card);
  overflow: hidden;
}

.perm-card.is-unread {
  border: 1px solid rgba(37, 99, 235, 0.22);
  background: linear-gradient(0deg, rgba(37, 99, 235, 0.05), rgba(37, 99, 235, 0.05)), var(--card);
}

.perm-card-inner {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 12px;
  padding: 14px;
  align-items: start;
}

.perm-avatar {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: #f1f5f9;
  border: 1px solid rgba(15, 23, 42, 0.08);
  color: #64748b;

  display: flex;
  align-items: center;
  justify-content: center;
}

.perm-avatar.avatar-unread {
  background: rgba(37, 99, 235, 0.10);
  border: 1px solid rgba(37, 99, 235, 0.22);
  color: var(--primary-600);
}

.perm-row-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.perm-title {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.student {
  font-weight: 900;
  color: var(--text);
}

.class-pill {
  font-size: 0.75rem;
  font-weight: 900;
  color: var(--primary-600);
  background: rgba(37, 99, 235, 0.10);
  border: 1px solid rgba(37, 99, 235, 0.22);
  padding: 3px 10px;
  border-radius: 999px;
}

.pill-new {
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: var(--primary-600);
  background: rgba(37, 99, 235, 0.10);
  border: 1px solid rgba(37, 99, 235, 0.22);
  padding: 4px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.perm-sub {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--muted);
  font-size: 0.82rem;
}

.sub-item {
  display: inline-flex;
  align-items: center;
}

.perm-desc {
  margin-top: 8px;
  color: var(--muted);
  font-size: 0.9rem;
}

.perm-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.btn-view {
  min-width: 120px;
}

/* Status chips */
.status-chip {
  border-radius: 999px;
  font-weight: 900;
  text-transform: none;
}

.st-pending {
  background: rgba(100, 116, 139, 0.10);
  border: 1px solid rgba(100, 116, 139, 0.18);
  color: #475569;
}
.st-ok {
  background: rgba(16, 185, 129, 0.10);
  border: 1px solid rgba(16, 185, 129, 0.18);
  color: #047857;
}
.st-no {
  background: rgba(239, 68, 68, 0.10);
  border: 1px solid rgba(239, 68, 68, 0.18);
  color: #b91c1c;
}
.st-warn {
  background: rgba(245, 158, 11, 0.10);
  border: 1px solid rgba(245, 158, 11, 0.18);
  color: #b45309;
}

/* Empty */
.empty-card {
  max-width: 560px;
  margin: 18px auto 0;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--card);
}

.empty-content {
  padding: 20px 18px;
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  margin: 0 auto 10px;
  display: flex;
  align-items: center;
  justify-content: center;

  background: rgba(37, 99, 235, 0.10);
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

/* Dialogs */
.dialog-card,
.status-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.dialog-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #fff;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.dialog-title {
  font-weight: 900;
  color: var(--text);
  display: flex;
  align-items: center;
}

.dialog-subtitle {
  margin-top: 2px;
  font-size: 0.85rem;
  color: var(--muted);
}

.dialog-body {
  padding: 14px;
}

.dialog-footer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: #fff;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  padding: 12px 14px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.close-x {
  margin-top: -2px;
}

/* Info blocks */
.info-block {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  padding: 12px 12px;
  background: #fff;
}

.info-label {
  font-size: 0.78rem;
  color: var(--muted);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  margin-top: 4px;
  font-weight: 900;
  color: var(--text);
}

/* Mobile */
@media (max-width: 600px) {
  .perm-topbar-right .btn-soft {
    padding: 0 10px;
  }
  .perm-card-inner {
    grid-template-columns: 44px 1fr;
    padding: 12px;
  }
  .perm-avatar {
    width: 44px;
    height: 44px;
    border-radius: 14px;
  }
  .btn-view {
    width: 100%;
  }
  .perm-actions {
    justify-content: flex-start;
  }
}
</style>
