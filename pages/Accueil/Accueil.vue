<template>
  <v-container fluid class="main-container p-0">
    <!-- Barre supérieure -->
    <div class="px-3 sm:px-12 flex justify-between items-center h-12 sm:h-16"></div>

    <!-- AppBar avec logo -->
    <v-app-bar
      app
      color="primary"
      elevate-on-scroll
      flat
      class="px-3 sm:px-12 flex justify-between items-center h-12 sm:h-16"
    >
      <!-- Logo EchoEducation -->
       <div class="d-flex align-center w-100 justify-space-between">
      <img
        src="@/assets/administration/logooff.png"
        alt="Logo EchoEducation"
        class="h-8 sm:h-10 w-auto"
      />

      <div class="flex gap-1 sm:gap-4">
        <v-btn
          text
          class="text-white text-[10px] sm:text-sm px-2 sm:px-4 rounded-md hover:bg-white hover:text-primary transition"
          @click="goToAbout"
          :class="{ 'active-btn': activeButton === 'about' }"
        >
          À propos
        </v-btn>
        <v-btn
          text
          class="text-white text-[10px] sm:text-sm px-2 sm:px-4 rounded-md hover:bg-white hover:text-primary transition"
          @click="showLoginDialog"
          :class="{ 'active-btn': activeButton === 'login' }"
        >
          Accéder
        </v-btn>
      </div>
       </div>
      
    </v-app-bar>

    <!-- Bannière avec titre défilant -->
    <v-row justify="center" align="center" class="banner">
      <v-col cols="12" class="text-center">
        <div class="scrolling-title text-base sm:text-lg font-bold">
          Bienvenue sur EchoEducation
        </div>
      </v-col>
    </v-row>

    <!-- Section des avantages -->
    <v-container class="importance-section">
      <v-row justify="center" align="start" class="gap-y-6">
        <v-col cols="12" sm="6" md="4">
          <v-card class="info-card">
            <v-card-title class="flex items-center gap-2">
              <v-icon color="primary" size="28">mdi-school</v-icon>
              <span class="text-sm sm:text-base font-semibold leading-tight">Pour les établissements</span>
            </v-card-title>
            <v-card-text class="text-xs sm:text-sm">
              Améliorez la gestion administrative et optimisez le suivi des élèves avec une plateforme intuitive.
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="4">
          <v-card class="info-card">
            <v-card-title class="flex items-center gap-2">
              <v-icon color="primary" size="28">mdi-teach</v-icon>
              <span class="text-sm sm:text-base font-semibold leading-tight">Pour les enseignants</span>
            </v-card-title>
            <v-card-text class="text-xs sm:text-sm">
              Simplifiez l’évaluation, le suivi pédagogique et la communication avec les parents.
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="4">
          <v-card class="info-card">
            <v-card-title class="flex items-center gap-2">
              <v-icon color="primary" size="28">mdi-account-child</v-icon>
              <span class="text-sm sm:text-base font-semibold leading-tight">Pour les parents</span>
            </v-card-title>
            <v-card-text class="text-xs sm:text-sm">
              Suivez les progrès scolaires de votre enfant en temps réel et communiquez avec les enseignants.
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Dialogue de connexion -->
    <v-dialog v-model="loginDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-base sm:text-lg font-bold">Choisissez votre espace</v-card-title>
        <v-card-text>
          <v-btn block class="login-btn text-sm" @click="goToParent">Espace Parent</v-btn>
          <v-btn block class="login-btn text-sm" @click="goToTeacher">Espace Enseignant</v-btn>
          <v-btn block class="login-btn text-sm" @click="goToSchool">Espace Établissement</v-btn>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text class="text-sm" @click="loginDialog = false">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import '/assets/css/styles.css';

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

const goToAbout = () => {
  activeButton.value = 'about';
  window.scrollTo({ top: 500, behavior: 'smooth' });
};
</script>
