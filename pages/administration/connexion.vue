<template>
  <div class="background">
    <!-- Couche floue appliquée à l'image de fond -->
    <div class="overlay"></div>

    <div class="content">
      <form @submit.prevent="submitForm" class="form-container">
        <!-- Champ nom d'utilisateur avec label -->
        <label for="nom_utilisateur" class="input-label">Nom d'utilisateur</label>
        <input 
          v-model="nom_utilisateur" 
          id="nom_utilisateur"
          type="text" 
          placeholder="Entrez votre nom d'utilisateur" 
          required 
          class="input-field"
        />
        
        <!-- Champ mot de passe avec label -->
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

      <!-- Dialog de succès de connexion -->
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

        // Stocker le token et les infos de l'établissement
        localStorage.setItem('token', token);
        localStorage.setItem('etablissement_nom', etablissement.nom);
        localStorage.setItem('etablissement_id', etablissement.id);

        this.dialog = true;

        // Redirection vers le tableau de bord après une courte pause
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
/* Fond avec une image de fond */
.background {
  position: relative; /* Nécessaire pour superposer les calques */
  background-image: url('assets/administration/depositphotos_91369982-stock-photo-notebook-stack-with-apple-and.webp'); /* Remplacez par le chemin de votre image */
  background-size: cover;
  background-position: center;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

/* Couche floue */
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(15px); /* Applique un flou de 15px */
  z-index: 1; /* Place la couche derrière le contenu principal */
  background-color: rgba(255, 255, 255, 0.2); /* Optionnel : ajoute une légère teinte */
}

/* Contenu principal */
.content {
  position: relative; /* Nécessaire pour superposer sur la couche floue */
  background-color: rgba(255, 255, 255, 0.8); /* Fond légèrement transparent */
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 100%;
  text-align: center;
  z-index: 2; /* Place le contenu au-dessus de la couche floue */
}

/* Formulaire */
.form-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-field {
  padding: 12px;
  border: 1px solid blue;
  border-radius: 5px;
  font-size: 16px;
  width: 100%;
}

.input-field:focus {
  border-color: #007BFF;
  outline: none;
}

.submit-button {
  background-color: #007BFF;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 12px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.submit-button:hover {
  background-color: #0056b3;
}

.back-button {
  background-color: #6c757d;
  color: white;
  border-radius: 5px;
  padding: 10px 15px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-top: 10px;
}

.back-button:hover {
  background-color: #5a6268;
}

/* Labels des champs */
.input-label {
  text-align: left;
  font-size: 14px;
  margin-bottom: -12px;
  color: #333;
}
</style>
