<template>
  <v-container fluid class="login-container">
    <v-row justify="center" align="center" class="fill-height pa-1">
      <v-col cols="12" xs="12" sm="10" md="6" lg="4" xl="3">
        <div class="text-center mb-2">
                <div class="title">Bienvenue</div>
                <div class="subtitle">Connectez-vous à votre compte EchoEducation</div>
              </div>
        <v-card class="login-card d-flex flex-column">
          <v-card-text class="login-content pa-1">
            <!-- Connexion -->
            <template v-if="!showReset">
              

              <v-form @submit.prevent="login">
                <v-text-field
                  v-model="username"
                  label="Nom d'utilisateur ou email"
                  outlined
                  dense
                  color="primary"
                  required
                  class="mb-2"
                />
                <v-text-field
                  v-model="password"
                  :type="showLoginPassword ? 'text' : 'password'"
                  label="Mot de passe"
                  outlined
                  dense
                  color="primary"
                  required
                  class="mb-2"
                  :append-inner-icon="showLoginPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showLoginPassword = !showLoginPassword"
                />
                <v-select
                  v-if="etablissements.length > 0"
                  v-model="etablissement"
                  :items="etablissements"
                  item-title="nom"
                  item-value="id"
                  label="Établissement"
                  outlined
                  dense
                  required
                  class="mb-2"
                />
                <v-btn type="submit" color="primary" block rounded class="mt-1 text-button" height="36">
                  Se connecter
                </v-btn>
              </v-form>

              

              <v-alert v-if="error" type="error" dense text class="mt-2">{{ error }}</v-alert>
            </template>
          
            <!-- Réinitialisation -->
            <template v-else>
              <div class="text-center mb-2">
                <div class="title">Réinitialisation</div>
              </div>

              <v-form>
                <!-- Étape 1 : Email + établissement -->
                <v-text-field
                  v-if="!resetCodeSent"
                  v-model="email"
                  label="Email"
                  outlined
                  dense
                  required
                  class="mb-2"
                />
                <v-select
                  v-if="!resetCodeSent && etablissements.length > 0"
                  v-model="resetEtablissement"
                  :items="etablissements"
                  item-title="nom"
                  item-value="id"
                  label="Établissement"
                  outlined
                  dense
                  required
                  class="mb-2"
                />

                <!-- Étape 2 : code -->
                <v-text-field
                  v-if="resetCodeSent && !validCode"
                  v-model="code"
                  label="Code"
                  outlined
                  dense
                  required
                  class="mb-2"
                />

                <!-- Étape 3 : nouveau mot de passe -->
                <div v-if="validCode">
                  <v-text-field
                    v-model="newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    label="Nouveau mot de passe"
                    outlined
                    dense
                    required
                    class="mb-2"
                    :append-inner-icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    @click:append-inner="showNewPassword = !showNewPassword"
                  />
                  <v-text-field
                    v-model="confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    label="Confirmer"
                    outlined
                    dense
                    required
                    class="mb-2"
                    :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    @click:append-inner="showConfirmPassword = !showConfirmPassword"
                  />
                </div>
              </v-form>

              <v-alert v-if="resetError" type="error" dense class="mt-1">{{ resetError }}</v-alert>
              <v-alert v-if="resetSuccess" type="success" dense class="mt-1">{{ resetSuccess }}</v-alert>

              <v-card-actions class="justify-space-between pa-0 mt-2">
                <v-btn text small @click="cancelReset">Retour</v-btn>
                <v-btn :loading="resetLoading" text small color="primary" @click="handleReset">Continuer</v-btn>
              </v-card-actions>
            </template>
            
          </v-card-text>
        </v-card>
        <div class="text-center mt-1">
                <span class="text-primary small-link" @click="showReset = true">
                  Mot de passe oublié ?
                </span>
              </div>

              <div class="text-center mt-1">
                <span class="text-primary small-link" @click="goToActivation">
                  Activer mon compte
                </span>
              </div>
      </v-col>
    </v-row>
  </v-container>
</template>



<script>
import axios from "axios";

export default {
  data() {
    return {
      username: "",
      password: "",
      etablissement: "",
      etablissements: [],
      error: "",
      showReset: false,
      email: '',
      resetEtablissement: '',
      code: '',
      newPassword: '',
      confirmPassword: '',
      resetCodeSent: false,
      validCode: false,
      resetError: '',
      resetSuccess: '',
      resetLoading: false,
      parentId: null,

      // Pour afficher ou masquer les mots de passe
      showLoginPassword: false,
      showNewPassword: false,
      showConfirmPassword: false,
    };
  },
  mounted() {
    this.fetchEtablissements();
  },
  methods: {
    async fetchEtablissements() {
      try {
        const res = await axios.get("http://localhost:8080/api/etablissements");
        this.etablissements = res.data;
      } catch (err) {
        console.error("Erreur lors du chargement des établissements :", err);
      }
    },
    async login() {
      try {
        const response = await axios.post("http://localhost:8080/api/parent/login", {
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
      } catch (error) {
        this.error = error.response ? error.response.data.message : "Erreur de connexion au serveur.";
      }
    },
    cancelReset() {
      this.showReset = false;
      this.email = '';
      this.resetEtablissement = '';
      this.code = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.resetCodeSent = false;
      this.validCode = false;
      this.resetError = '';
      this.resetSuccess = '';
    },
 async handleReset() {
  this.resetLoading = true;
  try {
    // ÉTAPE 1 : Envoi du code
    if (!this.resetCodeSent) {
      const res = await axios.post('http://localhost:8080/api/send', {
        email: this.email,
        etablissement: this.resetEtablissement
      });

      if (res.data?.success) {
        this.resetCodeSent = true;
        this.resetError = '';
      } else {
        this.resetError = res.data.message || 'Échec de l’envoi du code.';
        return;
      }

    // ÉTAPE 2 : Vérification du code
    } else if (!this.validCode) {
      const res = await axios.post('http://localhost:8080/api/parent-verify-reset-code', {
        email: this.email,
        code: this.code,
        etablissement: this.resetEtablissement // <--- ✅ Ajout ici
      });
 console.log("✅ Résultat de verify-reset-code:", res.data);
      if (res.data?.success && res.data?.parentId) {
        this.parentId = res.data.parentId;
        this.validCode = true;
        console.log("✅ validCode activé :", this.validCode);
        this.resetError = '';
      } else {
        this.resetError = res.data.message || 'Code invalide.';
        return;
      }

    // ÉTAPE 3 : Mise à jour du mot de passe
    } else {
      if (this.newPassword !== this.confirmPassword) {
        this.resetError = 'Les mots de passe ne correspondent pas.';
        return;
      }
      console.log("🔐 Données envoyées :", {
    parentId: this.parentId,
    newPassword: this.newPassword,
    etablissement: this.resetEtablissement
  });
      const response = await axios.post('http://localhost:8080/api/parent-update-password', {
        parentId: this.parentId,
        newPassword: this.newPassword,
        etablissement: this.resetEtablissement
      });
          console.log("📩 Réponse backend :", response.data);
      if (response.data?.success) {
        this.resetSuccess = 'Mot de passe modifié avec succès.';
        this.resetError = '';
        setTimeout(() => this.cancelReset(), 2000);
      } else {
        this.resetError = response.data.message || 'La modification du mot de passe a échoué.';
      }
    }
  } catch (error) {
    this.resetError = error.response?.data?.message || 'Une erreur est survenue.';
  } finally {
    this.resetLoading = false;
  }
},



    goToActivation() {
      this.$router.push('/parents/Activation');
    }
  }
};
</script>



<style scoped>
.login-card {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 16px;
  padding: 12px;
  max-width: 90%;
  max-height: 70vh;
  margin-left: 10px;
  margin: 25px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
}

.title {
  font-size: clamp(16px, 2.5vw, 20px);
  font-weight: 600;
}

.subtitle {
  font-size: clamp(12px, 2vw, 14px);
  color: #666;
}

.v-text-field,
.v-select {
  font-size: 13px !important;
}

.v-input {
  margin-bottom: 6px !important;
}

.v-btn {
  font-size: 13px;
  min-height: 32px !important;
  height: 32px !important;
}

.v-alert {
  font-size: 12px;
  padding: 4px 8px;
}

.small-link {
  font-size: 12px;
  cursor: pointer;
}

@media (max-width: 500px) {
  .login-card {
    padding: 8px;
  }

  .title {
    font-size: 16px;
  }

  .subtitle {
    font-size: 12px;
  }

  .v-btn {
    font-size: 12px;
  }
}


</style>
