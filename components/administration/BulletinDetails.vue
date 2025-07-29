<template>
  <div class="container">
    <h1 class="title">
      <v-icon left class="mr-2">mdi-account-group</v-icon>
      Liste des élèves
    </h1>

    <!-- Bouton de sauvegarde globale -->
    <div v-if="eleves.length > 0" class="sauvegarde-global">
      <button @click="sauvegarderTousLesBulletins" class="save-all-btn">
        <v-icon left class="mr-1">mdi-content-save</v-icon>
        Sauvegarder les bulletins
      </button>
    </div>

    <div v-if="eleves.length === 0">
      <p class="no-data">
        <v-icon left class="mr-1" color="red">mdi-alert-circle-outline</v-icon>
        Aucune donnée disponible pour cette classe ou aucun élève n'est encore inscrit.
      </p>
    </div>

    <div v-else>
      <div class="classe-title">
        <h2>
          <v-icon left class="mr-2">mdi-school</v-icon>
          Classe : {{ classeNomLocal }}
        </h2>
      </div>

      <div v-for="eleve in eleves" :key="eleve.id" class="eleve-item">
        <div class="eleve-header" @click="toggleEleve(eleve.id)">
          <span>
            <v-icon left class="mr-1">mdi-account</v-icon>
            {{ eleve.nom }} {{ eleve.prenom }}
          </span>
          <v-icon>{{ activeEleve === eleve.id ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </div>

        <div v-if="activeEleve === eleve.id" class="eleve-details">
          <div class="eleve-info">
            <button class="save-btn">
              <v-icon left class="mr-1">mdi-content-save</v-icon>
              Sauvegarder
            </button>
            <h3>Détails de l'élève</h3>
            <p><strong>Nom :</strong> {{ eleve.nom }}</p>
            <p><strong>Prénom :</strong> {{ eleve.prenom }}</p>
            <p><strong>Classe :</strong> {{ classeNomLocal }}</p>
          </div>

          <div>
            <label>Semestres :</label>
            <div class="semestres">
              <button
                v-for="semestre in semestres"
                :key="semestre.id"
                class="semestre-btn"
                :class="{ active: selectedSemestreParEleve[eleve.id] === semestre.id }"
                @click="selectSemestre(eleve.id, semestre.id)"
              >
                <v-icon left small class="mr-1">mdi-calendar-range</v-icon>
                {{ semestre.nom }}
              </button>
            </div>
          </div>

          <!-- Bloc v-if / v-else corrigé -->
          <div class="notes-wrapper">
            <template
              v-if="selectedSemestreParEleve[eleve.id] &&
                     notes[selectedSemestreParEleve[eleve.id]] &&
                     notes[selectedSemestreParEleve[eleve.id]][eleve.id]"
            >
              <table class="notes-table">
                <thead>
                  <tr>
                    <th>Matières</th>
                    <th>Coef</th>
                    <th>Moy</th>
                    <th>Moy Coef</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="note in notes[selectedSemestreParEleve[eleve.id]][eleve.id].moyennes"
                    :key="note.matiereId"
                  >
                    <td>{{ getMatiereNom(note.matiereId) }}</td>
                    <td>{{ note.coefficient ?? 'N/A' }}</td>
                    <td>{{ note.moy ?? 'N/A' }}</td>
                    <td>{{ note.moycoef ?? 'N/A' }}</td>
                  </tr>

                  <tr v-if="notes[selectedSemestreParEleve[eleve.id]][eleve.id].moyenne_semestrielle">
                    <td colspan="2">Moyenne Semestrielle:</td>
                    <td colspan="2">
                      {{ notes[selectedSemestreParEleve[eleve.id]][eleve.id].moyenne_semestrielle }}
                    </td>
                  </tr>

                  <tr v-if="notes[selectedSemestreParEleve[eleve.id]][eleve.id].rang">
                    <td colspan="2">Rang:</td>
                    <td colspan="2">{{ notes[selectedSemestreParEleve[eleve.id]][eleve.id].rang }}</td>
                  </tr>

                  <tr v-if="notes[selectedSemestreParEleve[eleve.id]][eleve.id].mention">
                    <td colspan="2">Mention:</td>
                    <td colspan="2">{{ notes[selectedSemestreParEleve[eleve.id]][eleve.id].mention }}</td>
                  </tr>

                  <tr v-if="notes[selectedSemestreParEleve[eleve.id]][eleve.id].moyenne_annuelle">
                    <td colspan="2">Moyenne Annuelle:</td>
                    <td colspan="2">{{ notes[selectedSemestreParEleve[eleve.id]][eleve.id].moyenne_annuelle }}</td>
                  </tr>

                  <tr v-if="notes[selectedSemestreParEleve[eleve.id]][eleve.id].decision">
                    <td colspan="2">Décision:</td>
                    <td colspan="2">{{ notes[selectedSemestreParEleve[eleve.id]][eleve.id].decision }}</td>
                  </tr>
                </tbody>
              </table>
            </template>

            <p v-else class="no-data">
              <v-icon left color="red" class="mr-1">mdi-close-circle-outline</v-icon>
              Aucune note disponible pour cet élève dans le semestre sélectionné.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- DIALOG -->
    <v-dialog v-model="dialog" max-width="400">
      <v-card>
        <v-card-title class="headline">
          <v-icon left class="mr-2">mdi-information-outline</v-icon>
          {{ dialogTitle }}
        </v-card-title>
        <v-card-text>{{ message }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="closeDialog">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
import axios from 'axios';
export default {
  props: {
    classId: { type: Number, required: true },
    classeNom: { type: String, required: true },
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true }
  },
  data() {
    return {
      eleves: [],
      semestres: [],
      matieres: [],
      notes: {},
      activeEleve: null,
      classeNomLocal: this.classeNom,
      message: '',
      dialog: false,
      dialogTitle: '',
      selectedSemestreParEleve: {}
    };
  },
  methods: {
    async fetchBulletinData() {
      try {
        const response = await axios.get('http://localhost:8080/api/bulletin', {
          params: {
            classeId: this.classId,
            etablissementId: this.etablissementId,
            anneeScolaireId: this.anneeScolaireId
          }
        });
        const { semestres, matieres, notes, classeNom } = response.data;
        this.semestres = semestres || [];
        this.matieres = matieres || [];
        this.notes = notes || {};
        this.classeNomLocal = classeNom || 'Inconnue';

        this.eleves = Object.values(notes).flatMap(semestreNotes =>
          Object.values(semestreNotes)
        ).reduce((acc, eleve) => {
          if (!acc.find(item => item.id === eleve.eleveId)) {
            acc.push({ id: eleve.eleveId, nom: eleve.nom, prenom: eleve.prenom });
          }
          return acc;
        }, []);

        if (this.semestres.length > 0) {
          const premierSemestreId = this.semestres[0].id;
          this.eleves.forEach(eleve => {
            this.selectedSemestreParEleve[eleve.id] = premierSemestreId;
          });
        }

        if (this.eleves.length === 0) {
          this.message = "Aucun élève trouvé dans cette classe.";
          this.dialogTitle = 'Information';
          this.dialog = true;
        }
      } catch (error) {
        this.message = "Erreur lors de la récupération des données.";
        this.dialogTitle = 'Erreur';
        this.dialog = true;
      }
    },

    toggleEleve(eleveId) {
      this.activeEleve = this.activeEleve === eleveId ? null : eleveId;
    },

    selectSemestre(eleveId, semestreId) {
      this.selectedSemestreParEleve = {
        ...this.selectedSemestreParEleve,
        [eleveId]: semestreId
      };
    },

    getMatiereNom(matiereId) {
      const matiere = this.matieres.find(m => m.id === matiereId);
      return matiere ? matiere.nom : 'Inconnue';
    },
    async sauvegarderTousLesBulletins() {
  try {
    for (const semestre of this.semestres) {
      const semestreId = semestre.id;

      for (const eleve of this.eleves) {
        const eleveId = eleve.id;
        const bulletin = this.notes[semestreId]?.[eleveId];

        if (bulletin) {
          const toutesLesNotes = bulletin.moyennes || [];

          const noteConduite = toutesLesNotes.find(n => n.matiereId === 'conduite');
          const conduite = noteConduite ? noteConduite.moy : null;

          const notesSansConduite = toutesLesNotes.filter(n => n.matiereId !== 'conduite');

          const payload = {
            eleveId,
            classeId: this.classId,
            etablissementId: this.etablissementId,
            anneeScolaireId: this.anneeScolaireId,
            semestreId,
            notes: notesSansConduite,
            moyenneSemestrielle: bulletin.moyenne_semestrielle,
            moyenneAnnuelle: bulletin.moyenne_annuelle,
            rang: bulletin.rang,
            mention: bulletin.mention,
            decision: bulletin.decision,
            conduite: conduite
          };

          try {
            await axios.post('http://localhost:8080/api/sauvegarde-bulletin', payload);
          } catch (err) {
            const apiError = err.response?.data;

            // Cas où on a les noms des matières manquantes
            if (apiError?.matieresManquantes?.length > 0) {
              const noms = apiError.matieresManquantes.map(m => m.nom).join(', ');
              this.message = `Impossible de sauvegarder le bulletin pour ${eleve.nom} (${eleveId}) :\nLes matières suivantes n'ont pas de moyenne : ${noms}`;
            } else {
              this.message = `Erreur pour ${eleve.nom} (${eleveId}) : ${apiError?.error || 'Erreur inconnue'}`;
            }

            this.dialogTitle = "Erreur lors de la sauvegarde";
            this.dialog = true;
            return;
          }
        }
      }
    }

    this.message = "Tous les bulletins ont été sauvegardés avec succès.";
    this.dialogTitle = "Succès";
    this.dialog = true;
  } catch (error) {
    this.message = "Une erreur inattendue est survenue.";
    this.dialogTitle = "Erreur globale";
    this.dialog = true;
    console.error(error);
  }
},

    closeDialog() {
      this.dialog = false;
      this.message = '';
    }
  },
  mounted() {
    this.fetchBulletinData();
  }
};
</script>




<style scoped>
.container {
  font-family: 'Arial', sans-serif;
  padding: 20px;
  max-width: 1000px;
  margin: auto;
  overflow-x: hidden;
}
.title {
  font-size: 1.8rem;
  margin-bottom: 20px;
}
.eleve-item {
  border: 1px solid #007BFF;
  margin-bottom: 20px;
  border-radius: 10px;
  background-color: #E3F2FD;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.eleve-header {
  padding: 15px;
  cursor: pointer;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.eleve-details {
  padding: 20px;
}
.eleve-info {
  margin-bottom: 20px;
}
.semestres {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}
.semestre-btn {
  background-color: #007BFF;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 10px 14px;
  cursor: pointer;
}
.semestre-btn.active {
  background-color: #0056b3;
}
.notes-wrapper {
  overflow-x: auto;
  width: 100%;
  max-width: 100%;
  margin-bottom: 15px;
}
.notes-table {
  width: 100%;
  border-collapse: collapse;
}
.notes-table th, .notes-table td {
  border: 1px solid #007BFF;
  padding: 10px;
  text-align: center;
}
.total-row {
  font-weight: bold;
}
.save-btn {
  margin-top: 10px;
  padding: 10px 20px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.save-btn:hover {
  background-color: #218838;
}
.no-data {
  color: red;
  font-weight: bold;
  display: flex;
  align-items: center;
}
.save-all-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}
.save-all-btn:hover {
  background-color: #45a049;
}

/* Responsiveness */
@media (max-width: 600px) {
  .container {
    padding: 10px;
  }
  h1, h2, h3 {
    font-size: 1.1rem;
  }
  .semestre-btn,
  .save-btn,
  .save-all-btn {
    padding: 6px 8px;
    font-size: 0.75rem;
  }
  .notes-table th,
  .notes-table td {
    padding: 6px;
    font-size: 0.75rem;
  }
  .eleve-header {
    font-size: 0.95rem;
  }
  .no-data {
    font-size: 0.9rem;
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>