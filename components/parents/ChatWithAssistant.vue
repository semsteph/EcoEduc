<template>
  <div class="chat-page">
    <!-- Topbar -->
    <div class="topbar">
      <v-btn icon class="back-btn" @click="$emit('back')" aria-label="Retour">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>

      <div class="topbar-title">
        <div class="title">Assistant {{ subjectName }}</div>
        <div class="subtitle" v-if="activity">{{ activity }}</div>
      </div>

      <div class="topbar-spacer"></div>
    </div>

    <v-alert v-if="loadError" type="error" variant="tonal" class="mx-3 mt-3" density="compact" border="start">
      {{ loadError }}
    </v-alert>

    <div v-if="loadingHistory" class="skeleton-wrap">
      <v-skeleton-loader type="list-item-two-line, list-item-two-line, list-item-two-line" />
    </div>

    <template v-else>
      <!-- Messages -->
      <div class="messages" ref="messagesEl">
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="bubble-row"
          :class="message.role === 'user' ? 'row-user' : 'row-assistant'"
        >
          <div class="bubble" :class="message.role === 'user' ? 'bubble-user' : 'bubble-assistant'">
            {{ message.content }}
          </div>
        </div>

        <div v-if="sending" class="bubble-row row-assistant">
          <div class="bubble bubble-assistant bubble-typing">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>

      <!-- Erreur d'envoi -->
      <v-alert
        v-if="sendError"
        type="warning"
        variant="tonal"
        class="mx-3 mb-2"
        density="compact"
        border="start"
      >
        {{ sendError }}
      </v-alert>

      <!-- Input -->
      <div class="composer">
        <v-textarea
          v-model="userMessage"
          placeholder="Écris ta question ici…"
          rows="1"
          auto-grow
          max-rows="4"
          variant="outlined"
          density="comfortable"
          hide-details
          class="composer-input"
          :disabled="sending"
          @keydown.enter.exact.prevent="sendMessage"
        />
        <v-btn
          icon
          class="send-btn"
          color="primary"
          :disabled="!userMessage.trim() || sending"
          :loading="sending"
          @click="sendMessage"
          aria-label="Envoyer"
        >
          <v-icon>mdi-send</v-icon>
        </v-btn>
      </div>
    </template>
  </div>
</template>

<script>
import axios from "axios";
import dayjs from "dayjs";

const API = "/api/parent/assistant";

export default {
  props: {
    eleveId: { type: Number, required: true },
    testId: { type: Number, required: true },
    subjectName: { type: String, required: true },
    childName: { type: String, required: true },
    activity: { type: String, default: "" },
    date: { type: [String, Date], default: null },
  },
  emits: ["back"],
  data() {
    return {
      messages: [],
      userMessage: "",
      loadingHistory: true,
      loadError: null,
      sending: false,
      sendError: null,
    };
  },
  created() {
    this.fetchHistory();
  },
  methods: {
    getToken() {
      return typeof window !== "undefined" ? localStorage.getItem("token") : null;
    },

    getGreeting() {
      const hours = new Date().getHours();
      return hours < 12 ? "Bonjour" : "Bonsoir";
    },

    getTimeDescription() {
      if (!this.date) return "récemment";
      const parsedDate = dayjs(this.date);
      const today = dayjs();
      const difference = today.startOf("day").diff(parsedDate.startOf("day"), "day");

      if (difference === 0) return "aujourd'hui";
      if (difference === 1) return "hier";
      if (difference === 2) return "avant-hier";
      if (difference > 2) return `il y a ${difference} jours`;
      return "récemment";
    },

    formatInitialMessage() {
      const firstName = this.childName.split(" ")[0] || this.childName;
      const activityText = this.activity || "une activité";
      return `${this.getGreeting()} ${firstName}, je suis ton assistant en ${this.subjectName}. Vous avez fait ${activityText} (${this.getTimeDescription()}). Qu'est-ce que tu n'as pas compris, ou qu'aimerais-tu comprendre davantage ?`;
    },

    async fetchHistory() {
      const token = this.getToken();
      if (!token) {
        this.loadError = "Session expirée. Veuillez vous reconnecter.";
        this.loadingHistory = false;
        return;
      }

      this.loadingHistory = true;
      this.loadError = null;
      try {
        const response = await axios.get(`${API}/conversation/${this.eleveId}/${this.testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const history = Array.isArray(response.data?.messages) ? response.data.messages : [];

        if (history.length === 0) {
          this.messages = [{ role: "assistant", content: this.formatInitialMessage() }];
        } else {
          this.messages = history.map((m) => ({ role: m.role, content: m.content }));
        }
      } catch (err) {
        console.error("Erreur lors du chargement de la conversation :", err);
        this.loadError =
          err.response?.data?.message || "Impossible de charger la conversation.";
      } finally {
        this.loadingHistory = false;
        this.scrollToBottom();
      }
    },

    async sendMessage() {
      const text = this.userMessage.trim();
      if (!text || this.sending) return;

      this.sendError = null;
      this.messages.push({ role: "user", content: text });
      this.userMessage = "";
      this.sending = true;
      this.scrollToBottom();

      try {
        const token = this.getToken();
        const response = await axios.post(
          `${API}/message`,
          { eleveId: this.eleveId, testId: this.testId, userMessage: text },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        this.messages.push({ role: "assistant", content: response.data.reply });
      } catch (err) {
        console.error("Erreur lors de l'envoi du message :", err);
        this.sendError =
          err.response?.data?.message ||
          "Une erreur est survenue. Réessaie dans quelques instants.";
      } finally {
        this.sending = false;
        this.scrollToBottom();
      }
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const el = this.$refs.messagesEl;
        if (el) el.scrollTop = el.scrollHeight;
      });
    },
  },
};
</script>

<style scoped>
/* ===== Page (charte bleue, cohérente avec Presence.vue / Assistances.vue) ===== */
.chat-page {
  --primary: #2563eb;
  --primary-600: #1d4ed8;
  --primary-50: #eff6ff;
  --text: #0f172a;
  --muted: #64748b;
  --border: rgba(15, 23, 42, 0.1);
  --bg: #f6f8fc;

  display: flex;
  flex-direction: column;
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
.back-btn {
  border-radius: 12px;
}
.topbar :deep(.v-btn) {
  color: var(--primary-600);
}
.topbar-title {
  min-width: 0;
  text-align: center;
}
.title {
  font-size: 1.05rem;
  font-weight: 900;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.subtitle {
  font-size: 0.82rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.topbar-spacer {
  width: 44px;
}

.skeleton-wrap {
  padding: 14px 12px 0;
}

/* ===== Messages ===== */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
}

.bubble-row {
  display: flex;
}
.row-user {
  justify-content: flex-end;
}
.row-assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 78%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 0.94rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}
.bubble-user {
  background: var(--primary);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.bubble-assistant {
  background: #fff;
  color: var(--text);
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
}

.bubble-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 14px 16px;
}
.bubble-typing .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted);
  opacity: 0.6;
  animation: typing 1.2s infinite ease-in-out;
}
.bubble-typing .dot:nth-child(2) {
  animation-delay: 0.15s;
}
.bubble-typing .dot:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}

/* ===== Composer ===== */
.composer {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(246, 248, 252, 0.92);
  border-top: 1px solid var(--border);
  backdrop-filter: blur(10px);
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
}
.composer-input {
  flex: 1;
}
.send-btn {
  flex: 0 0 auto;
}

/* ===== Responsive ===== */
@media (max-width: 600px) {
  .messages {
    padding: 12px 8px;
  }
  .bubble {
    max-width: 86%;
  }
}
</style>
