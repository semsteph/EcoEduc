<template>
  <v-container fluid class="login-container">
    <v-row justify="center" align="center" class="min-vh-100">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card class="login-card">
          <v-card-title class="text-center headline">Bienvenue</v-card-title>
          <v-card-subtitle class="text-center mb-4">
            Connectez-vous à votre compte EchoEducation
          </v-card-subtitle>
          <v-card-text>
            <v-form @submit.prevent="login">
              <!-- Champ utilisateur -->
              <v-text-field
                v-model="username"
                label="Nom d'utilisateur"
                outlined
                dense
                color="primary"
                required
                class="mb-4"
              ></v-text-field>

              <!-- Champ mot de passe -->
              <v-text-field
                v-model="password"
                label="Mot de passe"
                type="password"
                outlined
                dense
                color="primary"
                required
                class="mb-4"
              ></v-text-field>

              <!-- Champ établissement -->
              <v-text-field
                v-model="etablissement"
                label="Nom de l'établissement"
                outlined
                dense
                color="primary"
                required
                class="mb-4"
              ></v-text-field>

              <!-- Bouton de connexion -->
              <v-btn
                type="submit"
                color="primary"
                block
                rounded
                large
                elevation="2"
                class="mt-3"
              >
                Se connecter
              </v-btn>
            </v-form>

            <!-- Message d'erreur -->
            <v-alert
              v-if="error"
              type="error"
              class="mt-4"
              dense
              text
            >
              {{ error }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      username: "",
      password: "",
      etablissement: "", // Nouveau champ pour le nom de l'établissement
      error: "",
    };
  },
  methods: {
    async login() {
      try {
        const response = await axios.post("http://localhost:8080/api/parent/login", {
          username: this.username,
          password: this.password,
          etablissement: this.etablissement, // Envoi de l'établissement dans la requête
        });
        const token = response.data.token;
        localStorage.setItem("token", token);

        // Décoder le token pour obtenir l'ID du parent et de l'établissement
        const payload = JSON.parse(atob(token.split(".")[1]));
        const parentId = payload.id;
        const etablissementId = Number(payload.etablissementId); // Convertir l'ID de l'établissement en nombre

        // Rediriger vers le tableau de bord avec l'ID du parent et l'ID de l'établissement dans l'URL
        this.$router.push({
          path: "/parents/dashbord",
          query: { id: parentId, etablissement: etablissementId },
        });
      } catch (error) {
        this.error = error.response ? error.response.data.message : "Erreur de connexion au serveur.";
      }
    },
  },
};
</script>

<style scoped>
/* Conteneur principal */
.login-container {
  background: linear-gradient(
      rgba(0, 0, 0, 0.5),
      rgba(0, 0, 0, 0.5)
    ),
    url("/assets/parents/stock-photo-parents-helping-children-with-homework-in-kitche.jpg")
      no-repeat center center;
  background-size: cover;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

/* Carte de connexion */
.login-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  padding: 24px;
}

/* Pied de page */
.footer-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.register-link {
  color: #ffd700;
  font-weight: bold;
  text-decoration: none;
  transition: color 0.3s ease;
}

.register-link:hover {
  color: #fff;
}

/* Champs texte */
.v-text-field {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
}

/* Bouton principal */
.v-btn {
  font-size: 16px;
  font-weight: bold;
}

/* Message d'erreur */
.v-alert {
  background: rgba(255, 0, 0, 0.1);
  color: #d32f2f;
}

/* Responsive */
@media (max-width: 600px) {
  .login-card {
    padding: 16px;
  }
  .footer-text {
    font-size: 12px;
  }
}
</style>
