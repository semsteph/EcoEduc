<template>
  <v-container class="bulletin-container pa-3 pa-sm-3 bg-blue-lighten-5 rounded-lg" fluid>
    <v-row align="center" class="mb-3">
      <v-col cols="12" sm="8">
        <h1 class="text-h6 font-weight-bold text-blue-darken-4 d-flex align-center">
          <v-icon size="small" class="mr-3" color="blue-darken-4">mdi-file-certificate</v-icon>
          Gestion des Bulletins
        </h1>
        <div class="d-flex align-center mt-2">
          <v-chip color="blue-darken-4" variant="flat" size="small" class="mr-2">
            <v-icon start size="14">mdi-school</v-icon>
            Classe : {{ classeNomLocal || 'N/A' }}
          </v-chip>
          <span class="text-body-2 text-blue-darken-2 font-weight-medium">{{ etablissementNom || 'Établissement' }}</span>
        </div>
      </v-col>
      <v-col cols="12" sm="4" class="text-sm-right">
        <v-btn
          v-if="eleves.length > 0"
          color="blue-darken-4"
          prepend-icon="mdi-content-save-all"
          size="default"
          rounded="pill"
          elevation="0"
          :loading="enregistrement"
          @click="sauvegarderTousLesBulletins"
          block
          class="text-none text-white font-weight-bold"
        >
          Enregistrer les bulletins
        </v-btn>
      </v-col>
    </v-row>

    <v-alert v-if="problemes.conduiteManquante.length" type="warning" variant="tonal" density="compact" class="mb-2">
      Note de conduite à attribuer pour : <strong>{{ problemes.conduiteManquante.join(', ') }}</strong>.
      <v-btn size="small" variant="text" color="warning" :to="'/administration/dashbord/classes/conduite'">Attribuer</v-btn>
    </v-alert>
    <v-alert v-if="(problemes.aRelancer || []).length" type="info" variant="tonal" density="compact" class="mb-2">
      <div class="font-weight-bold mb-1">
        {{ problemes.incomplets.length }} bulletin(s) incomplet(s) : des enseignants n'ont pas encore terminé leurs notes.
      </div>
      <div class="text-caption mb-1">Prévenez-les : chacun saisit les notes manquantes (00 pour un absent) puis clique sur « Valider les moyennes » dans son espace.</div>
      <div v-for="(g, i) in relancesParEnseignant" :key="i" class="relance">
        <strong>{{ g.enseignant }}</strong>
        <ul class="relance-liste">
          <li v-for="(l, j) in g.lignes" :key="j">{{ l }}</li>
        </ul>
      </div>
    </v-alert>

    <v-alert v-if="eleves.length === 0" type="info" variant="elevated" rounded="lg" color="blue-darken-3" icon="mdi-account-search" class="mt-3 shadow-sm">
      Aucune donnée disponible pour cette classe ou aucun élève n'est encore inscrit.
    </v-alert>

    <div v-else>
      <v-expansion-panels v-model="activeEleve" class="rounded-lg overflow-hidden border-blue">
        <v-expansion-panel v-for="eleve in eleves" :key="eleve.id" :value="eleve.id" elevation="0" class="eleve-panel mb-2">
          <v-expansion-panel-title class="py-3" color="blue-darken-4">
            <v-row no-gutters align="center">
              <v-col cols="12" class="d-flex align-center justify-space-between">
                <div class="d-flex align-center">
                  <v-avatar color="white" size="32" class="mr-3">
                    <v-icon size="18" color="blue-darken-4">mdi-account-school</v-icon>
                  </v-avatar>
                  <div class="text-white">
                    <div class="text-caption text-blue-lighten-3 font-weight-bold uppercase">Élève</div>
                    <span class="text-body-1 font-weight-black text-uppercase">{{ eleve.nom || 'NOM' }}</span>
                    <span class="text-body-1 ml-1 font-weight-light text-blue-lighten-4">{{ eleve.prenom || 'Prénom' }}</span>
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-expansion-panel-title>

          <v-expansion-panel-text class="bulletin-panel pa-1 pa-sm-2">
            <v-tabs v-model="selectedSemestreParEleve[eleve.id]" color="blue-darken-4" align-tabs="center" density="compact" class="mb-2">
              <v-tab v-for="semestre in semestres" :key="semestre.id" :value="semestre.id" @click="selectSemestre(eleve.id, semestre.id)" class="text-none font-weight-bold">
                {{ semestre.nom }}
              </v-tab>
            </v-tabs>
            <BulletinOfficiel
              v-if="bulletinDe(eleve)"
              v-bind="bulletinDe(eleve)"
            />
            <v-alert v-else type="info" variant="tonal" density="compact">
              Pas encore de bulletin pour cette période (moyennes non validées ou note de conduite manquante).
            </v-alert>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <v-dialog v-model="dialog" max-width="500" persistent>
      <v-card class="rounded-lg overflow-hidden border-blue">
        <v-toolbar height="40" :color="dialogTitle === 'Succès' ? 'blue-darken-4' : 'red-darken-4'" flat>
          <v-toolbar-title class="text-body-1 font-weight-bold text-white uppercase text-subtitle-1">
            <v-icon left size="small" class="mr-2">mdi-information-outline</v-icon>
            {{ dialogTitle }}
          </v-toolbar-title>
        </v-toolbar>
        <v-card-text class="pa-2 pa-sm-3 text-left text-body-2 font-weight-medium" style="white-space: pre-line;">
          {{ message }}
        </v-card-text>
        <v-card-actions class="pa-3 bg-blue-lighten-5">
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-4" variant="elevated" rounded="pill" @click="closeDialog" class="px-2 px-sm-3">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import BulletinOfficiel from '@/components/BulletinOfficiel.vue';
import axios from 'axios';

export default {
  components: { BulletinOfficiel },
  props: {
    classId: { type: Number, required: true },
    classeNom: { type: String, required: true },
    etablissementId: { type: Number, required: true },
    etablissementNom: { type: String, required: true },
    anneeScolaire: { type: String, required: true },
    anneeScolaireId: { type: Number, required: true }
  },
  data() {
    return {
      eleves: [],
      semestres: [],
      matieres: [],
      notes: {},
      classeNomLocal: this.classeNom,
      message: '',
      dialog: false,
      dialogTitle: '',
      selectedSemestreParEleve: {},
      problemes: { conduiteManquante: [], incomplets: [] },
      infosEleves: {},
      stats: {},
      anneeNom: '',
      enregistrement: false,
    };
  },
  computed: {
    matieresIncompletes() {
      return [...new Set(this.problemes.incomplets.flatMap((p) => p.manquantes))];
    },
    // « Mme X : Mathématiques, Semestre 2 — aucune note saisie (35 élèves) ».
    relancesParEnseignant() {
      const groupes = new Map();
      (this.problemes.aRelancer || []).forEach((r) => {
        if (!groupes.has(r.enseignant)) groupes.set(r.enseignant, []);
        groupes.get(r.enseignant).push(`${r.matiere}, ${r.periode} — ${r.etat} (${r.eleves} élève(s))`);
      });
      return [...groupes].map(([enseignant, lignes]) => ({ enseignant, lignes }));
    },
  },
  setup() {
    // Élève déplié et sa période, gardés dans l'adresse (?eleve=&periode=).
    const activeEleve = useUrlState('eleve', null, { type: 'number' });
    const periode = useUrlState('periode', null, { type: 'number' });
    return { activeEleve, periode };
  },
  watch: {
    activeEleve(id) {
      this.periode = id ? this.selectedSemestreParEleve[id] ?? null : null;
    },
  },
  methods: {
    async fetchBulletinData() {
      try {
        const response = await axios.get('/api/bulletin', {
          params: { classeId: this.classId, etablissementId: this.etablissementId, anneeScolaireId: this.anneeScolaireId }
        });
        const { semestres, matieres, notes, classeNom, problemes, eleves: infosEleves, stats, anneeNom } = response.data;
        this.infosEleves = infosEleves || {};
        this.stats = stats || {};
        this.anneeNom = anneeNom || '';
        this.problemes = problemes || { conduiteManquante: [], incomplets: [] };
        this.semestres = semestres || [];
        this.matieres = matieres || [];
        this.notes = notes || {};
        this.classeNomLocal = classeNom || 'Inconnue';

        this.eleves = Object.values(notes).flatMap(s => Object.values(s))
          .reduce((acc, e) => {
            if (!acc.find(item => item.id === e.eleveId)) acc.push({ id: e.eleveId, nom: e.nom, prenom: e.prenom });
            return acc;
          }, []);

        if (this.semestres.length > 0) {
          const firstId = this.semestres[0].id;
          this.eleves.forEach(e => { this.selectedSemestreParEleve[e.id] = firstId; });
          if (this.activeEleve && this.semestres.some(s => s.id === this.periode)) {
            this.selectedSemestreParEleve[this.activeEleve] = this.periode;
          }
        }
      } catch (error) { this.showDialog("Erreur de récupération des données.", "Erreur"); }
    },

    // Données du bulletin officiel d'un élève pour la période choisie.
    bulletinDe(eleve) {
      const sId = this.selectedSemestreParEleve[eleve.id];
      const b = this.notes[sId]?.[eleve.id];
      if (!b || b.moyenne_semestrielle === null || b.moyenne_semestrielle === undefined) return null;
      const info = this.infosEleves[eleve.id] || {};
      const semestre = this.semestres.find((s) => s.id === sId);
      return {
        ecole: { nom: this.etablissementNom || '', annee: this.anneeNom || this.anneeScolaire || '' },
        eleve: {
          nom: eleve.nom, prenom: eleve.prenom, classe: this.classeNomLocal,
          matricule: info.matricule, sexe: info.sexe, dateNaissance: info.date_naissance, photo: info.photo,
        },
        periode: semestre ? semestre.nom : '',
        lignes: (b.moyennes || []).filter((m) => m.matiereId !== 'conduite')
          .map((m) => ({ matiere: this.getMatiereNom(m.matiereId), coef: m.coefficient, moy: m.moy, moycoef: m.moycoef })),
        conduite: b.conduite,
        resultats: {
          moyenne: b.moyenne_semestrielle, rang: b.rang, mention: b.mention,
          moyenneAnnuelle: b.moyenne_annuelle, rangAnnuel: b.rang_annuel, effectifAnnuel: b.effectif_annuel, decision: b.decision,
        },
        stats: this.stats[sId] || null,
      };
    },

    selectSemestre(eleveId, semestreId) {
      this.selectedSemestreParEleve = { ...this.selectedSemestreParEleve, [eleveId]: semestreId };
      if (eleveId === this.activeEleve) this.periode = semestreId;
    },

    getMatiereNom(matiereId) {
      const matiere = this.matieres.find(m => m.id === matiereId);
      return matiere ? matiere.nom : 'Matière Inconnue';
    },

    // Un seul appel : le serveur calcule et enregistre les bulletins de
    // toute la classe, puis dit clairement ce qui manque pour les autres.
    async sauvegarderTousLesBulletins() {
      this.enregistrement = true;
      try {
        const { data } = await axios.post('/api/bulletins/generer', {
          classeId: this.classId,
          anneeScolaireId: this.anneeScolaireId,
        });
        const p = data.problemes || { conduiteManquante: [], incomplets: [], aRelancer: [] };
        this.problemes = p;
        const lignes = [`${data.enregistres} bulletin(s) enregistré(s).`];
        if (p.conduiteManquante.length) lignes.push(`Note de conduite à attribuer pour : ${p.conduiteManquante.join(', ')} (Classes → Conduite).`);
        if ((p.aRelancer || []).length) {
          lignes.push(`${p.incomplets.length} bulletin(s) incomplet(s). Enseignants à prévenir :`);
          this.relancesParEnseignant.forEach((g) => {
            lignes.push(`• ${g.enseignant} :`);
            g.lignes.forEach((l) => lignes.push(`    – ${l}`));
          });
        }
        this.showDialog(lignes.join('\n'), p.conduiteManquante.length || p.incomplets.length ? 'Bulletins enregistrés en partie' : 'Bulletins enregistrés');
        await this.fetchBulletinData();
      } catch (error) {
        this.showDialog(error?.response?.data?.message || "Les bulletins n'ont pas pu être enregistrés.", 'Erreur');
      } finally {
        this.enregistrement = false;
      }
    },

    showDialog(msg, title) { this.message = msg; this.dialogTitle = title; this.dialog = true; },
    closeDialog() { this.dialog = false; this.message = ''; }
  },
  mounted() { this.fetchBulletinData(); }
};
</script>

<style scoped>
.bulletin-panel { background: #eef2f7; }
.relance { margin-top: 4px; font-size: 0.86rem; }
.relance-liste { margin: 0; padding-left: 18px; }
.bulletin-panel :deep(.v-expansion-panel-text__wrapper) { padding: 6px !important; }
.bulletin-container { max-width: 1200px; margin: 0 auto; border: 2px solid #0d47a1; }
.eleve-panel { border-bottom: 2px solid #0d47a1 !important; }
.border-blue-dashed { border: 2px dashed #0d47a1; }
.border-blue { border: 1px solid #0d47a1 !important; }
.uppercase { text-transform: uppercase; }
.notes-table th { font-size: 0.9rem !important; }
.row-hover:hover { background-color: #e3f2fd !important; }
/* Styles pour les textes minuscules */
.text-tiny { font-size: 0.75rem !important; }
</style>