<template>
  <figure class="math-graph" :aria-label="diagram.title || 'Graphique'">
    <figcaption v-if="diagram.title" class="mg-title">
      <span class="mg-title-mark" aria-hidden="true"></span>
      {{ diagram.title }}
    </figcaption>

    <svg :viewBox="`0 0 ${W} ${H}`" class="mg-svg" role="img" :aria-label="diagram.title || 'Graphique'">
      <defs>
        <marker :id="arrowId" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" class="mg-arrow-head" />
        </marker>
        <marker :id="arrowHlId" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" class="mg-arrow-head mg-hl" />
        </marker>
        <clipPath :id="clipId">
          <rect :x="P" :y="P" :width="W - 2 * P" :height="H - 2 * P" />
        </clipPath>
      </defs>

      <!-- Quadrillage et graduations -->
      <g v-if="diagram.grid" class="mg-grid">
        <line v-for="t in xTicks" :key="'gx' + t" :x1="sx(t)" :x2="sx(t)" :y1="P" :y2="H - P" />
        <line v-for="t in yTicks" :key="'gy' + t" :x1="P" :x2="W - P" :y1="sy(t)" :y2="sy(t)" />
      </g>

      <g v-if="diagram.axes" class="mg-axes">
        <line :x1="P" :x2="W - P" :y1="axisY" :y2="axisY" :marker-end="`url(#${arrowId})`" />
        <line :x1="axisX" :x2="axisX" :y1="H - P" :y2="P" :marker-end="`url(#${arrowId})`" />
        <text :x="W - P" :y="axisY - 6" text-anchor="end" class="mg-axis-label">{{ diagram.xLabel }}</text>
        <text :x="axisX + 6" :y="P + 10" class="mg-axis-label">{{ diagram.yLabel }}</text>
        <g class="mg-ticks">
          <text v-for="t in xTicks" :key="'tx' + t" :x="sx(t)" :y="axisY + 14" text-anchor="middle">{{ fmt(t) }}</text>
          <text v-for="t in yTicks" :key="'ty' + t" :x="axisX - 5" :y="sy(t) + 4" text-anchor="end">{{ fmt(t) }}</text>
        </g>
      </g>

      <g :clip-path="`url(#${clipId})`">
        <!-- Aires sous la courbe -->
        <polygon v-for="(a, i) in diagram.areas" :key="'area' + i" :points="poly(a.polygon)" class="mg-area" />

        <!-- Asymptotes et droites remarquables -->
        <line
          v-for="(l, i) in diagram.lines"
          :key="'line' + i"
          v-bind="l.x !== undefined ? { x1: sx(l.x), x2: sx(l.x), y1: P, y2: H - P } : { x1: P, x2: W - P, y1: sy(l.y), y2: sy(l.y) }"
          class="mg-dashed"
        />

        <!-- Cercles (cercle trigonométrique...) -->
        <ellipse
          v-for="(c, i) in diagram.circles"
          :key="'circle' + i"
          :cx="sx(c.center[0])"
          :cy="sy(c.center[1])"
          :rx="Math.abs(sx(c.center[0] + c.r) - sx(c.center[0]))"
          :ry="Math.abs(sy(c.center[1] + c.r) - sy(c.center[1]))"
          class="mg-circle"
        />

        <!-- Fonctions et courbes de mesures -->
        <path v-for="(f, i) in diagram.functions" :key="'fn' + i" :d="fnPath(f.samples)" class="mg-curve" :class="'mg-c' + (i % 3)" />
        <path v-for="(c, i) in diagram.curves" :key="'cv' + i" :d="smoothPath(c.points)" class="mg-curve" :class="'mg-c' + ((i + diagram.functions.length) % 3)" />

        <!-- Tangentes : calculées par le serveur, elles touchent la courbe -->
        <line
          v-for="(t, i) in diagram.tangents"
          :key="'tg' + i"
          :x1="sx(tangentX(t, -1))"
          :y1="sy(t.y0 + t.slope * (tangentX(t, -1) - t.x0))"
          :x2="sx(tangentX(t, 1))"
          :y2="sy(t.y0 + t.slope * (tangentX(t, 1) - t.x0))"
          class="mg-tangent"
        />

        <!-- Segments -->
        <line
          v-for="(s, i) in diagram.segments"
          :key="'sg' + i"
          :x1="sx(s.from[0])" :y1="sy(s.from[1])" :x2="sx(s.to[0])" :y2="sy(s.to[1])"
          class="mg-segment"
          :class="{ 'mg-dashed': s.dashed }"
          :marker-end="s.arrow ? `url(#${arrowId})` : null"
        />

        <!-- Vecteurs / forces -->
        <line
          v-for="(v, i) in diagram.vectors"
          :key="'vc' + i"
          :x1="sx(v.from[0])" :y1="sy(v.from[1])" :x2="sx(v.to[0])" :y2="sy(v.to[1])"
          class="mg-vector"
          :class="{ 'mg-hl': v.highlight }"
          :marker-end="`url(#${v.highlight ? arrowHlId : arrowId})`"
        />

        <!-- Angles -->
        <path v-for="(a, i) in diagram.angles" :key="'ang' + i" :d="arc(a)" class="mg-angle" />

        <!-- Repères en pointillés vers les axes -->
        <g v-for="(p, i) in diagram.points" :key="'gd' + i">
          <template v-if="p.guides">
            <line :x1="sx(p.x)" :y1="sy(p.y)" :x2="sx(p.x)" :y2="axisY" class="mg-guide" />
            <line :x1="sx(p.x)" :y1="sy(p.y)" :x2="axisX" :y2="sy(p.y)" class="mg-guide" />
          </template>
        </g>
      </g>

      <!-- Étiquettes (hors découpe, lisibles) -->
      <g class="mg-labels">
        <g v-for="(p, i) in diagram.points" :key="'pt' + i">
          <circle :cx="sx(p.x)" :cy="sy(p.y)" r="3.6" class="mg-point" />
          <!-- Près du bord droit, l'étiquette passe à gauche du point. -->
          <text
            v-if="p.label"
            :x="sx(p.x) > W - 90 ? sx(p.x) - 7 : sx(p.x) + 7"
            :y="sy(p.y) < P + 14 ? sy(p.y) + 16 : sy(p.y) - 7"
            :text-anchor="sx(p.x) > W - 90 ? 'end' : 'start'"
            class="mg-point-label"
          >{{ p.label }}</text>
        </g>
        <text v-for="(v, i) in diagram.vectors" :key="'vl' + i" v-show="v.label" :x="mid(v).x" :y="mid(v).y" class="mg-vec-label" :class="{ 'mg-hl-text': v.highlight }">{{ v.label }}</text>
        <text v-for="(s, i) in diagram.segments" :key="'sl' + i" v-show="s.label" :x="mid(s).x" :y="mid(s).y" class="mg-seg-label">{{ s.label }}</text>
        <text v-for="(a, i) in diagram.angles" :key="'al' + i" v-show="a.label" :x="arcLabel(a).x" :y="arcLabel(a).y" class="mg-angle-label" text-anchor="middle">{{ a.label }}</text>
      </g>
    </svg>

    <!-- Légende des courbes, tangentes, aires et droites -->
    <ul v-if="legend.length" class="mg-legend">
      <li v-for="(item, i) in legend" :key="i">
        <span class="mg-swatch" :class="item.cls"></span>{{ item.label }}
      </li>
    </ul>
  </figure>
</template>

<script>
// Rendu du graphique mathématique (type « graph »), toutes positions
// calculées par le serveur (server-lib/tutor-graph.cjs).
let counter = 0;

function niceStep(span, target = 6) {
  const raw = span / target;
  const power = 10 ** Math.floor(Math.log10(raw));
  const n = raw / power;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * power;
}

export default {
  name: 'MathGraph',

  props: {
    diagram: { type: Object, required: true },
  },

  data() {
    counter += 1;
    return {
      W: 400,
      H: 300,
      P: 26,
      arrowId: `mg-arrow-${counter}`,
      arrowHlId: `mg-arrow-hl-${counter}`,
      clipId: `mg-clip-${counter}`,
    };
  },

  computed: {
    box() {
      let { xMin, xMax, yMin, yMax } = this.diagram.bounds || { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
      // Même échelle sur les deux axes (vecteurs, angles, cercles).
      if (this.diagram.equalScale) {
        const sxScale = (this.W - 2 * this.P) / (xMax - xMin);
        const syScale = (this.H - 2 * this.P) / (yMax - yMin);
        const scale = Math.min(sxScale, syScale);
        const cx = (xMin + xMax) / 2;
        const cy = (yMin + yMax) / 2;
        const hw = (this.W - 2 * this.P) / scale / 2;
        const hh = (this.H - 2 * this.P) / scale / 2;
        xMin = cx - hw; xMax = cx + hw; yMin = cy - hh; yMax = cy + hh;
      }
      return { xMin, xMax, yMin, yMax };
    },
    xTicks() { return this.ticks(this.box.xMin, this.box.xMax); },
    yTicks() { return this.ticks(this.box.yMin, this.box.yMax); },
    axisY() { return this.sy(Math.min(Math.max(0, this.box.yMin), this.box.yMax)); },
    axisX() { return this.sx(Math.min(Math.max(0, this.box.xMin), this.box.xMax)); },
    legend() {
      const items = [];
      this.diagram.functions.forEach((f, i) => f.label && items.push({ label: f.label, cls: `mg-c${i % 3}` }));
      this.diagram.curves.forEach((c, i) => c.label && items.push({ label: c.label, cls: `mg-c${(i + this.diagram.functions.length) % 3}` }));
      this.diagram.tangents.forEach((t) => t.label && items.push({ label: t.label, cls: 'mg-sw-tangent' }));
      this.diagram.areas.forEach((a) => a.label && items.push({ label: a.label, cls: 'mg-sw-area' }));
      this.diagram.lines.forEach((l) => l.label && items.push({ label: l.label, cls: 'mg-sw-dashed' }));
      this.diagram.circles.forEach((c) => c.label && items.push({ label: c.label, cls: 'mg-sw-circle' }));
      return items;
    },
  },

  methods: {
    sx(x) { return this.P + ((x - this.box.xMin) / (this.box.xMax - this.box.xMin)) * (this.W - 2 * this.P); },
    sy(y) { return this.H - this.P - ((y - this.box.yMin) / (this.box.yMax - this.box.yMin)) * (this.H - 2 * this.P); },
    ticks(min, max) {
      const step = niceStep(max - min);
      const out = [];
      for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) {
        if (Math.abs(t) > 1e-9) out.push(Math.round(t * 1e6) / 1e6);
        if (out.length > 14) break;
      }
      return out;
    },
    fmt(t) { return String(Math.round(t * 1000) / 1000).replace('.', ','); },
    poly(points) { return points.map(([x, y]) => `${this.sx(x)},${this.sy(y)}`).join(' '); },
    fnPath(samples) {
      let d = '';
      let pen = false;
      const yLimit = (this.box.yMax - this.box.yMin) * 3;
      samples.forEach((p) => {
        if (!p || Math.abs(p[1]) > Math.abs(this.box.yMax) + yLimit) { pen = false; return; }
        d += `${pen ? 'L' : 'M'}${this.sx(p[0]).toFixed(1)},${this.sy(p[1]).toFixed(1)} `;
        pen = true;
      });
      return d;
    },
    smoothPath(points) {
      const p = points.map(([x, y]) => [this.sx(x), this.sy(y)]);
      if (p.length < 3) return `M${p.map((q) => q.join(',')).join(' L')}`;
      let d = `M${p[0][0]},${p[0][1]}`;
      for (let i = 0; i < p.length - 1; i += 1) {
        const p0 = p[i - 1] || p[i];
        const p1 = p[i];
        const p2 = p[i + 1];
        const p3 = p[i + 2] || p2;
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
      }
      return d;
    },
    tangentX(t, side) {
      const span = (this.box.xMax - this.box.xMin) * 0.28;
      return t.x0 + side * span;
    },
    mid(item) {
      const x = (this.sx(item.from[0]) + this.sx(item.to[0])) / 2;
      const y = (this.sy(item.from[1]) + this.sy(item.to[1])) / 2;
      // Décalé perpendiculairement au segment pour ne pas le recouvrir.
      const dx = this.sx(item.to[0]) - this.sx(item.from[0]);
      const dy = this.sy(item.to[1]) - this.sy(item.from[1]);
      const len = Math.hypot(dx, dy) || 1;
      return { x: x - (dy / len) * 10, y: y + (dx / len) * 10 };
    },
    arc(a) {
      const r = 22;
      const cx = this.sx(a.at[0]);
      const cy = this.sy(a.at[1]);
      const x1 = cx + r * Math.cos(a.a1);
      const y1 = cy - r * Math.sin(a.a1);
      const x2 = cx + r * Math.cos(a.a2);
      const y2 = cy - r * Math.sin(a.a2);
      let delta = a.a2 - a.a1;
      while (delta < 0) delta += 2 * Math.PI;
      const large = delta > Math.PI ? 1 : 0;
      return `M${x1},${y1} A${r},${r} 0 ${large} 0 ${x2},${y2}`;
    },
    arcLabel(a) {
      let delta = a.a2 - a.a1;
      while (delta < 0) delta += 2 * Math.PI;
      const m = a.a1 + delta / 2;
      return { x: this.sx(a.at[0]) + 36 * Math.cos(m), y: this.sy(a.at[1]) - 36 * Math.sin(m) + 4 };
    },
  },
};
</script>

<style scoped>
.math-graph {
  width: 100%;
  margin: 10px 0;
  padding: 10px;
  box-sizing: border-box;
  border-radius: 10px;
  background: #f7fafa;
}

.mg-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  font-size: 0.92rem;
  font-weight: 800;
  color: #0f766e;
}

.mg-title-mark {
  width: 5px;
  height: 16px;
  border-radius: 3px;
  background: #0d9488;
}

.mg-svg {
  display: block;
  width: 100%;
  max-width: 520px;
  height: auto;
  margin: 0 auto;
  border-radius: 8px;
  background: #fff;
}

.mg-grid line { stroke: #e3eaf0; stroke-width: 1; }
.mg-axes line { stroke: #37474f; stroke-width: 1.4; }
.mg-axis-label { font-size: 12px; font-weight: 700; fill: #37474f; }
.mg-ticks text { font-size: 10px; fill: #607d8b; }
.mg-arrow-head { fill: #37474f; }
.mg-arrow-head.mg-hl { fill: #ea580c; }

.mg-curve { fill: none; stroke-width: 2.4; stroke-linejoin: round; stroke-linecap: round; }
.mg-c0 { stroke: #1976d2; background: #1976d2; }
.mg-c1 { stroke: #0d9488; background: #0d9488; }
.mg-c2 { stroke: #7c3aed; background: #7c3aed; }

.mg-area { fill: rgba(25, 118, 210, 0.18); stroke: none; }
.mg-tangent { stroke: #ea580c; stroke-width: 2; }
.mg-dashed { stroke: #90a4ae; stroke-width: 1.5; stroke-dasharray: 6 4; }
.mg-circle { fill: none; stroke: #607d8b; stroke-width: 1.5; }
.mg-segment { stroke: #37474f; stroke-width: 2; }
.mg-vector { stroke: #0b2e4a; stroke-width: 2.4; }
.mg-vector.mg-hl { stroke: #ea580c; }
.mg-angle { fill: none; stroke: #ea580c; stroke-width: 1.6; }
.mg-guide { stroke: #90a4ae; stroke-width: 1; stroke-dasharray: 3 3; }

.mg-point { fill: #ea580c; stroke: #fff; stroke-width: 1.4; }
.mg-point-label, .mg-vec-label, .mg-seg-label, .mg-angle-label {
  font-size: 12px;
  font-weight: 800;
  fill: #0b2e4a;
  paint-order: stroke;
  stroke: #fff;
  stroke-width: 3px;
}
.mg-hl-text { fill: #ea580c; }
.mg-angle-label { fill: #ea580c; }

.mg-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.82rem;
  color: #37474f;
}

.mg-legend li { display: inline-flex; align-items: center; gap: 6px; }
.mg-swatch { display: inline-block; width: 18px; height: 3px; border-radius: 2px; }
.mg-sw-tangent { background: #ea580c; }
.mg-sw-area { height: 10px; background: rgba(25, 118, 210, 0.25); }
.mg-sw-dashed { background: repeating-linear-gradient(90deg, #90a4ae 0 5px, transparent 5px 8px); }
.mg-sw-circle { height: 10px; width: 10px; border-radius: 50%; border: 2px solid #607d8b; }
</style>
