<template>
    <v-container>
      <v-row>
        <v-col class="d-flex justify-center">
          <v-btn @click="showInscriptionForm = true" class="mx-2">Inscrire un Enseignant</v-btn>
          <v-btn @click="showDeleteForm = true" class="mx-2">Supprimer un Enseignant</v-btn>
          <v-btn @click="showAddForm = true" class="mx-2">Ajouter un Enseignant</v-btn>
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
              <v-btn type="submit" color="primary">Inscrire</v-btn>
              <v-btn @click="showInscriptionForm = false" color="secondary">Annuler</v-btn>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-alert v-if="generatedInfo" type="info" border="left">
              Nom d'utilisateur : {{ generatedInfo.username }}<br>
              Mot de passe : {{ generatedInfo.password }}
            </v-alert>
          </v-card-actions>
        </v-card>
      </v-dialog>
  
      <!-- Formulaire d'ajout -->
      <v-dialog v-model="showAddForm" max-width="600px">
        <v-card>
          <v-card-title>Ajouter un Enseignant</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="handleAdd">
              <v-autocomplete
                v-model="selectedTeacher"
                :items="teachers"
                item-text="name"
                item-value="id"
                label="Choisir Enseignant"
                required
              ></v-autocomplete>
              <v-text-field v-model="newTeacher.name" label="Nom" required></v-text-field>
              <v-text-field v-model="newTeacher.firstName" label="Prénom" required></v-text-field>
              <v-autocomplete
                v-model="selectedClasses"
                :items="classes"
                item-text="name"
                item-value="id"
                label="Classes"
                multiple
                required
              ></v-autocomplete>
              <v-autocomplete
                v-model="selectedSubjects"
                :items="subjects"
                item-text="name"
                item-value="id"
                label="Matières"
                multiple
                required
              ></v-autocomplete>
              <v-btn type="submit" color="primary">Ajouter</v-btn>
              <v-btn @click="showAddForm = false" color="secondary">Annuler</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-dialog>
  
      <!-- Formulaire de suppression -->
      <v-dialog v-model="showDeleteForm" max-width="600px">
        <v-card>
          <v-card-title>Supprimer un Enseignant</v-card-title>
          <v-card-text>
            <!-- Implémentez le formulaire de suppression ici -->
          </v-card-text>
          <v-card-actions>
            <v-btn @click="showDeleteForm = false" color="secondary">Fermer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </template>
  
  <script>
  export default {
    data() {
      return {
        showInscriptionForm: false,
        showAddForm: false,
        showDeleteForm: false,
        newTeacher: {
          name: '',
          firstName: ''
        },
        generatedInfo: null,
        teachers: [], // Doit être rempli avec les données des enseignants
        classes: [], // Doit être rempli avec les données des classes
        subjects: [], // Doit être rempli avec les données des matières
        selectedTeacher: null,
        selectedClasses: [],
        selectedSubjects: []
      }
    },
    methods: {
      handleInscription() {
        // Logique pour générer le nom d'utilisateur et le mot de passe
        this.generatedInfo = {
          username: this.newTeacher.name.toLowerCase() + '.' + this.newTeacher.firstName.toLowerCase(),
          password: Math.random().toString(36).slice(-8)
        };
        // Envoyer les informations au backend
        // Réinitialiser les champs du formulaire
        this.newTeacher.name = '';
        this.newTeacher.firstName = '';
        this.showInscriptionForm = false;
      },
      handleAdd() {
        // Logique pour ajouter l'enseignant
        // Envoyer les informations au backend
        // Réinitialiser les champs du formulaire
        this.newTeacher.name = '';
        this.newTeacher.firstName = '';
        this.selectedClasses = [];
        this.selectedSubjects = [];
        this.showAddForm = false;
      }
    },
    mounted() {
      // Charger les données des enseignants, classes et matières
      // this.teachers = ...
      // this.classes = ...
      // this.subjects = ...
    }
  }
  </script>
  
  <style scoped>
  .v-dialog {
    max-width: 90vw;
  }
  </style>
  