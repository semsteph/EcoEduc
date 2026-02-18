<template>
  <v-container fluid class="login-container">
    <!-- Bouton retour -->
    <v-btn
      class="back-button"
      icon
      variant="flat"
      @click="$router.push('/Accueil/Accueil')"
      aria-label="Retour"
    >
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>

    <v-row justify="center" align="center" class="fill-height ma-0">
      <v-col cols="12" sm="10" md="6" lg="4" class="pa-0">
        <!-- Header -->
        <div class="text-center mb-5 px-5">
          <div class="brand-badge mx-auto mb-3">
            <v-icon size="22">mdi-school-outline</v-icon>
          </div>

          <div class="welcome-title">Bienvenue</div>
          <div class="welcome-subtitle">
            Connectez-vous pour accéder à votre espace personnel.
          </div>
        </div>

        <!-- Card -->
        <v-card class="login-card" elevation="10">
          <!-- LOGIN -->
          <v-form v-if="!showReset" @submit.prevent="login">
            <v-text-field
              v-model="usernameOrEmail"
              label="Nom d'utilisateur ou Email"
              required
              variant="outlined"
              density="comfortable"
              color="primary"
              prepend-inner-icon="mdi-account"
              class="rounded-field"
              hide-details="auto"
            />

            <v-text-field
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              label="Mot de passe"
              required
              variant="outlined"
              density="comfortable"
              color="primary"
              prepend-inner-icon="mdi-lock"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="togglePasswordVisibility"
              class="rounded-field"
              hide-details="auto"
            />

            <v-select
              v-model="etablissement"
              :items="etablissements"
              item-title="nom"
              item-value="id"
              label="Établissement"
              required
              variant="outlined"
              density="comfortable"
              color="primary"
              prepend-inner-icon="mdi-school"
              class="rounded-field"
              hide-details="auto"
            />

            <v-btn
              type="submit"
              color="primary"
              block
              size="large"
              class="mt-4 login-button"
              :loading="loginLoading"
              :disabled="loginLoading"
            >
              Se connecter
            </v-btn>

            <v-alert
              v-if="error"
              type="error"
              class="mt-4"
              variant="tonal"
              border="start"
              density="comfortable"
            >
              {{ error }}
            </v-alert>

            <div class="text-center mt-3">
              <v-btn
                variant="text"
                class="forgot-btn"
                color="primary"
                @click="openReset"
              >
                Mot de passe oublié ?
              </v-btn>
            </div>
          </v-form>

          <!-- RESET -->
          <v-form v-else @submit.prevent="handleReset">
            <div class="reset-head mb-4">
              <div class="reset-title">
                <v-icon class="mr-2" size="20">mdi-lock-reset</v-icon>
                Réinitialisation
              </div>
              <div class="reset-subtitle">
                Suivez les étapes pour récupérer votre compte.
              </div>
            </div>

            <!-- Stepper mini (visuel) -->
            <div class="mini-steps mb-4">
              <div class="step" :class="{ active: !resetCodeSent }">
                <span class="dot"></span>
                <span>Email</span>
              </div>
              <div class="line"></div>
              <div class="step" :class="{ active: resetCodeSent && !validCode }">
                <span class="dot"></span>
                <span>Code</span>
              </div>
              <div class="line"></div>
              <div class="step" :class="{ active: validCode }">
                <span class="dot"></span>
                <span>Nouveau</span>
              </div>
            </div>

            <div v-if="!resetCodeSent">
              <v-text-field
                v-model="email"
                label="Entrez votre e-mail"
                required
                variant="outlined"
                density="comfortable"
                color="primary"
                prepend-inner-icon="mdi-email-outline"
                class="rounded-field"
                hide-details="auto"
              />

              <v-select
                v-model="resetEtablissement"
                :items="etablissements"
                item-title="nom"
                item-value="id"
                label="Établissement"
                required
                variant="outlined"
                density="comfortable"
                color="primary"
                prepend-inner-icon="mdi-school"
                class="rounded-field"
                hide-details="auto"
              />
            </div>

            <v-text-field
              v-if="resetCodeSent && !validCode"
              v-model="code"
              label="Code de vérification"
              required
              variant="outlined"
              density="comfortable"
              color="primary"
              prepend-inner-icon="mdi-shield-key-outline"
              class="rounded-field"
              hide-details="auto"
            />

            <div v-if="validCode">
              <v-text-field
                v-model="newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                label="Nouveau mot de passe"
                required
                variant="outlined"
                density="comfortable"
                color="primary"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="toggleNewPasswordVisibility"
                class="rounded-field"
                hide-details="auto"
              />

              <v-text-field
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                label="Confirmez le mot de passe"
                required
                variant="outlined"
                density="comfortable"
                color="primary"
                prepend-inner-icon="mdi-lock-check-outline"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="toggleConfirmPasswordVisibility"
                class="rounded-field"
                hide-details="auto"
              />
            </div>

            <v-btn
              type="submit"
              color="primary"
              block
              size="large"
              class="mt-3 login-button"
              :loading="resetLoading"
              :disabled="resetLoading"
            >
              {{
                resetCodeSent
                  ? validCode
                    ? 'Modifier le mot de passe'
                    : 'Valider le code'
                  : 'Envoyer le code'
              }}
            </v-btn>

            <v-btn
              variant="tonal"
              color="black"
              block
              class="mt-2 cancel-btn"
              @click="cancelReset"
            >
              Annuler
            </v-btn>

            <v-alert
              v-if="resetError"
              type="error"
              class="mt-4"
              variant="tonal"
              border="start"
              density="comfortable"
            >
              {{ resetError }}
            </v-alert>

            <v-alert
              v-if="resetSuccess"
              type="success"
              class="mt-4"
              variant="tonal"
              border="start"
              density="comfortable"
            >
              {{ resetSuccess }}
            </v-alert>
          </v-form>
        </v-card>

        <!-- Footer -->
        <div class="text-center mt-4 footer-note px-6">
          © {{ new Date().getFullYear() }} — Plateforme scolaire
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import axios from "axios";
import "/assets/css/styles.css";

const API_BASE = "http://localhost:8080";

export default {
  data() {
    return {
      // Connexion
      usernameOrEmail: "",
      password: "",
      etablissement: "",
      error: "",
      showPassword: false,
      loginLoading: false,

      // Réinitialisation
      showReset: false,
      email: "",
      code: "",
      newPassword: "",
      confirmPassword: "",
      resetCodeSent: false,
      validCode: false,
      enseignantId: null,
      resetEtablissement: "",
      resetError: "",
      resetSuccess: "",
      showNewPassword: false,
      showConfirmPassword: false,
      resetLoading: false,

      // Etablissements
      etablissements: [],
    };
  },

  mounted() {
    this.fetchEtablissements();
  },

  methods: {
    togglePasswordVisibility() {
      this.showPassword = !this.showPassword;
    },
    toggleNewPasswordVisibility() {
      this.showNewPassword = !this.showNewPassword;
    },
    toggleConfirmPasswordVisibility() {
      this.showConfirmPassword = !this.showConfirmPassword;
    },

    openReset() {
      this.error = "";
      this.showReset = true;
    },

    async fetchEtablissements() {
      try {
        const res = await axios.get(`${API_BASE}/api/etablissements`);
        this.etablissements = res.data || [];
      } catch (error) {
        console.error("Erreur lors du chargement des établissements.", error);
      }
    },

    async login() {
      this.error = "";
      this.loginLoading = true;

      try {
        const response = await axios.post(`${API_BASE}/api/loginEns`, {
          username: this.usernameOrEmail, // ✅
          password: this.password,
          etablissement: this.etablissement,
        });

        const token = response.data.token;
        localStorage.setItem("token", token);

        const payload = JSON.parse(atob(token.split(".")[1]));
        const {
          id: enseignantId,
          etablissement: etablissementId,
          enseignant_nom,
          enseignant_prenom,
          etablissement_nom,
        } = payload;

        this.$router.push({
          path: "/professeurs/dashbord",
          query: {
            id: enseignantId,
            etablissement: etablissementId,
            enseignantNom: enseignant_nom,
            enseignantPrenom: enseignant_prenom,
            etablissementNom: etablissement_nom,
          },
        });
      } catch (error) {
        this.error = error.response?.data?.message || "Erreur de connexion au serveur.";
      } finally {
        this.loginLoading = false;
      }
    },

    cancelReset() {
      this.showReset = false;
      this.email = "";
      this.code = "";
      this.newPassword = "";
      this.confirmPassword = "";
      this.resetCodeSent = false;
      this.validCode = false;
      this.enseignantId = null;
      this.resetEtablissement = "";
      this.resetError = "";
      this.resetSuccess = "";
      this.resetLoading = false;
    },

    async handleReset() {
      this.resetError = "";
      this.resetSuccess = "";
      this.resetLoading = true;

      try {
        if (!this.resetCodeSent) {
          await axios.post(`${API_BASE}/api/send-reset-code`, {
            email: this.email,
            etablissement: this.resetEtablissement,
          });
          this.resetCodeSent = true;
        } else if (!this.validCode) {
          const res = await axios.post(`${API_BASE}/api/verify-reset-code`, {
            email: this.email,
            code: this.code,
            etablissement: this.resetEtablissement,
          });
          this.enseignantId = res.data.enseignantId;
          this.validCode = true;
        } else {
          if (this.newPassword !== this.confirmPassword) {
            this.resetError = "Les mots de passe ne correspondent pas.";
            return;
          }

          await axios.post(`${API_BASE}/api/update-password`, {
            enseignantId: this.enseignantId,
            newPassword: this.newPassword,
          });

          this.resetSuccess =
            "Mot de passe modifié avec succès. Vous pouvez maintenant vous connecter.";
          // On revient au login proprement
          this.cancelReset();
        }
      } catch (error) {
        if (error.response?.status === 404) {
          this.resetError = "Aucun compte n’est associé à cet e-mail et établissement.";
        } else {
          this.resetError = error.response?.data?.message || "Erreur lors du processus.";
        }
      } finally {
        this.resetLoading = false;
      }
    },
  },
};
</script>

<style scoped>
/* CHARTE : BLEU / BLANC + touche de noir */
.login-container {
  min-height: 100vh;
  padding: 14px;
  background:
    radial-gradient(900px 500px at 20% 15%, rgba(25, 118, 210, 0.22), transparent 60%),
    radial-gradient(700px 500px at 80% 10%, rgba(25, 118, 210, 0.14), transparent 55%),
    linear-gradient(180deg, #eaf2ff 0%, #ffffff 45%, #f6f9ff 100%);
  position: relative;
  overflow: hidden;
}

/* Bouton retour flottant */
.back-button {
  position: fixed;
  top: 14px;
  left: 14px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.55) !important;
  color: #fff !important;
  border-radius: 12px !important;
  backdrop-filter: blur(8px);
}

/* Badge logo */
.brand-badge {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(25, 118, 210, 0.12);
  border: 1px solid rgba(25, 118, 210, 0.18);
  color: #1976d2;
}

.welcome-title {
  font-size: 1.55rem;
  font-weight: 900;
  color: #0b2e4a; /* bleu foncé */
  letter-spacing: 0.2px;
}

.welcome-subtitle {
  margin-top: 6px;
  font-size: 0.98rem;
  color: #455a64;
  line-height: 1.35rem;
}

/* Carte principale */
.login-card {
  border-radius: 18px !important;
  background: rgba(255, 255, 255, 0.92) !important;
  border: 1px solid rgba(25, 118, 210, 0.14);
  box-shadow: 0 18px 60px rgba(11, 46, 74, 0.12);
  padding: 18px;
}

/* Champs arrondis */
.rounded-field :deep(.v-field) {
  border-radius: 14px !important;
}

/* Bouton principal */
.login-button {
  border-radius: 999px !important;
  font-weight: 900;
  letter-spacing: 0.3px;
}

/* Bouton annuler (touche de noir) */
.cancel-btn {
  border-radius: 999px !important;
  font-weight: 800;
}

/* Mot de passe oublié */
.forgot-btn {
  text-transform: none;
  font-weight: 800;
}

/* Reset header */
.reset-title {
  font-weight: 900;
  color: #0b2e4a;
  display: flex;
  align-items: center;
  font-size: 1.05rem;
}

.reset-subtitle {
  color: #607d8b;
  font-size: 0.9rem;
  margin-top: 4px;
}

/* Mini stepper */
.mini-steps {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #90a4ae;
  font-weight: 800;
  font-size: 0.85rem;
}

.step .dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #cfd8dc;
  display: inline-block;
}

.step.active {
  color: #1976d2;
}

.step.active .dot {
  background: #1976d2;
}

.line {
  flex: 1;
  height: 2px;
  background: #e3f2fd;
  border-radius: 999px;
}

/* Footer */
.footer-note {
  color: #78909c;
  font-size: 0.85rem;
}

/* Mobile adjustments */
@media (max-width: 420px) {
  .login-container {
    padding: 10px;
  }
  .login-card {
    padding: 14px;
    border-radius: 16px !important;
  }
  .welcome-title {
    font-size: 1.35rem;
  }
  .welcome-subtitle {
    font-size: 0.92rem;
  }
}
</style>
