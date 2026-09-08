<template>
  <v-container class="accueil-page" fluid>
    <!-- ✅ Hero -->
    <div class="hero">
      <div class="hero-inner">
        <div class="hero-badge">
          <v-icon size="16" class="mr-1">mdi-shield-check-outline</v-icon>
          Espace Parent — EchoEducation
        </div>

        <h1 class="hero-title">
          Le suivi scolaire, un atout pour la réussite de votre enfant
        </h1>

        <p class="hero-subtitle">
          Suivez les notes, la présence, la conduite et restez connecté à l’établissement,
          en toute simplicité.
        </p>

        <div class="hero-actions">
          <v-btn color="primary" class="pill" @click="$emit('showComponent','ChildrenList')">
            <v-icon start>mdi-account-child</v-icon>
            Voir mes enfants
          </v-btn>

          <v-btn variant="tonal" color="black" class="pill" @click="$emit('showComponent','ContactAdmin')">
            <v-icon start>mdi-email</v-icon>
            Contacter l’administration
          </v-btn>
        </div>
      </div>
    </div>

    <!-- ✅ Cards -->
    <v-row class="cards-wrap" dense justify="center">
      <v-col cols="12" sm="10" md="6" lg="4">
        <v-card class="info-card" elevation="12">
          <div class="card-accent" aria-hidden="true"></div>

          <v-card-text class="card-body">
            <div class="card-icon">
              <v-icon size="22" color="primary">mdi-chart-line</v-icon>
            </div>

            <div class="card-title">
              Le suivi scolaire : un atout pour la réussite
            </div>
            <div class="card-text">
              Comprenez mieux les progrès et les difficultés de votre enfant.
              Restez informé et accompagnez-le tout au long de l’année.
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="10" md="6" lg="4">
        <v-card class="info-card" elevation="12">
          <div class="card-accent" aria-hidden="true"></div>

          <v-card-text class="card-body">
            <div class="card-icon">
              <v-icon size="22" color="primary">mdi-account-group-outline</v-icon>
            </div>

            <div class="card-title">
              Un lien renforcé avec les enseignants
            </div>
            <div class="card-text">
              Facilitez la communication parents–enseignants pour un suivi
              plus personnalisé et mieux adapté.
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="10" md="6" lg="4">
        <v-card class="info-card" elevation="12">
          <div class="card-accent" aria-hidden="true"></div>

          <v-card-text class="card-body">
            <div class="card-icon">
              <v-icon size="22" color="primary">mdi-trophy-outline</v-icon>
            </div>

            <div class="card-title">
              Motivation et engagement au quotidien
            </div>
            <div class="card-text">
              Montrer à votre enfant que ses efforts comptent renforce sa confiance
              et l’aide à persévérer.
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: "Acceuil",
  emits: ["showComponent"],
};
</script>

<style scoped>
/* ✅ Charte EchoEducation: bleu/blanc + touche sombre */
.accueil-page {
  padding: 0 !important;
}

/* ✅ Background harmonisé avec ton dashboard */
.accueil-page {
  background:
    radial-gradient(900px 500px at 20% 15%, rgba(25, 118, 210, 0.16), transparent 60%),
    radial-gradient(700px 500px at 80% 10%, rgba(11, 46, 74, 0.10), transparent 55%),
    linear-gradient(180deg, #eaf2ff 0%, #ffffff 45%, #f6f9ff 100%);
}

/* ✅ Hero */
.hero {
  padding: 22px 16px 10px;
}

.hero-inner {
  max-width: 1100px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(25, 118, 210, 0.12);
  border-radius: 22px;
  padding: 22px 18px;
  box-shadow: 0 16px 60px rgba(11, 46, 74, 0.12);
  backdrop-filter: blur(8px);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(25, 118, 210, 0.10);
  border: 1px solid rgba(25, 118, 210, 0.18);
  color: #0b2e4a;
  font-weight: 900;
  font-size: 0.82rem;
}

.hero-title {
  margin: 12px 0 6px;
  color: #0b2e4a;
  font-weight: 950;
  letter-spacing: 0.2px;
  line-height: 1.15;
  font-size: clamp(1.25rem, 2.2vw, 1.8rem);
}

.hero-subtitle {
  margin: 0;
  color: #455a64;
  line-height: 1.45;
  font-size: 0.98rem;
  max-width: 60ch;
}

.hero-actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.pill {
  border-radius: 999px !important;
  font-weight: 900;
  text-transform: none;
}

/* ✅ Cards section */
.cards-wrap {
  padding: 10px 12px 22px;
  max-width: 1200px;
  margin: 0 auto;
}

.info-card {
  border-radius: 20px !important;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(25, 118, 210, 0.12);
  box-shadow: 0 18px 70px rgba(11, 46, 74, 0.12);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.info-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 78px rgba(11, 46, 74, 0.16) !important;
}

.card-accent {
  height: 6px;
  width: 100%;
  background: linear-gradient(90deg, #1976d2, rgba(25, 118, 210, 0.22), #1976d2);
  opacity: 0.95;
}

.card-body {
  padding: 18px !important;
}

.card-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(25, 118, 210, 0.10);
  border: 1px solid rgba(25, 118, 210, 0.14);
  margin-bottom: 10px;
}

.card-title {
  color: #0b2e4a;
  font-weight: 950;
  letter-spacing: 0.2px;
  line-height: 1.25;
  font-size: 1.05rem;
}

.card-text {
  margin-top: 8px;
  color: #546e7a;
  line-height: 1.5;
  font-size: 0.95rem;
}

/* ✅ Mobile */
@media (max-width: 600px) {
  .hero {
    padding: 14px 10px 6px;
  }
  .hero-inner {
    padding: 16px 14px;
    border-radius: 18px;
  }
  .hero-subtitle {
    font-size: 0.94rem;
  }
  .cards-wrap {
    padding: 8px 8px 16px;
  }
  .card-body {
    padding: 14px !important;
  }
}

/* ✅ Très petit écran */
@media (max-width: 360px) {
  .hero-title {
    font-size: 1.18rem;
  }
  .hero-badge {
    font-size: 0.78rem;
  }
}
</style>
