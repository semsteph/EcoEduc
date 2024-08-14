<template>
  <div>
    <h1>Notes pour le :</h1>
    
    <!-- Boutons pour sélectionner les trimestres -->
    <div class="trimestre-buttons">
      <v-btn @click="trimestre = 'trimestre1'" :class="{ 'active': trimestre === 'trimestre1', 'trimestre1': trimestre === 'trimestre1' }">Trimestre 1</v-btn>
      <v-btn @click="trimestre = 'trimestre2'" :class="{ 'active': trimestre === 'trimestre2', 'trimestre2': trimestre === 'trimestre2' }">Trimestre 2</v-btn>
      <v-btn @click="trimestre = 'trimestre3'" :class="{ 'active': trimestre === 'trimestre3', 'trimestre3': trimestre === 'trimestre3' }">Trimestre 3</v-btn>
    </div>
    
    <!-- Tableau des notes -->
    <table>
      <thead>
        <tr>
          <th>Matière</th>
          <th>Coefficient</th>
          <th colspan="4">Interrogations</th>
          <th>Moyenne Interrogations</th>
          <th colspan="2">Devoirs</th>
          <th>Moyenne Générale</th>
          <th>Rang</th>
        </tr>
        <tr>
          <th></th>
          <th></th>
          <th>N°1</th>
          <th>N°2</th>
          <th>N°3</th>
          <th>N°4</th>
          <th></th>
          <th>N°1</th>
          <th>N°2</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in formattedNotes" :key="item.matiere">
          <td>{{ item.matiere }}</td>
          <td>{{ item.coefficient }}</td>
          <td>{{ item.note_inter_1 }}</td>
          <td>{{ item.note_inter_2 }}</td>
          <td>{{ item.note_inter_3 }}</td>
          <td>{{ item.note_inter_4 }}</td>
          <td>{{ item.moy_Inter }}</td>
          <td>{{ item.note_devoir_1 }}</td>
          <td>{{ item.note_devoir_2 }}</td>
          <td>{{ item.moy_gen }}</td>
          <td>{{ item.rang }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Bouton de retour -->
    <v-btn color="primary" @click="$emit('back')">Retour</v-btn>
  </div>
 
  

</template>
<script>
export default {
  props: ['studentId'],
  data() {
    return {
      notes: [], // Initialisez avec les données des notes
      studentName: '', // Initialisez avec le nom de l'élève
      trimestre: 'trimestre1', // Trimestre par défaut
       currentView: 'notes'
    };
  },

  computed: {
    formattedNotes() {
      const formatted = {};
      const seenNoteInterIds = new Set(); // Ensemble pour suivre les IDs de notes déjà vues
      const seenNoteDevoirIds = new Set();

      // Filtrer les notes selon le trimestre sélectionné
      const notesForTrimestre = this.notes.filter(note => note.trimestre === this.trimestre);

      notesForTrimestre.forEach(note => {
        if (!formatted[note.matiere]) {
          formatted[note.matiere] = {
            matiere: note.matiere,
            coefficient: null,
            note_inter_1: null,
            note_inter_2: null,
            note_inter_3: null,
            note_inter_4: null,
            moy_Inter: null,
            note_devoir_1: null,
            note_devoir_2: null,
            moy_gen: null,
            rang: null,
          };
        }

        if (note.note_inter && !seenNoteInterIds.has(note.note_inter_id)) {
          // Vérifier si la note a déjà été ajoutée
          seenNoteInterIds.add(note.note_inter_id);
          if (!formatted[note.matiere].note_inter_1) {
            formatted[note.matiere].note_inter_1 = note.note_inter;
          } else if (!formatted[note.matiere].note_inter_2) {
            formatted[note.matiere].note_inter_2 = note.note_inter;
          } else if (!formatted[note.matiere].note_inter_3) {
            formatted[note.matiere].note_inter_3 = note.note_inter;
          } else if (!formatted[note.matiere].note_inter_4) {
            formatted[note.matiere].note_inter_4 = note.note_inter;
          }
        }

        if (note.note_devoir && !seenNoteDevoirIds.has(note.note_devoir_id)) {
          seenNoteDevoirIds.add(note.note_devoir_id);
          if (!formatted[note.matiere].note_devoir_1) {
            formatted[note.matiere].note_devoir_1 = note.note_devoir;
          } else if (!formatted[note.matiere].note_devoir_2) {
            formatted[note.matiere].note_devoir_2 = note.note_devoir;
          }
        }

        if (note.coef) {
          if (!formatted[note.matiere].coefficient) {
            formatted[note.matiere].coefficient = note.coef;
          }
        }
      });

      // Calcul des moyennes d'interrogations et de devoirs
      Object.values(formatted).forEach(item => {
        const totalInterrogations = [item.note_inter_1, item.note_inter_2, item.note_inter_3, item.note_inter_4].filter(Boolean);
        const totalDevoirs = [item.note_devoir_1, item.note_devoir_2].filter(Boolean);

        if (totalInterrogations.length > 0) {
          const sumInterrogations = totalInterrogations.reduce((acc, val) => acc + val, 0);
          item.moy_Inter = sumInterrogations / totalInterrogations.length;
        }

        if (totalDevoirs.length > 0) {
          const sumDevoirs = totalDevoirs.reduce((acc, val) => acc + val, 0);
          item.moy_gen = ((item.moy_Inter + sumDevoirs) / 3).toFixed(2); // Exemple de calcul de la moyenne générale
        }
      });

      return Object.values(formatted);
    },
  },
  goBack() {
      this.currentView = 'notes';
      this.selectedChild = 'default' ;
      this.currentView = null; // Assurez-vous de définir ce qui est 'default' ou retour à la vue principale.

    },
}
</script>
<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: center;
}
th {
  background-color: #f4f4f4;
}
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
.trimestre1 {
  background-color: #007bff; /* Bleu pour Trimestre 1 */
}
.trimestre2 {
  background-color: #28a745; /* Vert pour Trimestre 2 */
}
.trimestre3 {
  background-color: #dc3545; /* Rouge pour Trimestre 3 */
}
.trimestre-buttons .v-btn.active {
  background-color: #333; /* Couleur active neutre */
  color: white;
}
.back-button {
  margin-top: 20px;
}
</style>
