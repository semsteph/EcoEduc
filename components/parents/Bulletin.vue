<template>
    <div class="eleve-item">
      <div v-if="activeEleve === this.child" class="eleve-details">
        <div class="eleve-info">
          <h3 class="no-pdf">
            Détails de l'élève
            <button @click="downloadPDF" class="download-btn no-pdf">
              Télécharger PDF
            </button>
          </h3>
          <p><strong>Nom :</strong> {{ childNom }}</p>
          <p><strong>Prénom :</strong> {{ childPrenom }}</p>
          <p><strong>Classe :</strong> {{ childClasse }}</p>
        </div>
  
        <div>
          <label for="semestre">Semestres :</label>
          <div class="semestres">
            <button
              v-for="semestre in semestres"
              :key="semestre.id"
              @click="selectSemestre(semestre.id, this.childId)"
              :class="{ active: selectedSemestre === semestre.id }"
              class="semestre-btn"
            >
              {{ semestre.nom }}
            </button>
          </div>
        </div>
  
        <!-- Tableau de données -->
        <table v-if="filteredData.length" class="notes-table">
          <thead>
            <tr>
              <th>Matière</th>
              <th>Coef</th>
              <th>Moy</th>
              <th>Moy Coef</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(data, index) in filteredData" :key="index">
              <td>{{ data.matiere }}</td>
              <td>{{ data.coef }}</td>
              <td>{{ data.moy }}</td>
              <td>{{ data.moycoef }}</td>
            </tr>
            <tr>
              <td><strong>Conduite</strong></td>
              <td>1</td>
              <td>{{ conduite }}</td>
              <td>{{ conduite }}</td>
            </tr>
            <tr>
              <td>Total</td>
              <td></td>
              <td></td>
              <td>{{ total }}</td>
            </tr>
            <tr>
              <td colspan="2">Moyenne Semestrielle</td>
              <td colspan="2">{{ moySem }}</td>
            </tr>
            <tr>
              <td colspan="2">Rang</td>
              <td colspan="2">{{ rang }}</td>
            </tr>
            <tr>
              <td colspan="2">Mention</td>
              <td colspan="2">{{ mention }}</td>
            </tr>
          </tbody>
        </table>
  
        <!-- Message d'alerte en cas de données manquantes -->
        <div v-else class="no-data">
          Aucune donnée disponible pour ce semestre.
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import axios from 'axios';
  import jsPDF from 'jspdf';
  import html2canvas from 'html2canvas';
  
  export default {
    props: {
      childId: {
        type: Number,
        required: true,
      },
    },
    data() {
      return {
        semestres: [],
        selectedSemestre: null,
        allData: [],
        filteredData: [],
        total: 0,
        moySem: 0,
        conduite: 0,
        rang: '',
        mention: '',
        childNom: '',
        childPrenom: '',
        childClasse: '',
      };
    },
    methods: {
      async fetchData() {
        try {
          const response = await axios.get(`http://localhost:8080/api/bulletin/${this.childId}`);
          this.semestres = response.data.semestres;
          this.allData = response.data.bulletins;
          this.total = response.data.total;
          this.moySem = response.data.moySem;
          this.rang = response.data.rang;
          this.mention = response.data.mention;
          this.conduite = response.data.conduite;
          this.childNom = response.data.eleveNom;
          this.childPrenom = response.data.elevePrenom;
          this.childClasse = response.data.classeNom;
          this.filterBySemestre();
        } catch (error) {
          console.error('Erreur lors de la récupération des données', error);
        }
      },
      filterBySemestre() {
        if (this.selectedSemestre) {
          this.filteredData = this.allData.filter((data) => data.semestre_id === this.selectedSemestre);
        } else {
          this.filteredData = this.allData;
        }
      },
      async downloadPDF() {
        const elements = document.querySelectorAll('.no-pdf');
        elements.forEach((element) => (element.style.display = 'none'));
  
        const element = document.querySelector('.eleve-details');
        html2canvas(element, {
          backgroundColor: '#E3F2FD', 
          scale: 2, 
        }).then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
  
          const pageHeight = 295;
          const imgWidth = 210;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let heightLeft = imgHeight;
  
          let position = 0;
  
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
  
          while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }
  
          pdf.save(`${this.childNom}_${this.childPrenom}_bulletin.pdf`);
  
          elements.forEach((element) => (element.style.display = ''));
        });
      },
    },
    mounted() {
      this.fetchData();
    },
  };
  </script>
  
  <style scoped>
  .container {
    font-family: 'Arial', sans-serif;
    padding: 20px;
    max-width: 700px;
    margin: auto;
    position: relative;
    background: #f9f9f9;
    overflow: hidden;
  }
  
  .eleve-item {
    border: 1px solid #007BFF;
    margin-bottom: 20px;
    border-radius: 10px;
    background-color: #E3F2FD;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    position: relative;
  }
  
  .eleve-details {
    padding: 20px;
    position: relative;
    z-index: 1;
  }
  
  .eleve-info {
    margin-bottom: 20px;
  }
  
  .download-btn {
    background-color: #28a745;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
    margin-left: 15px;
    font-size: 14px;
  }
  
  .download-btn:hover {
    background-color: #218838;
  }
  
  .semestres {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .semestre-btn {
    background-color: #007BFF;
    color: #fff;
    border: none;
    border-radius: 5px;
    padding: 10px;
    cursor: pointer;
  }
  
  .semestre-btn.active {
    background-color: #0056b3;
  }
  
  .notes-table {
    width: 100%;
    border-collapse: collapse;
    z-index: 1;
  }
  
  .notes-table th,
  .notes-table td {
    border: 1px solid #007BFF;
    padding: 10px;
    text-align: center;
  }
  
  .no-data {
    color: red;
    font-weight: bold;
  }
  
  /* Ajout du filigrane */
  .eleve-item::before {
    content: "EcoEducation";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    font-size: 12rem;
    color: rgba(0, 123, 255, 0.15); /* Couleur bleu clair avec transparence */
    white-space: nowrap;
    z-index: 0;
    pointer-events: none; 
  }
  </style>
  