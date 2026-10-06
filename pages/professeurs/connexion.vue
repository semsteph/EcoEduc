<template>
  <AuthLayout
    role="enseignants"
    :before-back="backFromReset"
    :title="showReset ? 'Mot de passe oublié' : 'Connexion'"
    :subtitle="showReset
      ? 'Récupérez votre compte en 3 étapes : e-mail, code, nouveau mot de passe.'
      : 'Un seul compte pour tous les établissements où vous enseignez.'"
  >
    <!-- CHOIX DE L'ÉTABLISSEMENT (enseignant dans plusieurs écoles) -->
    <div v-if="!showReset && choix.length" class="choix-ecole">
      <p class="choix-texte">Vous enseignez dans {{ choix.length }} établissements. Lequel ouvrir ?</p>
      <v-alert v-if="error" type="error" variant="tonal" density="comfortable" class="auth-alert">{{ error }}</v-alert>
      <v-btn
        v-for="c in choix"
        :key="c.etablissementId"
        block
        variant="outlined"
        color="primary"
        class="choix-btn"
        prepend-icon="mdi-school-outline"
        :loading="loginLoading && choixEnCours === c.etablissementId"
        @click="choisir(c.etablissementId)"
      >{{ c.nom }}</v-btn>
      <p class="choix-aide">Vous pourrez passer d'un établissement à l'autre depuis le menu, sans retaper votre mot de passe.</p>
      <button type="button" class="auth-link" @click="choix = []">Revenir</button>
    </div>

    <!-- CONNEXION -->
    <v-form v-else-if="!showReset" @submit.prevent="login">
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        density="comfortable"
        class="auth-alert"
      >
        {{ error }}
      </v-alert>

      <v-text-field
        v-model="usernameOrEmail"
        label="Identifiant, e-mail ou téléphone"
        prepend-inner-icon="mdi-account-outline"
        autocomplete="username"
        hide-details="auto"
        class="auth-field"
      />

      <v-text-field
        v-model="password"
        :type="showPassword ? 'text' : 'password'"
        label="Mot de passe"
        prepend-inner-icon="mdi-lock-outline"
        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
        autocomplete="current-password"
        hide-details="auto"
        class="auth-field"
        @click:append-inner="togglePasswordVisibility"
      />

      <div class="d-flex justify-end mb-3">
        <button type="button" class="auth-link" @click="openReset">
          Mot de passe oublié ?
        </button>
      </div>

      <v-btn
        type="submit"
        color="primary"
        class="auth-submit"
        :loading="loginLoading"
        :disabled="loginLoading || !canLogin"
      >
        Se connecter
      </v-btn>
    </v-form>

    <!-- MOT DE PASSE OUBLIÉ -->
    <v-form v-else @submit.prevent="handleReset">
      <div class="auth-steps" role="list" aria-label="Étapes">
        <span class="auth-step" :class="{ 'is-active': !resetCodeSent }" role="listitem">E-mail</span>
        <span class="auth-step-line" aria-hidden="true"></span>
        <span class="auth-step" :class="{ 'is-active': resetCodeSent && !validCode }" role="listitem">Code</span>
        <span class="auth-step-line" aria-hidden="true"></span>
        <span class="auth-step" :class="{ 'is-active': validCode }" role="listitem">Nouveau</span>
      </div>

      <v-alert v-if="resetError" type="error" variant="tonal" density="comfortable" class="auth-alert">
        {{ resetError }}
      </v-alert>
      <v-alert v-if="resetSuccess" type="success" variant="tonal" density="comfortable" class="auth-alert">
        {{ resetSuccess }}
      </v-alert>

      <template v-if="!resetCodeSent">
        <v-text-field
          v-model="email"
          label="E-mail"
          prepend-inner-icon="mdi-email-outline"
          autocomplete="email"
          hide-details="auto"
          class="auth-field"
        />


      </template>

      <v-text-field
        v-if="resetCodeSent && !validCode"
        v-model="code"
        label="Code de vérification"
        prepend-inner-icon="mdi-shield-key-outline"
        inputmode="numeric"
        hide-details="auto"
        class="auth-field"
      />

      <template v-if="validCode">
        <v-text-field
          v-model="newPassword"
          :type="showNewPassword ? 'text' : 'password'"
          label="Nouveau mot de passe"
          hint="6 caractères minimum"
          prepend-inner-icon="mdi-lock-outline"
          :append-inner-icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
          autocomplete="new-password"
          hide-details="auto"
          class="auth-field"
          @click:append-inner="showNewPassword = !showNewPassword"
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
      </template>

      <v-btn
        type="submit"
        color="primary"
        class="auth-submit"
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

    </v-form>
  </AuthLayout>
</template>

<script>
import axios from "axios";
import "/assets/css/styles.css";

const API_BASE = "";

export default {
  data() {
    return {
      // Connexion
      usernameOrEmail: "",
      password: "",
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
      resetToken: null,
      resetError: "",
      resetSuccess: "",
      showNewPassword: false,
      showConfirmPassword: false,
      resetLoading: false,

      // Plusieurs établissements : choix après le mot de passe.
      choix: [],
      jetonChoix: "",
      choixEnCours: null,

    };
  },

  computed: {
    canLogin() {
      return (
        String(this.usernameOrEmail || "").trim().length > 0 &&
        String(this.password || "").length > 0
      );
    },
    canResetSubmit() {
      if (!this.resetCodeSent) {
        return String(this.email || "").trim().length > 0;
      }
      if (!this.validCode) {
        return String(this.code || "").trim().length > 0;
      }
      return String(this.newPassword || "").length >= 6 && this.newPassword === this.confirmPassword;
    },
  },

  watch: {
    // Le message d'erreur disparaît dès que l'utilisateur corrige sa saisie.
    usernameOrEmail() { this.error = ""; },
    password() { this.error = ""; },
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
      this.resetError = "";
      this.resetSuccess = "";
      this.showReset = true;
    },

    async login() {
      this.error = "";
      this.loginLoading = true;

      try {
        const { data } = await axios.post(`${API_BASE}/api/loginEns`, {
          username: this.usernameOrEmail,
          password: this.password,
        });
        this.retenirMotDePasseProvisoire(data.motDePasseProvisoire);
        if (data.choix) {
          this.choix = data.choix;
          this.jetonChoix = data.jetonChoix;
          return;
        }
        this.entrer(data.token);
      } catch (error) {
        this.error = error.response?.data?.message || "Erreur de connexion au serveur.";
      } finally {
        this.loginLoading = false;
      }
    },

    async choisir(etablissementId) {
      this.error = "";
      this.loginLoading = true;
      this.choixEnCours = etablissementId;
      try {
        const { data } = await axios.post(`${API_BASE}/api/loginEns/choisir`, { jetonChoix: this.jetonChoix, etablissementId });
        this.entrer(data.token);
      } catch (error) {
        this.error = error.response?.data?.message || "Erreur de connexion au serveur.";
        if (error.response?.status === 401) this.choix = [];
      } finally {
        this.loginLoading = false;
        this.choixEnCours = null;
      }
    },

    // Mot de passe donné par l'école : à remplacer dès l'arrivée.
    retenirMotDePasseProvisoire(provisoire) {
      try {
        if (provisoire) sessionStorage.setItem("ens-mdp-provisoire", "1");
        else sessionStorage.removeItem("ens-mdp-provisoire");
      } catch (e) { /* stockage indisponible */ }
    },

    entrer(token) {
      localStorage.setItem("token", token);
      const { id, etablissement, enseignant_nom, enseignant_prenom, etablissement_nom } = decodeJwtPayload(token);
      this.$router.push({
        path: "/professeurs/dashbord",
        query: {
          id,
          etablissement,
          enseignantNom: enseignant_nom,
          enseignantPrenom: enseignant_prenom,
          etablissementNom: etablissement_nom,
        },
      });
    },

    // Flèche retour pendant « Mot de passe oublié » : retour à la connexion.
    backFromReset() {
      if (!this.showReset) return false;
      if (!this.resetLoading) this.cancelReset();
      return true;
    },

    cancelReset() {
      this.showReset = false;
      this.email = "";
      this.code = "";
      this.newPassword = "";
      this.confirmPassword = "";
      this.resetCodeSent = false;
      this.validCode = false;
      this.resetToken = null;
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
          await axios.post(`${API_BASE}/api/send-reset-code`, { email: this.email });
          this.resetCodeSent = true;
          this.resetSuccess = "Code envoyé. Vérifiez votre boîte mail.";
        } else if (!this.validCode) {
          const res = await axios.post(`${API_BASE}/api/verify-reset-code`, { email: this.email, code: this.code });
          this.resetToken = res.data.resetToken;
          this.validCode = true;
          this.resetSuccess = "Code validé. Choisissez un nouveau mot de passe.";
        } else {
          if (this.newPassword !== this.confirmPassword) {
            this.resetError = "Les mots de passe ne correspondent pas.";
            return;
          }

          await axios.post(`${API_BASE}/api/update-password`, {
            resetToken: this.resetToken,
            newPassword: this.newPassword,
          });

          this.resetSuccess =
            "Mot de passe modifié avec succès. Vous pouvez maintenant vous connecter.";
          // Retour au formulaire de connexion après lecture du message
          // (auparavant effacé immédiatement : l'utilisateur ne le voyait pas).
          setTimeout(() => this.cancelReset(), 1800);
        }
      } catch (error) {
        if (error.response?.status === 404) {
          this.resetError = "Aucun compte enseignant n’est associé à cet e-mail.";
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
.choix-ecole { display: flex; flex-direction: column; gap: 8px; }
.choix-texte { margin: 0 0 4px; font-weight: 600; }
.choix-btn { justify-content: flex-start; text-transform: none; }
.choix-aide { font-size: 0.8rem; color: #5f6b7a; margin: 4px 0; }
</style>
