<template>
  <v-container>
    <h1>Programme de l'élève - {{ trimestre }}</h1>

    <!-- Boutons pour sélectionner les trimestres -->
    <div class="trimestre-buttons">
      <v-btn @click="trimestre = 'trimestre1'" :class="{'active': trimestre === 'trimestre1'}" class="trimestre1">Trimestre 1</v-btn>
      <v-btn @click="trimestre = 'trimestre2'" :class="{'active': trimestre === 'trimestre2'}" class="trimestre2">Trimestre 2</v-btn>
      <v-btn @click="trimestre = 'trimestre3'" :class="{'active': trimestre === 'trimestre3'}" class="trimestre3">Trimestre 3</v-btn>
    </div>

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
  data() {
    return {
      trimestre: 'trimestre1', // Trimestre par défaut
      jours: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
      matieres: ['Mathématiques', 'Français', 'Physique', 'Histoire'], // Liste des matières
      horairesParTrimestre: {
        trimestre1: {
          'Lundi': {
            'Mathématiques': ['08:00 - 10:00'],
            'Français': ['10:00 - 12:00'],
            'Physique': ['14:00 - 16:00'],
            'Histoire': ['16:00 - 18:00']
          },
          'Mardi': {
            'Mathématiques': ['08:00 - 10:00'],
            'Français': ['10:00 - 12:00'],
            'Physique': ['14:00 - 16:00'],
            'Histoire': ['16:00 - 18:00']
          },
          // Ajoutez les horaires pour les autres jours
        },
        trimestre2: {
          'Lundi': {
            'Mathématiques': ['15:00 - 17:00'],
            'Français': ['09:00 - 11:00'],
            'Physique': ['13:00 - 15:00'],
            'Histoire': ['11:00 - 13:00']
          },
          'Mardi': {
            'Mathématiques': ['15:00 - 17:00'],
            'Français': ['09:00 - 11:00'],
            'Physique': ['13:00 - 15:00'],
            'Histoire': ['11:00 - 13:00']
          },
          // Ajoutez les horaires pour les autres jours
        },
        trimestre3: {
          'Lundi': {
            'Mathématiques': ['10:00 - 12:00'],
            'Français': ['12:00 - 14:00'],
            'Physique': ['08:00 - 10:00'],
            'Histoire': ['14:00 - 16:00']
          },
          'Mardi': {
            'Mathématiques': ['10:00 - 12:00'],
            'Français': ['12:00 - 14:00'],
            'Physique': ['08:00 - 10:00'],
            'Histoire': ['14:00 - 16:00']
          },
          // Ajoutez les horaires pour les autres jours
        }
      }
    };
  },
  computed: {
    programmeFiltre() {
      // Retourne les horaires du trimestre sélectionné
      return this.horairesParTrimestre[this.trimestre] || {};
    }
  },
  methods: {
    getHoraires(jour, matiere) {
      // Récupérer les horaires pour un jour et une matière donnés
      const horaires = this.programmeFiltre[jour] && this.programmeFiltre[jour][matiere]
        ? this.programmeFiltre[jour][matiere]
        : [];
      return horaires;
    }
  }
};
</script>

<style scoped>
.trimestre-buttons {
  margin-bottom: 20px;
}
.trimestre-buttons .v-btn {
  margin-right: 10px;
}
.trimestre-buttons .v-btn.active {
  color: white;
  font-weight: bold;
}
.trimestre1.active {
  background-color: #007bff; /* Bleu pour Trimestre 1 */
}
.trimestre2.active {
  background-color: #28a745; /* Vert pour Trimestre 2 */
}
.trimestre3.active {
  background-color: #dc3545; /* Rouge pour Trimestre 3 */
}
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
