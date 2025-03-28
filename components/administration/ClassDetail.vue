<template>
  <div>
    <v-btn icon @click="$emit('back')">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>
    <v-card color="light-blue lighten-4" v-if="!selectedStudentId">
      <v-card-title>Liste des Élèves</v-card-title>
      <v-card-text>
        <v-row>
          <template v-if="eleves.length > 0">
            <v-col
              v-for="eleve in eleves"
              :key="eleve.id"
              cols="12"
              md="4"
            >
              <v-card
                class="ma-2"
                outlined
                @click="selectStudent(eleve.id)"
              >
                <v-card-title>{{ eleve.prenom }} {{ eleve.nom }}</v-card-title>
              </v-card>
            </v-col>
          </template>
          <template v-else>
            <v-col cols="12">
              <v-alert type="info" color="info" border="left">
                Aucun élève n'est encore inscrit dans la classe sélectionnée. 
                Veuillez aller dans la Gestion des classes pour inscrire des élèves dans cette classe.
              </v-alert>
            </v-col>
          </template>
        </v-row>
      </v-card-text>
    </v-card>
      <ChildComponent v-else :studentId="selectedStudentId"   :annee-scolaire="anneeScolaire"
      :annee-scolaire-id="anneeScolaireId" :etablissement-id="etablissementId" @back="clearSelection"/>
    </div>
  </template>
  
  <script>
  import axios from 'axios';
  import ChildComponent from './ChildComponent.vue';
  
  export default {
    name: 'ClassDetail',
    components: {
      ChildComponent,
    },
    props: {
      classId: {
        type: Number,
        required: true,
      },
      etablissementId: {
      type: Number,
      required: true
    },
    etablissementNom: {
      type: String,
      required: true
    },
    anneeScolaire: {
      type: String,
      required: true
    },
    anneeScolaireId: {
      type: Number,
      required: true
    }
    },
    data() {
      return {
        eleves: [],
        selectedStudentId: null,
      };
    },
    methods: {
      fetchStudents() {
        axios.get(`http://localhost:8080/api/eleves/${this.classId}`)
          .then(response => {
            this.eleves = response.data;
          })
          .catch(error => {
            console.error('Erreur lors de la récupération des élèves:', error);
          });
      },
      selectStudent(studentId) {
        this.selectedStudentId = studentId;
      },
    },
    clearSelection() {
      this.selectedClassId = null;
    },
    created() {
      this.fetchStudents();
    },
    
  };
  </script>
  