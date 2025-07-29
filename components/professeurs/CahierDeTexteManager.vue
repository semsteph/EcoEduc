<template>
  <v-card>
    <v-card-title>Cahier de Texte</v-card-title>
    <v-card-text>
      <v-btn color="primary" @click="$emit('back')" class="mb-4">Retour</v-btn>

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

      <v-toolbar flat class="mt-4">
        <v-toolbar-title>Activités</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn @click="openAddActivityDialog" color="primary">Ajouter une activité</v-btn>
      </v-toolbar>

      <v-data-table
        :headers="tableHeaders"
        :items="currentActivities"
        class="elevation-1 mt-3"
        item-key="id"
      >
        <template v-slot:item.actions="{ item }">
          <v-btn color="red" @click="openHideActivityDialog(item)">Masquer</v-btn>
        </template>
      </v-data-table>
    </v-card-text>

    <!-- Dialog pour ajouter une activité -->
    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title><span>Ajouter une Activité</span></v-card-title>
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

    <!-- Snackbar messages -->
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
    classeId: String,
    subjectId: String,
    etablissementId: Number,
    anneeScolaire: String,
    anneeScolaireId: Number,
  },
  data() {
    return {
      dialog: false,
      hideDialog: false,
      successMessage: false,
      errorMessage: false,
      currentSemester: '',
      semesters: [],
      activities: {},
      activityToHide: null,
      newActivity: {
        classeId: this.classeId,
        matiereId: this.subjectId,
        teacherId: '',
        date: '',
        horaire: '',
        activite: '',
      },
      tableHeaders: [
  { title: 'Date', value: 'dateFormatted' },
  { title: 'Horaire', value: 'horaire' },
  { title: 'Activité', value: 'activite' },
  { title: 'Actions', value: 'actions', sortable: false },
],

    };
  },
  computed: {
    teacherId() {
      return this.$route.query.id;
    },
    currentActivities() {
      return (this.activities[this.currentSemester] || []).filter(a => !a.hidden);
    },
  },
  methods: {
    getButtonColor(nom) {
      return this.currentSemester === nom ? 'primary' : 'secondary';
    },
    changeSemester(nom) {
      this.currentSemester = nom;
      this.fetchNotesData();
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
    openHideActivityDialog(activity) {
      this.activityToHide = activity;
      this.hideDialog = true;
    },
    closeHideDialog() {
      this.hideDialog = false;
      this.activityToHide = null;
    },
    async fetchSemesters() {
      try {
        const response = await axios.get(`http://localhost:8080/api/semesters/${this.etablissementId}`);
        this.semesters = response.data;

        if (this.semesters.length > 0) {
          this.currentSemester = this.semesters[0].nom;
          this.fetchNotesData();
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des semestres :', error);
      }
    },
 async fetchNotesData() {
  try {
    const response = await axios.get(`http://localhost:8080/api/getActivities/${this.classeId}/${this.subjectId}/${this.anneeScolaireId}`);
    this.activities = {};

    if (response.data) {
      response.data.forEach(activity => {
        const semesterName = this.semesters.find(s => s.id === activity.semestre_id)?.nom;
        if (!this.activities[semesterName]) {
          this.activities[semesterName] = [];
        }

        // Garder la vraie date brute pour le tri
        activity.originalDate = new Date(activity.date);

        // Formater une version affichable sans écraser la vraie date
        activity.dateFormatted = this.formatDate(activity.date);

        activity.hidden = false;
        this.activities[semesterName].push(activity);
      });

      // Trier chaque liste par date décroissante (du plus récent au plus ancien)
      for (const semester in this.activities) {
        this.activities[semester].sort((a, b) => new Date(b.originalDate) - new Date(a.originalDate));
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement des activités :', error);
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
          anneeScolaireId: this.anneeScolaireId,
        };

        try {
          await axios.post('http://localhost:8080/api/addActivity', newActivity);
          this.successMessage = true;
          this.closeDialog();
          await this.fetchNotesData();
        } catch (error) {
          this.errorMessage = true;
          console.error('Erreur lors de l\'ajout de l\'activité :', error.response?.data || error);
        }
      }
    },
    hideActivity() {
      if (this.activityToHide) {
        this.activityToHide.hidden = true;
        this.successMessage = true;
        this.closeHideDialog();
      }
    },
    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    },
  },
  mounted() {
    this.fetchSemesters();
  },
};
</script>



<style scoped>
.table-container {
  display: flex;
  flex-direction: column;
}
.v-data-table {
  border-radius: 8px;
  background-color: #fff;
}
.v-data-table-header th {
  background-color: #3f51b5;
  color: white;
}
.v-btn--active {
  font-weight: bold;
}
</style>
