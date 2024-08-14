<template>
  <div class="container">
    <button @click="showForm = true" v-if="!showForm && !submitted">Inscrire un élève</button>
    
    <div class="form-container" v-if="showForm && !submitted">
      <h2>Inscription Élève</h2>
      <form @submit.prevent="submitForm">
        <!-- Champs existants -->
        <div class="form-group">
          <label for="nom">Nom :</label>
          <input type="text" id="nom" v-model="form.nom" required />
        </div>

        <div class="form-group">
          <label for="prenom">Prénom :</label>
          <input type="text" id="prenom" v-model="form.prenom" required />
        </div>

        <div class="form-group">
          <label for="date-naissance">Date de naissance :</label>
          <input type="date" id="date-naissance" v-model="form.dateNaissance" required />
        </div>

        <div class="form-group">
          <label for="sexe">Sexe :</label>
          <select id="sexe" v-model="form.sexe" required>
            <option value="" disabled selected>Choisir...</option>
            <option value="M">Masculin</option>
            <option value="F">Feminin</option>
            <option value="Autre">Autre</option>
          </select>
        </div>

        <div class="form-group">
          <label for="classe">Classe :</label>
          <select id="classe" v-model="form.classe" required>
            <option value="" disabled selected>Choisir...</option>
            <option v-for="classe in classes" :key="classe.id" :value="classe.id">
              {{ classe.nom }}
            </option>
          </select>
        </div>

        <!-- Nouveau champ Parent avec v-autocomplete -->
        <div class="form-group">
          <label for="parents">Parent :</label>
          <v-autocomplete
            v-model="form.parentId"
            :items="parents"
            item-value="id"
            item-title="text"
            label="Choisir un parent"
            required
          ></v-autocomplete>
        </div>

        <button type="submit">S'inscrire</button>
      </form>
      <button v-if="showForm && !submitted" @click="showForm = false" class="back-button">Retour</button>
    </div>

    <div v-if="submitted" class="form-container">
      <h2>Inscription réussie !</h2>
      <button @click="goBack" class="back-button">Retour</button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      form: {
        nom: '',
        prenom: '',
        dateNaissance: '',
        sexe: '',
        classe: '', // ID de la classe
        parentId: '' // ID du parent
      },
      submitted: false,
      showForm: false,
      classes: [], // Liste des classes récupérées
      parents: [] // Liste des parents récupérés
    };
  },
  async created() {
    await this.fetchClasses(); // Récupérer les classes lors de la création du composant
    await this.fetchParents(); // Récupérer les parents lors de la création du composant
  },
  methods: {
    async fetchClasses() {
      try {
        const response = await axios.get('http://localhost:8080/api/Classes');
        this.classes = response.data; // Stocker les classes dans le data
      } catch (error) {
        console.error('Erreur lors de la récupération des classes :', error.response ? error.response.data : error.message);
      }
    },
    async fetchParents() {
      try {
        const response = await axios.get('http://localhost:8080/api/Parents');
        this.parents = response.data.map(parent => ({
          id: parent.id,
          text: `${parent.nom} ${parent.prenom}` // Format de l'affichage
        }));
        console.log(this.parents) // Stocker les parents dans le data
      } catch (error) {
        console.error('Erreur lors de la récupération des parents :', error.response ? error.response.data : error.message);
      }
    },
    async submitForm() {
      try {
        await axios.post('http://localhost:8080/api/inscription', {
          ...this.form
        });
        this.submitted = true; // Affiche le message de succès et le bouton de retour
        this.showForm = false; // Masque le formulaire
      } catch (error) {
        console.error('Erreur lors de l\'inscription', error.response ? error.response.data : error.message);
        alert('Une erreur est survenue. Veuillez réessayer.');
      }
    },
    goBack() {
      this.$router.go(-1); // Revient à la page précédente
    }
  }
};
</script>

<style scoped>
.container {
  text-align: center;
}
.form-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  width: 300px;
  margin: 0 auto;
}
.form-container h2 {
  margin-bottom: 20px;
}
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
}
.form-group input, .form-group select, .form-group v-autocomplete {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
button {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}
button:hover {
  background-color: #218838;
}
.back-button {
  background-color: #2a3642;
}
.back-button:hover {
  background-color: #0056b3;
}
</style>
