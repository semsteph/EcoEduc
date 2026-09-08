<template>
  <v-container class="dv-page">
    <!-- TOP BAR -->
    <div class="dv-topbar">
      <v-btn class="dv-back" variant="tonal" color="black" @click="$emit('back')">
        <v-icon start>mdi-arrow-left</v-icon>
        <span class="dv-hide-xs">Retour</span>
      </v-btn>

      <div class="dv-title">
        <div class="dv-h1">
          <v-icon class="mr-2" color="white">mdi-notebook-edit-outline</v-icon>
          Devoirs
        </div>
        <div class="dv-sub dv-hide-sm">
          Donnez des exercices à faire à la maison et suivez qui ne les a pas faits.
        </div>
      </div>

      <div class="dv-spacer" />

      <v-btn class="dv-add dv-hide-sm" color="primary" @click="openAddDialog">
        <v-icon start>mdi-plus</v-icon>
        Donner un devoir
      </v-btn>
    </div>

    <!-- DESKTOP TABLE -->
    <v-card class="dv-card dv-hide-xs" elevation="10">
      <div class="dv-card-head">
        <div class="dv-card-head-title">
          <v-icon class="mr-2" color="white">mdi-format-list-bulleted</v-icon>
          Devoirs donnés
        </div>
        <v-chip class="dv-chip-year" variant="tonal" color="white">
          <v-icon start size="16">mdi-calendar</v-icon>
          {{ anneeScolaire }}
        </v-chip>
      </div>

      <v-data-table
        :headers="tableHeaders"
        :items="devoirs"
        item-key="id"
        class="dv-table"
        density="comfortable"
        :items-per-page="8"
        :loading="loading"
      >
        <template #item.created_at="{ item }">
          <div class="dv-date">
            <v-icon size="16" color="primary" class="mr-1">mdi-calendar</v-icon>
            {{ formatDate(item.created_at) }}
          </div>
        </template>

        <template #item.date_limite="{ item }">
          <span v-if="item.date_limite">{{ formatDate(item.date_limite) }}</span>
          <span v-else class="dv-muted">—</span>
        </template>

        <template #item.nonFaitCount="{ item }">
          <v-chip
            :color="item.nonFaitCount > 0 ? 'error' : 'blue-lighten-5'"
            :variant="item.nonFaitCount > 0 ? 'flat' : 'tonal'"
            label
          >
            <v-icon start size="16">mdi-account-alert-outline</v-icon>
            {{ item.nonFaitCount }} non fait{{ item.nonFaitCount > 1 ? "s" : "" }}
          </v-chip>
        </template>

        <template #item.actions="{ item }">
          <v-btn color="primary" variant="tonal" @click="openRosterDialog(item)">
            <v-icon start>mdi-account-check-outline</v-icon>
            Signaler non fait
          </v-btn>
        </template>

        <template #no-data>
          <div class="dv-empty">
            <v-icon size="22" color="primary" class="mr-2">mdi-information-outline</v-icon>
            Aucun devoir donné pour cette classe/matière.
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- MOBILE CARDS -->
    <v-card class="dv-card dv-show-xs" elevation="10">
      <div class="dv-card-head dv-card-head--alt">
        <div class="dv-card-head-title">
          <v-icon class="mr-2" color="white">mdi-format-list-bulleted</v-icon>
          Devoirs donnés
        </div>
      </div>

      <v-card-text class="dv-mobile-list">
        <div v-if="!loading && devoirs.length === 0" class="dv-empty-mobile">
          <v-icon size="22" color="primary" class="mr-2">mdi-information-outline</v-icon>
          Aucun devoir donné pour cette classe/matière.
        </div>

        <v-card v-for="d in devoirs" :key="d.id" class="dv-mobile-card" elevation="0">
          <div class="dv-mobile-head">
            <div class="dv-mobile-date">
              <v-icon size="16" color="primary" class="mr-1">mdi-calendar</v-icon>
              {{ formatDate(d.created_at) }}
            </div>
            <v-chip
              :color="d.nonFaitCount > 0 ? 'error' : 'blue-lighten-5'"
              :variant="d.nonFaitCount > 0 ? 'flat' : 'tonal'"
              size="small"
              label
            >
              {{ d.nonFaitCount }} non fait{{ d.nonFaitCount > 1 ? "s" : "" }}
            </v-chip>
          </div>

          <div class="dv-mobile-title">{{ d.titre }}</div>
          <div v-if="d.description" class="dv-mobile-desc">{{ d.description }}</div>
          <div v-if="d.date_limite" class="dv-mobile-limite">
            <v-icon size="14" class="mr-1">mdi-flag-checkered</v-icon>
            À rendre pour le {{ formatDate(d.date_limite) }}
          </div>

          <div class="dv-mobile-actions">
            <v-btn color="primary" variant="tonal" block @click="openRosterDialog(d)">
              <v-icon start>mdi-account-check-outline</v-icon>
              Signaler non fait
            </v-btn>
          </div>
        </v-card>
      </v-card-text>
    </v-card>

    <!-- BOTTOM BAR (mobile) -->
    <div class="dv-bottom-bar dv-show-xs">
      <v-btn variant="tonal" color="black" class="dv-bottom-btn" @click="$emit('back')">
        <v-icon start>mdi-arrow-left</v-icon>
        Retour
      </v-btn>
      <div class="dv-spacer" />
      <v-btn color="primary" class="dv-bottom-btn" @click="openAddDialog">
        <v-icon start>mdi-plus</v-icon>
        Donner un devoir
      </v-btn>
    </div>

    <!-- Dialog : donner un devoir -->
    <v-dialog v-model="dialog" max-width="620" persistent>
      <v-card class="dv-dialog">
        <div class="dv-dialog-head">
          <div class="dv-dialog-title">
            <v-icon class="mr-2" color="white">mdi-plus-circle-outline</v-icon>
            Donner un devoir
          </div>
          <v-btn icon variant="text" color="white" @click="closeDialog" aria-label="Fermer">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>

        <v-card-text class="dv-dialog-body">
          <v-form ref="form">
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  v-model="newDevoir.titre"
                  label="Titre"
                  placeholder="Ex: Exercices chapitre 3"
                  variant="outlined"
                  density="comfortable"
                  color="primary"
                  hide-details="auto"
                  :rules="[v => !!v || 'Titre obligatoire']"
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="newDevoir.description"
                  label="Description (optionnel)"
                  placeholder="Détaillez ce qu'il y a à faire..."
                  variant="outlined"
                  density="comfortable"
                  color="primary"
                  auto-grow
                  rows="3"
                  hide-details="auto"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="newDevoir.dateLimite"
                  type="date"
                  label="À rendre pour le (optionnel)"
                  variant="outlined"
                  density="comfortable"
                  color="primary"
                  hide-details="auto"
                />
              </v-col>
            </v-row>

            <v-alert
              v-if="!classeId || !subjectId || !teacherId || !etablissementId || !anneeScolaireId"
              type="warning"
              variant="tonal"
              class="mt-3"
            >
              Paramètres manquants (classe/matière/enseignant/établissement/année scolaire).
            </v-alert>
          </v-form>
        </v-card-text>

        <v-card-actions class="dv-dialog-actions">
          <v-spacer />
          <v-btn variant="tonal" color="black" @click="closeDialog">Annuler</v-btn>
          <v-btn color="primary" :loading="saving" :disabled="saving" @click="createDevoir">
            <v-icon start>mdi-send</v-icon>
            Donner le devoir
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog : roster / signaler non fait -->
    <v-dialog v-model="rosterDialog" max-width="560" scrollable>
      <v-card class="dv-dialog">
        <div class="dv-dialog-head">
          <div class="dv-dialog-title">
            <v-icon class="mr-2" color="white">mdi-account-check-outline</v-icon>
            <span class="dv-truncate-title">{{ selectedDevoir?.titre }}</span>
          </div>
          <v-btn icon variant="text" color="white" @click="closeRosterDialog" aria-label="Fermer">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>

        <v-card-text class="dv-dialog-body dv-roster-body">
          <p class="dv-roster-hint">
            Cochez les élèves qui n'ont <strong>pas</strong> fait ce devoir.
          </p>

          <div v-if="rosterLoading" class="dv-empty">
            <v-progress-circular indeterminate color="primary" size="22" class="mr-2" />
            Chargement des élèves...
          </div>

          <v-list v-else class="dv-roster-list">
            <v-list-item v-for="el in roster" :key="el.id" class="dv-roster-item">
              <template #prepend>
                <v-checkbox
                  v-model="el.nonFait"
                  color="error"
                  density="comfortable"
                  hide-details
                />
              </template>
              <v-list-item-title>{{ el.nom }} {{ el.prenom }}</v-list-item-title>
            </v-list-item>

            <v-alert v-if="!roster.length" type="info" variant="tonal">
              Aucun élève dans cette classe.
            </v-alert>
          </v-list>
        </v-card-text>

        <v-card-actions class="dv-dialog-actions">
          <v-spacer />
          <v-btn variant="tonal" color="black" @click="closeRosterDialog">Annuler</v-btn>
          <v-btn color="primary" :loading="rosterSaving" :disabled="rosterSaving" @click="saveRoster">
            <v-icon start>mdi-content-save</v-icon>
            Enregistrer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbars -->
    <v-snackbar v-model="successMessage" color="success" timeout="2800" location="top end">
      Action réalisée avec succès !
    </v-snackbar>
    <v-snackbar v-model="errorMessage" color="error" timeout="3200" location="top end">
      Erreur lors de l'action.
    </v-snackbar>
  </v-container>
</template>

<script>
import axios from "axios";

export default {
  name: "DevoirsManager",
  props: {
    classeId: [String, Number],
    subjectId: [String, Number],
    etablissementId: Number,
    anneeScolaire: String,
    anneeScolaireId: Number,
  },
  data() {
    return {
      devoirs: [],
      loading: false,

      dialog: false,
      saving: false,

      rosterDialog: false,
      rosterLoading: false,
      rosterSaving: false,
      selectedDevoir: null,
      roster: [],

      successMessage: false,
      errorMessage: false,

      newDevoir: {
        titre: "",
        description: "",
        dateLimite: "",
      },

      tableHeaders: [
        { title: "Donné le", value: "created_at" },
        { title: "Titre", value: "titre" },
        { title: "À rendre pour le", value: "date_limite" },
        { title: "Suivi", value: "nonFaitCount" },
        { title: "Actions", value: "actions", sortable: false },
      ],
    };
  },
  computed: {
    teacherId() {
      return this.$route.query.id;
    },
  },
  methods: {
    getToken() {
      return typeof window !== "undefined" ? localStorage.getItem("token") : null;
    },

    async fetchDevoirs() {
      if (!this.classeId || !this.subjectId || !this.anneeScolaireId) return;
      this.loading = true;
      try {
        const response = await axios.get(
          `/api/devoirs/classe/${this.classeId}/${this.subjectId}/${this.anneeScolaireId}`,
          { headers: { Authorization: `Bearer ${this.getToken()}` } }
        );
        this.devoirs = response.data || [];
      } catch (error) {
        console.error("Erreur lors du chargement des devoirs :", error);
        this.errorMessage = true;
      } finally {
        this.loading = false;
      }
    },

    openAddDialog() {
      if (!this.classeId || !this.subjectId || !this.teacherId || !this.etablissementId || !this.anneeScolaireId) {
        this.errorMessage = true;
        return;
      }
      this.dialog = true;
    },
    closeDialog() {
      this.dialog = false;
      this.newDevoir = { titre: "", description: "", dateLimite: "" };
    },

    async createDevoir() {
      const form = this.$refs.form;
      const ok = form?.validate ? form.validate() : true;
      if (!ok) return;

      const payload = {
        enseignantId: this.teacherId,
        classeId: this.classeId,
        matiereId: this.subjectId,
        etablissementId: this.etablissementId,
        anneeScolaireId: this.anneeScolaireId,
        titre: this.newDevoir.titre,
        description: this.newDevoir.description || null,
        dateLimite: this.newDevoir.dateLimite || null,
      };

      try {
        this.saving = true;
        await axios.post("/api/devoirs", payload, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });
        this.successMessage = true;
        this.closeDialog();
        await this.fetchDevoirs();
      } catch (error) {
        console.error("Erreur lors de la création du devoir :", error.response?.data || error);
        this.errorMessage = true;
      } finally {
        this.saving = false;
      }
    },

    async openRosterDialog(devoir) {
      this.selectedDevoir = devoir;
      this.rosterDialog = true;
      this.rosterLoading = true;
      this.roster = [];
      try {
        const response = await axios.get(`/api/devoirs/${devoir.id}/eleves`, {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        });
        this.roster = response.data || [];
      } catch (error) {
        console.error("Erreur lors du chargement des élèves :", error);
        this.errorMessage = true;
      } finally {
        this.rosterLoading = false;
      }
    },
    closeRosterDialog() {
      this.rosterDialog = false;
      this.selectedDevoir = null;
      this.roster = [];
    },

    async saveRoster() {
      if (!this.selectedDevoir) return;
      const eleveIds = this.roster.filter((el) => el.nonFait).map((el) => el.id);

      try {
        this.rosterSaving = true;
        await axios.put(
          `/api/devoirs/${this.selectedDevoir.id}/non-faits`,
          { eleveIds },
          { headers: { Authorization: `Bearer ${this.getToken()}` } }
        );
        this.successMessage = true;
        this.closeRosterDialog();
        await this.fetchDevoirs();
      } catch (error) {
        console.error("Erreur lors de l'enregistrement :", error.response?.data || error);
        this.errorMessage = true;
      } finally {
        this.rosterSaving = false;
      }
    },

    formatDate(date) {
      if (!date) return "";
      return new Date(date).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
  },
  mounted() {
    this.fetchDevoirs();
  },
};
</script>

<style scoped>
/* Charte: bleu / blanc / un peu de noir (identique à CahierDeTexteManager.vue) */
.dv-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px;
  padding-bottom: 86px;
  background: radial-gradient(900px 500px at 20% 10%, rgba(25,118,210,.14), transparent 55%),
              radial-gradient(800px 500px at 85% 0%, rgba(11,46,74,.10), transparent 55%),
              linear-gradient(180deg, #eef6ff 0%, #f7fbff 45%, #ffffff 100%);
  border-radius: 18px;
}

.dv-topbar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(90deg, #1976d2 0%, #0b2e4a 100%);
  box-shadow: 0 16px 50px rgba(11, 46, 74, 0.18);
  border: 1px solid rgba(255,255,255,.12);
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.dv-back {
  border-radius: 12px !important;
  font-weight: 900;
  background: rgba(0,0,0,.45) !important;
  color: #fff !important;
  white-space: nowrap;
}

.dv-title { min-width: 200px; }

.dv-h1 {
  color: #fff;
  font-weight: 950;
  font-size: 1.10rem;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dv-sub {
  margin-top: 4px;
  color: rgba(255,255,255,.88);
  font-weight: 650;
  font-size: .92rem;
}

.dv-spacer { flex: 1; }

.dv-add {
  border-radius: 999px !important;
  font-weight: 950;
  box-shadow: 0 10px 28px rgba(0,0,0,.18);
}

.dv-card {
  border-radius: 18px !important;
  overflow: hidden;
  border: 1px solid rgba(25,118,210,.16);
  background: rgba(255,255,255,.90);
  backdrop-filter: blur(10px);
  margin-bottom: 14px;
}

.dv-card-head {
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: linear-gradient(90deg, #1976d2, #0b2e4a);
  flex-wrap: wrap;
  gap: 6px;
}

.dv-card-head--alt {
  background: linear-gradient(90deg, #0b2e4a, #1976d2);
}

.dv-card-head-title {
  color: #fff;
  font-weight: 950;
  display: flex;
  align-items: center;
  letter-spacing: .2px;
}

.dv-chip-year {
  border-radius: 999px !important;
  font-weight: 900;
}

.dv-table { border-top: 1px solid rgba(0,0,0,.06); }

.dv-date {
  display: inline-flex;
  align-items: center;
  font-weight: 800;
  color: #0b2e4a;
}

.dv-muted { color: rgba(0,0,0,.4); }

.dv-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  color: #546e7a;
  font-weight: 900;
}

.dv-mobile-list { padding: 12px; }

.dv-mobile-card {
  border-radius: 16px !important;
  border: 1px solid rgba(25,118,210,.16);
  background: rgba(255,255,255,.94);
  padding: 12px;
  margin-bottom: 10px;
}

.dv-mobile-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.dv-mobile-date {
  font-weight: 950;
  color: #0b2e4a;
  display: inline-flex;
  align-items: center;
  line-height: 1.2;
}

.dv-mobile-title {
  font-weight: 900;
  color: #0b2e4a;
}

.dv-mobile-desc {
  margin-top: 4px;
  color: rgba(0,0,0,.72);
  font-weight: 600;
  line-height: 1.3rem;
  white-space: pre-wrap;
}

.dv-mobile-limite {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  font-size: 0.82rem;
  font-weight: 800;
  color: #b45309;
}

.dv-mobile-actions { margin-top: 10px; }

.dv-empty-mobile {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 8px;
  color: #546e7a;
  font-weight: 900;
  text-align: center;
}

.dv-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  padding: 10px 12px;
  background: rgba(255,255,255,.88);
  border-top: 1px solid rgba(25,118,210,.16);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
}

.dv-bottom-btn {
  border-radius: 999px !important;
  font-weight: 950;
}

.dv-dialog {
  border-radius: 16px !important;
  overflow: hidden;
}

.dv-dialog-head {
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 10px 14px;
  background: linear-gradient(90deg, #1976d2, #0b2e4a);
  gap: 8px;
}

.dv-dialog-title {
  color: #fff;
  font-weight: 950;
  display: flex;
  align-items: center;
  min-width: 0;
}

.dv-truncate-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dv-dialog-body { padding-top: 14px; }
.dv-dialog-actions { padding: 12px 14px 14px; }

.dv-roster-hint {
  color: rgba(0,0,0,.6);
  font-weight: 650;
  margin-bottom: 10px;
}

.dv-roster-list { padding: 0; }

.dv-roster-item {
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,.06);
  margin-bottom: 6px;
}

/* Visibility helpers */
.dv-hide-xs { display: block; }
.dv-show-xs { display: none; }
.dv-hide-sm { display: inline-flex; }

@media (max-width: 600px) {
  .dv-page { padding: 10px; border-radius: 14px; padding-bottom: 86px; }
  .dv-topbar { padding: 12px; border-radius: 14px; gap: 10px; }
  .dv-h1 { font-size: 1.02rem; }
  .dv-hide-sm { display: none !important; }
  .dv-hide-xs { display: none !important; }
  .dv-show-xs { display: block !important; }
}
</style>
