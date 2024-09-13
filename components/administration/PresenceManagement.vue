<template>
  <div>
    <v-btn icon @click="$emit('back')">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>
    <v-card color="blue lighten-4" v-if="!selectedClassId">
      <v-card-title>Gestion de Présence</v-card-title>
      <v-card-text>
        <v-row>
          <v-col
            v-for="classe in classes"
            :key="classe.id"
            cols="12"
            md="4"
          >
            <v-card
              class="ma-2"
              outlined
              @click="goToClass(classe.id)"
            >
              <v-card-title>{{ classe.nom }}</v-card-title>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
    <!-- Affiche le composant enfant si une classe est sélectionnée -->
    <ClassDetail v-else :class-id="selectedClassId" @back="clearSelection" />
  </div>
</template>

<script>
import axios from 'axios';
import ClassDetail from './ClassDetail.vue';

export default {
  name: 'PresenceManagement',
  components: {
    ClassDetail,
  },
  data() {
    return {
      classes: [],
      selectedClassId: null,
    };
  },
  methods: {
    fetchClasses() {
      axios.get('http://localhost:8080/api/classe')
        .then(response => {
          this.classes = response.data;
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des classes:', error);
        });
    },
    goToClass(classId) {
      this.selectedClassId = classId;
    },
    clearSelection() {
      this.selectedClassId = null;
    }
  },
  created() {
    this.fetchClasses();
  }
}
</script>
