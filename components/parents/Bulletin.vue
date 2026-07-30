<template>
  <div class="eleve-item">
    <v-btn icon @click="$emit('back')" class="back-button">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>
    <div id="bulletin" class="eleve-details">
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

      <div class="semestres">
        <button
          v-for="semestre in semestres"
          :key="semestre.semestre_id"
          @click="selectSemestre(semestre.semestre_id)"
          :class="{ active: selectedSemestre === semestre.semestre_id }"
          class="semestre-btn no-pdf"
        >
          {{ semestre.nom }}
        </button>
      </div>

      <div v-if="filteredData.length" class="table-container">
        <table class="notes-table">
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
              <td colspan="2">Moyenne Semestrielle</td>
              <td colspan="2">{{ moySem }}</td>
            </tr>
            <tr v-if="isLastSemestre(selectedSemestre)">
              <td colspan="2">Moyenne Annuelle</td>
              <td colspan="2">{{ moyAn }}</td>
            </tr>
            <tr v-if="isLastSemestre(selectedSemestre)">
              <td colspan="2">Décision</td>
              <td colspan="2">{{ decision || 'Non définie' }}</td>
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
      </div>
      <div v-else class="no-data">Aucune donnée disponible pour ce semestre.</div>
    </div>
  </div>
</template>
<script>
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default {
  props: {
    childId: {
      type: Number,
      required: true,
    },
    anneeScolaire: {
      type: String,
      required: true
    },
    anneeScolaireId: {
      type: Number,
      required: true
    },
  },
  data() {
    return {
      semestres: [],
      selectedSemestre: null,
      filteredData: [],
      moySem: 0,
      moyAn: null,
      decision: null,
      conduite: "",
      rang: "",
      mention: "",
      childNom: "",
      childPrenom: "",
      childClasse: "",
    };
  },
  methods: {
    async fetchData() {
  try {
    const response = await axios.get(
      `/api/bulletined/${this.childId}/${this.anneeScolaireId}`
    );
    const data = response.data;

    // Vérification si data est vide ou non structuré comme prévu
    if (!data || !data.semestres || data.semestres.length === 0) {
      this.semestres = [];
      this.childNom = "";
      this.childPrenom = "";
      this.childClasse = "";
      return;
    }

    this.semestres = data.semestres.map((semestre) => ({
      semestre_id: semestre.semestre_id,
      nom: semestre.nom,
      bulletins: semestre.bulletins,
      total: semestre.total,
      moySem: semestre.moySem,
      moyAn: semestre.moyAn,
      rang: semestre.rang,
      mention: semestre.mention,
      conduite: semestre.conduite,
      decision: semestre.decision,
    }));

    this.childNom = data.eleveNom;
    this.childPrenom = data.elevePrenom;
    this.childClasse = data.classeNom;

    if (this.semestres.length > 0) {
      this.selectedSemestre = this.semestres[0].semestre_id;
      this.filterBySemestre();
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des données", error);
  }
},

    filterBySemestre() {
      const selectedSemestreData = this.semestres.find(
        (semestre) => semestre.semestre_id === this.selectedSemestre
      );

      if (selectedSemestreData) {
        const uniqueBulletins = selectedSemestreData.bulletins.reduce((acc, curr) => {
          if (!acc.find((item) => item.matiere === curr.matiere)) {
            acc.push(curr);
          }
          return acc;
        }, []);

        this.filteredData = uniqueBulletins;
        this.moySem = selectedSemestreData.moySem || 0;
        this.moyAn = selectedSemestreData.moyAn || 0;
        this.rang = selectedSemestreData.rang || "";
        this.mention = selectedSemestreData.mention || "";
        this.conduite = selectedSemestreData.conduite || "Non définie";
        this.decision = selectedSemestreData.decision || "Non définie";
      } else {
        this.filteredData = [];
      }
    },
    selectSemestre(semestreId) {
      this.selectedSemestre = semestreId;
      this.filterBySemestre();
    },
    isLastSemestre(semestreId) {
      return this.semestres[this.semestres.length - 1]?.semestre_id === semestreId;
    },
    async downloadPDF() {
  const bulletinElement = document.getElementById("bulletin");

  // Cloner l'élément bulletin
  const clone = bulletinElement.cloneNode(true);
  document.body.appendChild(clone);

  // Supprimer les éléments marqués comme "no-pdf"
  const noPdfElements = clone.querySelectorAll(".no-pdf");
  noPdfElements.forEach((element) => element.remove());

  // Identifier le bouton actif parmi les boutons de semestre
  const allSemestreButtons = clone.querySelectorAll(".semestre-btn");
  const activeButton = [...allSemestreButtons].find((button) =>
    button.classList.contains("active")
  );

  // Positionner le bouton actif au-dessus du tableau
  if (activeButton) {
    const activeButtonClone = activeButton.cloneNode(true); // Cloner le bouton actif
    activeButtonClone.style.textAlign = "center"; // Centrer le bouton
    activeButtonClone.style.marginBottom = "10px"; // Ajouter un espacement en bas
    activeButtonClone.style.fontWeight = "bold"; // Rendre le texte en gras
    activeButtonClone.style.display = "block"; // Forcer un affichage en ligne bloqué
    activeButtonClone.style.backgroundColor = "#f5f5f5"; // Optionnel : couleur de fond du bouton
    activeButtonClone.style.padding = "5px 10px"; // Optionnel : espacement interne
    activeButtonClone.style.border = "1px solid #ddd"; // Optionnel : bordure pour un style clair

    // Insérer le bouton au-dessus du tableau principal
    const tableau = clone.querySelector(".tableau"); // Remplacez ".tableau" par le sélecteur du tableau
    if (tableau) {
      tableau.parentNode.insertBefore(activeButtonClone, tableau);
    }
  }

  // Supprimer tous les autres boutons de semestre
  allSemestreButtons.forEach((button) => {
    if (!button.classList.contains("active")) {
      button.remove();
    }
  });

  // Appliquer un fond uniforme sur toute la page
  const backgroundColor = getComputedStyle(
    document.querySelector(".eleve-item")
  ).backgroundColor;
  clone.style.backgroundColor = backgroundColor;

  const allChildren = clone.querySelectorAll("*");
  allChildren.forEach((child) => {
    child.style.backgroundColor = backgroundColor; // Appliquer la couleur uniformément
  });

  // Ajuster la hauteur pour éliminer les zones blanches
  clone.style.minHeight = "200vh";
  clone.style.padding = "150px"; 

  // Générer le PDF
  try {
    const canvas = await html2canvas(clone, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Bulletin_${this.childNom}_${this.childPrenom}.pdf`);
  } catch (error) {
    console.error("Erreur lors de la génération du PDF :", error);
  } finally {
    clone.remove();
  }
}



  },
  mounted() {
    this.fetchData();
  },
};
</script>



  
<style scoped>
/* Conteneur principal */
.eleve-item {
  margin: 20px auto;
  padding: 15px;
  border: 1px solid #007bff;
  border-radius: 10px;
  background-color: #e3f2fd;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 100%;
}

/* Bouton Télécharger PDF */
.download-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.download-btn:hover {
  background-color: #45a049;
}

/* Boutons des semestres */
.semestres {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.semestre-btn {
  flex: 0 1 calc(33.33% - 8px); /* Ajuste la taille */
  text-align: center;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 8px;
  cursor: pointer;
  font-size: 14px;
}

.semestre-btn.active {
  background-color: #0056b3;
}

.semestre-btn:hover {
  background-color: #0056b3;
}

/* Table adaptative */
.table-container {
  overflow-x: auto;
}

.notes-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.notes-table th,
.notes-table td {
  border: 1px solid #007bff;
  padding: 8px;
  text-align: center;
}

/* Responsive design */
@media (max-width: 768px) {
  .semestre-btn {
    font-size: 12px;
    padding: 6px;
  }

  .notes-table th,
  .notes-table td {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .semestre-btn {
    font-size: 10px;
    padding: 4px;
    flex: 0 1 calc(50% - 8px); /* Sur mobiles, deux boutons par ligne */
  }

  .notes-table th,
  .notes-table td {
    font-size: 10px;
  }

  .download-btn {
    font-size: 12px;
    padding: 8px 10px;
  }
}
</style>