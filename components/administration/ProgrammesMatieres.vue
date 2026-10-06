<template>
  <!-- Programmes des matières par niveau : l'administration les dépose une fois,
       ils valent pour toutes les classes du niveau et restent d'une année à l'autre.
       Les enseignants les voient dans leur cahier de texte et peuvent les adapter. -->
  <v-container class="pg-page">
    <div class="pg-head">
      <v-icon color="white" class="mr-2">mdi-book-open-page-variant-outline</v-icon>
      <div>
        <div class="pg-titre">Programmes des matières</div>
        <div class="pg-sous">Déposés une fois par niveau, valables pour toutes ses classes et les années suivantes.</div>
      </div>
    </div>

    <v-alert type="info" variant="tonal" density="compact" class="mb-3">
      Un programme déposé ici sert à toutes les classes du niveau. Les enseignants le retrouvent dans leur cahier de texte :
      ils n'ont plus qu'à toucher la partie du jour. Un enseignant peut l'adapter pour ses propres classes sans changer celui des collègues.
    </v-alert>

    <div v-if="chargement" class="text-center pa-6"><v-progress-circular indeterminate color="primary" /></div>
    <v-alert v-else-if="erreur" type="error" variant="tonal">{{ erreur }}</v-alert>

    <template v-else>
      <div class="pg-resume">
        <v-chip color="success" variant="tonal" class="mr-2">{{ nbEnPlace }} programme(s) en place</v-chip>
        <v-chip v-if="nbManquants" color="warning" variant="tonal">{{ nbManquants }} à déposer</v-chip>
      </div>

      <v-alert v-if="!niveaux.length" type="warning" variant="tonal">
        Aucune matière n'est encore répartie entre les enseignants cette année (Enseignants → Répartition).
      </v-alert>

      <div v-for="niv in niveaux" :key="niv.promotionId" class="pg-niveau">
        <div class="pg-niveau-titre">{{ niv.niveau }}</div>
        <div v-for="m in niv.matieres" :key="m.matiereId" class="pg-ligne">
          <div class="pg-ligne-info">
            <div class="pg-matiere">{{ m.matiere }}</div>
            <div v-if="m.programme" class="pg-etat pg-etat--ok">
              <v-icon size="16" color="success" class="mr-1">mdi-check-circle</v-icon>
              {{ m.programme.elements }} partie(s) · {{ m.programme.auteur === "administration" ? "déposé par l'administration" : "déposé par un enseignant" }}
              <span v-if="m.versions"> · {{ m.versions }} version(s) adaptée(s) par des enseignants</span>
            </div>
            <div v-else class="pg-etat pg-etat--manque">
              <v-icon size="16" color="warning" class="mr-1">mdi-alert-circle-outline</v-icon>
              Pas encore de programme
              <span v-if="m.versions"> · {{ m.versions }} version(s) d'enseignants</span>
            </div>
          </div>
          <v-btn :color="m.programme ? undefined : 'primary'" :variant="m.programme ? 'tonal' : 'flat'" size="small" @click="ouvrir(niv, m)">
            <v-icon start>{{ m.programme ? "mdi-pencil-outline" : "mdi-upload" }}</v-icon>
            {{ m.programme ? "Voir / modifier" : "Déposer" }}
          </v-btn>
        </div>
      </div>
    </template>

    <!-- Dépôt / modification -->
    <v-dialog v-model="edition" max-width="860" persistent scrollable>
      <v-card>
        <v-card-title class="pg-dialog-titre">{{ courant.matiere }} — {{ courant.niveau }}</v-card-title>
        <v-card-text>
          <div v-if="chargementArbre" class="text-center pa-4"><v-progress-circular indeterminate color="primary" /></div>
          <div v-else-if="!arbreEdition.length">
            <v-file-input
              v-model="fichier"
              accept=".pdf,.docx,.txt"
              label="Fichier du programme (Word, PDF ou texte)"
              prepend-icon="mdi-file-document-outline"
              variant="outlined"
              density="comfortable"
              show-size
            />
            <div class="pg-ou">ou</div>
            <v-textarea
              v-model="texteColle"
              label="Collez ici le texte du programme"
              placeholder="SA 1 : …&#10;Séquence 1 : …&#10;Activité 1 : …"
              variant="outlined"
              rows="7"
              auto-grow
            />
            <v-alert type="info" variant="tonal" density="compact" class="mt-2">
              Les titres « SA 1 : … », « Séquence 2 : … », « Activité 3 : … », « Leçon 1 : … » sont reconnus automatiquement.
              Un document scanné (photo) ne peut pas être lu : déposez le fichier d'origine ou collez le texte.
            </v-alert>
          </div>
          <div v-else>
            <div class="pg-aide">Vérifiez les titres, corrigez si besoin, puis enregistrez. Le programme s'appliquera à toutes les classes de {{ courant.niveau }}.</div>
            <ArbreProgrammeEdition v-model="arbreEdition" />
          </div>
          <v-alert v-if="erreurEdition" type="error" variant="tonal" density="compact" class="mt-3">{{ erreurEdition }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="arbreEdition.length" variant="text" @click="remplacer">
            <v-icon start>mdi-file-replace-outline</v-icon>
            Déposer un autre fichier
          </v-btn>
          <v-spacer />
          <v-btn variant="tonal" :disabled="travail" @click="edition = false">Annuler</v-btn>
          <v-btn v-if="!arbreEdition.length && !chargementArbre" color="primary" :loading="travail" :disabled="!fichier && !texteColle.trim()" @click="analyser">
            Lire le programme
          </v-btn>
          <v-btn v-else-if="arbreEdition.length" color="primary" :loading="travail" @click="enregistrer">
            <v-icon start>mdi-content-save</v-icon>
            Enregistrer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="ok" color="success" timeout="2600" location="top end">Programme enregistré.</v-snackbar>
  </v-container>
</template>

<script>
import axios from "axios";
import ArbreProgrammeEdition, { avecCles, sansCles } from "@/components/ArbreProgrammeEdition.vue";

export default {
  name: "ProgrammesMatieres",
  components: { ArbreProgrammeEdition },
  data: () => ({
    chargement: true,
    erreur: "",
    programmes: [],
    paires: [],
    edition: false,
    courant: {},
    chargementArbre: false,
    arbreEdition: [],
    fichier: null,
    texteColle: "",
    travail: false,
    erreurEdition: "",
    ok: false,
  }),
  computed: {
    // Niveaux → matières (répartition de l'année + programmes déjà déposés).
    niveaux() {
      const map = new Map();
      const ajouter = (promotionId, niveau, matiereId, matiere) => {
        if (!map.has(promotionId)) map.set(promotionId, { promotionId, niveau, matieres: new Map() });
        const n = map.get(promotionId);
        if (!n.matieres.has(matiereId)) n.matieres.set(matiereId, { matiereId, matiere, programme: null, versions: 0 });
        return n.matieres.get(matiereId);
      };
      this.paires.forEach((p) => ajouter(p.promotionId, p.niveau, p.matiereId, p.matiere));
      this.programmes.forEach((p) => {
        const m = ajouter(p.promotionId, p.niveau, p.matiereId, p.matiere);
        if (p.enseignantId) m.versions += 1;
        else m.programme = p;
      });
      return [...map.values()]
        .sort((a, b) => a.promotionId - b.promotionId)
        .map((n) => ({ ...n, matieres: [...n.matieres.values()].sort((a, b) => a.matiere.localeCompare(b.matiere)) }));
    },
    nbEnPlace() {
      return this.niveaux.reduce((t, n) => t + n.matieres.filter((m) => m.programme).length, 0);
    },
    nbManquants() {
      return this.niveaux.reduce((t, n) => t + n.matieres.filter((m) => !m.programme).length, 0);
    },
  },
  mounted() {
    this.charger();
  },
  methods: {
    entetes() {
      return { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
    },
    async charger() {
      this.chargement = true;
      this.erreur = "";
      try {
        const { data } = await axios.get("/api/programme-matiere/niveaux", this.entetes());
        this.programmes = data.programmes || [];
        this.paires = data.paires || [];
      } catch (e) {
        this.erreur = e.response?.data?.message || "Programmes indisponibles pour le moment.";
      } finally {
        this.chargement = false;
      }
    },
    async ouvrir(niv, m) {
      this.courant = { promotionId: niv.promotionId, niveau: niv.niveau, matiereId: m.matiereId, matiere: m.matiere };
      this.arbreEdition = [];
      this.fichier = null;
      this.texteColle = "";
      this.erreurEdition = "";
      this.edition = true;
      if (!m.programme) return;
      this.chargementArbre = true;
      try {
        const { data } = await axios.get(`/api/programme-matiere/niveau/${niv.promotionId}/${m.matiereId}`, this.entetes());
        this.arbreEdition = avecCles(data.arbre || []);
      } catch (e) {
        this.erreurEdition = e.response?.data?.message || "Programme indisponible.";
      } finally {
        this.chargementArbre = false;
      }
    },
    remplacer() {
      this.arbreEdition = [];
      this.fichier = null;
      this.texteColle = "";
    },
    async analyser() {
      this.travail = true;
      this.erreurEdition = "";
      try {
        const f = Array.isArray(this.fichier) ? this.fichier[0] : this.fichier;
        let reponse;
        if (f) {
          const fd = new FormData();
          fd.append("fichier", f);
          reponse = await axios.post("/api/programme-matiere/analyser", fd, this.entetes());
        } else {
          reponse = await axios.post("/api/programme-matiere/analyser", { texte: this.texteColle }, this.entetes());
        }
        this.arbreEdition = avecCles(reponse.data.arbre);
      } catch (e) {
        this.erreurEdition = e.response?.data?.message || "Le programme n'a pas pu être lu.";
      } finally {
        this.travail = false;
      }
    },
    async enregistrer() {
      this.travail = true;
      this.erreurEdition = "";
      try {
        await axios.put(`/api/programme-matiere/niveau/${this.courant.promotionId}/${this.courant.matiereId}`, { arbre: sansCles(this.arbreEdition) }, this.entetes());
        this.edition = false;
        this.ok = true;
        await this.charger();
      } catch (e) {
        this.erreurEdition = e.response?.data?.message || "Le programme n'a pas pu être enregistré.";
      } finally {
        this.travail = false;
      }
    },
  },
};
</script>

<style scoped>
.pg-head { display: flex; align-items: center; padding: 12px 16px; border-radius: 14px; background: linear-gradient(135deg, #1976d2, #0d47a1); color: #fff; margin-bottom: 12px; }
.pg-titre { font-weight: 800; font-size: 1.1rem; }
.pg-sous { font-size: 0.85rem; opacity: 0.9; }
.pg-resume { margin-bottom: 10px; }
.pg-niveau { border: 1px solid #e3e8ef; border-radius: 12px; margin-bottom: 12px; overflow: hidden; background: #fff; }
.pg-niveau-titre { font-weight: 800; color: #0d47a1; background: #f3f8ff; padding: 8px 14px; }
.pg-ligne { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; border-top: 1px solid #eef2f6; }
.pg-ligne-info { min-width: 0; }
.pg-matiere { font-weight: 700; }
.pg-etat { display: flex; align-items: center; flex-wrap: wrap; font-size: 0.85rem; color: #546e7a; }
.pg-dialog-titre { font-weight: 800; white-space: normal; }
.pg-ou { text-align: center; color: #90a4ae; margin: 6px 0 10px; font-weight: 700; }
.pg-aide { color: #546e7a; margin-bottom: 8px; }
</style>
