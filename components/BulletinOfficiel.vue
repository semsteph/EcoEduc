<template>
  <!-- Bulletin de notes au format officiel (écran, impression et PDF A4).
       Utilisé par l'administration et par les parents. -->
  <div class="bo-wrap">
    <div class="bo-actions no-print" v-if="telechargeable">
      <v-btn color="primary" size="small" prepend-icon="mdi-file-pdf-box" :loading="pdfEnCours" @click="telechargerPDF">
        Télécharger le bulletin (PDF)
      </v-btn>
    </div>

    <div ref="feuille" class="bo-feuille">
      <!-- En-tête -->
      <header class="bo-entete">
        <div class="bo-republique">
          <div class="bo-rep-nom">RÉPUBLIQUE DU BÉNIN</div>
          <div class="bo-devise">Fraternité – Justice – Travail</div>
          <div class="bo-drapeau" aria-hidden="true"><span></span><span></span><span></span></div>
        </div>
        <div class="bo-ecole">
          <div class="bo-ecole-nom">{{ ecole.nom }}</div>
          <div class="bo-ecole-annee">Année scolaire {{ ecole.annee }}</div>
        </div>
      </header>

      <h1 class="bo-titre">Bulletin de notes <span>— {{ periodeTitre }}</span></h1>

      <!-- Identité de l'élève -->
      <section class="bo-identite">
        <div class="bo-photo">
          <img v-if="eleve.photo" :src="eleve.photo" :alt="`Photo de ${eleve.prenom}`" crossorigin="anonymous" />
          <span v-else>{{ initiales }}</span>
        </div>
        <div class="bo-identite-grille">
          <div><span>Nom</span><strong>{{ (eleve.nom || '').toUpperCase() }}</strong></div>
          <div><span>Prénom(s)</span><strong>{{ eleve.prenom }}</strong></div>
          <div><span>Né(e) le</span><strong>{{ dateFr(eleve.dateNaissance) }}</strong></div>
          <div><span>Sexe</span><strong>{{ eleve.sexe === 'F' ? 'Féminin' : eleve.sexe === 'M' ? 'Masculin' : '—' }}</strong></div>
          <div><span>Matricule</span><strong>{{ eleve.matricule || '—' }}</strong></div>
          <div><span>Classe</span><strong>{{ eleve.classe }}</strong></div>
          <div v-if="stats && stats.effectif"><span>Effectif</span><strong>{{ stats.effectif }}</strong></div>
        </div>
      </section>

      <!-- Notes -->
      <table class="bo-table">
        <thead>
          <tr>
            <th class="t-left">Matières</th>
            <th>Coef.</th>
            <th>Moy. /20</th>
            <th>Moy. × Coef.</th>
            <th class="t-left">Appréciation</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in lignes" :key="l.matiere">
            <td class="t-left t-matiere">{{ l.matiere }}</td>
            <td>{{ l.coef }}</td>
            <td :class="{ 't-faible': num(l.moy) < 10 }">{{ fmt(l.moy) }}</td>
            <td>{{ fmt(l.moycoef) }}</td>
            <td class="t-left t-appreciation">{{ appreciation(l.moy) }}</td>
          </tr>
          <tr class="t-conduite">
            <td class="t-left t-matiere">Conduite</td>
            <td>1</td>
            <td :class="{ 't-faible': num(conduite) < 10 }">{{ fmt(conduite) }}</td>
            <td>{{ fmt(conduite) }}</td>
            <td class="t-left t-appreciation">{{ appreciation(conduite) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td class="t-left">Total</td>
            <td>{{ totalCoef }}</td>
            <td></td>
            <td>{{ fmt(totalPoints) }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <!-- Résultats -->
      <section class="bo-resultats">
        <div class="bo-res-principal">
          <div class="bo-res-case bo-res-moyenne">
            <span>Moyenne {{ periodeCourte }}</span>
            <strong>{{ fmt(resultats.moyenne) }}<small>/20</small></strong>
          </div>
          <div class="bo-res-case">
            <span>Rang</span>
            <strong>{{ resultats.rang || '—' }}<small v-if="stats && stats.effectif"> / {{ stats.effectif }}</small></strong>
          </div>
          <div class="bo-res-case">
            <span>Mention</span>
            <strong class="bo-mention">{{ resultats.mention || '—' }}</strong>
          </div>
        </div>
        <div v-if="stats && stats.effectif" class="bo-res-classe">
          Classe : plus forte moyenne <strong>{{ fmt(stats.forte) }}</strong> ·
          plus faible <strong>{{ fmt(stats.faible) }}</strong> ·
          moyenne de la classe <strong>{{ fmt(stats.moyenne) }}</strong>
        </div>

        <div v-if="resultats.moyenneAnnuelle !== null && resultats.moyenneAnnuelle !== undefined" class="bo-annuel">
          <div class="bo-annuel-titre">Bilan de l'année</div>
          <div class="bo-res-principal">
            <div class="bo-res-case">
              <span>Moyenne annuelle</span>
              <strong>{{ fmt(resultats.moyenneAnnuelle) }}<small>/20</small></strong>
            </div>
            <div class="bo-res-case" v-if="resultats.rangAnnuel">
              <span>Rang annuel</span>
              <strong>{{ resultats.rangAnnuel }}<small v-if="resultats.effectifAnnuel"> / {{ resultats.effectifAnnuel }}</small></strong>
            </div>
            <div class="bo-res-case bo-decision" :class="decisionClasse">
              <span>Décision du conseil</span>
              <strong>{{ decisionTexte }}</strong>
            </div>
          </div>
        </div>
      </section>

      <!-- Signatures -->
      <section class="bo-signatures">
        <div><span>Le Professeur principal</span></div>
        <div><span>Le Directeur</span></div>
        <div><span>Visa du parent</span></div>
      </section>

      <footer class="bo-pied">
        Bulletin établi le {{ dateFr(aujourdhui) }} · {{ ecole.nom }}
      </footer>
    </div>
  </div>
</template>

<script>
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default {
  name: 'BulletinOfficiel',
  props: {
    ecole: { type: Object, required: true }, // { nom, annee }
    eleve: { type: Object, required: true }, // { nom, prenom, matricule, sexe, dateNaissance, photo, classe }
    periode: { type: String, default: '' }, // « Semestre 1 », « Trimestre 2 »…
    lignes: { type: Array, default: () => [] }, // [{ matiere, coef, moy, moycoef }]
    conduite: { type: [Number, String], default: null },
    resultats: { type: Object, default: () => ({}) }, // { moyenne, rang, mention, moyenneAnnuelle, rangAnnuel, effectifAnnuel, decision }
    stats: { type: Object, default: null }, // { effectif, forte, faible, moyenne }
    telechargeable: { type: Boolean, default: true },
  },
  data() {
    return { pdfEnCours: false, aujourdhui: new Date().toISOString().slice(0, 10) };
  },
  computed: {
    initiales() {
      return `${(this.eleve.prenom || '').charAt(0)}${(this.eleve.nom || '').charAt(0)}`.toUpperCase();
    },
    // « Semestre 1 » → « 1er semestre »
    periodeTitre() {
      const m = String(this.periode || '').match(/^(\D+?)\s*(\d+)$/);
      if (!m) return this.periode;
      const n = Number(m[2]);
      return `${n === 1 ? '1er' : `${n}e`} ${m[1].trim().toLowerCase()}`;
    },
    periodeCourte() {
      return /trimestre/i.test(this.periode) ? 'trimestrielle' : 'semestrielle';
    },
    totalCoef() {
      return this.lignes.reduce((t, l) => t + (Number(l.coef) || 0), 0) + (this.conduite !== null && this.conduite !== '' ? 1 : 0);
    },
    totalPoints() {
      const notes = this.lignes.reduce((t, l) => t + (Number(l.moycoef) || 0), 0);
      return notes + (Number(this.conduite) || 0);
    },
    decisionTexte() {
      const d = String(this.resultats.decision || '');
      if (/admis/i.test(d)) return /^(3|tle)/i.test(this.eleve.classe || '') ? 'Admis(e)' : 'Admis(e) en classe supérieure';
      if (/redouble|refus/i.test(d)) return 'Redouble';
      return d || '—';
    },
    decisionClasse() {
      return /admis/i.test(this.resultats.decision || '') ? 'is-admis' : /redouble|refus/i.test(this.resultats.decision || '') ? 'is-redouble' : '';
    },
  },
  methods: {
    num(v) {
      const n = Number(v);
      return v === null || v === undefined || v === '' || Number.isNaN(n) ? NaN : n;
    },
    fmt(v) {
      const n = this.num(v);
      return Number.isNaN(n) ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    appreciation(v) {
      const n = this.num(v);
      if (Number.isNaN(n)) return '';
      if (n >= 18) return 'Excellent';
      if (n >= 16) return 'Très bien';
      if (n >= 14) return 'Bien';
      if (n >= 12) return 'Assez bien';
      if (n >= 10) return 'Passable';
      if (n >= 8) return 'Insuffisant';
      return 'Faible';
    },
    dateFr(d) {
      if (!d) return '—';
      const date = new Date(String(d).length === 10 ? `${d}T12:00:00` : d);
      return Number.isNaN(date.getTime()) ? String(d) : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    },
    // PDF A4 identique à l'écran (capture de la feuille à largeur fixe).
    async telechargerPDF() {
      this.pdfEnCours = true;
      const feuille = this.$refs.feuille;
      feuille.classList.add('bo-capture');
      try {
        const canvas = await html2canvas(feuille, { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 820 });
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const largeur = 210;
        const hauteur = (canvas.height * largeur) / canvas.width;
        const image = canvas.toDataURL('image/jpeg', 0.92);
        if (hauteur <= 297) {
          pdf.addImage(image, 'JPEG', 0, 0, largeur, hauteur);
        } else {
          // Rare : bulletin plus long qu'une page → réduit pour tenir sur une page.
          const ratio = 297 / hauteur;
          pdf.addImage(image, 'JPEG', (210 - largeur * ratio) / 2, 0, largeur * ratio, 297);
        }
        const nom = `${this.eleve.nom || 'eleve'}_${this.eleve.prenom || ''}_${this.periode}`.replace(/\s+/g, '_');
        pdf.save(`Bulletin_${nom}.pdf`);
      } finally {
        feuille.classList.remove('bo-capture');
        this.pdfEnCours = false;
      }
    },
  },
};
</script>

<style scoped>
.bo-wrap { width: 100%; }
.bo-actions { display: flex; justify-content: flex-end; margin-bottom: 8px; }

.bo-feuille {
  line-height: 1.4;
  background: #fff;
  color: #1a2433;
  max-width: 794px;
  margin: 0 auto;
  padding: 22px 26px 16px;
  border: 1px solid #c8d1dd;
  box-shadow: 0 2px 10px rgba(16, 40, 80, 0.08);
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 12.5px;
  position: relative;
}
/* Capture PDF : largeur fixe d'une page A4, pas d'ombre ; hauteurs de
   ligne explicites (sinon html2canvas décale le texte vers le bas et le
   rogne dans les cases). */
.bo-feuille.bo-capture { width: 794px; max-width: none; box-shadow: none; border-color: #fff; line-height: 1.4; }
.bo-feuille.bo-capture * { line-height: 1.4 !important; }
.bo-feuille.bo-capture .bo-identite-grille strong { overflow: visible; }
.bo-feuille.bo-capture .bo-table td, .bo-feuille.bo-capture .bo-table th { padding-top: 3px; padding-bottom: 7px; }

.bo-entete { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; border-bottom: 3px double #0d2e5c; padding-bottom: 10px; }
.bo-republique { text-align: center; min-width: 150px; }
.bo-rep-nom { font-weight: 800; letter-spacing: 0.06em; font-size: 12px; color: #0d2e5c; }
.bo-devise { font-style: italic; font-size: 10.5px; color: #44536a; }
.bo-drapeau { display: inline-flex; width: 46px; height: 6px; margin-top: 4px; border-radius: 1px; overflow: hidden; }
.bo-drapeau span { flex: 1; }
.bo-drapeau span:nth-child(1) { background: #008751; }
.bo-drapeau span:nth-child(2) { background: #fcd116; }
.bo-drapeau span:nth-child(3) { background: #e8112d; }
.bo-ecole { text-align: right; }
.bo-ecole-nom { font-family: Georgia, 'Times New Roman', serif; font-weight: 700; font-size: 16px; color: #0d2e5c; text-transform: uppercase; }
.bo-ecole-annee { font-size: 11.5px; color: #44536a; margin-top: 2px; }

.bo-titre {
  font-family: Georgia, 'Times New Roman', serif;
  text-align: center; text-transform: uppercase; letter-spacing: 0.08em;
  font-size: 17px; color: #0d2e5c; margin: 12px 0 10px;
  padding: 6px 0; background: #eef3fa; border: 1px solid #c9d6e8; border-radius: 4px;
}
.bo-titre span { text-transform: none; letter-spacing: 0; font-size: 15px; }

.bo-identite { display: flex; gap: 14px; align-items: stretch; border: 1px solid #c9d6e8; border-radius: 6px; padding: 10px; margin-bottom: 12px; }
.bo-photo { flex: none; width: 78px; height: 104px; border: 1px solid #9fb0c6; border-radius: 3px; overflow: hidden; background: #e8eef6;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 24px; color: #0d2e5c; }
.bo-photo img { width: 100%; height: 100%; object-fit: cover; }
.bo-identite-grille { flex: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; align-content: center; }
.bo-identite-grille div { display: flex; gap: 6px; border-bottom: 1px dotted #cfd8e4; padding: 2px 0; min-width: 0; }
.bo-identite-grille span { color: #5a6a80; min-width: 70px; }
.bo-identite-grille strong { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.bo-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
.bo-table th { background: #0d2e5c; color: #fff; font-weight: 700; padding: 6px 6px; font-size: 11.5px; border: 1px solid #0d2e5c; }
.bo-table td { border: 1px solid #c9d6e8; padding: 5px 6px; text-align: center; }
.bo-table tbody tr:nth-child(even) td { background: #f6f9fd; }
.bo-table .t-left { text-align: left; }
.bo-table .t-matiere { font-weight: 600; }
.bo-table .t-appreciation { font-style: italic; color: #44536a; }
.bo-table .t-faible { color: #c62828; font-weight: 700; }
.bo-table .t-conduite td { background: #fbfaf4 !important; }
.bo-table tfoot td { font-weight: 800; background: #e3ebf6; border-color: #b9c8dd; }

.bo-resultats { border: 1.5px solid #0d2e5c; border-radius: 6px; padding: 10px; margin-bottom: 14px; }
.bo-res-principal { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.bo-res-case { background: #f3f7fc; border-radius: 4px; padding: 6px 8px; text-align: center; }
.bo-res-case span { display: block; font-size: 10.5px; color: #5a6a80; text-transform: uppercase; letter-spacing: 0.04em; }
.bo-res-case strong { font-size: 17px; color: #0d2e5c; }
.bo-res-case small { font-size: 11px; color: #5a6a80; font-weight: 600; }
.bo-res-moyenne { background: #0d2e5c; }
.bo-res-moyenne span, .bo-res-moyenne strong, .bo-res-moyenne small { color: #fff; }
.bo-mention { font-size: 14px !important; }
.bo-res-classe { margin-top: 8px; font-size: 11.5px; color: #44536a; text-align: center; }
.bo-annuel { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #9fb0c6; }
.bo-annuel-titre { font-weight: 800; color: #0d2e5c; text-transform: uppercase; font-size: 11px; letter-spacing: 0.06em; margin-bottom: 6px; }
.bo-decision.is-admis { background: #e8f5e9; }
.bo-decision.is-admis strong { color: #1b5e20; font-size: 13px; }
.bo-decision.is-redouble { background: #fdecea; }
.bo-decision.is-redouble strong { color: #b71c1c; font-size: 13px; }

.bo-signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 4px; }
.bo-signatures div { border-top: 1px solid #9fb0c6; padding-top: 4px; height: 62px; text-align: center; }
.bo-signatures span { font-size: 11px; color: #44536a; font-weight: 600; }
.bo-pied { text-align: center; font-size: 10px; color: #8190a5; margin-top: 8px; }

@media (max-width: 600px) {
  .bo-feuille { padding: 12px 10px; font-size: 11.5px; }
  .bo-feuille:not(.bo-capture) .bo-entete { flex-direction: column; align-items: center; text-align: center; }
  .bo-feuille:not(.bo-capture) .bo-ecole { text-align: center; }
  .bo-feuille:not(.bo-capture) .bo-identite-grille { grid-template-columns: 1fr; }
  .bo-feuille:not(.bo-capture) .bo-photo { width: 64px; height: 86px; }
  .bo-feuille:not(.bo-capture) .bo-table th, .bo-feuille:not(.bo-capture) .bo-table td { padding: 4px 3px; font-size: 10.5px; }
  .bo-feuille:not(.bo-capture) .bo-res-case strong { font-size: 14px; }
  .bo-feuille:not(.bo-capture) .bo-res-case { padding: 5px 4px; }
  .bo-feuille:not(.bo-capture) .bo-res-case span { font-size: 8.5px; letter-spacing: 0; overflow-wrap: anywhere; }
}
@media print {
  .no-print { display: none !important; }
  .bo-feuille { box-shadow: none; border: 0; max-width: none; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
