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

    <!-- Ajout d'un bouton "Back" pour revenir -->
    <v-btn @click="goBack" v-if="selectedDetail" color="secondary">Retour</v-btn>
  </div>
</template>

<script>
export default {
  data() {
    return {
      details: [
        { label: 'Notes' },
        { label: 'Conduite' },
        { label: 'Présence' },
        { label: 'Programme' },
        { label: 'Scolarité' },
        { label: 'Activité' },
        { label: 'Bulletin' },
        { label: 'Demande de Permission' },
        { label: 'Assistances' }
      ],
      selectedDetail: null, // Garde la trace du détail sélectionné
    };
  },
  methods: {
    // Méthode pour émettre l'événement de sélection du détail
    selectDetail(label) {
      this.selectedDetail = label;
      this.$emit('selectDetail', label); // Émettre un événement avec le label sélectionné
    },

    // Méthode pour revenir en arrière
    goBack() {
      this.selectedDetail = null; // Réinitialise la sélection
      this.$emit('goBack'); // Émettre un événement pour indiquer le retour
    }
  }
}
</script>
