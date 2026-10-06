// Vérifie que les visuels transmis par le backend sont RÉELLEMENT rendus
// (HTML/SVG) par les composants Vue (et pas seulement acceptés en JSON).
require('./helpers/vue-sfc-loader.cjs');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createSSRApp, h } = require('vue');
const { renderToString } = require('vue/server-renderer');
const { resolveRequestedVisual, sanitiseRegisteredVisual } = require('../server-lib/tutor-visuals.cjs');

const TutorVisual = require(path.join(__dirname, '../components/parents/TutorVisual.vue')).default;
// Le chat se compile aussi : imports et template valides.
require(path.join(__dirname, '../components/parents/ChatWithAssistant.vue'));

async function render(diagram) {
  const app = createSSRApp({ render: () => h(TutorVisual, { diagram }) });
  return renderToString(app);
}

(async () => {
  // Schéma générique : même composant pour toutes les notions. Passage par
  // JSON : c'est exactement ce que reçoit le navigateur (réponse API ou
  // historique relu en base après un reload).
  const viaJson = (value) => render(JSON.parse(JSON.stringify(sanitiseRegisteredVisual(value))));

  const flow = await viaJson({
    type: 'schema', form: 'flow', title: 'Trajet des aliments',
    nodes: [
      { id: 'bouche', label: 'Bouche', detail: 'les dents broient' },
      { id: 'estomac', label: 'Estomac', detail: 'brasse', highlight: true },
      { id: 'intestin', label: 'Intestin grêle', detail: 'absorbe les nutriments' },
      { id: 'foie', label: 'Foie', detail: 'produit la bile', attachTo: 'intestin' },
    ],
    links: [{ from: 'bouche', to: 'estomac', label: 'par l’œsophage' }],
  });
  assert.match(flow, /class="generic-schema form-flow[ "]/);
  assert.match(flow, /Trajet des aliments/);
  for (const label of ['Bouche', 'Estomac', 'Intestin grêle', 'Foie', 'les dents broient', 'par l’œsophage']) {
    assert.ok(flow.includes(label), `trajet : ${label} absent`);
  }
  assert.equal((flow.match(/class="flow-arrow"/g) || []).length, 2, 'une flèche entre chaque étape');
  assert.match(flow, /card card-side/);
  assert.match(flow, /card is-highlighted/);

  const cycle = await viaJson({ type: 'schema', form: 'cycle', title: "Le cycle de l'eau", nodes: [{ label: 'Évaporation' }, { label: 'Condensation' }, { label: 'Précipitations' }, { label: 'Ruissellement' }] });
  assert.match(cycle, /cycle-ring/);
  assert.equal((cycle.match(/class="cycle-arc"/g) || []).length, 4);
  assert.match(cycle, /retour à l’étape 1/);

  const tree = await viaJson({ type: 'schema', form: 'hierarchy', nodes: [{ id: 'v', label: 'Vertébrés' }, { id: 'm', label: 'Mammifères', parent: 'v' }, { id: 'c', label: 'Chat', parent: 'm' }, { id: 'o', label: 'Oiseaux', parent: 'v' }] });
  assert.match(tree, /card card-root/);
  assert.equal((tree.match(/class="branch"/g) || []).length, 2);
  assert.match(tree, /class="leaf"[^>]*>.*Chat/s);

  const comparison = await viaJson({ type: 'schema', form: 'comparison', columns: [{ title: 'Inspiration', items: ['le diaphragme descend'] }, { title: 'Expiration', items: ['le diaphragme remonte'] }] });
  assert.equal((comparison.match(/class="column-title"/g) || []).length, 2);
  assert.match(comparison, /le diaphragme remonte/);

  const structure = await viaJson({ type: 'schema', form: 'structure', title: 'La cellule', nodes: [{ label: 'Membrane', zone: 'top' }, { label: 'Noyau', zone: 'center' }] });
  assert.match(structure, /zone zone-top/);
  assert.match(structure, /zone zone-center/);

  const cell = {
    type: 'schema', form: 'illustration', title: 'Cellule animale',
    shapes: [
      { kind: 'ellipse', cx: 200, cy: 150, rx: 170, ry: 120, tone: 'cell' },
      { kind: 'circle', cx: 210, cy: 140, r: 35, tone: 'nerve' },
      { kind: 'line', x1: 20, y1: 20, x2: 80, y2: 20, tone: 'accent', arrow: true },
    ],
    nodes: [
      { label: 'Membrane', detail: 'limite la cellule', at: { x: 40, y: 150 } },
      { label: 'Noyau', detail: 'contient l’information génétique', at: { x: 210, y: 140 }, highlight: true },
      { label: 'Cytoplasme', at: { x: 215, y: 150 } },
    ],
  };
  const drawing = await viaJson(cell);
  // Cadré sur le dessin, avec une marge à gauche et à droite pour les numéros.
  const box = drawing.match(/<svg viewBox="([^"]+)" class="illustration-svg"/)[1].split(' ').map(Number);
  assert.ok(box[0] < 20 && box[0] + box[2] > 380, 'marges des numéros de part et d\'autre du dessin');
  // Numéros dans les marges, hors du dessin.
  const badgeX = [...drawing.matchAll(/<circle cx="(-?[\d.]+)" cy="[\d.]+" r="[\d.]+" class="badge-circle"/g)].map((m) => Number(m[1]));
  assert.ok(badgeX.every((x) => x < 30 || x > 370), `numéros hors du dessin : ${badgeX}`);
  assert.match(drawing, /<ellipse[^>]*class="ill-shape tone-cell"/);
  assert.match(drawing, /marker-end="url\(#schema-arrow-\d+\)"/);
  assert.equal((drawing.match(/class="badge-circle"/g) || []).length, 3);
  assert.match(drawing, /class="badge-leader"/, 'repères trop proches : écartés avec un trait de rappel');
  assert.equal((drawing.match(/class="legend-item/g) || []).length, 3);
  assert.match(drawing, /contient l’information génétique/);

  // Mode exercice : numéros sans les noms.
  const quiz = await viaJson({ ...cell, quiz: true });
  assert.doesNotMatch(quiz, /Membrane|Noyau/);
  assert.match(quiz, /Retrouve ce que représente chaque numéro/);
  const flowQuiz = await viaJson({ type: 'schema', form: 'flow', quiz: true, nodes: [{ label: 'Bouche' }, { label: 'Estomac' }] });
  assert.doesNotMatch(flowQuiz, /Bouche|Estomac/);

  // Ancien schéma digestif relu en base : affiché en trajet générique.
  const legacy = await viaJson({ type: 'digestive-system', organs: [{ id: 'bouche', label: 'Bouche', kind: 'tube' }, { id: 'estomac', label: 'Estomac', kind: 'tube' }] });
  assert.match(legacy, /form-flow/);
  assert.match(legacy, /Estomac/);

  // Circuit : symboles normalisés, état calculé par le backend.
  const open = await render(resolveRequestedVisual({ userMessage: "pourquoi la lampe s'allume pas quand l'interrupteur est ouvert ?" }).diagram);
  assert.match(open, /Interrupteur ouvert/);
  assert.match(open, /Circuit ouvert/);
  assert.doesNotMatch(open, /sens du courant/, 'pas de courant dans un circuit ouvert');
  assert.doesNotMatch(open, /lamp-on/, 'la lampe reste éteinte');
  const closed = await render(resolveRequestedVisual({ userMessage: "c'est quoi un circuit fermé ?" }).diagram);
  assert.match(closed, /Circuit fermé/);
  assert.match(closed, /sens du courant/);
  assert.match(closed, /lamp-on/);

  // Non-régression : les figures géométriques passent toujours par
  // GeometryDiagram.
  const angle = await render({
    type: 'angle', angleDegrees: 45,
    points: { A: { x: 130, y: 170 }, B: { x: 250, y: 170 }, C: { x: 165, y: 85 } },
    labels: true, measurements: { angle: '45°' },
  });
  assert.match(angle, /class="geometry-diagram diagram-compact"/);
  assert.match(angle, /<polyline points="130,170 250,170 165,85"/);

  const composite = await render({
    type: 'composite',
    elements: [{ type: 'circle', center: { x: 250, y: 160 }, radius: 110, label: 'Membrane' }],
  });
  assert.match(composite, /Membrane/);

  // Type inconnu (ancienne donnée) : rien n'est affiché, pas d'erreur.
  const unknown = await render({ type: 'volcano' });
  assert.doesNotMatch(unknown, /<svg/);
  const empty = await render(null);
  assert.doesNotMatch(empty, /<svg/);

  console.log('tutor-visual-render: rendu des schémas génériques, circuits et figures vérifié');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
