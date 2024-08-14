<template>
    <div>
      <v-container>
        <v-row>
          <v-col v-for="detail in details" :key="detail.label" cols="12" md="6">
            <v-card @click="selectDetail(detail.label)">
              <v-card-title>{{ detail.label }}</v-card-title>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        details: [
          { label: 'Inscription' },
          { label: 'Consulté Punition' },
          { label: 'Consulté Présence' },
          { label: 'Consulté Note' },
          { label: 'Gestion Bulletin' },
          { label: 'Gestion Scolarité' }
        ]
      };
    },
    methods: {
      selectDetail(label) {
        this.$emit('selectDetail', label);
      }
    }
  }
  </script>
  