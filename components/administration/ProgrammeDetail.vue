<template>
  <v-container class="programme-container">
    <!-- Toolbar -->
    <v-toolbar flat class="programme-toolbar">
      <v-toolbar-title class="text-h6 text-md-h5">
        <v-icon left class="mr-2">mdi-calendar-clock</v-icon> Programme Hebdomadaire
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn color="primary" class="ma-1" @click="afficherFormulaire">
        <v-icon left>mdi-plus</v-icon> Ajouter
      </v-btn>
      <v-btn color="success" class="ma-1" @click="telechargerProgrammePDF">
        <v-icon left>mdi-download</v-icon> PDF
      </v-btn>
    </v-toolbar>

    <!-- Dialog Formulaire -->
    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>
          <v-icon left class="mr-2">mdi-calendar-plus</v-icon>
          <span class="headline">Ajouter un Programme</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="form">
            <v-text-field label="Classe" :value="classId" readonly dense></v-text-field>
            <v-select label="Jour" v-model="nouveauProgramme.jour" :items="joursDeLaSemaine" item-title="label" item-value="value" dense></v-select>
            <v-text-field label="Horaire" v-model="nouveauProgramme.horaire" dense></v-text-field>
            <v-select label="Matière" :items="matiereOptions" v-model="nouveauProgramme.matiereId" item-title="nom" item-value="id" dense></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="dialog = false">Annuler</v-btn>
          <v-btn color="primary" text @click="ajouterProgramme">Ajouter</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor">
      {{ snackbarMessage }}
      <v-btn color="white" text @click="snackbar = false">Fermer</v-btn>
    </v-snackbar>

    <!-- Tableau -->
    <div class="table-wrapper">
      <v-simple-table>
        <thead>
          <tr>
            <th class="matiere-header">Matières / Jours</th>
            <th v-for="j in joursDeLaSemaine" :key="j.value">{{ j.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="matiere in matieres" :key="matiere.id">
            <td class="matiere-cell">{{ matiere.nom }}</td>
            <td v-for="jour in joursDeLaSemaine" :key="jour.value" class="programme-cell">
              <div class="programme-content">
                <v-textarea
                  v-model="matiere[jour.value]"
                  label="Programme"
                  dense
                  hide-details
                  auto-grow
                  readonly
                  class="programme-textarea"
                ></v-textarea>
                <v-btn icon small @click="supprimerProgramme(matiere.id, jour.value)">
                  <v-icon color="red">mdi-delete</v-icon>
                </v-btn>
              </div>
            </td>
          </tr>
        </tbody>
      </v-simple-table>
    </div>
  </v-container>
</template>
<script>
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default {
  name: 'ProgrammeDetail',
  props: {
    classId: { type: Number, required: true },
    className: {type: String, required: true},
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
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
      matieres: [],
      matiereOptions: [],
      dialog: false,
      snackbar: false,
      snackbarMessage: '',
      snackbarColor: '',
      nouveauProgramme: {
        jour: '',
        horaire: '',
        matiereId: null,
      },
      joursDeLaSemaine: [
        { label: 'Lundi', value: 'lundi' },
        { label: 'Mardi', value: 'mardi' },
        { label: 'Mercredi', value: 'mercredi' },
        { label: 'Jeudi', value: 'jeudi' },
        { label: 'Vendredi', value: 'vendredi' },
      ],
    };
  },
  methods: {
    fetchMatieres() {
      axios
        .get(`http://localhost:8080/api/matiere/${this.classId}`)
        .then((response) => {
          this.matiereOptions = response.data;
        })
        .catch((error) => {
          console.error('Erreur lors de la récupération des matières:', error);
        });
    },
    fetchProgrammes() {
      axios
        .get(`http://localhost:8080/api/programmes/${this.classId}`)
        .then((response) => {
          this.matieres = this.mapProgrammesToMatieres(response.data);
        })
        .catch((error) => {
          console.error('Erreur lors de la récupération des programmes:', error);
        });
    },
    mapProgrammesToMatieres(programmes) {
      const matieres = this.matiereOptions.map((matiere) => ({
        id: matiere.id,
        nom: matiere.nom,
        lundi: '',
        mardi: '',
        mercredi: '',
        jeudi: '',
        vendredi: '',
      }));

      programmes.forEach((programme) => {
        const matiere = matieres.find((m) => m.id === programme.matière_id);
        if (matiere) {
          matiere[programme.jour.toLowerCase()] = programme.horaire;
        }
      });

      return matieres;
    },
    afficherFormulaire() {
      this.dialog = true;
    },
    ajouterProgramme() {
      const programmeData = {
        classId: this.classId,
        jour: this.nouveauProgramme.jour,
        horaire: this.nouveauProgramme.horaire,
        matiereId: this.nouveauProgramme.matiereId,
        etablissementId: this.etablissementId,
        anneeScolaireId:this.anneeScolaireId,
      };

      axios
        .post('http://localhost:8080/api/programme', programmeData)
        .then(() => {
          this.snackbarMessage = 'Programme ajouté avec succès';
          this.snackbarColor = 'success';
          this.snackbar = true;
          this.dialog = false;
          this.resetForm();
          this.fetchProgrammes();
        })
        .catch((error) => {
          this.snackbarMessage = `Erreur lors de l'ajout du programme: ${
            error.response?.data?.message || error.message
          }`;
          this.snackbarColor = 'error';
          this.snackbar = true;
        });
    },
    supprimerProgramme(matiereId, jour) {
      const programmeData = {
        classId: this.classId,
        matiereId: matiereId,
        jour: jour,
      };

      axios
        .delete('http://localhost:8080/api/programme', { data: programmeData })
        .then(() => {
          this.snackbarMessage = 'Programme supprimé avec succès';
          this.snackbarColor = 'success';
          this.snackbar = true;
          this.fetchProgrammes();
        })
        .catch((error) => {
          this.snackbarMessage = `Erreur lors de la suppression du programme: ${
            error.response?.data?.message || error.message
          }`;
          this.snackbarColor = 'error';
          this.snackbar = true;
        });
    },
    resetForm() {
      this.nouveauProgramme.jour = '';
      this.nouveauProgramme.horaire = '';
      this.nouveauProgramme.matiereId = null;
    },
    telechargerProgrammePDF() {
      const doc = new jsPDF();
      const columns = ['Matières / Jours', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
      const rows = this.matieres.map((matiere) => [
        matiere.nom,
        matiere.lundi || '',
        matiere.mardi || '',
        matiere.mercredi || '',
        matiere.jeudi || '',
        matiere.vendredi || '',
      ]);

      doc.text(`Programme Hebdomadaire - ${this.className}`, 14, 10);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 20,
      });

      doc.save(`programme_hebdomadaire_${this.className}.pdf`);
    },
  },
  created() {
    this.fetchMatieres();
    this.fetchProgrammes();
  },
};
</script>

<style scoped>
.programme-container {
  padding: 16px;
  max-width: 1000px;
  margin: auto;
}

.programme-toolbar {
  flex-wrap: wrap;
}

.table-wrapper {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 500px;
  border: 1px solid #ddd;
  background-color: #f5f5f5;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 16px;
}

thead th {
  background-color: #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 2;
  font-weight: bold;
  font-size: 0.85rem;
}

.programme-content {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px;
}

.programme-textarea {
  flex: 1;
  font-size: 0.8rem;
}

.matiere-header {
  text-align: left;
  font-weight: bold;
  width: 150px;
  font-size: 0.85rem;
}

@media (max-width: 600px) {
  .programme-toolbar .v-btn {
    font-size: 10px;
    min-width: 100px;
  }
  .v-toolbar-title {
    font-size: 14px !important;
  }
  thead th,
  .matiere-header {
    font-size: 10px !important;
  }
  .programme-textarea {
    font-size: 10px !important;
  }
  .programme-content {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
