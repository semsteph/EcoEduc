<template>
  <!-- Transfert des notes vers EducMaster : le modèle téléchargé sur
       EducMaster entre vide, il ressort rempli avec nos notes — une seule
       note, ou plusieurs notes de plusieurs matières d'un coup. -->
  <v-container fluid class="em pa-2 pa-sm-3">
    <div class="em-entete">
      <v-icon color="primary" size="28">mdi-transfer-up</v-icon>
      <div>
        <h2 class="em-titre">Notes vers EducMaster</h2>
        <div class="em-sous">Remplissez le fichier d'importation d'EducMaster avec les notes déjà saisies ici, sans rien retaper.</div>
      </div>
    </div>

    <AideEssentiel cle="educmaster">
      <ul>
        <li><strong>1.</strong> Sur EducMaster, téléchargez le modèle d'importation des notes de la classe (matricule, Nom, Prenom, Note), <strong>sans le modifier</strong>.</li>
        <li><strong>2.</strong> Déposez-le ici, choisissez la période, puis cochez les notes voulues : chaque matière peut avoir ses propres notes.</li>
        <li><strong>3.</strong> Une case cochée donne un fichier ; plusieurs cases donnent un ZIP rangé par matière puis par note. Chaque fichier contient <strong>une seule note</strong> et porte <strong>exactement le nom du modèle</strong> : importez-le tel quel sur EducMaster.</li>
        <li>Seules les <strong>notes d'évaluation</strong> partent (interrogations, devoirs) : EducMaster calcule lui-même les moyennes. Les notes non validées par l'enseignant sont laissées vides et signalées.</li>
      </ul>
    </AideEssentiel>

    <!-- 1. Fichier -->
    <v-card class="em-bloc" elevation="0">
      <div class="em-bloc-titre"><span class="em-num">1</span> Le fichier téléchargé sur EducMaster</div>
      <div class="d-flex flex-wrap align-center ga-2">
        <v-file-input
          v-model="fichier"
          accept=".xlsx"
          label="Fichier .xlsx d'EducMaster"
          variant="outlined"
          density="compact"
          prepend-icon=""
          prepend-inner-icon="mdi-microsoft-excel"
          hide-details
          class="em-fichier"
          @update:model-value="analyser"
        />
        <v-progress-circular v-if="analyse" indeterminate size="22" color="primary" />
      </div>
      <v-alert v-if="erreur" type="error" variant="tonal" density="compact" class="mt-2">{{ erreur }}</v-alert>
      <div v-if="lignes.length" class="em-info mt-2">
        Feuille <strong>« {{ feuille }} »</strong> · {{ lignes.length }} élève(s) dans le fichier
      </div>
    </v-card>

    <template v-if="lignes.length">
      <!-- 2. Notes à transférer -->
      <v-card class="em-bloc" elevation="0">
        <div class="em-bloc-titre"><span class="em-num">2</span> Les notes à transférer</div>
        <div class="em-grille">
          <v-select v-model="classeId" :items="classes" item-title="nom" item-value="id" label="Classe" variant="outlined" density="compact" hide-details @update:model-value="changerClasse" />
          <v-select v-model="semestreId" :items="semestres" item-title="nom" item-value="id" label="Période" variant="outlined" density="compact" hide-details />
        </div>

        <p class="em-aide">
          Cochez les notes voulues. Touchez le nom d'une matière pour cocher toute sa ligne, ou le nom d'une note pour toute sa colonne.
          Le chiffre indique le nombre de notes prêtes ; « — » : aucune note saisie.
        </p>
        <div class="em-lot">
          <table class="em-lot-table">
            <thead>
              <tr>
                <th class="em-coin">
                  <button type="button" class="em-lien" @click="toutCocher">tout</button> ·
                  <button type="button" class="em-lien" @click="selection = []">rien</button>
                </th>
                <th v-for="(titre, c) in champs" :key="c">
                  <button type="button" class="em-tete" @click="basculerColonne(c)">{{ titre }}</button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in matieres" :key="m.id">
                <td class="em-lot-matiere"><button type="button" class="em-tete" @click="basculerLigne(m.id)">{{ m.nom }}</button></td>
                <td v-for="(titre, c) in champs" :key="c" :class="classeCase(m.id, c)">
                  <label v-if="caseLot(m.id, c)?.remplies" class="em-case">
                    <input type="checkbox" :checked="estCoche(m.id, c)" @change="basculer(m.id, c)" />
                    <span>{{ caseLot(m.id, c).remplies }}</span>
                    <span v-if="caseLot(m.id, c).nonValidees" class="em-mini" :title="`${caseLot(m.id, c).nonValidees} note(s) non validée(s) laissée(s) vide(s)`">+{{ caseLot(m.id, c).nonValidees }}</span>
                  </label>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="em-aide mt-1">Sur {{ lignes.length }} élève(s) du modèle. En orange : des notes non validées par l'enseignant seront laissées vides.</div>
      </v-card>

      <!-- 3. Vérifier les élèves -->
      <v-card class="em-bloc" elevation="0">
        <div class="em-bloc-titre"><span class="em-num">3</span> Vérifier les élèves</div>
        <div class="em-resume">
          <span class="ok"><strong>{{ nbAssocies }}</strong> élève(s) reconnu(s)</span>
          <span v-if="nbAVerifier" class="attention"><strong>{{ nbAVerifier }}</strong> à vérifier</span>
          <span v-if="nbSansEleve" class="probleme"><strong>{{ nbSansEleve }}</strong> ligne(s) sans élève (note laissée vide)</span>
        </div>
        <v-alert v-if="absents.length" type="info" variant="tonal" density="compact" class="mb-2">
          Élève(s) de la classe absent(s) du fichier EducMaster : {{ absents.join(', ') }}.
          Vérifiez sur EducMaster qu'ils sont bien inscrits dans cette classe.
        </v-alert>
        <div class="em-table-wrap">
          <table class="em-table">
            <thead>
              <tr><th>#</th><th>Matricule</th><th>Fichier EducMaster</th><th>Élève chez nous</th></tr>
            </thead>
            <tbody>
              <tr v-for="(l, i) in lignes" :key="l.r" :class="'st-' + etatLigne(l)">
                <td class="em-n">{{ i + 1 }}</td>
                <td class="em-mat">{{ l.matricule }}</td>
                <td>{{ l.nom }} {{ l.prenom }}</td>
                <td>
                  <div class="d-flex align-center ga-1">
                    <v-chip size="x-small" :color="couleurStatut(l)" variant="tonal">{{ libelleStatut(l) }}</v-chip>
                    <select v-model.number="associations[l.r]" class="em-select" @change="majApercu">
                      <option :value="0">— aucun —</option>
                      <option v-for="e in optionsPour(l)" :key="e.id" :value="e.id">{{ e.nom }} {{ e.prenom }}{{ e.classe && e.classeId !== classeId ? ` (${e.classe})` : '' }}</option>
                    </select>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card>

      <!-- 4. Télécharger -->
      <div class="em-pied">
        <v-btn color="primary" size="large" :prepend-icon="selectionUtile.length > 1 ? 'mdi-folder-zip' : 'mdi-download'" :loading="generation" :disabled="!selectionUtile.length" @click="telecharger">
          <template v-if="!selectionUtile.length">Cochez au moins une note</template>
          <template v-else-if="selectionUtile.length === 1">Télécharger le fichier ({{ libelleCase(selectionUtile[0]) }})</template>
          <template v-else>Télécharger les {{ selectionUtile.length }} fichiers (ZIP)</template>
        </v-btn>
        <div v-if="telecharge" class="em-suite">
          <div class="em-suite-ligne">
            <v-icon color="success" size="18">mdi-check-circle</v-icon>
            <span v-if="dernierEnvoi === 1">Fichier téléchargé ({{ dernierFichier }}) : il contient cette seule note.</span>
            <span v-else>ZIP téléchargé. Ouvrez-le : un dossier par matière, puis un dossier par note (« 1 - Interrogation 1 », « 5 - Devoir 1 »…), avec un seul fichier dedans. LISEZ-MOI.txt est la liste à cocher au fur et à mesure.</span>
          </div>
          <div class="em-nom">
            <v-icon color="warning" size="18">mdi-alert-circle-outline</v-icon>
            <div>
              <strong>Avant d'importer sur EducMaster</strong>, le fichier doit porter exactement le nom du modèle :
              <span class="em-nom-exact">{{ nomModele }}</span>
              <v-btn size="x-small" variant="tonal" color="primary" class="ml-1" @click="copierNom">{{ copie ? 'Copié' : 'Copier le nom' }}</v-btn>
              <div class="em-mini-aide">
                C'est déjà le cas{{ dernierEnvoi === 1 ? '' : ' pour chaque fichier du ZIP' }}. Mais si votre ordinateur l'a renommé
                (par exemple « {{ nomModele.replace(/\.xlsx$/i, '') }} (1).xlsx », quand un fichier du même nom existe déjà dans le dossier),
                redonnez-lui ce nom exact avant de l'envoyer.
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </v-container>
</template>

<script>
import axios from 'axios';
import AideEssentiel from '~/components/AideEssentiel.vue';

export default {
  name: 'EducMaster',
  components: { AideEssentiel },
  props: {
    etablissementId: { type: Number, required: true },
    anneeScolaireId: { type: Number, default: null },
  },
  data() {
    return {
      fichier: null,
      analyse: false,
      erreur: '',
      feuille: '',
      lignes: [],
      associations: {},
      classes: [],
      classeId: null,
      elevesClasse: [],
      matieres: [],
      semestres: [],
      semestreId: null,
      champs: {},
      selection: [], // [{ matiereId, champ }]
      tableau: [],
      absents: [],
      generation: false,
      telecharge: false,
      dernierEnvoi: 0,
      dernierFichier: '',
      copie: false,
      minuteur: null,
    };
  },
  computed: {
    // Cases cochées qui ont réellement des notes.
    selectionUtile() {
      return this.selection.filter((x) => this.caseLot(x.matiereId, x.champ)?.remplies);
    },
    nomModele() {
      const f = this.fichierUnique();
      return f ? f.name : 'EducMaster.xlsx';
    },
    nbAssocies() {
      return this.lignes.filter((l) => Number(this.associations[l.r])).length;
    },
    nbSansEleve() {
      return this.lignes.length - this.nbAssocies;
    },
    nbAVerifier() {
      return this.lignes.filter((l) => this.libelleStatut(l) === 'à vérifier').length;
    },
  },
  watch: {
    semestreId() { this.majApercu(); },
  },
  async mounted() {
    const [classes, semestres] = await Promise.all([
      axios.get(`/api/classe/${this.etablissementId}`).catch(() => ({ data: [] })),
      axios.get(`/api/semesters/${this.etablissementId}`).catch(() => ({ data: [] })),
    ]);
    this.classes = classes.data || [];
    this.semestres = semestres.data || [];
    if (this.semestres.length) this.semestreId = this.semestres[0].id;
  },
  methods: {
    fichierUnique() {
      return Array.isArray(this.fichier) ? this.fichier[0] : this.fichier;
    },
    formulaire(options) {
      const fd = new FormData();
      const f = this.fichierUnique();
      fd.append('fichier', f, f.name);
      fd.append('options', JSON.stringify(options));
      return fd;
    },
    associationsChoisies() {
      return Object.fromEntries(Object.entries(this.associations).filter(([, id]) => Number(id)));
    },
    async analyser() {
      this.erreur = '';
      this.lignes = [];
      this.tableau = [];
      this.selection = [];
      this.telecharge = false;
      if (!this.fichierUnique()) return;
      this.analyse = true;
      try {
        const fd = new FormData();
        fd.append('fichier', this.fichierUnique(), this.fichierUnique().name);
        const { data } = await axios.post('/api/educmaster/analyser', fd);
        this.feuille = data.feuille;
        this.lignes = data.lignes;
        this.champs = data.champs;
        this.associations = Object.fromEntries(data.lignes.map((l) => [l.r, l.eleveId || 0]));
        if (data.classeId) {
          this.classeId = data.classeId;
          await this.chargerClasse();
        }
        this.majApercu();
      } catch (error) {
        this.erreur = error?.response?.data?.message || "Ce fichier n'a pas pu être lu.";
      } finally {
        this.analyse = false;
      }
    },
    async chargerClasse() {
      const [eleves, matieres] = await Promise.all([
        axios.get(`/api/cartes-scolaires/verification/${this.classeId}/${this.etablissementId}`).catch(() => ({ data: { eleves: [] } })),
        axios.get(`/api/matiere/${this.classeId}`).catch(() => ({ data: [] })),
      ]);
      this.elevesClasse = (eleves.data.eleves || []).map((e) => ({ id: e.id, nom: e.nom, prenom: e.prenom, classeId: this.classeId }));
      this.matieres = matieres.data || [];
      this.selection = [];
    },
    async changerClasse() {
      await this.chargerClasse();
      this.majApercu();
    },
    // --- tableau à cocher ---
    caseLot(matiereId, champ) {
      return this.tableau.find((c) => c.matiereId === matiereId && c.champ === champ);
    },
    estCoche(matiereId, champ) {
      return this.selection.some((x) => x.matiereId === matiereId && x.champ === champ);
    },
    basculer(matiereId, champ) {
      this.selection = this.estCoche(matiereId, champ)
        ? this.selection.filter((x) => !(x.matiereId === matiereId && x.champ === champ))
        : [...this.selection, { matiereId, champ }];
    },
    casesDisponibles(filtre) {
      return this.tableau.filter((c) => c.remplies && filtre(c)).map((c) => ({ matiereId: c.matiereId, champ: c.champ }));
    },
    basculerLigne(matiereId) {
      const cases = this.casesDisponibles((c) => c.matiereId === matiereId);
      const toutes = cases.every((c) => this.estCoche(c.matiereId, c.champ));
      this.selection = this.selection.filter((x) => x.matiereId !== matiereId);
      if (!toutes) this.selection = [...this.selection, ...cases];
    },
    basculerColonne(champ) {
      const cases = this.casesDisponibles((c) => c.champ === champ);
      const toutes = cases.every((c) => this.estCoche(c.matiereId, c.champ));
      this.selection = this.selection.filter((x) => x.champ !== champ);
      if (!toutes) this.selection = [...this.selection, ...cases];
    },
    toutCocher() {
      this.selection = this.casesDisponibles(() => true);
    },
    classeCase(matiereId, champ) {
      const c = this.caseLot(matiereId, champ);
      if (!c || !c.remplies) return 'case-vide';
      const base = c.nonValidees ? 'case-partielle' : 'case-ok';
      return this.estCoche(matiereId, champ) ? `${base} case-cochee` : base;
    },
    libelleCase(x) {
      const m = this.matieres.find((y) => y.id === x.matiereId);
      return `${m ? m.nom : ''} · ${this.champs[x.champ]}`;
    },
    // --- élèves ---
    optionsPour(l) {
      const vus = new Set();
      return [...(l.candidats || []), ...this.elevesClasse].filter((e) => (vus.has(e.id) ? false : vus.add(e.id)))
        .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'));
    },
    libelleStatut(l) {
      const choisi = Number(this.associations[l.r]);
      if (!choisi) return 'à associer';
      if (choisi !== l.eleveId) return 'choisi';
      return { matricule: 'reconnu', nom: 'reconnu', approchant: 'à vérifier', ambigu: 'à vérifier' }[l.statut] || 'choisi';
    },
    couleurStatut(l) {
      const s = this.libelleStatut(l);
      return s === 'à associer' ? 'error' : s === 'à vérifier' ? 'warning' : 'success';
    },
    etatLigne(l) {
      const s = this.libelleStatut(l);
      return s === 'à associer' ? 'probleme' : s === 'à vérifier' ? 'attention' : 'ok';
    },
    // --- aperçu et téléchargement ---
    majApercu() {
      clearTimeout(this.minuteur);
      this.minuteur = setTimeout(async () => {
        if (!this.classeId || !this.semestreId || !this.anneeScolaireId || !this.matieres.length || !this.lignes.length) { this.tableau = []; return; }
        try {
          const { data } = await axios.post('/api/educmaster/lot', this.formulaire({
            classeId: this.classeId, semestreId: this.semestreId, anneeScolaireId: this.anneeScolaireId,
            matiereIds: this.matieres.map((m) => m.id), champs: Object.keys(this.champs),
            associations: this.associationsChoisies(), apercu: true,
          }));
          this.tableau = data.tableau;
          this.absents = data.absentsDuFichier;
          this.telecharge = false;
        } catch (error) {
          this.erreur = error?.response?.data?.message || "L'aperçu n'a pas pu être calculé.";
        }
      }, 250);
    },
    async copierNom() {
      try {
        await navigator.clipboard.writeText(this.nomModele);
        this.copie = true;
        setTimeout(() => { this.copie = false; }, 2000);
      } catch (e) {
        this.copie = false;
      }
    },
    enregistrerFichier(blob, nom) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nom;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    },
    async telecharger() {
      const choix = this.selectionUtile;
      if (!choix.length) return;
      this.generation = true;
      this.erreur = '';
      const classe = (this.classes.find((c) => c.id === this.classeId) || {}).nom || 'classe';
      const periode = (this.semestres.find((x) => x.id === this.semestreId) || {}).nom || '';
      const commun = { classeId: this.classeId, semestreId: this.semestreId, anneeScolaireId: this.anneeScolaireId, associations: this.associationsChoisies() };
      try {
        if (choix.length === 1) {
          const { matiereId, champ } = choix[0];
          const reponse = await axios.post('/api/educmaster/remplir', this.formulaire({ ...commun, matiereId, champ }), { responseType: 'blob' });
          const m = this.matieres.find((y) => y.id === matiereId);
          // Nom exact du modèle EducMaster.
          this.enregistrerFichier(reponse.data, this.nomModele);
          this.dernierFichier = `${m ? m.nom : ''} · ${this.champs[champ]}`;
        } else {
          const reponse = await axios.post('/api/educmaster/lot', this.formulaire({ ...commun, selection: choix }), { responseType: 'blob' });
          this.enregistrerFichier(reponse.data, `EducMaster - ${classe} - ${periode}.zip`);
        }
        this.dernierEnvoi = choix.length;
        this.telecharge = true;
      } catch (error) {
        this.erreur = "Les fichiers n'ont pas pu être préparés.";
      } finally {
        this.generation = false;
      }
    },
  },
};
</script>

<style scoped>
.em-entete { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.em-titre { margin: 0; font-size: 1.15rem; font-weight: 800; color: #0d47a1; }
.em-sous { font-size: 0.85rem; color: #5f6b7a; }
.em-bloc { border: 1px solid #dde4ee; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
.em-bloc-titre { font-weight: 800; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; color: #1c2a3a; }
.em-num { width: 24px; height: 24px; border-radius: 50%; background: #1565c0; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; }
.em-fichier { max-width: 420px; min-width: 240px; }
.em-info { font-size: 0.85rem; color: #3a4a60; }
.em-grille { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px; max-width: 520px; }
.em-aide { font-size: 0.78rem; color: #5f6b7a; margin: 8px 0 6px; line-height: 1.4; }
.em-lien { background: none; border: 0; color: #1565c0; font-size: 0.75rem; cursor: pointer; padding: 0; text-decoration: underline; }
.em-lot { overflow-x: auto; }
.em-lot-table { border-collapse: collapse; font-size: 0.8rem; min-width: 100%; }
.em-lot-table th { background: #f1f5fb; padding: 5px 6px; text-align: center; white-space: nowrap; }
.em-lot-table td { border: 1px solid #e3e9f1; padding: 4px 6px; text-align: center; white-space: nowrap; }
.em-coin { font-weight: 400; }
.em-tete { background: none; border: 0; font: inherit; font-weight: 700; color: #1c2a3a; cursor: pointer; padding: 2px 4px; border-radius: 4px; }
.em-tete:hover, .em-tete:focus { background: #e3edfa; }
.em-lot-matiere { text-align: left !important; }
.em-case { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
.em-case input { width: 16px; height: 16px; cursor: pointer; }
.case-ok { background: #f1f8e9; color: #1b5e20; font-weight: 700; }
.case-partielle { background: #fff8e1; color: #8a5300; font-weight: 700; }
.case-cochee { box-shadow: inset 0 0 0 2px #1565c0; }
.case-vide { color: #9aa8b8; }
.em-mini { font-weight: 400; font-size: 0.72rem; color: #b26a00; }
.em-resume { display: flex; flex-wrap: wrap; gap: 14px; font-size: 0.88rem; margin-bottom: 8px; }
.em-resume .ok { color: #2e7d32; }
.em-resume .attention { color: #b26a00; }
.em-resume .probleme { color: #c62828; }
.em-table-wrap { overflow-x: auto; max-height: 50vh; border: 1px solid #e3e9f1; border-radius: 8px; }
.em-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.em-table th { position: sticky; top: 0; background: #f1f5fb; text-align: left; padding: 6px; white-space: nowrap; }
.em-table td { border-top: 1px solid #eef1f6; padding: 4px 6px; }
.em-table tr.st-probleme td { background: #fdecea; }
.em-table tr.st-attention td { background: #fff8e1; }
.em-n { color: #8a97a8; width: 28px; }
.em-mat { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.78rem; white-space: nowrap; }
.em-select { border: 1px solid #cfd8e3; border-radius: 6px; padding: 3px 4px; font: inherit; max-width: 230px; background: #fff; }
.em-pied { position: sticky; bottom: 0; background: #fff; padding: 10px 0; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.em-suite { display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; max-width: 760px; }
.em-suite-ligne { color: #2e7d32; display: flex; gap: 6px; align-items: center; }
.em-nom { display: flex; gap: 8px; align-items: flex-start; background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 8px 10px; color: #4a3b00; }
.em-nom-exact { font-family: ui-monospace, Menlo, Consolas, monospace; background: #fff; border: 1px solid #e0c46c; border-radius: 4px; padding: 1px 6px; user-select: all; }
.em-mini-aide { font-size: 0.78rem; margin-top: 4px; color: #6b5a1a; }
</style>
