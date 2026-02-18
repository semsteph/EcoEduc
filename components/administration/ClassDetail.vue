<template>
  <v-container fluid class="pa-4 bg-grey-lighten-4">
    
    <v-row align="center" class="mb-6 px-2">
      <v-col cols="auto">
        <v-btn
          icon
          variant="elevated"
          color="white"
          elevation="2"
          @click="selectedStudentId ? clearSelection() : $emit('back')"
        >
          <v-icon color="primary">mdi-arrow-left</v-icon>
        </v-btn>
      </v-col>
      <v-col>
        <h1 class="text-h5 font-weight-bold text-primary d-flex align-center">
          <v-icon start size="32" color="primary">mdi-account-school</v-icon>
          {{ className }}
        </h1>
        <div class="text-caption text-grey-darken-1 d-flex align-center flex-wrap">
          <v-chip size="x-small" color="primary" variant="flat" class="me-2 mb-1">
            {{ eleves.length }} Élèves
          </v-chip>
          <span class="mb-1">{{ etablissementNom }} • {{ anneeScolaire }}</span>
        </div>
      </v-col>
      <v-col cols="12" sm="auto" class="text-right">
        <v-btn
          color="primary"
          prepend-icon="mdi-file-pdf-box"
          variant="elevated"
          rounded="pill"
          :block="$vuetify.display.xs"
          @click="downloadPDF"
          :disabled="eleves.length === 0"
          class="text-none"
        >
          Télécharger la liste
        </v-btn>
      </v-col>
    </v-row>

    <v-window v-model="activeView" disabled>
      <v-window-item value="list">
        <v-card border flat class="rounded-xl overflow-hidden elevation-1 w-100">
          <v-toolbar color="white" flat class="border-b px-2">
            <v-toolbar-title class="text-subtitle-1 font-weight-bold text-grey-darken-2 d-none d-sm-flex">
              Répertoire des élèves
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Rechercher un nom..."
              variant="solo-filled"
              flat
              hide-details
              density="compact"
              class="max-width-search"
              rounded="pill"
            ></v-text-field>
          </v-toolbar>

          <v-card-text class="pa-4 pa-md-6 bg-grey-lighten-5">
            <v-row v-if="filteredEleves.length > 0">
              <v-col
                v-for="eleve in filteredEleves"
                :key="eleve.id"
                cols="12"
                sm="6"
                md="4"
                lg="3"
              >
                <v-card
                  class="student-card rounded-lg border"
                  variant="flat"
                  @click="selectStudent(eleve.id)"
                  ripple
                >
                  <v-card-text class="d-flex align-center pa-4">
                    <v-avatar color="primary-lighten-4" size="48" class="me-4 font-weight-bold text-primary">
                      {{ eleve.nom ? eleve.nom.charAt(0) : '?' }}{{ eleve.prenom ? eleve.prenom.charAt(0) : '' }}
                    </v-avatar>
                    
                    <div class="overflow-hidden">
                      <div class="text-subtitle-2 font-weight-black text-uppercase text-truncate">
                        {{ eleve.nom || 'Sans Nom' }}
                      </div>
                      <div class="text-body-2 text-primary text-truncate">
                        {{ eleve.prenom || 'Sans Prénom' }}
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <v-row v-else justify="center" class="py-12">
              <v-col cols="12" md="6" class="text-center">
                <v-icon size="64" color="grey-lighten-2">mdi-account-search-outline</v-icon>
                <div class="text-h6 text-grey mt-4">Aucun élève trouvé</div>
                <div class="text-body-2 text-grey">Inscrivez des élèves ou modifiez votre recherche.</div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-window-item>

      <v-window-item value="detail">
        <div class="w-100">
          <ChildComponent
            v-if="selectedStudentId"
            :studentId="selectedStudentId"
            :annee-scolaire="anneeScolaire"
            :annee-scolaire-id="anneeScolaireId"
            :etablissement-id="etablissementId"
            @back="clearSelection"
          />
        </div>
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script>
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ChildComponent from './ChildComponent.vue';

export default {
  name: 'ClassDetail',
  components: {
    ChildComponent,
  },
  props: {
    classId: Number,
    className: String,
    etablissementId: Number,
    etablissementNom: String,
    anneeScolaire: String,
    anneeScolaireId: Number,
  },
  data() {
    return {
      eleves: [],
      selectedStudentId: null,
      search: '',
      activeView: 'list'
    };
  },
  computed: {
    filteredEleves() {
      if (!this.eleves) return [];
      return this.eleves.filter(e => {
        const full = (e.nom + ' ' + e.prenom).toLowerCase();
        return full.includes(this.search.toLowerCase());
      });
    }
  },
  methods: {
    fetchStudents() {
      axios
        .get(`http://localhost:8080/api/eleves/${this.classId}/${this.anneeScolaireId}`)
        .then((response) => {
          this.eleves = response.data;
        })
        .catch((error) => {
          console.error('Erreur lors de la récupération des élèves:', error);
        });
    },
    selectStudent(studentId) {
      this.selectedStudentId = studentId;
      this.activeView = 'detail';
    },
    clearSelection() {
      this.selectedStudentId = null;
      this.activeView = 'list';
    },
    downloadPDF() {
      try {
        console.log("Démarrage du téléchargement PDF...");
        const doc = new jsPDF();
        
        // Titre de l'établissement
        doc.setFontSize(18);
        doc.setTextColor(25, 118, 210); // Couleur primaire (Bleu)
        doc.text(this.etablissementNom || "Établissement", 14, 20);
        
        // Sous-titres
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Liste de classe : ${this.className}`, 14, 30);
        doc.text(`Année Scolaire : ${this.anneeScolaire}`, 14, 38);

        // Préparation des données pour le tableau
        // On s'assure que les données existent et sont formatées en chaînes simples
        const tableData = this.eleves.map((e, i) => [
          (i + 1).toString(),
          (e.nom || "").toUpperCase(),
          (e.prenom || "")
        ]);

        // Génération du tableau
        autoTable(doc, {
          head: [['#', 'Nom', 'Prénom']],
          body: tableData,
          startY: 45,
          styles: { fontSize: 10, cellPadding: 3 },
          headStyles: { 
            fillColor: [25, 118, 210], 
            textColor: [255, 255, 255],
            fontStyle: 'bold' 
          },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          margin: { top: 45 }
        });

        // Sauvegarde
        const fileName = `LISTE_ELEVES_${this.className.replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);
        console.log("PDF généré avec succès.");
      } catch (error) {
        console.error("Erreur lors de la génération du PDF:", error);
        alert("Désolé, une erreur est survenue lors de la création du fichier PDF.");
      }
    },
  },
  created() {
    this.fetchStudents();
  },
};
</script>

<style scoped>
.w-100 {
  width: 100% !important;
}

.student-card {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  background-color: white !important;
  border: 1px solid #e0e0e0 !important;
  cursor: pointer;
}

.student-card:hover {
  transform: translateY(-4px);
  border-color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08) !important;
}

.max-width-search {
  max-width: 300px;
}

.primary-lighten-4 {
  background-color: #E3F2FD !important;
}

@media (max-width: 600px) {
  .max-width-search {
    max-width: 100%;
  }
  .text-h5 {
    font-size: 1.2rem !important;
  }
}
</style>