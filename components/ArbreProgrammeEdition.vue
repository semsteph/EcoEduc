<template>
  <!-- Édition d'un programme en arbre (SA → séquence → activité...) :
       intitulé, numéro et titre de chaque partie, ajout et suppression.
       Utilisé par l'enseignant et par l'administration. -->
  <div class="arbre">
    <div v-for="(n, i) in modelValue" :key="n._cle" class="noeud" :class="`noeud--p${Math.min(profondeur, 3)}`">
      <div class="ligne">
        <v-combobox
          :model-value="n.libelle"
          :items="libelles"
          density="compact"
          variant="outlined"
          hide-details
          class="champ-libelle"
          aria-label="Type de partie"
          @update:model-value="maj(i, 'libelle', $event)"
        />
        <v-text-field
          :model-value="n.numero"
          density="compact"
          variant="outlined"
          hide-details
          placeholder="N°"
          class="champ-numero"
          aria-label="Numéro"
          @update:model-value="maj(i, 'numero', $event)"
        />
        <v-text-field
          :model-value="n.titre"
          density="compact"
          variant="outlined"
          hide-details
          placeholder="Titre"
          class="champ-titre"
          aria-label="Titre"
          @update:model-value="maj(i, 'titre', $event)"
        />
        <v-btn icon size="small" variant="text" title="Ajouter une sous-partie" aria-label="Ajouter une sous-partie" @click="ajouterEnfant(i)">
          <v-icon>mdi-subdirectory-arrow-right</v-icon>
        </v-btn>
        <v-btn icon size="small" variant="text" color="error" title="Supprimer" aria-label="Supprimer" @click="supprimer(i)">
          <v-icon>mdi-delete-outline</v-icon>
        </v-btn>
      </div>
      <ArbreProgrammeEdition
        v-if="n.enfants && n.enfants.length"
        :model-value="n.enfants"
        :profondeur="profondeur + 1"
        @update:model-value="maj(i, 'enfants', $event)"
      />
    </div>
    <v-btn v-if="profondeur === 0" variant="tonal" color="primary" size="small" class="mt-2" @click="ajouterRacine">
      <v-icon start>mdi-plus</v-icon>
      Ajouter une SA
    </v-btn>
  </div>
</template>

<script>
let compteur = 0;
const cle = () => `n${(compteur += 1)}`;

// Ajoute une clé locale à chaque nœud (affichage), sans toucher aux données.
export function avecCles(arbre) {
  return (arbre || []).map((n) => ({ ...n, _cle: n._cle || cle(), enfants: avecCles(n.enfants) }));
}

// Retire les clés locales avant l'envoi au serveur.
export function sansCles(arbre) {
  return (arbre || []).map(({ _cle, retire, ...n }) => ({ ...n, enfants: sansCles(n.enfants) }));
}

export default {
  name: "ArbreProgrammeEdition",
  props: {
    modelValue: { type: Array, default: () => [] },
    profondeur: { type: Number, default: 0 },
  },
  emits: ["update:modelValue"],
  data: () => ({
    libelles: ["SA", "Séquence", "Activité", "Leçon", "Chapitre", "Partie", "Thème", "Module"],
  }),
  methods: {
    emettre(liste) {
      this.$emit("update:modelValue", liste);
    },
    maj(i, champ, valeur) {
      const liste = [...this.modelValue];
      liste[i] = { ...liste[i], [champ]: valeur };
      this.emettre(liste);
    },
    supprimer(i) {
      const n = this.modelValue[i];
      const nb = (n.enfants || []).length;
      if (nb && !window.confirm(`Supprimer « ${n.titre} » et ses ${nb} sous-partie(s) ?`)) return;
      this.emettre(this.modelValue.filter((_, j) => j !== i));
    },
    ajouterEnfant(i) {
      const n = this.modelValue[i];
      const enfants = n.enfants || [];
      // Même type que les sœurs, sinon « Activité » sous une SA.
      const libelle = enfants[0]?.libelle || (n.libelle === "SA" ? "Activité" : "Activité");
      this.maj(i, "enfants", [...enfants, { _cle: cle(), libelle, numero: String(enfants.length + 1), titre: "", enfants: [] }]);
    },
    ajouterRacine() {
      this.emettre([...this.modelValue, { _cle: cle(), libelle: "SA", numero: String(this.modelValue.length + 1), titre: "", enfants: [] }]);
    },
  },
};
</script>

<style scoped>
.noeud--p1 { margin-left: 18px; }
.noeud--p2 { margin-left: 18px; }
.noeud--p3 { margin-left: 18px; }
.noeud { border-left: 2px solid rgba(25, 118, 210, 0.15); padding-left: 8px; margin-top: 6px; }
.noeud--p0 { border-left-color: rgba(25, 118, 210, 0.45); }
.ligne { display: flex; align-items: center; gap: 6px; }
.champ-libelle { flex: 0 0 132px; }
.champ-numero { flex: 0 0 64px; }
.champ-titre { flex: 1 1 auto; min-width: 0; }
@media (max-width: 600px) {
  .ligne { flex-wrap: wrap; }
  .champ-libelle { flex: 1 1 45%; }
  .champ-numero { flex: 0 0 70px; }
  .champ-titre { flex: 1 1 100%; order: 3; }
}
</style>
