<template>
  <div>
    <!-- Bouton pour ajouter une classe -->
    <v-btn color="primary" @click="showForm = true">Ajouter Classe</v-btn>
    
    <!-- Formulaire pour ajouter une nouvelle classe -->
    <v-card v-if="showForm" class="pa-4 mt-4">
      <v-form @submit.prevent="submitForm">
        <v-text-field v-model="newClassName" label="Nom de la classe" required></v-text-field>
        
        <!-- Champ de sélection pour les promotions -->
        <v-select
          v-model="selectedPromotionId"
          :items="promotions"
          item-title="nom"
          item-value="id"
          label="Promotion"
          required
        ></v-select>
        
        <div class="d-flex justify-space-between mt-4">
          <v-btn color="primary" type="submit">Ajouter</v-btn>
          <v-btn @click="cancelForm">Annuler</v-btn>
        </div>
      </v-form>
    </v-card>

    <!-- Bouton pour afficher les classes -->
    <v-btn color="primary" class="mt-4" @click="fetchClasses">Mes Classes</v-btn>

    <!-- Liste des classes par promotion -->
    <div v-if="classesByPromotion && Object.keys(classesByPromotion).length > 0">
      <div v-for="(classes, promotion) in classesByPromotion" :key="promotion">
        <h3>{{ promotion }}</h3>
        <v-card
          v-for="classe in classes"
          :key="classe.id"
          class="mt-3"
        >
          <v-card-title>
            {{ classe.name }} ({{ classe.studentCount }} élèves)
          </v-card-title>
          <v-card-actions>
            <v-btn @click="editClass(classe)">Modifier</v-btn>
            <v-btn color="red" @click="deleteClass(classe.id)">Supprimer</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'; // Importation d'Axios

export default {
  name: 'ClassManagement',
  data() {
    return {
      classesByPromotion: {},
      showForm: false,
      newClassName: '',
      promotions: [], // Liste des promotions
      selectedPromotionId: null, // ID de la promotion sélectionnée
      editClassId: null, // ID de la classe à modifier
    }
  },
  methods: {
    submitForm() {
      const url = this.editClassId
        ? `http://localhost:8080/api/Classes/${this.editClassId}`
        : 'http://localhost:8080/api/Classes';

      const method = this.editClassId ? 'put' : 'post';

      axios[method](url, {
        nom: this.newClassName,
        promotion_id: this.selectedPromotionId
      })
      .then(response => {
        this.fetchClasses();
        this.cancelForm();
      })
      .catch(error => {
        console.error('Erreur lors de l\'ajout/modification de la classe :', error.response ? error.response.data : error.message);
      });
    },
    fetchPromotions() {
      axios.get('http://localhost:8080/api/Promotions')
        .then(response => {
          this.promotions = response.data;
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des promotions :', error);
        });
    },
    fetchClasses() {
      axios.get('http://localhost:8080/api/Classes')
        .then(response => {
          this.classesByPromotion = response.data.reduce((acc, classe) => {
            const promotionName = classe.promotion_nom;
            if (!acc[promotionName]) {
              acc[promotionName] = [];
            }
            acc[promotionName].push(classe);
            return acc;
          }, {});
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des classes :', error);
        });
    },
    editClass(classe) {
      this.newClassName = classe.name;
      this.selectedPromotionId = classe.promotion_id;
      this.editClassId = classe.id;
      this.showForm = true;
    },
    deleteClass(classId) {
      axios.delete(`http://localhost:8080/api/Classes/${classId}`)
        .then(() => {
          this.fetchClasses();
        })
        .catch(error => {
          console.error('Erreur lors de la suppression de la classe :', error);
        });
    },
    cancelForm() {
      this.newClassName = '';
      this.selectedPromotionId = null;
      this.editClassId = null;
      this.showForm = false;
    }
  },
  mounted() {
    this.fetchPromotions(); // Charger les promotions lors du montage du composant
  }
}
</script>

<style scoped>
/* Styles pour améliorer l'apparence du formulaire */
.pa-4 {
  padding: 16px;
}

.mt-4 {
  margin-top: 16px;
}

.d-flex {
  display: flex;
}

.justify-space-between {
  justify-content: space-between;
}

.v-card {
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.v-card-title {
  font-weight: bold;
  color: #3f51b5;
}

.v-btn {
  border-radius: 5px;
  padding: 8px 16px;
}
</style>
