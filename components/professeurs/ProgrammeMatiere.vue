<template>
  <!-- Programme de la matière pour cette classe : dépôt (une fois), modification
       et avancement. Le cahier de texte s'en sert pour proposer la partie du jour. -->
  <v-card class="pm-card" elevation="0">
    <div class="pm-head">
      <v-icon color="white" class="mr-2">mdi-book-open-page-variant-outline</v-icon>
      <div class="pm-head-titre">Programme de la matière</div>
      <v-spacer />
      <v-chip v-if="classe" size="small" variant="tonal" color="white">{{ classe.niveau }}</v-chip>
    </div>

    <v-card-text class="pm-body">
      <div v-if="chargement" class="text-center pa-3">
        <v-progress-circular indeterminate color="primary" size="28" />
      </div>

      <v-alert v-else-if="erreur" type="error" variant="tonal" density="compact">{{ erreur }}</v-alert>

      <!-- Pas encore de programme -->
      <div v-else-if="!programme" class="pm-vide">
        <div class="pm-vide-texte">
          <strong>Déposez votre programme une seule fois</strong> (fichier Word, PDF, ou texte copié).
          Ensuite, pour remplir le cahier de texte, il vous suffira de toucher la partie du jour.
          Le programme restera valable les années suivantes.
        </div>
        <v-btn color="primary" class="mt-3" @click="ouvrirDepot">
          <v-icon start>mdi-upload</v-icon>
          Déposer le programme
        </v-btn>
      </div>

      <!-- Programme en place -->
      <div v-else>
        <div class="pm-source">
          <v-icon size="16" class="mr-1" color="primary">mdi-information-outline</v-icon>
          <span v-if="programme.portee === 'enseignant'">Votre version du programme (pour vos classes de {{ classe.niveau }}).</span>
          <span v-else-if="programme.auteur === 'administration'">Programme de {{ classe.niveau }} déposé par l'administration.</span>
          <span v-else-if="programme.estLeMien">Programme de {{ classe.niveau }} que vous avez déposé (partagé avec vos collègues de ce niveau).</span>
          <span v-else>Programme de {{ classe.niveau }} déposé par {{ programme.auteurNom || "un collègue" }}.</span>
        </div>

        <div class="pm-avance">
          <v-progress-linear :model-value="pourcentage" color="primary" height="10" rounded />
          <div class="pm-avance-texte">
            {{ partiesFaites }} partie(s) sur {{ feuilles.length }} abordée(s) en classe
            <template v-if="enCours"> · en cours : <strong>{{ enCours }}</strong></template>
          </div>
        </div>

        <div class="pm-actions">
          <v-btn variant="tonal" color="primary" size="small" @click="vueAvancement = true">
            <v-icon start>mdi-format-list-checks</v-icon>
            Voir l'avancement
          </v-btn>
          <v-btn variant="tonal" color="primary" size="small" @click="ouvrirModification">
            <v-icon start>mdi-pencil-outline</v-icon>
            Modifier
          </v-btn>
        </div>
      </div>
    </v-card-text>

    <!-- Avancement : arbre avec ce qui a été fait -->
    <v-dialog v-model="vueAvancement" max-width="720" scrollable>
      <v-card>
        <v-card-title class="pm-dialog-titre">Avancement — {{ matiere?.nom }} ({{ classe?.nom }})</v-card-title>
        <v-card-text>
          <div v-for="x in lignes" :key="x.element.id" class="pm-ligne" :style="{ paddingLeft: `${x.chemin.length * 14 - 14}px` }">
            <v-icon v-if="x.feuille" size="18" :color="etat(x.element.id).couleur" class="mr-1">{{ etat(x.element.id).icone }}</v-icon>
            <span :class="{ 'pm-ligne-sa': !x.feuille }">{{ intitule(x.element) }}</span>
            <span v-if="x.feuille && progression[x.element.id]" class="pm-ligne-dates">
              — {{ progression[x.element.id].seances.map((s) => dateCourte(s.date)).join(', ') }}
            </span>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="tonal" @click="vueAvancement = false">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dépôt / modification -->
    <v-dialog v-model="edition" max-width="860" persistent scrollable>
      <v-card>
        <v-card-title class="pm-dialog-titre">
          {{ arbreEdition.length ? "Vérifiez le programme" : "Déposer le programme" }} — {{ matiere?.nom }} {{ classe?.niveau }}
        </v-card-title>
        <v-card-text>
          <!-- Étape 1 : fichier ou texte -->
          <div v-if="!arbreEdition.length">
            <v-file-input
              v-model="fichier"
              accept=".pdf,.docx,.txt"
              label="Fichier du programme (Word, PDF ou texte)"
              prepend-icon="mdi-file-document-outline"
              variant="outlined"
              density="comfortable"
              show-size
            />
            <div class="pm-ou">ou</div>
            <v-textarea
              v-model="texteColle"
              label="Collez ici le texte du programme"
              placeholder="SA 1 : Géométrie dans l'espace&#10;Activité 1 : Positions relatives de droites&#10;Activité 2 : …&#10;SA 2 : …"
              variant="outlined"
              rows="7"
              auto-grow
            />
            <v-alert type="info" variant="tonal" density="compact" class="mt-2">
              Les titres comme « SA 1 : … », « Séquence 2 : … », « Activité 3 : … » ou « Leçon 1 : … » sont reconnus automatiquement.
              Un document scanné (photo) ne peut pas être lu : déposez le fichier d'origine ou collez le texte.
            </v-alert>
          </div>

          <!-- Étape 2 : vérification -->
          <div v-else>
            <v-alert v-if="avertissementVersion" type="info" variant="tonal" density="compact" class="mb-3">
              {{ avertissementVersion }}
            </v-alert>
            <div class="pm-aide">Corrigez un titre si besoin, puis enregistrez. {{ compte }} partie(s).</div>
            <ArbreProgrammeEdition v-model="arbreEdition" />
          </div>

          <v-alert v-if="erreurEdition" type="error" variant="tonal" density="compact" class="mt-3">{{ erreurEdition }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="arbreEdition.length && !modification" variant="text" @click="arbreEdition = []">
            <v-icon start>mdi-arrow-left</v-icon>
            Recommencer
          </v-btn>
          <v-spacer />
          <v-btn variant="tonal" :disabled="travail" @click="edition = false">Annuler</v-btn>
          <v-btn v-if="!arbreEdition.length" color="primary" :loading="travail" :disabled="!fichier && !texteColle.trim()" @click="analyser">
            Lire le programme
          </v-btn>
          <v-btn v-else color="primary" :loading="travail" @click="enregistrer">
            <v-icon start>mdi-content-save</v-icon>
            Enregistrer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script>
import axios from "axios";
import ArbreProgrammeEdition, { avecCles, sansCles } from "@/components/ArbreProgrammeEdition.vue";

const intitule = (e) => `${e.libelle}${e.numero ? ` ${e.numero}` : ""} : ${e.titre}`;
function aplatir(noeuds, chemin = [], sortie = []) {
  (noeuds || []).forEach((n) => {
    const c = [...chemin, n];
    sortie.push({ element: n, chemin: c, feuille: !(n.enfants || []).length });
    aplatir(n.enfants, c, sortie);
  });
  return sortie;
}
const compter = (a) => (a || []).reduce((n, e) => n + 1 + compter(e.enfants), 0);

export default {
  name: "ProgrammeMatiere",
  components: { ArbreProgrammeEdition },
  props: {
    classeId: { type: [String, Number], required: true },
    subjectId: { type: [String, Number], required: true },
  },
  emits: ["charge"],
  data: () => ({
    chargement: true,
    erreur: "",
    classe: null,
    matiere: null,
    programme: null,
    arbre: [],
    progression: {},
    suggestion: null,
    vueAvancement: false,
    edition: false,
    modification: false,
    fichier: null,
    texteColle: "",
    arbreEdition: [],
    travail: false,
    erreurEdition: "",
  }),
  computed: {
    lignes() {
      return aplatir(this.arbre);
    },
    feuilles() {
      return this.lignes.filter((x) => x.feuille);
    },
    partiesFaites() {
      return this.feuilles.filter((x) => this.progression[x.element.id]).length;
    },
    pourcentage() {
      return this.feuilles.length ? Math.round((100 * this.partiesFaites) / this.feuilles.length) : 0;
    },
    enCours() {
      const x = this.feuilles.find((f) => this.progression[f.element.id] && !this.progression[f.element.id].termine);
      return x ? intitule(x.element) : "";
    },
    compte() {
      return compter(this.arbreEdition);
    },
    avertissementVersion() {
      if (!this.modification || !this.programme) return "";
      if (this.programme.portee === "niveau" && !this.programme.estLeMien) {
        return `Vos changements ne s'appliqueront qu'à vos classes de ${this.classe.niveau}. Le programme du niveau reste celui déposé ${this.programme.auteur === "administration" ? "par l'administration" : "par votre collègue"}.`;
      }
      if (this.programme.portee === "niveau" && this.programme.estLeMien) {
        return `Ce programme est partagé avec vos collègues de ${this.classe.niveau} : vos changements s'appliqueront aussi à leurs classes.`;
      }
      return "";
    },
  },
  watch: {
    classeId: "charger",
    subjectId: "charger",
  },
  mounted() {
    this.charger();
  },
  methods: {
    intitule,
    entetes() {
      return { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
    },
    async charger() {
      if (!this.classeId || !this.subjectId) return;
      this.chargement = true;
      this.erreur = "";
      try {
        const { data } = await axios.get(`/api/programme-matiere/classe/${this.classeId}/${this.subjectId}`, this.entetes());
        this.classe = data.classe;
        this.matiere = data.matiere;
        this.programme = data.programme;
        this.arbre = data.arbre || [];
        this.progression = data.progression || {};
        this.suggestion = data.suggestion;
        this.$emit("charge", { programme: this.programme, arbre: this.arbre, progression: this.progression, suggestion: this.suggestion });
      } catch (e) {
        this.erreur = e.response?.data?.message || "Programme indisponible pour le moment.";
        this.$emit("charge", { programme: null, arbre: [], progression: {}, suggestion: null });
      } finally {
        this.chargement = false;
      }
    },
    etat(id) {
      const p = this.progression[id];
      if (!p) return { icone: "mdi-checkbox-blank-circle-outline", couleur: "grey" };
      if (p.termine) return { icone: "mdi-check-circle", couleur: "success" };
      return { icone: "mdi-progress-clock", couleur: "primary" };
    },
    dateCourte(d) {
      const x = new Date(d);
      return Number.isNaN(x.getTime()) ? "" : x.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    },
    ouvrirDepot() {
      this.modification = false;
      this.fichier = null;
      this.texteColle = "";
      this.arbreEdition = [];
      this.erreurEdition = "";
      this.edition = true;
    },
    ouvrirModification() {
      this.modification = true;
      this.erreurEdition = "";
      this.arbreEdition = avecCles(JSON.parse(JSON.stringify(this.arbre)));
      this.edition = true;
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
        await axios.put(`/api/programme-matiere/classe/${this.classeId}/${this.subjectId}`, { arbre: sansCles(this.arbreEdition) }, this.entetes());
        this.edition = false;
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
.pm-card { border-radius: 14px; border: 1px solid rgba(25, 118, 210, 0.15); margin-bottom: 14px; overflow: hidden; }
.pm-head { display: flex; align-items: center; padding: 10px 14px; background: linear-gradient(135deg, #1976d2, #0d47a1); color: #fff; }
.pm-head-titre { font-weight: 800; }
.pm-body { padding: 14px; }
.pm-vide-texte { color: #37474f; line-height: 1.5; }
.pm-source { display: flex; align-items: flex-start; font-size: 0.9rem; color: #455a64; margin-bottom: 10px; }
.pm-avance-texte { font-size: 0.9rem; color: #37474f; margin-top: 6px; }
.pm-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.pm-dialog-titre { font-weight: 800; white-space: normal; }
.pm-ligne { display: flex; align-items: center; flex-wrap: wrap; padding: 4px 0; font-size: 0.95rem; }
.pm-ligne-sa { font-weight: 800; color: #0d47a1; }
.pm-ligne-dates { color: #78909c; font-size: 0.85rem; margin-left: 4px; }
.pm-ou { text-align: center; color: #90a4ae; margin: 6px 0 10px; font-weight: 700; }
.pm-aide { color: #546e7a; margin-bottom: 8px; }
</style>
