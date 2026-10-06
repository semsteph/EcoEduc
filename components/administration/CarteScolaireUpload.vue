<template>
  <v-container fluid class="pa-2 pa-sm-3 cartes">
    <div v-if="loading" class="text-center pa-6">
      <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
    </div>

    <template v-else>
      <!-- Résumé et actions -->
      <div class="cartes-entete no-print">
        <div>
          <h2 class="cartes-titre">Cartes scolaires — {{ classeNom }}</h2>
          <div class="cartes-resume">
            <v-icon size="16" :color="missingEleves.length ? 'warning' : 'success'">mdi-account-box-outline</v-icon>
            {{ eleves.length - missingEleves.length }}/{{ eleves.length }} élève(s) avec photo
          </div>
        </div>
        <div class="d-flex flex-wrap ga-2">
          <v-btn color="primary" prepend-icon="mdi-printer" :disabled="!eleves.length" @click="imprimer">Imprimer les cartes</v-btn>
          <v-btn variant="tonal" color="primary" prepend-icon="mdi-image-multiple" @click="zipOuvert = !zipOuvert">Ajouter les photos de la classe</v-btn>
        </div>
      </div>

      <AideEssentiel cle="cartes-classe" class="no-print">
        <ul>
          <li>Les photos prises à l'inscription sont déjà là. Seules les photos <strong>manquantes</strong> sont demandées.</li>
          <li><strong>Photos sur l'ordinateur ?</strong> « Ajouter les photos de la classe » : sélectionnez-les toutes, puis « Associer dans l'ordre ».</li>
          <li><strong>Photos pas encore prises ?</strong> Dans le même outil, « Préparer la séance photo » donne la liste des élèves dans l'ordre à suivre.</li>
          <li>« Imprimer les cartes » : format carte bancaire, 8 par page A4. Sans photo, la carte porte les initiales.</li>
        </ul>
      </AideEssentiel>

      <v-alert v-if="missingEleves.length" type="info" variant="tonal" density="compact" class="mb-3 no-print">
        Les photos prises à l'inscription apparaissent automatiquement. Pour les {{ missingEleves.length }} élève(s) sans photo :
        <strong>Ajouter les photos de la classe</strong> (toutes en une fois depuis l'ordinateur), ou <strong>Ajouter la photo</strong> sur une carte.
        Sans photo, la carte s'imprime avec les initiales.
      </v-alert>

      <v-expand-transition>
        <v-card v-if="zipOuvert" class="mb-3 rounded-lg no-print" variant="outlined">
          <v-card-text class="pa-3">
            <PhotosClasse
              :classe-id="classId"
              :classe-nom="classeNom"
              :etablissement-id="etablissementId"
              fermable
              @fermer="zipOuvert = false"
              @termine="checkData"
            />
          </v-card-text>
        </v-card>
      </v-expand-transition>

      <div v-if="!eleves.length" class="text-center text-medium-emphasis pa-6">Aucun élève dans cette classe.</div>

      <!-- Cartes (format carte bancaire à l'impression) -->
      <div class="cartes-grille">
        <div v-for="eleve in eleves" :key="eleve.id" class="carte-bloc">
          <div class="carte">
            <div class="carte-bandeau">
              <div class="carte-ecole">{{ etablissementAffiche }}</div>
              <div class="carte-type">Carte d'identité scolaire · {{ anneeAffichee }}</div>
            </div>
            <div class="carte-corps">
              <div class="carte-photo">
                <img v-if="eleve.photo_url" :src="photoSrc(eleve.photo_url)" :alt="`Photo de ${eleve.prenom}`" />
                <span v-else>{{ initiales(eleve) }}</span>
              </div>
              <div class="carte-infos">
                <div class="carte-nom">{{ eleve.nom }}</div>
                <div class="carte-prenom">{{ eleve.prenom }}</div>
                <div class="carte-ligne"><span>Classe</span>{{ classeNom }}</div>
                <div class="carte-ligne"><span>Né(e) le</span>{{ formatDate(eleve.date_naissance) }}</div>
                <div class="carte-ligne"><span>Sexe</span>{{ eleve.sexe === 'F' ? 'Féminin' : 'Masculin' }}</div>
                <div class="carte-ligne"><span>Matricule</span>{{ eleve.matricule || '—' }}</div>
              </div>
            </div>
            <div class="carte-pied">
              <span>Valable pour l'année {{ anneeAffichee }}</span>
              <span>Le Directeur</span>
            </div>
          </div>
          <v-btn
            class="no-print mt-1"
            size="x-small"
            variant="text"
            :color="eleve.photo_url ? 'primary' : 'warning'"
            :prepend-icon="eleve.photo_url ? 'mdi-camera-retake' : 'mdi-camera-plus'"
            @click="ouvrirPhoto(eleve)"
          >{{ eleve.photo_url ? 'Changer la photo' : 'Ajouter la photo' }}</v-btn>
        </div>
      </div>
    </template>

    <!-- Photo d'un élève -->
    <v-dialog v-model="photoDialog" max-width="440">
      <v-card v-if="eleveEnCours" class="rounded-lg">
        <v-card-title class="text-subtitle-1 font-weight-bold">Photo de {{ eleveEnCours.prenom }} {{ eleveEnCours.nom }}</v-card-title>
        <v-card-text>
          <PhotoIdentite :photo-url="eleveEnCours.photo_url ? photoSrc(eleveEnCours.photo_url) : ''" @change="nouvellePhoto = $event; photoModifiee = true" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="photoDialog = false">Annuler</v-btn>
          <v-btn color="primary" variant="flat" :loading="envoiPhoto" :disabled="!photoModifiee" @click="enregistrerPhoto">Enregistrer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="statusDialog.show" max-width="420">
      <v-card class="rounded-lg pa-3 text-center">
        <v-icon size="48" :color="statusDialog.color" class="mb-2">{{ statusDialog.icon }}</v-icon>
        <h3 class="text-h6 font-weight-bold">{{ statusDialog.title }}</h3>
        <p class="pa-2">{{ statusDialog.message }}</p>
        <v-btn :color="statusDialog.color" block rounded @click="statusDialog.show = false">Fermer</v-btn>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from "axios";
import PhotoIdentite from "./PhotoIdentite.vue";
import PhotosClasse from "./PhotosClasse.vue";
import AideEssentiel from "~/components/AideEssentiel.vue";

const API_BASE = "";

export default {
  components: { PhotoIdentite, PhotosClasse, AideEssentiel },
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
    zipOuvert: false,
    infos: { etablissement: "", anneeScolaire: "", classe: "" },
    photoDialog: false,
    eleveEnCours: null,
    nouvellePhoto: null,
    photoModifiee: false,
    envoiPhoto: false,
  }),
  computed: {
    classeNom() { return this.infos.classe || this.className || ""; },
    etablissementAffiche() { return this.infos.etablissement || this.etablissementNom || ""; },
    anneeAffichee() { return this.infos.anneeScolaire || this.anneeScolaireNom || ""; },
  },
  methods: {
    initiales(e) {
      return `${(e.prenom || "").charAt(0)}${(e.nom || "").charAt(0)}`.toUpperCase();
    },
    imprimer() {
      window.print();
    },
    ouvrirPhoto(eleve) {
      this.eleveEnCours = eleve;
      this.nouvellePhoto = null;
      this.photoModifiee = false;
      this.photoDialog = true;
    },
    async enregistrerPhoto() {
      const eleve = this.eleveEnCours;
      this.envoiPhoto = true;
      try {
        if (this.nouvellePhoto) {
          const fd = new FormData();
          fd.append("photo", this.nouvellePhoto, "photo.jpg");
          const { data } = await axios.post(`/api/eleves/${eleve.id}/photo`, fd);
          eleve.photo_url = data.photo_url;
        } else {
          await axios.delete(`/api/eleves/${eleve.id}/photo`);
          eleve.photo_url = null;
        }
        this.missingEleves = this.eleves.filter((e) => !e.photo_url);
        this.photoDialog = false;
      } catch (error) {
        this.statusDialog = { show: true, color: "error", icon: "mdi-alert", title: "Erreur", message: error?.response?.data?.message || "La photo n'a pas pu être enregistrée." };
      } finally {
        this.envoiPhoto = false;
      }
    },
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

        this.infos = { etablissement: res.data.etablissement, anneeScolaire: res.data.anneeScolaire, classe: res.data.classe };
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
.cartes-entete { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.cartes-titre { font-size: 1.05rem; font-weight: 800; color: #0d47a1; margin: 0; }
.cartes-resume { font-size: 0.82rem; color: #4a5768; display: flex; align-items: center; gap: 4px; }
.cartes-grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.carte-bloc { display: flex; flex-direction: column; align-items: center; }
/* Format carte bancaire : 85,6 × 54 mm */
.carte { width: 100%; max-width: 340px; aspect-ratio: 85.6 / 54; background: #fff; border-radius: 10px; overflow: hidden;
  border: 1px solid #c9d3e0; box-shadow: 0 2px 8px rgba(13, 40, 80, 0.12); display: flex; flex-direction: column;
  background-image: linear-gradient(135deg, rgba(13,71,161,0.04) 25%, transparent 25%, transparent 50%, rgba(13,71,161,0.04) 50%, rgba(13,71,161,0.04) 75%, transparent 75%); background-size: 14px 14px; }
.carte-bandeau { background: linear-gradient(90deg, #0d47a1, #1565c0); color: #fff; padding: 5px 10px; text-align: center; }
.carte-ecole { font-weight: 800; font-size: 0.78rem; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.carte-type { font-size: 0.6rem; letter-spacing: 0.04em; opacity: 0.92; text-transform: uppercase; }
.carte-corps { flex: 1; display: flex; gap: 10px; padding: 8px 10px 4px; min-height: 0; }
.carte-photo { flex: none; width: 27%; aspect-ratio: 3 / 4; border-radius: 4px; overflow: hidden; border: 1px solid #b8c4d4; background: #e8eef6;
  display: flex; align-items: center; justify-content: center; color: #0d47a1; font-weight: 800; font-size: 1.3rem; align-self: flex-start; }
.carte-photo img { width: 100%; height: 100%; object-fit: cover; }
.carte-infos { min-width: 0; flex: 1; font-size: 0.66rem; line-height: 1.35; color: #1c2a3a; }
.carte-nom { font-weight: 900; font-size: 0.85rem; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.carte-prenom { font-weight: 700; font-size: 0.75rem; margin-bottom: 2px; }
.carte-ligne span { display: inline-block; min-width: 58px; color: #5b6b80; }
.carte-pied { display: flex; justify-content: space-between; padding: 3px 10px; font-size: 0.55rem; color: #4a5768; border-top: 1px solid #e3e9f1; background: #f5f8fc; }

@media print {
  .no-print, :global(header), :global(nav), :global(.v-navigation-drawer), :global(.page-nav) { display: none !important; }
  .cartes { padding: 0 !important; }
  .cartes-grille { grid-template-columns: repeat(2, 85.6mm); gap: 6mm; justify-content: center; }
  .carte { width: 85.6mm; max-width: none; height: 54mm; box-shadow: none; break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .carte-bloc { break-inside: avoid; }
}
</style>
