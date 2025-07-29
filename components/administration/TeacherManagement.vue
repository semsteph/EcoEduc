<template>
  <v-container fluid>
    <!-- Page par défaut -->
    <div v-if="currentComponent === 'default'">
      <v-row justify="center" class="my-6" dense>
        <v-col cols="12" sm="4" md="3" class="d-flex justify-center">
          <v-btn @click="showAddSubjectForm = true" color="primary" class="ma-2" block>
            <v-icon start>mdi-book-plus</v-icon>
            Ajouter Matière
          </v-btn>
        </v-col>
        <v-col cols="12" sm="4" md="3" class="d-flex justify-center">
          <v-btn @click="showInscriptionForm = true" color="primary" class="ma-2" block>
            <v-icon start>mdi-account-plus</v-icon>
            Inscrire Enseignant
          </v-btn>
        </v-col>
        <v-col cols="12" sm="4" md="3" class="d-flex justify-center">
          <v-btn @click="showAddForm = true" color="primary" class="ma-2" block>
            <v-icon start>mdi-account-multiple-plus</v-icon>
            Ajouter Enseignant
          </v-btn>
        </v-col>
      </v-row>

      <!-- Navigation par cartes -->
      <v-row justify="center" class="my-4" dense>
        <v-col cols="12" sm="6" md="4">
          <v-card @click="navigateTo('CahierDeTexte')" class="clickable-card lime lighten-5">
            <v-card-title class="text-center d-flex justify-center align-center">
              <v-icon color="green" class="mr-2">mdi-book-open-variant</v-icon>
              Cahiers de Texte / Classe
            </v-card-title>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-card @click="navigateTo('MesEnseignants')" class="clickable-card lime lighten-5">
            <v-card-title class="text-center d-flex justify-center align-center">
              <v-icon color="green" class="mr-2">mdi-account-group</v-icon>
              Mes Enseignants
            </v-card-title>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-card @click="navigateTo('EnseignantParclasse')" class="clickable-card lime lighten-5">
            <v-card-title class="text-center d-flex justify-center align-center">
              <v-icon color="green" class="mr-2">mdi-google-classroom</v-icon>
              Enseignants / Classes
            </v-card-title>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Composant sélectionné -->
    <div v-else>
      <v-btn icon @click="currentComponent = 'default'" class="mb-4">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <component
        :is="currentComponent"
        :annee-scolaire="anneeScolaire"
        :annee-scolaire-id="anneeScolaireId"
        :etablissement-id="etablissementId"
        @component-selected="currentComponent = $event"
      />
    </div>

    <!-- Dialogues -->
    <v-dialog v-model="errorDialog" max-width="400px">
      <v-card color="red lighten-4">
        <v-card-title class="text-h6">
          <v-icon start color="red">mdi-alert-circle</v-icon>
          Erreur
        </v-card-title>
        <v-card-text class="text-body-2">{{ errorMessage }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="red darken-1" text @click="errorDialog = false">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="alertDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h6">
          <v-icon color="orange" class="mr-2">mdi-alert</v-icon>
          Avertissement
        </v-card-title>
        <v-card-text class="text-body-2">{{ alertMessage }}</v-card-text>
        <v-card-actions>
          <v-btn color="error" @click="alertDialog = false">Non</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="confirmAddAnyway">Oui</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="replaceDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h6">
          <v-icon color="warning" class="mr-2">mdi-alert-circle-outline</v-icon>
          Confirmation de remplacement
        </v-card-title>
        <v-card-text class="text-body-2">{{ alertMessage }}</v-card-text>
        <v-card-actions>
          <v-btn color="error" @click="replaceDialog = false">Non</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="success" @click="confirmReplacement">Oui</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Inscription -->
    <v-dialog v-model="showInscriptionForm" max-width="500px">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-account-plus</v-icon>
          Inscrire un Enseignant
        </v-card-title>
        <v-card-text>
          <v-form @submit.prevent="handleInscription">
            <v-text-field v-model="newTeacher.name" label="Nom" required></v-text-field>
            <v-text-field v-model="newTeacher.firstName" label="Prénom" required></v-text-field>
            <v-text-field v-model="newTeacher.email" label="Email" type="email" required></v-text-field>
            <v-text-field v-model="newTeacher.phone" label="Téléphone" type="tel" required></v-text-field>
            <v-btn type="submit" color="primary">Inscrire</v-btn>
            <v-btn @click="showInscriptionForm = false" color="secondary">Annuler</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Dialog: Ajouter Enseignant -->
    <v-dialog v-model="showAddForm" max-width="500px">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-account-multiple-plus</v-icon>
          Ajouter un Enseignant
        </v-card-title>
        <v-card-text>
          <v-form @submit.prevent="handleAdd">
            <v-autocomplete v-model="selectedTeacher" :items="teachers" item-title="fullname" item-value="id" label="Enseignant" required></v-autocomplete>
            <v-autocomplete v-model="selectedClass" :items="classes" item-title="nom" item-value="id" label="Classe" required></v-autocomplete>
            <v-autocomplete v-model="selectedSubject" :items="subjects" item-title="nom" item-value="id" label="Matière" required></v-autocomplete>
            <v-autocomplete v-model="selectedCoefficient" :items="coefficient" item-title="valeur" item-value="id" label="Coefficient" required></v-autocomplete>
            <v-btn type="submit" color="primary">Ajouter</v-btn>
            <v-btn @click="showAddForm = false" color="secondary">Annuler</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Dialog: Ajouter Matière -->
    <v-dialog v-model="showAddSubjectForm" max-width="400px">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-book-plus</v-icon>
          Ajouter une Matière
        </v-card-title>
        <v-card-text>
          <v-form @submit.prevent="handleAddSubject">
            <v-text-field v-model="newSubject.name" label="Nom de la matière" required></v-text-field>
            <v-btn type="submit" color="primary">Ajouter</v-btn>
            <v-btn @click="showAddSubjectForm = false" color="secondary">Annuler</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Dialog: Informations de connexion -->
    <v-dialog v-model="showGeneratedInfo" max-width="400px">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-lock</v-icon>
          Informations de Connexion
        </v-card-title>
        <v-card-text class="text-body-2">
          <div v-if="generatedInfo">
            <p><strong>Nom d'utilisateur:</strong> {{ generatedInfo.username }}</p>
            <p><strong>Mot de passe:</strong> {{ generatedInfo.password }}</p>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="showGeneratedInfo = false">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>


<script>
import MesEnseignants from './MesEnseignants.vue';
import CahierDeTexte from './CahierDeTexte.vue';
import EnseignantParclasse from './EnseignantParclasse.vue';
import axios from 'axios';

export default {
  components: { MesEnseignants, CahierDeTexte,EnseignantParclasse },
  props: {
    etablissementId: Number,
    etablissementNom: String,
    anneeScolaire: String,
    anneeScolaireId: Number,
  },
  data() {
    return {
      showInscriptionForm: false,
      showAddForm: false,
      showAddSubjectForm: false,
      showGeneratedInfo: false,
      errorDialog: false,
      alertDialog: false,
      replaceDialog: false,
      errorMessage: '',
      alertMessage: '',
      generatedInfo: null,
      teachers: [],
      classes: [],
      subjects: [],
      coefficient: [],
      selectedTeacher: null,
      selectedClass: null,
      selectedSubject: null,
      selectedCoefficient: null,
      currentComponent: 'default',
      pendingAssignmentData: null,
      newTeacher: {
        name: '', firstName: '', email: '', phone: '', username: '', password: '', etablissementId: this.etablissementId,
      },
      newSubject: {
        name: '', etablissementId: this.etablissementId,
      },
    };
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      try {
        const [teachersRes, classesRes, subjectsRes, coefficientRes] = await Promise.all([
          axios.get(`http://localhost:8080/api/Enseignants/${this.etablissementId}`),
          axios.get(`http://localhost:8080/api/classe/${this.etablissementId}`),
          axios.get(`http://localhost:8080/api/Matieres/${this.etablissementId}`),
          axios.get('http://localhost:8080/api/Coefficient')
        ]);
        this.teachers = teachersRes.data.map(t => ({ id: t.id, fullname: `${t.nom} ${t.prenom}` }));
        this.classes = classesRes.data;
        this.subjects = subjectsRes.data;
        this.coefficient = coefficientRes.data;
      } catch (error) {
        this.showError('Erreur de chargement des données.');
      }
    },
    navigateTo(component) {
      this.currentComponent = component;
    },
    async handleInscription() {
  try {
    this.newTeacher.username = this.generateUsername(this.newTeacher.name, this.newTeacher.firstName);
    this.newTeacher.password = this.generatePassword();

    const response = await axios.post('http://localhost:8080/api/Enseignants', {
      ...this.newTeacher,
      etablissementId: this.etablissementId
    });

    this.generatedInfo = {
      username: this.newTeacher.username,
      password: this.newTeacher.password
    };
    this.showGeneratedInfo = true;

    this.newTeacher = {
      name: '',
      firstName: '',
      email: '',
      phone: '',
      username: '',
      password: ''
    };
    this.showInscriptionForm = false;
    this.fetchData();

  } catch (error) {
    // Gestion d'erreur précise
    if (error.response && error.response.status === 409) {
      const message = error.response.data.error;
      this.showError(message); // Ou utiliser une modal/dialogue
    } else {
      this.showError("Échec de l'inscription de l'enseignant.");
    }
  }
},

    async handleAddSubject() {
  if (!this.newSubject.name) {
    this.showError("Le nom de la matière est requis.");
    return;
  }

  try {
    // Envoi au backend
    await axios.post('http://localhost:8080/api/Matieres', {
      name: this.newSubject.name,
      etablissementId: this.etablissementId
    });

    // Fermeture du formulaire + réinitialisation
    this.showAddSubjectForm = false;
    this.newSubject.name = '';

    // Rafraîchir la liste des matières
    this.fetchData();
  } catch (error) {
    this.showError("Erreur lors de l'ajout de la matière.");
  }
},

async handleAdd() {
  const data = {
    teacherId: this.selectedTeacher,
    class: this.selectedClass,
    subject: this.selectedSubject,
    coefficient: this.selectedCoefficient,
    etablissement: this.etablissementId,
    anneeScolaireId: this.anneeScolaireId
  };

  try {
    await axios.post('http://localhost:8080/api/Enseignants/add', data);
    this.resetAddForm();
  } catch (error) {
    const message = error?.response?.data?.message || "Une erreur est survenue.";
    console.log("Message d'erreur reçu:", message);

    if (message.includes("enseigné par un autre enseignant")) {
      // Cas remplacement
      this.alertMessage = "Un enseignant est déjà affecté à cette matière. Voulez-vous le remplacer ?";
      this.pendingAssignmentData = { ...data, forceReplace: true };
      this.replaceDialog = true;
    } else if (message.includes("déjà une matière assignée")) {
      // Cas avertissement simple
      this.alertMessage = message;
      this.pendingAssignmentData = data;
      this.alertDialog = true;
    } else {
      // Cas d'erreur générique
      this.showError(message);
    }
  }
},


// Appelé lorsque l’utilisateur confirme le remplacement
async confirmReplacement() {
  try {
    await axios.post('http://localhost:8080/api/Enseignants/add', {
      ...this.pendingAssignmentData,
      forceReplace: true
    });
    this.replaceDialog = false;
    this.resetAddForm();
  } catch (error) {
    this.showError(error?.response?.data?.message || "Échec du remplacement.");
  }
},

async confirmAddAnyway() {
  try {
    this.pendingAssignmentData.force = true;
    await axios.post('http://localhost:8080/api/Enseignants/add', this.pendingAssignmentData);
    this.resetAddForm();
    this.alertDialog = false;
    this.pendingAssignmentData = null;
  } catch (error) {
    this.alertDialog = false;
    this.showError("Erreur lors de l'ajout malgré l'avertissement.");
  }
},


resetAddForm() {
  this.selectedTeacher = this.selectedClass = this.selectedSubject = this.selectedCoefficient = null;
  this.showAddForm = false;
},

    generateUsername(name, firstName) {
      const randomNum = Math.floor(Math.random() * 1000);
      return `${name.toLowerCase()}.${firstName.toLowerCase()}${randomNum}`;
    },
    generatePassword() {
      return Math.random().toString(36).slice(-8);
    },
    navigateTo(component) {
      this.currentComponent = component;
    },
    showError(message) {
      this.errorMessage = message;
      this.errorDialog = true;
    }
  }
};
</script>


<style scoped>
.v-btn {
  text-transform: none;
  font-weight: 500;
  border-radius: 8px;
  font-size: 1rem;
}

.v-btn v-icon {
  font-size: 20px;
}

.clickable-card {
  text-align: center;
  padding: 20px;
  cursor: pointer;
  border-radius: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.clickable-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.v-card-title {
  font-weight: 600;
  font-size: 1.1rem;
}

/* Responsive pour petits écrans */
@media (max-width: 600px) {
  .v-btn {
    font-size: 0.75rem;
    padding: 6px 12px;
  }

  .v-card-title,
  .v-card-text,
  .v-text-field,
  .v-autocomplete {
    font-size: 0.8rem !important;
  }

  .clickable-card {
    padding: 12px;
  }
}

/* Responsive pour grands écrans */
@media (min-width: 960px) {
  .v-btn {
    font-size: 1rem;
  }

  .v-card-title {
    font-size: 1.2rem;
  }

  .clickable-card {
    padding: 28px;
  }
}
</style>
