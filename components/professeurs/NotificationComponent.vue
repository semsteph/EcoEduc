<template>
  <!-- Notifications de l'enseignant : permissions d'absence de ses élèves
       (aujourd'hui, à venir, récentes) et réponses de l'administration à ses
       demandes de modification de notes. Un clic ouvre l'écran concerné. -->
  <div class="notifs">
    <div class="notifs-filtres">
      <v-chip
        v-for="f in filtres"
        :key="f.value"
        size="small"
        :color="filtre === f.value ? 'primary' : undefined"
        :variant="filtre === f.value ? 'flat' : 'outlined'"
        @click="filtre = f.value"
      >
        {{ f.title }} ({{ compte(f.value) }})
      </v-chip>
    </div>

    <div v-if="chargement && !items.length" class="text-center pa-6">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="!visibles.length" class="notifs-vide">
      <v-icon size="30" color="grey-lighten-1">mdi-bell-check-outline</v-icon>
      <div>Rien de nouveau.</div>
      <div class="notifs-aide">Vous serez prévenu ici quand un de vos élèves obtient une permission d'absence, ou quand l'administration répond à une demande de modification de note.</div>
    </div>

    <template v-else>
      <template v-for="groupe in groupes" :key="groupe.titre">
        <div v-if="groupe.items.length" class="notifs-groupe">{{ groupe.titre }}</div>
        <button
          v-for="n in groupe.items"
          :key="n.cle"
          type="button"
          class="notif"
          :class="{ 'is-nouveau': !n.lu, [`is-${n.type}`]: true }"
          @click="ouvrir(n)"
        >
          <span class="notif-icone" :class="classeIcone(n)">
            <v-icon size="20">{{ icone(n) }}</v-icon>
          </span>
          <span class="notif-corps">
            <span class="notif-titre">
              {{ titre(n) }}
              <span v-if="n.type === 'permission'" class="notif-quand" :class="`q-${n.quand}`">{{ libelleQuand(n) }}</span>
            </span>
            <span class="notif-texte">{{ texte(n) }}</span>
            <span v-if="n.type === 'demande' && n.commentaire" class="notif-commentaire">« {{ n.commentaire }} »</span>
            <span class="notif-date">{{ depuis(n.date) }}</span>
          </span>
          <v-icon size="18" color="grey" class="notif-chevron">mdi-chevron-right</v-icon>
        </button>
      </template>
    </template>
  </div>
</template>

<script>
const LIBELLES_NOTES = { inter1: 'Inter 1', inter2: 'Inter 2', inter3: 'Inter 3', inter4: 'Inter 4', Dev1: 'Devoir 1', Dev2: 'Devoir 2' };
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

export default {
  name: 'NotificationComponent',
  props: {
    items: { type: Array, default: () => [] },
    chargement: { type: Boolean, default: false },
  },
  emits: ['ouvrir'],
  data() {
    return {
      filtre: 'tout',
      filtres: [
        { title: 'Tout', value: 'tout' },
        { title: 'Absences', value: 'permission' },
        { title: 'Mes demandes', value: 'demande' },
      ],
    };
  },
  computed: {
    visibles() {
      return this.filtre === 'tout' ? this.items : this.items.filter((n) => n.type === this.filtre);
    },
    // Nouveau d'abord ; les absences du jour et à venir avant les passées.
    groupes() {
      const ordre = { aujourdhui: 0, 'a-venir': 1, passee: 2 };
      const tri = (a, b) => (a.type === 'permission' && b.type === 'permission'
        ? (ordre[a.quand] - ordre[b.quand]) || (a.quand === 'passee' ? b.debut.localeCompare(a.debut) : a.debut.localeCompare(b.debut))
        : new Date(b.date) - new Date(a.date));
      return [
        { titre: 'Nouveau', items: this.visibles.filter((n) => !n.lu).sort(tri) },
        { titre: 'Déjà vu', items: this.visibles.filter((n) => n.lu).sort(tri) },
      ];
    },
  },
  methods: {
    compte(f) {
      return f === 'tout' ? this.items.length : this.items.filter((n) => n.type === f).length;
    },
    icone(n) {
      if (n.type === 'permission') return n.sousReserve ? 'mdi-account-clock' : 'mdi-account-arrow-right';
      return n.acceptee ? 'mdi-check-decagram' : 'mdi-close-octagon';
    },
    classeIcone(n) {
      if (n.type === 'permission') return n.sousReserve ? 'ic-reserve' : 'ic-permission';
      return n.acceptee ? 'ic-ok' : 'ic-refus';
    },
    titre(n) {
      if (n.type === 'permission') return `${n.eleve} · ${n.classe}`;
      return n.acceptee ? 'Demande acceptée' : 'Demande refusée';
    },
    texte(n) {
      if (n.type === 'permission') {
        const periode = n.debut === n.fin ? `le ${this.jour(n.debut)}` : `du ${this.jour(n.debut)} au ${this.jour(n.fin)}`;
        return `${n.sousReserve ? 'Absence permise sous réserve de justification' : 'Permission d\'absence accordée'} ${periode}${n.duree ? ` (${n.duree})` : ''}.`;
      }
      const note = LIBELLES_NOTES[n.champ] || n.champ;
      const action = n.suppression ? `suppression de la note ${note}` : `${note} : ${this.nb(n.ancienne)} → ${this.nb(n.nouvelle)}`;
      return `${n.eleve} · ${n.matiere} — ${action}.${n.acceptee ? ' La moyenne est recalculée.' : ''}`;
    },
    libelleQuand(n) {
      if (n.quand === 'aujourdhui') return n.debut === n.fin ? "aujourd'hui" : 'en cours';
      if (n.quand === 'a-venir') return this.estDemain(n.debut) ? 'demain' : 'à venir';
      return 'passée';
    },
    estDemain(iso) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return iso === this.iso(d);
    },
    iso(d) {
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    },
    jour(iso) {
      const d = new Date(`${iso}T12:00:00`);
      return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
    },
    nb(v) {
      return v === null || v === undefined || v === '' ? '—' : String(Number(v)).replace('.', ',');
    },
    depuis(date) {
      if (!date) return '';
      const d = new Date(date);
      const min = Math.round((Date.now() - d.getTime()) / 60000);
      if (min < 1) return "à l'instant";
      if (min < 60) return `il y a ${min} min`;
      if (min < 60 * 24) return `il y a ${Math.round(min / 60)} h`;
      if (min < 60 * 24 * 7) return `il y a ${Math.round(min / 1440)} j`;
      return `le ${d.getDate()} ${MOIS[d.getMonth()]}`;
    },
    ouvrir(n) {
      this.$emit('ouvrir', n);
    },
  },
};
</script>

<style scoped>
.notifs { max-width: 720px; margin: 0 auto; }
.notifs-filtres { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.notifs-vide { text-align: center; color: #6b7a8c; padding: 26px 10px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.notifs-aide { font-size: 0.8rem; max-width: 420px; }
.notifs-groupe { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #5f6b7a; margin: 12px 2px 6px; }
.notif {
  width: 100%; display: flex; align-items: flex-start; gap: 10px; text-align: left; font: inherit; color: inherit;
  background: #fff; border: 1px solid #e3e9f1; border-radius: 12px; padding: 10px 12px; margin-bottom: 6px; cursor: pointer;
}
.notif:hover { border-color: #b8cbe6; }
.notif.is-nouveau { border-left: 4px solid #1976d2; background: #f7faff; }
.notif-icone { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ic-permission { background: #e3f2fd; color: #1565c0; }
.ic-reserve { background: #fff3e0; color: #e65100; }
.ic-ok { background: #e8f5e9; color: #2e7d32; }
.ic-refus { background: #fdecea; color: #c62828; }
.notif-corps { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.notif-titre { font-weight: 700; font-size: 0.9rem; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.notif-texte { font-size: 0.84rem; color: #37474f; }
.notif-commentaire { font-size: 0.8rem; color: #5f6b7a; font-style: italic; }
.notif-date { font-size: 0.74rem; color: #8a96a3; }
.notif-quand { font-size: 0.7rem; font-weight: 700; border-radius: 6px; padding: 1px 6px; }
.q-aujourdhui { background: #1976d2; color: #fff; }
.q-a-venir { background: #e3f2fd; color: #1565c0; }
.q-passee { background: #eceff1; color: #607d8b; }
.notif-chevron { align-self: center; }
</style>
