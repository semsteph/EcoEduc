<template>
    <v-container>
      <v-card>
        <v-card-title>
          <span class="headline">Gestion des Parents</span>
        </v-card-title>
        <v-card-subtitle>
          <v-btn @click="showForm = true">Inscrire un Parent</v-btn>
        </v-card-subtitle>
        <v-card-text>
          <!-- Afficher le formulaire d'inscription si showForm est vrai -->
          <v-form v-if="showForm">
            <v-text-field v-model="newParent.name" label="Nom" required></v-text-field>
            <v-text-field v-model="newParent.firstName" label="Prénom" required></v-text-field>
            <v-text-field v-model="newParent.contact" label="Contact" required></v-text-field>
            <v-text-field v-model="newParent.email" label="Email" required></v-text-field>
            <v-text-field
              v-model="newParent.username"
              label="Nom d'utilisateur"
              required
            ></v-text-field>
            <v-text-field
              v-model="newParent.password"
              label="Mot de passe"
              type="password"
              required
            ></v-text-field>
            <v-btn @click="registerParent">Enregistrer</v-btn>
            <v-btn @click="showForm = false">Annuler</v-btn>
          </v-form>
  
          <!-- Tableau affiché si showForm est faux -->
          <v-data-table
            v-else
            :headers="headers"
            :items="parents"
            item-key="id"
            class="elevation-1"
          >
            <template v-slot:top>
              <v-toolbar flat>
                <v-toolbar-title>Liste des Parents</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-text-field
                  v-model="search"
                  append-icon="mdi-magnify"
                  label="Rechercher"
                  single-line
                  hide-details
                ></v-text-field>
              </v-toolbar>
            </template>
            <template v-slot:item.action="{ item }">
              <v-icon small @click="editParent(item)">mdi-pencil</v-icon>
              <v-icon small @click="deleteParent(item)">mdi-delete</v-icon>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-container>
  </template>
  
  <script>
  import axios from 'axios';
  
  export default {
    data() {
      return {
        showForm: false,
        newParent: {
            name: '',
            firstName: '',
            contact: '',
            email: '',
            username: '',
            password: ''
        },
        search: '',
        headers: [
          { text: 'Nom', value: 'name' },
          { text: 'Prénom', value: 'firstName' },
          { text: 'Email', value: 'email' },
          { text: 'Téléphone', value: 'phone' },
          { text: 'Actions', value: 'action', sortable: false },
        ],
        parents: [
          // Exemple de données
          { id: 1, name: 'Doe', firstName: 'John', email: 'john.doe@example.com', phone: '123-456-7890' },
          // Ajoutez ici les autres parents
        ],
      }
    },
    methods: {
      registerParent() {
           axios.post('http://localhost:8080/api/Parents', {
                 name: this.newParent.name,
                 firstName: this.newParent.firstName,
                 email: this.newParent.email,
                 contact: this.newParent.contact,
                 username: this.newParent.username,
                 password: this.newParent.password
  })
  .then(response => {
    // Ajouter le nouveau parent à la liste
    this.parents.push({
      id: response.data.id, // Assurez-vous que l'ID est retourné par l'API
      name: this.newParent.name,
      firstName: this.newParent.firstName,
      email: this.newParent.email,
      phone: this.newParent.contact,
    });

    // Réinitialiser le formulaire
    this.newParent = {
      name: '',
      firstName: '',
      contact: '',
      email: '',
      username: '',
      password: ''
    };

    // Masquer le formulaire
    this.showForm = false;
  })
  .catch(error => {
    console.error('Erreur lors de l\'inscription du parent :', error.response ? error.response.data : error.message);
      });
   }
  }
 }
  </script>
  
  <style scoped>
  /* Ajoutez ici les styles pour le composant ParentManagement */
  </style>
  