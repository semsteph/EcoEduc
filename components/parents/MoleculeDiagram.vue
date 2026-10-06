<template>
  <figure class="molecule" :aria-label="diagram.title || 'Molécule'">
    <figcaption v-if="diagram.title" class="mol-title">
      <span class="mol-title-mark" aria-hidden="true"></span>
      {{ diagram.quiz ? 'Molécule' : diagram.title }}
    </figcaption>

    <svg :viewBox="`0 0 ${width} ${height}`" class="mol-svg" role="img" :aria-label="diagram.title || 'Molécule'">
      <!-- Liaisons de la chaîne principale (simple, double, triple) -->
      <g v-for="(order, i) in diagram.bonds" :key="'b' + i" class="mol-bond">
        <line
          v-for="k in order"
          :key="k"
          :x1="x(i) + gap"
          :x2="x(i + 1) - gap"
          :y1="cy + offset(k, order)"
          :y2="cy + offset(k, order)"
        />
      </g>

      <!-- Ramifications (haut / bas) -->
      <g v-for="(s, i) in diagram.substituents" :key="'s' + i" class="mol-bond">
        <line
          v-for="k in s.bondOrder"
          :key="k"
          :x1="x(s.at - 1) + offset(k, s.bondOrder)"
          :x2="x(s.at - 1) + offset(k, s.bondOrder)"
          :y1="cy + dir(s) * 14"
          :y2="cy + dir(s) * (step - 16)"
        />
        <text :x="x(s.at - 1)" :y="cy + dir(s) * step + 5" text-anchor="middle" class="mol-group">{{ s.label }}</text>
      </g>

      <!-- Hydrogènes dessinés un par un (formule développée) -->
      <g v-if="developed" class="mol-bond">
        <g v-for="(h, i) in hydrogenPositions" :key="'h' + i">
          <line :x1="h.x1" :y1="h.y1" :x2="h.x2" :y2="h.y2" />
          <text :x="h.tx" :y="h.ty + 5" text-anchor="middle" class="mol-h">H</text>
        </g>
      </g>

      <!-- Atomes de la chaîne -->
      <g v-for="(atom, i) in diagram.atoms" :key="'a' + i">
        <text
          :x="x(i)"
          :y="cy + 5"
          text-anchor="middle"
          class="mol-atom"
          :class="{ 'mol-hl': diagram.highlight === i + 1 }"
        >{{ developed ? atom.element : atom.label }}</text>
        <text v-if="diagram.numbering" :x="x(i)" :y="height - 6" text-anchor="middle" class="mol-num">{{ i + 1 }}</text>
      </g>
    </svg>

    <p v-if="diagram.name && !diagram.quiz" class="mol-name">{{ diagram.name }}</p>
  </figure>
</template>

<script>
// Formule de molécule organique calculée par le serveur
// (server-lib/tutor-molecule.cjs) : chaîne principale horizontale,
// ramifications verticales, hydrogènes comptés selon la valence.
export default {
  name: 'MoleculeDiagram',

  props: {
    diagram: { type: Object, required: true },
  },

  computed: {
    developed() {
      return this.diagram.mode === 'developed';
    },
    // Chaîne longue : atomes plus serrés, pour que le texte reste lisible
    // une fois le dessin réduit à la largeur d'un téléphone.
    step() {
      const long = this.diagram.atoms.length > 5;
      if (this.developed) return long ? 48 : 58;
      return long ? 52 : 66;
    },
    gap() {
      return this.developed ? 12 : 26;
    },
    width() {
      return Math.max(200, this.diagram.atoms.length * this.step + 80);
    },
    height() {
      return 200;
    },
    cy() {
      return 96;
    },
    // Hydrogènes explicites : haut, bas, et extrémités gauche / droite.
    hydrogenPositions() {
      const out = [];
      const last = this.diagram.atoms.length - 1;
      this.diagram.atoms.forEach((atom, i) => {
        const taken = this.diagram.substituents.filter((s) => s.at === i + 1).map((s) => s.side);
        const slots = ['up', 'down', ...(i === 0 ? ['left'] : []), ...(i === last ? ['right'] : [])]
          .filter((slot) => !taken.includes(slot));
        slots.slice(0, atom.hydrogens).forEach((slot) => {
          const x = this.x(i);
          const cy = this.cy;
          if (slot === 'up' || slot === 'down') {
            const d = slot === 'up' ? -1 : 1;
            out.push({ x1: x, y1: cy + d * 12, x2: x, y2: cy + d * 32, tx: x, ty: cy + d * 44 });
          } else {
            const d = slot === 'left' ? -1 : 1;
            out.push({ x1: x + d * 12, y1: cy, x2: x + d * 32, y2: cy, tx: x + d * 44, ty: cy });
          }
        });
      });
      return out;
    },
  },

  methods: {
    x(i) {
      return 40 + i * this.step + (this.width - 80 - (this.diagram.atoms.length - 1) * this.step) / 2;
    },
    dir(s) {
      return s.side === 'down' ? 1 : -1;
    },
    // Écart entre les traits d'une liaison double ou triple.
    offset(k, order) {
      return (k - (order + 1) / 2) * 5;
    },
  },
};
</script>

<style scoped>
.molecule {
  width: 100%;
  margin: 10px 0;
  padding: 10px;
  box-sizing: border-box;
  border-radius: 10px;
  background: #f7fafa;
}

.mol-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  font-size: 0.92rem;
  font-weight: 800;
  color: #0f766e;
}

.mol-title-mark {
  width: 5px;
  height: 16px;
  border-radius: 3px;
  background: #0d9488;
}

.mol-svg {
  display: block;
  width: 100%;
  max-width: 560px;
  height: auto;
  margin: 0 auto;
  border-radius: 8px;
  background: #fff;
}

.mol-bond line { stroke: #37474f; stroke-width: 2; stroke-linecap: round; }
.mol-atom { font-size: 17px; font-weight: 800; fill: #0b2e4a; }
.mol-group { font-size: 15px; font-weight: 700; fill: #1976d2; }
.mol-h { font-size: 14px; font-weight: 600; fill: #546e7a; }
.mol-num { font-size: 11px; font-weight: 700; fill: #ea580c; }
.mol-hl { fill: #ea580c; }

.mol-name {
  margin: 8px 0 0;
  text-align: center;
  font-size: 0.86rem;
  font-weight: 700;
  color: #37474f;
}
</style>
