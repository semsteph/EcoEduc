<template>
  <div>
    <!-- Boutons de gestion des classes -->
    <div class="button-group">
      <v-btn color="primary" @click="showForm = true" v-if="!showProgram && !showConductForm && !showSemesterForm">Ajouter Classe</v-btn>
      <v-btn color="primary" @click="toggleClasses" v-if="!showProgram && !showConductForm && !showSemesterForm">Mes Classes</v-btn>
      <v-btn @click="toggleProgram" :color="showProgram ? 'secondary' : 'primary'">Programme</v-btn>
      <v-btn color="primary" @click="showConductForm = true" v-if="!showProgram && !showForm && !showSemesterForm">Note de conduite</v-btn>
      <v-btn color="primary" @click="showSemesterForm = true" v-if="!showProgram && !showForm && !showConductForm">Ajouter Semestre/Trimestre</v-btn>
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

    <!-- Formulaire pour ajouter un semestre/trimestre -->
    <v-card v-if="showSemesterForm" class="pa-4 mt-4">
      <v-form @submit.prevent="submitSemester">
        <v-text-field v-model="newSemesterName" label="Nom du semestre/trimestre" required></v-text-field>
        <div class="d-flex justify-space-between mt-4">
          <v-btn color="primary" type="submit">Ajouter</v-btn>
          <v-btn @click="cancelSemesterForm">Annuler</v-btn>
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

    <!-- Liste des classes par promotion, affichée après le clic sur "Mes Classes" -->
    <div v-if="showClasses && classesByPromotion && Object.keys(classesByPromotion).length > 0">
      <div v-for="(classes, promotion) in classesByPromotion" :key="promotion">
        <h3>Promotion : {{ promotion }}</h3>
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
    <Programme-cours v-if="showProgram" :etablissement-id="etablissementId"/>

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
  props: {
    etablissementId: {
      type: Number,
      required: true
    },
    etablissementNom: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      classesByPromotion: {},
      showClasses: false, // Variable pour gérer l'affichage des classes
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
      showProgram: false,
      showSemesterForm: false, // Ajouté pour gérer l'affichage du formulaire de semestre
      newSemesterName: '' // Ajouté pour le nom du semestre
    };
  },
  methods: {
    submitForm() {
      console.log(this.etablissementId);
      const url = this.editClassId
        ? `http://localhost:8080/api/Classes/${this.editClassId}`
        : 'http://localhost:8080/api/Classes'; // URL pour la création (POST) sans l'ID de l'établissement dans l'URL
      const method = this.editClassId ? 'put' : 'post';

      axios[method](url, {
        nom: this.newClassName,
        promotion_id: this.selectedPromotionId,
        etablissement_id: this.etablissementId // Ajouter l'ID de l'établissement dans le corps de la requête
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
    toggleClasses() {
      this.showClasses = !this.showClasses;
      if (this.showClasses) {
        this.fetchClasses(); // Récupérer les classes
      }
    },
    submitSemester() {
      if (!this.newSemesterName) {
        this.showSnackbar('Le nom du semestre/trimestre est requis.', 'error');
        return;
      }

      axios.post('http://localhost:8080/api/semestres', {
        nom: this.newSemesterName,
        etablissement_id: this.etablissementId
      })
      .then(response => {
        this.fetchSemestre();
        this.cancelSemesterForm();
        this.showSnackbar(response.data.message || 'Semestre/Trimestre ajouté avec succès.', 'success');
      })
      .catch(error => {
        console.error('Erreur lors de l\'ajout du semestre/trimestre :', error);
        this.showSnackbar('Erreur lors de l\'ajout du semestre/trimestre.', 'error');
      });
    },

    fetchSemestre() {
      // Assurez-vous que l'ID de l'établissement est défini et est un nombre
      if (!this.etablissementId || isNaN(this.etablissementId)) {
        console.error('ID de l\'établissement non défini ou invalide.');
        return;
      }

      // Envoyer l'ID de l'établissement à l'API
      axios.get(`http://localhost:8080/api/semesters/${this.etablissementId}`)
        .then(response => {
          const data = response.data;
          if (Array.isArray(data)) {  // Vérifier si les données sont un tableau
            this.semestresOptions = data.map(semestre => ({
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
        classe_ids: this.selectedClassIds,
        semestre_id: this.selectedSemestreId,
        etablissement_id: this.etablissementId // Ajouter l'ID de l'établissement dans la requête
      })
      .then(() => {
        this.cancelConductForm();
        this.showSnackbar('Note de conduite ajoutée avec succès.', 'success');
      })
      .catch(error => {
        console.error('Erreur lors de l\'ajout de la note de conduite :', error);
        this.showSnackbar('Erreur lors de l\'ajout de la note de conduite.', 'error');
      });
    },

    cancelForm() {
      this.showForm = false;
      this.newClassName = '';
      this.selectedPromotionId = null;
      this.editClassId = null; // Réinitialiser l'ID de la classe à éditer
    },

    cancelSemesterForm() {
      this.showSemesterForm = false;
      this.newSemesterName = '';
    },

    cancelConductForm() {
      this.showConductForm = false;
      this.conductNote = '';
      this.selectedClassIds = [];
      this.selectedSemestreId = null; // Réinitialiser l'ID du semestre sélectionné
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
  axios.get(`http://localhost:8080/api/classetablissement/${this.etablissementId}`)
    .then(response => {
      const data = response.data;

      if (typeof data === 'object' && data !== null) {
        console.log('Données de la réponse :', data);
        this.classesByPromotion = data;
        
        // Extraire les options de classes pour le formulaire
        this.classesOptions = Object.values(data).flat().map(classe => ({
          id: classe.id,
          name: classe.name
        }));
      } else {
        console.error('Les données récupérées ne sont pas dans le format attendu', data);
        this.classesByPromotion = {};
      }
    })
    .catch(error => {
      console.error('Erreur lors de la récupération des classes :', error);
    });
},



    groupByPromotion(classes) {
      return classes.reduce((acc, classe) => {
        const promotionName = classe.promotion.nom; // Supposons que 'promotion' est une propriété de 'classe'
        if (!acc[promotionName]) {
          acc[promotionName] = [];
        }
        acc[promotionName].push(classe);
        return acc;
      }, {});
    },

    showSnackbar(message, color) {
      this.snackbar.message = message;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },

    toggleProgram() {
      this.showProgram = !this.showProgram;
    },

    confirmDeleteClass(classId) {
      const confirmed = confirm('Êtes-vous sûr de vouloir supprimer cette classe ?');
      if (confirmed) {
        this.deleteClass(classId);
      }
    },

    deleteClass(classId) {
      axios.delete(`http://localhost:8080/api/Classes/${classId}`, {
        data: {
          etablissement_id: this.etablissementId
        }
      })
      .then(() => {
        this.fetchClasses();
        this.showSnackbar('Classe supprimée avec succès.', 'success');
      })
      .catch(error => {
        console.error('Erreur lors de la suppression de la classe :', error);
        this.showSnackbar('Impossible de supprimer cette classe car elle contient aumoins un eleve.', 'error');
      });
    },
    editClass(classe) {
      this.newClassName = classe.nom;
      this.selectedPromotionId = classe.promotion_id; // Assurez-vous que 'promotion_id' existe
      this.editClassId = classe.id; // Enregistrer l'ID de la classe pour la mise à jour
      this.showForm = true;
    }
  },
  mounted() {
    this.fetchClasses();
    this.fetchSemestre(); // Assurez-vous d'appeler cette méthode ici
    this. fetchPromotions()  ;        // Fetch promotions if necessary, e.g. this.fetchPromotions();
  }
};
</script>


<style scoped>
.button-group {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px; /* Espace entre les boutons */
  margin: 20px 0; /* Espacement par rapport au haut et au bas */
  height: 200px; /* Ajustez la hauteur pour centrer verticalement */
}
</style>
