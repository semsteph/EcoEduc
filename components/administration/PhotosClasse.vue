<template>
  <!-- Associer d'un coup les photos d'une classe (déjà sur l'ordinateur ou
       le téléphone) aux élèves : par le nom du fichier, ou dans l'ordre de
       la liste de classe, ou à la main (toucher la photo puis l'élève). -->
  <div class="pc">
    <div class="pc-entete">
      <div>
        <div class="pc-titre">Photos {{ elevesIds && elevesIds.length ? 'des élèves inscrits' : 'de la classe' }} {{ classeNom }}</div>
        <div class="pc-resume">{{ avecPhoto }}/{{ eleves.length }} élève(s) ont déjà une photo</div>
      </div>
      <div class="d-flex ga-1 flex-wrap justify-end">
        <v-btn variant="tonal" size="small" color="primary" prepend-icon="mdi-camera-account" @click="seance = true">Préparer la séance photo</v-btn>
        <v-btn v-if="fermable" variant="text" size="small" @click="$emit('fermer')">Plus tard</v-btn>
      </div>
    </div>

    <AideEssentiel cle="photos-classe">
      <ul>
        <li><strong>Une photo par élève</strong>, utilisée partout : carte scolaire, bulletin et profil de l'enfant côté parents.</li>
        <li><strong>Le plus rapide</strong> : photographier les élèves dans l'ordre de la liste (bouton « Préparer la séance photo »), puis tout sélectionner ici et cliquer sur « Associer dans l'ordre ». Rien à renommer.</li>
        <li>Une photo nommée comme l'élève (« DOSSOU Larissa.jpg ») est reconnue toute seule.</li>
        <li>Photos dans le désordre ? Utilisez « Une photo à la fois ».</li>
        <li>Les élèves qui ont déjà une photo sont laissés de côté, sauf si vous cochez « Remplacer ».</li>
      </ul>
    </AideEssentiel>

    <!-- 1. Choisir les photos -->
    <div
      class="pc-depot"
      :class="{ 'is-survol': survol }"
      @dragover.prevent="survol = true"
      @dragleave.prevent="survol = false"
      @drop.prevent="deposer"
    >
      <v-icon size="30" color="primary">mdi-image-multiple-outline</v-icon>
      <div class="pc-depot-texte">
        <strong>Glissez ici toutes les photos de la classe</strong><br />
        ou sélectionnez-les en une fois (Ctrl + A dans le dossier)
      </div>
      <div class="d-flex flex-wrap ga-2 justify-center">
        <v-btn color="primary" size="small" prepend-icon="mdi-image-plus" @click="$refs.fichiers.click()">Choisir les photos</v-btn>
        <v-btn variant="tonal" color="primary" size="small" prepend-icon="mdi-folder-image" @click="$refs.dossier.click()">Choisir un dossier</v-btn>
      </div>
      <input ref="fichiers" type="file" accept="image/*" multiple hidden @change="choisir" />
      <input ref="dossier" type="file" accept="image/*" multiple webkitdirectory hidden @change="choisir" />
    </div>

    <template v-if="photos.length">
      <!-- 2. Résultat de l'association -->
      <div class="pc-bilan">
        <span><strong>{{ photos.length }}</strong> photo(s)</span>
        <span class="text-success"><strong>{{ nbAssociees }}</strong> associée(s)</span>
        <span v-if="photosLibres.length" class="text-warning"><strong>{{ photosLibres.length }}</strong> à placer</span>
      </div>

      <v-alert v-if="ecartNombre" type="warning" variant="tonal" density="compact" class="mb-0">
        <strong>{{ photosLibres.length }} photo(s) pour {{ elevesSansPhotoChoisie.length }} élève(s) sans photo.</strong>
        « Associer dans l'ordre » risque de décaler les photos : vérifiez qu'aucun élève n'a été oublié ou photographié deux fois,
        ou placez-les avec « Une photo à la fois ».
      </v-alert>

      <div v-if="photosLibres.length && elevesSansPhotoChoisie.length" class="pc-ordre">
        <div>
          Les photos ont été prises <strong>dans l'ordre {{ elevesIds && elevesIds.length ? 'de la liste importée' : 'de la liste de classe (alphabétique)' }}</strong> ?
        </div>
        <div class="d-flex ga-2 flex-wrap">
          <v-btn size="small" color="primary" variant="flat" prepend-icon="mdi-sort-alphabetical-ascending" @click="associerDansLOrdre">
            Associer dans l'ordre
          </v-btn>
          <v-btn size="small" color="primary" variant="tonal" prepend-icon="mdi-image-search" @click="ouvrirUneParUne">
            Une photo à la fois
          </v-btn>
        </div>
      </div>

      <label class="pc-option">
        <input v-model="remplacer" type="checkbox" @change="recalculer" />
        Remplacer aussi les photos déjà enregistrées
      </label>

      <!-- Photos à placer -->
      <div v-if="photosLibres.length" class="pc-plateau">
        <div class="pc-plateau-titre">Touchez une photo, puis l'élève correspondant :</div>
        <div class="pc-plateau-liste">
          <button
            v-for="p in photosLibres"
            :key="p.id"
            type="button"
            class="pc-vignette"
            :class="{ 'is-choisie': photoChoisie === p.id }"
            :title="p.file.name"
            @click="photoChoisie = photoChoisie === p.id ? null : p.id"
          >
            <img :src="p.url" :alt="p.file.name" />
          </button>
        </div>
      </div>
    </template>

    <!-- 3. Élèves -->
    <div class="pc-eleves">
      <button
        v-for="e in eleves"
        :key="e.id"
        type="button"
        class="pc-eleve"
        :class="{ 'is-cible': photoChoisie && estCible(e), 'is-nouvelle': !!association[e.id] }"
        :disabled="!!photoChoisie && !estCible(e)"
        @click="toucherEleve(e)"
      >
        <span class="pc-eleve-photo">
          <img v-if="association[e.id]" :src="photoParId(association[e.id]).url" alt="" />
          <img v-else-if="e.photo_url" :src="e.photo_url" alt="" />
          <span v-else>{{ initiales(e) }}</span>
        </span>
        <span class="pc-eleve-nom">{{ e.nom }} {{ e.prenom }}</span>
        <span v-if="association[e.id]" class="pc-eleve-etat">
          {{ origine[e.id] === 'nom' ? 'nom du fichier' : origine[e.id] === 'ordre' ? 'ordre' : 'manuel' }}
          <v-icon size="14" class="pc-retirer" title="Retirer cette photo" @click.stop="retirer(e)">mdi-close-circle</v-icon>
        </span>
        <span v-else-if="e.photo_url" class="pc-eleve-etat pc-ok">déjà une photo</span>
      </button>
    </div>

    <!-- 4. Enregistrer -->
    <div v-if="nbAssociees" class="pc-pied">
      <v-progress-linear v-if="envoi" :model-value="(envoyees / nbAssociees) * 100" color="primary" height="6" rounded class="mb-2" />
      <v-btn color="primary" block :loading="envoi" :disabled="envoi" @click="enregistrer">
        {{ envoi ? `Enregistrement ${envoyees}/${nbAssociees}…` : `Enregistrer ${nbAssociees} photo(s)` }}
      </v-btn>
    </div>
    <v-alert v-if="message" :type="messageType" variant="tonal" density="compact" class="mt-2">{{ message }}</v-alert>

    <v-dialog v-model="seance" max-width="520">
      <SeancePhoto :eleves="eleves.filter((e) => estCible(e))" :classe-nom="classeNom" @fermer="seance = false" />
    </v-dialog>

    <!-- Une photo à la fois : la photo en grand, on touche le nom de l'élève. -->
    <v-dialog v-model="uneParUne" max-width="560" scrollable>
      <v-card v-if="photoCourante" class="rounded-lg">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          Photo {{ photos.length - photosLibres.length + 1 }} sur {{ photos.length }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="uneParUne = false" />
        </v-card-title>
        <v-card-text class="upu">
          <img :src="photoCourante.url" :alt="photoCourante.file.name" class="upu-photo" />
          <div class="upu-droite">
            <input v-model="recherche" class="upu-recherche" placeholder="Taper le nom de l'élève…" @keydown.enter="choisirPremier" />
            <div class="upu-liste">
              <button v-for="e in elevesFiltres" :key="e.id" type="button" class="upu-eleve" @click="attribuerCourante(e)">
                {{ e.nom }} {{ e.prenom }}
              </button>
              <div v-if="!elevesFiltres.length" class="text-medium-emphasis pa-2">Aucun élève sans photo ne correspond.</div>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" @click="passerCourante">Passer cette photo</v-btn>
          <v-spacer />
          <v-btn variant="tonal" color="primary" @click="uneParUne = false">Terminé</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import axios from 'axios';
import { recadrerPhoto, normaliserNom, triNaturel } from '~/composables/usePhotoIdentite';
import SeancePhoto from './SeancePhoto.vue';
import AideEssentiel from '~/components/AideEssentiel.vue';

let compteur = 0;

export default {
  name: 'PhotosClasse',
  components: { SeancePhoto, AideEssentiel },
  props: {
    classeId: { type: Number, required: true },
    classeNom: { type: String, default: '' },
    etablissementId: { type: Number, required: true },
    fermable: { type: Boolean, default: false },
    // Après une inscription en masse : seulement ces élèves, dans cet ordre
    // (l'ordre de la liste importée = l'ordre des photos).
    elevesIds: { type: Array, default: null },
  },
  emits: ['fermer', 'termine'],
  data() {
    return {
      eleves: [],
      photos: [], // { id, file, url }
      association: {}, // eleveId → photoId
      origine: {}, // eleveId → 'nom' | 'ordre' | 'manuel'
      photoChoisie: null,
      remplacer: false,
      survol: false,
      envoi: false,
      envoyees: 0,
      message: '',
      messageType: 'success',
      seance: false,
      uneParUne: false,
      recherche: '',
      sautees: [],
    };
  },
  computed: {
    avecPhoto() {
      return this.eleves.filter((e) => e.photo_url).length;
    },
    nbAssociees() {
      return Object.keys(this.association).length;
    },
    photosLibres() {
      const prises = new Set(Object.values(this.association));
      return this.photos.filter((p) => !prises.has(p.id));
    },
    ecartNombre() {
      return this.photosLibres.length > 0 && this.elevesSansPhotoChoisie.length > 0
        && this.photosLibres.length !== this.elevesSansPhotoChoisie.length;
    },
    // Mode « une photo à la fois » : première photo libre non passée.
    photoCourante() {
      return this.photosLibres.find((p) => !this.sautees.includes(p.id)) || this.photosLibres[0] || null;
    },
    elevesFiltres() {
      const q = normaliserNom(this.recherche);
      return this.elevesSansPhotoChoisie.filter((e) => !q || normaliserNom(`${e.nom} ${e.prenom} ${e.nom}`).includes(q));
    },
    elevesSansPhotoChoisie() {
      return this.eleves.filter((e) => this.estCible(e) && !this.association[e.id]);
    },
  },
  watch: {
    classeId() { this.charger(); },
  },
  mounted() {
    this.charger();
  },
  beforeUnmount() {
    this.photos.forEach((p) => URL.revokeObjectURL(p.url));
  },
  methods: {
    async charger() {
      const { data } = await axios.get(`/api/cartes-scolaires/verification/${this.classeId}/${this.etablissementId}`);
      let eleves = Array.isArray(data.eleves) ? data.eleves : [];
      if (this.elevesIds && this.elevesIds.length) {
        const rang = new Map(this.elevesIds.map((id, i) => [Number(id), i]));
        eleves = eleves.filter((e) => rang.has(e.id)).sort((a, b) => rang.get(a.id) - rang.get(b.id));
      }
      this.eleves = eleves;
    },
    initiales(e) {
      return `${(e.prenom || '').charAt(0)}${(e.nom || '').charAt(0)}`.toUpperCase();
    },
    photoParId(id) {
      return this.photos.find((p) => p.id === id) || {};
    },
    // Élève qui peut recevoir une photo (sans photo, ou remplacement permis).
    estCible(e) {
      return this.remplacer || !e.photo_url;
    },
    deposer(event) {
      this.survol = false;
      this.ajouter(Array.from(event.dataTransfer.files || []));
    },
    choisir(event) {
      this.ajouter(Array.from(event.target.files || []));
      event.target.value = '';
    },
    ajouter(files) {
      const images = files.filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name));
      images.sort((a, b) => triNaturel(a.name, b.name));
      images.forEach((file) => {
        compteur += 1;
        this.photos.push({ id: compteur, file, url: URL.createObjectURL(file) });
      });
      this.message = '';
      this.associerParNom();
    },
    // Fichier dont le nom contient le nom ET le prénom de l'élève
    // (« DOSSOU Larissa.jpg », « larissa_dossou.png »…).
    associerParNom() {
      const libres = this.photosLibres;
      for (const p of libres) {
        const nomFichier = ` ${normaliserNom(p.file.name.replace(/\.[^.]+$/, ''))} `;
        const candidats = this.eleves.filter((e) => {
          if (!this.estCible(e) || this.association[e.id]) return false;
          const nom = normaliserNom(e.nom);
          const prenom = normaliserNom(e.prenom).split(' ')[0];
          return nom && prenom && nomFichier.includes(` ${nom} `) && nomFichier.includes(` ${prenom}`);
        });
        if (candidats.length === 1) {
          this.association = { ...this.association, [candidats[0].id]: p.id };
          this.origine = { ...this.origine, [candidats[0].id]: 'nom' };
        }
      }
    },
    // Photos restantes (ordre des fichiers) → élèves restants (ordre de la liste).
    associerDansLOrdre() {
      const photos = [...this.photosLibres];
      const eleves = [...this.elevesSansPhotoChoisie];
      const n = Math.min(photos.length, eleves.length);
      const asso = { ...this.association };
      const orig = { ...this.origine };
      for (let i = 0; i < n; i += 1) {
        asso[eleves[i].id] = photos[i].id;
        orig[eleves[i].id] = 'ordre';
      }
      this.association = asso;
      this.origine = orig;
      if (photos.length !== eleves.length) {
        this.messageType = 'warning';
        this.message = `${photos.length} photo(s) pour ${eleves.length} élève(s) : vérifiez la fin de la liste.`;
      }
    },
    recalculer() {
      // Retire les associations devenues interdites, puis retente par nom.
      const asso = {};
      Object.entries(this.association).forEach(([id, pid]) => {
        const e = this.eleves.find((x) => String(x.id) === id);
        if (e && this.estCible(e)) asso[id] = pid;
      });
      this.association = asso;
      this.associerParNom();
    },
    toucherEleve(e) {
      if (!this.photoChoisie || !this.estCible(e)) return;
      this.association = { ...this.association, [e.id]: this.photoChoisie };
      this.origine = { ...this.origine, [e.id]: 'manuel' };
      this.photoChoisie = this.photosLibres[0] ? this.photosLibres[0].id : null;
    },
    ouvrirUneParUne() {
      this.sautees = [];
      this.recherche = '';
      this.uneParUne = true;
    },
    attribuerCourante(e) {
      const p = this.photoCourante;
      if (!p) return;
      this.association = { ...this.association, [e.id]: p.id };
      this.origine = { ...this.origine, [e.id]: 'manuel' };
      this.recherche = '';
      if (!this.photosLibres.length || !this.elevesSansPhotoChoisie.length) this.uneParUne = false;
    },
    choisirPremier() {
      if (this.elevesFiltres.length) this.attribuerCourante(this.elevesFiltres[0]);
    },
    passerCourante() {
      const p = this.photoCourante;
      if (!p) return;
      this.sautees = this.sautees.includes(p.id) ? [] : [...this.sautees, p.id];
      if (this.sautees.length >= this.photosLibres.length) this.sautees = [];
    },
    retirer(e) {
      const asso = { ...this.association };
      delete asso[e.id];
      this.association = asso;
    },
    async enregistrer() {
      this.envoi = true;
      this.envoyees = 0;
      this.message = '';
      const echecs = [];
      for (const [eleveId, photoId] of Object.entries(this.association)) {
        const e = this.eleves.find((x) => String(x.id) === eleveId);
        try {
          const blob = await recadrerPhoto(this.photoParId(photoId).file);
          const fd = new FormData();
          fd.append('photo', blob, 'photo.jpg');
          const { data } = await axios.post(`/api/eleves/${eleveId}/photo`, fd);
          if (e) e.photo_url = data.photo_url;
        } catch (error) {
          echecs.push(e ? `${e.nom} ${e.prenom}` : eleveId);
        }
        this.envoyees += 1;
      }
      const reussies = this.envoyees - echecs.length;
      this.photos.forEach((p) => URL.revokeObjectURL(p.url));
      this.photos = [];
      this.association = {};
      this.origine = {};
      this.photoChoisie = null;
      this.envoi = false;
      this.messageType = echecs.length ? 'warning' : 'success';
      this.message = echecs.length
        ? `${reussies} photo(s) enregistrée(s). Échec pour : ${echecs.join(', ')}.`
        : `${reussies} photo(s) enregistrée(s).`;
      this.$emit('termine', reussies);
    },
  },
};
</script>

<style scoped>
.pc { display: flex; flex-direction: column; gap: 10px; }
.pc-entete { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.pc-titre { font-weight: 800; color: #0d47a1; }
.pc-resume { font-size: 0.8rem; color: #5f6b7a; }
.pc-depot { border: 2px dashed #90a7c9; border-radius: 12px; padding: 14px; text-align: center; background: #f6f9ff; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.pc-depot.is-survol { background: #e3edff; border-color: #1565c0; }
.pc-depot-texte { font-size: 0.85rem; color: #3a4a60; }
.pc-bilan { display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.85rem; }
.pc-ordre { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: #fff8e1; border: 1px solid #ffe082; border-radius: 10px; padding: 8px 10px; font-size: 0.85rem; }
.pc-option { font-size: 0.8rem; color: #4a5768; display: flex; align-items: center; gap: 6px; }
.pc-plateau-titre { font-size: 0.8rem; font-weight: 700; color: #4a5768; margin-bottom: 4px; }
.pc-plateau-liste { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
.pc-vignette { flex: none; width: 54px; height: 72px; border-radius: 6px; overflow: hidden; border: 2px solid transparent; padding: 0; background: #eee; cursor: pointer; }
.pc-vignette img { width: 100%; height: 100%; object-fit: cover; }
.pc-vignette.is-choisie { border-color: #1565c0; box-shadow: 0 0 0 2px #90caf9; }
.pc-eleves { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.pc-eleve { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 6px; border: 1px solid #dde4ee; border-radius: 10px; background: #fff; cursor: default; text-align: center; }
.pc-eleve.is-cible { border-color: #1565c0; background: #eef5ff; cursor: pointer; }
.pc-eleve.is-nouvelle { border-color: #43a047; background: #f1f8e9; }
.pc-eleve:disabled { opacity: 0.45; }
.pc-eleve-photo { width: 54px; height: 72px; border-radius: 6px; overflow: hidden; background: #e8eef6; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #0d47a1; }
.pc-eleve-photo img { width: 100%; height: 100%; object-fit: cover; }
.pc-eleve-nom { font-size: 0.78rem; font-weight: 600; line-height: 1.2; }
.pc-eleve-etat { font-size: 0.68rem; color: #2e7d32; display: inline-flex; align-items: center; gap: 2px; }
.pc-eleve-etat.pc-ok { color: #6b7a8c; }
.pc-retirer { cursor: pointer; color: #c62828; }
.upu { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 12px; }
.upu-photo { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; border-radius: 8px; border: 1px solid #d5dde8; }
.upu-droite { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.upu-recherche { border: 1px solid #b9c7d8; border-radius: 8px; padding: 8px 10px; font: inherit; }
.upu-recherche:focus { outline: 2px solid #1565c0; }
.upu-liste { max-height: 300px; overflow-y: auto; display: grid; gap: 4px; }
.upu-eleve { text-align: left; padding: 8px 10px; border: 1px solid #dde4ee; border-radius: 8px; background: #fff; cursor: pointer; font: inherit; }
.upu-eleve:hover, .upu-eleve:focus { background: #eef5ff; border-color: #1565c0; }
@media (max-width: 520px) { .upu { grid-template-columns: 1fr; } .upu-photo { max-width: 200px; margin: 0 auto; } }
.pc-pied { position: sticky; bottom: 0; background: #fff; padding: 8px 0 4px; }
</style>
