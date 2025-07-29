<template>
  <div class="annee-scolaire-container">
    <h2>Gestion des Années Scolaires</h2>

    <div class="top-actions">
      <button @click="showAddForm = true" class="btn btn-success">+ Ajouter une Année</button>
      <button class="btn btn-warning" @click="confirmerCloture">Clôturer l'Année</button>
    </div>

    <transition name="fade">
      <div v-if="showAddForm" class="form-inline">
        <input
          v-model="nouvelleAnnee"
          type="text"
          class="input"
          placeholder="Ex : 2023-2024"
          required
        />
        <button @click="ajouterAnneeScolaire" class="btn btn-primary">Valider</button>
        <button @click="showAddForm = false" class="btn btn-danger">Annuler</button>
      </div>
    </transition>
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
      required: true,
    },
    anneeScolaireId: {
      type: Number,
      required: true,
    },
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
          annee: this.nouvelleAnnee,
          etablissementId: this.etablissementId,
        })
        .then(() => {
          alert("Année scolaire ajoutée avec succès !");
          this.showAddForm = false;
          this.nouvelleAnnee = "";
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
      if (
        confirm(
          "Êtes-vous sûr de vouloir clôturer l'année scolaire ? Cette action est irréversible."
        )
      ) {
        this.cloturerAnneeScolaire();
      }
    },
  },
};
</script>

<style scoped>
.annee-scolaire-container {
  padding: 30px;
  max-width: 600px;
  margin: auto;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

h2 {
  text-align: center;
  color: #333;
  margin-bottom: 25px;
  font-size: 1.5rem;
}

.top-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.form-inline {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 15px;
  justify-content: space-between;
  flex-wrap: wrap;
}

.input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  min-width: 150px;
}

.btn {
  padding: 10px 15px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: 0.3s ease;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-warning {
  background-color: #ffc107;
  color: #212529;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn:hover {
  opacity: 0.9;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
