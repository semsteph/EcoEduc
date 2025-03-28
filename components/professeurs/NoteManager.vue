<template>
  <v-app>
    <v-btn block color="primary" @click="$emit('back')">Retour</v-btn>
    <v-container fluid>
      <!-- Sélection des semestres -->
       <h1>Cahier de notes</h1>
      <v-row>
        <v-col
          v-for="semester in semesters"
          :key="semester.id"
          cols="auto"
        >
          <v-btn
            :color="getButtonColor(semester.nom)"
            @click="changeSemester(semester.nom)"
            :class="{ 'v-btn--active': currentSemester === semester.nom }"
          >
            {{ semester.nom }}
          </v-btn>
        </v-col>
      </v-row>

      <!-- Bouton de génération et téléchargement des fichiers Excel -->
      <v-row class="my-4" justify="center">
        <v-col cols="12" md="4">
          <v-btn block color="green darken-1" @click="generateExcelFile">
            Generer  un fichier Excel
          </v-btn>
        </v-col>
        <!-- Bouton de génération et téléchargement des fichiers Excel -->
        <v-col cols="12" md="4">
          <v-btn block color="green darken-1" @click="openImportForm2">
            Renseigner les notes 
          </v-btn>
        </v-col>

      </v-row>

      

      <v-spacer class="my-4"></v-spacer>

      <!-- Tableau de données des étudiants -->
      <v-data-table
        :headers="headers"
        :items="students"
        :search="search"
        class="elevation-1 responsive-table"
        :items-per-page="10"
        dense
      >
        <template v-slot:top>
          <v-toolbar flat class="responsive-toolbar">
            <v-toolbar-title>Cahier de note</v-toolbar-title>
            <span class="responsive-text">{{ matiereNom }} - {{ currentSemester }}</span>
            <v-spacer></v-spacer>
            <v-btn color="blue darken-1" @click="openImportForm1">Valider les notes</v-btn>
            <v-btn color="red darken-1" @click="saveNotes">Sauvegarder</v-btn>
          </v-toolbar>
        </template>

        <!-- Affichage des noms des étudiants -->
        <template v-slot:item.studentName="{ item }">
          <span>{{ item.nom }} {{ item.prenom }}</span>
        </template>

        <!-- Affichage des notes récupérées -->
        <template v-slot:item.inter1="{ item }">
          <div class="note-container">
            <span>{{ item.inter1 ? item.inter1 : '' }}</span>
            <v-icon v-if="item.inter1" class="delete-icon" @click="confirmDelete(item, 'Inter1')">mdi-delete</v-icon>
          </div>
        </template>
        <template v-slot:item.inter2="{ item }">
        <div class="note-container">
           <span>{{ item.inter2 ? item.inter2 : '' }}</span>
           <v-icon v-if="item.inter2" class="delete-icon" @click="confirmDelete(item, 'Inter2')">mdi-delete</v-icon>
          </div>
        </template>
        <template v-slot:item.inter3="{ item }">
          <span>{{ item.inter3 ? item.inter3 : '' }}</span>
          <v-icon v-if="item.inter3" class="delete-icon" @click="confirmDelete(item, 'Inter3')">mdi-delete</v-icon>
        </template>
        <template v-slot:item.inter4="{ item }">
          <span>{{ item.inter4 ? item.inter4 : '' }}</span>
          <v-icon v-if="item.inter4" class="delete-icon" @click="confirmDelete(item, 'Inter4')">mdi-delete</v-icon>
        </template>
        <template v-slot:item.MoyI="{ item }">
          <span>{{ item.MoyI ? item.MoyI : '' }}</span>
        </template>
        <template v-slot:item.Dev1="{ item }">
          <span>{{ item.Dev1 ? item.Dev1 : '' }}</span>
          <v-icon v-if="item.Dev1" class="delete-icon" @click="confirmDelete(item, 'Devoir1')">mdi-delete</v-icon>
        </template>
        <template v-slot:item.Dev2="{ item }">
          <span>{{ item.Dev2 ? item.Dev2 : '' }}</span>
          <v-icon v-if="item.Dev2" class="delete-icon" @click="confirmDelete(item, 'Devoir2')">mdi-delete</v-icon>
        </template>
        <template v-slot:item.Moy="{ item }">
          <span>{{ item.Moy ? item.Moy : '' }}</span>
        </template>
        <template v-slot:item.Moycoef="{ item }">
          <span>{{ item.Moycoef ? item.Moycoef : '' }}</span>
        </template>
      </v-data-table>

      <!-- Message de succès -->
      <v-snackbar v-model="snackbar" color="green" timeout="3000">
        {{ snackbarMessage }}
        <v-btn text @click="snackbar = false">Fermer</v-btn>
      </v-snackbar>

      <!-- Bouton retour -->
      <v-row class="mt-4" justify="center">
        <v-col cols="12" md="6" class="text-center">
          <v-btn block color="primary" @click="$emit('back')">Retour</v-btn>
        </v-col>
      </v-row>
   <!-- Formulaire modal pour l'importation des notes -->
       <!-- Première modale -->
       <v-dialog v-model="dialog1" max-width="500px">
        <v-card>
          <v-card-title>
            <span class="headline">Importer des notes</span>
          </v-card-title>
          <v-card-text>
            <v-form ref="form1" v-model="valid1">
              <v-select
                v-model="selectedNoteType"
                :items="noteTypes"
                label="Type de note"
                required
              ></v-select>
              <v-file-input
                v-model="selectedFile"
                label="Fichier Excel"
                accept=".xlsx, .xls"
                prepend-icon="mdi-upload"
                required
              ></v-file-input>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue darken-1" text @click="closeImportForm1">Annuler</v-btn>
            <v-btn color="green darken-1" text @click="handleFileUpload">Importer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="dialog" max-width="400">
        <v-card>
          <v-card-title>Confirmation</v-card-title>
          <v-card-text>Êtes-vous sûr de vouloir supprimer cette note ?</v-card-text>
          <v-card-actions>
            <v-btn color="grey" text @click="dialog = false">Annuler</v-btn>
            <v-btn color="red" text @click="deleteNote">Supprimer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="showDeleteDialog" max-width="400">
  <v-card>
    <v-card-title>Suppression réussie</v-card-title>
    <v-card-text>{{ deleteMessage }}</v-card-text>
    <v-card-actions>
      <v-btn color="primary" text @click="showDeleteDialog = false">OK</v-btn>
    </v-card-actions>
  </v-card>
</v-dialog>

    </v-container>
  </v-app>
</template>
<script>
import axios from 'axios';

export default {
  props: {
    subjectId: {
      type: Number,
      required: true,
    },
    classeId: {
      type: Number,
      required: true,
    },
    etablissementId: { // Ajout de la prop pour recevoir l'ID de l'établissement
      type: Number,
      required: true,
    },
    anneeScolaire: {
      type: String,
      required: true,
    },
    anneeScolaireId: {
      type: Number,
      required: true,
    },
  },
  data: () => ({
    dialog1: false, // Contrôle de la première modale
    dialog2: false, // Contrôle de la deuxième modale
    snackbar: false,
    dialog: false,
    deleteMessage: "", // Stocke le message de confirmation
    showDeleteDialog: false, // Affiche ou non le message après suppression
    noteToDelete: null,
    snackbarMessage: '',
    search: '',
    valid1: false,
    valid2: false,
    matiereNom: '',
    currentSemester: '',
    semesters: [],
    headers: [
      { title: "Nom/Prénom", value: 'studentName', sortable: false },
      { title: 'Inter 1', value: 'inter1' },
      { title: 'Inter 2', value: 'inter2' },
      { title: 'Inter 3', value: 'inter3' },
      { title: 'Inter 4', value: 'inter4' },
      { title: 'MoyI', value: 'MoyI' },
      { title: 'Devoir 1', value: 'Dev1' },
      { title: 'Devoir 2', value: 'Dev2' },
      { title: 'Moy', value: 'Moy' },
      { title: 'Moycoef', value: 'Moycoef' },
    ],
    students: [],
    noteTypes: ['Inter1', 'Inter2', 'Inter3', 'Inter4',  'Devoir1', 'Devoir2'],
    noteTypes1: ['Inter1', 'Inter2', 'Inter3', 'Inter4'],
    selectedNoteType: null,
    selectedFile: null,
    valid: false,
  }),
  
  methods: {
   
    getButtonColor(semester) {
      return this.currentSemester === semester ? 'primary' : 'secondary';
    },
  
    changeSemester(semester) {
      this.currentSemester = semester;
      this.fetchNotesData();
    },

    // Récupération des étudiants et tri par ordre alphabétique
    async getStudents() {
      try {
        const response = await axios.get(`http://localhost:8080/api/classes/${this.classeId}/eleves`);
        this.students = response.data;

        // Trier les étudiants par ordre alphabétique
        this.students.sort((a, b) => {
          const nomA = a.nom.toUpperCase();
          const nomB = b.nom.toUpperCase();
          return nomA < nomB ? -1 : nomA > nomB ? 1 : 0;
        });

        await this.fetchNotesData(); // Récupérer les notes après avoir récupéré et trié les étudiants
      } catch (error) {
        console.error('Erreur lors de la récupération des élèves', error);
      }
    },

    async fetchSemesters() {
      console.log(this.etablissementId);
      try {
        const response = await axios.get(`http://localhost:8080/api/semesters/${this.etablissementId}`);
        this.semesters = response.data;
        console.log(this.anneeScolaireId);
        // Définir le premier semestre récupéré comme sélectionné par défaut
        if (this.semesters.length > 0) {
          this.currentSemester = this.semesters[0].nom;
          this.fetchNotesData();
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des semestres', error);
      }
    },
  
    confirmDelete(student, noteTypes) {
  console.log("🟡 confirmDelete appelé avec :", { student, noteTypes });

  if (!noteTypes) {
    console.error("❌ ERREUR: noteTypes est undefined !");
    return;
  }

  const noteTypesMapping = {
    "Inter1": "inter1",
    "Inter2": "inter2",
    "Inter3": "inter3",
    "Inter4": "inter4",
    "Devoir1": "Dev1",
    "Devoir2": "Dev2"
  };

  const mappedNoteType = noteTypesMapping[noteTypes];

  if (!mappedNoteType) {
    console.error(`❌ Type de note invalide : "${noteTypes}"`);
    return;
  }

  console.log("✅ Note type mappé :", mappedNoteType);

  this.noteToDelete = { student, noteType: mappedNoteType }; // ⚠️ Changer 'noteTypes' en 'noteType'
  this.dialog = true;
},

async deleteNote() {
  if (!this.noteToDelete) {
    console.error("❌ ERREUR: Aucune note sélectionnée pour suppression !");
    return;
  }

  const { student, noteType } = this.noteToDelete; // ⚠️ On récupère `noteType`, pas `noteTypes`

  if (!noteType) {
    console.error("❌ ERREUR: noteType est undefined !");
    return;
  }

  const semesterId = this.getSemesterId(this.currentSemester);

  console.log("📤 Envoi de la requête de suppression avec :", {
    eleveId: student.id,
    semestreId: semesterId,
    anneeScolaireId: this.anneeScolaireId,
    classeId: this.classeId,
    etablissementId: this.etablissementId,
    noteType // ⚠️ On envoie `noteType` directement
  });

  try {
    const response = await fetch("http://localhost:8080/api/deleteNote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eleveId: student.id,
        semestreId: semesterId,
        anneeScolaireId: this.anneeScolaireId,
        classeId: this.classeId,
        etablissementId: this.etablissementId,
        noteType // ⚠️ Envoi direct du type correct
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Erreur lors de la suppression de la note.");
    }

    console.log(`✅ Note "${noteType}" supprimée pour ${result.nom} ${result.prenom}`);

    // Mettre à jour la liste après suppression
    this.students = this.students.map(s => {
      if (s.id === student.id) {
        s[noteType] = null; // ⚠️ Suppression locale
      }
      return s;
    });

    this.deleteMessage = `✅ La note "${noteType}" a été supprimée pour ${result.nom} ${result.prenom}.`;
    this.dialog = false;
    this.showDeleteDialog = true; // Afficher le message de confirmation
  } catch (error) {
    console.error("❌ Erreur lors de la suppression :", error);
    this.deleteMessage = "❌ Une erreur s'est produite lors de la suppression de la note.";
    this.showDeleteDialog = true;
  }
},

    openImportForm1() {
      this.dialog1 = true;
    },
    closeImportForm1() {
      this.dialog1 = false;
    },
    openImportForm2() {
      this.dialog2 = true;
    },
    closeImportForm2() {
      this.dialog2 = false;
    },

    async handleFileUpload() {
      if (!this.selectedNoteType || !this.selectedFile) {
        return; // Valide les champs avant d'envoyer
      }

      const formData = new FormData();
      formData.append('typeNote', this.selectedNoteType);
      formData.append('file', this.selectedFile);
      formData.append('semestreId', this.getSemesterId(this.currentSemester));
      formData.append('matiereId', this.subjectId);
      formData.append('classeId', this.classeId);
      formData.append('etablissementId', this.etablissementId);
      formData.append('anneeScolaireId', this.anneeScolaireId);

      try {
        await axios.post(`http://localhost:8080/api/upload/excel`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        this.snackbarMessage = 'Importation réussie!';
        this.snackbar = true;
        this.dialog = false;
        this.fetchNotesData();
        this.$refs.form.reset();
      } catch (error) {
        console.error('Erreur lors de l\'importation du fichier Excel', error);
      }
    },
   

    getSemesterId(semesterName) {
      const semester = this.semesters.find(sem => sem.nom === semesterName);
      return semester ? semester.id : null;
    },

    // Récupération des notes selon le semestre
    async fetchNotesData() {
      try {
        const semesterId = this.getSemesterId(this.currentSemester);
        const response = await axios.get(`http://localhost:8080/api/notes/${this.classeId}/${this.subjectId}/${semesterId}/${this.anneeScolaireId}`);
        const notesData = response.data;
        console.log(notesData)

        // Associer les notes aux étudiants
        this.students.forEach(student => {
          const studentNotes = notesData.find(note => note.nom === student.nom && note.prenom === student.prenom);
          if (studentNotes) {
            student.notesId = studentNotes.notesId;
            student.inter1 = studentNotes.inter1 !== null ? Number(studentNotes.inter1) : null;
            student.inter2 = studentNotes.inter2 !== null ? Number(studentNotes.inter2) : null;
            student.inter3 = studentNotes.inter3 !== null ? Number(studentNotes.inter3) : null;
            student.inter4 = studentNotes.inter4 !== null ? Number(studentNotes.inter4) : null;
            student.MoyI = studentNotes.moyInter !== null ? Number(studentNotes.moyInter) : null;
            student.Dev1 = studentNotes.Dev1 !== null ? Number(studentNotes.Dev1) : null;
            student.Dev2 = studentNotes.Dev2 !== null ? Number(studentNotes.Dev2) : null;
            student.Moy = studentNotes.moy !== null ? Number(studentNotes.moy) : null;
            student.Moycoef = studentNotes.coeff !== null ? Number(studentNotes.coeff) : null;
          }
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des notes', error);
      }
    },

    async saveNotes() {
      try {
        const semestreId = this.getSemesterId(this.currentSemester);

        // Structurer les données envoyées
        const payload = {
          classeId: this.classeId,
          subjectId: this.subjectId,
          semesterId: semestreId,
          etablissementId: this.etablissementId,
          anneeScolaireId: this.anneeScolaireId,
          notes: this.students.map((student) => ({
            nom:student.nom,
            prenom:student.prenom,
            MoyI: student.MoyI ,
            Moy: student.Moy ,
            Moycoef: student.Moycoef,
          
          })),
        };

        // Envoyer les données au backend
        await axios.post(`http://localhost:8080/api/notes/save`, payload);
        
        this.snackbarMessage = 'Notes sauvegardées avec succès !';
        this.snackbar = true;
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des notes', error);
        this.snackbarMessage = 'Échec de la sauvegarde des notes.';
        this.snackbar = true;
      }
    },
    async generateExcelFile() {
      try {
        const response = await axios({
          url: `http://localhost:8080/api/export/excel/${this.classeId}`,
          method: 'POST',
          responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Classe_${this.classeId}_Semestre_${this.currentSemester}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();

      } catch (error) {
        console.error('Erreur lors de la génération du fichier Excel', error);
      }
    },
  },

  async mounted() {
    await this.fetchSemesters();
    await this.getStudents();
  },
};
</script>
<style scoped>
.v-btn--active {
  background-color: #1976d2;
  color: white;
}
.responsive-table {
  overflow-x: auto;
  max-width: 100%;
}
.responsive-text {
  font-size: 1rem;
  white-space: nowrap;
}

.responsive-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}
@media screen and (max-width: 600px) {
  .responsive-toolbar {
    flex-direction: column;
    text-align: center;
  }
  .responsive-text {
    font-size: 0.9rem;
  }

}

</style>