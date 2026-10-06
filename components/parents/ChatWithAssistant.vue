<template>
  <div class="chat-page">

    <!-- ============================================================ -->
    <!-- TOPBAR                                                       -->
    <!-- ============================================================ -->

    <div class="topbar">

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

      <!-- Téléchargement de la discussion en PDF (dès que l'élève a écrit) -->
      <div class="topbar-spacer">
        <v-btn
          v-if="peutTelecharger"
          icon
          variant="text"
          size="small"
          class="pdf-btn"
          :loading="pdfEnCours"
          title="Télécharger la discussion en PDF"
          aria-label="Télécharger la discussion en PDF"
          @click="telechargerPDF"
        >
          <v-icon>mdi-file-download-outline</v-icon>
        </v-btn>
      </div>
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
          <!-- MESSAGE ASSISTANT AVEC SCHÉMAS SEGMENTÉS              -->
          <!-- Chaque notion garde son propre schéma, à sa place,   -->
          <!-- plutôt qu'un schéma unique regroupé à la fin. Persisté -->
          <!-- par message : reste visible même après un rechargement. -->
          <!-- ====================================================== -->
          <template
            v-if="
              message.role !== 'user' &&
              message.segments && message.segments.length
            "
          >
            <!-- Une seule bulle : le texte et les schémas s'enchaînent
                 dans le corps de l'explication, comme dans un manuel. -->
            <div class="bubble-row row-assistant">
              <div class="assistant-avatar avatar-sm">
                <v-icon size="16">mdi-account</v-icon>
              </div>

              <div
                class="bubble bubble-assistant"
                :class="{ 'bubble-has-visual': message.segments.some((segment) => isWideVisual(segment.diagram)) }"
              >
                <template
                  v-for="(segment, segIndex) in message.segments"
                  :key="'segment-' + segIndex"
                >
                  <div
                    v-if="segment.text"
                    class="segment-text"
                    v-html="formatMessage(segment.text)"
                  ></div>

                  <TutorVisual
                    v-if="segment.diagram"
                    :diagram="segment.diagram"
                  />
                </template>
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

          <!-- ==================================================== -->
          <!-- EXERCICE RATTACHÉ À CE MESSAGE PRÉCIS               -->
          <!-- Auparavant affiché dans un bloc unique toujours en bas -->
          <!-- de la conversation : la réponse de l'élève et la      -->
          <!-- correction de l'assistant apparaissaient donc AVANT   -->
          <!-- l'exercice à l'écran. Ici l'exercice reste à sa place -->
          <!-- exacte dans le fil, juste après le message qui l'a    -->
          <!-- proposé.                                              -->
          <!-- ==================================================== -->
          <div
            v-if="message.exercise"
            class="exercise-card"
          >
            <div class="exercise-prompt">
              {{ message.exercise.prompt }}
            </div>

            <TutorVisual
              v-if="message.exercise.diagram"
              :diagram="message.exercise.diagram"
            />

            <!-- Un exercice peut contenir plusieurs questions, chacune
                 avec son propre énoncé et son propre schéma (ex : 3
                 angles différents à identifier). -->
            <div
              v-for="(question, qIndex) in message.exercise.questions"
              :key="'exercise-question-' + (question.id ?? qIndex)"
              class="exercise-question"
            >
              <div
                v-if="message.exercise.questions.length > 1"
                class="exercise-question-label"
              >
                Question {{ qIndex + 1 }}
              </div>

              <div
                v-if="question.prompt && question.prompt !== message.exercise.prompt"
                class="exercise-question-prompt"
              >
                {{ question.prompt }}
              </div>

              <TutorVisual
                v-if="question.diagram"
                :diagram="question.diagram"
              />
            </div>
          </div>
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
import TutorVisual, { DOMAIN_RENDERERS } from "./TutorVisual.vue";

const API = "/api/parent/assistant";

export default {
  components: {
    TutorVisual,
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
      pdfEnCours: false,
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
            segments: Array.isArray(message.segments)
              ? message.segments
              : [],
            exercise: message.exercise || null,
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
        // Discussion vide : on reste en haut pour lire l'accueil en entier.
        if (this.messages.some((message) => message.role === "user")) {
          this.scrollToBottom();
        }
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
            segments: Array.isArray(response.data?.explanationSegments)
              ? response.data.explanationSegments
              : [],
            // Rattaché à CE message précis pour qu'il reste à sa place dans
            // le fil, juste après le texte qui l'introduit. On utilise
            // messageExercise (exercice présenté dans ce message) et non
            // exercise (exercice en cours) : sinon la carte était recopiée
            // sous chaque correction, puis disparaissait au rechargement.
            exercise: response.data?.messageExercise || null,
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
        if (this.messages[this.messages.length - 1]?.role === "assistant") {
          this.scrollToLastMessage();
        } else {
          this.scrollToBottom();
        }
      }
    },

    // ==============================================================
    // VISUELS
    // ==============================================================

    // Un schéma de domaine (anatomie...) a besoin de toute la largeur de
    // la bulle ; une figure géométrique reste compacte.
    isWideVisual(diagram) {
      return Boolean(diagram && DOMAIN_RENDERERS[diagram.type]);
    },

    // ==============================================================
    // TÉLÉCHARGEMENT EN PDF
    // ==============================================================
    //
    // La discussion est recopiée hors écran à largeur fixe, avec un en-tête
    // (élève, matière, leçon), puis capturée et découpée en pages A4 entre
    // deux messages, pour ne jamais couper une bulle en deux quand elle
    // tient sur une page.
    // ==============================================================

    async telechargerPDF() {
      if (this.pdfEnCours) return;
      this.pdfEnCours = true;
      let copie = null;

      try {
        const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
          import("html2canvas"),
          import("jspdf"),
        ]);

        copie = document.createElement("div");
        copie.className = "pdf-copie";

        const entete = document.createElement("div");
        entete.className = "pdf-entete";
        const titre = document.createElement("div");
        titre.className = "pdf-titre";
        titre.textContent = `Assistant ${this.subjectName}`;
        const lecon = document.createElement("div");
        lecon.className = "pdf-lecon";
        lecon.textContent = this.activity || "";
        const infos = document.createElement("div");
        infos.className = "pdf-infos";
        const dateLecon = this.date && dayjs(this.date).isValid() ? ` · leçon du ${dayjs(this.date).format("DD/MM/YYYY")}` : "";
        infos.textContent = `${this.childName}${dateLecon} · téléchargé le ${dayjs().format("DD/MM/YYYY")}`;
        entete.append(titre, lecon, infos);

        const fil = this.$refs.messagesEl.cloneNode(true);
        fil.classList.add("pdf-fil");
        // Styles « scoped » : les éléments créés ici reçoivent l'attribut du composant.
        const portee = [...this.$el.attributes].find((a) => a.name.startsWith("data-v-"))?.name;
        if (portee) [copie, entete, titre, lecon, infos].forEach((el) => el.setAttribute(portee, ""));
        copie.append(entete, fil);
        this.$el.appendChild(copie);

        const echelle = 2;
        // Les coupures entre messages sont mesurées dans la page recopiée par
        // html2canvas (même mise en page que l'image produite).
        let coupures = [];
        const canvas = await html2canvas(copie, {
          scale: echelle,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: 820,
          onclone: (doc) => {
            const racine = doc.querySelector(".pdf-copie");
            if (!racine) return;
            const haut = racine.getBoundingClientRect().top;
            coupures = [...racine.querySelectorAll(".message-item")]
              .map((el) => Math.round((el.getBoundingClientRect().bottom - haut + 5) * echelle));
          },
        });

        // Ligne de pixels sans texte (aucun pixel sombre) : on peut couper là
        // sans trancher une ligne d'écriture.
        const lecture = canvas.getContext("2d");
        // (On ignore la marge gauche, où passe le liseré coloré des bulles ;
        // un pixel coloré — bulle orange, en-tête de schéma — compte comme plein.)
        const debutLigne = Math.round(canvas.width * 0.12);
        const ligneVide = (y) => {
          const pixels = lecture.getImageData(debutLigne, y, canvas.width - debutLigne, 1).data;
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const v = pixels[i + 1];
            const b = pixels[i + 2];
            if (r * 0.299 + v * 0.587 + b * 0.114 < 200 || Math.max(r, v, b) - Math.min(r, v, b) > 40) return false;
          }
          return true;
        };
        const coupeSousTexte = (debut, fin) => {
          let vides = 0;
          for (let y = fin - 1; y > debut + (fin - debut) * 0.5; y -= 1) {
            vides = ligneVide(y) ? vides + 1 : 0;
            if (vides >= 6) return y + 3;
          }
          return fin;
        };

        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const marge = 10;
        const largeurMm = 210 - 2 * marge;
        const hauteurPage = Math.floor(((297 - 2 * marge) * canvas.width) / largeurMm);

        let debut = 0;
        let premiere = true;
        while (debut < canvas.height - 2) {
          let fin = Math.min(debut + hauteurPage, canvas.height);
          if (fin < canvas.height) {
            const coupe = coupures.filter((c) => c > debut + hauteurPage * 0.6 && c <= fin).pop();
            fin = coupe || coupeSousTexte(debut, fin);
          }
          const morceau = document.createElement("canvas");
          morceau.width = canvas.width;
          morceau.height = fin - debut;
          const ctx = morceau.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, morceau.width, morceau.height);
          ctx.drawImage(canvas, 0, debut, canvas.width, morceau.height, 0, 0, canvas.width, morceau.height);
          if (!premiere) pdf.addPage();
          pdf.addImage(morceau.toDataURL("image/jpeg", 0.9), "JPEG", marge, marge, largeurMm, (morceau.height * largeurMm) / canvas.width);
          premiere = false;
          debut = fin;
        }

        const nettoyer = (texte) =>
          String(texte || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^A-Za-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 50);
        const prenom = this.childName.split(" ")[0] || this.childName;
        pdf.save(`Discussion_${nettoyer(prenom)}_${nettoyer(this.subjectName)}_${nettoyer(this.activity) || "lecon"}.pdf`);
      } catch (err) {
        console.error("Erreur lors du téléchargement du PDF :", err);
        this.sendError = "Le PDF n'a pas pu être créé. Réessaie dans un instant.";
      } finally {
        if (copie) copie.remove();
        this.pdfEnCours = false;
      }
    },

    // ==============================================================
    // SCROLL AUTOMATIQUE
    // ==============================================================

    // Ce n'est pas la liste des messages qui défile mais la zone de page qui
    // la contient (le cadre de l'espace parent) : on cherche le premier
    // parent réellement défilable.
    zoneDefilement() {
      let el = this.$refs.messagesEl;
      while (el && el !== document.body) {
        const style = getComputedStyle(el);
        if (["auto", "scroll"].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 4) {
          return el;
        }
        el = el.parentElement;
      }
      return document.scrollingElement || document.documentElement;
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const zone = this.zoneDefilement();
        if (zone) zone.scrollTop = zone.scrollHeight;
      });
    },

    // Une nouvelle réponse se lit depuis son début : on place son haut juste
    // sous la barre de titre, plutôt que d'aller tout en bas.
    scrollToLastMessage() {
      this.$nextTick(() => {
        const items = this.$refs.messagesEl?.querySelectorAll(".message-item");
        const derniere = items && items[items.length - 1];
        const zone = this.zoneDefilement();
        if (!derniere || !zone) return;
        const barre = this.$el.querySelector(".topbar")?.getBoundingClientRect().height || 0;
        const haut = derniere.getBoundingClientRect().top - zone.getBoundingClientRect().top;
        zone.scrollTop += haut - barre - 12;
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
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      const escaped = raw
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const withTables = this.renderMarkdownTables(escaped);

      return withTables
        .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
    },

    // ==============================================================
    // TABLEAUX MARKDOWN
    // ==============================================================
    //
    // Certaines notions sont légitimement tabulaires (table de
    // multiplication, conjugaison...) : on les affiche en vrai tableau
    // HTML plutôt que de les supprimer ou de laisser les barres
    // verticales brutes à l'écran. Attend un texte déjà échappé.
    // ==============================================================

    renderMarkdownTables(escapedText) {
      const isSeparatorRow = (line) =>
        /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim());

      const parseRow = (line) => {
        const cells = line.trim().replace(/^\||\|$/g, "").split("|");
        return cells.map((cell) => cell.trim());
      };

      const lines = escapedText.split("\n");
      const output = [];
      let i = 0;

      while (i < lines.length) {
        const headerLine = lines[i];

        if (
          headerLine.includes("|") &&
          i + 1 < lines.length &&
          isSeparatorRow(lines[i + 1])
        ) {
          const headers = parseRow(headerLine);
          let j = i + 2;
          const rows = [];

          while (j < lines.length && lines[j].trim().includes("|")) {
            rows.push(parseRow(lines[j]));
            j++;
          }

          let html = '<table class="msg-table"><thead><tr>';
          headers.forEach((h) => {
            html += `<th>${h}</th>`;
          });
          html += "</tr></thead><tbody>";
          rows.forEach((row) => {
            html += "<tr>";
            row.forEach((cell) => {
              html += `<td>${cell}</td>`;
            });
            html += "</tr>";
          });
          html += "</tbody></table>";

          output.push(html);
          i = j;
        } else {
          output.push(headerLine);
          i++;
        }
      }

      return output.join("\n");
    },
  },

  // ================================================================
  // PROPRIÉTÉS CALCULÉES
  // ================================================================

  computed: {
    // Rien à télécharger tant que l'élève n'a pas écrit.
    peutTelecharger() {
      return !this.loadingHistory && this.messages.some((message) => message.role === "user");
    },

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
  grid-template-columns: minmax(0, 1fr) 44px; /* la flèche retour est dans le cadre (PageNav) */
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

  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
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
  display: grid;
  place-items: center;
}

/* ================================================================= */
/* COPIE HORS ÉCRAN POUR LE PDF                                      */
/* ================================================================= */

.pdf-copie {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 780px;
  padding: 24px 10px 10px;
  background: #fff;
}

.pdf-entete {
  padding: 0 12px 14px;
  margin-bottom: 6px;
  border-bottom: 2px solid var(--accent);
}

.pdf-titre {
  font-size: 1.3rem;
  font-weight: 900;
  color: var(--text);
}

.pdf-lecon {
  font-size: 1rem;
  font-weight: 700;
  color: var(--accent);
}

.pdf-infos {
  font-size: 0.82rem;
  color: var(--muted);
}

.pdf-fil {
  max-width: none !important;
  height: auto !important;
  overflow: visible !important;
}

/* html2canvas décale le texte vers le bas sans hauteur de ligne explicite. */
.pdf-fil :deep(*) {
  line-height: 1.45 !important;
}

.pdf-fil .bubble {
  box-shadow: none;
}

.pdf-fil .bubble-user {
  padding: 6px 15px 16px;
}

.pdf-fil .assistant-avatar {
  display: none;
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

  border-radius: 10px;

  font-size: 0.94rem;
  line-height: 1.45;

  white-space: pre-wrap;
  word-break: break-word;
}

.bubble-user {
  background: linear-gradient(135deg, var(--primary), var(--primary-600));
  color: #fff;

  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);

  border-bottom-right-radius: 6px;
}

.bubble-assistant {
  background: #fff;
  color: var(--text);

  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);

  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);

  border-bottom-left-radius: 6px;
}

/* ================================================================= */
/* TABLEAUX (dans les messages)                                     */
/* ================================================================= */

.bubble :deep(.msg-table) {
  width: 100%;
  margin: 8px 0;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.bubble :deep(.msg-table th),
.bubble :deep(.msg-table td) {
  padding: 6px 10px;
  border: 1px solid var(--border);
  text-align: left;
}

.bubble :deep(.msg-table th) {
  background: var(--accent-50);
  color: var(--accent);
  font-weight: 800;
}

.bubble :deep(.msg-table tr:nth-child(even) td) {
  background: rgba(13, 148, 136, 0.04);
}

/* ================================================================= */
/* EXERCICE                                                          */
/* ================================================================= */

.exercise-card {
  width: min(92%, 480px);
  margin: 6px 0 8px 32px;
  padding: 10px 12px 12px;
  background: rgba(124, 58, 237, 0.04);
  border: 1px solid rgba(124, 58, 237, 0.14);
  border-radius: 10px;
  box-sizing: border-box;
}

.exercise-prompt {
  color: var(--text);
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.exercise-question {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(124, 58, 237, 0.18);
}

.exercise-question:first-of-type {
  margin-top: 8px;
}

.exercise-question-label {
  color: var(--accent-2);
  font-weight: 800;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 3px;
}

.exercise-question-prompt {
  color: var(--text);
  font-size: 0.88rem;
  line-height: 1.45;
  white-space: pre-wrap;
  margin-bottom: 4px;
}

@media (max-width: 600px) {
  .exercise-card {
    width: calc(100% - 32px);
    margin-left: 32px;
    padding: 9px 10px 10px;
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
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);

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
  border-radius: 10px;
}

.send-btn {
  flex: 0 0 auto;

  background: linear-gradient(135deg, var(--primary), var(--primary-600)) !important;

  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
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

/* Le schéma vit DANS la bulle, avec le même fond/bordure que le texte —
   pas dans une carte à part — et reste compact, adapté à la taille du
   texte plutôt que de prendre toute la largeur disponible. */
:deep(.diagram-compact.geometry-diagram) {
  width: min(100%, 260px);
  margin: 8px 0 0;
  padding: 8px 10px 10px;
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: 0;
  border-top: 1px dashed rgba(124, 58, 237, 0.18);
}

:deep(.diagram-compact.geometry-diagram .diagram-svg) {
  min-height: 140px;
}

@media (max-width: 600px) {
  :deep(.diagram-compact.geometry-diagram) {
    width: min(100%, 220px);
  }
}

/* Bulle contenant un schéma de domaine : elle prend toute sa largeur
   maximale au lieu de se caler sur la longueur du texte. */
.bubble-has-visual {
  width: 78%;
}

.segment-text + .segment-text {
  margin-top: 0.7em;
}

@media (max-width: 600px) {
  .bubble-has-visual {
    width: 86%;
  }
}
</style>

