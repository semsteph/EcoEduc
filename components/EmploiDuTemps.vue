<template>
  <!-- Emploi du temps d'un enseignant dans l'établissement (vue
       administration et vue enseignant) : grille de la semaine, conflits,
       classes dont l'horaire n'est pas encore saisi. -->
  <div class="edt">
    <div v-if="chargement" class="text-center pa-6"><v-progress-circular indeterminate color="primary" /></div>
    <v-alert v-else-if="erreur" type="error" variant="tonal" density="compact">{{ erreur }}</v-alert>

    <template v-else-if="donnees">
      <div class="edt-entete">
        <div>
          <div class="edt-nom">{{ donnees.enseignant.prenom }} {{ donnees.enseignant.nom }}</div>
          <div class="edt-resume">
            {{ donnees.creneaux.length }} cours par semaine
            <span v-if="donnees.heuresParSemaine"> · {{ formatHeures(donnees.heuresParSemaine) }}</span>
            · {{ nbClasses }} classe(s)
          </div>
          <div v-if="donnees.plusieursEtablissements" class="edt-resume">
            <v-icon size="14">mdi-school-outline</v-icon> Tous vos établissements : {{ donnees.etablissements.join(', ') }}
          </div>
        </div>
      </div>

      <v-alert v-if="donnees.conflits.length" type="error" variant="tonal" density="compact" class="mb-2">
        <strong>Conflit d'horaire</strong> : l'enseignant est prévu dans deux classes au même moment<template v-if="donnees.plusieursEtablissements"> (parfois dans deux établissements différents)</template>.
        <ul class="edt-liste-conflits"><li v-for="(c, i) in donnees.conflits" :key="i">{{ c }}</li></ul>
        <span v-if="admin">Corrigez le programme de l'une des classes (Classes → Programme).</span>
        <span v-else>Signalez-le à l'administration.</span>
      </v-alert>

      <div v-if="!donnees.creneaux.length" class="edt-vide">
        <v-icon size="28" color="grey">mdi-calendar-blank-outline</v-icon>
        <div>Aucun horaire saisi pour l'instant.</div>
        <div v-if="admin" class="edt-aide">Les horaires se saisissent dans le programme de chaque classe (Classes → Programme).</div>
      </div>

      <template v-else>
        <!-- Grille (ordinateur, tablette) -->
        <div class="edt-grille-wrap">
          <table class="edt-grille">
            <thead>
              <tr><th class="edt-heure-col">Horaire</th><th v-for="j in joursUtiles" :key="j">{{ j }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="h in horaires" :key="h">
                <td class="edt-heure-col">{{ h }}</td>
                <td v-for="j in joursUtiles" :key="j">
                  <div v-for="(c, k) in cours(j, h)" :key="k" class="edt-cours" :class="{ conflit: c.conflit }" :style="{ '--teinte': teinte(c.classe) }">
                    <strong>{{ c.classe }}</strong>
                    <span>{{ c.matiere }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Liste par jour (téléphone) -->
        <div class="edt-jours">
          <div v-for="j in joursUtiles" :key="j" class="edt-jour">
            <div class="edt-jour-titre">{{ j }}</div>
            <div v-for="(c, k) in donnees.creneaux.filter((x) => x.jour === j)" :key="k" class="edt-ligne" :class="{ conflit: c.conflit }" :style="{ '--teinte': teinte(c.classe) }">
              <span class="edt-ligne-heure">{{ c.horaire }}</span>
              <span><strong>{{ c.classe }}</strong> · {{ c.matiere }}</span>
            </div>
          </div>
        </div>
      </template>

      <div v-if="donnees.sansHoraire.length" class="edt-sans">
        <v-icon size="16" color="warning">mdi-clock-alert-outline</v-icon>
        Pas encore d'horaire pour :
        {{ donnees.sansHoraire.map((x) => `${x.classe} (${x.matiere})`).join(', ') }}.
      </div>
    </template>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'EmploiDuTemps',
  props: {
    // Adresse de l'API (administration : /api/enseignants/:id/emploi-du-temps ;
    // enseignant : /api/enseignant/emploi-du-temps).
    url: { type: String, required: true },
    admin: { type: Boolean, default: false },
  },
  data() {
    return { chargement: true, erreur: '', donnees: null };
  },
  computed: {
    joursUtiles() {
      if (!this.donnees) return [];
      const avecCours = new Set(this.donnees.creneaux.map((c) => c.jour));
      return this.donnees.jours.filter((j, i) => i < 5 || avecCours.has(j));
    },
    horaires() {
      if (!this.donnees) return [];
      const vus = new Map();
      this.donnees.creneaux.forEach((c) => { if (!vus.has(c.horaire)) vus.set(c.horaire, c.debut ?? 9999); });
      return [...vus.entries()].sort((a, b) => a[1] - b[1]).map(([h]) => h);
    },
    nbClasses() {
      if (!this.donnees) return 0;
      return new Set([...this.donnees.creneaux.map((c) => c.classe), ...this.donnees.sansHoraire.map((c) => c.classe)]).size;
    },
  },
  watch: {
    url() { this.charger(); },
  },
  mounted() {
    this.charger();
  },
  methods: {
    async charger() {
      this.chargement = true;
      this.erreur = '';
      try {
        const { data } = await axios.get(this.url);
        this.donnees = data;
      } catch (error) {
        this.erreur = error?.response?.data?.message || "L'emploi du temps n'a pas pu être chargé.";
      } finally {
        this.chargement = false;
      }
    },
    cours(jour, horaire) {
      return this.donnees.creneaux.filter((c) => c.jour === jour && c.horaire === horaire);
    },
    formatHeures(h) {
      return `${String(h).replace('.', ',')} h par semaine`;
    },
    // Couleur stable par classe, pour repérer une classe d'un coup d'œil.
    teinte(classe) {
      let h = 0;
      for (const ch of String(classe)) h = (h * 31 + ch.charCodeAt(0)) % 360;
      return h;
    },
  },
};
</script>

<style scoped>
.edt-entete { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.edt-nom { font-weight: 800; font-size: 1rem; color: #0d47a1; }
.edt-resume { font-size: 0.82rem; color: #5f6b7a; }
.edt-liste-conflits { margin: 4px 0; padding-left: 18px; font-size: 0.85rem; }
.edt-vide { text-align: center; color: #6b7a8c; padding: 18px 8px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.edt-aide { font-size: 0.8rem; }
.edt-grille-wrap { overflow-x: auto; }
.edt-grille { width: 100%; border-collapse: collapse; font-size: 0.8rem; table-layout: fixed; min-width: 640px; }
.edt-grille th { background: #f1f5fb; padding: 6px; font-weight: 700; }
.edt-grille td { border: 1px solid #e3e9f1; padding: 3px; vertical-align: top; height: 46px; }
.edt-heure-col { width: 96px; white-space: nowrap; color: #4a5768; font-weight: 600; text-align: center; vertical-align: middle !important; }
.edt-cours { background: hsl(var(--teinte), 70%, 94%); border-left: 3px solid hsl(var(--teinte), 55%, 45%); border-radius: 4px; padding: 3px 5px; margin-bottom: 2px; display: flex; flex-direction: column; line-height: 1.25; }
.edt-cours span { font-size: 0.74rem; color: #3a4a60; }
.edt-cours.conflit, .edt-ligne.conflit { background: #fdecea; border-left-color: #c62828; }
.edt-jours { display: none; }
.edt-jour { margin-bottom: 8px; }
.edt-jour-titre { font-weight: 800; font-size: 0.85rem; color: #1c2a3a; margin-bottom: 3px; }
.edt-ligne { display: flex; gap: 10px; padding: 6px 8px; border-left: 3px solid hsl(var(--teinte), 55%, 45%); background: hsl(var(--teinte), 70%, 96%); border-radius: 4px; margin-bottom: 3px; font-size: 0.84rem; }
.edt-ligne-heure { color: #4a5768; min-width: 92px; font-weight: 600; }
.edt-sans { margin-top: 10px; font-size: 0.82rem; color: #8a5300; background: #fff8e1; border-radius: 8px; padding: 6px 10px; }
@media (max-width: 640px) {
  .edt-grille-wrap { display: none; }
  .edt-jours { display: block; }
}
</style>
