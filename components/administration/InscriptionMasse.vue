<template>
  <!-- Inscription d'une classe entière : 1) classe + liste (coller ou
       fichier, n'importe quel modèle) 2) aperçu corrigeable 3) inscription,
       puis photos de la classe en une fois. -->
  <v-card class="im mx-auto rounded-lg pa-3" max-width="1100" elevation="0">
    <div class="im-etapes">
      <span :class="{ actif: etape === 1, fait: etape > 1 }">1. La liste</span>
      <span :class="{ actif: etape === 2, fait: etape > 2 }">2. Vérifier</span>
      <span :class="{ actif: etape >= 3 }">3. Inscrits{{ photosProposees ? ' et photos' : '' }}</span>
    </div>

    <!-- 1. Classe et liste -->
    <template v-if="etape === 1">
      <v-select
        v-model="classeId"
        :items="classes"
        item-title="nom"
        item-value="id"
        label="Classe des élèves"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-google-classroom"
        class="mb-2"
      />

      <AideEssentiel cle="inscription-masse">
        <ul>
          <li><strong>Votre propre liste convient</strong>, Excel ou Word, telle qu'elle est : les colonnes sont reconnues automatiquement. Le modèle vide est facultatif.</li>
          <li><strong>Obligatoire</strong> : nom, prénom, date de naissance, sexe. Le parent est facultatif : un téléphone suffit. Les frères et sœurs avec le même téléphone sont rattachés au même parent.</li>
          <li>Un aperçu permet de tout vérifier avant d'inscrire. Un élève déjà inscrit est ignoré automatiquement.</li>
          <li><strong>Photos d'identité</strong> : après l'inscription. Photographiez les élèves dans l'ordre de votre liste ; un clic les associera ensuite.</li>
        </ul>
      </AideEssentiel>

      <v-btn-toggle v-model="source" mandatory density="compact" color="primary" class="mb-2" divided>
        <v-btn value="fichier" prepend-icon="mdi-file-upload">Importer un fichier</v-btn>
        <v-btn value="coller" prepend-icon="mdi-content-paste">Coller la liste</v-btn>
      </v-btn-toggle>

      <template v-if="source === 'fichier'">
        <p class="im-aide">
          Choisissez le fichier de la classe : <strong>Excel</strong> (.xlsx, .xls, .csv) ou <strong>Word</strong> (.docx, avec un tableau).
        </p>
        <v-file-input
          v-model="fichier"
          accept=".xlsx,.xls,.csv,.docx"
          label="Fichier de la classe (Excel ou Word)"
          variant="outlined"
          prepend-icon=""
          prepend-inner-icon="mdi-paperclip"
          hide-details
        />
        <div class="mt-2">
          <v-btn size="small" variant="tonal" color="secondary" prepend-icon="mdi-download" @click="telechargerModele">
            Pas encore de liste ? Télécharger un modèle vide
          </v-btn>
        </div>
      </template>

      <template v-else>
        <p class="im-aide">
          Ouvrez votre liste (Word, PDF, site…), sélectionnez <strong>toutes les lignes des élèves en une fois</strong>,
          copiez (Ctrl + C) et collez ici une seule fois (Ctrl + V).
        </p>
        <v-textarea
          v-model="texte"
          variant="outlined"
          rows="8"
          auto-grow
          :placeholder="exemple"
          class="im-texte"
          hide-details
        />
      </template>

      <div class="d-flex justify-end ga-2 mt-3">
        <v-btn variant="text" @click="$emit('fermer')">Annuler</v-btn>
        <v-btn color="primary" :disabled="!classeId || !(texte.trim() || fichier)" :loading="lecture" @click="lire">
          Lire la liste
        </v-btn>
      </div>
      <v-alert v-if="erreurLecture" type="warning" variant="tonal" density="compact" class="mt-2">{{ erreurLecture }}</v-alert>
    </template>

    <!-- 2. Aperçu corrigeable -->
    <template v-else-if="etape === 2">
      <div class="im-bilan">
        <strong>{{ lignes.length }}</strong> élève(s) lus pour <strong>{{ nomClasse }}</strong> ·
        <span class="text-success">{{ lignesValides.length }} prêt(s)</span>
        <span v-if="lignes.length - lignesValides.length" class="text-error"> · {{ lignes.length - lignesValides.length }} à compléter (en rouge)</span>
      </div>
      <p class="im-aide">Corrigez directement dans le tableau. Sexe : touchez M ou F. Le parent (téléphone ou e-mail) est facultatif.</p>

      <div class="im-table-wrap">
        <table class="im-table">
          <thead>
            <tr>
              <th>#</th><th>Nom</th><th>Prénom(s)</th><th>Né(e) le</th><th>Sexe</th><th>Parent</th><th>Téléphone</th><th>E-mail</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l, i) in lignes" :key="l.cle" :class="{ 'is-erreur': problemes(l).length }" :title="problemes(l).join(', ')">
              <td class="im-num">{{ i + 1 }}</td>
              <td><input v-model="l.nom" :class="{ manque: !l.nom }" @input="l.nom = l.nom.toUpperCase()" /></td>
              <td><input v-model="l.prenom" :class="{ manque: !l.prenom }" /></td>
              <td><input v-model="l.dateNaissance" type="date" :class="{ manque: !l.dateNaissance }" :max="aujourdhui" /></td>
              <td class="im-sexe">
                <button type="button" :class="{ choisi: l.sexe === 'M', manque: !l.sexe }" @click="l.sexe = 'M'">M</button>
                <button type="button" :class="{ choisi: l.sexe === 'F', manque: !l.sexe }" @click="l.sexe = 'F'">F</button>
              </td>
              <td><input v-model="l.parentNom" placeholder="Nom" /></td>
              <td><input v-model="l.telephone" inputmode="tel" placeholder="—" /></td>
              <td><input v-model="l.email" inputmode="email" placeholder="—" :class="{ manque: l.email && !emailOk(l.email) }" /></td>
              <td><v-btn icon="mdi-close" size="x-small" variant="text" title="Retirer cette ligne" @click="lignes.splice(i, 1)" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="d-flex justify-space-between flex-wrap ga-2 mt-3">
        <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="etape = 1">Modifier la liste</v-btn>
        <v-btn color="success" :disabled="!lignesValides.length" :loading="envoi" @click="inscrire">
          Inscrire {{ lignesValides.length }} élève(s)
        </v-btn>
      </div>
    </template>

    <!-- 3. Résultat, puis photos -->
    <template v-else>
      <v-alert :type="resultat.erreurs.length ? 'warning' : 'success'" variant="tonal" class="mb-3">
        <strong>{{ resultat.inscrits.length }} élève(s) inscrit(s)</strong> en {{ resultat.classe }}
        (effectif : {{ resultat.effectif }}/{{ resultat.effectifMax }}).
        <div v-if="resultat.ignores.length">{{ resultat.ignores.length }} déjà inscrit(s), ignoré(s) : {{ resultat.ignores.map((x) => `${x.nom} ${x.prenom}`).join(', ') }}.</div>
        <div v-if="resultat.erreurs.length">
          Non inscrits :
          <span v-for="(e, k) in resultat.erreurs" :key="k">{{ e.nom }} {{ e.prenom }} ({{ e.message }}){{ k < resultat.erreurs.length - 1 ? ', ' : '.' }}</span>
        </div>
        <div v-if="resultat.nonEnvoyes">{{ resultat.nonEnvoyes }} ligne(s) incomplète(s) n'ont pas été envoyées : inscrivez ces élèves un par un.</div>
        <div v-if="sansParent" class="mt-1">{{ sansParent }} élève(s) sans parent : rattachez-le plus tard dans <strong>Nos élèves</strong>, filtre « Sans parent ».</div>
      </v-alert>

      <template v-if="!photosProposees">
        <div class="im-photos-question">
          <v-icon color="primary" size="28">mdi-image-multiple</v-icon>
          <div>
            <strong>Ajouter les photos d'identité de la classe maintenant ?</strong>
            <div class="im-aide mb-0">Facultatif. Sélectionnez toutes les photos d'un coup : elles sont associées automatiquement.</div>
          </div>
        </div>
        <div class="d-flex justify-end flex-wrap ga-2 mt-2">
          <v-btn variant="text" @click="terminer">Plus tard</v-btn>
          <v-btn variant="tonal" color="primary" prepend-icon="mdi-camera-account" @click="seance = true">Photos pas encore prises : préparer la séance</v-btn>
          <v-btn color="primary" prepend-icon="mdi-image-plus" @click="photosProposees = true">J'ai les photos : les ajouter</v-btn>
        </div>
        <v-dialog v-model="seance" max-width="520">
          <SeancePhoto :eleves="resultat.inscrits" :classe-nom="resultat.classe" @fermer="seance = false" />
        </v-dialog>
      </template>
      <template v-else>
        <PhotosClasse :classe-id="classeId" :classe-nom="resultat.classe" :etablissement-id="etablissementId" :eleves-ids="resultat.inscrits.map((x) => x.id)" fermable @fermer="terminer" @termine="photosFaites = true" />
        <div v-if="photosFaites" class="d-flex justify-end mt-2">
          <v-btn color="primary" @click="terminer">Terminer</v-btn>
        </div>
      </template>
    </template>
  </v-card>
</template>

<script>
import axios from 'axios';
import PhotosClasse from './PhotosClasse.vue';
import SeancePhoto from './SeancePhoto.vue';
import AideEssentiel from '~/components/AideEssentiel.vue';
import { analyserListe, lireTexteColle } from '~/composables/useListeEleves';

let cle = 0;

export default {
  name: 'InscriptionMasse',
  components: { PhotosClasse, SeancePhoto, AideEssentiel },
  props: {
    etablissementId: { type: Number, required: true },
    anneeScolaireId: { type: Number, required: true },
  },
  emits: ['fermer', 'inscrits'],
  data() {
    return {
      etape: 1,
      classes: [],
      classeId: null,
      source: 'fichier',
      texte: '',
      fichier: null,
      lecture: false,
      erreurLecture: '',
      lignes: [],
      envoi: false,
      resultat: null,
      photosProposees: false,
      photosFaites: false,
      seance: false,
      aujourdhui: new Date().toISOString().slice(0, 10),
      exemple: 'Exemple (collez votre liste à la place) :\nNom\tPrénom\tDate de naissance\tSexe\tTéléphone parent\nDOSSOU\tLarissa\t05/08/2014\tF\t0197001122\nDAGBA\tCodjo\t07/06/2014\tM\t0196554433',
    };
  },
  computed: {
    nomClasse() {
      return (this.classes.find((c) => c.id === this.classeId) || {}).nom || '';
    },
    lignesValides() {
      return this.lignes.filter((l) => !this.problemes(l).length);
    },
    sansParent() {
      return this.resultat ? this.resultat.inscrits.filter((x) => x.sansParent).length : 0;
    },
  },
  async mounted() {
    try {
      const { data } = await axios.get(`/api/classe/${this.etablissementId}`);
      this.classes = Array.isArray(data) ? data : [];
    } catch (e) {
      this.classes = [];
    }
  },
  methods: {
    emailOk(e) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    },
    problemes(l) {
      const p = [];
      if (!l.nom) p.push('nom manquant');
      if (!l.prenom) p.push('prénom manquant');
      if (!l.dateNaissance) p.push(l.dateBrute ? `date illisible (« ${l.dateBrute} »)` : 'date de naissance manquante');
      if (!l.sexe) p.push('sexe à choisir');
      if (l.email && !this.emailOk(l.email)) p.push('e-mail invalide');
      return p;
    },
    async lire() {
      this.erreurLecture = '';
      this.lecture = true;
      try {
        let rangees;
        if (this.source === 'coller') {
          rangees = lireTexteColle(this.texte);
        } else {
          const fichier = Array.isArray(this.fichier) ? this.fichier[0] : this.fichier;
          if (/\.docx$/i.test(fichier.name)) {
            const { lireWord } = await import('~/composables/useLectureWord');
            rangees = await lireWord(fichier);
          } else {
          const XLSX = await import('xlsx');
          const classeur = XLSX.read(await fichier.arrayBuffer(), { type: 'array', cellDates: false });
          const feuille = classeur.Sheets[classeur.SheetNames[0]];
          rangees = XLSX.utils.sheet_to_json(feuille, { header: 1, raw: true, defval: '' }).map((r) => r.map((c) => (c === null ? '' : c)));
          }
        }
        const { eleves } = analyserListe(rangees);
        if (!eleves.length) {
          this.erreurLecture = "Aucun élève trouvé dans cette liste. Vérifiez qu'elle contient au moins le nom et le prénom.";
          return;
        }
        this.lignes = eleves.map((e) => { cle += 1; return { ...e, cle }; });
        this.etape = 2;
      } catch (e) {
        this.erreurLecture = "Ce fichier n'a pas pu être lu. Vérifiez qu'il s'agit d'un fichier Excel ou Word (.docx), ou copiez-collez la liste à la place.";
      } finally {
        this.lecture = false;
      }
    },
    async inscrire() {
      this.envoi = true;
      try {
        const valides = this.lignesValides;
        const { data } = await axios.post('/api/eleves/import-liste', {
          classeId: this.classeId,
          anneeScolaireId: this.anneeScolaireId,
          eleves: valides.map(({ nom, prenom, dateNaissance, sexe, parentNom, parentPrenom, telephone, email }) => ({ nom, prenom, dateNaissance, sexe, parentNom, parentPrenom, telephone, email })),
        });
        // Les lignes incomplètes restent à corriger (non envoyées).
        this.resultat = { ...data, nonEnvoyes: this.lignes.length - valides.length };
        this.etape = 3;
        this.$emit('inscrits', data.inscrits.length);
      } catch (error) {
        this.erreurLecture = error?.response?.data?.message || "L'inscription a échoué.";
        this.etape = 1;
      } finally {
        this.envoi = false;
      }
    },
    terminer() {
      this.$emit('fermer');
    },
    async telechargerModele() {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([['Nom', 'Prénom', 'Date de naissance', 'Sexe', 'Nom du parent', 'Téléphone du parent', 'E-mail du parent']]);
      ws['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 8 }, { wch: 18 }, { wch: 20 }, { wch: 26 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Élèves');
      XLSX.writeFile(wb, 'liste_eleves.xlsx');
    },
  },
};
</script>

<style scoped>
.im-etapes { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
.im-etapes span { font-size: 0.78rem; padding: 4px 10px; border-radius: 14px; background: #eef1f6; color: #6b7a8c; font-weight: 600; }
.im-etapes span.actif { background: #1565c0; color: #fff; }
.im-etapes span.fait { background: #e8f5e9; color: #2e7d32; }
.im-aide { font-size: 0.8rem; color: #5f6b7a; margin: 4px 0 8px; line-height: 1.4; }
.im-texte :deep(textarea) { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.8rem; }
.im-bilan { font-size: 0.9rem; }
.im-table-wrap { overflow-x: auto; border: 1px solid #dde4ee; border-radius: 8px; max-height: 60vh; }
.im-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.im-table th { position: sticky; top: 0; background: #f1f5fb; text-align: left; padding: 6px; font-weight: 700; white-space: nowrap; z-index: 1; }
.im-table td { border-top: 1px solid #edf1f6; padding: 2px 3px; }
.im-table input { width: 100%; min-width: 80px; border: 1px solid transparent; border-radius: 4px; padding: 4px 5px; font: inherit; background: transparent; }
.im-table input:focus { border-color: #1565c0; background: #fff; outline: none; }
.im-table input.manque { border-color: #e57373; background: #fdecea; }
.im-table tr.is-erreur td.im-num { color: #c62828; font-weight: 800; }
.im-num { color: #8a97a8; text-align: center; width: 28px; }
.im-sexe { white-space: nowrap; }
.im-sexe button { width: 28px; height: 26px; border: 1px solid #cfd8e3; background: #fff; border-radius: 6px; margin-right: 2px; font-weight: 700; cursor: pointer; }
.im-sexe button.choisi { background: #1565c0; color: #fff; border-color: #1565c0; }
.im-sexe button.manque { border-color: #e57373; }
.im-photos-question { display: flex; gap: 10px; align-items: center; padding: 10px; border: 1px solid #c5d8f5; border-radius: 10px; background: #f5f9ff; }
</style>
