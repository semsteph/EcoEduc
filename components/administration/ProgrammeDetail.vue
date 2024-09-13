<template>
  <v-container>
    <v-toolbar flat>
      <v-toolbar-title>Programme Hebdomadaire</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="afficherFormulaire">
        Ajouter Programme
      </v-btn>
    </v-toolbar>

    <!-- Formulaire d'ajout de programme -->
    <v-dialog v-model="dialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span class="headline">Ajouter un Programme</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="form">
            <v-text-field label="Classe" :value="classId" readonly></v-text-field>
            <v-select
              label="Jour"
              v-model="nouveauProgramme.jour"
              :items="joursDeLaSemaine"
              item-title="label"
              item-value="value"
            ></v-select>
            <v-text-field label="Horaire" v-model="nouveauProgramme.horaire"></v-text-field>
            <v-select
              label="Matière"
              :items="matiereOptions"
              v-model="nouveauProgramme.matiereId"
              item-title="nom"
              item-value="id"
            ></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="dialog = false">
            Annuler
          </v-btn>
          <v-btn color="blue darken-1" text @click="ajouterProgramme">
            Ajouter
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Messages de succès et d'échec -->
    <v-snackbar v-model="snackbar" :color="snackbarColor">
      {{ snackbarMessage }}
      <v-btn color="white" text @click="snackbar = false">Fermer</v-btn>
    </v-snackbar>

    <!-- Tableau des programmes -->
    <v-simple-table>
      <thead>
        <tr>
          <th>Matières / Jours</th>
          <th>Lundi</th>
          <th>Mardi</th>
          <th>Mercredi</th>
          <th>Jeudi</th>
          <th>Vendredi</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="matiere in matieres" :key="matiere.id">
          <td>{{ matiere.nom }}</td>
          <td>
            <v-layout>
              <v-btn icon small @click="supprimerProgramme(matiere.id, 'lundi')">
                <v-icon color="blue">mdi-delete</v-icon>
              </v-btn>
              <v-text-field 
                v-model="matiere.lundi" 
                label="Programme" 
                dense hide-details 
                readonly
              ></v-text-field>
            </v-layout>
          </td>
          <td>
            <v-layout>
              <v-btn icon small @click="supprimerProgramme(matiere.id, 'mardi')">
                <v-icon color="blue">mdi-delete</v-icon>
              </v-btn>
              <v-text-field 
                v-model="matiere.mardi" 
                label="Programme" 
                dense hide-details 
                readonly
              ></v-text-field>
            </v-layout>
          </td>
          <td>
            <v-layout>
              <v-btn icon small @click="supprimerProgramme(matiere.id, 'mercredi')">
                <v-icon color="blue">mdi-delete</v-icon>
              </v-btn>
              <v-text-field 
                v-model="matiere.mercredi" 
                label="Programme" 
                dense hide-details 
                readonly
              ></v-text-field>
            </v-layout>
          </td>
          <td>
            <v-layout>
              <v-btn icon small @click="supprimerProgramme(matiere.id, 'jeudi')">
                <v-icon color="blue">mdi-delete</v-icon>
              </v-btn>
              <v-text-field 
                v-model="matiere.jeudi" 
                label="Programme" 
                dense hide-details 
                readonly
              ></v-text-field>
            </v-layout>
          </td>
          <td>
            <v-layout>
              <v-btn icon small @click="supprimerProgramme(matiere.id, 'vendredi')">
                <v-icon color="blue">mdi-delete</v-icon>
              </v-btn>
              <v-text-field 
                v-model="matiere.vendredi" 
                label="Programme" 
                dense hide-details 
                readonly
              ></v-text-field>
            </v-layout>
          </td>
        </tr>
      </tbody>
    </v-simple-table>
  </v-container>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ProgrammeDetail',
  props: {
    classId: {
      type: Number,
      required: true,
    },
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
        { label: 'Vendredi', value: 'vendredi' }
      ],
    };
  },
  methods: {
    fetchMatieres() {
      axios.get(`http://localhost:8080/api/matieres/${this.classId}`)
        .then(response => {
          this.matiereOptions = response.data;
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des matières:', error);
        });
    },
    fetchProgrammes() {
      axios.get(`http://localhost:8080/api/programmes/${this.classId}`)
        .then(response => {
          this.matieres = this.mapProgrammesToMatieres(response.data);
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des programmes:', error);
        });
    },
    mapProgrammesToMatieres(programmes) {
      const matieres = this.matiereOptions.map(matiere => ({
        id: matiere.id,
        nom: matiere.nom,
        lundi: '',
        mardi: '',
        mercredi: '',
        jeudi: '',
        vendredi: '',
      }));

      programmes.forEach(programme => {
        const matiere = matieres.find(m => m.id === programme.matière_id);
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
      };
      
      axios.post('http://localhost:8080/api/programme', programmeData)
        .then(() => {
          this.snackbarMessage = 'Programme ajouté avec succès';
          this.snackbarColor = 'success';
          this.snackbar = true;
          this.dialog = false;
          this.resetForm();
          this.fetchProgrammes(); // Actualise les programmes après l'ajout
        })
        .catch(error => {
          this.snackbarMessage = `Erreur lors de l'ajout du programme: ${error.response?.data?.message || error.message}`;
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

      axios.delete('http://localhost:8080/api/programme', { data: programmeData })
        .then(() => {
          this.snackbarMessage = 'Programme supprimé avec succès';
          this.snackbarColor = 'success';
          this.snackbar = true;
          this.fetchProgrammes(); // Actualise les programmes après la suppression
        })
        .catch(error => {
          this.snackbarMessage = `Erreur lors de la suppression du programme: ${error.response?.data?.message || error.message}`;
          this.snackbarColor = 'error';
          this.snackbar = true;
        });
    },
    resetForm() {
      this.nouveauProgramme.jour = '';
      this.nouveauProgramme.horaire = '';
      this.nouveauProgramme.matiereId = null;
    },
  },
  created() {
    this.fetchMatieres();
    this.fetchProgrammes();
  },
};
</script>

<style scoped>
.v-simple-table {
  margin-top: 20px;
}

.v-text-field {
  margin: 10px;
  width: 150px;
}

thead th, tbody td {
  padding: 16px;
  text-align: center;
}

.v-dialog {
  padding: 20px;
}

.v-toolbar-title {
  font-size: 24px;
}

.v-select {
  margin-top: 10px;
}

.v-snackbar {
  max-width: 300px;
}

.v-layout {
  align-items: center;
  justify-content: center;
}

.v-btn {
  margin-right: 8px;
}
</style>
