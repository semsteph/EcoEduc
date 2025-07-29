<template>
  <v-container fluid>
    <!-- Bouton retour -->
    <v-btn
      icon
      class="ma-2"
      @click="$emit('back')"
      :size="$vuetify.display.smAndDown ? 'x-small' : 'default'"
    >
      <v-icon :size="$vuetify.display.smAndDown ? 16 : 24">mdi-arrow-left</v-icon>
    </v-btn>

    <!-- Liste des élèves -->
    <v-card
      elevation="2"
      class="pa-4 rounded-xl"
      v-if="!selectedStudentId"
    >
      <!-- En-tête avec bouton PDF -->
      <v-card-title
        class="d-flex justify-space-between align-center"
        :class="$vuetify.display.smAndDown ? 'text-subtitle-2' : 'text-h6'"
      >
        <span class="font-weight-medium">Liste des Élèves</span>
        <v-btn
          color="primary"
          variant="flat"
          class="text-white"
          :size="$vuetify.display.smAndDown ? 'x-small' : 'small'"
          @click="downloadPDF"
          :disabled="eleves.length === 0"
        >
          <v-icon left :size="$vuetify.display.smAndDown ? 16 : 20">mdi-download</v-icon>
          <span v-if="!$vuetify.display.smAndDown">Télécharger PDF</span>
        </v-btn>
      </v-card-title>

      <!-- Affichage des élèves -->
      <v-card-text>
        <v-row>
          <template v-if="eleves.length > 0">
            <v-col
              v-for="eleve in eleves"
              :key="eleve.id"
              cols="12"
              sm="6"
              md="4"
            >
              <v-card
                class="ma-2 rounded-lg"
                outlined
                elevation="1"
                @click="selectStudent(eleve.id)"
                hover
              >
                <v-card-text
                  class="text-center"
                  :class="$vuetify.display.smAndDown ? 'text-body-2' : 'text-body-1'"
                >
                  {{ eleve.prenom }} {{ eleve.nom }}
                </v-card-text>
              </v-card>
            </v-col>
          </template>

          <template v-else>
            <v-col cols="12">
              <v-alert type="info" color="blue lighten-4" border="left" elevation="1" class="mt-4" dense>
                Aucun élève inscrit dans la classe sélectionnée.
                <br />
                Veuillez aller dans la Gestion des classes pour inscrire des élèves.
              </v-alert>
            </v-col>
          </template>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Détails de l'élève sélectionné -->
    <ChildComponent
      v-else
      :studentId="selectedStudentId"
      :annee-scolaire="anneeScolaire"
      :annee-scolaire-id="anneeScolaireId"
      :etablissement-id="etablissementId"
      @back="clearSelection"
    />
  </v-container>
</template>

<script>
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ChildComponent from './ChildComponent.vue';

export default {
  name: 'ClassDetail',
  components: {
    ChildComponent,
  },
  props: {
    classId: {
      type: Number,
      required: true,
    },
    className: {
      type: String,
      required: true,
    },
    etablissementId: {
      type: Number,
      required: true,
    },
    etablissementNom: {
      type: String,
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
  data() {
    return {
      eleves: [],
      selectedStudentId: null,
    };
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
    },
    clearSelection() {
      this.selectedStudentId = null;
    },
    downloadPDF() {
      const doc = new jsPDF();
      const classTitle = `Liste des élèves - Classe: ${this.className}`;
      const subtitle = `Année scolaire: ${this.anneeScolaire}`;

      doc.setFontSize(16);
      doc.text(classTitle, 14, 20);
      doc.setFontSize(12);
      doc.text(subtitle, 14, 28);

      const tableData = this.eleves.map((eleve, index) => [
        index + 1,
        eleve.nom,
        eleve.prenom,
      ]);

      autoTable(doc, {
        head: [['#', 'Nom', 'Prénom']],
        body: tableData,
        startY: 35,
      });

      doc.save(`Liste_eleves_classe_${this.className}.pdf`);
    },
  },
  created() {
    this.fetchStudents();
  },
};
</script>

<style scoped>
.v-card {
  transition: transform 0.2s ease;
}
.v-card:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
</style>
