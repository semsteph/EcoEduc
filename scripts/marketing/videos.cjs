// =====================================================================
//  Vidéos de démonstration (marketing/videos/*.webm) : parcours filmés
//  dans l'application, avec un curseur visible.
//   1. l'enseignant remplit son cahier de texte (tapé, jamais enregistré) ;
//   2. le parent ouvre l'assistant de la matière et parcourt la discussion
//      de son enfant avec l'assistant (ordinateur et téléphone) ;
//   3. même chose en Terminale D, mathématiques (téléphone).
//  Les sessions sont signées par le serveur (écoles de démo et de test) :
//  aucune donnée n'est modifiée.  Utilisation : node scripts/marketing/videos.cjs
// =====================================================================
process.chdir(require('path').join(__dirname, '..', '..'));
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { chromium } = require('playwright-core');
const comptesEns = require('../../server-lib/comptes-enseignants.cjs');

const BASE = process.env.GUIDE_BASE || 'http://localhost:3000';
// Les médias vont dans le dossier vidéo, hors de l'application.
const MARKETING = process.env.MARKETING_DIR || path.join(__dirname, '..', '..', '..', 'echoeducation-video', 'marketing');
const OUT = path.join(MARKETING, 'videos');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Curseur dessiné dans la page (l'enregistrement n'affiche pas la souris).
const CURSEUR = () => {
  document.addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.id = 'curseur-demo';
    c.style.cssText = 'position:fixed;left:-40px;top:-40px;width:22px;height:22px;border-radius:50%;background:rgba(229,57,53,.35);border:2px solid #e53935;z-index:2147483647;pointer-events:none;transform:translate(-50%,-50%);transition:transform .12s;';
    document.body.appendChild(c);
    document.addEventListener('mousemove', (e) => { c.style.left = `${e.clientX}px`; c.style.top = `${e.clientY}px`; }, true);
    document.addEventListener('mousedown', () => { c.style.transform = 'translate(-50%,-50%) scale(.7)'; }, true);
    document.addEventListener('mouseup', () => { c.style.transform = 'translate(-50%,-50%) scale(1)'; }, true);
    const s = document.createElement('style');
    s.textContent = '.nuxt-devtools-panel,#nuxt-devtools-container,.nuxt-loading-indicator{display:none!important}';
    document.head.appendChild(s);
  });
};

let souris = { x: 200, y: 200 };
async function allerVers(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  const cible = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await page.mouse.move(cible.x, cible.y, { steps: 28 });
  souris = cible;
  await pause(250);
}
async function cliquer(page, sel) {
  const l = page.locator(sel).first();
  await allerVers(page, l);
  await page.mouse.down(); await pause(90); await page.mouse.up();
  await pause(900);
}
async function taper(page, sel, texte) {
  const l = page.locator(sel).first();
  await allerVers(page, l);
  await l.click();
  await l.pressSequentially(texte, { delay: 38 });
  await pause(500);
}
// La discussion s'ouvre sur les derniers messages : on remonte au début,
// puis on la parcourt lentement jusqu'à la fin.
async function defilerDiscussion(page, { pas = 70, attente = 120, max = 420 } = {}) {
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach((el) => { if (el.scrollHeight > el.clientHeight + 4) el.scrollTop = 0; });
    window.scrollTo(0, 0);
  });
  await pause(1800);
  const zone = page.locator('.messages, .chat-messages, .conversation, .v-main').first();
  const b = await zone.boundingBox().catch(() => null);
  await page.mouse.move(b ? b.x + b.width / 2 : 640, b ? b.y + b.height / 2 : 400, { steps: 15 });
  let immobile = 0;
  for (let i = 0; i < max && immobile < 6; i += 1) {
    const avant = await page.evaluate(() => [...document.querySelectorAll('*')].reduce((t, el) => t + (el.scrollHeight > el.clientHeight + 4 ? el.scrollTop : 0), window.scrollY));
    await page.mouse.wheel(0, pas);
    await pause(attente);
    const apres = await page.evaluate(() => [...document.querySelectorAll('*')].reduce((t, el) => t + (el.scrollHeight > el.clientHeight + 4 ? el.scrollTop : 0), window.scrollY));
    immobile = apres === avant ? immobile + 1 : 0;
  }
  await pause(2500);
}

const FILTRE = process.argv[2] || '';
// Pendant le tournage seulement : l'assistant d'une matière ouvre la leçon
// voulue (deux leçons du même jour seraient sinon prises au hasard).
async function choisirLecon(page, matiereId, testId) {
  await page.route('**/api/parent/assistant/subjects/**', async (route) => {
    const r = await route.fetch();
    const d = await r.json();
    d.assistants = (d.assistants || []).filter((a) => Number(a.matiereId) !== matiereId || Number(a.testId) === testId);
    await route.fulfill({ response: r, json: d });
  });
}
// Enregistrement en haute définition : la page est rendue en double
// résolution et chaque image peinte par le navigateur est enregistrée
// (capture d'écran continue du navigateur), puis assemblée en vidéo à
// 30 images/s. Le montage peut ainsi zoomer sur les détails sans flou.
async function filmer(nom, { format, jeton, cle }, scenario) {
  if (FILTRE && !nom.includes(FILTRE)) return;
  const formats = {
    ordinateur: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 },
    mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  };
  const opts = formats[format];
  const ctx = await navigateur.newContext({ ...opts, locale: 'fr-FR', acceptDownloads: true });
  await ctx.addInitScript(([k, t]) => { try { localStorage.setItem(k, t); } catch (e) {} }, [cle, jeton]);
  await ctx.addInitScript(CURSEUR);
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.dismiss());

  const dossier = path.join(OUT, `.images-${nom}`);
  fs.rmSync(dossier, { recursive: true, force: true });
  fs.mkdirSync(dossier, { recursive: true });
  const images = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const fichier = `${String(images.length).padStart(6, '0')}.jpg`;
    fs.writeFileSync(path.join(dossier, fichier), Buffer.from(data, 'base64'));
    images.push({ fichier, t: metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: opts.viewport.width * opts.deviceScaleFactor,
    maxHeight: opts.viewport.height * opts.deviceScaleFactor,
  });
  try {
    await scenario(page);
    console.log('✓', nom);
  } catch (e) {
    console.log('✗', nom, e.message.split('\n')[0]);
  }
  await pause(500);
  await cdp.send('Page.stopScreencast').catch(() => {});
  await ctx.close();

  // Assemblage : chaque image dure jusqu'à la suivante (le navigateur
  // n'envoie une image que lorsque l'écran change).
  const lignes = images.map((im, i) => {
    const duree = i + 1 < images.length ? Math.max(0.001, images[i + 1].t - im.t) : 1;
    return `file '${im.fichier}'\nduration ${duree.toFixed(4)}`;
  });
  if (images.length) lignes.push(`file '${images[images.length - 1].fichier}'`);
  fs.writeFileSync(path.join(dossier, 'liste.txt'), lignes.join('\n'));
  const sortie = path.join(OUT, `${nom}.mp4`);
  require('child_process').execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dossier, 'liste.txt'), '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', sortie], { cwd: path.join(MARKETING, '..'), stdio: 'inherit' });
  fs.rmSync(dossier, { recursive: true, force: true });
  console.log('  →', sortie, `(${images.length} images)`);
}

let navigateur;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  // Double résolution réelle des images enregistrées (sinon le navigateur
  // sans écran les envoie en simple résolution).
  navigateur = await chromium.launch({ executablePath: process.env.GUIDE_CHROME || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--force-device-scale-factor=2'] });
  const jetonParent = jwt.sign({ id: 18, etablissementId: 72, role: 'parent' }, process.env.JWT_SECRET, { expiresIn: '2h' });
  const db = require('../../server-lib/db.cjs');
  const [[fiche]] = await db.query(
    'SELECT e.id, e.compte_id, e.nom, e.prenom, e.nom_utilisateur, e.etablissement_id, et.nom AS etablissement_nom FROM enseignants e JOIN etablissement et ON et.id = e.etablissement_id WHERE e.id = 46'
  );
  const jetonProf = comptesEns.signerJeton(fiche);

  // 1. Cahier de texte de l'enseignante (école de démo, 1ère D 1, PCT).
  await filmer('01-enseignant-cahier-de-texte', { format: 'ordinateur', jeton: jetonProf, cle: 'professeurs:token' }, async (page) => {
    await page.goto(`${BASE}/professeurs/dashbord/matieres/43/classes/99/cahier-de-texte`, { waitUntil: 'load' });
    await pause(3500);
    await cliquer(page, 'button.ct-add:visible, button:has-text("Ajouter"):visible');
    await pause(800);
    await taper(page, '.v-dialog input:not([type="date"])', '08h00-10h00');
    // Même leçon que la discussion de Nadia avec l'assistant (vidéo 06).
    await taper(page, '.v-dialog textarea', "Travail d'une force et énergie cinétique : définition du travail W = F × d, unité le joule (J), puissance, théorème de l'énergie cinétique. Exercices 3 et 5 page 87.");
    await allerVers(page, page.locator('.v-dialog button:has-text("Ajouter"), .v-dialog button:has-text("Enregistrer")').last());
    await pause(2500); // on ne valide pas : rien n'est enregistré
  });

  // 2. Le parent ouvre l'assistant de physique-chimie (ordinateur, puis téléphone).
  for (const format of ['ordinateur', 'mobile']) {
    await filmer(`02-assistant-physique-1ereD-${format}`, { format, jeton: jetonParent, cle: 'parents:token' }, async (page) => {
      await page.goto(`${BASE}/parents/dashbord/enfants/nadia`, { waitUntil: 'load' });
      await pause(3000);
      await page.goto(`${BASE}/parents/dashbord/enfants/nadia/assistances`, { waitUntil: 'load' });
      await pause(3000);
      await cliquer(page, 'text=Assistant physique chimie');
      await pause(3500);
      await defilerDiscussion(page);
    });
  }

  // 3. Terminale D, mathématiques (téléphone).
  await filmer('03-assistant-maths-TleD-mobile', { format: 'mobile', jeton: jetonParent, cle: 'parents:token' }, async (page) => {
    await choisirLecon(page, 17, 113);
    await page.goto(`${BASE}/parents/dashbord/enfants/josue/assistances`, { waitUntil: 'load' });
    await pause(3000);
    await cliquer(page, 'text=Assistant Mathematique');
    await pause(3500);
    await defilerDiscussion(page);
  });

  // 4. 1ère C, physique-chimie : les réactions d'oxydoréduction.
  for (const format of ['ordinateur', 'mobile']) {
    await filmer(`04-assistant-oxydoreduction-1ereC-${format}`, { format, jeton: jetonParent, cle: 'parents:token' }, async (page) => {
      await choisirLecon(page, 18, 108);
      await page.goto(`${BASE}/parents/dashbord/enfants/gildas/assistances`, { waitUntil: 'load' });
      await pause(3000);
      await cliquer(page, 'text=Assistant physique chimie');
      await pause(3500);
      await defilerDiscussion(page);
    });
  }

  // 6. La discussion « en direct » (téléphone) : l'accueil de l'assistant,
  //    puis chaque question de l'élève tapée et envoyée, et la réponse qui
  //    arrive. On rejoue une vraie discussion enregistrée :
  //    les réponses sont servies depuis l'historique, rien n'est enregistré
  //    et aucune IA n'est appelée. À la fin, téléchargement du PDF.
  const filmerDirect = (nom, { eleveId, testId, matiereId, enfant, date }) => filmer(nom, { format: 'mobile', jeton: jetonParent, cle: 'parents:token' }, async (page) => {
    const r = await fetch(`${BASE}/api/parent/assistant/conversation/${eleveId}/${testId}`, { headers: { Authorization: `Bearer ${jetonParent}` } });
    const historique = (await r.json()).messages || [];
    const questions = historique.filter((m) => m.role === 'user');
    const reponses = historique.filter((m) => m.role !== 'user');
    let rang = 0;
    await choisirLecon(page, matiereId, testId);
    await page.route('**/api/parent/assistant/conversation/**', (route) => route.fulfill({ json: { messages: [], inputMode: 'question' } }));
    await page.route('**/api/parent/assistant/message', async (route) => {
      const m = reponses[rang] || reponses[reponses.length - 1];
      rang += 1;
      await pause(2600); // le temps que l'assistant « écrive »
      await route.fulfill({ json: { reply: m.content, explanationSegments: m.segments || [], messageExercise: m.exercise || null, exercise: m.exercise || null, inputMode: m.exercise ? 'exercise' : 'question' } });
    });
    // Le soir du cours : « Bonsoir … (aujourd'hui) ».
    await page.clock.setFixedTime(new Date(`${date}T19:40:00`));
    await page.goto(`${BASE}/parents/dashbord/enfants/${enfant}/assistances`, { waitUntil: 'load' });
    await pause(2500);
    await cliquer(page, 'text=Assistant physique chimie');
    await pause(4500); // on lit le message d'accueil
    // La zone qui défile est le cadre de l'espace parent.
    const zone = page.locator('main.v-main').first();
    for (const question of questions) {
      await taper(page, '.composer-input textarea:not(.v-textarea__sizer)', question.content);
      await cliquer(page, '.send-btn');
      await page.waitForSelector('.bubble-typing', { timeout: 5000 }).catch(() => {});
      await page.waitForSelector('.bubble-typing', { state: 'detached', timeout: 20000 });
      // L'application place le début de la réponse sous la barre de titre :
      // on la lit, puis on descend jusqu'à sa fin.
      await pause(2200);
      const b = await page.locator('.messages').first().boundingBox();
      await page.mouse.move(b.x + b.width / 2, 420, { steps: 10 });
      for (let i = 0; i < 300; i += 1) {
        const fin = await zone.evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
        if (fin) break;
        await page.mouse.wheel(0, 55);
        await pause(110);
      }
      await pause(1500);
    }
    // Télécharger la discussion pour la relire sur papier.
    await cliquer(page, '.pdf-btn');
    await page.waitForEvent('download', { timeout: 60000 }).catch(() => {});
    await pause(2500);
  });
  // Même leçon que le cahier de texte filmé (1ère D, travail d'une force).
  await filmerDirect('06-assistant-direct-force-mobile', { eleveId: 32, testId: 75, matiereId: 18, enfant: 'nadia', date: '2026-09-29' });
  await filmerDirect('06-assistant-direct-oxydoreduction-mobile', { eleveId: 35, testId: 108, matiereId: 18, enfant: 'gildas', date: '2026-09-29' });

  // 5. 2nde D, physique-chimie : les équations chimiques et leur équilibrage
  //    (conversation créée par marketing/conversation-2nde.cjs, qui demande
  //    du crédit Anthropic).
  const [[equilibrage]] = await db.query(
    "SELECT ac.id FROM assistant_conversation ac JOIN tests t ON t.id = ac.test_id WHERE ac.eleve_id = 31 AND t.activite LIKE '%quilibrage%' LIMIT 1"
  );
  if (equilibrage) {
    for (const format of ['ordinateur', 'mobile']) {
      await filmer(`05-assistant-equilibrage-2ndeD-${format}`, { format, jeton: jetonParent, cle: 'parents:token' }, async (page) => {
        await page.goto(`${BASE}/parents/dashbord/enfants/rachidi/assistances`, { waitUntil: 'load' });
        await pause(3000);
        await cliquer(page, 'text=Assistant physique chimie');
        await pause(3500);
        await defilerDiscussion(page);
      });
    }
  } else if (!FILTRE || '05-assistant-equilibrage'.includes(FILTRE)) {
    console.log('… 05 (équilibrage, 2nde) : conversation pas encore créée — lancer d’abord node scripts/marketing/conversation-2nde.cjs (crédit Anthropic nécessaire).');
  }

  await navigateur.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
