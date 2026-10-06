<template>
  <!-- Orientation en 2nde : l'administration choisit la série de chaque
       admis de 3ème selon son vœu. Les moyennes de l'an passé ne sont là
       que pour information : rien n'est décidé automatiquement. -->
  <v-container fluid class="orient pa-2 pa-sm-4">
    <div class="orient-tete">
      <h2 class="orient-titre"><v-icon color="deep-orange" class="mr-2">mdi-sign-direction</v-icon>Orientation en 2nde</h2>
      <div class="orient-sous">{{ donnees ? `${donnees.eleves.length} élève(s) attendent leur série` : '' }}</div>
    </div>

    <AideEssentiel cle="orientation-2nde" titre="À savoir : orientation en 2nde">
      <ul class="aide-liste">
        <li>À la clôture, les admis de 3ème passent en 2nde <strong>sans série</strong> : la série est un choix personnel (le vœu de l'élève et de sa famille, l'avis du conseil de classe).</li>
        <li>Cochez un ou plusieurs élèves, choisissez la série, puis « Orienter ». Ils sont répartis dans les classes de cette série les moins remplies ; une classe est créée si besoin.</li>
        <li>Les moyennes de l'an passé sont affichées pour vous aider, jamais pour décider à votre place.</li>
        <li>Tant qu'un élève attend sa série, il n'est dans aucune vraie classe : il ne peut pas recevoir de notes.</li>
      </ul>
    </AideEssentiel>

    <div v-if="chargement" class="text-center pa-6"><v-progress-circular indeterminate color="primary" /></div>
    <v-alert v-else-if="erreur" type="error" variant="tonal">{{ erreur }}</v-alert>

    <template v-else-if="donnees">
      <v-alert v-if="message" :type="messageType" variant="tonal" density="compact" class="mb-3" closable @click:close="message = ''">{{ message }}</v-alert>

      <!-- Classes de 2nde et leur effectif -->
      <div v-if="donnees.classes.length" class="orient-classes">
        <span class="orient-label">Classes de 2nde :</span>
        <v-chip v-for="c in donnees.classes" :key="c.id" size="small" variant="tonal" :color="c.effectif >= donnees.effectifMax ? 'error' : 'primary'">
          {{ c.nom }} · {{ c.effectif }}/{{ donnees.effectifMax }}
        </v-chip>
      </div>

      <div v-if="!donnees.eleves.length" class="orient-vide">
        <v-icon size="34" color="success">mdi-check-circle-outline</v-icon>
        <div class="font-weight-bold">Tous les élèves de 2nde ont leur série.</div>
      </div>

      <template v-else>
        <!-- Barre d'action -->
        <div class="orient-action">
          <v-checkbox
            :model-value="tousCoches"
            :indeterminate="coches.length > 0 && !tousCoches"
            density="compact"
            hide-details
            label="Tout cocher"
            @update:model-value="toutCocher"
          />
          <v-text-field v-model="recherche" density="compact" variant="outlined" hide-details prepend-inner-icon="mdi-magnify" label="Rechercher" class="orient-recherche" />
          <v-combobox
            v-model="serie"
            :items="seriesProposees"
            label="Série"
            density="compact"
            variant="outlined"
            hide-details
            class="orient-serie"
          />
          <v-select
            v-if="classesDeLaSerie.length > 1"
            v-model="classeCible"
            :items="[{ title: 'Répartir automatiquement', value: null }, ...classesDeLaSerie.map((c) => ({ title: `${c.nom} (${c.effectif}/${donnees.effectifMax})`, value: c.id }))]"
            label="Classe"
            density="compact"
            variant="outlined"
            hide-details
            class="orient-serie"
          />
          <v-btn color="deep-orange" variant="flat" :disabled="!coches.length || !serieValide" :loading="envoi" prepend-icon="mdi-arrow-right-bold" @click="orienter">
            Orienter {{ coches.length ? `(${coches.length})` : '' }}
          </v-btn>
        </div>
        <div v-if="serie && serieValide && !classesDeLaSerie.length" class="orient-note">
          L'établissement n'a pas encore de 2nde {{ serieNorm }} : elle sera créée (pensez ensuite à lui affecter des enseignants).
        </div>

        <!-- Élèves -->
        <div class="orient-liste">
          <label v-for="e in filtres" :key="e.id" class="orient-eleve" :class="{ 'is-coche': coches.includes(e.id) }">
            <input v-model="coches" type="checkbox" :value="e.id" class="orient-case" />
            <div class="orient-eleve-corps">
              <div class="orient-eleve-nom">{{ e.nom }} {{ e.prenom }}</div>
              <div class="orient-eleve-info">
                <span v-if="e.classeAncienne">{{ e.classeAncienne }}</span>
                <span v-if="e.moyenneAnnuelle !== null"> · moyenne annuelle <strong>{{ virgule(e.moyenneAnnuelle) }}</strong></span>
              </div>
              <div v-if="Object.keys(e.matieres).length" class="orient-matieres">
                <span v-for="(m, nom) in e.matieres" :key="nom" class="orient-matiere">{{ nom }} {{ virgule(m) }}</span>
              </div>
            </div>
          </label>
        </div>
      </template>
    </template>
  </v-container>
</template>

<script>
import axios from 'axios';
import AideEssentiel from '@/components/AideEssentiel.vue';

export default {
  name: 'OrientationSeconde',
  components: { AideEssentiel },
  emits: ['back'],
  data() {
    return { donnees: null, chargement: true, erreur: '', coches: [], serie: null, classeCible: null, recherche: '', envoi: false, message: '', messageType: 'success' };
  },
  computed: {
    seriesProposees() {
      if (!this.donnees) return [];
      return [...new Set([...this.donnees.seriesOuvertes, ...this.donnees.seriesCourantes])];
    },
    serieNorm() {
      return String(this.serie || '').trim().toUpperCase();
    },
    serieValide() {
      return /^[A-Z]{1,3}[0-9]?$/.test(this.serieNorm);
    },
    classesDeLaSerie() {
      return this.donnees ? this.donnees.classes.filter((c) => c.serie === this.serieNorm) : [];
    },
    filtres() {
      const q = this.recherche.trim().toLowerCase();
      const liste = this.donnees ? this.donnees.eleves : [];
      return q ? liste.filter((e) => `${e.nom} ${e.prenom} ${e.classeAncienne || ''}`.toLowerCase().includes(q)) : liste;
    },
    tousCoches() {
      return this.filtres.length > 0 && this.filtres.every((e) => this.coches.includes(e.id));
    },
  },
  watch: {
    serie() { this.classeCible = null; },
  },
  mounted() {
    this.charger();
  },
  methods: {
    entetes() {
      const t = localStorage.getItem('token');
      return t ? { Authorization: `Bearer ${t}` } : {};
    },
    async charger() {
      this.chargement = true;
      this.erreur = '';
      try {
        const { data } = await axios.get('/api/orientation-2nde', { headers: this.entetes() });
        this.donnees = data;
        this.coches = this.coches.filter((id) => data.eleves.some((e) => e.id === id));
      } catch (e) {
        this.erreur = e?.response?.data?.message || "La liste n'a pas pu être chargée.";
      } finally {
        this.chargement = false;
      }
    },
    toutCocher(v) {
      const ids = this.filtres.map((e) => e.id);
      this.coches = v ? [...new Set([...this.coches, ...ids])] : this.coches.filter((id) => !ids.includes(id));
    },
    async orienter() {
      this.envoi = true;
      this.message = '';
      try {
        const { data } = await axios.post('/api/orientation-2nde', { eleveIds: this.coches, serie: this.serieNorm, classeCible: this.classeCible }, { headers: this.entetes() });
        this.message = data.message;
        this.messageType = 'success';
        this.coches = [];
        await this.charger();
      } catch (e) {
        this.message = e?.response?.data?.message || "L'orientation n'a pas été enregistrée.";
        this.messageType = 'error';
      } finally {
        this.envoi = false;
      }
    },
    virgule(v) {
      return String(v).replace('.', ',');
    },
  },
};
</script>

<style scoped>
.orient { max-width: 1000px; margin: 0 auto; }
.orient-tete { margin-bottom: 8px; }
.orient-titre { font-size: 1.2rem; font-weight: 800; display: flex; align-items: center; margin: 0; }
.orient-sous { font-size: 0.85rem; color: #5f6b7a; }
.aide-liste { margin: 0; padding-left: 18px; font-size: 0.84rem; }
.orient-classes { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 10px; }
.orient-label { font-size: 0.82rem; font-weight: 700; color: #37474f; }
.orient-vide { text-align: center; padding: 30px 10px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.orient-action { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; background: #fff; border: 1px solid #e3e9f1; border-radius: 12px; padding: 8px 10px; margin-bottom: 6px; }
.orient-recherche { min-width: 160px; flex: 1; }
.orient-serie { min-width: 130px; max-width: 230px; }
.orient-note { font-size: 0.8rem; color: #8a5300; background: #fff8e1; border-radius: 8px; padding: 5px 9px; margin-bottom: 6px; }
.orient-liste { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 6px; }
.orient-eleve { display: flex; gap: 10px; align-items: flex-start; background: #fff; border: 1px solid #e3e9f1; border-radius: 10px; padding: 8px 10px; cursor: pointer; }
.orient-eleve.is-coche { border-color: #ff7043; background: #fff4ef; }
.orient-case { margin-top: 3px; width: 18px; height: 18px; accent-color: #e64a19; flex-shrink: 0; }
.orient-eleve-corps { min-width: 0; }
.orient-eleve-nom { font-weight: 700; font-size: 0.9rem; }
.orient-eleve-info { font-size: 0.8rem; color: #5f6b7a; }
.orient-matieres { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }
.orient-matiere { font-size: 0.7rem; background: #f1f5fb; border-radius: 5px; padding: 0 5px; color: #455a64; }
</style>
