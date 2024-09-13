<template>
    <v-container>
      <!-- Toolbar with title and button to add new payment -->
      <v-toolbar flat>
        <v-toolbar-title>Paiements</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="showForm = true">
          Ajouter un nouveau paiement
        </v-btn>
      </v-toolbar>
  
      <!-- Table with payment details and status -->
      <v-row>
        <v-col>
          <v-simple-table>
            <thead>
              <tr>
                <th class="pa-3">Détails</th>
                <th class="pa-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in rows" :key="index">
                <td class="pa-3">
                  <div>
                    <div>Scolarité: {{ row.scolarite }}</div>
                    <div>Tranche 1: {{ row.tranche1 }}</div>
                    <div>Tranche 2: {{ row.tranche2 }}</div>
                    <div>Tranche 3: {{ row.tranche3 }}</div>
                    <div>Tranche 4: {{ row.tranche4 }}</div>
                  </div>
                </td>
                <td class="pa-3">
                  <v-chip>{{ row.statut }}</v-chip>
                </td>
              </tr>
            </tbody>
          </v-simple-table>
        </v-col>
      </v-row>
  
      <!-- Dialog for adding a new payment -->
      <v-dialog v-model="showForm" max-width="600px">
        <v-card>
          <v-card-title>Ajouter un paiement</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="addPayment">
              <v-text-field
                v-model="newPayment.studentId"
                label="ID de l'élève"
                required
              ></v-text-field>
              <v-text-field
                v-model="newPayment.scolarite"
                label="Scolarité"
                required
              ></v-text-field>
              <v-select
                v-model="newPayment.tranche"
                :items="['Tranche 1', 'Tranche 2', 'Tranche 3', 'Tranche 4']"
                label="Tranche"
                required
              ></v-select>
              <v-select
                v-model="newPayment.statut"
                :items="['Payer', 'Non payer']"
                label="Statut"
                required
              ></v-select>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="blue darken-1" text @click="showForm = false">
                  Annuler
                </v-btn>
                <v-btn color="primary" type="submit">Ajouter</v-btn>
              </v-card-actions>
            </v-form>
          </v-card-text>
        </v-card>
      </v-dialog>
    </v-container>
  </template>
  
  <script>
  export default {
    data() {
      return {
        showForm: false,
        rows: [
          {
            scolarite: "1000",
            tranche1: "250",
            tranche2: "250",
            tranche3: "250",
            tranche4: "250",
            statut: "Payer",
          },
        ],
        newPayment: {
          studentId: "",
          scolarite: "",
          tranche: "",
          statut: "",
        },
      };
    },
    methods: {
      addPayment() {
        // Ajouter un nouveau paiement à la liste
        this.rows.push({
          scolarite: this.newPayment.scolarite,
          tranche1:
            this.newPayment.tranche === "Tranche 1"
              ? this.newPayment.scolarite / 4
              : "0",
          tranche2:
            this.newPayment.tranche === "Tranche 2"
              ? this.newPayment.scolarite / 4
              : "0",
          tranche3:
            this.newPayment.tranche === "Tranche 3"
              ? this.newPayment.scolarite / 4
              : "0",
          tranche4:
            this.newPayment.tranche === "Tranche 4"
              ? this.newPayment.scolarite / 4
              : "0",
          statut: this.newPayment.statut,
        });
  
        this.showForm = false;
        this.resetForm();
      },
      resetForm() {
        // Réinitialiser le formulaire après l'ajout
        this.newPayment = {
          studentId: "",
          scolarite: "",
          tranche: "",
          statut: "",
        };
      },
    },
  };
  </script>
  
  <style scoped>
  .v-simple-table th,
  .v-simple-table td {
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  
  .v-chip {
    font-weight: bold;
  }
  
  .v-text-field,
  .v-select {
    margin-bottom: 20px;
  }
  
  .v-toolbar-title {
    font-weight: bold;
  }
  
  .pa-3 {
    padding: 24px;
  }
  
  .v-row > .v-col {
    border-bottom: 1px dashed #ccc;
    padding: 8px 0;
  }
  
  .v-row {
    margin-bottom: 16px;
  }
  
  .v-simple-table td div {
    margin-bottom: 8px;
  }
  </style>
  