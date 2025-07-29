<template>
  <div class="activation-container">
    <div class="card">
      <h2 class="title">Activation du compte</h2>

      <!-- Étape 1 : Vérification de l'email et de l'établissement -->
      <div v-if="!emailVerified">
        <label for="email">Adresse email</label>
        <input v-model="email" id="email" type="email" placeholder="exemple@domaine.com" />

        <label for="etablissement">Établissement</label>
        <select v-model="etablissementId" id="etablissement">
          <option disabled value="">-- Choisissez un établissement --</option>
          <option v-for="e in etablissements" :key="e.id" :value="e.id">{{ e.nom }}</option>
        </select>

        <button @click="checkEmail">Vérifier l'email</button>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </div>

      <!-- Étape 2 : Définir un mot de passe -->
      <div v-else>
        <label for="password">Nouveau mot de passe</label>
        <div class="password-field">
          <input :type="showPassword ? 'text' : 'password'" v-model="password" id="password" placeholder="Mot de passe" />
          <span @click="togglePasswordVisibility('password')" class="eye-icon">
            {{ showPassword ? '🙈' : '👁️' }}
          </span>
        </div>

        <label for="confirmPassword">Confirmer le mot de passe</label>
        <div class="password-field">
          <input :type="showConfirmPassword ? 'text' : 'password'" v-model="confirmPassword" id="confirmPassword" placeholder="Confirmer" />
          <span @click="togglePasswordVisibility('confirm')" class="eye-icon">
            {{ showConfirmPassword ? '🙈' : '👁️' }}
          </span>
        </div>

        <button @click="setPassword">Définir le mot de passe</button>
        <p v-if="successMessage" class="success">{{ successMessage }}</p>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      email: '',
      etablissementId: '',
      emailVerified: false,
      password: '',
      confirmPassword: '',
      errorMessage: '',
      successMessage: '',
      etablissements: [],
      showPassword: false,
      showConfirmPassword: false
    };
  },
  async mounted() {
    try {
      const response = await fetch('http://localhost:8080/api/etablissements');
      this.etablissements = await response.json();
    } catch (error) {
      this.errorMessage = "Impossible de charger les établissements.";
    }
  },
  methods: {
    togglePasswordVisibility(field) {
      if (field === 'password') {
        this.showPassword = !this.showPassword;
      } else if (field === 'confirm') {
        this.showConfirmPassword = !this.showConfirmPassword;
      }
    },

    async checkEmail() {
      this.errorMessage = '';
      this.successMessage = '';
      try {
        const response = await fetch('http://localhost:8080/api/parents/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.email, etablissementId: this.etablissementId })
        });

        const data = await response.json();
        if (data.exists) {
          this.emailVerified = true;
        } else {
          this.errorMessage = "Email ou établissement non trouvé.";
        }
      } catch (error) {
        this.errorMessage = "Erreur de connexion à l'API.";
      }
    },

    async setPassword() {
      this.errorMessage = '';
      this.successMessage = '';

      if (this.password !== this.confirmPassword) {
        this.errorMessage = "Les mots de passe ne correspondent pas.";
        return;
      }

      try {
        const response = await fetch('http://localhost:8080/api/parents/set-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: this.email,
            etablissementId: this.etablissementId,
            password: this.password
          })
        });

        const data = await response.json();
        if (data.success) {
          this.successMessage = "Mot de passe défini avec succès.";
          setTimeout(() => {
            this.$router.push('/parents/connexion');
          }, 1000);
        } else {
          this.errorMessage = data.message || "Impossible de définir le mot de passe.";
        }
      } catch (error) {
        this.errorMessage = "Erreur lors de l'envoi du mot de passe.";
      }
    }
  }
};
</script>

<style scoped>
.activation-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
}

.card {
  background: white;
  border-radius: 10px;
  padding: 30px 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  max-width: 420px;
  width: 100%;
}

.title {
  text-align: center;
  margin-bottom: 25px;
  color: #1f2937;
  font-size: 20px;
}

label {
  display: block;
  margin: 10px 0 5px;
  font-weight: bold;
  color: #374151;
}

input,
select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  margin-bottom: 15px;
  font-size: 14px;
  background-color: #f9fafb;
}

select {
  background-color: #f1f5f9;
  color: #111827;
}

input:focus,
select:focus {
  border-color: #2563eb;
  outline: none;
  background-color: white;
}

button {
  width: 100%;
  padding: 12px;
  background-color: #1d4ed8;
  color: white;
  font-weight: bold;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #2563eb;
}

.error {
  color: #dc2626;
  font-size: 14px;
  margin-top: 10px;
}

.success {
  color: #16a34a;
  font-size: 14px;
  margin-top: 10px;
}

.password-field {
  position: relative;
}

.eye-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  font-size: 18px;
}
</style>
