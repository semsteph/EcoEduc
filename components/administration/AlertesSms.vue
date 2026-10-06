<template>
  <!-- Réglages des alertes des parents : notifications sur le téléphone
       (gratuites, toujours actives) et SMS (payants, à activer). -->
  <div class="alertes-admin">
    <div v-if="chargement" class="text-center pa-6"><v-progress-circular indeterminate color="primary" /></div>
    <template v-else-if="infos">
      <v-alert type="info" variant="tonal" density="compact" class="mb-3">
        Les parents reçoivent les alertes dans l’application et, s’ils les ont activées, en notification sur leur téléphone
        (gratuit) : <strong>{{ infos.parentsPush }}</strong> parent(s) les ont activées.
      </v-alert>

      <v-card flat class="rounded-lg pa-3 mb-3 bloc">
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <v-icon color="primary">mdi-message-text-outline</v-icon>
          <div class="font-weight-bold flex-grow-1">Alertes par SMS</div>
          <v-chip size="small" :color="infos.fournisseur === 'simulation' ? 'warning' : 'success'" variant="flat">
            {{ infos.fournisseur === 'simulation' ? 'Mode simulation : aucun fournisseur SMS configuré' : `Fournisseur : ${infos.fournisseur}` }}
          </v-chip>
        </div>
        <p v-if="infos.fournisseur === 'simulation'" class="text-caption mb-2">
          Tant qu’aucun fournisseur n’est configuré sur le serveur, les SMS ne partent pas : ils sont seulement inscrits au journal ci-dessous,
          pour vérifier ce qui serait envoyé.
        </p>
        <v-switch v-model="p.smsActif" color="primary" inset hide-details label="Envoyer des SMS aux parents" />
        <div class="types" :class="{ 'is-off': !p.smsActif }">
          <v-checkbox v-model="p.absences" :disabled="!p.smsActif" hide-details density="compact" label="Absences (un SMS par enfant et par jour)" />
          <v-checkbox v-model="p.permissions" :disabled="!p.smsActif" hide-details density="compact" label="Réponses aux demandes de permission" />
          <v-checkbox v-model="p.bulletins" :disabled="!p.smsActif" hide-details density="compact" label="Bulletin disponible" />
          <v-text-field v-model.number="p.quotaMensuel" :disabled="!p.smsActif" type="number" min="0" label="Nombre maximum de SMS par mois" variant="outlined" density="compact" hide-details class="mt-2 quota" />
        </div>
        <div class="text-caption mt-2">
          Ce mois-ci : <strong>{{ infos.smsCeMois }}</strong> SMS · {{ infos.parentsStop }} parent(s) sur {{ infos.parents }} ont refusé les SMS.
          Les textes sont envoyés sans accents pour tenir en un seul SMS.
        </div>
        <div class="d-flex justify-end mt-2">
          <v-btn color="primary" variant="flat" :loading="enregistrement" @click="enregistrer">Enregistrer</v-btn>
        </div>
      </v-card>

      <v-card flat class="rounded-lg pa-3 mb-3 bloc">
        <div class="font-weight-bold mb-2">SMS d’essai</div>
        <div class="d-flex flex-wrap ga-2 align-center">
          <v-text-field v-model="numeroEssai" label="Numéro (ex. 01 97 12 34 56)" variant="outlined" density="compact" hide-details class="essai" />
          <v-btn variant="tonal" color="primary" :loading="essaiEnCours" :disabled="!numeroEssai.trim()" @click="essai">Envoyer un essai</v-btn>
        </div>
        <div v-if="resultatEssai" class="text-caption mt-2">{{ resultatEssai }}</div>
      </v-card>

      <v-card flat class="rounded-lg pa-3 bloc">
        <div class="font-weight-bold mb-2">Derniers SMS</div>
        <div v-if="!journal.length" class="text-caption">Aucun SMS pour le moment.</div>
        <div v-for="s in journal" :key="s.id" class="sms-ligne">
          <v-chip size="x-small" :color="couleurStatut(s.statut)" variant="flat" class="mr-2">{{ libelleStatut(s.statut) }}</v-chip>
          <div class="sms-corps">
            <div class="sms-texte">{{ s.texte }}</div>
            <div class="sms-meta">{{ s.prenom ? `${s.prenom} ${s.nom} · ` : '' }}{{ s.telephone }} · {{ new Date(s.created_at).toLocaleString('fr-FR') }}<span v-if="s.statut === 'echec' && s.reponse"> · {{ s.reponse }}</span></div>
          </div>
        </div>
      </v-card>
    </template>
    <v-snackbar v-model="snack.ouvert" :color="snack.couleur" timeout="3500">{{ snack.texte }}</v-snackbar>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'AlertesSms',
  data() {
    return {
      chargement: true, infos: null, p: {}, journal: [], enregistrement: false,
      numeroEssai: '', essaiEnCours: false, resultatEssai: '', snack: { ouvert: false, texte: '', couleur: 'success' },
    };
  },
  mounted() { this.charger(); },
  methods: {
    async charger() {
      this.chargement = true;
      try {
        const [a, j] = await Promise.all([axios.get('/api/alertes/parametres'), axios.get('/api/alertes/sms')]);
        this.infos = a.data;
        this.p = { ...a.data.parametres };
        this.journal = j.data || [];
      } finally {
        this.chargement = false;
      }
    },
    async enregistrer() {
      this.enregistrement = true;
      try {
        const { data } = await axios.put('/api/alertes/parametres', this.p);
        this.snack = { ouvert: true, texte: data.message, couleur: 'success' };
        await this.charger();
      } catch (e) {
        this.snack = { ouvert: true, texte: e?.response?.data?.message || "Les réglages n'ont pas été enregistrés.", couleur: 'error' };
      } finally {
        this.enregistrement = false;
      }
    },
    async essai() {
      this.essaiEnCours = true;
      this.resultatEssai = '';
      try {
        const { data } = await axios.post('/api/alertes/sms-essai', { telephone: this.numeroEssai });
        this.resultatEssai = data.statut === 'simule'
          ? `Simulé vers ${data.numero} : aucun fournisseur n'est configuré, le SMS n'est pas réellement parti.`
          : data.statut === 'envoye' ? `SMS envoyé au ${data.numero}.` : `Échec de l'envoi : ${data.reponse || 'erreur du fournisseur'}`;
        await this.charger();
      } catch (e) {
        this.resultatEssai = e?.response?.data?.message || "L'essai a échoué.";
      } finally {
        this.essaiEnCours = false;
      }
    },
    libelleStatut(s) {
      return { envoye: 'envoyé', simule: 'simulé', echec: 'échec', quota: 'quota atteint' }[s] || s;
    },
    couleurStatut(s) {
      return { envoye: 'success', simule: 'warning', echec: 'error', quota: 'grey' }[s] || 'grey';
    },
  },
};
</script>

<style scoped>
.bloc { border: 1px solid #e3e9f1; }
.types { padding-left: 8px; }
.types.is-off { opacity: 0.55; }
.quota { max-width: 260px; }
.essai { max-width: 260px; }
.sms-ligne { display: flex; align-items: flex-start; padding: 6px 0; border-top: 1px solid #eef2f6; }
.sms-corps { min-width: 0; }
.sms-texte { font-size: 0.85rem; color: #37474f; }
.sms-meta { font-size: 0.74rem; color: #8a96a3; }
</style>
