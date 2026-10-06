<template>
  <div class="requests-wrapper">
    <v-card :elevation="0" class="pa-3 card-style">
      <!-- Bouton Retour -->
      <div class="d-flex justify-center mb-2">
      </div>

      <v-card-title class="d-flex align-center justify-space-between flex-wrap">
        <span class="text-h6 text-md-h5 text-primary d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-shield-alert-outline</v-icon>
          Demandes de modification de notes
        </span>

        <v-btn-toggle v-model="filtreStatut" mandatory density="compact" color="primary" class="mt-2 mt-sm-0">
          <v-btn value="en_attente" size="small">
            En attente
            <v-badge
              v-if="countEnAttente > 0"
              :content="countEnAttente"
              color="deep-orange accent-3"
              inline
              class="ml-1"
            />
          </v-btn>
          <v-btn value="approuvee" size="small">Approuvées</v-btn>
          <v-btn value="rejetee" size="small">Refusées</v-btn>
          <v-btn value="toutes" size="small">Toutes</v-btn>
        </v-btn-toggle>
      </v-card-title>

      <v-card-subtitle class="text-caption">
        Toute note déjà enregistrée qu'un enseignant souhaite modifier ou supprimer passe obligatoirement
        par cette validation. Rien n'est appliqué au carnet de notes tant que vous n'avez pas approuvé la demande.
      </v-card-subtitle>

      <v-divider class="my-2"></v-divider>

      <v-card-text>
        <div v-if="loading" class="text-center py-3">
          <v-progress-circular indeterminate color="primary" size="40" />
        </div>

        <div v-else-if="demandes.length === 0" class="text-caption text-center py-3 text-grey">
          <v-icon class="mb-2" size="32">mdi-check-circle-outline</v-icon>
          <div>Aucune demande{{ filtreStatut === 'en_attente' ? ' en attente' : '' }} pour le moment</div>
        </div>

        <v-row v-else dense justify="center">
          <v-col v-for="demande in demandes" :key="demande.id" cols="12" md="10" lg="8">
            <v-alert
              :type="alertType(demande.statut)"
              class="pa-3 alert-card"
              border="start"
              :border-color="alertColor(demande.statut)"
              colored-border
              variant="tonal"
            >
              <div class="d-flex justify-space-between align-start flex-wrap">
                <div>
                  <div class="text-body-1">
                    <strong>{{ demande.eleve_prenom }} {{ demande.eleve_nom }}</strong>
                    — Classe <strong>{{ demande.classe_nom }}</strong> · {{ demande.matiere_nom }}
                    <span v-if="demande.semestre_nom">· {{ demande.semestre_nom }}</span>
                  </div>
                  <div class="text-caption mt-1">
                    Demandé par <strong>{{ demande.enseignant_prenom }} {{ demande.enseignant_nom }}</strong>
                    le {{ formatDate(demande.date_demande) }}
                  </div>
                </div>
                <v-chip size="small" :color="alertColor(demande.statut)" variant="elevated">
                  {{ statutLabel(demande.statut) }}
                </v-chip>
              </div>

              <div class="mt-2">
                <v-chip size="small" color="grey-darken-1" variant="outlined" class="mr-2">
                  {{ noteTypeLabel(demande.note_type) }}
                </v-chip>
                <span v-if="demande.type_demande === 'suppression'">
                  Demande de <strong>suppression</strong> — valeur actuelle : <strong>{{ demande.ancienne_valeur ?? '—' }}</strong>
                </span>
                <span v-else>
                  Demande de <strong>modification</strong> — <strong>{{ demande.ancienne_valeur ?? '—' }}</strong>
                  <v-icon size="16">mdi-arrow-right</v-icon>
                  <strong>{{ demande.nouvelle_valeur }}</strong>
                </span>
              </div>

              <div v-if="demande.motif" class="text-caption mt-2">
                <v-icon size="14">mdi-message-text-outline</v-icon>
                Motif de l'enseignant : {{ demande.motif }}
              </div>

              <div v-if="demande.commentaire_admin" class="text-caption mt-1">
                <v-icon size="14">mdi-comment-quote-outline</v-icon>
                Votre réponse : {{ demande.commentaire_admin }}
              </div>

              <template v-if="demande.statut === 'en_attente'">
                <v-textarea
                  v-model="commentaires[demande.id]"
                  label="Commentaire (optionnel)"
                  rows="1"
                  auto-grow
                  density="compact"
                  variant="outlined"
                  class="mt-3"
                  hide-details
                />
                <div class="d-flex justify-end mt-2" style="gap: 8px;">
                  <v-btn
                    color="red-darken-1"
                    variant="elevated"
                    size="small"
                    :loading="processing[demande.id] === 'reject'"
                    :disabled="!!processing[demande.id]"
                    @click="traiter(demande, 'reject')"
                  >
                    <v-icon start size="small">mdi-close-circle-outline</v-icon>
                    Refuser
                  </v-btn>
                  <v-btn
                    color="green-darken-1"
                    variant="elevated"
                    size="small"
                    :loading="processing[demande.id] === 'approve'"
                    :disabled="!!processing[demande.id]"
                    @click="traiter(demande, 'approve')"
                  >
                    <v-icon start size="small">mdi-check-circle-outline</v-icon>
                    Approuver
                  </v-btn>
                </div>
              </template>
              <div v-else class="text-caption mt-2 text-grey">
                Traitée le {{ formatDate(demande.date_traitement) }}
              </div>
            </v-alert>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "NoteModificationRequests",
  props: {
    etablissementId: { type: Number, required: true },
    anneeScolaireId: { type: Number, required: true },
  },
  setup() {
    // Filtre de statut affiché, gardé dans l'adresse (?statut=...).
    const filtreStatut = useUrlState("statut", "en_attente", {
      allowed: ["en_attente", "approuvee", "rejetee", "toutes"],
    });
    return { filtreStatut };
  },
  data() {
    return {
      demandes: [],
      loading: true,
      countEnAttente: 0,
      commentaires: {},
      processing: {},
    };
  },
  watch: {
    etablissementId() { this.init(); },
    anneeScolaireId() { this.init(); },
    filtreStatut() { this.fetchDemandes(); },
  },
  mounted() {
    this.init();
  },
  methods: {
    async init() {
      if (!this.etablissementId || !this.anneeScolaireId) return;
      await this.fetchDemandes();
      await this.markRead();
    },

    authHeaders() {
      const token = localStorage.getItem("token");
      return { headers: { Authorization: `Bearer ${token}` } };
    },

    async fetchDemandes() {
      if (!this.etablissementId || !this.anneeScolaireId) return;
      this.loading = true;
      try {
        const statutParam = this.filtreStatut === "toutes" ? "" : `?statut=${this.filtreStatut}`;
        const res = await axios.get(
          `/api/notes/modification-requests/${this.etablissementId}/${this.anneeScolaireId}${statutParam}`,
          this.authHeaders()
        );
        this.demandes = res.data || [];
        this.countEnAttente = this.demandes.filter((d) => d.statut === "en_attente").length;
        if (this.filtreStatut !== "en_attente") {
          await this.fetchCountEnAttente();
        }
      } catch (error) {
        console.error("❌ Erreur lors de la récupération des demandes de modification de notes:", error);
      } finally {
        this.loading = false;
      }
    },

    async fetchCountEnAttente() {
      try {
        const res = await axios.get(
          `/api/notes/modification-requests/count/${this.etablissementId}/${this.anneeScolaireId}`,
          this.authHeaders()
        );
        this.$emit("update-request-count", res.data.count || 0);
      } catch (error) {
        console.error(error);
      }
    },

    async markRead() {
      try {
        await axios.put(
          `/api/notes/modification-requests/mark-read/${this.etablissementId}/${this.anneeScolaireId}`,
          {},
          this.authHeaders()
        );
        this.$emit("update-request-count", 0);
      } catch (error) {
        console.error("❌ Erreur lors du marquage des demandes comme lues:", error);
      }
    },

    async traiter(demande, action) {
      this.processing = { ...this.processing, [demande.id]: action };
      try {
        await axios.put(
          `/api/notes/modification-requests/${demande.id}/${action}`,
          { commentaire: this.commentaires[demande.id] || null },
          this.authHeaders()
        );
        await this.fetchDemandes();
      } catch (error) {
        console.error(`❌ Erreur lors du traitement (${action}) de la demande:`, error);
        alert(error.response?.data?.message || "Erreur lors du traitement de la demande.");
      } finally {
        const updated = { ...this.processing };
        delete updated[demande.id];
        this.processing = updated;
      }
    },

    formatDate(dateString) {
      if (!dateString) return "—";
      const options = { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" };
      return new Date(dateString).toLocaleDateString("fr-FR", options);
    },

    noteTypeLabel(noteType) {
      const labels = {
        inter1: "Inter 1", inter2: "Inter 2", inter3: "Inter 3", inter4: "Inter 4",
        TP1: "TP 1", TP2: "TP 2", Dev1: "Devoir 1", Dev2: "Devoir 2",
      };
      return labels[noteType] || noteType;
    },

    statutLabel(statut) {
      const labels = { en_attente: "En attente", approuvee: "Approuvée", rejetee: "Refusée" };
      return labels[statut] || statut;
    },

    alertColor(statut) {
      const colors = { en_attente: "orange", approuvee: "green", rejetee: "red" };
      return colors[statut] || "grey";
    },

    alertType(statut) {
      const types = { en_attente: "warning", approuvee: "success", rejetee: "error" };
      return types[statut] || "info";
    },
  },
};
</script>

<style scoped>
.requests-wrapper {
  max-width: 100%;
  padding: 8px;
  display: flex;
  justify-content: center;
}

.card-style {
  width: 100%;
  max-width: 1100px;
  border-radius: 10px;
  background-color: #f9fbff;
}

.alert-card {
  border-radius: 12px;
}

@media (max-width: 600px) {
  .card-style {
    padding: 12px !important;
  }
}
</style>
