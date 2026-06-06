<template>
  <v-app class="landing-root">
    <v-container fluid class="main-container pa-0">
      <!-- ✅ AppBar pro + responsive -->
      <v-app-bar
        app
        color="primary"
        flat
        elevate-on-scroll
        class="appbar px-3 px-sm-8"
        height="72"
      >
        <div class="appbar-inner">
          <v-toolbar-title class="title" @click="goHome" role="button" tabindex="0">
            EchoEducation
          </v-toolbar-title>

          <div class="actions">
            <v-btn
              variant="text"
              class="top-btn"
              :class="{ 'top-btn--active': activeButton === 'about' }"
              @click="goToAbout"
            >
              À propos
            </v-btn>

            <v-btn
              variant="flat"
              class="top-btn-cta"
              :class="{ 'top-btn--active': activeButton === 'login' }"
              @click="goToLogin"
            >
              Connexion
              <v-icon end>mdi-login</v-icon>
            </v-btn>
          </div>
        </div>
      </v-app-bar>

      <!-- ✅ HERO (bannière moderne, pas de texte qui défile en continu) -->
      <section class="hero">
        <v-container class="py-10 py-md-14">
          <v-row align="center" class="gy-8">
            <v-col cols="12" md="7">
              <div class="hero-badge">
                <v-icon size="18">mdi-sparkles</v-icon>
                <span>Suivi scolaire • Communication • Performance</span>
              </div>

              <h1 class="hero-title">
                Bienvenue sur <span class="hero-title-accent">EchoEducation</span>
              </h1>

              <p class="hero-subtitle">
                Identifiez les points forts, accompagnez les progrès et facilitez la collaboration
                entre parents et enseignants, depuis un téléphone ou un ordinateur.
              </p>

              <div class="hero-cta">
                <v-btn color="primary" size="large" class="hero-btn" @click="goToLogin">
                  Se connecter
                  <v-icon end>mdi-arrow-right</v-icon>
                </v-btn>

                <v-btn variant="outlined" size="large" class="hero-btn-outline" @click="goToAbout">
                  Découvrir
                  <v-icon end>mdi-information-outline</v-icon>
                </v-btn>
              </div>

              <div class="hero-trust">
                <v-icon size="18">mdi-shield-check</v-icon>
                <span>Interface responsive, simple et rapide.</span>
              </div>
            </v-col>

            <v-col cols="12" md="5">
              <v-card class="hero-card" rounded="xl" elevation="10">
                <v-card-title class="hero-card-title">
                  <v-icon color="primary" class="mr-2">mdi-view-dashboard</v-icon>
                  Avantages clés
                </v-card-title>

                <v-card-text class="pt-2">
                  <div class="mini-list">
                    <div class="mini-item">
                      <v-icon color="primary">mdi-account-check</v-icon>
                      <div>
                        <div class="mini-title">Suivi personnalisé</div>
                        <div class="mini-sub">Forces & besoins</div>
                      </div>
                    </div>

                    <div class="mini-item">
                      <v-icon color="primary">mdi-chart-line</v-icon>
                      <div>
                        <div class="mini-title">Meilleurs résultats</div>
                        <div class="mini-sub">Progression mesurable</div>
                      </div>
                    </div>

                    <div class="mini-item">
                      <v-icon color="primary">mdi-message-text</v-icon>
                      <div>
                        <div class="mini-title">Communication</div>
                        <div class="mini-sub">Parents ↔ administrations scolaires</div>
                      </div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>

        <div class="hero-wave" aria-hidden="true"></div>
      </section>

      <!-- ✅ Avantages (cards propres + responsive) -->
      <section class="advantages" ref="aboutSection">
        <v-container class="py-10 py-md-14">
          <div class="section-head">
            <h2 class="section-title">Les avantages</h2>
            <p class="section-subtitle">
              Tout ce qu’il faut pour un suivi clair et une collaboration efficace.
            </p>
          </div>

          <v-row class="mt-6" align="stretch">
            <v-col
              cols="12"
              sm="6"
              md="3"
              v-for="advantage in advantages"
              :key="advantage.title"
            >
              <v-card class="info-card" rounded="xl" elevation="6">
                <div class="info-icon">
                  <v-icon size="26" color="primary">{{ advantage.icon }}</v-icon>
                </div>

                <div class="info-content">
                  <div class="info-title">{{ advantage.title }}</div>
                  <div class="info-text">{{ advantage.text }}</div>
                </div>
              </v-card>
            </v-col>
          </v-row>

          <!-- ✅ CTA bas -->
          <v-sheet class="bottom-cta" rounded="xl">
            <div class="bottom-cta-text">
              <div class="bottom-cta-title">Accédez à votre espace</div>
              <div class="bottom-cta-sub">Connexion rapide et sécurisée.</div>
            </div>

            <v-btn color="primary" size="large" class="bottom-cta-btn" @click="goToLogin">
              Connexion
              <v-icon end>mdi-login</v-icon>
            </v-btn>
          </v-sheet>
        </v-container>
      </section>

      <!-- ✅ Footer -->
      <footer class="footer">
        <v-container class="py-6">
          <div class="footer-inner">
            <div class="footer-left">
              <span class="footer-brand">EchoEducation</span>
              <span class="footer-dot">•</span>
              <span class="footer-copy">© {{ new Date().getFullYear() }}</span>
            </div>
            <div class="footer-right">
              <v-btn variant="text" class="footer-link" @click="goToAbout">À propos</v-btn>
              <v-btn variant="text" class="footer-link" @click="goToLogin">Connexion</v-btn>
            </div>
          </div>
        </v-container>
      </footer>
    </v-container>
  </v-app>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const activeButton = ref("about");
const aboutSection = ref(null);

const advantages = ref([
  {
    icon: "mdi-account-check",
    title: "Suivi personnalisé",
    text: "Identifiez les forces et les difficultés pour un accompagnement adapté et efficace.",
  },
  {
    icon: "mdi-chart-line",
    title: "Amélioration des résultats",
    text: "Un suivi structuré aide l’élève à progresser et favorise l’engagement.",
  },
  {
    icon: "mdi-message-text",
    title: "Communication accrue",
    text: "Facilitez les échanges parents–enseignants pour une collaboration durable.",
  },
  {
    icon: "mdi-lightbulb",
    title: "Développement des compétences",
    text: "Accompagnez l’élève vers des compétences essentielles pour son avenir.",
  },
]);

const goToLogin = () => {
  activeButton.value = "login";
  router.push("/parents/connexion");
};

const goToAbout = () => {
  activeButton.value = "about";
  const el = aboutSection.value?.$el || aboutSection.value;
  if (el?.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
  else window.scrollTo({ top: 650, behavior: "smooth" });
};

const goHome = () => {
  activeButton.value = "about";
  window.scrollTo({ top: 0, behavior: "smooth" });
};
</script>

<style scoped>
/* ✅ Root */
.landing-root {
  background: rgb(var(--v-theme-background));
}

/* ✅ Main background (image + overlay propre) */
.main-container {
  min-height: 100vh;
}

/* ✅ AppBar */
.appbar {
  backdrop-filter: blur(10px);
}

.appbar-inner {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.title {
  font-weight: 900;
  letter-spacing: -0.3px;
  cursor: pointer;
  user-select: none;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.top-btn {
  color: white;
  font-weight: 800;
  border-radius: 999px;
  padding: 0 14px;
}

.top-btn-cta {
  font-weight: 900;
  border-radius: 999px;
  padding: 0 16px;
}

.top-btn--active {
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.35);
}

/* ✅ HERO */
.hero {
  position: relative;
  padding-top: 72px;
  background:
    linear-gradient(180deg, rgba(var(--v-theme-primary), 0.92) 0%, rgba(var(--v-theme-primary), 0.85) 35%, rgba(var(--v-theme-background), 1) 100%),
    url("/assets/parents/stock-photo-parents-helping-children-with-homework-in-kitche.jpg") no-repeat center;
  background-size: cover;
  color: white;
}

/* léger voile pour améliorer la lisibilité */
.hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(900px 400px at 20% 20%, rgba(255,255,255,0.15), transparent 60%),
              rgba(0, 0, 0, 0.15);
  pointer-events: none;
}

.hero > * {
  position: relative;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  color: white;
  font-weight: 800;
  font-size: 13px;
  margin-bottom: 14px;
}

.hero-title {
  margin: 0;
  font-weight: 950;
  letter-spacing: -0.4px;
  line-height: 1.05;
  font-size: clamp(28px, 4vw, 46px);
}

.hero-title-accent {
  text-decoration: underline;
  text-underline-offset: 6px;
  text-decoration-thickness: 3px;
}

.hero-subtitle {
  margin-top: 12px;
  color: rgba(255, 255, 255, 0.92);
  font-size: clamp(14px, 2vw, 16px);
  line-height: 1.6;
  max-width: 60ch;
}

.hero-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}

.hero-btn,
.hero-btn-outline {
  border-radius: 14px;
  font-weight: 900;
}

.hero-btn-outline {
  color: white;
  border-color: rgba(255, 255, 255, 0.55);
}

.hero-trust {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 700;
  font-size: 13px;
}

.hero-card {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.22);
}

.hero-card-title {
  font-weight: 950;
}

.mini-list {
  display: grid;
  gap: 12px;
}

.mini-item {
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: 10px;
  align-items: center;
}

.mini-title {
  font-weight: 950;
  font-size: 14px;
}

.mini-sub {
  opacity: 0.9;
  font-size: 13px;
}

.hero-wave {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 40px;
  background: linear-gradient(180deg, rgba(255,255,255,0.0), rgba(var(--v-theme-background),1));
}

/* ✅ Advantages Section */
.advantages {
  background: rgb(var(--v-theme-background));
}

.section-head {
  text-align: center;
  max-width: 820px;
  margin: 0 auto;
}

.section-title {
  margin: 0;
  font-weight: 950;
  font-size: clamp(20px, 2.5vw, 30px);
  letter-spacing: -0.2px;
  color: rgb(var(--v-theme-on-background));
}

.section-subtitle {
  margin-top: 10px;
  opacity: 0.85;
  line-height: 1.6;
  color: rgb(var(--v-theme-on-background));
}

/* ✅ Info card */
.info-card {
  display: grid;
  grid-template-columns: 46px 1fr;
  gap: 14px;
  padding: 18px;
  height: 100%;
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  background: white;
}

.info-card:hover {
  transform: translateY(-3px);
}

.info-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(var(--v-theme-primary), 0.10);
}

.info-title {
  font-weight: 950;
  font-size: 15px;
  margin-bottom: 6px;
  color: #111;
}

.info-text {
  opacity: 0.85;
  line-height: 1.55;
  font-size: 14px;
  color: #111;
}

/* ✅ bottom CTA */
.bottom-cta {
  margin-top: 22px;
  padding: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: white;
}

.bottom-cta-title {
  font-weight: 950;
  font-size: 16px;
  color: #111;
}

.bottom-cta-sub {
  opacity: 0.85;
  margin-top: 2px;
  font-size: 13px;
  color: #111;
}

.bottom-cta-btn {
  border-radius: 14px;
  font-weight: 950;
}

/* ✅ Footer */
.footer {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(0, 0, 0, 0.015);
}

.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  color: rgb(var(--v-theme-on-background));
}

.footer-brand {
  font-weight: 950;
}

.footer-dot {
  opacity: 0.5;
}

.footer-copy {
  opacity: 0.75;
  font-weight: 700;
}

.footer-right {
  display: flex;
  gap: 6px;
}

.footer-link {
  border-radius: 999px;
  font-weight: 850;
}

/* ✅ Mobile */
@media (max-width: 600px) {
  .appbar {
    height: 64px !important;
  }
  .top-btn {
    padding: 0 10px;
  }
  .top-btn-cta {
    padding: 0 12px;
  }
  .bottom-cta {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
