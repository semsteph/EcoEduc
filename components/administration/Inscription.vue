<template>
  <div class="container">
    <div class="header">
      <v-btn icon @click="$emit('back')" class="btn-icon">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div class="actions">
        <button @click="showForm = true" v-if="!showForm" class="btn-primary">Inscrire un élève</button>
        <button @click="showBulkForm = true" v-if="!showBulkForm" class="btn-secondary">Inscrire plusieurs élèves</button>
      </div>
    </div>

    <!-- Formulaire inscription individuelle -->
    <div class="form-container" v-if="showForm">
      <h2>Inscription d’un Élève</h2>

      <form @submit.prevent="submitForm">
        <div class="form-group" v-for="field in ['nom', 'prenom', 'dateNaissance', 'sexe']" :key="field">
          <label :for="field">{{ labels[field] }} :</label>
          <input
            v-if="field !== 'sexe'"
            :type="field === 'dateNaissance' ? 'date' : 'text'"
            :id="field"
            v-model="form[field]"
            required
          />
          <select v-else v-model="form.sexe" required>
            <option disabled value="">Choisir...</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
            <option value="Autre">Autre</option>
          </select>
        </div>

        <div class="form-group">
          <label>Classe :</label>
          <select v-model="form.classe" required>
            <option disabled value="">Choisir...</option>
            <option v-for="classe in classes" :key="classe.id" :value="classe.id">
              {{ classe.nom }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Parent :</label>
          <v-autocomplete
            v-model="form.parentId"
            :items="parents"
            item-value="id"
            item-title="text"
            label="Choisir un parent"
            required
          />
        </div>

        <div class="btn-group">
          <button type="submit" class="btn-success">S'inscrire</button>
          <button @click="showForm = false" type="button" class="btn-cancel">Annuler</button>
        </div>
      </form>
    </div>

    <!-- Formulaire inscription multiple -->
    <div class="form-container" v-if="showBulkForm">
      <h2>Inscription en Masse</h2>

      <button @click="generateExcelTemplate" class="btn-info">
        📄 Générer le fichier modèle Excel
      </button>

      <div class="form-group">
        <label>Classe :</label>
        <select v-model="bulkForm.classeId" required>
          <option disabled value="">Choisir...</option>
          <option v-for="classe in classes" :key="classe.id" :value="classe.id">
            {{ classe.nom }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>Fichier Excel :</label>
        <input type="file" @change="handleFileUpload" accept=".xlsx, .xls" />
      </div>

      <div class="btn-group">
        <button @click="submitBulkForm" class="btn-success">Soumettre</button>
        <button @click="showBulkForm = false" type="button" class="btn-cancel">Annuler</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  props: {
    etablissementId: Number,
    etablissementNom: String,
    anneeScolaire: String,
    anneeScolaireId: Number
  },
  data() {
    return {
      form: {
        nom: '',
        prenom: '',
        dateNaissance: '',
        sexe: '',
        classe: '',
        parentId: ''
      },
      bulkForm: {
        classeId: '',
        file: null
      },
      showForm: false,
      showBulkForm: false,
      classes: [],
      parents: [],
      labels: {
        nom: 'Nom',
        prenom: 'Prénom',
        dateNaissance: 'Date de naissance',
        sexe: 'Sexe'
      }
    };
  },
  async created() {
    await this.fetchClasses();
    await this.fetchParents();
  },
  methods: {
    async fetchClasses() {
      try {
        const res = await axios.get(`http://localhost:8080/api/classe/${this.etablissementId}`);
        this.classes = res.data;
      } catch (e) {
        console.error("Erreur chargement classes :", e);
      }
    },
    async fetchParents() {
      try {
        const res = await axios.get(`http://localhost:8080/api/Parents/${this.etablissementId}`);
        this.parents = res.data.map(p => ({
          id: p.id,
          text: `${p.name} ${p.firstName}`
        }));
      } catch (e) {
        console.error("Erreur chargement parents :", e);
      }
    },
    async submitForm() {
      try {
        await axios.post('http://localhost:8080/api/inscription', {
          ...this.form,
          etablissementId: this.etablissementId,
          anneeScolaireId: this.anneeScolaireId
        });
        alert("Inscription réussie !");
        this.resetForm();
      } catch (e) {
        console.error("Erreur inscription :", e);
        alert("Erreur lors de l'inscription.");
      }
    },
    resetForm() {
      this.form = {
        nom: '',
        prenom: '',
        dateNaissance: '',
        sexe: '',
        classe: '',
        parentId: ''
      };
    },
    handleFileUpload(event) {
  this.bulkForm.file = event.target.files[0];
},

async generateExcelTemplate() {
  const XLSX = await import('xlsx');

  // Utilisation de date ISO (yyyy-mm-dd)
  const data = [
    ['Nom Élève', 'Prénom Élève', 'Date de naissance', 'Sexe', 'Nom Parent', 'Prénom Parent', 'Email Parent', 'Téléphone'],
    ['Kouadio', 'Jean', '2011-05-12', 'M', 'Kouadio', 'Claudine', 'claudine.kouadio@mail.com', '0700000000']
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Définir le format de la cellule "Date de naissance"
  ws['C2'].z = 'yyyy-mm-dd';

  ws['!cols'] = [
    { wch: 20 }, // Nom élève
    { wch: 20 }, // Prénom élève
    { wch: 15 }, // Date de naissance
    { wch: 10 }, // Sexe
    { wch: 20 }, // Nom parent
    { wch: 20 }, // Prénom parent
    { wch: 30 }, // Email parent
    { wch: 20 }  // Téléphone
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscriptions');
  XLSX.writeFile(wb, 'modele_inscription_eleves.xlsx');
},

    async submitBulkForm() {
  if (!this.bulkForm.file || !this.bulkForm.classeId) {
    alert("Veuillez sélectionner une classe et un fichier.");
    return;
  }

  const formData = new FormData();
  formData.append('file', this.bulkForm.file);
  formData.append('classeId', this.bulkForm.classeId);
  formData.append('etablissementId', this.etablissementId);
  formData.append('anneeScolaireId', this.anneeScolaireId);

  try {
    const response = await axios.post('http://localhost:8080/api/import-eleves', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    alert("Importation réussie !");
    console.log("Réponse du serveur :", response.data);

    this.bulkForm.file = null;
    this.bulkForm.classeId = '';
    this.showBulkForm = false;
  } catch (e) {
    console.error("Erreur importation :", e);
    alert("Erreur lors de l'importation du fichier.");
  }
}

  }
};
</script>

<style scoped>
.container {
  padding: 30px;
  max-width: 800px;
  margin: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.actions {
  display: flex;
  gap: 10px;
}

.form-container {
  background: #fff;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
  margin-bottom: 30px;
}

.form-container h2 {
  margin-bottom: 25px;
  text-align: center;
  font-size: 22px;
  color: #333;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  font-weight: 600;
  margin-bottom: 6px;
  display: block;
  color: #444;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 15px;
  background: #fefefe;
}

.btn-group {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

button {
  padding: 10px 16px;
  font-size: 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-cancel {
  background-color: #dc3545;
  color: white;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
  margin-bottom: 20px;
}

button:hover {
  opacity: 0.9;
}
</style>