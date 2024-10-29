<template>
  <v-container fluid fill-height class="login-container">
    <v-row justify="center" align="center">
      <v-col cols="12" md="4">
        <v-card class="pa-5" elevation="10">
          <v-card-title class="text-h4 text-center mb-5">Se connecter</v-card-title>
          <v-form @submit.prevent="login">
            <v-text-field
              v-model="username"
              label="Nom d'utilisateur"
              required
              outlined
              dense
              prepend-inner-icon="mdi-account"
            ></v-text-field>
            <v-text-field
              v-model="password"
              label="Mot de passe"
              type="password"
              required
              outlined
              dense
              prepend-inner-icon="mdi-lock"
            ></v-text-field>
            <v-text-field
              v-model="etablissement"
              label="Nom de l'établissement"
              required
              outlined
              dense
              prepend-inner-icon="mdi-school"
            ></v-text-field>
            <v-btn type="submit" color="primary" block class="mt-4" elevation="2">Se connecter</v-btn>
          </v-form>
          <v-alert v-if="error" type="error" class="mt-4">{{ error }}</v-alert>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      username: '',
      password: '',
      etablissement: '', // Champ pour l'établissement
      error: ''
    };
  },
  methods: {
    async login() {
      try {
        const response = await axios.post('http://localhost:8080/api/loginEns', {
          username: this.username,
          password: this.password,
          etablissement: this.etablissement // Envoi de l'établissement
        });
        
        // Stocker le token dans le localStorage
        const token = response.data.token;
        localStorage.setItem('token', token);
        

        // Décoder le token JWT pour obtenir les informations nécessaires
        const payload = JSON.parse(atob(token.split('.')[1]));
        const enseignantId = payload.id; // Récupérer l'ID de l'enseignant
        const etablissementId = payload.etablissement; // Récupérer l'ID de l'établissement

        // Redirection vers la page tableau de bord des parents
        this.$router.push({
          path: '/professeurs/dashbord',
          query: { id: enseignantId, etablissement: etablissementId } // Transmettre l'ID de l'établissement
        });
      } catch (error) {
        // Gestion des erreurs
        this.error = error.response ? error.response.data.message : 'Erreur de connexion au serveur.';
      }
    }
  }
};
</script>

<style scoped>
.login-container {
  background-image: url('assets/professeurs/istockphoto-1358852926-1024x1024.jpg');
  background-size: cover;
  background-position: center;
  height: 100vh;
}

.v-card {
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
}

.v-btn {
  font-weight: bold;
  font-size: 16px;
}

.v-alert {
  border-radius: 8px;
  font-size: 14px;
}

.v-text-field .v-input__control {
  border-radius: 8px;
}

.v-text-field .v-input__prepend-inner > .v-icon {
  color: #9e9e9e;
}

.v-card-title {
  font-family: 'Poppins', sans-serif;
  color: #1976d2;
}
</style>
