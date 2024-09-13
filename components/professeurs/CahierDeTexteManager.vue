<template>
  <v-card>
    <v-card-title>Cahier de Texte</v-card-title>
    <v-card-text>
      <v-tabs v-model="selectedTerm" background-color="deep-purple accent-4" dark>
        <v-tab v-for="term in terms" :key="term.id">{{ term.name }}</v-tab>
      </v-tabs>

      <v-tabs-items v-model="selectedTerm">
        <v-tab-item v-for="term in terms" :key="term.id">
          <div class="table-container" v-if="activities[term.name] && activities[term.name].length">
            <div class="table-header">
              <div class="table-title">Date</div>
              <div class="table-title">Horaire</div>
              <div class="table-title">Activité</div>
            </div>
            <div v-for="(item, index) in activities[term.name]" :key="item.id" class="table-row">
              <v-text-field :value="formatDate(item.date)" outlined dense readonly></v-text-field>
              <v-text-field v-model="item.horaire" outlined dense readonly></v-text-field>
              <v-textarea v-model="item.activite" outlined rows="2" dense readonly></v-textarea>
            </div>
          </div>
          
          <v-toolbar flat>
            <v-spacer></v-spacer>
            <v-btn @click="openAddActivityDialog(term.name)" color="primary">
              Ajouter une activité
            </v-btn>
          </v-toolbar>
        </v-tab-item>
      </v-tabs-items>
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

    <!-- Messages de succès et d'erreur -->
    <v-snackbar v-model="successMessage" color="green" top right timeout="3000">
      Activité ajoutée avec succès !
    </v-snackbar>
    <v-snackbar v-model="errorMessage" color="red" top right timeout="3000">
      Erreur lors de l'ajout de l'activité.
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
  },
  data() {
    return {
      selectedTerm: 0,
      dialog: false,
      successMessage: false,
      errorMessage: false,
      terms: [
        { id: 5, name: 'Semestre1' },
        { id: 6, name: 'Semestre2' },
      ],
      activities: {}, // Utiliser un objet pour gérer les activités par semestre
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
  },
  methods: {
    openAddActivityDialog(termName) {
      if (!this.classeId || !this.subjectId || !this.teacherId) {
        this.errorMessage = 'Veuillez vérifier que tous les champs sont remplis.';
        return;
      }

      this.dialog = true;
      this.newActivity.termName = termName;
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
    async addActivity() {
  if (this.$refs.form.validate()) {
    try {
      const response = await axios.post('http://localhost:8080/api/addActivity', {
        classId: this.newActivity.classeId,
        subjectId: this.newActivity.matiereId,
        teacherId: this.newActivity.teacherId,
        termName: this.terms[this.selectedTerm].name,
        date: this.newActivity.date,
        hours: this.newActivity.horaire,
        activity: this.newActivity.activite,
      });

      // Vérifiez si le tableau d'activités existe déjà
      if (!this.activities[this.terms[this.selectedTerm].name]) {
        this.activities[this.terms[this.selectedTerm].name] = []; // Utilisez l'assignation directe
      }

      // Ajoutez la nouvelle activité au tableau
      this.activities[this.terms[this.selectedTerm].name].push(response.data);

      this.successMessage = true;
      this.closeDialog();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'activité :', error);
      this.errorMessage = true;
    }
  }
},
    formatDate(date) {
      const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      return new Date(date).toLocaleDateString('fr-FR', options);
    },
  },
  async mounted() {
  try {
    const response = await axios.get(`http://localhost:8080/api/getActivities/${this.classeId}/${this.subjectId}`);

    if (response.data) {
      response.data.forEach(activity => {
        const termName = this.terms.find(term => term.id === activity.semestre_id)?.name;

        // Vérifiez si le tableau d'activités existe déjà
        if (!this.activities[termName]) {
          this.activities[termName] = []; // Utilisez l'assignation directe
        }

        // Ajoutez l'activité au tableau
        this.activities[termName].push(activity);
      });
    }
  } catch (error) {
    console.error('Erreur lors du chargement des activités :', error);
  }
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
