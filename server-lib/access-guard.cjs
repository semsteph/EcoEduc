// =====================================================================
//  Garde d'accès central, appliqué à TOUTES les routes de /api.
//
//  Avant ce garde, presque aucune route ne vérifiait le rôle ni
//  l'établissement : un compte parent pouvait ajouter des élèves,
//  supprimer une classe ou lire les élèves d'une autre école en changeant
//  un identifiant dans l'URL. Le garde :
//  1. reconnaît le compte (établissement, administration, enseignant,
//     parent) d'après le jeton ;
//  2. limite parents et enseignants aux actions de leur espace ;
//  3. vérifie que chaque élément cité (école, année, classe, élève,
//     matière, semestre, enseignant, parent, devoir, permission...) dans
//     l'URL, la requête ou le corps appartient à l'école du compte — et,
//     pour un parent, à ses propres enfants.
//  Les routes gardent leurs propres contrôles ; celui-ci s'ajoute.
// =====================================================================
const jwt = require('jsonwebtoken');
const db = require('./db.cjs');

const JWT_SECRET = process.env.JWT_SECRET;

// ---------------------------------------------------------------------
// Compte connecté
// ---------------------------------------------------------------------
function identify(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    const t = jwt.verify(header.slice(7), JWT_SECRET);
    // Jeton de réinitialisation de mot de passe : jamais un accès.
    if (t.purpose) return { kind: 'reset' };
    if (t.type === 'etablissement') return { kind: 'staff', etabId: Number(t.etablissementId), userId: Number(t.etablissementId) };
    if (t.type === 'administration') return { kind: 'staff', etabId: Number(t.etablissementId), userId: Number(t.administrationId) };
    if (t.role === 'parent') return { kind: 'parent', etabId: Number(t.etablissementId), userId: Number(t.id) };
    if (t.etablissement !== undefined && t.id !== undefined) return { kind: 'enseignant', etabId: Number(t.etablissement), userId: Number(t.id) };
    return { kind: 'unknown' };
  } catch {
    return null; // la route répond « Token invalide / expiré »
  }
}

// ---------------------------------------------------------------------
// Ce que parents et enseignants ont le droit d'appeler (chemins relatifs
// à /api). Tout le reste est réservé à l'administration.
// ---------------------------------------------------------------------
const ANY = [
  /^\/(loginEns|loginEtablissement|loginAdministration|send-reset-code|verify-reset-code|update-password|send|parent-verify-reset-code|parent-update-password)$/,
  /^\/parent\/login$/, /^\/parents\/(check-email|verify-code|set-password)$/,
  /^\/(etablissements|communes|etablissementStatut)$/,
  /^\/annees-scolaires\/(etablissement\/)?\d+$/, /^\/semesters\/\d+$/,
  /^\/administration\/mon-mot-de-passe$/,
];

const rules = (list) => list.map(([methods, re]) => ({ methods: methods.split(','), re }));

const PARENT = rules([
  ['GET', /^\/parent\/(children|dashboard\/\d+)$/],
  ['GET', /^\/parent\/messages(\/non-lus)?$/],
  ['GET', /^\/parent\/notifications(\/non-lues)?$/],
  ['PUT', /^\/parent\/notifications\/lues$/],
  ['POST', /^\/parent\/absences\/motif$/],
  ['GET,PUT', /^\/parent\/alertes\/preferences$/],
  ['GET', /^\/push\/cle$/],
  ['POST', /^\/push\/(abonnement|desabonnement|essai)$/],
  ['PUT', /^\/parent\/messages\/lus$/],
  ['GET,POST,PUT,DELETE', /^\/parent\/assistant(\/.*)?$/],
  ['GET', /^\/bulletined\/\d+\/(\d+|annees)$/],
  ['GET', /^\/devoirs\/eleve\/\d+$/],
  ['GET', /^\/eleve-notes$/],
  ['GET', /^\/(incidents|incident|presence)$/],
  ['GET', /^\/presence\/\d+\/[^/]+\/\d+$/],
  ['POST', /^\/presence\/\d+\/motif$/],
  ['GET', /^\/notificationed\/\d+\/\d+\/\d+$/],
  ['GET', /^\/permissions\/\d+\/\d+\/\d+$/],
  ['POST', /^\/permissions\/\d+$/],
  ['DELETE', /^\/permissions\/\d+$/],
  ['GET', /^\/(programme|tests|subjects|eleve|students)\/\d+$/],
  ['GET', /^\/eleves\/\d+$/],
  ['GET', /^\/punitions\/somme-heures\/\d+\/\d+$/],
  ['GET', /^\/parentid\/\d+$/],
  ['GET', /^\/scolarite\/(enfant|paiements)\/\d+\/\d+$/],
  ['POST', /^\/scolarite\/paiement\/declarer$/],
]);

const ENSEIGNANT = rules([
  ['GET', /^\/absents$/],
  ['GET', /^\/classes\/\d+(\/eleves)?$/],
  ['GET', /^\/(classe|programmes|matiere)\/\d+$/],
  ['GET', /^\/eleves\/\d+\/\d+$/],
  ['GET', /^\/enseignant\/(matieres-classes|emploi-du-temps)$/],
  ['GET', /^\/devoirs\/classe\/\d+\/\d+\/\d+$/],
  ['GET', /^\/devoirs\/\d+\/eleves$/],
  ['POST', /^\/devoirs$/],
  ['PUT', /^\/devoirs\/\d+\/non-faits$/],
  ['POST', /^\/addActivity$/],
  ['GET,PUT', /^\/programme-matiere\/classe\/\d+\/\d+$/],
  ['POST', /^\/programme-matiere\/analyser$/],
  ['GET', /^\/getActivities\/\d+\/\d+\/\d+$/],
  ['GET', /^\/notes\/\d+\/\d+\/\d+\/\d+$/],
  ['POST', /^\/(notes\/save|notes\/saisie|deleteNote)$/],
  ['POST', /^\/notes\/photo\/lire$/],
  ['DELETE', /^\/delete-note$/],
  ['POST', /^\/notes\/modification-requests$/],
  ['GET', /^\/notes\/modification-requests\/mine(\/count)?$/],
  ['PUT', /^\/notes\/modification-requests\/mine\/mark-seen$/],
  ['GET', /^\/notificationprof\/\d+\/\d+\/\d+$/],
  ['POST', /^\/notificationprof\/sync\/\d+\/\d+\/\d+$/],
  ['PUT', /^\/notificationprof\/(mark-read\/\d+\/\d+\/\d+|mark-read-bulk)$/],
  ['GET', /^\/enseignant\/(notifications|permissions|etablissements)$/],
  ['GET', /^\/push\/cle$/],
  ['POST', /^\/push\/(abonnement|desabonnement|essai)$/],
  ['POST', /^\/enseignant\/(changer-etablissement|mot-de-passe)$/],
  ['PUT', /^\/enseignant\/notifications\/lues$/],
  ['GET,POST', /^\/(presence|incidents)$/],
  ['GET', /^\/(incident)$/],
  ['GET', /^\/presence\/\d+\/[^/]+\/\d+$/],
  ['GET', /^\/punitions\/somme-heures\/\d+\/\d+$/],
  ['POST', /^\/(save\/conduct|conduite)$/],
  ['POST', /^\/export\/excel\/\d+$/],
  ['POST', /^\/upload\/excel$/],
  ['GET', /^\/(Coefficient)$/],
]);

function allowedFor(kind, method, path) {
  if (ANY.some((re) => re.test(path))) return true;
  if (kind === 'staff') return true;
  const list = kind === 'parent' ? PARENT : kind === 'enseignant' ? ENSEIGNANT : [];
  return list.some((rule) => rule.methods.includes(method) && rule.re.test(path));
}

// ---------------------------------------------------------------------
// Éléments cités dans une requête et leur établissement
// ---------------------------------------------------------------------
const ENTITIES = {
  annee: 'SELECT id, etablissement_id AS etab FROM annee_scolaire WHERE id IN (?)',
  classe: 'SELECT id, etablissement_id AS etab FROM classes WHERE id IN (?)',
  eleve: 'SELECT id, etablissement_id AS etab, Parents_id AS parent FROM eleve WHERE id IN (?)',
  matiere: 'SELECT id, etablissement_id AS etab FROM matieres WHERE id IN (?)',
  semestre: 'SELECT id, etablissement_id AS etab FROM semestre WHERE id IN (?)',
  enseignant: 'SELECT id, etablissement_id AS etab FROM enseignants WHERE id IN (?)',
  parent: 'SELECT id, etablissement_id AS etab FROM parents WHERE id IN (?)',
  devoir: 'SELECT id, etablissement_id AS etab FROM devoirs WHERE id IN (?)',
  permission: 'SELECT p.id, p.etablissement_id AS etab, e.Parents_id AS parent FROM permission p LEFT JOIN eleve e ON e.id = p.eleve_id WHERE p.id IN (?)',
  presence: 'SELECT p.id, p.etablissement_id AS etab, e.Parents_id AS parent FROM presence p LEFT JOIN eleve e ON e.id = p.eleve_id WHERE p.id IN (?)',
  paiement: 'SELECT p.id, s.etablissement_id AS etab, e.Parents_id AS parent FROM paiement p JOIN scolarite s ON s.id = p.scolarite_id LEFT JOIN eleve e ON e.id = s.eleve_id WHERE p.id IN (?)',
  demande: 'SELECT id, etablissement_id AS etab FROM note_modification_requests WHERE id IN (?)',
  collaborateur: 'SELECT id, etablissement_id AS etab FROM administrations WHERE id IN (?)',
  punition: 'SELECT id, etablissement_id AS etab FROM punitions WHERE id IN (?)',
  echeance: 'SELECT id, etablissement_id AS etab FROM echeance WHERE id IN (?)',
  programme: 'SELECT id, etablissement_id AS etab FROM programmes WHERE id IN (?)',
};

// Nom de champ (URL, requête ou corps) → type d'élément.
const KEYS = {
  etablissementId: 'etab', etabId: 'etab', etablissement_id: 'etab', etablissement: 'etab', etablissementID: 'etab',
  anneeScolaireId: 'annee', anneeId: 'annee', annee_scolaire_id: 'annee', Annee_scolaire_id: 'annee', anneeScolaire: 'annee',
  classeId: 'classe', classId: 'classe', classe_id: 'classe', Classes_id: 'classe', destinationClasseId: 'classe', classe_ids: 'classe', classeIds: 'classe', nouvelleClasseId: 'classe',
  eleveId: 'eleve', studentId: 'eleve', childId: 'eleve', eleve_id: 'eleve', eleveIds: 'eleve', Eleves_id: 'eleve', enfantId: 'eleve', studentIds: 'eleve',
  matiereId: 'matiere', subjectId: 'matiere', matiere_id: 'matiere', matieres_id: 'matiere', 'matière_id': 'matiere',
  semestreId: 'semestre', semesterId: 'semestre', semestre_id: 'semestre', Semestre_id: 'semestre',
  enseignantId: 'enseignant', Enseignants_id: 'enseignant', enseignant_id: 'enseignant', teacherId: 'enseignant',
  parentId: 'parent', Parents_id: 'parent', parent_id: 'parent',
  devoirId: 'devoir', permissionId: 'permission',
};

// Routes dont le paramètre s'appelle simplement « id » : type d'élément
// selon le début du chemin.
const ID_ROUTES = [
  [/^\/Classes\//i, 'classe'],
  [/^\/eleves\//, 'eleve'],
  [/^\/Enseignants\//i, 'enseignant'],
  [/^\/Parents\//i, 'parent'],
  [/^\/Matieres\//i, 'matiere'],
  [/^\/permissions\//, 'permission'],
  [/^\/presence\//, 'presence'],
  [/^\/paiement\//, 'paiement'],
  [/^\/notes\/modification-requests\//, 'demande'],
  [/^\/administration\/collaborateurs\//, 'collaborateur'],
];

// Valeur numérique telle que MySQL la lirait (« 12abc » → 12).
function toId(value) {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string') {
    const m = value.match(/^\s*(\d+)/);
    return m ? Number(m[1]) : null;
  }
  return null;
}

function collect(target, kind, value) {
  const values = Array.isArray(value) ? value : [value];
  values.forEach((v) => {
    const id = toId(v);
    if (id !== null && id > 0) {
      if (!target[kind]) target[kind] = new Set();
      target[kind].add(id);
    }
  });
}

// Parcourt le corps : champs du premier niveau et objets d'une liste
// (notes.save, présences, imports...), sans dépasser 2 000 valeurs.
function scanObject(target, obj, depth = 0, budget = { left: 2000 }) {
  if (!obj || typeof obj !== 'object' || depth > 3) return;
  for (const [key, value] of Object.entries(obj)) {
    if (budget.left-- <= 0) return;
    if (KEYS[key]) collect(target, KEYS[key], value);
    else if (value && typeof value === 'object') scanObject(target, value, depth + 1, budget);
  }
}

// ---------------------------------------------------------------------
// Paramètres d'URL : retrouvés d'après la définition des routes montées.
// ---------------------------------------------------------------------
const mounted = [];
function registerRouter(prefix, router) {
  mounted.push({ prefix, router });
}

function routeParams(method, fullPath) {
  for (const { prefix, router } of mounted) {
    if (!fullPath.startsWith(prefix)) continue;
    const sub = fullPath.slice(prefix.length) || '/';
    for (const layer of router.stack) {
      if (!layer.route || !layer.route.methods[method.toLowerCase()]) continue;
      if (layer.regexp.test(sub)) {
        const match = layer.regexp.exec(sub);
        const params = {};
        layer.keys.forEach((key, index) => {
          if (match[index + 1] !== undefined) params[key.name] = decodeURIComponent(match[index + 1]);
        });
        return { params, sub, routePath: layer.route.path };
      }
    }
  }
  return null;
}

async function ownerRows(kind, ids) {
  const [rows] = await db.query(ENTITIES[kind], [[...ids]]);
  return rows;
}

async function check(req, who) {
  const cited = {};
  const route = routeParams(req.method, req.baseUrl + req.path);
  if (route) {
    for (const [name, value] of Object.entries(route.params)) {
      if (KEYS[name]) collect(cited, KEYS[name], value);
      else if (name === 'id') {
        const entry = ID_ROUTES.find(([re]) => re.test(route.sub));
        if (entry) collect(cited, entry[1], value);
      }
    }
  }
  scanObject(cited, req.query);
  scanObject(cited, req.body);

  for (const [kind, ids] of Object.entries(cited)) {
    if (kind === 'etab') {
      if ([...ids].some((id) => id !== who.etabId)) return 'Cet établissement ne correspond pas à votre compte.';
      continue;
    }
    if (!ENTITIES[kind]) continue;
    const rows = await ownerRows(kind, ids);
    if (rows.some((row) => row.etab !== null && Number(row.etab) !== who.etabId)) {
      return "Cet élément n'appartient pas à votre établissement.";
    }
    if (who.kind === 'parent') {
      if (kind === 'eleve' || kind === 'permission' || kind === 'presence' || kind === 'paiement') {
        if (rows.some((row) => Number(row.parent) !== who.userId)) return "Cet élève n'appartient pas à votre compte.";
      }
      if (kind === 'parent' && [...ids].some((id) => id !== who.userId)) return 'Accès refusé.';
      if (kind === 'classe') {
        const [own] = await db.query('SELECT DISTINCT classe_id FROM eleve WHERE Parents_id = ? AND classe_id IN (?)', [who.userId, [...ids]]);
        if (own.length < ids.size) return "Cette classe n'est pas celle de votre enfant.";
      }
    }
    if (who.kind === 'enseignant' && kind === 'enseignant' && [...ids].some((id) => id !== who.userId)) {
      return 'Accès refusé.';
    }
  }
  return null;
}

// Middleware monté sur /api avant tous les routers.
// Enseignant retiré de l'établissement : sa session (24 h) s'arrête aussitôt.
// Petit cache pour ne pas interroger la base à chaque appel.
const ficheActive = new Map();
async function enseignantActif(id) {
  const c = ficheActive.get(id);
  if (c && Date.now() - c.t < 30000) return c.actif;
  const [[f]] = await db.query('SELECT actif FROM enseignants WHERE id = ?', [id]);
  const actif = Boolean(f && f.actif);
  ficheActive.set(id, { actif, t: Date.now() });
  return actif;
}

function accessGuard(req, res, next) {
  const who = identify(req);
  if (!who) return next(); // pas de jeton (ou invalide) : la route décide
  const path = req.path;
  if (who.kind === 'reset' || who.kind === 'unknown') {
    if (ANY.some((re) => re.test(path))) return next();
    return res.status(403).json({ message: 'Accès non autorisé pour ce compte.' });
  }
  if (!allowedFor(who.kind, req.method, path)) {
    console.warn(`[accès refusé] ${who.kind} ${req.method} /api${path}`);
    return res.status(403).json({ message: 'Accès non autorisé pour ce compte.' });
  }
  (who.kind === 'enseignant' ? enseignantActif(who.userId) : Promise.resolve(true))
    .then((actif) => {
      if (!actif) {
        res.status(401).json({ message: 'Token invalide ou expiré.' });
        return 'fini';
      }
      return check(req, who);
    })
    .then((problem) => {
      if (problem === 'fini') return undefined;
      if (problem) {
        console.warn(`[accès refusé] ${who.kind} ${req.method} /api${path} : ${problem}`);
        return res.status(403).json({ message: problem });
      }
      req.access = who;
      return next();
    })
    .catch((error) => {
      console.error('Erreur garde d\'accès :', error.message);
      res.status(500).json({ message: 'Erreur serveur.' });
    });
}

// Appelé quand une école retire un enseignant : effet immédiat.
function oublierEnseignant(id) {
  ficheActive.delete(Number(id));
}

module.exports = { accessGuard, registerRouter, identify, allowedFor, routeParams, oublierEnseignant, __test: { scanObject, toId } };
