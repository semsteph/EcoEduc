// =====================================================================
//  Génère le guide d'utilisation illustré (public/guides/) :
//  ouvre chaque écran des écoles de démonstration, entoure en rouge ce
//  qu'il faut toucher, et prend la capture en version ordinateur et
//  téléphone. Rien n'est jamais enregistré : le script ouvre les écrans
//  et les fenêtres, il ne valide aucun formulaire.
//
//  Utilisation (site et API lancés, écoles de démo présentes) :
//    node scripts/guides/capturer.cjs                 → tous les guides
//    node scripts/guides/capturer.cjs parent          → un espace
//    node scripts/guides/capturer.cjs parent absence  → un guide
//  Variables : GUIDE_BASE (défaut http://localhost:3000),
//              GUIDE_CHROME (défaut /usr/bin/google-chrome).
// =====================================================================
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const definitions = require('./definitions.cjs');

const BASE = process.env.GUIDE_BASE || 'http://localhost:3000';
const CHROME = process.env.GUIDE_CHROME || '/usr/bin/google-chrome';
const SORTIE = path.join(__dirname, '..', '..', 'public', 'guides');
const IMAGES = path.join(SORTIE, 'img');
const FORMATS = {
  ordinateur: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 780 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true },
};
const [filtreEspace, filtreGuide] = process.argv.slice(2);

// Contour rouge de l'élément à toucher.
const STYLE = `
  .guide-cible { outline: 3px solid #e53935 !important; outline-offset: 3px !important; border-radius: 8px !important;
    box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.18) !important; position: relative; z-index: 2400 !important; }
  .nuxt-devtools-panel, #nuxt-devtools-container, .nuxt-loading-indicator { display: none !important; }
`;

async function executer(page, action, format) {
  const a = { ...action, ...(action[format] || {}) };
  if (a.seulement && a.seulement !== format) return;
  if (a.aller) { await page.goto(`${BASE}${a.aller}`, { waitUntil: 'load' }); await page.waitForTimeout(a.attendre || 2500); return; }
  if (a.ouvrirMenu) {
    // Menu latéral replié (téléphone, ou ordinateur selon l'espace) : on l'ouvre.
    const tiroir = page.locator('.v-navigation-drawer').first();
    const boite = (await tiroir.count()) ? await tiroir.boundingBox() : null;
    if (!boite || boite.x < 0 || boite.x + boite.width <= 1) { await page.locator('button:has(.mdi-menu)').first().click(); await page.waitForTimeout(700); }
    return;
  }
  if (a.clic) { const l = page.locator(a.clic).first(); await l.scrollIntoViewIfNeeded(); await l.click(); await page.waitForTimeout(a.attendre || 900); return; }
  if (a.remplir) { await page.locator(a.remplir[0]).first().fill(a.remplir[1]); await page.waitForTimeout(300); return; }
  if (a.choisir) { await page.locator('.v-field', { hasText: a.choisir[0] }).first().click(); await page.locator('.v-overlay--active .v-list-item', { hasText: a.choisir[1] }).first().click(); await page.waitForTimeout(500); return; }
  if (a.touche) { await page.keyboard.press(a.touche); await page.waitForTimeout(500); return; }
  if (a.defiler) { await page.locator(a.defiler).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(400); return; }
  if (a.attendre) { await page.waitForTimeout(a.attendre); }
}

async function capturer(page, etape, fichier, format) {
  for (const action of etape.actions || []) await executer(page, action, format);
  const cible = (etape[format] && etape[format].surligner) || etape.surligner;
  if (cible) {
    const l = page.locator(cible).first();
    if (await l.count()) {
      await l.scrollIntoViewIfNeeded().catch(() => {});
      await page.evaluate(() => window.scrollBy(0, -80)).catch(() => {});
      await l.evaluate((el) => el.classList.add('guide-cible'));
    }
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: fichier, type: 'jpeg', quality: 62 });
  await page.evaluate(() => document.querySelectorAll('.guide-cible').forEach((el) => el.classList.remove('guide-cible'))).catch(() => {});
}

async function connexion(page, compte) {
  if (!compte) return;
  await page.goto(`${BASE}${compte.page}`, { waitUntil: 'networkidle' });
  await page.locator('input:visible').first().fill(compte.identifiant);
  await page.locator('input[type=password]:visible').first().fill(compte.motDePasse);
  if (compte.etablissement) {
    await page.locator('.v-field', { hasText: 'Établissement' }).first().click();
    await page.locator('.v-overlay--active .v-list-item', { hasText: compte.etablissement }).first().click();
  }
  await page.locator('button:visible:has-text("Se connecter")').first().click();
  await page.waitForURL(/dashbord/, { timeout: 20000 });
  await page.waitForTimeout(2000);
}

(async () => {
  fs.mkdirSync(IMAGES, { recursive: true });
  const ancien = fs.existsSync(path.join(SORTIE, 'guides.json')) ? JSON.parse(fs.readFileSync(path.join(SORTIE, 'guides.json'), 'utf8')) : { espaces: {} };
  const resultat = { genereLe: new Date().toISOString(), espaces: { ...ancien.espaces } };
  const navigateur = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  let erreurs = 0;

  for (const [espace, def] of Object.entries(definitions)) {
    if (filtreEspace && filtreEspace !== espace) continue;
    const guides = def.guides.filter((g) => !filtreGuide || g.id === filtreGuide);
    const sortieEspace = (resultat.espaces[espace] || []).filter((g) => !guides.some((x) => x.id === g.id));
    const produits = new Map();
    for (const [format, options] of Object.entries(FORMATS)) {
      const contexte = await navigateur.newContext({ ...options, locale: 'fr-FR' });
      await contexte.addInitScript((css) => {
        document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); });
      }, STYLE);
      const page = await contexte.newPage();
      page.on('dialog', (d) => d.dismiss());
      await connexion(page, def.compte);
      for (const g of guides) {
        for (const [i, etape] of g.etapes.entries()) {
          const nom = `${espace}-${g.id}-${i + 1}-${format}.jpg`;
          try {
            if (etape.seulement && etape.seulement !== format) continue;
            await capturer(page, etape, path.join(IMAGES, nom), format);
            if (!produits.has(`${g.id}:${i}`)) produits.set(`${g.id}:${i}`, {});
            produits.get(`${g.id}:${i}`)[format] = `/guides/img/${nom}`;
            process.stdout.write('.');
          } catch (e) {
            erreurs += 1;
            console.log(`\n✗ ${espace}/${g.id} étape ${i + 1} (${format}) : ${e.message.split('\n')[0]}`);
            await page.keyboard.press('Escape').catch(() => {});
          }
        }
      }
      await contexte.close();
    }
    resultat.espaces[espace] = [...sortieEspace, ...guides.map((g) => ({
      id: g.id, titre: g.titre, categorie: g.categorie, icone: g.icone, resume: g.resume, astuce: g.astuce || null,
      etapes: g.etapes.map((e, i) => ({ texte: e.texte, images: produits.get(`${g.id}:${i}`) || null })),
    }))].sort((a, b) => def.guides.findIndex((x) => x.id === a.id) - def.guides.findIndex((x) => x.id === b.id));
  }
  await navigateur.close();
  fs.writeFileSync(path.join(SORTIE, 'guides.json'), JSON.stringify(resultat, null, 1));
  console.log(`\nGuides écrits dans public/guides/ (${erreurs} capture(s) en échec).`);
})().catch((e) => { console.error(e); process.exit(1); });
