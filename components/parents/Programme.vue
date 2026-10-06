<template>
  <!-- Emploi du temps de l'enfant (côté parent) : la semaine en grille sur
       ordinateur et tablette, une journée à la fois sur téléphone (le jour
       même ouvert d'office), et en tête ce qui compte le plus pour un
       parent : les cours d'aujourd'hui ou de la prochaine journée. -->
  <div class="edt-parent">
    <div class="edt-entete">
      <div>
        <h2 class="edt-titre">Emploi du temps{{ prenom ? ` de ${prenom}` : '' }}</h2>
        <div class="edt-sous">
          <span v-if="classe">{{ classe }}</span>
          <span v-if="creneaux.length"> · {{ creneaux.length }} cours par semaine · {{ heuresParSemaine }}</span>
        </div>
      </div>
    </div>

    <div v-if="loading" class="edt-etat"><v-progress-circular indeterminate color="primary" /></div>
    <v-alert v-else-if="error" type="error" variant="tonal" class="ma-2">{{ error }}</v-alert>

    <div v-else-if="!creneaux.length" class="edt-etat">
      <v-icon size="40" color="grey-lighten-1">mdi-calendar-blank-outline</v-icon>
      <div class="font-weight-bold">L’emploi du temps n’est pas encore publié</div>
      <div class="edt-aide">Il apparaîtra ici dès que l’établissement l’aura saisi.</div>
    </div>

    <template v-else>
      <!-- Aujourd'hui / prochaine journée de cours -->
      <div class="edt-focus" :class="{ 'is-aujourdhui': focus.estAujourdhui }">
        <div class="edt-focus-titre">
          <v-icon size="18">{{ focus.estAujourdhui ? 'mdi-calendar-today' : 'mdi-calendar-arrow-right' }}</v-icon>
          {{ focus.titre }}
        </div>
        <div class="edt-focus-cours">
          <div v-for="(c, i) in focus.cours" :key="i" class="edt-focus-item" :style="couleur(c.matiere)">
            <span class="edt-focus-heure">{{ heureCourte(c.debut) }}</span>
            <span class="edt-focus-matiere">{{ c.matiere }}</span>
            <span v-if="c.enCours" class="edt-badge">en cours</span>
          </div>
        </div>
      </div>

      <!-- Téléphone : un jour à la fois -->
      <div class="edt-mobile">
        <div class="edt-jours-onglets" role="tablist">
          <button
            v-for="j in joursAffiches"
            :key="j"
            type="button"
            role="tab"
            class="edt-onglet"
            :class="{ 'is-actif': j === jourChoisi, 'is-aujourdhui': j === aujourdhui }"
            :aria-selected="j === jourChoisi"
            @click="jourChoisi = j"
          >
            <span>{{ j.slice(0, 3) }}</span>
            <small>{{ coursDu(j).length || '–' }}</small>
          </button>
        </div>
        <div class="edt-jour-titre">{{ jourChoisi }}{{ jourChoisi === aujourdhui ? ' (aujourd’hui)' : '' }}</div>
        <div v-if="!coursDu(jourChoisi).length" class="edt-vide-jour">Pas de cours ce jour-là.</div>
        <div v-for="(c, i) in coursDu(jourChoisi)" :key="i" class="edt-ligne" :style="couleur(c.matiere)">
          <div class="edt-ligne-heure">
            <strong>{{ heureCourte(c.debut) }}</strong>
            <span>{{ heureCourte(c.fin) }}</span>
          </div>
          <div class="edt-ligne-corps">
            <div class="edt-ligne-matiere">{{ c.matiere }}</div>
            <div v-if="c.enseignant" class="edt-ligne-prof">{{ c.enseignant }}</div>
          </div>
        </div>
      </div>

      <!-- Ordinateur, tablette : la semaine -->
      <div class="edt-grille-zone">
        <div class="edt-grille" :style="{ gridTemplateColumns: `72px repeat(${joursAffiches.length}, 1fr)` }">
          <div class="edt-coin"></div>
          <div v-for="j in joursAffiches" :key="`t-${j}`" class="edt-col-titre" :class="{ 'is-aujourdhui': j === aujourdhui }">
            {{ j }}<span v-if="j === aujourdhui" class="edt-badge">aujourd’hui</span>
          </div>
          <template v-for="h in plages" :key="h.cle">
            <div class="edt-heure">{{ heureCourte(h.debut) }}<br /><span>{{ heureCourte(h.fin) }}</span></div>
            <div v-for="j in joursAffiches" :key="`${h.cle}-${j}`" class="edt-case" :class="{ 'is-aujourdhui': j === aujourdhui }">
              <div v-for="(c, i) in coursA(j, h)" :key="i" class="edt-cours" :style="couleur(c.matiere)">
                <div class="edt-cours-matiere">{{ c.matiere }}</div>
                <div v-if="c.enseignant" class="edt-cours-prof">{{ c.enseignant }}</div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const NOMS_JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const minutes = (t) => { const m = String(t || '').trim().match(/^(\d{1,2})\s*(?:h|:)\s*(\d{0,2})/i); return m ? Number(m[1]) * 60 + Number(m[2] || 0) : null; };
const plage = (h) => { const [a, b] = String(h || '').split(/\s*[-–à]\s*/); const d = minutes(a); const f = minutes(b); return { debut: d, fin: f ?? (d === null ? null : d + 60) }; };
const jourNormal = (j) => JOURS.find((x) => x.toLowerCase() === String(j || '').trim().toLowerCase()) || String(j || '').trim();

export default {
  name: 'ProgrammeEleve',
  props: {
    childId: { type: Number, required: true },
    child: { type: Object, default: null },
  },
  emits: ['back'],
  data() {
    return { creneaux: [], classe: '', loading: false, error: null, jourChoisi: 'Lundi', maintenant: new Date() };
  },
  computed: {
    prenom() {
      return this.child?.prenom || '';
    },
    aujourdhui() {
      return NOMS_JOURS[this.maintenant.getDay()];
    },
    // Lundi → vendredi toujours ; samedi seulement s'il y a cours.
    joursAffiches() {
      const avecCours = new Set(this.creneaux.map((c) => c.jour));
      return JOURS.filter((j, i) => i < 5 || avecCours.has(j));
    },
    matieresTriees() {
      return [...new Set(this.creneaux.map((c) => c.matiere))].sort((x, y) => x.localeCompare(y, 'fr'));
    },
    plages() {
      const vues = new Map();
      this.creneaux.forEach((c) => { const cle = `${c.debut}-${c.fin}`; if (!vues.has(cle)) vues.set(cle, { cle, debut: c.debut, fin: c.fin }); });
      return [...vues.values()].sort((a, b) => (a.debut ?? 9999) - (b.debut ?? 9999));
    },
    heuresParSemaine() {
      const total = this.creneaux.reduce((t, c) => t + (c.debut !== null && c.fin !== null ? c.fin - c.debut : 0), 0) / 60;
      return `${String(Math.round(total * 10) / 10).replace('.', ',')} h`;
    },
    // Aujourd'hui s'il reste des cours, sinon la prochaine journée de cours.
    focus() {
      const idx = this.maintenant.getDay();
      const min = this.maintenant.getHours() * 60 + this.maintenant.getMinutes();
      const aujourdhuiCours = this.coursDu(this.aujourdhui);
      const restants = aujourdhuiCours.filter((c) => (c.fin ?? 0) > min);
      if (restants.length) {
        return {
          estAujourdhui: true,
          titre: `Aujourd’hui (${this.aujourdhui.toLowerCase()})`,
          cours: restants.map((c) => ({ ...c, enCours: c.debut <= min && min < c.fin })),
        };
      }
      for (let k = 1; k <= 7; k += 1) {
        const j = NOMS_JOURS[(idx + k) % 7];
        const cours = this.coursDu(j);
        if (cours.length) return { estAujourdhui: false, titre: k === 1 ? `Demain (${j.toLowerCase()})` : `Prochains cours : ${j.toLowerCase()}`, cours };
      }
      return { estAujourdhui: false, titre: 'Aucun cours prévu', cours: [] };
    },
  },
  mounted() {
    this.recupererProgramme();
    // Jour affiché sur téléphone : aujourd'hui (ou lundi le week-end).
    this.jourChoisi = JOURS.includes(this.aujourdhui) ? this.aujourdhui : 'Lundi';
    this.minuteur = setInterval(() => { this.maintenant = new Date(); }, 60000);
  },
  beforeUnmount() {
    clearInterval(this.minuteur);
  },
  methods: {
    async recupererProgramme() {
      this.loading = true;
      this.error = null;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/programme/${this.childId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Erreur API (${res.status})`);
        const data = await res.json();
        this.classe = data?.classe || '';
        this.creneaux = (Array.isArray(data?.creneaux) ? data.creneaux : [])
          .map((c) => ({ ...c, jour: jourNormal(c.jour), ...plage(c.horaire) }))
          .sort((a, b) => (JOURS.indexOf(a.jour) - JOURS.indexOf(b.jour)) || ((a.debut ?? 0) - (b.debut ?? 0)));
      } catch (e) {
        console.error('Erreur lors de la récupération du programme:', e);
        this.error = "L'emploi du temps n'a pas pu être chargé. Réessayez dans un instant.";
      } finally {
        this.loading = false;
      }
    },
    coursDu(jour) {
      return this.creneaux.filter((c) => c.jour === jour);
    },
    coursA(jour, h) {
      return this.creneaux.filter((c) => c.jour === jour && c.debut === h.debut && c.fin === h.fin);
    },
    heureCourte(m) {
      if (m === null || m === undefined) return '';
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return mm ? `${h}h${String(mm).padStart(2, '0')}` : `${h}h`;
    },
    // Une couleur bien distincte par matière (dans l'ordre alphabétique).
    couleur(matiere) {
      const TEINTES = [210, 140, 28, 275, 0, 180, 50, 320, 95, 245, 15, 160];
      const i = this.matieresTriees.indexOf(matiere);
      return { '--teinte': TEINTES[(i < 0 ? 0 : i) % TEINTES.length] };
    },
  },
};
</script>

<style scoped>
.edt-parent { max-width: 1100px; margin: 0 auto; padding: 4px 4px 24px; }
.edt-entete { margin-bottom: 10px; }
.edt-titre { font-size: 1.2rem; font-weight: 800; color: #1c2a3a; margin: 0; }
.edt-sous { font-size: 0.85rem; color: #5f6b7a; }
.edt-etat { text-align: center; padding: 36px 12px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.edt-aide { font-size: 0.85rem; color: #5f6b7a; }

/* À retenir aujourd'hui */
.edt-focus { background: #fff; border: 1px solid #e3e9f1; border-radius: 14px; padding: 10px 12px; margin-bottom: 12px; }
.edt-focus.is-aujourdhui { border-color: #90caf9; background: #f5faff; }
.edt-focus-titre { display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 0.9rem; color: #0d47a1; margin-bottom: 8px; }
.edt-focus-cours { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
.edt-focus-item { flex: 0 0 auto; display: flex; flex-direction: column; min-width: 110px; padding: 6px 10px; border-radius: 10px; background: hsl(var(--teinte), 70%, 94%); border-left: 4px solid hsl(var(--teinte), 55%, 42%); }
.edt-focus-heure { font-size: 0.75rem; font-weight: 700; color: #455a64; }
.edt-focus-matiere { font-weight: 700; font-size: 0.86rem; color: #1c2a3a; }
.edt-badge { display: inline-block; margin-left: 6px; font-size: 0.66rem; font-weight: 800; color: #fff; background: #1976d2; border-radius: 6px; padding: 0 5px; vertical-align: middle; }

/* Téléphone */
.edt-mobile { display: none; }
.edt-jours-onglets { display: flex; gap: 6px; margin-bottom: 8px; }
.edt-onglet { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 6px 0; border-radius: 10px; border: 1px solid #d6e0ec; background: #fff; color: #37474f; font: inherit; font-weight: 700; cursor: pointer; }
.edt-onglet small { font-weight: 600; font-size: 0.7rem; color: #78909c; }
.edt-onglet.is-aujourdhui { border-color: #1976d2; }
.edt-onglet.is-actif { background: #1976d2; color: #fff; border-color: #1976d2; }
.edt-onglet.is-actif small { color: #e3f2fd; }
.edt-jour-titre { font-weight: 800; font-size: 0.95rem; margin: 4px 2px 8px; color: #1c2a3a; }
.edt-vide-jour { text-align: center; color: #78909c; padding: 18px; background: #fff; border-radius: 12px; border: 1px dashed #cfd8dc; }
.edt-ligne { display: flex; gap: 12px; align-items: stretch; background: #fff; border-radius: 12px; border: 1px solid #e3e9f1; margin-bottom: 8px; overflow: hidden; }
.edt-ligne-heure { min-width: 64px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: hsl(var(--teinte), 70%, 94%); border-right: 4px solid hsl(var(--teinte), 55%, 42%); padding: 8px 4px; font-size: 0.85rem; color: #37474f; }
.edt-ligne-heure span { font-size: 0.75rem; color: #78909c; }
.edt-ligne-corps { padding: 9px 4px; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
.edt-ligne-matiere { font-weight: 800; font-size: 0.95rem; color: #1c2a3a; }
.edt-ligne-prof { font-size: 0.8rem; color: #607d8b; }

/* Ordinateur, tablette */
.edt-grille-zone { background: #fff; border: 1px solid #e3e9f1; border-radius: 14px; overflow: hidden; }
.edt-grille { display: grid; }
.edt-coin, .edt-col-titre { background: #f4f7fb; padding: 10px 6px; font-weight: 800; font-size: 0.85rem; text-align: center; color: #37474f; border-bottom: 1px solid #e3e9f1; }
.edt-col-titre.is-aujourdhui { background: #e3f2fd; color: #0d47a1; }
.edt-heure { padding: 8px 4px; font-size: 0.8rem; font-weight: 700; color: #455a64; text-align: center; border-top: 1px solid #eef2f6; }
.edt-heure span { font-weight: 500; color: #90a4ae; }
.edt-case { border-top: 1px solid #eef2f6; border-left: 1px solid #eef2f6; padding: 4px; min-height: 58px; }
.edt-case.is-aujourdhui { background: #f7fbff; }
.edt-cours { height: 100%; border-radius: 8px; padding: 6px 8px; background: hsl(var(--teinte), 70%, 93%); border-left: 4px solid hsl(var(--teinte), 55%, 42%); }
.edt-cours-matiere { font-weight: 800; font-size: 0.85rem; color: #1c2a3a; line-height: 1.2; }
.edt-cours-prof { font-size: 0.74rem; color: #607d8b; margin-top: 2px; }

@media (max-width: 760px) {
  .edt-mobile { display: block; }
  .edt-grille-zone { display: none; }
}
</style>
