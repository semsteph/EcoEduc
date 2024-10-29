<template>
  <v-card>
    <v-card-title>Cahier de Texte</v-card-title>
    <v-card-text>
      <!-- Sélection des semestres -->
      <v-row>
        <v-col v-for="semester in semesters" :key="semester.id" cols="auto">
          <v-btn
            :color="getButtonColor(semester.nom)"
            @click="changeSemester(semester.nom)"
            :class="{ 'v-btn--active': currentSemester === semester.nom }"
          >
            {{ semester.nom }}
          </v-btn>
        </v-col>
      </v-row>

      <div class="table-container" v-if="currentActivities.length">
        <div class="table-header">
          <div class="table-title">Date</div>
          <div class="table-title">Horaire</div>
          <div class="table-title">Activité</div>
          <div class="table-title">Actions</div>
        </div>
        <div
          v-for="(item, index) in currentActivities"
          :key="item.id"
          class="table-row"
          v-show="!item.hidden"
        >
          <v-text-field :value="formatDate(item.date)" outlined dense readonly></v-text-field>
          <v-text-field v-model="item.horaire" outlined dense readonly></v-text-field>
          <v-textarea v-model="item.activite" outlined rows="2" dense readonly></v-textarea>
          <v-btn color="red" @click="openHideActivityDialog(item)">
            Masquer
          </v-btn>
        </div>
      </div>

      <v-toolbar flat>
        <v-spacer></v-spacer>
        <v-btn @click="openAddActivityDialog" color="primary">
          Ajouter une activité
        </v-btn>
      </v-toolbar>
    </v-card-text>

    <!-- Dialog pour ajouter une activité -->
    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title>
          <span>Ajouter une Activité</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="form">
            <v-text-field v-model="newActivity.classeId" label="Classe" readonly></v-text-field>
            <v-text-field v-model="newActivity.matiereId" label="Matière" readonly></v-text-field>
            <v-text-field v-model="newActivity.teacherId" label="Enseignant" readonly></v-text-field>
            <v-text-field v-model="newActivity.date" type="date" label="Date" outlined></v-text-field>
            <v-text-field v-model="newActivity.horaire" label="Horaire" outlined></v-text-field>
            <v-textarea v-model="newActivity.activite" label="Activité" outlined rows="4"></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="addActivity" color="primary">Ajouter</v-btn>
          <v-btn @click="closeDialog">Annuler</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog de confirmation pour masquer une activité -->
    <v-dialog v-model="hideDialog" max-width="400px">
      <v-card>
        <v-card-title>Confirmer le masquage</v-card-title>
        <v-card-text>
          Êtes-vous sûr de vouloir masquer cette activité ?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="hideActivity">Oui</v-btn>
          <v-btn @click="closeHideDialog">Non</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Messages de succès et d'erreur -->
    <v-snackbar v-model="successMessage" color="green" top right timeout="3000">
      Action réalisée avec succès !
    </v-snackbar>
    <v-snackbar v-model="errorMessage" color="red" top right timeout="3000">
      Erreur lors de l'action.
    </v-snackbar>
  </v-card>
</template>

<script>
import axios from 'axios';

export default {
  name: 'CahierDeTexteManager',
  props: {
    classeId: {
      type: String,
      required: true,
    },
    subjectId: {
      type: String,
      required: true,
    },
    etablissementId: { // Ajout de la prop pour recevoir l'ID de l'établissement
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      dialog: false,
      hideDialog: false,
      successMessage: false,
      errorMessage: false,
      currentSemester: '',
      semesters: [],
      activities: {}, // Stockage des activités triées par semestre
      activityToHide: null,
      newActivity: {
        classeId: this.classeId,
        matiereId: this.subjectId,
        teacherId: '', // Sera rempli automatiquement
        date: '',
        horaire: '',
        activite: '',
      },
    };
  },
  computed: {
    teacherId() {
      return this.$route.query.id;
    },
    currentActivities() {
      return this.activities[this.currentSemester] || [];
    },
  },
  methods: {
    getButtonColor(semester) {
      return this.currentSemester === semester ? 'primary' : 'secondary';
    },

    changeSemester(semester) {
      this.currentSemester = semester;
      this.fetchNotesData(); // Charger les données pour le semestre sélectionné
    },
    openAddActivityDialog() {
      if (!this.classeId || !this.subjectId || !this.teacherId) {
        this.errorMessage = 'Veuillez vérifier que tous les champs sont remplis.';
        return;
      }

      this.dialog = true;
      this.newActivity.teacherId = this.teacherId;
    },
    closeDialog() {
      this.dialog = false;
      this.resetForm();
    },
    openHideActivityDialog(activity) {
      this.activityToHide = activity;
      this.hideDialog = true;
    },
    closeHideDialog() {
      this.hideDialog = false;
      this.activityToHide = null;
    },
    resetForm() {
      this.newActivity = {
        classeId: this.classeId,
        matiereId: this.subjectId,
        teacherId: this.teacherId,
        date: '',
        horaire: '',
        activite: '',
      };
    },
    async fetchSemesters() {
      try {
        const response = await axios.get(`http://localhost:8080/api/semesters/${this.etablissementId}`);
        this.semesters = response.data;

        // Sélectionner le premier semestre par défaut
        if (this.semesters.length > 0) {
          this.currentSemester = this.semesters[0].nom;
          this.fetchNotesData();
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des semestres', error);
      }
    },
    async addActivity() {
  if (this.$refs.form.validate()) {
    const newActivity = {
      teacherId: this.newActivity.teacherId,
      subjectId: this.newActivity.matiereId,
      activity: this.newActivity.activite,
      date: this.newActivity.date,
      hours: this.newActivity.horaire,
      classId: this.newActivity.classeId,
      semesterName: this.currentSemester,
      etablissementId: this.etablissementId,
    };

    try {
      const response = await axios.post('http://localhost:8080/api/addActivity', newActivity);
      console.log('Activité ajoutée avec succès:', response.data);
      this.successMessage = true;
      this.closeDialog();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'activité:', error.response.data);
    }
  }
},


    hideActivity() {
      if (this.activityToHide) {
        // Masquer l'activité en réglant sa propriété "hidden" sur true
        this.activityToHide.hidden = true;
        this.successMessage = true;
        this.closeHideDialog();
      }
    },
    formatDate(date) {
      const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      return new Date(date).toLocaleDateString('fr-FR', options);
    },
    async fetchNotesData() {
      try {
        const response = await axios.get(`http://localhost:8080/api/getActivities/${this.classeId}/${this.subjectId}`);

        this.activities = {};

        if (response.data) {
          response.data.forEach(activity => {
            const semesterName = this.semesters.find(semester => semester.id === activity.semestre_id)?.nom;

            if (!this.activities[semesterName]) {
              this.activities[semesterName] = [];
            }

            // Ajouter une propriété "hidden" pour gérer la visibilité
            activity.hidden = false;
            this.activities[semesterName].push(activity);
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des activités :', error);
      }
    },
  },
  async mounted() {
    this.fetchSemesters();
  }
};
</script>

<style scoped>
.table-container {
  display: flex;
  flex-direction: column;
}
.table-header {
  display: flex;
  flex-direction: row;
  background-color: #ddd;
  padding: 8px;
}
.table-title {
  flex: 1;
  text-align: left;
}
.table-row {
  display: flex;
  flex-direction: row;
  margin-bottom: 8px;
}
.table-row v-text-field,
.table-row v-textarea {
  flex: 1;
  margin-right: 8px;
}
</style>
