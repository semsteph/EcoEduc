<template>
  <div class="annee-scolaire-container">
    <h2>Gestion des Années Scolaires</h2>
    <div>
      <button @click="showAddForm = true" class="btn-add">Ajouter une Année Scolaire</button>
    </div>
    <div v-if="showAddForm" class="form-container">
      <form @submit.prevent="ajouterAnneeScolaire">
        <div>
          <label for="anneeScolaire">Année Scolaire</label>
          <input
            v-model="nouvelleAnnee"
            type="text"
            id="anneeScolaire"
            placeholder="Ex : 2023-2024"
            required
          />
        </div>
        <button type="submit" class="btn-submit">Ajouter</button>
        <button type="button" @click="showAddForm = false" class="btn-cancel">Annuler</button>
      </form>
    </div>
    <div class="actions">
      <button class="btn-cloture" @click="confirmerCloture">
        Clôturer l'Année Scolaire
      </button>
      <button class="btn-profile" @click="modifierProfil">
        Modifier Profil
      </button>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  props: {
    etablissementId: {
      type: Number,
      required: true,
    },
    anneeScolaire: {
      type: String,
      required: true
    },
    anneeScolaireId: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      showAddForm: false,
      nouvelleAnnee: "",
    };
  },
  methods: {
    ajouterAnneeScolaire() {
  if (!this.nouvelleAnnee || !this.etablissementId) {
    alert("Veuillez saisir une année scolaire valide et sélectionner un établissement.");
    return;
  }

  axios
    .post("http://localhost:8080/api/annees-scolaires", {
      annee: this.nouvelleAnnee, // Correction ici
      etablissementId: this.etablissementId,
    })
    .then(() => {
      alert("Année scolaire ajoutée avec succès !");
      this.showAddForm = false;
      this.nouvelleAnnee = ""; // Réinitialisation correcte
    })
    .catch((error) => {
      console.error("Erreur lors de l'ajout de l'année scolaire:", error);
      alert("Une erreur s'est produite. Veuillez réessayer.");
    });
},

    async cloturerAnneeScolaire() {
      try {
        const response = await axios.post(
          "http://localhost:8080/api/cloture-annee-scolaire",
          {
            etablissementId: this.etablissementId,
            anneeScolaireId: this.anneeScolaireId,
          }
        );
        alert(response.data.message);
      } catch (error) {
        console.error("Erreur lors de la clôture de l'année scolaire:", error);
        alert("Une erreur s'est produite. Veuillez réessayer.");
      }
    },
    confirmerCloture() {
      if (confirm("Êtes-vous sûr de vouloir clôturer l'année scolaire ? Cette action est irréversible.")) {
        this.cloturerAnneeScolaire();
      }
    },
    modifierProfil() {
      axios
        .get(`http://localhost:8080/api/profil/${this.etablissementId}`)
        .then((response) => {
          console.log("Profil récupéré :", response.data);
          alert("Modification de profil. Fonctionnalité en cours d'implémentation.");
        })
        .catch((error) => {
          console.error("Erreur lors de la récupération du profil :", error);
        });
    },
  },
};
</script>

<style scoped>
.annee-scolaire-container {
  padding: 20px;
  max-width: 500px;
  margin: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

h2 {
  text-align: center;
  margin-bottom: 20px;
}

.form-container {
  margin: 20px 0;
  background: #fff;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

label {
  display: block;
  font-weight: bold;
  margin-bottom: 8px;
}

input {
  width: 100%;
  padding: 8px;
  margin-bottom: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.btn-add,
.btn-submit,
.btn-cancel,
.btn-cloture,
.btn-profile {
  display: inline-block;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  margin: 5px 0;
  cursor: pointer;
}

.btn-add {
  background-color: #28a745;
  color: white;
}

.btn-submit {
  background-color: #007bff;
  color: white;
}

.btn-cancel {
  background-color: #dc3545;
  color: white;
}

.btn-cloture {
  background-color: #ffc107;
  color: white;
}

.btn-profile {
  background-color: #17a2b8;
  color: white;
}

button:hover {
  opacity: 0.9;
}

.actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}
</style>
