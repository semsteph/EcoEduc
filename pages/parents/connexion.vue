<template>
  <v-container fluid class="login-container">
    <!-- Décor (non interactif) -->
    <div class="bg-orb orb-1" aria-hidden="true"></div>
    <div class="bg-orb orb-2" aria-hidden="true"></div>
    <div class="bg-grid" aria-hidden="true"></div>

    <v-row justify="center" align="center" class="fill-height ma-0 pa-2">
      <v-col cols="12" sm="10" md="7" lg="5" xl="4" class="pa-0">
        <!-- Header -->
        <div class="text-center mb-5 px-2 px-sm-5">
          <div class="brand-badge mx-auto mb-3">
            <v-icon size="22">mdi-school-outline</v-icon>
          </div>

          <div class="welcome-title">
            {{ showReset ? "Réinitialisation" : "Bienvenue" }}
          </div>

          <div class="welcome-subtitle">
            <template v-if="!showReset">
              Connectez-vous à votre compte <span class="brand-name">EchoEducation</span>.
            </template>
            <template v-else>
              Récupérez votre compte en 3 étapes : e-mail, code, nouveau mot de passe.
            </template>
          </div>
        </div>

        <!-- Card -->
        <v-card class="login-card" elevation="12">
          <div class="card-accent" aria-hidden="true"></div>

          <v-card-text class="login-content">
            <v-fade-transition mode="out-in">
              <!-- LOGIN -->
              <div v-if="!showReset" key="login">
                <v-form @submit.prevent="login">
                  <v-text-field
                    v-model="username"
                    label="Nom d'utilisateur ou e-mail"
                    variant="outlined"
                    density="comfortable"
                    color="primary"
                    required
                    class="rounded-field"
                    prepend-inner-icon="mdi-account"
                    hide-details="auto"
                    autocomplete="username"
                  />

                  <v-text-field
                    v-model="password"
                    :type="showLoginPassword ? 'text' : 'password'"
                    label="Mot de passe"
                    variant="outlined"
                    density="comfortable"
                    color="primary"
                    required
                    class="rounded-field"
                    prepend-inner-icon="mdi-lock"
                    :append-inner-icon="showLoginPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    @click:append-inner="showLoginPassword = !showLoginPassword"
                    hide-details="auto"
                    autocomplete="current-password"
                  />

                  <v-select
                    v-if="etablissements.length > 0"
                    v-model="etablissement"
                    :items="etablissements"
                    item-title="nom"
                    item-value="id"
                    label="Établissement"
                    variant="outlined"
                    density="comfortable"
                    required
                    class="rounded-field"
                    prepend-inner-icon="mdi-school"
                    hide-details="auto"
                  />

                  <v-btn
                    type="submit"
                    color="primary"
                    block
                    size="large"
                    class="mt-4 login-button"
                    :loading="loginLoading"
                    :disabled="loginLoading || !canLogin"
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

                  <div class="d-flex justify-space-between align-center mt-3">
                    <v-btn variant="text" class="forgot-btn" color="primary" @click="openReset">
                      Mot de passe oublié ?
                    </v-btn>

                    <div class="hint">
                      <v-icon size="16" class="mr-1">mdi-shield-check-outline</v-icon>
                      Connexion sécurisée
                    </div>
                  </div>

                  <div class="text-center mt-2">
                    <v-btn variant="text" class="activation-btn" color="primary" @click="goToActivation">
                      Activer mon compte
                    </v-btn>
                  </div>
                </v-form>
              </div>

              <!-- RESET -->
              <div v-else key="reset">
                <div class="mini-steps mb-4" role="list" aria-label="Étapes">
                  <div class="step" :class="{ active: !resetCodeSent }" role="listitem">
                    <span class="dot"></span>
                    <span>Email</span>
                  </div>
                  <div class="line"></div>
                  <div class="step" :class="{ active: resetCodeSent && !validCode }" role="listitem">
                    <span class="dot"></span>
                    <span>Code</span>
                  </div>
                  <div class="line"></div>
                  <div class="step" :class="{ active: validCode }" role="listitem">
                    <span class="dot"></span>
                    <span>Nouveau</span>
                  </div>
                </div>

                <v-form @submit.prevent="handleReset">
                  <div v-if="!resetCodeSent">
                    <v-text-field
                      v-model="email"
                      label="E-mail"
                      variant="outlined"
                      density="comfortable"
                      required
                      class="rounded-field"
                      prepend-inner-icon="mdi-email-outline"
                      hide-details="auto"
                      autocomplete="email"
                    />

                    <v-select
                      v-if="etablissements.length > 0"
                      v-model="resetEtablissement"
                      :items="etablissements"
                      item-title="nom"
                      item-value="id"
                      label="Établissement"
                      variant="outlined"
                      density="comfortable"
                      required
                      class="rounded-field"
                      prepend-inner-icon="mdi-school"
                      hide-details="auto"
                    />
                  </div>

                  <v-text-field
                    v-if="resetCodeSent && !validCode"
                    v-model="code"
                    label="Code de vérification"
                    variant="outlined"
                    density="comfortable"
                    required
                    class="rounded-field"
                    prepend-inner-icon="mdi-shield-key-outline"
                    hide-details="auto"
                    inputmode="numeric"
                  />

                  <div v-if="validCode">
                    <v-text-field
                      v-model="newPassword"
                      :type="showNewPassword ? 'text' : 'password'"
                      label="Nouveau mot de passe"
                      variant="outlined"
                      density="comfortable"
                      required
                      class="rounded-field"
                      prepend-inner-icon="mdi-lock-outline"
                      :append-inner-icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
                      @click:append-inner="showNewPassword = !showNewPassword"
                      hide-details="auto"
                      autocomplete="new-password"
                    />

                    <v-text-field
                      v-model="confirmPassword"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      label="Confirmer le mot de passe"
                      variant="outlined"
                      density="comfortable"
                      required
                      class="rounded-field"
                      prepend-inner-icon="mdi-lock-check-outline"
                      :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                      @click:append-inner="showConfirmPassword = !showConfirmPassword"
                      hide-details="auto"
                      autocomplete="new-password"
                    />
                  </div>

                  <v-btn
                    type="submit"
                    color="primary"
                    block
                    size="large"
                    class="mt-3 login-button"
                    :loading="resetLoading"
                    :disabled="resetLoading || !canResetSubmit"
                  >
                    {{
                      !resetCodeSent
                        ? "Envoyer le code"
                        : !validCode
                          ? "Valider le code"
                          : "Modifier le mot de passe"
                    }}
                  </v-btn>

                  <v-btn
                    variant="tonal"
                    color="black"
                    block
                    class="mt-2 cancel-btn"
                    @click="cancelReset"
                    :disabled="resetLoading"
                  >
                    Retour
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
              </div>
            </v-fade-transition>
          </v-card-text>

          <!-- Overlay -->
          <v-overlay :model-value="loginLoading || resetLoading" class="overlay" contained persistent>
            <div class="overlay-box">
              <v-progress-circular indeterminate size="28" />
              <div class="overlay-text">Traitement en cours…</div>
            </div>
          </v-overlay>
        </v-card>

        <!-- Footer -->
        <div class="text-center mt-4 footer-note px-2 px-sm-6">
          © {{ new Date().getFullYear() }} — EchoEducation
        </div>
      </v-col>
    </v-row>

    <!-- ✅ DIALOG : compte non activé -->
    <v-dialog v-model="showActivationDialog" max-width="520">
      <v-card class="dialog-card">
        <v-card-title class="dialog-title">
          <v-icon class="mr-2" color="primary">mdi-account-alert-outline</v-icon>
          Compte non activé
        </v-card-title>

        <v-card-text class="dialog-text">
          Votre compte parent n’est pas encore activé (mot de passe non défini).
          <br />
          Cliquez sur <b>Activer</b> pour finaliser l’activation.
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="showActivationDialog = false">
            Fermer
          </v-btn>
          <v-btn color="primary" class="login-button" @click="redirectToActivation">
            Activer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from "axios";

const API_BASE = "";

export default {
  data() {
    return {
      username: "",
      password: "",
      etablissement: "",
      etablissements: [],
      error: "",

      showReset: false,
      email: "",
      resetEtablissement: "",
      code: "",
      newPassword: "",
      confirmPassword: "",
      resetCodeSent: false,
      validCode: false,
      resetError: "",
      resetSuccess: "",
      resetLoading: false,
      resetToken: null,

      showLoginPassword: false,
      showNewPassword: false,
      showConfirmPassword: false,

      loginLoading: false,

      // ✅ activation dialog
      showActivationDialog: false,
      activationParentId: null,
      activationEtablissementId: null,
    };
  },

  computed: {
    canLogin() {
      return (
        String(this.username || "").trim().length > 0 &&
        String(this.password || "").trim().length > 0 &&
        !!this.etablissement
      );
    },
    canResetSubmit() {
      if (!this.resetCodeSent) {
        return String(this.email || "").trim().length > 0 && !!this.resetEtablissement;
      }
      if (this.resetCodeSent && !this.validCode) {
        return String(this.code || "").trim().length > 0;
      }
      return String(this.newPassword || "").length >= 6 && this.newPassword === this.confirmPassword;
    },
  },

  mounted() {
    this.fetchEtablissements();
  },

  methods: {
    openReset() {
      this.error = "";
      this.resetError = "";
      this.resetSuccess = "";
      this.showReset = true;
      if (this.etablissement && !this.resetEtablissement) {
        this.resetEtablissement = this.etablissement;
      }
    },

    async fetchEtablissements() {
      try {
        const res = await axios.get(`${API_BASE}/api/etablissements`);
        this.etablissements = res.data || [];
      } catch (err) {
        console.error("Erreur lors du chargement des établissements :", err);
      }
    },

    async login() {
      this.error = "";
      this.loginLoading = true;

      try {
        const response = await axios.post(`${API_BASE}/api/parent/login`, {
          username: this.username,
          password: this.password,
          etablissement: this.etablissement,
        });

        const token = response.data.token;
        localStorage.setItem("token", token);

        const payload = JSON.parse(atob(token.split(".")[1]));
        const parentId = payload.id;
        const etablissementId = Number(payload.etablissementId);

        this.$router.push({
          path: "/parents/dashbord",
          query: { id: parentId, etablissement: etablissementId },
        });
      } catch (err) {
        // ✅ CAS : compte non activé
        if (err.response?.status === 403 && err.response?.data?.code === "ACCOUNT_NOT_ACTIVATED") {
          this.activationParentId = err.response.data.parentId || null;
          this.activationEtablissementId = err.response.data.etablissementId || null;
          this.showActivationDialog = true;
          return;
        }

        this.error = err.response?.data?.message || "Erreur de connexion au serveur.";
      } finally {
        this.loginLoading = false;
      }
    },

    redirectToActivation() {
      this.showActivationDialog = false;

      // si tu veux passer des infos à la page Activation, on les met en query
      this.$router.push({
        path: "/parents/Activation",
        query: {
          id: this.activationParentId ?? "",
          etablissement: this.activationEtablissementId ?? "",
          email: this.username ?? "",
        },
      });
    },

    cancelReset() {
      this.showReset = false;
      this.email = "";
      this.resetEtablissement = "";
      this.code = "";
      this.newPassword = "";
      this.confirmPassword = "";
      this.resetCodeSent = false;
      this.validCode = false;
      this.resetError = "";
      this.resetSuccess = "";
      this.resetToken = null;
      this.resetLoading = false;
    },

    async handleReset() {
      this.resetError = "";
      this.resetSuccess = "";
      this.resetLoading = true;

      try {
        if (!this.resetCodeSent) {
          const res = await axios.post(`${API_BASE}/api/send`, {
            email: this.email,
            etablissement: this.resetEtablissement,
          });

          if (res.data?.success) {
            this.resetCodeSent = true;
            this.resetSuccess = "Code envoyé. Vérifiez votre boîte mail.";
          } else {
            this.resetError = res.data?.message || "Échec de l’envoi du code.";
          }
          return;
        }

        if (!this.validCode) {
          const res = await axios.post(`${API_BASE}/api/parent-verify-reset-code`, {
            email: this.email,
            code: this.code,
            etablissement: this.resetEtablissement,
          });

          if (res.data?.success && res.data?.resetToken) {
            this.resetToken = res.data.resetToken;
            this.validCode = true;
            this.resetSuccess = "Code validé. Choisissez un nouveau mot de passe.";
          } else {
            this.resetError = res.data?.message || "Code invalide.";
          }
          return;
        }

        if (this.newPassword !== this.confirmPassword) {
          this.resetError = "Les mots de passe ne correspondent pas.";
          return;
        }

        const response = await axios.post(`${API_BASE}/api/parent-update-password`, {
          resetToken: this.resetToken,
          newPassword: this.newPassword,
        });

        if (response.data?.success) {
          this.resetSuccess = "Mot de passe modifié avec succès.";
          setTimeout(() => this.cancelReset(), 1500);
        } else {
          this.resetError = response.data?.message || "La modification du mot de passe a échoué.";
        }
      } catch (error) {
        this.resetError = error.response?.data?.message || "Une erreur est survenue.";
      } finally {
        this.resetLoading = false;
      }
    },

    goToActivation() {
      this.$router.push("/parents/Activation");
    },
  },
};
</script>

<style scoped>
/* CHARTE : BLEU / BLANC + touche de noir */

.login-container {
  min-height: 100vh;
  padding: 14px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(900px 500px at 20% 15%, rgba(13, 148, 136, 0.22), transparent 60%),
    radial-gradient(700px 500px at 80% 10%, rgba(13, 148, 136, 0.14), transparent 55%),
    linear-gradient(180deg, #fdf6ec 0%, #ffffff 45%, #f7f7f5 100%);
}

/* Décor */
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
  background: rgba(13, 148, 136, 0.22);
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
    linear-gradient(rgba(13, 148, 136, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(13, 148, 136, 0.06) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: radial-gradient(closest-side, rgba(0,0,0,0.55), transparent 70%);
  pointer-events: none;
  z-index: 0;
}

:deep(.v-row),
:deep(.v-col),
.login-card {
  position: relative;
  z-index: 1;
}

/* Badge */
.brand-badge {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(13, 148, 136, 0.12);
  border: 1px solid rgba(13, 148, 136, 0.18);
  color: #0d9488;
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
  color: #0d9488;
}

/* Card */
.login-card {
  border-radius: 20px !important;
  background: rgba(255, 255, 255, 0.94) !important;
  border: 1px solid rgba(13, 148, 136, 0.14);
  box-shadow: 0 18px 60px rgba(11, 46, 74, 0.14);
  overflow: hidden;
}

.card-accent {
  height: 6px;
  width: 100%;
  background: linear-gradient(90deg, #0d9488, rgba(13, 148, 136, 0.2), #0d9488);
  opacity: 0.9;
}

.login-content {
  padding: 18px !important;
}

.rounded-field :deep(.v-field) {
  border-radius: 14px !important;
}

.login-button {
  border-radius: 999px !important;
  font-weight: 900;
  letter-spacing: 0.3px;
}

.cancel-btn {
  border-radius: 999px !important;
  font-weight: 800;
}

.forgot-btn,
.activation-btn {
  text-transform: none;
  font-weight: 900;
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
  color: #0d9488;
}
.step.active .dot {
  background: #0d9488;
}
.line {
  flex: 1;
  height: 2px;
  background: rgba(13, 148, 136, 0.14);
  border-radius: 999px;
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
  border: 1px solid rgba(13, 148, 136, 0.16);
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

/* Dialog */
.dialog-card {
  border-radius: 18px !important;
}
.dialog-title {
  font-weight: 900;
  color: #0b2e4a;
}
.dialog-text {
  color: #455a64;
  line-height: 1.45rem;
}

/* Mobile */
@media (max-width: 420px) {
  .login-container {
    padding: 10px;
  }
  .login-content {
    padding: 14px !important;
  }
}
@media (max-width: 360px) {
  .hint {
    display: none;
  }
}
</style>
