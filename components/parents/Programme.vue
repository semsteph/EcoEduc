<template>
  <v-container>
    <h1>Programme de l'élève</h1>

    <!-- Tableau à double entrée -->
    <v-simple-table class="tableau-programme">
      <thead>
        <tr>
          <th>Jours</th>
          <th v-for="matiere in matieres" :key="matiere">{{ matiere }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="jour in jours" :key="jour">
          <td>{{ jour }}</td>
          <td v-for="matiere in matieres" :key="matiere">
            <div v-for="horaire in getHoraires(jour, matiere)" :key="horaire">
              {{ horaire }}
            </div>
          </td>
        </tr>
      </tbody>
    </v-simple-table>

    <!-- Bouton de retour -->
    <v-btn color="primary" @click="$emit('back')" class="back-button">Retour</v-btn>
  </v-container>
</template>

<script>
export default {
  props: {
    childId: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      jours: [], // Liste des jours récupérés depuis l'API
      matieres: [], // Liste des matières récupérées depuis l'API
      programme: {} // Contiendra les jours, horaires et matières récupérés
    };
  },
  mounted() {
    this.recupererProgramme(); // Charger le programme au montage du composant
  },
  methods: {
    async recupererProgramme() {
      try {
        // Appel API pour récupérer le programme selon l'ID de l'élève
        const response = await fetch(`http://localhost:8080/api/programme/${this.childId}`);
        const data = await response.json();

        // Récupération des jours, matières et horaires depuis la réponse API
        this.jours = data.jours;
        this.matieres = data.matieres;
        this.programme = data.programme; // Contiendra les horaires par jour et matière
      } catch (error) {
        console.error('Erreur lors de la récupération du programme:', error);
      }
    },
    getHoraires(jour, matiere) {
      // Récupérer les horaires pour un jour et une matière donnés
      return this.programme[jour] && this.programme[jour][matiere]
        ? this.programme[jour][matiere]
        : [];
    }
  }
};
</script>

<style scoped>
.tableau-programme th, .tableau-programme td {
  border: 1px solid #ddd; /* Bordures entre les cellules */
  padding: 8px; /* Espacement interne des cellules */
  text-align: center; /* Alignement du texte au centre */
}
.tableau-programme th {
  background-color: #f4f4f4; /* Couleur de fond pour les en-têtes */
}
.back-button {
  display: block;
  margin: 20px auto 0; /* Centrer le bouton et le placer en bas */
}
</style>
