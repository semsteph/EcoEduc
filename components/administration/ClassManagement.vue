<template>
  <div class="container">
    <!-- Groupe de boutons principaux -->
    <div class="button-group" v-if="!activeForm && !showClasses">
      <v-btn block color="primary" @click="activateForm('addClass')">
        <v-icon start>mdi-plus</v-icon> Ajouter Classe
      </v-btn>
      <v-btn block :color="showClasses ? 'secondary' : 'primary'" @click="toggleClasses">
        <v-icon start>mdi-school</v-icon> Mes Classes
      </v-btn>
      <v-btn block :color="activeForm === 'program' ? 'secondary' : 'primary'" @click="activateForm('program')">
        <v-icon start>mdi-book-open-variant</v-icon> Programme
      </v-btn>
      <v-btn block color="primary" @click="activateForm('conduct')">
        <v-icon start>mdi-clipboard-text</v-icon> Note de conduite
      </v-btn>
    </div>


    <!-- Formulaire Ajouter Classe -->
    <v-card v-if="activeForm === 'addClass'" class="form-card">
      <v-form @submit.prevent="submitForm">
        <v-text-field
          v-model.number="numberOfClasses"
          label="Nombre de classes"
          type="number"
          min="1"
          dense
          prepend-inner-icon="mdi-counter"
          required
        ></v-text-field>

        <v-select
          v-model="selectedPromotionId"
          :items="promotions"
          item-title="nom"
          item-value="id"
          label="Promotion"
          prepend-inner-icon="mdi-timeline"
          dense
          required
        ></v-select>

        <v-select
          v-model="selectedCycle"
          :items="['Cycle 1', 'Cycle 2']"
          label="Cycle"
          prepend-inner-icon="mdi-repeat"
          dense
          required
        ></v-select>

        <div class="button-container">
          <v-btn color="primary" type="submit">
            <v-icon start>mdi-check</v-icon> Ajouter
          </v-btn>
          <v-btn color="grey" @click="cancelForm">
            <v-icon start>mdi-close</v-icon> Annuler
          </v-btn>
        </div>
      </v-form>
    </v-card>

    <!-- Formulaire Note de conduite -->
    <v-card v-if="activeForm === 'conduct'" class="form-card">
      <v-form @submit.prevent="submitConductForm">
        <v-text-field
          v-model="conductNote"
          label="Note de conduite"
          prepend-inner-icon="mdi-note-text"
          dense
          required
        ></v-text-field>

        <v-select
          v-model="selectedSemestreId"
          :items="semestresOptions"
          item-title="name"
          item-value="id"
          label="Semestre"
          prepend-inner-icon="mdi-calendar"
          dense
          required
        ></v-select>

        <v-select
          v-model="selectedClassIds"
          :items="classesOptions"
          item-title="name"
          item-value="id"
          label="Classes"
          prepend-inner-icon="mdi-account-multiple"
          dense
          multiple
          required
        ></v-select>

        <div class="button-container">
          <v-btn color="primary" type="submit">
            <v-icon start>mdi-check</v-icon> Ajouter
          </v-btn>
          <v-btn color="grey" @click="cancelForm">
            <v-icon start>mdi-close</v-icon> Annuler
          </v-btn>
        </div>
      </v-form>
    </v-card>

    <!-- Programme -->
    <div v-if="activeForm === 'program'">
      <Programme-cours :etablissement-id="etablissementId" :annee-scolaire="anneeScolaire" :annee-scolaire-id="anneeScolaireId"/>
      <v-btn class="mt-3" color="secondary" @click="cancelForm">
        <v-icon start>mdi-arrow-left</v-icon> Retour
      </v-btn>
    </div>

    <!-- Liste des classes -->
    <div v-if="showClasses && classesByPromotion && Object.keys(classesByPromotion).length > 0">
      <v-btn class="mt-3" color="secondary" @click="toggleClasses">
        <v-icon start>mdi-arrow-left</v-icon> Retour
      </v-btn>
      <div v-for="(classes, promotion) in classesByPromotion" :key="promotion">
        <h3 class="section-title">Promotion : {{ promotion }}</h3>
        <v-card v-for="classe in classes" :key="classe.id" class="class-card">
          <v-card-title class="class-title">
            <v-icon class="mr-2">mdi-school</v-icon>
            {{ classe.name }} ({{ classe.studentCount }} élèves)
          </v-card-title>
          <v-card-actions>
            <v-btn color="info" @click="editClass(classe)">
              <v-icon start>mdi-pencil</v-icon> Modifier
            </v-btn>
            <v-btn color="red" @click="confirmDeleteClass(classe.id)">
              <v-icon start>mdi-delete</v-icon> Supprimer
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
      <v-btn class="mt-3" color="secondary" @click="toggleClasses">
        <v-icon start>mdi-arrow-left</v-icon> Retour
      </v-btn>
    </div>

    <!-- Snackbar -->
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
    etablissementId: Number,
    etablissementNom: String,
    anneeScolaire: String,
    anneeScolaireId: Number
  },
  data() {
    return {
      activeForm: null,
      showClasses: false,
      numberOfClasses: 1,
      selectedPromotionId: null,
      selectedCycle: '',
      conductNote: '',
      selectedSemestreId: null,
      selectedClassIds: [],
      promotions: [],
      semestresOptions: [],
      classesOptions: [],
      classesByPromotion: {},
      editClassId: null,
      snackbar: {
        show: false,
        message: '',
        color: 'success'
      }
    };
  },
  methods: {
    activateForm(formName) {
      this.activeForm = this.activeForm === formName ? null : formName;
      this.showClasses = false;
    },
    cancelForm() {
      this.activeForm = null;
      this.showClasses = false;
      this.numberOfClasses = 1;
      this.selectedPromotionId = null;
      this.selectedCycle = '';
      this.conductNote = '';
      this.selectedSemestreId = null;
      this.selectedClassIds = [];
      this.editClassId = null;
    },
    toggleClasses() {
      this.showClasses = !this.showClasses;
      if (this.showClasses) this.fetchClasses();
      this.activeForm = null;
    },
    submitForm() {
      if (!this.selectedPromotionId || !this.selectedCycle || !this.numberOfClasses) {
        this.showSnackbar('Veuillez remplir tous les champs.', 'error');
        return;
      }

      const payload = {
        promotion_id: this.selectedPromotionId,
        cycle: this.selectedCycle,
        nombre: this.numberOfClasses,
        etablissement_id: this.etablissementId
      };

      axios.post('http://localhost:8080/api/Classes/multiple', payload)
        .then(() => {
          this.fetchClasses();
          this.cancelForm();
          this.showSnackbar('Classe(s) créée(s) avec succès.', 'success');
        })
        .catch(error => {
          console.error('Erreur lors de la création des classes :', error);
          this.showSnackbar('Erreur lors de la création des classes.', 'error');
        });
    },
    submitConductForm() {
      if (!this.conductNote || this.selectedClassIds.length === 0 || !this.selectedSemestreId) {
        this.showSnackbar('Veuillez remplir tous les champs.', 'error');
        return;
      }
      axios.post('http://localhost:8080/api/conduite', {
        note_conduite: this.conductNote,
        classe_ids: this.selectedClassIds,
        semestre_id: this.selectedSemestreId,
        etablissement_id: this.etablissementId,
        anneeScolaireId: this.anneeScolaireId
      })
      .then(() => {
        this.cancelForm();
        this.showSnackbar('Note de conduite ajoutée avec succès.', 'success');
      })
      .catch(error => {
        console.error('Erreur lors de l\'ajout de la note de conduite :', error);
        this.showSnackbar('Erreur lors de l\'ajout de la note de conduite.', 'error');
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
    fetchSemestre() {
      if (!this.etablissementId || isNaN(this.etablissementId)) return;
      axios.get(`http://localhost:8080/api/semesters/${this.etablissementId}`)
        .then(response => {
          const data = response.data;
          if (Array.isArray(data)) {
            this.semestresOptions = data.map(sem => ({ id: sem.id, name: sem.nom }));
          }
        })
        .catch(error => console.error('Erreur semestres :', error));
    },
    fetchClasses() {
      axios.get(`http://localhost:8080/api/classetablissement/${this.etablissementId}`)
        .then(response => {
          const data = response.data;
          if (typeof data === 'object' && data !== null) {
            this.classesByPromotion = data;
            this.classesOptions = Object.values(data).flat().map(cl => ({ id: cl.id, name: cl.name }));
          }
        })
        .catch(error => console.error('Erreur classes :', error));
    },
    editClass(classe) {
      this.numberOfClasses = 1;
      this.selectedPromotionId = classe.promotion_id;
      this.editClassId = classe.id;
      this.activeForm = 'addClass';
    },
    confirmDeleteClass(id) {
      if (confirm('Supprimer cette classe ?')) this.deleteClass(id);
    },
    deleteClass(id) {
      axios.delete(`http://localhost:8080/api/Classes/${id}`, {
        data: { etablissement_id: this.etablissementId }
      })
      .then(() => {
        this.fetchClasses();
        this.showSnackbar('Classe supprimée avec succès.', 'success');
      })
      .catch(() => {
        this.showSnackbar('Impossible de supprimer cette classe car elle contient au moins un élève.', 'error');
      });
    },
    showSnackbar(msg, color) {
      this.snackbar = { message: msg, color, show: true };
    }
  },
  mounted() {
    this.fetchClasses();
    this.fetchSemestre();
    this.fetchPromotions();
  }
};
</script>

<style scoped>
.container {
  padding: 16px;
  max-width: 1024px;
  margin: auto;
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin: 20px 0;
}

.form-card,
.class-card {
  padding: 16px;
  margin-top: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.button-container {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
}

.section-title {
  font-size: 1.6rem;
  font-weight: 600;
  margin-top: 24px;
  color: #3f51b5;
}

.class-title {
  font-size: 1.3rem;
  font-weight: 500;
  display: flex;
  align-items: center;
}

@media (max-width: 600px) {
  .button-group {
    flex-direction: column;
    gap: 8px;
  }
  .form-card,
  .class-card {
    padding: 8px;
    margin-top: 12px;
  }
  .section-title {
    font-size: 1.2rem;
    text-align: center;
  }
  .class-title {
    font-size: 1rem;
  }
  .v-btn {
    font-size: 0.75rem;
    padding: 4px 8px;
    min-height: 32px !important;
  }
  .v-icon {
    font-size: 18px !important;
  }
}

@media (min-width: 1200px) {
  .section-title {
    font-size: 1.8rem;
  }
  .class-title {
    font-size: 1.4rem;
  }
  .v-btn {
    font-size: 1rem;
  }
  .v-icon {
    font-size: 24px;
  }
}
</style>
