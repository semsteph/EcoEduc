<template>
  <v-container fluid class="login-container">
    <v-row justify="center" align="center" class="min-vh-100">
      <v-col cols="12" sm="6" md="4">
        <v-card>
          <v-card-title class="headline">Se connecter</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="login">
              <v-text-field
                v-model="username"
                label="Nom d'utilisateur"
                required
                outlined
                dense
              ></v-text-field>
              <v-text-field
                v-model="password"
                label="Mot de passe"
                type="password"
                required
                outlined
                dense
              ></v-text-field>
              <v-text-field
                v-model="etablissement"
                label="Nom de l'établissement"
                required
                outlined
                dense
              ></v-text-field>
              <v-btn type="submit" color="primary" class="mt-4" block>Se connecter</v-btn>
            </v-form>
            <v-alert v-if="error" type="error" class="mt-3">{{ error }}</v-alert>
          </v-card-text>
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
      etablissement: '', // Nouveau champ pour le nom de l'établissement
      error: ''
    };
  },
  methods: {
    async login() {
      try {
        const response = await axios.post('http://localhost:8080/api/parent/login', {
          username: this.username,
          password: this.password,
          etablissement: this.etablissement // Envoi de l'établissement dans la requête
        });
        const token = response.data.token;
        localStorage.setItem('token', token);

        // Décoder le token pour obtenir l'ID du parent et de l'établissement
        const payload = JSON.parse(atob(token.split('.')[1]));
        const parentId = payload.id;
        const etablissementId = Number(payload.etablissementId); // Convertir l'ID de l'établissement en nombre

        // Rediriger vers le tableau de bord avec l'ID du parent et l'ID de l'établissement dans l'URL
        this.$router.push({ path: '/parents/dashbord', query: { id: parentId, etablissement: etablissementId } });
      } catch (error) {
        this.error = error.response ? error.response.data.message : 'Erreur de connexion au serveur.';
      }
    }
  }
};
</script>

<style scoped>
.login-container {
  background-image: url('/assets/parents/stock-photo-parents-helping-children-with-homework-in-kitche.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  min-height: 100vh;
  position: relative;
}

.v-card {
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  background-color: rgba(255, 255, 255, 0.9);
}

.v-alert {
  margin-top: 10px;
}
</style>
