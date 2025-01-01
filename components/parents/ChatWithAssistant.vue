<template>
  <v-container>
    <h2>Discussion avec l'assistant {{ assistant.subject }}</h2>
    <v-card class="chat-container">
      <div class="messages">
        <div
          v-for="(message, index) in chatMessages"
          :key="index"
          :class="{
            'user-message': message.sender === 'user',
            'gpt-message': message.sender === 'gpt',
          }"
        >
          <p>{{ message.text }}</p>
        </div>
      </div>
      <v-textarea
        v-model="userMessage"
        placeholder="Écrivez votre message ici..."
        rows="2"
        outlined
      ></v-textarea>
      <v-btn @click="sendMessage" :disabled="!userMessage || isRateLimited" color="primary">
        Envoyer
      </v-btn>
      <span v-if="isRateLimited" class="rate-limit-warning">Veuillez attendre un moment avant d'envoyer un autre message.</span>
    </v-card>
    <v-btn @click="$emit('go-back')" color="secondary">Retour</v-btn>
  </v-container>
</template>

<script>
import axios from "axios";

export default {
  props: {
    assistant: {
      type: Object,
      required: true,
    },
    allAssistants: {
      type: Array,
      required: true,
    },
    childName: {
      type: String,
      required: true,
    },
    childClass: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      chatMessages: [
        {
          sender: "gpt",
          text: this.formatInitialMessage(),
        },
      ],
      userMessage: "",
      isRateLimited: false, // Bloque les requêtes si activé
      rateLimitTimeout: null, // Stocke le timeout pour réinitialiser le blocage
    };
  },
  methods: {
    getGreeting() {
      const hours = new Date().getHours();
      return hours < 12 ? "Bonjour" : "Bonsoir";
    },

    formatInitialMessage() {
      const greeting = this.getGreeting();
      const target = this.assistant?.target || this.assistant;
      const activity = target?.activity || "une activité inconnue";
      const date = target?.date || new Date();
      const timeDescription = this.getTimeDescription(date);

      return `${greeting} élève ${this.childName}, je suis ton assistant professeur en ${
        target?.subject || "une matière inconnue"
      }. Vous avez déroulé ${activity} (${timeDescription}) en classe. Qu'est-ce que tu n'as pas compris sur cette activité ou qu'aimerais-tu comprendre davantage ?`;
    },

    getTimeDescription(date) {
      const parsedDate = new Date(date);
      const today = new Date();
      const difference = Math.floor((today - parsedDate) / (1000 * 60 * 60 * 24));

      if (difference === 0) return "aujourd'hui";
      if (difference === 1) return "hier";
      if (difference === 2) return "avant-hier";
      if (difference > 2) return `il y a ${difference} jours`;
      return "à une date inconnue";
    },

    async sendMessage() {
      if (!this.userMessage || this.isRateLimited) return;

      this.chatMessages.push({ sender: "user", text: this.userMessage });

      const target = this.assistant?.target || this.assistant;
      const [studentFirstName, studentLastName] = this.childName.split(" ");
      const messageData = {
        studentFirstName: studentFirstName || "Prénom inconnu",
        studentLastName: studentLastName || "Nom inconnu",
        subjectName: target?.subject || "Matière inconnue",
        className: this.childClass || "Classe inconnue",
        activity: target?.activity || "Activité inconnue",
        activityDate: target?.date || new Date().toISOString().split("T")[0],
        userMessage: this.userMessage,
      };

      console.log("Données envoyées à l'API :", messageData);

      try {
        const response = await axios.post(
          "http://localhost:8080/api/assistant",
          messageData
        );
        console.log("Réponse de l'API :", response.data);

        const gptReply = `${this.getGreeting()} ${
          this.childName
        }, voici ma réponse : ${response.data.reply}`;
        this.chatMessages.push({ sender: "gpt", text: gptReply });
      } catch (error) {
        console.error("Erreur lors de l'envoi au GPT :", error);
        this.chatMessages.push({
          sender: "gpt",
          text: "Une erreur est survenue. Veuillez réessayer plus tard.",
        });
      }

      this.userMessage = "";

      // Activer le rate limiting
      this.enableRateLimiting();
    },

    enableRateLimiting() {
      this.isRateLimited = true;
      if (this.rateLimitTimeout) {
        clearTimeout(this.rateLimitTimeout);
      }
      this.rateLimitTimeout = setTimeout(() => {
        this.isRateLimited = false;
      }, 5000); // Bloque les requêtes pendant 5 secondes
    },
  },
  created() {
    console.log("Assistant Reçu :", this.assistant);
    console.log("Toutes les données des assistants :", this.allAssistants);
  },
};
</script>

<style scoped>
.chat-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 16px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.messages {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 16px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.user-message {
  text-align: right;
  background-color: #e0f7fa;
  margin: 4px;
  padding: 8px;
  border-radius: 8px;
}

.gpt-message {
  text-align: left;
  background-color: #ffecb3;
  margin: 4px;
  padding: 8px;
  border-radius: 8px;
}

.rate-limit-warning {
  color: red;
  font-size: 0.9rem;
}
</style>
