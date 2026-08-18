<template>
  <div class="notifications-page">
    <!-- Top bar -->
    <div class="topbar">
      <v-btn icon class="back-btn" @click="goBack" aria-label="Retour">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>

      <div class="topbar-title">
        <div class="title-row">
          <span class="title">Notifications</span>
          <v-chip v-if="unreadCount > 0" class="chip-unread" size="small" label>
            {{ unreadCount }} nouveau{{ unreadCount > 1 ? "x" : "" }}
          </v-chip>
        </div>
        <div class="subtitle">Centre de notifications</div>
      </div>

      <v-btn
        icon
        class="refresh-btn"
        @click="fetchNotifications(true)"
        :loading="loading"
        aria-label="Rafraîchir"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </div>

    <!-- Content -->
    <v-container fluid class="content">
      <!-- Skeleton loader -->
      <div v-if="loading && !notifications.length" class="skeleton-wrap">
        <v-skeleton-loader
          type="list-item-avatar-two-line, list-item-avatar-two-line, list-item-avatar-two-line"
        />
      </div>

      <!-- Empty state -->
      <v-card v-else-if="!notifications.length" class="empty-card" outlined>
        <v-card-text class="empty-content">
          <div class="empty-icon">
            <v-icon size="42">mdi-bell-outline</v-icon>
          </div>
          <div class="empty-text">
            <div class="empty-title">Aucune notification</div>
            <div class="empty-subtitle">
              Quand vous recevrez des alertes, elles s’afficheront ici.
            </div>
          </div>

          <v-btn class="btn-primary mt-4" @click="fetchNotifications(true)" :loading="loading">
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
              {{ notifications.length }} notification{{ notifications.length > 1 ? "s" : "" }}
            </span>
            <span class="dot">•</span>
            <span class="meta-text">Mise à jour : {{ lastUpdatedLabel }}</span>
          </div>

          <v-btn class="btn-soft" @click="markAllAsReadUI" :disabled="unreadCount === 0" size="small">
            <v-icon start size="18">mdi-check-all</v-icon>
            Tout marquer lu
          </v-btn>
        </div>

        <v-row dense>
          <v-col cols="12" v-for="(notif, index) in notificationsUI" :key="notif.key || index">
            <v-card
              class="notif-card"
              outlined
              :class="{ 'is-new': notif.isNew }"
              :elevation="notif.isNew ? 2 : 0"
            >
              <div class="notif-inner">
                <div class="notif-icon" :class="{ 'icon-new': notif.isNew }">
                  <v-icon v-if="notif.isDevoir" size="22">mdi-notebook-edit-outline</v-icon>
                  <v-icon v-else size="22">
                    {{ notif.isNew ? "mdi-bell-alert-outline" : "mdi-bell-outline" }}
                  </v-icon>
                </div>

                <div class="notif-body">
                  <div class="notif-title">
                    <span class="notif-text">{{ notif.text }}</span>
                    <span v-if="notif.isNew" class="pill-new">NOUVELLE</span>
                  </div>

                  <div class="notif-sub">
                    <span class="time">
                      <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
                      {{ notif.timeLabel }}
                    </span>

                    <span v-if="notif.hasMotif" class="motif-chip">
                      <v-icon size="14" class="mr-1">mdi-check-circle</v-icon>
                      Motif déjà renseigné
                    </span>
                  </div>

                  <div v-if="!notif.isDevoir" class="notif-actions">
                    <v-btn
                      v-if="!notif.hasMotif"
                      class="btn-link"
                      variant="text"
                      size="small"
                      @click="openMotifDialog(notif)"
                    >
                      <v-icon start size="18">mdi-comment-text-outline</v-icon>
                      Veuillez notifier la raison de son absence
                    </v-btn>

                    <v-btn
                      v-else
                      class="btn-link"
                      variant="text"
                      size="small"
                      @click="openMotifDialog(notif)"
                    >
                      <v-icon start size="18">mdi-pencil</v-icon>
                      Modifier le motif
                    </v-btn>
                  </div>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- ✅ Dialog Motif (FIX: bouton Envoyer visible) -->
      <v-dialog v-model="motifDialog" max-width="520" scrollable>
        <v-card class="motif-card" rounded="xl">
          <!-- Header sticky -->
          <div class="motif-header">
            <div>
              <div class="motif-title">Motif d’absence</div>
              <div class="motif-subtitle">{{ motifHeaderLabel }}</div>
            </div>

            <v-btn
              icon
              variant="text"
              class="close-x"
              @click="closeMotifDialog"
              :disabled="motifSubmitting"
              aria-label="Fermer"
            >
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>

          <!-- Body scrollable -->
          <v-card-text class="motif-body">
            <v-textarea
              v-model="motifForm.motif"
              label="Motif"
              placeholder="Ex: Rendez-vous médical, maladie, déplacement..."
              :disabled="motifSubmitting"
              auto-grow
              rows="4"
              density="comfortable"
              variant="outlined"
              counter="255"
              maxlength="255"
            />
          </v-card-text>

          <!-- Footer sticky (toujours visible) -->
          <div class="motif-footer">
            <v-btn variant="text" :disabled="motifSubmitting" @click="closeMotifDialog">
              Annuler
            </v-btn>

            <!-- ✅ IMPORTANT: utiliser color/variant Vuetify (pas uniquement CSS) -->
            <v-btn
              color="primary"
              variant="flat"
              class="btn-submit"
              :loading="motifSubmitting"
              :disabled="motifSubmitting"
              @click="submitMotif"
            >
              Envoyer
              <v-icon end>mdi-send</v-icon>
            </v-btn>
          </div>
        </v-card>
      </v-dialog>

      <!-- Snackbar -->
      <v-snackbar v-model="snackbar.show" :timeout="2500">
        {{ snackbar.text }}
        <template #actions>
          <v-btn variant="text" @click="snackbar.show = false">OK</v-btn>
        </template>
      </v-snackbar>
    </v-container>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "NotificationsComponent",
  props: {
    etablissementId: Number,
    anneeScolaireId: Number,
  },
  data() {
    return {
      notifications: [],
      parentId: null,
      loading: false,
      lastUpdatedAt: null,
      snackbar: { show: false, text: "" },

      motifDialog: false,
      motifSubmitting: false,
      selectedNotif: null,
      motifForm: { motif: "" },
    };
  },
  computed: {
    unreadCount() {
      return this.notifications.filter((n) => !this.toBool(n?.is_read)).length;
    },
    notificationsUI() {
      return this.notifications.map((n, index) => {
        const isNew = !this.toBool(n?.is_read);
        const studentName = `${n?.studentName || ""} ${n?.studentPrenom || ""}`.trim();

        if (n?.type === "devoir") {
          const matiere = n?.matiereNom ? ` de ${n.matiereNom}` : "";
          const text = studentName
            ? `Votre enfant ${studentName} a un nouveau devoir${matiere} : ${n?.titre || ""}.`
            : `Nouveau devoir${matiere} : ${n?.titre || ""}.`;

          return {
            key: `devoir-${n?.devoir_id ?? index}`,
            type: "devoir",
            devoir_id: n?.devoir_id,
            date: n?.date,
            isNew,
            hasMotif: false,
            isDevoir: true,
            text,
            timeLabel: this.fakeTime(index),
          };
        }

        const dateLabel = this.relativeDateLabel(n?.date);
        const text = studentName
          ? `Votre enfant ${studentName} ${dateLabel}.`
          : `Absence ${dateLabel}.`;

        return {
          key: `absence-${n?.presence_id ?? index}`,
          type: "absence",
          presence_id: n?.presence_id,
          date: n?.date,
          isNew,
          hasMotif: Boolean(String(n?.motif || "").trim()),
          motif: n?.motif || "",
          isDevoir: false,
          text,
          timeLabel: this.fakeTime(index),
        };
      });
    },
    lastUpdatedLabel() {
      if (!this.lastUpdatedAt) return "—";
      try {
        return this.lastUpdatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } catch {
        return "—";
      }
    },
    motifHeaderLabel() {
      if (!this.selectedNotif) return "Renseignez le motif de l’absence.";
      const student = this.selectedNotif.studentName
        ? `${this.selectedNotif.studentName} ${this.selectedNotif.studentPrenom || ""}`.trim()
        : "";
      const d = this.selectedNotif.date ? this.formatDate(this.selectedNotif.date) : "";
      if (student && d) return `Élève : ${student} • Date : ${d}`;
      if (student) return `Élève : ${student}`;
      if (d) return `Date : ${d}`;
      return "Renseignez le motif de l’absence.";
    },
  },
  methods: {
    toBool(v) {
      return v === true || v === 1 || v === "1";
    },

    async fetchNotifications(showToast = false) {
      const urlParams = new URLSearchParams(window.location.search);
      this.parentId = urlParams.get("id");
      const token = localStorage.getItem("token");

      if (!this.parentId) {
        this.notifications = [];
        this.snackbar = { show: true, text: "Identifiant parent introuvable." };
        return;
      }

      this.loading = true;
      try {
        const res = await axios.get(
          `/api/notificationed/${this.parentId}/${this.etablissementId}/${this.anneeScolaireId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        this.notifications = Array.isArray(res?.data?.notifications) ? res.data.notifications : [];
        this.lastUpdatedAt = new Date();
        if (showToast) this.snackbar = { show: true, text: "Notifications mises à jour." };
      } catch (error) {
        console.error("❌ Erreur chargement notifications :", error?.response?.data || error);
        this.notifications = [];
        this.snackbar = { show: true, text: "Erreur de chargement des notifications." };
      } finally {
        this.loading = false;
      }
    },

    goBack() {
      this.$emit("showComponent", "Acceuil");
    },

    markAllAsReadUI() {
      this.notifications = this.notifications.map((n) => ({ ...n, is_read: true }));
      this.$emit("notificationsOpened");
      this.snackbar = { show: true, text: "Toutes les notifications marquées comme lues." };
    },

    openMotifDialog(notifUI) {
      const original = this.notifications.find((n) => n.presence_id === notifUI.presence_id);
      this.selectedNotif =
        original || { presence_id: notifUI.presence_id, date: notifUI.date };

      this.motifForm.motif = String(this.selectedNotif?.motif || "").trim();
      this.motifDialog = true;
    },

    closeMotifDialog() {
      if (this.motifSubmitting) return;
      this.motifDialog = false;
      this.selectedNotif = null;
      this.motifForm = { motif: "" };
    },

    async submitMotif() {
      const token = localStorage.getItem("token");
      const motif = String(this.motifForm.motif || "").trim();

      if (!this.selectedNotif?.presence_id) {
        this.snackbar = { show: true, text: "Présence introuvable pour cette notification." };
        return;
      }
      if (!motif) {
        this.snackbar = { show: true, text: "Veuillez saisir le motif." };
        return;
      }

      const presenceId = this.selectedNotif.presence_id;

      this.motifSubmitting = true;
      try {
        await axios.post(
          `/api/presence/${encodeURIComponent(presenceId)}/motif`,
          { motif },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        this.snackbar = { show: true, text: "Motif mis à jour avec succès." };

        this.notifications = this.notifications.map((n) =>
          n.presence_id === presenceId ? { ...n, motif } : n
        );

        this.closeMotifDialog();
      } catch (error) {
        console.error("❌ Erreur envoi motif :", error?.response?.data || error);
        const msg =
          typeof error?.response?.data === "string"
            ? error.response.data
            : "Erreur lors de l’envoi du motif.";
        this.snackbar = { show: true, text: msg };
      } finally {
        this.motifSubmitting = false;
      }
    },

    fakeTime(index) {
      const now = new Date();
      const past = new Date(now.getTime() - index * 15 * 60000);
      return past.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    },

    formatDate(d) {
      try {
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return String(d);
        return dt.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
      } catch {
        return String(d);
      }
    },

    relativeDateLabel(d) {
      try {
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return "est absent.";

        const today = new Date();
        const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const d0 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
        const diffDays = Math.round((t0 - d0) / (24 * 60 * 60 * 1000));

        if (diffDays === 0) return "est absent aujourd'hui";
        if (diffDays === 1) return "était absent hier";
        if (diffDays === 2) return "était absent avant-hier";
        return `était absent le ${this.formatDate(dt)}`;
      } catch {
        return "est absent.";
      }
    },
  },
  mounted() {
    this.fetchNotifications(false);
  },
};
</script>

<style scoped>
/* Palette */
.notifications-page {
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
  padding-bottom: 18px;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  backdrop-filter: blur(10px);
  background: rgba(246, 248, 252, 0.75);
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
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subtitle {
  font-size: 0.85rem;
  color: var(--muted);
}

.chip-unread {
  background: var(--primary-50);
  color: var(--primary-600);
  border: 1px solid rgba(37, 99, 235, 0.25);
  font-weight: 700;
}

.content {
  padding: 14px 10px 0;
}

.skeleton-wrap {
  padding: 6px 6px 0;
}

.list-wrap {
  max-width: 760px;
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

.btn-soft {
  border-radius: 12px;
  border: 1px solid rgba(37, 99, 235, 0.18);
  background: rgba(37, 99, 235, 0.08);
  color: var(--primary-600);
  font-weight: 700;
  text-transform: none;
}

.btn-primary {
  border-radius: 14px;
  background: var(--primary);
  color: #fff;
  font-weight: 800;
  text-transform: none;
}

.btn-primary:hover {
  background: var(--primary-600);
}

.notif-card {
  border-radius: 16px;
  background: var(--card);
  border: 1px solid var(--border);
  overflow: hidden;
}

.notif-card.is-new {
  background: linear-gradient(0deg, rgba(37, 99, 235, 0.05), rgba(37, 99, 235, 0.05)),
    var(--card);
  border: 1px solid rgba(37, 99, 235, 0.22);
}

.notif-inner {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 12px;
  padding: 14px 14px;
  align-items: start;
}

.notif-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;

  background: #f1f5f9;
  color: #64748b;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.notif-icon.icon-new {
  background: rgba(37, 99, 235, 0.10);
  color: var(--primary-600);
  border: 1px solid rgba(37, 99, 235, 0.22);
}

.notif-body {
  min-width: 0;
}

.notif-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.notif-text {
  font-size: 0.98rem;
  font-weight: 750;
  color: var(--text);
  line-height: 1.25rem;

  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pill-new {
  flex: 0 0 auto;
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

.notif-sub {
  margin-top: 8px;
  display: flex;
  gap: 10px;
  align-items: center;
  color: var(--muted);
  flex-wrap: wrap;
}

.time {
  display: inline-flex;
  align-items: center;
  font-size: 0.82rem;
}

.motif-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 800;
  color: #0f766e;
  background: rgba(15, 118, 110, 0.10);
  border: 1px solid rgba(15, 118, 110, 0.18);
  padding: 3px 10px;
  border-radius: 999px;
}

.notif-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.btn-link {
  text-transform: none;
  font-weight: 800;
  color: var(--primary-600);
  border-radius: 12px;
}

.btn-link:hover {
  background: rgba(37, 99, 235, 0.08);
}

/* ✅ Dialog motif */
.motif-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.motif-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #fff;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  padding: 14px 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.motif-title {
  font-weight: 900;
  font-size: 1.05rem;
  color: var(--text);
}

.motif-subtitle {
  margin-top: 2px;
  color: var(--muted);
  font-size: 0.9rem;
}

.close-x {
  margin-top: -4px;
}

.motif-body {
  max-height: min(55vh, 420px);
  overflow: auto;
  padding: 16px;
}

.motif-footer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: #fff;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

/* ✅ assure une bonne largeur et un texte visible (même si thème modifié) */
.btn-submit {
  min-width: 140px;
  border-radius: 14px;
  font-weight: 900;
}

@media (max-width: 600px) {
  .content {
    padding: 12px 8px 0;
  }
  .notif-inner {
    padding: 12px 12px;
    gap: 10px;
    grid-template-columns: 42px 1fr;
  }
  .notif-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
  }
  .notif-text {
    font-size: 0.95rem;
    -webkit-line-clamp: 4;
  }
  .list-head {
    margin: 10px 2px 12px;
  }
  .btn-soft {
    padding: 0 10px;
  }
  .notif-actions {
    justify-content: flex-start;
  }
  .motif-body {
    max-height: 55vh;
  }
}
</style>
