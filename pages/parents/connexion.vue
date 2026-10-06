<template>
  <AuthLayout
    role="parents"
    :before-back="backFromReset"
    :title="showReset ? 'Mot de passe oublié' : 'Connexion'"
    :subtitle="showReset
      ? 'Récupérez votre compte en 3 étapes : e-mail, code, nouveau mot de passe.'
      : 'Connectez-vous pour suivre la scolarité de vos enfants.'"
  >
    <!-- CONNEXION -->
    <v-form v-if="!showReset" @submit.prevent="login">
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
        v-model="username"
        label="Nom d'utilisateur ou e-mail"
        prepend-inner-icon="mdi-account-outline"
        autocomplete="username"
        hide-details="auto"
        class="auth-field"
      />

      <v-text-field
        v-model="password"
        :type="showLoginPassword ? 'text' : 'password'"
        label="Mot de passe"
        prepend-inner-icon="mdi-lock-outline"
        :append-inner-icon="showLoginPassword ? 'mdi-eye-off' : 'mdi-eye'"
        autocomplete="current-password"
        hide-details="auto"
        class="auth-field"
        @click:append-inner="showLoginPassword = !showLoginPassword"
      />

      <v-select
        v-model="etablissement"
        :items="etablissements"
        item-title="nom"
        item-value="id"
        label="Établissement"
        prepend-inner-icon="mdi-school-outline"
        :loading="etablissementsLoading"
        :no-data-text="etablissementsLoading ? 'Chargement…' : 'Aucun établissement disponible'"
        hide-details="auto"
        class="auth-field"
      />

      <v-alert
        v-if="etablissementsError"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="auth-alert"
      >
        {{ etablissementsError }}
        <template #append>
          <v-btn size="small" variant="text" @click="fetchEtablissements">Réessayer</v-btn>
        </template>
      </v-alert>

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

        <v-select
          v-model="resetEtablissement"
          :items="etablissements"
          item-title="nom"
          item-value="id"
          label="Établissement"
          prepend-inner-icon="mdi-school-outline"
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

    <template v-if="!showReset" #footer>
      <span class="footer-text">Première connexion ?</span>
      <button type="button" class="auth-link" @click="goToActivation">
        Activer mon compte
      </button>
    </template>

    <!-- Compte pas encore activé -->
    <v-dialog v-model="showActivationDialog" max-width="480">
      <v-card class="dialog-card">
        <v-card-title class="dialog-title">
          <v-icon class="mr-2" color="primary">mdi-account-alert-outline</v-icon>
          Compte non activé
        </v-card-title>

        <v-card-text class="dialog-text">
          Votre compte parent n’est pas encore activé : son mot de passe n’a pas été défini.
          Cliquez sur <b>Activer</b> pour le faire maintenant.
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="showActivationDialog = false">Fermer</v-btn>
          <v-btn color="primary" variant="flat" @click="redirectToActivation">Activer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </AuthLayout>

</template>

<script>
import axios from "axios";

const API_BASE = "";

export default {
  data() {
    return {
      username: "",
      password: "",
      etablissement: null,
      etablissements: [],
      etablissementsLoading: false,
      etablissementsError: "",
      error: "",

      showReset: false,
      email: "",
      resetEtablissement: null,
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

  watch: {
    // Le message d'erreur disparaît dès que l'utilisateur corrige sa saisie.
    username() { this.error = ""; },
    password() { this.error = ""; },
    etablissement() { this.error = ""; },
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
      this.etablissementsLoading = true;
      this.etablissementsError = "";
      try {
        const res = await axios.get(`${API_BASE}/api/etablissements`);
        this.etablissements = res.data || [];
        // Un seul établissement : il est choisi d'office.
        if (this.etablissements.length === 1 && !this.etablissement) {
          this.etablissement = this.etablissements[0].id;
        }
      } catch (err) {
        console.error("Erreur lors du chargement des établissements :", err);
        this.etablissementsError = "Impossible de charger la liste des établissements. Vérifiez votre connexion.";
      } finally {
        this.etablissementsLoading = false;
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

        // Aucun identifiant dans l'adresse : le tableau de bord relit
        // l'établissement dans le token.
        this.$router.push("/parents/dashbord");
      } catch (err) {
        // ✅ CAS : compte non activé
        if (err.response?.status === 403 && err.response?.data?.code === "ACCOUNT_NOT_ACTIVATED") {
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

      // La page d'activation pré-remplit l'e-mail et l'établissement ;
      // l'identifiant du parent n'est pas mis dans l'adresse.
      this.$router.push({
        path: "/parents/Activation",
        query: {
          etablissement: this.activationEtablissementId ?? "",
          email: this.username ?? "",
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
      this.resetEtablissement = null;
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
.footer-text {
  font-size: 14px;
  color: #5d6b82;
}

.dialog-card {
  border-radius: 10px!important;
}

.dialog-title {
  font-weight: 800;
  color: #0b2e4a;
}

.dialog-text {
  color: #455a64;
  line-height: 1.5;
}
</style>
