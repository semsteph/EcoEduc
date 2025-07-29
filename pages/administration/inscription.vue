<template>
  <div class="background">
    <div class="overlay"></div>
    <form @submit.prevent="submitForm" class="form-container">
      <h2 class="form-title">Inscrivez votre établissement</h2>

      <div class="form-grid">
        <!-- Colonne gauche -->
        <div class="form-item">
          <input
            v-model="nom"
            type="text"
            placeholder="Nom d'établissement"
            required
            class="input-field"
          />
        </div>

        <div class="form-item">
          <select v-model="selectedDepartementId" required class="input-field">
            <option disabled value="">Sélectionnez un département</option>
            <option
              v-for="dep in departements"
              :key="dep.departement_id"
              :value="dep.departement_id"
            >
              {{ dep.departement_nom }}
            </option>
          </select>
        </div>

        <div class="form-item">
          <select v-model="selectedCommuneId" required class="input-field">
            <option disabled value="">Sélectionnez une commune</option>
            <option
              v-for="com in communesFiltered"
              :key="com.commune_id"
              :value="com.commune_id"
            >
              {{ com.nom }}
            </option>
          </select>
        </div>

        <div class="form-item">
          <select v-model="selectedStatut" required class="input-field">
            <option disabled value="">Statut de l'établissement</option>
            <option value="public">Public</option>
            <option value="prive">Privé</option>
          </select>
        </div>

        <!-- Colonne droite -->
        <div class="form-item">
          <input
            v-model="telephone"
            type="text"
            placeholder="Numéro de téléphone"
            required
            class="input-field"
          />
        </div>

        <div class="form-item">
          <input
            v-model="mail"
            type="email"
            placeholder="Adresse email"
            required
            class="input-field"
          />
        </div>

        <div class="form-item">
          <input
            v-model="nom_utilisateur"
            type="text"
            placeholder="Nom d'utilisateur"
            required
            class="input-field"
          />
        </div>

        <div class="form-item">
          <input
            v-model="mot_de_passe"
            type="password"
            placeholder="Mot de passe"
            required
            class="input-field"
          />
        </div>

        <div class="form-item">
          <input
            v-model="confirm_mot_de_passe"
            type="password"
            placeholder="Confirmez le mot de passe"
            required
            class="input-field"
          />
        </div>
      </div>

      <button type="submit" class="submit-button">S'inscrire</button>

      <p class="login-link">
        Vous avez déjà un compte ?
        <a @click="redirectLogin" class="link">Se connecter</a>
      </p>
    </form>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
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
      dialog: false,
      errorDialog: false,
    };
  },
  computed: {
    communesFiltered() {
      const dep = this.departements.find(
        (d) => d.departement_id === this.selectedDepartementId
      );
      return dep ? dep.communes : [];
    },
  },
  async mounted() {
    try {
      const response = await axios.get('http://localhost:8080/api/communes');
      this.departements = response.data;
    } catch (error) {
      console.error('Erreur récupération des données :', error);
    }
  },
  methods: {
    async submitForm() {
      if (this.mot_de_passe !== this.confirm_mot_de_passe) {
        alert("Les mots de passe ne correspondent pas.");
        return;
      }

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

      try {
        await axios.post('http://localhost:8080/api/etablissements', formData);
        this.resetForm();
        this.dialog = true;
        setTimeout(() => {
          this.$router.push('/administration/connexion');
        }, 2000);
      } catch (error) {
        console.error('Erreur lors de la soumission :', error);
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
    redirectLogin() {
      this.$router.push('/administration/connexion');
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
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.form-title {
  font-size: 24px;
  text-align: center;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.input-field {
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.input-field:focus {
  border-color: #007BFF;
  outline: none;
}

.submit-button {
  margin-top: 20px;
  width: 100%;
  background-color: #007BFF;
  color: #fff;
  font-weight: 600;
  font-size: 16px;
  padding: 12px;
  border: none;
  border-radius: 6px;
  transition: background-color 0.3s;
}

.submit-button:hover {
  background-color: #0056b3;
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

  .input-field {
    font-size: 13px;
    padding: 8px 10px;
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
