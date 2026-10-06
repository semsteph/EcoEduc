<template>
  <figure class="sport-field" :aria-label="diagram.title || 'Terrain'">
    <figcaption v-if="diagram.title" class="sf-title">
      <span class="sf-title-mark" aria-hidden="true"></span>
      {{ diagram.title }}
    </figcaption>

    <svg viewBox="0 0 400 240" class="sf-svg" role="img" :aria-label="diagram.title || 'Terrain'">
      <defs>
        <marker :id="arrowId" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" class="sf-arrow-head" />
        </marker>
      </defs>

      <rect x="0" y="0" width="400" height="240" :class="ground" />

      <!-- Tracés réglementaires, à l'échelle (voir les dimensions en commentaire) -->
      <g class="sf-lines">
        <template v-if="sport === 'basketball'">
          <!-- 28 m × 15 m -->
          <rect :x="L" :y="T" :width="FW" :height="FH" />
          <line :x1="cx" :y1="T" :x2="cx" :y2="T + FH" />
          <circle :cx="cx" :cy="cy" :r="mx(1.8, 28)" />
          <rect :x="L" :y="cy - my(2.45, 15)" :width="mx(5.8, 28)" :height="my(4.9, 15)" :class="zone('raquette')" />
          <rect :x="L + FW - mx(5.8, 28)" :y="cy - my(2.45, 15)" :width="mx(5.8, 28)" :height="my(4.9, 15)" :class="zone('raquette')" />
          <path :d="threePoint(1)" />
          <path :d="threePoint(-1)" />
          <circle :cx="L + mx(1.575, 28)" :cy="cy" r="4" class="sf-hoop" />
          <circle :cx="L + FW - mx(1.575, 28)" :cy="cy" r="4" class="sf-hoop" />
        </template>

        <template v-else-if="sport === 'volleyball'">
          <!-- 18 m × 9 m, filet au milieu, lignes d'attaque à 3 m du filet -->
          <rect :x="L" :y="T" :width="FW" :height="FH" />
          <rect :x="cx - mx(3, 18)" :y="T" :width="mx(6, 18)" :height="FH" :class="zone('ligne-3m')" />
          <line :x1="cx - mx(3, 18)" :y1="T" :x2="cx - mx(3, 18)" :y2="T + FH" />
          <line :x1="cx + mx(3, 18)" :y1="T" :x2="cx + mx(3, 18)" :y2="T + FH" />
          <line :x1="cx" :y1="T - 8" :x2="cx" :y2="T + FH + 8" class="sf-net" />
          <text :x="cx" :y="T - 10" text-anchor="middle" class="sf-mark">filet</text>
        </template>

        <template v-else-if="sport === 'handball'">
          <!-- 40 m × 20 m, zone de but : arcs de 6 m, ligne des 9 m pointillée, jet de 7 m -->
          <rect :x="L" :y="T" :width="FW" :height="FH" />
          <line :x1="cx" :y1="T" :x2="cx" :y2="T + FH" />
          <path :d="goalArea(1, 6)" :class="zone('zone-6m')" />
          <path :d="goalArea(-1, 6)" :class="zone('zone-6m')" />
          <path :d="goalArea(1, 9)" class="sf-dashed" />
          <path :d="goalArea(-1, 9)" class="sf-dashed" />
          <line :x1="L + mx(7, 40)" :y1="cy - 5" :x2="L + mx(7, 40)" :y2="cy + 5" class="sf-thick" />
          <line :x1="L + FW - mx(7, 40)" :y1="cy - 5" :x2="L + FW - mx(7, 40)" :y2="cy + 5" class="sf-thick" />
          <text :x="L + mx(7, 40)" :y="cy - 9" text-anchor="middle" class="sf-mark">7 m</text>
          <text :x="L + mx(3, 40)" :y="T + 14" text-anchor="middle" class="sf-mark">6 m</text>
          <text :x="L + mx(10.5, 40)" :y="T + 14" text-anchor="middle" class="sf-mark">9 m</text>
        </template>

        <template v-else-if="sport === 'football'">
          <!-- 105 m × 68 m -->
          <rect :x="L" :y="T" :width="FW" :height="FH" />
          <line :x1="cx" :y1="T" :x2="cx" :y2="T + FH" />
          <circle :cx="cx" :cy="cy" :r="mx(9.15, 105)" />
          <rect :x="L" :y="cy - my(20.15, 68)" :width="mx(16.5, 105)" :height="my(40.3, 68)" :class="zone('surface')" />
          <rect :x="L + FW - mx(16.5, 105)" :y="cy - my(20.15, 68)" :width="mx(16.5, 105)" :height="my(40.3, 68)" :class="zone('surface')" />
          <rect :x="L" :y="cy - my(9.15, 68)" :width="mx(5.5, 105)" :height="my(18.3, 68)" />
          <rect :x="L + FW - mx(5.5, 105)" :y="cy - my(9.15, 68)" :width="mx(5.5, 105)" :height="my(18.3, 68)" />
          <circle :cx="L + mx(11, 105)" :cy="cy" r="2" class="sf-dot" />
          <circle :cx="L + FW - mx(11, 105)" :cy="cy" r="2" class="sf-dot" />
        </template>

        <template v-else-if="sport === 'relais'">
          <!-- Ligne droite de piste : 4 couloirs, zone de transmission de 30 m -->
          <rect :x="cx - 54" :y="T" width="108" :height="FH" :class="zone('zone-passage')" class="sf-zone-relais" />
          <line v-for="k in 5" :key="k" :x1="L" :y1="T + (k - 1) * (FH / 4)" :x2="L + FW" :y2="T + (k - 1) * (FH / 4)" />
          <line :x1="cx - 54" :y1="T" :x2="cx - 54" :y2="T + FH" class="sf-thick" />
          <line :x1="cx + 54" :y1="T" :x2="cx + 54" :y2="T + FH" class="sf-thick" />
          <text :x="cx" :y="T - 6" text-anchor="middle" class="sf-mark">zone de transmission (30 m)</text>
          <text v-for="k in 4" :key="'c' + k" :x="L + 8" :y="T + (k - 0.5) * (FH / 4) + 4" class="sf-mark">{{ k }}</text>
        </template>

        <template v-else-if="sport === 'saut-longueur'">
          <!-- Piste d'élan, planche d'appel, ligne de mordu, sautoir -->
          <rect :x="L" :y="cy - 18" :width="FW * 0.62" height="36" class="sf-runway" />
          <rect :x="L + FW * 0.62 - 10" :y="cy - 18" width="10" height="36" :class="zone('planche')" class="sf-board" />
          <line :x1="L + FW * 0.62" :y1="cy - 22" :x2="L + FW * 0.62" :y2="cy + 22" class="sf-foul" />
          <rect :x="L + FW * 0.68" :y="cy - 40" :width="FW * 0.32" height="80" class="sf-sand" />
          <text :x="L + FW * 0.3" :y="cy + 34" text-anchor="middle" class="sf-mark">piste d'élan</text>
          <text :x="L + FW * 0.62 - 5" :y="cy - 28" text-anchor="middle" class="sf-mark">planche</text>
          <text :x="L + FW * 0.62 + 2" :y="cy + 34" class="sf-mark sf-red">ligne de mordu</text>
          <text :x="L + FW * 0.84" :y="cy + 54" text-anchor="middle" class="sf-mark">sautoir (sable)</text>
        </template>
      </g>

      <!-- Déplacements (trait plein) et passes (pointillés) -->
      <line
        v-for="(a, i) in diagram.arrows"
        :key="'ar' + i"
        :x1="px(a.from[0])" :y1="py(a.from[1])" :x2="px(a.to[0])" :y2="py(a.to[1])"
        class="sf-move"
        :class="{ 'sf-pass': a.kind === 'pass' }"
        :marker-end="`url(#${arrowId})`"
      />
      <text
        v-for="(a, i) in diagram.arrows"
        v-show="a.label"
        :key="'arl' + i"
        :x="(px(a.from[0]) + px(a.to[0])) / 2"
        :y="(py(a.from[1]) + py(a.to[1])) / 2 - 6"
        text-anchor="middle"
        class="sf-note"
      >{{ a.label }}</text>

      <!-- Joueurs -->
      <g v-for="(p, i) in diagram.players" :key="'pl' + i">
        <circle :cx="px(p.x)" :cy="py(p.y)" r="10" class="sf-player" :class="[p.team === 'b' ? 'sf-team-b' : 'sf-team-a', { 'sf-hl': p.highlight }]" />
        <text :x="px(p.x)" :y="py(p.y) + 4" text-anchor="middle" class="sf-player-label">{{ p.label }}</text>
      </g>

      <text v-for="(l, i) in diagram.labels" :key="'lb' + i" :x="px(l.x)" :y="py(l.y)" text-anchor="middle" class="sf-note">{{ l.text }}</text>
    </svg>
  </figure>
</template>

<script>
// Terrain de sport dessiné à l'échelle par le système (server-lib/tutor-field.cjs) ;
// joueurs et déplacements placés en % de la longueur (x) et de la largeur (y).
let counter = 0;

export default {
  name: 'SportField',

  props: {
    diagram: { type: Object, required: true },
  },

  data() {
    counter += 1;
    return { arrowId: `sf-arrow-${counter}`, L: 20, T: 22, FW: 360, FH: 196 };
  },

  computed: {
    sport() { return this.diagram.sport; },
    cx() { return this.L + this.FW / 2; },
    cy() { return this.T + this.FH / 2; },
    ground() {
      return ['relais', 'saut-longueur'].includes(this.sport) ? 'sf-ground sf-track' : this.sport === 'football' ? 'sf-ground sf-grass' : 'sf-ground sf-court';
    },
  },

  methods: {
    mx(m, length) { return (m / length) * this.FW; },
    my(m, width) { return (m / width) * this.FH; },
    px(x) { return this.L + (x / 100) * this.FW; },
    py(y) { return this.T + (y / 100) * this.FH; },
    zone(name) { return this.diagram.highlightZone === name ? 'sf-zone-hl' : 'sf-zone'; },
    // Ligne à 3 points (6,75 m) du basket, côté gauche (side = 1) ou droit (-1).
    threePoint(side) {
      const r = this.mx(6.75, 28);
      const hoopX = side === 1 ? this.L + this.mx(1.575, 28) : this.L + this.FW - this.mx(1.575, 28);
      const dy = Math.min(r, this.my(6.6, 15));
      const dx = Math.sqrt(Math.max(r * r - dy * dy, 0));
      return `M${hoopX + side * dx},${this.cy - dy} A${r},${r} 0 0 ${side === 1 ? 1 : 0} ${hoopX + side * dx},${this.cy + dy}`;
    },
    // Zone de but du hand (rayon 6 m, ou 9 m) autour des poteaux (but de 3 m).
    goalArea(side, meters) {
      const r = this.mx(meters, 40);
      const post = this.my(1.5, 20);
      const x0 = side === 1 ? this.L : this.L + this.FW;
      const top = Math.max(this.T, this.cy - post - r);
      const bottom = Math.min(this.T + this.FH, this.cy + post + r);
      return `M${x0},${top} A${r},${r} 0 0 ${side === 1 ? 1 : 0} ${x0 + side * r},${this.cy - post} L${x0 + side * r},${this.cy + post} A${r},${r} 0 0 ${side === 1 ? 1 : 0} ${x0},${bottom}`;
    },
  },
};
</script>

<style scoped>
.sport-field {
  width: 100%;
  margin: 10px 0;
  padding: 10px;
  box-sizing: border-box;
  border-radius: 10px;
  background: #f7fafa;
}

.sf-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  font-size: 0.92rem;
  font-weight: 800;
  color: #0f766e;
}

.sf-title-mark { width: 5px; height: 16px; border-radius: 3px; background: #0d9488; }

.sf-svg { display: block; width: 100%; max-width: 560px; height: auto; margin: 0 auto; border-radius: 8px; }

.sf-court { fill: #e9c99a; }
.sf-grass { fill: #6fbf73; }
.sf-track { fill: #c8553d; }
.sf-lines rect, .sf-lines circle, .sf-lines path, .sf-lines line { fill: none; stroke: #fff; stroke-width: 2; }
.sf-zone { fill: rgba(255, 255, 255, 0.12) !important; }
.sf-zone-hl { fill: rgba(25, 118, 210, 0.45) !important; }
.sf-zone-relais { stroke: none !important; }
.sf-dashed { stroke-dasharray: 6 4; }
.sf-thick { stroke-width: 3 !important; }
.sf-net { stroke: #263238 !important; stroke-width: 4 !important; }
.sf-hoop { stroke: #ea580c !important; }
.sf-dot { fill: #fff !important; }
.sf-runway { fill: #8d3b2b !important; }
.sf-board { fill: #fff !important; }
.sf-foul { stroke: #d32f2f !important; stroke-width: 3 !important; }
.sf-sand { fill: #f3dfa2 !important; stroke: #fff; }
.sf-mark { font-size: 12px; font-weight: 700; fill: #fff; paint-order: stroke; stroke: rgba(0, 0, 0, 0.35); stroke-width: 2px; }
.sf-red { fill: #ffcdd2; }
.sf-arrow-head { fill: #0b2e4a; }
.sf-move { stroke: #0b2e4a; stroke-width: 2.2; }
.sf-pass { stroke-dasharray: 5 4; }
.sf-player { stroke: #fff; stroke-width: 2; }
.sf-team-a { fill: #1976d2; }
.sf-team-b { fill: #d32f2f; }
.sf-hl { stroke: #ffeb3b; stroke-width: 3; }
.sf-player-label { font-size: 11px; font-weight: 800; fill: #fff; }
.sf-note { font-size: 12px; font-weight: 800; fill: #0b2e4a; paint-order: stroke; stroke: #fff; stroke-width: 3px; }
</style>
