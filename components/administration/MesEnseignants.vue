<template>
  <v-container fluid class="enseignants-container">
    <!-- Barre de recherche -->
    <v-text-field
      v-model="searchQuery"
      label="🔍 Rechercher par nom ou prénom"
      prepend-inner-icon="mdi-magnify"
      clearable
      class="mb-6"
      dense
      variant="outlined"
    ></v-text-field>

    <!-- Alerte si aucun enseignant -->
    <div v-if="enseignants.length === 0" class="text-center my-5">
      <v-alert
        type="info"
        color="blue lighten-5"
        border="start"
        elevation="2"
        icon="mdi-information-outline"
        prominent
        class="alert-enseignant"
      >
        Aucun enseignant trouvé. Cliquez sur <strong>Inscrire un enseignant</strong> dans <strong>Gestion Enseignants</strong>.
      </v-alert>
    </div>

    <!-- Cartes des enseignants -->
    <v-row v-else>
      <v-col
        v-for="enseignant in filteredEnseignants"
        :key="enseignant.id"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card class="enseignant-card" elevation="4" rounded>
          <v-card-title class="d-flex align-center">
            <v-icon class="me-2" color="primary">mdi-account-circle</v-icon>
            <span class="title">{{ enseignant.nom }} {{ enseignant.prenom }}</span>
          </v-card-title>

          <v-card-subtitle>
            <v-icon start class="me-1" size="16">mdi-email</v-icon> {{ enseignant.email }}
          </v-card-subtitle>

          <v-card-text class="text--primary">
            <p><v-icon start size="18" class="me-1">mdi-phone</v-icon> {{ enseignant.telephone }}</p>
            <p><v-icon start size="18" class="me-1">mdi-school</v-icon> Classes : <strong>{{ enseignant.classes.join(', ') }}</strong></p>
            <p><v-icon start size="18" class="me-1">mdi-book-open-variant</v-icon> Matières : <strong>{{ enseignant.matieres.join(', ') }}</strong></p>
          </v-card-text>

          <v-card-actions>
            <v-btn color="blue darken-1" variant="outlined" @click="editEnseignant(enseignant)" size="small">
              <v-icon start size="18">mdi-pencil</v-icon> Modifier
            </v-btn>
            <v-btn color="red darken-1" variant="outlined" @click="deleteEnseignant(enseignant.id)" size="small">
              <v-icon start size="18">mdi-delete</v-icon> Supprimer
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialogue de modification -->
    <v-dialog v-model="dialog" max-width="500" scrollable>
      <v-card rounded>
        <v-card-title class="headline d-flex align-center">
          <v-icon color="primary" class="me-2">mdi-account-edit</v-icon>
          Modifier Enseignant
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-container>
            <v-row dense>
              <v-col cols="12" v-for="field in fields" :key="field.model">
                <v-text-field
                  v-model="selectedEnseignant[field.model]"
                  :label="field.label"
                  :type="field.type || 'text'"
                  :prepend-inner-icon="field.icon"
                  dense
                  outlined
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text color="grey" @click="dialog = false">
            Annuler
          </v-btn>
          <v-btn color="primary" @click="updateEnseignant">
            <v-icon start>mdi-content-save</v-icon> Enregistrer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>


<script>
import axios from 'axios';

export default {
  props: {
    etablissementId: {
      type: Number,
      required: true
    },
    etablissementNom: {
      type: String,
      required: true
    },
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
      enseignants: [],
      searchQuery: '',
      selectedEnseignant: null,
      dialog: false,
    };
  },
  computed: {
    filteredEnseignants() {
      return this.enseignants.filter(enseignant =>
        enseignant.nom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        enseignant.prenom.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    },
  },
  mounted() {
    this.fetchEnseignants();
  },
  methods: {
    async fetchEnseignants() {
      try {
        const response = await axios.get(`/api/EnseignantAdmin/${this.etablissementId}`, this.authHeaders());
        this.enseignants = response.data;
        console.log(response.data);
        console.log(this.etablissementId);
      } catch (error) {
        console.error('Erreur lors de la récupération des enseignants', error);
      }
    },
    editEnseignant(enseignant) {
      this.selectedEnseignant = { ...enseignant };
      this.dialog = true;
    },
    authHeaders() {
      const token = localStorage.getItem('token');
      return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    },
    async updateEnseignant() {
      const { id, nom, prenom, email, telephone, nom_utilisateur, mot_de_passe } = this.selectedEnseignant;
      const data = { name: nom, firstName: prenom, email, phone: telephone, username: nom_utilisateur, password: mot_de_passe };
      try {
        await axios.put(`/api/Enseignants/${id}`, data, this.authHeaders());
        this.dialog = false;
        this.fetchEnseignants();
      } catch (error) {
        console.error("Erreur lors de la mise à jour de l'enseignant", error);
      }
    },
    async deleteEnseignant(id) {
      try {
        await axios.delete(`/api/Enseignants/${id}`, this.authHeaders());
        this.fetchEnseignants();
      } catch (error) {
        console.error("Erreur lors de la suppression de l'enseignant", error);
      }
    },
  },
};
</script>

<style scoped>
.enseignants-container {
  padding: 20px;
}

.title {
  font-weight: 600;
  font-size: 1rem;
}

.enseignant-card {
  transition: 0.3s ease;
}

.enseignant-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.alert-enseignant {
  max-width: 700px;
  margin: auto;
  font-size: 0.9rem;
}

/* Responsive petit écran */
@media (max-width: 600px) {
  .title {
    font-size: 0.85rem;
  }

  .enseignant-card {
    padding: 10px;
  }

  .alert-enseignant {
    font-size: 0.75rem;
    padding: 10px;
  }

  .v-btn {
    font-size: 0.7rem !important;
    padding: 4px 8px !important;
  }

  .v-card-title {
    font-size: 0.9rem;
  }

  .v-card-subtitle,
  .v-card-text {
    font-size: 0.8rem;
  }
}

/* Grand écran */
@media (min-width: 961px) {
  .title {
    font-size: 1.1rem;
  }

  .v-card-subtitle,
  .v-card-text {
    font-size: 0.95rem;
  }
}
</style>

