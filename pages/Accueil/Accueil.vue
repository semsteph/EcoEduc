<template>
    <v-container fluid class="main-container">
      <!-- Barre supérieure -->
      <v-app-bar app color="primary" elevate-on-scroll flat>
        <v-toolbar-title class="title">EchoEducation</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn text @click="goToAbout" :class="{ 'active-btn': activeButton === 'about' }">À propos</v-btn>
        <v-btn text @click="showLoginDialog" :class="{ 'active-btn': activeButton === 'login' }">Acceder</v-btn>
      </v-app-bar>
  
      <!-- Bannière avec titre défilant -->
      <v-row justify="center" align="center" class="banner">
        <v-col cols="12" class="text-center">
          <div class="scrolling-title">Bienvenue sur EchoEducation</div>
        </v-col>
      </v-row>
  
      <!-- Section d'importance d'EchoEducation -->
      <v-container class="importance-section">
        <v-row justify="center" align="start">
          <v-col cols="12" sm="6" md="4">
            <v-card class="info-card">
              <v-card-title>
                <v-icon color="primary" large class="icon">mdi-school</v-icon>
                <span class="headline">Pour les établissements</span>
              </v-card-title>
              <v-card-text>
                Améliorez la gestion administrative et optimisez le suivi des élèves avec une plateforme intuitive.
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-card class="info-card">
              <v-card-title>
                <v-icon color="primary" large class="icon">mdi-teach</v-icon>
                <span class="headline">Pour les enseignants</span>
              </v-card-title>
              <v-card-text>
                Simplifiez l’évaluation, le suivi pédagogique et la communication avec les parents.
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-card class="info-card">
              <v-card-title>
                <v-icon color="primary" large class="icon">mdi-account-child</v-icon>
                <span class="headline">Pour les parents</span>
              </v-card-title>
              <v-card-text>
                Suivez les progrès scolaires de votre enfant en temps réel et communiquez avec les enseignants.
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
  
      <!-- Dialogue de connexion -->
      <v-dialog v-model="loginDialog" max-width="400px">
        <v-card>
          <v-card-title class="headline">Choisissez votre espace</v-card-title>
          <v-card-text>
            <v-btn block class="login-btn" @click="goToParent">Espace Parent</v-btn>
            <v-btn block class="login-btn" @click="goToTeacher">Espace Enseignant</v-btn>
            <v-btn block class="login-btn" @click="goToSchool">Espace Établissement</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="loginDialog = false">Fermer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </template>
  
  <script>
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  
  export default {
    setup() {
      const router = useRouter();
      const loginDialog = ref(false);
      const activeButton = ref('about');
  
      const showLoginDialog = () => {
        activeButton.value = 'login';
        loginDialog.value = true;
      };
  
      const goToParent = () => {
        router.push('/parents/Acceuil');
      };
  
      const goToTeacher = () => {
        router.push('/professeurs/connexion');
      };
  
      const goToSchool = () => {
        router.push('/administration/Accueil');
      };
  
      return {
        loginDialog,
        showLoginDialog,
        goToParent,
        goToTeacher,
        goToSchool,
        activeButton,
      };
    },
  };
  </script>
  
  <style scoped>
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
    animation: scroll 15s linear infinite;
  }
  
  @keyframes scroll {
    0% {
      transform: translateX(100%);
    }
    100% {
      transform: translateX(-100%);
    }
  }
  
  .importance-section {
    padding: 50px 16px;
    background-color: #fff;
    border-radius: 16px 16px 0 0;
    margin-top: -30px;
  }
  
  .info-card {
    background-color: #f5f5f5;
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .info-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  }
  
  .login-btn {
    margin-bottom: 10px;
    background-color: #2196F3;
    color: white;
    text-transform: none;
  }
  </style>
  