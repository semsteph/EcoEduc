<template>
  <v-container fluid class="main-container">
    <!-- Barre supérieure -->
    <v-app-bar app color="primary" elevate-on-scroll flat>
      <v-toolbar-title class="title">EchoEducation</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn text @click="goToAbout" :class="{ 'active-btn': activeButton === 'about' }">À propos</v-btn>
      <v-btn text @click="goToLogin" :class="{ 'active-btn': activeButton === 'login' }">Connexion</v-btn>
    </v-app-bar>

    <!-- Bannière avec titre défilant -->
    <v-row justify="center" align="center" class="banner">
      <v-col cols="12" class="text-center">
        <div class="scrolling-title">Bienvenue sur EchoEducation</div>
      </v-col>
    </v-row>

    <!-- Section des avantages -->
    <v-container class="advantages-section">
      <v-row justify="center" align="start">
        <v-col cols="12" sm="6" md="4" v-for="advantage in advantages" :key="advantage.title">
          <v-card class="info-card">
            <v-card-title>
              <v-icon color="primary" large class="icon">{{ advantage.icon }}</v-icon>
              <span class="headline">{{ advantage.title }}</span>
            </v-card-title>
            <v-card-text>{{ advantage.text }}</v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-container>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

export default {
  setup() {
    const router = useRouter();
    const advantages = ref([
      {
        icon: 'mdi-account-check',
        title: 'Suivi personnalisé',
        text: "Identifiez les forces et les faiblesses pour un soutien adapté et une réussite garantie.",
      },
      {
        icon: 'mdi-chart-line',
        title: 'Amélioration des résultats',
        text: "Un suivi rigoureux améliore les performances académiques et favorise l’engagement.",
      },
      {
        icon: 'mdi-message-text',
        title: 'Communication accrue',
        text: "Favorisez des échanges constructifs entre parents et enseignants pour une collaboration efficace.",
      },
      {
        icon: 'mdi-lightbulb',
        title: 'Développement des compétences',
        text: "Aidez votre enfant à acquérir des compétences essentielles pour l’avenir.",
      },
    ]);

    const activeButton = ref('about'); // Bouton actif par défaut

    const goToLogin = () => {
      activeButton.value = 'login';
      router.push('/parents/connexion');
    };

    const goToAbout = () => {
      activeButton.value = 'about';
    };

    return {
      advantages,
      goToLogin,
      goToAbout,
      activeButton,
    };
  },
};
</script>

<style scoped>
/* Conteneur principal */
.main-container {
  background: linear-gradient(
      to bottom,
      rgba(33, 150, 243, 0.8),
      rgba(3, 169, 244, 0.9)
    ),
    url('/assets/parents/stock-photo-parents-helping-children-with-homework-in-kitche.jpg') no-repeat center;
  background-size: cover;
  min-height: 100vh;
  color: #fff;
  font-family: 'Roboto', sans-serif;
}

/* Barre supérieure */
.v-app-bar {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.title {
  font-weight: bold;
  font-size: 1.5rem;
}

.active-btn {
  font-weight: bold;
  text-transform: capitalize;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 6px 12px;
}

/* Bannière avec titre défilant */
.banner {
  padding: 50px 0;
  overflow: hidden;
}

.scrolling-title {
  font-size: 32px;
  font-weight: bold;
  text-transform: capitalize;
  color: #ffeb3b;
  white-space: nowrap;
  display: inline-block;
  animation: scroll 8s linear infinite;
}

@keyframes scroll {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
}

/* Section des avantages */
.advantages-section {
  padding: 50px 16px;
  background-color: #fff;
  border-radius: 16px 16px 0 0;
  margin-top: -30px;
}

.info-card {
  background-color: #f5f5f5;
  border-radius: 16px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  padding: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.info-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.icon {
  font-size: 40px;
  margin-right: 12px;
}

.headline {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.v-card-text {
  font-size: 14px;
  color: #555;
  margin-top: 8px;
}
</style>
