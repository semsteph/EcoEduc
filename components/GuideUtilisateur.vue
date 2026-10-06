<template>
  <!-- Guide d'utilisation de l'espace (administration, enseignant, parent) :
       chaque guide explique une tâche étape par étape, avec la capture de
       l'écran réel, en version ordinateur ou téléphone. Les captures sont
       produites par scripts/guides/capturer.cjs. -->
  <div class="guide">
    <template v-if="!guideOuvert">
      <div class="guide-tete">
        <h2 class="guide-titre"><v-icon color="primary" class="mr-2">mdi-help-circle-outline</v-icon>Guide d’utilisation</h2>
        <div class="guide-sous">Choisissez ce que vous voulez faire : chaque guide le montre pas à pas, avec les vrais écrans.</div>
      </div>
      <v-text-field v-model="recherche" prepend-inner-icon="mdi-magnify" label="Rechercher (ex. absence, bulletin, notes…)" variant="outlined" density="compact" hide-details class="mb-3" clearable />
      <div v-if="chargement" class="text-center pa-6"><v-progress-circular indeterminate color="primary" /></div>
      <v-alert v-else-if="erreur" type="warning" variant="tonal">{{ erreur }}</v-alert>
      <template v-else>
        <template v-for="cat in categories" :key="cat.nom">
          <div class="guide-cat">{{ cat.nom }}</div>
          <div class="guide-liste">
            <button v-for="g in cat.guides" :key="g.id" type="button" class="guide-carte" @click="ouvrir(g.id)">
              <span class="guide-carte-icone"><v-icon size="22">{{ g.icone || 'mdi-book-open-variant' }}</v-icon></span>
              <span class="guide-carte-corps">
                <span class="guide-carte-titre">{{ g.titre }}</span>
                <span class="guide-carte-resume">{{ g.resume }}</span>
                <span class="guide-carte-meta">{{ g.etapes.length }} étape(s)</span>
              </span>
              <v-icon size="20" color="grey">mdi-chevron-right</v-icon>
            </button>
          </div>
        </template>
        <div v-if="!categories.length" class="text-center pa-6 text-medium-emphasis">Aucun guide ne correspond à « {{ recherche }} ».</div>
      </template>
    </template>

    <template v-else>
      <div class="guide-detail-tete">
        <v-btn variant="text" prepend-icon="mdi-arrow-left" class="px-1" @click="fermer">Tous les guides</v-btn>
        <v-btn-toggle v-model="format" mandatory density="compact" variant="outlined" color="primary" class="guide-format">
          <v-btn value="ordinateur" prepend-icon="mdi-monitor">Ordinateur</v-btn>
          <v-btn value="mobile" prepend-icon="mdi-cellphone">Téléphone</v-btn>
        </v-btn-toggle>
      </div>
      <h2 class="guide-titre">{{ guideOuvert.titre }}</h2>
      <p class="guide-sous">{{ guideOuvert.resume }}</p>
      <v-alert v-if="guideOuvert.astuce" type="info" variant="tonal" density="compact" class="mb-3">{{ guideOuvert.astuce }}</v-alert>

      <div v-for="(e, i) in guideOuvert.etapes" :key="i" class="etape">
        <div class="etape-num">{{ i + 1 }}</div>
        <div class="etape-corps">
          <div class="etape-texte" v-html="gras(e.texte)"></div>
          <button v-if="image(e)" type="button" class="etape-image" :class="`is-${format}`" @click="zoom = image(e)">
            <img :src="image(e)" :alt="`Étape ${i + 1} : ${e.texte}`" loading="lazy" />
          </button>
        </div>
      </div>

      <div class="guide-fin">
        <v-icon color="success">mdi-check-circle-outline</v-icon> C’est terminé.
        <v-btn variant="text" color="primary" @click="fermer">Voir les autres guides</v-btn>
      </div>
    </template>

    <v-dialog :model-value="Boolean(zoom)" max-width="1200" @update:model-value="zoom = null">
      <v-card @click="zoom = null">
        <img :src="zoom" alt="Capture agrandie" class="zoom-img" />
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
export default {
  name: 'GuideUtilisateur',
  props: {
    // 'administration' | 'enseignant' | 'parent'
    espace: { type: String, required: true },
  },
  data() {
    return { guides: [], chargement: true, erreur: '', recherche: '', format: 'ordinateur', zoom: null };
  },
  computed: {
    guideOuvert() {
      const id = this.$route.query.g;
      return id ? this.guides.find((g) => g.id === id) || null : null;
    },
    categories() {
      const q = this.simplifier(this.recherche || '');
      const liste = q ? this.guides.filter((g) => this.simplifier(`${g.titre} ${g.resume} ${g.categorie} ${g.etapes.map((e) => e.texte).join(' ')}`).includes(q)) : this.guides;
      const cats = new Map();
      liste.forEach((g) => { if (!cats.has(g.categorie)) cats.set(g.categorie, []); cats.get(g.categorie).push(g); });
      return [...cats].map(([nom, guides]) => ({ nom, guides }));
    },
  },
  async mounted() {
    this.format = window.matchMedia('(max-width: 760px)').matches ? 'mobile' : 'ordinateur';
    try {
      const r = await fetch('/guides/guides.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error();
      const data = await r.json();
      this.guides = (data.espaces && data.espaces[this.espace]) || [];
    } catch (e) {
      this.erreur = "Le guide n'a pas pu être chargé. Réessayez dans un instant.";
    } finally {
      this.chargement = false;
    }
  },
  methods: {
    simplifier(t) {
      return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    },
    ouvrir(id) {
      this.$router.push({ query: { ...this.$route.query, g: id } });
      window.scrollTo?.({ top: 0 });
    },
    fermer() {
      const { g, ...reste } = this.$route.query;
      this.$router.push({ query: reste });
    },
    image(e) {
      return e.images ? (e.images[this.format] || e.images.ordinateur || e.images.mobile) : null;
    },
    // **texte** → gras (le reste est échappé).
    gras(t) {
      const sur = String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return sur.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    },
  },
};
</script>

<style scoped>
.guide { max-width: 900px; margin: 0 auto; padding: 4px 4px 32px; }
.guide-tete { margin-bottom: 10px; }
.guide-titre { font-size: 1.25rem; font-weight: 800; color: #1c2a3a; margin: 0 0 4px; display: flex; align-items: center; }
.guide-sous { font-size: 0.88rem; color: #5f6b7a; margin-bottom: 10px; }
.guide-cat { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #5f6b7a; margin: 16px 2px 6px; }
.guide-liste { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; }
.guide-carte { display: flex; align-items: center; gap: 10px; text-align: left; font: inherit; color: inherit; background: #fff; border: 1px solid #e3e9f1; border-radius: 12px; padding: 10px 12px; cursor: pointer; }
.guide-carte:hover { border-color: #90caf9; }
.guide-carte-icone { width: 40px; height: 40px; border-radius: 10px; background: #e3f2fd; color: #1565c0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.guide-carte-corps { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.guide-carte-titre { font-weight: 800; font-size: 0.92rem; color: #1c2a3a; }
.guide-carte-resume { font-size: 0.8rem; color: #5f6b7a; }
.guide-carte-meta { font-size: 0.72rem; color: #90a4ae; margin-top: 2px; }
.guide-detail-tete { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.guide-format .v-btn { text-transform: none; }
.etape { display: flex; gap: 12px; margin-bottom: 18px; }
.etape-num { width: 30px; height: 30px; border-radius: 50%; background: #1976d2; color: #fff; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.etape-corps { flex: 1; min-width: 0; }
.etape-texte { font-size: 0.95rem; color: #263238; margin: 4px 0 8px; line-height: 1.45; }
.etape-image { display: block; padding: 0; border: 1px solid #d6e0ec; border-radius: 10px; overflow: hidden; background: #f4f7fb; cursor: zoom-in; }
.etape-image img { display: block; width: 100%; height: auto; }
.etape-image.is-mobile { max-width: 320px; }
.guide-fin { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 12px; background: #f1f8e9; border-radius: 10px; color: #33691e; font-weight: 700; }
.zoom-img { display: block; width: 100%; height: auto; cursor: zoom-out; }
</style>
