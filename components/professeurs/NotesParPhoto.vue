<template>
  <!-- Remplir une colonne de notes en photographiant la fiche (une photo par page).
       Rien n'est enregistré avant « Placer les notes » ; ensuite la saisie
       habituelle (enregistrement automatique) prend le relais. -->
  <v-dialog :model-value="modelValue" max-width="760" persistent scrollable @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="np-titre">
        <v-icon class="mr-2" color="primary">mdi-camera</v-icon>
        Remplir par photo{{ etape === "verif" ? ` — ${titreColonne}` : "" }}
      </v-card-title>

      <v-card-text>
        <!-- 1. Colonne et photos -->
        <template v-if="etape === 'photos'">
          <div class="np-label">Colonne à remplir</div>
          <v-chip-group v-model="colonne" mandatory selected-class="text-primary" column>
            <v-chip v-for="c in colonnes" :key="c.value" :value="c.value" variant="outlined">{{ c.title }}</v-chip>
          </v-chip-group>

          <div class="np-label mt-3">Photos de la fiche (une photo par page)</div>
          <div class="np-photos">
            <div v-for="(p, i) in photos" :key="p.url" class="np-photo">
              <img :src="p.url" :alt="`Page ${i + 1}`" />
              <div class="np-photo-bas">
                <span>Page {{ i + 1 }}</span>
                <v-btn icon size="x-small" variant="text" color="error" aria-label="Retirer la photo" @click="retirer(i)"><v-icon>mdi-close</v-icon></v-btn>
              </div>
            </div>
            <label class="np-ajout">
              <input type="file" accept="image/*" capture="environment" multiple hidden @change="ajouter" />
              <v-icon size="30" color="primary">mdi-camera-plus-outline</v-icon>
              <span>{{ photos.length ? "Ajouter une page" : "Prendre la photo" }}</span>
            </label>
          </div>

          <v-expansion-panels variant="accordion" class="mt-3">
            <v-expansion-panel title="Fiche à plusieurs colonnes de notes ?">
              <v-expansion-panel-text>
                Sur la fiche, la note à lire est dans la colonne n°
                <v-chip-group v-model="colonneFiche" mandatory selected-class="text-primary">
                  <v-chip v-for="n in 4" :key="n" :value="n" size="small" variant="outlined">{{ n }}</v-chip>
                </v-chip-group>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <v-alert type="info" variant="tonal" density="compact" class="mt-3">
            Photographiez chaque page à plat, bien éclairée, avec toute la page dans le cadre. Le nom et la note de chaque élève doivent être sur la même ligne.
          </v-alert>
        </template>

        <!-- 2. Vérification -->
        <template v-else>
          <div class="np-compteurs">
            <v-chip color="success" variant="tonal" size="small">{{ compte.sur }} sûr(s)</v-chip>
            <v-chip color="warning" variant="tonal" size="small">{{ compte.confirmer }} à confirmer</v-chip>
            <v-chip color="error" variant="tonal" size="small">{{ compte.nonTrouve }} non trouvé(s)</v-chip>
            <v-chip v-if="aAttribuer.length" color="deep-purple" variant="tonal" size="small">{{ aAttribuer.length }} ligne(s) à attribuer</v-chip>
          </div>
          <div class="np-resume">{{ compte.trouves }} élève(s) sur {{ lignesEleves.length }} trouvé(s) sur les photos.</div>

          <!-- Lignes de la fiche à attribuer -->
          <div v-if="aAttribuer.length" class="np-bloc">
            <div class="np-bloc-titre">Lignes de la fiche à attribuer</div>
            <div v-for="l in aAttribuer" :key="`a${l.ligne}`" class="np-attribuer">
              <div class="np-extrait" :style="extrait(l)" :title="`Page ${l.photo + 1}`" />
              <div class="np-attribuer-info">
                « {{ l.ecrit }} » : <strong>{{ l.noteLue || "—" }}</strong>
                <v-select
                  v-model="l.choix"
                  :items="choixEleves(l)"
                  item-title="nom"
                  item-value="id"
                  label="C'est quel élève ?"
                  density="compact"
                  variant="outlined"
                  hide-details
                  clearable
                  class="mt-1"
                  @update:model-value="attribuer(l, $event)"
                />
              </div>
            </div>
          </div>

          <!-- Toute la classe, dans l'ordre de la liste -->
          <div class="np-bloc">
            <div class="np-bloc-titre">Toute la classe</div>
            <div v-for="r in lignesEleves" :key="r.eleve.id" class="np-ligne" :class="`np-ligne--${r.statut}`">
              <div class="np-ligne-haut">
                <div class="np-nom">{{ r.eleve.nom }} {{ r.eleve.prenom }}</div>
                <template v-if="r.bloque">
                  <span class="np-bloque">{{ r.bloque }}</span>
                </template>
                <template v-else>
                  <input
                    v-model="r.saisie"
                    class="np-note"
                    inputmode="decimal"
                    maxlength="5"
                    :aria-label="`Note de ${r.eleve.prenom} ${r.eleve.nom}`"
                    @input="r.confirme = true"
                  />
                  <v-btn v-if="r.statut === 'a_confirmer' && !r.confirme" size="small" color="warning" variant="flat" @click="r.confirme = true">Confirmer</v-btn>
                  <v-icon v-else-if="r.statut === 'sur' || r.confirme" color="success">mdi-check-circle</v-icon>
                </template>
              </div>
              <div v-if="!r.bloque && r.statut !== 'sur'" class="np-ligne-bas">
                <span class="np-raison">{{ r.raison }}</span>
                <div v-if="r.ligne" class="np-extrait np-extrait--petit" :style="extrait(r.ligne)" :title="`« ${r.ligne.ecrit} » — page ${r.ligne.photo + 1}`" />
              </div>
            </div>
          </div>
        </template>

        <v-alert v-if="erreur" type="error" variant="tonal" density="compact" class="mt-3">{{ erreur }}</v-alert>
      </v-card-text>

      <v-card-actions>
        <v-btn v-if="etape === 'verif'" variant="text" @click="etape = 'photos'"><v-icon start>mdi-arrow-left</v-icon>Photos</v-btn>
        <v-spacer />
        <v-btn variant="tonal" :disabled="lecture" @click="fermer">Annuler</v-btn>
        <v-btn v-if="etape === 'photos'" color="primary" variant="flat" :loading="lecture" :disabled="!photos.length" @click="lire">
          Lire les notes
        </v-btn>
        <v-btn v-else color="primary" variant="flat" :disabled="!aPlacer.length" @click="placer">
          <v-icon start>mdi-check</v-icon>
          Placer les notes ({{ aPlacer.length }})
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import axios from "axios";

// Photo réduite avant l'envoi (2000 px au plus, JPEG) : plus rapide sur un réseau faible.
function reduire(fichier) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const echelle = Math.min(1, 2000 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * echelle);
      c.height = Math.round(img.height * echelle);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("photo illisible"))), "image/jpeg", 0.85);
    };
    img.onerror = () => reject(new Error("photo illisible"));
    img.src = URL.createObjectURL(fichier);
  });
}

export default {
  name: "NotesParPhoto",
  props: {
    modelValue: Boolean,
    students: { type: Array, default: () => [] },
    colonnes: { type: Array, default: () => [] },
    colonneInitiale: { type: String, default: "inter1" },
    // (eleve, champ) → texte de la case actuelle ("" si vide)
    valeurCase: { type: Function, required: true },
    // (eleve, champ) → raison si la case ne peut pas être remplie, sinon null
    caseBloquee: { type: Function, required: true },
    contexte: { type: Object, required: true }, // { classeId, subjectId, semesterId, anneeScolaireId }
  },
  emits: ["update:modelValue", "placer"],
  data: () => ({
    etape: "photos",
    colonne: "inter1",
    colonneFiche: 1,
    photos: [],
    lecture: false,
    erreur: "",
    resultat: null,
    lignesEleves: [],
    aAttribuer: [],
  }),
  computed: {
    titreColonne() {
      return this.colonnes.find((c) => c.value === this.colonne)?.title || this.colonne;
    },
    compte() {
      const c = { sur: 0, confirmer: 0, nonTrouve: 0, trouves: 0 };
      this.lignesEleves.forEach((r) => {
        if (r.statut === "sur") c.sur += 1;
        else if (r.statut === "a_confirmer") c.confirmer += 1;
        else c.nonTrouve += 1;
        if (r.statut !== "non_trouve") c.trouves += 1;
      });
      return c;
    },
    // Notes prêtes : sûres, confirmées, ou tapées ; jamais sur une case bloquée.
    aPlacer() {
      return this.lignesEleves
        .filter((r) => !r.bloque && String(r.saisie || "").trim() !== "" && (r.statut === "sur" || r.confirme))
        .filter((r) => /^\d+([.,]\d+)?$/.test(String(r.saisie).trim()) && Number(String(r.saisie).replace(",", ".")) <= 20)
        .map((r) => ({ eleveId: r.eleve.id, champ: this.colonne, texte: String(r.saisie).trim() }));
    },
  },
  watch: {
    modelValue(ouvert) {
      if (ouvert) {
        this.etape = "photos";
        this.colonne = this.colonneInitiale;
        this.erreur = "";
      }
    },
  },
  methods: {
    async ajouter(ev) {
      const fichiers = Array.from(ev.target.files || []);
      ev.target.value = "";
      for (const f of fichiers) {
        try {
          const blob = await reduire(f);
          this.photos.push({ blob, url: URL.createObjectURL(blob) });
        } catch {
          this.erreur = "Une photo n'a pas pu être lue.";
        }
      }
    },
    retirer(i) {
      URL.revokeObjectURL(this.photos[i].url);
      this.photos.splice(i, 1);
    },
    fermer() {
      this.$emit("update:modelValue", false);
    },
    async lire() {
      this.lecture = true;
      this.erreur = "";
      try {
        const fd = new FormData();
        Object.entries(this.contexte).forEach(([k, v]) => fd.append(k, v));
        fd.append("colonneFiche", this.colonneFiche);
        this.photos.forEach((p, i) => fd.append("photos", p.blob, `page-${i + 1}.jpg`));
        const { data } = await axios.post("/api/notes/photo/lire", fd, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          timeout: 120000,
        });
        this.preparer(data);
        this.etape = "verif";
      } catch (e) {
        this.erreur = e.response?.data?.message || "Les photos n'ont pas pu être lues.";
      } finally {
        this.lecture = false;
      }
    },
    // Prépare l'écran de vérification à partir du rapprochement fait par le serveur.
    preparer(data) {
      this.resultat = data;
      const lignes = data.lignes || [];
      const noteTexte = (l) => (l && l.note && l.note.type === "note" ? String(l.note.valeur).replace(".", ",") : "");
      this.lignesEleves = this.students.map((eleve) => {
        const etat = (data.eleves || []).find((x) => x.eleveId === eleve.id) || { statut: "non_trouve" };
        const ligne = etat.lignes && etat.lignes.length === 1 ? lignes[etat.lignes[0]] : null;
        const existante = this.valeurCase(eleve, this.colonne);
        const bloque = this.caseBloquee(eleve, this.colonne) || (existante !== "" && existante !== null ? `déjà une note (${existante}), non remplacée` : null);
        const absent = ligne && ligne.note && ligne.note.type === "absent";
        return {
          eleve,
          statut: etat.statut,
          raison: absent ? "absent sur la fiche (case laissée vide)" : etat.raison || (etat.statut === "non_trouve" ? "pas trouvé sur les photos : tapez la note si besoin" : ""),
          ligne,
          saisie: etat.statut === "non_trouve" || etat.raison === "une ligne ambiguë peut être cet élève" ? "" : noteTexte(ligne),
          confirme: false,
          bloque,
        };
      });
      this.aAttribuer = (data.aAttribuer || []).map((i) => ({ ...lignes[i], choix: null }));
    },
    choixEleves(l) {
      const possibles = new Set((l.candidats || []).map((c) => c.eleveId));
      const liste = this.students.map((e) => ({ id: e.id, nom: `${possibles.has(e.id) ? "★ " : ""}${e.nom} ${e.prenom}` }));
      return [...liste.filter((x) => x.nom.startsWith("★")), ...liste.filter((x) => !x.nom.startsWith("★"))];
    },
    // L'enseignant dit à quel élève appartient une ligne de la fiche.
    attribuer(l, eleveId) {
      const r = this.lignesEleves.find((x) => x.eleve.id === eleveId);
      if (!r) return;
      r.ligne = l;
      r.saisie = l.note && l.note.type === "note" ? String(l.note.valeur).replace(".", ",") : "";
      r.statut = "a_confirmer";
      r.raison = `ligne « ${l.ecrit} » attribuée`;
      r.confirme = true;
    },
    // Bande de la photo autour de la ligne lue (position verticale estimée).
    extrait(l) {
      const p = this.photos[l.photo];
      if (!p) return {};
      return {
        backgroundImage: `url(${p.url})`,
        backgroundSize: "100% auto",
        backgroundPosition: `0 ${Math.round((l.y ?? 0.5) * 100)}%`,
      };
    },
    placer() {
      this.$emit("placer", this.aPlacer);
      this.fermer();
    },
  },
};
</script>

<style scoped>
.np-titre { font-weight: 800; display: flex; align-items: center; }
.np-label { font-weight: 700; color: #455a64; font-size: 0.9rem; }
.np-photos { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
.np-photo { width: 110px; border: 1px solid #cfd8dc; border-radius: 10px; overflow: hidden; }
.np-photo img { width: 100%; height: 140px; object-fit: cover; display: block; }
.np-photo-bas { display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; padding: 0 4px 0 8px; }
.np-ajout { width: 110px; height: 168px; border: 2px dashed #90caf9; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; cursor: pointer; color: #1565c0; font-weight: 700; font-size: 0.8rem; text-align: center; padding: 6px; }
.np-compteurs { display: flex; flex-wrap: wrap; gap: 6px; }
.np-resume { margin: 6px 0 10px; color: #455a64; }
.np-bloc { margin-top: 10px; }
.np-bloc-titre { font-weight: 800; color: #0d47a1; margin-bottom: 6px; }
.np-attribuer { display: flex; gap: 10px; align-items: flex-start; border: 1px solid #d1c4e9; border-radius: 10px; padding: 8px; margin-bottom: 8px; background: #faf7ff; }
.np-attribuer-info { flex: 1; min-width: 0; }
.np-extrait { width: 220px; height: 56px; border-radius: 6px; border: 1px solid #b0bec5; background-repeat: no-repeat; background-color: #eceff1; flex-shrink: 0; }
.np-extrait--petit { width: 100%; max-width: 320px; height: 48px; margin-top: 4px; }
.np-ligne { border-left: 4px solid #cfd8dc; padding: 6px 8px; margin-bottom: 4px; background: #fff; border-radius: 6px; }
.np-ligne--sur { border-left-color: #43a047; }
.np-ligne--a_confirmer { border-left-color: #fb8c00; background: #fff8ef; }
.np-ligne--non_trouve { border-left-color: #e53935; background: #fff5f5; }
.np-ligne-haut { display: flex; align-items: center; gap: 8px; }
.np-nom { flex: 1; min-width: 0; font-weight: 600; }
.np-note { width: 64px; text-align: center; border: 1px solid #b0bec5; border-radius: 8px; padding: 6px; font-weight: 700; font-size: 1rem; background: #fff; }
.np-bloque { color: #78909c; font-size: 0.82rem; }
.np-raison { font-size: 0.8rem; color: #8d6e63; }
@media (max-width: 600px) {
  .np-attribuer { flex-direction: column; }
  .np-extrait { width: 100%; }
}
</style>
