<template>
  <v-container class="pa-2 pa-sm-4 pa-md-8" fluid>
    <v-card class="mx-auto rounded-xl elevation-2 overflow-hidden" max-width="700">
      <v-toolbar flat color="primary" dark class="px-2">
        <v-icon left>mdi-calendar-clock</v-icon>
        <v-toolbar-title class="font-weight-bold text-h6 text-md-h5">
          Gestion des Années Scolaires
        </v-toolbar-title>
      </v-toolbar>

      <v-card-text class="pa-6">
        <v-alert
          outlined
          color="primary"
          icon="mdi-information"
          class="rounded-lg mb-6 text-body-2"
        >
          Année en cours : <strong>{{ anneeScolaire }}</strong>
        </v-alert>

        <v-row dense class="mb-4">
          <v-col cols="12" sm="6">
            <v-btn
              color="primary"
              block
              elevation="1"
              class="rounded-lg"
              @click="showAddForm = !showAddForm"
            >
              <v-icon left>{{ showAddForm ? 'mdi-minus' : 'mdi-plus' }}</v-icon>
              Ajouter une Année
            </v-btn>
          </v-col>
          <v-col cols="12" sm="6">
            <v-btn
              color="black"
              dark
              block
              elevation="1"
              class="rounded-lg"
              @click="confirmDialog = true"
            >
              <v-icon left>mdi-lock-reset</v-icon>
              Clôturer l'Année
            </v-btn>
          </v-col>
        </v-row>

        <v-expand-transition>
          <div v-if="showAddForm">
            <v-divider class="my-6"></v-divider>
            <v-sheet color="grey lighten-5" class="pa-4 rounded-lg border">
              <h3 class="text-subtitle-1 font-weight-bold mb-4 black--text">
                Nouvelle Année Scolaire
              </h3>
              <v-row dense align="center">
                <v-col cols="12" md="7">
                  <v-text-field
                    v-model="nouvelleAnnee"
                    label="Libellé (ex: 2025-2026)"
                    placeholder="Saisissez l'année"
                    outlined
                    dense
                    hide-details
                    background-color="white"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="5" class="d-flex gap-2">
                  <v-btn color="success" class="flex-grow-1" @click="ajouterAnneeScolaire">
                    Valider
                  </v-btn>
                  <v-btn color="error" icon @click="showAddForm = false">
                    <v-icon>mdi-close-circle</v-icon>
                  </v-btn>
                </v-col>
              </v-row>
            </v-sheet>
          </div>
        </v-expand-transition>
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions class="grey lighten-4 pa-3">
        <v-spacer></v-spacer>
        <span class="text-caption grey--text text--darken-1">
          ID Établissement : {{ etablissementId }}
        </span>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="confirmDialog" max-width="400">
      <v-card class="rounded-lg">
        <v-card-title class="headline error--text">
          <v-icon color="error" left>mdi-alert</v-icon> Confirmation
        </v-card-title>
        <v-card-text class="pt-4 black--text">
          Êtes-vous sûr de vouloir clôturer l'année <strong>{{ anneeScolaire }}</strong> ? 
          Cette action est irréversible et verrouillera les données.
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn text @click="confirmDialog = false">Annuler</v-btn>
          <v-btn color="error" depressed @click="cloturerAnneeScolaire">
            Oui, Clôturer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3000" rounded="pill">
      {{ snackText }}
      <template v-slot:action="{ attrs }">
        <v-btn text v-bind="attrs" @click="snackbar = false">Fermer</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import axios from "axios";

export default {
  props: {
    etablissementId: { type: Number, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true },
  },
  data() {
    return {
      showAddForm: false,
      nouvelleAnnee: "",
      confirmDialog: false,
      snackbar: false,
      snackText: "",
      snackColor: "success",
    };
  },
  methods: {
    showNotify(text, color = "success") {
      this.snackText = text;
      this.snackColor = color;
      this.snackbar = true;
    },

    ajouterAnneeScolaire() {
      if (!this.nouvelleAnnee || !this.etablissementId) {
        this.showNotify("Veuillez saisir une année valide", "error");
        return;
      }

      axios
        .post("http://localhost:8080/api/annees-scolaires", {
          annee: this.nouvelleAnnee,
          etablissementId: this.etablissementId,
        })
        .then(() => {
          this.showNotify("Année scolaire ajoutée avec succès !");
          this.showAddForm = false;
          this.nouvelleAnnee = "";
        })
        .catch((error) => {
          console.error(error);
          this.showNotify("Erreur lors de l'ajout", "error");
        });
    },

    async cloturerAnneeScolaire() {
      this.confirmDialog = false;
      try {
        const response = await axios.post(
          "http://localhost:8080/api/cloture-annee-scolaire",
          {
            etablissementId: this.etablissementId,
            anneeScolaireId: this.anneeScolaireId,
          }
        );
        this.showNotify(response.data.message || "Année clôturée !");
      } catch (error) {
        console.error(error);
        this.showNotify("Erreur lors de la clôture", "error");
      }
    },
  },
};
</script>

<style scoped>
.border {
  border: 1px solid #e0e0e0 !important;
}
.gap-2 {
  gap: 8px;
}
/* Adaptation mobile pour le groupe de boutons du formulaire */
@media (max-width: 600px) {
  .gap-2 {
    margin-top: 10px;
  }
}
</style>