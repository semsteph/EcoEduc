<template>
  <v-container fluid class="pa-4">
    <v-btn icon variant="tonal" color="black" @click="$emit('back')" class="mb-4">
      <v-icon>mdi-arrow-left</v-icon>
    </v-btn>

    <!-- LOADING -->
    <div v-if="loading" class="text-center pa-3 pa-sm-10">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <div class="mt-4 font-weight-bold">Traitement des données...</div>
    </div>

    <!-- IMPORT VIEW -->
    <v-expand-transition v-else-if="viewMode === 'import'">
      <v-card class="mx-auto rounded-xl elevation-3 overflow-hidden" max-width="820">
        <v-toolbar color="primary" dark flat>
          <v-toolbar-title class="font-weight-bold text-white">
            <v-icon start>mdi-card-account-details</v-icon>
            Génération des cartes scolaires — {{ className }}
          </v-toolbar-title>
        </v-toolbar>

        <v-card-text class="pa-2 pa-sm-6 bg-white">
          <!-- CONSIGNES -->
          <v-alert type="info" variant="tonal" class="mb-5 rounded-lg text-black">
            <div class="font-weight-bold mb-2">
              <v-icon class="mr-1">mdi-information</v-icon>
              Comment préparer correctement le ZIP ?
            </div>

            <ol class="pl-4 my-0">
              <li>
                Mettez uniquement des <b>photos (JPG / JPEG / PNG / WEBP)</b> dans le ZIP.
              </li>
              <li>
                Les noms des photos doivent contenir <b>NOM</b> et <b>PRÉNOM</b> (dans n’importe quel ordre) :
                <div class="mt-2">
                  <code class="mr-2">nom_prenom.jpg</code>
                  <code class="mr-2">prenom_nom.png</code>
                  <code>nom-prenom.jpeg</code>
                </div>
              </li>
              <li>
                Espaces, tirets et underscores sont acceptés :
                <div class="mt-2">
                  <code class="mr-2">KOUADIO Jean.jpg</code>
                  <code class="mr-2">KOUADIO-Jean.jpg</code>
                  <code>KOUADIO_Jean.jpg</code>
                </div>
              </li>
              <li>
                Évitez les photos floues. Idéal : <b>300×400</b> minimum.
              </li>
            </ol>
          </v-alert>

          <!-- LISTE DES ELEVES SANS PHOTO -->
          <v-alert
            v-if="missingEleves.length"
            type="warning"
            variant="tonal"
            class="mb-6 rounded-lg text-black"
          >
            <div class="font-weight-bold mb-2">
              <v-icon class="mr-1">mdi-alert</v-icon>
              Photos manquantes : {{ missingEleves.length }} élève(s)
            </div>

            <div class="text-caption mb-2">
              Importez un ZIP pour associer automatiquement les photos à ces élèves.
            </div>

            <v-chip-group column>
              <v-chip
                v-for="e in missingEleves"
                :key="e.id"
                color="orange"
                variant="tonal"
                class="ma-1"
              >
                {{ e.nom }} {{ e.prenom }}
              </v-chip>
            </v-chip-group>
          </v-alert>

          <!-- FORM UPLOAD -->
          <v-form @submit.prevent="submitZip">
            <v-file-input
              v-model="zipFile"
              label="Archive ZIP (photos)"
              variant="outlined"
              accept=".zip"
              show-size
              required
              color="primary"
              prepend-icon="mdi-folder-zip"
            />

            <v-btn
              block
              color="primary"
              size="large"
              type="submit"
              :loading="submitting"
              :disabled="!zipFile || submitting"
              class="rounded-pill mt-4"
            >
              <v-icon start>mdi-upload</v-icon>
              Importer & associer les photos
            </v-btn>
          </v-form>

          <!-- RESULTATS IMPORT -->
          <v-expand-transition>
            <v-card v-if="importResult" class="mt-6 rounded-xl elevation-1" variant="tonal">
              <v-card-text class="pa-4">
                <div class="font-weight-bold mb-2">
                  <v-icon class="mr-1">mdi-clipboard-check</v-icon>
                  Résultat de l’import
                </div>

                <v-row>
                  <v-col cols="12" sm="4">
                    <div class="text-caption">Fichiers dans le ZIP</div>
                    <div class="text-h6 font-weight-bold">{{ importResult.totalZip }}</div>
                  </v-col>
                  <v-col cols="12" sm="4">
                    <div class="text-caption">Photos associées</div>
                    <div class="text-h6 font-weight-bold">{{ importResult.identifies }}</div>
                  </v-col>
                  <v-col cols="12" sm="4">
                    <div class="text-caption">Fichiers ignorés</div>
                    <div class="text-h6 font-weight-bold">{{ importResult.ignored }}</div>
                  </v-col>
                </v-row>

                <v-alert
                  v-if="importResult.unmatched && importResult.unmatched.length"
                  type="warning"
                  variant="tonal"
                  class="mt-3"
                >
                  <div class="font-weight-bold mb-2">Fichiers non reconnus (exemples)</div>
                  <div class="text-caption">
                    Vérifiez que le nom contient NOM + PRÉNOM de l’élève.
                  </div>

                  <v-chip-group column class="mt-2">
                    <v-chip
                      v-for="(f, idx) in importResult.unmatched.slice(0, 10)"
                      :key="idx"
                      variant="outlined"
                      class="ma-1"
                    >
                      {{ f }}
                    </v-chip>
                  </v-chip-group>
                </v-alert>
              </v-card-text>
            </v-card>
          </v-expand-transition>
        </v-card-text>
      </v-card>
    </v-expand-transition>

    <!-- GALLERY VIEW -->
    <div v-else-if="viewMode === 'gallery'">
      <div class="d-flex align-center mb-6">
        <h2 class="text-h5 font-weight-bold text-primary">
          Aperçu des Cartes : {{ className }}
        </h2>
        <v-spacer />
        <v-btn color="primary" variant="tonal" class="rounded-pill" @click="checkData">
          <v-icon start>mdi-refresh</v-icon>
          Actualiser
        </v-btn>
      </div>

      <v-row>
        <v-col v-for="eleve in eleves" :key="eleve.id" cols="12" sm="6" md="4">
          <v-card class="school-card-horizontal elevation-4" color="white">
            <div class="card-header-line pa-1 px-3 text-center">
              <span class="text-caption font-weight-black text-white text-uppercase">
                Année Scolaire : {{ anneeScolaireNom }}
              </span>
            </div>

            <div class="d-flex pa-3 align-center">
              <div class="photo-box mr-3">
                <v-img
                  :src="photoSrc(eleve.photo_url)"
                  width="100"
                  height="120"
                  cover
                  aspect-ratio="0.83"
                  class="bg-grey-lighten-3 border-square hd-photo"
                >
                  <template #placeholder>
                    <v-row class="fill-height ma-0" align="center" justify="center">
                      <v-progress-circular indeterminate color="primary"></v-progress-circular>
                    </v-row>
                  </template>

                  <template #error>
                    <div class="d-flex align-center justify-center fill-height bg-grey-lighten-3">
                      <v-icon color="error">mdi-image-off</v-icon>
                    </div>
                  </template>
                </v-img>
              </div>

              <div class="infos-container flex-grow-1">
                <div class="info-item">
                  <span class="label">Étab:</span>
                  <span class="value text-truncate">{{ etablissementNom }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Nom:</span>
                  <span class="value">{{ eleve.nom }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Prénom:</span>
                  <span class="value">{{ eleve.prenom }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Classe:</span>
                  <span class="value">{{ className }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Né(e) le:</span>
                  <span class="value">{{ formatDate(eleve.date_naissance) }}</span>
                </div>
              </div>
            </div>

            <div class="card-footer-line bg-grey-lighten-4 text-center py-1">
              <span class="text-tiny text-uppercase">
                Document officiel réservé à l'usage scolaire
              </span>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- DIALOG -->
    <v-dialog v-model="statusDialog.show" max-width="420">
      <v-card class="rounded-xl pa-4 text-center">
        <v-icon size="64" :color="statusDialog.color" class="mb-4">{{ statusDialog.icon }}</v-icon>
        <h3 class="text-h6 font-weight-bold">{{ statusDialog.title }}</h3>
        <p class="pa-2">{{ statusDialog.message }}</p>
        <v-btn :color="statusDialog.color" block rounded @click="statusDialog.show = false">
          Fermer
        </v-btn>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from "axios";

const API_BASE = "";

export default {
  props: {
    classId: Number,
    className: String,
    etablissementId: Number,
    etablissementNom: String,
    anneeScolaireNom: String,
  },
  data: () => ({
    loading: true,
    viewMode: "",
    eleves: [],
    missingEleves: [],
    zipFile: null,
    submitting: false,
    importResult: null,
    statusDialog: { show: false, color: "", icon: "", title: "", message: "" },
  }),
  methods: {
    photoSrc(photoUrl) {
      if (!photoUrl) return "";
      // si déjà une URL absolue
      if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
      return `${API_BASE}${photoUrl}`;
    },

    formatDate(dateString) {
      if (!dateString) return "N/A";
      try {
        const options = { year: "numeric", month: "long", day: "numeric" };
        return new Date(dateString).toLocaleDateString("fr-FR", options);
      } catch (e) {
        return dateString;
      }
    },

    async checkData() {
      this.loading = true;
      this.importResult = null;

      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${API_BASE}/api/cartes-scolaires/verification/${this.classId}/${this.etablissementId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // attendu côté API : { eleves: [...], tousOntUnePhoto: boolean }
        this.eleves = Array.isArray(res.data.eleves) ? res.data.eleves : [];
        this.missingEleves = this.eleves.filter((e) => !e.photo_url);

        this.viewMode = res.data.tousOntUnePhoto ? "gallery" : "import";
      } catch (error) {
        console.error("Erreur de chargement:", error);
        this.statusDialog = {
          show: true,
          color: "error",
          icon: "mdi-alert",
          title: "Erreur",
          message: "Impossible de charger les élèves. Vérifiez le serveur.",
        };
      } finally {
        this.loading = false;
      }
    },

    async submitZip() {
      if (!this.zipFile) return;

      this.submitting = true;
      this.importResult = null;

      const formData = new FormData();
      formData.append("zipFile", this.zipFile);
      formData.append("classeId", this.classId);
      formData.append("etablissementId", this.etablissementId);

      try {
        const zipToken = localStorage.getItem("token");
        const { data } = await axios.post(`${API_BASE}/api/upload-photos-zip`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${zipToken}`,
          },
        });

        this.importResult = data;

        this.statusDialog = {
          show: true,
          color: "success",
          icon: "mdi-check-circle",
          title: "Succès",
          message: `Import terminé : ${data.identifies} photo(s) associée(s).`,
        };

        await this.checkData();
      } catch (e) {
        console.error(e);
        const msg =
          e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Échec de l'upload. Vérifiez le format du ZIP.";
        this.statusDialog = {
          show: true,
          color: "error",
          icon: "mdi-alert",
          title: "Erreur",
          message: msg,
        };
      } finally {
        this.submitting = false;
      }
    },
  },
  mounted() {
    this.checkData();
  },
};
</script>

<style scoped>
.school-card-horizontal {
  border: 1px solid #1976d2;
  border-radius: 4px !important;
  overflow: hidden;
  width: 100%;
  background: white;
}

.card-header-line {
  background-color: #1976d2;
}

/* Netteté image (côté navigateur, ça aide un peu, mais le vrai facteur = qualité photo) */
.hd-photo {
  image-rendering: auto;
  -ms-interpolation-mode: bicubic;
  shape-rendering: geometricPrecision;
}

.border-square {
  border: 1px solid #000 !important;
  border-radius: 0px !important;
}

.info-item {
  display: flex;
  white-space: nowrap;
  margin-bottom: 2px;
  border-bottom: 1px solid #f0f0f0;
}

.label {
  font-weight: 800;
  color: #616161;
  font-size: 0.65rem;
  width: 65px;
  text-transform: uppercase;
  flex-shrink: 0;
}

.value {
  font-weight: 700;
  color: #1a237e;
  font-size: 0.75rem;
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-tiny {
  font-size: 0.55rem;
  font-weight: bold;
  color: #757575;
}
</style>
