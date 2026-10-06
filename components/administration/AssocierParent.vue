<template>
  <!-- Rattacher un parent à un élève après l'inscription (parent facultatif
       à l'inscription en masse) : parent déjà connu ou nouveau parent, frères
       et sœurs en même temps, puis accès du parent à son espace. -->
  <v-card class="ap">
    <v-card-title class="ap-titre">
      <v-icon color="primary" class="mr-2">mdi-account-supervisor</v-icon>
      Parent de {{ eleve.prenom }} {{ eleve.nom }}
    </v-card-title>

    <v-card-text class="pt-1">
      <v-alert v-if="erreur" type="error" variant="tonal" density="compact" class="mb-3" closable @click:close="erreur = ''">{{ erreur }}</v-alert>

      <!-- Étape finale : rattaché, et comment le parent se connecte -->
      <template v-if="resultat">
        <div class="ap-ok">
          <v-icon color="success" size="22">mdi-check-circle</v-icon>
          <div>
            <strong>{{ resultat.parent.prenom }} {{ resultat.parent.nom }}</strong> est rattaché(e)
            {{ resultat.nb > 1 ? `à ${resultat.nb} élèves` : `à ${eleve.prenom}` }}.
            <div v-if="!resultat.cree && resultat.parentDejaConnu" class="ap-petit">Ce parent existait déjà : il a été repris, sans doublon.</div>
          </div>
        </div>

        <div class="ap-acces">
          <div class="ap-acces-titre"><v-icon size="18">mdi-cellphone-key</v-icon> Accès du parent à son espace</div>
          <template v-if="acces">
            <div class="ap-identifiants">
              <div><span>Identifiant</span><strong>{{ acces.identifiant }}</strong></div>
              <div><span>Mot de passe</span><strong>{{ acces.motDePasse }}</strong></div>
            </div>
            <div class="ap-petit">Notez-les et remettez-les au parent : le mot de passe ne sera plus affiché. Il se connecte sur la page « Parents ».</div>
            <v-btn size="small" variant="tonal" class="mt-2" prepend-icon="mdi-content-copy" @click="copierAcces">{{ copie ? 'Copié' : 'Copier' }}</v-btn>
          </template>
          <template v-else-if="resultat.parent.actif">
            <div class="ap-petit">Le parent a déjà un compte : l'enfant apparaît dans son espace dès sa prochaine connexion.</div>
          </template>
          <template v-else-if="resultat.parent.email">
            <div class="ap-petit">
              Le parent active lui-même son compte avec son e-mail (<strong>{{ resultat.parent.email }}</strong>) :
              page « Parents » → « Activer mon compte ».
            </div>
            <v-btn size="small" variant="text" class="mt-1 px-0" @click="creerAcces">Ou lui donner un identifiant et un mot de passe</v-btn>
          </template>
          <template v-else>
            <div class="ap-petit">Ce parent n'a pas d'e-mail : donnez-lui un identifiant et un mot de passe pour qu'il se connecte.</div>
            <v-btn size="small" color="primary" variant="flat" class="mt-2" :loading="chargementAcces" prepend-icon="mdi-key-plus" @click="creerAcces">Créer son accès</v-btn>
          </template>
        </div>
      </template>

      <template v-else>
        <!-- Parent actuel -->
        <div v-if="eleve.parent_id" class="ap-actuel">
          <v-icon size="20" color="primary">mdi-account</v-icon>
          <div class="ap-actuel-info">
            <strong>{{ eleve.parent_prenom }} {{ eleve.parent_nom }}</strong>
            <span>{{ [eleve.parent_contact, eleve.parent_email].filter(Boolean).join(' · ') || 'Aucun contact' }}</span>
          </div>
          <v-btn size="small" variant="text" color="error" :loading="chargementDetache" @click="detacher">Détacher</v-btn>
        </div>
        <div v-else class="ap-sans"><v-icon size="18" color="warning">mdi-account-question</v-icon> Aucun parent rattaché pour l'instant.</div>

        <div class="ap-sous-titre">{{ eleve.parent_id ? 'Changer de parent' : 'Rattacher un parent' }}</div>
        <v-btn-toggle v-model="mode" mandatory density="compact" color="primary" variant="outlined" class="ap-modes mb-3">
          <v-btn value="existant" prepend-icon="mdi-magnify">Déjà inscrit</v-btn>
          <v-btn value="nouveau" prepend-icon="mdi-account-plus">Nouveau parent</v-btn>
        </v-btn-toggle>

        <v-autocomplete
          v-if="mode === 'existant'"
          v-model="parentChoisi"
          :items="parents"
          :custom-filter="filtreParent"
          item-title="libelle"
          item-value="id"
          label="Nom, téléphone ou e-mail du parent"
          variant="outlined"
          density="compact"
          :loading="chargementParents"
          no-data-text="Aucun parent trouvé : choisissez « Nouveau parent »."
          clearable
        >
          <template #item="{ props: p, item }">
            <v-list-item v-bind="p" :subtitle="item.raw.details" />
          </template>
        </v-autocomplete>

        <template v-else>
          <v-row dense>
            <v-col cols="12" sm="6"><v-text-field v-model="nouveau.nom" label="Nom *" variant="outlined" density="compact" /></v-col>
            <v-col cols="12" sm="6"><v-text-field v-model="nouveau.prenom" label="Prénom" variant="outlined" density="compact" /></v-col>
            <v-col cols="12" sm="6"><v-text-field v-model="nouveau.telephone" label="Téléphone" type="tel" variant="outlined" density="compact" prepend-inner-icon="mdi-phone" /></v-col>
            <v-col cols="12" sm="6"><v-text-field v-model="nouveau.email" label="E-mail (facultatif)" type="email" variant="outlined" density="compact" prepend-inner-icon="mdi-email-outline" /></v-col>
          </v-row>
          <div class="ap-petit mb-2">Téléphone ou e-mail obligatoire. Si ce parent est déjà connu (même numéro ou même e-mail), il est repris automatiquement.</div>
        </template>

        <!-- Frères et sœurs -->
        <div v-if="fratrie.length" class="ap-fratrie">
          <div class="ap-sous-titre mb-1">Frères et sœurs sans parent, à rattacher aussi ?</div>
          <v-checkbox
            v-for="f in fratrie"
            :key="f.id"
            v-model="freres"
            :value="f.id"
            density="compact"
            hide-details
            :label="`${f.prenom} ${f.nom} — ${f.classe_nom}`"
          />
        </div>
      </template>
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <template v-if="resultat">
        <v-btn color="primary" variant="flat" @click="$emit('fermer')">Terminé</v-btn>
      </template>
      <template v-else>
        <v-btn variant="text" @click="$emit('fermer')">Annuler</v-btn>
        <v-btn color="primary" variant="flat" :loading="chargement" :disabled="!peutValider" @click="rattacher">Rattacher</v-btn>
      </template>
    </v-card-actions>
  </v-card>
</template>

<script>
import axios from 'axios';

const sansAccents = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default {
  name: 'AssocierParent',
  props: {
    eleve: { type: Object, required: true },
    // Tous les élèves de la liste : sert à proposer les frères et sœurs.
    eleves: { type: Array, default: () => [] },
    etablissementId: { type: [Number, String], default: null },
    anneeScolaireId: { type: [Number, String], default: null },
  },
  emits: ['fermer', 'modifie'],
  data() {
    return {
      mode: 'existant',
      parents: [],
      parentChoisi: null,
      chargementParents: false,
      nouveau: { nom: this.eleve.nom || '', prenom: '', telephone: '', email: '' },
      freres: [],
      chargement: false,
      chargementDetache: false,
      chargementAcces: false,
      erreur: '',
      resultat: null,
      acces: null,
      copie: false,
    };
  },
  computed: {
    // Même nom de famille et encore sans parent : frères et sœurs probables
    // (cochés d'office). Ceux qui ont déjà un parent ne sont pas proposés :
    // les noms de famille courants donneraient une liste interminable.
    fratrie() {
      const nom = sansAccents(this.eleve.nom).trim();
      return this.eleves.filter((e) => e.id !== this.eleve.id && !e.parent_id && sansAccents(e.nom).trim() === nom).slice(0, 12);
    },
    peutValider() {
      if (this.mode === 'existant') return Boolean(this.parentChoisi);
      return Boolean(this.nouveau.nom.trim() && (this.nouveau.telephone.trim() || this.nouveau.email.trim()));
    },
  },
  mounted() {
    this.freres = this.fratrie.map((f) => f.id);
    this.chargerParents();
  },
  methods: {
    etab() {
      if (this.etablissementId) return this.etablissementId;
      try { return JSON.parse(atob(localStorage.getItem('token').split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).etablissementId; } catch (e) { return null; }
    },
    entetes() {
      const token = localStorage.getItem('token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
    async chargerParents() {
      this.chargementParents = true;
      try {
        const { data } = await axios.get(`/api/Parents/${this.etab()}`, { headers: this.entetes() });
        this.parents = (Array.isArray(data) ? data : []).map((p) => ({
          id: p.id,
          libelle: `${p.firstName || ''} ${p.name || ''}`.trim() || `Parent ${p.id}`,
          details: [p.contact, p.email].filter(Boolean).join(' · '),
          recherche: sansAccents(`${p.firstName} ${p.name} ${p.name} ${p.firstName} ${p.email || ''} ${String(p.contact || '').replace(/\D/g, '')}`),
        }));
      } catch (e) {
        this.parents = [];
      } finally {
        this.chargementParents = false;
      }
    },
    filtreParent(_valeur, requete, item) {
      const q = sansAccents(requete).trim();
      if (!q) return true;
      const qChiffres = q.replace(/\D/g, '');
      const texte = item.raw.recherche;
      return q.split(/\s+/).every((mot) => texte.includes(mot)) || (qChiffres.length >= 3 && texte.includes(qChiffres));
    },
    async rattacher() {
      this.erreur = '';
      this.chargement = true;
      try {
        const corps = { eleveIds: [this.eleve.id, ...this.freres], anneeScolaireId: this.anneeScolaireId || undefined };
        if (this.mode === 'existant') corps.parentId = this.parentChoisi;
        else corps.parent = { ...this.nouveau };
        const { data } = await axios.post('/api/eleves/parent', corps, { headers: this.entetes() });
        this.resultat = { ...data, nb: corps.eleveIds.length, parentDejaConnu: this.mode === 'nouveau' && !data.cree };
        this.$emit('modifie');
      } catch (e) {
        this.erreur = e?.response?.data?.message || 'Le parent n\'a pas pu être rattaché.';
      } finally {
        this.chargement = false;
      }
    },
    async detacher() {
      if (!window.confirm(`Détacher ${this.eleve.parent_prenom || ''} ${this.eleve.parent_nom || ''} de ${this.eleve.prenom} ?`)) return;
      this.erreur = '';
      this.chargementDetache = true;
      try {
        await axios.delete(`/api/eleves/${this.eleve.id}/parent`, { headers: this.entetes() });
        this.$emit('modifie');
        this.$emit('fermer');
      } catch (e) {
        this.erreur = e?.response?.data?.message || 'Le parent n\'a pas pu être détaché.';
      } finally {
        this.chargementDetache = false;
      }
    },
    async creerAcces() {
      this.erreur = '';
      this.chargementAcces = true;
      try {
        const { data } = await axios.post(`/api/Parents/${this.resultat.parent.id}/acces`, {}, { headers: this.entetes() });
        this.acces = data;
      } catch (e) {
        this.erreur = e?.response?.data?.error || 'L\'accès n\'a pas pu être créé.';
      } finally {
        this.chargementAcces = false;
      }
    },
    async copierAcces() {
      try {
        await navigator.clipboard.writeText(`Identifiant : ${this.acces.identifiant}\nMot de passe : ${this.acces.motDePasse}`);
        this.copie = true;
      } catch (e) { /* presse-papiers indisponible : les identifiants restent affichés */ }
    },
  },
};
</script>

<style scoped>
.ap-titre { font-size: 1rem; font-weight: 700; white-space: normal; }
.ap-actuel { display: flex; align-items: center; gap: 10px; background: #f1f5fb; border-radius: 10px; padding: 8px 10px; margin-bottom: 12px; }
.ap-actuel-info { flex: 1; display: flex; flex-direction: column; font-size: 0.88rem; min-width: 0; }
.ap-actuel-info span { color: #5f6b7a; font-size: 0.8rem; overflow-wrap: anywhere; }
.ap-sans { display: flex; align-items: center; gap: 6px; background: #fff8e1; color: #8a5300; border-radius: 10px; padding: 8px 10px; margin-bottom: 12px; font-size: 0.86rem; }
.ap-sous-titre { font-weight: 700; font-size: 0.86rem; color: #1c2a3a; margin-bottom: 6px; }
.ap-modes { width: 100%; }
.ap-modes .v-btn { flex: 1; text-transform: none; }
.ap-petit { font-size: 0.8rem; color: #5f6b7a; }
.ap-fratrie { margin-top: 6px; border-top: 1px solid #e3e9f1; padding-top: 8px; }
.ap-ok { display: flex; gap: 10px; align-items: flex-start; font-size: 0.9rem; margin-bottom: 12px; }
.ap-acces { background: #f4f8fe; border: 1px solid #cfe0f5; border-radius: 10px; padding: 10px 12px; }
.ap-acces-titre { font-weight: 700; font-size: 0.86rem; color: #0d47a1; margin-bottom: 6px; display: flex; gap: 6px; align-items: center; }
.ap-identifiants { display: grid; gap: 6px; margin-bottom: 6px; }
.ap-identifiants div { display: flex; justify-content: space-between; gap: 10px; background: #fff; border-radius: 8px; padding: 6px 10px; }
.ap-identifiants span { color: #5f6b7a; font-size: 0.82rem; }
.ap-identifiants strong { font-family: monospace; font-size: 1rem; letter-spacing: 0.04em; overflow-wrap: anywhere; }
</style>
