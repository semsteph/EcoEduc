<template>
  <div class="chat-page">

    <!-- ============================================================ -->
    <!-- TOPBAR                                                       -->
    <!-- ============================================================ -->

    <div class="topbar">
      <v-btn
        icon
        class="back-btn"
        @click="$emit('back')"
        aria-label="Retour"
      >
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>

      <div class="topbar-title">
        <div class="title-row">
          <div class="assistant-avatar avatar-sm">
            <v-icon size="16">mdi-account</v-icon>
          </div>

          <div class="title">
            Assistant {{ subjectName }}
          </div>
        </div>

        <div
          v-if="activity"
          class="subtitle"
        >
          {{ activity }}
        </div>
      </div>

      <div class="topbar-spacer"></div>
    </div>

    <!-- ============================================================ -->
    <!-- ERREUR DE CHARGEMENT                                         -->
    <!-- ============================================================ -->

    <v-alert
      v-if="loadError"
      type="error"
      variant="tonal"
      class="mx-3 mt-3"
      density="compact"
      border="start"
    >
      {{ loadError }}
    </v-alert>

    <!-- ============================================================ -->
    <!-- CHARGEMENT                                                    -->
    <!-- ============================================================ -->

    <div
      v-if="loadingHistory"
      class="skeleton-wrap"
    >
      <v-skeleton-loader
        type="list-item-two-line, list-item-two-line, list-item-two-line"
      />
    </div>

    <template v-else>

      <!-- ========================================================== -->
      <!-- MESSAGES                                                    -->
      <!-- ========================================================== -->

      <div
        ref="messagesEl"
        class="messages"
      >
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="message-item"
        >
          <!-- ====================================================== -->
          <!-- DERNIER MESSAGE ASSISTANT AVEC SCHÉMAS SEGMENTÉS      -->
          <!-- Chaque notion garde son propre schéma, à sa place,   -->
          <!-- plutôt qu'un schéma unique regroupé à la fin.        -->
          <!-- ====================================================== -->
          <template
            v-if="
              message.role !== 'user' &&
              index === messages.length - 1 &&
              explanationSegments.length
            "
          >
            <div
              v-for="(segment, segIndex) in explanationSegments"
              :key="'segment-' + segIndex"
            >
              <div
                v-if="segment.text"
                class="bubble-row row-assistant"
              >
                <div class="assistant-avatar avatar-sm">
                  <v-icon size="16">mdi-account</v-icon>
                </div>

                <div
                  class="bubble bubble-assistant"
                  v-html="formatMessage(segment.text)"
                ></div>
              </div>

              <div
                v-if="segment.diagram"
                class="explanation-diagram-wrap"
              >
                <GeometryDiagram :diagram="segment.diagram" />
              </div>
            </div>
          </template>

          <!-- ====================================================== -->
          <!-- MESSAGE NORMAL (utilisateur, ou historique)          -->
          <!-- ====================================================== -->
          <div
            v-else
            class="bubble-row"
            :class="message.role === 'user' ? 'row-user' : 'row-assistant'"
          >
            <!-- Avatar assistant -->
            <div
              v-if="message.role !== 'user'"
              class="assistant-avatar avatar-sm"
            >
              <v-icon size="16">
                mdi-account
              </v-icon>
            </div>

            <!-- Message -->
            <div
              class="bubble"
              :class="message.role === 'user' ? 'bubble-user' : 'bubble-assistant'"
              v-html="formatMessage(message.content)"
            ></div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- EXERCICE STRUCTURÉ + VRAI SCHÉMA SVG                     -->
        <!-- ======================================================== -->

        <div
          v-if="currentExercise"
          class="exercise-card"
        >
          <div class="exercise-header">
            <v-icon size="20">mdi-pencil-outline</v-icon>
            <span>Exercice</span>
          </div>

          <div class="exercise-prompt">
            {{ currentExercise.prompt }}
          </div>

          <GeometryDiagram
            v-if="currentExercise.diagram"
            :diagram="currentExercise.diagram"
          />
        </div>

        <!-- ======================================================== -->
        <!-- INDICATEUR DE RÉPONSE                                     -->
        <!-- ======================================================== -->

        <div
          v-if="sending"
          class="bubble-row row-assistant"
        >
          <div class="assistant-avatar avatar-sm">
            <v-icon size="16">
              mdi-account
            </v-icon>
          </div>

          <div class="bubble bubble-assistant bubble-typing">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>

      <!-- ========================================================== -->
      <!-- ERREUR D'ENVOI                                              -->
      <!-- ========================================================== -->

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

      <!-- ========================================================== -->
      <!-- INDICATION PÉDAGOGIQUE                                     -->
      <!-- ========================================================== -->

      <div
        v-if="showModeHint"
        class="mode-hint"
      >
        <v-icon
          size="17"
          class="mr-1"
        >
          {{ modeHintIcon }}
        </v-icon>

        <span>
          {{ modeHint }}
        </span>
      </div>

      <!-- ========================================================== -->
      <!-- ZONE DE SAISIE                                              -->
      <!-- ========================================================== -->

      <div class="composer">
        <v-textarea
          v-model="userMessage"
          :placeholder="composerPlaceholder"
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
          <v-icon>
            mdi-send
          </v-icon>
        </v-btn>
      </div>

    </template>
  </div>
</template>

<script>
import axios from "axios";
import dayjs from "dayjs";
import GeometryDiagram from "./GeometryDiagram.vue";

const API = "/api/parent/assistant";

export default {
  components: {
    GeometryDiagram,
  },

  props: {
    eleveId: {
      type: Number,
      required: true,
    },

    testId: {
      type: Number,
      required: true,
    },

    subjectName: {
      type: String,
      required: true,
    },

    childName: {
      type: String,
      required: true,
    },

    activity: {
      type: String,
      default: "",
    },

    date: {
      type: [String, Date],
      default: null,
    },
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

      /*
       * IMPORTANT :
       * Le frontend ne reçoit pas les états internes du tuteur.
       *
       * Il reçoit uniquement un mode public :
       * - question
       * - exercise
       * - book
       * - follow_up
       */
      inputMode: "question",
      currentExercise: null,
      explanationSegments: [],
    };
  },

  created() {
    this.fetchHistory();
  },

  methods: {
    // ==============================================================
    // TOKEN
    // ==============================================================

    getToken() {
      if (typeof window === "undefined") {
        return null;
      }

      return localStorage.getItem("token");
    },

    // ==============================================================
    // SALUTATION
    // ==============================================================

    getGreeting() {
      const hours = new Date().getHours();

      return hours < 12
        ? "Bonjour"
        : "Bonsoir";
    },

    // ==============================================================
    // DESCRIPTION DE LA DATE
    // ==============================================================

    getTimeDescription() {
      if (!this.date) {
        return "récemment";
      }

      const parsedDate = dayjs(this.date);

      if (!parsedDate.isValid()) {
        return "récemment";
      }

      const today = dayjs();

      const difference = today
        .startOf("day")
        .diff(
          parsedDate.startOf("day"),
          "day"
        );

      if (difference === 0) {
        return "aujourd'hui";
      }

      if (difference === 1) {
        return "hier";
      }

      if (difference === 2) {
        return "avant-hier";
      }

      if (difference > 2) {
        return `il y a ${difference} jours`;
      }

      return "récemment";
    },

    // ==============================================================
    // MESSAGE INITIAL
    // ==============================================================

    formatInitialMessage() {
      const firstName =
        this.childName.split(" ")[0] ||
        this.childName;

      const activityText =
        this.activity || "une activité";

      return `${this.getGreeting()} ${firstName}. Vous aviez abordé en classe ${activityText} en ${this.subjectName} (${this.getTimeDescription()}). Qu'est-ce que tu n'as pas compris, ou qu'aimerais-tu mieux comprendre ?`;
    },

    // ==============================================================
    // CHARGEMENT DE LA CONVERSATION
    // ==============================================================

    async fetchHistory() {
      const token = this.getToken();

      if (!token) {
        this.loadError =
          "Session expirée. Veuillez vous reconnecter.";

        this.loadingHistory = false;

        return;
      }

      this.loadingHistory = true;
      this.loadError = null;

      try {
        const response = await axios.get(
          `${API}/conversation/${this.eleveId}/${this.testId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 15000,
          }
        );

        // ----------------------------------------------------------
        // Historique des messages
        // ----------------------------------------------------------

        const history = Array.isArray(
          response.data?.messages
        )
          ? response.data.messages
          : [];

        if (history.length === 0) {
          this.messages = [
            {
              role: "assistant",
              content: this.formatInitialMessage(),
            },
          ];
        } else {
          this.messages = history.map((message) => ({
            role: message.role,
            content: message.content,
          }));
        }

        // ----------------------------------------------------------
        // Mode pédagogique public
        // ----------------------------------------------------------

        const returnedMode =
          response.data?.inputMode;

        if (
          [
            "question",
            "exercise",
            "book",
            "follow_up",
          ].includes(returnedMode)
        ) {
          this.inputMode = returnedMode;
        } else {
          this.inputMode = "question";
        }

        this.currentExercise =
          response.data?.exercise || null;

        this.explanationSegments = Array.isArray(
          response.data?.explanationSegments
        )
          ? response.data.explanationSegments
          : [];
      } catch (err) {
        console.error(
          "Erreur lors du chargement de la conversation :",
          err
        );

        this.loadError =
          err.response?.data?.message ||
          "Impossible de charger la conversation.";
      } finally {
        this.loadingHistory = false;
        this.scrollToBottom();
      }
    },

    // ==============================================================
    // ENVOI DU MESSAGE
    // ==============================================================

    async sendMessage() {
      const text =
        this.userMessage.trim();

      if (!text || this.sending) {
        return;
      }

      this.sendError = null;

      // Les schémas appartiennent à la dernière réponse de l'assistant.
      // On les retire immédiatement lorsqu'une nouvelle question est envoyée.
      this.explanationSegments = [];

      // ----------------------------------------------------------
      // Affichage immédiat du message utilisateur
      // ----------------------------------------------------------

      this.messages.push({
        role: "user",
        content: text,
      });

      this.userMessage = "";
      this.sending = true;

      this.scrollToBottom();

      try {
        const token =
          this.getToken();

        if (!token) {
          this.sendError =
            "Session expirée. Veuillez vous reconnecter.";

          return;
        }

        // --------------------------------------------------------
        // Appel du backend
        // --------------------------------------------------------

        const response =
          await axios.post(
            `${API}/message`,
            {
              eleveId:
                this.eleveId,

              testId:
                this.testId,

              userMessage:
                text,
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        // --------------------------------------------------------
        // Réponse de l'assistant
        // --------------------------------------------------------

        if (
          response.data?.reply
        ) {
          this.messages.push({
            role: "assistant",
            content:
              response.data.reply,
          });
        }

        // --------------------------------------------------------
        // Nouveau mode pédagogique
        // --------------------------------------------------------

        const returnedMode =
          response.data?.inputMode;

        if (
          [
            "question",
            "exercise",
            "book",
            "follow_up",
          ].includes(returnedMode)
        ) {
          this.inputMode =
            returnedMode;
        }

        this.currentExercise =
          response.data?.exercise || null;

        this.explanationSegments = Array.isArray(
          response.data?.explanationSegments
        )
          ? response.data.explanationSegments
          : [];
      } catch (err) {
        console.error(
          "Erreur lors de l'envoi du message :",
          err
        );

        this.sendError =
          err.response?.data?.message ||
          "Une erreur est survenue. Réessaie dans quelques instants.";
      } finally {
        this.sending = false;
        this.scrollToBottom();
      }
    },

    // ==============================================================
    // SCROLL AUTOMATIQUE
    // ==============================================================

    scrollToBottom() {
      this.$nextTick(() => {
        const el =
          this.$refs.messagesEl;

        if (el) {
          el.scrollTop =
            el.scrollHeight;
        }
      });
    },

    // ==============================================================
    // MISE EN FORME DU MESSAGE
    // ==============================================================
    //
    // Rendu minimal et sûr : le texte brut est d'abord échappé (pas de
    // HTML injectable), puis seuls **gras** et *italique* sont convertis.
    // Un éventuel bloc de code résiduel (schéma dessiné par erreur) est
    // retiré plutôt qu'affiché tel quel.
    // ==============================================================

    formatMessage(content) {
      const raw = String(content || "")
        .replace(/```[\s\S]*?```/g, "")
        .trim();

      const escaped = raw
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      return escaped
        .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
    },
  },

  // ================================================================
  // PROPRIÉTÉS CALCULÉES
  // ================================================================

  computed: {
    // ==============================================================
    // PLACEHOLDER
    // ==============================================================

    composerPlaceholder() {
      switch (this.inputMode) {
        case "exercise":
          return "Écris ta réponse ou explique ta méthode…";

        case "book":
          return "Écris le nom de ton manuel…";

        case "follow_up":
          return "Écris ta question ou ta réponse…";

        case "question":
        default:
          return "Écris ta question ici…";
      }
    },

    // ==============================================================
    // MESSAGE D'AIDE
    // ==============================================================

    modeHint() {
      switch (this.inputMode) {
        case "exercise":
          return "À toi de jouer ! Essaie de résoudre le petit exercice.";

        case "book":
          return "Indique le nom du manuel que tu utilises à la maison.";

        case "follow_up":
          return "Tu peux continuer à poser tes questions sur cette activité.";

        case "question":
        default:
          return "";
      }
    },

    // ==============================================================
    // ICÔNE DU MODE
    // ==============================================================

    modeHintIcon() {
      switch (this.inputMode) {
        case "exercise":
          return "mdi-pencil";

        case "book":
          return "mdi-book-open-page-variant";

        case "follow_up":
          return "mdi-comment-question-outline";

        case "question":
        default:
          return "mdi-help-circle-outline";
      }
    },

    // ==============================================================
    // AFFICHAGE DE L'AIDE
    // ==============================================================

    showModeHint() {
      return [
        "exercise",
        "book",
        "follow_up",
      ].includes(this.inputMode);
    },
  },
};
</script>

<style scoped>
/* ================================================================= */
/* PAGE                                                              */
/* ================================================================= */

.chat-page {
  --primary: #ff7a45;
  --primary-600: #f4622a;
  --primary-50: #fff1e6;
  --accent: #0d9488;
  --accent-50: #e6f7f5;
  --accent-2: #7c3aed;
  --text: #2a2a3c;
  --muted: #8a8aa0;
  --border: rgba(42, 42, 60, 0.08);
  --bg: #fff8f1;

  display: flex;
  flex-direction: column;
  min-height: 100vh;

  background:
    radial-gradient(
      1100px 460px at 15% -10%,
      var(--primary-50),
      transparent 55%
    ),
    radial-gradient(
      900px 420px at 100% 0%,
      var(--accent-50),
      transparent 55%
    ),
    linear-gradient(
      to bottom,
      var(--bg),
      #fffdf9 60%
    );
}

/* ================================================================= */
/* TOPBAR                                                            */
/* ================================================================= */

.topbar {
  position: sticky;
  top: 0;
  z-index: 5;

  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  gap: 10px;

  padding: 12px 14px;

  background: rgba(255, 253, 249, 0.85);

  border-bottom: 1px solid var(--border);

  backdrop-filter: blur(10px);
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

.title-row {
  display: flex;
  align-items: center;
  justify-content: center;

  gap: 6px;
  min-width: 0;
}

.title {
  font-size: 1.05rem;
  font-weight: 900;

  color: var(--text);

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ================================================================= */
/* AVATAR                                                            */
/* ================================================================= */

.assistant-avatar {
  width: 30px;
  height: 30px;

  display: grid;
  place-items: center;

  flex: 0 0 auto;

  border-radius: 50%;

  background:
    linear-gradient(
      135deg,
      var(--accent),
      #0b7a70
    );

  color: #fff;

  box-shadow:
    0 2px 8px
    rgba(13, 148, 136, 0.4);
}

.avatar-sm {
  width: 26px;
  height: 26px;
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

/* ================================================================= */
/* LOADING                                                           */
/* ================================================================= */

.skeleton-wrap {
  padding: 14px 12px 0;
}

/* ================================================================= */
/* MESSAGES                                                          */
/* ================================================================= */

.messages {
  flex: 1;

  width: 100%;
  max-width: 760px;

  margin: 0 auto;

  display: flex;
  flex-direction: column;
  gap: 10px;

  overflow-y: auto;

  padding: 16px 12px;
}

.bubble-row {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.row-user {
  justify-content: flex-end;
}

.row-assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 78%;

  padding: 11px 15px;

  border-radius: 20px;

  font-size: 0.94rem;
  line-height: 1.45;

  white-space: pre-wrap;
  word-break: break-word;
}

.bubble-user {
  background: linear-gradient(135deg, var(--primary), var(--primary-600));
  color: #fff;

  box-shadow: 0 4px 14px rgba(244, 98, 42, 0.28);

  border-bottom-right-radius: 6px;
}

.bubble-assistant {
  background: #fff;
  color: var(--text);

  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);

  box-shadow: 0 3px 12px rgba(42, 42, 60, 0.05);

  border-bottom-left-radius: 6px;
}

/* ================================================================= */
/* EXERCICE                                                          */
/* ================================================================= */

.exercise-card {
  position: relative;
  width: 100%;
  max-width: 760px;
  margin: 4px auto 8px;
  padding: 18px 16px 16px;
  background: #ffffff;
  border: 1px solid rgba(124, 58, 237, 0.14);
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.08);
  overflow: hidden;
}

.exercise-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: linear-gradient(90deg, var(--primary), var(--accent-2), var(--accent));
}

.exercise-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-2);
  font-weight: 900;
  margin-bottom: 10px;
}

.exercise-prompt {
  color: var(--text);
  font-size: 0.96rem;
  line-height: 1.55;
  white-space: pre-wrap;
}

@media (max-width: 600px) {
  .exercise-card {
    margin-left: 8px;
    margin-right: 8px;
    width: calc(100% - 16px);
    padding: 14px;
  }
}

/* ================================================================= */
/* INDICATEUR DE FRAPPE                                             */
/* ================================================================= */

.bubble-typing {
  display: flex;
  align-items: center;
  gap: 4px;

  padding: 14px 16px;
}

.bubble-typing .dot {
  width: 7px;
  height: 7px;

  border-radius: 50%;

  background: var(--accent);

  opacity: 0.7;

  animation: typing 1.2s infinite ease-in-out;
}

.bubble-typing .dot:nth-child(1) {
  background: var(--primary);
}

.bubble-typing .dot:nth-child(2) {
  background: var(--accent-2);
  animation-delay: 0.15s;
}

.bubble-typing .dot:nth-child(3) {
  background: var(--accent);
  animation-delay: 0.3s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }

  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

/* ================================================================= */
/* INDICATION DU MODE PÉDAGOGIQUE                                   */
/* ================================================================= */

.mode-hint {
  width: min(100%, 520px);

  margin: 6px auto;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  padding: 8px 16px;

  color: #fff;

  background: linear-gradient(90deg, var(--accent), #0b7a70);
  border-radius: 999px;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.28);

  font-size: 0.82rem;
  font-weight: 700;

  text-align: center;
}

.mode-hint :deep(.v-icon) {
  color: #fff;
}

/* ================================================================= */
/* COMPOSER                                                          */
/* ================================================================= */

.composer {
  position: sticky;
  bottom: 0;

  width: 100%;
  max-width: 760px;

  margin: 0 auto;

  display: flex;
  align-items: flex-end;
  gap: 8px;

  padding: 10px 12px;

  background: rgba(255, 253, 249, 0.92);

  border-top: 1px solid var(--border);

  backdrop-filter: blur(10px);
}

.composer-input {
  flex: 1;
}

.composer-input :deep(.v-field) {
  border-radius: 18px;
}

.send-btn {
  flex: 0 0 auto;

  background: linear-gradient(135deg, var(--primary), var(--primary-600)) !important;

  box-shadow: 0 4px 12px rgba(244, 98, 42, 0.35);
}

/* ================================================================= */
/* RESPONSIVE                                                        */
/* ================================================================= */

@media (max-width: 600px) {
  .messages {
    padding: 12px 8px;
  }

  .bubble {
    max-width: 86%;
  }

  .mode-hint {
    padding-left: 10px;
    padding-right: 10px;

    font-size: 0.78rem;
  }
}


/* ================================================================= */
/* SCHÉMA D'EXPLICATION                                               */
/* ================================================================= */

.message-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
}

.explanation-diagram-wrap {
  width: min(100%, 560px);
  margin: 0 0 10px 32px;
  align-self: flex-start;
}

.explanation-diagram-wrap :deep(.geometry-diagram) {
  width: 100%;
}

@media (max-width: 600px) {
  .explanation-diagram-wrap {
    width: calc(100% - 32px);
    margin-left: 32px;
    margin-right: 0;
  }
}
</style>

