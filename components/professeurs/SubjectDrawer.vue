<template>
    <v-navigation-drawer app v-model="drawer" permanent>
      <v-list dense>
        <v-list-item
          v-for="subject in subjects"
          :key="subject.id"
          @click="selectSubject(subject.id)"
        >
          <v-list-item-content>{{ subject.name }}</v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </template>
  
  <script>
  export default {
    name: 'SubjectDrawer',
    data() {
      return {
        drawer: true,
        subjects: [
          { id: 1, name: 'Mathématiques' },
          { id: 2, name: 'Physique' },
          { id: 3, name: 'Chimie' },
          // Ajouter d'autres matières ici
        ]
      }
    },
    methods: {
      selectSubject(id) {
        this.$emit('subject-selected', id);
      }
    }
  }
  </script>
  