<template>
  <v-container fluid fill-height class="login-container">
    <v-row justify="center" align="center">
      <v-col cols="12" md="5" sm="8">
        <v-card class="pa-6 login-card" elevation="12">
          <v-card-title class="text-h5 text-center mb-5">Bienvenue !</v-card-title>
          <v-card-subtitle class="text-center mb-6">
            Connectez-vous pour accéder à votre espace personnel.
          </v-card-subtitle>
          <v-form @submit.prevent="login">
            <!-- Champ utilisateur -->
            <v-text-field
              v-model="username"
              label="Nom d'utilisateur"
              required
              outlined
              dense
              color="primary"
              prepend-inner-icon="mdi-account"
            ></v-text-field>

            <!-- Champ mot de passe -->
            <v-text-field
              v-model="password"
              label="Mot de passe"
              type="password"
              required
              outlined
              dense
              color="primary"
              prepend-inner-icon="mdi-lock"
            ></v-text-field>

            <!-- Champ établissement -->
            <v-text-field
              v-model="etablissement"
              label="Établissement"
              required
              outlined
              dense
              color="primary"
              prepend-inner-icon="mdi-school"
            ></v-text-field>

            <!-- Bouton de connexion -->
            <v-btn
              type="submit"
              color="primary"
              block
              class="mt-5 font-weight-bold login-button"
              elevation="3"
            >
              Se connecter
            </v-btn>
          </v-form>

          <!-- Message d'erreur -->
          <v-alert v-if="error" type="error" class="mt-4" dense outlined>{{ error }}</v-alert>
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
      etablissement: '',
      error: '',
    };
  },
  methods: {
    async login() {
      try {
        const response = await axios.post('http://localhost:8080/api/loginEns', {
          username: this.username,
          password: this.password,
          etablissement: this.etablissement,
        });

        const token = response.data.token;
        localStorage.setItem('token', token);

        const payload = JSON.parse(atob(token.split('.')[1]));
        const enseignantId = payload.id;
        const etablissementId = payload.etablissement;
        const enseignantNom = payload.enseignant_nom;
        const enseignantPrenom = payload.enseignant_prenom;
        const etablissementNom = payload.etablissement_nom;

        this.$router.push({
          path: '/professeurs/dashbord',
          query: {
            id: enseignantId,
            etablissement: etablissementId,
            enseignantNom,
            enseignantPrenom,
            etablissementNom,
          },
        });
      } catch (error) {
        this.error = error.response
          ? error.response.data.message
          : 'Erreur de connexion au serveur.';
      }
    },
  },
};
</script>

<style scoped>
/* Contexte général */
.login-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  overflow: hidden;
}

.login-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('assets/professeurs/istockphoto-1358852926-1024x1024.jpg'); /* Image de fond */
  background-size: cover;
  background-position: center;
  filter: blur(8px); /* Flou appliqué */

}

.login-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4); /* Couche sombre */
  z-index: -1;
}

/* Carte de connexion */
.login-card {
  z-index: 1;
  backdrop-filter: blur(15px);
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
}

.login-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.4);
}

/* Bouton de connexion */
.login-button {
  font-size: 18px;
  font-family: 'Roboto', sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Champs de saisie */
.v-text-field {
  margin-bottom: 20px;
}

.v-text-field .v-input__control {
  border-radius: 8px;
}

.v-text-field .v-input__prepend-inner > .v-icon {
  color: #1976d2;
}

/* Message d'erreur */
.v-alert {
  border-radius: 8px;
  font-size: 14px;
}

/* Titre et sous-titre */
.v-card-title {
  font-family: 'Poppins', sans-serif;
  color: #1565c0;
  font-weight: bold;
}

.v-card-subtitle {
  font-family: 'Roboto', sans-serif;
  color: #546e7a;
  font-size: 16px;
}
</style>
