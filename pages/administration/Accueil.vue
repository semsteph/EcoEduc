<template>
    <div class="background">
      <div class="content">
        <v-card class="info-card">
          <v-card-title class="headline">Pourquoi le suivi scolaire est-il important ?</v-card-title>
          <v-card-text>
            Le suivi scolaire permet aux établissements de mieux comprendre le parcours de chaque élève, 
            d'identifier rapidement les difficultés, et d'offrir un accompagnement personnalisé. 
            Il améliore la communication entre les enseignants, les parents, et l'administration, 
            pour garantir la réussite de chaque élève.
          </v-card-text>
        </v-card>
  
        <v-card class="info-card">
          <v-card-title class="headline">Comment EchoEducation peut vous aider ?</v-card-title>
          <v-card-text>
            EchoEducation centralise toutes les informations scolaires : suivi des notes, gestion des absences, 
            planification des cours, et bien plus encore. Avec une interface intuitive, l'application facilite 
            la gestion quotidienne de votre établissement et le suivi de la progression de chaque élève.
          </v-card-text>
        </v-card>
  
        <v-card class="info-card">
          <v-card-title class="headline">Utilisez EchoEducation pour un suivi efficace</v-card-title>
          <v-card-text>
            Avec EchoEducation, vous pouvez suivre les performances des élèves, générer des rapports détaillés, 
            et communiquer facilement avec les parents. C'est l'outil idéal pour améliorer l'expérience éducative 
            et garantir un suivi optimal.
          </v-card-text>
        </v-card>
  
        <div class="button-container">
          <v-btn class="action-button" @click="navigateTo('/administration/inscription')">
            S'inscrire
          </v-btn>
          <v-btn class="action-button" @click="navigateTo('/administration/connexion')">
            Se connecter
          </v-btn>
        </div>
      </div>
    </div>
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
  
  <style>
  .background {
    background-image: url('assets/administration/Image collée.png'); /* Remplacez par le chemin de votre image */
    background-size: cover;
    background-position: center;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  
  .content {
    background-color: rgba(255, 255, 255, 0.8); /* Légèrement transparent */
    border-radius: 10px;
    padding: 30px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
    max-width: 800px;
    width: 100%;
    text-align: center;
  }
  
  .info-card {
    margin-bottom: 20px;
    background-color: #f9f9f9;
    border-radius: 8px;
    box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
    padding: 20px;
  }
  
  .headline {
    font-size: 20px;
    margin-bottom: 10px;
    color: #333;
  }
  
  .button-container {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 20px;
  }
  
  .action-button {
    background-color: #007BFF;
    color: white;
    font-size: 16px;
    padding: 10px 20px;
    border-radius: 5px;
    transition: background-color 0.3s ease;
  }
  
  .action-button:hover {
    background-color: #0056b3;
  }
  </style>
  