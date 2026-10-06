<template>
  <!-- Messagerie parent : messages automatiques de l'école — nouvelles notes
       (regroupées par matière et par jour) et changements d'emploi du temps. -->
  <div class="messages-page">
    <div class="topbar">
      <div class="topbar-title">
        <div class="title">Messages</div>
        <div class="subtitle">Nouvelles notes et changements d'emploi du temps</div>
      </div>
    </div>

    <v-container fluid class="content">
      <div v-if="enfants.length > 1 || messages.length" class="filtres">
        <v-chip size="small" :color="filtre === 'tout' ? 'primary' : undefined" :variant="filtre === 'tout' ? 'flat' : 'outlined'" @click="filtre = 'tout'">Tout</v-chip>
        <v-chip size="small" :color="filtre === 'note' ? 'primary' : undefined" :variant="filtre === 'note' ? 'flat' : 'outlined'" @click="filtre = 'note'">Notes</v-chip>
        <v-chip size="small" :color="filtre === 'programme' ? 'primary' : undefined" :variant="filtre === 'programme' ? 'flat' : 'outlined'" @click="filtre = 'programme'">Emploi du temps</v-chip>
        <template v-if="enfants.length > 1">
          <v-chip
            v-for="e in enfants"
            :key="e.id"
            size="small"
            :color="enfant === e.id ? 'teal' : undefined"
            :variant="enfant === e.id ? 'flat' : 'outlined'"
            @click="enfant = enfant === e.id ? null : e.id"
          >{{ e.prenom }}</v-chip>
        </template>
      </div>

      <div v-if="chargement" class="text-center pa-6"><v-progress-circular indeterminate color="primary" /></div>

      <v-card v-else-if="!visibles.length" class="empty-card" variant="outlined">
        <v-card-text class="empty-content">
          <div class="empty-icon"><v-icon size="24">mdi-message-outline</v-icon></div>
          <div class="empty-title">Aucun message pour le moment</div>
          <div class="empty-subtitle">
            Vous recevrez ici chaque nouvelle note de votre enfant et les changements de son emploi du temps.
          </div>
        </v-card-text>
      </v-card>

      <template v-else>
        <template v-for="g in groupes" :key="g.titre">
          <div class="groupe">{{ g.titre }}</div>
          <div v-for="m in g.items" :key="m.id" class="message" :class="{ 'is-nouveau': nouveaux.has(m.id) }">
            <div class="message-icone" :class="m.type === 'note' ? 'ic-note' : 'ic-prog'">
              <v-icon size="20">{{ m.type === 'note' ? 'mdi-file-document-edit-outline' : 'mdi-calendar-clock' }}</v-icon>
            </div>
            <div class="message-corps">
              <div class="message-tete">
                <span class="message-enfant">{{ m.enfant }}</span>
                <span class="message-heure">{{ heure(m.date) }}</span>
              </div>
              <div class="message-titre">{{ m.type === 'note' ? 'Nouvelle note · ' : '' }}{{ m.titre }}</div>
              <ul class="message-lignes">
                <li v-for="(l, i) in m.lignes" :key="i">{{ l }}</li>
              </ul>
            </div>
          </div>
        </template>
      </template>
    </v-container>
  </div>
</template>

<script>
import axios from 'axios';
import { EventBus } from '@/event-bus';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export default {
  name: 'MessagesComponent',
  data() {
    return { messages: [], chargement: true, filtre: 'tout', enfant: null, nouveaux: new Set() };
  },
  computed: {
    enfants() {
      const vus = new Map();
      this.messages.forEach((m) => vus.set(m.eleveId, { id: m.eleveId, prenom: m.enfant }));
      return [...vus.values()];
    },
    visibles() {
      return this.messages.filter((m) => (this.filtre === 'tout' || m.type === this.filtre) && (!this.enfant || m.eleveId === this.enfant));
    },
    // Par jour : « Aujourd'hui », « Hier », « lundi 5 octobre ».
    groupes() {
      const out = [];
      for (const m of this.visibles) {
        const titre = this.jour(m.date);
        let g = out[out.length - 1];
        if (!g || g.titre !== titre) { g = { titre, items: [] }; out.push(g); }
        g.items.push(m);
      }
      return out;
    },
  },
  async mounted() {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const { data } = await axios.get('/api/parent/messages', { headers });
      this.messages = Array.isArray(data?.messages) ? data.messages : [];
      this.nouveaux = new Set(this.messages.filter((m) => !m.lu).map((m) => m.id));
      if (this.nouveaux.size) {
        await axios.put('/api/parent/messages/lus', {}, { headers });
        EventBus.emit('messages:lus');
      }
    } catch (e) {
      this.messages = [];
    } finally {
      this.chargement = false;
    }
  },
  methods: {
    jour(date) {
      const d = new Date(date);
      const cle = (x) => x.toDateString();
      const hier = new Date(); hier.setDate(hier.getDate() - 1);
      if (cle(d) === cle(new Date())) return "Aujourd'hui";
      if (cle(d) === cle(hier)) return 'Hier';
      return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
    },
    heure(date) {
      const d = new Date(date);
      return `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;
    },
  },
};
</script>

<style scoped>
.messages-page { min-height: 100vh; background: #f6f8fc; }
.topbar { padding: 14px 16px 6px; }
.title { font-size: 1.15rem; font-weight: 800; color: #1c2a3a; }
.subtitle { font-size: 0.82rem; color: #5f6b7a; }
.content { max-width: 760px; }
.filtres { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.groupe { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #5f6b7a; margin: 14px 2px 6px; }
.message { display: flex; gap: 10px; background: #fff; border: 1px solid #e3e9f1; border-radius: 12px; padding: 10px 12px; margin-bottom: 6px; }
.message.is-nouveau { border-left: 4px solid #1976d2; background: #f7faff; }
.message-icone { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ic-note { background: #e8f5e9; color: #2e7d32; }
.ic-prog { background: #e3f2fd; color: #1565c0; }
.message-corps { flex: 1; min-width: 0; }
.message-tete { display: flex; justify-content: space-between; gap: 8px; }
.message-enfant { font-size: 0.75rem; font-weight: 700; color: #00796b; }
.message-heure { font-size: 0.72rem; color: #8a96a3; }
.message-titre { font-weight: 700; font-size: 0.9rem; color: #1c2a3a; }
.message-lignes { margin: 2px 0 0; padding-left: 18px; font-size: 0.85rem; color: #37474f; }
.empty-card { border-radius: 12px; background: #fff; }
.empty-content { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; padding: 26px 12px; }
.empty-icon { width: 44px; height: 44px; border-radius: 50%; background: #e3f2fd; color: #1565c0; display: flex; align-items: center; justify-content: center; }
.empty-title { font-weight: 700; }
.empty-subtitle { font-size: 0.85rem; color: #5f6b7a; max-width: 420px; }
</style>
