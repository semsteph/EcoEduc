<template>
  <component
    :is="rendererFor"
    v-if="rendererFor"
    :diagram="diagram"
    :class="rendererClass"
  />
</template>

<script>
// Point d'entrée unique pour afficher un visuel du tuteur.
//
// - figures géométriques : GeometryDiagram.vue ;
// - circuit électrique : ElectricCircuitDiagram.vue ;
// - schéma générique (trajet, cycle, classification, comparaison,
//   structure, illustration) : GenericSchema.vue, pour TOUTES les notions.
// Aucun composant n'est propre à une notion : Claude fournit le contenu,
// ces composants la mise en forme (server-lib/tutor-visuals.cjs).
//
// Un type inconnu n'affiche rien (le backend ne transmet que des types
// validés ; ceci protège d'anciennes données en base).
import GeometryDiagram from './GeometryDiagram.vue';
import GenericSchema from './GenericSchema.vue';
import MathGraph from './MathGraph.vue';
import MoleculeDiagram from './MoleculeDiagram.vue';
import SportField from './SportField.vue';
import ElectricCircuitDiagram from './ElectricCircuitDiagram.vue';

const GEOMETRY_TYPES = new Set([
  'point', 'line', 'segment', 'angle', 'triangle', 'right-triangle',
  'parallelogram', 'rectangle', 'square', 'circle', 'coordinate-plane',
  'composite',
]);

const DOMAIN_RENDERERS = {
  schema: GenericSchema,
  graph: MathGraph,
  molecule: MoleculeDiagram,
  field: SportField,
  'electric-circuit': ElectricCircuitDiagram,
};

export default {
  name: 'TutorVisual',

  props: {
    diagram: {
      type: Object,
      default: null,
    },
  },

  computed: {
    type() {
      return typeof this.diagram?.type === 'string' ? this.diagram.type : '';
    },

    rendererFor() {
      if (DOMAIN_RENDERERS[this.type]) return DOMAIN_RENDERERS[this.type];
      if (GEOMETRY_TYPES.has(this.type)) return GeometryDiagram;
      return null;
    },

    // Les figures géométriques restent compactes dans la bulle ; un schéma
    // a besoin de toute la largeur pour rester lisible.
    rendererClass() {
      return DOMAIN_RENDERERS[this.type] ? 'visual-wide' : 'diagram-compact';
    },
  },
};

export { GEOMETRY_TYPES, DOMAIN_RENDERERS };
</script>
