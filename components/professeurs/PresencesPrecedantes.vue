<template>
    <div>
        <v-btn color="blue darken-2" dark @click="$emit('back')">Retour</v-btn>
      <h1>Liste des absents du dernier cours</h1>
      <div v-if="loading">Chargement des données...</div>
      <div v-else-if="error">{{ error }}</div>
      <div v-else>
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Motif</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="eleve in absents" :key="eleve.id">
              <td>{{ eleve.nom }}</td>
              <td>{{ eleve.prenom }}</td>
              <td>{{ eleve.motif }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="absents.length === 0">Aucun élève absent à la dernière date renseignée.</p>
      </div>
    </div>
  </template>
  
  <script>
  import axios from "axios";
  
  export default {
    name: 'PresencesPrecedantes',
    props: {
      subjectId: {
        type: Number,
        required: true,
      },
      classeId: {
        type: Number,
        required: true,
      },
      etablissementId: {
        type: Number,
        required: true,
      },
    },
    data() {
      return {
        absents: [], // Liste des élèves absents
        loading: false,
        error: null,
      };
    },
    methods: {
      async fetchAbsents() {
        this.loading = true;
        this.error = null;
  
        try {
          // Appel à l'API
          const response = await axios.get(
            `http://localhost:8080/api/absents`,
            {
              params: {
                classeId: this.classeId,
                etablissementId: this.etablissementId,
              },
            }
          );
  
          // Traitement des données
          if (response.data && response.data.length > 0) {
            this.absents = response.data;
          } else {
            this.absents = [];
          }
        } catch (err) {
          console.error("Erreur lors du chargement des absents :", err);
          this.error = "Impossible de récupérer les données. Veuillez réessayer.";
        } finally {
          this.loading = false;
        }
      },
      goBack() {
        // Redirection ou action de retour
        this.$emit("go-back"); // Émet un événement pour que le parent gère la navigation
        // Vous pouvez également utiliser une navigation via Vue Router si applicable :
        // this.$router.back();
      },
    },
    mounted() {
      // Charger les données lorsque le composant est monté
      this.fetchAbsents();
    },
  };
  </script>
  
  <style scoped>
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
  }
  
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
  }
  
  th {
    background-color: #f4f4f4;
    text-align: left;
  }
  
  tr:nth-child(even) {
    background-color: #f9f9f9;
  }
  
  .btn-retour {
    display: inline-block;
    margin-bottom: 20px;
    padding: 10px 20px;
    background-color: #007BFF;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
  }
  
  .btn-retour:hover {
    background-color: #0056b3;
  }
  </style>
  