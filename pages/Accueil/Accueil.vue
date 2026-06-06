<template>
  <v-app class="landing-root">
    <v-container fluid class="main-container pa-0">
      <!-- ✅ App Bar (pro, responsive, respect thème Vuetify "primary") -->
      <v-app-bar
        app
        color="primary"
        elevation="0"
        class="appbar px-3 px-sm-8"
        height="72"
      >
        <div class="appbar-inner">
          <!-- Brand -->
          <div class="brand" role="button" tabindex="0" @click="goHome" @keyup.enter="goHome">
            <v-img
              :src="logoSrc"
              alt="Logo EchoEducation"
              class="brand-logo"
              width="160"
              cover
            />
            <div class="brand-text d-none d-md-flex">
              <div class="brand-title">EchoEducation</div>
              <div class="brand-subtitle">Suivi scolaire & gestion</div>
            </div>
          </div>

          <!-- Actions -->
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
              @click="showLoginDialog"
            >
              Accéder
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </div>
        </div>
      </v-app-bar>

      <!-- ✅ HERO (belle section, responsive, lisible mobile) -->
      <section class="hero">
        <v-container class="py-10 py-md-14">
          <v-row align="center" class="gy-8">
            <!-- Left: text -->
            <v-col cols="12" md="7">
              <div class="hero-badge">
                <v-icon size="18">mdi-sparkles</v-icon>
                <span>Plateforme scolaire moderne</span>
              </div>

              <h1 class="hero-title">
                Bienvenue sur <span class="hero-title-accent">EchoEducation</span>
              </h1>

              <p class="hero-subtitle">
                Centralisez la gestion, améliorez le suivi pédagogique et renforcez la communication
                entre établissements, enseignants et parents — sur mobile et PC.
              </p>

              <div class="hero-cta">
                <v-btn
                  color="primary"
                  size="large"
                  class="hero-btn"
                  @click="showLoginDialog"
                >
                  Se connecter
                  <v-icon end>mdi-login</v-icon>
                </v-btn>

                <v-btn
                  variant="outlined"
                  size="large"
                  class="hero-btn-outline"
                  @click="goToAbout"
                >
                  Découvrir
                  <v-icon end>mdi-information-outline</v-icon>
                </v-btn>
              </div>

              <!-- ✅ petite ligne de confiance -->
              <div class="hero-trust">
                <v-icon size="18">mdi-shield-check</v-icon>
                <span>Données organisées, expérience fluide, interface responsive.</span>
              </div>
            </v-col>

            <!-- Right: mock/illustration card -->
            <v-col cols="12" md="5">
              <v-card class="hero-card" rounded="xl" elevation="10">
                <v-card-title class="hero-card-title">
                  <v-icon color="primary" class="mr-2">mdi-view-dashboard</v-icon>
                  Tableau de bord
                </v-card-title>
                <v-card-text class="pt-2">
                  <div class="mini-list">
                    <div class="mini-item">
                      <v-icon color="primary">mdi-account-school</v-icon>
                      <div>
                        <div class="mini-title">Élèves</div>
                        <div class="mini-sub">Suivi & historique</div>
                      </div>
                    </div>
                    <div class="mini-item">
                      <v-icon color="primary">mdi-clipboard-check</v-icon>
                      <div>
                        <div class="mini-title">Notes & devoirs</div>
                        <div class="mini-sub">Évaluations simplifiées</div>
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

                  <v-divider class="my-4" />

                  <div class="hero-card-bottom">
                    <div class="stat">
                      <div class="stat-num">3</div>
                      <div class="stat-lbl">Espaces</div>
                    </div>
                    <div class="stat">
                      <div class="stat-num">100%</div>
                      <div class="stat-lbl">Responsive</div>
                    </div>
                    <div class="stat">
                      <div class="stat-num">1</div>
                      <div class="stat-lbl">Plateforme</div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>

        <!-- ✅ vague décorative légère -->
        <div class="hero-wave" aria-hidden="true"></div>
      </section>

      <!-- ✅ Section Avantages -->
      <section class="benefits" ref="aboutSection">
        <v-container class="py-10 py-md-14">
          <div class="section-head">
            <h2 class="section-title">Pourquoi EchoEducation ?</h2>
            <p class="section-subtitle">
              Une expérience claire, rapide, et adaptée à chaque profil.
            </p>
          </div>

          <v-row class="mt-6" align="stretch">
            <v-col cols="12" sm="6" md="4">
              <v-card class="info-card" rounded="xl" elevation="6">
                <div class="info-icon">
                  <v-icon size="26" color="primary">mdi-school</v-icon>
                </div>
                <div class="info-content">
                  <div class="info-title">Pour les établissements</div>
                  <div class="info-text">
                    Gestion administrative, organisation et suivi des élèves dans une interface simple et une communication directe avec les parents d'élèves.
                  </div>
                </div>
              </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="4">
              <v-card class="info-card" rounded="xl" elevation="6">
                <div class="info-icon">
                  <v-icon size="26" color="primary">mdi-teach</v-icon>
                </div>
                <div class="info-content">
                  <div class="info-title">Pour les enseignants</div>
                  <div class="info-text">
                   Évaluations, suivi pédagogique et saisie simplifiée des informations éducatives des élèves
                  </div>
                </div>
              </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="4">
              <v-card class="info-card" rounded="xl" elevation="6">
                <div class="info-icon">
                  <v-icon size="26" color="primary">mdi-account-child</v-icon>
                </div>
                <div class="info-content">
                  <div class="info-title">Pour les parents</div>
                  <div class="info-text">
                    Accès en temps réel aux progrès de l’enfant, aux notes, présences, punitions, messages et surtout une communication avec l'administration scolaire.
                  </div>
                </div>
              </v-card>
            </v-col>
          </v-row>

          <!-- ✅ CTA bas -->
          <v-sheet class="bottom-cta" rounded="xl">
            <div class="bottom-cta-text">
              <div class="bottom-cta-title">Prêt à commencer ?</div>
              <div class="bottom-cta-sub">
                Choisissez votre espace et connectez-vous.
              </div>
            </div>
            <v-btn color="primary" size="large" class="bottom-cta-btn" @click="showLoginDialog">
              Accéder
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </v-sheet>
        </v-container>
      </section>

      <!-- ✅ Dialog Connexion (pro, icônes, responsive) -->
      <v-dialog v-model="loginDialog" max-width="520">
        <v-card rounded="xl" class="login-card">
          <v-card-title class="login-title">
            Choisissez votre espace
          </v-card-title>

          <v-card-text class="pt-2">
            <v-row class="gy-3">
              <v-col cols="12">
                <v-btn block size="large" class="login-btn" variant="tonal" color="primary" @click="goToParent">
                  <v-icon start>mdi-account-child</v-icon>
                  Espace Parent
                </v-btn>
              </v-col>
              <v-col cols="12">
                <v-btn block size="large" class="login-btn" variant="tonal" color="primary" @click="goToTeacher">
                  <v-icon start>mdi-teach</v-icon>
                  Espace Enseignant
                </v-btn>
              </v-col>
              <v-col cols="12">
                <v-btn block size="large" class="login-btn" variant="tonal" color="primary" @click="goToSchool">
                  <v-icon start>mdi-school</v-icon>
                  Espace Établissement
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>

          <v-card-actions class="px-6 pb-5">
            <v-spacer />
            <v-btn variant="text" @click="loginDialog = false">
              Fermer
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- ✅ Footer simple -->
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
              <v-btn variant="text" class="footer-link" @click="showLoginDialog">Accéder</v-btn>
            </div>
          </div>
        </v-container>
      </footer>
    </v-container>
  </v-app>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";

const router = useRouter();
const { mdAndUp } = useDisplay();

const loginDialog = ref(false);
const activeButton = ref("about");
const aboutSection = ref(null);

// ✅ Logo (garde ton asset)
const logoSrc = computed(() => new URL("@/assets/administration/logooff.png", import.meta.url).href);

const showLoginDialog = () => {
  activeButton.value = "login";
  loginDialog.value = true;
};

const goToParent = () => {
  loginDialog.value = false;
  router.push("/parents/Acceuil");
};

const goToTeacher = () => {
  loginDialog.value = false;
  router.push("/professeurs/connexion");
};

const goToSchool = () => {
  loginDialog.value = false;
  router.push("/administration/Accueil");
};

const goToAbout = () => {
  activeButton.value = "about";
  // scroll doux vers la section avantages
  const el = aboutSection.value?.$el || aboutSection.value;
  if (el?.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
  else window.scrollTo({ top: mdAndUp.value ? 700 : 600, behavior: "smooth" });
};

const goHome = () => {
  activeButton.value = "about";
  window.scrollTo({ top: 0, behavior: "smooth" });
};
</script>

<style scoped>
/* ✅ Base */
.landing-root {
  background: rgb(var(--v-theme-background));
}

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

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.brand-logo {
  border-radius: 10px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
  color: white;
}

.brand-title {
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.2px;
}

.brand-subtitle {
  opacity: 0.9;
  font-size: 12px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.top-btn {
  color: white;
  font-weight: 700;
  border-radius: 999px;
  padding: 0 14px;
}

.top-btn-cta {
  font-weight: 800;
  border-radius: 999px;
  padding: 0 16px;
}

.top-btn--active {
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.35);
}

/* ✅ HERO */
.hero {
  position: relative;
  padding-top: 72px; /* laisse de la place à l'appbar */
  background:
    radial-gradient(900px 400px at 20% 20%, rgba(255,255,255,0.18), transparent 60%),
    linear-gradient(180deg, rgba(var(--v-theme-primary), 1) 0%, rgba(var(--v-theme-primary), 0.92) 45%, rgba(var(--v-theme-background), 1) 100%);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  color: white;
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 14px;
}

.hero-title {
  margin: 0;
  color: white;
  font-weight: 900;
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
  font-weight: 600;
  font-size: 13px;
}

.hero-card {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.hero-card-title {
  font-weight: 900;
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
  font-weight: 900;
  font-size: 14px;
}

.mini-sub {
  opacity: 0.85;
  font-size: 13px;
}

.hero-card-bottom {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stat {
  background: rgba(0, 0, 0, 0.03);
  border-radius: 14px;
  padding: 10px;
  text-align: center;
}

.stat-num {
  font-weight: 900;
  font-size: 18px;
  color: rgb(var(--v-theme-primary));
}

.stat-lbl {
  font-size: 12px;
  opacity: 0.85;
  font-weight: 700;
}

.hero-wave {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 40px;
  background: linear-gradient(180deg, rgba(255,255,255,0.0), rgba(var(--v-theme-background),1));
}

/* ✅ Benefits */
.benefits {
  background: rgb(var(--v-theme-background));
}

.section-head {
  text-align: center;
  max-width: 820px;
  margin: 0 auto;
}

.section-title {
  margin: 0;
  font-weight: 900;
  font-size: clamp(20px, 2.5vw, 30px);
  letter-spacing: -0.2px;
}

.section-subtitle {
  margin-top: 10px;
  opacity: 0.85;
  line-height: 1.6;
}

/* ✅ Info cards */
.info-card {
  display: grid;
  grid-template-columns: 46px 1fr;
  gap: 14px;
  padding: 18px;
  height: 100%;
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
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
  font-weight: 900;
  font-size: 15px;
  margin-bottom: 6px;
}

.info-text {
  opacity: 0.85;
  line-height: 1.55;
  font-size: 14px;
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
}

.bottom-cta-title {
  font-weight: 900;
  font-size: 16px;
}

.bottom-cta-sub {
  opacity: 0.85;
  margin-top: 2px;
  font-size: 13px;
}

.bottom-cta-btn {
  border-radius: 14px;
  font-weight: 900;
}

/* ✅ Login dialog */
.login-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.login-title {
  font-weight: 900;
}

.login-btn {
  border-radius: 14px;
  font-weight: 900;
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
}

.footer-brand {
  font-weight: 900;
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
  font-weight: 800;
}

/* ✅ Mobile tweaks */
@media (max-width: 600px) {
  .appbar {
    height: 64px !important;
  }
  .brand-logo {
    width: 130px !important;
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
