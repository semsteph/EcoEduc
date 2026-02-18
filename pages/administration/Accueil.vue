<template>
  <v-app class="no-scroll-x">
    <v-navigation-drawer
      v-model="drawer"
      location="right"
      temporary
      class="bg-primary text-white"
    >
      <v-list color="transparent">
        <v-list-item 
          prepend-icon="mdi-home" 
          title="Accueil" 
          @click="navigateTo('/administration/Accueil')"
        ></v-list-item>
        <v-list-item 
          prepend-icon="mdi-login" 
          title="Se connecter" 
          @click="navigateTo('/administration/connexion')"
        ></v-list-item>
        <v-list-item 
          prepend-icon="mdi-account-plus" 
          title="S'inscrire" 
          @click="navigateTo('/administration/inscription')"
        ></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar 
      fixed
      app
      elevation="4"
      color="primary"
      class="custom-navbar"
    >
      <v-container class="d-flex align-center py-0 px-4" fluid>
        <img
          src="@/assets/administration/logooff.png"
          alt="Logo EchoEducation"
          class="app-logo"
        />
        
        <v-spacer></v-spacer>

        <div class="hidden-sm-and-down">
          <v-btn variant="text" class="nav-btn" @click="navigateTo('/administration/Accueil')">Accueil</v-btn>
          <v-btn variant="text" class="nav-btn" @click="navigateTo('/administration/connexion')">Se connecter</v-btn>
          <v-btn variant="outlined" class="nav-btn-action ml-2" @click="navigateTo('/administration/inscription')">S'inscrire</v-btn>
        </div>
        
        <v-app-bar-nav-icon 
          class="hidden-md-and-up" 
          icon="mdi-menu" 
          color="white"
          @click="drawer = !drawer"
        ></v-app-bar-nav-icon>
      </v-container>
    </v-app-bar>

    <v-main class="main-content">
      <div class="background-container">
        <div class="background-image"></div>
        <div class="darker-overlay"></div>
      </div>

      <v-container class="content-wrapper px-4" fluid>
        <div class="welcome-banner">
          <div class="moving-text">
            Bienvenue sur EchoEducation — Plateforme de gestion moderne • Centralisez vos données • Suivez vos élèves • Simplifiez votre administration
          </div>
        </div>

        <v-row justify="center" class="mt-5 no-margin-row">
          <v-col cols="12" md="10" lg="9">
            <v-row class="no-margin-row">
              <v-col cols="12" md="4" v-for="(item, i) in features" :key="i" class="pa-2">
                <v-card class="info-card" elevation="10">
                  <v-card-text class="pa-6 text-center">
                    <v-icon color="primary" size="48" class="mb-4">{{ item.icon }}</v-icon>
                    <h3 class="headline-modern">{{ item.title }}</h3>
                    <p class="body-text">{{ item.text }}</p>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            
            <v-card class="cta-card mt-10" elevation="12">
              <v-row no-gutters align="center">
                <v-col cols="12" md="8" class="pa-8">
                  <h2 class="text-h4 font-weight-bold mb-2">Prêt à commencer ?</h2>
                  <p class="text-subtitle-1">Rejoignez l'avenir de l'éducation numérique dès aujourd'hui.</p>
                </v-col>
                <v-col cols="12" md="4" class="text-center pa-8">
                  <v-btn size="x-large" color="white" variant="elevated" class="text-primary font-weight-black" rounded @click="navigateTo('/administration/inscription')">
                    S'inscrire
                  </v-btn>
                </v-col>
              </v-row>
            </v-card>

            <div style="height: 100px;"></div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'

const router = useRouter();
const drawer = ref(false);

const navigateTo = (route) => {
  drawer.value = false;
  router.push(route);
};

const features = [
  {
    title: "Suivi Précis",
    icon: "mdi-account-search",
    text: "Analysez les performances individuelles en temps réel."
  },
  {
    title: "Gestion 360°",
    icon: "mdi-layers-outline",
    text: "Notes, absences et documents centralisés en un seul lieu."
  },
  {
    title: "Connectivité",
    icon: "mdi-account-group",
    text: "Un pont direct entre l'administration, les profs et les parents."
  }
];
</script>

<style scoped>
/* EMPÊCHER LE SCROLL HORIZONTAL SUR TOUTE LA PAGE */
.no-scroll-x {
  max-width: 100vw !important;
  overflow-x: hidden !important;
}

/* FIXATION DU HEADER */
.custom-navbar {
  position: fixed !important;
  top: 0 !important;
  z-index: 1000 !important;
  width: 100vw !important;
}

/* GESTION DU FOND */
.background-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  overflow: hidden;
}

.background-image {
  width: 100%;
  height: 100%;
  background-image: url('@/assets/administration/Image collée.png');
  background-size: cover;
  background-position: center;
}

.darker-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(240, 244, 248, 0.85));
  backdrop-filter: blur(4px);
}

/* CONTENU */
.main-content {
  position: relative;
  z-index: 1;
  padding-top: 80px;
  max-width: 100vw !important;
  overflow-x: hidden !important;
}

.content-wrapper {
  position: relative;
  max-width: 100% !important;
}

/* Suppression des marges négatives de v-row qui causent le scroll horizontal */
.no-margin-row {
  margin-left: 0 !important;
  margin-right: 0 !important;
  width: 100% !important;
}

/* DESIGN DES CARTES */
.info-card {
  border-radius: 16px;
  background-color: rgba(255, 255, 255, 0.95);
  transition: transform 0.3s ease;
  border-top: 4px solid #007BFF;
  height: 100%;
}

.info-card:hover {
  transform: translateY(-10px);
}

.cta-card {
  background: linear-gradient(45deg, #0056b3, #007BFF) !important;
  color: white;
  border-radius: 20px;
  overflow: hidden; /* Important pour mobile */
}

/* BANNIERE DEFILANTE */
.welcome-banner {
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 12px;
  border-radius: 8px;
  overflow: hidden;
  border-left: 5px solid #007BFF;
  width: 100%;
}

.moving-text {
  display: inline-block;
  white-space: nowrap;
  padding-left: 100%;
  animation: marquee 20s linear infinite;
  font-weight: bold;
}

@keyframes marquee {
  0% { transform: translate(0, 0); }
  100% { transform: translate(-100%, 0); }
}

/* LOGO & BOUTONS */
.app-logo {
  height: 40px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.nav-btn {
  font-weight: bold;
  text-transform: none;
  color: white !important;
}

.nav-btn-action {
  border: 2px solid white !important;
  color: white !important;
  border-radius: 8px;
  text-transform: none;
}

/* AJUSTEMENTS MOBILE */
@media (max-width: 600px) {
  .app-logo {
    height: 32px;
  }
  .welcome-banner {
    font-size: 0.8rem;
  }
  .text-h4 {
    font-size: 1.4rem !important;
  }
  .pa-8 {
    padding: 20px !important; /* Réduit le padding sur mobile pour éviter le débordement */
  }
}
</style>