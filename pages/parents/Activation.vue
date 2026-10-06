<template>
  <AuthLayout
    role="parents"
    :before-back="backStep"
    title="Activer mon compte"
    subtitle="Première connexion : vérifiez votre e-mail puis choisissez votre mot de passe."
  >
    <div class="auth-steps" role="list" aria-label="Étapes">
      <span class="auth-step" :class="{ 'is-active': step === 1 }" role="listitem">E-mail</span>
      <span class="auth-step-line" aria-hidden="true"></span>
      <span class="auth-step" :class="{ 'is-active': step === 2 }" role="listitem">Code</span>
      <span class="auth-step-line" aria-hidden="true"></span>
      <span class="auth-step" :class="{ 'is-active': step === 3 }" role="listitem">Mot de passe</span>
    </div>

    <v-alert v-if="errorMessage" type="error" variant="tonal" density="comfortable" class="auth-alert">
      {{ errorMessage }}
    </v-alert>
    <v-alert v-if="successMessage" type="success" variant="tonal" density="comfortable" class="auth-alert">
      {{ successMessage }}
    </v-alert>

    <!-- Étape 1 : e-mail et établissement -->
    <v-form v-if="step === 1" @submit.prevent="canSendCode && sendCode()">
      <v-text-field
        v-model="email"
        label="Adresse e-mail"
        prepend-inner-icon="mdi-email-outline"
        autocomplete="email"
        hide-details="auto"
        class="auth-field"
      />

      <v-select
        v-model="etablissementId"
        :items="etablissements"
        item-title="nom"
        item-value="id"
        label="Établissement"
        prepend-inner-icon="mdi-school-outline"
        hide-details="auto"
        class="auth-field"
      />

      <v-btn type="submit" color="primary" class="auth-submit" :loading="loading" :disabled="loading || !canSendCode">
        Envoyer le code
      </v-btn>

      <p class="auth-hint">
        <v-icon size="16">mdi-information-outline</v-icon>
        Le code expire dans 10 minutes.
      </p>
    </v-form>

    <!-- Étape 2 : code reçu par e-mail -->
    <v-form v-else-if="step === 2" @submit.prevent="canVerifyCode && verifyCode()">
      <v-text-field
        v-model="code"
        label="Code de vérification"
        prepend-inner-icon="mdi-shield-key-outline"
        inputmode="numeric"
        autocomplete="one-time-code"
        hide-details="auto"
        class="auth-field"
      />

      <v-btn type="submit" color="primary" class="auth-submit" :loading="loading" :disabled="loading || !canVerifyCode">
        Vérifier le code
      </v-btn>


      <div class="text-center mt-3">
        <button type="button" class="auth-link" :disabled="loading || !canSendCode" @click="resendCode">
          Renvoyer un code
        </button>
      </div>
    </v-form>

    <!-- Étape 3 : mot de passe -->
    <v-form v-else @submit.prevent="canSetPassword && setPassword()">
      <v-text-field
        v-model="password"
        :type="showPassword ? 'text' : 'password'"
        label="Nouveau mot de passe"
        prepend-inner-icon="mdi-lock-outline"
        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
        autocomplete="new-password"
        hide-details="auto"
        class="auth-field"
        @click:append-inner="showPassword = !showPassword"
      />

      <v-text-field
        v-model="confirmPassword"
        :type="showConfirmPassword ? 'text' : 'password'"
        label="Confirmer le mot de passe"
        prepend-inner-icon="mdi-lock-check-outline"
        :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
        autocomplete="new-password"
        hide-details="auto"
        class="auth-field"
        @click:append-inner="showConfirmPassword = !showConfirmPassword"
      />

      <v-btn type="submit" color="primary" class="auth-submit" :loading="loading" :disabled="loading || !canSetPassword">
        Activer mon compte
      </v-btn>


      <p class="auth-hint">
        <v-icon size="16">mdi-shield-check-outline</v-icon>
        Choisissez au moins 6 caractères.
      </p>
    </v-form>

    <template #footer>
      <span class="footer-text">Compte déjà activé ?</span>
      <NuxtLink to="/parents/connexion" class="auth-link">Se connecter</NuxtLink>
    </template>
  </AuthLayout>
</template>

<script>
import axios from "axios";
const API_BASE = "";

export default {
  data() {
    return {
      step: 1,
      email: "",
      etablissementId: null,
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
    // Flèche retour : étape précédente (code → e-mail, mot de passe → code).
    backStep() {
      if (this.step <= 1 || this.loading) return this.step > 1;
      this.step -= 1;
      return true;
    },

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
.auth-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 14px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #5d6b82;
}

.footer-text {
  font-size: 14px;
  color: #5d6b82;
}
</style>
