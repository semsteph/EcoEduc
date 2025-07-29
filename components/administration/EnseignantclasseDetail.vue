<template>
  <v-container max-width="960" class="mx-auto pa-4">
    <!-- Header -->
    <v-row align="center" class="mb-6">
      <v-col cols="auto" class="d-flex align-center">
        <v-icon color="primary" size="28" class="mr-2">mdi-school</v-icon>
        <h3 class="font-weight-bold mb-0 text-title">Liste des Enseignants & Matières</h3>
      </v-col>
      <v-spacer></v-spacer>
      <v-col cols="auto">
        <v-btn
          color="primary"
          :loading="loading"
          @click="fetchInfos"
          rounded
          elevation="3"
          class="text-none font-weight-semibold btn-small"
        >
          <v-icon left size="18">mdi-refresh</v-icon>
          Rafraîchir
        </v-btn>
      </v-col>
    </v-row>

    <!-- Spinner de chargement -->
    <v-row justify="center" v-if="loading" class="my-12">
      <v-progress-circular indeterminate color="primary" size="40" width="4" />
    </v-row>

    <!-- Message d'erreur -->
    <v-alert
      v-if="error"
      type="error"
      border="left"
      colored-border
      dense
      elevation="3"
      rounded
      class="mb-6"
    >
      <v-icon left size="18">mdi-alert-circle</v-icon>
      {{ error }}
    </v-alert>

    <!-- Grille de cartes -->
    <v-row v-if="enseignements.length && !loading" dense>
      <v-col
        v-for="(item, index) in enseignements"
        :key="index"
        cols="12"
        sm="6"
        md="4"
        class="d-flex"
      >
        <v-card class="pa-4 elevation-3 rounded-lg card-hover w-100">
          <!-- Infos enseignant -->
          <div class="d-flex align-center mb-3">
            <v-icon color="#1565c0" size="22" class="mr-2">mdi-account</v-icon>
            <div>
              <div class="font-weight-bold text-name">{{ item.nom }} {{ item.prenom }}</div>
              <div class="text-caption grey--text">Enseignant</div>
            </div>
          </div>

          <!-- Matière -->
          <div class="mb-2 d-flex align-center">
            <v-icon color="orange darken-2" size="18">mdi-book-open-page-variant</v-icon>
            <span class="ml-2 text-body-2">{{ item.matiere }}</span>
          </div>

          <!-- Coefficient -->
          <div class="d-flex align-center">
            <v-icon color="green darken-2" size="18">mdi-chart-bar</v-icon>
            <span class="ml-2 text-caption font-weight-bold">
              Coefficient: <span class="text-body-1">{{ item.coefficient }}</span>
            </span>
          </div>

          <!-- Actions -->
          <v-divider class="my-3" />
          <div class="d-flex justify-end">
            <v-icon
              color="blue darken-2"
              size="20"
              class="mr-3 icon-action"
              @click="modifierEnseignement(item)"
              title="Modifier"
            >
              mdi-pencil
            </v-icon>
            <v-icon
              color="red darken-2"
              size="20"
              class="icon-action"
              @click="confirmerSuppression(item)"
              title="Supprimer"
            >
              mdi-delete
            </v-icon>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Aucun résultat -->
    <v-alert
      v-else-if="!loading && !enseignements.length"
      type="info"
      border="left"
      dense
      elevation="2"
      rounded
      class="mt-8"
    >
      <v-icon left color="#1565c0" size="18">mdi-information</v-icon>
      Aucune donnée trouvée pour cette classe et cet établissement.
    </v-alert>

    <!-- Dialogue de suppression -->
    <v-dialog v-model="dialog" max-width="400">
      <v-card>
        <v-card-title class="headline">Confirmer la suppression</v-card-title>
        <v-card-text>
          Êtes-vous sûr de vouloir supprimer cet enseignement ?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="dialog = false">Annuler</v-btn>
          <v-btn color="red" text @click="supprimerConfirmé">Supprimer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
export default {
  name: "EnseignantclasseDetail",
  props: {
    etablissementId: { type: Number, required: true },
    classId: { type: Number, required: true },
  },
  data() {
    return {
      enseignements: [],
      loading: false,
      error: null,
      dialog: false,
      selectedItem: null,
    };
  },
  watch: {
    etablissementId: "fetchInfos",
    classId: "fetchInfos",
  },
  mounted() {
    this.fetchInfos();
  },
  methods: {
    async fetchInfos() {
      if (!this.etablissementId || !this.classId) {
        this.error = "Établissement ou classe non défini.";
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        const response = await fetch(
          `http://localhost:8080/api/enseignements?etablissementId=${this.etablissementId}&classeId=${this.classId}`
        );

        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();
        this.enseignements = data;
      } catch (err) {
        this.error = err.message;
        this.enseignements = [];
      } finally {
        this.loading = false;
      }
    },

    modifierEnseignement(item) {
      console.log("📝 Modifier", item);
    },

    confirmerSuppression(item) {
      this.selectedItem = item;
      this.dialog = true;
    },

    async supprimerConfirmé() {
      const { Enseignants_id, Classes_id, matiere_id } = this.selectedItem || {};
      this.dialog = false;

      try {
        const res = await fetch(`http://localhost:8080/api/enseignements/delete`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Enseignants_id, Classes_id, matiere_id }),
        });

        if (!res.ok) throw new Error("Erreur lors de la suppression");

        // Retirer localement
        this.enseignements = this.enseignements.filter(
          (e) =>
            !(
              e.Enseignants_id === Enseignants_id &&
              e.Classes_id === Classes_id &&
              e.matiere_id === matiere_id
            )
        );
      } catch (error) {
        this.error = error.message;
      }
    },
  },
};
</script>

<style scoped>
.card-hover {
  transition: box-shadow 0.3s ease, transform 0.25s ease;
  cursor: pointer;
}
.card-hover:hover {
  box-shadow: 0 10px 20px rgba(21, 101, 192, 0.25);
  transform: translateY(-4px);
}
.text-name {
  font-size: 1.1rem;
}
.icon-action {
  cursor: pointer;
  transition: transform 0.2s ease;
}
.icon-action:hover {
  transform: scale(1.2);
}
@media (max-width: 960px) {
  .text-name {
    font-size: 1rem;
  }
  .btn-small {
    font-size: 0.8rem !important;
    padding: 4px 10px !important;
  }
}
@media (max-width: 600px) {
  .text-name {
    font-size: 0.9rem;
  }
  .text-body-1,
  .text-body-2,
  .text-caption {
    font-size: 0.75rem !important;
  }
  .icon-action {
    font-size: 18px !important;
  }
}
</style>
