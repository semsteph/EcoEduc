<template>
  <div class="background">
    <div class="overlay"></div>

    <div class="content">
      <form @submit.prevent="submitForm" class="form-container">
        <!-- Champ nom d'utilisateur -->
        <label for="nom_utilisateur" class="input-label">Nom d'utilisateur</label>
        <input 
          v-model="nom_utilisateur" 
          id="nom_utilisateur"
          type="text" 
          placeholder="Entrez votre nom d'utilisateur" 
          required 
          class="input-field"
        />
        
        <!-- Champ mot de passe -->
        <label for="mot_de_passe" class="input-label">Mot de passe</label>
        <input 
          v-model="mot_de_passe" 
          id="mot_de_passe"
          type="password" 
          placeholder="Entrez votre mot de passe" 
          required 
          class="input-field"
        />
        
        <button type="submit" class="submit-button">Se connecter</button>
        
        <v-btn class="back-button" @click="goBack">
          Retour à l'accueil
        </v-btn>
      </form>

      <!-- Dialog de succès -->
      <v-dialog v-model="dialog" max-width="500">
        <v-card>
          <v-card-title class="headline">Connexion réussie</v-card-title>
          <v-card-text>
            Vous allez être redirigé vers votre tableau de bord.
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" text @click="closeDialog">Fermer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      nom_utilisateur: '',
      mot_de_passe: '',
      dialog: false,
    };
  },
  methods: {
    async submitForm() {
      const formData = {
        nom_utilisateur: this.nom_utilisateur,
        mot_de_passe: this.mot_de_passe,
      };

      try {
        const response = await axios.post('http://localhost:8080/api/loginEtablissement', formData);
        const { token, etablissement } = response.data;

        localStorage.setItem('token', token);
        localStorage.setItem('etablissement_nom', etablissement.nom);
        localStorage.setItem('etablissement_id', etablissement.id);

        this.dialog = true;

        setTimeout(() => {
          this.$router.push({ 
            path: '/administration/dashbord', 
            query: { 
              etablissement_id: etablissement.id, 
              etablissement_nom: etablissement.nom 
            } 
          });
        }, 2000);
      } catch (error) {
        console.error('Erreur lors de la connexion :', error.response ? error.response.data : error.message);
      }
    },
    closeDialog() {
      this.dialog = false;
    },
    goBack() {
      this.$router.push('/administration/Accueil');
    },
  },
};
</script>

<style scoped>
.background {
  position: relative;
  background-image: url('@/assets/administration/depositphotos_91369982-stock-photo-notebook-stack-with-apple-and.webp');
  background-size: cover;
  background-position: center;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(12px);
  background-color: rgba(255, 255, 255, 0.25);
  z-index: 1;
}

.content {
  position: relative;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 40px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 2;
  text-align: center;
  transition: all 0.3s ease;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.input-label {
  text-align: left;
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.input-field {
  padding: 12px;
  border: 1px solid #007BFF;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.input-field:focus {
  border-color: #0056b3;
  outline: none;
}

.submit-button {
  background-color: #007BFF;
  color: #fff;
  padding: 12px;
  font-size: 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submit-button:hover {
  background-color: #0056b3;
}

.back-button {
  background-color: #6c757d;
  color: white;
  font-size: 14px;
  padding: 10px;
  border-radius: 6px;
  margin-top: 10px;
  transition: background-color 0.3s;
}

.back-button:hover {
  background-color: #5a6268;
}

/* Responsive design */
@media (max-width: 600px) {
  .content {
    padding: 20px;
    max-width: 90%;
  }

  .input-label {
    font-size: 13px;
  }

  .input-field {
    font-size: 14px;
    padding: 10px;
  }

  .submit-button {
    font-size: 14px;
    padding: 10px;
  }

  .back-button {
    font-size: 13px;
    padding: 8px;
  }
}
</style>
