<template>
  <v-app>
    <!-- Barre de navigation FIXÉE -->
    <v-app-bar color="primary" dark app dense>
      <!-- Logo à la place du texte -->
      <img
        src="@/assets/administration/logooff.png"
        alt="Logo EchoEducation"
        class="app-logo"
      />
      <v-spacer></v-spacer>
      <v-btn text class="nav-btn" @click="navigateTo('/administration/Accueil')">Accueil</v-btn>
      <v-btn text class="nav-btn" @click="navigateTo('/administration/connexion')">Se connecter</v-btn>
      <v-btn text class="nav-btn" @click="navigateTo('/administration/inscription')">S'inscrire</v-btn>
    </v-app-bar>

    <!-- Section principale -->
    <div class="background">
      <div class="overlay"></div>
      <v-container class="content" fluid>
        <!-- Titre défilant -->
        <div class="scroll-wrapper">
          <marquee behavior="scroll" direction="left" class="scroll-title">
            Bienvenue sur EchoEducation — Plateforme de gestion scolaire moderne
          </marquee>
        </div>

        <!-- Cartes d'information -->
        <v-row justify="center">
          <v-col cols="12" md="8">
            <v-card class="info-card" elevation="6">
              <v-card-title class="headline">Pourquoi le suivi scolaire est-il important ?</v-card-title>
              <v-card-text>
                Le suivi scolaire permet aux établissements de mieux comprendre le parcours de chaque élève,
                d'identifier rapidement les difficultés, et d'offrir un accompagnement personnalisé.
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="8">
            <v-card class="info-card" elevation="6">
              <v-card-title class="headline">Comment EchoEducation peut vous aider ?</v-card-title>
              <v-card-text>
                EchoEducation centralise les informations scolaires : suivi des notes, gestion des absences,
                planification des cours, et plus encore. L'interface est intuitive et moderne.
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="8">
            <v-card class="info-card" elevation="6">
              <v-card-title class="headline">Utilisez EchoEducation pour un suivi efficace</v-card-title>
              <v-card-text>
                Suivez les performances des élèves, générez des rapports détaillés et communiquez facilement
                avec les parents. Améliorez l'expérience éducative avec EchoEducation.
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
/* Fond avec image */
.background {
  position: relative;
  background-image: url('assets/administration/Image collée.png');
  background-size: cover;
  background-position: center;
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 100px 20px 20px; /* Ajout de padding-top pour tenir compte de la v-app-bar */
}

/* Flou de fond */
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(10px);
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 1;
}

/* Contenu principal */
.content {
  position: relative;
  z-index: 2;
  background-color: rgba(255, 255, 255, 0.92);
  border-radius: 18px;
  padding: 40px 30px;
  max-width: 1000px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
}

/* Marquee wrapper pour éviter le débordement */
.scroll-wrapper {
  overflow: hidden;
  white-space: nowrap;
  margin-bottom: 30px;
}

.scroll-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #007BFF;
}

/* Cartes d'information */
.info-card {
  background-color: #fdfdfd;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.07);
  transition: transform 0.3s ease;
}

.info-card:hover {
  transform: translateY(-3px);
}

.headline {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
  word-wrap: break-word;
  white-space: normal;
}

/* Logo */
.app-logo {
  height: 36px;
  width: auto;
  max-width: 130px;
  margin-left: 10px;
}

/* Barre de navigation */
.v-app-bar {
  background-color: #007BFF;
  padding-left: 10px;
  padding-right: 10px;
  z-index: 10;
}

/* Boutons navigation */
.nav-btn {
  color: white !important;
  font-weight: 500;
  font-size: 0.85rem;
  text-transform: none;
  padding: 6px 8px;
  min-width: 0;
}

.nav-btn:hover {
  background-color: #0056b3;
}

/* Responsive pour petits écrans */
@media screen and (max-width: 600px) {
  .content {
    padding: 20px 15px;
    margin-top: 20px;
  }

  .scroll-title {
    font-size: 0.9rem;
    white-space: nowrap;
  }

  .info-card {
    padding: 14px;
  }

  .headline {
    font-size: 15px;
  }

  .app-logo {
    height: 28px;
    max-width: 90px;
  }

  .nav-btn {
    font-size: 0.65rem !important;
    padding: 4px 5px !important;
  }

  .v-app-bar {
    height: 48px;
  }
}
</style>
