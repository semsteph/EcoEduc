<template>
  <!-- Centre de notifications du parent : tout ce qui concerne ses enfants
       (absences, notes, devoirs, permissions, punitions, bulletins, emploi
       du temps), avec la vraie date, des filtres, et une action directe. -->
  <div class="notifs-page">
    <div class="notifs-tete">
      <div>
        <h2 class="notifs-titre">Notifications</h2>
        <div class="notifs-sous">
          <template v-if="nouvelles.size">{{ nouvelles.size }} nouvelle(s)</template>
          <template v-else>Tout est lu</template>
        </div>
      </div>
      <v-btn variant="text" size="small" prepend-icon="mdi-refresh" :loading="chargement" @click="charger">Actualiser</v-btn>
    </div>

    <!-- Alertes sur le téléphone et par SMS -->
    <div class="alertes-carte">
      <div class="alertes-ligne">
        <v-icon color="primary">mdi-cellphone-message</v-icon>
        <div class="alertes-texte">
          <strong>Notifications sur ce téléphone</strong>
          <span v-if="push === 'actif'">Activées : vous êtes prévenu même quand l’application est fermée.</span>
          <span v-else-if="push === 'refuse'">Bloquées par le navigateur : autorisez les notifications pour ce site dans ses réglages.</span>
          <span v-else-if="push === 'iphone-a-installer'">Sur iPhone : touchez <strong>Partager</strong> puis <strong>« Sur l’écran d’accueil »</strong>, ouvrez l’application depuis l’icône, puis revenez ici.</span>
          <span v-else-if="push === 'non-supporte'">Ce navigateur ne permet pas les notifications. Essayez Chrome.</span>
          <span v-else>Soyez prévenu d’une absence ou d’un bulletin même quand l’application est fermée.</span>
        </div>
        <v-btn v-if="push === 'inactif'" color="primary" variant="flat" size="small" :loading="pushEnCours" @click="activerPush">Activer</v-btn>
        <template v-else-if="push === 'actif'">
          <v-btn variant="text" size="small" :loading="pushEnCours" @click="essaiPush">Tester</v-btn>
          <v-btn variant="text" size="small" color="grey-darken-1" @click="desactiverPush">Désactiver</v-btn>
        </template>
      </div>
      <div v-if="prefs && prefs.smsActifEcole" class="alertes-ligne">
        <v-icon color="primary">mdi-message-text-outline</v-icon>
        <div class="alertes-texte">
          <strong>SMS de l’école</strong>
          <span v-if="!prefs.numeroValide">Votre numéro ({{ prefs.telephone || 'non renseigné' }}) n’est pas valide : demandez à l’école de le corriger.</span>
          <span v-else>Absences, réponses aux permissions et bulletins par SMS au {{ prefs.telephone }}.</span>
        </div>
        <v-switch v-model="prefs.sms" hide-details density="compact" color="primary" inset :disabled="!prefs.numeroValide" @update:model-value="changerSms" />
      </div>
    </div>

    <div v-if="items.length" class="notifs-filtres">
      <v-chip v-for="f in filtresVisibles" :key="f.value" size="small" :color="filtre === f.value ? 'primary' : undefined" :variant="filtre === f.value ? 'flat' : 'outlined'" @click="filtre = f.value">
        {{ f.title }}<span v-if="f.value !== 'tout'">&nbsp;({{ compte(f.value) }})</span>
      </v-chip>
      <template v-if="enfants.length > 1">
        <v-chip v-for="e in enfants" :key="e.id" size="small" :color="enfant === e.id ? 'teal' : undefined" :variant="enfant === e.id ? 'flat' : 'outlined'" @click="enfant = enfant === e.id ? null : e.id">{{ e.prenom }}</v-chip>
      </template>
    </div>

    <div v-if="chargement && !items.length" class="notifs-etat"><v-progress-circular indeterminate color="primary" /></div>
    <div v-else-if="!visibles.length" class="notifs-etat">
      <v-icon size="40" color="grey-lighten-1">mdi-bell-check-outline</v-icon>
      <div class="font-weight-bold">Aucune notification</div>
      <div class="notifs-aide">Vous serez prévenu ici des absences, notes, devoirs, punitions, bulletins et réponses à vos demandes de permission.</div>
    </div>

    <template v-else>
      <template v-for="g in groupes" :key="g.titre">
        <div class="notifs-jour">{{ g.titre }}</div>
        <div v-for="n in g.items" :key="n.id" class="notif" :class="[`t-${n.type}`, { 'is-nouveau': nouvelles.has(n.id) }]">
          <div class="notif-icone"><v-icon size="20">{{ icone(n.type) }}</v-icon></div>
          <div class="notif-corps">
            <div class="notif-titre">
              {{ n.titre }}
              <span v-if="nouvelles.has(n.id)" class="notif-nouveau">nouveau</span>
            </div>
            <div class="notif-texte">{{ n.texte }}</div>
            <div class="notif-pied">
              <span>{{ heure(n.date) }}</span>
              <span v-if="n.enfant && enfants.length > 1"> · {{ n.enfant }}</span>
            </div>
            <div class="notif-actions">
              <template v-if="n.type === 'absence'">
                <span v-if="n.motif" class="notif-motif"><v-icon size="14">mdi-check-circle</v-icon> Motif envoyé : {{ n.motif }}</span>
                <v-btn v-else size="small" variant="tonal" color="error" prepend-icon="mdi-comment-text-outline" @click="ouvrirMotif(n)">Justifier l’absence</v-btn>
              </template>
              <v-btn v-else-if="n.lien" size="small" variant="text" color="primary" append-icon="mdi-chevron-right" @click="ouvrir(n)">{{ libelleLien(n.type) }}</v-btn>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Justification d'une absence -->
    <v-dialog v-model="motif.ouvert" max-width="460">
      <v-card v-if="motif.notif">
        <v-card-title class="text-wrap">Justifier l’absence</v-card-title>
        <v-card-text>
          <p class="mb-2">{{ motif.notif.texte.split('. Si')[0] }}.</p>
          <v-textarea v-model="motif.texte" label="Raison de l’absence (maladie, rendez-vous médical…)" rows="3" auto-grow variant="outlined" maxlength="255" counter />
          <v-alert v-if="motif.erreur" type="error" variant="tonal" density="compact">{{ motif.erreur }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="motif.envoi" @click="motif.ouvert = false">Annuler</v-btn>
          <v-btn color="primary" variant="flat" :loading="motif.envoi" :disabled="!motif.texte.trim()" @click="envoyerMotif">Envoyer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.ouvert" :color="snack.couleur" timeout="3500" location="top">{{ snack.texte }}</v-snackbar>
  </div>
</template>

<script>
import axios from 'axios';
import { useNotificationsTelephone } from '@/composables/useNotificationsTelephone';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const FILTRES = [
  { title: 'Tout', value: 'tout' },
  { title: 'Absences', value: 'absence' },
  { title: 'Notes', value: 'note' },
  { title: 'Devoirs', value: 'devoir' },
  { title: 'Permissions', value: 'permission' },
  { title: 'Conduite', value: 'punition' },
  { title: 'Bulletins', value: 'bulletin' },
  { title: 'Emploi du temps', value: 'programme' },
];

export default {
  name: 'NotificationsComponent',
  props: {
    etablissementId: Number,
    anneeScolaireId: Number,
  },
  emits: ['notificationsOpened', 'showComponent'],
  setup() {
    return { telephone: useNotificationsTelephone() };
  },
  data() {
    return {
      items: [], chargement: false, filtre: 'tout', enfant: null, nouvelles: new Set(),
      push: 'inactif', pushEnCours: false, prefs: null,
      motif: { ouvert: false, notif: null, texte: '', envoi: false, erreur: '' },
      snack: { ouvert: false, texte: '', couleur: 'success' },
    };
  },
  computed: {
    enfants() {
      const vus = new Map();
      this.items.forEach((n) => { if (n.eleveId && n.enfant) vus.set(n.eleveId, { id: n.eleveId, prenom: n.enfant }); });
      return [...vus.values()];
    },
    filtresVisibles() {
      return FILTRES.filter((f) => f.value === 'tout' || this.compte(f.value) > 0);
    },
    visibles() {
      return this.items.filter((n) => (this.filtre === 'tout' || n.type === this.filtre) && (!this.enfant || n.eleveId === this.enfant));
    },
    groupes() {
      const out = [];
      for (const n of this.visibles) {
        const titre = this.jour(n.date);
        let g = out[out.length - 1];
        if (!g || g.titre !== titre) { g = { titre, items: [] }; out.push(g); }
        g.items.push(n);
      }
      return out;
    },
  },
  async mounted() {
    await this.charger();
    this.push = await this.telephone.etat().catch(() => 'non-supporte');
    this.chargerPrefs();
  },
  methods: {
    async charger() {
      this.chargement = true;
      try {
        const { data } = await axios.get('/api/parent/notifications');
        this.items = Array.isArray(data?.items) ? data.items : [];
        // Ce qui était nouveau à l'ouverture reste signalé pendant la visite ;
        // côté serveur, c'est maintenant « lu » (le parent l'a sous les yeux).
        const nonLues = this.items.filter((n) => !n.lu).map((n) => n.id);
        nonLues.forEach((id) => this.nouvelles.add(id));
        this.nouvelles = new Set(this.nouvelles);
        if (nonLues.length) {
          await axios.put('/api/parent/notifications/lues', { ids: nonLues });
          this.$emit('notificationsOpened');
        }
      } catch (e) {
        this.notifier("Les notifications n'ont pas pu être chargées.", 'error');
      } finally {
        this.chargement = false;
      }
    },
    async chargerPrefs() {
      try { this.prefs = (await axios.get('/api/parent/alertes/preferences')).data; } catch (e) { this.prefs = null; }
    },
    compte(type) {
      return this.items.filter((n) => n.type === type && (!this.enfant || n.eleveId === this.enfant)).length;
    },
    icone(type) {
      return {
        absence: 'mdi-account-off-outline', note: 'mdi-file-document-edit-outline', devoir: 'mdi-notebook-edit-outline',
        permission: 'mdi-calendar-check-outline', punition: 'mdi-alert-octagon-outline', bulletin: 'mdi-file-certificate-outline', programme: 'mdi-calendar-clock',
      }[type] || 'mdi-bell-outline';
    },
    libelleLien(type) {
      return { note: 'Voir la note', devoir: 'Voir les devoirs', permission: 'Voir mes demandes', punition: 'Voir la conduite', bulletin: 'Ouvrir le bulletin', programme: 'Voir le détail' }[type] || 'Ouvrir';
    },
    jour(date) {
      const d = new Date(date);
      const cle = (x) => x.toDateString();
      const hier = new Date(); hier.setDate(hier.getDate() - 1);
      if (cle(d) === cle(new Date())) return "Aujourd'hui";
      if (cle(d) === cle(hier)) return 'Hier';
      return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}`;
    },
    heure(date) {
      const d = new Date(date);
      return `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;
    },
    ouvrir(n) {
      if (n.lien) this.$router.push(n.lien);
    },
    ouvrirMotif(n) {
      this.motif = { ouvert: true, notif: n, texte: '', envoi: false, erreur: '' };
    },
    async envoyerMotif() {
      this.motif.envoi = true;
      this.motif.erreur = '';
      try {
        const n = this.motif.notif;
        const { data } = await axios.post('/api/parent/absences/motif', { eleveId: n.eleveId, date: n.details?.date, motif: this.motif.texte.trim() });
        n.motif = this.motif.texte.trim();
        this.motif.ouvert = false;
        this.notifier(data.message || 'Motif envoyé.');
      } catch (e) {
        this.motif.erreur = e?.response?.data?.message || "Le motif n'a pas pu être envoyé.";
      } finally {
        this.motif.envoi = false;
      }
    },
    async activerPush() {
      this.pushEnCours = true;
      try {
        this.push = await this.telephone.activer();
        if (this.push === 'actif') {
          await this.telephone.essai().catch(() => {});
          this.notifier('Notifications activées : une notification d’essai vient d’être envoyée.');
        }
      } catch (e) {
        this.push = await this.telephone.etat().catch(() => 'non-supporte');
        this.notifier(e?.message === 'lent'
          ? 'Le service de notifications du téléphone répond lentement. Vérifiez la connexion internet et réessayez.'
          : "Les notifications n'ont pas pu être activées sur ce téléphone.", 'error');
      } finally {
        this.pushEnCours = false;
      }
    },
    async desactiverPush() {
      this.push = await this.telephone.desactiver();
      this.notifier('Notifications désactivées sur ce téléphone.');
    },
    async essaiPush() {
      this.pushEnCours = true;
      try {
        const r = await this.telephone.essai();
        this.notifier(r.envoyes ? 'Notification d’essai envoyée.' : "Aucun téléphone abonné : réactivez les notifications.", r.envoyes ? 'success' : 'warning');
      } finally {
        this.pushEnCours = false;
      }
    },
    async changerSms(v) {
      try {
        await axios.put('/api/parent/alertes/preferences', { sms: v });
        this.notifier(v ? 'Vous recevrez les SMS de l’école.' : 'Vous ne recevrez plus de SMS de l’école.');
      } catch (e) {
        this.prefs.sms = !v;
        this.notifier("Le réglage n'a pas pu être enregistré.", 'error');
      }
    },
    notifier(texte, couleur = 'success') {
      this.snack = { ouvert: true, texte, couleur };
    },
  },
};
</script>

<style scoped>
.notifs-page { max-width: 760px; margin: 0 auto; padding: 4px 4px 24px; }
.notifs-tete { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.notifs-titre { font-size: 1.2rem; font-weight: 800; color: #1c2a3a; margin: 0; }
.notifs-sous { font-size: 0.85rem; color: #5f6b7a; }
.alertes-carte { background: #fff; border: 1px solid #cfe0f5; border-radius: 14px; padding: 4px 12px; margin-bottom: 12px; }
.alertes-ligne { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
.alertes-ligne + .alertes-ligne { border-top: 1px solid #eef2f6; }
.alertes-texte { flex: 1; display: flex; flex-direction: column; font-size: 0.82rem; color: #546e7a; min-width: 0; }
.alertes-texte strong { color: #1c2a3a; font-size: 0.9rem; }
.notifs-filtres { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.notifs-etat { text-align: center; padding: 34px 12px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.notifs-aide { font-size: 0.85rem; color: #5f6b7a; max-width: 420px; }
.notifs-jour { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #5f6b7a; margin: 14px 2px 6px; }
.notif { display: flex; gap: 10px; background: #fff; border: 1px solid #e3e9f1; border-radius: 12px; padding: 10px 12px; margin-bottom: 6px; }
.notif.is-nouveau { border-left: 4px solid #1976d2; background: #f7faff; }
.notif-icone { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #e3f2fd; color: #1565c0; }
.t-absence .notif-icone { background: #fdecea; color: #c62828; }
.t-punition .notif-icone { background: #fff3e0; color: #e65100; }
.t-bulletin .notif-icone { background: #e8f5e9; color: #2e7d32; }
.t-note .notif-icone { background: #ede7f6; color: #5e35b1; }
.t-permission .notif-icone { background: #e0f7fa; color: #00838f; }
.notif-corps { flex: 1; min-width: 0; }
.notif-titre { font-weight: 800; font-size: 0.92rem; color: #1c2a3a; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.notif-nouveau { font-size: 0.66rem; font-weight: 800; color: #fff; background: #1976d2; border-radius: 6px; padding: 0 6px; text-transform: uppercase; }
.notif-texte { font-size: 0.86rem; color: #37474f; margin-top: 2px; }
.notif-pied { font-size: 0.74rem; color: #8a96a3; margin-top: 3px; }
.notif-actions { margin-top: 6px; }
.notif-motif { font-size: 0.8rem; color: #2e7d32; }
</style>
