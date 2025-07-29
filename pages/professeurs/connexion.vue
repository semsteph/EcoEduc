<template>
  <v-container fluid fill-height class="login-container pa-2">
    <!-- Bouton retour -->
    <v-btn
      class="back-button"
      icon
      color="white"
      @click="$router.push('/Accueil/Accueil')"
    >
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>

    <v-row justify="center" align="center" class="ma-0">
      <v-col cols="12" sm="10" md="6" lg="4" class="pa-0">
        <!-- Message de bienvenue -->
        <div class="text-center mb-4 px-4">
          <v-card-title class="welcome-title text-xl sm:text-2xl font-bold text-blue-700">
            Bienvenue !
          </v-card-title>
          <v-card-subtitle
            class="welcome-subtitle text-base sm:text-lg text-gray-600 whitespace-normal break-words leading-snug"
          >
            Connectez-vous pour accéder à votre espace personnel.
          </v-card-subtitle>
        </div>

        <!-- Carte de connexion -->
        <v-card class="pa-4 login-card" elevation="12">
          <v-form v-if="!showReset" @submit.prevent="login">
            <v-text-field
              v-model="usernameOrEmail"
              label="Nom d'utilisateur ou Email"
              required
              outlined
              dense
              color="primary"
              prepend-inner-icon="mdi-account"
            ></v-text-field>

            <v-text-field
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              label="Mot de passe"
              required
              outlined
              dense
              color="primary"
              prepend-inner-icon="mdi-lock"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="togglePasswordVisibility"
            ></v-text-field>

            <v-select
              v-model="etablissement"
              :items="etablissements"
              item-title="nom"
              item-value="id"
              label="Établissement"
              required
              outlined
              dense
              color="primary"
              prepend-inner-icon="mdi-school"
            ></v-select>

            <v-btn
              type="submit"
              color="primary"
              block
              class="mt-4 font-weight-bold login-button"
              elevation="3"
            >
              Se connecter
            </v-btn>

            <v-alert v-if="error" type="error" class="mt-4" dense outlined>
              {{ error }}
            </v-alert>
          </v-form>

          <!-- Formulaire de réinitialisation -->
          <v-form v-else @submit.prevent="handleReset">
            <div v-if="!resetCodeSent">
              <v-text-field
                v-model="email"
                label="Entrez votre mail"
                required
                outlined
                dense
                color="primary"
              ></v-text-field>

              <v-select
                v-model="resetEtablissement"
                :items="etablissements"
                item-title="nom"
                item-value="id"
                label="Établissement"
                required
                outlined
                dense
                color="primary"
                prepend-inner-icon="mdi-school"
              ></v-select>
            </div>

            <v-text-field
              v-if="resetCodeSent && !validCode"
              v-model="code"
              label="Code de vérification"
              required
              outlined
              dense
              color="primary"
            ></v-text-field>

            <div v-if="validCode">
              <v-text-field
                v-model="newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                label="Nouveau mot de passe"
                required
                outlined
                dense
                color="primary"
                :append-inner-icon="showNewPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="toggleNewPasswordVisibility"
              ></v-text-field>

              <v-text-field
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                label="Confirmez le mot de passe"
                required
                outlined
                dense
                color="primary"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="toggleConfirmPasswordVisibility"
              ></v-text-field>
            </div>

            <v-btn
              type="submit"
              color="primary"
              block
              class="mt-4 font-weight-bold"
              elevation="3"
            >
              {{
                resetCodeSent
                  ? validCode
                    ? 'Modifier le mot de passe'
                    : 'Valider le code'
                  : 'Envoyer le code'
              }}
            </v-btn>

            <v-btn text color="primary" block class="mt-2" @click="cancelReset">
              Annuler
            </v-btn>

            <v-alert
              v-if="resetError"
              type="error"
              class="mt-4"
              dense
              outlined
            >
              {{ resetError }}
            </v-alert>

            <v-alert
              v-if="resetSuccess"
              type="success"
              class="mt-4"
              dense
              outlined
            >
              {{ resetSuccess }}
            </v-alert>
          </v-form>
        </v-card>

        <!-- Lien mot de passe oublié -->
        <div class="text-center mt-2">
          <span class="text-primary text-sm underline cursor-pointer" @click="showReset = true">
            Mot de passe oublié ?
          </span>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>


<script>
import axios from 'axios';

import '/assets/css/styles.css';

export default {
  data() {
    return {
      // Connexion
      usernameOrEmail: '',
      password: '',
      etablissement: '',
      error: '',
      showPassword: false,

      // Réinitialisation
      showReset: false,
      email: '',
      code: '',
      newPassword: '',
      confirmPassword: '',
      resetCodeSent: false,
      validCode: false,
      enseignantId: null,
      resetEtablissement: '',
      resetError: '',
      resetSuccess: '',
      showNewPassword: false,
      showConfirmPassword: false,

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

    async fetchEtablissements() {
      try {
        const res = await axios.get('http://localhost:8080/api/etablissements');
        this.etablissements = res.data;
      } catch (error) {
        console.error('Erreur lors du chargement des établissements.');
      }
    },

    async login() {
  try {
    const response = await axios.post('http://localhost:8080/api/loginEns', {
      username: this.usernameOrEmail, // ✅ CORRECTION : 'username' au lieu de 'identifier'
      password: this.password,
      etablissement: this.etablissement,
    });

    const token = response.data.token;
    localStorage.setItem('token', token);

    const payload = JSON.parse(atob(token.split('.')[1]));
    const {
      id: enseignantId,
      etablissement: etablissementId,
      enseignant_nom,
      enseignant_prenom,
      etablissement_nom,
    } = payload;

    this.$router.push({
      path: '/professeurs/dashbord',
      query: {
        id: enseignantId,
        etablissement: etablissementId,
        enseignantNom: enseignant_nom,
        enseignantPrenom: enseignant_prenom,
        etablissementNom: etablissement_nom,
      },
    });
  } catch (error) {
    this.error = error.response?.data?.message || 'Erreur de connexion au serveur.';
  }
},

    cancelReset() {
      this.showReset = false;
      this.email = '';
      this.code = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.resetCodeSent = false;
      this.validCode = false;
      this.resetError = '';
      this.resetSuccess = '';
      this.resetEtablissement = '';
    },

    async handleReset() {
      try {
        if (!this.resetCodeSent) {
          await axios.post('http://localhost:8080/api/send-reset-code', {
            email: this.email,
            etablissement: this.resetEtablissement,
          });
          this.resetCodeSent = true;
          this.resetError = '';
        } else if (!this.validCode) {
          const res = await axios.post('http://localhost:8080/api/verify-reset-code', {
            email: this.email,
            code: this.code,
            etablissement: this.resetEtablissement,
          });
          this.enseignantId = res.data.enseignantId;
          this.validCode = true;
          this.resetError = '';
        } else {
          if (this.newPassword !== this.confirmPassword) {
            this.resetError = 'Les mots de passe ne correspondent pas.';
            return;
          }

          await axios.post('http://localhost:8080/api/update-password', {
            enseignantId: this.enseignantId,
            newPassword: this.newPassword,
          });

          this.resetSuccess = 'Mot de passe modifié avec succès. Vous pouvez maintenant vous connecter.';
          this.cancelReset();
        }
      } catch (error) {
        if (error.response?.status === 404) {
          this.resetError = 'Aucun compte n’est associé à cet e-mail et établissement.';
        } else {
          this.resetError = error.response?.data?.message || 'Erreur lors du processus.';
        }
      }
    },
  },
};
</script>