<template>
  <v-container class="pa-2 pa-sm-4 pa-md-8 page-bg" fluid>
    <v-row justify="center">
      <v-col cols="12" sm="8" md="6" lg="5">
        <v-card class="rounded-xl elevation-4 overflow-hidden">
          <v-toolbar flat color="primary" dark>
            <v-icon dark class="mr-3">mdi-account-cog-outline</v-icon>
            <v-toolbar-title class="font-weight-bold">Mon profil</v-toolbar-title>
          </v-toolbar>

          <v-card-text class="pa-2 pa-sm-6">
            <div class="mb-4">
              <div class="text-caption grey--text">Connecté en tant que</div>
              <div class="text-h6 font-weight-bold">{{ nom }}</div>
              <v-chip small color="deep-purple" dark class="mt-1">{{ poste }}</v-chip>
            </div>

            <v-divider class="my-4"></v-divider>

            <div class="font-weight-bold mb-3">Changer mon mot de passe</div>

            <v-form @submit.prevent="submit">
              <v-text-field
                v-model="ancienMotDePasse"
                label="Ancien mot de passe"
                type="password"
                outlined
                dense
                class="mb-2"
              ></v-text-field>

              <v-text-field
                v-model="nouveauMotDePasse"
                label="Nouveau mot de passe"
                type="password"
                outlined
                dense
                class="mb-2"
              ></v-text-field>

              <v-text-field
                v-model="confirmationMotDePasse"
                label="Confirmer le nouveau mot de passe"
                type="password"
                outlined
                dense
                class="mb-4"
              ></v-text-field>

              <v-btn
                color="primary"
                block
                large
                class="rounded-xl text-none font-weight-bold"
                :loading="isSaving"
                @click="submit"
              >
                Enregistrer
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="4500" rounded="pill" top right>
      {{ snackText }}
      <template v-slot:action="{ attrs }">
        <v-btn text v-bind="attrs" @click="snackbar = false">Fermer</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import axios from "axios";

const API_BASE = "/api";

export default {
  name: "MonProfil",

  data() {
    return {
      nom: "",
      poste: "",
      ancienMotDePasse: "",
      nouveauMotDePasse: "",
      confirmationMotDePasse: "",
      isSaving: false,
      snackbar: false,
      snackText: "",
      snackColor: "success",
    };
  },

  mounted() {
    this.nom = localStorage.getItem("administration_nom") || "";
    this.poste = localStorage.getItem("poste") || "";
  },

  methods: {
    showNotify(text, color = "success") {
      this.snackText = text;
      this.snackColor = color;
      this.snackbar = true;
    },

    async submit() {
      if (!this.ancienMotDePasse || !this.nouveauMotDePasse) {
        this.showNotify("Renseignez l'ancien et le nouveau mot de passe.", "error");
        return;
      }
      if (this.nouveauMotDePasse !== this.confirmationMotDePasse) {
        this.showNotify("La confirmation ne correspond pas au nouveau mot de passe.", "error");
        return;
      }

      this.isSaving = true;
      try {
        const token = localStorage.getItem("token");
        await axios.put(
          `${API_BASE}/administration/mon-mot-de-passe`,
          {
            ancien_mot_de_passe: this.ancienMotDePasse,
            nouveau_mot_de_passe: this.nouveauMotDePasse,
          },
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );

        this.showNotify("Mot de passe modifié avec succès.");
        this.ancienMotDePasse = "";
        this.nouveauMotDePasse = "";
        this.confirmationMotDePasse = "";
      } catch (error) {
        this.showNotify(error.response?.data?.message || "Erreur lors du changement de mot de passe.", "error");
      } finally {
        this.isSaving = false;
      }
    },
  },
};
</script>

<style scoped>
.page-bg {
  min-height: calc(100vh - 64px);
}
</style>
