<template>
  <div>
    <!-- Affichage conditionnel : Liste des assistants ou Chat -->
    <div v-if="!selectedAssistant">
      <h2>Liste des Assistants</h2>
      <v-container>
        <v-row>
          <v-col
            v-for="assistant in uniqueAssistants"
            :key="assistant.subject"
            cols="12"
            md="3"
          >
            <v-card class="profile-card" @click="selectAssistant(assistant.subject)">
              <v-img
                :src="assistant.photo || defaultPhoto"
                height="200px"
                contain
                class="rounded-t-lg"
              ></v-img>
              <v-card-title class="text-center">
                Assistant {{ assistant.subject }}
              </v-card-title>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <!-- Composant enfant pour le chat -->
    <ChatWithAssistant
      v-else
      :assistant="selectedAssistant"
      :allAssistants="assistants"
      :child-name="childName"
      :child-class="childClass"
      @go-back="selectedAssistant = null"
    />
  </div>
</template>

<script>
import axios from "axios";
import ChatWithAssistant from "./ChatWithAssistant.vue";

export default {
  components: {
    ChatWithAssistant,
  },
  props: {
    childId: {
      type: Number,
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
      assistants: [], // Toutes les données récupérées
      selectedAssistant: null, // Assistant sélectionné
      defaultPhoto: "/_nuxt/assets/parents/istockphoto-1495088043-612x612.jpg",
    };
  },
  computed: {
    uniqueAssistants() {
      const recentBySubject = {};

      this.assistants.forEach((assistant) => {
        if (
          !recentBySubject[assistant.subject] ||
          new Date(assistant.date) > new Date(recentBySubject[assistant.subject].date)
        ) {
          recentBySubject[assistant.subject] = assistant;
        }
      });

      return Object.values(recentBySubject);
    },
  },
  methods: {
    async fetchAssistants() {
      try {
        const response = await axios.get(`http://localhost:8080/api/assistants/${this.childId}`);
        this.assistants = response.data; // Données récupérées stockées
      } catch (error) {
        console.error("Erreur lors de la récupération des assistants :", error);
      }
      console.log("Assistants récupérés :", this.assistants);
    },
    selectAssistant(subject) {
      // Sélectionne l'assistant avec la date la plus récente pour la matière choisie
      this.selectedAssistant = this.assistants
        .filter((assistant) => assistant.subject === subject)
        .reduce((latest, current) => {
          return new Date(current.date) > new Date(latest.date) ? current : latest;
        });
      console.log("Assistant sélectionné :", this.selectedAssistant);
    },
  },
  created() {
    this.fetchAssistants();
  },
};
</script>

<style scoped>
.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
}
</style>
