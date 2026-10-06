<template>
  <div class="background">
    <div class="overlay"></div>
    <form class="form-container" novalidate @submit.prevent="submitForm">
      <PageNav :crumbs="crumbs" position="top" />

      <h2 class="form-title">Inscrivez votre établissement</h2>
      <p class="form-subtitle">Tous les champs sont obligatoires.</p>

      <div
        v-if="errorMessage"
        class="alert alert--error"
        role="alert"
        aria-live="assertive"
      >
        {{ errorMessage }}
      </div>

      <div
        v-if="successMessage"
        class="alert alert--success"
        role="status"
        aria-live="polite"
      >
        {{ successMessage }}
      </div>

      <div class="form-grid">
        <div class="form-item">
          <label for="insc-nom" class="field-label">Nom de l'établissement</label>
          <input id="insc-nom" v-model.trim="nom" type="text" required autocomplete="organization" class="input-field" />
        </div>

        <div class="form-item">
          <label for="insc-statut" class="field-label">Statut</label>
          <select id="insc-statut" v-model="selectedStatut" required class="input-field">
            <option disabled value="">Choisissez un statut</option>
            <option value="public">Public</option>
            <option value="prive">Privé</option>
          </select>
        </div>

        <div class="form-item">
          <label for="insc-departement" class="field-label">Département</label>
          <select id="insc-departement" v-model="selectedDepartementId" required class="input-field">
            <option disabled value="">{{ departementsLoading ? 'Chargement…' : 'Choisissez un département' }}</option>
            <option v-for="dep in departements" :key="dep.departement_id" :value="dep.departement_id">
              {{ dep.departement_nom }}
            </option>
          </select>
        </div>

        <div class="form-item">
          <label for="insc-commune" class="field-label">Commune</label>
          <select
            id="insc-commune"
            v-model="selectedCommuneId"
            required
            class="input-field"
            :disabled="!selectedDepartementId"
          >
            <option disabled value="">
              {{ selectedDepartementId ? 'Choisissez une commune' : "Choisissez d'abord un département" }}
            </option>
            <option v-for="com in communesFiltered" :key="com.commune_id" :value="com.commune_id">
              {{ com.nom }}
            </option>
          </select>
        </div>

        <div class="form-item">
          <label for="insc-telephone" class="field-label">Numéro de téléphone</label>
          <input id="insc-telephone" v-model.trim="telephone" type="tel" required autocomplete="tel" inputmode="tel" class="input-field" />
        </div>

        <div class="form-item">
          <label for="insc-mail" class="field-label">Adresse e-mail</label>
          <input id="insc-mail" v-model.trim="mail" type="email" required autocomplete="email" class="input-field" />
        </div>

        <div class="form-item form-item--full">
          <label for="insc-utilisateur" class="field-label">Nom d'utilisateur</label>
          <input id="insc-utilisateur" v-model.trim="nom_utilisateur" type="text" required autocomplete="username" class="input-field" />
        </div>

        <div class="form-item">
          <label for="insc-mdp" class="field-label">Mot de passe</label>
          <input id="insc-mdp" v-model="mot_de_passe" type="password" required minlength="6" autocomplete="new-password" class="input-field" />
          <span class="field-hint">6 caractères minimum.</span>
        </div>

        <div class="form-item">
          <label for="insc-mdp2" class="field-label">Confirmez le mot de passe</label>
          <input
            id="insc-mdp2"
            v-model="confirm_mot_de_passe"
            type="password"
            required
            autocomplete="new-password"
            class="input-field"
            :class="{ 'input-field--error': passwordMismatch }"
          />
          <span v-if="passwordMismatch" class="field-error">Les mots de passe ne correspondent pas.</span>
        </div>
      </div>

      <button type="submit" class="submit-button" :disabled="loading">
        {{ loading ? 'Inscription en cours…' : "S'inscrire" }}
      </button>

      <p class="login-link">
        Vous avez déjà un compte ?
        <NuxtLink to="/administration/connexion" class="link">Se connecter</NuxtLink>
      </p>

      <PageNav :crumbs="crumbs" position="bottom" />
    </form>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      // Fil d'Ariane : Accueil › Espace administration › Inscription.
      crumbs: [
        { label: 'Accueil', to: '/Accueil/Accueil' },
        { label: 'Espace administration', to: '/administration/Accueil' },
        { label: 'Inscription', to: '/administration/inscription' },
      ],
      nom: '',
      selectedDepartementId: '',
      selectedCommuneId: '',
      selectedStatut: '',
      telephone: '',
      mail: '',
      nom_utilisateur: '',
      mot_de_passe: '',
      confirm_mot_de_passe: '',
      departements: [],
      departementsLoading: false,
      loading: false,
      errorMessage: '',
      successMessage: '',
    };
  },
  computed: {
    communesFiltered() {
      const dep = this.departements.find(
        (d) => d.departement_id === this.selectedDepartementId
      );
      return dep ? dep.communes : [];
    },
    passwordMismatch() {
      return this.confirm_mot_de_passe.length > 0 && this.mot_de_passe !== this.confirm_mot_de_passe;
    },
  },
  watch: {
    // Changer de département efface la commune d'un autre département.
    selectedDepartementId() {
      this.selectedCommuneId = '';
    },
  },
  async mounted() {
    this.departementsLoading = true;
    try {
      const response = await axios.get('/api/communes');
      this.departements = response.data;
    } catch (error) {
      console.error('Erreur récupération des données :', error);
      this.errorMessage = 'Impossible de charger la liste des départements. Vérifiez votre connexion puis rechargez la page.';
    } finally {
      this.departementsLoading = false;
    }
  },
  methods: {
    validate() {
      const required = [
        this.nom, this.selectedStatut, this.selectedDepartementId, this.selectedCommuneId,
        this.telephone, this.mail, this.nom_utilisateur, this.mot_de_passe, this.confirm_mot_de_passe,
      ];
      if (required.some((value) => !String(value || '').trim())) {
        return 'Veuillez remplir tous les champs.';
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.mail)) {
        return "L'adresse e-mail n'est pas valide.";
      }
      if (this.mot_de_passe.length < 6) {
        return 'Le mot de passe doit contenir au moins 6 caractères.';
      }
      if (this.mot_de_passe !== this.confirm_mot_de_passe) {
        return 'Les mots de passe ne correspondent pas.';
      }
      return '';
    },

    async submitForm() {
      this.errorMessage = this.validate();
      this.successMessage = '';
      if (this.errorMessage) return;

      const formData = {
        nom: this.nom,
        departement_id: this.selectedDepartementId,
        commune_id: this.selectedCommuneId,
        statut: this.selectedStatut,
        telephone: this.telephone,
        mail: this.mail,
        nom_utilisateur: this.nom_utilisateur,
        mot_de_passe: this.mot_de_passe,
      };

      this.loading = true;
      try {
        await axios.post('/api/etablissements', formData);
        // Connexion directe : le directeur arrive sur « Premiers pas » sans
        // retaper ses identifiants.
        try {
          const { data } = await axios.post('/api/loginEtablissement', {
            nom_utilisateur: formData.nom_utilisateur,
            mot_de_passe: formData.mot_de_passe,
          });
          localStorage.setItem('token', data.token);
          localStorage.setItem('etablissement_nom', data.etablissement.nom);
          localStorage.setItem('etablissement_id', data.etablissement.id);
          localStorage.setItem('user_type', 'etablissement');
          this.resetForm();
          this.successMessage = 'Établissement inscrit. Ouverture de votre tableau de bord…';
          setTimeout(() => {
            this.$router.push({
              path: '/administration/dashbord',
              query: { etablissement_id: data.etablissement.id, etablissement_nom: data.etablissement.nom },
            });
          }, 800);
        } catch (loginError) {
          this.resetForm();
          this.successMessage = 'Établissement inscrit avec succès. Connectez-vous avec vos identifiants.';
          setTimeout(() => this.$router.push('/administration/connexion'), 1500);
        }
      } catch (error) {
        console.error('Erreur lors de la soumission :', error);
        this.errorMessage = error.response?.data?.error
          || error.response?.data?.message
          || "L'inscription a échoué. Vérifiez votre connexion et réessayez.";
      } finally {
        this.loading = false;
      }
    },
    resetForm() {
      this.nom = '';
      this.selectedDepartementId = '';
      this.selectedCommuneId = '';
      this.selectedStatut = '';
      this.telephone = '';
      this.mail = '';
      this.nom_utilisateur = '';
      this.mot_de_passe = '';
      this.confirm_mot_de_passe = '';
    },
  },
};
</script>

<style scoped>
.background {
  position: relative;
  background-image: url('@/assets/administration/Image collée.png');
  background-size: cover;
  background-position: center;
  min-height: 100vh;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.25);
  z-index: 1;
}

.form-container {
  position: relative;
  z-index: 2;
  background-color: rgba(255, 255, 255, 0.95);
  max-width: 900px;
  width: 100%;
  border-radius: 12px;
  padding: 30px 40px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.form-title {
  font-size: 24px;
  text-align: center;
  font-weight: 700;
  color: #0c1f38;
  margin-bottom: 4px;
}

.form-subtitle {
  margin: 0 0 20px;
  text-align: center;
  font-size: 14px;
  color: #5b6b82;
}

.alert {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.alert--error {
  background: #fdecec;
  border: 1px solid #f5c2c2;
  color: #a61b1b;
}

.alert--success {
  background: #e8f6ee;
  border: 1px solid #b7e2c7;
  color: #17663a;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.form-item--full {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 14px;
  font-weight: 600;
  color: #0c1f38;
}

.field-hint,
.field-error {
  font-size: 12px;
}

.field-hint {
  color: #5b6b82;
}

.field-error {
  color: #a61b1b;
  font-weight: 500;
}

.input-field {
  width: 100%;
  min-height: 36px;
  padding: 6px 10px;
  border: 1px solid #c7cfdb;
  border-radius: 8px;
  background: #fff;
  font-size: 16px;
  color: #0c1f38;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-field:focus {
  border-color: #007BFF;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.18);
  outline: none;
}

.input-field:disabled {
  background: #f3f5f9;
  color: #8a96a8;
  cursor: not-allowed;
}

.input-field--error {
  border-color: #d93636;
}

.submit-button {
  margin-top: 16px;
  width: 100%;
  background-color: #007BFF;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  padding: 8px;
  border: none;
  border-radius: 6px;
  transition: background-color 0.3s;
}

.submit-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.submit-button:disabled {
  background-color: #8fbcf0;
  cursor: not-allowed;
}

.login-link {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
}

.link {
  color: #007BFF;
  cursor: pointer;
  font-weight: 500;
  text-decoration: underline;
}

.link:hover {
  color: #0056b3;
}

@media screen and (max-width: 600px) {
  .form-container {
    padding: 20px;
  }

  .form-title {
    font-size: 18px;
  }

  /* Téléphone : deux champs par ligne, sans grand conteneur. */
  .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 8px;
  }

  .form-container {
    padding: 8px 4px !important;
    background: transparent;
    box-shadow: none;
  }

  .submit-button {
    font-size: 14px;
    padding: 10px;
  }

  .login-link {
    font-size: 12px;
  }
}
</style>
