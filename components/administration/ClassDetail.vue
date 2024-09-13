<template>
    <div>
      <v-btn icon @click="$emit('back')">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <v-card color="light-blue lighten-4" v-if="!selectedStudentId">
        <v-card-title>Liste des Élèves</v-card-title>
        <v-card-text>
          <v-row>
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
          </v-row>
        </v-card-text>
      </v-card>
      <ChildComponent v-else :studentId="selectedStudentId" @back="clearSelection"/>
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
  