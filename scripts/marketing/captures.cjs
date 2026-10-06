// Captures « marketing » (haute définition, sans annotation) des écrans
// clés, sur les écoles de démonstration. Ne modifie aucune donnée.
//   node scripts/marketing/captures.cjs
const path = require('path');
const { chromium } = require('playwright-core');
const BASE = process.env.GUIDE_BASE || 'http://localhost:3000';
// Les médias vont dans le dossier vidéo, hors de l'application.
const MARKETING = process.env.MARKETING_DIR || path.join(__dirname, '..', '..', '..', 'echoeducation-video', 'marketing');
const OUT = path.join(MARKETING, 'captures');
const FILTRE = process.argv[2] || '';
const STYLE = '.nuxt-devtools-panel, #nuxt-devtools-container, .nuxt-loading-indicator { display: none !important; }';

const comptes = {
  admin: { page: '/administration/connexion', id: 'cocotiers_demo', mdp: 'Cocotiers2026' },
  prof: { page: '/professeurs/connexion', id: 'sylvie.hounsou1', mdp: 'Prof2026!' },
  parent: { page: '/parents/connexion', id: 'parent.cocotiers', mdp: 'Parent2026!', etab: 'CEG Les Cocotiers' },
};

// [nom, compte, format, chemin, actions supplémentaires]
const ECRANS = [
  ['01-admin-tableau-de-bord', 'admin', 'ordi', '/administration/dashbord'],
  ['02-admin-inscription-classe', 'admin', 'ordi', '/administration/dashbord/eleves/inscription', [['clic', 'button:has-text("Toute une classe")'], ['clic', 'button:has-text("Coller la liste")'], ['remplir', 'textarea', 'KOFFI Ama 12/03/2014 F 0197000001\nDOSSOU Jean 05/11/2013 M 0196000002\nAGOSSOU Prisca 21/07/2014 F']]],
  ['03-admin-bulletin-officiel', 'admin', 'ordi', '/administration/dashbord/eleves/bulletins', [['clic', '.v-card:has-text("6ème 1") button:has-text("Ouvrir")', 4000], ['clic', '.v-expansion-panel-title', 2500]]],
  ['04-admin-cartes-scolaires', 'admin', 'ordi', '/administration/dashbord/eleves/cartes-scolaires', [['clic', '.v-card:has-text("6ème 1")', 3000]]],
  ['05-admin-emploi-du-temps-enseignant', 'admin', 'ordi', '/administration/dashbord/enseignants/liste', [['clic', '.enseignant-card button:has-text("Emploi du temps")', 2500]]],
  ['06-admin-cloture-rapport', 'admin', 'ordi', '/administration/dashbord/parametres?onglet=cloture', [['clic', 'button:has-text("Clôturer l’année")', 7000]]],
  ['07-admin-educmaster', 'admin', 'ordi', '/administration/dashbord/eleves/educmaster'],
  ['08-admin-alertes-sms', 'admin', 'ordi', '/administration/dashbord/parametres?onglet=alertes'],
  ['09-prof-saisie-notes', 'prof', 'ordi', '/professeurs/dashbord/matieres/42/classes/75/notes'],
  ['10-prof-emploi-du-temps', 'prof', 'ordi', '/professeurs/dashbord/emploi-du-temps'],
  ['11-prof-appel-mobile', 'prof', 'mobile', '/professeurs/dashbord/matieres/42/classes/75/presences'],
  ['12-prof-notes-mobile', 'prof', 'mobile', '/professeurs/dashbord/matieres/42/classes/75/notes'],
  ['13-parent-mes-enfants-mobile', 'parent', 'mobile', '/parents/dashbord/enfants'],
  ['14-parent-notifications-mobile', 'parent', 'mobile', '/parents/dashbord/notifications'],
  ['15-parent-emploi-du-temps-mobile', 'parent', 'mobile', '/parents/dashbord/enfants/marie-esther/programme'],
  ['16-parent-bulletin-mobile', 'parent', 'mobile', '/parents/dashbord/enfants/marie-esther/bulletin'],
  ['17-parent-tableau-de-bord-ordi', 'parent', 'ordi', '/parents/dashbord'],
  ['18-parent-emploi-du-temps-ordi', 'parent', 'ordi', '/parents/dashbord/enfants/marie-esther/programme'],
  ['19-guide-utilisation-mobile', 'parent', 'mobile', '/parents/dashbord/guide?g=absence'],
  ['20-connexion-enseignant-ordi', null, 'ordi', '/professeurs/connexion'],
  // Arguments phares : assistants IA par matière, droits des collaborateurs.
  ['21-parent-assistants-liste-mobile', 'parentLycee', 'mobile', '/parents/dashbord/enfants/gildas/assistances'],
  ['21-parent-assistants-liste-nadia-mobile', 'parentLycee', 'mobile', '/parents/dashbord/enfants/nadia/assistances', [['lecon', 18, 75]]],
  ['22-parent-assistant-oxydoreduction-mobile', 'parentLycee', 'mobile', '/parents/dashbord/enfants/gildas/assistances', [['lecon', 18, 108], ['clic', 'text=Assistant physique chimie', 4000], ['haut']]],
  ['23-parent-assistant-oxydoreduction-ordi', 'parentLycee', 'ordi', '/parents/dashbord/enfants/gildas/assistances', [['lecon', 18, 108], ['clic', 'text=Assistant physique chimie', 4000], ['haut']]],
  ['24-parent-assistant-maths-TleD-mobile', 'parentLycee', 'mobile', '/parents/dashbord/enfants/josue/assistances', [['lecon', 17, 113], ['clic', 'text=Assistant Mathematique', 4000]]],
  ['25-admin-collaborateur-droits', 'admin', 'ordi', '/administration/dashbord/parametres?onglet=collaborateurs', [['clic', 'button:has-text("Ajouter un collaborateur")'], ['remplir', '.v-dialog input >> nth=0', 'AHOUANSOU'], ['remplir', '.v-dialog input >> nth=1', 'Clarisse'], ['remplir', '.v-dialog input >> nth=2', 'Comptable'], ['coche', 'Inscription'], ['coche', 'Scolarité'], ['coche', 'Carte Scolaire'], ['coche', 'Consulter Note']]],
  // Partie gestion de la vidéo : scolarité, suivi d'un élève, messagerie.
  ['26-admin-scolarite', 'admin', 'ordi', '/administration/dashbord/eleves/scolarite'],
  ['27-admin-scolarite-classe', 'admin', 'ordi', '/administration/dashbord/eleves/scolarite', [['demo', 'scolarite'], ['clic', 'button:has-text("Ouvrir la scolarité")', 4000]]],
  ['28-admin-liste-eleves', 'admin', 'ordi', '/administration/dashbord/eleves/liste'],
  ['31-admin-cloture-moyennes', 'admin', 'ordi', '/administration/dashbord/parametres?onglet=cloture', [['demo', 'cloture'], ['clic', 'button:has-text("Clôturer l’année")', 5000], ['clic', 'text=/Voir les \\d+ élèves/', 1500]]],
  ['32-admin-cloture-redoublants', 'admin', 'ordi', '/administration/dashbord/parametres?onglet=cloture', [['demo', 'cloture'], ['clic', 'button:has-text("Clôturer l’année")', 5000], ['clic', 'text=/Voir les \\d+ élèves/', 1500], ['voir', '.is-redouble']]],
  ['29-parent-messages-mobile', 'parent', 'mobile', '/parents/dashbord/messages', [['demo', 'messages']]],
];
const FORMATS = {
  ordi: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};

// Parent du lycée de test : session signée par le serveur (lecture seule).
function jetonParentLycee() {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
  return require('jsonwebtoken').sign({ id: 18, etablissementId: 72, role: 'parent' }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function connexion(page, c) {
  await page.goto(`${BASE}${c.page}`, { waitUntil: 'networkidle' });
  await page.locator('input:visible').first().fill(c.id);
  await page.locator('input[type=password]:visible').first().fill(c.mdp);
  if (c.etab) {
    await page.locator('.v-field', { hasText: 'Établissement' }).first().click();
    await page.locator('.v-overlay--active .v-list-item', { hasText: c.etab }).first().click();
  }
  await page.locator('button:visible:has-text("Se connecter")').first().click();
  await page.waitForURL(/dashbord/, { timeout: 20000 });
  await page.waitForTimeout(1500);
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.GUIDE_CHROME || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const sessions = {};
  for (const [nom, compte, format, chemin, actions = []] of ECRANS) {
    if (FILTRE && !new RegExp(FILTRE).test(nom)) continue;
    const cle = `${compte}:${format}`;
    if (!sessions[cle]) {
      const ctx = await b.newContext({ ...FORMATS[format], locale: 'fr-FR' });
      await ctx.addInitScript((css) => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }), STYLE);
      const page = await ctx.newPage();
      page.on('dialog', (d) => d.dismiss());
      if (compte === 'parentLycee') await ctx.addInitScript((t) => { try { localStorage.setItem('parents:token', t); } catch (e) {} }, jetonParentLycee());
      else if (compte) await connexion(page, comptes[compte]);
      sessions[cle] = page;
    }
    const page = sessions[cle];
    if (FILTRE && !new RegExp(FILTRE).test(nom)) continue;
    try {
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      // Écoles de démo sans paiements ni messages cette année : pour la
      // capture seulement, l'écran reçoit des données de démonstration
      // (rien n'est écrit dans la base).
      const demo = actions.find(([t]) => t === 'demo');
      if (demo && demo[1] === 'scolarite') {
        await page.route('**/scolarite/eleves/**', async (route) => {
          const r = await route.fetch(); const liste = await r.json();
          const total = 85000;
          const payes = [85000, 60000, 85000, 40000, 85000, 25000, 85000, 60000, 0, 85000, 45000, 85000];
          await route.fulfill({ response: r, json: (Array.isArray(liste) ? liste : []).map((e, i) => ({ ...e, montantTotal: total, montantPaye: payes[i % payes.length], reste: total - payes[i % payes.length] })) });
        });
      }
      if (demo && demo[1] === 'messages') {
        const ilya = (h) => new Date(Date.now() - h * 3600e3).toISOString();
        await page.route('**/api/parent/messages', (route) => route.request().method() === 'GET'
          ? route.fulfill({ json: { messages: [
            { id: 1, type: 'note', lu: false, date: ilya(1), eleveId: 1, enfant: 'Marie-Esther', titre: 'Mathématiques — 1er trimestre', lignes: ['Interrogation 2 : 15/20'] },
            { id: 2, type: 'note', lu: false, date: ilya(3), eleveId: 2, enfant: 'Jean-Luc', titre: 'Physique-chimie — 1er trimestre', lignes: ['Devoir 1 : 12,5/20'] },
            { id: 3, type: 'programme', lu: true, date: ilya(26), eleveId: 1, enfant: 'Marie-Esther', titre: 'Emploi du temps modifié', lignes: ['Mercredi : SVT déplacée de 10h à 15h', 'Vendredi : cours d’anglais ajouté de 8h à 10h'] },
            { id: 4, type: 'note', lu: true, date: ilya(50), eleveId: 1, enfant: 'Marie-Esther', titre: 'Français — 1er trimestre', lignes: ['Interrogation 1 : 14/20', 'Devoir 1 : 13/20'] },
          ] } })
          : route.fulfill({ json: { ok: true } }));
      }
      if (demo && demo[1] === 'cloture') {
        // Aperçu de clôture (l'année des écoles de démo est déjà clôturée) :
        // vrais élèves de trois classes, moyennes annuelles de démonstration.
        require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
        const db = require('../../server-lib/db.cjs');
        const [eleves] = await db.query(
          `SELECT e.id, e.nom, e.prenom, c.id AS classe_id, c.nom AS classe FROM eleve e JOIN classes c ON c.id = e.classe_id
            WHERE e.etablissement_id = 78 AND c.nom IN ('6ème 1', '6ème 2', '5ème 1') ORDER BY c.nom, e.nom`
        );
        const moyenne = (i) => Math.round((7.5 + ((i * 37) % 100) / 9) * 100) / 100;
        const parClasse = new Map();
        eleves.forEach((e, i) => {
          if (!parClasse.has(e.classe_id)) parClasse.set(e.classe_id, { classeId: e.classe_id, classeNom: e.classe, totalEleves: 0, nombreQuiPassent: 0, nombreQuiEchouent: 0, destinationPrevue: e.classe.startsWith('6') ? '5ème' : '4ème', eleves: [] });
          const c = parClasse.get(e.classe_id);
          const m = moyenne(i);
          c.totalEleves += 1;
          if (m >= 10) c.nombreQuiPassent += 1; else c.nombreQuiEchouent += 1;
          c.eleves.push({ eleveId: e.id, nom: e.nom, prenom: e.prenom, moyenneAnnuelle: m, admis: m >= 10 });
        });
        const rapportParClasse = [...parClasse.values()].map((c) => ({ ...c, eleves: c.eleves.sort((a, b) => b.moyenneAnnuelle - a.moyenneAnnuelle) }));
        const tous = rapportParClasse.flatMap((c) => c.eleves.map((e) => ({ ...e, classeActuelle: c.classeNom })));
        await page.route('**/api/cloture-annee-scolaire', (route) => route.request().method() === 'POST'
          ? route.fulfill({ json: {
            confirmationRequise: true, clotureExecutee: false, empreinte: 'demo', nomAnnee: '2025-2026',
            message: 'Rapport de clôture prêt. Aucun changement n’a encore été appliqué : relisez-le, puis validez.',
            rapport: {
              rapportParClasse, rapportMoyennesManquantes: [], anomaliesPromotion: [], alertesCapacite: [], detailsGroupes: [], avertissements: [], blocages: [],
              totalClasses: rapportParClasse.length, totalEleves: tous.length, totalAffectationsExistantes: 0, totalCreationsDeClasses: 0, totalAlertesCapacite: 0,
              sortants: [], aOrienter: [], totalSortants: 0,
              redoublants: tous.filter((e) => !e.admis).map((e) => ({ eleveId: e.eleveId, nom: e.nom, prenom: e.prenom, classeActuelle: e.classeActuelle, moyenneAnnuelle: e.moyenneAnnuelle })),
            },
          } })
          : route.continue());
      }
      const lecon = actions.find(([t]) => t === 'lecon');
      if (lecon) {
        // L'assistant ouvre la leçon voulue (deux leçons du même jour).
        await page.route('**/api/parent/assistant/subjects/**', async (route) => {
          const r = await route.fetch(); const d = await r.json();
          d.assistants = (d.assistants || []).filter((a) => Number(a.matiereId) !== lecon[1] || Number(a.testId) === lecon[2]);
          await route.fulfill({ response: r, json: d });
        });
      }
      await page.goto(`${BASE}${chemin}`, { waitUntil: 'load' });
      await page.waitForTimeout(3500);
      for (const [type, sel, val] of actions) {
        if (type === 'clic') { await page.locator(sel).first().click(); await page.waitForTimeout(typeof val === 'number' ? val : 1200); }
        if (type === 'remplir') { await page.locator(sel).first().fill(val); await page.waitForTimeout(400); }
        if (type === 'voir') { await page.locator(sel).first().evaluate((el) => el.scrollIntoView({ block: 'center' })); await page.waitForTimeout(800); }
        if (type === 'coche') { await page.locator('.v-dialog .v-checkbox', { has: page.getByText(sel, { exact: true }) }).locator('input').first().check(); await page.waitForTimeout(300); }
        if (type === 'haut') { await page.evaluate(() => document.querySelectorAll('*').forEach((el) => { if (el.scrollHeight > el.clientHeight + 4) el.scrollTop = 0; })); await page.waitForTimeout(800); }
      }
      await page.screenshot({ path: path.join(OUT, `${nom}.png`) });
      console.log('✓', nom);
    } catch (e) {
      console.log('✗', nom, e.message.split('\n')[0]);
    }
  }
  await b.close();
  process.exit(0);
})();
