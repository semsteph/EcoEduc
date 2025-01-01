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
          <input 
            list="departements" 
            v-model="selectedDepartement" 
            placeholder="Sélectionnez un département" 
            required 
            class="input-field"
          />
          <datalist id="departements">
            <option 
              v-for="departement in departements" 
              :key="departement.id" 
              :value="departement.nom"
            ></option>
          </datalist>
        </div>

        <div class="form-item">
          <input 
            list="communes" 
            v-model="selectedCommune" 
            placeholder="Sélectionnez une commune" 
            required 
            class="input-field"
          />
          <datalist id="communes">
            <option 
              v-for="commune in communes" 
              :key="commune.id" 
              :value="commune.nom"
            ></option>
          </datalist>
        </div>

        <div class="form-item">
          <input 
            list="statuts" 
            v-model="selectedStatut" 
            placeholder="Statut de l'établissement" 
            required 
            class="input-field"
          />
          <datalist id="statuts">
            <option value="public">Public</option>
            <option value="prive">Privé</option>
          </datalist>
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
        Vous avez déjà un compte? 
        <a @click="redirectLogin" class="link">Se connecter</a>
      </p>
    </form>
  </div>
</template>

<script>
import axios from 'axios';
import { ref } from 'vue';

export default {
  data() {
    return {
      nom: '',
      selectedDepartement: '',
      selectedCommune: '',
      selectedStatut: '',
      telephone: '',
      mail: '',
      nom_utilisateur: '',
      mot_de_passe: '',
      confirm_mot_de_passe: '', // Champ ajouté pour confirmation de mot de passe
      departements: [],
      communes: [],
      dialog: false, // Pour afficher le dialog de succès
      errorDialog: false, // Pour afficher le dialog d'erreur pour mot de passe non conforme
    };
  },
  async mounted() {
    try {
      const [departementsResponse, communesResponse] = await Promise.all([
        axios.get('http://localhost:8080/api/departements'),
        axios.get('http://localhost:8080/api/communes')
      ]);
      this.departements = departementsResponse.data;
      this.communes = communesResponse.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des données :', error);
    }
  },
  methods: {
    async submitForm() {
      // Vérification si les mots de passe correspondent
      if (this.mot_de_passe !== this.confirm_mot_de_passe) {
        this.errorDialog = true;
        return;
      }
    
      const selectedDepartementId = this.departements.find(
        (dep) => dep.nom.trim().toLowerCase() === this.selectedDepartement.trim().toLowerCase()
      )?.departement_id;

      const selectedCommuneId = this.communes.find(
        (com) => com.nom.trim().toLowerCase() === this.selectedCommune.trim().toLowerCase()
      )?.commune_id;
    
      const formData = {
        nom: this.nom,
        departement_id: selectedDepartementId,
        commune_id: selectedCommuneId,
        statut: this.selectedStatut,
        telephone: this.telephone,
        mail: this.mail,
        nom_utilisateur: this.nom_utilisateur,
        mot_de_passe: this.mot_de_passe,
      };
    
      try {
        await axios.post('http://localhost:8080/api/etablissements', formData);
        this.resetForm();
        this.dialog = true; // Afficher le dialog de succès
        // Rediriger vers la page de connexion après une courte pause pour que le dialogue soit visible.
        setTimeout(() => {
          this.$router.push('/administration/connexion');
        }, 2000);
      } catch (error) {
        console.error('Erreur lors de la soumission du formulaire :', error);
      }
    },
    resetForm() {
      this.nom = '';
      this.selectedDepartement = '';
      this.selectedCommune = '';
      this.selectedStatut = '';
      this.telephone = '';
      this.mail = '';
      this.nom_utilisateur = '';
      this.mot_de_passe = '';
      this.confirm_mot_de_passe = ''; // Réinitialiser le champ de confirmation aussi
    },
    redirectLogin() {
      this.$router.push('/administration/connexion');
    }
  },
};
</script>

<style>
/* Image de fond pleine page */
.background {
  position: relative;
  background-image: url('assets/administration/Image collée.png');
  background-size: cover;
  background-position: center;
  min-height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Couche floue */
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(10px); /* Flou appliqué */
  z-index: 1;
  background-color: rgba(255, 255, 255, 0.2); /* Légère teinte blanche */
}

/* Conteneur du formulaire */
.form-container {
  position: relative;
  z-index: 2; /* Le formulaire est au-dessus de l'overlay */
  max-width: 800px;
  padding: 30px;
  background-color: rgba(249, 249, 249, 0.9); /* Fond légèrement transparent */
  border-radius: 10px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Grille du formulaire (2 colonnes) */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* 2 colonnes égales */
  gap: 20px; /* Espacement entre les champs */
}

/* Element individuel dans la grille */
.form-item {
  display: flex;
  flex-direction: column;
}

/* Style des champs de saisie */
.input-field {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
  width: 100%;
}

.input-field:focus {
  border-color: #007BFF;
  outline: none;
}

/* Bouton de soumission */
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

.login-link {
  text-align: center;
  margin-top: 10px;
}

.link {
  color: #007BFF;
  cursor: pointer;
  text-decoration: underline;
}

.link:hover {
  color: #0056b3;
}
</style>