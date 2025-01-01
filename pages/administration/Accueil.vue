<template>
  <v-app>
    <!-- Barre de navigation en haut -->
    <v-app-bar color="primary" dark elevate-on-scroll>
      <v-toolbar-title>EchoEducation</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn text @click="navigateTo('/administration/Accueil')">Accueil</v-btn>
      <v-btn text @click="navigateTo('/administration/connexion')">Se connecter</v-btn>
      <v-btn text @click="navigateTo('/administration/inscription')">S'inscrire</v-btn>
    </v-app-bar>

    <!-- Section principale avec fond d'image -->
    <div class="background">
      <div class="overlay"></div> <!-- Couche floue appliquée -->
      <v-container class="content" fluid>
        <!-- Informations principales avec des cartes stylisées -->
        <v-row justify="center">
          <v-col cols="12" md="8">
            <v-card class="info-card" elevation="10">
              <v-card-title class="headline">Pourquoi le suivi scolaire est-il important ?</v-card-title>
              <v-card-text>
                Le suivi scolaire permet aux établissements de mieux comprendre le parcours de chaque élève, 
                d'identifier rapidement les difficultés, et d'offrir un accompagnement personnalisé. 
                Il améliore la communication entre les enseignants, les parents, et l'administration, 
                pour garantir la réussite de chaque élève.
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="8">
            <v-card class="info-card" elevation="10">
              <v-card-title class="headline">Comment EchoEducation peut vous aider ?</v-card-title>
              <v-card-text>
                EchoEducation centralise toutes les informations scolaires : suivi des notes, gestion des absences, 
                planification des cours, et bien plus encore. Avec une interface intuitive, l'application facilite 
                la gestion quotidienne de votre établissement et le suivi de la progression de chaque élève.
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="8">
            <v-card class="info-card" elevation="10">
              <v-card-title class="headline">Utilisez EchoEducation pour un suivi efficace</v-card-title>
              <v-card-text>
                Avec EchoEducation, vous pouvez suivre les performances des élèves, générer des rapports détaillés, 
                et communiquer facilement avec les parents. C'est l'outil idéal pour améliorer l'expérience éducative 
                et garantir un suivi optimal.
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </v-app>
</template>

<script>
export default {
  methods: {
    navigateTo(route) {
      this.$router.push(route);
    },
  },
};
</script>

<style scoped>
/* Fond avec une image de fond floue */
.background {
  position: relative; /* Nécessaire pour la couche floue */
  background-image: url('assets/administration/Image collée.png'); /* Chemin vers votre image */
  background-size: cover;
  background-position: center;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* Couche floue au-dessus de l'image */
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(10px); /* Applique le flou */
  z-index: 1; /* Assure que la couche reste derrière le contenu */
}

/* Conteneur principal avec fond semi-transparent */
.content {
  position: relative; /* Permet de superposer sur l'effet flou */
  background-color: rgba(255, 255, 255, 0.9); /* Légèrement transparent pour un effet visuel */
  border-radius: 12px;
  padding: 40px;
  margin-top: 10%;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  max-width: 900px;
  text-align: center;
  border-radius: 15px;
  z-index: 2; /* Place le contenu au-dessus de l'effet flou */
}

/* Cartes d'informations avec un design moderne */
.info-card {
  background-color: #fafafa;
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  transition: transform 0.3s ease-in-out;
}

.info-card:hover {
  transform: scale(1.03);
}

.headline {
  font-size: 22px;
  color: #333;
  font-weight: 600;
  margin-bottom: 15px;
}

/* Stylisation des boutons dans la barre de navigation */
.v-app-bar {
  background-color: #007BFF; /* Couleur bleue pour la barre */
}

.v-btn {
  color: white;
  font-weight: 500;
  text-transform: none;
}

.v-btn:hover {
  background-color: #0056b3;
}
</style>
