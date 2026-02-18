<template>
  <v-container fluid class="activation-container">
    <!-- Décor -->
    <div class="bg-orb orb-1" aria-hidden="true"></div>
    <div class="bg-orb orb-2" aria-hidden="true"></div>
    <div class="bg-grid" aria-hidden="true"></div>

    <v-row justify="center" align="center" class="fill-height ma-0 pa-2">
      <v-col cols="12" sm="10" md="7" lg="5" xl="4" class="pa-0">
        <!-- Header -->
        <div class="text-center mb-5 px-5">
          <div class="brand-badge mx-auto mb-3">
            <v-icon size="22">mdi-account-check-outline</v-icon>
          </div>
          <div class="welcome-title">Activation du compte</div>
          <div class="welcome-subtitle">
            Finalisez l’accès à votre espace parent <span class="brand-name">EchoEducation</span>.
          </div>
        </div>

        <!-- Card -->
        <v-card class="card" elevation="12">
          <div class="card-accent" aria-hidden="true"></div>

          <v-card-text class="content">
            <!-- Stepper mini -->
            <div class="mini-steps mb-4" role="list" aria-label="Étapes">
              <div class="step" :class="{ active: step === 1 }" role="listitem">
                <span class="dot"></span><span>Email</span>
              </div>
              <div class="line"></div>
              <div class="step" :class="{ active: step === 2 }" role="listitem">
                <span class="dot"></span><span>Code</span>
              </div>
              <div class="line"></div>
              <div class="step" :class="{ active: step === 3 }" role="listitem">
                <span class="dot"></span><span>Mot de passe</span>
              </div>
            </div>

            <!-- Alert -->
            <v-alert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              border="start"
              density="comfortable"
              class="mb-3"
            >
              {{ errorMessage }}
            </v-alert>

            <v-alert
              v-if="successMessage"
              type="success"
              variant="tonal"
              border="start"
              density="comfortable"
              class="mb-3"
            >
              {{ successMessage }}
            </v-alert>

            <!-- STEP 1 -->
            <div v-if="step === 1">
              <v-text-field
                v-model="email"
                label="Adresse e-mail"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-email-outline"
                class="rounded-field"
                hide-details="auto"
                autocomplete="email"
              />

              <v-select
                v-model="etablissementId"
                :items="etablissements"
                item-title="nom"
                item-value="id"
                label="Établissement"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-school"
                class="rounded-field"
                hide-details="auto"
              />

              <v-btn
                color="primary"
                block
                size="large"
                class="mt-3 action-btn"
                :loading="loading"
                :disabled="loading || !canSendCode"
                @click="sendCode"
              >
                Envoyer le code
              </v-btn>

              <div class="text-center mt-2 hint">
                <v-icon size="16" class="mr-1">mdi-information-outline</v-icon>
                Le code expire dans 10 minutes.
              </div>
            </div>

            <!-- STEP 2 -->
            <div v-else-if="step === 2">
              <v-text-field
                v-model="code"
                label="Code de vérification"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-shield-key-outline"
                class="rounded-field"
                hide-details="auto"
                inputmode="numeric"
              />

              <v-btn
                color="primary"
                block
                size="large"
                class="mt-3 action-btn"
                :loading="loading"
                :disabled="loading || !canVerifyCode"
                @click="verifyCode"
              >
                Vérifier le code
              </v-btn>

              <v-btn
                variant="tonal"
                color="black"
                block
                class="mt-2 cancel-btn"
                :disabled="loading"
                @click="step = 1"
              >
                Retour
              </v-btn>

              <div class="text-center mt-3">
                <v-btn
                  variant="text"
                  class="link-btn"
                  color="primary"
                  :disabled="loading || !canSendCode"
                  @click="resendCode"
                >
                  Renvoyer un code
                </v-btn>
              </div>
            </div>

            <!-- STEP 3 -->
            <div v-else>
              <v-text-field
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                label="Nouveau mot de passe"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
                class="rounded-field"
                hide-details="auto"
                autocomplete="new-password"
              />

              <v-text-field
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                label="Confirmer le mot de passe"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-lock-check-outline"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showConfirmPassword = !showConfirmPassword"
                class="rounded-field"
                hide-details="auto"
                autocomplete="new-password"
              />

              <v-btn
                color="primary"
                block
                size="large"
                class="mt-3 action-btn"
                :loading="loading"
                :disabled="loading || !canSetPassword"
                @click="setPassword"
              >
                Activer mon compte
              </v-btn>

              <v-btn
                variant="tonal"
                color="black"
                block
                class="mt-2 cancel-btn"
                :disabled="loading"
                @click="step = 2"
              >
                Retour
              </v-btn>

              <div class="text-center mt-3 hint">
                <v-icon size="16" class="mr-1">mdi-shield-check-outline</v-icon>
                Choisissez au moins 6 caractères.
              </div>
            </div>
          </v-card-text>

          <!-- Overlay -->
          <v-overlay :model-value="loading" class="overlay" contained persistent>
            <div class="overlay-box">
              <v-progress-circular indeterminate size="28" />
              <div class="overlay-text">Traitement en cours…</div>
            </div>
          </v-overlay>
        </v-card>

        <!-- Footer -->
        <div class="text-center mt-4 footer-note px-6">
          © {{ new Date().getFullYear() }} — EchoEducation
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import axios from "axios";
const API_BASE = "http://localhost:8080";

export default {
  data() {
    return {
      step: 1,
      email: "",
      etablissementId: "",
      etablissements: [],
      code: "",
      password: "",
      confirmPassword: "",
      errorMessage: "",
      successMessage: "",
      loading: false,
      showPassword: false,
      showConfirmPassword: false,
    };
  },

  computed: {
    canSendCode() {
      return String(this.email).trim().length > 0 && !!this.etablissementId;
    },
    canVerifyCode() {
      return String(this.code).trim().length > 0;
    },
    canSetPassword() {
      return (
        String(this.password).length >= 6 &&
        this.password === this.confirmPassword &&
        String(this.code).trim().length > 0
      );
    },
  },

  async mounted() {
    // ✅ préfill depuis le login (query)
    const qEmail = this.$route.query.email;
    const qEtab = this.$route.query.etablissement;

    if (qEmail) this.email = String(qEmail);
    if (qEtab) this.etablissementId = Number(qEtab) || qEtab;

    try {
      const res = await axios.get(`${API_BASE}/api/etablissements`);
      this.etablissements = res.data || [];
    } catch (e) {
      this.errorMessage = "Impossible de charger les établissements.";
    }
  },

  methods: {
    clearAlerts() {
      this.errorMessage = "";
      this.successMessage = "";
    },

    async sendCode() {
      this.clearAlerts();
      this.loading = true;
      try {
        const res = await axios.post(`${API_BASE}/api/parents/check-email`, {
          email: this.email,
          etablissementId: this.etablissementId,
        });

        if (res.data?.alreadyActive) {
          this.errorMessage = res.data.message || "Compte déjà activé.";
          return;
        }

        if (res.data?.exists && res.data?.codeSent) {
          this.successMessage = "Code envoyé. Vérifiez votre e-mail.";
          this.step = 2;
        } else {
          this.errorMessage = res.data?.message || "Email ou établissement non trouvé.";
        }
      } catch (e) {
        this.errorMessage = e.response?.data?.message || "Erreur de connexion au serveur.";
      } finally {
        this.loading = false;
      }
    },

    async resendCode() {
      // même action que sendCode
      await this.sendCode();
    },

    async verifyCode() {
      this.clearAlerts();
      this.loading = true;
      try {
        const res = await axios.post(`${API_BASE}/api/parents/verify-code`, {
          email: this.email,
          etablissementId: this.etablissementId,
          code: this.code,
        });

        if (res.data?.success && res.data?.verified) {
          this.successMessage = "Code validé. Définissez votre mot de passe.";
          this.step = 3;
        } else {
          this.errorMessage = res.data?.message || "Code invalide.";
        }
      } catch (e) {
        this.errorMessage = e.response?.data?.message || "Erreur serveur.";
      } finally {
        this.loading = false;
      }
    },

    async setPassword() {
      this.clearAlerts();

      if (this.password !== this.confirmPassword) {
        this.errorMessage = "Les mots de passe ne correspondent pas.";
        return;
      }

      this.loading = true;
      try {
        const res = await axios.post(`${API_BASE}/api/parents/set-password`, {
          email: this.email,
          etablissementId: this.etablissementId,
          password: this.password,
          code: this.code,
        });

        if (res.data?.success) {
          this.successMessage = "Compte activé avec succès. Redirection…";
          setTimeout(() => this.$router.push("/parents/connexion"), 1200);
        } else {
          this.errorMessage = res.data?.message || "Impossible d’activer le compte.";
        }
      } catch (e) {
        this.errorMessage = e.response?.data?.message || "Erreur serveur.";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
/* Même charte que la page login */

.activation-container {
  min-height: 100vh;
  padding: 14px;
  position: relative;
  overflow: hidden;

  background:
    radial-gradient(900px 500px at 20% 15%, rgba(25, 118, 210, 0.22), transparent 60%),
    radial-gradient(700px 500px at 80% 10%, rgba(25, 118, 210, 0.14), transparent 55%),
    linear-gradient(180deg, #eaf2ff 0%, #ffffff 45%, #f6f9ff 100%);
}

/* décor */
.bg-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(30px);
  opacity: 0.85;
  pointer-events: none;
  z-index: 0;
}
.orb-1 {
  width: 280px;
  height: 280px;
  top: -90px;
  left: -110px;
  background: rgba(25, 118, 210, 0.22);
}
.orb-2 {
  width: 240px;
  height: 240px;
  bottom: -110px;
  right: -100px;
  background: rgba(11, 46, 74, 0.12);
}
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(25, 118, 210, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(25, 118, 210, 0.06) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: radial-gradient(closest-side, rgba(0,0,0,0.55), transparent 70%);
  pointer-events: none;
  z-index: 0;
}

:deep(.v-row),
:deep(.v-col),
.card {
  position: relative;
  z-index: 1;
}

/* Header */
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
  font-size: clamp(1.35rem, 2.2vw, 1.7rem);
  font-weight: 900;
  color: #0b2e4a;
}
.welcome-subtitle {
  margin-top: 6px;
  font-size: clamp(0.92rem, 1.4vw, 1rem);
  color: #455a64;
  line-height: 1.4rem;
}
.brand-name {
  font-weight: 900;
  color: #1976d2;
}

/* Card */
.card {
  border-radius: 20px !important;
  background: rgba(255, 255, 255, 0.94) !important;
  border: 1px solid rgba(25, 118, 210, 0.14);
  box-shadow: 0 18px 60px rgba(11, 46, 74, 0.14);
  overflow: hidden;
}
.card-accent {
  height: 6px;
  width: 100%;
  background: linear-gradient(90deg, #1976d2, rgba(25, 118, 210, 0.2), #1976d2);
  opacity: 0.9;
}

.content {
  padding: 18px !important;
}

/* Champs */
.rounded-field :deep(.v-field) {
  border-radius: 14px !important;
}

/* Boutons */
.action-btn {
  border-radius: 999px !important;
  font-weight: 900;
  letter-spacing: 0.3px;
}
.cancel-btn {
  border-radius: 999px !important;
  font-weight: 800;
}
.link-btn {
  text-transform: none;
  font-weight: 900;
}

/* Stepper mini */
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
  font-weight: 900;
  font-size: 0.85rem;
  white-space: nowrap;
}
.step .dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #cfd8dc;
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
  background: rgba(25, 118, 210, 0.14);
  border-radius: 999px;
}

.hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 900;
  color: #0b2e4a;
  opacity: 0.78;
  font-size: 0.86rem;
}

/* Overlay */
.overlay {
  backdrop-filter: blur(4px);
}
.overlay-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(25, 118, 210, 0.16);
  box-shadow: 0 16px 40px rgba(11, 46, 74, 0.16);
}
.overlay-text {
  font-weight: 900;
  color: #0b2e4a;
  font-size: 0.95rem;
}

.footer-note {
  color: #78909c;
  font-size: 0.85rem;
}

/* Mobile */
@media (max-width: 420px) {
  .activation-container {
    padding: 10px;
  }
  .content {
    padding: 14px !important;
  }
}
</style>
