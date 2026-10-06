<template>
  <AuthLayout
    role="administration"
    title="Connexion"
    subtitle="Fondateur, directeur ou collaborateur : renseignez vos identifiants."
  >
    <v-form @submit.prevent="submitForm">
      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        density="comfortable"
        class="auth-alert"
        role="alert"
      >
        {{ errorMessage }}
      </v-alert>

      <v-text-field
        v-model="nom_utilisateur"
        label="Nom d'utilisateur ou e-mail"
        prepend-inner-icon="mdi-account-outline"
        autocomplete="username"
        hide-details="auto"
        class="auth-field"
      />

      <v-text-field
        v-model="mot_de_passe"
        :type="showPassword ? 'text' : 'password'"
        label="Mot de passe"
        prepend-inner-icon="mdi-lock-outline"
        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
        autocomplete="current-password"
        hide-details="auto"
        class="auth-field"
        @click:append-inner="showPassword = !showPassword"
      />

      <v-btn
        type="submit"
        color="primary"
        class="auth-submit"
        :loading="loading"
        :disabled="loading || !canLogin"
      >
        Se connecter
      </v-btn>
    </v-form>

    <template #footer>
      <span class="footer-text">Votre établissement n'a pas de compte ?</span>
      <NuxtLink to="/administration/inscription" class="auth-link">Inscrire l'établissement</NuxtLink>
    </template>

    <!-- Connexion réussie -->
    <v-dialog v-model="dialog" max-width="420" persistent>
      <v-card class="success-card">
        <v-icon size="44" color="success" class="mb-2">mdi-check-circle-outline</v-icon>
        <v-card-title class="success-card__title">Connexion réussie</v-card-title>
        <v-card-text class="success-card__text">
          Vous allez être redirigé vers votre tableau de bord.
        </v-card-text>
      </v-card>
    </v-dialog>
  </AuthLayout>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ConnexionEtablissement',
  data() {
    return {
      nom_utilisateur: '',
      mot_de_passe: '',
      dialog: false,
      loading: false,
      showPassword: false,
      errorMessage: '',
    };
  },
  computed: {
    canLogin() {
      return String(this.nom_utilisateur || '').trim().length > 0 && String(this.mot_de_passe || '').length > 0;
    },
  },
  watch: {
    // Le message d'erreur disparaît dès que l'utilisateur corrige sa saisie.
    nom_utilisateur() { this.errorMessage = ''; },
    mot_de_passe() { this.errorMessage = ''; },
  },
  methods: {
    clearSessionStorage() {
      [
        'token',
        'etablissement_nom',
        'etablissement_id',
        'user_type',
        'administration_id',
        'administration_nom',
        'poste',
        'modules_autorises',
      ].forEach((key) => localStorage.removeItem(key));
    },

    goToDashboard(etablissementId, etablissementNom) {
      this.dialog = true;
      setTimeout(() => {
        this.$router.push({
          path: '/administration/dashbord',
          query: {
            etablissement_id: etablissementId,
            etablissement_nom: etablissementNom,
          },
        });
      }, 700);
    },

    async submitForm() {
      this.errorMessage = '';
      this.loading = true;

      const identifiant = this.nom_utilisateur;
      const motDePasse = this.mot_de_passe;

      try {
        // 1) Tentative en tant que fondateur/directeur (compte établissement)
        const response = await axios.post('/api/loginEtablissement', {
          nom_utilisateur: identifiant,
          mot_de_passe: motDePasse,
        });
        const { token, etablissement } = response.data;

        this.clearSessionStorage();
        localStorage.setItem('token', token);
        localStorage.setItem('etablissement_nom', etablissement.nom);
        localStorage.setItem('etablissement_id', etablissement.id);
        localStorage.setItem('user_type', 'etablissement');

        this.goToDashboard(etablissement.id, etablissement.nom);
      } catch (etablissementError) {
        // 2) Repli : tentative en tant que collaborateur (comptable, secrétaire, etc.)
        try {
          const response = await axios.post('/api/loginAdministration', {
            email: identifiant,
            mot_de_passe: motDePasse,
          });
          const { token, administration } = response.data;

          this.clearSessionStorage();
          localStorage.setItem('token', token);
          localStorage.setItem('etablissement_id', administration.etablissement_id);
          localStorage.setItem('etablissement_nom', administration.etablissement_nom || '');
          localStorage.setItem('user_type', 'administration');
          localStorage.setItem('administration_id', administration.id);
          localStorage.setItem('administration_nom', `${administration.prenom} ${administration.nom}`);
          localStorage.setItem('poste', administration.poste);
          localStorage.setItem('modules_autorises', JSON.stringify(administration.modules_autorises || []));

          this.goToDashboard(administration.etablissement_id, administration.etablissement_nom || '');
        } catch (administrationError) {
          // Les deux essais (compte établissement puis collaborateur) ont échoué :
          // un seul message, qui ne dit pas lequel des deux comptes existe.
          const status = administrationError.response?.status;
          if ([400, 401, 403, 404].includes(status)) {
            this.errorMessage = "Nom d'utilisateur, e-mail ou mot de passe incorrect.";
          } else {
            this.errorMessage = 'Service momentanément indisponible. Veuillez réessayer.';
          }
          console.error(
            'Erreur lors de la connexion :',
            administrationError.response ? administrationError.response.data : administrationError.message
          );
        }
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.footer-text {
  font-size: 14px;
  color: #5d6b82;
}

.success-card {
  padding: 28px 20px 20px;
  border-radius: 10px!important;
  text-align: center;
}

.success-card__title {
  font-weight: 800;
  color: #0b2e4a;
}

.success-card__text {
  color: #455a64;
}
</style>
