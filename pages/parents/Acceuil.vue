<template>
    <v-container fluid class="main-container">
      <v-row justify="space-between" align="center" class="header">
        <v-col class="login-button-container" cols="auto">
          <v-btn color="primary" @click="goToLogin">Connexion</v-btn>
        </v-col>
      </v-row>
  
      <v-row justify="center" align="center" class="content">
        <v-col cols="12" class="text-center">
          <div class="scrolling-title">
            <span v-for="i in 10" :key="i">EcoEducation &nbsp;&nbsp;&nbsp;</span>
          </div>
        </v-col>
      </v-row>
  
      <v-row justify="center" align="start" class="cards">
        <v-col cols="12" sm="6" md="4" v-for="advantage in advantages" :key="advantage.title">
          <v-card class="info-card">
            <v-card-title class="headline">{{ advantage.title }}</v-card-title>
            <v-card-text>{{ advantage.text }}</v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </template>
  
  <script>
  import { ref } from 'vue'; // Ref utilisé pour la réactivité
  import { useRouter } from 'vue-router'; // Utilisation du routeur de Vue
  
  export default {
    setup() {
      const router = useRouter(); // Initialisation du routeur
      const advantages = ref([
        {
          title: "Suivi personnalisé",
          text: "Le suivi scolaire permet d'identifier les forces et faiblesses de votre enfant, facilitant ainsi un soutien adapté."
        },
        {
          title: "Amélioration des résultats",
          text: "Une attention constante améliore les performances académiques et encourage l'engagement scolaire."
        },
        {
          title: "Communication accrue",
          text: "Un suivi régulier favorise la communication entre parents et enseignants, garantissant que tout le monde est sur la même longueur d'onde."
        },
        {
          title: "Développement des compétences",
          text: "Cela aide votre enfant à développer des compétences de gestion du temps et d'organisation qui seront utiles à l'avenir."
        },
      ]);
  
      // Méthode pour rediriger vers la page de connexion
      const goToLogin = () => {
        router.push('/parents/connexion'); // Redirection vers la page de connexion
      };
  
      return {
        advantages,
        goToLogin
      };
    }
  };
  </script>
  
  <style scoped>
  .main-container {
    background-image: url('/assets/parents/stock-photo-parents-helping-children-with-homework-in-kitche.jpg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    min-height: 100vh;
    position: relative;
  }
  
  .header {
    padding: 16px;
  }
  
  .scrolling-title {
    font-size: 48px;
    font-weight: bold;
    overflow: hidden;
    white-space: nowrap;
    animation: scroll 10s linear infinite;
    display: inline-block; /* Pour s'assurer que l'élément prend de la place */
    margin: 0 auto; /* Centrer le titre */
  }
  
  @keyframes scroll {
    0% {
      transform: translateX(100%);
    }
    100% {
      transform: translateX(-100%);
    }
  }
  
  .cards {
    margin-top: 30px;
  }
  
  .info-card {
    background-color: rgba(255, 255, 255, 0.8); /* Fond blanc semi-transparent */
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    margin-bottom: 20px;
  }
  </style>
  