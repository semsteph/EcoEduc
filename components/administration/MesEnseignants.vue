<template>
  <v-container>
    <v-text-field
      v-model="searchQuery"
      label="Rechercher par nom ou prénom"
      class="mb-4"
    ></v-text-field>

    <v-row>
      <v-col
        v-for="enseignant in filteredEnseignants"
        :key="enseignant.id"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card class="mx-auto" max-width="400">
          <v-card-title>
            {{ enseignant.nom }} {{ enseignant.prenom }}
          </v-card-title>
          <v-card-subtitle>
            {{ enseignant.email }}
          </v-card-subtitle>
          <v-card-text>
            <p>Téléphone: {{ enseignant.telephone }}</p>
            <p>Nom d'utilisateur: {{ enseignant.nom_utilisateur }}</p>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="editEnseignant(enseignant)">
              Modifier
            </v-btn>
            <v-btn color="red" @click="deleteEnseignant(enseignant.id)">
              Supprimer
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>
          <span class="headline">Modifier Enseignant</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="selectedEnseignant.nom"
                  label="Nom"
                ></v-text-field>
                <v-text-field
                  v-model="selectedEnseignant.prenom"
                  label="Prénom"
                ></v-text-field>
                <v-text-field
                  v-model="selectedEnseignant.email"
                  label="Email"
                ></v-text-field>
                <v-text-field
                  v-model="selectedEnseignant.telephone"
                  label="Téléphone"
                ></v-text-field>
                <v-text-field
                  v-model="selectedEnseignant.nom_utilisateur"
                  label="Nom d'utilisateur"
                ></v-text-field>
                <v-text-field
                  v-model="selectedEnseignant.mot_de_passe"
                  label="Mot de passe"
                  type="password"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="dialog = false">
            Annuler
          </v-btn>
          <v-btn color="blue darken-1" text @click="updateEnseignant">
            Enregistrer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from 'axios';

export default {
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
        const response = await axios.get('http://localhost:8080/api/Enseignant');
        this.enseignants = response.data;
        console.log(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des enseignants', error);
      }
    },
    editEnseignant(enseignant) {
      this.selectedEnseignant = { ...enseignant };
      this.dialog = true;
    },
    async updateEnseignant() {
      const { id, nom, prenom, email, telephone, nom_utilisateur, mot_de_passe } = this.selectedEnseignant;
      const data = { name: nom, firstName: prenom, email, phone: telephone, username: nom_utilisateur, password: mot_de_passe };
      try {
        await axios.put(`http://localhost:8080/api/Enseignants/${id}`, data);
        this.dialog = false;
        this.fetchEnseignants();
      } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'enseignant', error);
      }
    },
    async deleteEnseignant(id) {
      try {
        await axios.delete(`http://localhost:8080/api/Enseignants/${id}`);
        this.fetchEnseignants();
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'enseignant', error);
      }
    },
  },
};
</script>

<style scoped>
/* Ajoutez vos styles ici */
</style>
