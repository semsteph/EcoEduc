<template>
  <v-container>
    <v-form @submit.prevent="login">
      <v-text-field
        v-model="username"
        label="Nom d'utilisateur"
        required
      ></v-text-field>
      <v-text-field
        v-model="password"
        label="Mot de passe"
        type="password"
        required
      ></v-text-field>
      <v-btn type="submit" color="primary">Se connecter</v-btn>
    </v-form>
    <v-alert v-if="error" type="error">{{ error }}</v-alert>
  </v-container>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      username: '',
      password: '',
      error: ''
    };
  },
  methods: {
    async login() {
      try {
        const response = await axios.post('http://localhost:8080/api/login', {
          username: this.username,
          password: this.password
        });
        const token = response.data.token;
        localStorage.setItem('token', token);

        // Décoder le token pour obtenir l'ID de l'enseignant
        const payload = JSON.parse(atob(token.split('.')[1]));
        const enseignantId = payload.id;

        // Rediriger vers le dashboard avec l'ID de l'enseignant dans l'URL
        this.$router.push({ path: '/professeurs/dashbord', query: { id: enseignantId } });
      } catch (error) {
        this.error = error.response ? error.response.data.message : 'Erreur de connexion au serveur.';
      }
    }
  }
};
</script>
