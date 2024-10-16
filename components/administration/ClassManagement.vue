<template>
  <div>
    <!-- Boutons de gestion des classes -->
    <div class="button-group">
      <v-btn color="primary" @click="showForm = true" v-if="!showProgram && !showConductForm">Ajouter Classe</v-btn>
      <v-btn color="primary" @click="fetchClasses" v-if="!showProgram && !showConductForm">Mes Classes</v-btn>
      <v-btn @click="toggleProgram" :color="showProgram ? 'secondary' : 'primary'">
        Programme
      </v-btn>
      <v-btn color="primary" @click="showConductForm = true" v-if="!showProgram && !showForm">Note de conduite</v-btn>
    </div>

    <!-- Formulaire pour ajouter une nouvelle classe -->
    <v-card v-if="showForm && !showProgram" class="pa-4 mt-4">
      <v-form @submit.prevent="submitForm">
        <v-text-field v-model="newClassName" label="Nom de la classe" required></v-text-field>
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

    <!-- Formulaire pour ajouter une note de conduite -->
    <v-card v-if="showConductForm && !showProgram" class="pa-4 mt-4">
      <v-form @submit.prevent="submitConductForm">
        <v-text-field v-model="conductNote" label="Note de conduite" required></v-text-field>
        <v-select
          v-model="selectedClassIds"
          :items="classesOptions"
          item-title="name"
          item-value="id"
          label="Sélectionnez les classes"
          multiple
          required
        ></v-select>
        <v-select
          v-model="selectedSemestreId"
          :items="semestresOptions"
          item-title="name"
          item-value="id"
          label="Sélectionnez le semestre"
          required
        ></v-select>
        
        <div class="d-flex justify-space-between mt-4">
          <v-btn color="primary" type="submit">Ajouter</v-btn>
          <v-btn @click="cancelConductForm">Annuler</v-btn>
        </div>
      </v-form>
    </v-card>

    <!-- Liste des classes par promotion -->
    <div v-if="!showForm && !showProgram && !showConductForm && classesByPromotion && Object.keys(classesByPromotion).length > 0">
      <div v-for="(classes, promotion) in classesByPromotion" :key="promotion">
        <h3>Promotion: {{ promotion }}</h3>
        <v-card v-for="classe in classes" :key="classe.id" class="mt-3">
          <v-card-title>
            {{ classe.name }} ({{ classe.studentCount }} élèves)
          </v-card-title>
          <v-card-actions>
            <v-btn @click="editClass(classe)">Modifier</v-btn>
            <v-btn color="red" @click="confirmDeleteClass(classe.id)">Supprimer</v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </div>

    <!-- Affichage du composant enfant si showProgram est vrai -->
    <Programme-cours v-if="showProgram" />

    <!-- Snackbar pour afficher les messages -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color">
      {{ snackbar.message }}
      <v-btn color="white" text @click="snackbar.show = false">Fermer</v-btn>
    </v-snackbar>
  </div>
</template>

<script>
import axios from 'axios';
import ProgrammeCours from './ProgrammeCours.vue';

export default {
  name: 'ClassManagement',
  components: { ProgrammeCours },
  data() {
    return {
      classesByPromotion: {},
      showForm: false,
      showConductForm: false,
      newClassName: '',
      conductNote: '',
      promotions: [],
      semestresOptions: [],
      selectedSemestreId: null,
      selectedPromotionId: null,
      selectedClassIds: [],
      classesOptions: [],
      editClassId: null,
      snackbar: {
        show: false,
        message: '',
        color: 'success'
      },
      showProgram: false
    };
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
      .then(() => {
        this.fetchClasses();
        this.cancelForm();
        this.showSnackbar('Classe ajoutée/modifiée avec succès.', 'success');
      })
      .catch(error => {
        console.error('Erreur lors de l\'ajout/modification de la classe :', error.response ? error.response.data : error.message);
        this.showSnackbar('Erreur lors de l\'ajout/modification de la classe.', 'error');
      });
    },
    fetchSemestre() {
      axios.get('http://localhost:8080/api/semesters')
        .then(response => {
          const data = response.data;
          if (typeof data === 'object') {
            this.semestresOptions = Object.values(data).map(semestre => ({
              id: semestre.id,
              name: semestre.nom
            }));
          } else {
            console.error('Format de données inattendu.');
          }
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des semestres :', error);
        });
    },
    submitConductForm() {
  // Vérifiez si tous les champs requis sont remplis
  if (!this.conductNote || this.selectedClassIds.length === 0 || !this.selectedSemestreId) {
    this.showSnackbar('Veuillez remplir tous les champs.', 'error');
    return;
  }

  // Effectuer la requête POST avec tous les identifiants de classe
  axios.post('http://localhost:8080/api/conduite', {
    note_conduite: this.conductNote,
    classe_ids: this.selectedClassIds,  // Envoyer tous les identifiants de classe
    semestre_id: this.selectedSemestreId
  })
  .then(response => {
    this.cancelConductForm();
    this.showSnackbar(response.data.message, 'success');  // Utiliser le message de succès de la réponse
  })
  .catch(error => {
    console.error('Erreur lors de l\'ajout des notes de conduite :', error.response ? error.response.data : error.message);
    this.showSnackbar(error.response?.data?.error || 'Erreur lors de l\'ajout des notes de conduite.', 'error');  // Afficher le message d'erreur approprié
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
          const data = response.data;
          if (typeof data === 'object') {
            this.classesByPromotion = data;
            this.classesOptions = Object.values(data).flat().map(classe => ({
              id: classe.id,
              name: classe.name
            }));
          } else {
            console.error('Format de données inattendu.');
          }
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
    confirmDeleteClass(classId) {
      if (confirm('Êtes-vous sûr de vouloir supprimer cette classe ?')) {
        this.deleteClass(classId);
      }
    },
    deleteClass(classId) {
      axios.delete(`http://localhost:8080/api/Classes/${classId}`)
        .then(response => {
          this.fetchClasses();
          this.showSnackbar(response.data.message, 'success');
        })
        .catch(error => {
          this.showSnackbar(error.response.data.error || 'Erreur lors de la suppression de la classe.', 'error');
        });
    },
    cancelForm() {
      this.newClassName = '';
      this.selectedPromotionId = null;
      this.editClassId = null;
      this.showForm = false;
    },
    cancelConductForm() {
      this.conductNote = '';
      this.selectedClassIds = [];
      this.showConductForm = false;
      this.selectedSemestreId = null;
    },
    showSnackbar(message, color) {
      this.snackbar.message = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },
    toggleProgram() {
      this.showProgram = !this.showProgram;
      if (this.showProgram) {
        this.showForm = false;
        this.showConductForm = false;
      }
    },
    goBack() {
      this.$emit('back');
    },
    navigateTo(route) {
      this.$emit('navigate', route);
    }
  },
  mounted() {
    this.fetchPromotions();
    this.fetchClasses();
    this.fetchSemestre();
  }
}
</script>

<style scoped>
.button-group {
  margin-bottom: 16px;
}

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
