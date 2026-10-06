<template>
  <figure
    class="generic-schema"
    :class="['form-' + form, { 'is-quiz': quiz }]"
    :aria-label="diagram.title || 'Schéma'"
  >
    <figcaption v-if="diagram.title" class="schema-title">
      <span class="schema-title-mark" aria-hidden="true"></span>
      {{ diagram.title }}
    </figcaption>

    <p v-if="quiz" class="quiz-note">
      Retrouve ce que représente chaque numéro.
    </p>

    <!-- ============================================================ -->
    <!-- TRAJET / ÉTAPES                                              -->
    <!-- ============================================================ -->
    <ol v-if="form === 'flow'" class="flow">
      <li
        v-for="(step, index) in mainNodes"
        :key="step.id"
        class="flow-item"
      >
        <div class="flow-row" :class="{ 'has-side': attachedTo(step.id).length }">
          <div class="card" :class="{ 'is-highlighted': step.highlight }">
            <span class="card-number">{{ number(step) }}</span>
            <span class="card-body">
              <span class="card-label">{{ labelOf(step) }}</span>
              <span v-if="showDetails && step.detail" class="card-detail">{{ step.detail }}</span>
            </span>
          </div>

          <!-- Éléments annexes qui interviennent sur cette étape sans en
               faire partie (glande, catalyseur, source d'énergie...). -->
          <ul v-if="attachedTo(step.id).length" class="side-list">
            <li
              v-for="side in attachedTo(step.id)"
              :key="side.id"
              class="card card-side"
              :class="{ 'is-highlighted': side.highlight }"
            >
              <span class="card-number card-number-side">{{ number(side) }}</span>
              <span class="card-body">
                <span class="card-label">{{ labelOf(side) }}</span>
                <span v-if="showDetails && side.detail" class="card-detail">{{ side.detail }}</span>
              </span>
            </li>
          </ul>
        </div>

        <div v-if="index < mainNodes.length - 1" class="flow-arrow">
          <svg viewBox="0 0 16 30" class="flow-arrow-svg" aria-hidden="true">
            <path d="M8 1 V23" />
            <path d="M2 19 L8 28 L14 19" />
          </svg>
          <span
            v-if="showDetails && linkLabel(step.id, mainNodes[index + 1].id)"
            class="flow-arrow-label"
          >
            {{ linkLabel(step.id, mainNodes[index + 1].id) }}
          </span>
        </div>
      </li>
    </ol>

    <!-- ============================================================ -->
    <!-- CYCLE : étapes en anneau (en colonne sur petit écran)       -->
    <!-- ============================================================ -->
    <div
      v-else-if="form === 'cycle'"
      class="cycle"
      :class="{ 'cycle-ring': mainNodes.length <= 6 }"
    >
      <svg
        v-if="mainNodes.length <= 6"
        viewBox="0 0 100 80"
        class="cycle-svg"
        aria-hidden="true"
      >
        <defs>
          <marker
            :id="markerId"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerUnits="userSpaceOnUse"
            markerWidth="3.2"
            markerHeight="3.2"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 Z" class="marker-head" />
          </marker>
        </defs>
        <path
          v-for="(arc, index) in cycleArcs"
          :key="'arc-' + index"
          :d="arc"
          class="cycle-arc"
          :marker-end="`url(#${markerId})`"
        />
      </svg>

      <ol class="cycle-list">
        <li
          v-for="(step, index) in mainNodes"
          :key="step.id"
          class="cycle-item"
          :style="cyclePosition(index)"
        >
          <div class="card" :class="{ 'is-highlighted': step.highlight }">
            <span class="card-number">{{ number(step) }}</span>
            <span class="card-body">
              <span class="card-label">{{ labelOf(step) }}</span>
              <span v-if="showDetails && step.detail" class="card-detail">{{ step.detail }}</span>
            </span>
          </div>
          <span class="cycle-next" aria-hidden="true">
            <template v-if="index < mainNodes.length - 1">↓</template>
            <small v-else class="cycle-return">↺ retour à l’étape 1</small>
          </span>
        </li>
      </ol>
    </div>

    <!-- ============================================================ -->
    <!-- CLASSIFICATION                                               -->
    <!-- ============================================================ -->
    <div v-else-if="form === 'hierarchy'" class="hierarchy">
      <div v-for="root in roots" :key="root.id" class="tree">
        <div class="card card-root" :class="{ 'is-highlighted': root.highlight }">
          <span class="card-body">
            <span class="card-label">{{ labelOf(root) }}</span>
            <span v-if="showDetails && root.detail" class="card-detail">{{ root.detail }}</span>
          </span>
        </div>

        <div v-if="childrenOf(root.id).length" class="tree-stem" aria-hidden="true"></div>

        <ul v-if="childrenOf(root.id).length" class="branches">
          <li
            v-for="branch in childrenOf(root.id)"
            :key="branch.id"
            class="branch"
          >
            <div class="card" :class="{ 'is-highlighted': branch.highlight }">
              <span class="card-body">
                <span class="card-label">{{ labelOf(branch) }}</span>
                <span v-if="showDetails && branch.detail" class="card-detail">{{ branch.detail }}</span>
              </span>
            </div>

            <ul v-if="descendantsOf(branch.id).length" class="leaves">
              <li
                v-for="leaf in descendantsOf(branch.id)"
                :key="leaf.node.id"
                class="leaf"
                :class="{ 'is-highlighted': leaf.node.highlight }"
                :style="{ '--depth': leaf.depth }"
              >
                <span class="card-label">{{ labelOf(leaf.node) }}</span>
                <span v-if="showDetails && leaf.node.detail" class="card-detail">{{ leaf.node.detail }}</span>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- COMPARAISON                                                  -->
    <!-- ============================================================ -->
    <div
      v-else-if="form === 'comparison'"
      class="comparison"
      :style="{ '--columns': columns.length }"
    >
      <section
        v-for="(column, index) in columns"
        :key="'col-' + index"
        class="column"
        :class="'column-' + index"
      >
        <h4 class="column-title">{{ column.title }}</h4>
        <ul class="column-items">
          <li v-for="(item, itemIndex) in column.items" :key="'item-' + itemIndex">
            {{ quiz ? '…' : item }}
          </li>
        </ul>
      </section>
    </div>

    <!-- ============================================================ -->
    <!-- STRUCTURE LÉGENDÉE (ensemble et parties, sans dessin)        -->
    <!-- ============================================================ -->
    <div v-else-if="form === 'structure'" class="structure">
      <div
        v-for="zone in zones"
        :key="zone"
        class="zone"
        :class="'zone-' + zone"
      >
        <div
          v-for="part in partsIn(zone)"
          :key="part.id"
          class="card"
          :class="{ 'is-highlighted': part.highlight }"
        >
          <span class="card-number">{{ number(part) }}</span>
          <span class="card-body">
            <span class="card-label">{{ labelOf(part) }}</span>
            <span v-if="showDetails && part.detail" class="card-detail">{{ part.detail }}</span>
          </span>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- ILLUSTRATION : dessin + numéros + légende                    -->
    <!-- ============================================================ -->
    <div v-else-if="form === 'illustration'" class="illustration">
      <svg
        :viewBox="illustrationView.box"
        class="illustration-svg"
        role="img"
        :aria-label="diagram.title || 'Illustration'"
      >
        <defs>
          <marker
            :id="markerId"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 Z" class="marker-head" />
          </marker>
        </defs>

        <template v-for="(shape, index) in shapes" :key="'shape-' + index">
          <path
            v-if="shape.kind === 'path'"
            :d="shape.d"
            :class="shapeClass(shape)"
            :marker-end="shape.arrow ? `url(#${markerId})` : null"
          />
          <ellipse
            v-else-if="shape.kind === 'ellipse'"
            :cx="shape.cx"
            :cy="shape.cy"
            :rx="shape.rx"
            :ry="shape.ry"
            :class="shapeClass(shape)"
          />
          <rect
            v-else-if="shape.kind === 'rect'"
            :x="shape.x"
            :y="shape.y"
            :width="shape.width"
            :height="shape.height"
            :rx="shape.rx"
            :class="shapeClass(shape)"
          />
          <line
            v-else-if="shape.kind === 'line'"
            :x1="shape.x1"
            :y1="shape.y1"
            :x2="shape.x2"
            :y2="shape.y2"
            :class="[shapeClass(shape), 'is-line']"
            :marker-end="shape.arrow ? `url(#${markerId})` : null"
          />
          <polygon
            v-else-if="shape.kind === 'polygon'"
            :points="shape.points"
            :class="shapeClass(shape)"
          />
          <polyline
            v-else-if="shape.kind === 'polyline'"
            :points="shape.points"
            :class="[shapeClass(shape), 'is-line']"
            :marker-end="shape.arrow ? `url(#${markerId})` : null"
          />
        </template>

        <!-- Repères numérotés : la légende est sous le dessin, le texte
             ne chevauche donc jamais le dessin. -->
        <g
          v-for="badge in badges"
          :key="'badge-' + badge.id"
          class="badge"
          :class="{ 'is-highlighted': badge.highlight }"
        >
          <polyline :points="badge.leader" class="badge-leader" />
          <circle :cx="badge.anchor.x" :cy="badge.anchor.y" :r="illustrationView.dot" class="badge-dot" />
          <circle :cx="badge.x" :cy="badge.y" :r="illustrationView.radius" class="badge-circle" />
          <text
            :x="badge.x"
            :y="badge.y"
            :font-size="Math.round(illustrationView.radius * 11.5) / 10"
            text-anchor="middle"
            dominant-baseline="central"
            class="badge-text"
          >{{ badge.number }}</text>
        </g>
      </svg>

      <ol v-if="!quiz" class="legend">
        <li
          v-for="node in nodes"
          :key="'legend-' + node.id"
          class="legend-item"
          :class="{ 'is-highlighted': node.highlight }"
        >
          <span class="legend-number">{{ number(node) }}</span>
          <span class="card-body">
            <span class="card-label">{{ node.label }}</span>
            <span v-if="node.detail" class="card-detail">{{ node.detail }}</span>
          </span>
        </li>
      </ol>
    </div>

    <p v-if="diagram.note && !quiz" class="schema-note">{{ diagram.note }}</p>
  </figure>
</template>

<script>
// Rendu unique de tous les schémas génériques (type "schema"), quelle que
// soit la notion et la classe : Claude choisit la forme et fournit le
// contenu, ce composant fait la mise en page. Mêmes couleurs, mêmes
// cartes et mêmes flèches pour toutes les matières ; le texte revient à
// la ligne et rien ne se chevauche, y compris sur téléphone.
//
// En exercice (quiz), les noms sont remplacés par des numéros et les
// détails masqués : le schéma ne donne pas la réponse.
let instanceCounter = 0;


export default {
  name: 'GenericSchema',

  props: {
    diagram: {
      type: Object,
      required: true,
    },
  },

  data() {
    instanceCounter += 1;
    return { markerId: `schema-arrow-${instanceCounter}` };
  },

  computed: {
    form() {
      return this.diagram?.form || 'flow';
    },

    quiz() {
      return this.diagram?.quiz === true;
    },

    showDetails() {
      return !this.quiz;
    },

    nodes() {
      return Array.isArray(this.diagram?.nodes) ? this.diagram.nodes : [];
    },

    shapes() {
      return Array.isArray(this.diagram?.shapes) ? this.diagram.shapes : [];
    },

    mainNodes() {
      return this.nodes.filter((node) => !node.attachTo);
    },

    roots() {
      return this.nodes.filter((node) => !node.parent);
    },

    columns() {
      return Array.isArray(this.diagram?.columns) ? this.diagram.columns : [];
    },

    zones() {
      const used = new Set(this.nodes.map((node) => node.zone || 'center'));
      return ['top', 'left', 'center', 'right', 'bottom'].filter((zone) => used.has(zone));
    },

    // Numéro de chaque élément : ordre du trajet, puis éléments annexes.
    numbers() {
      let ordered = this.nodes;
      if (this.form === 'flow') ordered = [...this.mainNodes, ...this.nodes.filter((node) => node.attachTo)];
      if (this.form === 'structure') ordered = this.zones.flatMap((zone) => this.partsIn(zone));
      const numbers = {};
      ordered.forEach((node, index) => { numbers[node.id] = index + 1; });
      return numbers;
    },

    // Anneau du cycle : positions sur une ellipse (repère 100 × 80).
    cyclePoints() {
      const count = this.mainNodes.length;
      return this.mainNodes.map((_, index) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
        return { angle, x: 50 + 34 * Math.cos(angle), y: 40 + 27 * Math.sin(angle) };
      });
    },

    // Arcs entre deux étapes consécutives, qui s'arrêtent avant les cartes.
    cycleArcs() {
      const count = this.mainNodes.length;
      const gap = Math.min(0.55, Math.PI / count - 0.18);
      const point = (angle) => `${(50 + 34 * Math.cos(angle)).toFixed(2)} ${(40 + 27 * Math.sin(angle)).toFixed(2)}`;
      return this.cyclePoints.map(({ angle }) => {
        const start = angle + gap;
        const end = angle + (2 * Math.PI) / count - gap;
        return `M ${point(start)} A 34 27 0 0 1 ${point(end)}`;
      });
    },

    // Cadrage de l'illustration : on zoome sur la zone réellement dessinée
    // (calculée par le serveur) et on ajoute une marge à gauche et à droite
    // pour les numéros, comme dans un manuel. En test réel, le dessin
    // n'occupait qu'un coin du cadre et les numéros cachaient les organes.
    illustrationView() {
      const raw = this.diagram?.bbox;
      const box = raw && raw.w > 0 && raw.h > 0 ? raw : { x: 0, y: 0, w: 400, h: 300 };
      const pad = Math.max(box.w, box.h) * 0.03;
      const draw = { x: box.x - pad, y: box.y - pad, w: box.w + 2 * pad, h: box.h + 2 * pad };
      const gutter = Math.max(draw.w * 0.16, draw.h * 0.12);
      const width = draw.w + 2 * gutter;
      // Taille des numéros proportionnelle au cadre : même rendu à l'écran
      // quel que soit le zoom.
      const radius = Math.round(Math.max(width, draw.h) * 0.32) / 10;
      const gap = radius * 2.5;
      const perSide = Math.ceil(this.nodes.length / 2);
      const height = Math.max(draw.h, perSide * gap + radius);
      const top = draw.y - (height - draw.h) / 2;
      return {
        draw,
        gutter,
        radius,
        gap,
        top,
        height,
        dot: Math.round(radius * 2.2) / 10,
        box: [draw.x - gutter, top, width, height].map((v) => +v.toFixed(1)).join(' '),
      };
    },

    // Numéros rangés en colonne dans la marge du côté de la partie
    // désignée, triés de haut en bas pour que les traits ne se croisent
    // pas ; chaque trait part d'un point posé sur la partie.
    badges() {
      const view = this.illustrationView;
      const { draw, radius, gap } = view;
      const middle = draw.x + draw.w / 2;
      const items = this.nodes.map((node) => ({ node, anchor: node.at || { x: middle, y: draw.y + draw.h / 2 } }));
      let left = items.filter((item) => item.anchor.x < middle);
      let right = items.filter((item) => item.anchor.x >= middle);
      // Équilibre les deux colonnes : on déplace les parties les plus
      // proches du centre.
      const limit = Math.ceil(items.length / 2);
      const rebalance = (from, to) => {
        from.sort((a, b) => Math.abs(a.anchor.x - middle) - Math.abs(b.anchor.x - middle));
        while (from.length > limit) to.push(from.shift());
      };
      rebalance(left, right);
      rebalance(right, left);

      const column = (list, side) => {
        list.sort((a, b) => a.anchor.y - b.anchor.y);
        const minY = view.top + radius * 1.2;
        const maxY = view.top + view.height - radius * 1.2;
        // Position idéale à hauteur de la partie, puis écartement minimal.
        const ys = list.map((item) => Math.min(maxY, Math.max(minY, item.anchor.y)));
        for (let i = 1; i < ys.length; i += 1) ys[i] = Math.max(ys[i], ys[i - 1] + gap);
        const overflow = ys.length ? ys[ys.length - 1] - maxY : 0;
        if (overflow > 0) {
          ys[ys.length - 1] = maxY;
          for (let i = ys.length - 2; i >= 0; i -= 1) ys[i] = Math.min(ys[i], ys[i + 1] - gap);
        }
        const x = side === 'left' ? draw.x - view.gutter / 2 : draw.x + draw.w + view.gutter / 2;
        const edge = side === 'left' ? x + radius : x - radius;
        const elbow = side === 'left' ? draw.x : draw.x + draw.w;
        return list.map((item, index) => {
          const y = ys[index];
          return {
            id: item.node.id,
            number: this.numbers[item.node.id],
            highlight: item.node.highlight,
            anchor: item.anchor,
            x: +x.toFixed(1),
            y: +y.toFixed(1),
            leader: `${edge.toFixed(1)},${y.toFixed(1)} ${elbow.toFixed(1)},${y.toFixed(1)} ${item.anchor.x},${item.anchor.y}`,
          };
        });
      };
      return [...column(left, 'left'), ...column(right, 'right')];
    },
  },

  methods: {
    number(node) {
      return this.numbers[node.id];
    },

    labelOf(node) {
      return this.quiz ? '?' : node.label;
    },

    attachedTo(id) {
      return this.nodes.filter((node) => node.attachTo === id);
    },

    childrenOf(id) {
      return this.nodes.filter((node) => node.parent === id);
    },

    // Sous-niveaux d'une branche, à plat avec leur profondeur.
    descendantsOf(id, depth = 0) {
      return this.childrenOf(id).flatMap((node) => [
        { node, depth },
        ...this.descendantsOf(node.id, depth + 1),
      ]);
    },

    partsIn(zone) {
      return this.nodes.filter((node) => (node.zone || 'center') === zone);
    },

    linkLabel(from, to) {
      const link = (this.diagram?.links || []).find((l) => l.from === from && l.to === to);
      return link?.label || '';
    },

    cyclePosition(index) {
      const point = this.cyclePoints[index];
      if (!point || this.mainNodes.length > 6) return null;
      return { '--x': `${point.x}%`, '--y': `${(point.y / 80) * 100}%` };
    },

    shapeClass(shape) {
      return [
        'ill-shape',
        `tone-${shape.tone || 'neutral'}`,
        { 'no-fill': shape.fill === false, 'is-dashed': shape.dashed },
      ];
    },
  },
};
</script>

<style scoped>
.generic-schema {
  --gs-ink: #2a2a3c;
  --gs-muted: #5f6078;
  --gs-accent: #0d9488;
  --gs-accent-strong: #0f766e;
  --gs-accent-soft: #e6f6f4;
  --gs-highlight: #ff7a45;
  --gs-highlight-soft: #fff1ea;
  --gs-panel: #f7fafa;
  --gs-card: #ffffff;
  --gs-line: #cfe3e0;

  container-type: inline-size;
  width: 100%;
  margin: 12px 0;
  padding: 14px;
  box-sizing: border-box;
  white-space: normal;
  border-radius: 16px;
  background: var(--gs-panel);
  color: var(--gs-ink);
  font-size: 0.9rem;
  line-height: 1.4;
}

.generic-schema *,
.generic-schema *::before,
.generic-schema *::after {
  box-sizing: border-box;
}

.schema-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--gs-accent-strong);
}

.schema-title-mark {
  flex: none;
  width: 6px;
  height: 18px;
  border-radius: 3px;
  background: var(--gs-accent);
}

.quiz-note,
.schema-note {
  margin: 0 0 10px;
  font-size: 0.84rem;
  color: var(--gs-muted);
}

.schema-note {
  margin: 12px 0 0;
  font-style: italic;
}

/* --- Carte (élément du schéma) ------------------------------------ */
.card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--gs-line);
  border-radius: 12px;
  background: var(--gs-card);
  box-shadow: 0 2px 6px rgba(15, 118, 110, 0.07);
}

.card.is-highlighted {
  border-color: var(--gs-highlight);
  background: var(--gs-highlight-soft);
  box-shadow: 0 0 0 3px rgba(255, 122, 69, 0.18);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.card-label {
  font-weight: 800;
  overflow-wrap: anywhere;
}

.card-detail {
  font-size: 0.84rem;
  color: var(--gs-muted);
  overflow-wrap: anywhere;
}

.card-number,
.legend-number {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--gs-accent);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 800;
}

.is-highlighted > .card-number,
.is-highlighted > .legend-number {
  background: var(--gs-highlight);
}

.card-number-side {
  background: #fff;
  color: var(--gs-accent-strong);
  border: 2px solid var(--gs-accent);
}

/* --- Trajet ------------------------------------------------------- */
.flow {
  list-style: none;
  margin: 0;
  padding: 0;
}

.flow-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.side-list {
  list-style: none;
  margin: 0 0 0 26px;
  padding: 0;
  display: grid;
  gap: 6px;
}

.card-side {
  position: relative;
  border-style: dashed;
  border-color: var(--gs-accent);
  background: var(--gs-accent-soft);
  box-shadow: none;
}

.card-side::before {
  content: '';
  position: absolute;
  left: -18px;
  top: 50%;
  width: 16px;
  border-top: 2px dashed var(--gs-accent);
}

@container (min-width: 520px) {
  .flow-row.has-side {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    align-items: center;
    column-gap: 26px;
  }

  .flow-row.has-side .side-list {
    margin-left: 0;
  }
}

.flow-arrow {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  padding-left: 16px;
}

.flow-arrow-svg {
  flex: none;
  width: 16px;
  height: 30px;
  fill: none;
  stroke: var(--gs-accent);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.flow-arrow-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--gs-accent-strong);
}

/* --- Cycle -------------------------------------------------------- */
.cycle {
  position: relative;
}

.cycle-list {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0 0 0 26px;
  display: grid;
  gap: 4px;
}

/* Téléphone : la boucle est dessinée le long de la liste, de la dernière
   étape vers la première (avant, on ne voyait qu'une liste). */
.cycle-list::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 20px;
  bottom: 34px;
  width: 14px;
  border: 2px solid var(--gs-accent);
  border-right: none;
  border-radius: 12px 0 0 12px;
}

.cycle-list::after {
  content: '';
  position: absolute;
  left: 16px;
  top: 14px;
  border-left: 8px solid var(--gs-accent);
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
}

.cycle-next {
  display: block;
  padding: 0 0 0 16px;
  font-size: 1.25rem;
  line-height: 1.3;
  font-weight: 800;
  color: var(--gs-accent);
}

.cycle-return {
  font-size: 0.85rem;
}

.cycle-svg {
  display: none;
}

.marker-head {
  fill: var(--gs-accent);
}

.cycle-arc {
  fill: none;
  stroke: var(--gs-accent);
  stroke-width: 2.5px;
  vector-effect: non-scaling-stroke;
  stroke-linecap: round;
}

@container (min-width: 480px) {
  .cycle-ring {
    aspect-ratio: 100 / 80;
    max-width: 640px;
    margin: 0 auto;
  }

  .cycle-ring .cycle-svg {
    display: block;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .cycle-ring .cycle-list {
    position: absolute;
    inset: 0;
    display: block;
    padding: 0;
  }

  .cycle-ring .cycle-list::before,
  .cycle-ring .cycle-list::after {
    display: none;
  }

  .cycle-ring .cycle-item {
    position: absolute;
    left: var(--x);
    top: var(--y);
    width: 30%;
    transform: translate(-50%, -50%);
  }

  .cycle-ring .cycle-next {
    display: none;
  }

  .cycle-ring .card {
    padding: 8px 10px;
  }

  .cycle-ring .card-detail {
    font-size: 0.78rem;
  }
}

/* --- Classification ----------------------------------------------- */
.tree {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card-root {
  justify-content: center;
  max-width: 340px;
  border-color: var(--gs-accent);
  background: var(--gs-accent);
  color: #fff;
  text-align: center;
}

.card-root .card-detail {
  color: rgba(255, 255, 255, 0.88);
}

.tree-stem {
  width: 2px;
  height: 16px;
  background: var(--gs-accent);
}

.branches {
  list-style: none;
  margin: 0;
  padding: 14px 0 0;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

@container (min-width: 440px) {
  .branches {
    border-top: 2px solid var(--gs-accent);
    border-radius: 8px 8px 0 0;
  }

  .branch::before {
    content: '';
    position: absolute;
    top: -14px;
    left: 50%;
    height: 14px;
    border-left: 2px solid var(--gs-accent);
  }
}

.branch {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.branch > .card {
  border-top: 4px solid var(--gs-accent);
}

.leaves {
  list-style: none;
  margin: 0 0 0 12px;
  padding: 0 0 0 10px;
  border-left: 2px solid var(--gs-line);
  display: grid;
  gap: 4px;
}

.leaf {
  display: flex;
  flex-direction: column;
  margin-left: calc(var(--depth, 0) * 12px);
  padding: 6px 10px;
  border-radius: 10px;
  background: var(--gs-card);
  font-size: 0.86rem;
}

.leaf.is-highlighted {
  background: var(--gs-highlight-soft);
  box-shadow: inset 0 0 0 2px var(--gs-highlight);
}

/* --- Comparaison -------------------------------------------------- */
.comparison {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}

@container (min-width: 440px) {
  .comparison {
    grid-template-columns: repeat(var(--columns, 2), minmax(0, 1fr));
  }
}

.column {
  overflow: hidden;
  border: 1px solid var(--gs-line);
  border-radius: 12px;
  background: var(--gs-card);
}

.column-title {
  margin: 0;
  padding: 8px 12px;
  font-size: 0.92rem;
  font-weight: 800;
  color: #fff;
  background: var(--gs-accent);
}

.column-1 .column-title {
  background: #ff7a45;
}

.column-2 .column-title {
  background: #6366f1;
}

.column-items {
  margin: 0;
  padding: 8px 12px 10px 28px;
  display: grid;
  gap: 4px;
  font-size: 0.87rem;
}

/* --- Structure légendée ------------------------------------------- */
.structure {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  padding: 12px;
  border: 2px solid var(--gs-accent);
  border-radius: 22px;
  background: var(--gs-accent-soft);
}

.zone {
  display: grid;
  gap: 8px;
  align-content: center;
}

@container (min-width: 520px) {
  .structure {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr) minmax(0, 1fr);
    grid-template-areas:
      'top top top'
      'left center right'
      'bottom bottom bottom';
  }

  .zone-top { grid-area: top; }
  .zone-left { grid-area: left; }
  .zone-center { grid-area: center; }
  .zone-right { grid-area: right; }
  .zone-bottom { grid-area: bottom; }
}

.zone-center .card {
  border: 2px solid var(--gs-accent);
}

/* --- Illustration ------------------------------------------------- */
.illustration-svg {
  display: block;
  width: 100%;
  max-width: 560px;
  height: auto;
  margin: 0 auto;
  border-radius: 12px;
  background: #fff;
}

.ill-shape {
  stroke-width: 1.6;
  vector-effect: non-scaling-stroke;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.ill-shape.is-line,
.ill-shape.no-fill {
  fill: none !important;
  stroke-width: 2.4;
}

.ill-shape.is-dashed {
  stroke-dasharray: 7 5;
}

.tone-organ { fill: #fbcfe0; stroke: #be185d; }
.tone-blood { fill: #fecaca; stroke: #b91c1c; }
.tone-air { fill: #e0f2fe; stroke: #0284c7; }
.tone-water { fill: #bfdbfe; stroke: #1d4ed8; }
.tone-plant { fill: #bbf7d0; stroke: #15803d; }
.tone-earth { fill: #ead7b7; stroke: #92400e; }
.tone-rock { fill: #d6d3d1; stroke: #57534e; }
.tone-bone { fill: #fdf6e3; stroke: #a8a29e; }
.tone-nerve { fill: #fef3a0; stroke: #a16207; }
.tone-cell { fill: #ede9fe; stroke: #7c3aed; }
.tone-energy { fill: #fed7aa; stroke: #ea580c; }
.tone-metal { fill: #e2e8f0; stroke: #475569; }
.tone-neutral { fill: #f1f5f9; stroke: #94a3b8; }
.tone-accent { fill: #ccfbf1; stroke: #0d9488; }
.tone-dark { fill: #475569; stroke: #1e293b; }

.badge-circle {
  fill: var(--gs-accent);
  stroke: #fff;
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

.badge.is-highlighted .badge-circle {
  fill: var(--gs-highlight);
}

.badge-dot {
  fill: #1e293b;
  stroke: #fff;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.badge-leader {
  fill: none;
  stroke: #1e293b;
  stroke-width: 1;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.badge-text {
  fill: #fff;
  font-weight: 800;
  font-family: inherit;
}

.legend {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
}

@container (min-width: 480px) {
  .legend {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.legend-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 10px;
  background: var(--gs-card);
}

.legend-item.is-highlighted {
  background: var(--gs-highlight-soft);
  box-shadow: inset 0 0 0 2px var(--gs-highlight);
}
</style>
