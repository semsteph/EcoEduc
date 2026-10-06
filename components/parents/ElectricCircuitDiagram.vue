<template>
  <figure class="circuit-diagram">
    <div class="diagram-header">
      <span class="diagram-badge">🔌</span>
      <span class="diagram-title">{{ diagram.title || 'Circuit électrique' }}</span>
    </div>

    <svg
      viewBox="0 0 480 320"
      preserveAspectRatio="xMidYMid meet"
      class="diagram-svg"
      role="img"
      :aria-label="ariaLabel"
    >
      <defs>
        <marker
          :id="arrowId"
          markerWidth="12"
          markerHeight="12"
          refX="6"
          refY="5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L10,5 L0,10 Z" class="current-head" />
        </marker>
      </defs>

      <!-- Fils : une boucle rectangulaire (circuit en série) -->
      <rect x="80" y="70" width="320" height="180" class="wire" />

      <!-- Fil coupé : on interrompt la boucle en bas à gauche -->
      <g v-if="diagram.brokenWire">
        <rect x="118" y="240" width="34" height="20" class="gap" />
        <path d="M122,244 L148,256 M148,244 L122,256" class="broken-mark" />
        <text x="135" y="282" text-anchor="middle" class="broken-label">fil coupé</text>
      </g>

      <!-- Pile, sur le côté gauche : grand trait = borne +, petit trait = borne − -->
      <rect x="66" y="142" width="28" height="36" class="gap" />
      <line x1="58" y1="150" x2="102" y2="150" class="plate-plus" />
      <line x1="68" y1="168" x2="92" y2="168" class="plate-minus" />
      <line x1="80" y1="142" x2="80" y2="150" class="wire-line" />
      <line x1="80" y1="168" x2="80" y2="178" class="wire-line" />
      <text x="110" y="148" class="terminal">+</text>
      <text x="110" y="176" class="terminal">−</text>
      <!-- Étiquette de la pile à l'intérieur de la boucle : à gauche,
           « Pile usée » sortait du cadre. -->
      <text x="128" y="165" text-anchor="start" class="component-label" :class="{ 'label-warning': batteryFlat }">{{ batteryLabel }}</text>

      <!-- Autres dipôles, placés le long de la boucle -->
      <g
        v-for="item in placed"
        :key="item.key"
        :transform="`translate(${item.x},${item.y}) rotate(${item.rotate})`"
      >
        <rect x="-30" y="-14" width="60" height="28" class="gap" />

        <!-- Lampe : cercle barré d'une croix -->
        <g v-if="item.kind === 'lamp'" :class="{ 'is-on': item.working }">
          <line x1="-30" y1="0" x2="-16" y2="0" class="wire-line" />
          <line x1="16" y1="0" x2="30" y2="0" class="wire-line" />
          <circle r="16" class="symbol" :class="{ 'lamp-on': item.working }" />
          <path d="M-11,-11 L11,11 M11,-11 L-11,11" class="symbol-line" />
          <!-- Lampe grillée : filament coupé -->
          <path v-if="item.broken" d="M-22,14 L-8,4 L-12,-2 L4,-12" class="broken-mark" />
          <g v-if="item.working" class="rays">
            <path d="M0,-22 L0,-30 M16,-16 L22,-22 M-16,-16 L-22,-22" />
          </g>
        </g>

        <!-- Interrupteur : trait incliné quand il est ouvert -->
        <g v-else-if="item.kind === 'switch'">
          <line x1="-30" y1="0" x2="-20" y2="0" class="wire-line" />
          <line x1="20" y1="0" x2="30" y2="0" class="wire-line" />
          <circle cx="-20" cy="0" r="3" class="contact" />
          <circle cx="20" cy="0" r="3" class="contact" />
          <line
            v-if="item.closed"
            x1="-20" y1="0" x2="20" y2="0"
            class="symbol-line"
          />
          <line
            v-else
            x1="-20" y1="0" x2="16" y2="-18"
            class="symbol-line"
          />
        </g>

        <!-- Moteur : cercle avec la lettre M -->
        <g v-else-if="item.kind === 'motor'">
          <line x1="-30" y1="0" x2="-16" y2="0" class="wire-line" />
          <line x1="16" y1="0" x2="30" y2="0" class="wire-line" />
          <circle r="16" class="symbol" :class="{ 'motor-on': item.working }" />
          <text
            x="0" y="6"
            text-anchor="middle"
            class="symbol-text"
            :transform="`rotate(${-item.rotate})`"
          >M</text>
        </g>

        <!-- DEL : triangle + barre, flèches de lumière si elle fonctionne -->
        <g v-else-if="item.kind === 'led'">
          <line x1="-30" y1="0" x2="-12" y2="0" class="wire-line" />
          <line x1="12" y1="0" x2="30" y2="0" class="wire-line" />
          <path d="M-12,-12 L-12,12 L10,0 Z" class="symbol" :class="{ 'led-on': item.working }" />
          <line x1="10" y1="-12" x2="10" y2="12" class="symbol-line" />
          <g v-if="item.working" class="rays">
            <path d="M2,-14 L10,-24 M8,-12 L16,-22" />
          </g>
        </g>
      </g>

      <!-- Exercice : l'état des récepteurs est à trouver par l'élève -->
      <g v-if="diagram.quiz">
        <text
          v-for="item in placed.filter((p) => ['lamp', 'motor', 'led'].includes(p.kind))"
          :key="'quiz-' + item.key"
          :x="item.x + 26"
          :y="item.rotate ? item.y - 20 : item.y - 20"
          class="quiz-mark"
        >?</text>
      </g>

      <!-- Étiquettes des dipôles (non tournées) -->
      <text
        v-for="item in placed"
        :key="'label-' + item.key"
        :x="item.labelX"
        :y="item.labelY"
        :text-anchor="item.anchor"
        class="component-label"
      >{{ item.label }}</text>

      <!-- Sens conventionnel du courant : de la borne + vers la borne −
           à l'extérieur de la pile (sens horaire sur ce schéma). -->
      <g v-if="diagram.showCurrent">
        <line x1="80" y1="118" x2="80" y2="100" class="current" :marker-end="`url(#${arrowId})`" />
        <line x1="130" y1="70" x2="146" y2="70" class="current" :marker-end="`url(#${arrowId})`" />
        <line x1="400" y1="206" x2="400" y2="222" class="current" :marker-end="`url(#${arrowId})`" />
        <line x1="350" y1="250" x2="334" y2="250" class="current" :marker-end="`url(#${arrowId})`" />
        <text x="92" y="236" class="current-label">sens du courant</text>
      </g>
    </svg>

    <!-- En exercice (quiz), l'état du circuit n'est pas affiché : c'est
         à l'élève de dire si la lampe s'allume. -->
    <figcaption
      v-if="typeof diagram.circuitClosed === 'boolean'"
      class="status"
      :class="anyWorking ? 'status-closed' : 'status-open'"
    >
      {{ statusText }}
    </figcaption>
    <p class="symbols-help">
      Symboles : pile (trait long et fin = borne +, trait court et épais = borne −)<span v-if="hasLamp">, lampe (cercle barré)</span><span v-if="hasSwitch">, interrupteur (trait incliné = ouvert, trait droit = fermé)</span><span v-if="hasMotor">, moteur (cercle avec M)</span><span v-if="hasLed">, DEL (triangle et barre)</span>.
    </p>
  </figure>
</template>

<script>
// Circuit électrique simple en série, dessiné avec les symboles normalisés.
//
// Le backend fournit la liste des dipôles et calcule lui-même si le
// circuit est fermé (circuitClosed) et si les récepteurs fonctionnent
// (working). Le composant ne fait que placer les dipôles sur la boucle.

// Emplacements sur la boucle (la pile occupe le côté gauche). La
// disposition dépend du nombre de dipôles pour que les étiquettes ne se
// chevauchent jamais : une seule étiquette par côté, sauf en haut où la
// seconde passe à l'intérieur de la boucle.
const TOP = { x: 240, y: 70, rotate: 0, labelX: 240, labelY: 42, anchor: 'middle' };
const TOP_LEFT = { x: 170, y: 70, rotate: 0, labelX: 170, labelY: 42, anchor: 'middle' };
const TOP_RIGHT = { x: 320, y: 70, rotate: 0, labelX: 320, labelY: 112, anchor: 'middle' };
const RIGHT = { x: 400, y: 160, rotate: 90, labelX: 380, labelY: 165, anchor: 'end' };
const BOTTOM = { x: 260, y: 250, rotate: 0, labelX: 260, labelY: 290, anchor: 'middle' };

const LAYOUTS = {
  1: [TOP],
  2: [TOP, RIGHT],
  3: [TOP, RIGHT, BOTTOM],
  4: [TOP_LEFT, TOP_RIGHT, RIGHT, BOTTOM],
};

let instanceCounter = 0;

export default {
  name: 'ElectricCircuitDiagram',

  props: {
    diagram: {
      type: Object,
      required: true,
    },
  },

  data() {
    instanceCounter += 1;
    return { arrowId: `circuit-arrow-${instanceCounter}` };
  },

  computed: {
    components() {
      return Array.isArray(this.diagram?.components) ? this.diagram.components : [];
    },

    batteryLabel() {
      return this.components.find((c) => c.kind === 'battery')?.label || 'Pile';
    },

    placed() {
      return this.components
        .filter((c) => c.kind !== 'battery')
        .slice(0, 4)
        .map((component, index, list) => ({
          ...component,
          ...LAYOUTS[list.length][index],
          key: `${component.kind}-${index}`,
        }));
    },

    batteryFlat() {
      return this.components.some((c) => c.kind === 'battery' && c.flat);
    },

    anyWorking() {
      return this.components.some((c) => c.working === true);
    },

    hasLamp() {
      return this.components.some((c) => c.kind === 'lamp');
    },

    hasSwitch() {
      return this.components.some((c) => c.kind === 'switch');
    },

    hasMotor() {
      return this.components.some((c) => c.kind === 'motor');
    },

    hasLed() {
      return this.components.some((c) => c.kind === 'led');
    },

    statusText() {
      const withArticle = { lamp: 'la lampe', motor: 'le moteur', led: 'la DEL' };
      const receivers = this.components
        .filter((c) => withArticle[c.kind])
        .map((c) => withArticle[c.kind]);
      const names = receivers.length > 1
        ? `${receivers.slice(0, -1).join(', ')} et ${receivers[receivers.length - 1]}`
        : receivers[0] || 'le récepteur';
      const plural = receivers.length > 1 ? 'nt' : '';

      if (this.diagram?.circuitClosed && this.batteryFlat) {
        return `Circuit fermé, mais la pile est usée : elle ne fournit plus assez d'énergie, donc ${names} ne fonctionne${plural} pas.`;
      }
      const brokenLamp = this.components.find((c) => c.kind === 'lamp' && c.broken);
      if (this.diagram?.circuitClosed && brokenLamp) {
        return "Circuit fermé, mais la lampe est grillée : son filament est coupé, elle ne peut pas s'allumer.";
      }
      if (this.diagram?.circuitClosed) {
        return `Circuit fermé : la boucle est complète, le courant circule et ${names} fonctionne${plural}.`;
      }
      if (this.diagram?.brokenWire) {
        return `Circuit ouvert : le fil est coupé, le courant ne circule plus et ${names} ne fonctionne${plural} pas.`;
      }
      return `Circuit ouvert : l'interrupteur ouvert coupe la boucle, le courant ne circule pas et ${names} ne fonctionne${plural} pas.`;
    },

    ariaLabel() {
      return `${this.diagram?.title || 'Circuit électrique'} : ${this.components.map((c) => c.label).join(', ')}`;
    },
  },
};
</script>

<style scoped>
.circuit-diagram {
  width: 100%;
  margin: 10px 0 0;
  padding: 10px 0 0;
  box-sizing: border-box;
  white-space: normal;
  border-top: 1px dashed rgba(124, 58, 237, 0.18);
}

.diagram-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.diagram-badge {
  font-size: 1rem;
  line-height: 1;
}

.diagram-title {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #7c3aed;
}

.diagram-svg {
  display: block;
  width: 100%;
  height: auto;
  max-height: 380px;
}

.wire {
  fill: none;
  stroke: #27273f;
  stroke-width: 3;
}

.wire-line {
  stroke: #27273f;
  stroke-width: 3;
}

.gap {
  fill: #fff;
  stroke: none;
}

.plate-plus {
  stroke: #27273f;
  stroke-width: 3;
}

.plate-minus {
  stroke: #27273f;
  stroke-width: 7;
}

.terminal {
  fill: #27273f;
  font-size: 20px;
  font-weight: 800;
}

.symbol {
  fill: #fff;
  stroke: #27273f;
  stroke-width: 3;
}

.symbol-line {
  stroke: #27273f;
  stroke-width: 3;
  stroke-linecap: round;
}

.symbol-text {
  fill: #27273f;
  font-size: 17px;
  font-weight: 800;
}

.contact {
  fill: #27273f;
}

.lamp-on,
.led-on {
  fill: #fde047;
}

.motor-on {
  fill: #bbf7d0;
}

.rays path {
  stroke: #f59e0b;
  stroke-width: 3;
  stroke-linecap: round;
}

.label-warning {
  fill: #b91c1c;
}

.quiz-mark {
  fill: #7c3aed;
  font-size: 22px;
  font-weight: 900;
}

.component-label {
  fill: #27273f;
  font-size: 18px;
  font-weight: 700;
}

.current {
  stroke: #dc2626;
  stroke-width: 3;
}

.current-head {
  fill: #dc2626;
}

.current-label {
  fill: #dc2626;
  font-size: 15px;
  font-weight: 700;
}

.broken-mark {
  stroke: #dc2626;
  stroke-width: 3;
}

.broken-label {
  fill: #dc2626;
  font-size: 15px;
  font-weight: 800;
}

.status {
  margin-top: 6px;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 700;
}

.status-closed {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}

.status-open {
  background: rgba(220, 38, 38, 0.1);
  color: #991b1b;
}

.symbols-help {
  margin: 6px 0 0;
  font-size: 0.8rem;
  color: #6b6b85;
}
</style>
