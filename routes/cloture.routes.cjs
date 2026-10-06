// =====================================================================
//  Clôture d'année scolaire (paramètres, simulation, exécution)
//  Monté dans server.cjs avec : app.use('/api', require('./routes/cloture.routes.cjs'));
// =====================================================================
const express = require('express');
const router = express.Router();

const { authenticateJWT, requireAdminStaff } = require('../server-lib/auth.cjs');
const db = require('../server-lib/db.cjs');
const { getDefaultClotureParams, parseBoolean, fetchClotureParams } = require('../server-lib/clotureParams.cjs');
const { normaliserGroupe, nomDeBase } = require('../server-lib/nomsClasses.cjs');
const bulletinService = require('../server-lib/bulletin-service.cjs');
const notesService = require('../server-lib/notes-service.cjs');
const crypto = require('crypto');

const ordreClasses = ['6eme', '5eme', '4eme', '3eme', '2nd', '1ere', 'Tle'];

const classesFinDeCycle = ['3eme', 'Tle'];

// Nom affiché d'un niveau (les classes s'appellent « 5ème 1 », pas « 5eme 1 »).
const NOM_NIVEAU = { '6eme': '6ème', '5eme': '5ème', '4eme': '4ème', '3eme': '3ème', '2nd': '2nd', '1ere': '1ere', 'Tle': 'Tle' };

function simplifyText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNiveau(niveau) {
  const n = simplifyText(niveau).toLowerCase();

  const map = {
    '6eme': '6eme',
    '6e': '6eme',
    '5eme': '5eme',
    '5e': '5eme',
    '4eme': '4eme',
    '4e': '4eme',
    '3eme': '3eme',
    '3e': '3eme',
    '2nd': '2nd',
    '2nde': '2nd',
    'seconde': '2nd',
    '1ere': '1ere',
    '1er': '1ere',
    'premiere': '1ere',
    'tle': 'Tle',
    'terminale': 'Tle'
  };

  return map[n] || null;
}

function parseClasseNom(nom) {
  if (!nom) return null;

  const raw = String(nom).trim().replace(/\s+/g, ' ');
  const cleaned = simplifyText(raw);

  const match = cleaned.match(
    /^(6eme|6e|5eme|5e|4eme|4e|3eme|3e|2nd|2nde|seconde|1ere|1er|premiere|tle|terminale)(?:\s+([A-Za-z]{1,3}[0-9]?))?(?:\s+([0-9]+))?$/i
  );

  if (!match) return null;

  const niveau = normalizeNiveau(match[1]);
  if (!niveau) return null;

  return {
    niveau,
    prefix: (match[2] || '').toUpperCase(),
    suffix: parseInt(match[3] || '0', 10),
    raw
  };
}

function trierClasses(classes) {
  return [...classes].sort((a, b) => {
    const pa = parseClasseNom(a.nom);
    const pb = parseClasseNom(b.nom);

    if (!pa && !pb) return 0;
    if (!pa) return 1;
    if (!pb) return -1;

    const ia = ordreClasses.indexOf(pa.niveau);
    const ib = ordreClasses.indexOf(pb.niveau);

    if (ia !== ib) return ia - ib;

    if (pa.prefix !== pb.prefix) {
      return pa.prefix.localeCompare(pb.prefix);
    }

    return pa.suffix - pb.suffix;
  });
}

function determinerDestinationPrevue(classeNom) {
  const parsed = parseClasseNom(classeNom);
  const niveauActuel = parsed ? parsed.niveau : null;

  if (!niveauActuel) return 'Non déterminé';

  if (niveauActuel === '3eme') return '2nde (série à choisir) ou sortie';
  if (niveauActuel === 'Tle') return 'Sortie (fin du lycée)';

  const index = ordreClasses.indexOf(niveauActuel);

  if (index >= 0 && index < ordreClasses.length - 1) {
    return ordreClasses[index + 1];
  }

  return 'Non déterminé';
}

function sanitizeClotureParams(payload = {}) {
  const defaults = getDefaultClotureParams();

  const effectifMaxParClasse = Math.max(
    1,
    Number(payload.effectifMaxParClasse ?? defaults.effectifMaxParClasse) ||
      defaults.effectifMaxParClasse
  );

  const effectifMinNouvelleClasse = Math.max(
    1,
    Number(payload.effectifMinNouvelleClasse ?? defaults.effectifMinNouvelleClasse) ||
      defaults.effectifMinNouvelleClasse
  );

  return {
    effectifMaxParClasse,
    effectifMinNouvelleClasse,
    activerCreationAutoClasse: parseBoolean(
      payload.activerCreationAutoClasse,
      defaults.activerCreationAutoClasse
    ),
    activerRepartitionIntelligente: parseBoolean(
      payload.activerRepartitionIntelligente,
      defaults.activerRepartitionIntelligente
    ),
    noteInterne: String(payload.noteInterne || '').trim()
  };
}

function ajouterAffectation(affectationsParClasse, classeId, eleveIds) {
  if (!affectationsParClasse[classeId]) {
    affectationsParClasse[classeId] = [];
  }

  affectationsParClasse[classeId].push(...eleveIds);
}

async function affecterElevesAClasse(connection, classeId, eleveIds) {
  if (!eleveIds || eleveIds.length === 0) return;

  const idsUniques = [...new Set(eleveIds)];
  const placeholders = idsUniques.map(() => '?').join(', ');

  const sql = `UPDATE eleve SET classe_id = ? WHERE id IN (${placeholders})`;
  await connection.execute(sql, [classeId, ...idsUniques]);
}

function tailleGroupesEquitables(total, k) {
  if (k <= 0) return [];
  const base = Math.floor(total / k);
  const reste = total % k;
  return Array.from({ length: k }, (_, i) => base + (i < reste ? 1 : 0));
}

function repartirEnEquilibrantEffectifFinal(eleves, classes, effectifsExistants, effectifMax) {
  const compteurs = new Map(classes.map(c => [c.id, effectifsExistants[c.id] || 0]));
  const affectations = new Map(classes.map(c => [c.id, []]));
  const nonPlaces = [];

  for (const eleve of eleves) {
    let meilleure = null;
    let meilleurEffectif = Infinity;

    for (const classe of classes) {
      const effectifActuel = compteurs.get(classe.id);
      if (effectifActuel < effectifMax && effectifActuel < meilleurEffectif) {
        meilleure = classe;
        meilleurEffectif = effectifActuel;
      }
    }

    if (!meilleure) {
      nonPlaces.push(eleve);
      continue;
    }

    compteurs.set(meilleure.id, compteurs.get(meilleure.id) + 1);
    affectations.get(meilleure.id).push(eleve);
  }

  const parClasse = {};
  for (const [classeId, liste] of affectations) {
    parClasse[classeId] = liste;
  }
  return [parClasse, nonPlaces];
}

function getNextClassName(nextNiveau, prefix, classesTriees) {
  const toutesLesClassesMemeNiveau = classesTriees.filter(c => {
    const parsed = parseClasseNom(c.nom);
    if (!parsed) return false;
    return parsed.niveau === nextNiveau && parsed.prefix === (prefix || '');
  });

  // Une classe sans numéro (« 2nd D ») compte comme la n° 1 : la nouvelle
  // devient « 2nd D 2 » et l'ancienne sera renommée « 2nd D 1 ».
  const maxSuffix = toutesLesClassesMemeNiveau.reduce((max, c) => {
    const parsed = parseClasseNom(c.nom);
    return Math.max(max, parsed ? (parsed.suffix || 1) : 0);
  }, 0);

  const nouveauSuffix = maxSuffix + 1;

  const nom = NOM_NIVEAU[nextNiveau] || nextNiveau;
  return prefix
    ? `${nom} ${prefix} ${nouveauSuffix}`
    : `${nom} ${nouveauSuffix}`;
}

function construireRapportParClasse(resumesEleves) {
  const map = new Map();

  for (const eleve of resumesEleves) {
    const classeId = eleve.classeId;
    const classeNom = eleve.classeNom;

    if (!map.has(classeId)) {
      map.set(classeId, {
        classeId,
        classeNom,
        totalEleves: 0,
        nombreQuiPassent: 0,
        nombreQuiEchouent: 0,
        destinationPrevue: determinerDestinationPrevue(classeNom),
        eleves: []
      });
    }

    const item = map.get(classeId);
    item.totalEleves += 1;
    item.eleves.push({ eleveId: eleve.eleveId, nom: eleve.eleveNom, prenom: eleve.elevePrenom, moyenneAnnuelle: eleve.moyAn, admis: eleve.decision === 'Admis' });

    if (eleve.decision === 'Admis') {
      item.nombreQuiPassent += 1;
    } else {
      item.nombreQuiEchouent += 1;
    }
  }

  for (const item of map.values()) item.eleves.sort((x, y) => (y.moyenneAnnuelle ?? -1) - (x.moyenneAnnuelle ?? -1));
  return Array.from(map.values()).sort((a, b) => a.classeNom.localeCompare(b.classeNom, 'fr', { numeric: true }));
}

const NOM_GROUPE_ORIENTATION = '2nde — orientation à faire';

function construirePlanPromotion(classesTriees, resumesEleves, params) {
  const elevesParNiveau = {};
  const sortants = [];
  // Admis de 3ème : la série de 2nde est un choix personnel (vœu de l'élève)
  // — ils passent dans le groupe d'attente, l'administration choisit ensuite.
  const aOrienter = [];
  const seriesSeconde = [...new Set(classesTriees
    .map((c) => parseClasseNom(c.nom))
    .filter((p) => p && p.niveau === '2nd')
    .map((p) => p.prefix))];
  const anomaliesPromotion = [];
  const detailsGroupes = [];
  const affectationsParClasse = {};
  const creationsDeClasses = [];

  const effectifMax = Math.max(1, Number(params.effectifMaxParClasse) || 50);
  const effectifMin = Math.max(1, Number(params.effectifMinNouvelleClasse) || 10);
  const creationAuto = !!params.activerCreationAutoClasse;

  // Élèves qui restent dans leur classe actuelle après cette clôture (redoublants,
  // décision différente de "Admis") : ils occupent déjà des places dans les classes
  // qui vont aussi recevoir les élèves nouvellement promus.
  const effectifsRestants = {};
  for (const eleve of resumesEleves) {
    if (eleve.decision === 'Admis') continue;
    if (!eleve.classeId) continue;
    effectifsRestants[eleve.classeId] = (effectifsRestants[eleve.classeId] || 0) + 1;
  }

  for (const eleve of resumesEleves) {
    const { decision, classeNom, eleveId, eleveNom, elevePrenom, moyAn } = eleve;

    if (decision === '__INCOHERENTE__') {
      anomaliesPromotion.push({
        eleveId,
        nom: eleveNom,
        prenom: elevePrenom,
        classeNom,
        probleme: "Décisions de passage incohérentes pour cet élève dans les bulletins"
      });
      continue;
    }

    if (!decision) {
      anomaliesPromotion.push({
        eleveId,
        nom: eleveNom,
        prenom: elevePrenom,
        classeNom,
        probleme: "Décision de passage manquante"
      });
      continue;
    }

    if (decision !== 'Admis') continue;

    const parsedClasse = parseClasseNom(classeNom);
    if (!parsedClasse) {
      anomaliesPromotion.push({
        eleveId,
        nom: eleveNom,
        prenom: elevePrenom,
        classeNom,
        probleme: "Nom de classe non reconnu pour la promotion"
      });
      continue;
    }

    const { niveau, prefix } = parsedClasse;
    const index = ordreClasses.indexOf(niveau);

    if (index === -1) {
      anomaliesPromotion.push({
        eleveId,
        nom: eleveNom,
        prenom: elevePrenom,
        classeNom,
        probleme: "Niveau de classe introuvable dans l’ordre de promotion"
      });
      continue;
    }

    let nextNiveau = ordreClasses[index + 1];
    const prefixDestination = prefix;

    // Fin du lycée : l'élève admis quitte l'établissement.
    if (niveau === 'Tle') {
      sortants.push({ eleveId, nom: eleveNom, prenom: elevePrenom, classeActuelle: classeNom, motif: 'Fin du lycée', moyenneAnnuelle: moyAn });
      continue;
    }
    // Fin du collège : passage en 2nde si l'école a un second cycle (série
    // choisie ensuite selon le vœu de l'élève), sinon sortie.
    if (niveau === '3eme') {
      if (!seriesSeconde.length) {
        sortants.push({ eleveId, nom: eleveNom, prenom: elevePrenom, classeActuelle: classeNom, motif: 'Fin du collège', moyenneAnnuelle: moyAn });
        continue;
      }
      aOrienter.push({ eleveId, nom: eleveNom, prenom: elevePrenom, classeActuelle: classeNom, moyenneAnnuelle: moyAn });
      continue;
    }
    if (index >= ordreClasses.length - 1) continue;

    const cle = `${nextNiveau}||${prefixDestination}`;

    if (!elevesParNiveau[cle]) {
      elevesParNiveau[cle] = [];
    }

    if (!elevesParNiveau[cle].some(e => e.eleveId === eleveId)) {
      elevesParNiveau[cle].push({
        eleveId,
        nom: eleveNom,
        prenom: elevePrenom,
        classeActuelle: classeNom,
        moyenneAnnuelle: moyAn
      });
    }
  }

  const enregistrerAffectation = (classe, groupe, type) => {
    if (!groupe.length) return;
    ajouterAffectation(affectationsParClasse, classe.id, groupe.map(e => e.eleveId));
    const effectifExistant = effectifsRestants[classe.id] || 0;
    detailsGroupes.push({
      groupeDestination: classe.nom,
      nombreEleves: groupe.length,
      type,
      eleves: groupe,
      effectifExistant,
      effectifFinal: effectifExistant + groupe.length
    });
  };

  for (const key in elevesParNiveau) {
    const [nextNiveau, prefix] = key.split('||');
    const eleves = elevesParNiveau[key];
    const count = eleves.length;

    const classesSuperieures = classesTriees.filter(c => {
      const parsed = parseClasseNom(c.nom);
      if (!parsed) return false;
      return parsed.niveau === nextNiveau && parsed.prefix === (prefix || '');
    });

    // Aucune classe de ce niveau/série : création automatique si elle est
    // permise (ex. première promotion de 1ère A1 de l'école).
    if (!classesSuperieures.length && creationAuto) {
      const nb = Math.max(1, Math.ceil(count / effectifMax));
      const tailles = tailleGroupesEquitables(count, nb);
      let curseur = 0;
      for (let i = 0; i < nb; i++) {
        const nouveauNom = getNextClassName(nextNiveau, prefix, classesTriees);
        const groupe = eleves.slice(curseur, curseur + tailles[i]);
        curseur += tailles[i];
        classesTriees.push({ id: `temp-${nextNiveau}-${prefix}-${i}`, nom: nouveauNom });
        creationsDeClasses.push({ nom: nouveauNom, eleveIds: groupe.map((e) => e.eleveId), eleves: groupe });
        detailsGroupes.push({ groupeDestination: nouveauNom, nombreEleves: groupe.length, type: 'creation_nouvelle_classe', eleves: groupe, effectifExistant: 0, effectifFinal: groupe.length });
      }
      continue;
    }

    if (!classesSuperieures.length) {
      anomaliesPromotion.push({
        groupe: `${nextNiveau}${prefix ? ' ' + prefix : ''}`,
        probleme: "Aucune classe de destination trouvée pour ce groupe d’élèves admis",
        eleves: eleves.map(e => ({
          eleveId: e.eleveId,
          nom: e.nom,
          prenom: e.prenom,
          classeActuelle: e.classeActuelle
        }))
      });
      continue;
    }

    // Répartition (toujours « intelligente » : l'ancien mode simple envoyait
    // tous les admis d'un niveau dans la première classe, ce qui bloquait la
    // clôture ou entassait les élèves). On priorise les classes déjà actives (avec des redoublants,
    // donc déjà ouvertes de toute façon) avant d’envisager d’activer une classe vide
    // ou d’en créer une nouvelle — chaque classe supplémentaire a un coût réel
    // (enseignant, salle) qu’il faut éviter si ce n’est pas nécessaire.
    const classesActives = classesSuperieures.filter(c => (effectifsRestants[c.id] || 0) > 0);
    const classesVides = classesSuperieures.filter(c => !((effectifsRestants[c.id] || 0) > 0));

    const placesActives = classesActives.reduce(
      (somme, c) => somme + Math.max(0, effectifMax - (effectifsRestants[c.id] || 0)),
      0
    );

    let classesUtilisees;
    const creationsAFaire = []; // { nom, taille }

    if (placesActives >= count) {
      classesUtilisees = classesActives;
    } else {
      const manque = count - placesActives;
      const nbVidesNecessaires = Math.max(0, Math.ceil(manque / effectifMax));

      if (classesVides.length >= nbVidesNecessaires) {
        classesUtilisees = classesActives.concat(classesVides.slice(0, nbVidesNecessaires));
      } else {
        const manqueRestant = manque - classesVides.length * effectifMax;

        if (!creationAuto) {
          anomaliesPromotion.push({
            groupe: `${nextNiveau}${prefix ? ' ' + prefix : ''}`,
            probleme: "Les classes existantes (actives et vides) ne suffisent pas et la création automatique est désactivée",
            eleves: eleves.map(e => ({
              eleveId: e.eleveId,
              nom: e.nom,
              prenom: e.prenom,
              classeActuelle: e.classeActuelle
            }))
          });
          continue;
        }

        classesUtilisees = classesActives.concat(classesVides);

        let nbNouvelles = Math.max(1, Math.ceil(manqueRestant / effectifMax));
        let taillesNouvelles = tailleGroupesEquitables(manqueRestant, nbNouvelles);

        while (nbNouvelles > 1 && !taillesNouvelles.every(t => t >= effectifMin)) {
          nbNouvelles -= 1;
          taillesNouvelles = tailleGroupesEquitables(manqueRestant, nbNouvelles);
        }

        for (let i = 0; i < nbNouvelles; i++) {
          const nouveauNom = getNextClassName(nextNiveau, prefix, classesTriees);
          creationsAFaire.push({ nom: nouveauNom, taille: taillesNouvelles[i] });
          classesTriees.push({ id: `temp-${nextNiveau}-${prefix}-${i}`, nom: nouveauNom });
        }
        classesTriees.splice(0, classesTriees.length, ...trierClasses(classesTriees));
      }
    }

    const [affectationsExistantes, nonPlaces] = repartirEnEquilibrantEffectifFinal(
      eleves,
      classesUtilisees,
      effectifsRestants,
      effectifMax
    );

    const typeAffectation = classesUtilisees.length > 1 ? 'repartition_multi_classes' : 'affectation_existante';
    for (const classe of classesUtilisees) {
      enregistrerAffectation(classe, affectationsExistantes[classe.id] || [], typeAffectation);
    }

    // Le surplus qui n’a pas pu tenir dans les classes existantes va dans les
    // nouvelles classes créées, dans l’ordre calculé plus haut.
    let curseur = 0;
    for (const creation of creationsAFaire) {
      const groupe = nonPlaces.slice(curseur, curseur + creation.taille);
      curseur += creation.taille;

      creationsDeClasses.push({
        nom: creation.nom,
        eleveIds: groupe.map(e => e.eleveId),
        eleves: groupe
      });

      detailsGroupes.push({
        groupeDestination: creation.nom,
        nombreEleves: groupe.length,
        type: 'creation_nouvelle_classe',
        eleves: groupe,
        effectifExistant: 0,
        effectifFinal: groupe.length
      });
    }
  }

  // Alerte (non bloquante) : une classe peut, malgré tout, dépasser l’effectif maximum
  // paramétré — cas résiduels (mode simple déjà bloqué plus haut, ou dernier recours
  // de création avec effectifMin impossible à respecter). Ceci prévient l’administrateur
  // avant validation, sans changer la répartition déjà calculée.
  const alertesCapacite = [];

  for (const classeIdStr in affectationsParClasse) {
    const classeId = Number(classeIdStr);
    const classeInfo = classesTriees.find(c => Number(c.id) === classeId);
    const effectifExistant = effectifsRestants[classeId] || 0;
    const effectifNouveaux = affectationsParClasse[classeIdStr].length;
    const effectifFinal = effectifExistant + effectifNouveaux;

    if (effectifFinal > effectifMax) {
      alertesCapacite.push({
        classeId,
        classeNom: classeInfo ? classeInfo.nom : `Classe #${classeId}`,
        effectifExistant,
        effectifNouveaux,
        effectifFinal,
        effectifMax,
        probleme: `Effectif final ${effectifFinal}/${effectifMax} (${effectifNouveaux} nouvel(le)s admis + ${effectifExistant} redoublant(s) déjà présent(s)).`
      });
    }
  }

  for (const creation of creationsDeClasses) {
    if (creation.eleveIds.length > effectifMax) {
      alertesCapacite.push({
        classeId: null,
        classeNom: creation.nom,
        effectifExistant: 0,
        effectifNouveaux: creation.eleveIds.length,
        effectifFinal: creation.eleveIds.length,
        effectifMax,
        probleme: `Nouvelle classe "${creation.nom}" à créer avec ${creation.eleveIds.length} élève(s), au-dessus du maximum paramétré (${effectifMax}).`
      });
    }
  }

  return {
    anomaliesPromotion,
    affectationsParClasse,
    creationsDeClasses,
    detailsGroupes,
    alertesCapacite,
    sortants,
    aOrienter
  };
}

const LIBELLES_NOTES = { inter1: 'Inter 1', inter2: 'Inter 2', inter3: 'Inter 3', inter4: 'Inter 4', Dev1: 'Devoir 1', Dev2: 'Devoir 2' };
// Blocage expliqué : quoi, pourquoi, qui doit agir, et un lien direct
// quand la correction se fait dans le compte de l'administration.
const A = '/administration/dashbord';
const blocage = ({ titre, explication, responsable = 'Administration', lien = null, lignes = [] }) => ({ titre, explication, responsable, lien, lignes });
const bloque = (status, message, rapportInterface, blocages = []) => ({
  ok: false, status, message,
  rapportInterface: { rapportParClasse: [], rapportMoyennesManquantes: [], anomaliesPromotion: [], detailsGroupes: [], ...(rapportInterface || {}), blocages },
});

// Empreinte du plan : le rapport validé par l'administrateur doit être
// exactement celui qui sera appliqué (sinon les données ont changé entre-
// temps : nouveau rapport à relire).
function empreinteDuPlan(plan, resumesEleves) {
  const lignes = [];
  for (const [classeId, ids] of Object.entries(plan.affectationsParClasse)) ids.forEach((id) => lignes.push(`${id}>${classeId}`));
  plan.creationsDeClasses.forEach((c) => c.eleveIds.forEach((id) => lignes.push(`${id}>+${c.nom}`)));
  plan.sortants.forEach((e) => lignes.push(`${e.eleveId}>sortie`));
  resumesEleves.forEach((e) => lignes.push(`${e.eleveId}:${e.classeId}:${e.decision}:${e.moyAn}`));
  return crypto.createHash('sha1').update(lignes.sort().join('|')).digest('hex');
}

// Moyennes non validées, regroupées par enseignant (c'est à lui d'agir :
// pas de lien, l'administration le prévient).
async function blocagesEnseignants(connection, manques, anneeScolaireId) {
  const [profs] = await connection.query(
    `SELECT g.Classes_id, g.matiere_id, MIN(CONCAT(en.prenom, ' ', en.nom)) AS prof
     FROM enseigner g JOIN enseignants en ON en.id = g.Enseignants_id
     WHERE g.Annee_scolaire_id = ? AND g.Classes_id IN (?) GROUP BY g.Classes_id, g.matiere_id`,
    [anneeScolaireId, [...new Set(manques.map((m) => m.classeId))]]
  );
  const profDe = Object.fromEntries(profs.map((p) => [`${p.Classes_id}:${p.matiere_id}`, p.prof]));
  const [saisies] = await connection.query(
    `SELECT classe_id, matieres_id, Semestre_id, COUNT(*) AS n FROM note
     WHERE Annee_scolaire_id = ? AND classe_id IN (?)
       AND COALESCE(inter1, inter2, inter3, inter4, Dev1, Dev2) IS NOT NULL
     GROUP BY classe_id, matieres_id, Semestre_id`,
    [anneeScolaireId, [...new Set(manques.map((m) => m.classeId))]]
  );
  const aDesNotes = new Set(saisies.map((x) => `${x.classe_id}:${x.matieres_id}:${x.Semestre_id}`));
  const parProf = new Map();
  for (const m of manques) {
    const prof = profDe[`${m.classeId}:${m.matiereId}`] || 'Enseignant non affecté';
    const etat = aDesNotes.has(`${m.classeId}:${m.matiereId}:${m.semestreId}`)
      ? 'notes saisies mais moyennes pas validées'
      : 'aucune note saisie';
    if (!parProf.has(prof)) parProf.set(prof, []);
    parProf.get(prof).push(`${m.classe} — ${m.matiere}, ${m.periode} : ${etat} (${m.eleves} élève(s))`);
  }
  return [...parProf].sort(([a], [b]) => a.localeCompare(b, 'fr')).map(([prof, lignes]) => blocage({
    titre: `${prof} : moyennes à compléter`,
    explication: "Dans son espace enseignant (Notes de la classe), il/elle doit saisir les notes manquantes (00 pour un absent) puis cliquer sur « Valider les moyennes ». Prévenez-le/la : ce travail se fait dans son compte.",
    responsable: `Enseignant : ${prof}`,
    lignes: lignes.sort(),
  }));
}

// Analyse complète (aucune écriture). Avec `verrouiller`, l'année est
// verrouillée pour toute la transaction : une seconde clôture lancée en même
// temps attend, puis trouve l'année déjà clôturée.
async function analyserClotureAnnee(connection, etablissementId, anneeScolaireId, { verrouiller = false } = {}) {
  const params = await fetchClotureParams(connection, etablissementId);

  const [annees] = await connection.query(
    `SELECT id, nom_annee, statut FROM annee_scolaire WHERE id = ? AND etablissement_id = ?${verrouiller ? ' FOR UPDATE' : ''}`,
    [anneeScolaireId, etablissementId]
  );
  if (annees.length === 0) return bloque(404, 'Année scolaire introuvable.');
  if (annees[0].statut === 'cloturee') return bloque(400, 'Cette année scolaire est déjà clôturée.');
  if (annees[0].statut !== 'ouverte') return bloque(400, "Seule l'année scolaire en cours peut être clôturée.");

  const [periodes] = await connection.query('SELECT id, nom FROM semestre WHERE etablissement_id = ? ORDER BY id ASC', [etablissementId]);
  if (periodes.length === 0) {
    return bloque(400, 'Clôture impossible : les périodes de l’année (semestres ou trimestres) ne sont pas définies.', null, [blocage({
      titre: 'Aucune période définie', explication: "Indiquez si l'année se fait en semestres ou en trimestres.",
      lien: { libelle: 'Paramètres → Année scolaire', chemin: `${A}/parametres?onglet=annee` },
    })]);
  }

  const [classes] = await connection.query('SELECT id, nom, orientation FROM classes WHERE etablissement_id = ?', [etablissementId]);
  if (classes.length === 0) {
    return bloque(400, 'Clôture impossible : aucune classe n’existe.', null, [blocage({
      titre: 'Aucune classe', explication: 'Créez les classes de l’établissement.', lien: { libelle: 'Classes', chemin: `${A}/classes/liste` },
    })]);
  }

  const [elevesActifs] = await connection.query(
    `SELECT e.id, e.nom, e.prenom, e.classe_id, c.nom AS classeNom
     FROM eleve e JOIN classes c ON c.id = e.classe_id
     WHERE e.etablissement_id = ? AND e.Annee_scolaire_id = ? AND e.statut = 'actif'
     ORDER BY c.nom, e.nom, e.prenom`,
    [etablissementId, anneeScolaireId]
  );
  if (elevesActifs.length === 0) {
    return bloque(400, 'Clôture impossible : aucun élève n’est inscrit cette année.', null, [blocage({
      titre: 'Aucun élève inscrit', explication: 'Inscrivez les élèves de l’année.', lien: { libelle: 'Inscription des élèves', chemin: `${A}/eleves/inscription` },
    })]);
  }

  const rapportVide = { rapportParClasse: [], rapportMoyennesManquantes: [], anomaliesPromotion: [], detailsGroupes: [], parametresUtilises: params };
  const blocages = [];

  // Élèves actifs rattachés à une autre année (ou à aucune) : la clôture ne
  // les ferait pas passer, ils disparaîtraient de la nouvelle année.
  const [orphelins] = await connection.query(
    `SELECT e.id AS eleveId, e.nom, e.prenom, c.nom AS classeNom
     FROM eleve e LEFT JOIN classes c ON c.id = e.classe_id
     WHERE e.etablissement_id = ? AND e.statut = 'actif' AND (e.Annee_scolaire_id IS NULL OR e.Annee_scolaire_id <> ?)
     ORDER BY c.nom, e.nom`,
    [etablissementId, anneeScolaireId]
  );
  if (orphelins.length) {
    blocages.push(blocage({
      titre: `${orphelins.length} élève(s) inscrit(s) sur une autre année`,
      explication: `Ces élèves sont actifs mais pas inscrits sur ${annees[0].nom_annee} : la clôture ne les ferait pas passer. Réinscrivez-les sur l'année en cours, ou indiquez qu'ils ont quitté l'établissement.`,
      lien: { libelle: 'Élèves → Réinscription', chemin: `${A}/eleves/reinscriptions` },
      lignes: orphelins.map((o) => `${o.nom} ${o.prenom}${o.classeNom ? ` (${o.classeNom})` : ''}`),
    }));
  }

  // Élèves toujours dans le groupe « orientation à faire » : leur série de
  // 2nde n'a jamais été choisie.
  const groupesOrientation = new Set(classes.filter((c) => c.orientation).map((c) => c.id));
  const nonOrientes = elevesActifs.filter((e) => groupesOrientation.has(e.classe_id));
  if (nonOrientes.length) {
    blocages.push(blocage({
      titre: `${nonOrientes.length} élève(s) de 2nde sans série`,
      explication: "Ces élèves attendent toujours le choix de leur série de 2nde : ils n'ont suivi aucune classe cette année. Choisissez leur série.",
      lien: { libelle: 'Élèves → Orientation en 2nde', chemin: `${A}/eleves/orientation` },
      lignes: nonOrientes.map((e) => `${e.nom} ${e.prenom}`),
    }));
  }

  // Demandes de modification de notes non traitées : après la clôture,
  // l'année est verrouillée et elles ne pourraient plus être appliquées.
  const [demandes] = await connection.query(
    `SELECT r.id, e.nom, e.prenom, c.nom AS classeNom, m.nom AS matiere, r.note_type
     FROM note_modification_requests r
     JOIN eleve e ON e.id = r.eleve_id JOIN classes c ON c.id = r.classe_id JOIN matieres m ON m.id = r.matieres_id
     WHERE r.etablissement_id = ? AND r.annee_scolaire_id = ? AND r.statut = 'en_attente'`,
    [etablissementId, anneeScolaireId]
  );
  if (demandes.length) {
    blocages.push(blocage({
      titre: `${demandes.length} demande(s) de modification de notes en attente`,
      explication: "Des enseignants ont demandé à modifier des notes déjà validées. Acceptez ou refusez chaque demande : après la clôture, elles ne pourraient plus être appliquées.",
      lien: { libelle: 'Demandes de notes', chemin: `${A}/demandes-notes` },
      lignes: demandes.map((d) => `${d.nom} ${d.prenom} (${d.classeNom}) — ${d.matiere}, ${LIBELLES_NOTES[d.note_type] || d.note_type}`),
    }));
  }

  // Décisions recalculées à partir des notes VALIDÉES (comme les bulletins),
  // et non lues dans des bulletins peut-être générés avant les dernières
  // validations. Les bulletins seront régénérés à la clôture.
  const parClasse = new Map();
  elevesActifs.filter((e) => !groupesOrientation.has(e.classe_id)).forEach((e) => { if (!parClasse.has(e.classe_id)) parClasse.set(e.classe_id, []); parClasse.get(e.classe_id).push(e); });
  // Ce qui manque, regroupé par responsable : (classe, matière, période)
  // pour les enseignants, (classe, période) pour la conduite.
  const manquesMatiere = new Map();
  const manquesConduite = new Map();
  const classesSansMatiere = new Map();
  const contextes = [];
  const resumesEleves = [];
  const rapportMoyennesManquantes = [];
  const [stockes] = await connection.query(
    'SELECT eleve_id, MAX(decision) AS decision, MAX(moyAn) AS moyAn FROM bulletin WHERE etablissement_id = ? AND Annee_scolaire_id = ? AND moyAn IS NOT NULL GROUP BY eleve_id',
    [etablissementId, anneeScolaireId]
  );
  const stocke = Object.fromEntries(stockes.map((b) => [b.eleve_id, b]));
  const bulletinsAMettreAJour = new Set();
  const dernier = periodes[periodes.length - 1];

  for (const [classeId, eleves] of parClasse) {
    const ctx = await bulletinService.computeClassBulletins(connection, { classeId, etablissementId, anneeScolaireId });
    if (!ctx) continue;
    contextes.push(ctx);
    for (const e of eleves) {
      const problemes = [];
      for (const p of periodes) {
        const b = ctx.parSemestre[p.id] && ctx.parSemestre[p.id][e.id];
        if (b && b.moyenne_semestrielle !== null) continue;
        const raisons = [];
        if (!b || !b.moyennes.some((m) => m.moy !== null)) raisons.push('aucune moyenne validée');
        else if (b.manquantes.length) raisons.push(`non validé : ${b.manquantes.join(', ')}`);
        if (ctx.problemes.conduiteManquante.includes(p.nom)) raisons.push('conduite non saisie');
        if (ctx.problemes.sansCoefficient) raisons.push('aucune matière affectée à la classe');
        (b ? b.moyennes : []).filter((m) => m.moy === null).forEach((m) => {
          const cle = `${classeId}:${m.matiereId}:${p.id}`;
          const x = manquesMatiere.get(cle) || { classeId, classe: e.classeNom, matiereId: m.matiereId, matiere: m.matiere, semestreId: p.id, periode: p.nom, eleves: 0 };
          x.eleves += 1;
          manquesMatiere.set(cle, x);
        });
        if (ctx.problemes.conduiteManquante.includes(p.nom)) manquesConduite.set(`${classeId}:${p.id}`, `${e.classeNom} — ${p.nom}`);
        if (ctx.problemes.sansCoefficient) classesSansMatiere.set(classeId, e.classeNom);
        problemes.push(`${p.nom} : ${raisons.join(' ; ') || 'moyenne incomplète'}`);
      }
      const final = ctx.parSemestre[dernier.id] && ctx.parSemestre[dernier.id][e.id];
      if (problemes.length || !final || final.moyenne_annuelle === null) {
        rapportMoyennesManquantes.push({ eleveId: e.id, nom: e.nom, prenom: e.prenom, classeNom: e.classeNom, probleme: problemes.join(' | ') || 'Moyenne annuelle manquante' });
        continue;
      }
      const ancien = stocke[e.id];
      if (!ancien || ancien.decision !== final.decision || Number(ancien.moyAn) !== Number(final.moyenne_annuelle)) bulletinsAMettreAJour.add(e.classeNom);
      resumesEleves.push({
        eleveId: e.id, eleveNom: e.nom, elevePrenom: e.prenom, classeId: e.classe_id, classeNom: e.classeNom,
        moyAn: final.moyenne_annuelle, decision: final.decision,
      });
    }
  }

  const rapportParClasse = construireRapportParClasse(resumesEleves);

  if (classesSansMatiere.size) {
    blocages.push(blocage({
      titre: `${classesSansMatiere.size} classe(s) sans matière ni enseignant`,
      explication: "Aucune matière n'est affectée à ces classes cette année : aucune moyenne ne peut être calculée. Affectez les enseignants et leurs matières.",
      lien: { libelle: 'Enseignants → Répartition', chemin: `${A}/enseignants/repartition` },
      lignes: [...classesSansMatiere.values()].sort(),
    }));
  }
  if (manquesConduite.size) {
    blocages.push(blocage({
      titre: 'Notes de conduite non saisies',
      explication: 'La note de conduite de chaque classe est nécessaire pour chaque période.',
      lien: { libelle: 'Classes → Conduite', chemin: `${A}/classes/conduite` },
      lignes: [...manquesConduite.values()].sort(),
    }));
  }
  if (manquesMatiere.size) {
    blocages.push(...(await blocagesEnseignants(connection, [...manquesMatiere.values()], anneeScolaireId)));
  }

  if (blocages.length) {
    return bloque(400, blocages.length === 1
      ? `Clôture impossible : ${blocages[0].titre.charAt(0).toLowerCase()}${blocages[0].titre.slice(1)}.`
      : `Clôture impossible : ${blocages.length} points sont à régler avant de clôturer. Chacun est expliqué ci-dessous.`, {
      ...rapportVide,
      rapportParClasse,
      rapportMoyennesManquantes,
      totalClasses: rapportParClasse.length,
      totalElevesConcernes: rapportMoyennesManquantes.length,
    }, blocages);
  }

  // Notes saisies après la dernière validation : non comptées (avertissement).
  const [nonValidees] = await connection.query(
    `SELECT c.nom AS classe, m.nom AS matiere, s.nom AS periode, n.inter1, n.inter2, n.inter3, n.inter4, n.Dev1, n.Dev2, n.moy, n.notes_validees
     FROM note n JOIN classes c ON c.id = n.classe_id JOIN matieres m ON m.id = n.matieres_id JOIN semestre s ON s.id = n.Semestre_id
     WHERE n.etablissement_id = ? AND n.Annee_scolaire_id = ? AND n.moy IS NOT NULL`,
    [etablissementId, anneeScolaireId]
  );
  const avertissements = [];
  const groupesNonValides = new Map();
  for (const n of nonValidees) {
    const verrouillees = notesService.notesValidees(n);
    if (Object.keys(LIBELLES_NOTES).some((f) => n[f] !== null && n[f] !== undefined && !verrouillees.has(f))) {
      const cle = `${n.classe} — ${n.matiere} (${n.periode})`;
      groupesNonValides.set(cle, (groupesNonValides.get(cle) || 0) + 1);
    }
  }
  if (groupesNonValides.size) {
    avertissements.push({
      titre: 'Notes saisies après la dernière validation (elles ne comptent pas dans les moyennes)',
      details: [...groupesNonValides].map(([k, n]) => `${k} : ${n} élève(s)`),
    });
  }

  const classesTriees = trierClasses(classes);

  const plan = construirePlanPromotion(classesTriees, resumesEleves, params);

  if (plan.anomaliesPromotion.length > 0) {
    const nomsIllisibles = [...new Set(plan.anomaliesPromotion.filter((a) => /non reconnu|introuvable dans l/.test(a.probleme)).map((a) => a.classeNom))];
    const sansDestination = plan.anomaliesPromotion.filter((a) => a.groupe);
    const b = [];
    if (nomsIllisibles.length) {
      b.push(blocage({
        titre: 'Noms de classes non reconnus',
        explication: "La clôture doit lire le niveau dans le nom de la classe (6ème, 5ème… 2nde, 1ère, Tle, suivi de la série et du numéro, ex. « 2nd D 1 »). Renommez ces classes.",
        lien: { libelle: 'Classes', chemin: `${A}/classes/liste` },
        lignes: nomsIllisibles,
      }));
    }
    for (const g of sansDestination) {
      b.push(blocage({
        titre: `Pas de classe de ${g.groupe} pour accueillir ${g.eleves.length} élève(s) admis`,
        explication: params.activerCreationAutoClasse
          ? "Les classes existantes de ce niveau sont pleines. Augmentez l'effectif maximum par classe ou créez une classe de plus."
          : "Il n'existe aucune classe de ce niveau (ou elles sont pleines) et la création automatique des classes est désactivée. Autorisez-la, ou créez la classe vous-même.",
        lien: params.activerCreationAutoClasse ? { libelle: 'Classes', chemin: `${A}/classes/liste` } : { libelle: 'Paramètres → Clôture', chemin: `${A}/parametres?onglet=cloture` },
        lignes: g.eleves.map((e) => `${e.nom} ${e.prenom} (${e.classeActuelle})`),
      }));
    }
    return bloque(400, b.length === 1 ? `Clôture impossible : ${b[0].titre.charAt(0).toLowerCase()}${b[0].titre.slice(1)}.` : `Clôture impossible : ${b.length} points sont à régler avant de clôturer.`, {
      ...rapportVide,
      rapportParClasse,
      anomaliesPromotion: plan.anomaliesPromotion,
      alertesCapacite: plan.alertesCapacite,
      detailsGroupes: plan.detailsGroupes,
      totalClasses: rapportParClasse.length,
      totalAnomaliesPromotion: plan.anomaliesPromotion.length,
    }, b);
  }

  if (bulletinsAMettreAJour.size) {
    avertissements.push({
      titre: 'Bulletins à mettre à jour (des notes ont changé depuis leur génération) : ils seront régénérés automatiquement à la clôture',
      details: [...bulletinsAMettreAJour].sort(),
    });
  }

  return {
    ok: true,
    status: 200,
    message: 'Rapport de clôture prêt. Aucun changement n’a encore été appliqué : relisez-le, puis validez.',
    empreinte: empreinteDuPlan(plan, resumesEleves),
    contextes,
    nomAnnee: annees[0].nom_annee,
    rapportInterface: {
      rapportParClasse,
      rapportMoyennesManquantes: [],
      anomaliesPromotion: [],
      alertesCapacite: plan.alertesCapacite,
      detailsGroupes: plan.detailsGroupes,
      avertissements,
      totalClasses: rapportParClasse.length,
      totalEleves: resumesEleves.length,
      totalAffectationsExistantes: Object.keys(plan.affectationsParClasse).length,
      totalCreationsDeClasses: plan.creationsDeClasses.length,
      totalAlertesCapacite: plan.alertesCapacite.length,
      sortants: plan.sortants,
      aOrienter: plan.aOrienter,
      redoublants: resumesEleves.filter((e) => e.decision !== 'Admis').map((e) => ({ eleveId: e.eleveId, nom: e.eleveNom, prenom: e.elevePrenom, classeActuelle: e.classeNom, moyenneAnnuelle: e.moyAn })),
      totalSortants: plan.sortants.length,
      parametresUtilises: params,
    },
    planExecution: {
      affectationsParClasse: plan.affectationsParClasse,
      creationsDeClasses: plan.creationsDeClasses,
      sortants: plan.sortants,
      aOrienter: plan.aOrienter,
    },
  };
}

// Niveau (promotion) et cycle d'une classe d'après son nom.
async function niveauDeClasse(connection, nom) {
  const parsed = parseClasseNom(nom);
  if (!parsed) return { promotionId: null, cycle: null };
  const cible = simplifyText(`${NOM_NIVEAU[parsed.niveau] || parsed.niveau}${parsed.prefix ? ' ' + parsed.prefix : ''}`).toLowerCase();
  const [promotions] = await connection.execute('SELECT id, nom FROM promotion');
  const promo = promotions.find((p) => simplifyText(p.nom).toLowerCase() === cible);
  const cycle = ['6eme', '5eme', '4eme', '3eme'].includes(parsed.niveau) ? 'Cycle 1' : 'Cycle 2';
  return { promotionId: promo ? promo.id : null, cycle };
}

function anneeSuivante(nomAnnee) {
  const m = String(nomAnnee || '').match(/(\d{4})\D+(\d{4})/);
  return m ? `${Number(m[1]) + 1}-${Number(m[2]) + 1}` : null;
}

async function executerPlanCloture(connection, etablissementId, planExecution, anneeScolaireId) {
  const { affectationsParClasse, creationsDeClasses, sortants = [], aOrienter = [] } = planExecution;

  for (const classeId in affectationsParClasse) {
    await affecterElevesAClasse(
      connection,
      Number(classeId),
      affectationsParClasse[classeId]
    );
  }

  const classesCreees = [];
  for (const creation of creationsDeClasses) {
    const { promotionId, cycle } = await niveauDeClasse(connection, creation.nom);
    const [result] = await connection.execute(
      `INSERT INTO classes (nom, Promotion_id, etablissement_id, cycle)
       VALUES (?, ?, ?, ?)`,
      [creation.nom, promotionId, etablissementId, cycle]
    );
    classesCreees.push(result.insertId);

    await affecterElevesAClasse(connection, result.insertId, creation.eleveIds);
    // Règle des noms : seule → « 2nd D », plusieurs → « 2nd D 1 », « 2nd D 2 ».
    await normaliserGroupe(connection, etablissementId, nomDeBase(creation.nom));
  }

  // Admis de 3ème : groupe d'attente « 2nde — orientation à faire » (créé
  // au besoin) ; la série sera choisie selon le vœu de chaque élève.
  if (aOrienter.length) {
    const [[groupe]] = await connection.query('SELECT id FROM classes WHERE etablissement_id = ? AND orientation = 1 ORDER BY id LIMIT 1', [etablissementId]);
    let groupeId = groupe && groupe.id;
    if (!groupeId) {
      const [r] = await connection.query(
        "INSERT INTO classes (nom, Promotion_id, etablissement_id, cycle, orientation) VALUES (?, NULL, ?, 'Cycle 2', 1)",
        [NOM_GROUPE_ORIENTATION, etablissementId]
      );
      groupeId = r.insertId;
      classesCreees.push(groupeId);
    }
    await affecterElevesAClasse(connection, groupeId, aOrienter.map((e) => e.eleveId));
  }

  // Admis en fin de cycle sans suite dans l'établissement : sortants
  // (historique conservé).
  if (sortants.length) {
    await connection.query(
      "UPDATE eleve SET statut = 'parti', date_depart = CURDATE() WHERE id IN (?) AND etablissement_id = ?",
      [sortants.map((e) => e.eleveId), etablissementId]
    );
  }

  // Année suivante : créée si besoin, les élèves restants y passent, et la
  // répartition des enseignants est recopiée (à ajuster ensuite).
  const [[annee]] = await connection.execute('SELECT nom_annee FROM annee_scolaire WHERE id = ?', [anneeScolaireId]);
  const nomSuivante = anneeSuivante(annee && annee.nom_annee);
  let nouvelleAnneeId = null;
  let nouvelleAnneeCreee = false;
  if (nomSuivante) {
    const [existe] = await connection.execute(
      'SELECT id FROM annee_scolaire WHERE nom_annee = ? AND etablissement_id = ?',
      [nomSuivante, etablissementId]
    );
    if (existe.length) {
      nouvelleAnneeId = existe[0].id;
      await connection.execute("UPDATE annee_scolaire SET statut = 'ouverte' WHERE id = ?", [nouvelleAnneeId]);
    } else {
      const [ins] = await connection.execute(
        "INSERT INTO annee_scolaire (nom_annee, etablissement_id, statut) VALUES (?, ?, 'ouverte')",
        [nomSuivante, etablissementId]
      );
      nouvelleAnneeId = ins.insertId;
      nouvelleAnneeCreee = true;
    }
    await connection.execute('UPDATE etablissement SET Annee_scolaire_id = ? WHERE id = ?', [nouvelleAnneeId, etablissementId]);
    await connection.execute(
      "UPDATE eleve SET Annee_scolaire_id = ? WHERE etablissement_id = ? AND Annee_scolaire_id = ? AND statut = 'actif'",
      [nouvelleAnneeId, etablissementId, anneeScolaireId]
    );
    await connection.execute(
      `INSERT IGNORE INTO enseigner (Enseignants_id, Classes_id, matiere_id, coefficient_id, etablissement_id, Annee_scolaire_id)
       SELECT Enseignants_id, Classes_id, matiere_id, coefficient_id, etablissement_id, ?
       FROM enseigner WHERE etablissement_id = ? AND Annee_scolaire_id = ?`,
      [nouvelleAnneeId, etablissementId, anneeScolaireId]
    );
    // L'emploi du temps des classes est reporté aussi (à ajuster ensuite).
    await connection.execute(
      `INSERT INTO programmes (classe_id, \`matière_id\`, jour, horaire, etablissement_id, Annee_scolaire_id)
       SELECT p.classe_id, p.\`matière_id\`, p.jour, p.horaire, p.etablissement_id, ?
       FROM programmes p
       WHERE p.etablissement_id = ? AND p.Annee_scolaire_id = ?
         AND NOT EXISTS (SELECT 1 FROM programmes q WHERE q.classe_id = p.classe_id AND q.\`matière_id\` = p.\`matière_id\`
                         AND q.jour = p.jour AND q.horaire <=> p.horaire AND q.Annee_scolaire_id = ?)`,
      [nouvelleAnneeId, etablissementId, anneeScolaireId, nouvelleAnneeId]
    );
  }
  return { nouvelleAnnee: nomSuivante, nouvelleAnneeId, nouvelleAnneeCreee, classesCreees, sortants: sortants.length };
}

router.get('/cloture-parametres/:etablissementId', authenticateJWT, async (req, res) => {
  const etablissementId = Number(req.params.etablissementId);

  if (!etablissementId) {
    return res.status(400).json({
      message: "L’identifiant de l’établissement est requis."
    });
  }

  if (Number(req.user.etablissementId) !== etablissementId) {
    return res.status(403).json({ message: 'Accès non autorisé.' });
  }

  let connection;

  try {
    connection = await db.getConnection();
    const parametres = await fetchClotureParams(connection, etablissementId);

    return res.status(200).json({ parametres });
  } catch (error) {
    console.error("Erreur lecture paramètres clôture :", error);
    return res.status(500).json({
      message: "Une erreur est survenue lors de la lecture des paramètres."
    });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/cloture-parametres', authenticateJWT, requireAdminStaff, async (req, res) => {
  const { etablissementId } = req.body;

  if (!etablissementId) {
    return res.status(400).json({
      message: "L’identifiant de l’établissement est requis."
    });
  }

  if (Number(req.user.etablissementId) !== Number(etablissementId)) {
    return res.status(403).json({ message: 'Accès non autorisé.' });
  }

  const params = sanitizeClotureParams(req.body);

  if (params.effectifMinNouvelleClasse > params.effectifMaxParClasse) {
    return res.status(400).json({
      message: "L’effectif minimal d’une nouvelle classe ne peut pas dépasser l’effectif maximal."
    });
  }

  let connection;

  try {
    connection = await db.getConnection();

    const [exists] = await connection.execute(
      `SELECT id FROM cloture_parametres WHERE etablissement_id = ? LIMIT 1`,
      [etablissementId]
    );

    if (exists.length) {
      await connection.execute(
        `
        UPDATE cloture_parametres
        SET
          effectif_max_par_classe = ?,
          effectif_min_nouvelle_classe = ?,
          activer_creation_auto_classe = ?,
          activer_repartition_intelligente = ?,
          note_interne = ?,
          updated_at = NOW()
        WHERE etablissement_id = ?
        `,
        [
          params.effectifMaxParClasse,
          params.effectifMinNouvelleClasse,
          params.activerCreationAutoClasse ? 1 : 0,
          params.activerRepartitionIntelligente ? 1 : 0,
          params.noteInterne,
          etablissementId
        ]
      );
    } else {
      await connection.execute(
        `
        INSERT INTO cloture_parametres
        (
          etablissement_id,
          effectif_max_par_classe,
          effectif_min_nouvelle_classe,
          activer_creation_auto_classe,
          activer_repartition_intelligente,
          note_interne,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [
          etablissementId,
          params.effectifMaxParClasse,
          params.effectifMinNouvelleClasse,
          params.activerCreationAutoClasse ? 1 : 0,
          params.activerRepartitionIntelligente ? 1 : 0,
          params.noteInterne
        ]
      );
    }

    const parametres = await fetchClotureParams(connection, etablissementId);

    return res.status(200).json({
      message: "Paramètres de clôture enregistrés avec succès.",
      parametres
    });
  } catch (error) {
    console.error("Erreur enregistrement paramètres clôture :", error);
    return res.status(500).json({
      message: "Une erreur est survenue lors de l’enregistrement des paramètres."
    });
  } finally {
    if (connection) connection.release();
  }
});

// Rapport (sans confirmation) puis clôture (confirmation + empreinte du
// rapport validé). Tout se fait dans une seule transaction : en cas
// d'erreur, rien n'est appliqué.
router.post('/cloture-annee-scolaire', authenticateJWT, requireAdminStaff, async (req, res) => {
  const { etablissementId, anneeScolaireId, confirmation = false, empreinte } = req.body || {};

  if (!etablissementId || !anneeScolaireId) {
    return res.status(400).json({ message: "Les IDs de l’établissement et de l’année scolaire sont requis." });
  }
  if (Number(req.user.etablissementId) !== Number(etablissementId)) {
    return res.status(403).json({ message: 'Accès non autorisé.' });
  }

  let connection;
  try {
    connection = await db.getConnection();

    if (!confirmation) {
      const analyse = await analyserClotureAnnee(connection, etablissementId, anneeScolaireId);
      return res.status(analyse.status).json({
        confirmationRequise: analyse.ok,
        clotureExecutee: false,
        message: analyse.message,
        empreinte: analyse.empreinte || null,
        nomAnnee: analyse.nomAnnee || null,
        ...(analyse.rapportInterface ? { rapport: analyse.rapportInterface } : {}),
      });
    }

    await connection.beginTransaction();
    const analyse = await analyserClotureAnnee(connection, etablissementId, anneeScolaireId, { verrouiller: true });

    if (!analyse.ok) {
      await connection.rollback();
      return res.status(analyse.status).json({
        confirmationRequise: false,
        clotureExecutee: false,
        message: analyse.message,
        ...(analyse.rapportInterface ? { rapport: analyse.rapportInterface } : {}),
      });
    }
    // Le plan appliqué doit être celui que l'administrateur a relu.
    if (!empreinte || empreinte !== analyse.empreinte) {
      await connection.rollback();
      return res.status(409).json({
        code: 'PLAN_CHANGE',
        confirmationRequise: true,
        clotureExecutee: false,
        message: 'Des données ont changé depuis le rapport (notes, décisions, élèves ou classes). Voici le rapport à jour : relisez-le, puis validez à nouveau.',
        empreinte: analyse.empreinte,
        nomAnnee: analyse.nomAnnee,
        rapport: analyse.rapportInterface,
      });
    }

    // État d'avant, pour pouvoir annuler une clôture faite par erreur.
    const [elevesAvant] = await connection.query(
      "SELECT id, classe_id, Annee_scolaire_id, statut, date_depart FROM eleve WHERE etablissement_id = ? AND Annee_scolaire_id = ? AND statut = 'actif'",
      [etablissementId, anneeScolaireId]
    );
    const [classesAvant] = await connection.query('SELECT id, nom FROM classes WHERE etablissement_id = ?', [etablissementId]);
    const [[etabAvant]] = await connection.query('SELECT Annee_scolaire_id FROM etablissement WHERE id = ?', [etablissementId]);
    const [anneesAvant] = await connection.query('SELECT id, statut FROM annee_scolaire WHERE etablissement_id = ?', [etablissementId]);

    // Bulletins d'archive identiques aux décisions appliquées.
    let bulletinsRegeneres = 0;
    for (const ctx of analyse.contextes) {
      bulletinsRegeneres += await bulletinService.saveClassBulletins(connection, ctx, { etablissementId, anneeScolaireId });
    }

    await connection.query("UPDATE annee_scolaire SET statut = 'cloturee' WHERE id = ?", [anneeScolaireId]);
    const resultat = await executerPlanCloture(connection, etablissementId, analyse.planExecution, anneeScolaireId);

    const aFaire = await travauxApresCloture(connection, etablissementId, resultat, analyse.rapportInterface);
    const [journal] = await connection.query(
      `INSERT INTO cloture_journal (etablissement_id, annee_id, nouvelle_annee_id, nouvelle_annee_creee, etat_avant, resume)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        etablissementId, anneeScolaireId, resultat.nouvelleAnneeId, resultat.nouvelleAnneeCreee ? 1 : 0,
        JSON.stringify({ eleves: elevesAvant, classes: classesAvant, etablissementAnnee: etabAvant ? etabAvant.Annee_scolaire_id : null, annees: anneesAvant, classesCreees: resultat.classesCreees }),
        JSON.stringify({ annee: analyse.nomAnnee, nouvelleAnnee: resultat.nouvelleAnnee, eleves: elevesAvant.length, sortants: resultat.sortants }),
      ]
    );

    await connection.commit();

    return res.status(200).json({
      confirmationRequise: false,
      clotureExecutee: true,
      message:
        `Année ${analyse.nomAnnee} clôturée. ${resultat.nouvelleAnnee ? `L'année ${resultat.nouvelleAnnee} est ouverte : les élèves y sont passés dans leur nouvelle classe, la répartition des enseignants et l'emploi du temps ont été reportés.` : ''}${resultat.sortants ? ` ${resultat.sortants} élève(s) sortant(s) (fin de cycle).` : ''}`,
      nouvelleAnnee: resultat.nouvelleAnnee,
      nouvelleAnneeId: resultat.nouvelleAnneeId,
      journalId: journal.insertId,
      bulletinsRegeneres,
      aFaire,
      rapport: analyse.rapportInterface,
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (rollbackError) { console.error('Erreur rollback :', rollbackError); }
    }
    console.error('Erreur de clôture :', error);
    return res.status(500).json({
      confirmationRequise: false,
      clotureExecutee: false,
      message: 'Une erreur est survenue : la clôture n’a pas été appliquée (aucun changement).',
    });
  } finally {
    if (connection) connection.release();
  }
});

// Ce qui reste à faire dans la nouvelle année (affiché après la clôture).
async function travauxApresCloture(connection, etablissementId, resultat, rapport) {
  const aFaire = [];
  if (!resultat.nouvelleAnneeId) return aFaire;
  const [sansEnseignant] = await connection.query(
    `SELECT c.nom, COUNT(e.id) AS eleves FROM classes c
     JOIN eleve e ON e.classe_id = c.id AND e.statut = 'actif' AND e.Annee_scolaire_id = ?
     WHERE c.etablissement_id = ? AND c.orientation = 0
       AND NOT EXISTS (SELECT 1 FROM enseigner g WHERE g.Classes_id = c.id AND g.Annee_scolaire_id = ?)
     GROUP BY c.id, c.nom ORDER BY c.nom`,
    [resultat.nouvelleAnneeId, etablissementId, resultat.nouvelleAnneeId]
  );
  if (sansEnseignant.length) {
    aFaire.push({
      titre: 'Affecter des enseignants et des matières à ces classes',
      details: sansEnseignant.map((c) => `${c.nom} (${c.eleves} élève(s))`),
      lien: { libelle: 'Enseignants → Répartition', chemin: '/administration/dashbord/enseignants/repartition' },
    });
  }
  if (rapport.aOrienter && rapport.aOrienter.length) {
    aFaire.push({
      titre: `Choisir la série de 2nde de ${rapport.aOrienter.length} élève(s) admis de 3ème, selon leur vœu`,
      details: [],
      lien: { libelle: 'Élèves → Orientation en 2nde', chemin: '/administration/dashbord/eleves/orientation' },
    });
  }
  aFaire.push({ titre: "Vérifier l'emploi du temps et la répartition reportés depuis l'année précédente", details: [] });
  aFaire.push({ titre: 'Inscrire les nouveaux élèves de l’année', details: [] });
  return aFaire;
}

// Dernière clôture : peut-elle encore être annulée ?
async function etatAnnulation(connection, etablissementId) {
  const [[j]] = await connection.query(
    'SELECT * FROM cloture_journal WHERE etablissement_id = ? AND annulee_at IS NULL ORDER BY id DESC LIMIT 1',
    [etablissementId]
  );
  if (!j) return null;
  const resume = JSON.parse(j.resume || '{}');
  const raisons = [];
  const n = j.nouvelle_annee_id;
  if (n) {
    const compte = async (sql) => Number((await connection.query(sql, [n]))[0][0].n);
    const travaux = [
      ['note(s) saisie(s)', 'SELECT COUNT(*) AS n FROM note WHERE Annee_scolaire_id = ?'],
      ['bulletin(s)', 'SELECT COUNT(*) AS n FROM bulletin WHERE Annee_scolaire_id = ?'],
      ['appel(s) de présence', 'SELECT COUNT(*) AS n FROM presence WHERE Annee_scolaire_id = ?'],
      ['note(s) de conduite', 'SELECT COUNT(*) AS n FROM conduite WHERE Annee_scolaire_id = ?'],
      ['paiement(s) de scolarité', 'SELECT COUNT(*) AS n FROM scolarite WHERE Annee_scolaire_id = ?'],
    ];
    for (const [libelle, sql] of travaux) {
      const nb = await compte(sql).catch(() => 0);
      if (nb) raisons.push(`${nb} ${libelle} dans la nouvelle année`);
    }
    const avant = new Set(JSON.parse(j.etat_avant).eleves.map((e) => e.id));
    const [nouveaux] = await connection.query("SELECT id FROM eleve WHERE Annee_scolaire_id = ? AND statut = 'actif'", [n]);
    const inscrits = nouveaux.filter((e) => !avant.has(e.id)).length;
    if (inscrits) raisons.push(`${inscrits} élève(s) inscrit(s) dans la nouvelle année`);
  }
  return { journal: j, resume, annulable: raisons.length === 0, raisons };
}

router.get('/cloture-annee-scolaire/derniere/:etablissementId', authenticateJWT, requireAdminStaff, async (req, res) => {
  if (Number(req.user.etablissementId) !== Number(req.params.etablissementId)) return res.status(403).json({ message: 'Accès non autorisé.' });
  try {
    const etat = await etatAnnulation(db, Number(req.params.etablissementId));
    if (!etat) return res.json({ cloture: null });
    res.json({
      cloture: {
        id: etat.journal.id, date: etat.journal.created_at, annee: etat.resume.annee, nouvelleAnnee: etat.resume.nouvelleAnnee,
        eleves: etat.resume.eleves, annulable: etat.annulable, raisons: etat.raisons,
      },
    });
  } catch (error) {
    console.error('Erreur état clôture :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Annulation de la dernière clôture : tout revient comme avant (classes et
// années des élèves, noms des classes, classes et année créées), tant que
// rien n'a été fait dans la nouvelle année.
router.post('/cloture-annee-scolaire/annuler', authenticateJWT, requireAdminStaff, async (req, res) => {
  const etablissementId = Number(req.user.etablissementId);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('SELECT id FROM annee_scolaire WHERE etablissement_id = ? FOR UPDATE', [etablissementId]);
    const etat = await etatAnnulation(conn, etablissementId);
    if (!etat) { await conn.rollback(); return res.status(404).json({ message: 'Aucune clôture à annuler.' }); }
    if (Number(req.body?.journalId) !== etat.journal.id) { await conn.rollback(); return res.status(409).json({ message: 'La situation a changé : rechargez la page.' }); }
    if (!etat.annulable) {
      await conn.rollback();
      return res.status(409).json({ message: `Annulation impossible : la nouvelle année a déjà commencé (${etat.raisons.join(', ')}).`, raisons: etat.raisons });
    }
    const avant = JSON.parse(etat.journal.etat_avant);
    const n = etat.journal.nouvelle_annee_id;

    for (const e of avant.eleves) {
      await conn.query('UPDATE eleve SET classe_id = ?, Annee_scolaire_id = ?, statut = ?, date_depart = ? WHERE id = ? AND etablissement_id = ?',
        [e.classe_id, e.Annee_scolaire_id, e.statut, e.date_depart, e.id, etablissementId]);
    }
    if (n) {
      await conn.query('DELETE FROM enseigner WHERE etablissement_id = ? AND Annee_scolaire_id = ?', [etablissementId, n]);
      await conn.query('DELETE FROM programmes WHERE etablissement_id = ? AND Annee_scolaire_id = ?', [etablissementId, n]);
    }
    for (const id of avant.classesCreees || []) {
      const [[occupee]] = await conn.query('SELECT COUNT(*) AS n FROM eleve WHERE classe_id = ?', [id]);
      if (!Number(occupee.n)) await conn.query('DELETE FROM classes WHERE id = ? AND etablissement_id = ?', [id, etablissementId]);
    }
    for (const c of avant.classes) {
      await conn.query('UPDATE classes SET nom = ? WHERE id = ? AND etablissement_id = ?', [c.nom, c.id, etablissementId]);
    }
    for (const a of avant.annees) {
      await conn.query('UPDATE annee_scolaire SET statut = ? WHERE id = ? AND etablissement_id = ?', [a.statut, a.id, etablissementId]);
    }
    if (n && etat.journal.nouvelle_annee_creee) {
      await conn.query('DELETE FROM annee_scolaire WHERE id = ? AND etablissement_id = ?', [n, etablissementId]);
    }
    await conn.query('UPDATE etablissement SET Annee_scolaire_id = ? WHERE id = ?', [avant.etablissementAnnee, etablissementId]);
    await conn.query('UPDATE cloture_journal SET annulee_at = NOW() WHERE id = ?', [etat.journal.id]);
    await conn.commit();
    res.json({ message: `Clôture annulée : l'année ${etat.resume.annee} est de nouveau ouverte, chaque élève a retrouvé sa classe.`, anneeScolaireId: etat.journal.annee_id, annee: etat.resume.annee });
  } catch (error) {
    try { await conn.rollback(); } catch (_) {}
    console.error('Erreur annulation clôture :', error);
    res.status(500).json({ message: "Erreur : l'annulation n'a pas été appliquée (aucun changement)." });
  } finally {
    conn.release();
  }
});

module.exports = router;
module.exports.__test = { parseClasseNom, construirePlanPromotion, determinerDestinationPrevue, anneeSuivante, getNextClassName };
