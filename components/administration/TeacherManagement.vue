<template>
  <v-container>
    <v-row>
      <v-col class="d-flex justify-center">
        <v-btn @click="showInscriptionForm = true" class="mx-2">Inscrire un Enseignant</v-btn>
        <v-btn @click="showAddForm = true" class="mx-2">Ajouter un Enseignant</v-btn>
        <v-btn @click="showAddSubjectForm = true" class="mx-2">Ajouter Matière</v-btn>
      </v-col>
    </v-row>

    <!-- Formulaire d'inscription -->
    <v-dialog v-model="showInscriptionForm" max-width="600px">
      <v-card>
        <v-card-title>Inscrire un Enseignant</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="handleInscription">
            <v-text-field v-model="newTeacher.name" label="Nom" required></v-text-field>
            <v-text-field v-model="newTeacher.firstName" label="Prénom" required></v-text-field>
            <v-text-field v-model="newTeacher.email" label="Email" type="email" required></v-text-field>
            <v-text-field v-model="newTeacher.phone" label="Téléphone" type="tel" required></v-text-field>
            <v-btn type="submit" color="primary">Inscrire</v-btn>
            <v-btn @click="showInscriptionForm = false" color="secondary">Annuler</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Formulaire d'ajout d'enseignant -->
    <v-dialog v-model="showAddForm" max-width="600px">
      <v-card>
        <v-card-title>Ajouter un Enseignant</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="handleAdd">
            <v-autocomplete
              v-model="selectedTeacher"
              :items="teachers"
              item-title="fullname"
              item-value="id"
              label="Enseignant"
              required
            ></v-autocomplete>
            <v-autocomplete
              v-model="selectedClass"
              :items="classes"
              item-title="nom"
              item-value="id"
              label="Classe"
              required
            ></v-autocomplete>
            <v-autocomplete
              v-model="selectedSubject"
              :items="subjects"
              item-title="nom"
              item-value="id"
              label="Matière"
              required
            ></v-autocomplete>
            <v-autocomplete
              v-model="selectedCoefficient"
              :items="coefficient"
              item-title="valeur"
              item-value="id"
              label="Coefficient"
              required
            ></v-autocomplete>
            <v-btn type="submit" color="primary">Ajouter</v-btn>
            <v-btn @click="showAddForm = false" color="secondary">Annuler</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Formulaire d'ajout de matière -->
    <v-dialog v-model="showAddSubjectForm" max-width="400px">
      <v-card>
        <v-card-title>Ajouter une Matière</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="handleAddSubject">
            <v-text-field v-model="newSubject.name" label="Nom de la matière" required></v-text-field>
            <v-btn type="submit" color="primary">Ajouter</v-btn>
            <v-btn @click="showAddSubjectForm = false" color="secondary">Annuler</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <div class="mt-16 d-flex justify-center">
      <v-col cols="12" md="4">
        <v-card @click="navigateTo('CahierDeTexte')" color="lime lighten-4">
          <v-card-title>Gestion des Cahiers de Texte</v-card-title>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card @click="navigateTo('MesEnseignants')" color="lime lighten-4">
          <v-card-title>Mes Enseignants</v-card-title>
        </v-card>
      </v-col>
    </div>

    <component :is="currentComponent" @component-selected="currentComponent = $event"></component>
  </v-container>
</template>


<script>

import MesEnseignants from './MesEnseignants.vue';
import CahierDeTexte from './CahierDeTexte.vue';
import axios from 'axios';

export default {
  components: {
    MesEnseignants,
    CahierDeTexte,
  },
  data() {
    return {
      drawer: false,
      showInscriptionForm: false,
      showAddForm: false,
      showAddSubjectForm: false, // Formulaire d'ajout de matière
      newTeacher: {
        name: '',
        firstName: '',
        email: '',
        phone: '',
        username: '',
        password: ''
      },
      newSubject: {
        name: '' // Nouveau champ pour ajouter une matière
      },
      generatedInfo: null,
      teachers: [],
      classes: [],
      subjects: [],
      coefficient: [],
      selectedTeacher: null,
      selectedClass: null,
      selectedSubject: null,
      selectedCoefficient: null,
      currentComponent: 'default',
    };
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      try {
        const [teachersRes, classesRes, subjectsRes, coefficientRes] = await Promise.all([
          axios.get('http://localhost:8080/api/Enseignants'),
          axios.get('http://localhost:8080/api/classe'),
          axios.get('http://localhost:8080/api/Matieres'),
          axios.get('http://localhost:8080/api/Coefficient')
        ]);
        this.teachers = teachersRes.data.map(teacher => ({
          id: teacher.id,
          fullname: `${teacher.nom} ${teacher.prenom}`
        }));
        this.classes = classesRes.data;
        this.subjects = subjectsRes.data;
        this.coefficient = coefficientRes.data;
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    },
    async handleInscription() {
      try {
        this.newTeacher.username = this.generateUsername(this.newTeacher.name, this.newTeacher.firstName);
        this.newTeacher.password = this.generatePassword();

        const response = await axios.post('http://localhost:8080/api/Enseignants', this.newTeacher);

        console.log('Teacher registered:', response.data);
        this.generatedInfo = { username: this.newTeacher.username, password: this.newTeacher.password };

        this.newTeacher.name = '';
        this.newTeacher.firstName = '';
        this.newTeacher.email = '';
        this.newTeacher.phone = '';
        this.newTeacher.username = '';
        this.newTeacher.password = '';
        this.showInscriptionForm = false;

      } catch (error) {
        console.error('Error during registration:', error.response ? error.response.data : error.message);
      }
    },
    async handleAdd() {
      try {
        const data = {
          teacherId: this.selectedTeacher,
          class: this.selectedClass,
          subject: this.selectedSubject,
          coefficient: this.selectedCoefficient
        };
        const response = await axios.post('http://localhost:8080/api/Enseignants/add', data);
        console.log('Teacher added:', response.data);

        this.selectedTeacher = null;
        this.selectedClass = null;
        this.selectedSubject = null;
        this.selectedCoefficient = null;
        this.showAddForm = false;

      } catch (error) {
        console.error('Error adding teacher:', error.response ? error.response.data : error.message);
      }
    },
    async handleAddSubject() {
      try {
        const response = await axios.post('http://localhost:8080/api/Matieres', {
          name: this.newSubject.name
        });
        console.log('Subject added:', response.data);

        this.newSubject.name = '';
        this.showAddSubjectForm = false;
        this.fetchData(); // Rafraîchir la liste des matières

      } catch (error) {
        console.error('Error adding subject:', error.response ? error.response.data : error.message);
      }
    },
    generateUsername(name, firstName) {
      const randomNum = Math.floor(Math.random() * 1000);
      return `${name.toLowerCase()}.${firstName.toLowerCase()}${randomNum}`;
    },
    generatePassword() {
      return Math.random().toString(36).slice(-8);
    },
    navigateTo(component) {
      this.currentComponent = component;
    },
  }
};
</script>


<style scoped>
.v-dialog {
  max-width: 90vw;
}
</style>
